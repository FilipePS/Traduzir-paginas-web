if (typeof browser !== 'undefined') {
    chrome = browser
}

const lblQuestion = document.getElementById("lblQuestion")
const cbAlwaysTranslate = document.getElementById("cbAlwaysTranslate")
const btnTranslate = document.getElementById("btnTranslate")
const btnRestore = document.getElementById("btnRestore")

lblQuestion.textContent = chrome.i18n.getMessage("lblQuestion")
cbAlwaysTranslate.textContent = chrome.i18n.getMessage("cbAlwaysTranslate")
btnTranslate.textContent = chrome.i18n.getMessage("btnTranslate")
btnRestore.textContent = chrome.i18n.getMessage("btnRestore")

btnTranslate.addEventListener("click", () => {
    chrome.tabs.query({ currentWindow: true, active: true}, tabs => {
        chrome.tabs.executeScript(tabs[0].id, { file: "/scripts/injectTranslate.js" })
        chrome.tabs.executeScript(tabs[0].id, { file: "/scripts/translate.js" })
    })
})

btnRestore.addEventListener("click", () => {
    chrome.tabs.query({ currentWindow: true, active: true}, tabs => {
        chrome.tabs.executeScript(tabs[0].id, { file: "/scripts/restore.js" })
    })
})
