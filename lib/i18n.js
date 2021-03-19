"use strict";

{
    chrome.i18n.translateDocument = function (root = document) {
        for (const element of root.querySelectorAll("[data-i18n]")) {
            let text = chrome.i18n.getMessage(element.getAttribute("data-i18n"))
            if (!text) {
                continue;
            }

            element.textContent = text
        }

        for (const element of root.querySelectorAll("[data-i18n-title]")) {
            let text = chrome.i18n.getMessage(element.getAttribute("data-i18n-title"))
            if (!text) {
                continue;
            }

            element.setAttribute("title", text)
        }
    }
    
    if (chrome.tabs) { // 
        chrome.i18n.translateDocument()
    }
}