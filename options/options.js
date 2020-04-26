if (typeof browser !== 'undefined') {
    chrome = browser
}

const lblNeverTranslate = document.getElementById("lblNeverTranslate")
const neverTranslateList = document.getElementById("neverTranslateList")
const alwaysTranslateList = document.getElementById("alwaysTranslateList")

lblNeverTranslate.textContent = chrome.i18n.getMessage("optionsNeverTranslate")

function removeA(arr) {
    var what, a = arguments, L = a.length, ax;
    while (L > 1 && arr.length) {
        what = a[--L];
        while ((ax= arr.indexOf(what)) !== -1) {
            arr.splice(ax, 1);
        }
    }
    return arr;
}

function removeSiteFromBlackList(url)
{
    chrome.storage.local.get("neverTranslateSites").then(onGot => {
        var neverTranslateSites = onGot.neverTranslateSites
        if (!neverTranslateSites) {
            neverTranslateSites = []
        }

        removeA(neverTranslateSites, url)
        chrome.storage.local.set({neverTranslateSites})
    })   
}

function disableAutoTranslate(lang)
{
    chrome.storage.local.get("alwaysTranslateLangs").then(onGot => {
        var alwaysTranslateLangs = onGot.alwaysTranslateLangs
        if (!alwaysTranslateLangs) {
            alwaysTranslateLangs = []
        }

        removeA(alwaysTranslateLangs, lang)
        chrome.storage.local.set({alwaysTranslateLangs})
    })   
}

chrome.storage.local.get("neverTranslateSites").then(onGot => {
    var neverTranslateSites = onGot.neverTranslateSites
    if (!neverTranslateSites) {
        neverTranslateSites = []
    }
    neverTranslateSites.sort()

    neverTranslateSites.forEach(value => {
        let li = document.createElement("li")
        li.setAttribute("class", "w3-display-container")
        li.innerText = value

        let close = document.createElement("span")
        close.setAttribute("class", "w3-button w3-transparent w3-display-right")
        close.innerHTML = "&times;"

        close.addEventListener("click", () => {
            li.style.display = "none"
            removeSiteFromBlackList(value)
        })

        li.appendChild(close)
        
        neverTranslateList.appendChild(li)
    })
})

chrome.storage.local.get("alwaysTranslateLangs").then(async onGot => {
    var alwaysTranslateLangs = onGot.alwaysTranslateLangs
    if (!alwaysTranslateLangs) {
        alwaysTranslateLangs = []
    }
    alwaysTranslateLangs.sort()

    var interfaceLanguages = await chrome.i18n.getAcceptLanguages()

    alwaysTranslateLangs.forEach(value => {
        var language = codeToLanguage(value, interfaceLanguages[0])
        if (!language) {
            language = "\"" + value + "\""
        }

        let li = document.createElement("li")
        li.setAttribute("class", "w3-display-container")
        li.innerText = language

        let close = document.createElement("span")
        close.setAttribute("class", "w3-button w3-transparent w3-display-right")
        close.innerHTML = "&times;"

        close.addEventListener("click", () => {
            li.style.display = "none"
            disableAutoTranslate(value)
        })

        li.appendChild(close)
        
        alwaysTranslateList.appendChild(li)
    })
})
