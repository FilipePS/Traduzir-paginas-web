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
    chrome.storage.local.get("neverTranslateSites").then(onGot => {
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
    chrome.storage.local.get("neverTranslateSites").then(onGot => {
        var neverTranslateSites = onGot.neverTranslateSites
        if (!neverTranslateSites) {
            neverTranslateSites = []
        }

        removeA(neverTranslateSites, url)
        chrome.storage.local.set({neverTranslateSites})
    })   
}

// enable auto translate for a language
function enableAutoTranslate(lang)
{
    chrome.storage.local.get("alwaysTranslateLangs").then(onGot => {
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
    chrome.storage.local.get("alwaysTranslateLangs").then(onGot => {
        var alwaysTranslateLangs = onGot.alwaysTranslateLangs
        if (!alwaysTranslateLangs) {
            alwaysTranslateLangs = []
        }

        removeA(alwaysTranslateLangs, lang)
        chrome.storage.local.set({alwaysTranslateLangs})
    })   
}

// register content script of translation engine
var registeredContentScript = null
async function changeTranslationEngine()
{
    if (registeredContentScript) {
        registeredContentScript.unregister()
        registeredContentScript = null
    }
    if (translationEngine == "google") {
        var file
        if (useNewAlgorithm == "yes") {
            file = "scripts/contentScript_google2.js"
        } else {
            file = "scripts/contentScript_google.js"
        }
        registeredContentScript = await chrome.contentScripts.register({
            matches: ["<all_urls>"],
            allFrames: true,
            js: [{file: file}],
            runAt: "document_end"
        });
    } else if (translationEngine == "yandex") {
        var file
        if (useNewAlgorithm == "yes") {
            file = "scripts/contentScript_yandex2.js"
        } else {
            file = "scripts/contentScript_yandex.js"
        }
        registeredContentScript = await chrome.contentScripts.register({
            matches: ["<all_urls>"],
            allFrames: true,
            js: [{file: file}],
            runAt: "document_end"
        });     
    }
}

function captureGoogleTranslateTKK() {
    return fetch("https://translate.google.com", {
            "credentials": "omit",
            "method": "GET",
            "mode": "cors"
        })
        .then(response => response.text())
        .then(responseText => {
            var result = new RegExp(/\s*tkk\s*\:\s*['"][0-9\.]+(?=['"])/i).exec(responseText)
            if (result) {
                result = new RegExp(/[0-9\.]+/i).exec(result)
                // console.log(result)
                return result[0]
            }
        })
        .catch(e => {
            console.log(e)
        })
}

var googleTranslateTKK = null
captureGoogleTranslateTKK().then(tkk => {
    googleTranslateTKK = tkk
})

setInterval(() => {
    captureGoogleTranslateTKK().then(tkk => {
        if (tkk) {
            googleTranslateTKK = tkk

            chrome.tabs.query({}).then(tabs => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {action: "updateGoogleTranslateTKK", googleTranslateTKK: googleTranslateTKK})
                })
            })
        }
    })    
}, 30 * 1000 * 60)

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
            chrome.tabs.sendMessage(tabs[0].id, {action: "getHostname"}, response => {
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
    } else if (request.action == "getStatus") {
        chrome.tabs.query({currentWindow: true, active: true}, tabs => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "getStatus"}, response => {
                sendResponse(response)
            })
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
            chrome.tabs.sendMessage(tabs[0].id, {action: "getHostname"}).then((response) => {
                if (response) {
                    addSiteToBlackList(response)
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
                    sendResponse(null)
                }
            })
        }, 100);
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
            changeTranslationEngine()
        }       
    } else if (request.action == "getTranslationEngine") {
        sendResponse(translationEngine)
    } else if (request.action == "openOptionsPage") {
        chrome.runtime.openOptionsPage()
    } else if (request.action == "swapEngineTranslator") {
        if (translationEngine == "google") {
            translationEngine = "yandex"
        } else {
            translationEngine = "google"
        }
        chrome.storage.local.set({translationEngine})
        changeTranslationEngine()
    } else if (request.action == "getGoogleTranslateTKK") {
        sendResponse(googleTranslateTKK)
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
            changeTranslationEngine()
        }
    } else if (request.action == "getUseNewAlgorithm") {
        sendResponse(useNewAlgorithm)
    }
})

var showContextMenu = "yes"
chrome.storage.local.get("showContextMenu").then(onGot => {
    if (onGot.showContextMenu) {
        showContextMenu = onGot.showContextMenu
    }
    updateContextMenu()
})

function updateContextMenu() {
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
    if (typeof chrome.contextMenus != 'undefined') {
        chrome.contextMenus.removeAll()
        if (showContextMenu == "yes") {
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
chrome.storage.local.get("targetLanguage").then(onGot => {
    if (onGot.targetLanguage) {
        targetLanguage = onGot.targetLanguage
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

chrome.storage.local.get("translationEngine").then(async onGot => {
    if (onGot.translationEngine) {
        translationEngine = onGot.translationEngine
    }

    await chrome.storage.local.get("useNewAlgorithm").then(onGot => {
        if (onGot.useNewAlgorithm) {
            useNewAlgorithm = onGot.useNewAlgorithm
        }
    })

    changeTranslationEngine()
})

// get show popup config
var showPopupConfig = "auto"
chrome.storage.local.get("showPopupConfig").then(onGot => {
    if (onGot.showPopupConfig) {
        showPopupConfig = onGot.showPopupConfig
    }
})

// show options page
chrome.runtime.onInstalled.addListener(details => {
    var thisVersion = chrome.runtime.getManifest().version
    if (details.reason == "install") {
        // execute contentScript on Extension Install
        chrome.tabs.query({}).then(tabs => {
            tabs.forEach(tab => {
                if (tab.status == "complete") {
                    function injectScript() {
                        if (googleTranslateTKK) {
                            chrome.tabs.executeScript(tab.id, {file: "/scripts/contentScript_google2.js", allFrames: true})
                            if (isMobile.any()) {
                                chrome.tabs.executeScript(tab.id, {file: "/scripts/mobile.js", allFrames: false})
                            }
                        } else {
                            setTimeout(injectScript, 500)
                        }
                    }
                    injectScript()
                }
            })
        })
        chrome.runtime.openOptionsPage()
    } else if (details.reason == "update" && details.previousVersion < "5.0") {
        chrome.runtime.openOptionsPage()
    }
})

// popup for mobile
if (isMobile.any()) {
    chrome.contentScripts.register({
        "js": [{file: "/scripts/mobile.js"}],
        "matches": ["<all_urls>"],
        "runAt": "document_end"
    })
}

if (typeof chrome.contextMenus != 'undefined') {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        chrome.pageAction.openPopup()
        chrome.tabs.sendMessage(tab.id, {action: "getHostname"}, response => {
            if (response) {
                removeSiteFromBlackList(response)
            }
        })
        chrome.tabs.sendMessage(tab.id, {action: "Translate"})
    })
}
