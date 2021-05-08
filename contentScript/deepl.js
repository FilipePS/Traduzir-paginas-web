"use strict";

{
    function translate(text) {
        return new Promise(resolve => {
            const source_textarea = document.querySelector(".lmt__source_textarea")
            const target_textarea = document.querySelector(".lmt__target_textarea")
    
            const event = new Event("change")
    
            source_textarea.value = text
            source_textarea.dispatchEvent(event)
    
            function checkresult(oldvalue, count=0) {
                if (count > 8 || target_textarea.value !== oldvalue) {
                    resolve(target_textarea.value)
                    return
                }
                setTimeout(checkresult, 200, oldvalue, ++count)
            }
            checkresult(target_textarea.value)
        })
    }

    if (location.hash.startsWith("#!!!")) {
        const text = decodeURIComponent(location.hash.substring(4))
        location.hash = ""
        
        translate(text)
        .then(result => {
            console.log(result)
        })
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "translateTextWithDeepL") {
            translate(request.text)
            .then(result => {
                console.log(result)
                sendResponse(result)
            })
        }

        return true
    })
}