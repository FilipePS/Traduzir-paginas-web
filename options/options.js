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
        const divs = [$("#languages"), $("#sites"), $("#translations"), $("#style"), $("#hotkeys"), $("#others"), $("#donation"), $("#release_notes")]
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
    }

    $("#targetLanguage2").onchange = e => {
        targetLanguages[1] = e.target.value
        twpConfig.set("targetLanguages", targetLanguages)
    }

    $("#targetLanguage3").onchange = e => {
        targetLanguages[2] = e.target.value
        twpConfig.set("targetLanguages", targetLanguages)
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

    $("#showOriginalTextWhenHovering").onchange = e => {
        twpConfig.set("showOriginalTextWhenHovering", e.target.value)
    }
    $("#showOriginalTextWhenHovering").value = twpConfig.get("showOriginalTextWhenHovering")

    $("#showTranslateSelectedButton").onchange = e => {
        twpConfig.set("showTranslateSelectedButton", e.target.value)
    }
    $("#showTranslateSelectedButton").value = twpConfig.get("showTranslateSelectedButton")

    // style options
    $("#darkMode").onchange = e => {
        twpConfig.set("darkMode", e.target.value)
        updateDarkMode()
    }
    $("#darkMode").value = twpConfig.get("darkMode")

    // others options
    $("#showReleaseNotes").onchange = e => {
        twpConfig.set("showReleaseNotes", e.target.value)
    }
    $("#showReleaseNotes").value = twpConfig.get("showReleaseNotes")
    
    $("#showPopupMobile").onchange = e => {
        twpConfig.set("showPopupMobile", e.target.value)
    }
    $("#showPopupMobile").value = twpConfig.get("showPopupMobile")

})

window.scrollTo({
    top: 0
})