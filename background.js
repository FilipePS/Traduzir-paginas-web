if (typeof browser !== 'undefined') {
    chrome = browser
}

var scriptInjectTranslateObj = null
var scriptTranslateObj = null

chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    if (request.name == "alwaysTranslate") {
        chrome.storage.sync.set(request)
        
        if (request.value == true) {
            chrome.contentScripts.register({
                "js": [{file: "/scripts/injectTranslate.js"}],
                "matches": ["<all_urls>"],
                "runAt": "document_end"
            }).then((value) => {
                scriptInjectTranslateObj = value
            })
            chrome.contentScripts.register({
                "js": [{file: "/scripts/translate.js"}],
                "matches": ["<all_urls>"],
                "runAt": "document_end"
            }).then((value) => {
                scriptTranslateObj = value
            })
        } else {
            if (scriptInjectTranslateObj) {
                scriptInjectTranslateObj.unregister()
                scriptInjectTranslateObj = null
            }
            if (scriptTranslateObj) {
                scriptTranslateObj.unregister()
                scriptTranslateObj = null
            }
        }
    }
})
