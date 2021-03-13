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

    location = chrome.runtime.getURL("/popup/popup.html")
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
        if (value[0] === "zh" || value[0] === "un" || value[0] === "und") return;
        const option = document.createElement("option")
        option.value = value[0]
        option.textContent = value[1]
        selectTargetLanguage.appendChild(option)
    })
})()

twpConfig.onReady(function() {
    function enableDarkMode() {
        if (!$("#darkModeElement")) {
            const el = document.createElement("style")
            el.setAttribute("id", "darkModeElement")
            el.setAttribute("rel", "stylesheet")
            el.textContent = `
            * {
                scrollbar-color: #202324 #454a4d;
            }
            
            body {
                color: rgb(231, 230, 228) !important;
                background-color: #181a1b !important;
            }

            .mdiv, .md {
                background-color: rgb(231, 230, 228);
            }
            
            #btnClose:hover {
                background-color: #454a4d !important;
            }
            
            select {
                color: rgb(231, 230, 228) !important;
                background-color: #181a1b !important;
            }
            `
            document.head.appendChild(el)
        }
    }
    
    function disableDarkMode() {
        if ($("#darkModeElement")) {
            $("#darkModeElement").remove()
        }
    }
    
    switch(twpConfig.get("darkMode")) {
        case "auto":
            if (matchMedia("(prefers-color-scheme: dark)").matches) {
                enableDarkMode()
            } else {
                disableDarkMode()
            }
            break
        case "yes":
            enableDarkMode()
            break
        case "no":
            disableDarkMode()
            break
        default:
            break
    }
})
