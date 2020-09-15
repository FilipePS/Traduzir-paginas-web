if (typeof browser !== 'undefined') {
    chrome = browser
}

var isMobile = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
    },
    any: function() {
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    }
};

// Avoid outputting the error message "Receiving end does not exist" in the Console.
function checkedLastError() {
    chrome.runtime.lastError
}

// remove element by value
function removeA(arr) {
    var what, a = arguments, L = a.length, ax;
    while (L > 1 && arr.length) {
        what = a[--L];
        while ((ax= arr.indexOf(what)) !== -1) {
            arr.splice(ax, 1);
        }
    }
    return arr;
}

// add site never translate
function addSiteToBlackList(url)
{
    chrome.storage.local.get("neverTranslateSites", onGot => {
        var neverTranslateSites = onGot.neverTranslateSites
        if (!neverTranslateSites) {
            neverTranslateSites = []
        }

        if (neverTranslateSites.indexOf(url) == -1) {
            neverTranslateSites.push(url)
        }

        chrome.storage.local.set({neverTranslateSites})
    })
}

// remove site never translate
function removeSiteFromBlackList(url)
{
    chrome.storage.local.get("neverTranslateSites", onGot => {
        var neverTranslateSites = onGot.neverTranslateSites
        if (!neverTranslateSites) {
            neverTranslateSites = []
        }

        removeA(neverTranslateSites, url)
        chrome.storage.local.set({neverTranslateSites})
    })   
}

function addSiteToWhiteList(url) 
{
    chrome.storage.local.get("alwaysTranslateSites", onGot => {
        var alwaysTranslateSites = onGot.alwaysTranslateSites
        if (!alwaysTranslateSites) {
            alwaysTranslateSites = []
        }

        if (alwaysTranslateSites.indexOf(url) == -1) {
            alwaysTranslateSites.push(url)
        }

        chrome.storage.local.set({alwaysTranslateSites})
    })
}

function removeSiteFromWhiteList(url)
{
    chrome.storage.local.get("alwaysTranslateSites", onGot => {
        var alwaysTranslateSites = onGot.alwaysTranslateSites
        if (!alwaysTranslateSites) {
            alwaysTranslateSites = []
        }

        removeA(alwaysTranslateSites, url)
        chrome.storage.local.set({alwaysTranslateSites})
    })   
}

// enable auto translate for a language
function enableAutoTranslate(lang)
{
    chrome.storage.local.get("alwaysTranslateLangs", onGot => {
        var alwaysTranslateLangs = onGot.alwaysTranslateLangs
        if (!alwaysTranslateLangs) {
            alwaysTranslateLangs = []
        }

        if (alwaysTranslateLangs.indexOf(lang) == -1) {
            alwaysTranslateLangs.push(lang)
        }

        chrome.storage.local.set({alwaysTranslateLangs})
    })
}

// disable auto translate for a language
function disableAutoTranslate(lang)
{
    chrome.storage.local.get("alwaysTranslateLangs", onGot => {
        var alwaysTranslateLangs = onGot.alwaysTranslateLangs
        if (!alwaysTranslateLangs) {
            alwaysTranslateLangs = []
        }

        removeA(alwaysTranslateLangs, lang)
        chrome.storage.local.set({alwaysTranslateLangs})
    })   
}

function addLangToNeverTranslate(lang) {
    chrome.storage.local.get("neverTranslateThisLanguages", onGot => {
        var neverTranslateThisLanguages = onGot.neverTranslateThisLanguages
        if (!neverTranslateThisLanguages) {
            neverTranslateThisLanguages = []
        }

        if (neverTranslateThisLanguages.indexOf(lang) == -1) {
            neverTranslateThisLanguages.push(lang)
        }

        chrome.storage.local.set({neverTranslateThisLanguages})
    })
}

function removeLangFromNeverTranslate(lang) {
    chrome.storage.local.get("neverTranslateThisLanguages", onGot => {
        var neverTranslateThisLanguages = onGot.neverTranslateThisLanguages
        if (!neverTranslateThisLanguages) {
            neverTranslateThisLanguages = []
        }

        removeA(neverTranslateThisLanguages, lang)
        chrome.storage.local.set({neverTranslateThisLanguages})
    })  
}

function captureGoogleTranslateTKK() {
    return fetch("https://translate.google.com", {
            "credentials": "omit",
            "method": "GET",
            "mode": "no-cors",
            "referrerPolicy": "no-referrer"
        })
        .then(response => response.text())
        .then(responseText => {
            var result = new RegExp(/\s*tkk\s*\:\s*['"][0-9\.]+(?=['"])/i).exec(responseText)
            if (result) {
                result = new RegExp(/[0-9\.]+/i).exec(result)
                return result[0]
            }
        })
}

var googleTranslateTKK = undefined
function updateGoogleTranslateTKK() {
    return captureGoogleTranslateTKK()
    .then(tkk => {
        if (tkk) {
            googleTranslateTKK = tkk
        
            chrome.tabs.query({}, tabs => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {action: "updateGoogleTranslateTKK", googleTranslateTKK: googleTranslateTKK}, checkedLastError)
                })
            })
        } else {
            throw "Tkk invalid";
        }
    })
}

updateGoogleTranslateTKK()
.catch(e => {
    googleTranslateTKK = null
    console.error(e)

    function foo() {
        updateGoogleTranslateTKK()
        .catch(e => {
            console.error(e)
            setTimeout(foo, 10000)
        })
    }
    setTimeout(foo, 10000)
})

setInterval(updateGoogleTranslateTKK, 30 * 1000 * 60)

// process messages
chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    if (request.action == "Translate") {    
        if (request.lang) {
            targetLanguage = request.lang
            if (targetLanguage.toLowerCase() != "zh-cn" && targetLanguage.toLowerCase() != "zh-tw") {
                targetLanguage = targetLanguage.split("-")[0]
            }
            chrome.storage.local.set({targetLanguage})
            updateContextMenu()
        }
        chrome.tabs.query({currentWindow: true, active: true}, tabs => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "getHostname"}, {frameId: 0}, response => {
                checkedLastError()
                if (response) {
                    removeSiteFromBlackList(response)
                }
            })
            chrome.tabs.sendMessage(tabs[0].id, {action: "getDetectedLanguage"}, {frameId: 0}, response => {
                checkedLastError()
                if (response) {
                    removeLangFromNeverTranslate(response)
                }
            })
            chrome.tabs.sendMessage(tabs[0].id, {action: "Translate"}, checkedLastError)
        })
    } else if (request.action == "Restore") {
        chrome.tabs.query({currentWindow: true, active: true}, tabs => {
            checkedLastError()
            chrome.tabs.sendMessage(tabs[0].id, {action: "Restore"})
        })
    } else if (request.action == "getMainFrameStatus") {
        chrome.tabs.sendMessage(sender.tab.id, {action: "getStatus"}, {frameId: 0}, response => {
            checkedLastError()
            sendResponse(response)
        })
        return true
    } else if (request.action == "enableAutoTranslate") {
        if (request.lang) {
            enableAutoTranslate(request.lang)
        }
    } else if (request.action == "disableAutoTranslate") {
        if (request.lang) {
            disableAutoTranslate(request.lang)
        }
    } else if (request.action == "neverTranslateThisSite") {
        chrome.tabs.query({ currentWindow: true, active: true}, tabs => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "getHostname"}, {frameId: 0}, response => {
                checkedLastError()
                if (response) {
                    addSiteToBlackList(response)
                    removeSiteFromWhiteList(response)
                }
            })
        })
    } else if (request.action == "alwaysTranslateThisSite") {
        chrome.tabs.query({ currentWindow: true, active: true}, tabs => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "getHostname"}, {frameId: 0}, response => {
                checkedLastError()
                if (response) {
                    addSiteToWhiteList(response)
                    removeSiteFromBlackList(response)
                }
            })
        })
    } else if (request.action == "showGoogleBar") {
        chrome.tabs.query({currentWindow: true, active: true}, tabs => {
            chrome.tabs.sendMessage(tabs[0].id, request, checkedLastError)
        })
    } else if (request.action == "detectLanguage") {
        setTimeout(() => {
            chrome.tabs.detectLanguage(sender.tab.id, codeLang => {
                if (codeLang && codeLang != "und") {
                    sendResponse(codeLang.split("-")[0])
                } else {
                    setTimeout(() => {
                        chrome.tabs.detectLanguage(sender.tab.id, codeLang => {
                            if (codeLang && codeLang != "und") {
                                sendResponse(codeLang.split("-")[0])
                            } else {
                                sendResponse(null)
                            }
                        })
                    }, 1400)
                }
            })
        }, 120)

        return true
    } else if (request.action == "setTargetLanguage") {
        if (request.lang) {
            targetLanguage = request.lang
            if (targetLanguage.toLowerCase() != "zh-cn" && targetLanguage.toLowerCase() != "zh-tw") {
                targetLanguage = targetLanguage.split("-")[0]
            }
            chrome.storage.local.set({targetLanguage})
            updateContextMenu()
        }
    } else if (request.action == "getTargetLanguage") {
        sendResponse(targetLanguage)
    } else if (request.action == "getLangs") {
        sendResponse(langs)
    } else if (request.action == "setShowPopupConfig") {
        if (request.showPopupConfig) {
            showPopupConfig = request.showPopupConfig
            chrome.storage.local.set({showPopupConfig})
        } 
    } else if (request.action == "getShowPopupConfig") {
        sendResponse(showPopupConfig)
    } else if (request.action == "setTranslationEngine") {
        if (request.translationEngine) {
            translationEngine = request.translationEngine
            chrome.storage.local.set({translationEngine})
        }       
    } else if (request.action == "getTranslationEngine") {
        sendResponse(translationEngine)
    } else if (request.action == "openOptionsPage") {
        chrome.tabs.create({url: chrome.runtime.getURL("/options/options.html")})
    } else if (request.action == "swapEngineTranslator") {
        if (translationEngine == "google") {
            translationEngine = "yandex"
        } else {
            translationEngine = "google"
        }
        chrome.storage.local.set({translationEngine})
    } else if (request.action == "getGoogleTranslateTKK") {
        function waitGogleTranslateTKK() {
            if (typeof googleTranslateTKK != "undefined") {
                sendResponse(googleTranslateTKK)
            } else {
                setTimeout(waitGogleTranslateTKK, 500)
            }
        }
        waitGogleTranslateTKK()
        return true
    }
    else if (request.action == "setShowContextMenu") {
        if (request.showContextMenu) {
            showContextMenu = request.showContextMenu
            chrome.storage.local.set({showContextMenu})
            updateContextMenu()
        }
    } else if (request.action == "getShowContextMenu") {
        sendResponse(showContextMenu)
    } else if (request.action == "setUseNewAlgorithm") {
        if (request.useNewAlgorithm) {
            useNewAlgorithm = request.useNewAlgorithm
            chrome.storage.local.set({useNewAlgorithm})
        }
    } else if (request.action == "getUseNewAlgorithm") {
        sendResponse(useNewAlgorithm)
    } else if (request.action == "backgroundFetchJson") {
        fetch(request.url, request.options)
        .then(response => response.json())
        .then(response => {
            sendResponse(response)
        })
        .catch(e => {
            sendResponse(null)
            console.error(e)
        })
        return true
    } else if (request.action == "backgroundFetchText") {
        fetch(request.url, request.options)
        .then(response => response.text())
        .then(response => {
            sendResponse(response)
        })
        .catch(e => {
            sendResponse(null)
            console.error(e)
        })
        return true
    } else if (request.action == "updateStatus") {
        if (request.status && sender.frameId == 0 && sender.tab.active) {
            if (translationStatus != request.status) {
                translationStatus = request.status
                updateContextMenu()
            }
            translationStatus = request.status
        }
    } else if (request.action == "setDarkMode") {
        if (request.darkMode) {
            darkMode = request.darkMode
            chrome.storage.local.set({darkMode})
        }
    } else if (request.action == "getDarkMode") {
        sendResponse(darkMode)
    } else if (request.action == "setShowReleaseNotes") {
        if (request.showReleaseNotes) {
            var showReleaseNotes = request.showReleaseNotes
            chrome.storage.local.set({showReleaseNotes})
        }
    } else if (request.action == "setShowTranslateSelectedContextMenu") {
        if (request.showTranslateSelectedContextMenu) {
            showTranslateSelectedContextMenu = request.showTranslateSelectedContextMenu
            chrome.storage.local.set({showTranslateSelectedContextMenu})
            updateTranslateSelectedContextMenu()
        }
    } else if (request.action == "getShowTranslateSelectedContextMenu") {
        sendResponse(showTranslateSelectedContextMenu)
    } else if (request.action == "neverTranslateThisLanguage") {
        if (request.lang) {
            addLangToNeverTranslate(request.lang)
        }
    }
})

var darkMode = "auto"
chrome.storage.local.get("darkMode", onGot => {
    if (onGot.darkMode) {
        darkMode = onGot.darkMode
    }
})

var showTranslateSelectedContextMenu = "yes"
chrome.storage.local.get("showTranslateSelectedContextMenu", onGot => {
    if (onGot.showTranslateSelectedContextMenu) {
        showTranslateSelectedContextMenu = onGot.showTranslateSelectedContextMenu
    }
    updateTranslateSelectedContextMenu()
})

function updateTranslateSelectedContextMenu(hideNow = false) {
    if (typeof chrome.contextMenus != 'undefined') {
        chrome.contextMenus.remove("translate-selected-text")
        if (showTranslateSelectedContextMenu == "yes" && !hideNow) {
            chrome.contextMenus.create({
                id: "translate-selected-text",
                documentUrlPatterns: ["*://*/*"],
                title: chrome.i18n.getMessage("msgTranslateSelectedText"),
                contexts: ["selection"]
            })
        }
    }   
}

var showContextMenu = "yes"
chrome.storage.local.get("showContextMenu", onGot => {
    if (onGot.showContextMenu) {
        showContextMenu = onGot.showContextMenu
    }
    updateContextMenu()
})

var translationStatus = "prompt"
function updateContextMenu(hideNow = false) {
    if (translationStatus != "prompt") {
        var contextMenuTitle = chrome.i18n.getMessage("btnRestore")
    } else {
        var uilanguage = chrome.i18n.getUILanguage()
        if (uilanguage.toLowerCase() != "zh-cn" && uilanguage.toLowerCase() != "zh-tw") {
            uilanguage = uilanguage.split("-")[0]
        }
        var contextMenuTitle = chrome.i18n.getMessage("msgTranslateFor") + " "
        if (languages[uilanguage]) {
            contextMenuTitle += languages[uilanguage][targetLanguage]
        } else {
            contextMenuTitle += languages['en'][targetLanguage]
        }
    }
    if (typeof chrome.contextMenus != 'undefined') {
        chrome.contextMenus.remove("translate-web-page")
        if (showContextMenu == "yes" && !hideNow) {
            chrome.contextMenus.create({
                id: "translate-web-page",
                documentUrlPatterns: ["*://*/*"],
                title: contextMenuTitle,
                contexts: ["page", "frame"]
            })
        }
    }
}

// get target language saved
var targetLanguage = chrome.i18n.getUILanguage()
if (targetLanguage.toLowerCase() != "zh-cn" && targetLanguage.toLowerCase() != "zh-tw") {
    targetLanguage = targetLanguage.split("-")[0]
}
chrome.storage.local.get("targetLanguage", onGot => {
    if (onGot.targetLanguage) {
        targetLanguage = onGot.targetLanguage

        if (targetLanguage == "zh") {
            if (chrome.i18n.getUILanguage() == "zh-TW") {
                targetLanguage == "zh-TW"
            } else {
                targetLanguage == "zh-CN"
            }
        }

        if (targetLanguage.toLowerCase() != "zh-cn" && targetLanguage.toLowerCase() != "zh-tw") {
            targetLanguage = targetLanguage.split("-")[0]
        }
    }
    updateContextMenu()
})

// listLangs
var langs = []
;(function() {
    var uilanguage = chrome.i18n.getUILanguage()
    if (uilanguage.toLowerCase() != "zh-cn" && uilanguage.toLowerCase() != "zh-tw") {
        uilanguage = uilanguage.split("-")[0]
    }
    var langsObj = languages[uilanguage]
    if (!langsObj) {
        langsObj = languages["en"]
    }

    for (var i in langsObj) {
        langs.push([i, langsObj[i]])
    }

    langs.sort(function(a, b) {
        return a[1].localeCompare(b[1]);
    })
})()

// get translationEngine engine config
var translationEngine = "google"
var useNewAlgorithm = "yes"

chrome.storage.local.get("translationEngine", async onGot => {
    if (onGot.translationEngine) {
        translationEngine = onGot.translationEngine
    }

    await chrome.storage.local.get("useNewAlgorithm", onGot => {
        if (onGot.useNewAlgorithm) {
            useNewAlgorithm = onGot.useNewAlgorithm
        }
    })
})

// get show popup config
var showPopupConfig = "auto"
chrome.storage.local.get("showPopupConfig", onGot => {
    if (onGot.showPopupConfig) {
        showPopupConfig = onGot.showPopupConfig
    }
})

chrome.runtime.onInstalled.addListener(details => {
    if (details.reason == "install") {
        chrome.tabs.create({url: chrome.runtime.getURL("/options/options.html")})
    } else if (details.reason == "update" && chrome.runtime.getManifest().version != details.previousVersion) {
        chrome.storage.local.get("showReleaseNotes", onGot => {
            if (onGot.showReleaseNotes != "no") {
                chrome.storage.local.get("lastTimeShowingReleaseNotes", onGot => {
                    var lastTimeShowingReleaseNotes = onGot.lastTimeShowingReleaseNotes
                    let showReleaseNotes = false
                    if (lastTimeShowingReleaseNotes) {
                        var date = new Date();
                        date.setDate(date.getDate() - 21)
                        if (date.getTime() > lastTimeShowingReleaseNotes) {
                            showReleaseNotes = true
                            lastTimeShowingReleaseNotes = Date.now()
                            chrome.storage.local.set({lastTimeShowingReleaseNotes})
                        }
                    } else {
                        showReleaseNotes = true
                        lastTimeShowingReleaseNotes = Date.now()
                        chrome.storage.local.set({lastTimeShowingReleaseNotes})
                    }
                
                    if (showReleaseNotes) {
                        chrome.tabs.create({url: "https://filipeps.github.io/Traduzir-paginas-web/release_notes/"})
                    }
                })
            }
        })
    }
})

if (typeof chrome.contextMenus != 'undefined') {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId == "translate-web-page") {
            if (translationStatus == "progress" || translationStatus == "finish") {
                chrome.tabs.sendMessage(tab.id, {action: "Restore"}, checkedLastError)
            } else {
                chrome.tabs.sendMessage(tab.id, {action: "getHostname"}, {frameId: 0}, response => {
                    checkedLastError()
                    if (response) {
                        removeSiteFromBlackList(response)
                    }
                })
                chrome.tabs.sendMessage(tab.id, {action: "getDetectedLanguage"}, {frameId: 0}, response => {
                    checkedLastError()
                    if (response) {
                        removeLangFromNeverTranslate(response)
                    }
                })
                chrome.tabs.sendMessage(tab.id, {action: "Translate"}, checkedLastError)
            }
        } else if (info.menuItemId == "translate-selected-text") {
            chrome.tabs.sendMessage(tab.id, {action: "TranslateSelectedText"}, checkedLastError)
        }
    })

    chrome.tabs.onActivated.addListener(activeInfo => {
        chrome.tabs.sendMessage(activeInfo.tabId, {action: "getStatus"}, {frameId: 0}, status => {
            checkedLastError()
            if (status) {
                translationStatus = status
                updateContextMenu()
                updateTranslateSelectedContextMenu()
            } else {
                updateContextMenu(true)
                updateTranslateSelectedContextMenu(true)
            }
        })
    })
}

if (isMobile.any()) {
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
        chrome.tabs.sendMessage(tab.id, {action: "showMobilePopup"}, {frameId: 0}, checkedLastError)
    })
} else {
    chrome.browserAction.setPopup({popup: "popup/popup.html"})
    if (chrome.pageAction) {
        var themeColorPopupText = null
        chrome.theme.getCurrent().then(theme => {
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
        matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
            if (matchMedia("(prefers-color-scheme: dark)").matches) {
                darkMode = true
            } else {
                darkMode = false
            }
            updateIconInAllTabs()
        })

        function getSVGIcon() {
            var svgXml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path fill="$(fill);" fill-opacity="$(fill-opacity);" d="M45 392h256c4.819 0 9.346-2.314 12.173-6.226 2.813-3.926 3.589-8.95 2.051-13.521L195.238 10.269A14.995 14.995 0 0 0 181 0H45C20.186 0 0 20.186 0 45v302c0 24.814 20.186 45 45 45zm76-270c20.054 0 38.877 7.808 53.042 21.973 5.845 5.874 5.845 15.366-.015 21.226-5.859 5.83-15.366 5.845-21.226-.015C144.32 156.673 133.026 152 121 152c-24.814 0-45 20.186-45 45s20.186 45 45 45c19.53 0 36.024-12.578 42.237-30H136c-8.291 0-15-6.709-15-15s6.709-15 15-15h45c8.291 0 15 6.709 15 15 0 41.353-33.647 75-75 75s-75-33.647-75-75 33.647-75 75-75z"/>
            <path fill="$(fill);" fill-opacity="$(fill-opacity);" d="M226.882 378.932c28.35 85.716 26.013 84.921 34.254 88.658a14.933 14.933 0 0 0 6.186 1.342c5.706 0 11.16-3.274 13.67-8.809l36.813-81.19z"/>
            <g>
              <path fill="$(fill);" fill-opacity="$(fill-opacity);" d="M467 121H247.043L210.234 10.268A15 15 0 0 0 196 0H45C20.187 0 0 20.187 0 45v301c0 24.813 20.187 45 45 45h165.297l36.509 110.438c2.017 6.468 7.999 10.566 14.329 10.566.035 0 .07-.004.105-.004h205.761c24.813 0 45-20.187 45-45V166C512 141.187 491.813 121 467 121zM45 361c-8.271 0-15-6.729-15-15V45c0-8.271 6.729-15 15-15h140.179l110.027 331H45zm247.729 30l-29.4 64.841L241.894 391zM482 467c0 8.271-6.729 15-15 15H284.408l45.253-99.806a15.099 15.099 0 0 0 .571-10.932L257.015 151H467c8.271 0 15 6.729 15 15z"/>
              <path fill="$(fill);" fill-opacity="$(fill-opacity);" d="M444.075 241h-45v-15c0-8.284-6.716-15-15-15-8.284 0-15 6.716-15 15v15h-45c-8.284 0-15 6.716-15 15 0 8.284 6.716 15 15 15h87.14c-4.772 14.185-15.02 30.996-26.939 47.174a323.331 323.331 0 0 1-7.547-10.609c-4.659-6.851-13.988-8.628-20.838-3.969-6.85 4.658-8.627 13.988-3.969 20.839 4.208 6.189 8.62 12.211 13.017 17.919-7.496 8.694-14.885 16.57-21.369 22.94-5.913 5.802-6.003 15.299-.2 21.212 5.777 5.889 15.273 6.027 21.211.201.517-.508 8.698-8.566 19.624-20.937 10.663 12.2 18.645 20.218 19.264 20.837 5.855 5.855 15.35 5.858 21.208.002 5.858-5.855 5.861-15.352.007-21.212-.157-.157-9.34-9.392-21.059-23.059 21.233-27.448 34.18-51.357 38.663-71.338h1.786c8.284 0 15-6.716 15-15 0-8.284-6.715-15-14.999-15z"/>
            </g>
          </svg>
            `.replace(/\$\(fill\-opacity\)\;/g, '0.5')

            var svg64
            if (themeColorPopupText) {
                svg64 = btoa(svgXml.replace(/\$\(fill\)\;/g, themeColorPopupText))
            } else if (darkMode) {
                svg64 = btoa(svgXml.replace(/\$\(fill\)\;/g, "white"))
            } else {
                svg64 = btoa(svgXml.replace(/\$\(fill\)\;/g, "black"))
            }

            var b64Start = 'data:image/svg+xml;base64,';
            var image64 = b64Start + svg64;

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
    }
}

chrome.commands.onCommand.addListener(command => {
    if (command === "toggle-translation") {
        chrome.tabs.query({currentWindow: true, active: true}, tabs => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "toggle-translation"}, checkedLastError)
        })
    }
})
