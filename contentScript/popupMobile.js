"use strict";

var popupMobile = {}

twpConfig.onReady(function () {
    if (!plataformInfo.isMobile.any) return;

    const htmlMobile = `
    <style>
        .item {
            flex: 1;
            text-align: center;
            vertical-align: middle;
            font-family: "Arial";
            font-weight: 600;
            height: 50px;
            font-size: 22px;
            background-color: white;
            border: none;
            cursor: pointer;
        }
    
        .item2 {
            flex: 1;
            text-align: center;
            vertical-align: middle;
            height: 50px;
            background-color: white;
            border: none;
            cursor: pointer;      
        }
    
        .button:focus {
            outline: none;
            animation: btn-color 0.8s forwards linear;
        }
    
        .button::-moz-focus-inner, .item2::-moz-focus-inner {
            border: 0;
        }
    
        .item2:focus {
            border: 0;
        }
    
        .button:active {
            background-color: #bbb;
        }
    
        @keyframes btn-color {
            0% {
                background: white;
            }
    
            50% {
                background: #ddd;
            }
    
            100% {
                background: white;
            }
        }
    
        .loader {
            border: 4px solid #eee;
            border-radius: 50%;
            border-top: 5px solid #2196F3;
            width: 28px;
            height: 28px;
            animation: spin 1.5s linear infinite;
        }
    
        @keyframes spin {
            0% {
                transform: rotate(0deg);
            }
    
            100% {
                transform: rotate(360deg);
            }
        }
    
        .menuDot {
            width: 4px;
            height: 4px;
            background-color: black;
            margin: 4px auto;
            border-radius: 50%;
        }
    
        #menu {
            box-shadow: 0px 0px 3px rgba(0, 0, 0, 1);
            font-family: "Arial";
            font-size: 16px;
        }
    
        #menuSelectLanguage {
            position: fixed;
            height: calc(100% - 20px);
            overflow: scroll;
            box-shadow: 0px 0px 3px rgba(0, 0, 0, 1);
            font-family: "Arial";
            font-size: 16px;
        }
    
        .dropup {
            position: absolute;
            right: 1px;
        }
    
        .dropup-content {
            display: none;
            position: absolute;
            background-color: #f1f1f1;
            width: 250px;
            bottom: 10px;
            right: 0;
            z-index: 1000000001;
        }
    
        .dropup-content a {
            color: black;
            padding: 6px;
            text-decoration: none;
            display: block;
        }
    
        .dropup-content a:hover {background-color: #ccc}
    
        .dropup:hover .dropup-content {
            display: block;
        }
    
        .dropup:hover .dropbtn {
            background-color: #2980B9;
        }
    
        #iconTranslate {
            cursor: pointer;
        }
    
    </style>
    
    <div id='element' style="z-index: 1000000000;position: fixed;left: 0;right: 0;bottom: 0;background-color: white;box-shadow: 0px 0px 4px rgba(0, 0, 0, 1);height: 50px;user-select: none;">
    <div style="display:flex; align-items: center; margin: 0 auto; vertical-align: middle; padding-left: 10px">
        <img id="iconTranslate" style="max-width: 38px; max-height: 38px;">
        <button id="btnOriginal" class="item button" style="color: #2196F3" data-i18n="btnMobileOriginal">Original</button>
        <button id="btnTranslate" class="item button" data-i18n="lblTranslated">Translated</button>
        <button id="spin" class="item button" style="display: none">
            <div class="loader button" style="margin: 0 auto;"></div>
        </button>
        <button id="btnMenu" class="item2" style="width: 50px; max-width: 50px">
            <div class="dropup">
                <div id="menu" class="dropup-content">
                    <a id="btnChangeLanguages" data-i18n="btnChangeLanguages">Change languages</a>
                    <a id="btnNeverTranslate" data-i18n="btnNeverTranslate">Never translate this site</a>
                    <a id="neverTranslateThisLanguage" data-i18n="btnNeverTranslateThisLanguage" display="none">Never translate this language</a>
                    <a id="btnMoreOptions" data-i18n="btnMoreOptions">More options</a>
                    <a id="btnDonate" data-i18n="btnDonate" href="https://www.patreon.com/filipeps" target="_blank" rel="noopener noreferrer">Donate</a>
                </div>
            </div>
            <div class="dropup">
                <div id="menuSelectLanguage" class="dropup-content"></div>
            </div>
            <div class="menuDot"></div>
            <div class="menuDot"></div>
            <div class="menuDot"></div>
        </button>
        <button id="btnClose" class="item" style="width: 40px; max-width: 40px">&times;</button>
    </div>
    </div>
    `

    let originalPageLanguage = "und"
    let currentTargetLanguage = twpConfig.get("targetLanguages")[0]
    let currentPageTranslatorService = twpConfig.get("pageTranslatorService")
    let translateThisSite = twpConfig.get("neverTranslateSites").indexOf(location.hostname) === -1
    let translateThisLanguage = false
    let showPopupMobile = twpConfig.get("showPopupMobile")

    twpConfig.onChanged(function (name, newValue) {
        switch (name) {
            case "neverTranslateSites":
                translateThisSite = newValue.indexOf(location.hostname) === -1
                popupMobile.show()
                break
            case "neverTranslateLangs":
                translateThisLanguage = originalPageLanguage === "und" || (currentTargetLanguage !== originalPageLanguage && newValue.indexOf(originalPageLanguage) === -1)
                popupMobile.show()
                break
            case "showPopupMobile":
                showPopupMobile = newValue
                popupMobile.show()
                break
        }
    })

    let divElement
    let getElemById

    function hideMenu(e) {
        if (!divElement) return;
        if (e.target === divElement) return;

        getElemById("menuSelectLanguage").style.display = "none"
        getElemById("menu").style.display = "none"
    }

    popupMobile.show = function (forceShow=false) {
        popupMobile.hide()

        if (!forceShow && (!translateThisSite || !translateThisLanguage || showPopupMobile !== "yes")) return;

        divElement = document.createElement("div")
        divElement.style = "all: initial"
        divElement.classList.add("notranslate")

        const shadowRoot = divElement.attachShadow({mode: "closed"})
        shadowRoot.innerHTML = htmlMobile

        document.body.appendChild(divElement)

        chrome.i18n.translateDocument(shadowRoot)

        function enableDarkMode() {
            if (!shadowRoot.getElementById("darkModeElement")) {
                const el = document.createElement("style")
                el.setAttribute("id", "darkModeElement")
                el.setAttribute("rel", "stylesheet")
                el.textContent = `
                div, button, select, option {
                    color: rgb(231, 230, 228);
                    background-color: #181a1b !important;
                }
            
                a {
                    color: rgb(231, 230, 228) !important;
                    background-color: #181a1b;
                }
            
                .dropup-content a:hover {
                    background-color: #454a4d;
                }
            
                .menuDot {
                    background-color: rgb(231, 230, 228) !important;
                }
                `
                shadowRoot.appendChild(el)
            }
        }
        
        function disableDarkMode() {
            if (shadowRoot.getElementById("#darkModeElement")) {
                shadowRoot.getElementById("#darkModeElement").remove()
            }
        }
        
        switch(twpConfig.get("darkMode")) {
            case "auto":
                if (matchMedia("(prefers-color-scheme: dark)").matches) {
                    enableDarkMode()
                } else {
                    disableDarkMode()
                }
                break
            case "yes":
                enableDarkMode()
                break
            case "no":
                disableDarkMode()
                break
            default:
                break
        }

        getElemById = shadowRoot.getElementById.bind(shadowRoot)

        function translatePage(targetLanguage=currentTargetLanguage) {
            getElemById("menuSelectLanguage").style.display = "none"
            getElemById("menu").style.display = "none"

            if (targetLanguage !== currentTargetLanguage) {
                twpConfig.setTargetLanguage(currentTargetLanguage)
            }
            pageTranslator.translatePage(targetLanguage)
 
            getElemById("btnOriginal").style.color = null
            getElemById("btnTranslate").style.color = "#2196F3"
        }

        // fill language list
        ;(function() {
            let uilanguage = chrome.i18n.getUILanguage()
            uilanguage = twpLang.fixLanguageCode(uilanguage)

            let langs = twpLang.languages[uilanguage]
            if (!langs) {
                langs = twpLang.languages["en"]
            }

            const langsSorted = []

            for (const i in langs) {
                langsSorted.push([i, langs[i]])
            }

            langsSorted.sort(function(a, b) {
                return a[1].localeCompare(b[1]);
            })

            const menuSelectLanguage = getElemById("menuSelectLanguage")
            langsSorted.forEach(value => {
                if (value[0] === "zh" || value[0] === "un" || value[0] === "und") return;
                const a = document.createElement("a")
                a.setAttribute("value", value[0])
                a.textContent = value[1]
                a.addEventListener("click", e => {
                    e.stopPropagation()
                    translatePage(value[0])
                })
                menuSelectLanguage.appendChild(a)
            })
        })()

        function updateIcon() {
            if (!getElemById) return;

            if (currentPageTranslatorService === "yandex") {
                getElemById("iconTranslate").src = chrome.runtime.getURL("/icons/yandex-translate-32.png")
            } else {
                getElemById("iconTranslate").src = chrome.runtime.getURL("/icons/google-translate-32.png")
            }
        }
        updateIcon()

        getElemById("iconTranslate").onclick = e => {
            pageTranslator.swapTranslationService()

            currentPageTranslatorService = currentPageTranslatorService === "google" ? "yandex" : "google"
            updateIcon()

            twpConfig.set("pageTranslatorService", currentPageTranslatorService)
        }

        getElemById("btnOriginal").onclick = e => {
            pageTranslator.restorePage()
            if (!getElemById) return;

            getElemById("btnOriginal").style.color = "#2196F3"
            getElemById("btnTranslate").style.color = null
        }

        getElemById("btnTranslate").onclick = e => {
            translatePage()
        }

        getElemById("btnMenu").onclick = e => {
            if (!getElemById) return;
            getElemById("menu").style.display = "block"
            getElemById("menuSelectLanguage").style.display = "none"
        }

        getElemById("btnClose").onclick = e => {
            popupMobile.hide()
        }

        getElemById("btnChangeLanguages").onclick = e => {
            e.stopPropagation()
            if (!getElemById) return;
            getElemById("menuSelectLanguage").style.display = "block"
            getElemById("menu").style.display = "none"
        }

        getElemById("btnNeverTranslate").onclick = e => {
            twpConfig.addSiteToNeverTranslate(location.hostname)
            popupMobile.hide()
        }

        getElemById("neverTranslateThisLanguage").onclick = e => {
            twpConfig.addLangToNeverTranslate(originalPageLanguage)
            popupMobile.hide()
        }

        getElemById("btnMoreOptions").onclick = e => {
            chrome.runtime.sendMessage({action: "openOptionsPage"})
        }

        document.addEventListener("blur", hideMenu)
        document.addEventListener("click", hideMenu)

        getElemById("btnDonate").innerHTML += " &#10084;"
    }

    popupMobile.hide = function () {
        if (!divElement) return;

        divElement.remove()
        divElement = getElemById = null

        document.removeEventListener("blur", hideMenu)
        document.removeEventListener("click", hideMenu)
    }

    if (showPopupMobile !== "no") {
        window.addEventListener("touchstart", (e) => {
            if (e.touches.length == 3) {
                popupMobile.show(true)
            }
        })
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "showPopupMobile") {
            popupMobile.show(true)
        }
    })

    pageTranslator.onGetOriginalPageLanguage(function (pagelanguage) {
        if (true || pagelanguage === "und") {
            const lang = twpLang.checkLanguageCode(document.documentElement.lang)
            if (lang) {
                originalPageLanguage = pagelanguage
            }
        } else {
            originalPageLanguage = pagelanguage
        }
        translateThisLanguage = originalPageLanguage === "und" || (currentTargetLanguage !== originalPageLanguage && twpConfig.get("neverTranslateLangs").indexOf(originalPageLanguage) === -1)
        popupMobile.show()
    })

    /*
    const dpr = 1
    const origInnerWidth = window.innerWidth * window.devicePixelRatio
    console.log(origInnerWidth)
    const el = iframeDiv

    function f() {
        el.style.scale = dpr / window.devicePixelRatio
        el.style.width = ( 100 / (dpr / window.devicePixelRatio) ) + "%"
        el.style.left = "0px"
        el.style.bottom = "0px"

        const eWidth = parseFloat(window.innerWidth)

        const dX = (eWidth * window.devicePixelRatio - eWidth) / 2
        const dY = ((50 * (window.devicePixelRatio)) - 50) / (window.devicePixelRatio * 2)
        console.log({
            scale: dpr / window.devicePixelRatio,
            dpr: dpr,
            devicePixelRatio: devicePixelRatio,
            elWidth: getComputedStyle(el).width,
            dx: dX
        })
        el.style.left = - (origInnerWidth - innerWidth) / 2 + "px"
        el.style.bottom = -dY + "px" 
    }
    let oldwidth = null

    function foo() {
        if (oldwidth) {
            if (oldwidth != window.innerWidth) {
                f()
            }
            oldwidth = window.innerWidth
        } else {
            oldwidth = window.innerWidth
            f()
        }
        requestAnimationFrame(foo)
    }
    requestAnimationFrame(foo)
    //*/
})