// Yandex only languages ba, cv, mrj, kazlat, mhr, pap, udm, sah, uzbcyr

var structuredClone = require("realistic-structured-clone");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var DomParser = require("dom-parser");
const fs = require("fs");
const https = require("https");
const superagent = require("superagent");
require("superagent-proxy")(superagent);

if (!fs.existsSync("./out")) {
  fs.mkdirSync("out");
}

async function getGoogleKey() {
  async function getURL() {
    return await new Promise(async (resolve, reject) => {
      const http = new XMLHttpRequest();
      http.onload = (e) => {
        let key;
        try {
          const startIdx = http.responseText.indexOf("_loadJs(");
          if (startIdx === -1) {
            throw new Error("");
          }
          const endIdx = http.responseText.indexOf(");", startIdx);
          if (endIdx === -1) {
            throw new Error("");
          }
          resolve(
            eval(http.responseText.slice(startIdx + "_loadJs(".length, endIdx))
          );
        } catch (e) {
          console.error(e);
          reject(e);
        }
        resolve(key);
      };
      http.onerror = (e) => {
        console.error(e);
        reject(e);
      };

      http.open(
        "GET",
        "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit",
        true
      );
      http.send();
    });
  }

  return await new Promise(async (resolve, reject) => {
    const http = new XMLHttpRequest();
    http.onload = (e) => {
      let key;
      try {
        key = http.responseText.match(/(key:")(\w+)/)[2];
      } catch (e) {
        console.error(e);
        reject(e);
      }
      resolve(key);
    };
    http.onerror = (e) => {
      console.error(e);
      reject(e);
    };

    http.open("GET", await getURL(), true);
    http.send();
  });
}

async function getGoogleSupportedLanguages(key, lang) {
  return await new Promise((resolve, reject) => {
    const http = new XMLHttpRequest();
    http.onload = (e) => {
      let key;
      try {
        function callback(langs) {
          resolve(langs);
        }
        eval(http.responseText);
      } catch (e) {
        console.error(e);
        reject(e);
      }
      resolve(key);
    };
    http.onerror = (e) => {
      console.error(e);
      reject(e);
    };
    http.open(
      "GET",
      `https://translate-pa.googleapis.com/v1/supportedLanguages?client=te&display_language=${lang}&key=${key}&callback=callback`,
      true
    );
    http.send();
  });
}

async function getGoogleLangs(key, lang) {
  const result = await getGoogleSupportedLanguages(key, lang);

  const langs = {};

  result.targetLanguages.forEach((tl) => {
    if (lang.split("-")[0] === "fr") {
      tl.name = tl.name.toLowerCase();
    }
    if (tl.language === "iw") {
      tl.language = "he";
    } else if (tl.language === "jw") {
      tl.language = "jv";
    }
    langs[tl.language] = tl.name;
    if (tl.language === "pt") {
      langs["pt-PT"] = tl.name;
    }
    if (tl.language === "fr") {
      langs["fr-CA"] = tl.name;
    }
  });

  return langs;
}

async function getBingSupportedLanguages(lang) {
  return await new Promise((resolve, reject) => {
    const http = new XMLHttpRequest();
    http.onload = (e) => {
      let key;
      try {
        resolve(JSON.parse(http.responseText).translation);
      } catch (e) {
        console.error(e);
        reject(e);
      }
      resolve(key);
    };
    http.onerror = (e) => {
      console.error(e);
      reject(e);
    };
    http.open(
      "GET",
      `https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation`,
      true
    );
    http.setRequestHeader("Accept-Language", lang);
    http.send();
  });
}

async function getBingLangs(lang) {
  const result = await getBingSupportedLanguages(lang);

  const langs = {};

  Object.keys(result).forEach((key) => {
    if (lang.split("-")[0] === "fr") {
      result[key].name = result[key].name.toLowerCase();
    }
    let newKey = key;
    if (key === "zh-Hans") {
      newKey = "zh-CN";
    } else if (key === "zh-Hant") {
      newKey = "zh-TW";
    } else if (key === "fil") {
      newKey = "tl";
    } else if (key === "mww") {
      newKey = "hmn";
    } else if (key === "ku") {
      newKey = "ckb";
    } else if (key === "kmr") {
      newKey = "ku";
    } else if (key === "nb") {
      newKey = "no";
    } else if (key === "lug") {
      newKey = "lg";
    } else if (key === "mn-Cyrl") {
      newKey = "mn";
    } else if (key === "sr-Cyrl") {
      newKey = "sr";
    }
    langs[newKey] = result[key].name;
  });

  return langs;
}

async function getYandexKey() {
  return await new Promise(async (resolve, reject) => {
    const http = new XMLHttpRequest();
    http.onload = (e) => {
      let key;
      try {
        key = http.responseText.match(/sid\:\s\'[0-9a-f\.]+/)[0].substring(6);
      } catch (e) {
        console.error(e);
        reject(e);
      }
      resolve(key);
    };
    http.onerror = (e) => {
      console.error(e);
      reject(e);
    };

    http.open(
      "GET",
      "https://translate.yandex.net/website-widget/v1/widget.js?widgetId=ytWidget&pageLang=es&widgetTheme=light&autoMode=false",
      true
    );
    http.send();
  });
}

async function getYandexSupportedLanguages(key, lang) {
  return await new Promise((resolve, reject) => {
    // var options = {
    //   hostname: "translate.yandex.net",
    //   port: 443,
    //   path: `/api/v1/tr.json/getLangs?srv=tr-url-widget&id=${key}&ui=${"en"}`,
    //   method: "GET",
    //   headers: {
    //     "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
    //     "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    //     "Accept-Language": "en-US,pt-BR;q=0.7,en;q=0.3",
    //     "Accept-Encoding": "gzip, deflate, br",
    //     "Connection": "keep-alive",
    //     "Upgrade-Insecure-Requests": "1",
    //     "Sec-Fetch-Dest": "document",
    //     "Sec-Fetch-Mode": "navigate",
    //     "Sec-Fetch-Site": "none",
    //     "Sec-Fetch-User": "?1",
    //   },
    // };
    superagent
      .get(
        `http://translate.yandex.net/api/v1/tr.json/getLangs?srv=tr-url-widget&id=${key}&ui=${lang}`
      )
      //.proxy("http://127.0.0.1:8888")
      .end(function (err, res) {
        if (err) return reject(err);
        resolve(res._body.langs);
      });
  });
}

async function getYandexLangs(key, lang) {
  lang = lang.split("-")[0];
  const result = await getYandexSupportedLanguages(key, lang);
  const langs = {};
  Object.keys(result).forEach((key) => {
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
  });
  return langs;
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

  // google
  if (process.argv[2] === "--google") {
    const google_langs = {};
    const googleKey = await getGoogleKey();
    for (const code of lang_codes) {
      const langs = await getGoogleLangs(googleKey, code);
      google_langs[code] = langs;
    }
    fs.writeFileSync(
      "./out/google.json",
      JSON.stringify(google_langs, null, 4),
      "utf-8"
    );
  }

  // bing
  if (process.argv[2] === "--bing") {
    const bing_langs = {};
    for (const code of lang_codes) {
      const langs = await getBingLangs(code);
      bing_langs[code] = langs;
    }
    fs.writeFileSync(
      "./out/bing.json",
      JSON.stringify(bing_langs, null, 2),
      "utf-8"
    );
  }

  // yandex
  if (process.argv[2] === "--yandex") {
    const yandex_langs = {};
    const yandexKey = await getYandexKey();
    for (const code of lang_codes) {
      const langs = await getYandexLangs(yandexKey, code);
      yandex_langs[code] = langs;
    }
    fs.writeFileSync(
      "./out/yandex.json",
      JSON.stringify(yandex_langs, null, 2),
      "utf-8"
    );
  }

  // info
  if (process.argv[2] === "--info") {
    const google_langs = JSON.parse(
      fs.readFileSync("./out/google.json", "utf8")
    );
    const bing_langs = JSON.parse(fs.readFileSync("./out/bing.json", "utf8"));
    const yandex_langs = JSON.parse(
      fs.readFileSync("./out/yandex.json", "utf8")
    );

    /* prettier-ignore */
    const deepl_langs = []
    /* prettier-ignore */
    const libre_langs = ["ar", "az", "ca", "cs", "da", "de", "el", "en", "eo", "es", "fa", "fi", "fr", "ga", "he", "hi", "hu", "id", "it", "ja", "ko", "nl", "pl", "pt", "ru", "sk", "sv", "tr", "uk", "zh"]

    const info = {};

    info.supportedLanguages = {};
    info.supportedLanguages.google = Object.keys(google_langs["en"]);
    info.supportedLanguages.bing = Object.keys(bing_langs["en"]);
    info.supportedLanguages.yandex = Object.keys(yandex_langs["en"]);

    info.supportedCount = {};
    info.supportedCount.google = Object.keys(google_langs["en"]).length;
    info.supportedCount.bing = Object.keys(bing_langs["en"]).length;
    info.supportedCount.yandex = Object.keys(yandex_langs["en"]).length;

    info.allSupportedLangs = [];
    info.supportedLanguages.google.forEach((lang) =>
      info.allSupportedLangs.push(lang)
    );
    info.supportedLanguages.bing.forEach((lang) =>
      info.allSupportedLangs.indexOf(lang) === -1
        ? info.allSupportedLangs.push(lang)
        : void 0
    );
    info.supportedLanguages.yandex.forEach((lang) =>
      info.allSupportedLangs.indexOf(lang) === -1
        ? info.allSupportedLangs.push(lang)
        : void 0
    );
    info.allSupportedLangs = info.allSupportedLangs.sort((a, b) =>
      a.localeCompare(b)
    );

    info.totalSupported = info.allSupportedLangs.length;

    info.supportedOnlyBy = {};
    info.supportedOnlyBy.google = info.supportedLanguages.google.filter(
      (lang) => {
        if (info.supportedLanguages.bing.includes(lang)) {
          return false;
        }
        if (info.supportedLanguages.yandex.includes(lang)) {
          return false;
        }
        return true;
      }
    );
    info.supportedOnlyBy.bing = info.supportedLanguages.bing.filter((lang) => {
      if (info.supportedLanguages.google.includes(lang)) {
        return false;
      }
      if (info.supportedLanguages.yandex.includes(lang)) {
        return false;
      }
      return true;
    });
    info.supportedOnlyBy.yandex = info.supportedLanguages.yandex.filter(
      (lang) => {
        if (info.supportedLanguages.google.includes(lang)) {
          return false;
        }
        if (info.supportedLanguages.bing.includes(lang)) {
          return false;
        }
        return true;
      }
    );

    info.supportedOnlyBy.not_google = info.allSupportedLangs.filter(
      (lang) => !info.supportedLanguages.google.includes(lang)
    );
    info.supportedOnlyBy.not_bing = info.allSupportedLangs.filter(
      (lang) => !info.supportedLanguages.bing.includes(lang)
    );
    info.supportedOnlyBy.not_yandex = info.allSupportedLangs.filter(
      (lang) => !info.supportedLanguages.yandex.includes(lang)
    );

    fs.writeFileSync("./out/info.json", JSON.stringify(info, null, 2), "utf-8");
  }

  if (process.argv[2] === "--final") {
    const google_langs = JSON.parse(
      fs.readFileSync("./out/google.json", "utf8")
    );
    const bing_langs = JSON.parse(fs.readFileSync("./out/bing.json", "utf8"));
    const yandex_langs = JSON.parse(
      fs.readFileSync("./out/yandex.json", "utf8")
    );
    const info = JSON.parse(fs.readFileSync("./out/info.json", "utf8"));

    const final_result = {};

    info.allSupportedLangs.forEach((lang) => {});

    lang_codes.forEach((ui_lang) => {
      console.log(ui_lang);
      final_result[ui_lang] = {};
      info.allSupportedLangs.forEach((lang) => {
        final_result[ui_lang][lang] =
          google_langs[ui_lang][lang] ||
          bing_langs[ui_lang][lang] ||
          yandex_langs[ui_lang][lang];

        if (lang.split("-")[0] === "fr" || lang.split("-")[0] === "pt") {
          final_result[ui_lang][lang] = bing_langs[ui_lang][lang];
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

init();
