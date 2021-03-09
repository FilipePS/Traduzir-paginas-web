"use strict";

var $ = document.querySelector.bind(document)

twpConfig.onReady(function () {
    let originalPageLanguage = "und"
    let currentPageLanguage = "und"
    let currentPageLanguageState = "original"
    let currentPageTranslatorService = twpConfig.get("pageTranslatorService")

    const twpButtons =  document.querySelectorAll("button")

    twpButtons.forEach(button => {
        button.addEventListener("click", event => {
            twpButtons.forEach(button => {
                button.classList.remove("w3-buttonSelected")
            })
            event.target.classList.add("w3-buttonSelected")

            currentPageLanguage = event.target.value
            if (currentPageLanguage === "original") {
                currentPageLanguageState = "original"
            } else {
                currentPageLanguageState = "translated"
                twpConfig.setTargetLanguage(event.target.value)
            }

            chrome.tabs.query({active: true, currentWindow: true}, tabs => {
                chrome.tabs.sendMessage(tabs[0].id, {action: "translatePage", targetLanguage: event.target.value})
            })
        })
    })

    let targetLanguages = twpConfig.get("targetLanguages")
    for (let i = 1; i < 4; i++) {
        const button = twpButtons[i]
        button.value = targetLanguages[i-1]
        button.textContent = twpLang.codeToLanguage(targetLanguages[i-1])
    }

    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, {action: "getOriginalPageLanguage"}, {frameId: 0}, pageLanguage => {
            if (pageLanguage && (pageLanguage = twpLang.checkLanguageCode(pageLanguage))) {
                originalPageLanguage = pageLanguage
                twpButtons[0].childNodes[1].textContent = twpLang.codeToLanguage(originalPageLanguage)
            }
        })

        chrome.tabs.sendMessage(tabs[0].id, {action: "getCurrentPageLanguage"}, {frameId: 0}, pageLanguage => {
            if (pageLanguage) {
                currentPageLanguage = pageLanguage
                updateInterface()
            }
        })

        chrome.tabs.sendMessage(tabs[0].id, {action: "getCurrentPageLanguageState"}, {frameId: 0}, pageLanguageState => {
            if (pageLanguageState) {
                currentPageLanguageState = pageLanguageState
                updateInterface()
            }
        })

        chrome.tabs.sendMessage(tabs[0].id, {action: "getCurrentPageTranslatorService"}, {frameId: 0}, pageTranslatorService => {
            if (pageTranslatorService) {
                currentPageTranslatorService = pageTranslatorService
                updateInterface()
            }
        })
    })
    
    function updateInterface() {
        if (currentPageTranslatorService == "yandex") {
            $("#btnOptions option[value='translateInExternalSite']").textContent = chrome.i18n.getMessage("msgOpenOnYandexTranslator")
            $("#iconTranslate").setAttribute("src", "/icons/yandex-translate-32.png")
        } else { // google
            $("#btnOptions option[value='translateInExternalSite']").textContent = chrome.i18n.getMessage("btnOpenOnGoogleTranslate")
            $("#iconTranslate").setAttribute("src", "/icons/google-translate-32.png")
        }

        twpButtons.forEach(button => {
            button.classList.remove("w3-buttonSelected")
            if ((currentPageLanguageState !== "translated" && button.value === "original") 
            || (currentPageLanguageState === "translated" && button.value === currentPageLanguage)) {
                button.classList.add("w3-buttonSelected")
            }
        })
    }
    updateInterface()
    
    function enableDarkMode() {
        if (!$("#darkModeElement")) {
            var el = document.createElement("style")
            el.setAttribute("id", "darkModeElement")
            el.setAttribute("rel", "stylesheet")
            el.textContent = `
            body {
                color: white !important;
                background-color: #181a1b !important;
            }
            
            .mdiv, .md {
                background-color: white;
            }

            .menuDot {
                background-image:
                    radial-gradient(white 2px, transparent 2px),
                    radial-gradient(white 2px, transparent 2px),
                    radial-gradient(white 2px, transparent 2px);
            }

            #btnClose:hover, #divMenu:hover {
                background-color: #454a4d !important;
            }
            
            select {
                color: white !important;
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
    
    $("#btnClose").addEventListener("click", () => {
        window.close()
    })
    
    $("#divIconTranslate").addEventListener("click", () => {
        chrome.tabs.query({active: true, currentWindow: true}, tabs => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "swapTranslationService"})
        })

        if (currentPageTranslatorService === "google") {
            currentPageTranslatorService = "yandex"
        } else {
            currentPageTranslatorService = "google"
        }

        twpConfig.set("pageTranslatorService", currentPageTranslatorService)

        updateInterface()
    })    
    
    $("#btnOptions").addEventListener("change", event => {
        const btnOptions = event.target

        chrome.tabs.query({active: true, currentWindow: true}, tabs => {
            const hostname = new URL(tabs[0].url).hostname
            switch (btnOptions.value) {
                case "changeLanguage":
                    location = chrome.runtime.getURL("/popup/popup-change-language.html")
                    break
                case "alwaysTranslateThisSite":
                    twpConfig.addSiteToAlwaysTranslate(hostname)
                    break
                case "neverTranslateThisSite":
                    twpConfig.addSiteToNeverTranslate(hostname)
                    window.close()
                    break
                case "alwaysTranslateThisLanguage":
                    twpConfig.addLangToAlwaysTranslate(originalPageLanguage, hostname)
                    break
                case "neverTranslateThisLanguage":
                    twpConfig.addLangToNeverTranslate(originalPageLanguage, hostname)
                    window.close()
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
                    chrome.tabs.create({url: chrome.runtime.getURL("/options/options.html#donation")})
                    break
                default:
                    break
            }
            btnOptions.value = "options"
        })
    })  
})