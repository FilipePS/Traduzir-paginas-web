"use strict";

var $ = document.querySelector.bind(document)

twpConfig.onReady(function () {
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
            if (value[0] === "zh") return;
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

})