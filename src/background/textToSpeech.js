"use strict";

const textToSpeech = (function () {
  const textToSpeech = {};

  class BingHelper {
    /** @type {number} */
    static #lastRequestTime = null;
    /** @type {string} */
    static #IG = null;
    /** @type {string} */
    static #IID = null;
    /** @type {number} */
    static #key = null;
    /** @type {string} */
    static #token = null;
    /** @type {boolean} */
    static #notFound = false;
    /** @type {Promise<void>} */
    static #promise = null;

    static get IG() {
      return BingHelper.#IG;
    }
    static get IID() {
      return BingHelper.#IID;
    }
    static get key() {
      return BingHelper.#key;
    }
    static get token() {
      return BingHelper.#token;
    }

    /**
     * Find the SID (IID and IG) of Bing Translator. The SID value is used in translation requests.
     * @returns {Promise<void>}
     */
    static async findAuth() {
      if (BingHelper.#promise) return await BingHelper.#promise;

      BingHelper.#promise = new Promise((resolve) => {
        let updateBingAuth = false;
        if (BingHelper.#lastRequestTime) {
          const date = new Date();
          if (BingHelper.#IG) {
            date.setMinutes(date.getMinutes() - 30);
          } else if (BingHelper.#notFound) {
            date.setMinutes(date.getMinutes() - 5);
          } else {
            date.setMinutes(date.getMinutes() - 2);
          }
          if (date.getTime() > BingHelper.#lastRequestTime) {
            updateBingAuth = true;
          }
        } else {
          updateBingAuth = true;
        }

        if (updateBingAuth) {
          BingHelper.#lastRequestTime = Date.now();

          const http = new XMLHttpRequest();
          http.open("GET", "https://www.bing.com/translator");
          http.send();
          http.onload = (e) => {
            try {
              if (!(http.responseText && http.responseText.length > 1)) {
                throw new Error("Not found");
              }

              const responseText = http.responseText;
              const IG = responseText.match(/IG:"([^"]+)"/)[1];
              const IID = responseText.match(/data\-iid\="([^"]+)"/)[1];

              const abhStartText = "params_AbusePreventionHelper = [";
              const abhStartIndex = responseText.indexOf(abhStartText);
              if (abhStartIndex === -1) {
                throw new Error("Not found 2");
              }
              const abhEndIndex = responseText.indexOf("]", abhStartIndex);
              if (abhEndIndex === -1) {
                throw new Error("Not found 3");
              }
              const abhText = responseText.slice(
                abhStartIndex + abhStartText.length - 1,
                abhEndIndex + 1
              );
              const abh = JSON.parse(abhText);
              const key = abh[0];
              const token = abh[1];

              BingHelper.#IG = IG;
              BingHelper.#IID = IID;
              BingHelper.#key = key;
              BingHelper.#token = token;
              BingHelper.#notFound = false;
            } catch (e) {
              BingHelper.#notFound = true;
            } finally {
              resolve();
            }
          };
          http.onerror =
            http.onabort =
            http.ontimeout =
              (e) => {
                console.error(e);
                resolve();
              };
        } else {
          resolve();
        }
      });

      BingHelper.#promise.finally(() => {
        BingHelper.#promise = null;
      });

      return await BingHelper.#promise;
    }

    /**
     * @typedef {Object} LanguageData
     * @property {String} language
     * @property {String} locale
     * @property {String} gender
     * @property {String} voice
     */

    /**
     * Get the language data for the language.
     * @param {string} language
     * @returns {LanguageData} languageData
     */
    static getLanguageData(language) {
      /** @type {{search: string, replace: string}[]} */
      // prettier-ignore
      const replacements = [
        { search: "zh-CN", replace: "zh-Hans", },
        { search: "zh-TW", replace: "zh-Hant", },
        { search: "tl", replace: "fil", },
        { search: "hmn", replace: "mww", },
        { search: "ku", replace: "kmr", },
        { search: "ckb", replace: "ku", },
        { search: "mn", replace: "mn-Cyrl", },
        { search: "no", replace: "nb", },
        { search: "lg", replace: "lug", },
        { search: "sr", replace: "sr-Cyrl", },
      ];
      replacements.forEach((r) => {
        if (language === r.search) {
          language = r.replace;
        }
      });

      // prettier-ignore
      const languageData = [
        { language: 'af', locale: 'af-ZA', gender: 'Female', voice: 'af-ZA-AdriNeural' },
        { language: 'am', locale: 'am-ET', gender: 'Female', voice: 'am-ET-MekdesNeural' },
        { language: 'ar', locale: 'ar-SA', gender: 'Male', voice: 'ar-SA-HamedNeural' },
        { language: 'bn', locale: 'bn-IN', gender: 'Female', voice: 'bn-IN-TanishaaNeural' },
        { language: 'bg', locale: 'bg-BG', gender: 'Male', voice: 'bg-BG-BorislavNeural' },
        { language: 'ca', locale: 'ca-ES', gender: 'Female', voice: 'ca-ES-JoanaNeural' },
        { language: 'cs', locale: 'cs-CZ', gender: 'Male', voice: 'cs-CZ-AntoninNeural' },
        { language: 'cy', locale: 'cy-GB', gender: 'Female', voice: 'cy-GB-NiaNeural' },
        { language: 'da', locale: 'da-DK', gender: 'Female', voice: 'da-DK-ChristelNeural' },
        { language: 'de', locale: 'de-DE', gender: 'Female', voice: 'de-DE-KatjaNeural' },
        { language: 'el', locale: 'el-GR', gender: 'Male', voice: 'el-GR-NestorasNeural' },
        { language: 'en', locale: 'en-US', gender: 'Female', voice: 'en-US-AriaNeural' },
        { language: 'es', locale: 'es-ES', gender: 'Female', voice: 'es-ES-ElviraNeural' },
        { language: 'et', locale: 'et-EE', gender: 'Female', voice: 'et-EE-AnuNeural' },
        { language: 'fa', locale: 'fa-IR', gender: 'Female', voice: 'fa-IR-DilaraNeural' },
        { language: 'fi', locale: 'fi-FI', gender: 'Female', voice: 'fi-FI-NooraNeural' },
        { language: 'fr', locale: 'fr-FR', gender: 'Female', voice: 'fr-FR-DeniseNeural' },
        { language: 'fr-CA', locale: 'fr-CA', gender: 'Female', voice: 'fr-CA-SylvieNeural' },
        { language: 'ga', locale: 'ga-IE', gender: 'Female', voice: 'ga-IE-OrlaNeural' },
        { language: 'gu', locale: 'gu-IN', gender: 'Female', voice: 'gu-IN-DhwaniNeural' },
        { language: 'he', locale: 'he-IL', gender: 'Male', voice: 'he-IL-AvriNeural' },
        { language: 'hi', locale: 'hi-IN', gender: 'Female', voice: 'hi-IN-SwaraNeural' },
        { language: 'hr', locale: 'hr-HR', gender: 'Male', voice: 'hr-HR-SreckoNeural' },
        { language: 'hu', locale: 'hu-HU', gender: 'Male', voice: 'hu-HU-TamasNeural' },
        { language: 'id', locale: 'id-ID', gender: 'Male', voice: 'id-ID-ArdiNeural' },
        { language: 'is', locale: 'is-IS', gender: 'Female', voice: 'is-IS-GudrunNeural' },
        { language: 'it', locale: 'it-IT', gender: 'Male', voice: 'it-IT-DiegoNeural' },
        { language: 'ja', locale: 'ja-JP', gender: 'Female', voice: 'ja-JP-NanamiNeural' },
        { language: 'kk', locale: 'kk-KZ', gender: 'Female', voice: 'kk-KZ-AigulNeural' },
        { language: 'km', locale: 'km-KH', gender: 'Female', voice: 'km-KH-SreymomNeural' },
        { language: 'kn', locale: 'kn-IN', gender: 'Female', voice: 'kn-IN-SapnaNeural' },
        { language: 'ko', locale: 'ko-KR', gender: 'Female', voice: 'ko-KR-SunHiNeural' },
        { language: 'lo', locale: 'lo-LA', gender: 'Female', voice: 'lo-LA-KeomanyNeural' },
        { language: 'lv', locale: 'lv-LV', gender: 'Female', voice: 'lv-LV-EveritaNeural' },
        { language: 'lt', locale: 'lt-LT', gender: 'Female', voice: 'lt-LT-OnaNeural' },
        { language: 'mk', locale: 'mk-MK', gender: 'Female', voice: 'mk-MK-MarijaNeural' },
        { language: 'ml', locale: 'ml-IN', gender: 'Female', voice: 'ml-IN-SobhanaNeural' },
        { language: 'mr', locale: 'mr-IN', gender: 'Female', voice: 'mr-IN-AarohiNeural' },
        { language: 'ms', locale: 'ms-MY', gender: 'Male', voice: 'ms-MY-OsmanNeural' },
        { language: 'mt', locale: 'mt-MT', gender: 'Female', voice: 'mt-MT-GraceNeural' },
        { language: 'my', locale: 'my-MM', gender: 'Female', voice: 'my-MM-NilarNeural' },
        { language: 'nl', locale: 'nl-NL', gender: 'Female', voice: 'nl-NL-ColetteNeural' },
        { language: 'nb', locale: 'nb-NO', gender: 'Female', voice: 'nb-NO-PernilleNeural' },
        { language: 'pl', locale: 'pl-PL', gender: 'Female', voice: 'pl-PL-ZofiaNeural' },
        { language: 'ps', locale: 'ps-AF', gender: 'Female', voice: 'ps-AF-LatifaNeural' },
        { language: 'pt', locale: 'pt-BR', gender: 'Female', voice: 'pt-BR-FranciscaNeural' },
        { language: 'pt-PT', locale: 'pt-PT', gender: 'Female', voice: 'pt-PT-FernandaNeural' },
        { language: 'ro', locale: 'ro-RO', gender: 'Male', voice: 'ro-RO-EmilNeural' },
        { language: 'ru', locale: 'ru-RU', gender: 'Female', voice: 'ru-RU-DariyaNeural' },
        { language: 'sk', locale: 'sk-SK', gender: 'Male', voice: 'sk-SK-LukasNeural' },
        { language: 'sl', locale: 'sl-SI', gender: 'Male', voice: 'sl-SI-RokNeural' },
        { language: 'sr-Cyrl', locale: 'sr-RS', gender: 'Female', voice: 'sr-RS-SophieNeural' },
        { language: 'sv', locale: 'sv-SE', gender: 'Female', voice: 'sv-SE-SofieNeural' },
        { language: 'ta', locale: 'ta-IN', gender: 'Female', voice: 'ta-IN-PallaviNeural' },
        { language: 'te', locale: 'te-IN', gender: 'Male', voice: 'te-IN-ShrutiNeural' },
        { language: 'th', locale: 'th-TH', gender: 'Male', voice: 'th-TH-NiwatNeural' },
        { language: 'tr', locale: 'tr-TR', gender: 'Female', voice: 'tr-TR-EmelNeural' },
        { language: 'uk', locale: 'uk-UA', gender: 'Female', voice: 'uk-UA-PolinaNeural' },
        { language: 'ur', locale: 'ur-IN', gender: 'Female', voice: 'ur-IN-GulNeural' },
        { language: 'uz', locale: 'uz-UZ', gender: 'Female', voice: 'uz-UZ-MadinaNeural' },
        { language: 'vi', locale: 'vi-VN', gender: 'Male', voice: 'vi-VN-NamMinhNeural' },
        { language: 'zh-Hans', locale: 'zh-CN', gender: 'Female', voice: 'zh-CN-XiaoxiaoNeural' },
        { language: 'zh-Hant', locale: 'zh-CN', gender: 'Female', voice: 'zh-CN-XiaoxiaoNeural' },
        { language: 'yue', locale: 'zh-HK', gender: 'Female', voice: 'zh-HK-HiuGaaiNeural' }
      ];

      const data = languageData.find((data) => data.language === language);
      return data;
    }
  }

  /**
   * @callback Callback_Speech_cbGetExtraParameters
   * @param {string} text
   * @param {string} targetLanguage
   * @return {string} urlParamsString
   */

  /**
   * @callback Callback_Speech_cbGetRequestBody
   * @param {string} text
   * @param {string} targetLanguage
   * @return {string} requestBody
   */

  class Service {
    /**
     * Defines the Service class for the text-to-speech service.
     * @param {string} serviceName
     * @param {string} baseURL
     * @param {"GET" | "POST"} xhrMethod
     * @param {Callback_Speech_cbGetExtraParameters} cbGetExtraParameters
     * @param {Callback_Speech_cbGetRequestBody} cbGetRequestBody
     */
    constructor(
      serviceName,
      baseURL,
      xhrMethod,
      cbGetExtraParameters,
      cbGetRequestBody = null
    ) {
      this.serviceName = serviceName;
      this.baseURL = baseURL;
      this.xhrMethod = xhrMethod;
      this.cbGetExtraParameters = cbGetExtraParameters;
      this.cbGetRequestBody = cbGetRequestBody;

      /** @type {Map<string, HTMLAudioElement>} */
      this.audios = new Map();
      this.audioSpeed = 1.0;
    }

    /**
     * Takes a long text and splits the text into an array of strings. Each string will be less than 170 characters.
     *
     * The goal is not to exceed the quota for text-to-speech services.
     * @param {string} fullText
     * @returns {string[]} requestStrings
     */
    getRequests(fullText) {
      /** @type {string[]} */
      const fullTextSplitted = [];
      fullText
        .trim()
        .split(" ")
        .forEach((word) => {
          if (word.length > 160) {
            while (word.length > 160) {
              fullTextSplitted.push(word.slice(0, 160));
              word = word.slice(160);
            }
            if (word.trim().length > 0) {
              fullTextSplitted.push(word);
            }
          } else if (word.trim().length > 0) {
            fullTextSplitted.push(word);
          }
        });

      /** @type {string[]} */
      const requests = [];
      let requestString = "";
      for (let text of fullTextSplitted) {
        text += " ";
        if (requestString.length + text.length < 170) {
          requestString += text;
        } else {
          requests.push(requestString);
          requestString = text;
        }
      }
      if (requestString.trim().length > 0) {
        requests.push(requestString);
        requestString = "";
      }

      return requests;
    }

    /**
     * Makes the request to the text-to-speech service and returns a promise that resolves with the result of the request.
     *
     * The promise is rejected if there is an error.
     * @param {string} text
     * @param {string} targetLanguage
     * @returns {Promise<any>} Promise\<blob\>
     */
    async makeRequest(text, targetLanguage) {
      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = (e) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => reject();
          reader.readAsDataURL(xhr.response);
        };
        xhr.onerror = (e) => {
          console.error(e);
          reject();
        };
        xhr.open(
          this.xhrMethod,
          this.baseURL + this.cbGetExtraParameters(text, targetLanguage)
        );
        xhr.responseType = "blob";
        if (this.cbGetRequestBody) {
          xhr.setRequestHeader(
            "Content-Type",
            "application/x-www-form-urlencoded"
          );
          xhr.send(this.cbGetRequestBody(text, targetLanguage));
        } else {
          xhr.send();
        }
      });
    }

    /**
     * Transform text into audio and play then.
     * @param {string} fullText
     * @param {string} targetLanguage
     * @returns {Promise<void>} Promise\<void\>
     */
    async textToSpeech(fullText, targetLanguage) {
      if (this.serviceName === "bing") {
        await BingHelper.findAuth();
      }

      const requests = this.getRequests(fullText);
      const promises = [];

      for (const requestText of requests) {
        const audioKey = [targetLanguage, requestText].join(", ");
        if (!this.audios.get(audioKey)) {
          promises.push(
            this.makeRequest(requestText, targetLanguage)
              .then(
                /** @type {string} */ (response) => {
                  this.audios.set(audioKey, new Audio(response));
                  return response;
                }
              )
              .catch((e) => {
                console.error(e);
                return null;
              })
          );
        }
      }

      await Promise.all(promises);
      return await this.play(
        requests.map((text) =>
          this.audios.get([targetLanguage, text].join(", "))
        )
      );
    }

    /**
     * Play the audio or all the audio in the array.
     * @param {HTMLAudioElement | HTMLAudioElement[]} audios
     */
    async play(audios) {
      this.stopAll();
      return await new Promise((resolve) => {
        try {
          if (audios instanceof Array) {
            const playAll = (/** @type {number} */ currentIndex) => {
              this.stopAll();
              const audio = audios[currentIndex];
              if (audio) {
                audio.playbackRate = this.audioSpeed;
                audio.play();
                audio.onended = () => {
                  playAll(currentIndex + 1);
                };
              } else {
                resolve();
              }
            };
            playAll(0);
          } else if (audios instanceof HTMLAudioElement) {
            audios.playbackRate = this.audioSpeed;
            audios.play();
            audios.onended = () => {
              resolve();
            };
          }
        } catch (e) {
          console.error(e);
          resolve();
        }
      });
    }

    /**
     * Sets the audio speed
     * @param {number} speed
     */
    setAudioSpeed(speed) {
      this.audioSpeed = speed;
      this.audios.forEach((audio) => {
        audio.playbackRate = this.audioSpeed;
      });
    }

    /**
     * Pause all audio and reset audio time to start
     */
    stopAll() {
      this.audios.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    }
  }

  // Create a Service instance based on google's text-to-speech service.
  const googleService = new Service(
    "google",
    "https://translate.google.com/translate_tts?ie=UTF-8",
    "GET",
    function getExtraParameters(text, targetLanguage) {
      return `&tl=${targetLanguage}&client=dict-chrome-ex&ttsspeed=0.5&q=${encodeURIComponent(
        text
      )}`;
    }
  );

  // Create a Service instance based on bings's text-to-speech service.
  const bingService = new Service(
    "bing",
    "https://www.bing.com/tfettts?isVertical=1",
    "POST",
    function getExtraParameters(text, targetLanguage) {
      return `&&IG=${encodeURIComponent(
        BingHelper.IG
      )}&IID=${encodeURIComponent(BingHelper.IID)}.${"1"}`;
    },
    function getRequestBody(text, targetLanguage) {
      const languageData = BingHelper.getLanguageData(targetLanguage);

      const domParser = new DOMParser();
      const doc = domParser.parseFromString(
        `<speak version='1.0' xml:lang=''><voice xml:lang='' xml:gender='' name=''><prosody rate='-20.00%'></prosody></voice></speak>`,
        "text/xml"
      );
      doc.querySelector("speak").setAttribute("xml:lang", languageData.locale);
      doc.querySelector("voice").setAttribute("xml:lang", languageData.locale);
      doc
        .querySelector("voice")
        .setAttribute("xml:gender", languageData.gender);
      doc.querySelector("voice").setAttribute("xml:name", languageData.voice);
      doc.querySelector("prosody").textContent = text;

      const params = new URLSearchParams();
      params.append("ssml", new XMLSerializer().serializeToString(doc));
      params.append("token", BingHelper.token);
      params.append("key", BingHelper.key.toString());
      return params.toString();
    }
  );

  // Listen for messages coming from contentScript or other scripts.
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "textToSpeech") {
      if (twpConfig.get("textToSpeechService") === "bing") {
        bingService
          .textToSpeech(request.text, request.targetLanguage)
          .finally(() => {
            sendResponse();
          });
      } else {
        googleService
          .textToSpeech(request.text, request.targetLanguage)
          .finally(() => {
            sendResponse();
          });
      }

      return true;
    } else if (request.action === "stopAudio") {
      googleService.stopAll();
      bingService.stopAll();
    }
  });

  // Listen for changes to the audio speed setting and apply it immediately.
  twpConfig.onReady(async () => {
    twpConfig.onChanged((name, newvalue) => {
      if (name === "ttsSpeed") {
        googleService.setAudioSpeed(newvalue);
        bingService.setAudioSpeed(newvalue);
      }
    });
  });

  textToSpeech.google = googleService;

  return textToSpeech;
})();
