if (typeof browser !== 'undefined') {
    chrome = browser
}

var googleTranslateIsInjected = false
var googleTranslateIsLoaded = false
var hideGoolgleTranslatorBar = true
var origBodyStyle = null
var gBodyStyle = "position: relative; min-height: 100%; top: 40px;"
var element_style = null

function injectTranslate()
{
    if (!googleTranslateIsInjected) {
        var element_div = document.createElement("div")
        element_div.id = "twp_google_translate_element"
        element_div.style.display = "none"
        document.body.appendChild(element_div)

        var element_script = document.createElement("script");
        element_script.textContent = `
        function twp_googleTranslateElementInit() {
            new google.translate.TranslateElement({}, "twp_google_translate_element");
        }
        `
        document.body.appendChild(element_script)

        element_style = document.createElement("style")
        if (hideGoolgleTranslatorBar) {
            element_style.textContent = ".skiptranslate { opacity: 0; }"
        }
        document.body.appendChild(element_style)

        origBodyStyle = document.body.getAttribute("style")

        var element_script2 = document.createElement("script")
        element_script2.src = "//translate.google.com/translate_a/element.js?cb=twp_googleTranslateElementInit"
        document.body.appendChild(element_script2)

        var resetBodyStyle = () => {
            if (document.body.getAttribute("style") != origBodyStyle) {
                document.body.setAttribute("style", origBodyStyle)
            } else {
                setTimeout(resetBodyStyle, 100)
            }
        }
        if (hideGoolgleTranslatorBar) {
            resetBodyStyle()
        }

        googleTranslateIsInjected = true
    }
}

// wait for the google translator to load and call the callback
function ifTranslateInjected(callback)
{
    var eIframe = document.getElementById(":1.container")
    if (eIframe) {
        var eSkip = document.querySelector(".skiptranslate")
        if (eSkip.style.display == "" || googleTranslateIsLoaded) {
            if (hideGoolgleTranslatorBar) {
                document.querySelector(".skiptranslate").style.display = "none"
            }
            googleTranslateIsLoaded = true
            callback()
        } else {
            setTimeout(ifTranslateInjected, 10, callback)
        }
    } else {
        setTimeout(ifTranslateInjected, 10, callback)
    }
}

// translate
function translate()
{
    ifTranslateInjected(() => {
        chrome.runtime.sendMessage({action: "getTargetLanguage"}, targetLanguage => {
            if (targetLanguage == "zh") {
                targetLanguage = "zh-CN"
            }

            var eIframe = document.getElementById(":1.container")
            var eBtnTranslate = eIframe.contentWindow.document.getElementById(":1.confirm")
            var eTargetLanguage = document.querySelector("#twp_google_translate_element select")
    
            if (eTargetLanguage) {
                eTargetLanguage.value = targetLanguage
                var evt = document.createEvent("HTMLEvents");
                evt.initEvent("change", false, true);
                eTargetLanguage.dispatchEvent(evt);
            } else {
                eBtnTranslate.click()
            }
        })
    })
}

// show orignal
function restore()
{
    ifTranslateInjected(() => {
        var eIframe = document.getElementById(":1.container")
        var eBtnRestore = eIframe.contentWindow.document.getElementById(":1.restore")
        eBtnRestore.click()
    })
}

// get translation status
function getStatus()
{
    try {
        var eSkip = document.querySelector(".skiptranslate")
        if (eSkip.style.display == "" || googleTranslateIsLoaded) {
            var eIframe = document.getElementById(":1.container")
            var iframeDocument = eIframe.contentWindow.document
            var promptSection = iframeDocument.getElementById(":1.promptSection")
            var finishSection = iframeDocument.getElementById(":1.finishSection")
            var progressSection = iframeDocument.getElementById(":1.progressSection")
            var errorSection = iframeDocument.getElementById(":1.errorSection")

            if (getComputedStyle(promptSection).display != "none") {
                return "prompt"
            } else if(getComputedStyle(finishSection).display != "none") {
                return "finish"
            } else if (getComputedStyle(progressSection).display != "none") {
                return "progress"
            } else if (getComputedStyle(errorSection).display != "none") {
                return "error"
            } else {
                return "unknown"
            }
        }
    } catch (e) {
        console.error(e)
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

// show google bar
function showGoogleBar()
{
    hideGoolgleTranslatorBar = false
    if (googleTranslateIsInjected) {
        ifTranslateInjected(() => {
            element_style.textContent = ".skiptranslate { opacity: 100; }"
            document.querySelector(".skiptranslate").style.display = "block"
            document.body.setAttribute("style", gBodyStyle)
        })
    } else {
        injectTranslate()
        ifTranslateInjected(() => {})
    }
}

function hideGoogleBar()
{
    hideGoolgleTranslatorBar = true
    element_style.textContent = ".skiptranslate { opacity: 0; }"
    document.querySelector(".skiptranslate").style.display = "none"
    document.body.setAttribute("style", origBodyStyle)
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
    } else if (request.action == "showGoogleBar") {
        showGoogleBar()
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
        chrome.storage.local.get(["alwaysTranslateLangs", "neverTranslateSites"], onGot => {
            var alwaysTranslateLangs = onGot.alwaysTranslateLangs
            if (!alwaysTranslateLangs) {
                alwaysTranslateLangs = []
            }
            var pageLang = detectedLanguage
            if (pageLang && alwaysTranslateLangs.indexOf(pageLang) != -1) {
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
