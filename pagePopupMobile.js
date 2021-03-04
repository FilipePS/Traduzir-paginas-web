"use strict";

var $ = document.querySelector.bind(document)

{
    const iconTranslate = $("#iconTranslate")
    const btnOriginal = $("#btnOriginal")
    const btnTranslate = $("#btnTranslate")
    const btnClose = $("#btnClose")

    iconTranslate.addEventListener("click", e => {
        chrome.runtime.sendMessage({action: "swapTranslationService"})
    })

    btnOriginal.addEventListener("click", e => {
        chrome.runtime.sendMessage({action: "restorePage"})
    })

    btnTranslate.addEventListener("click", e => {
        chrome.runtime.sendMessage({action: "translatePage"})
    })

    btnClose.addEventListener("click", e => {
        chrome.runtime.sendMessage({action: "closePagePopupMobile"})
    })
}