"use strict";

//TODO adiiconar tradução de shadowRoot
//TODO adicionar tradução de texto seleciondo, e ao passar o mouse (popup)
//TODO mostrar texto original ao passar o mouse
//TODO adicionar tradução de elementos criados dinamicamente
//TODO adicionar tradução de iframe criado dinamicamente

var pageTranslator = {}

twpConfig.onReady(function() {
    const htmlTagsInlineText = ['#text', 'A', 'ABBR', 'ACRONYM', 'B', 'BDO', 'BIG', 'CITE', 'DFN', 'EM', 'I', 'LABEL', 'Q', 'S', 'SMALL', 'SPAN', 'STRONG', 'SUB', 'SUP', 'U', 'TT', 'VAR']
    const htmlTagsInlineIgnore = ['BR', 'CODE', 'KBD', 'WBR', 'PRE'] // and input if type is submit or button
    const htmlTagsNoTranslate = ['TITLE', 'SCRIPT', 'STYLE', 'TEXTAREA']

    let nodesToTranslate = []
    let originalPageLanguage = "und"
    let currentPageLanguage = "und"
    let pageLanguageState = "original"
    let currentTargetLanguage = twpConfig.get("targetLanguages")[0]
    let currentPageTranslatorService = twpConfig.get("pageTranslatorService")
    let fooCount = 0

    let originalPageTitle
    let translatedPageTitle

    let attributesToTranslate = []

    function backgroundTranslateHTML(translationService, targetLanguage, sourceArray3d) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: "translateHTML",
                translationService,
                targetLanguage,
                sourceArray3d
            }, response => {
                resolve(response)
            })
        })
    }

    function backgroundTranslateText(translationService, targetLanguage, sourceArray) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: "translateText",
                translationService,
                targetLanguage,
                sourceArray
            }, response => {
                resolve(response)
            })
        })
    }

    function backgroundTranslateSingleText(translationService, targetLanguage, source) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: "translateSingleText",
                translationService,
                targetLanguage,
                source
            }, response => {
                resolve(response)
            })
        })
    }

    function getNodesToTranslate(root=document.body) {
        const nodesToTranslate = [{isTranslated: false, parent: null, nodesInfo: []}]
        let index = 0
        
        const getAllNodes = function (element) {
            if (element.nodeType == 1 
            && htmlTagsInlineIgnore.indexOf(element.nodeName) == -1
            && !element.classList.contains("notranslate")
            && element.getAttribute("translate") !== "no"
            && !element.isContentEditable) {
                if (nodesToTranslate[index].nodesInfo.length > 0 && htmlTagsInlineText.indexOf(element.nodeName) == -1) {
                    nodesToTranslate.push({isTranslated: false, parent: null, nodesInfo: []})
                    index++
                }
                if (htmlTagsNoTranslate.indexOf(element.nodeName) == -1) {
                    Array.from(element.childNodes).forEach(value => {
                        getAllNodes(value)
                    })
                }
            } else if (element.nodeType == 3) {
                if (element.textContent.trim().length > 0) {
                    if (!nodesToTranslate[index].parent) {
                        let temp = element.parentNode
                        while (temp && temp != document.body && (htmlTagsInlineText.indexOf(temp.nodeName) != -1 || htmlTagsInlineIgnore.indexOf(temp.nodeName) != -1)) {
                            temp = temp.parentNode
                        }
                        nodesToTranslate[index].parent = temp
                    }
                    nodesToTranslate[index].nodesInfo.push({node: element, original: element.textContent})
                }
            }
        }
        getAllNodes(root)

        if (nodesToTranslate.length > 0 && nodesToTranslate[nodesToTranslate.length-1].nodesInfo.length == 0) {
            nodesToTranslate.pop()
        }

        return nodesToTranslate
    }

    function getAttributesToTranslate(root=document.body) {
        const attributesToTranslate = []

        const placeholdersElements = root.querySelectorAll('input[placeholder], textarea[placeholder]')
        const altElements = root.querySelectorAll('area[alt], img[alt], input[type="image"][alt]')
        const valueElements = root.querySelectorAll('input[type="button"], input[type="submit"]')
        const titleElements = root.querySelectorAll("body [title]")

        placeholdersElements.forEach(e => {
            const txt = e.getAttribute("placeholder")
            if (txt && txt.trim()) {
                attributesToTranslate.push({
                    node: e,
                    original: txt,
                    attrName: "placeholder"
                })
            }
        })

        altElements.forEach(e => {
            const txt = e.getAttribute("alt")
            if (txt && txt.trim()) {
                attributesToTranslate.push({
                    node: e,
                    original: txt,
                    attrName: "alt"
                })
            }
        })

        valueElements.forEach(e => {
            const txt = e.getAttribute("value")
            if (e.type == "submit" && !txt) {
                attributesToTranslate.push({
                    node: e,
                    original: "Submit Query",
                    attrName: "value"
                })
            } else if (txt && txt.trim()) {
                attributesToTranslate.push({
                    node: e,
                    original: txt,
                    attrName: "value"
                })
            }
        })

        titleElements.forEach(e => {
            const txt = e.getAttribute("title")
            if (txt && txt.trim()) {
                attributesToTranslate.push({
                    node: e,
                    original: txt,
                    attrName: "title"
                })
            }
        })

        return attributesToTranslate
    }

    function translateResults(nodesToTranslatesNow, results) {
        for (const i in nodesToTranslatesNow) {
            for (const j in nodesToTranslatesNow[i]) {
                nodesToTranslatesNow[i][j].node.textContent = results[i][j] + " "
            }
        }
    }

    function translateAttributes(attributesToTranslateNow, results) {
        for (const i in attributesToTranslateNow) {
            const ati = attributesToTranslateNow[i]
            ati.node.setAttribute(ati.attrName, results[i])
        }
    }

    function translateDynamically() {
        try {
            if (nodesToTranslate) {
                ;(function () {
                    const currentFooCount = fooCount

                    const nodesToTranslatesNow = []
                    nodesToTranslate.forEach(nti => {
                        if (!nti.isTranslated) {
                            const rect = nti.parent.getBoundingClientRect()
                            if ((rect.top >= 0 && rect.top <= window.innerHeight) || (rect.bottom >= 0 && rect.bottom <= window.innerHeight)) {
                                nti.isTranslated = true
                                nodesToTranslatesNow.push(nti.nodesInfo)
                            }
                        }
                    })

                    const attributesToTranslateNow = []
                    attributesToTranslate.forEach(ati => {
                        if (!ati.isTranslated) {
                            const rect = ati.node.getBoundingClientRect()
                            if ((rect.top >= 0 && rect.top <= window.innerHeight) || (rect.bottom >= 0 && rect.bottom <= window.innerHeight)) {
                                ati.isTranslated = true
                                attributesToTranslateNow.push(ati)
                            }
                        }
                    })

                    if (nodesToTranslatesNow.length > 0) {
                        backgroundTranslateHTML(
                            currentPageTranslatorService,
                            currentTargetLanguage,
                            nodesToTranslatesNow.map(nti => nti.map(value => value.original))
                        )
                        .then(results => {
                            if (pageLanguageState === "translated" && currentFooCount === fooCount) {
                                translateResults(nodesToTranslatesNow, results)
                            }
                        })
                    }

                    if (attributesToTranslateNow.length > 0) {
                        backgroundTranslateText(
                            currentPageTranslatorService,
                            currentTargetLanguage,
                            attributesToTranslateNow.map(ati => ati.original)
                        )
                        .then(results => {
                            if (pageLanguageState === "translated" && currentFooCount === fooCount) {
                                translateAttributes(attributesToTranslateNow, results)
                            }
                        })
                    }
                })()
            }
        } catch (e) {
            console.error(e)
        } finally {
            setTimeout(translateDynamically, 500)
        }
    }
    translateDynamically()

    function translatePageTitle() {
        if (document.title.trim().length < 1) return;
        originalPageTitle = document.title

        backgroundTranslateSingleText(currentPageTranslatorService, currentTargetLanguage, originalPageTitle)
        .then(result => {
            if (result) {
                document.title = result
                translatedPageTitle = result
            }
        })
    }

    pageTranslator.translatePage = function (targetLanguage) {
        fooCount++

        if (targetLanguage) {
            currentTargetLanguage = targetLanguage
        }

        pageTranslator.restorePage()
        nodesToTranslate = getNodesToTranslate()
        attributesToTranslate = getAttributesToTranslate()

        pageLanguageState = "translated"
        currentPageLanguage = currentTargetLanguage

        translatePageTitle()
    }

    pageTranslator.restorePage = function () {
        fooCount++
        pageLanguageState = "original"
        currentPageLanguage = originalPageLanguage

        if (translatedPageTitle && translatedPageTitle == document.title) {
            document.title = originalPageTitle
        }
        translatedPageTitle = null
        originalPageTitle = null

        for (const nti of nodesToTranslate) {
            if (nti.isTranslated) {
                for (const ninf of nti.nodesInfo) {
                    ninf.node.textContent = ninf.original
                }
            }
        }
        nodesToTranslate = []

        for (const ati of attributesToTranslate) {
            if (ati.isTranslated) {
                ati.node.setAttribute(ati.attrName, ati.original)
            }
        }
        attributesToTranslate = []
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "translatePage") {
            if (request.targetLanguage === "original") {
                pageTranslator.restorePage()
            } else {
                pageTranslator.translatePage(request.targetLanguage)
            }
        } else if (request.action === "restorePage") {
            pageTranslator.restorePage()
        } else if (request.action === "getOriginalPageLanguage") {
            sendResponse(originalPageLanguage)
        } else if (request.action === "getCurrentPageLanguage") {
            sendResponse(currentPageLanguage)
        } else if (request.action === "getCurrentPageLanguageState") {
            sendResponse(pageLanguageState)
        } else if (request.action === "getCurrentPageTranslatorService") {
            sendResponse(currentPageTranslatorService)
        } else if (request.action === "swapTranslationService") {
            if (currentPageTranslatorService === "google") {
                currentPageTranslatorService = "yandex"
            } else {
                currentPageTranslatorService = "google"
            }
            if (pageLanguageState === "translated") {
                pageTranslator.translatePage()
            }
        }
    })

    if (chrome.i18n.detectLanguage) {
        chrome.i18n.detectLanguage(document.body.innerText, result => {
            for (const langInfo of result.languages) {
                const langCode = twpLang.checkLanguageCode(langInfo.language)
                if (langCode) {
                    originalPageLanguage = langCode
                }

                if (twpConfig.get("neverTranslateSites").indexOf(location.hostname) === -1) {
                    if (langCode && langCode !== currentTargetLanguage && twpConfig.get("alwaysTranslateLangs").indexOf(langCode) !== -1) {
                        pageTranslator.translatePage()
                    } else if (twpConfig.get("alwaysTranslateSites").indexOf(location.hostname) !== -1) {
                        pageTranslator.translatePage()
                    }
                }
                break
            }
        })
    } else {
        if (twpConfig.get("alwaysTranslateSites").indexOf(location.hostname) !== -1) {
            pageTranslator.translatePage()
        }
    }
})
