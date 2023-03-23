"use strict";

/*
  When the DeepL tab is not activated, the timers will have a minimum delay of 1 second which delays the translation.
*/

void (function () {
  /**
   * Put the original text in the correct place, select the target language, wait and return the translation result.
   * @param {string} text
   * @param {string} targetLanguage
   * @returns {Promise<string>} resultText
   */
  async function translate(text, targetLanguage) {
    return await new Promise((resolve) => {
      /** @type {HTMLTextAreaElement} */
      const source_textarea = document.querySelector(
        "d-textarea[dl-test=translator-source-input]"
      );
      /** @type {HTMLTextAreaElement} */
      const target_textarea = document.querySelector(
        "d-textarea[dl-test=translator-target-input]"
      );

      // select the target language
      try {
        targetLanguage = targetLanguage.split("-")[0];
        if (
          target_textarea.lang.split("-")[0].toLowerCase() !== targetLanguage
        ) {
          /** @type {HTMLButtonElement} */
          const buttonOpenTargetLanguageSelector = document.querySelector(
            `button[dl-test=translator-target-lang-btn]`
          );
          buttonOpenTargetLanguageSelector.click();

          /** @type {HTMLButtonElement} */
          const buttonSelectedTargetLanguage = document.querySelector(
            `button[dl-test|=translator-lang-option-${targetLanguage}]`
          );
          buttonSelectedTargetLanguage.click();
        } else if (target_textarea.textContent && text === source_textarea.textContent) {
          resolve(target_textarea.textContent);
          return;
        }
      } catch (e) {
        console.error(e);
      }

      // set the source language, the translation will start immediately
      source_textarea.firstChild.firstChild.textContent = text;
      source_textarea.dispatchEvent(new Event("change"));

      const startTime = performance.now();

      /**
       * wait for the translation to finish
       * @param {string} oldvalue
       * @returns
       */
      function checkresult(oldvalue) {
        if (
          performance.now() - startTime > 2400 ||
          (target_textarea.textContent && target_textarea.textContent !== oldvalue)
        ) {
          return resolve(target_textarea.textContent);
        }
        setTimeout(checkresult, 100, oldvalue);
      }
      checkresult(target_textarea.textContent);
    });
  }

  // get the sourceText and targetLanguage from the URL hash
  if (location.hash.startsWith("#")) {
    let [fill,targetLanguage, text] = location.hash.split("/");

    targetLanguage = decodeURIComponent(targetLanguage);
    text = decodeURIComponent(text);

    translate(text, targetLanguage || "en").then((result) => {
      console.info(result);
      chrome.runtime.sendMessage({
        action: "DeepL_firstTranslationResult",
        result,
      });
    });
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "translateTextWithDeepL") {
      console.info(request);
      translate(request.text, request.targetLanguage).then((result) => {
        console.info(result);
        sendResponse(result);
      });
    }

    return true;
  });
})();
