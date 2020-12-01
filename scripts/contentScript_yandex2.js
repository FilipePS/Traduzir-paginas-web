if (typeof browser !== 'undefined') {
    chrome = browser
}
chrome.runtime.sendMessage({action: "getTranslationEngine"}, translationEngine => {
    if (translationEngine != "yandex") return;
    
    var translateNodes = null

    var prevTargetLanguage = null
    var translatedStrings = []
    var nodesTranslated = []
    var status
    setStatus("prompt")
    var htmlTagsInlineText = ['#text', 'A', 'ABBR', 'ACRONYM', 'B', 'BDO', 'BIG', 'CITE', 'DFN', 'EM', 'I', 'LABEL', 'Q', 'S', 'SMALL', 'SPAN', 'STRONG', 'SUB', 'SUP', 'U', 'TT', 'VAR']
    var htmlTagsInlineIgnore = ['BR', 'CODE', 'KBD', 'WBR', 'PRE'] // and input if type is submit or button
    var htmlTagsNoTranslate = ['TITLE', 'SCRIPT', 'STYLE', 'TEXTAREA']

    var originalPageTitle = null
    var translatedAttributes = []

    var translateNewNodesTimer = null
    var newNodesToTranslate = []
    var removedNodes = []

    function translateNewNodes() {
        newNodesToTranslate.forEach(ntt => {
            if (removedNodes.indexOf(ntt) != -1) return;
            var translateNodes = getTranslateNodes(ntt).map(tni => tni.nodesInfo)

            var indexesToRemove = []
            for (let i in translateNodes) {
                for (let nodeInfo of translateNodes[i]) {
                    if (nodesTranslated.indexOf(nodeInfo.node) == -1) {
                        nodesTranslated.push({node: nodeInfo.node, original: nodeInfo.node.textContent})
                    } else {
                        indexesToRemove(i)
                    }
                }
            }
            indexesToRemove.forEach(idx => {
                translateNodes.splice(idx, 1)
            })

            var nodesStrings = getNodesStrings(translateNodes)
            var [requestsStrings, requestsSum] = getRequestStrings(nodesStrings)

            for (let i in requestsStrings) {
                translateHtml(requestsStrings[i], prevTargetLanguage).then(results => {
                    if (status == "finish") {
                        translateResults(i, results, translateNodes, requestsSum)
                    }
                })
            }
        })
        newNodesToTranslate = []
        removedNodes = []
    }

    var mutationObserver = new MutationObserver(function(mutations) {
        var nodesToTranslate = []
        
        mutations.forEach(mutation => {
            Array.from(mutation.addedNodes).forEach(addedNode => {
                if (htmlTagsNoTranslate.indexOf(addedNode.nodeName) == -1) {
                    if (htmlTagsInlineText.indexOf(addedNode.nodeName) == -1) {
                        if (htmlTagsInlineIgnore.indexOf(addedNode.nodeName) == -1) {
                            nodesToTranslate.push(addedNode) 
                        }
                    }
                }
            })

            Array.from(mutation.removedNodes).forEach(removedNode => {
                removedNodes.push(removedNode)
            })
        })

        nodesToTranslate.forEach(nnt => {
            if (newNodesToTranslate.indexOf(nnt) == -1) {
                newNodesToTranslate.push(nnt)
            }
        })
    })

    function enableMutatinObserver() {
        disableMutatinObserver()
        translateNewNodesTimer = setInterval(translateNewNodes, 1500)
        mutationObserver.observe(document.body, { childList: true, subtree: true })
    }

    function disableMutatinObserver() {
        clearInterval(translateNewNodesTimer)
        newNodesToTranslate = []
        removedNodes = []
        mutationObserver.disconnect()
        mutationObserver.takeRecords()
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/\&/g, "&amp;")
            .replace(/\</g, "&lt;")
            .replace(/\>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/\'/g, "&#39;");
    }

    function unescapeHtml(unsafe) {
        return unsafe
            .replace(/\&amp;/g, "&")
            .replace(/\&lt;/g, "<")
            .replace(/\&gt;/g, ">")
            .replace(/\&quot;/g, "\"")
            .replace(/\&\#39;/g, "'");
    }

    function translateHtml(params, targetLanguage) {
        var requestBody = "srv=tr-url-widget&format=html&lang=" + targetLanguage
        var translationInfo = []
        var stringsToTranslateInfo = []
        for (let str of params) {
            var translatedStringInfo = translatedStrings.find(value => value.original == str)
            if (translatedStringInfo) {
                translationInfo.push(translatedStringInfo)
            } else {
                var newTransInfo = {
                    original: str,
                    status: "translating",
                    translated: null
                }
                translatedStrings.push(newTransInfo)
                translationInfo.push(newTransInfo)
                stringsToTranslateInfo.push(newTransInfo)
                requestBody += "&text=" + encodeURIComponent(str)
            }
        }

        if (stringsToTranslateInfo.length > 0) {
            backgroundFetchJson("https://translate.yandex.net/api/v1/tr.json/translate", {
                "credentials": "omit",
                "headers": {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                "body": requestBody,
                "method": "POST",
                "mode": "no-cors",
                "referrerPolicy": "no-referrer"
            })
            .then(responseJson => {
                responseJson.text.forEach((value, index) => {
                    stringsToTranslateInfo[index].status = "complete"
                    stringsToTranslateInfo[index].translated = value
                })
                return responseJson.text
            })
            .catch(e => {
                responseJson.text.forEach((value, index) => {
                    stringsToTranslateInfo[index].status = "error"
                    stringsToTranslateInfo[index].translated = value
                })
                console.error(e)
            }) 
        }

        return new Promise(resolve => {
            function waitForTranslationFinish() {
                var isTranslating = false
                for (let info of translationInfo) {
                    if (info.status == "translating") {
                        isTranslating = true
                        break
                    }
                }
                if (isTranslating) {
                    setTimeout(waitForTranslationFinish, 100)
                } else {
                    resolve(translationInfo.map(value => value.translated))
                }
            }
            waitForTranslationFinish()
        })
    }

    function getTranslateNodes(element) {
        var translateNodes = [{isTranslated: false, parent: null, nodesInfo: []}]
        var index = 0
        
        var getAllNodes = function (element) {
            if (element.nodeType == 1 && htmlTagsInlineIgnore.indexOf(element.nodeName) == -1
            && !element.classList.contains("notranslate")) {
                if (translateNodes[index].nodesInfo.length > 0 && htmlTagsInlineText.indexOf(element.nodeName) == -1) {
                    translateNodes.push({isTranslated: false, parent: null, nodesInfo: []})
                    index++
                }
                if (htmlTagsNoTranslate.indexOf(element.nodeName) == -1) {
                    Array.from(element.childNodes).forEach(value => {
                        getAllNodes(value)
                    })
                }
            } else if (element.nodeType == 3) {
                if (element.textContent.trim().length > 0) {
                    if (!translateNodes[index].parent) {
                        var temp = element.parentNode
                        while (temp && temp != document.body && (htmlTagsInlineText.indexOf(temp.nodeName) != -1 || htmlTagsInlineIgnore.indexOf(temp.nodeName) != -1)) {
                            temp = temp.parentNode
                        }
                        translateNodes[index].parent = temp
                    }
                    translateNodes[index].nodesInfo.push({node: element, textContent: element.textContent})
                }
            }
        }
        getAllNodes(element)

        if (translateNodes.length > 0 && translateNodes[translateNodes.length-1].nodesInfo.length == 0) {
            translateNodes.pop()
        }

        return translateNodes
    }

    function getNodesStrings(translateNodes) {
        var nodesStrings = []
        translateNodes.forEach(value => {
            if (value.length > 0) {
                nodesStrings.push(value.map(value => escapeHtml(value.node.textContent)).join('<wbr>'))
            }
        })
        return nodesStrings
    }

    function getRequestStrings(nodesStrings) {
        var requestsSum = [0]
        var requestsStrings = [[]]
        var index = 0
        var requestLength = 0
        for (let i in nodesStrings) {
            if (requestLength == 0 || requestLength + nodesStrings[i].length < 800) {
                requestLength += nodesStrings[i].length
                requestsStrings[index].push(nodesStrings[i])
            } else {
                requestsSum.push(requestsSum[requestsSum.length-1] + requestsStrings[index].length)
                requestsStrings.push([])
                index++
                requestLength = nodesStrings[i].length
                requestsStrings[index].push(nodesStrings[i])
            }
            if (i == nodesStrings.length) {
                requestsSum.push(requestsSum[requestsSum.length-1] + requestsStrings[index].length)
            }
        }

        return [requestsStrings, requestsSum]
    }

    function translateResults(i, results, translateNodes, requestsSum) {
        for (let j in results) {
            var resultArray = results[j].split('<wbr>').map(value => unescapeHtml(value))
            for (let k in resultArray) {
                var node = translateNodes[parseInt(requestsSum[i]) + parseInt(j)][parseInt(k)].node
                nodesTranslated.push({node: node, original: node.textContent})
                node.textContent = resultArray[k]
            }
        }
        mutationObserver.takeRecords()
    }

    function translateAttributes(targetLanguage) {
        restoreAttributes()

        var placeholdersElements = Array.from(document.querySelectorAll('input[placeholder], textarea[placeholder]'))
        var altElements = Array.from(document.querySelectorAll('area[alt], img[alt], input[type="image"][alt]'))
        var valueElements = Array.from(document.querySelectorAll('input[type="button"], input[type="submit"]'))
        var titleElements = Array.from(document.querySelectorAll("body [title]"))

        placeholdersElements.forEach(e => {
            var txt = e.getAttribute("placeholder")
            if (txt && txt.trim()) {
                translatedAttributes.push([e, txt, "placeholder"])
            }
        })

        altElements.forEach(e => {
            var txt = e.getAttribute("alt")
            if (txt && txt.trim()) {
                translatedAttributes.push([e, txt, "alt"])
            }
        })

        valueElements.forEach(e => {
            var txt = e.getAttribute("value")
            if (e.type == "submit" && !txt) {
                translatedAttributes.push([e, "Submit Query", "value"])
            } else if (txt && txt.trim()) {
                translatedAttributes.push([e, txt, "value"])
            }
        })

        titleElements.forEach(e => {
            var txt = e.getAttribute("title")
            if (txt && txt.trim()) {
                translatedAttributes.push([e, txt, "title"])
            }
        })

        translatedAttributes.forEach(taInfo => {
            taInfo.push(false)
        })
    }

    function restoreAttributes() {
        translatedAttributes.forEach(taInfo => {
            taInfo[0].setAttribute(taInfo[2], taInfo[1])
        })
        translatedAttributes = []
    }

    function translatePageTitle(targetLanguage) {
        if (document.title.trim().length < 1) return;
        originalPageTitle = document.title

        translateHtml([escapeHtml(originalPageTitle.trim())], targetLanguage).then(results => {
            if (status == "prompt" || status == "error") return;

            document.title = unescapeHtml(results[0])

            mutationObserver.takeRecords()
        })
    }

    function restorePageTitle() {
        if (originalPageTitle !== null) {
            document.title = originalPageTitle
        }
        originalPageTitle = null
    }

    function translate()
    {
        restore()
        chrome.runtime.sendMessage({action: "getTargetLanguage"}, targetLanguage => {
            if (targetLanguage.indexOf("zh-") != -1) {
                targetLanguage = "zh"
            }
            if (prevTargetLanguage && prevTargetLanguage != targetLanguage) {
                translatedStrings = []
            }
            prevTargetLanguage = targetLanguage

            setStatus("progress")
            
            translateNodes = getTranslateNodes(document.body)

            for (let i in translateNodes) {
                for (let nodeInfo of translateNodes[i].nodesInfo) {
                    nodesTranslated.push({node: nodeInfo.node, original: nodeInfo.node.textContent})
                }
            }

            setStatus("finish")

            translateAttributes(targetLanguage)
            translatePageTitle(targetLanguage)
            
            enableMutatinObserver()
        })
    }

    function restore()
    {
        if(typeof window.restoreShowOriginal == "function"){
            window.restoreShowOriginal()
        }
        disableMutatinObserver()

        setStatus("prompt")

        nodesTranslated.forEach(nodeInfo => {
            nodeInfo.node.textContent = nodeInfo.original
        })
        nodesTranslated = []

        restoreAttributes()
        restorePageTitle()

        translateNodes = null
    }

    function translateDynamically() {
        try {
            if (status == "finish" && translateNodes) {
                var nodesToTranslates = []
                translateNodes.forEach(tni => {
                    if (!tni.isTranslated) {
                        var rect = tni.parent.getBoundingClientRect()
                        if ((rect.top >= 0 && rect.top <= window.innerHeight) || (rect.bottom >= 0 && rect.bottom <= window.innerHeight)) {
                            tni.isTranslated = true
                            nodesToTranslates.push(tni.nodesInfo)
                            if (tni.nodesInfo.length > 0 && window.saveToShowOriginal) {
                                window.saveToShowOriginal(tni.nodesInfo[0].node)
                            }
                        }
                    }
                })

                if (nodesToTranslates.length > 0) {
                    var nodesStrings = getNodesStrings(nodesToTranslates)
                    var [requestsStrings, requestsSum] = getRequestStrings(nodesStrings)

                    for (let i in requestsStrings) {
                        translateHtml(requestsStrings[i], prevTargetLanguage).then(results => {
                            if (status == "finish" && translateNodes) {
                                translateResults(i, results, nodesToTranslates, requestsSum)
                            }
                        })
                    } 
                }


                ;(function() {
                    var attributesToTranslate = []
                    var attributesStrings = []
                    
                    translatedAttributes.forEach(taInfo => {
                        if (!taInfo[3]) {
                            var rect = taInfo[0].getBoundingClientRect()
                            if ((rect.top >= 0 && rect.top <= window.innerHeight) || (rect.bottom >= 0 && rect.bottom <= window.innerHeight)) {
                                attributesToTranslate.push(taInfo)
                                attributesStrings.push(taInfo[1].trim())
                                taInfo[3] = true
                            }
                        }
                    })
                    if (attributesToTranslate.length > 0) {
                        attributesStrings = attributesStrings.map(str => escapeHtml(str))
                        var [requestsStrings, requestsSum] = getRequestStrings(attributesStrings)
                    
                        for (let i in requestsStrings) {
                            translateHtml(requestsStrings[i], prevTargetLanguage).then(results => {
                                if (status != "finish") return;
                                for (let j in results) {
                                    var text = unescapeHtml(results[j])
                                    var taInfo = attributesToTranslate[parseInt(requestsSum[i]) + parseInt(j)]
                                    taInfo[0].setAttribute(taInfo[2], text)
                                }
                                mutationObserver.takeRecords()
                            })
                        }
                    }
                })();
            }
        } finally {
            setTimeout(translateDynamically, 500)
        }

    }
    translateDynamically()

    function setStatus(_status)
    {
        status = _status
    }

    function getStatus()
    {
        // finish progress prompt
        return status
    }

    var pageLang = undefined
    function getPageLanguage()
    {
        if (typeof pageLang == "undefined") {
            var eHtml = document.getElementsByTagName("html")[0]

            if (eHtml) {
                pageLang =  eHtml.getAttribute("lang") || eHtml.getAttribute("xml:lang") || null
                return pageLang
            }
        } else {
            return pageLang
        }
    }
    //*
    chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
        if (request.action == "Translate") {    
            translate()
        } else if (request.action == "Restore") {
            restore()
        } else if (request.action == "getStatus") {
            sendResponse(getStatus())
        } else if (request.action == "getPageLanguage") {
            sendResponse(getPageLanguage())
        } else if (request.action == "getHostname") {
            sendResponse(window.location.hostname)
        } else if (request.action == "getDetectedLanguage") {
            let foo = () => {
                if (typeof detectedLanguage !== "undefined") {
                    sendResponse(detectedLanguage)
                } else {
                    setTimeout(foo, 100)
                }
            }
            foo()
            return true
        } else if (request.action == "toggle-translation") {
            if (status == "prompt" || status == "error") {
                translate()
            } else {
                restore()
            }
        }
    })

    // detect language
    window.detectedLanguage = undefined
    chrome.runtime.sendMessage({action: "detectLanguage"}, lang => {
        window.detectedLanguage = lang || null

        chrome.storage.local.get(["alwaysTranslateLangs", "alwaysTranslateSites", "neverTranslateSites"], onGot => {
            var alwaysTranslateSites = onGot.alwaysTranslateSites
            if (!alwaysTranslateSites) {
                alwaysTranslateSites = []
            }
            if (alwaysTranslateSites.indexOf(window.location.hostname) == -1) {
                if (detectedLanguage) {
                    var alwaysTranslateLangs = onGot.alwaysTranslateLangs
                    if (!alwaysTranslateLangs) {
                        alwaysTranslateLangs = []
                    }
                    var pageLang = detectedLanguage
                    if (pageLang && alwaysTranslateLangs.indexOf(pageLang) != -1) {
                        var neverTranslateSites = onGot.neverTranslateSites
                        if (!neverTranslateSites) {
                            neverTranslateSites = []
                        }
    
                        if (neverTranslateSites.indexOf(window.location.hostname) == -1) {
                            translate()
                        }
                    }
                }
            } else {
                translate()
            }
        })
    })
    //*/

    // auto translate new iframes
    setTimeout(() => {
        chrome.runtime.sendMessage({action: "getMainFrameStatus"}, mainFrameStatus => {
            if (status == "prompt" && (mainFrameStatus == "progress" || mainFrameStatus == "finish")) {
                translate()
            }
        })
    }, 500)


    window.translateSingleText = function(text, targetLanguage) {
        if (!targetLanguage) return Promise.resolve()
        if (targetLanguage.indexOf("zh-") != -1) {
            targetLanguage = "zh"
        }
        return translateHtml([escapeHtml(text)], targetLanguage)
        .then(results => {
            text = ""
            for (let j in results) {
                var resultArray = results[j].split('<wbr>').map(value => unescapeHtml(value))
                for (let k in resultArray) {
                    text += resultArray[k]
                }
            }
            return text
        })
    }

})