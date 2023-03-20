"use strict";

const textToSpeech = (function () {
  const textToSpeech = {};

  /**
   * @callback Callback_Speech_cbGetExtraParameters
   * @param {string} text
   * @param {string} targetLanguage
   * @return {string} urlParamsString
   */

  class Service {
    /**
     * Defines the Service class for the text-to-speech service.
     * @param {string} serviceName
     * @param {string} baseURL
     * @param {"GET" | "POST"} xhrMethod
     * @param {Callback_Speech_cbGetExtraParameters} cbGetExtraParameters
     */
    constructor(serviceName, baseURL, xhrMethod, cbGetExtraParameters) {
      this.serviceName = serviceName;
      this.baseURL = baseURL;
      this.xhrMethod = xhrMethod;
      this.cbGetExtraParameters = cbGetExtraParameters;
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
        xhr.send();
      });
    }

    /**
     * Transform text into audio and play then.
     * @param {string} fullText
     * @param {string} targetLanguage
     * @returns {Promise<void>} Promise\<void\>
     */
    async textToSpeech(fullText, targetLanguage) {
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

  // Listen for messages coming from contentScript or other scripts.
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "textToSpeech") {
      googleService
        .textToSpeech(request.text, request.targetLanguage)
        .finally(() => {
          sendResponse();
        });

      return true;
    } else if (request.action === "stopAudio") {
      googleService.stopAll();
    }
  });

  // Listen for changes to the audio speed setting and apply it immediately.
  twpConfig.onReady(async () => {
    twpConfig.onChanged((name, newvalue) => {
      if (name === "ttsSpeed") {
        googleService.setAudioSpeed(newvalue);
      }
    });
  });

  textToSpeech.google = googleService;

  return textToSpeech;
})();
