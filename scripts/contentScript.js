if (typeof browser !== 'undefined') {
    chrome = browser
}

var googleTranslateIsInjected = false
var hideGoolgleTranslatorBar = true
var twp_origBodyStyle = null
var twp_gBodyStyle = "position: relative; min-height: 100%; top: 40px;"
var twp_element_style = null

function injectTranslate()
{
    if (!googleTranslateIsInjected) {
        var twp_element_div = document.createElement("div")
        twp_element_div.id = "twp_google_translate_element"
        twp_element_div.style.display = "none"
        document.body.appendChild(twp_element_div)

        var twp_element_script = document.createElement("script");
        twp_element_script.textContent = `
        function twp_googleTranslateElementInit() {
            new google.translate.TranslateElement({}, "twp_google_translate_element");
        }
        `
        document.body.appendChild(twp_element_script)

        twp_element_style = document.createElement("style")
        if (hideGoolgleTranslatorBar) {
            twp_element_style.textContent = ".skiptranslate { opacity: 0; }"
        }
        document.body.appendChild(twp_element_style)

        twp_origBodyStyle = document.body.getAttribute("style")

        var twp_element_script2 = document.createElement("script")
        twp_element_script2.src = "//translate.google.com/translate_a/element.js?cb=twp_googleTranslateElementInit"
        document.body.appendChild(twp_element_script2)

        var twp_resetBodyStyle = () => {
            if (document.body.getAttribute("style") != twp_origBodyStyle) {
                document.body.setAttribute("style", twp_origBodyStyle)
            } else {
                setTimeout(twp_resetBodyStyle, 100)
            }
        }
        if (hideGoolgleTranslatorBar) {
            twp_resetBodyStyle()
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
        if (eSkip.style.display == "" || window.twp_googleTranslateIsInject) {
            if (hideGoolgleTranslatorBar) {
                document.querySelector(".skiptranslate").style.display = "none"
            }
            window.twp_googleTranslateIsInject = true
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
        var eIframe = document.getElementById(":1.container")
        var eBtnTranslate = eIframe.contentWindow.document.getElementById(":1.confirm")
        eBtnTranslate.click()
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
        if (eSkip.style.display == "" || window.twp_googleTranslateIsInject) {
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
        //console.log(e)
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

// toggle google bar
function toggleGoogleBar()
{
    if (googleTranslateIsInjected) {
        if (twp_element_style) {
            if (hideGoolgleTranslatorBar) {
                twp_element_style.textContent = ".skiptranslate { opacity: 100; }"
                document.querySelector(".skiptranslate").style.display = "block"
                document.body.setAttribute("style", twp_gBodyStyle)
            } else {
                twp_element_style.textContent = ".skiptranslate { opacity: 0; }"
                document.querySelector(".skiptranslate").style.display = "none"
                document.body.setAttribute("style", twp_origBodyStyle)
            }
            hideGoolgleTranslatorBar = !hideGoolgleTranslatorBar
        }
    } else {
        hideGoolgleTranslatorBar = false
        injectTranslate()
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
    } else if (request.action == "toggleGoogleBar") {
        toggleGoogleBar()
    }
})

// auto translate pages
chrome.storage.local.get(["alwaysTranslateLangs", "neverTranslateSites"]).then(onGot => {
    var alwaysTranslateLangs = onGot.alwaysTranslateLangs
    if (!alwaysTranslateLangs) {
        alwaysTranslateLangs = []
    }
    var pageLang = getPageLanguage()
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