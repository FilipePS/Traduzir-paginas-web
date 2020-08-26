if (typeof browser !== 'undefined') {
    chrome = browser
}

// get elements
const btnClose = document.getElementById("btnClose")
const divIconTranslate = document.getElementById("divIconTranslate")
const iconTranslate = document.getElementById("iconTranslate")

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
const btnOptionsDiv = document.getElementById("btnOptionsDiv")
const btnOptions = document.getElementById("btnOptions")

// translate interface
lblTranslate.textContent = chrome.i18n.getMessage("lblTranslate")
lblTranslating.textContent = chrome.i18n.getMessage("lblTranslating")
lblTranslated.textContent = chrome.i18n.getMessage("lblTranslated")
lblError.textContent = chrome.i18n.getMessage("lblError")
lblAlwaysTranslate.textContent = chrome.i18n.getMessage("lblAlwaysTranslate")
lblTargetLanguage.textContent = chrome.i18n.getMessage("lblTargetLanguage")

btnReset.textContent = chrome.i18n.getMessage("btnReset")
btnTranslate.textContent = chrome.i18n.getMessage("btnTranslate")
btnRestore.textContent = chrome.i18n.getMessage("btnRestore")
btnTryAgain.textContent = chrome.i18n.getMessage("btnTryAgain")

document.querySelector("#btnOptionB").textContent = chrome.i18n.getMessage("btnOptions")
document.querySelector("#btnOptionB").innerHTML += ' <i class="arrow down"></i>'
document.querySelector("#btnOptions option[value='options']").textContent = chrome.i18n.getMessage("btnOptions")
document.querySelector("#btnOptions option[value='options']").textContent = chrome.i18n.getMessage("btnOptions")
document.querySelector("#btnOptions option[value='neverTranslateThisSite']").textContent = chrome.i18n.getMessage("btnNeverTranslate")
document.querySelector("#btnOptions option[value='alwaysTranslateThisSite']").textContent = chrome.i18n.getMessage("btnAlwaysTranslate")
document.querySelector("#btnOptions option[value='changeLanguage']").textContent = chrome.i18n.getMessage("btnChangeLanguages")
document.querySelector("#btnOptions option[value='openInGoogleTranslate']").textContent = chrome.i18n.getMessage("btnOpenOnGoogleTranslate")
document.querySelector("#btnOptions option[value='donate']").textContent = chrome.i18n.getMessage("btnDonate")
document.querySelector("#btnOptions option[value='donate']").innerHTML += " &#10084;";
document.querySelector("#btnOptions option[value='moreOptions']").textContent = chrome.i18n.getMessage("btnMoreOptions");

var cStyle = getComputedStyle(document.querySelector("#btnOptionB"))
btnOptions.style.width = (parseInt(cStyle.width) + 0) + "px"

// get translation engine
var gTranslationEngine = "google"
chrome.runtime.sendMessage({action: "getTranslationEngine"}, translationEngine => {
    gTranslationEngine = translationEngine
    if (translationEngine == "yandex") {
        document.querySelector("#btnOptions option[value='openInGoogleTranslate']").textContent = chrome.i18n.getMessage("msgOpenOnYandexTranslator")
        iconTranslate.setAttribute("src", "/icons/yandex-translate-32.png")
    } else { // google
        iconTranslate.setAttribute("src", "/icons/google-translate-32.png")
        document.querySelector("#btnOptions option[value='openInGoogleTranslate']").textContent = chrome.i18n.getMessage("btnOpenOnGoogleTranslate")
    }
})

// fill language list
;(function() {
    var uilanguage = chrome.i18n.getUILanguage()
    if (uilanguage.toLowerCase() != "zh-cn" && uilanguage.toLowerCase() != "zh-tw") {
        uilanguage = uilanguage.split("-")[0]
    }
    var langs = languages[uilanguage]
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
        if (value[0] == "zh") return;
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
        btnOptionsDiv.style.display = "none"
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
                btnOptionsDiv.style.display = "inline"
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
                btnOptionsDiv.style.display = "none"

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
                btnOptionsDiv.style.display = "none"
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
                btnOptionsDiv.style.display = "inline"
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
        setTimeout(updateTranslateStatus, 100)
        chrome.tabs.sendMessage(tabs[0].id, {action: "getStatus"}, {frameId: 0}, response => {
            if (typeof response == "string") {
                showPopupSection(response)
            }
        })
    }

    // get page language
    chrome.tabs.sendMessage(tabs[0].id, {action: "getDetectedLanguage"}, {frameId: 0}, codeLang => {
        if (codeLang) {
            globalCodeLang = codeLang

            // show always translate checkbox
            showAlwaysTranslateCheckbox = true
            chrome.storage.local.get("alwaysTranslateLangs", onGot => {
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

// swap translator engine
divIconTranslate.addEventListener("click", () => {
    chrome.runtime.sendMessage({action: "swapEngineTranslator"})
    if (iconTranslate.getAttribute("src") == "/icons/google-translate-32.png") {
        iconTranslate.setAttribute("src", "/icons/yandex-translate-32.png")
    } else {
        iconTranslate.setAttribute("src", "/icons/google-translate-32.png")
    }

    chrome.tabs.query({currentWindow: true, active: true}, tabs => {
        chrome.tabs.reload(tabs[0].id)
    })
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
        case "alwaysTranslateThisSite":
            chrome.runtime.sendMessage({action: "alwaysTranslateThisSite"})
            break
        case "changeLanguage":
            showSelectTargetLanguage = true
            showPopupSection()
            break
        case "openInGoogleTranslate":
            if (gTranslationEngine == "yandex") {
                chrome.tabs.create({url: "https://translate.yandex.com/translate?url=" + encodeURIComponent(pageUrl)})
            } else { // google
                chrome.tabs.create({url: "https://translate.google.com/translate?u=" + encodeURIComponent(pageUrl)})
            }
            break
        case "moreOptions":
            chrome.tabs.create({url: chrome.runtime.getURL("/options/options.html")})
            break
        case "donate":
            chrome.tabs.create({url: "https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=N4Q7ACFV3GK2U&source=url"})
            break
        case "patreon":
            chrome.tabs.create({url: "https://www.patreon.com/filipeps"})
            break
        default:
    }
    btnOptions.value = "options"
})
