"use strict";

var $ = document.querySelector.bind(document)

const btnTranslate = $("#btnTranslate")
const btnClose = $("#btnClose")
const selectTargetLanguage = $("select")

btnClose.addEventListener("click", () => {
    window.close()
})

btnTranslate.addEventListener("click", () => {
    const targetLanguage = selectTargetLanguage.value

    twpConfig.setTargetLanguage(targetLanguage)

    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, {action: "translatePage", targetLanguage: targetLanguage})
    })

    location = chrome.runtime.getURL("popup/popup.html")
})

// fill language list
;(function() {
    let uilanguage = chrome.i18n.getUILanguage()
    uilanguage = twpLang.fixLanguageCode(uilanguage)

    let langs = twpLang.languages[uilanguage]
    if (!langs) {
        langs = twpLang.languages["en"]
    }

    const langsSorted = []

    for (const i in langs) {
        langsSorted.push([i, langs[i]])
    }

    langsSorted.sort(function(a, b) {
        return a[1].localeCompare(b[1]);
    })

    langsSorted.forEach(value => {
        if (value[0] === "zh") return;
        const option = document.createElement("option")
        option.value = value[0]
        option.textContent = value[1]
        selectTargetLanguage.appendChild(option)
    })
})()