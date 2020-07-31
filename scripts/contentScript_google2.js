if (typeof browser !== 'undefined') {
    chrome = browser
}

var translateNodes = null

var prevTargetLanguage = null
var translatedStrings = []
var nodesTranslated = []
var status = "prompt"
var htmlTagsInlineText = ['#text', 'A', 'ABBR', 'B', 'BIG', 'BDO', 'B', 'CITE', 'DFN', 'EM', 'I', 'INST', 'KBD', 'TT', 'Q', 'SAMP', 'SMALL', 'SPAN', 'STRONG', 'SUB', 'SUP']
var htmlTagsNoTranslate = ['CODE', 'TITLE', 'SCRIPT', 'STYLE', 'TEXTAREA']

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
                    nodesToTranslate.push(addedNode)
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

function aux(a, b) {
    for (var c = 0; c < b.length - 2; c += 3) {
        var d = b.charAt(c + 2);
        d = 'a' <= d ? d.charCodeAt(0) - 87 : Number(d);
        d = '+' == b.charAt(c + 1) ? a >>> d : a << d;
        a = '+' == b.charAt(c) ? a + d & 4294967295 : a ^ d
    }
    return a
}

function calcHash(a, b) {
    var c = b.split('.');
    b = Number(c[0]) || 0;
    for (var d = [], e = 0, f = 0; f < a.length; f++) {
        var h = a.charCodeAt(f);
        128 > h ? d[e++] = h : (2048 > h ? d[e++] = h >> 6 | 192 : (55296 == (h & 64512) && f + 1 < a.length && 56320 == (a.charCodeAt(f + 1) & 64512) ? (h = 65536 + ((h & 1023) << 10) + (a.charCodeAt(++f) & 1023), d[e++] = h >> 18 | 240, d[e++] = h >> 12 & 63 | 128) : d[e++] = h >> 12 | 224, d[e++] = h >> 6 & 63 | 128), d[e++] = h & 63 | 128)
    }
    a = b;
    for (e = 0; e < d.length; e++) a += d[e],
        a = aux(a, '+-a^+6');
    a = aux(a, '+-3^+b+-f');
    a ^= Number(c[1]) || 0;
    0 > a && (a = (a & 2147483647) + 2147483648);
    c = a % 1000000;
    return c.toString() + '.' + (c ^ b)
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
        fetch("https://translate.googleapis.com/translate_a/t?anno=3&client=te&v=1.0&format=html&sl=auto&tl=" + targetLanguage + "&tk=" + tk, {
            "credentials": "omit",
            "headers": {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            "body": requestBody,
            "method": "POST",
            "mode": "cors"
        })
        .then(response => response.json())
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
    var minDeep = null
    var getAllNodes = function (element, deep) {
        if (element.nodeType == 1) {
            if (translateNodes[index].nodesInfo.length > 0 && htmlTagsInlineText.indexOf(element.nodeName) == -1) {
                translateNodes.push({isTranslated: false, parent: null, nodesInfo: []})
                index++
                minDeep = null
            }
            if (htmlTagsNoTranslate.indexOf(element.nodeName) == -1) {
                Array.from(element.childNodes).forEach(value => {
                    getAllNodes(value, deep + 1)
                })
            }
        } else if (element.nodeType == 3) {
            if (element.textContent.trim().length > 0) {
                if (minDeep) {
                    if (deep < minDeep) {
                        minDeep = deep
                        translateNodes[index].parent = element.parentNode
                    }
                } else {
                    minDeep = deep
                    translateNodes[index].parent = element.parentNode               
                }
                translateNodes[index].nodesInfo.push({node: element, textContent: element.textContent})
            }
        }
    }
    getAllNodes(element, 0)

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

        status = "progress"
        
        translateNodes = getTranslateNodes(document.body)

        for (let i in translateNodes) {
            for (let nodeInfo of translateNodes[i].nodesInfo) {
                nodesTranslated.push({node: nodeInfo.node, original: nodeInfo.node.textContent})
            }
        }

        status = "finish"

        translateAttributes(targetLanguage)
        translatePageTitle(targetLanguage)
        
        enableMutatinObserver()
    })
}

function restore()
{
    disableMutatinObserver()

    status = "prompt"
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
    }
})

// detect language
var detectedLanguage = undefined
chrome.runtime.sendMessage({action: "detectLanguage"}, lang => {
    detectedLanguage = lang

    // auto translate pages
    if (detectedLanguage) {
        chrome.storage.local.get(["alwaysTranslateLangs", "neverTranslateSites"]).then(onGot => {
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
        })
    }
})
//*/

// auto translate new iframes
setTimeout(() => {
    chrome.runtime.sendMessage({action: "getStatus"}).then(mainFrameStatus => {
        if (status == "prompt" && (mainFrameStatus == "progress" || mainFrameStatus == "finish")) {
            translate()
        }
    })
}, 500)



// var gTargetLanguage = null
// chrome.runtime.sendMessage({action: "getTargetLanguage"}, targetLanguage => {
//     if (targetLanguage == "zh") {
//         targetLanguage = "zh-CN"
//     }
//     gTargetLanguage = targetLanguage
// })

// ;(function() {
//     var othersInlineElements = ['BR', 'CODE', 'IMG', 'OUTPUT', 'TIME', 'VAR']

//     var div = document.createElement('div')
//     div.setAttribute('style', `background-color: rgba(50, 50, 50, 0.8); border-radius: 12px; border-color: black; position: fixed; top: 10px; left: 10px; padding: 12px; min-width: 50px; max-width: 500px; text-align: center; color: white; pointer-events: none; user-select: none; display: none; z-index: 1000000000`)

//     document.body.appendChild(div)

//     var oldTarget = null
//     window.addEventListener('mousemove', e => {
//         if (e.target == div) {
//             oldTarget = e.target
//             div.style.display = "none"
//             return
//         }

//         var target = e.target

//         if (target.nodeName == "INPUT") {

//         } else {
//             do {
//                 if (htmlTagsNoTranslate.indexOf(target.nodeName) != -1) {
//                     oldTarget = target
//                     div.style.display = "none"
//                     return
//                 }
//                 if (htmlTagsInlineText.indexOf(target.nodeName) == -1 && othersInlineElements.indexOf(target.nodeName) == -1) {
//                     break
//                 }
//                 target = target.parentNode
//             } while (target && target != document.body)

//             if (!target || !target.innerText) {
//                 oldTarget = target
//                 div.style.display = "none"
//                 return
//             }

//             var childNodes = Array.from(target.childNodes)
        
//             for (let node of childNodes) {
//                 if (htmlTagsInlineText.indexOf(node.nodeName) == -1 && othersInlineElements.indexOf(node.nodeName) == -1) {
//                     oldTarget = target
//                     div.style.display = "none"
//                     return     
//                 }
//             }
//         }

//         if (oldTarget != target) {
//             oldTarget = target

//             function trim (s, c) {
//                 if (c === "]") c = "\\]";
//                 if (c === "\\") c = "\\\\";
//                 return s.replace(new RegExp(
//                 "^[" + c + "]+|[" + c + "]+$", "g"
//                 ), "");
//             }

//             var text = ""
//             if (target.nodeName == "INPUT") {
//                 var inputType = target.type
//                 if (inputType == "submit" && !target.getAttribute("value")) {
//                     text = "Submit Query"
//                 } else if (inputType == "button" || inputType == "submit") {
//                     text = target.value
//                 } else if (target.getAttribute("placeholder")) {
//                     text = target.getAttribute("placeholder")
//                 }
//             } else {
//                 text = trim(target.innerText.trim(), "\n")
//             }

//             if (text.length > 1) {
//                 var requests = []
//                 var idx = 0
//                 do {
//                     var index = text.indexOf("\n", idx)
//                     if (index != -1) {
//                         if (index - idx <= 800) {
//                             var subtext = text.substring(idx, index).trim()
//                             if (subtext) {
//                                 requests.push(subtext)
//                             }
//                             idx = index + 1
//                             continue
//                         }
//                     }
//                     var subtext = text.substring(idx).trim()
//                     if (text.length <= 800) {
//                         requests.push(subtext)
//                         break
//                     }
//                     var subtext = text.substring(idx, idx + 800).trim()
//                     index = subtext.lastIndexOf(" ")
//                     if (index != -1) {
//                         var subtext = subtext.substring(0, index).trim()
//                         if (subtext) {
//                             requests.push(subtext)
//                         }
//                         idx = idx + index + 1
//                         continue
//                     } else {
//                         if (subtext) {
//                             requests.push(subtext)
//                         }
//                         idx = idx + 800 + 1
//                     }
//                 } while (idx < text.length)

//                 translateHtml(requests.map(str => '<a i="0">' + escapeHtml(str) + '</a>'), gTargetLanguage).then(results => {
//                     if (target != oldTarget) return;
//                     text = ""
//                     for (let j in results) {
//                         var resultSentences = []
//                         var idx = 0
                        
//                         while (true) {
//                             var sentenceStartIndex = results[j].indexOf("<b>", idx)
//                             if (sentenceStartIndex == -1) break;
                            
//                             var sentenceFinalIndex = results[j].indexOf("<i>", sentenceStartIndex)
                            
//                             if (sentenceFinalIndex == -1) {
//                                 resultSentences.push(results[j].slice(sentenceStartIndex + 3))
//                                 break
//                             } else {
//                                 resultSentences.push(results[j].slice(sentenceStartIndex + 3, sentenceFinalIndex))
//                             }
//                             idx = sentenceFinalIndex
//                         }
                
//                         var result = resultSentences.length > 0 ? resultSentences.join('') : results[j]
                
//                         var resultArray = result.match(/\<a\s+i\s*\=\s*['"]{1}[0-9]+['"]{1}\s*\>[^\<\>]*(?=\<\/a\>)/g)

//                         resultArray = resultArray.map(value => {
//                             var resultStartAtIndex = value.indexOf('>')
//                             return value.slice(resultStartAtIndex + 1)
//                         })
                
//                         for (let k in resultArray) {
//                             text += unescapeHtml(resultArray[k]) + " "
//                         }
//                     }

//                     div.style.display = "block"

//                     div.style.maxWidth = window.innerWidth
//                     div.textContent = text
                    
//                     var divStyle = getComputedStyle(div)
//                     if (!divStyle) {return}
                    
//                     var top = (e.clientY + 25)
//                     top = Math.min(top, window.innerHeight - parseInt(divStyle.height) - 12)
//                     top = Math.max(top, 0)
//                     div.style.top  = Math.floor(top) + "px"
                    
//                     var left = (e.clientX - (parseInt(divStyle.width) / 2))
//                     left = Math.min(left, window.innerWidth - parseInt(divStyle.width) - 12)
//                     left = Math.max(left, 0)
//                     div.style.left =  Math.floor(left) + "px"
//                 })
//             } else {
//                 div.style.display = "none"
//             }
//         }
//     })


//     document.addEventListener('blur', () => {
//         div.style.display = "none"
//     })

//     document.addEventListener('focus', () => {
//         div.style.display = "block"
//     })
// })();
