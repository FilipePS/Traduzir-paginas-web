"use strict";

var popupMobile = {};

function getTabHostName() {
  return new Promise((resolve) =>
    chrome.runtime.sendMessage({ action: "getTabHostName" }, (result) => {
      checkedLastError();
      resolve(result);
    })
  );
}

void (async function () {
  await twpConfig.onReady();
  if (!platformInfo.isMobile.any) return;

  const tabHostName = await getTabHostName();
  let tabLanguage = "und";
  let pageLanguageState = "original";

  // load html and icons
  const htmlText = await fetch(
    chrome.runtime.getURL("/contentScript/html/popupMobile.html")
  ).then((response) => response.text());
  const googleIcon = await fetch(
    chrome.runtime.getURL("/icons/google-translate-32.png")
  ).then((response) => response.blob());
  const yandexIcon = await fetch(
    chrome.runtime.getURL("/icons/yandex-translate-32.png")
  ).then((response) => response.blob());
  const bingIcon = await fetch(
    chrome.runtime.getURL("/icons/bing-translate-32.png")
  ).then((response) => response.blob());

  // Load i18n messages based on your language preference
  await twpI18n.updateUiMessages();

  // creates shadow root, root element and append to document
  const rootElement = document.createElement("div");
  rootElement.style.cssText = "all: initial";
  rootElement.classList.add("notranslate");

  const shadowRoot = rootElement.attachShadow({ mode: "closed" });
  shadowRoot.innerHTML = htmlText;

  // remove popup after 8 seconds of inactivity
  let lastInteraction = Date.now();
  let lastInteractionInterval = null;
  let serviceSelectorIsOpen = false;

  function showPopup() {
    lastInteraction = Date.now();
    clearInterval(lastInteractionInterval);

    if (!rootElement.isConnected) {
      document.documentElement.appendChild(rootElement);
      lastInteractionInterval = setInterval(() => {
        const menuContainer = shadowRoot.getElementById("menu-container");
        if (
          Date.now() - lastInteraction > 1000 * 6 &&
          menuContainer.style.display !== "block" &&
          serviceSelectorIsOpen === false
        ) {
          hidePopup();
        }
      }, 1000);

      updateInterface();
    }
  }

  function hidePopup() {
    clearInterval(lastInteractionInterval);
    if (rootElement.isConnected) {
      const mainElement = shadowRoot.querySelector("main");
      const animation = mainElement.animate(
        [
          { transform: "translateY(0px)", opacity: "1" },
          { transform: "translateY(-50px)", opacity: "0" },
        ],
        {
          duration: 200,
          iterations: 1,
        }
      );
      animation.onfinish = () => {
        rootElement.remove();
      };
      const menuContainer = shadowRoot.getElementById("menu-container");
      menuContainer.style.display = "none";
    }
  }

  // set text direction
  if (
    twpLang.isRtlLanguage(
      twpConfig.get("uiLanguage") ||
        twpLang.fixUILanguageCode(chrome.i18n.getUILanguage())
    )
  ) {
    shadowRoot.querySelector("main").setAttribute("dir", "rtl");
  }

  // translate shadow root
  twpI18n.translateDocument(shadowRoot);

  // close popup
  const popupElement = shadowRoot.getElementById("popup");
  popupElement.onpointerdown = (e) => {
    if (e.target !== popupElement) return;
    lastInteraction = Date.now();

    e.stopImmediatePropagation();
    const pointerId = e.pointerId;

    const startPoint = { x: e.clientX, y: e.clientY };
    popupElement.onpointermove = (e) => {
      lastInteraction = Date.now();

      e.stopImmediatePropagation();
      const offset = e.clientX - startPoint.x;
      popupElement.style.transform = `translateX(${offset}px)`;

      if (Math.abs(offset) > window.innerWidth / 10) {
        popupElement.releasePointerCapture(pointerId);
        popupElement.onpointermove = null;
        popupElement.style.transition = `transform 0.3s ease-in-out`;
        if (offset > 0) {
          popupElement.style.transform = `translateX(100%)`;
        } else {
          popupElement.style.transform = `translateX(-100%)`;
        }
        popupElement.ontransitionend = () => {
          popupElement.ontransitionend = null;
          rootElement.remove();
        };
      }
    };
    popupElement.setPointerCapture(pointerId);
  };
  popupElement.onpointerup = (e) => {
    lastInteraction = Date.now();

    e.stopImmediatePropagation();
    popupElement.onpointermove = null;
    popupElement.style.transform = `translateX(0px)`;
    popupElement.releasePointerCapture(e.pointerId);
  };
  popupElement.onpointercancel = (e) => {
    lastInteraction = Date.now();

    e.stopImmediatePropagation();
    popupElement.onpointermove = null;
    popupElement.style.transform = `translateX(0px)`;
    popupElement.releasePointerCapture(e.pointerId);
  };

  // update service icon
  const serviceIconElement = /** @type {HTMLImageElement} */ (
    shadowRoot.getElementById("serviceIcon")
  );
  const updateServiceIcon = () => {
    const service = twpConfig.get("pageTranslatorService");
    if (service === "google") {
      serviceIconElement.src = URL.createObjectURL(googleIcon);
    } else if (service === "yandex") {
      serviceIconElement.src = URL.createObjectURL(yandexIcon);
    } else if (service === "bing") {
      serviceIconElement.src = URL.createObjectURL(bingIcon);
    }
    serviceIconElement.onload = () => {
      serviceIconElement.onload = null;
      URL.revokeObjectURL(serviceIconElement.src);
    };
  };
  updateServiceIcon();

  // select translation service
  const serviceSelector = /** @type {HTMLSelectElement} */ (
    shadowRoot.getElementById("serviceSelector")
  );
  serviceSelector.onclick = () => {
    serviceSelectorIsOpen = true;
    lastInteraction = Date.now();

    serviceIconElement.style.scale = "1.5";
    serviceIconElement.style.rotate = "180deg";
  };
  serviceSelector.onchange = () => {
    serviceSelectorIsOpen = false;
    lastInteraction = Date.now();

    const service = serviceSelector.value;
    twpConfig.set("pageTranslatorService", service);
    updateServiceIcon();

    serviceIconElement.style.scale = null;
    serviceIconElement.style.rotate = null;

    pageTranslator.swapTranslationService(service);
  };
  serviceSelector.onblur = () => {
    serviceSelectorIsOpen = false;
    lastInteraction = Date.now();

    serviceIconElement.style.scale = null;
    serviceIconElement.style.rotate = null;
  };
  serviceSelector.value = twpConfig.get("pageTranslatorService");

  // gear button
  const gearButton = shadowRoot.getElementById("gear");
  gearButton.onclick = () => {
    lastInteraction = Date.now();

    gearButton.classList.add("rotate");
    const menuContainer = shadowRoot.getElementById("menu-container");
    menuContainer.style.display = "block";

    const menuBg = shadowRoot.getElementById("menu-bg");
    menuBg.onclick = (e) => {
      lastInteraction = Date.now();

      e.stopImmediatePropagation();
      closeMenu();
    };

    const menuOptions = shadowRoot.getElementById("menu-options");
    menuOptions.onclick = (e) => {
      lastInteraction = Date.now();

      const target = /** @type {HTMLElement} */ (e.target);
      e.stopImmediatePropagation();
      onMenuOptionClick(target.dataset.value);
    };
  };

  // close menu
  function closeMenu() {
    const gearButton = shadowRoot.getElementById("gear");
    const menuContainer = shadowRoot.getElementById("menu-container");

    gearButton.classList.remove("rotate");
    menuContainer.style.animation = "expand 0.3s ease-out reverse";
    menuContainer.onanimationend = () => {
      menuContainer.onanimationend = null;
      menuContainer.style.display = "none";
      menuContainer.style.animation = null;
    };
  }

  // menu options
  /**
   * @param {string} action
   * @returns
   */
  function onMenuOptionClick(action) {
    if (!action) return;

    if (action === "choose-another-language") {
      return;
    } else if (action === "always-translate-from") {
      tabLanguage = twpLang.fixTLanguageCode(tabLanguage);
      if (twpConfig.get("alwaysTranslateLangs").indexOf(tabLanguage) === -1) {
        twpConfig.addLangToAlwaysTranslate(tabLanguage);
        pageTranslator.translatePage();
      } else {
        twpConfig.removeLangFromAlwaysTranslate(tabLanguage);
      }
    } else if (action === "never-translate-from") {
      tabLanguage = twpLang.fixTLanguageCode(tabLanguage);
      if (twpConfig.get("neverTranslateLangs").indexOf(tabLanguage) === -1) {
        twpConfig.addLangToNeverTranslate(tabLanguage);
        pageTranslator.restorePage();
      } else {
        twpConfig.removeLangFromNeverTranslate(tabLanguage);
      }
    } else if (action === "never-translate-this-site") {
      if (twpConfig.get("neverTranslateSites").indexOf(tabHostName) === -1) {
        twpConfig.addSiteToNeverTranslate(tabHostName);
        pageTranslator.restorePage();
      } else {
        twpConfig.removeSiteFromNeverTranslate(tabHostName);
      }
    } else if (action === "show-translate-selected-button") {
      twpConfig.set(
        "showTranslateSelectedButton",
        twpConfig.get("showTranslateSelectedButton") === "yes" ? "no" : "yes"
      );
    } else if (action === "more-options") {
      const generateRandomHash = (length) => {
        const characters =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let hash = "";
        for (let i = 0; i < length; i++) {
          hash += characters.charAt(
            Math.floor(Math.random() * characters.length)
          );
        }
        return hash;
      };
      const authorizationToOpenOptions = generateRandomHash(32);
      chrome.runtime.sendMessage({
        action: "authorizationToOpenOptions",
        authorizationToOpenOptions,
      });
      window.open(
        chrome.runtime.getURL("/options/open-options.html") +
          `#!authorizationToOpenOptions=${authorizationToOpenOptions}`,
        "blank"
      );
    }

    closeMenu();

    updateInterface();
  }

  // update interface
  function updateInterface() {
    // update the question text
    const questionElement = shadowRoot.getElementById("question");
    const btnTranslate = shadowRoot.getElementById("btnTranslate");
    if (pageLanguageState === "original") {
      questionElement.textContent = twpI18n.getMessage("msgTranslatePage");
      btnTranslate.textContent = twpI18n.getMessage("btnTranslate");
    } else {
      questionElement.textContent = twpI18n.getMessage("msgPageTranslated");
      btnTranslate.textContent = twpI18n.getMessage("btnUndoTranslation");
    }

    // update show-translate-selected-button checkicon
    if (twpConfig.get("showTranslateSelectedButton") === "yes") {
      shadowRoot.querySelector(
        `#menu-options [data-value="show-translate-selected-button"] [checkicon]`
      ).textContent = "✔";
    } else {
      shadowRoot.querySelector(
        `#menu-options [data-value="show-translate-selected-button"] [checkicon]`
      ).textContent = "";
    }

    // update never-translate-this-site checkicon
    if (twpConfig.get("neverTranslateSites").indexOf(tabHostName) !== -1) {
      shadowRoot.querySelector(
        `#menu-options [data-value="never-translate-this-site"] [checkicon]`
      ).textContent = "✔";
    } else {
      shadowRoot.querySelector(
        `#menu-options [data-value="never-translate-this-site"] [checkicon]`
      ).textContent = "";
    }

    tabLanguage = twpLang.fixTLanguageCode(tabLanguage) || "und";

    // update from-to text when original tab is detected
    const from_to_element = shadowRoot.getElementById("from-to");
    from_to_element.textContent = twpI18n.getMessage("msgTranslateFromTo", [
      twpLang.codeToLanguage(tabLanguage),
      twpLang.codeToLanguage(twpConfig.get("targetLanguage")),
    ]);

    // show or hide always-translate-from and never-translate-from
    if (
      tabLanguage === "und" ||
      tabLanguage == twpConfig.get("targetLanguage")
    ) {
      shadowRoot.querySelector(
        `#menu-options [data-value="always-translate-from"]`
      ).style.display = "none";
      shadowRoot.querySelector(
        `#menu-options [data-value="never-translate-from"]`
      ).style.display = "none";
    } else {
      shadowRoot.querySelector(
        `#menu-options [data-value="always-translate-from"]`
      ).style.display = "flex";
      shadowRoot.querySelector(
        `#menu-options [data-value="never-translate-from"]`
      ).style.display = "flex";
    }

    // update always-translate-from text
    shadowRoot.querySelector(
      `#menu-options [data-value="always-translate-from"] [data-i18n]`
    ).textContent = twpI18n.getMessage("lblAlwaysTranslate", [
      twpLang.codeToLanguage(tabLanguage),
    ]);

    // update always-translate-from checkicon
    if (twpConfig.get("alwaysTranslateLangs").indexOf(tabLanguage) !== -1) {
      shadowRoot.querySelector(
        `#menu-options [data-value="always-translate-from"] [checkicon]`
      ).textContent = "✔";
    } else {
      shadowRoot.querySelector(
        `#menu-options [data-value="always-translate-from"] [checkicon]`
      ).textContent = "";
    }

    // update never-translate-from checkicon
    if (twpConfig.get("neverTranslateLangs").indexOf(tabLanguage) !== -1) {
      shadowRoot.querySelector(
        `#menu-options [data-value="never-translate-from"] [checkicon]`
      ).textContent = "✔";
    } else {
      shadowRoot.querySelector(
        `#menu-options [data-value="never-translate-from"] [checkicon]`
      ).textContent = "";
    }
  }
  updateInterface();

  pageTranslator.onPageLanguageStateChange((_pageLanguageState) => {
    pageLanguageState = _pageLanguageState;
    updateInterface();
  });

  // translate or restore page
  const btnTranslate = shadowRoot.getElementById("btnTranslate");
  btnTranslate.onclick = () => {
    if (pageLanguageState === "original") {
      pageTranslator.translatePage();
    } else {
      pageTranslator.restorePage();
    }
  };

  // fill language list
  (function () {
    let langs = twpLang.getLanguageList();

    const langsSorted = [];

    for (const i in langs) {
      langsSorted.push([i, langs[i]]);
    }

    langsSorted.sort(function (a, b) {
      return a[1].localeCompare(b[1]);
    });

    const menuSelectLanguage = /** @type {HTMLSelectElement} */ (
      shadowRoot.getElementById("language-selector")
    );

    const eAllLangs = menuSelectLanguage.querySelector('[name="all"]');
    langsSorted.forEach((value) => {
      const option = document.createElement("option");
      option.value = value[0];
      option.textContent = value[1];
      eAllLangs.appendChild(option);
    });

    const eRecentsLangs = menuSelectLanguage.querySelector('[name="targets"]');

    const buildRecentsLanguages = () => {
      eRecentsLangs.innerHTML = "";
      for (const value of twpConfig.get("targetLanguages")) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = langs[value];
        eRecentsLangs.appendChild(option);
      }
      menuSelectLanguage.value = twpConfig.get("targetLanguages")[0];
    };
    buildRecentsLanguages();

    menuSelectLanguage.oninput = () => {
      twpConfig.setTargetLanguage(menuSelectLanguage.value, true);
      pageTranslator.translatePage(menuSelectLanguage.value);
      buildRecentsLanguages();
      updateInterface();

      closeMenu();
    };
  })();

  // show/hide popup on 3 finger tap
  if (twpConfig.get("showPopupMobile") !== "no") {
    window.addEventListener("touchstart", (e) => {
      if (e.touches.length == 3) {
        if (rootElement.isConnected) {
          hidePopup();
        } else {
          showPopup();
        }
      }
    });
  }

  // show popup when clicked on the extension icon on the extension manager
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "showPopupMobile") {
      showPopup();
    }
  });

  pageTranslator.onGetOriginalTabLanguage(function (_tabLanguage) {
    tabLanguage = _tabLanguage || "und";
    if (tabLanguage !== "und") {
      tabLanguage = twpLang.fixTLanguageCode(tabLanguage);
    }
    if (
      twpConfig.get("neverTranslateLangs").indexOf(tabLanguage) === -1 &&
      twpConfig.get("neverTranslateSites").indexOf(tabHostName) === -1 &&
      twpConfig.get("targetLanguage") !== tabLanguage
    ) {
      showPopup();
    }
  });

  // dark/light mode
  function updateTheme() {
    let darkMode = false;
    if (twpConfig.get("darkMode") === "auto") {
      darkMode = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? true
        : false;
    } else {
      darkMode = twpConfig.get("darkMode") === "yes" ? true : false;
    }

    if (darkMode) {
      const lightModeElement = shadowRoot.getElementById("light-mode");
      if (lightModeElement) lightModeElement.remove();
    } else {
      let lightModeElement = shadowRoot.getElementById("light-mode");
      if (!lightModeElement) {
        lightModeElement = document.createElement("style");
        lightModeElement.id = "light-mode";
        lightModeElement.textContent = `
          * {
            --primary-text-color: rgb(36, 34, 34);
            --secondary-text-color: rgb(68, 67, 67);
            --background-color: rgb(238, 236, 236);
            --shadow-color: rgb(115, 148, 211);
            --translate-button-text-color: rgb(91, 153, 247);
            --hover-color: rgb(67, 78, 95);
          }
        `;
        shadowRoot.appendChild(lightModeElement);
      }
    }
  }
  updateTheme();

  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    updateTheme();
  });

  twpConfig.onChanged((name, newValue) => {
    if (name == "darkMode") {
      updateTheme();
    }
  });
})();
