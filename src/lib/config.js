"use strict";

const twpConfig = (function () {
  /** @type {function[]} */
  const observers = [];
  const defaultTargetLanguages = ["en", "es", "de"];
  /**
   * all configName available
   * @typedef {"uiLanguage" | "pageTranslatorService" | "textTranslatorService" | "textToSpeechService" | "enabledServices" | "ttsSpeed" | "ttsVolume" | "targetLanguage" | "targetLanguageTextTranslation" | "targetLanguages" | "alwaysTranslateSites" | "neverTranslateSites" | "sitesToTranslateWhenHovering" | "langsToTranslateWhenHovering" | "alwaysTranslateLangs" | "neverTranslateLangs" | "customDictionary" | "showTranslatePageContextMenu" | "showTranslateSelectedContextMenu" | "showButtonInTheAddressBar" | "showOriginalTextWhenHovering" | "showTranslateSelectedButton" | "whenShowMobilePopup" | "useOldPopup" | "darkMode" | "popupBlueWhenSiteIsTranslated" | "popupPanelSection" | "showReleaseNotes" | "dontShowIfIsNotValidText" | "dontShowIfPageLangIsTargetLang" | "dontShowIfPageLangIsUnknown" | "dontShowIfSelectedTextIsTargetLang" | "dontShowIfSelectedTextIsUnknown" | "hotkeys" | "expandPanelTranslateSelectedText" | "translateTag_pre" | "enableIframePageTranslation" | "dontSortResults" | "translateDynamicallyCreatedContent" | "autoTranslateWhenClickingALink" | "translateSelectedWhenPressTwice" | "translateTextOverMouseWhenPressTwice" | "translateClickingOnce" | "enableDiskCache" | "useAlternativeService" | "customServices" | "showMobilePopupOnDesktop" | "popupMobileKeepOnScren" | "popupMobilePosition" | "addPaddingToPage" | "proxyServers" | "openaiApiUrl" | "openaiModel" | "openaiApiKey"} DefaultConfigNames
   */
  const defaultConfig = {
    uiLanguage: "default",
    pageTranslatorService: "google", // google yandex bing
    textTranslatorService: "google", // google yandex bing deepl
    textToSpeechService: "google", // google bing
    enabledServices: ["google", "bing", "yandex", "deepl"],
    ttsSpeed: 1.0,
    ttsVolume: 1.0,
    targetLanguage: null,
    targetLanguageTextTranslation: null,
    targetLanguages: [], // "en", "es", "de"
    alwaysTranslateSites: [],
    neverTranslateSites: [],
    sitesToTranslateWhenHovering: [],
    langsToTranslateWhenHovering: [],
    alwaysTranslateLangs: [],
    neverTranslateLangs: [],
    customDictionary: new Map(),
    showTranslatePageContextMenu: "yes",
    showTranslateSelectedContextMenu: "yes",
    showButtonInTheAddressBar: "yes",
    showOriginalTextWhenHovering: "no",
    showTranslateSelectedButton: "yes",
    whenShowMobilePopup: "when-necessary", // when-necessary only-when-i-touch always-show
    useOldPopup: "yes",
    darkMode: "auto", // auto yes no
    popupBlueWhenSiteIsTranslated: "yes",
    popupPanelSection: 1,
    showReleaseNotes: "yes",
    dontShowIfIsNotValidText: "yes",
    dontShowIfPageLangIsTargetLang: "no",
    dontShowIfPageLangIsUnknown: "no",
    dontShowIfSelectedTextIsTargetLang: "no",
    dontShowIfSelectedTextIsUnknown: "no",
    hotkeys: {}, // Hotkeys are obtained from the manifest file
    expandPanelTranslateSelectedText: "no",
    translateTag_pre: "yes",
    enableIframePageTranslation: "yes",
    dontSortResults: "no",
    translateDynamicallyCreatedContent: "yes",
    autoTranslateWhenClickingALink: "no",
    translateSelectedWhenPressTwice: "no",
    translateTextOverMouseWhenPressTwice: "no",
    translateClickingOnce: "no",
    enableDiskCache: "no",
    useAlternativeService: "yes",
    customServices: [],
    showMobilePopupOnDesktop: "no",
    popupMobileKeepOnScren: "no",
    popupMobilePosition: "top", // top bottom
    addPaddingToPage: "no",
    proxyServers: {},
    openaiApiUrl: "https://api.openai.com/v1/chat/completions",
    openaiModel: "gpt-4o-mini",
    openaiApiKey: "",
  };
  const config = structuredClone(defaultConfig);

  let onReadyObservers = [];
  let configIsReady = false;
  let onReadyResolvePromise;
  const onReadyPromise = new Promise(
    (resolve) => (onReadyResolvePromise = resolve)
  );

  /**
   * this function is executed when de config is ready
   */
  function readyConfig() {
    configIsReady = true;
    onReadyObservers.forEach((callback) => callback());
    onReadyObservers = [];
    onReadyResolvePromise();
  }

  const twpConfig = {};

  /**
   * create a listener to run when the settings are ready
   * @param {function} callback
   * @returns {Promise}
   */
  twpConfig.onReady = function (callback = null) {
    if (callback) {
      if (configIsReady) {
        callback();
      } else {
        onReadyObservers.push(callback);
      }
    }
    return onReadyPromise;
  };

  /**
   * get the value of a config
   * @example
   * twpConfig.get("targetLanguages")
   * // returns ["en", "es", "de"]
   * @param {DefaultConfigNames} name
   * @returns {*} value
   */
  twpConfig.get = function (name) {
    return config[name];
  };

  /**
   * set the value of a config
   * @example
   * twpConfig.set("showReleaseNotes", "no")
   * @param {DefaultConfigNames} name
   * @param {*} value
   */
  twpConfig.set = function (name, value) {
    // @ts-ignore
    config[name] = value;
    const obj = {};
    obj[name] = toObjectOrArrayIfTypeIsMapOrSet(value);
    chrome.storage.local.set(obj);
    observers.forEach((callback) => callback(name, value));
  };

  /**
   * export config as JSON string
   * @returns {string} configJSON
   */
  twpConfig.export = function () {
    const r = {
      timeStamp: Date.now(),
      version: chrome.runtime.getManifest().version,
    };

    for (const key in defaultConfig) {
      //@ts-ignore
      r[key] = toObjectOrArrayIfTypeIsMapOrSet(twpConfig.get(key));
    }

    return JSON.stringify(r, null, 4);
  };

  /**
   * import config and reload the extension
   * @param {string} configJSON
   */
  twpConfig.import = function (configJSON) {
    const newconfig = JSON.parse(configJSON);

    for (const key in defaultConfig) {
      if (typeof newconfig[key] !== "undefined") {
        let value = newconfig[key];
        value = fixObjectType(key, value);
        //@ts-ignore
        twpConfig.set(key, value);
      }
    }

    if (
      typeof browser !== "undefined" &&
      typeof browser.commands !== "undefined"
    ) {
      for (const name in config.hotkeys) {
        browser.commands.update({
          name: name,
          shortcut: config.hotkeys[name],
        });
      }
    }

    chrome.runtime.reload();
  };

  /**
   * restore the config to default and reaload the extension
   */
  twpConfig.restoreToDefault = function () {
    // try to reset the keyboard shortcuts
    if (
      typeof browser !== "undefined" &&
      typeof browser.commands !== "undefined"
    ) {
      for (const name of Object.keys(
        chrome.runtime.getManifest().commands || {}
      )) {
        const info = chrome.runtime.getManifest().commands[name];
        if (info.suggested_key && info.suggested_key.default) {
          browser.commands.update({
            name: name,
            shortcut: info.suggested_key.default,
          });
        } else {
          browser.commands.update({
            name: name,
            shortcut: "",
          });
        }
      }
    }

    twpConfig.import(JSON.stringify(defaultConfig));
  };

  /**
   * create a listener to run when a config changes
   * @param {function} callback
   */
  twpConfig.onChanged = function (callback) {
    observers.push(callback);
  };

  // listen to storage changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
    twpConfig.onReady(function () {
      if (areaName === "local") {
        for (const name in changes) {
          const newValue = changes[name].newValue;
          if (config[name] !== newValue) {
            config[name] = fixObjectType(name, newValue);
            observers.forEach((callback) => callback(name, newValue));
          }
        }
      }
    });
  });

  // load config
  chrome.i18n.getAcceptLanguages((acceptedLanguages) => {
    chrome.storage.local.get(null, (onGot) => {
      // load config; convert object/array to map/set if necessary
      for (const name in onGot) {
        config[name] = fixObjectType(name, onGot[name]);
      }

      // if there are any targetLanguage undefined, replace them
      if (config.targetLanguages.some((tl) => !tl)) {
        config.targetLanguages = [...defaultTargetLanguages];
        chrome.storage.local.set({
          targetLanguages: config.targetLanguages,
        });
      }

      // Probably at this point it doesn't have 3 target languages.

      // try to get the 3 target languages through the user defined languages in the browser configuration.
      for (let lang of acceptedLanguages) {
        if (config.targetLanguages.length >= 3) break;
        lang = twpLang.fixTLanguageCode(lang);
        if (lang && config.targetLanguages.indexOf(lang) === -1) {
          config.targetLanguages.push(lang);
        }
      }

      // then try to use de array defaultTargetLanguages ["en", "es", "de"]
      for (const lang in defaultTargetLanguages) {
        if (config.targetLanguages.length >= 3) break;
        if (
          config.targetLanguages.indexOf(defaultTargetLanguages[lang]) === -1
        ) {
          config.targetLanguages.push(defaultTargetLanguages[lang]);
        }
      }

      // if targetLanguages is bigger than 3 remove the surplus
      while (config.targetLanguages.length > 3) config.targetLanguages.pop();

      /*
      // remove the duplicates languages
      config.targetLanguages = [... new Set(config.targetLanguages)]
      //*
      // then try to use de array defaultTargetLanguages ["en", "es", "de"]
      for (const lang of defaultTargetLanguages) {
        if (config.targetLanguages.length >= 3) break;
        if (config.targetLanguages.indexOf(lang) === -1) {
          config.targetLanguages.push(lang);
        }
      }
      //*/

      // if targetLanguage does not exits in targetLanguages, then set it to targetLanguages[0]
      if (
        !config.targetLanguage ||
        config.targetLanguages.indexOf(config.targetLanguage) === -1
      ) {
        config.targetLanguage = config.targetLanguages[0];
      }

      // if targetLanguageTextTranslation does not exits in targetLanguages, then set it to targetLanguages[0]
      if (
        !config.targetLanguageTextTranslation ||
        config.targetLanguages.indexOf(config.targetLanguageTextTranslation) ===
          -1
      ) {
        config.targetLanguageTextTranslation = config.targetLanguages[0];
      }

      // fix targetLanguages
      config.targetLanguages = config.targetLanguages.map((lang) =>
        twpLang.fixTLanguageCode(lang)
      );
      // fix neverTranslateLangs
      config.neverTranslateLangs = config.neverTranslateLangs.map((lang) =>
        twpLang.fixTLanguageCode(lang)
      );
      // fix alwaysTranslateLangs
      config.alwaysTranslateLangs = config.alwaysTranslateLangs.map((lang) =>
        twpLang.fixTLanguageCode(lang)
      );
      // fix targetLanguage
      config.targetLanguage = twpLang.fixTLanguageCode(config.targetLanguage);
      // fix targetLanguageTextTranslation
      config.targetLanguageTextTranslation = twpLang.fixTLanguageCode(
        config.targetLanguageTextTranslation
      );

      // if targetLanguage does not exits in targetLanguages, then set it to targetLanguages[0]
      if (config.targetLanguages.indexOf(config.targetLanguage) === -1) {
        config.targetLanguage = config.targetLanguages[0];
      }
      // if targetLanguageTextTranslation does not exits in targetLanguages, then set it to targetLanguages[0]
      if (
        config.targetLanguages.indexOf(config.targetLanguageTextTranslation) ===
        -1
      ) {
        config.targetLanguageTextTranslation = config.targetLanguages[0];
      }

      // try to save de keyboard shortcuts in the config
      if (typeof chrome.commands !== "undefined") {
        chrome.commands.getAll((results) => {
          try {
            for (const result of results) {
              config.hotkeys[result.name] = result.shortcut;
            }
            twpConfig.set("hotkeys", config.hotkeys);
          } catch (e) {
            console.error(e);
          } finally {
            readyConfig();
          }
        });
      } else {
        readyConfig();
      }
    });
  });

  function addInArray(configName, value) {
    const array = twpConfig.get(configName);
    if (array.indexOf(value) === -1) {
      array.push(value);
      twpConfig.set(configName, array);
    }
  }

  function addInMap(configName, key, value) {
    let map = twpConfig.get(configName);
    if (typeof map.get(key) === "undefined") {
      map.set(key, value);
      twpConfig.set(configName, map);
    }
  }

  function removeFromArray(configName, value) {
    const array = twpConfig.get(configName);
    const index = array.indexOf(value);
    if (index > -1) {
      array.splice(index, 1);
      twpConfig.set(configName, array);
    }
  }

  function removeFromMap(configName, key) {
    const map = twpConfig.get(configName);
    if (typeof map.get(key) !== "undefined") {
      map.delete(key);
      twpConfig.set(configName, map);
    }
  }

  twpConfig.addSiteToTranslateWhenHovering = function (hostname) {
    addInArray("sitesToTranslateWhenHovering", hostname);
  };

  twpConfig.removeSiteFromTranslateWhenHovering = function (hostname) {
    removeFromArray("sitesToTranslateWhenHovering", hostname);
  };

  twpConfig.addLangToTranslateWhenHovering = function (lang) {
    addInArray("langsToTranslateWhenHovering", lang);
  };

  twpConfig.removeLangFromTranslateWhenHovering = function (lang) {
    removeFromArray("langsToTranslateWhenHovering", lang);
  };

  twpConfig.addSiteToAlwaysTranslate = function (hostname) {
    addInArray("alwaysTranslateSites", hostname);
    removeFromArray("neverTranslateSites", hostname);
  };
  twpConfig.removeSiteFromAlwaysTranslate = function (hostname) {
    removeFromArray("alwaysTranslateSites", hostname);
  };
  twpConfig.addSiteToNeverTranslate = function (hostname) {
    addInArray("neverTranslateSites", hostname);
    removeFromArray("alwaysTranslateSites", hostname);
    removeFromArray("sitesToTranslateWhenHovering", hostname);
  };
  twpConfig.addKeyWordTocustomDictionary = function (key, value) {
    addInMap("customDictionary", key, value);
  };
  twpConfig.removeSiteFromNeverTranslate = function (hostname) {
    removeFromArray("neverTranslateSites", hostname);
  };
  twpConfig.removeKeyWordFromcustomDictionary = function (keyWord) {
    removeFromMap("customDictionary", keyWord);
  };
  twpConfig.addLangToAlwaysTranslate = function (lang, hostname) {
    addInArray("alwaysTranslateLangs", lang);
    removeFromArray("neverTranslateLangs", lang);

    if (hostname) {
      removeFromArray("neverTranslateSites", hostname);
    }
  };
  twpConfig.removeLangFromAlwaysTranslate = function (lang) {
    removeFromArray("alwaysTranslateLangs", lang);
  };
  twpConfig.addLangToNeverTranslate = function (lang, hostname) {
    addInArray("neverTranslateLangs", lang);
    removeFromArray("alwaysTranslateLangs", lang);
    removeFromArray("langsToTranslateWhenHovering", lang);

    if (hostname) {
      removeFromArray("alwaysTranslateSites", hostname);
    }
  };
  twpConfig.removeLangFromNeverTranslate = function (lang) {
    removeFromArray("neverTranslateLangs", lang);
  };

  /**
   * Add a new lang to the targetLanguages and remove the last target language. If the language is already in the targetLanguages then move it to the first position
   * @example
   * addTargetLanguage("de")
   * @param {string} lang - langCode
   * @returns
   */
  function addTargetLanguage(lang) {
    const targetLanguages = twpConfig.get("targetLanguages");
    lang = twpLang.fixTLanguageCode(lang);
    if (!lang) return;

    const index = targetLanguages.indexOf(lang);
    if (index === -1) {
      targetLanguages.unshift(lang);
      targetLanguages.pop();
    } else {
      targetLanguages.splice(index, 1);
      targetLanguages.unshift(lang);
    }

    twpConfig.set("targetLanguages", targetLanguages);
  }

  /**
   * set lang as target language for page translation only (not text translation)
   *
   * if the lang in not in targetLanguages then call addTargetLanguage
   * @example
   * twpConfig.setTargetLanguage("de",  true)
   * @param {string} lang - langCode
   * @param {boolean} forTextToo - also call setTargetLanguageTextTranslation
   * @returns
   */
  twpConfig.setTargetLanguage = function (lang, forTextToo = false) {
    const targetLanguages = twpConfig.get("targetLanguages");
    lang = twpLang.fixTLanguageCode(lang);
    if (!lang) return;

    if (targetLanguages.indexOf(lang) === -1 || forTextToo) {
      addTargetLanguage(lang);
    }

    twpConfig.set("targetLanguage", lang);

    if (forTextToo) {
      twpConfig.setTargetLanguageTextTranslation(lang);
    }
  };

  /**
   * set lang as target language for text translation only (not page translation)
   * @example
   * twpConfig.setTargetLanguage("de")
   * @param {string} lang - langCode
   * @returns
   */
  twpConfig.setTargetLanguageTextTranslation = function (lang) {
    lang = twpLang.fixTLanguageCode(lang);
    if (!lang) return;

    twpConfig.set("targetLanguageTextTranslation", lang);
  };

  /**
   * convert object to map or set if necessary, otherwise return the value itself
   * @example
   * fixObjectType("customDictionary", {})
   * // returns Map
   * fixObjectType("targetLanguages", ["en", "es", "de"])
   * // return ["en", "es", "de"] -- Array
   * @param {string} key
   * @param {*} value
   * @returns {Map | Set | *}
   */
  function fixObjectType(key, value) {
    if (defaultConfig[key] instanceof Map) {
      return new Map(Object.entries(value));
    } else if (defaultConfig[key] instanceof Set) {
      return new Set(value);
    } else {
      return value;
    }
  }

  /**
   * convert map and set to object and array respectively, otherwise return the value itself
   * @example
   * toObjectOrArrayIfTypeIsMapOrSet(new Map())
   * // returns {}
   * toObjectOrArrayIfTypeIsMapOrSet({})
   * // returns {}
   * @param {Map | Set | *} value
   * @returns {Object | Array | *}
   */
  function toObjectOrArrayIfTypeIsMapOrSet(value) {
    if (value instanceof Map) {
      return Object.fromEntries(value);
    } else if (value instanceof Set) {
      return Array.from(value);
    } else {
      return value;
    }
  }

  /**
   * Switch between page translation services that are enabled
   * @returns {string} newServiceName
   */
  twpConfig.swapPageTranslationService = function () {
    const pageTranslationServices = ["google", "bing", "yandex"];
    const pageEnabledServices = twpConfig
      .get("enabledServices")
      .filter((svName) => pageTranslationServices.includes(svName));
    const index = pageEnabledServices.indexOf(
      twpConfig.get("pageTranslatorService")
    );
    if (index !== -1) {
      if (pageEnabledServices[index + 1]) {
        twpConfig.set("pageTranslatorService", pageEnabledServices[index + 1]);
      } else {
        twpConfig.set("pageTranslatorService", pageEnabledServices[0]);
      }
    } else {
      twpConfig.set("pageTranslatorService", pageEnabledServices[0]);
    }
    return twpConfig.get("pageTranslatorService");
  };

  return twpConfig;
})();
