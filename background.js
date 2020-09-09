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
                    chrome.tabs.sendMessage(tab.id, {action: "updateGoogleTranslateTKK", googleTranslateTKK: googleTranslateTKK})
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
                if (response) {
                    removeSiteFromBlackList(response)
                }
            })
            chrome.tabs.sendMessage(tabs[0].id, {action: "Translate"})
        })
    } else if (request.action == "Restore") {
        chrome.tabs.query({currentWindow: true, active: true}, tabs => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "Restore"})
        })
    } else if (request.action == "getMainFrameStatus") {
        chrome.tabs.sendMessage(sender.tab.id, {action: "getStatus"}, {frameId: 0}, response => {
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
                if (response) {
                    addSiteToBlackList(response)
                    removeSiteFromWhiteList(response)
                }
            })
        })
    } else if (request.action == "alwaysTranslateThisSite") {
        chrome.tabs.query({ currentWindow: true, active: true}, tabs => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "getHostname"}, {frameId: 0}, response => {
                if (response) {
                    addSiteToWhiteList(response)
                    removeSiteFromBlackList(response)
                }
            })
        })
    } else if (request.action == "showGoogleBar") {
        chrome.tabs.query({currentWindow: true, active: true}, tabs => {
            chrome.tabs.sendMessage(tabs[0].id, request)
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
    }
})

var darkMode = "auto"
chrome.storage.local.get("darkMode", onGot => {
    if (onGot.darkMode) {
        darkMode = onGot.darkMode
    }
})

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
        var contextMenuTile = chrome.i18n.getMessage("btnRestore")
    } else {
        var uilanguage = chrome.i18n.getUILanguage()
        if (uilanguage.toLowerCase() != "zh-cn" && uilanguage.toLowerCase() != "zh-tw") {
            uilanguage = uilanguage.split("-")[0]
        }
        var contextMenuTile = chrome.i18n.getMessage("msgTranslateFor") + " "
        if (languages[uilanguage]) {
            contextMenuTile += languages[uilanguage][targetLanguage]
        } else {
            contextMenuTile += languages['en'][targetLanguage]
        }
    }
    if (typeof chrome.contextMenus != 'undefined') {
        chrome.contextMenus.removeAll()
        if (showContextMenu == "yes" && !hideNow) {
            chrome.contextMenus.create({
                id: "translate-web-page",
                documentUrlPatterns: ["*://*/*"],
                title: contextMenuTile,
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
                chrome.tabs.create({url: "https://filipeps.github.io/Traduzir-paginas-web/release_notes/"})
            }
        })
    }
})

if (typeof chrome.contextMenus != 'undefined') {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (translationStatus == "progress" || translationStatus == "finish") {
            chrome.tabs.sendMessage(tab.id, {action: "Restore"})
        } else {
            chrome.tabs.sendMessage(tab.id, {action: "getHostname"}, {frameId: 0}, response => {
                if (response) {
                    removeSiteFromBlackList(response)
                }
            })
            chrome.tabs.sendMessage(tab.id, {action: "Translate"})
        }
    })

    chrome.tabs.onActivated.addListener(activeInfo => {
        chrome.tabs.sendMessage(activeInfo.tabId, {action: "getStatus"}, {frameId: 0}, status => {
            if (status) {
                translationStatus = status
                updateContextMenu()
            } else {
                updateContextMenu(true)
            }
        })
    })
}

if (isMobile.any()) {
    chrome.tabs.query({}, tabs => {
        tabs.forEach(tab => {
            chrome.pageAction.setPopup({tabId: tab.id,popup: ""})
            chrome.pageAction.setIcon({tabId: tab.id, path: "icons/google-translate-32.png"})
        })
    })

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status == "complete") {
            chrome.pageAction.setPopup({tabId: tabId, popup: ""})
            chrome.pageAction.setIcon({tabId: tabId, path: "icons/google-translate-32.png"})
        }
    })
    
    chrome.browserAction.onClicked.addListener(tab => {
        chrome.tabs.sendMessage(tab.id, {action: "showMobilePopup"}, {frameId: 0})
    })
} else {
    chrome.browserAction.setPopup({popup: "icons/google-translate-32.png"})
    if (chrome.pageAction) {
        chrome.tabs.query({}, tabs => {
            var path = ""
            if (matchMedia("(prefers-color-scheme: dark)").matches) {
                path = "icons/translate-dark.svg"
            } else {
                path = "icons/translate-light.svg"
            }
            tabs.forEach(tab => {
                chrome.pageAction.setIcon({tabId: tab.id, path: path})
                chrome.pageAction.show(tab.id)
            })
        })

        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status == "loading") {
                var path = ""
                if (matchMedia("(prefers-color-scheme: dark)").matches) {
                    path = "icons/translate-dark.svg"
                } else {
                    path = "icons/translate-light.svg"
                }
                chrome.pageAction.setIcon({tabId: tabId, path: path})
                chrome.pageAction.show(tabId)
            }
        })
        
        matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
            chrome.tabs.query({}, tabs => {
                var path = ""
                if (matchMedia("(prefers-color-scheme: dark)").matches) {
                    path = "icons/translate-dark.svg"
                } else {
                    path = "icons/translate-light.svg"
                }
                tabs.forEach(tab => {
                    chrome.pageAction.setIcon({tabId: tab.id, path: path})
                })
            })
        })
    }
}

chrome.commands.onCommand.addListener(command => {
    if (command === "toggle-translation") {
        chrome.tabs.query({currentWindow: true, active: true}, tabs => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "toggle-translation"})
        })
    }
})
