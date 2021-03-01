"use strict";

//TODO dividir em varios requests
//TODO Especificar o source lang com page no idioma do paragrafo (dividindo as requests)

var translationService = {}

{
    let googleTranslateTKK = "448487.932609646"

    function escapeHTML(unsafe) {
        return unsafe
            .replace(/\&/g, "&amp;")
            .replace(/\</g, "&lt;")
            .replace(/\>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/\'/g, "&#39;");
    }

    function unescapeHTML(unsafe) {
        return unsafe
            .replace(/\&amp;/g, "&")
            .replace(/\&lt;/g, "<")
            .replace(/\&gt;/g, ">")
            .replace(/\&quot;/g, "\"")
            .replace(/\&\#39;/g, "'");
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

    const googleTranslationInProgress = {}
    const yandexTranslationInProgress = {}

    function getTranslationInProgress(translationService, targetLanguage) {
        let translationInProgress 
        if (translationService === "yandex") {
            translationInProgress = yandexTranslationInProgress
        } else {
            translationInProgress = googleTranslationInProgress
        }

        if (!translationInProgress[targetLanguage]) {
            translationInProgress[targetLanguage] = []
        }

        return translationInProgress[targetLanguage]
    }

    translationService.google = {}
    translationService.yandex = {}

    function translateHTML(translationService, translationServiceURL, sourceArray, requestBody, textParamName, translationProgress) {
        const thisTranslationProgress = []
        const externalTranslationProgress = []

        for (const str of sourceArray) {
            const transInfo = translationProgress.find(value => value.source === str)
            if (transInfo) {
                thisTranslationProgress.push(transInfo)
            } else {
                const translated = translationCache.get(translationService, str, targetLanguage)
                let newTransInfo
                if (translated) {
                    newTransInfo = {
                        source: str,
                        translated: translated,
                        status: "complete"
                    }
                } else {
                    newTransInfo = {
                        source: str,
                        translated: null,
                        status: "translating"
                    }
                    externalTranslationProgress.push(newTransInfo)
                    requestBody += "&" + textParamName + "=" + encodeURIComponent(str)
                }

                translationProgress.push(newTransInfo)
                thisTranslationProgress.push(newTransInfo)
            }
        }

        let tk = ""
        if (translationService === "google") {
            tk = calcHash(externalTranslationProgress.map(value => value.source).join(''), googleTranslateTKK)
        }

        if (externalTranslationProgress.length > 0) {
            fetch(translationServiceURL + tk, {
                "credentials": "omit",
                "headers": {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                "body": requestBody,
                "method": "POST",
                "mode": "no-cors",
                "referrerPolicy": "no-referrer"
            })
            .then(response => response.json())
            .then(response => {
                let responseJson
                if (translationService === "yandex") {
                    responseJson = response.text
                } else {
                    if (typeof response[0] == "string") {
                        responseJson = response
                    } else {
                        responseJson = response.map(value => value[0])
                    }
                }

                externalTranslationProgress.forEach((etp, index) => {
                    try {
                        if (responseJson[index]) {
                            etp.status = "complete"
                            etp.translated = responseJson[index]
                        } else {
                            etp.status = "error"
                        }
                    } catch (e) {
                        etp.status = "error"
                        console.error(e)
                    }
                })
                return responseJson
            })
            .catch(e => {
                externalTranslationProgress.forEach(etp => {
                    etp.status = "error"
                })
                console.error(e)
            })
        }

        return new Promise((resolve, reject) => {
            let iterationsCount = 0
            function waitForTranslationFinish() {
                let isTranslating = false
                for (let info of thisTranslationProgress) {
                    if (info.status === "translating") {
                        isTranslating = true
                        break
                    }
                }
                if (iterationsCount < 100) {
                    if (isTranslating) {
                        setTimeout(waitForTranslationFinish, 100)
                    } else {
                        resolve(thisTranslationProgress)
                    }
                } else {
                    reject()
                }
            }
            waitForTranslationFinish()
        })
    }

    translationService.google.translateHTML = function (sourceArray3d, targetLanguage) {
        if (targetLanguage == "zh") {
            targetLanguage = "zh-CN"
        }

        const sourceArray = sourceArray3d.map(sourceArray => {
            sourceArray = sourceArray.map(value => escapeHTML(value))
            if (sourceArray.length > 1) {
                sourceArray = sourceArray.map((value, index) => "<a i=" + index + ">" + value + "</a>")
            }
            return sourceArray.join("")
        })

        const requestBody = ""
        return translateHTML(
            "google",
            "https://translate.googleapis.com/translate_a/t?anno=3&client=te&v=1.0&format=html&sl=auto&tl=" + targetLanguage + "&tk=",
            sourceArray,
            requestBody,
            "q",
            getTranslationInProgress("google", targetLanguage)
        )
        .then(thisTranslationProgress => {
            const results = thisTranslationProgress.map(value => value.translated)
            const resultArray3d = []
            
            for (let i in results) {
                let result = results[i]
                const sentences = []

                let idx = 0
                while (true) {
                    const sentenceStartIndex = result.indexOf("<b>", idx)
                    if (sentenceStartIndex === -1) break;
                    
                    const sentenceFinalIndex = result.indexOf("<i>", sentenceStartIndex)
                    
                    if (sentenceFinalIndex === -1) {
                        sentences.push(result.slice(sentenceStartIndex + 3))
                        break
                    } else {
                        sentences.push(result.slice(sentenceStartIndex + 3, sentenceFinalIndex))
                    }
                    idx = sentenceFinalIndex
                }
    
                result = sentences.length > 0 ? sentences.join(" ") : result
                let resultArray = result.match(/\<a\si\=[0-9]\>[^\<\>]*(?=\<\/a\>)/g)

                let indexes
                if (resultArray && resultArray.length > 0) {
                    indexes = resultArray.map(value => parseInt(value.match(/[0-9]+(?=\>)/g))).filter(value => !isNaN(value))
                    resultArray = resultArray.map(value => {
                        var resultStartAtIndex = value.indexOf('>')
                        return value.slice(resultStartAtIndex + 1)
                    })
                } else {
                    resultArray = [result]
                    indexes = [0]
                }

                resultArray = resultArray.map(value => unescapeHTML(value))

                const finalResulArray = []
                for (const j in indexes) {
                    if (finalResulArray[indexes[j]]) {
                        finalResulArray[indexes[j]] += " " + resultArray[j]
                    } else {
                        finalResulArray.push(resultArray[j])
                    }
                }
                
                resultArray3d.push(finalResulArray)
            }

            return resultArray3d
        })
    }

    translationService.google.translateText = function (sourceArray, targetLanguage) {
        if (targetLanguage == "zh") {
            targetLanguage = "zh-CN"
        }

        return translationService.google.translateHTML(sourceArray.map(value => [value]), targetLanguage)
        .then(results => {
            return results
        })
    }

    translationService.yandex.translateHTML = function (sourceArray3d, targetLanguage) {
        if (targetLanguage.indexOf("zh-") !== -1) {
            targetLanguage = "zh"
        }

        const sourceArray = sourceArray3d.map(sourceArray => {
            return sourceArray
                .map(value => escapeHTML(value))
                .join("<wbr>")
        })

        const requestBody = "srv=tr-url-widget&format=html&lang=" + targetLanguage
        return translateHTML(
            "yandex",
            "https://translate.yandex.net/api/v1/tr.json/translate",
            sourceArray,
            requestBody,
            "text",
            getTranslationInProgress("yandex", targetLanguage)
        )
        .then(thisTranslationProgress => {
            const results = thisTranslationProgress.map(value => value.translated)

            const resultArray3d = []
            for (const result of results) {
                resultArray3d.push(
                    result
                    .split("<wbr>")
                    .map(value => unescapeHTML(value))
                )
            }

            return resultArray3d
        })
    }

    translationService.yandex.translateText = function (sourceArray, targetLanguage) {
        if (targetLanguage.indexOf("zh-") !== -1) {
            targetLanguage = "zh"
        }

        return translationService.yandex.translateHTML(sourceArray.map(value => [value]), targetLanguage)
        .then(results => {
            return results
        })
    }


    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "translateHTML") {
            let translateHTML
            if (request.translationService === "yandex") {
                translateHTML = translationService.yandex.translateHTML
            } else {
                translateHTML = translationService.google.translateHTML
            }

            translateHTML(request.sourceArray3d, request.targetLanguage)
            .then(results => {
                sendResponse(results)
            })
            .catch(e => {
                sendResponse()
            })

            return true
        } else if (request.action === "translateText") {

            return true
        }
    })
}