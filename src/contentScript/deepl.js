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
        "d-textarea[data-testid=translator-target-input]"
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

  function injectInformation() {
    if (document.getElementById("twp-info")) return;
    const style = document.createElement("style");
    style.textContent = `
    /* TWP - Translate Web Pages */
    #twp-info button {
      color: black;
      background-color: white;
      border: 1px solid black;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
      border-radius: 10px
      cursor: pointer;
      padding: 5px 10px;
      border-radius: 10px;
      transition: transform 0.1s;
    }
    #twp-info button:hover {
      transform: scale(1.1);
    }
    #twp-info p {
      color: white;
    }
    `;
    document.head.appendChild(style);

    const info = document.createElement("div");
    info.setAttribute("id", "twp-info");
    info.style.cssText = `
      width: 100%;
      padding: 10px;
      text-align: center;
      background: rgb(37, 108, 219);
      box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.5);
      padding: 7px;
    `;
    info.innerHTML = `
      <p style="font-size: 20px; font-weight: bold;">TWP - Translate Web Pages</p>
      <p data-i18n="msgDeepLTabReasoOpened">This tab opened because you clicked to translate selected text using DeepL.</p>
      <button data-i18n="msgDontShowAgain">Don't show again</button>
    `;
    document.body.insertBefore(info, document.body.firstChild);

    info.querySelector("button").addEventListener("click", () => {
      twpConfig.set("textTranslatorService", "google");
      setTimeout(() => window.close(), 500);
    });

    twpConfig.onReady(async () => {
      await twpI18n.updateUiMessages();
      twpI18n.translateDocument(info);
    });
  }

  // get the sourceText and targetLanguage from the URL hash
  if (location.hash.startsWith("#!")) {
    injectInformation();

    let [targetLanguage, text] = location.hash.split("!#");
    location.hash = "";

    targetLanguage = decodeURIComponent(targetLanguage.substring(2));
    text = decodeURIComponent(text);

    translate(text, targetLanguage || "en")
      .then((result) => {
        console.info(result);
        chrome.runtime.sendMessage(
          {
            action: "DeepL_firstTranslationResult",
            result,
          },
          checkedLastError
        );
      })
      .catch((e) => {
        console.error(e);
        chrome.runtime.sendMessage(
          {
            action: "DeepL_firstTranslationResult",
            result: "",
          },
          checkedLastError
        );
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
