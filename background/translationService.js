"use strict";

const translationService = (function () {
  const translationService = {};

  class Utils {
    /**
     *
     * @param {string} unsafe
     * @returns {string}
     */
    static escapeHTML(unsafe) {
      return unsafe
        .replace(/\&/g, "&amp;")
        .replace(/\</g, "&lt;")
        .replace(/\>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/\'/g, "&#39;");
    }

    /**
     *
     * @param {string} unsafe
     * @returns {string}
     */
    static unescapeHTML(unsafe) {
      return unsafe
        .replace(/\&amp;/g, "&")
        .replace(/\&lt;/g, "<")
        .replace(/\&gt;/g, ">")
        .replace(/\&quot;/g, '"')
        .replace(/\&\#39;/g, "'");
    }
  }

  class GoogleHelper {
    static get googleTranslateTKK() {
      return "448487.932609646";
    }

    /**
     *
     * @param {number} num
     * @param {string} optString
     * @returns {number}
     */
    static shiftLeftOrRightThenSumOrXor(num, optString) {
      for (let i = 0; i < optString.length - 2; i += 3) {
        /** @type {string|number} */
        let acc = optString.charAt(i + 2);
        if ("a" <= acc) {
          acc = acc.charCodeAt(0) - 87;
        } else {
          acc = Number(acc);
        }
        if (optString.charAt(i + 1) == "+") {
          acc = num >>> acc;
        } else {
          acc = num << acc;
        }
        if (optString.charAt(i) == "+") {
          num += acc & 4294967295;
        } else {
          num ^= acc;
        }
      }
      return num;
    }

    /**
     *
     * @param {string} query
     * @returns {Array<number>}
     */
    static transformQuery(query) {
      /** @type {Array<number>} */
      const bytesArray = [];
      let idx = 0;
      for (let i = 0; i < query.length; i++) {
        let charCode = query.charCodeAt(i);

        if (128 > charCode) {
          bytesArray[idx++] = charCode;
        } else {
          if (2048 > charCode) {
            bytesArray[idx++] = (charCode >> 6) | 192;
          } else {
            if (
              55296 == (charCode & 64512) &&
              i + 1 < query.length &&
              56320 == (query.charCodeAt(i + 1) & 64512)
            ) {
              charCode =
                65536 +
                ((charCode & 1023) << 10) +
                (query.charCodeAt(++i) & 1023);
              bytesArray[idx++] = (charCode >> 18) | 240;
              bytesArray[idx++] = ((charCode >> 12) & 63) | 128;
            } else {
              bytesArray[idx++] = (charCode >> 12) | 224;
            }
            bytesArray[idx++] = ((charCode >> 6) & 63) | 128;
          }
          bytesArray[idx++] = (charCode & 63) | 128;
        }
      }
      return bytesArray;
    }

    /**
     *
     * @param {string} query
     * @returns {string}
     */
    static calcHash(query) {
      const windowTkk = GoogleHelper.googleTranslateTKK;
      const tkkSplited = windowTkk.split(".");
      const tkkIndex = Number(tkkSplited[0]) || 0;
      const tkkKey = Number(tkkSplited[1]) || 0;

      const bytesArray = GoogleHelper.transformQuery(query);

      let encondingRound = tkkIndex;
      for (const item of bytesArray) {
        encondingRound += item;
        encondingRound = GoogleHelper.shiftLeftOrRightThenSumOrXor(
          encondingRound,
          "+-a^+6"
        );
      }
      encondingRound = GoogleHelper.shiftLeftOrRightThenSumOrXor(
        encondingRound,
        "+-3^+b+-f"
      );

      encondingRound ^= tkkKey;
      if (encondingRound <= 0) {
        encondingRound = (encondingRound & 2147483647) + 2147483648;
      }

      const normalizedResult = encondingRound % 1000000;
      return normalizedResult.toString() + "." + (normalizedResult ^ tkkIndex);
    }
  }

  class YandexHelper {
    /** @type {number} */
    static #lastRequestSidTime = null;
    /** @type {string} */
    static #translateSid = null;
    /** @type {boolean} */
    static #SIDNotFound = false;
    /** @type {Promise<void>} */
    static #fingPromise = null;

    static get translateSid() {
      return YandexHelper.#translateSid;
    }

    /**
     *
     * @returns {Promise<void>}
     */
    static async findSID() {
      if (YandexHelper.#fingPromise) return await YandexHelper.#fingPromise;
      YandexHelper.#fingPromise = new Promise((resolve) => {
        let updateYandexSid = false;
        if (YandexHelper.#lastRequestSidTime) {
          const date = new Date();
          if (YandexHelper.#translateSid) {
            date.setHours(date.getHours() - 12);
          } else if (YandexHelper.#SIDNotFound) {
            date.setMinutes(date.getMinutes() - 30);
          } else {
            date.setMinutes(date.getMinutes() - 2);
          }
          if (date.getTime() > YandexHelper.#lastRequestSidTime) {
            updateYandexSid = true;
          }
        } else {
          updateYandexSid = true;
        }

        if (updateYandexSid) {
          YandexHelper.#lastRequestSidTime = Date.now();

          const http = new XMLHttpRequest();
          http.open(
            "GET",
            "https://translate.yandex.net/website-widget/v1/widget.js?widgetId=ytWidget&pageLang=es&widgetTheme=light&autoMode=false"
          );
          http.send();
          http.onload = (e) => {
            const result = http.responseText.match(/sid\:\s\'[0-9a-f\.]+/);
            if (result && result[0] && result[0].length > 7) {
              YandexHelper.#translateSid = result[0].substring(6);
              YandexHelper.#SIDNotFound = false;
            } else {
              YandexHelper.#SIDNotFound = true;
            }
            resolve();
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

      YandexHelper.#fingPromise.finally(() => {
        YandexHelper.#fingPromise = null;
      });

      return await YandexHelper.#fingPromise;
    }
  }

  class BingHelper {
    /** @type {number} */
    static #lastRequestSidTime = null;
    /** @type {string} */
    static #translateSid = null;
    /** @type {string} */
    static #translate_IID_IG = null;
    /** @type {boolean} */
    static #SIDNotFound = false;
    /** @type {Promise<void>} */
    static #sidPromise = null;

    static get translateSid() {
      return BingHelper.#translateSid;
    }

    static get translate_IID_IG() {
      return BingHelper.#translate_IID_IG;
    }
    /**
     *
     * @returns {Promise<void>}
     */
    static async findSID() {
      if (BingHelper.#sidPromise) return await BingHelper.#sidPromise;
      BingHelper.#sidPromise = new Promise((resolve) => {
        let updateYandexSid = false;
        if (BingHelper.#lastRequestSidTime) {
          const date = new Date();
          if (BingHelper.#translateSid) {
            date.setHours(date.getHours() - 12);
          } else if (BingHelper.#SIDNotFound) {
            date.setMinutes(date.getMinutes() - 30);
          } else {
            date.setMinutes(date.getMinutes() - 2);
          }
          if (date.getTime() > BingHelper.#lastRequestSidTime) {
            updateYandexSid = true;
          }
        } else {
          updateYandexSid = true;
        }

        if (updateYandexSid) {
          BingHelper.#lastRequestSidTime = Date.now();

          const http = new XMLHttpRequest();
          http.open("GET", "https://www.bing.com/translator");
          http.send();
          http.onload = (e) => {
            const result = http.responseText.match(
              /params_RichTranslateHelper\s=\s\[[^\]]+/
            );
            const data_iid_r = http.responseText.match(
              /data-iid\=\"[a-zA-Z0-9\.]+/
            );
            const IG_r = http.responseText.match(/IG\:\"[a-zA-Z0-9\.]+/);
            if (
              result &&
              result[0] &&
              result[0].length > 50 &&
              data_iid_r &&
              data_iid_r[0] &&
              IG_r &&
              IG_r[0]
            ) {
              const params_RichTranslateHelper = result[0]
                .substring("params_RichTranslateHelper = [".length)
                .split(",");
              const data_iid = data_iid_r[0].substring('data-iid="'.length);
              const IG = IG_r[0].substring('IG:"'.length);
              if (
                params_RichTranslateHelper &&
                params_RichTranslateHelper[0] &&
                params_RichTranslateHelper[1] &&
                parseInt(params_RichTranslateHelper[0]) &&
                data_iid &&
                IG
              ) {
                BingHelper.#translateSid = `&token=${params_RichTranslateHelper[1].substring(
                  1,
                  params_RichTranslateHelper[1].length - 1
                )}&key=${parseInt(params_RichTranslateHelper[0])}`;
                BingHelper.#translate_IID_IG = `IG=${IG}&IID=${data_iid}`;
                BingHelper.#SIDNotFound = false;
              } else {
                BingHelper.#SIDNotFound = true;
              }
            } else {
              BingHelper.#SIDNotFound = true;
            }
            resolve();
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

      BingHelper.#sidPromise.finally(() => {
        BingHelper.#sidPromise = null;
      });

      return await BingHelper.#sidPromise;
    }
  }

  class Service {
    /**
     * @callback Callback_cbParameters
     * @param {string} sourceLanguage
     * @param {string} targetLanguage
     * @param {Array<TranslationInfo>} requests
     * @returns {string}
     */

    /**
     * @callback callback_cbTransformRequest
     * @param {string[]} sourceArray2d
     * @returns {string}
     */

    /**
     * @typedef {{text: string, detectedLanguage: string}} Service_Single_Result_Response
     */

    /**
     * @callback callback_cbParseResponse
     * @param {Object} response
     * @returns {Array<Service_Single_Result_Response>}
     */

    /**
     * @callback callback_cbTransformResponse
     * @param {String} response
     * @param {boolean} dontSortResults
     * @returns {string[]} sourceArray2d
     */

    /** @typedef {"complete" | "translating" | "error"} TranslationStatus */
    /**
     * @typedef {Object} TranslationInfo
     * @property {String} originalText
     * @property {String} translatedText
     * @property {String} detectedLanguage
     * @property {TranslationStatus} status
     * @property {Promise<void>} waitTranlate
     */

    /**
     *
     * @param {string} serviceName
     * @param {string} baseURL
     * @param {"GET" | "POST"} xhrMethod
     * @param {callback_cbTransformRequest} cbTransformRequest
     * @param {callback_cbParseResponse} cbParseResponse
     * @param {callback_cbTransformResponse} cbTransformResponse
     * @param {Callback_cbParameters} cbGetExtraParameters
     * @param {Callback_cbParameters} cbGetRequestBody
     */
    constructor(
      serviceName,
      baseURL,
      xhrMethod = "GET",
      cbTransformRequest,
      cbParseResponse,
      cbTransformResponse,
      cbGetExtraParameters = null,
      cbGetRequestBody = null
    ) {
      this.serviceName = serviceName;
      this.baseURL = baseURL;
      this.xhrMethod = xhrMethod;
      this.cbTransformRequest = cbTransformRequest;
      this.cbParseResponse = cbParseResponse;
      this.cbTransformResponse = cbTransformResponse;
      this.cbGetExtraParameters = cbGetExtraParameters;
      this.cbGetRequestBody = cbGetRequestBody;
      /** @type {Map<string, TranslationInfo>} */
      this.translationsInProgress = new Map();
    }

    /**
     *
     * @param {string} sourceLanguage
     * @param {string} targetLanguage
     * @param {Array<string[]>} sourceArray3d
     * @returns {Promise<[Array<TranslationInfo[]>, TranslationInfo[]]>} requests, currentTranslationsInProgress
     */
    async getRequests(sourceLanguage, targetLanguage, sourceArray3d) {
      /** @type {Array<TranslationInfo[]>} */
      const requests = [];
      /** @type {TranslationInfo[]} */
      const currentTranslationsInProgress = [];

      let currentRequest = [];
      let currentSize = 0;

      for (const sourceArray2d of sourceArray3d) {
        const requestString = this.fixString(
          this.cbTransformRequest(sourceArray2d)
        );
        const requestHash = [
          sourceLanguage,
          targetLanguage,
          requestString,
        ].join(", ");

        const progressInfo = this.translationsInProgress.get(requestHash);
        if (progressInfo) {
          currentTranslationsInProgress.push(progressInfo);
        } else {
          /** @type {TranslationStatus} */
          let status = "translating";
          /** @type {() => void} */
          let promise_resolve = null;

          /** @type {TranslationInfo} */
          const progressInfo = {
            originalText: requestString,
            translatedText: null,
            detectedLanguage: null,
            get status() {
              return status;
            },
            set status(_status) {
              status = _status;
              promise_resolve();
            },
            waitTranlate: new Promise((resolve) => (promise_resolve = resolve)),
          };

          currentTranslationsInProgress.push(progressInfo);
          this.translationsInProgress.set(requestHash, progressInfo);

          //cast
          const cacheEntry = await translationCache.get(
            this.serviceName,
            sourceLanguage,
            targetLanguage,
            requestString
          );
          if (cacheEntry) {
            progressInfo.translatedText = cacheEntry.translatedText;
            progressInfo.detectedLanguage = cacheEntry.detectedLanguage;
            progressInfo.status = "complete";
            //this.translationsInProgress.delete([sourceLanguage, targetLanguage, requestString])
          } else {
            currentRequest.push(progressInfo);
            currentSize += progressInfo.originalText.length;
            if (currentSize > 800) {
              requests.push(currentRequest);
              currentSize = 0;
              currentRequest = [];
            }
          }
        }
      }

      if (currentRequest.length > 0) {
        requests.push(currentRequest);
        currentRequest = [];
        currentSize = 0;
      }

      return [requests, currentTranslationsInProgress];
    }

    /**
     *
     * @param {string} sourceLanguage
     * @param {string} targetLanguage
     * @param {Array<TranslationInfo>} requests
     * @returns {Promise<void>}
     */
    async makeRequest(sourceLanguage, targetLanguage, requests) {
      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
          this.xhrMethod,
          this.baseURL +
            (this.cbGetExtraParameters
              ? this.cbGetExtraParameters(
                  sourceLanguage,
                  targetLanguage,
                  requests
                )
              : "")
        );
        xhr.setRequestHeader(
          "Content-Type",
          "application/x-www-form-urlencoded"
        );
        xhr.responseType = "json";

        xhr.onload = (event) => {
          resolve(xhr.response);
        };

        xhr.onerror =
          xhr.onabort =
          xhr.ontimeout =
            (event) => {
              console.error(event);
              reject();
            };

        xhr.send(
          this.cbGetExtraParameters
            ? this.cbGetRequestBody(sourceLanguage, targetLanguage, requests)
            : undefined
        );
      });
    }

    /**
     *
     * @param {string} sourceLanguage
     * @param {string} targetLanguage
     * @param {Array<string[]>} sourceArray3d
     * @param {boolean} dontSortResults
     * @returns {Promise<string[][]>}
     */
    async translate(
      sourceLanguage,
      targetLanguage,
      sourceArray3d,
      dontSaveInPersistentCache = false,
      dontSortResults = false
    ) {

      // Through this map, the two methods of filtering and restoring keywords exchange information
      let allDescriptionMap = new Map();
      sourceArray3d = filterKeywordsIn3d(sourceArray3d,allDescriptionMap);

      const [requests, currentTranslationsInProgress] = await this.getRequests(
        sourceLanguage,
        targetLanguage,
        sourceArray3d
      );
      /** @type {Promise<void>[]} */
      const promises = [];

      for (const request of requests) {
        promises.push(
          this.makeRequest(sourceLanguage, targetLanguage, request)
            .then((response) => {
              const results = this.cbParseResponse(response);
              for (const idx in request) {
                const result = results[idx];
                this.cbTransformResponse(result.text, dontSortResults); // apenas para gerar error
                const transInfo = request[idx];
                transInfo.detectedLanguage = result.detectedLanguage || "und";
                transInfo.translatedText = result.text;
                transInfo.status = "complete";
                //this.translationsInProgress.delete([sourceLanguage, targetLanguage, transInfo.originalText])
                if (dontSaveInPersistentCache === false) {
                  translationCache.set(
                    this.serviceName,
                    sourceLanguage,
                    targetLanguage,
                    transInfo.originalText,
                    transInfo.translatedText,
                    transInfo.detectedLanguage
                  );
                }
              }
            })
            .catch((e) => {
              console.error(e);
              for (const transInfo of request) {
                transInfo.status = "error";
                //this.translationsInProgress.delete([sourceLanguage, targetLanguage, transInfo.originalText])
              }
            })
        );
      }
      await Promise.all(
        currentTranslationsInProgress.map((transInfo) => transInfo.waitTranlate)
      );

      let resultArray3d = currentTranslationsInProgress.map((transInfo) =>
          this.cbTransformResponse(transInfo.translatedText, dontSortResults)
      );
      resultArray3d = spliceKeywordsIn3d(resultArray3d,allDescriptionMap);
      return resultArray3d;
    }

    /**
     * https://github.com/FilipePS/Traduzir-paginas-web/issues/484
     * @param {string} str
     * @returns {string}
     */
    fixString(str) {
      return str.replace(/\u200b/g, " ");
    }
  }

  const googleService = new (class extends Service {
    constructor() {
      super(
        "google",
        "https://translate.googleapis.com/translate_a/t?anno=3&client=te&v=1.0&format=html",
        "POST",
        function transformRequest(sourceArray2d) {
          sourceArray2d = sourceArray2d.map((text) => Utils.escapeHTML(text));
          if (sourceArray2d.length > 1) {
            sourceArray2d = sourceArray2d.map(
              (text, index) => `<a i=${index}>${text}</a>`
            );
          }
          // the <pre> tag is to preserve the text formating
          return `<pre>${sourceArray2d.join("")}</pre>`;
        },
        function parseResponse(response) {
          /** @type {[Service_Single_Result_Response]} */
          let responseJson;
          if (typeof response === "string") {
            responseJson = [{ text: response, detectedLanguage: null }];
          } else if (typeof response[0] === "string") {
            responseJson = response.map(
              /** @returns {Service_Single_Result_Response} */ (
                /** @type {string} */ value
              ) => ({ text: value, detectedLanguage: null })
            );
          } else {
            responseJson = response.map(
              /** @returns {Service_Single_Result_Response} */ (
                /** @type {[string, string]} */ value
              ) => ({ text: value[0], detectedLanguage: value[1] })
            );
          }
          return responseJson;
        },
        function transformResponse(result, dontSortResults) {
          // remove the <pre> tag from the response
          if (result.indexOf("<pre") !== -1) {
            result = result.replace("</pre>", "");
            const index = result.indexOf(">");
            result = result.slice(index + 1);
          }

          /** @type {string[]} */
          const sentences = []; // each translated sentence is inside of <b> tag

          // The main objective is to remove the original text of each sentense that is inside the <i> tags.
          // Keeping only the <a> tags
          let idx = 0;
          while (true) {
            // each translated sentence is inside of <b> tag
            const sentenceStartIndex = result.indexOf("<b>", idx);
            if (sentenceStartIndex === -1) break;

            // the <i> tag is the original text in each sentence
            const sentenceFinalIndex = result.indexOf(
              "<i>",
              sentenceStartIndex
            );

            if (sentenceFinalIndex === -1) {
              sentences.push(result.slice(sentenceStartIndex + 3));
              break;
            } else {
              sentences.push(
                result.slice(sentenceStartIndex + 3, sentenceFinalIndex)
              );
            }
            idx = sentenceFinalIndex;
          }

          // maybe the response don't have any sentence (does not have <i> and <b> tags), is this case just use de result
          result = sentences.length > 0 ? sentences.join(" ") : result;
          // Remove the remaining </b> tags (usually the last)
          result = result.replace(/\<\/b\>/g, "");
          // Capture each <a i={number}> and put it in an array, the </a> will be ignored
          // maybe the same index appears several times
          // maybe some text will be outside of <a i={number}> (Usually text before the first <a> tag, and some whitespace between the <a> tags),
          // in this case, The outside text will be placed inside the <a i={number}> closer
          // https://github.com/FilipePS/Traduzir-paginas-web/issues/449
          // TODO lidar com tags dentro de tags e tags vazias
          // https://de.wikipedia.org/wiki/Wikipedia:Hauptseite
          // "{\"originalText\":\"<pre><a i=0>\\nFür den </a><a i=1>37. Schreib­wettbewerb</a><a i=2> und den </a><a i=3>18. Miniaturwettbewerb</a><a i=4> können ab sofort Artikel nominiert werden.</a></pre>\",\"translatedText\":\"<pre><a i=0>\\n</a>Artigos já podem ser indicados <a i=0>para o</a> <a i=1>37º Concurso de Redação <a i=2>e</a></a> <a i=3><a i=4>18º</a> Concurso de Miniaturas</a> .</pre>\",\"detectedLanguage\":\"de\",\"status\":\"complete\",\"waitTranlate\":{}}"
          let resultArray = [];
          let lastEndPos = 0;
          for (const r of result.matchAll(
            /(\<a\si\=[0-9]+\>)([^\<\>]*(?=\<\/a\>))*/g
          )) {
            const fullText = r[0];
            const fullLength = r[0].length;
            const pos = r.index;
            // if it is bigger then it has text outside the tags
            if (pos > lastEndPos) {
              const aTag = r[1];
              const insideText = r[2] || "";
              const outsideText = result
                .slice(lastEndPos, pos)
                .replace(/\<\/a\>/g, "");
              resultArray.push(aTag + outsideText + insideText);
            } else {
              resultArray.push(fullText);
            }
            lastEndPos = pos + fullLength;
          }
          // captures the final text outside the <a> tag
          {
            const lastOutsideText = result
              .slice(lastEndPos)
              .replace(/\<\/a\>/g, "");
            if (resultArray.length > 0) {
              resultArray[resultArray.length - 1] += lastOutsideText;
            }
          }
          // this is the old method, don't capture text outside of <a> tags
          // let resultArray = result.match(
          //   /\<a\si\=[0-9]+\>[^\<\>]*(?=\<\/a\>)/g
          // );

          if (dontSortResults) {
            // Should not sort the <a i={number}> of Google Translate result
            // Instead of it, join the texts without sorting
            // https://github.com/FilipePS/Traduzir-paginas-web/issues/163

            if (resultArray && resultArray.length > 0) {
              // get the text inside of <a i={number}>
              // the indexes is not needed in this case
              resultArray = resultArray.map((value) => {
                const resultStartAtIndex = value.indexOf(">");
                return value.slice(resultStartAtIndex + 1);
              });
            } else {
              // maybe the response don't have any <a i={number}>
              resultArray = [result];
            }

            // unescapeHTML
            resultArray = resultArray.map((value) => Utils.unescapeHTML(value));

            return resultArray;
          } else {
            // Sort Google translate results to keep the links with the correct name
            // Note: the links may also disappear; http://web.archive.org/web/20220919162911/https://de.wikipedia.org/wiki/Wikipedia:Hauptseite
            // each inline tag has a index starting with 0 <a i={number}>
            let indexes;
            if (resultArray && resultArray.length > 0) {
              // get the indexed of <a i={number}>
              indexes = resultArray
                .map((value) => parseInt(value.match(/[0-9]+(?=\>)/g)[0]))
                .filter((value) => !isNaN(value));
              // get the text inside of <a i={number}>
              resultArray = resultArray.map((value) => {
                const resultStartAtIndex = value.indexOf(">");
                return value.slice(resultStartAtIndex + 1);
              });
            } else {
              // maybe the response don't have any <a i={number}>
              resultArray = [result];
              indexes = [0];
            }

            // unescapeHTML
            resultArray = resultArray.map((value) => Utils.unescapeHTML(value));

            /** @type {string[]} */
            const finalResulArray = [];
            // sorte de results and put in finalResulArray
            for (const j in indexes) {
              if (finalResulArray[indexes[j]]) {
                finalResulArray[indexes[j]] += " " + resultArray[j];
              } else {
                finalResulArray[indexes[j]] = resultArray[j];
              }
            }

            return finalResulArray;
          }
        },
        function getExtraParameters(sourceLanguage, targetLanguage, requests) {
          return `&sl=${sourceLanguage}&tl=${targetLanguage}&tk=${GoogleHelper.calcHash(
            requests.map((info) => info.originalText).join("")
          )}`;
        },
        function getRequestBody(sourceLanguage, targetLanguage, requests) {
          return requests
            .map((info) => `&q=${encodeURIComponent(info.originalText)}`)
            .join("");
        }
      );
    }
  })();

  const yandexService = new (class extends Service {
    constructor() {
      super(
        "yandex",
        "https://translate.yandex.net/api/v1/tr.json/translate?srv=tr-url-widget",
        "GET",
        function transformRequest(sourceArray2d) {
          return sourceArray2d
            .map((value) => Utils.escapeHTML(value))
            .join("<wbr>");
        },
        function parseResponse(response) {
          const lang = response.lang;
          const detectedLanguage = lang ? lang.split("-")[0] : null;
          return response.text.map(
            /** @return {Service_Single_Result_Response} */ (
              /** @type {string} */ text
            ) => ({ text, detectedLanguage })
          );
        },
        function transformResponse(result, dontSortResults) {
          return result
            .split("<wbr>")
            .map((value) => Utils.unescapeHTML(value));
        },
        function getExtraParameters(sourceLanguage, targetLanguage, requests) {
          return `&id=${YandexHelper.translateSid}-0-0&format=html&lang=${
            sourceLanguage === "auto" ? "" : sourceLanguage + "-"
          }${targetLanguage}${requests
            .map((info) => `&text=${encodeURIComponent(info.originalText)}`)
            .join("")}`;
        },
        function getRequestBody(sourceLanguage, targetLanguage, requests) {
          return undefined;
        }
      );
    }

    async translate(
      sourceLanguage,
      targetLanguage,
      sourceArray3d,
      dontSaveInPersistentCache,
      dontSortResults = false
    ) {
      await YandexHelper.findSID();
      if (!YandexHelper.translateSid) return;
      if (sourceLanguage.startsWith("zh")) sourceLanguage = "zh";
      if (targetLanguage.startsWith("zh")) targetLanguage = "zh";
      return await super.translate(
        sourceLanguage,
        targetLanguage,
        sourceArray3d,
        dontSaveInPersistentCache,
        dontSortResults
      );
    }
  })();

  const bingService = new (class extends Service {
    constructor() {
      super(
        "bing",
        "https://www.bing.com/ttranslatev3?isVertical=1",
        "POST",
        function transformRequest(sourceArray2d) {
          return sourceArray2d
            .map((value) => Utils.escapeHTML(value))
            .join("<wbr>");
        },
        function parseResponse(response) {
          return [
            {
              text: response[0].translations[0].text,
              detectedLanguage: response[0].detectedLanguage.language,
            },
          ];
        },
        function transformResponse(result, dontSortResults) {
          return [Utils.unescapeHTML(result)];
        },
        function getExtraParameters(sourceLanguage, targetLanguage, requests) {
          return `&${BingHelper.translate_IID_IG}`;
        },
        function getRequestBody(sourceLanguage, targetLanguage, requests) {
          return `&fromLang=${sourceLanguage}${requests
            .map((info) => `&text=${encodeURIComponent(info.originalText)}`)
            .join("")}&to=${targetLanguage}${BingHelper.translateSid}`;
        }
      );
    }

    async translate(
      sourceLanguage,
      targetLanguage,
      sourceArray3d,
      dontSaveInPersistentCache,
      dontSortResults = false
    ) {
      /** @type {{search: string, replace: string}[]} */
      const replacements = [
        {
          search: "auto",
          replace: "auto-detect",
        },
        {
          search: "zh-CN",
          replace: "zh-Hans",
        },
        {
          search: "zh-TW",
          replace: "zh-Hant",
        },
        {
          search: "tl",
          replace: "fil",
        },
        {
          search: "hmn",
          replace: "mww",
        },
        {
          search: "ckb",
          replace: "kmr",
        },
        {
          search: "mn",
          replace: "mn-Cyrl",
        },
        {
          search: "no",
          replace: "nb",
        },
        {
          search: "sr",
          replace: "sr-Cyrl",
        },
      ];
      replacements.forEach((r) => {
        if (targetLanguage === r.search) {
          targetLanguage = r.replace;
        }
        if (sourceLanguage === r.search) {
          sourceLanguage = r.replace;
        }
      });

      await BingHelper.findSID();
      if (!BingHelper.translate_IID_IG) return;

      return await super.translate(
        sourceLanguage,
        targetLanguage,
        sourceArray3d,
        dontSaveInPersistentCache,
        dontSortResults
      );
    }
  })();

  const deeplService = new (class {
    constructor() {
      this.DeepLTab = null;
    }
    async translate(
      sourceLanguage,
      targetLanguage,
      sourceArray3d,
      dontSaveInPersistentCache,
      dontSortResults = false
    ) {
      return await new Promise((resolve) => {
        const waitFirstTranslationResult = () => {
          const listener = (request, sender, sendResponse) => {
            if (request.action === "DeepL_firstTranslationResult") {
              resolve([[request.result]]);
              chrome.runtime.onMessage.removeListener(listener);
            }
          };
          chrome.runtime.onMessage.addListener(listener);

          setTimeout(() => {
            chrome.runtime.onMessage.removeListener(listener);
            resolve([[""]]);
          }, 8000);
        };

        if (this.DeepLTab) {
          chrome.tabs.get(this.DeepLTab.id, (tab) => {
            checkedLastError();
            if (tab) {
              //chrome.tabs.update(tab.id, {active: true})
              chrome.tabs.sendMessage(
                tab.id,
                {
                  action: "translateTextWithDeepL",
                  text: sourceArray3d[0][0],
                  targetLanguage,
                },
                {
                  frameId: 0,
                },
                (response) => resolve([[response]])
              );
            } else {
              chrome.tabs.create(
                {
                  url: `https://www.deepl.com/#!${targetLanguage}!#${encodeURIComponent(
                    sourceArray3d[0][0]
                  )}`,
                },
                (tab) => {
                  this.DeepLTab = tab;
                  waitFirstTranslationResult();
                }
              );
              // resolve([[""]])
            }
          });
        } else {
          chrome.tabs.create(
            {
              url: `https://www.deepl.com/#!${targetLanguage}!#${encodeURIComponent(
                sourceArray3d[0][0]
              )}`,
            },
            (tab) => {
              this.DeepLTab = tab;
              waitFirstTranslationResult();
            }
          );
          // resolve([[""]])
        }
      });
    }
  })();

  /** @type {Map<string, Service>} */
  const serviceList = new Map();

  serviceList.set("google", googleService);
  serviceList.set("yandex", yandexService);
  serviceList.set("bing", bingService);
  serviceList.set(
    "deepl",
    /** @type {Service} */ /** @type {?} */ (deeplService)
  );

  translationService.translateHTML = async (
    serviceName,
    sourceLanguage,
    targetLanguage,
    sourceArray3d,
    dontSaveInPersistentCache = false,
    dontSortResults = false
  ) => {
    const service = serviceList.get(serviceName) || serviceList.get("google");
    return await service.translate(
      sourceLanguage,
      targetLanguage,
      sourceArray3d,
      dontSaveInPersistentCache,
      dontSortResults
    );
  };

  translationService.translateText = async (
    serviceName,
    sourceLanguage,
    targetLanguage,
    sourceArray2d,
    dontSaveInPersistentCache = false
  ) => {
    return (
      await translationService.translateHTML(
        serviceName,
        sourceLanguage,
        targetLanguage,
        [sourceArray2d],
        dontSaveInPersistentCache
      )
    )[0];
  };

  translationService.translateSingleText = async (
    serviceName,
    sourceLanguage,
    targetLanguage,
    originalText,
    dontSaveInPersistentCache = false
  ) => {
    return (
      await translationService.translateText(
        serviceName,
        sourceLanguage,
        targetLanguage,
        [originalText],
        dontSaveInPersistentCache
      )
    )[0];
  };

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const dontSaveInPersistentCache = sender.tab ? sender.tab.incognito : false;
    if (request.action === "translateHTML") {
      translationService
        .translateHTML(
          request.translationService,
          "auto",
          request.targetLanguage,
          request.sourceArray3d,
          dontSaveInPersistentCache,
          request.dontSortResults
        )
        .then((results) => sendResponse(results))
        .catch((e) => sendResponse());

      return true;
    } else if (request.action === "translateText") {
      translationService
        .translateText(
          request.translationService,
          "auto",
          request.targetLanguage,
          request.sourceArray,
          dontSaveInPersistentCache
        )
        .then((results) => sendResponse(results))
        .catch((e) => sendResponse());

      return true;
    } else if (request.action === "translateSingleText") {
      translationService
        .translateSingleText(
          request.translationService,
          "auto",
          request.targetLanguage,
          request.source,
          dontSaveInPersistentCache
        )
        .then((results) => sendResponse(results))
        .catch((e) => sendResponse());

      return true;
    }
  });

  return translationService;
})();


const startMark = '<customskipword>';
const endMark = '</customskipword>';
let currentIndex;
let compressionMap;

/**
 * Iterate over '_sourceArray3d' , delete our keywords
 *
 * Each 'sourceArray2d' corresponds to a 'originalDescriptionMap', and each 'originalDescriptionMap' contains several 'description'
 *
 * The size of 'sourceArray2d', corresponding to the number of 'description'
 *
 * For example, with only 1 element in 'sourceArray2d', ['The Temporal Platform explained'] , we have the keyword 'Temporal'
 *
 * After going through our method, so now 'newSourceArray2d' consists of two elements ['The ,' Platform explained']
 *
 * And we have a 'description' , we restore it through original text, it looks like '0T1'
 *
 * T represents the keyword, '0, 1' corresponds to the current index of newSourceArray2d
 * */
function filterKeywordsIn3d(sourceArray3d,allDescriptionMap) {
  return sourceArray3d.map((sourceArray2d, index) => {
    let newSourceArray2d = []
    let originalDescriptionMap = new Map()
    // points to the last of the newSourceArray2d
    let currentPoint = -1
    sourceArray2d.forEach((value, index) => {
      let description = ''
      let processedText = filterKeywordsInText(value)
      while (true) {
        let startIndex = processedText.indexOf(startMark)
        if (startIndex === -1) {
          if (processedText.length > 0) {
            newSourceArray2d.push(processedText)
            currentPoint++
            description += currentPoint
          }
          break
        } else {
          let frontPart = processedText.substring(0, startIndex)
          let backPart = processedText.substring(processedText.indexOf(endMark) + endMark.length)
          let indexWithMark = processedText.substring(startIndex, processedText.indexOf(endMark) + endMark.length)
          if (frontPart.length > 0) {
            newSourceArray2d.push(frontPart)
            currentPoint++
            description += currentPoint
          }
          description += indexWithMark
          processedText = backPart
        }
      }
      originalDescriptionMap.set(index, description)
    })
    allDescriptionMap.set(index, originalDescriptionMap)
    return newSourceArray2d
  })
}

/**
 * Splicing custom keywords
 * */
function spliceKeywordsIn3d(resultArray3d,allDescriptionMap) {
  return resultArray3d.map((resultArray2d, index) => {
    let newResultArray2d = []
    allDescriptionMap.get(index).forEach((description) => {
      let parsedResult = ''
      while (true) {
        let startIndex = description.indexOf(startMark)
        if (startIndex === -1) {
          if (description.length > 0) {
            // There is no valid value guarantee here, there is '' sent to Google, resultArray2d will have a null
            parsedResult += resultArray2d[description] ? resultArray2d[description] : ''
          }
          break
        } else {
          let front = ''
          if (startIndex > 0) {
            front = resultArray2d[description.substring(0, startIndex)]
          }
          parsedResult += front
          let key = description.substring(description.indexOf(startMark) + startMark.length, description.indexOf(endMark))
          let trueKey = handleHitKeywords(key, false)
          // Due to the direct processing of sourceArray3d, so the original whitespace gap is lost
          trueKey = ' ' + trueKey + ' '
          parsedResult += trueKey
          description = description.substring(description.indexOf(endMark) + endMark.length)
        }
      }
      newResultArray2d.push(parsedResult)
    })
    return newResultArray2d
  })
}

/**
 *  Convert matching keywords to a string of special numbers to skip translation before sending to the translation engine.
 *
 * This method is no longer used directly, and the higher-level method 'filterKeywordsIn3d' processes keywords at the sourceArray3d level
 *
 *  For English words, ignore case when matching.
 *
 *  But for the word "app" , We don't want to "Happy" also matched.
 *
 *  So we match only isolated words, by checking the two characters before and after the keyword.
 *
 *  But this will also cause this method to not work for Chinese, Burmese and other languages without spaces.
 * */
function filterKeywordsInText(textContext) {
  const customDictionary = twpConfig.get("customDictionary")
  if (customDictionary.size > 0) {
    for (let keyWord of customDictionary.keys()) {
      while (true) {
        let index = textContext.toLowerCase().indexOf(keyWord)
        if (index === -1) {
          break
        } else {
          textContext = removeNewlines(textContext, index, keyWord)
          let previousIndex = index - 1
          let nextIndex = index + keyWord.length
          let previousChar = previousIndex === -1 ? ' ' : textContext.charAt(previousIndex)
          let nextChar = nextIndex === textContext.length ? ' ' : textContext.charAt(nextIndex)
          previousChar = previousChar === '\n' ? ' ' : previousChar
          nextChar = nextChar === '\n' ? ' ' : nextChar
          previousChar = isPunctuation(previousChar) ? ' ' : previousChar
          nextChar = isPunctuation(nextChar) ? ' ' : nextChar
          let placeholderText = ''
          let keyWordWithCase = textContext.substring(index, index + keyWord.length)
          if (previousChar === ' ' && nextChar === ' ') {
            placeholderText = startMark + handleHitKeywords(keyWordWithCase, true) + endMark
          } else {
            placeholderText = '#n%o#'
            for (let c of Array.from(keyWordWithCase)) {
              placeholderText += c
              placeholderText += '#n%o#'
            }
          }
          let frontPart = textContext.substring(0, index)
          let backPart = textContext.substring(index + keyWord.length)
          textContext = frontPart + placeholderText + backPart
        }
      }
      textContext = textContext.replaceAll('#n%o#', '')
    }
  }
  return textContext
}

/**
 *
 * True : Store the keyword in the Map and return the index
 *
 * False : Extract keywords by index
 * */
function handleHitKeywords(value, mode) {
  if (mode === true) {
    if (currentIndex === undefined) {
      currentIndex = 1
      compressionMap = new Map()
      compressionMap.set(currentIndex, value)
    } else {
      compressionMap.set(++currentIndex, value)
    }
    return String(currentIndex)
  } else {
    let keyword = String(compressionMap.get(Number(value)))
    let alternativeWord = twpConfig.get("customDictionary").get(keyword.toLowerCase())
    return alternativeWord ? alternativeWord : keyword
  }
}

/**
 * any kind of punctuation character (including international e.g. Chinese and Spanish punctuation)
 *
 * source: https://github.com/slevithan/xregexp/blob/41f4cd3fc0a8540c3c71969a0f81d1f00e9056a9/src/addons/unicode/unicode-categories.js#L142
 *
 * note: XRegExp unicode output taken from http://jsbin.com/uFiNeDOn/3/edit?js,console (see chrome console.log), then converted back to JS escaped unicode here http://rishida.net/tools/conversion/, then tested on http://regexpal.com/
 *
 * suggested by: https://stackoverflow.com/a/7578937
 *
 * added: extra characters like "$", "\uFFE5" [yen symbol], "^", "+", "=" which are not consider punctuation in the XRegExp regex (they are currency or mathmatical characters)
 *
 * added: Chinese Punctuation: \u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3010|\u3011|\u007e
 *
 * added: special html space symbol: &nbsp; &ensp; &emsp; &thinsp; &zwnj; &zwj; -> \u00A0|\u2002|\u2003|\u2009|\u200C|\u200D
 * @see https://stackoverflow.com/a/21396529/19616126
 * */
function isPunctuation(str) {
  if (typeof str !== "string") return false
  const regex = /[\$\uFFE5\^\+=`~<>{}\[\]|\u00A0|\u2002|\u2003|\u2009|\u200C|\u200D|\u3002|\uff1f|\uff01|\uff0c|\u3001|\uff1b|\uff1a|\u201c|\u201d|\u2018|\u2019|\uff08|\uff09|\u300a|\u300b|\u3010|\u3011|\u007e!-#%-\x2A,-/:;\x3F@\x5B-\x5D_\x7B}\u00A1\u00A7\u00AB\u00B6\u00B7\u00BB\u00BF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u0AF0\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166D\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E3B\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]+/g;
  return regex.test(str)
}

/**
 * Remove useless newlines inside, which may affect our semantics
 *
 * See if there are consecutive spaces, keep only one
 *
 * In order to minimize the impact on the original semantics, only the 30 characters before and after the keyword appear
 *
 * @see https://github.com/FilipePS/Traduzir-paginas-web/pull/476#issuecomment-1251864367
 * */
function removeNewlines(textContext, index, keyWord) {
  let previous30 = index - 30 >= 0 ? index - 30 : 0
  let next30 = index + keyWord.length + 30 < textContext.length ? index + keyWord.length + 30 : textContext.length
  let needDealtPart = textContext.substring(previous30, next30)
  needDealtPart = needDealtPart.replaceAll('\n', ' ')
  needDealtPart = needDealtPart.replace(/  +/g, ' ')
  textContext = textContext.substring(0, previous30) + needDealtPart + textContext.substring(next30)
  return textContext
}

