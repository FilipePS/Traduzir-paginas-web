"use strict";

var textToSpeech = {}

{
    textToSpeech.google = function (text, targetLanguage) {
        return new Promise((resolve, reject) => {
            const http = new XMLHttpRequest

            http.onload = e => {
                const reader = new FileReader();
                reader.onloadend = function() {
                    resolve(reader.result)
                }
                reader.readAsDataURL(e.target.response)
            }
    
            http.onerror = e => {
                console.error(e)
                reject(e)
            }
    
            http.open("GET", `https://translate.google.com/translate_tts?ie=UTF-8&tl=${targetLanguage}&client=dict-chrome-ex&ttsspeed=0.5&q=` + encodeURIComponent(text))
            http.responseType = "blob"
            http.send()
        })
    }

    let audio = null
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "textToSpeech") {
            textToSpeech.google(request.text, request.targetLanguage)
            .then(result => {
                sendResponse(result)
            })
            .catch(e => {
                console.error(e)
                sendResponse()
            })

            return true
        } else if (request.action === "playAudio") {
            if (audio) {
                audio.pause()
            }
            audio = new Audio(request.audioDataUrl)
            audio.play()
            audio.onended = audio.onpause = e => {
                sendResponse()
            }

            return true
        } else if (request.action === "stopAudio") {
            if (audio) {
                audio.pause()
                audio = null
            }
        }
    })
}