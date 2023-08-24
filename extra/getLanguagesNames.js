// Yandex only languages ba, cv, mrj, kazlat, mhr, pap, udm, sah, uzbcyr

const fs = require("fs");
const superagent = require("superagent");
require("superagent-proxy")(superagent);

if (!fs.existsSync("./out")) {
    fs.mkdirSync("out");
}

async function getKey(service) {
    if (service == "bing") return ""
    else {
        async function getURL() {
            return await new Promise(async (resolve, reject) => {
                let response;
                superagent.get("https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit").end((err, res) => {
                    if (err) {
                        console.error(err)
                        reject()
                    }
                    const startIdx = res.indexOf("_loadJs(");
                    if (startIdx === -1) {
                        console.error("startIdx = -1");
                        reject();
                    }
                    const endIdx = res.indexOf(");", startIdx);
                    if (endIdx === -1) {
                        console.error("startIdx = -1");
                        reject();
                    }
                    try {
                        response = eval(res.slice(startIdx + "_loadJs(".length, endIdx))
                    } catch (err) {
                        console.error(err)
                        reject()
                    }
                })
            });
        }

        return await new Promise(async (resolve, reject) => {
            const url = service == "google" ? await getURL() : "https://translate.yandex.net/website-widget/v1/widget.js?widgetId=ytWidget&pageLang=es&widgetTheme=light&autoMode=false"
            let response;
            superagent.get(url).end((err, res) => {
                if (err) {
                    console.error(err)
                    reject()
                }

                response = service == "google" ? res.match(/(key:")(\w+)/)[2] : res.match(/sid:\s'[0-9a-f.]+/)[0].substring(6);
                resolve(response)
            })
        })
    }
}

async function getSupportedLanguages(service, lang, key = "") {
    return await new Promise((resolve, reject) => {
        let url;
        let response;

        switch (service) {
            case "google":
                url = `https://translate-pa.googleapis.com/v1/supportedLanguages?client=te&display_language=${lang}&key=${key}&callback=callback`
                break
            case "yandex":
                url = `https://translate.yandex.net/api/v1/tr.json/getLangs?srv=tr-url-widget&id=${key}&ui=${lang}`
                break
            case "bing":
                url = `https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation`
        }

        superagent.get(url).end((err, res) => {
            if (err) {
                console.error(err)
                reject()
            }
            if (service == "google") response = eval(res);
            if (service == "bing") response = JSON.parse(res).translation
            if (service == "yandex") response = res._body.langs

            resolve(response)
        })
    });
}

async function getLanguages(service, lang, key = "") {
    const result = await getSupportedLanguages(service, lang, key);

    const langs = {}
    let iteratingObject;

    switch (service) {
        case "google":
            iteratingObject = result.targetLanguages
            break
        case "yandex" || "bing":
            iteratingObject = Object.keys(result)
            break
    }

    for (let key of iteratingObject) {
        if (service == "google") {
            if (lang.split("-")[0] === "fr") {
                key.name = key.name.toLowerCase();
            }

            if (key.language === "iw") {
                key.language = "he";
            } else if (key.language === "jw") {
                key.language = "jv";
            }
            langs[key.language] = key.name;
            if (key.language === "pt") {
                langs["pt-PT"] = key.name;
            }
            if (key.language === "fr") {
                langs["fr-CA"] = key.name;
            }
        }
        if (service == "yandex") {
            if (lang.split("-")[0] === "fr") {
                result[key] = result[key].toLowerCase();
            }
            if (key === "zh") {
                langs["zh-CN"] = result[key];
                langs["zh-TW"] = result[key];
            } else if (key === "fr") {
                langs["fr"] = result[key];
                langs["fr-CA"] = result[key];
            } else if (key === "pt") {
                langs["pt"] = result[key];
                langs["pt-PT"] = result[key];
            } else if (key.indexOf("-") === -1) {
                langs[key] = result[key];
            }
        }

        if (service == "bing") {
            if (lang.split("-")[0] === "fr") {
                result[key].name = result[key].name.toLowerCase();
            }

            let newKey = key;

            switch (key) {
                case "zh-Hans":
                    newKey = "zh-CN";
                    break;
                case "zh-Hant":
                    newKey = "zh-TW";
                    break;
                case "fil":
                    newKey = "tl";
                    break;
                case "mww":
                    newKey = "hmn";
                    break;
                case "ku":
                    newKey = "ckb";
                    break;
                case "kmr":
                    newKey = "ku";
                    break;
                case "nb":
                    newKey = "no";
                    break;
                case "lug":
                    newKey = "lg";
                    break;
                case "mn-Cyrl":
                    newKey = "mn";
                    break;
                case "sr-Cyrl":
                    newKey = "sr";
                    break;
                default:
                    break;
            }

            langs[newKey] = key.name;
        }

    }

    return langs
}

async function init() {
    const lang_codes = [
        "af",
        "ar",
        "bn",
        "ca",
        "cs",
        "da",
        "de",
        "el",
        "en",
        "es",
        "fa",
        "fi",
        "fr",
        "he",
        "hi",
        "hr",
        "hu",
        "is",
        "it",
        "ja",
        "kaa",
        "ko",
        "lv",
        "nl",
        "no",
        "pl",
        "pt-BR",
        "pt-PT",
        "ro",
        "ru",
        "sat",
        "sl",
        "sr",
        "sv",
        "th",
        "tr",
        "ug",
        "uk",
        "vi",
        "zh-CN",
        "zh-TW",
    ];

    if (process.argv[2] == "--google" || process.argv[2] == "--yandex" || process.argv[2] == "--bing") {
        const service = process.argv[2].replace("--", "")
        const langs = {}
        const key = await getKey(service)
        for (const code of lang_codes) {
            langs[code] = await getLanguages(service, service == "yandex" ? code.split("-")[0] : code, key);
        }
        fs.writeFileSync(
            `./out/${service}.json`,
            JSON.stringify(langs, null, service == "google" ? 4 : 2),
            "utf-8"
        );
    }

    if (process.argv[2] == "--info") {
        const langs = {}
        langs.google = JSON.parse(fs.readFileSync("./out/google.json", "utf8"));
        langs.bing = JSON.parse(fs.readFileSync("./out/bing.json", "utf8"));
        langs.yandex = JSON.parse(fs.readFileSync("./out/yandex.json", "utf8"));

        const info = {};

        info.supportedLanguages = {};
        info.supportedLanguages.google = Object.keys(langs.google["en"]);
        info.supportedLanguages.bing = Object.keys(langs.bing["en"]);
        info.supportedLanguages.yandex = Object.keys(langs.yandex["en"]);

        info.supportedCount = {};
        info.supportedCount.google = Object.keys(langs.google["en"]).length;
        info.supportedCount.bing = Object.keys(langs.bing["en"]).length;
        info.supportedCount.yandex = Object.keys(langs.bing["en"]).length;

        info.allSupportedLangs = [];

        Object.keys(info.supportedCount).forEach(key => {
            info.supportedCount[key].forEach(lang => {
                if (key == "google") {
                    info.allSupportedLangs.push(lang)
                } else {
                    info.allSupportedLangs.indexOf(lang) === -1
                        ? info.allSupportedLangs.push(lang)
                        : void 0
                }
            })
        })

        info.allSupportedLangs = info.allSupportedLangs.sort((a, b) =>
            a.localeCompare(b)
        );

        info.totalSupported = info.allSupportedLangs.length;

        info.supportedOnlyBy = {};

        Object.keys(info.supportedLanguages).forEach(key => {
            info.supportedOnlyBy[key] = info.supportedLanguages[key].filter(lang => {
                Object.keys(info.supportedLanguages).forEach(key2 => {
                    return !(key2 != key && info.supportedLanguages[key2].includes(lang));
                })
            })
        })

        Object.keys(info.supportedLanguages).forEach(key => {
            info.supportedOnlyBy["not_" + key] = info.allSupportedLangs.filter((lang) => !info.supportedLanguages[key].includes(lang));
        })

        fs.writeFileSync("./out/info.json", JSON.stringify(info, null, 2), "utf-8");
    }

    if (process.argv[2] === "--final") {
        const langs = {}
        langs.google = JSON.parse(fs.readFileSync("./out/google.json", "utf8"));
        langs.bing = JSON.parse(fs.readFileSync("./out/bing.json", "utf8"));
        langs.yandex = JSON.parse(fs.readFileSync("./out/yandex.json", "utf8"));
        const info = JSON.parse(fs.readFileSync("./out/info.json", "utf8"));

        const final_result = {};

        lang_codes.forEach((ui_lang) => {
            final_result[ui_lang] = {};
            info.allSupportedLangs.forEach((lang) => {
                final_result[ui_lang][lang] =
                    langs.google[ui_lang][lang] ||
                    langs.bing[ui_lang][lang] ||
                    langs.yandex[ui_lang][lang];

                if (lang.split("-")[0] === "fr" || lang.split("-")[0] === "pt") {
                    final_result[ui_lang][lang] = langs.bing[ui_lang][lang];
                }
            });
        });

        fs.writeFileSync(
            "./out/final.json",
            JSON.stringify(final_result, null, 2),
            "utf-8"
        );
    }
}

init()
