"use strict";

void (function () {
  /**
   * Gets the localized string for the specified message
   * @example
   * getMessage("lblAlwaysTranslate", "German")
   * // returns "Always translate from German"
   * getMessage("lblAlwaysTranslate", ["German"])
   * // returns "Always translate from German"
   * @param {string} messageName
   * @param {string | string[]} substitutions
   * @returns {string} localizedString
   */
  function getMessage(messageName, substitutions) {
    return chrome.i18n.getMessage(messageName, substitutions);
  }

  /**
   * translate attribute in all childNodes
   * @param {Document | HTMLElement} root
   * @param {string} attributeName
   */
  function translateAttributes(root, attributeName) {
    for (const element of root.querySelectorAll(
      `[data-i18n-${attributeName}]`
    )) {
      let text = getMessage(
        element.getAttribute(`data-i18n-${attributeName}`),
        element.getAttribute("data-i18n-ph-value")
      );
      if (!text) {
        continue;
      }

      element.setAttribute(attributeName, text);
    }
  }

  /**
   * translate innerText and attributes for a Document or HTMLElement
   * @param {Document | HTMLElement} root
   */
  //@ts-ignore
  chrome.i18n.translateDocument = function (root = document) {
    for (const element of root.querySelectorAll("[data-i18n]")) {
      let text = getMessage(
        element.getAttribute("data-i18n"),
        element.getAttribute("data-i18n-ph-value")
      );
      if (!text) {
        continue;
      }
      element.textContent = text;
    }

    translateAttributes(root, "title");
    translateAttributes(root, "placeholder");
    translateAttributes(root, "label");
  };

  // detects if this script is not a contentScript and then call i18n.translateDocument
  if (typeof chrome.tabs !== "undefined") {
    //@ts-ignore
    chrome.i18n.translateDocument();
  }
})();
