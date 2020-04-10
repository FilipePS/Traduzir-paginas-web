if (typeof browser !== 'undefined') {
    chrome = browser
}

const lblNeverTranslate = document.getElementById("lblNeverTranslate")
const neverTranslateList = document.getElementById("neverTranslateList")

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

chrome.storage.local.get("neverTranslateSites").then(onGot => {
    var neverTranslateSites = onGot.neverTranslateSites
    if (!neverTranslateSites) {
        neverTranslateSites = []
    }

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