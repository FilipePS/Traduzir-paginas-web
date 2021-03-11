"use strict";

//TODO abrir pagina de opções sem precisar abrir novas abas

/*
var googleTranslateTKK = undefined
function updateGoogleTranslateTKK() {
    var url = `https://translate.google.${
        "zh-cn" == navigator.language.toLowerCase() ? "cn" : "com"
    }/translate_a/element.js?cb=googleTranslateElementInit`
    return backgroundFetchText(url, {
            "credentials": "omit",
            "method": "GET",
            "mode": "no-cors",
            "referrerPolicy": "no-referrer"
        })
        .then(responseText => {
            var result = new RegExp(/tkk\=\'[0-9]+\.[0-9]+\'/i).exec(responseText)
            if (result) {
                result = new RegExp(/[0-9\.]+/i).exec(result)
                googleTranslateTKK = result[0]
        
                chrome.tabs.query({}, tabs => {
                    tabs.forEach(tab => {
                        chrome.tabs.sendMessage(tab.id, {action: "updateGoogleTranslateTKK", googleTranslateTKK})
                    })
                })
                return googleTranslateTKK
            } else {
                throw "Tkk invalid";
            }
        })
}
//*/
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getMainFramePageLanguageState") {
        chrome.tabs.sendMessage(sender.tab.id, {action: "getCurrentPageLanguageState"}, {frameId: 0}, pageLanguageState => {
            sendResponse(pageLanguageState)
        })

        return true
    } else if (request.action === "setPageLanguageState") {
        updateContextMenu(request.pageLanguageState)
    } else if (request.action === "openOptionsPage") {
        chrome.tabs.create({url: chrome.runtime.getURL("/options/options.html")})
    }
})

function updateTranslateSelectedContextMenu() {
    if (typeof chrome.contextMenus !== "undefined") {
        chrome.contextMenus.remove("translate-selected-text")
        if (twpConfig.get("showTranslateSelectedContextMenu") === "yes") {
            chrome.contextMenus.create({
                id: "translate-selected-text",
                documentUrlPatterns: ["*://*/*"],
                title: chrome.i18n.getMessage("msgTranslateSelectedText"),
                contexts: ["selection"]
            })
        }
    }   
}

function updateContextMenu(pageLanguageState="original") {
    let contextMenuTitle
    if (pageLanguageState === "translated") {
        contextMenuTitle = chrome.i18n.getMessage("btnRestore")
    } else {
        const targetLanguage = twpConfig.get("targetLanguages")[0]
        let uilanguage = chrome.i18n.getUILanguage()
        if (uilanguage.toLowerCase() != "zh-cn" && uilanguage.toLowerCase() != "zh-tw") {
            uilanguage = uilanguage.split("-")[0]
        }
        contextMenuTitle = chrome.i18n.getMessage("msgTranslateFor") + " "
        if (twpLang.languages[uilanguage]) {
            contextMenuTitle += twpLang.languages[uilanguage][targetLanguage]
        } else {
            contextMenuTitle += twpLang.languages['en'][targetLanguage]
        }
    }
    if (typeof chrome.contextMenus != 'undefined') {
        chrome.contextMenus.remove("translate-web-page")
        if (twpConfig.get("showTranslatePageContextMenu") == "yes") {
            chrome.contextMenus.create({
                id: "translate-web-page",
                documentUrlPatterns: ["*://*/*"],
                title: contextMenuTitle,
                contexts: ["page", "frame"]
            })
        }
    }
}

chrome.runtime.onInstalled.addListener(details => {
    if (details.reason == "install") {
        chrome.tabs.create({url: chrome.runtime.getURL("/options/options.html")})
    } else if (details.reason == "update" && chrome.runtime.getManifest().version != details.previousVersion) {
        if (plataformInfo.isMobile.any) return;
        
        twpConfig.onReady(function () {
            if (twpConfig.get("showReleaseNotes") !== "yes") return;

            let lastTimeShowingReleaseNotes = twpConfig.get("lastTimeShowingReleaseNotes")
            let showReleaseNotes = false
            if (lastTimeShowingReleaseNotes) {
                const date = new Date();
                date.setDate(date.getDate() - 21)
                if (date.getTime() > lastTimeShowingReleaseNotes) {
                    showReleaseNotes = true
                    lastTimeShowingReleaseNotes = Date.now()
                    twpConfig.set("lastTimeShowingReleaseNotes", lastTimeShowingReleaseNotes)
                }
            } else {
                showReleaseNotes = true
                lastTimeShowingReleaseNotes = Date.now()
                twpConfig.set("lastTimeShowingReleaseNotes", lastTimeShowingReleaseNotes)
            }
        
            if (showReleaseNotes) {
                chrome.tabs.create({url: chrome.runtime.getURL("/options/options.html#release_notes")})
            }
        })
    }
})

if (typeof chrome.contextMenus !== "undefined") {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId == "translate-web-page") {
            //TODO forçar tradução em vez de alternar
            chrome.tabs.sendMessage(tab.id, {action: "toggle-translation"})
        } else if (info.menuItemId == "translate-selected-text") {
            chrome.tabs.sendMessage(tab.id, {action: "TranslateSelectedText"})
        }
    })

    chrome.tabs.onActivated.addListener(activeInfo => {
        updateContextMenu()
        chrome.tabs.sendMessage(activeInfo.tabId, {action: "getCurrentPageLanguageState"}, {frameId: 0}, pageLanguageState => {
            if (pageLanguageState) {
                twpConfig.onReady(function() {
                    updateContextMenu(pageLanguageState)
                })
            }
        })
    })
}

twpConfig.onReady(function() {
    if (plataformInfo.isMobile.any) {
        chrome.tabs.query({}, tabs => {
            tabs.forEach(tab => {
                chrome.pageAction.hide(tab.id)
            })
        })
    
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status == "loading") {
                chrome.pageAction.hide(tabId)
            }
        })
        
        chrome.browserAction.onClicked.addListener(tab => {
            chrome.tabs.sendMessage(tab.id, {action: "showPopupMobile"}, {frameId: 0})
        })
    } else {
        chrome.browserAction.setPopup({popup: "popup/popup.html"})

        //TODO veriricar porque chrome.theme.getCurrent não funciona, apenas browser.theme.getCurrent
        if (chrome.pageAction && browser) {
            let pageLanguageState = "original"

            let themeColorPopupText = null
            browser.theme.getCurrent().then(theme => {
                themeColorPopupText = null
                if (theme.colors && (theme.colors.toolbar_field_text || theme.colors.popup_text)) {
                    themeColorPopupText = theme.colors.toolbar_field_text || theme.colors.popup_text
                }
                updateIconInAllTabs()
            })
    
            chrome.theme.onUpdated.addListener(updateInfo => {
                themeColorPopupText = null
                if (updateInfo.theme.colors && (updateInfo.theme.colors.toolbar_field_text || updateInfo.theme.colors.popup_text)) {
                    themeColorPopupText = updateInfo.theme.colors.toolbar_field_text || updateInfo.theme.colors.popup_text
                }
                updateIconInAllTabs()
            })
    
            let darkMode = false
            if (matchMedia("(prefers-color-scheme: dark)").matches) {
                darkMode = true
            } else {
                darkMode = false
            }
            updateIconInAllTabs()

            matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
                if (matchMedia("(prefers-color-scheme: dark)").matches) {
                    darkMode = true
                } else {
                    darkMode = false
                }
                updateIconInAllTabs()
            })
    
            function getSVGIcon() {
                const svgXml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                <path fill="$(fill);" fill-opacity="$(fill-opacity);" d="M45 392h256c4.819 0 9.346-2.314 12.173-6.226 2.813-3.926 3.589-8.95 2.051-13.521L195.238 10.269A14.995 14.995 0 0 0 181 0H45C20.186 0 0 20.186 0 45v302c0 24.814 20.186 45 45 45zm76-270c20.054 0 38.877 7.808 53.042 21.973 5.845 5.874 5.845 15.366-.015 21.226-5.859 5.83-15.366 5.845-21.226-.015C144.32 156.673 133.026 152 121 152c-24.814 0-45 20.186-45 45s20.186 45 45 45c19.53 0 36.024-12.578 42.237-30H136c-8.291 0-15-6.709-15-15s6.709-15 15-15h45c8.291 0 15 6.709 15 15 0 41.353-33.647 75-75 75s-75-33.647-75-75 33.647-75 75-75z"/>
                <path fill="$(fill);" fill-opacity="$(fill-opacity);" d="M226.882 378.932c28.35 85.716 26.013 84.921 34.254 88.658a14.933 14.933 0 0 0 6.186 1.342c5.706 0 11.16-3.274 13.67-8.809l36.813-81.19z"/>
                <g>
                  <path fill="$(fill);" fill-opacity="$(fill-opacity);" d="M467 121H247.043L210.234 10.268A15 15 0 0 0 196 0H45C20.187 0 0 20.187 0 45v301c0 24.813 20.187 45 45 45h165.297l36.509 110.438c2.017 6.468 7.999 10.566 14.329 10.566.035 0 .07-.004.105-.004h205.761c24.813 0 45-20.187 45-45V166C512 141.187 491.813 121 467 121zM45 361c-8.271 0-15-6.729-15-15V45c0-8.271 6.729-15 15-15h140.179l110.027 331H45zm247.729 30l-29.4 64.841L241.894 391zM482 467c0 8.271-6.729 15-15 15H284.408l45.253-99.806a15.099 15.099 0 0 0 .571-10.932L257.015 151H467c8.271 0 15 6.729 15 15z"/>
                  <path fill="$(fill);" fill-opacity="$(fill-opacity);" d="M444.075 241h-45v-15c0-8.284-6.716-15-15-15-8.284 0-15 6.716-15 15v15h-45c-8.284 0-15 6.716-15 15 0 8.284 6.716 15 15 15h87.14c-4.772 14.185-15.02 30.996-26.939 47.174a323.331 323.331 0 0 1-7.547-10.609c-4.659-6.851-13.988-8.628-20.838-3.969-6.85 4.658-8.627 13.988-3.969 20.839 4.208 6.189 8.62 12.211 13.017 17.919-7.496 8.694-14.885 16.57-21.369 22.94-5.913 5.802-6.003 15.299-.2 21.212 5.777 5.889 15.273 6.027 21.211.201.517-.508 8.698-8.566 19.624-20.937 10.663 12.2 18.645 20.218 19.264 20.837 5.855 5.855 15.35 5.858 21.208.002 5.858-5.855 5.861-15.352.007-21.212-.157-.157-9.34-9.392-21.059-23.059 21.233-27.448 34.18-51.357 38.663-71.338h1.786c8.284 0 15-6.716 15-15 0-8.284-6.715-15-14.999-15z"/>
                </g>
              </svg>
                `.replace(/\$\(fill\-opacity\)\;/g, '0.5')
    
                let svg64
                if (themeColorPopupText) {
                    svg64 = btoa(svgXml.replace(/\$\(fill\)\;/g, themeColorPopupText))
                } else if (darkMode) {
                    if (pageLanguageState === "translated" && twpConfig.get("popupBlueWhenSiteIsTranslated") === "yes") {
                        svg64 = btoa(svgXml.replace(/\$\(fill\)\;/g, "#77f"))
                    } else {
                        svg64 = btoa(svgXml.replace(/\$\(fill\)\;/g, "white"))
                    }
                } else {
                    if (pageLanguageState === "translated" && twpConfig.get("popupBlueWhenSiteIsTranslated") === "yes") {
                        svg64 = btoa(svgXml.replace(/\$\(fill\)\;/g, "#22f"))
                    } else {
                        svg64 = btoa(svgXml.replace(/\$\(fill\)\;/g, "black"))
                    }
                }
    
                const b64Start = 'data:image/svg+xml;base64,';
                const image64 = b64Start + svg64;
    
                return image64
            }
    
            function updateIcon(tabId) {
                chrome.pageAction.setIcon({tabId: tabId, path: getSVGIcon()})
                chrome.pageAction.show(tabId)
            }
    
            function updateIconInAllTabs() {
                chrome.tabs.query({}, tabs => {
                    tabs.forEach(tab => {
                        updateIcon(tab.id)
                    })
                })
            }
    
            chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
                if (changeInfo.status == "loading") {
                    updateIcon(tabId)
                }
            })

            chrome.tabs.onActivated.addListener(activeInfo => {
                pageLanguageState = "original"
                updateIcon(activeInfo.tabId)
                chrome.tabs.sendMessage(activeInfo.tabId, {action: "getCurrentPageLanguageState"}, {frameId: 0}, _pageLanguageState => {
                    if (_pageLanguageState) {
                        pageLanguageState = _pageLanguageState
                        updateIcon(activeInfo.tabId)
                    }
                })
            })

            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                if (request.action === "setPageLanguageState") {
                    pageLanguageState = request.pageLanguageState
                    updateIcon(sender.tab.id)
                }
            })
        }
    }
})

if (typeof chrome.commands !== "undefined") {
    chrome.commands.onCommand.addListener(command => {
        if (command === "toggle-translation") {
            chrome.tabs.query({currentWindow: true, active: true}, tabs => {
                chrome.tabs.sendMessage(tabs[0].id, {action: "toggle-translation"})
            })
        }
    })
}

twpConfig.onReady(function () {
    updateContextMenu()
    updateTranslateSelectedContextMenu()
})