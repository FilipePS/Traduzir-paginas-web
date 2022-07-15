var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const fs = require('fs');

function getKey() {
    function getURL() {
        return new Promise(async (resolve, reject) => {
            const xhttp = new XMLHttpRequest
            xhttp.onload = e => {
                let key
                try {
                    const startIdx = xhttp.responseText.indexOf("_loadJs(")
                    if (startIdx === -1) {
                        throw new Error("")
                    }
                    const endIdx = xhttp.responseText.indexOf(");", startIdx)
                    if (endIdx === -1) {
                        throw new Error("")
                    }
                    resolve(eval(xhttp.responseText.slice(startIdx + "_loadJs(".length, endIdx)))
                } catch (e) {
                    console.error(e)
                    reject(e)
                }
                resolve(key)
            }
            xhttp.onerror = e => {
                console.error(e)
                reject(e)
            }

            xhttp.open("GET", "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit", true)
            xhttp.send()
        })
    }

    return new Promise(async (resolve, reject) => {
        const xhttp = new XMLHttpRequest
        xhttp.onload = e => {
            let key
            try {
                key = xhttp.responseText.match(/(key:")(\w+)/)[2]
            } catch (e) {
                console.error(e)
                reject(e)
            }
            resolve(key)
        }
        xhttp.onerror = e => {
            console.error(e)
            reject(e)
        }

        xhttp.open("GET", await getURL(), true)
        xhttp.send()
    })
}

function getSupportedLanguagesFrom(key, lang) {
    return new Promise((resolve, reject) => {
        const xhttp = new XMLHttpRequest
        xhttp.onload = e => {
            let key
            try {
                function callback(langs) {
                    resolve(langs)
                }
                eval(xhttp.responseText)
            } catch (e) {
                console.error(e)
                reject(e)
            }
            resolve(key)
        }
        xhttp.onerror = e => {
            console.error(e)
            reject(e)
        }
        xhttp.open("GET", `https://translate-pa.googleapis.com/v1/supportedLanguages?client=te&display_language=${lang}&key=${key}&callback=callback`, true)
        xhttp.send()
    })
}

async function getLangsFrom(key, lang) {
    const result = await getSupportedLanguagesFrom(key, lang)
    
    const langs = {}

    result.targetLanguages.forEach(tl => {
        if (tl.language === "zh-CN") {
            langs["zh"] = tl.name
        }
        if (tl.name === "iw") {
            tl.name = "he"
        }
        langs[tl.language] = tl.name
    })

    if (!langs["zh"]) {
        throw new Error("")
    }

    return langs
}

async function init() {
    const key = await getKey()
    
    const lang_codes = [
        "en",
        "ar",
        "ca",
        "zh-CN",
        "zh-TW",
        "hr",
        "cs",
        "da",
        "nl",
        "fi",
        "fr",
        "de",
        "el",
        "he",
        "hi",
        "hu",
        "it",
        "ja",
        "ko",
        "fa",
        "pl",
        "pt-PT",
        "pt-BR",
        "ro",
        "ru",
        "sl",
        "es",
        "sv",
        "th",
        "tr",
        "uk",
        "vi",
    ]

    const final_result = {}

    for (const code of lang_codes) {
        const langs = await getLangsFrom(key, code)
        final_result[code] = langs
    }
    console.log(final_result)
    fs.writeFileSync("out.json", JSON.stringify(final_result), "utf-8")
}

init()