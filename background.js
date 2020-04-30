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

// process messages
chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    if (request.action == "Translate") {    
        if (request.lang) {
            targetLanguage = request.lang
            chrome.storage.local.set({targetLanguage})
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
        chrome.tabs.detectLanguage(sender.tab.id, codeLang => {
            if (codeLang && codeLang != "und") {
                codeLang = codeLang.split('-')[0]
                sendResponse(codeLang)
            } else {
                sendResponse(null)
            }
        })
        return true
    } else if (request.action == "setTargetLanguage") {
        if (request.lang) {
            targetLanguage = request.lang
            chrome.storage.local.set({targetLanguage})
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
    }
})

// get target language saved
var targetLanguage = chrome.i18n.getUILanguage().split("-")[0]
chrome.storage.local.get("targetLanguage").then(onGot => {
    var neverTranslateSites = onGot.targetLanguage
    if (onGot.targetLanguage) {
        targetLanguage = onGot.targetLanguage
    }
})

// listLangs
var langs = []
;(function() {
    var langsObj = languages[chrome.i18n.getUILanguage().split("-")[0]]
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

// get show popup config
var showPopupConfig = "auto"
chrome.storage.local.get("showPopupConfig").then(onGot => {
    if (onGot.showPopupConfig) {
        showPopupConfig = onGot.showPopupConfig
    }
})

// show options page
chrome.runtime.onInstalled.addListener(details => {
    console.log(details)
    var thisVersion = chrome.runtime.getManifest().version
    if (details.reason == "install") {
        chrome.runtime.openOptionsPage()
    } else if (details.reason == "update" && details.previousVersion < "4.8") {
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
