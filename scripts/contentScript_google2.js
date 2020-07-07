if (typeof browser !== 'undefined') {
    chrome = browser
}

var prevTargetLanguage = null
var translatedStrings = []
var nodesTranslated = []
var status = "prompt"
var htmlTagsInlineText = ['#text', 'A', 'ABBR', 'B', 'BIG', 'BDO', 'B', 'CITE', 'DFN', 'EM', 'I', 'INST', 'KBD', 'TT', 'Q', 'SAMP', 'SMALL', 'SPAN', 'STRONG', 'SUB', 'SUP']
var htmlTagsNoTranslate = ['CODE', 'TITLE', 'SCRIPT', 'STYLE', 'TEXTAREA']

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
        
        fetch("https://translate.googleapis.com/translate_a/t?anno=3&client=te&format=html&v=1.0&sl=auto&tl=" + targetLanguage + "&tk=" + tk, {
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
            console.log(e)
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
    var translateNodes = [[]]
    var index = 0
    var getAllNodes = function (element) {
        if (element.nodeType == 1) {
            if (translateNodes[index].length > 0 && htmlTagsInlineText.indexOf(element.nodeName) == -1) {
                translateNodes.push([])
                index++
            }
            if (htmlTagsNoTranslate.indexOf(element.nodeName) == -1) {
                Array.from(element.childNodes).forEach(value => {
                    getAllNodes(value)
                })
            }
        } else if (element.nodeType == 3) {
            if (element.textContent.trim().length > 0) {
                translateNodes[index].push({node: element, textContent: element.textContent})
            }
        }
    }
    getAllNodes(element)
    return translateNodes
}

function getNodesStrings(translateNodes) {
    var nodesStrings = []
    translateNodes.forEach(value => {
        if (value.length > 0) {
            nodesStrings.push(value
                .map(node => escapeHtml(node.textContent))
                .map((text, index) => '<a i="' + index + '">' + text + '</a>')
                .join('')
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
            
            var sentenceFinalIndex = results[j].indexOf("</b>", sentenceStartIndex)
            if (sentenceFinalIndex == -1) break;
                
            resultSentences.push(results[j].slice(sentenceStartIndex + 3, sentenceFinalIndex))
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

        countRequestsTranslated = 0
        status = "progress"
        
        var translateNodes = getTranslateNodes(document.body)
        var nodesStrings = getNodesStrings(translateNodes)
        var [requestsStrings, requestsSum] = getRequestStrings(nodesStrings)

        for (let i in translateNodes) {
            for (let nodeInfo of translateNodes[i]) {
                nodesTranslated.push({node: nodeInfo.node, original: nodeInfo.node.textContent})
            }
        }

        for (let i in requestsStrings) {
            translateHtml(requestsStrings[i], targetLanguage).then(results => {
                countRequestsTranslated++
                if (countRequestsTranslated == requestsStrings.length) {
                    status = "finish"
                }
                translateResults(i, results, translateNodes, requestsSum)
            })
        }
    })
}

function restore()
{
    status = "prompt"
    nodesTranslated.forEach(nodeInfo => {
        nodeInfo.node.textContent = nodeInfo.original
    })
    nodesTranslated = []
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
        try {translate()} catch(e) {console.log(e)}
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
            if (pageLang && alwaysTranslateLangs.indexOf(pageLang.split("-")[0]) != -1) {
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