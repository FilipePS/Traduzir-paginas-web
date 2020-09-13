if (typeof browser !== 'undefined') {
    chrome = browser
}

var isMobile = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
    },
    any: function() {
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    }
};

if (isMobile.any()) {
    Array.from(document.querySelectorAll(".desktop-only")).forEach(value => {
        value.style.display = "none"
    })
} else {
    Array.from(document.querySelectorAll(".mobile-only")).forEach(value => {
        value.style.display = "none"
    })   
}

const lblShowContextMenu = document.getElementById("lblShowContextMenu")
const selectShowContextMenu = document.getElementById("selectShowContextMenu")
const lblPlsDonate = document.getElementById("lblPlsDonate")
const lblTargetLanguage = document.getElementById("lblTargetLanguage")
const selectTargetLanguage = document.getElementById("selectTargetLanguage")
const lblTranslationEngine = document.getElementById("lblTranslationEngine")
const selectTranslationEngine = document.getElementById("selectTranslationEngine")
const lblPopupConfig = document.getElementById("lblPopupConfig")
const selectPopupConfig = document.getElementById("selectPopupConfig")
const lblOthers = document.getElementById("lblOthers")
const lblNeverTranslate = document.getElementById("lblNeverTranslate")
const neverTranslateListButton = document.getElementById("neverTranslateListButton")
const neverTranslateList = document.getElementById("neverTranslateList")
const lblAlwaysTranslate = document.getElementById("lblAlwaysTranslate")
const alwaysTranslateListButton = document.getElementById("alwaysTranslateListButton")
const alwaysTranslateList = document.getElementById("alwaysTranslateList")
const lblUseNewAlgorithm = document.getElementById("lblUseNewAlgorithm")
const selectUseNewAlgorithm = document.getElementById("selectUseNewAlgorithm")
const alwaysTranslateSitesListButton = document.getElementById("alwaysTranslateSitesListButton")
const lblAlwaysTranslateSites = document.getElementById("lblAlwaysTranslateSites")
const alwaysTranslateSitesList = document.getElementById("alwaysTranslateSitesList")
const lblDarkMode = document.getElementById("lblDarkMode")
const selectDarkMode = document.getElementById("selectDarkMode")
const lblShowReleaseNotes = document.getElementById("lblShowReleaseNotes")
const selectShowReleaseNotes = document.getElementById("selectShowReleaseNotes")
const lblShowTranslateSelectedButton = document.getElementById("lblShowTranslateSelectedButton")
const selectShowTranslateSelectedButton = document.getElementById("selectShowTranslateSelectedButton")
const lblShowTranslateSelectedContextMenu = document.getElementById("lblShowTranslateSelectedContextMenu")
const selectShowTranslateSelectedContextMenu = document.getElementById("selectShowTranslateSelectedContextMenu")

document.title = chrome.i18n.getMessage("optionsPageTitle")

lblShowContextMenu.textContent = chrome.i18n.getMessage("lblShowContextMenu")
lblPlsDonate.textContent = chrome.i18n.getMessage("lblPlsDonate")
lblTargetLanguage.textContent = chrome.i18n.getMessage("lblTargetLanguage")
lblTranslationEngine.textContent = chrome.i18n.getMessage("lblTranslationEngine")
lblPopupConfig.textContent = chrome.i18n.getMessage("optionPopupConfig")
lblOthers.textContent = chrome.i18n.getMessage("lblOthers")
lblNeverTranslate.textContent = chrome.i18n.getMessage("optionsNeverTranslate")
lblAlwaysTranslate.textContent = chrome.i18n.getMessage("optionsAlwaysTranslate")
lblUseNewAlgorithm.textContent = chrome.i18n.getMessage("lblUseNewAlgorithm")
lblAlwaysTranslateSites.textContent = chrome.i18n.getMessage("lblAlwaysTranslateSites")
lblDarkMode.textContent = chrome.i18n.getMessage("lblDarkMode")
lblShowReleaseNotes.textContent = chrome.i18n.getMessage("lblShowReleaseNotes")
lblShowTranslateSelectedButton.textContent = chrome.i18n.getMessage("lblShowTranslateSelectedButton")
//lblShowTranslateSelectedContextMenu.textContent = chrome.i18n.getMessage("lblShowTranslateSelectedContextMenu")

document.querySelector("#selectShowContextMenu option[value='yes']").textContent = chrome.i18n.getMessage("msgYes")
document.querySelector("#selectShowContextMenu option[value='no']").textContent = chrome.i18n.getMessage("msgNo")
document.querySelector("#selectPopupConfig option[value='auto']").textContent = chrome.i18n.getMessage("optionPopupAuto")
document.querySelector("#selectPopupConfig option[value='threeFingersOnTheScreen']").textContent = chrome.i18n.getMessage("optionPopupThreeFingers")
document.querySelector("#selectPopupConfig option[value='justWhenIClickTranlateThisSite']").textContent = chrome.i18n.getMessage("optionPopupjustWhenIClickTranlateThisSite")
document.querySelector("#selectUseNewAlgorithm option[value='yes']").textContent = chrome.i18n.getMessage("msgYesRecommended")
document.querySelector("#selectUseNewAlgorithm option[value='no']").textContent = chrome.i18n.getMessage("msgNoUseWidgets")
document.querySelector("#selectDarkMode option[value='auto']").textContent = chrome.i18n.getMessage("msgAutomatic")
document.querySelector("#selectDarkMode option[value='yes']").textContent = chrome.i18n.getMessage("msgYes")
document.querySelector("#selectDarkMode option[value='no']").textContent = chrome.i18n.getMessage("msgNo")
document.querySelector("#selectDarkMode option[value='no']").textContent = chrome.i18n.getMessage("msgNo")
document.querySelector("#selectShowTranslateSelectedButton option[value='yes']").textContent = chrome.i18n.getMessage("msgYes")
document.querySelector("#selectShowTranslateSelectedButton option[value='no']").textContent = chrome.i18n.getMessage("msgNo")
document.querySelector("#selectShowReleaseNotes option[value='yes']").textContent = chrome.i18n.getMessage("msgYes")
document.querySelector("#selectShowReleaseNotes option[value='no']").textContent = chrome.i18n.getMessage("msgNo")
document.querySelector("#selectShowTranslateSelectedContextMenu option[value='yes']").textContent = chrome.i18n.getMessage("msgYes")
document.querySelector("#selectShowTranslateSelectedContextMenu option[value='no']").textContent = chrome.i18n.getMessage("msgNo")


neverTranslateList.setAttribute("placeholder", chrome.i18n.getMessage("msgEmptyListNeverTranslateSites"))
alwaysTranslateSitesList.setAttribute("placeholder", chrome.i18n.getMessage("msgEmptyListNeverTranslateSites"))
alwaysTranslateList.setAttribute("placeholder", chrome.i18n.getMessage("msgEmptyListAlwaysTranslateLanguages"))

selectShowTranslateSelectedContextMenu.addEventListener("change", () => {
    chrome.runtime.sendMessage({action: "setShowTranslateSelectedContextMenu", showTranslateSelectedContextMenu: selectShowTranslateSelectedContextMenu.value})
})

selectShowContextMenu.addEventListener("change", () => {
    chrome.runtime.sendMessage({action: "setShowContextMenu", showContextMenu: selectShowContextMenu.value})
})

selectUseNewAlgorithm.addEventListener("change", () => {
    chrome.runtime.sendMessage({action: "setUseNewAlgorithm", useNewAlgorithm: selectUseNewAlgorithm.value})
})

chrome.runtime.sendMessage({action: "getShowTranslateSelectedContextMenu"}, showTranslateSelectedContextMenu => {
    selectShowTranslateSelectedContextMenu.value = showTranslateSelectedContextMenu
})

chrome.runtime.sendMessage({action: "getShowContextMenu"}, showContextMenu => {
    selectShowContextMenu.value = showContextMenu
})

chrome.runtime.sendMessage({action: "getUseNewAlgorithm"}, useNewAlgorithm => {
    selectUseNewAlgorithm.value = useNewAlgorithm
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

// get translation engine
chrome.runtime.sendMessage({action: "getTranslationEngine"}, translationEngine => {
    selectTranslationEngine.value = translationEngine
})

selectTranslationEngine.addEventListener("change", () => {
    chrome.runtime.sendMessage({action: "setTranslationEngine", translationEngine: selectTranslationEngine.value})
})

// get popup config
chrome.runtime.sendMessage({action: "getShowPopupConfig"}, showPopupConfig => {
    selectPopupConfig.value = showPopupConfig
})

selectTargetLanguage.addEventListener("change", () => {
    chrome.runtime.sendMessage({action: "setTargetLanguage", lang: selectTargetLanguage.value})
})

selectPopupConfig.addEventListener("change", () => {
    chrome.runtime.sendMessage({action: "setShowPopupConfig", showPopupConfig: selectPopupConfig.value})
})

function enableDarkMode() {
    if (!document.getElementById("darkModeElement")) {
        var el = document.createElement("style")
        el.setAttribute("id", "darkModeElement")
        el.setAttribute("rel", "stylesheet")
        el.textContent = `
        * {
            scrollbar-color: #202324 #454a4d;
        }
        
        body {
            color: #e8e6e3 !important;
            background-color: #181a1b !important;
            border: 1px solid #454a4d;
        }
        
        
        #selectTargetLanguage,
        #selectTranslationEngine,
        #selectDarkMode,
        #selectUseNewAlgorithm,
        #selectShowTranslateSelectedButton,
        #selectShowTranslateSelectedContextMenu,
        #selectShowContextMenu,
        #selectPopupConfig,
        #selectShowReleaseNotes,
        #neverTranslateListButton,
        #alwaysTranslateSitesListButton,
        #alwaysTranslateListButton,
        select,
        option {
            color: #e8e6e3 !important;
            background-color: #181a1b !important;
            border: 1px solid #305c80 !important;
        }
        `
        document.head.appendChild(el)
    }
}

function disableDarkMode() {
    if (document.getElementById("darkModeElement")) {
        document.getElementById("darkModeElement").remove()
    }
}

var autoDarkMode = true

matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (autoDarkMode) {
        if (matchMedia("(prefers-color-scheme: dark)").matches) {
            enableDarkMode()
        } else {
            disableDarkMode()
        }       
    }
})

chrome.runtime.sendMessage({action: "getDarkMode"}, darkMode => {
    autoDarkMode = false
    if (darkMode == "auto") {
        autoDarkMode = true
        if (matchMedia("(prefers-color-scheme: dark)").matches) {
            enableDarkMode()
        } else {
            disableDarkMode()
        }
    } else if (darkMode == "yes") {
        enableDarkMode()
    } else {
        disableDarkMode()
    }
    selectDarkMode.value = darkMode
})

selectDarkMode.addEventListener("change", () => {
    chrome.runtime.sendMessage({action: "setDarkMode", darkMode: selectDarkMode.value})

    autoDarkMode = false
    switch (selectDarkMode.value) {
        case "auto":
            autoDarkMode = true
            if (matchMedia("(prefers-color-scheme: dark)").matches) {
                enableDarkMode()
            } else {
                disableDarkMode()
            }
            break
        case "yes":
            enableDarkMode()
            break
        case "no":
            disableDarkMode()
            break
    }
})

chrome.storage.local.get("showReleaseNotes", onGot => {
    if (onGot.showReleaseNotes) {
        selectShowReleaseNotes.value = onGot.showReleaseNotes
    } else {
        selectShowReleaseNotes.value = "yes"
    }
})

selectShowReleaseNotes.addEventListener("change", () => {
    chrome.runtime.sendMessage({action: "setShowReleaseNotes", showReleaseNotes: selectShowReleaseNotes.value})
})

chrome.storage.local.get("showTranslateSelectedButton", onGot => {
    if (onGot.showTranslateSelectedButton) {
        selectShowTranslateSelectedButton.value = onGot.showTranslateSelectedButton
    } else {
        selectShowTranslateSelectedButton.value = "yes"
    }
})

selectShowTranslateSelectedButton.addEventListener("change", () => {
    var showTranslateSelectedButton = selectShowTranslateSelectedButton.value
    chrome.storage.local.set({showTranslateSelectedButton})
})

function toggleList(x)
{
    if (x.style.display == "block") {
        x.style.display = "none"
    } else {
        x.style.display = "block"
    }
}
neverTranslateListButton.addEventListener("click", () => toggleList(neverTranslateList))
alwaysTranslateSitesListButton.addEventListener("click", () => toggleList(alwaysTranslateSitesList))
alwaysTranslateListButton.addEventListener("click", () => toggleList(alwaysTranslateList))

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
    chrome.storage.local.get("neverTranslateSites", onGot => {
        var neverTranslateSites = onGot.neverTranslateSites
        if (!neverTranslateSites) {
            neverTranslateSites = []
        }

        removeA(neverTranslateSites, url)
        chrome.storage.local.set({neverTranslateSites})
    })   
}

function removeSiteFromWhiteList(url)
{
    chrome.storage.local.get("alwaysTranslateSites", onGot => {
        var alwaysTranslateSites = onGot.alwaysTranslateSites
        if (!alwaysTranslateSites) {
            alwaysTranslateSites = []
        }

        removeA(alwaysTranslateSites, url)
        chrome.storage.local.set({alwaysTranslateSites})
    })   
}

function disableAutoTranslate(lang)
{
    chrome.storage.local.get("alwaysTranslateLangs", onGot => {
        var alwaysTranslateLangs = onGot.alwaysTranslateLangs
        if (!alwaysTranslateLangs) {
            alwaysTranslateLangs = []
        }

        removeA(alwaysTranslateLangs, lang)
        chrome.storage.local.set({alwaysTranslateLangs})
    })   
}

chrome.storage.local.get("neverTranslateSites", onGot => {
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

chrome.storage.local.get("alwaysTranslateSites", onGot => {
    var alwaysTranslateSites = onGot.alwaysTranslateSites
    if (!alwaysTranslateSites) {
        alwaysTranslateSites = []
    }
    alwaysTranslateSites.sort()

    alwaysTranslateSites.forEach(value => {
        let li = document.createElement("li")
        li.setAttribute("class", "w3-display-container")
        li.innerText = value

        let close = document.createElement("span")
        close.setAttribute("class", "w3-button w3-transparent w3-display-right")
        close.innerHTML = "&times;"

        close.addEventListener("click", () => {
            li.style.display = "none"
            removeSiteFromWhiteList(value)
        })

        li.appendChild(close)
        
        alwaysTranslateSitesList.appendChild(li)
    })
})

chrome.storage.local.get("alwaysTranslateLangs", onGot => {
    var alwaysTranslateLangs = onGot.alwaysTranslateLangs
    if (!alwaysTranslateLangs) {
        alwaysTranslateLangs = []
    }
    alwaysTranslateLangs.sort()

    var interfaceLanguage = chrome.i18n.getUILanguage()

    alwaysTranslateLangs.forEach(value => {
        var language = codeToLanguage(value, interfaceLanguage)
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
