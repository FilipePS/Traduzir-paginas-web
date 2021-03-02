"use strict";
//TODO usar md5, ou outro
//TODO implementar o cache usando indexeddb

var translationCache = {}

{
    async function stringToSHA1String(message) {
        const msgUint8 = new TextEncoder().encode(message);                           // encode as (utf-8) Uint8Array
        const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);           // hash the message
        const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
        return hashHex;
      }

    let googleCache = {}
    let yandexCache = {}

    translationCache.google = {}
    translationCache.yandex = {}

    function getCache(translationService) {
        if (translationService === "yandex") {
            return yandexCache
        } else {
            return googleCache
        }
    }

    translationCache.get = function (translationService, source, targetLanguage) {
        const translations = getCache(translationService)[targetLanguage]

        if (!translations) {
            return
        }

        for (const transInfo of translations) {
            if (transInfo.source === source) {
                return transInfo.translated
            }
        }
    }

    translationCache.google.get = function (source, targetLanguage) {
        return translationCache.get("google", source, targetLanguage)
    }

    translationCache.yandex.get = function (source, targetLanguage) {
        return translationCache.get("yandex", source, targetLanguage)
    }

    translationCache.set = function (translationService, source, translated, targetLanguage) {
        const cache = getCache(translationService)

        if (!cache) {
            return false
        }

        let translations
        if (cache[targetLanguage]) {
            translations = cache[targetLanguage]
        } else {
            translations = []
            cache[targetLanguage] = translations
        }

        translations.push({source, translated})

        return true
    }

    translationCache.google.set = function (source, translated, targetLanguage) {
        return translationCache.set("google", source, translated, targetLanguage)
    }

    translationCache.yandex.set = function (source, translated, targetLanguage) {
        return translationCache.set("yandex", source, translated, targetLanguage)
    }
}