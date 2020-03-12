if (typeof browser !== 'undefined') {
    chrome = browser
}

function injectTranslate()
{
    if (!document.getElementById("twp_google_translate_element")) {
        var twp_element

        twp_element = document.createElement("div")
        twp_element.id = "twp_google_translate_element"
        twp_element.style.display = "none"
        document.body.appendChild(twp_element)

        twp_element = document.createElement("script");
        twp_element.textContent = `
        function twp_googleTranslateElementInit() {
            new google.translate.TranslateElement({}, "twp_google_translate_element");
        }
        `
        document.body.appendChild(twp_element)

        twp_element = document.createElement("style")
        twp_element.textContent = ".skiptranslate { opacity: 0; }"
        document.body.appendChild(twp_element)

        var twp_origBodyStyle = document.body.getAttribute("style")

        twp_element = document.createElement("script")
        twp_element.src = "//translate.google.com/translate_a/element.js?cb=twp_googleTranslateElementInit"
        document.body.appendChild(twp_element)

        var twp_resetBodyStyle = () => {
            if (document.body.getAttribute("style") != twp_origBodyStyle) {
                document.body.setAttribute("style", twp_origBodyStyle)
            } else {
                setTimeout(twp_resetBodyStyle, 100)
            }
        }
        twp_resetBodyStyle()
    }
}

function ifTranslateInjected(callback)
{
    var eIframe = document.getElementById(":1.container")
    if (eIframe) {
        var eSkip = document.querySelector(".skiptranslate")
        if (eSkip.style.display == "" || window.twp_googleTranslateIsInject) {
            document.querySelector(".skiptranslate").style.display = "none"
            window.twp_googleTranslateIsInject = true
            callback()
        } else {
            setTimeout(ifTranslateInjected, 500, callback)
        }
    } else {
        setTimeout(ifTranslateInjected, 500, callback)
    }
}
function translate()
{
    ifTranslateInjected(() => {
        var eIframe = document.getElementById(":1.container")
        var eBtnTranslate = eIframe.contentWindow.document.getElementById(":1.confirm")
        eBtnTranslate.click()
    })
}

function restore()
{
    ifTranslateInjected(() => {
        var eIframe = document.getElementById(":1.container")
        var eBtnRestore = eIframe.contentWindow.document.getElementById(":1.restore")
        eBtnRestore.click()
    })
}

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
            }
        }
    } catch (e) {
        //console.log(e)
    }
}

function getPageLanguage()
{
    var eHtml = document.getElementsByTagName("html")[0]

    if (eHtml) {
        return eHtml.getAttribute("lang") || eHtml.getAttribute("xml:lang");
    }
}


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
    }
})

