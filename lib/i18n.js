"use strict";

{
    chrome.i18n.translateDocument = function () {
        for (const element of document.querySelectorAll("[data-i18n]")) {
            let text = chrome.i18n.getMessage(element.getAttribute("data-i18n"))
            if (!text) {
                continue;
            }

            element.textContent = text
        }
    }

    chrome.i18n.translateDocument()
}