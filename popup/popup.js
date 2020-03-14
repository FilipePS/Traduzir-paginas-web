if (typeof browser !== 'undefined') {
    chrome = browser
}

// get elements
const btnClose = document.getElementById("btnClose")

const lblTranslate = document.getElementById("lblTranslate")
const lblTranslating = document.getElementById("lblTranslating")
const lblTranslated = document.getElementById("lblTranslated")
const lblError = document.getElementById("lblError")

const divAlwaysTranslate = document.getElementById("divAlwaysTranslate")
const cbAlwaysTranslate = document.getElementById("cbAlwaysTranslate")
const lblAlwaysTranslate = document.getElementById("lblAlwaysTranslate")

const divOptionsList = document.getElementById("divOptionsList")

const btnTranslate = document.getElementById("btnTranslate")
const btnRestore = document.getElementById("btnRestore")
const btnTryAgain = document.getElementById("btnTryAgain")
const btnOptions = document.getElementById("btnOptions")

const btnOpenOnGoogleTranslate = document.getElementById("btnOpenOnGoogleTranslate")
const btnReview = document.getElementById("btnReview")

// translate interface
lblTranslate.textContent = chrome.i18n.getMessage("lblTranslate")
lblTranslating.textContent = chrome.i18n.getMessage("lblTranslating")
lblTranslated.textContent = chrome.i18n.getMessage("lblTranslated")
lblError.textContent = chrome.i18n.getMessage("lblError")
lblAlwaysTranslate.textContent = chrome.i18n.getMessage("lblAlwaysTranslate")
btnTranslate.textContent = chrome.i18n.getMessage("btnTranslate")
btnRestore.textContent = chrome.i18n.getMessage("btnRestore")
btnTryAgain.textContent = chrome.i18n.getMessage("btnTryAgain")
btnOptions.textContent = chrome.i18n.getMessage("btnOptions")
btnOpenOnGoogleTranslate.textContent = chrome.i18n.getMessage("btnOpenOnGoogleTranslate")
btnReview.textContent = chrome.i18n.getMessage("btnReview")

// function update popup interface by translation status
var showAlwaysTranslateCheckbox = false
function showPopupSection(status)
{
    btnRestore.className = btnRestore.className.replace(" w3-disabled", "")

    switch (status) {
        case "finish":
            lblTranslate.style.display = "none"
            lblTranslating.style.display = "none"
            lblTranslated.style.display = "inline"
            lblError.style.display = "none"

            divAlwaysTranslate.style.display = "none"
            btnTranslate.style.display = "none"
            btnRestore.style.display = "inline"
            btnTryAgain.style.display = "none"
            btnOptions.style.display = "inline"
            break;
        case "progress":
            lblTranslate.style.display = "none"
            lblTranslating.style.display = "inline"
            lblTranslated.style.display = "none"
            lblError.style.display = "none"

            divAlwaysTranslate.style.display = "none"
            btnTranslate.style.display = "none"
            btnRestore.style.display = "inline"
            btnTryAgain.style.display = "none"
            btnOptions.style.display = "none"

            if (btnRestore.className.indexOf("w3-disabled") == -1) {
                btnRestore.className += " w3-disabled";
            }
            break;
        case "error":
            lblTranslate.style.display = "none"
            lblTranslating.style.display = "none"
            lblTranslated.style.display = "none"
            lblError.style.display = "inline"

            divAlwaysTranslate.style.display = "none"
            btnTranslate.style.display = "none"
            btnRestore.style.display = "none"
            btnTryAgain.style.display = "inline"
            btnOptions.style.display = "none"
            break;
        case "prompt":
        case "unknown":
        default:
            lblTranslate.style.display = "inline"
            lblTranslating.style.display = "none"
            lblTranslated.style.display = "none"
            lblError.style.display = "none"

            showAlwaysTranslateCheckbox ? divAlwaysTranslate.style.display = "block" : "";
            btnTranslate.style.display = "inline"
            btnRestore.style.display = "none"
            btnTryAgain.style.display = "none"
            btnOptions.style.display = "inline"
            break;
    }
}

// update popup info
chrome.tabs.query({ currentWindow: true, active: true}, tabs => {
    // set google translate page url
    btnOpenOnGoogleTranslate.setAttribute("href", "https://translate.google.com/translate?u=" + tabs[0].url)
    btnOpenOnGoogleTranslate.setAttribute("target", "_blank")
    btnOpenOnGoogleTranslate.setAttribute("rel", "noopener noreferrer")

    // auto show the correct section in the popup
    let updateTranslateStatus = () => {
        chrome.tabs.sendMessage(tabs[0].id, {action: "getStatus"}, response => {
            if (typeof response == "string") {
                showPopupSection(response)
            }
            setTimeout(updateTranslateStatus, 100)
        })
    }
    updateTranslateStatus()

    // get page language
    chrome.tabs.sendMessage(tabs[0].id, {action: "getPageLanguage"}, response => {
        if (response) {
            response = response.split('-')[0]
            // show always translate checkbox
            showAlwaysTranslateCheckbox = true
            chrome.storage.local.get("alwaysTranslateLangs").then(onGot => {
                var alwaysTranslateLangs = onGot.alwaysTranslateLangs
                if (!alwaysTranslateLangs) {
                    alwaysTranslateLangs = []
                }
                if (alwaysTranslateLangs.indexOf(response) != -1) {
                    cbAlwaysTranslate.checked = true
                }
            })

            // show page language
            var language = codeToLanguage(response)
            var textContent
            if (language) {
                textContent = chrome.i18n.getMessage("lblAlwaysTranslate") + " " + language
            } else {
                textContent = chrome.i18n.getMessage("lblAlwaysTranslate") + " \"" + response + "\""
            }
            lblAlwaysTranslate.textContent = textContent
        } else {
            // hide always translate checkbox if unknow language
            showAlwaysTranslateCheckbox = false
        }
    })
})

// close popup
btnClose.addEventListener("click", () => {
    window.close()
})

// disable auto translate for a language
cbAlwaysTranslate.addEventListener("change", (e) => {
    if (!e.target.checked) {
        chrome.runtime.sendMessage({action: "disableAutoTranslate"})
    }
})

// function that translate the page
function translate()
{
    chrome.runtime.sendMessage({action: "Translate"})

    if (cbAlwaysTranslate.checked) {
        chrome.runtime.sendMessage({action: "enableAutoTranslate"})
    } else {
        chrome.runtime.sendMessage({action: "disableAutoTranslate"})
    }

    showPopupSection("progress")
}

// translate web page
btnTranslate.addEventListener("click", () => {
    translate()
})

// show original text
btnRestore.addEventListener("click", () => {
    chrome.runtime.sendMessage({action: "Restore"})
})

// try to translate again
btnTryAgain.addEventListener("click", () => {
    translate()
})

// toggle dropdown
btnOptions.addEventListener("click", () => {
    var x = divOptionsList
    if (x.className.indexOf("w3-show") == -1) {
        x.className += " w3-show";
    } else {
        x.className = x.className.replace(" w3-show", "");
    }
})

// hide dropdown
window.addEventListener("click", e => {
    var x = divOptionsList
    if (e.target != btnOptions) {
        x.className = x.className.replace(" w3-show", "");
    }
})
