if (typeof browser !== 'undefined') {
    chrome = browser
}

var scriptInjectTranslateObj = null
var scriptTranslateObj = null

function registerScripts()
{
    if (!scriptInjectTranslateObj) {
        chrome.contentScripts.register({
            "js": [{file: "/scripts/injectTranslate.js"}],
            "matches": ["<all_urls>"],
            "runAt": "document_end"
        }).then((value) => {
            scriptInjectTranslateObj = value
        })
    }
    if (!scriptTranslateObj) {
        chrome.contentScripts.register({
            "js": [{file: "/scripts/translate.js"}],
            "matches": ["<all_urls>"],
            "runAt": "document_end"
        }).then((value) => {
            scriptTranslateObj = value
        })
    }
}

function unregisterScripts()
{
    if (scriptInjectTranslateObj) {
        scriptInjectTranslateObj.unregister()
        scriptInjectTranslateObj = null
    }
    if (scriptTranslateObj) {
        scriptTranslateObj.unregister()
        scriptTranslateObj = null
    }
}

if (localStorage.getItem("alwaysTranslate") == "true") {
    registerScripts()
}

chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    if (request.name == "alwaysTranslate") { 
        if (request.value == true) {
            registerScripts()
        } else {
            unregisterScripts()
        }
    }
})
