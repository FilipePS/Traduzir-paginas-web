if (typeof browser !== 'undefined') {
    chrome = browser
}

var htmlTagsInlineText = ['#text', 'A', 'ABBR', 'B', 'BIG', 'BDO', 'B', 'CITE', 'DFN', 'EM', 'I', 'INST', 'KBD', 'TT', 'Q', 'SAMP', 'SMALL', 'SPAN', 'STRONG', 'SUB', 'SUP']
var htmlTagsNoTranslate = ['CODE', 'TITLE', 'SCRIPT', 'STYLE', 'TEXTAREA']

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

    var requestBody = "srv=tr-url-widget&format=html&lang=pt"

    params.forEach(value => {
        requestBody += "&text=" + encodeURIComponent(value)
    })

    return fetch("https://translate.yandex.net/api/v1/tr.json/translate", {
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
            return responseJson.text
        })
        .catch(e => {
            console.log(e)
        })
}

function getTranslateNodes() {
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
    getAllNodes(document.body)
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

function getRequestStrings() {
    var requestsSum = [0]
    var requestsStrings = [[]]
    var index = 0
    var requestLength = 0
    for (let i in nodesStrings) {
        if (requestLength == 0 || requestLength + nodesStrings[i].length < 850) {
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
            translateNodes[parseInt(requestsSum[i]) + parseInt(j)][parseInt(k)].node.textContent = resultArray[k]
        }
    }
}

var status = "prompt"
var countRequestsTranslated = 0
var translateNodes = null
var nodesStrings = null
var requestsStrings = null
var requestsSum = null
var resultsTranslated = null

function translate()
{

    countRequestsTranslated = 0
    status = "progress"
    
    if (!translateNodes || !nodesStrings || !requestsStrings || !requestsSum) {
        translateNodes = getTranslateNodes()
        nodesStrings = getNodesStrings(translateNodes)
        var [rstr, rsum] = getRequestStrings(nodesStrings)
        requestsStrings = rstr
        requestsSum = rsum
    }

    if (resultsTranslated) {
        resultsTranslated.forEach(value => {
            countRequestsTranslated++
            if (countRequestsTranslated == resultsTranslated.length) {
                status = "finish"
            }
            var [i, results] = value
            translateResults(i, results, translateNodes, requestsSum)
        })
    } else {
        resultsTranslated = []
        for (let i in requestsStrings) {
            translateHtml(requestsStrings[i]).then(results => {
                countRequestsTranslated++
                if (countRequestsTranslated == requestsStrings.length) {
                    status = "finish"
                }
                resultsTranslated.push([i, results])
                translateResults(i, results, translateNodes, requestsSum)
            })
        }
    }
}

function restore()
{
    status = "prompt"
    if (translateNodes) {
        translateNodes.forEach(value => {
            value.forEach(value => {
                value.node.textContent = value.textContent
            })
        })
    }
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