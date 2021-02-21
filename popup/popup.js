"use strict";

var $ = document.querySelector.bind(document)

chrome.i18n.getUILanguage()

twpConfig.onReady(function () {
    const twpButtons =  document.querySelectorAll("button")

    twpButtons.forEach(button => {
        button.addEventListener("click", event => {
            twpButtons.forEach(button => {
                button.classList.remove("w3-buttonSelected")
            })
            event.target.classList.add("w3-buttonSelected")
        })
    })

    let targetLanguages = twpConfig.get("targetLanguages")
    for (let i = 1; i < 4; i++) {
        const button = twpButtons[i]
        button.value = targetLanguages[i-1]
        button.textContent = codeToLanguage(targetLanguages[i-1])
    }
    
    // Avoid outputting the error message "Receiving end does not exist" in the Console.
    function checkedLastError() {
        chrome.runtime.lastError
    }
    
    function enableDarkMode() {
        if (!$("#darkModeElement")) {
            var el = document.createElement("style")
            el.setAttribute("id", "darkModeElement")
            el.setAttribute("rel", "stylesheet")
            el.textContent = `
            * {
                scrollbar-color: #202324 #454a4d;
            }
            
            body {
                color: #e8e6e3 !important;
                background-color: #181a1b !important;
                border: 1px solid #454a4d;
            }
            
            #btnClose:hover {
                background-color: #454a4d !important;
            }
            
            #selectTargetLanguage, select, option, #btnReset, #btnRestore, #btnTryAgain, #btnOptionB {
                color: #55a9ed !important;
                background-color: #181a1b !important;
                border: 1px solid #454a4d !important;
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
    
    let currentPageTranslatorService = twpConfig.get("pageTranslatorService")

    function updateInterface() {
        if (currentPageTranslatorService == "yandex") {
            $("#btnOptions option[value='translateInExternalSite']").textContent = chrome.i18n.getMessage("msgOpenOnYandexTranslator")
            $("#iconTranslate").setAttribute("src", "/icons/yandex-translate-32.png")
        } else { // google
            $("#btnOptions option[value='translateInExternalSite']").textContent = chrome.i18n.getMessage("btnOpenOnGoogleTranslate")
            $("#iconTranslate").setAttribute("src", "/icons/google-translate-32.png")
        }
    }
    updateInterface()
    
    $("#btnClose").addEventListener("click", () => {
        window.close()
    })
    
    $("#divIconTranslate").addEventListener("click", () => {
        if (currentPageTranslatorService === "google") {
            currentPageTranslatorService = "yandex"
        } else {
            currentPageTranslatorService = "google"
        }
        updateInterface()
    })    
    
    $("#btnOptions").addEventListener("change", event => {
        const btnOptions = event.target

        switch (btnOptions.value) {
            case "neverTranslateThisSite":
                window.close()
                break
            case "alwaysTranslateThisSite":
                break
            case "neverTranslateThisLanguage":
                window.close()
                break
            case "changeLanguage":
                break
            case "translateInExternalSite":
                chrome.tabs.query({active: true, currentWindow: true}, tabs => {
                    if (currentPageTranslatorService === "yandex") {
                        chrome.tabs.create({url: "https://translate.yandex.com/translate?url=" + encodeURIComponent(tabs[0].url)})
                    } else { // google
                        chrome.tabs.create({url: `https://translate.google.${
                            "zh-cn" == navigator.language.toLowerCase() ? "cn" : "com"
                        }/translate?u=` + encodeURIComponent(tabs[0].url)})
                    }
                })
                break
            case "moreOptions":
                chrome.tabs.create({url: chrome.runtime.getURL("/options/options.html")})
                break
            case "donate":
                chrome.tabs.create({url: "https://www.patreon.com/filipeps"})
                break
            default:
                break
        }
        btnOptions.value = "options"
    })  
})