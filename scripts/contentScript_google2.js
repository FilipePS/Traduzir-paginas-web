if (typeof browser !== 'undefined') {
    chrome = browser
}

var translatedStrings = []
var nodesTranslated = []
var status = "prompt"
var htmlTagsInlineText = ['#text', 'A', 'ABBR', 'B', 'BIG', 'BDO', 'B', 'CITE', 'DFN', 'EM', 'I', 'INST', 'KBD', 'TT', 'Q', 'SAMP', 'SMALL', 'SPAN', 'STRONG', 'SUB', 'SUP']
var htmlTagsNoTranslate = ['CODE', 'TITLE', 'SCRIPT', 'STYLE', 'TEXTAREA']

function shiftLeftOrRightThenSumOrXor(num, opArray) {
    return opArray.reduce((acc, opString) => {
        var op1 = opString[1]; //	'+' | '-' ~ SUM | XOR
        var op2 = opString[0]; //	'+' | '^' ~ SLL | SRL
        var xd = opString[2]; //	[0-9a-f]

        var shiftAmount = hexCharAsNumber(xd);
        var mask = (op1 == '+') ? acc >>> shiftAmount : acc << shiftAmount;
        return (op2 == '+') ? (acc + mask & 0xffffffff) : (acc ^ mask);
    }, num);
}

function hexCharAsNumber(xd) {
    return (xd >= 'a') ? xd.charCodeAt(0) - 87 : Number(xd);
}

function transformQuery(query) {
    for (var e = [], f = 0, g = 0; g < query.length; g++) {
        var l = query.charCodeAt(g);
        if (l < 128) {
            e[f++] = l; //	0{l[6-0]}
        } else if (l < 2048) {
            e[f++] = l >> 6 | 0xC0; //	110{l[10-6]}
            e[f++] = l & 0x3F | 0x80; //	10{l[5-0]}
        } else if (0xD800 == (l & 0xFC00) && g + 1 < query.length && 0xDC00 == (query.charCodeAt(g + 1) & 0xFC00)) {
            //	that's pretty rare... (avoid ovf?)
            l = (1 << 16) + ((l & 0x03FF) << 10) + (query.charCodeAt(++g) & 0x03FF);
            e[f++] = l >> 18 | 0xF0; //	111100{l[9-8*]}
            e[f++] = l >> 12 & 0x3F | 0x80; //	10{l[7*-2]}
            e[f++] = l & 0x3F | 0x80; //	10{(l+1)[5-0]}
        } else {
            e[f++] = l >> 12 | 0xE0; //	1110{l[15-12]}
            e[f++] = l >> 6 & 0x3F | 0x80; //	10{l[11-6]}
            e[f++] = l & 0x3F | 0x80; //	10{l[5-0]}
        }
    }
    return e;
}

function normalizeHash(encondindRound2) {
    if (encondindRound2 < 0) {
        encondindRound2 = (encondindRound2 & 0x7fffffff) + 0x80000000;
    }
    return encondindRound2 % 1E6;
}

function calcHash(query, windowTkk) {
    //	STEP 1: spread the the query char codes on a byte-array, 1-3 bytes per char
    var bytesArray = transformQuery(query);

    //	STEP 2: starting with TKK index, add the array from last step one-by-one, and do 2 rounds of shift+add/xor
    var d = windowTkk.split('.');
    var tkkIndex = Number(d[0]) || 0;
    var tkkKey = Number(d[1]) || 0;

    var encondingRound1 = bytesArray.reduce((acc, current) => {
        acc += current;
        return shiftLeftOrRightThenSumOrXor(acc, ['+-a', '^+6'])
    }, tkkIndex);

    //	STEP 3: apply 3 rounds of shift+add/xor and XOR with they TKK key
    var encondingRound2 = shiftLeftOrRightThenSumOrXor(encondingRound1, ['+-3', '^+b', '+-f']) ^ tkkKey;

    //	STEP 4: Normalize to 2s complement & format
    var normalizedResult = normalizeHash(encondingRound2);

    return normalizedResult.toString() + "." + (normalizedResult ^ tkkIndex)
}

var googleTranslateTKK = null
chrome.runtime.sendMessage({action: "getGoogleTranslateTKK"}, gtTKK => {
    googleTranslateTKK = gtTKK
})

function escapeHtml(unsafe) {
    return unsafe
         .replaceAll("&", "&amp;")
         .replaceAll("<", "&lt;")
         .replaceAll(">", "&gt;")
         .replaceAll("\"", "&quot;")
         .replaceAll("'", "&#39;");
}

function unescapeHtml(unsafe) {
    return unsafe
         .replaceAll("&amp;", "&")
         .replaceAll("&lt;", "<")
         .replaceAll("&gt;", ">")
         .replaceAll("&quot;", "\"")
         .replaceAll("&#39;", "'");
}

function translateHtml(params) {
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
        
        fetch("https://translate.googleapis.com/translate_a/t?anno=3&client=te&format=html&v=1.0&sl=auto&tl=pt&tk=" + tk, {
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
        if (requestLength == 0 || requestLength + nodesStrings[i].length < 1000) {
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
        translateHtml(requestsStrings[i]).then(results => {
            countRequestsTranslated++
            if (countRequestsTranslated == requestsStrings.length) {
                status = "finish"
            }
            translateResults(i, results, translateNodes, requestsSum)
        })
    }
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