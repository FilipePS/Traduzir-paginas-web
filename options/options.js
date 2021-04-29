"use strict";

var $ = document.querySelector.bind(document)

twpConfig.onReady(function () {
    let sideBarIsVisible = false
    $("#btnOpenMenu").onclick = e => {
        $("#menuContainer").classList.toggle("change")

        if (sideBarIsVisible) {
            $("#sideBar").style.display = "none"
            sideBarIsVisible = false
        } else {
            $("#sideBar").style.display = "block"
            sideBarIsVisible = true
        }
    }

    function hashchange() {
        const hash = location.hash || "#languages"
        const divs = [$("#languages"), $("#sites"), $("#translations"), $("#style"), $("#hotkeys"), $("#storage"), $("#others"), $("#donation"), $("#release_notes")]
        divs.forEach(element => {
            element.style.display = "none"
        })

        document.querySelectorAll("nav a").forEach(a => {
            a.classList.remove("w3-light-grey")
        })

        $(hash).style.display = "block"
        $('a[href="' + hash + '"]').classList.add("w3-light-grey")

        let text
        if (hash === "#donation") {
            text = chrome.i18n.getMessage("lblMakeDonation")
        } else if (hash === "#release_notes") {
            text = chrome.i18n.getMessage("lblReleaseNotes")
        } else {
            text = chrome.i18n.getMessage("lblSettings")
        }
        if (text) {
            $("#itemSelectedName").textContent = text
        }

        if (sideBarIsVisible) {
            $("#menuContainer").classList.toggle("change")
            $("#sideBar").style.display = "none"
            sideBarIsVisible = false
        }
    }
    hashchange()
    window.addEventListener("hashchange", hashchange)

    function fillLanguageList(select) {
        let uilanguage = chrome.i18n.getUILanguage()
        uilanguage = twpLang.fixLanguageCode(uilanguage)

        let langs = twpLang.languages[uilanguage]
        if (!langs) {
            langs = twpLang.languages["en"]
        }

        const langsSorted = []

        for (const i in langs) {
            langsSorted.push([i, langs[i]])
        }

        langsSorted.sort(function (a, b) {
            return a[1].localeCompare(b[1]);
        })

        langsSorted.forEach(value => {
            if (value[0] === "zh" || value[0] === "un" || value[0] === "und") return;
            const option = document.createElement("option")
            option.value = value[0]
            option.textContent = value[1]
            select.appendChild(option)
        })
    }

    fillLanguageList($("#targetLanguage1"))
    fillLanguageList($("#targetLanguage2"))
    fillLanguageList($("#targetLanguage3"))

    fillLanguageList($("#addToNeverTranslateLangs"))
    fillLanguageList($("#addToAlwaysTranslateLangs"))
    fillLanguageList($("#addLangToTranslateWhenHovering"))

    function enableDarkMode() {
        if (!$("#darkModeElement")) {
            const el = document.createElement("style")
            el.setAttribute("id", "darkModeElement")
            el.setAttribute("rel", "stylesheet")
            el.textContent = `
            * {
                scrollbar-color: #202324 #454a4d;
            }

            #donation * {
                background-color: #87CEEB !important;
            }

            #donation select {
                color: black !important;
                background-color: rgb(231, 230, 228) !important;
            }

            html *, nav, #header {
                color: rgb(231, 230, 228) !important;
                background-color: #181a1b !important;
            }
            `
            document.head.appendChild(el)
        }
    }

    function disableDarkMode() {
        if ($("#darkModeElement")) {
            $("#darkModeElement").remove()
        }
    }

    function updateDarkMode() {
        switch (twpConfig.get("darkMode")) {
            case "auto":
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
            default:
                break
        }
    }
    updateDarkMode()


    // target languages

    const targetLanguages = twpConfig.get("targetLanguages")

    $("#targetLanguage1").value = targetLanguages[0]
    $("#targetLanguage2").value = targetLanguages[1]
    $("#targetLanguage3").value = targetLanguages[2]

    $("#targetLanguage1").onchange = e => {
        targetLanguages[0] = e.target.value
        twpConfig.set("targetLanguages", targetLanguages)
        twpConfig.set("targetLanguage", e.target.value)
    }

    $("#targetLanguage2").onchange = e => {
        targetLanguages[1] = e.target.value
        twpConfig.set("targetLanguages", targetLanguages)
        twpConfig.set("targetLanguage", e.target.value)
    }

    $("#targetLanguage3").onchange = e => {
        targetLanguages[2] = e.target.value
        twpConfig.set("targetLanguages", targetLanguages)
        twpConfig.set("targetLanguage", e.target.value)
    }


    // Never translate these languages

    function createNodeToNeverTranslateLangsList(langCode, langName) {
        const li = document.createElement("li")
        li.setAttribute("class", "w3-display-container")
        li.value = langCode
        li.textContent = langName

        const close = document.createElement("span")
        close.setAttribute("class", "w3-button w3-transparent w3-display-right")
        close.innerHTML = "&times;"

        close.onclick = e => {
            e.preventDefault()

            twpConfig.removeLangFromNeverTranslate(langCode)
            li.remove()
        }

        li.appendChild(close)

        return li
    }

    const neverTranslateLangs = twpConfig.get("neverTranslateLangs")
    neverTranslateLangs.forEach(langCode => {
        const langName = twpLang.codeToLanguage(langCode)
        const li = createNodeToNeverTranslateLangsList(langCode, langName)
        $("#neverTranslateLangs").appendChild(li)
    })

    $("#addToNeverTranslateLangs").onchange = e => {
        const langCode = e.target.value
        const langName = twpLang.codeToLanguage(langCode)
        const li = createNodeToNeverTranslateLangsList(langCode, langName)
        $("#neverTranslateLangs").appendChild(li)

        twpConfig.addLangToNeverTranslate(langCode)
    }

    // Always translate these languages

    function createNodeToAlwaysTranslateLangsList(langCode, langName) {
        const li = document.createElement("li")
        li.setAttribute("class", "w3-display-container")
        li.value = langCode
        li.textContent = langName

        const close = document.createElement("span")
        close.setAttribute("class", "w3-button w3-transparent w3-display-right")
        close.innerHTML = "&times;"

        close.onclick = e => {
            e.preventDefault()

            twpConfig.removeLangFromAlwaysTranslate(langCode)
            li.remove()
        }

        li.appendChild(close)

        return li
    }

    const alwaysTranslateLangs = twpConfig.get("alwaysTranslateLangs")
    alwaysTranslateLangs.forEach(langCode => {
        const langName = twpLang.codeToLanguage(langCode)
        const li = createNodeToAlwaysTranslateLangsList(langCode, langName)
        $("#alwaysTranslateLangs").appendChild(li)
    })

    $("#addToAlwaysTranslateLangs").onchange = e => {
        const langCode = e.target.value
        const langName = twpLang.codeToLanguage(langCode)
        const li = createNodeToAlwaysTranslateLangsList(langCode, langName)
        $("#alwaysTranslateLangs").appendChild(li)

        twpConfig.addLangToAlwaysTranslate(langCode)
    }

    // langsToTranslateWhenHovering

    function createNodeToLangsToTranslateWhenHoveringList(langCode, langName) {
        const li = document.createElement("li")
        li.setAttribute("class", "w3-display-container")
        li.value = langCode
        li.textContent = langName

        const close = document.createElement("span")
        close.setAttribute("class", "w3-button w3-transparent w3-display-right")
        close.innerHTML = "&times;"

        close.onclick = e => {
            e.preventDefault()

            twpConfig.removeLangFromTranslateWhenHovering(langCode)
            li.remove()
        }

        li.appendChild(close)

        return li
    }

    const langsToTranslateWhenHovering = twpConfig.get("langsToTranslateWhenHovering")
    langsToTranslateWhenHovering.forEach(langCode => {
        const langName = twpLang.codeToLanguage(langCode)
        const li = createNodeToLangsToTranslateWhenHoveringList(langCode, langName)
        $("#langsToTranslateWhenHovering").appendChild(li)
    })

    $("#addLangToTranslateWhenHovering").onchange = e => {
        const langCode = e.target.value
        const langName = twpLang.codeToLanguage(langCode)
        const li = createNodeToLangsToTranslateWhenHoveringList(langCode, langName)
        $("#langsToTranslateWhenHovering").appendChild(li)

        twpConfig.addLangToTranslateWhenHovering(langCode)
    }

    // Always translate these Sites

    function createNodeToAlwaysTranslateSitesList(hostname) {
        const li = document.createElement("li")
        li.setAttribute("class", "w3-display-container")
        li.value = hostname
        li.textContent = hostname

        const close = document.createElement("span")
        close.setAttribute("class", "w3-button w3-transparent w3-display-right")
        close.innerHTML = "&times;"

        close.onclick = e => {
            e.preventDefault()

            twpConfig.removeSiteFromAlwaysTranslate(hostname)
            li.remove()
        }

        li.appendChild(close)

        return li
    }

    const alwaysTranslateSites = twpConfig.get("alwaysTranslateSites")
    alwaysTranslateSites.forEach(hostname => {
        const li = createNodeToAlwaysTranslateSitesList(hostname)
        $("#alwaysTranslateSites").appendChild(li)
    })

    $("#addToAlwaysTranslateSites").onclick = e => {
        const hostname = prompt("Enter the site hostname", "www.site.com")
        if (!hostname) return;

        const li = createNodeToAlwaysTranslateSitesList(hostname)
        $("#alwaysTranslateSites").appendChild(li)

        twpConfig.addSiteToAlwaysTranslate(hostname)
    }

    // Never translate these Sites

    function createNodeToNeverTranslateSitesList(hostname) {
        const li = document.createElement("li")
        li.setAttribute("class", "w3-display-container")
        li.value = hostname
        li.textContent = hostname

        const close = document.createElement("span")
        close.setAttribute("class", "w3-button w3-transparent w3-display-right")
        close.innerHTML = "&times;"

        close.onclick = e => {
            e.preventDefault()

            twpConfig.removeSiteFromNeverTranslate(hostname)
            li.remove()
        }

        li.appendChild(close)

        return li
    }

    const neverTranslateSites = twpConfig.get("neverTranslateSites")
    neverTranslateSites.forEach(hostname => {
        const li = createNodeToNeverTranslateSitesList(hostname)
        $("#neverTranslateSites").appendChild(li)
    })

    $("#addToNeverTranslateSites").onclick = e => {
        const hostname = prompt("Enter the site hostname", "www.site.com")
        if (!hostname) return;

        const li = createNodeToNeverTranslateSitesList(hostname)
        $("#neverTranslateSites").appendChild(li)

        twpConfig.addSiteToNeverTranslate(hostname)
    }

    // sitesToTranslateWhenHovering

    function createNodeToSitesToTranslateWhenHoveringList(hostname) {
        const li = document.createElement("li")
        li.setAttribute("class", "w3-display-container")
        li.value = hostname
        li.textContent = hostname

        const close = document.createElement("span")
        close.setAttribute("class", "w3-button w3-transparent w3-display-right")
        close.innerHTML = "&times;"

        close.onclick = e => {
            e.preventDefault()

            twpConfig.removeSiteFromTranslateWhenHovering(hostname)
            li.remove()
        }

        li.appendChild(close)

        return li
    }

    const sitesToTranslateWhenHovering = twpConfig.get("sitesToTranslateWhenHovering")
    sitesToTranslateWhenHovering.forEach(hostname => {
        const li = createNodeToSitesToTranslateWhenHoveringList(hostname)
        $("#sitesToTranslateWhenHovering").appendChild(li)
    })

    $("#addSiteToTranslateWhenHovering").onclick = e => {
        const hostname = prompt("Enter the site hostname", "www.site.com")
        if (!hostname) return;

        const li = createNodeToSitesToTranslateWhenHoveringList(hostname)
        $("#sitesToTranslateWhenHovering").appendChild(li)

        twpConfig.addSiteToTranslateWhenHovering(hostname)
    }

    // translations options
    $("#pageTranslatorService").onchange = e => {
        twpConfig.set("pageTranslatorService", e.target.value)
    }
    $("#pageTranslatorService").value = twpConfig.get("pageTranslatorService")

    $("#textTranslatorService").onchange = e => {
        twpConfig.set("textTranslatorService", e.target.value)
    }
    $("#textTranslatorService").value = twpConfig.get("textTranslatorService")

    $("#showOriginalTextWhenHovering").onchange = e => {
        twpConfig.set("showOriginalTextWhenHovering", e.target.value)
    }
    $("#showOriginalTextWhenHovering").value = twpConfig.get("showOriginalTextWhenHovering")

    function enableOrDisableTranslateSelectedAdvancedOptions(value) {
        if (value === "no") {
            document.querySelectorAll("#translateSelectedAdvancedOptions input").forEach(input => {
                input.setAttribute("disabled", "")
            })
        } else {
            document.querySelectorAll("#translateSelectedAdvancedOptions input").forEach(input => {
                input.removeAttribute("disabled")
            })      
        }
    }

    $("#showTranslateSelectedButton").onchange = e => {
        twpConfig.set("showTranslateSelectedButton", e.target.value)
        enableOrDisableTranslateSelectedAdvancedOptions(e.target.value)
    }
    $("#showTranslateSelectedButton").value = twpConfig.get("showTranslateSelectedButton")
    enableOrDisableTranslateSelectedAdvancedOptions(twpConfig.get("showTranslateSelectedButton"))

    $("#dontShowIfPageLangIsTargetLang").onchange = e => {
        twpConfig.set("dontShowIfPageLangIsTargetLang", e.target.checked ? "yes" : "no")
    }
    $("#dontShowIfPageLangIsTargetLang").checked = twpConfig.get("dontShowIfPageLangIsTargetLang") === "yes" ? true : false

    $("#dontShowIfPageLangIsUnknown").onchange = e => {
        twpConfig.set("dontShowIfPageLangIsUnknown", e.target.checked ? "yes" : "no")
    }
    $("#dontShowIfPageLangIsUnknown").checked = twpConfig.get("dontShowIfPageLangIsUnknown") === "yes" ? true : false

    $("#dontShowIfSelectedTextIsTargetLang").onchange = e => {
        twpConfig.set("dontShowIfSelectedTextIsTargetLang", e.target.checked ? "yes" : "no")
    }
    $("#dontShowIfSelectedTextIsTargetLang").checked = twpConfig.get("dontShowIfSelectedTextIsTargetLang") === "yes" ? true : false

    $("#dontShowIfSelectedTextIsUnknown").onchange = e => {
        twpConfig.set("dontShowIfSelectedTextIsUnknown", e.target.checked ? "yes" : "no")
    }
    $("#dontShowIfSelectedTextIsUnknown").checked = twpConfig.get("dontShowIfSelectedTextIsUnknown") === "yes" ? true : false

    // style options
    $("#useOldPopup").onchange = e => {
        twpConfig.set("useOldPopup", e.target.value)
        updateDarkMode()
    }
    $("#useOldPopup").value = twpConfig.get("useOldPopup")

    $("#darkMode").onchange = e => {
        twpConfig.set("darkMode", e.target.value)
        updateDarkMode()
    }
    $("#darkMode").value = twpConfig.get("darkMode")

    $("#popupBlueWhenSiteIsTranslated").onchange = e => {
        twpConfig.set("popupBlueWhenSiteIsTranslated", e.target.value)
    }
    $("#popupBlueWhenSiteIsTranslated").value = twpConfig.get("popupBlueWhenSiteIsTranslated")

    // storage options
    $("#deleteTranslationCache").onclick = e => {
        const text = chrome.i18n.getMessage("doYouWantToDeleteTranslationCache")
        if (confirm(text ? text : "Do you want to delete the translation cache?")) {
            chrome.runtime.sendMessage({action: "deleteTranslationCache"})
        }
    }

    $("#backupToFile").onclick = e => {
        const config = twpConfig.export()

        const element = document.createElement('a')
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 4)))
        element.setAttribute('download', 'twp-backup_' + new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/\:/g, ".") + ".txt")
      
        element.style.display = 'none'
        document.body.appendChild(element)
      
        element.click()
      
        document.body.removeChild(element)
    }
    $("#restoreFromFile").onclick = e => {
        const element = document.createElement('input')
        element.setAttribute('type', 'file')
        element.setAttribute('accept', 'text/plain')
      
        element.style.display = 'none'
        document.body.appendChild(element)

        element.oninput = e => {
            const input = e.target

            const reader = new FileReader()
            reader.onload = function () {
                try {
                    const config = JSON.parse(reader.result)
                    
                    const text = chrome.i18n.getMessage("doYouWantOverwriteAllSettings")
                    if (confirm(text ? text : "Do you want to overwrite all existing settings using the backup data?")) {
                        twpConfig.import(config)
                    }
                } catch (e) {
                    const text = chrome.i18n.getMessage("fileIsCorrupted")
                    alert(text ? text : "The file appears to be corrupted")
                    console.error(e)
                }
            }

            reader.readAsText(input.files[0])
        }
      
        element.click()
      
        document.body.removeChild(element)
    }
    $("#resetToDefault").onclick = e => {
        const text = chrome.i18n.getMessage("doYouWantRestoreSettings")
        if (confirm(text ? text : "Do you want to restore the extension to its default settings?")) {
            twpConfig.restoreToDefault()
        }
    }

    // others options
    $("#showReleaseNotes").onchange = e => {
        twpConfig.set("showReleaseNotes", e.target.value)
    }
    $("#showReleaseNotes").value = twpConfig.get("showReleaseNotes")

    $("#showPopupMobile").onchange = e => {
        twpConfig.set("showPopupMobile", e.target.value)
    }
    $("#showPopupMobile").value = twpConfig.get("showPopupMobile")

    $("#showTranslatePageContextMenu").onchange = e => {
        twpConfig.set("showTranslatePageContextMenu", e.target.value)
    }
    $("#showTranslatePageContextMenu").value = twpConfig.get("showTranslatePageContextMenu")

    $("#showTranslateSelectedContextMenu").onchange = e => {
        twpConfig.set("showTranslateSelectedContextMenu", e.target.value)
    }
    $("#showTranslateSelectedContextMenu").value = twpConfig.get("showTranslateSelectedContextMenu")

    $("#showButtonInTheAddressBar").onchange = e => {
        twpConfig.set("showButtonInTheAddressBar", e.target.value)
    }
    $("#showButtonInTheAddressBar").value = twpConfig.get("showButtonInTheAddressBar")

    chrome.runtime.sendMessage({action: "getCacheSize"}, result => {
        $("#storageUsed").textContent = result
    })
})

window.scrollTo({
    top: 0
})