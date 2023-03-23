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
      const target_textarea = document.querySelector(
        "d-textarea[dl-test=translator-target-input]"
      );

      // set the URL hash, the translation will start immediately
      location.hash = `#/auto/${targetLanguage}/${encodeURIComponent(text)}`;

      if (!target_textarea) {
        throw new Error("target_textarea not found.");
      }

      const startTime = performance.now();

      /**
       * wait for the translation to finish
       * @param {string} oldvalue
       * @returns
       */
      function checkresult(oldvalue) {
        if (
          performance.now() - startTime > 2400 ||
          (target_textarea.textContent &&
            target_textarea.textContent !== oldvalue)
        ) {
          return resolve(target_textarea.textContent);
        }
        setTimeout(checkresult, 100, oldvalue);
      }
      checkresult(target_textarea.textContent);
    });
  }

  // get the sourceText and targetLanguage from the URL hash
  if (location.hash.startsWith("#!")) {
    let [targetLanguage, text] = location.hash.split("!#");
    location.hash = "";

    targetLanguage = decodeURIComponent(targetLanguage.substring(2));
    text = decodeURIComponent(text);

    translate(text, targetLanguage || "en")
      .then((result) => {
        console.info(result);
        chrome.runtime.sendMessage({
          action: "DeepL_firstTranslationResult",
          result,
        });
      })
      .catch((e) => {
        console.error(e);
        chrome.runtime.sendMessage({
          action: "DeepL_firstTranslationResult",
          result: "",
        });
      });
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "translateTextWithDeepL") {
      console.info(request);
      translate(request.text, request.targetLanguage)
        .then((result) => {
          console.info(result);
          sendResponse(result);
        })
        .catch((e) => {
          console.error(e);
          sendResponse("");
        });
    }

    return true;
  });
})();
