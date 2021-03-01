"use strict";

var pageTranslator = {}

twpConfig.onReady(function() {
    const htmlTagsInlineText = ['#text', 'A', 'ABBR', 'ACRONYM', 'B', 'BDO', 'BIG', 'CITE', 'DFN', 'EM', 'I', 'LABEL', 'Q', 'S', 'SMALL', 'SPAN', 'STRONG', 'SUB', 'SUP', 'U', 'TT', 'VAR']
    const htmlTagsInlineIgnore = ['BR', 'CODE', 'KBD', 'WBR', 'PRE'] // and input if type is submit or button
    const htmlTagsNoTranslate = ['TITLE', 'SCRIPT', 'STYLE', 'TEXTAREA']

    let nodesToTranslate = []
    let originalPageLanguage = "und"
    let currentPageLanguage = "und"
    let pageLanguageState = "original"
    let currentTargetLanguage = "en"
    let currentPageTranslatorService = twpConfig.get("pageTranslatorService")
    let fooCount = 0

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
                        var temp = element.parentNode
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

    function translateResults(nodesToTranslatesNow, results) {
        for (const i in nodesToTranslatesNow) {
            for (const j in nodesToTranslatesNow[i]) {
                nodesToTranslatesNow[i][j].node.textContent = results[i][j] + " "
            }
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
                            var rect = nti.parent.getBoundingClientRect()
                            if ((rect.top >= 0 && rect.top <= window.innerHeight) || (rect.bottom >= 0 && rect.bottom <= window.innerHeight)) {
                                nti.isTranslated = true
                                nodesToTranslatesNow.push(nti.nodesInfo)
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
                })()
            }
        } catch (e) {
            console.error(e)
        } finally {
            setTimeout(translateDynamically, 500)
        }
    }
    translateDynamically()

    pageTranslator.translatePage = function (targetLanguage) {
        fooCount++

        if (targetLanguage) {
            currentTargetLanguage = targetLanguage
        }

        pageTranslator.restorePage()
        nodesToTranslate = getNodesToTranslate()

        pageLanguageState = "translated"
        currentPageLanguage = currentTargetLanguage
    }

    pageTranslator.restorePage = function () {
        fooCount++

        pageLanguageState = "original"
        currentPageLanguage = originalPageLanguage

        for (const nti of nodesToTranslate) {
            if (nti.isTranslated) {
                for (const ninf of nti.nodesInfo) {
                    ninf.node.textContent = ninf.original
                }
            }
        }
        nodesToTranslate = []
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
        } else if (request.action == "swapTranslationService") {
            if (currentPageTranslatorService === "google") {
                currentPageTranslatorService = "yandex"
            } else {
                currentPageTranslatorService = "google"
            }
            if (pageLanguageState == "translated") {
                pageTranslator.translatePage()
            }
        }
    })
})
