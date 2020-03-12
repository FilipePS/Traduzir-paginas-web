if (typeof browser !== 'undefined') {
    chrome = browser
}

// get elements
const btnClose = document.getElementsByName("btnClose")

const divTranslate = document.getElementById("divTranslate")
const divTranslating = document.getElementById("divTranslating")
const divRestore = document.getElementById("divRestore")
const divError = document.getElementById("divError")

const cbAlwaysTranslate = document.getElementsByName("cbAlwaysTranslate")
const lblAlwaysTranslate = document.getElementsByName("lblAlwaysTranslate")
const lblTranslate = document.getElementsByName("lblTranslate")
const lblTranslating = document.getElementsByName("lblTranslating")
const lblTranslated = document.getElementsByName("lblTranslated")
const lblError = document.getElementsByName("lblError")

const btnTranslate = document.getElementsByName("btnTranslate")
const btnOptions = document.getElementsByName("btnOptions")
const btnRestore = document.getElementsByName("btnRestore")
const btnTryAgain = document.getElementsByName("btnTryAgain")
// const btnOpenOnGoogleTranslate = document.getElementsByName("btnOpenOnGoogleTranslate")

// chrome.tabs.query({ currentWindow: true, active: true}, tabs => {
//     btnOpenOnGoogleTranslate.setAttribute("href", "https://translate.google.com/translate?u=" + tabs[0].url)
// })

// translate
lblTranslate.forEach( value => value.textContent = chrome.i18n.getMessage("lblTranslate") )
lblTranslating.forEach( value => value.textContent = chrome.i18n.getMessage("lblTranslating") )
lblTranslated.forEach( value => value.textContent = chrome.i18n.getMessage("lblTranslated") )
lblError.forEach( value => value.textContent = chrome.i18n.getMessage("lblError") )
lblAlwaysTranslate.forEach( value => value.textContent = chrome.i18n.getMessage("lblAlwaysTranslate") )
btnTranslate.forEach( value => value.textContent = chrome.i18n.getMessage("btnTranslate") )
btnOptions.forEach( value => value.textContent = chrome.i18n.getMessage("btnOptions") )
btnRestore.forEach( value => value.textContent = chrome.i18n.getMessage("btnRestore") )
btnTryAgain.forEach( value => value.textContent = chrome.i18n.getMessage("btnTryAgain") )

// if (localStorage.getItem("alwaysTranslate") == "true") {
//     cbAlwaysTranslate.checked = true
// }

// close popup
btnClose.forEach(value => value.addEventListener("click", () => {
    window.close()
}))

// translate web page
btnTranslate.forEach( value => value.addEventListener("click", () => {
    localStorage.setItem("alwaysTranslate", cbAlwaysTranslate.checked ? "true" : "false")
    chrome.runtime.sendMessage({name: "alwaysTranslate", value: cbAlwaysTranslate.checked})

    chrome.tabs.query({ currentWindow: true, active: true}, tabs => {
        chrome.tabs.executeScript(tabs[0].id, { file: "/scripts/injectTranslate.js" })
        chrome.tabs.executeScript(tabs[0].id, { file: "/scripts/translate.js" })
    })
}))

// show original text
btnRestore.forEach( value => value.addEventListener("click", () => {
    localStorage.setItem("alwaysTranslate", cbAlwaysTranslate.checked ? "true" : "false")
    chrome.runtime.sendMessage({name: "alwaysTranslate", value: cbAlwaysTranslate.checked})
    
    chrome.tabs.query({ currentWindow: true, active: true}, tabs => {
        chrome.tabs.executeScript(tabs[0].id, { file: "/scripts/restore.js" })
    })
}))

// cbAlwaysTranslate.addEventListener("change", () => {
//     if (!cbAlwaysTranslate.checked) {
//         localStorage.setItem("alwaysTranslate", "false")
//         chrome.runtime.sendMessage({name: "alwaysTranslate", value: false})
//     }
// })
