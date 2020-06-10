if (typeof browser !== 'undefined') {
    chrome = browser
}

// get elements
const btnClose = document.getElementById("btnClose")

const lblTranslate = document.getElementById("lblTranslate")
const lblTranslating = document.getElementById("lblTranslating")
const lblTranslated = document.getElementById("lblTranslated")
const lblError = document.getElementById("lblError")
const lblTargetLanguage = document.getElementById("lblTargetLanguage")

const divAlwaysTranslate = document.getElementById("divAlwaysTranslate")
const cbAlwaysTranslate = document.getElementById("cbAlwaysTranslate")
const lblAlwaysTranslate = document.getElementById("lblAlwaysTranslate")

const selectTargetLanguage = document.getElementById("selectTargetLanguage")

const divOptionsList = document.getElementById("divOptionsList")

const btnReset = document.getElementById("btnReset")
const btnTranslate = document.getElementById("btnTranslate")
const btnRestore = document.getElementById("btnRestore")
const btnTryAgain = document.getElementById("btnTryAgain")
const btnOptions = document.getElementById("btnOptions")

// translate interface
lblTranslate.textContent = chrome.i18n.getMessage("lblTranslate")
lblTranslating.textContent = chrome.i18n.getMessage("lblTranslating")
lblTranslated.textContent = chrome.i18n.getMessage("lblTranslated")
lblError.textContent = chrome.i18n.getMessage("lblError")
lblAlwaysTranslate.textContent = chrome.i18n.getMessage("lblAlwaysTranslate")
lblTargetLanguage.textContent = chrome.i18n.getMessage("lblTargetLanguage")

btnTranslate.textContent = chrome.i18n.getMessage("btnTranslate")
btnRestore.textContent = chrome.i18n.getMessage("btnRestore")
btnTryAgain.textContent = chrome.i18n.getMessage("btnTryAgain")

document.querySelector("#btnOptions option[value='options']").textContent = chrome.i18n.getMessage("btnOptions")
document.querySelector("#btnOptions option[value='neverTranslateThisSite']").textContent = chrome.i18n.getMessage("btnNeverTranslate")
document.querySelector("#btnOptions option[value='changeLanguage']").textContent = chrome.i18n.getMessage("btnChangeLanguages")
document.querySelector("#btnOptions option[value='openInGoogleTranslate']").textContent = chrome.i18n.getMessage("btnOpenOnGoogleTranslate")
document.querySelector("#btnOptions option[value='donate']").textContent = chrome.i18n.getMessage("btnDonate")
document.querySelector("#btnOptions option[value='donate']").innerHTML += " &#10084;";
document.querySelector("#btnOptions option[value='moreOptions']").textContent = chrome.i18n.getMessage("btnMoreOptions");

// get translation engine
var gTranslationEngine = "google"
chrome.runtime.sendMessage({action: "getTranslationEngine"}, translationEngine => {
    gTranslationEngine = translationEngine
    if (translationEngine == "yandex") {
        document.querySelector("#btnOptions option[value='openInGoogleTranslate']").textContent = chrome.i18n.getMessage("msgOpenOnYandexTranslator")
    } else { // google
        document.querySelector("#btnOptions option[value='openInGoogleTranslate']").textContent = chrome.i18n.getMessage("btnOpenOnGoogleTranslate")
    }
})

// fill language list
;(function() {
    var langs = languages[chrome.i18n.getUILanguage().split("-")[0]]
    if (!langs) {
        langs = languages["en"]
    }

    var langsSorted = []

    for (var i in langs) {
        langsSorted.push([i, langs[i]])
    }

    langsSorted.sort(function(a, b) {
        return a[1].localeCompare(b[1]);
    })

    langsSorted.forEach(value => {
        var option = document.createElement("option")
        option.value = value[0]
        option.textContent = value[1]
        selectTargetLanguage.appendChild(option)
    })

    chrome.runtime.sendMessage({action: "getTargetLanguage"}, targetLanguage => {
        selectTargetLanguage.value = targetLanguage
    })
})()

// function update popup interface by translation status
var showAlwaysTranslateCheckbox = false
var showSelectTargetLanguage = false
function showPopupSection(status)
{
    btnRestore.className = btnRestore.className.replace(" w3-disabled", "")

    if (showSelectTargetLanguage) {
        lblTranslate.style.display = "none"
        lblTranslating.style.display = "none"
        lblTranslated.style.display = "none"
        lblError.style.display = "none"
        lblTargetLanguage.style.display = "inline"

        selectTargetLanguage.style.display = "inline"
        btnReset.style.display = "inline"

        divAlwaysTranslate.style.display = "none"
        btnTranslate.style.display = "inline"
        btnRestore.style.display = "none"
        btnTryAgain.style.display = "none"
        btnOptions.style.display = "none"
    } else {
        lblTargetLanguage.style.display = "none"
        selectTargetLanguage.style.display = "none"
        btnReset.style.display = "none"
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

                showAlwaysTranslateCheckbox ? divAlwaysTranslate.style.display = "block" : divAlwaysTranslate.style.display = "none";
                btnTranslate.style.display = "inline"
                btnRestore.style.display = "none"
                btnTryAgain.style.display = "none"
                btnOptions.style.display = "inline"
                break;
        }
    }
}

// update popup info
showPopupSection("prompt")
var globalCodeLang = null
chrome.tabs.query({ currentWindow: true, active: true}, tabs => {
    // auto show the correct section in the popup
    let updateTranslateStatus = () => {
        chrome.tabs.sendMessage(tabs[0].id, {action: "getStatus"}, response => {
            if (typeof response == "string") {
                showPopupSection(response)
            }
            setTimeout(updateTranslateStatus, 100)
        })
    }

    // get page language
    chrome.tabs.sendMessage(tabs[0].id, {action: "getDetectedLanguage"}, codeLang => {
        if (codeLang) {
            codeLang = codeLang.split('-')[0]
            globalCodeLang = codeLang

            // show always translate checkbox
            showAlwaysTranslateCheckbox = true
            chrome.storage.local.get("alwaysTranslateLangs").then(onGot => {
                var alwaysTranslateLangs = onGot.alwaysTranslateLangs
                if (!alwaysTranslateLangs) {
                    alwaysTranslateLangs = []
                }
                if (alwaysTranslateLangs.indexOf(codeLang) != -1) {
                    cbAlwaysTranslate.checked = true
                }
            })

            // show page language
            var interfaceLanguage = chrome.i18n.getUILanguage()
            var language = codeToLanguage(codeLang, interfaceLanguage)
            var textContent
            if (language) {
                textContent = chrome.i18n.getMessage("lblAlwaysTranslate") + " " + language
            } else {
                textContent = chrome.i18n.getMessage("lblAlwaysTranslate") + " \"" + codeLang + "\""
            }
            lblAlwaysTranslate.textContent = textContent
        } else {
            // hide always translate checkbox if unknow language
            showAlwaysTranslateCheckbox = false
        }

        showPopupSection("prompt")
        updateTranslateStatus()
    })
})

// close popup
btnClose.addEventListener("click", () => {
    window.close()
})

// disable auto translate for a language
cbAlwaysTranslate.addEventListener("change", (e) => {
    if (!e.target.checked && globalCodeLang) {
        chrome.runtime.sendMessage({action: "disableAutoTranslate", lang: globalCodeLang})
    }
})

// function that translate the page
function translate()
{
    showSelectTargetLanguage = false
    chrome.runtime.sendMessage({action: "Translate", lang: selectTargetLanguage.value})

    if (globalCodeLang) {
        if (cbAlwaysTranslate.checked) {
            chrome.runtime.sendMessage({action: "enableAutoTranslate", lang: globalCodeLang})
        } else {
            chrome.runtime.sendMessage({action: "disableAutoTranslate", lang: globalCodeLang})
        }
    }

    showPopupSection("progress")
}

// reset language in select
btnReset.addEventListener("click", () => {
    chrome.runtime.sendMessage({action: "getTargetLanguage"}, targetLanguage => {
        selectTargetLanguage.value = targetLanguage
    })
})

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

// options
var pageUrl = null
chrome.tabs.query({ currentWindow: true, active: true}, tabs => {
    pageUrl = tabs[0].url
})
btnOptions.addEventListener("change", () => {
    switch (btnOptions.value) {
        case "neverTranslateThisSite":
            chrome.runtime.sendMessage({action: "neverTranslateThisSite"})
            break
        case "changeLanguage":
            showSelectTargetLanguage = true
            showPopupSection()
            break
        case "openInGoogleTranslate":
            if (gTranslationEngine == "yandex") {
                window.open("https://translate.yandex.com/translate?url=" + encodeURIComponent(pageUrl), "_blank")
            } else { // google
                window.open("https://translate.google.com/translate?u=" + encodeURIComponent(pageUrl), "_blank")
            }
            break
        case "donate":
            window.open("https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=N4Q7ACFV3GK2U&source=url", "_blank")
            break
        case "moreOptions":
            chrome.runtime.openOptionsPage()
            break
        default:
    }
    btnOptions.value = "options"
})
