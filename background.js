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

// if (localStorage.getItem("alwaysTranslate") == "true") {
//     registerScripts()
// }

chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    // if (request.name == "alwaysTranslate") { 
    //     if (request.value == true) {
    //         registerScripts()
    //     } else {
    //         unregisterScripts()
    //     }
    // }

    // if (request.command == "translate") {
    //     chrome.tabs.query({ currentWindow: true, active: true}, tabs => {
    //         chrome.tabs.executeScript(tabs[0].id, { file: "/scripts/injectTranslate.js" })
    //         chrome.tabs.executeScript(tabs[0].id, { file: "/scripts/translate.js" })
    //     })
    // } else if (request.command == "showOriginal") {
    //     chrome.tabs.query({ currentWindow: true, active: true}, tabs => {
    //         chrome.tabs.executeScript(tabs[0].id, { file: "/scripts/restore.js" })
    //     })
    // }
})

if (isMobile.any()) {
    chrome.contentScripts.register({
        "js": [{file: "/scripts/mobile.js"}],
        "matches": ["<all_urls>"],
        "runAt": "document_end"
    })
}