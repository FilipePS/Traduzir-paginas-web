"use strict";

var $ = document.querySelector.bind(document)

twpConfig.onReady(function () {
    if (!navigator.userAgent.includes("Firefox")) {
        document.body.style.minWidth = "300px"
    }

    // get elements
    const btnSwitchInterfaces = document.getElementById("btnSwitchInterfaces")
    const divIconTranslateContainer = document.getElementById("divIconTranslateContainer")
    const divIconTranslate = document.getElementById("divIconTranslate")
    const iconTranslate = document.getElementById("iconTranslate")

    const lblTranslate = document.getElementById("lblTranslate")
    const lblTranslating = document.getElementById("lblTranslating")
    const lblTranslated = document.getElementById("lblTranslated")
    const lblError = document.getElementById("lblError")
    const lblTargetLanguage = document.getElementById("lblTargetLanguage")

    const divAlwaysTranslate = document.getElementById("divAlwaysTranslateThisLang")
    const cbAlwaysTranslate = document.getElementById("cbAlwaysTranslateThisLang")
    const lblAlwaysTranslate = document.getElementById("lblAlwaysTranslateThisLang")

    const selectTargetLanguage = document.getElementById("selectTargetLanguage")

    const divOptionsList = document.getElementById("divOptionsList")

    const btnReset = document.getElementById("btnReset")
    const btnTranslate = document.getElementById("btnTranslate")
    const btnRestore = document.getElementById("btnRestore")
    const btnTryAgain = document.getElementById("btnTryAgain")
    const btnOptionsDiv = document.getElementById("btnOptionsDiv")
    const btnOptions = document.getElementById("btnOptions")

    const divDonate = document.getElementById("divDonate")
    const msgHelpDevelopment = document.getElementById("msgHelpDevelopment")
    const btnDonateWithPaypal = document.getElementById("btnDonateWithPaypal")

    $("#btnOptionB").innerHTML += ' <i class="arrow down"></i>'
    $("#btnOptions option[value='donate']").innerHTML += " &#10084;";

    var cStyle = getComputedStyle(document.querySelector("#btnOptionB"))
    btnOptions.style.width = (parseInt(cStyle.width) + 0) + "px"

    // Avoid outputting the error message "Receiving end does not exist" in the Console.
    function checkedLastError() {
        chrome.runtime.lastError
    }

    function enableDarkMode() {
        if (!document.getElementById("darkModeElement")) {
            const el = document.createElement("style")
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
            
            #btnSwitchInterfaces:hover {
                background-color: #454a4d !important;
                color: rgb(231, 230, 228) !important;
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
        if (document.getElementById("darkModeElement")) {
            document.getElementById("darkModeElement").remove()
        }
    }

    if (twpConfig.get("darkMode") == "auto") {
        if (matchMedia("(prefers-color-scheme: dark)").matches) {
            enableDarkMode()
        } else {
            disableDarkMode()
        }
    } else if (twpConfig.get("darkMode") == "yes") {
        enableDarkMode()
    } else {
        disableDarkMode()
    }

    let originalPageLanguage = "und"
    let currentPageLanguage = "und"
    let currentPageLanguageState = "original"
    let currentPageTranslatorService = twpConfig.get("pageTranslatorService")
    let targetLanguages = twpConfig.get("targetLanguages")

    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        chrome.tabs.sendMessage(tabs[0].id, {action: "getOriginalPageLanguage"}, {frameId: 0}, pageLanguage => {
            if (pageLanguage && (pageLanguage = twpLang.checkLanguageCode(pageLanguage))) {
                originalPageLanguage = pageLanguage
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

    let showSelectTargetLanguage = false
    function updateInterface() {
        if (currentPageTranslatorService == "yandex") {
            $("#btnOptions option[value='translateInExternalSite']").textContent = chrome.i18n.getMessage("msgOpenOnYandexTranslator")
            $("#iconTranslate").setAttribute("src", "/icons/yandex-translate-32.png")
        } else { // google
            $("#btnOptions option[value='translateInExternalSite']").textContent = chrome.i18n.getMessage("btnOpenOnGoogleTranslate")
            $("#iconTranslate").setAttribute("src", "/icons/google-translate-32.png")
        }

        let showAlwaysTranslateCheckbox = false

        if (originalPageLanguage !== "und") {
            const alwaysTranslateText = chrome.i18n.getMessage("lblAlwaysTranslate")
            $("#cbAlwaysTranslateThisLang").checked = twpConfig.get("alwaysTranslateLangs").indexOf(originalPageLanguage) !== -1
            $("#lblAlwaysTranslateThisLang").textContent = (alwaysTranslateText ? alwaysTranslateText : "Always translate from") + " " + twpLang.codeToLanguage(originalPageLanguage)
            $("#divAlwaysTranslateThisLang").style.display = "block"

            const neverTranslateLangText = chrome.i18n.getMessage("btnNeverTranslateThisLanguage")
            if (twpConfig.get("neverTranslateLangs").indexOf(originalPageLanguage) === -1) {
                $("option[data-i18n=btnNeverTranslateThisLanguage").textContent = neverTranslateLangText ? neverTranslateLangText : "Never translate this language"
            } else {
                $("option[data-i18n=btnNeverTranslateThisLanguage").textContent = neverTranslateLangText ? "✔ " + neverTranslateLangText : "✔ Never translate this language"
            }
            $("option[data-i18n=btnNeverTranslateThisLanguage").style.display = "block"
            
            showAlwaysTranslateCheckbox = true
        }

        btnRestore.className = btnRestore.className.replace(" w3-disabled", "")

        if (showSelectTargetLanguage) {
            lblTranslate.style.display = "none"
            lblTranslating.style.display = "none"
            lblTranslated.style.display = "none"
            lblError.style.display = "none"
            lblTargetLanguage.style.display = "inline"

            selectTargetLanguage.style.display = "inline"
            btnReset.style.display = "inline"

            divAlwaysTranslate.style.display = "none"
            btnTranslate.style.display = "inline"
            btnRestore.style.display = "none"
            btnTryAgain.style.display = "none"
            btnOptionsDiv.style.display = "none"
        } else {
            divIconTranslateContainer.style.display = "none"
            lblTargetLanguage.style.display = "none"
            selectTargetLanguage.style.display = "none"
            btnReset.style.display = "none"
            switch (currentPageLanguageState) {
                case "translated":
                    lblTranslate.style.display = "none"
                    lblTranslating.style.display = "none"
                    lblTranslated.style.display = "inline"
                    lblError.style.display = "none"

                    divAlwaysTranslate.style.display = "none"
                    btnTranslate.style.display = "none"
                    btnRestore.style.display = "inline"
                    btnTryAgain.style.display = "none"
                    btnOptionsDiv.style.display = "inline"
                    break;
                case "translating":
                    lblTranslate.style.display = "none"
                    lblTranslating.style.display = "inline"
                    lblTranslated.style.display = "none"
                    lblError.style.display = "none"

                    divAlwaysTranslate.style.display = "none"
                    btnTranslate.style.display = "none"
                    btnRestore.style.display = "inline"
                    btnTryAgain.style.display = "none"
                    btnOptionsDiv.style.display = "none"

                    if (btnRestore.className.indexOf("w3-disabled") == -1) {
                        btnRestore.className += " w3-disabled";
                    }
                    break;
                case "error":
                    lblTranslate.style.display = "none"
                    lblTranslating.style.display = "none"
                    lblTranslated.style.display = "none"
                    lblError.style.display = "inline"

                    divAlwaysTranslate.style.display = "none"
                    btnTranslate.style.display = "none"
                    btnRestore.style.display = "none"
                    btnTryAgain.style.display = "inline"
                    btnOptionsDiv.style.display = "none"

                    divIconTranslateContainer.style.display = "block"
                    break;
                default:
                    lblTranslate.style.display = "inline"
                    lblTranslating.style.display = "none"
                    lblTranslated.style.display = "none"
                    lblError.style.display = "none"

                    showAlwaysTranslateCheckbox ? divAlwaysTranslate.style.display = "block" : divAlwaysTranslate.style.display = "none";
                    btnTranslate.style.display = "inline"
                    btnRestore.style.display = "none"
                    btnTryAgain.style.display = "none"
                    btnOptionsDiv.style.display = "inline"

                    divIconTranslateContainer.style.display = "block"
                    break;
            }
        }
    }
    updateInterface()

    $("#btnTranslate").onclick = e => {
        currentPageLanguageState = "translated"

        chrome.tabs.query({active: true, currentWindow: true}, tabs => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "translatePage"})
        })

        showSelectTargetLanguage = false
        updateInterface()
    }

    $("#btnRestore").onclick = e => {
        currentPageLanguageState = "original"

        chrome.tabs.query({active: true, currentWindow: true}, tabs => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "restorePage"})
        })

        updateInterface()
    }

    $("#btnSwitchInterfaces").addEventListener("click", () => {
        twpConfig.set("useOldPopup", "no")
        window.location = "popup.html"
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

    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        $("#cbAlwaysTranslateThisLang").addEventListener("change", e => {
            const hostname = new URL(tabs[0].url).hostname
            if (e.target.checked) {
                twpConfig.addLangToAlwaysTranslate(originalPageLanguage, hostname)
            } else {
                twpConfig.removeLangFromAlwaysTranslate(originalPageLanguage)
            }
        })
    })

    $("#btnOptions").addEventListener("change", event => {
        const btnOptions = event.target

        chrome.tabs.query({active: true, currentWindow: true}, tabs => {
            const hostname = new URL(tabs[0].url).hostname
            switch (btnOptions.value) {
                case "changeLanguage":
                    showSelectTargetLanguage = true
                    updateInterface()
                    break
                case "alwaysTranslateThisSite":
                    if (twpConfig.get("alwaysTranslateSites").indexOf(hostname) === -1) {
                        twpConfig.addSiteToAlwaysTranslate(hostname)
                    } else {
                        twpConfig.removeSiteFromAlwaysTranslate(hostname)
                    }
                    const btnAlwaysTranslateText = chrome.i18n.getMessage("btnAlwaysTranslate")
                    if (twpConfig.get("alwaysTranslateSites").indexOf(hostname) === -1) {
                        $("option[data-i18n=btnAlwaysTranslate").textContent = btnAlwaysTranslateText ? btnAlwaysTranslateText : "Always translate this site"
                    } else {
                        $("option[data-i18n=btnAlwaysTranslate").textContent = btnAlwaysTranslateText ? "✔ " + btnAlwaysTranslateText : "✔ Always translate this site"
                    }
                    break
                case "neverTranslateThisSite":
                    if (twpConfig.get("neverTranslateSites").indexOf(hostname) === -1) {
                        twpConfig.addSiteToNeverTranslate(hostname)
                    } else {
                        twpConfig.removeSiteFromNeverTranslate(hostname)
                    }
                    window.close()
                    break
                case "alwaysTranslateThisLanguage":
                    twpConfig.addLangToAlwaysTranslate(originalPageLanguage, hostname)
                    break
                case "neverTranslateThisLanguage":
                    if (twpConfig.get("neverTranslateLangs").indexOf(originalPageLanguage) === -1) {
                        twpConfig.addLangToNeverTranslate(originalPageLanguage, hostname)
                    } else {
                        twpConfig.removeLangFromNeverTranslate(originalPageLanguage)
                    }
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

    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
        const hostname = new URL(tabs[0].url).hostname

        const btnNeverTranslateText = chrome.i18n.getMessage("btnNeverTranslate")
        if (twpConfig.get("neverTranslateSites").indexOf(hostname) === -1) {
            $("option[data-i18n=btnNeverTranslate").textContent = btnNeverTranslateText ? btnNeverTranslateText : "Never translate this site"
        } else {
            $("option[data-i18n=btnNeverTranslate").textContent = btnNeverTranslateText ? "✔ " + btnNeverTranslateText : "✔ Never translate this site"
        }

        const btnAlwaysTranslateText = chrome.i18n.getMessage("btnAlwaysTranslate")
        if (twpConfig.get("alwaysTranslateSites").indexOf(hostname) === -1) {
            $("option[data-i18n=btnAlwaysTranslate").textContent = btnAlwaysTranslateText ? btnAlwaysTranslateText : "Always translate this site"
        } else {
            $("option[data-i18n=btnAlwaysTranslate").textContent = btnAlwaysTranslateText ? "✔ " + btnAlwaysTranslateText : "✔ Always translate this site"
        }
    })
})