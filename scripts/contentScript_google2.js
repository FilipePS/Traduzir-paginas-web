if (typeof browser !== 'undefined') {
    chrome = browser
}

chrome.runtime.sendMessage({action: "getTranslationEngine"}, translationEngine => {
    if (translationEngine != "google") return;
    
    var translateNodes = null

    var prevTargetLanguage = null
    var translatedStrings = []
    var nodesTranslated = []
    var status
    setStatus("prompt")
    var htmlTagsInlineText = ['#text', 'A', 'ABBR', 'ACRONYM', 'B', 'BDO', 'BIG', 'CITE', 'DFN', 'EM', 'I', 'LABEL', 'Q', 'S', 'SMALL', 'SPAN', 'STRONG', 'SUB', 'SUP', 'U', 'TT', 'VAR']
    var htmlTagsInlineIgnore = ['BR', 'CODE', 'KBD', 'WBR'] // and input if type is submit or button
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

    function shiftLeftOrRightThenSumOrXor(num, optString) {
        for (var i = 0; i < optString.length - 2; i += 3) {
            var acc = optString.charAt(i + 2);
            if ('a' <= acc) {
                acc = acc.charCodeAt(0) - 87;
            } else {
                acc = Number(acc);
            }
            if (optString.charAt(i + 1) == '+') {
                acc = num >>> acc;
            } else {
                acc = num << acc;
            }
            if (optString.charAt(i) == '+') {
                num += acc & 4294967295;
            } else {
                num ^= acc;
            }
        }
        return num;
    }

    function transformQuery(query) {
        var bytesArray = [];
        var idx = [];
        for (var i = 0; i < query.length; i++) {
            var charCode = query.charCodeAt(i);

            if (128 > charCode) {
                bytesArray[idx++] = charCode;
            } else {
                if (2048 > charCode) {
                    bytesArray[idx++] = charCode >> 6 | 192;
                } else {
                    if (55296 == (charCode & 64512) && i + 1 < query.length && 56320 == (query.charCodeAt(i + 1) & 64512)) {
                        charCode = 65536 + ((charCode & 1023) << 10) + (query.charCodeAt(++i) & 1023);
                        bytesArray[idx++] = charCode >> 18 | 240;
                        bytesArray[idx++] = charCode >> 12 & 63 | 128;
                    } else {
                        bytesArray[idx++] = charCode >> 12 | 224;
                    }
                    bytesArray[idx++] = charCode >> 6 & 63 | 128;
                }
                bytesArray[idx++] = charCode & 63 | 128;
            }

        }
        return bytesArray;
    }
    
    function calcHash(query, windowTkk) {
        var tkkSplited = windowTkk.split('.');
        var tkkIndex = Number(tkkSplited[0]) || 0;
        var tkkKey = Number(tkkSplited[1]) || 0;
    
        var bytesArray = transformQuery(query);
    
        var encondingRound = tkkIndex;
        for (var i = 0; i < bytesArray.length; i++) {
            encondingRound += bytesArray[i];
            encondingRound = shiftLeftOrRightThenSumOrXor(encondingRound, '+-a^+6');
        }
        encondingRound = shiftLeftOrRightThenSumOrXor(encondingRound, '+-3^+b+-f');
        
        encondingRound ^= tkkKey;
        if (encondingRound <= 0) {
            encondingRound = (encondingRound & 2147483647) + 2147483648;
        }

        var normalizedResult  = encondingRound % 1000000;
        return normalizedResult .toString() + '.' + (normalizedResult  ^ tkkIndex);
    }

    var googleTranslateTKK = null
    chrome.runtime.sendMessage({action: "getGoogleTranslateTKK"}, gtTKK => {
        googleTranslateTKK = gtTKK
    })

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
        var requestBody = ""
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
                requestBody += "&q=" + encodeURIComponent(str)
            }
        }

        if (stringsToTranslateInfo.length > 0) {
            var tk = calcHash(stringsToTranslateInfo.map(value => value.original).join(''), googleTranslateTKK)
            backgroundFetchJson("https://translate.googleapis.com/translate_a/t?anno=3&client=te&v=1.0&format=html&sl=auto&tl=" + targetLanguage + "&tk=" + tk, {
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
                if (typeof responseJson[0] == "string") {
                    responseJson = [responseJson[0]]
                } else {
                    responseJson = responseJson.map(value => value[0])
                }

                responseJson.forEach((value, index) => {
                    stringsToTranslateInfo[index].status = "complete"
                    stringsToTranslateInfo[index].translated = value
                })
            })
            .catch(e => {
                stringsToTranslateInfo.forEach((value, index) => {
                    stringsToTranslateInfo[index].status = "error"
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
                nodesStrings.push("<pre>" + ( value
                    .map(node => escapeHtml(node.textContent))
                    .map((text, index) => '<a i="' + index + '">' + text + '</a>')
                    .join('') ) + "</pre>"
                )
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
            var resultSentences = []
            var idx = 0
            while (true) {
                var sentenceStartIndex = results[j].indexOf("<b>", idx)
                if (sentenceStartIndex == -1) break;
                
                var sentenceFinalIndex = results[j].indexOf("<i>", sentenceStartIndex)
                
                if (sentenceFinalIndex == -1) {
                    resultSentences.push(results[j].slice(sentenceStartIndex + 3))
                    break
                } else {
                    resultSentences.push(results[j].slice(sentenceStartIndex + 3, sentenceFinalIndex))
                }
                idx = sentenceFinalIndex
            }

            var result = resultSentences.length > 0 ? resultSentences.join('') : results[j]

            var resultArray = result.match(/\<a\s+i\s*\=\s*['"]{1}[0-9]+['"]{1}\s*\>[^\<\>]*(?=\<\/a\>)/g)
            var indexes = resultArray.map(value => parseInt(value.match(/[0-9]+(?=['"]{1}\s*\>)/g))).filter(value => !isNaN(value))

            resultArray = resultArray.map(value => {
                var resultStartAtIndex = value.indexOf('>')
                return value.slice(resultStartAtIndex + 1)
            })

            for (let k in resultArray) {
                var node = translateNodes[parseInt(requestsSum[i]) + parseInt(j)][indexes[k]].node
                node.textContent = ""
            }

            for (let k in resultArray) {
                var node = translateNodes[parseInt(requestsSum[i]) + parseInt(j)][indexes[k]].node
                node.textContent += unescapeHtml(resultArray[k]) + " "
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

        translateHtml(['<a i="0">' + escapeHtml(originalPageTitle.trim()) + '</a>'], targetLanguage).then(results => {
            if (status == "prompt" || status == "error") return;
            var j = 0
            var resultSentences = []
            var idx = 0
            while (true) {
                var sentenceStartIndex = results[j].indexOf("<b>", idx)
                if (sentenceStartIndex == -1) break;
                
                var sentenceFinalIndex = results[j].indexOf("<i>", sentenceStartIndex)
                
                if (sentenceFinalIndex == -1) {
                    resultSentences.push(results[j].slice(sentenceStartIndex + 3))
                    break
                } else {
                    resultSentences.push(results[j].slice(sentenceStartIndex + 3, sentenceFinalIndex))
                }
                idx = sentenceFinalIndex
            }

            var result = resultSentences.length > 0 ? resultSentences.join('') : results[j]

            var resultArray = result.match(/\<a\s+i\s*\=\s*['"]{1}[0-9]+['"]{1}\s*\>[^\<\>]*(?=\<\/a\>)/g)
            var indexes = resultArray.map(value => parseInt(value.match(/[0-9]+(?=['"]{1}\s*\>)/g))).filter(value => !isNaN(value))

            resultArray = resultArray.map(value => {
                var resultStartAtIndex = value.indexOf('>')
                return value.slice(resultStartAtIndex + 1)
            })

            var text = ""
            for (let k in resultArray) {
                text += unescapeHtml(resultArray[k]) + " "
            }

            document.title = text

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
            if (targetLanguage == "zh") {
                targetLanguage = "zh-CN"
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
                        attributesStrings = attributesStrings.map(str => '<a i="0">' + escapeHtml(str) + '</a>')
                        var [requestsStrings, requestsSum] = getRequestStrings(attributesStrings)
                    
                        for (let i in requestsStrings) {
                            translateHtml(requestsStrings[i], prevTargetLanguage).then(results => {
                                if (status != "finish") return;
                                for (let j in results) {
                                    var resultSentences = []
                                    var idx = 0
                                    while (true) {
                                        var sentenceStartIndex = results[j].indexOf("<b>", idx)
                                        if (sentenceStartIndex == -1) break;
                                        
                                        var sentenceFinalIndex = results[j].indexOf("<i>", sentenceStartIndex)
                                        
                                        if (sentenceFinalIndex == -1) {
                                            resultSentences.push(results[j].slice(sentenceStartIndex + 3))
                                            break
                                        } else {
                                            resultSentences.push(results[j].slice(sentenceStartIndex + 3, sentenceFinalIndex))
                                        }
                                        idx = sentenceFinalIndex
                                    }
                            
                                    var result = resultSentences.length > 0 ? resultSentences.join('') : results[j]
                            
                                    var resultArray = result.match(/\<a\s+i\s*\=\s*['"]{1}[0-9]+['"]{1}\s*\>[^\<\>]*(?=\<\/a\>)/g)
                                    var indexes = resultArray.map(value => parseInt(value.match(/[0-9]+(?=['"]{1}\s*\>)/g))).filter(value => !isNaN(value))
                            
                                    resultArray = resultArray.map(value => {
                                        var resultStartAtIndex = value.indexOf('>')
                                        return value.slice(resultStartAtIndex + 1)
                                    })
                    
                                    var text = ""
                                    for (let k in resultArray) {
                                        text += unescapeHtml(resultArray[k]) + " "
                                    }
                    
                                    var taInfo = attributesToTranslate[parseInt(requestsSum[i]) + parseInt(j)]
                                    taInfo[0].setAttribute(taInfo[2], text)
                    
                                    mutationObserver.takeRecords()
                                }
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

        chrome.runtime.sendMessage({action: "updateStatus", status: status})
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
        } else if (request.action == "updateGoogleTranslateTKK") {
            if (request.googleTranslateTKK) {
                googleTranslateTKK = request.googleTranslateTKK
            }
        } else if (request.action == "toggle-translation") {
            if (status == "prompt" || status == "error") {
                translate()
            } else {
                restore()
            }
        }
    })

    // detect language
    var detectedLanguage = undefined
    chrome.runtime.sendMessage({action: "detectLanguage"}, lang => {
        detectedLanguage = lang

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

    var gTargetLanguage = null
    chrome.runtime.sendMessage({action: "getTargetLanguage"}, targetLanguage => {
        if (targetLanguage == "zh") {
            targetLanguage = "zh-CN"
        }
        gTargetLanguage = targetLanguage
    })


    window.translateSingleText = function(text, targetLanguage=gTargetLanguage) {
        return translateHtml(['<a i="0">' + escapeHtml(text) + '</a>'], targetLanguage)
        .then(results => {
            text = ""
            for (let j in results) {
                var resultSentences = []
                var idx = 0
                
                while (true) {
                    var sentenceStartIndex = results[j].indexOf("<b>", idx)
                    if (sentenceStartIndex == -1) break;
                    
                    var sentenceFinalIndex = results[j].indexOf("<i>", sentenceStartIndex)
                    
                    if (sentenceFinalIndex == -1) {
                        resultSentences.push(results[j].slice(sentenceStartIndex + 3))
                        break
                    } else {
                        resultSentences.push(results[j].slice(sentenceStartIndex + 3, sentenceFinalIndex))
                    }
                    idx = sentenceFinalIndex
                }
        
                var result = resultSentences.length > 0 ? resultSentences.join('') : results[j]
        
                var resultArray = result.match(/\<a\s+i\s*\=\s*['"]{1}[0-9]+['"]{1}\s*\>[^\<\>]*(?=\<\/a\>)/g)

                resultArray = resultArray.map(value => {
                    var resultStartAtIndex = value.indexOf('>')
                    return value.slice(resultStartAtIndex + 1)
                })
        
                for (let k in resultArray) {
                    text += unescapeHtml(resultArray[k]) + " "
                }
            }
            return text
        })
    }

    /*
    var gTargetLanguage = null
    chrome.runtime.sendMessage({action: "getTargetLanguage"}, targetLanguage => {
        if (targetLanguage == "zh") {
            targetLanguage = "zh-CN"
        }
        gTargetLanguage = targetLanguage
    })

    ;(function() {
        var othersInlineElements = ['BR', 'IMG', 'OUTPUT', 'TIME', 'VAR']

        var element = document.createElement('div')
        element.setAttribute('style', `pointer-events: none; user-select: none; display: none;`)

        var shadowRoot = element.attachShadow({mode: "closed"})

        shadowRoot.innerHTML = `
            <style>
            div {
                animation : none;
                animation-delay : 0;
                animation-direction : normal;
                animation-duration : 0;
                animation-fill-mode : none;
                animation-iteration-count : 1;
                animation-name : none;
                animation-play-state : running;
                animation-timing-function : ease;
                backface-visibility : visible;
                background : 0;
                background-attachment : scroll;
                background-clip : border-box;
                background-color : transparent;
                background-image : none;
                background-origin : padding-box;
                background-position : 0 0;
                background-position-x : 0;
                background-position-y : 0;
                background-repeat : repeat;
                background-size : auto auto;
                border : 0;
                border-style : none;
                border-width : medium;
                border-color : inherit;
                border-bottom : 0;
                border-bottom-color : inherit;
                border-bottom-left-radius : 0;
                border-bottom-right-radius : 0;
                border-bottom-style : none;
                border-bottom-width : medium;
                border-collapse : separate;
                border-image : none;
                border-left : 0;
                border-left-color : inherit;
                border-left-style : none;
                border-left-width : medium;
                border-radius : 0;
                border-right : 0;
                border-right-color : inherit;
                border-right-style : none;
                border-right-width : medium;
                border-spacing : 0;
                border-top : 0;
                border-top-color : inherit;
                border-top-left-radius : 0;
                border-top-right-radius : 0;
                border-top-style : none;
                border-top-width : medium;
                bottom : auto;
                box-shadow : none;
                box-sizing : content-box;
                caption-side : top;
                clear : none;
                clip : auto;
                color : inherit;
                columns : auto;
                column-count : auto;
                column-fill : balance;
                column-gap : normal;
                column-rule : medium none currentColor;
                column-rule-color : currentColor;
                column-rule-style : none;
                column-rule-width : none;
                column-span : 1;
                column-width : auto;
                content : normal;
                counter-increment : none;
                counter-reset : none;
                cursor : auto;
                direction : ltr;
                display : inline;
                empty-cells : show;
                float : none;
                font : normal;
                font-family : inherit;
                font-size : medium;
                font-style : normal;
                font-variant : normal;
                font-weight : normal;
                height : auto;
                hyphens : none;
                left : auto;
                letter-spacing : normal;
                line-height : normal;
                list-style : none;
                list-style-image : none;
                list-style-position : outside;
                list-style-type : disc;
                margin : 0;
                margin-bottom : 0;
                margin-left : 0;
                margin-right : 0;
                margin-top : 0;
                max-height : none;
                max-width : none;
                min-height : 0;
                min-width : 0;
                opacity : 1;
                orphans : 0;
                outline : 0;
                outline-color : invert;
                outline-style : none;
                outline-width : medium;
                overflow : visible;
                overflow-x : visible;
                overflow-y : visible;
                padding : 0;
                padding-bottom : 0;
                padding-left : 0;
                padding-right : 0;
                padding-top : 0;
                page-break-after : auto;
                page-break-before : auto;
                page-break-inside : auto;
                perspective : none;
                perspective-origin : 50% 50%;
                position : static;
                right : auto;
                tab-size : 8;
                table-layout : auto;
                text-align : inherit;
                text-align-last : auto;
                text-decoration : none;
                text-decoration-color : inherit;
                text-decoration-line : none;
                text-decoration-style : solid;
                text-indent : 0;
                text-shadow : none;
                text-transform : none;
                top : auto;
                transform : none;
                transform-style : flat;
                transition : none;
                transition-delay : 0s;
                transition-duration : 0s;
                transition-property : none;
                transition-timing-function : ease;
                unicode-bidi : normal;
                vertical-align : baseline;
                visibility : visible;
                white-space : normal;
                widows : 0;
                width : auto;
                word-spacing : normal;
                z-index : auto;
            }

            div {
                background-color: rgba(50, 50, 50, 0.8);
                border-radius: 12px;
                border-color: black;
                position: fixed;
                top: 10px;
                left: 10px;
                padding: 12px;
                min-width: 50px;
                max-width: 500px;
                text-align: center;
                color: white;
                pointer-events: none;
                user-select: none;
                z-index: 1000000000;
                font-family: Arial, Helvetica, sans-serif;
                font-style: normal;
                font-variant: normal;
                line-height: normal;
                font-size: 16px;
                font-weight: 500;
            }
            </style>

            <div id="output"></div>
        `

        document.body.appendChild(element)

        const eOutput = shadowRoot.getElementById("output")

        var oldTarget = null
        window.addEventListener('mousemove', e => {
            if (e.target == element) {
                oldTarget = e.target
                element.style.display = "none"
                return
            }

            var target = e.target

            if (target.nodeName == "INPUT") {

            } else {
                do {
                    if (htmlTagsNoTranslate.indexOf(target.nodeName) != -1) {
                        oldTarget = target
                        element.style.display = "none"
                        return
                    }
                    if (htmlTagsInlineText.indexOf(target.nodeName) == -1 && othersInlineElements.indexOf(target.nodeName) == -1) {
                        break
                    }
                    target = target.parentNode
                } while (target && target != document.body)

                if (!target || !target.innerText) {
                    oldTarget = target
                    element.style.display = "none"
                    return
                }

                var childNodes = Array.from(target.childNodes)
            
                for (let node of childNodes) {
                    if (htmlTagsInlineText.indexOf(node.nodeName) == -1 && othersInlineElements.indexOf(node.nodeName) == -1) {
                        oldTarget = target
                        element.style.display = "none"
                        return     
                    }
                }
            }

            if (oldTarget != target) {
                oldTarget = target

                function trim (s, c) {
                    if (c === "]") c = "\\]";
                    if (c === "\\") c = "\\\\";
                    return s.replace(new RegExp(
                    "^[" + c + "]+|[" + c + "]+$", "g"
                    ), "");
                }

                var text = ""
                if (target.nodeName == "INPUT") {
                    var inputType = target.type
                    if (inputType == "submit" && !target.getAttribute("value")) {
                        text = "Submit Query"
                    } else if (inputType == "button" || inputType == "submit") {
                        text = target.value
                    } else if (target.getAttribute("placeholder")) {
                        text = target.getAttribute("placeholder")
                    }
                } else {
                    text = trim(target.innerText.trim(), "\n")
                }

                if (text.length > 1) {
                    var requests = []
                    var idx = 0
                    do {
                        var index = text.indexOf("\n", idx)
                        if (index != -1) {
                            if (index - idx <= 800) {
                                var subtext = text.substring(idx, index).trim()
                                if (subtext) {
                                    requests.push(subtext)
                                }
                                idx = index + 1
                                continue
                            }
                        }
                        var subtext = text.substring(idx).trim()
                        if (text.length <= 800) {
                            requests.push(subtext)
                            break
                        }
                        var subtext = text.substring(idx, idx + 800).trim()
                        index = subtext.lastIndexOf(" ")
                        if (index != -1) {
                            var subtext = subtext.substring(0, index).trim()
                            if (subtext) {
                                requests.push(subtext)
                            }
                            idx = idx + index + 1
                            continue
                        } else {
                            if (subtext) {
                                requests.push(subtext)
                            }
                            idx = idx + 800 + 1
                        }
                    } while (idx < text.length)

                    translateHtml(requests.map(str => '<a i="0">' + escapeHtml(str) + '</a>'), gTargetLanguage).then(results => {
                        if (target != oldTarget) return;
                        text = ""
                        for (let j in results) {
                            var resultSentences = []
                            var idx = 0
                            
                            while (true) {
                                var sentenceStartIndex = results[j].indexOf("<b>", idx)
                                if (sentenceStartIndex == -1) break;
                                
                                var sentenceFinalIndex = results[j].indexOf("<i>", sentenceStartIndex)
                                
                                if (sentenceFinalIndex == -1) {
                                    resultSentences.push(results[j].slice(sentenceStartIndex + 3))
                                    break
                                } else {
                                    resultSentences.push(results[j].slice(sentenceStartIndex + 3, sentenceFinalIndex))
                                }
                                idx = sentenceFinalIndex
                            }
                    
                            var result = resultSentences.length > 0 ? resultSentences.join('') : results[j]
                    
                            var resultArray = result.match(/\<a\s+i\s*\=\s*['"]{1}[0-9]+['"]{1}\s*\>[^\<\>]*(?=\<\/a\>)/g)

                            resultArray = resultArray.map(value => {
                                var resultStartAtIndex = value.indexOf('>')
                                return value.slice(resultStartAtIndex + 1)
                            })
                    
                            for (let k in resultArray) {
                                text += unescapeHtml(resultArray[k]) + " "
                            }
                        }

                        element.style.display = "block"

                        eOutput.style.maxWidth = Math.min(parseInt(window.innerWidth), 500) + "px"
                        eOutput.textContent = text
                        
                        var eOutputStyle = getComputedStyle(eOutput)
                        if (!eOutputStyle) {
                            element.style.display = "none"
                            return;
                        }
                        
                        var top = (e.clientY + 25)
                        top = Math.min(top, window.innerHeight - parseInt(eOutputStyle.height) - 12)
                        top = Math.max(top, 0)
                        eOutput.style.top  = Math.floor(top) + "px"
                        
                        var left = (e.clientX - (parseInt(eOutputStyle.width) / 2))
                        left = Math.min(left, window.innerWidth - parseInt(eOutputStyle.width) - 12)
                        left = Math.max(left, 0)
                        eOutput.style.left =  Math.floor(left) + "px"
                    })
                } else {
                    element.style.display = "none"
                }
            }
        })

        document.addEventListener('visibilitychange', () => {
            element.style.display = "none"
        })


        document.addEventListener('blur', () => {
            element.style.display = "none"
        })

        document.addEventListener('focus', () => {
            element.style.display = "block"
        })
    })();
    */
})