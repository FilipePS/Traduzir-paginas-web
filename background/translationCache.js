"use strict";

// TODO verificar se o navegador pode deletar objectstorage especificos

var translationCache = {}

{
    async function stringToSHA1String(message) {
        const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
        const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8); // hash the message
        const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
        return hashHex;
    }

    let googleCache = {}
    let yandexCache = {}

    let googleDB = null
    let yandexDB = null

    translationCache.google = {}
    translationCache.yandex = {}

    function getCache(translationService) {
        if (translationService === "yandex") {
            return yandexCache
        } else {
            return googleCache
        }
    }

    function getDB(translationService) {
        if (translationService === "yandex") {
            return yandexDB
        } else {
            return googleDB
        }
    }

    function useDB(name, db) {
        switch (name) {
            case "googleCache":
                googleDB = db
                break
            case "googleCache":
                yandexDB = db
                break
            default:
                break
        }
    }

    function openIndexeddb(name, version) {
        const request = indexedDB.open(name, version)

        request.onsuccess = function (event) {
            console.info(event)

            useDB(name, this.result)
        }

        request.onerror = function (event) {
            console.error("Error opening the database, switching to non-database mode", event)
        }

        request.onupgradeneeded = function (event) {
            const db = this.result

            for (const langCode in twpLang.languages["en"]) {
                db.createObjectStore(langCode, {
                    keyPath: "key"
                })
            }
        }

        return request
    }

    function queryInDB(db, objectName, keyPath) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject()
                return
            }

            const objectStore = db.transaction([objectName], "readonly").objectStore(objectName)
            const request = objectStore.get(keyPath)

            request.onerror = function (event) {
                console.error(event)
                reject(event)
            }

            request.onsuccess = function (event) {
                const result = request.result
                resolve(result)
            }
        })
    }

    function addInDb(db, objectName, data) {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject()
                return
            }

            const objectStore = db.transaction([objectName], "readwrite").objectStore(objectName)
            const request = objectStore.add(data)

            request.onerror = function (event) {
                console.error(event)
                reject(event)
            }

            request.onsuccess = function (event) {
                resolve(this.result)
            }
        })
    }

    translationCache.get = async function (translationService, source, targetLanguage) {
        const cache = getCache(translationService)
        let translations = cache[targetLanguage]

        if (translations) {
            for (const transInfo of translations) {
                if (transInfo.source === source) {
                    return transInfo.translated
                }
            }
        } else {
            translations = []
            cache[targetLanguage] = translations
        }

        const db = getDB(translationService)
        if (db) {
            try {
                const transInfo = await queryInDB(db, targetLanguage, await stringToSHA1String(source))
                if (transInfo) {
                    translations.push(transInfo)
                    return transInfo.translated
                }
                //TODO RETURN AQUI DA LENTIDAO
            } catch (e) {
                console.error(e)
                return;
            }
        }
    }

    translationCache.google.get = function (source, targetLanguage) {
        return translationCache.get("google", source, targetLanguage)
    }

    translationCache.yandex.get = function (source, targetLanguage) {
        return translationCache.get("yandex", source, targetLanguage)
    }

    translationCache.set = async function (translationService, source, translated, targetLanguage) {
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

        translations.push({
            source,
            translated
        })

        const db = getDB(translationService)

        if (db) {
            try {
                addInDb(db, targetLanguage, {
                    key: await stringToSHA1String(source),
                    source,
                    translated
                })
            } catch (e) {
                console.error(e)
            }
        }

        return true
    }

    translationCache.google.set = function (source, translated, targetLanguage) {
        return translationCache.set("google", source, translated, targetLanguage)
    }

    translationCache.yandex.set = function (source, translated, targetLanguage) {
        return translationCache.set("yandex", source, translated, targetLanguage)
    }

    openIndexeddb("googleCache", 1)
    openIndexeddb("yandexCache", 1)
}