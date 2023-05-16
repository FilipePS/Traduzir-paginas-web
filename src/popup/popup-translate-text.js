"use strict";

let $ = document.querySelector.bind(document);

twpConfig
  .onReady()
  .then(() => twpI18n.updateUiMessages())
  .then(() => {
    twpI18n.translateDocument();

    function backgroundTranslateSingleText(
      translationService,
      sourceLanguage,
      targetLanguage,
      source
    ) {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: "translateSingleText",
            translationService,
            sourceLanguage,
            targetLanguage,
            source,
          },
          (response) => {
            checkedLastError();
            resolve(response);
          }
        );
      });
    }

    let currentTargetLanguages = twpConfig.get("targetLanguages");
    let currentTargetLanguage = twpConfig.get("targetLanguageTextTranslation");
    let currentTextTranslatorService = twpConfig.get("textTranslatorService");

    function disableDarkMode() {
      if (!document.getElementById("lightModeElement")) {
        const el = document.createElement("style");
        el.setAttribute("id", "lightModeElement");
        el.setAttribute("rel", "stylesheet");
        el.textContent = `
            body {
                color: rgb(0, 0, 0) !important;
                background-color: rgb(215, 215, 215) !important;
            }
            .selected {
                background-color: rgba(0, 0, 0, 0.6) !important;
            }
            hr {
                width: 95%;
                border: 1px rgba(0, 0, 0, 0.75) solid;
            }
            `;
        document.body.appendChild(el);
        document.querySelector("#listenTranslated svg").style =
          "fill: rgb(0, 0, 0)";
        document.querySelector("#listenOriginal svg").style =
          "fill: rgb(0, 0, 0)";
      }
    }

    function enableDarkMode() {
      if (document.getElementById("#lightModeElement")) {
        document.getElementById("#lightModeElement").remove();
        document.querySelector("#listenTranslated svg").style = "fill: black";
        document.querySelector("#listenOriginal svg").style = "fill: black";
      }
    }

    switch (twpConfig.get("darkMode")) {
      case "auto":
        if (matchMedia("(prefers-color-scheme: dark)").matches) {
          enableDarkMode();
        } else {
          disableDarkMode();
        }
        break;
      case "yes":
        enableDarkMode();
        break;
      case "no":
        disableDarkMode();
        break;
      default:
        break;
    }

    async function detectTextLanguage(text) {
      if (!chrome.i18n.detectLanguage) return "und";

      return await new Promise((resolve) => {
        chrome.i18n.detectLanguage(text, (result) => {
          if (!result) return resolve({ lang: "und", isReliable: false });

          for (const langInfo of result.languages) {
            const langCode = twpLang.fixTLanguageCode(langInfo.language);
            if (langCode) {
              return resolve({ lang: langCode, isReliable: result.isReliable });
            }
          }

          return resolve({ lang: "und", isReliable: false });
        });
      });
    }

    let originalTabLanguage = "und";
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.detectLanguage(tabs[0].id, (lang) =>
        lang ? (originalTabLanguage = lang) : void 0
      );
    });

    let isPlayingAudio = false;

    function playAudio(text, targetLanguage, cbOnEnded = () => {}) {
      isPlayingAudio = true;
      chrome.runtime.sendMessage(
        {
          action: "textToSpeech",
          text,
          targetLanguage,
        },
        () => {
          checkedLastError();
          isPlayingAudio = false;
          cbOnEnded();
        }
      );
    }

    function stopAudio() {
      if (isPlayingAudio) {
        chrome.runtime.sendMessage(
          {
            action: "stopAudio",
          },
          checkedLastError
        );
      }
      isPlayingAudio = false;
    }

    const eOrigText = document.getElementById("eOrigText");
    const eOrigTextDiv = document.getElementById("eOrigTextDiv");
    const eTextTranslated = document.getElementById("eTextTranslated");

    const sGoogle = document.getElementById("sGoogle");
    const sYandex = document.getElementById("sYandex");
    const sBing = document.getElementById("sBing");
    const sDeepL = document.getElementById("sDeepL");
    const sLibre = document.getElementById("sLibre");
    const eCopy = document.getElementById("copy");
    const eListenOriginal = document.getElementById("listenOriginal");
    const eListenTranslated = document.getElementById("listenTranslated");

    eCopy.onclick = () => {
      navigator.clipboard
        .writeText(eTextTranslated.textContent)
        .then(async () => {
          eCopy.style.backgroundColor = "rgba(0, 255, 0, 0.4)";
          setTimeout(() => {
            eCopy.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
          }, 500);
        });
    };

    function setCaretAtEnd() {
      const el = eOrigText;
      const range = document.createRange();
      const sel = window.getSelection();
      range.setStart(el, 1);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      el.focus();
    }

    let translateNewInputTimerHandler;
    eOrigText.oninput = () => {
      clearTimeout(translateNewInputTimerHandler);
      translateNewInputTimerHandler = setTimeout(translateText, 600);
    };

    sGoogle.onclick = () => {
      currentTextTranslatorService = "google";
      twpConfig.set("textTranslatorService", "google");
      translateText();

      sGoogle.classList.remove("selected");
      sYandex.classList.remove("selected");
      sBing.classList.remove("selected");
      sDeepL.classList.remove("selected");
      sLibre.classList.remove("selected");

      sGoogle.classList.add("selected");
    };
    sYandex.onclick = () => {
      currentTextTranslatorService = "yandex";
      twpConfig.set("textTranslatorService", "yandex");
      translateText();

      sGoogle.classList.remove("selected");
      sYandex.classList.remove("selected");
      sBing.classList.remove("selected");
      sDeepL.classList.remove("selected");
      sLibre.classList.remove("selected");

      sYandex.classList.add("selected");
    };
    sBing.onclick = () => {
      currentTextTranslatorService = "bing";
      twpConfig.set("textTranslatorService", "bing");
      translateText();

      sGoogle.classList.remove("selected");
      sYandex.classList.remove("selected");
      sBing.classList.remove("selected");
      sDeepL.classList.remove("selected");
      sLibre.classList.remove("selected");

      sBing.classList.add("selected");
    };
    sDeepL.onclick = () => {
      currentTextTranslatorService = "deepl";
      twpConfig.set("textTranslatorService", "deepl");
      translateText();

      sGoogle.classList.remove("selected");
      sYandex.classList.remove("selected");
      sBing.classList.remove("selected");
      sDeepL.classList.remove("selected");
      sLibre.classList.remove("selected");

      sDeepL.classList.add("selected");
    };
    sLibre.onclick = () => {
      currentTextTranslatorService = "libre";
      twpConfig.set("textTranslatorService", "libre");
      translateText();

      sGoogle.classList.remove("selected");
      sYandex.classList.remove("selected");
      sBing.classList.remove("selected");
      sDeepL.classList.remove("selected");
      sLibre.classList.remove("selected");

      sLibre.classList.add("selected");
    };

    const setTargetLanguage = document.getElementById("setTargetLanguage");
    setTargetLanguage.onclick = (e) => {
      if (e.target.getAttribute("value")) {
        const langCode = twpLang.fixTLanguageCode(
          e.target.getAttribute("value")
        );
        if (langCode) {
          currentTargetLanguage = langCode;
          twpConfig.setTargetLanguageTextTranslation(langCode);
          translateText();
        }

        document.querySelectorAll("#setTargetLanguage li").forEach((li) => {
          li.classList.remove("selected");
        });

        e.target.classList.add("selected");
      }
    };

    function onListenClick(type, element, text, language) {
      const msgListen = twpI18n.getMessage("btnListen");
      const msgStopListening = twpI18n.getMessage("btnStopListening");

      eListenOriginal.classList.remove("selected");
      eListenTranslated.classList.remove("selected");
      eListenOriginal.setAttribute("title", msgStopListening);
      eListenTranslated.setAttribute("title", msgStopListening);

      if (isPlayingAudio) {
        stopAudio();
        element.classList.remove("selected");
      } else {
        playAudio(text, language, () => {
          element.classList.remove("selected");
          element.setAttribute("title", msgListen);
        });
        element.classList.add("selected");
      }
    }

    let lastListenAudioType = null;
    eListenOriginal.onclick = async () => {
      let { lang, isReliable } = await detectTextLanguage(
        eOrigText.textContent
      );
      if (!isReliable && originalTabLanguage !== "und") {
        lang = originalTabLanguage;
      }
      if (lastListenAudioType !== "original") {
        stopAudio();
      }
      lastListenAudioType = "original";
      onListenClick("original", eListenOriginal, eOrigText.textContent, lang);
    };

    eListenTranslated.onclick = () => {
      if (lastListenAudioType !== "translated") {
        stopAudio();
      }
      lastListenAudioType = "translated";
      onListenClick(
        "translated",
        eListenTranslated,
        eTextTranslated.textContent,
        currentTargetLanguage
      );
    };

    const targetLanguageButtons = document.querySelectorAll(
      "#setTargetLanguage li"
    );

    for (let i = 0; i < 3; i++) {
      if (currentTargetLanguages[i] == currentTargetLanguage) {
        targetLanguageButtons[i].classList.add("selected");
      }
      targetLanguageButtons[i].textContent = currentTargetLanguages[i];
      targetLanguageButtons[i].setAttribute("value", currentTargetLanguages[i]);
      targetLanguageButtons[i].setAttribute(
        "title",
        twpLang.codeToLanguage(currentTargetLanguages[i])
      );
    }

    switch (currentTextTranslatorService) {
      case "yandex":
        sYandex.classList.add("selected");
        break;
      case "deepl":
        sDeepL.classList.add("selected");
        break;
      case "bing":
        sBing.classList.add("selected");
        break;
      case "google":
        sGoogle.classList.add("selected");
        break;
      case "libre":
        sLibre.classList.add("selected");
      default:
        sGoogle.classList.add("selected");
        break;
    }

    const enabledServices = twpConfig.get("enabledServices");
    if (enabledServices.includes("google")) {
      sGoogle.removeAttribute("hidden");
    } else {
      sGoogle.setAttribute("hidden", "");
    }
    if (enabledServices.includes("bing")) {
      sBing.removeAttribute("hidden");
    } else {
      sBing.setAttribute("hidden", "");
    }
    if (enabledServices.includes("yandex")) {
      sYandex.removeAttribute("hidden");
    } else {
      sYandex.setAttribute("hidden", "");
    }
    if (enabledServices.includes("deepl")) {
      sDeepL.removeAttribute("hidden");
    } else {
      sDeepL.setAttribute("hidden", "");
    }
    if (twpConfig.get("customServices").find((cs) => cs.name === "libre")) {
      sLibre.removeAttribute("hidden");
    } else {
      sLibre.setAttribute("hidden", "");
    }

    twpConfig.onChanged((name, newvalue) => {
      switch (name) {
        case "enabledServices": {
          const enabledServices = newvalue;
          if (enabledServices.includes("google")) {
            sGoogle.removeAttribute("hidden");
          } else {
            sGoogle.setAttribute("hidden", "");
          }
          if (enabledServices.includes("bing")) {
            sBing.removeAttribute("hidden");
          } else {
            sBing.setAttribute("hidden", "");
          }
          if (enabledServices.includes("yandex")) {
            sYandex.removeAttribute("hidden");
          } else {
            sYandex.setAttribute("hidden", "");
          }
          if (enabledServices.includes("deepl")) {
            sDeepL.removeAttribute("hidden");
          } else {
            sDeepL.setAttribute("hidden", "");
          }
          break;
        }
        case "customServices": {
          if (newvalue.find((cs) => cs.name === "libre")) {
            sLibre.removeAttribute("hidden");
          } else {
            sLibre.setAttribute("hidden", "");
          }
          break;
        }
      }
    });

    function translateText() {
      stopAudio();

      backgroundTranslateSingleText(
        currentTextTranslatorService,
        "auto",
        currentTargetLanguage,
        eOrigText.textContent
      ).then((result) => {
        if (twpLang.isRtlLanguage(currentTargetLanguage)) {
          eTextTranslated.setAttribute("dir", "rtl");
        } else {
          eTextTranslated.setAttribute("dir", "ltr");
        }
        eTextTranslated.textContent = result;
      });
    }

    let params = location.hash
      .substring(1)
      .split("&")
      .reduce((a, b) => {
        const splited = b.split("=");
        a[decodeURIComponent(splited[0])] = decodeURIComponent(splited[1]);
        return a;
      }, {});

    if (params["text"]) {
      eOrigText.textContent = params["text"];
      setCaretAtEnd();
      translateText();
    }
  });
