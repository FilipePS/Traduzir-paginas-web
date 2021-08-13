"use strict";

var textToSpeech = {}

{
    textToSpeech.google = function (text, targetLanguage) {
        return new Promise((resolve, reject) => {
            const http = new XMLHttpRequest

            http.onload = e => {
                const reader = new FileReader();
                reader.onloadend = function () {
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

    let audios = []
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "textToSpeech") {
            const splited = request.text.split(" ")
            const promises = []

            let requestString = ""
            for (let txt of splited) {
                txt += " "
                if (requestString.length + txt.length < 170) {
                    requestString += txt
                } else {
                    promises.push(textToSpeech.google(requestString, request.targetLanguage))
                    requestString = txt
                }
            }
            if (requestString) {
                promises.push(textToSpeech.google(requestString, request.targetLanguage))
                requestString = ""
            }

            Promise.all(promises)
                .then(result => {
                    sendResponse(result)
                })
                .catch(e => {
                    console.error(e)
                    sendResponse()
                })

            return true
        } else if (request.action === "playAudio") {
            audios.forEach(audio => audio.pause())
            audios = []

            const promises = []
            let audioIndex = 0
            request.audioDataUrls.forEach(audioDataUrl => {
                const audio = new Audio(audioDataUrl)
                promises.push(new Promise(resolve => {
                    audio.onended = audio.onpause = e => {
                        resolve()
                        if (audios[audioIndex] && !audios.some(audio => !audio.paused)) {
                            audios[audioIndex].play()
                            audioIndex++
                        }
                    }
                }))
                audios.push(audio)
            })

            twpConfig.onReady(function () {
                audios.forEach(audio => audio.playbackRate = twpConfig.get("ttsSpeed"))
            })

            if (audios[audioIndex]) {
                audios[audioIndex].play()
                audioIndex++
            }

            Promise.all(promises)
                .then(r => {
                    sendResponse(r)
                })
                .catch(e => {
                    console.error(e)
                    sendResponse()
                })

            return true
        } else if (request.action === "stopAudio") {
            audios.forEach(audio => audio.pause())
            audios = []
        }
    })

    twpConfig.onReady(function () {
        twpConfig.onChanged((name, newvalue) => {
            switch (name) {
                case "ttsSpeed":
                    audios.forEach(audio => audio.playbackRate = newvalue)
                    break
            }
        })
    })
}