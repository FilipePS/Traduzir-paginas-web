// Yandex only languages ba, cv, mrj, kazlat, mhr, pap, udm, sah, uzbcyr

var structuredClone = require("realistic-structured-clone");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var DomParser = require("dom-parser");
const fs = require("fs");

if (!fs.existsSync("./out")) {
  fs.mkdirSync("out");
}

function getKey() {
  function getURL() {
    return new Promise(async (resolve, reject) => {
      const xhttp = new XMLHttpRequest();
      xhttp.onload = (e) => {
        let key;
        try {
          const startIdx = xhttp.responseText.indexOf("_loadJs(");
          if (startIdx === -1) {
            throw new Error("");
          }
          const endIdx = xhttp.responseText.indexOf(");", startIdx);
          if (endIdx === -1) {
            throw new Error("");
          }
          resolve(
            eval(xhttp.responseText.slice(startIdx + "_loadJs(".length, endIdx))
          );
        } catch (e) {
          console.error(e);
          reject(e);
        }
        resolve(key);
      };
      xhttp.onerror = (e) => {
        console.error(e);
        reject(e);
      };

      xhttp.open(
        "GET",
        "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit",
        true
      );
      xhttp.send();
    });
  }

  return new Promise(async (resolve, reject) => {
    const xhttp = new XMLHttpRequest();
    xhttp.onload = (e) => {
      let key;
      try {
        key = xhttp.responseText.match(/(key:")(\w+)/)[2];
      } catch (e) {
        console.error(e);
        reject(e);
      }
      resolve(key);
    };
    xhttp.onerror = (e) => {
      console.error(e);
      reject(e);
    };

    xhttp.open("GET", await getURL(), true);
    xhttp.send();
  });
}

function getSupportedLanguagesFrom(key, lang) {
  return new Promise((resolve, reject) => {
    const xhttp = new XMLHttpRequest();
    xhttp.onload = (e) => {
      let key;
      try {
        function callback(langs) {
          resolve(langs);
        }
        eval(xhttp.responseText);
      } catch (e) {
        console.error(e);
        reject(e);
      }
      resolve(key);
    };
    xhttp.onerror = (e) => {
      console.error(e);
      reject(e);
    };
    xhttp.open(
      "GET",
      `https://translate-pa.googleapis.com/v1/supportedLanguages?client=te&display_language=${lang}&key=${key}&callback=callback`,
      true
    );
    xhttp.send();
  });
}

async function getLangsFrom(key, lang) {
  const result = await getSupportedLanguagesFrom(key, lang);

  const langs = {};

  result.targetLanguages.forEach((tl) => {
    if (lang === "fr") {
      tl.name = tl.name.toLowerCase();
    }
    if (tl.language === "iw") {
      tl.language = "he";
    } else if (tl.language === "jw") {
      tl.language = "jv";
    }
    langs[tl.language] = tl.name;
  });

  return langs;
}

async function getYandexLangs(lang) {
  return await new Promise((resolve, reject) => {
    const xhttp = new XMLHttpRequest();
    xhttp.onload = (e) => {
      const langs = { en: {} };
      try {
        var parser = new DomParser();
        var dom = parser.parseFromString(xhttp.responseText);
        Array.from(dom.getElementsByClassName("yt-listbox__label")).forEach(
          (node) => {
            let language = node.childNodes[0].getAttribute("value");
            langs["en"][language] = node.childNodes[1].textContent;
          }
        );
      } catch (e) {
        console.error(e);
        reject(e);
      }
      resolve(langs);
    };
    xhttp.onerror = (e) => {
      console.error(e);
      reject(e);
    };
    xhttp.open(
      "GET",
      "https://translate.yandex.net/website-widget/v1/widget.html",
      true
    );
    xhttp.send();
  });
}

async function init() {
  const key = await getKey();

  const lang_codes = [
    "af",
    "ar",
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
    "ko",
    "lv",
    "nl",
    "no",
    "pl",
    "pt-BR",
    "pt-PT",
    "ro",
    "ru",
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

  /*
  const google_langs = {};

  for (const code of lang_codes) {
    const langs = await getLangsFrom(key, code);
    google_langs[code] = langs;
  }
  console.log(google_langs);
  fs.writeFileSync(
    "./out/google.json",
    JSON.stringify(google_langs, null, 4),
    "utf-8"
  );
  //*/
  const google_langs = JSON.parse(fs.readFileSync("./out/google.json", "utf8"));

  // yandex

  /*
  const yandex_langs = await getYandexLangs();
  console.log(yandex_langs);
  fs.writeFileSync(
    "./out/yandex.json",
    JSON.stringify(yandex_langs, null, 4),
    "utf-8"
  );
  //*/
  const yandex_langs = JSON.parse(fs.readFileSync("./out/yandex.json", "utf8"));

  const final_result = structuredClone(google_langs);
  const glangs = Object.keys(google_langs["en"]);
  const yandex_only = Object.keys(yandex_langs["en"]).filter((x) =>
    !glangs.includes(x) ? x : undefined
  );
  console.log(yandex_only);

  for (const lc of lang_codes) {
    for (const code of yandex_only) {
      if (code == "zh") continue;
      if (code == "pt-BR") continue;
      if (code == "sjn") continue;
      if (code == "emj") continue;
      const lc_s = lc.split("-")[0];
      if (lc === "fr") {
        final_result[lc][code] = yandex_langs[lc_s]
          ? yandex_langs[lc_s][code].toLowerCase()
          : yandex_langs["en"][code].toLowerCase();
      } else {
        final_result[lc][code] = yandex_langs[lc_s]
          ? yandex_langs[lc_s][code]
          : yandex_langs["en"][code];
      }
    }
  }

  fs.writeFileSync(
    "./out/final.json",
    JSON.stringify(final_result, null, 4),
    "utf-8"
  );
}

init();
