if (typeof browser !== 'undefined') {
    chrome = browser
}

var yandexTranslateIsInjected = false
var yandexTranslateIsLoaded = false
var hideYandexElement = true

function injectTranslate()
{
    if (!yandexTranslateIsInjected) {
        var element_div = document.createElement("div")
        element_div.id = "twp_ytWidget"
        element_div.style.display = "none"
        document.body.appendChild(element_div)

        var element_script = document.createElement("script")
        element_script.src = "https://translate.yandex.net/website-widget/v1/widget.js?widgetId=twp_ytWidget&widgetTheme=light&autoMode=false"
        document.body.appendChild(element_script)

        yandexTranslateIsInjected = true
    }
}

// wait for the google translator to load and call the callback
function ifTranslateInjected(callback)
{
    var ytWidget = document.getElementById("yt-widget")
    if (ytWidget) {
        yandexTranslateIsLoaded = true
        callback()
    } else {
        setTimeout(ifTranslateInjected, 10, callback)
    }
}

// translate
function translate()
{
    restore()
    ifTranslateInjected(() => {
        chrome.runtime.sendMessage({action: "getTargetLanguage"}, targetLanguage => {
            document.querySelectorAll("#yt-widget form input[type='radio']").forEach(value => { 
                if (value.value == targetLanguage) {
                    value.checked = true
                    value.dispatchEvent(new Event("click", {"bubbles":true, "cancelable":false})) 
                }
            })
        })
    })
}

// show orignal
function restore()
{
    ifTranslateInjected(() => {
        document.querySelector("#yt-widget span.yt-button_type_right").click()
    })
}

// get translation status
function getStatus()
{
    try {
        if (yandexTranslateIsLoaded) {
            var classes = Array.from(document.getElementById("yt-widget").classList)
            if (classes.indexOf("yt-state_done") != -1) {
                return "finish"
            } else if(classes.indexOf("yt-state_busy") != -1) {
                return "progress"
            } else {
                return "prompt"
            }
        }
    } catch (e) {
        console.log(e)
    }
}

// get page language
var pageLang = undefined
function getPageLanguage()
{
    if (typeof pageLang == "undefined") {
        var eHtml = document.getElementsByTagName("html")[0]

        if (eHtml) {
            pageLang =  eHtml.getAttribute("lang") || eHtml.getAttribute("xml:lang") || null
            return pageLang
        }
    } else {
        return pageLang
    }
}

// process messages
chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    if (request.action == "Translate") {    
        injectTranslate()
        translate()
    } else if (request.action == "Restore") {
        restore()
    } else if (request.action == "getStatus") {
        sendResponse(getStatus())
    } else if (request.action == "getPageLanguage") {
        sendResponse(getPageLanguage())
    } else if (request.action == "getHostname") {
        sendResponse(window.location.hostname)
    } else if (request.action == "getDetectedLanguage") {
        let foo = () => {
            if (typeof detectedLanguage !== "undefined") {
                sendResponse(detectedLanguage)
            } else {
                setTimeout(foo, 100)
            }
        }
        foo()
        return true
    }
})

// detect language
var detectedLanguage = undefined
chrome.runtime.sendMessage({action: "detectLanguage"}, lang => {
    detectedLanguage = lang

    // auto translate pages
    if (detectedLanguage) {
        chrome.storage.local.get(["alwaysTranslateLangs", "neverTranslateSites"]).then(onGot => {
            var alwaysTranslateLangs = onGot.alwaysTranslateLangs
            if (!alwaysTranslateLangs) {
                alwaysTranslateLangs = []
            }
            var pageLang = detectedLanguage
            if (pageLang && alwaysTranslateLangs.indexOf(pageLang.split("-")[0]) != -1) {
                var neverTranslateSites = onGot.neverTranslateSites
                if (!neverTranslateSites) {
                    neverTranslateSites = []
                }

                if (neverTranslateSites.indexOf(window.location.hostname) == -1) {
                    injectTranslate()
                    translate()
                }
            }
        })
    }
})
