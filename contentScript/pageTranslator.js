"use strict";

//TODO adiiconar tradução de shadowRoot
//TODO adicionar hotkeys

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

    let translateNewNodesTimerHandler
    let newNodes = []
    let removedNodes = []

    function translateNewNodes() {
        const currentFooCount = fooCount

        newNodes.forEach(nn => {
            if (removedNodes.indexOf(nn) != -1) return;
            
            let newNodesToTranslate = getNodesToTranslate(nn)
            
            const indexesToRemove = []
            for (const i in nodesToTranslate) {
                if (nodesToTranslate[i].isTranslated) continue;
                const nodesInfo = nodesToTranslate[i].nodesInfo
                for (const j in newNodesToTranslate) {
                    if (newNodesToTranslate[j].nodesInfo.some(value => nodesInfo.indexOf(value) >= 0)) {
                        indexesToRemove.push(j)
                    }
                }
            }
            
            indexesToRemove.forEach(idx => {
                newNodesToTranslate.splice(idx, 1)
            })

            newNodesToTranslate = newNodesToTranslate.map(nti => nti.nodesInfo)

            backgroundTranslateHTML(
                currentPageTranslatorService,
                currentTargetLanguage,
                newNodesToTranslate.map(nti => nti.map(value => value.original))
            )
            .then(results => {
                if (pageLanguageState === "translated" && currentFooCount === fooCount) {
                    translateResults(newNodesToTranslate, results)
                }
            })
        })

        newNodes = []
        removedNodes = []
    }

    const mutationObserver = new MutationObserver(function(mutations) {
        const nodesToTranslate = []
        
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(addedNode => {
                if (htmlTagsNoTranslate.indexOf(addedNode.nodeName) == -1) {
                    if (htmlTagsInlineText.indexOf(addedNode.nodeName) == -1) {
                        if (htmlTagsInlineIgnore.indexOf(addedNode.nodeName) == -1) {
                            nodesToTranslate.push(addedNode) 
                        }
                    }
                }
            })

            mutation.removedNodes.forEach(removedNode => {
                removedNodes.push(removedNode)
            })
        })
        
        nodesToTranslate.forEach(nnt => {
            if (newNodes.indexOf(nnt) == -1) {
                newNodes.push(nnt)
            }
        })
    })

    function enableMutatinObserver() {
        disableMutatinObserver()
        translateNewNodesTimerHandler = setInterval(translateNewNodes, 1700)
        mutationObserver.observe(document.body, { childList: true, subtree: true })
    }

    function disableMutatinObserver() {
        clearInterval(translateNewNodesTimerHandler)
        newNodes = []
        removedNodes = []
        mutationObserver.disconnect()
        mutationObserver.takeRecords()
    }

    const handleVisibilityChange = function () {
        if (document.visibilityState == "visible" && pageLanguageState === "translated") {
            enableMutatinObserver()
        } else if (document.visibilityState == "hidden") {
            disableMutatinObserver()
        }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange, false)

    function getNodesToTranslate(root=document.body) {
        const nodesToTranslate = [{isTranslated: false, parent: null, nodesInfo: []}]
        let index = 0
        
        const getAllNodes = function (_element) {
            let element
            if (_element.shadowRoot) {
                element = _element.shadowRoot
            } else {
                element = _element
            }
            if (element.nodeType == 1 || element.nodeType == 11) {
                if (element.nodeType == 1) {
                    if (htmlTagsInlineIgnore.indexOf(element.nodeName) !== -1
                    || htmlTagsNoTranslate.indexOf(element.nodeName) !== -1
                    || element.classList.contains("notranslate")
                    || element.getAttribute("translate") === "no"
                    || element.isContentEditable) {
                        if (nodesToTranslate[index].nodesInfo.length > 0) {
                            nodesToTranslate.push({isTranslated: false, parent: null, nodesInfo: []})
                            index++
                        }
                        return
                    }
                }
                Array.from(element.childNodes).forEach(value => {
                    if (htmlTagsInlineText.indexOf(value.nodeName) == -1) {
                        if (nodesToTranslate[index].nodesInfo.length > 0) {
                            nodesToTranslate.push({isTranslated: false, parent: null, nodesInfo: []})
                            index++ 
                        }
                        getAllNodes(value)
                        if (nodesToTranslate[index].nodesInfo.length > 0) {
                            nodesToTranslate.push({isTranslated: false, parent: null, nodesInfo: []})
                            index++ 
                        }
                    } else {
                        getAllNodes(value)
                    }
                })
            } else if (element.nodeType == 3) {
                if (element.textContent.trim().length > 0) {
                    if (!nodesToTranslate[index].parent) {
                        let temp = element.parentNode
                        while (temp && temp != root && (htmlTagsInlineText.indexOf(temp.nodeName) != -1 || htmlTagsInlineIgnore.indexOf(temp.nodeName) != -1)) {
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
                if (results[i][j]) {
                    nodesToTranslatesNow[i][j].node.textContent = results[i][j] + " "
                }
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
            setTimeout(translateDynamically, 600)
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

    const pageLanguageStateObservers = []

    pageTranslator.onPageLanguageStateChange = function (callback) {
        pageLanguageStateObservers.push(callback)
    }

    pageTranslator.translatePage = function (targetLanguage) {
        fooCount++
        pageTranslator.restorePage()
        showOriginal.enable()

        if (targetLanguage) {
            currentTargetLanguage = targetLanguage
        }

        nodesToTranslate = getNodesToTranslate()
        attributesToTranslate = getAttributesToTranslate()

        nodesToTranslate.forEach(nti => showOriginal.add(nti.parent))

        pageLanguageState = "translated"
        chrome.runtime.sendMessage({action: "setPageLanguageState", pageLanguageState})
        pageLanguageStateObservers.forEach(callback => callback(pageLanguageState))
        currentPageLanguage = currentTargetLanguage

        translatePageTitle()

        enableMutatinObserver()
    }

    pageTranslator.restorePage = function () {
        fooCount++
        showOriginal.disable()
        disableMutatinObserver()

        pageLanguageState = "original"
        chrome.runtime.sendMessage({action: "setPageLanguageState", pageLanguageState})
        pageLanguageStateObservers.forEach(callback => callback(pageLanguageState))
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

    pageTranslator.swapTranslationService = function () {
        if (currentPageTranslatorService === "google") {
            currentPageTranslatorService = "yandex"
        } else {
            currentPageTranslatorService = "google"
        }
        if (pageLanguageState === "translated") {
            pageTranslator.translatePage()
        }
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
            pageTranslator.swapTranslationService()
        } else if (request.action === "toggle-translation") {
            if (pageLanguageState === "translated") {
                pageTranslator.restorePage()
            } else {
                pageTranslator.translatePage()
            }
        }
    })

    let alreadyGotTheLanguage = false
    const observers = []

    pageTranslator.onGetOriginalPageLanguage = function (callback) {
        if (alreadyGotTheLanguage) {
            callback(originalPageLanguage)
        } else {
            observers.push(callback)
        }
    }

    const detectPageLanguage = function () {
        if (chrome.i18n.detectLanguage) {
            chrome.i18n.detectLanguage(document.body.innerText, result => {
                // TODO verificar o valor de result no firefox mobile
                if (result) {
                    for (const langInfo of result.languages) {
                        const langCode = twpLang.checkLanguageCode(langInfo.language)
                        if (langCode) {
                            originalPageLanguage = langCode
                        }
                        if (pageLanguageState === "original" && !plataformInfo.isMobile.any) {
                            if (twpConfig.get("neverTranslateSites").indexOf(location.hostname) === -1) {
                                if (langCode && langCode !== currentTargetLanguage && twpConfig.get("alwaysTranslateLangs").indexOf(langCode) !== -1) {
                                    pageTranslator.translatePage()
                                } else if (twpConfig.get("alwaysTranslateSites").indexOf(location.hostname) !== -1) {
                                    pageTranslator.translatePage()
                                }
                            }
                        }
                        break
                    }
                }
    
                observers.forEach(callback => callback(originalPageLanguage))
                alreadyGotTheLanguage = true
            })
        } else {
            if (pageLanguageState === "original" && !plataformInfo.isMobile.any) {
                if (twpConfig.get("alwaysTranslateSites").indexOf(location.hostname) !== -1) {
                    pageTranslator.translatePage()
                }
            }
            observers.forEach(callback => callback("und"))
            alreadyGotTheLanguage = true
        }
    }

    if (document.visibilityState == "visible") {
        detectPageLanguage()
    } else {
        const handleVisibilityChange = function () {
            if (document.visibilityState == "visible") {
                document.removeEventListener("visibilitychange", handleVisibilityChange)
                detectPageLanguage()
            }
        }
        document.addEventListener("visibilitychange", handleVisibilityChange, false)
    }

    pageTranslator.onGetOriginalPageLanguage(function () {
        chrome.runtime.sendMessage({action: "getMainFramePageLanguageState"}, response => {
            if (response === "translated" && pageLanguageState === "original") {
                pageTranslator.translatePage()
            }
        })
    })
})
