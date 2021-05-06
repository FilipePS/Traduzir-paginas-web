"use strict";

//TODO desativar o botão caso a pagina esteja traduzida

var translateSelected = {}

twpConfig.onReady(function() {
    let divElement
    let eButtonTransSelText
    let eDivResult
    let eSelTextTrans
    let eOrigText
    let eOrigTextDiv

    let originalPageLanguage = "und"
    let currentTargetLanguages = twpConfig.get("targetLanguages")
    let currentTargetLanguage = twpConfig.get("targetLanguage")
    let currentTextTranslatorService = twpConfig.get("textTranslatorService")
    let awaysTranslateThisSite = twpConfig.get("alwaysTranslateSites").indexOf(location.hostname) !== -1
    let translateThisSite = twpConfig.get("neverTranslateSites").indexOf(location.hostname) === -1
    let translateThisLanguage = twpConfig.get("neverTranslateLangs").indexOf(originalPageLanguage) === -1
    let showTranslateSelectedButton = twpConfig.get("showTranslateSelectedButton")
    let dontShowIfPageLangIsTargetLang = twpConfig.get("dontShowIfPageLangIsTargetLang")
    let dontShowIfPageLangIsUnknown = twpConfig.get("dontShowIfPageLangIsUnknown")
    let dontShowIfSelectedTextIsTargetLang = twpConfig.get("dontShowIfSelectedTextIsTargetLang")
    let dontShowIfSelectedTextIsUnknown = twpConfig.get("dontShowIfSelectedTextIsUnknown")

    pageTranslator.onGetOriginalPageLanguage(function (pagelanguage) {
        originalPageLanguage = pagelanguage
        translateThisLanguage = twpConfig.get("neverTranslateLangs").indexOf(originalPageLanguage) === -1
        updateEventListener()
    })

    async function detectTextLanguage(text) {
        if (!chrome.i18n.detectLanguage) return "und"

        return await new Promise(resolve => {
          chrome.i18n.detectLanguage(text, result => {
            if (!result) return resolve("und")

            for (const langInfo of result.languages) {
              const langCode = twpLang.checkLanguageCode(langInfo.language)
              if (langCode) {
                return resolve(langCode)
              }
            }
            
            return resolve("und")
          })
        })
    }

    let audioDataUrls = null
    let isPlayingAudio = false
    function stopAudio() {
        if (isPlayingAudio) {
            chrome.runtime.sendMessage({action: "stopAudio"})
        }
        isPlayingAudio = false 
    }

    function dragElement(elmnt, elmnt2) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        if (elmnt2) {
            elmnt2.addEventListener("mousedown", dragMouseDown);
        } else {
            elmnt.addEventListener("mousedown", dragMouseDown);
        }
      
        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            // get the mouse cursor position at startup:
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.addEventListener("mouseup", closeDragElement);
            // call a function whenever the cursor moves:
            document.addEventListener("mousemove", elementDrag);
        }
      
        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // calculate the new cursor position:
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // set the element's new position:
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }
      
        function closeDragElement() {
            // stop moving when mouse button is released:
            document.removeEventListener("mouseup", closeDragElement);
            document.removeEventListener("mousemove", elementDrag);
        }
    }

    function setCaretAtEnd() {
        const el = eOrigText
        const range = document.createRange()
        const sel = window.getSelection()
        range.setStart(el, 1)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
        el.focus()
    }

    function init() {
        destroy()

        divElement = document.createElement("div")
        divElement.style = "all: initial"
        divElement.classList.add("notranslate")

        const shadowRoot = divElement.attachShadow({mode: "closed"})
        shadowRoot.innerHTML = `
            <style>
                #eDivResult {
                    all: initial;
                    font-family: 'Helvetica', 'Arial', sans-serif;
                    font-style: normal;
                    font-variant: normal;
                    line-height: normal;
                    font-size: 12px;
                    font-weight: 500;

                    z-index: 2147483647;
                    position: fixed;
                    border-radius: 5px;
                    top: 0px;
                    left: 0px;
                    background-color: white;
                    color: black;
                    border: 1px solid grey;
                    visibility: visible;
                    opacity: 1;
                    display: none;
                }

                #eSelTextTrans, #eOrigText {
                    padding: 14px;
                    font-size: 16px;
                    max-width: 360px;
                    max-height: 260px;
                    overflow: auto;
                    white-space: pre-wrap;
                }

                #eOrigText {
                    outline: none;
                }

                #eButtonTransSelText {
                    all: initial;
                    z-index: 2147483647;
                    position: fixed;
                    background-repeat: no-repeat;
                    background-size: cover;
                    background-image: url(${chrome.runtime.getURL("/icons/google-translate-32.png")});
                    width: 22px;
                    height: 22px;
                    top: 0px;
                    left: 0px;
                    cursor: pointer;
                    visibility: visible;
                    opacity: 1;
                    display: none;
                }

                ul {
                    margin: 0px;
                    padding: 3px;
                    list-style-type: none;
                    overflow: hidden;
                    user-select: none;
                }

                li {
                    margin: 3px;
                    float: left;
                    cursor: pointer;
                    text-align: center;
                    padding: 4px 6px;
                    border-radius: 6px;
                    box-shadow: 0 0 2px 0px #999;
                }

                li:hover {
                    background-color: #ccc;
                }

                #moreOrLess {
                    margin: 6px;
                    cursor: pointer;
                    text-align: center;
                    padding: 4px 6px;
                    border-radius: 6px;
                    box-shadow: 0 0 2px 0px #999;
                    max-height: 16px;
                }

                #moreOrLess:hover {
                    background-color: #ccc;
                }

                hr {
                    border: 1px solid #ddd;
                }

                .selected {
                    background-color: #ccc;
                }

                .arrow {
                    border: solid black;
                    border-width: 0 1px 1px 0;
                    display: inline-block;
                    padding: 3px;
                }
                
                .up {
                    transform: rotate(-135deg) translate(-5px, -5px);
                }
                
                .down {
                    transform: rotate(45deg) translate(2px, 2px);
                }
            </style>
            <div id="eButtonTransSelText"></div>
            <div id="eDivResult">
                <div id="eOrigTextDiv" style="display: none">
                    <div id="eOrigText" contentEditable="true"></div>
                    <hr>
                </div>
                <div id="eSelTextTrans"></div>
                <hr>
                <div style="display: flex; justify-content: space-between; flex-direction:row;" id="drag">
                    <ul id="setTargetLanguage">
                        <li value="en" title="English">en</li>
                        <li value="es" title="Spanish">es</li>
                        <li value="de" title="German">de</li>
                    </ul>
                    <div id="moreOrLess" style="margin-left: 10px; margin-right: 10px"><i class="arrow up" id="more"></i><i class="arrow down" id="less" style="display: none"></i></div>
                    <ul>
                        <li title="Google" id="sGoogle">g</li>
                        <li title="Yandex" id="sYandex">y</li>
                        <li title="DeepL" id="sDeepL" hidden>d</li>
                        <li style="padding-top: 6px; padding-bottom: 2px;" title="Listen" data-i18n-title="btnListen" id="listen">
                            <svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                            width="14px" height="12px" viewBox="0 0 93.038 93.038" style="enable-background:new 0 0 93.038 93.038;"
                            xml:space="preserve">
                            <g>
                                <path d="M46.547,75.521c0,1.639-0.947,3.128-2.429,3.823c-0.573,0.271-1.187,0.402-1.797,0.402c-0.966,0-1.923-0.332-2.696-0.973
                                    l-23.098-19.14H4.225C1.892,59.635,0,57.742,0,55.409V38.576c0-2.334,1.892-4.226,4.225-4.226h12.303l23.098-19.14
                                    c1.262-1.046,3.012-1.269,4.493-0.569c1.481,0.695,2.429,2.185,2.429,3.823L46.547,75.521L46.547,75.521z M62.784,68.919
                                    c-0.103,0.007-0.202,0.011-0.304,0.011c-1.116,0-2.192-0.441-2.987-1.237l-0.565-0.567c-1.482-1.479-1.656-3.822-0.408-5.504
                                    c3.164-4.266,4.834-9.323,4.834-14.628c0-5.706-1.896-11.058-5.484-15.478c-1.366-1.68-1.24-4.12,0.291-5.65l0.564-0.565
                                    c0.844-0.844,1.975-1.304,3.199-1.231c1.192,0.06,2.305,0.621,3.061,1.545c4.977,6.09,7.606,13.484,7.606,21.38
                                    c0,7.354-2.325,14.354-6.725,20.24C65.131,68.216,64.007,68.832,62.784,68.919z M80.252,81.976
                                    c-0.764,0.903-1.869,1.445-3.052,1.495c-0.058,0.002-0.117,0.004-0.177,0.004c-1.119,0-2.193-0.442-2.988-1.237l-0.555-0.555
                                    c-1.551-1.55-1.656-4.029-0.246-5.707c6.814-8.104,10.568-18.396,10.568-28.982c0-11.011-4.019-21.611-11.314-29.847
                                    c-1.479-1.672-1.404-4.203,0.17-5.783l0.554-0.555c0.822-0.826,1.89-1.281,3.115-1.242c1.163,0.033,2.263,0.547,3.036,1.417
                                    c8.818,9.928,13.675,22.718,13.675,36.01C93.04,59.783,88.499,72.207,80.252,81.976z"/>
                            </g>
                            <g>
                            </g>
                            <g>
                            </g>
                            <g>
                            </g>
                            <g>
                            </g>
                            <g>
                            </g>
                            <g>
                            </g>
                            <g>
                            </g>
                            <g>
                            </g>
                            <g>
                            </g>
                            <g>
                            </g>
                            <g>
                            </g>
                            <g>
                            </g>
                            <g>
                            </g>
                            <g>
                            </g>
                            <g>
                            </g>
                            </svg>
                        </li>
                    </ul>
                </div>
            </div>
        `

        dragElement(shadowRoot.getElementById("eDivResult"), shadowRoot.getElementById("drag"))

        function enableDarkMode() {
            if (!shadowRoot.getElementById("darkModeElement")) {
                const el = document.createElement("style")
                el.setAttribute("id", "darkModeElement")
                el.setAttribute("rel", "stylesheet")
                el.textContent = `
                    * {
                        scrollbar-color: #202324 #454a4d;
                    }
                    #eDivResult {
                        color: rgb(231, 230, 228) !important;
                        background-color: #181a1b !important;
                    }
                    hr {
                        border-color: #666;
                    }
                    li:hover {
                        color: rgb(231, 230, 228) !important;
                        background-color: #454a4d !important;
                    }
                    .selected {
                        background-color: #454a4d !important;
                    }
                `
                shadowRoot.appendChild(el)
                shadowRoot.querySelector("#listen svg").style = "fill: rgb(231, 230, 228)"
            }
        }
        
        function disableDarkMode() {
            if (shadowRoot.getElementById("#darkModeElement")) {
                shadowRoot.getElementById("#darkModeElement").remove()
                shadowRoot.querySelector("#listen svg").style = "fill: black"
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

        eButtonTransSelText = shadowRoot.getElementById("eButtonTransSelText")
        eDivResult = shadowRoot.getElementById("eDivResult")
        eSelTextTrans = shadowRoot.getElementById("eSelTextTrans")
        eOrigText = shadowRoot.getElementById("eOrigText")
        eOrigTextDiv = shadowRoot.getElementById("eOrigTextDiv")

        const eMoreOrLess = shadowRoot.getElementById("moreOrLess")
        const eMore = shadowRoot.getElementById("more")
        const eLess = shadowRoot.getElementById("less")
        
        const sGoogle = shadowRoot.getElementById("sGoogle")
        const sYandex = shadowRoot.getElementById("sYandex")
        const sDeepL = shadowRoot.getElementById("sDeepL")

        let translateNewInputTimerHandler
        eOrigText.oninput = () => {
            clearTimeout(translateNewInputTimerHandler)
            translateNewInputTimerHandler = setTimeout(translateNewInput, 1000)
        }

        eMoreOrLess.onclick = () => {
            if (twpConfig.get("expandPanelTranslateSelectedText") === "no") {
                twpConfig.set("expandPanelTranslateSelectedText", "yes")
            } else {
                twpConfig.set("expandPanelTranslateSelectedText", "no")
            }

            setCaretAtEnd()
        }

        sGoogle.onclick = () => {
            currentTextTranslatorService = "google"
            twpConfig.set("textTranslatorService", "google")
            translateNewInput()

            sGoogle.classList.remove("selected")
            sYandex.classList.remove("selected")
            sDeepL.classList.remove("selected")

            sGoogle.classList.add("selected")
        }
        sYandex.onclick = () => {
            currentTextTranslatorService = "yandex"
            twpConfig.set("textTranslatorService", "yandex")
            translateNewInput()

            sGoogle.classList.remove("selected")
            sYandex.classList.remove("selected")
            sDeepL.classList.remove("selected")

            sYandex.classList.add("selected")
        }
        sDeepL.onclick = () => {
            currentTextTranslatorService = "deepl"
            twpConfig.set("textTranslatorService", "deepl")
            translateNewInput()

            sGoogle.classList.remove("selected")
            sYandex.classList.remove("selected")
            sDeepL.classList.remove("selected")

            sDeepL.classList.add("selected")
        }

        const setTargetLanguage = shadowRoot.getElementById("setTargetLanguage")
        setTargetLanguage.onclick = e => {
            if (e.target.getAttribute("value")) {
                const langCode = twpLang.checkLanguageCode(e.target.getAttribute("value"))
                if (langCode) {
                    currentTargetLanguage = langCode
                    translateNewInput()
                }

                shadowRoot.querySelectorAll("#setTargetLanguage li").forEach(li => {
                    li.classList.remove("selected")
                })
    
                e.target.classList.add("selected")
            }
        }

        const eListen = shadowRoot.getElementById("listen")
        eListen.onclick = () => {
            const msgListen = chrome.i18n.getMessage("btnListen") ? chrome.i18n.getMessage("btnListen") : "Listen"
            const msgStopListening = chrome.i18n.getMessage("btnStopListening") ? chrome.i18n.getMessage("btnStopListening") : "Stop listening"

            eListen.classList.remove("selected")
            eListen.setAttribute("title", msgStopListening)

            if (audioDataUrls) {
                if (isPlayingAudio) {
                    stopAudio()
                    eListen.setAttribute("title", msgListen)
                } else {
                    isPlayingAudio = true
                    chrome.runtime.sendMessage({action: "playAudio", audioDataUrls}, () => {
                        eListen.classList.remove("selected")
                        eListen.setAttribute("title", msgListen)
                    })
                    eListen.classList.add("selected")
                }
            } else {
                stopAudio()
                isPlayingAudio = true
                chrome.runtime.sendMessage({action: "textToSpeech", text: eSelTextTrans.textContent, targetLanguage: currentTargetLanguage}, result => {
                    if (!result) return;

                    audioDataUrls = result
                    chrome.runtime.sendMessage({action: "playAudio", audioDataUrls}, () => {
                        isPlayingAudio = false
                        eListen.classList.remove("selected")
                        eListen.setAttribute("title", msgListen)
                    })
                })
                eListen.classList.add("selected")
            }
        }

        document.body.appendChild(divElement)

        chrome.i18n.translateDocument(shadowRoot)

        if (plataformInfo.isMobile.any) {
            eButtonTransSelText.style.width = "30px"
            eButtonTransSelText.style.height = "30px"
            document.addEventListener("touchstart", onTouchstart)
        }

        eButtonTransSelText.addEventListener("click", onClick)
        document.addEventListener("mousedown", onDown)

        const targetLanguageButtons = shadowRoot.querySelectorAll("#setTargetLanguage li")

        for (let i = 0; i < 3; i++) {
            if (currentTargetLanguages[i] == currentTargetLanguage) {
                targetLanguageButtons[i].classList.add("selected")
            }
            targetLanguageButtons[i].textContent = currentTargetLanguages[i]
            targetLanguageButtons[i].setAttribute("value", currentTargetLanguages[i])
            targetLanguageButtons[i].setAttribute("title", twpLang.codeToLanguage(currentTargetLanguages[i]))
        }

        if (currentTextTranslatorService === "yandex") {
            sYandex.classList.add("selected")
        } else if (currentTextTranslatorService == "deepl") {
            sDeepL.classList.add("selected")
        } else {
            sGoogle.classList.add("selected")
        }

        if (twpConfig.get("enableDeepL") === "yes") {
            sDeepL.removeAttribute("hidden")
        } else {
            sDeepL.setAttribute("hidden", "")
        }
        if (twpConfig.get("expandPanelTranslateSelectedText") === "yes") {
            eOrigTextDiv.style.display = "block"
            eMore.style.display = "none"
            eLess.style.display = "block"
            const text = chrome.i18n.getMessage("less")
            eMoreOrLess.setAttribute("title", text ? text : "Less")
        } else {
            eOrigTextDiv.style.display = "none"
            eMore.style.display = "block"
            eLess.style.display = "none"
            const text = chrome.i18n.getMessage("more")
            eMoreOrLess.setAttribute("title", text ? text : "More")
        }
        twpConfig.onChanged((name, newvalue) => {
            switch (name) {
                case "enableDeepL":
                    if (newvalue === "yes") {
                        sDeepL.removeAttribute("hidden")
                    } else {
                        sDeepL.setAttribute("hidden", "")
                    }
                    break
                case "expandPanelTranslateSelectedText":
                    if (newvalue === "yes") {
                        eOrigTextDiv.style.display = "block"
                        eMore.style.display = "none"
                        eLess.style.display = "block"
                        const text = chrome.i18n.getMessage("less")
                        eMoreOrLess.setAttribute("title", text ? text : "Less")
                    } else {
                        eOrigTextDiv.style.display = "none"
                        eMore.style.display = "block"
                        eLess.style.display = "none"
                        const text = chrome.i18n.getMessage("more")
                        eMoreOrLess.setAttribute("title", text ? text : "More")
                    }
                    break
            }
        })
    }

    function destroy() {
        stopAudio()
        audioDataUrls = null
        if (!divElement) return;

        eButtonTransSelText.removeEventListener("click", onClick)
        document.removeEventListener("mousedown", onDown)
        if (plataformInfo.isMobile.any) {
            document.removeEventListener("touchstart", onTouchstart)
        }
        divElement.remove()
        divElement = eButtonTransSelText = eDivResult = null
    }

    twpConfig.onChanged(function (name, newValue) {
        switch (name) {
            case "textTranslatorService":
                currentTextTranslatorService = newValue
                break
            case "targetLanguages":
                currentTargetLanguages = newValue
                break
            case "targetLanguage":
                currentTargetLanguage = newValue
                break
            case "alwaysTranslateSites":
                awaysTranslateThisSite = newValue.indexOf(location.hostname) !== -1
                updateEventListener()
                break    
            case "neverTranslateSites":
                translateThisSite = newValue.indexOf(location.hostname) === -1
                updateEventListener() 
                break
            case "neverTranslateLangs":
                translateThisLanguage = newValue.indexOf(originalPageLanguage) === -1
                updateEventListener()
                break
            case "showTranslateSelectedButton":
                showTranslateSelectedButton = newValue
                updateEventListener()
                break
            case "dontShowIfPageLangIsTargetLang":
                dontShowIfPageLangIsTargetLang = newValue
                updateEventListener()
                break
            case "dontShowIfPageLangIsUnknown":
                dontShowIfPageLangIsUnknown = newValue
                updateEventListener()
                break
            case "dontShowIfSelectedTextIsTargetLang":
                dontShowIfSelectedTextIsTargetLang = newValue
                break
            case "dontShowIfSelectedTextIsUnknown":
                dontShowIfSelectedTextIsUnknown = newValue
                break
        }
    })

    function translateNewInput(isNewSelection=false) {
        stopAudio()
        audioDataUrls = null

        backgroundTranslateSingleText(currentTextTranslatorService, currentTargetLanguage, eOrigText.textContent)
        .then(result => {
            if (isNewSelection) {
                init()
            }
            const eTop = prevSelectionInfo.bottom
            const eLeft = prevSelectionInfo.left

            eDivResult.style.top = "0px"
            eDivResult.style.left = "0px"
            eSelTextTrans.textContent = result
            eDivResult.style.display = "block"
            if (isNewSelection) {
                eOrigText.textContent = prevSelectionInfo.text
                setCaretAtEnd()
            }

            const height = parseInt(eDivResult.offsetHeight)
            let top = eTop + 5
            top = Math.max(0, top)
            top = Math.min(window.innerHeight - height, top)

            const width = parseInt(eDivResult.offsetWidth)
            let left = parseInt(eLeft /*- width / 2*/)
            left = Math.max(0, left)
            left = Math.min(window.innerWidth - width, left)

            eDivResult.style.top = top + "px"
            eDivResult.style.left = left + "px"
        })
    }

    let gSelectionInfo
    let prevSelectionInfo

    function translateSelText(usePrevSelectionInfo=false) {
        if (!usePrevSelectionInfo && gSelectionInfo) {
            prevSelectionInfo = gSelectionInfo
        } else if (!(usePrevSelectionInfo && prevSelectionInfo)) {
            return
        }

        eOrigText.textContent = prevSelectionInfo.text

        translateNewInput(true)
    }


    function onClick(e) {
        translateSelText()
        eButtonTransSelText.style.display = "none"
    }

    function onDown(e) {
        if (e.target != divElement) {
            eDivResult.style.display = "none"
            eButtonTransSelText.style.display = "none"
            destroy()
        }
    }
    

    let isTouchSelection = false
    function onTouchstart (e) {
        isTouchSelection = true
        onDown(e)
    }

    function getSelectionText() {
        let text = "";
        const activeEl = document.activeElement;
        const activeElTagName = activeEl ? activeEl.tagName.toLowerCase() : null;
        if (
          (activeElTagName == "textarea") || (activeElTagName == "input" &&
          /^(?:text|search)$/i.test(activeEl.type)) &&
          (typeof activeEl.selectionStart == "number")
        ) {
            text = activeEl.value.slice(activeEl.selectionStart, activeEl.selectionEnd);
        } else if (window.getSelection) {
            text = window.getSelection().toString();
        }
        return text;
    }

    function readSelection() {
        gSelectionInfo = null

        const activeEl = document.activeElement;
        const activeElTagName = activeEl ? activeEl.tagName.toLowerCase() : null;
        if (
          (activeElTagName == "textarea") || (activeElTagName == "input" &&
          /^(?:text|search)$/i.test(activeEl.type)) &&
          (typeof activeEl.selectionStart == "number")
        ) {
            const text = activeEl.value.slice(activeEl.selectionStart, activeEl.selectionEnd);
            const rect = activeEl.getBoundingClientRect()
            gSelectionInfo = {
                text: text,
                top: rect.top,
                left: rect.left,
                bottom: rect.bottom,
                right: rect.right
            }
        } else if (window.getSelection) {
            const selection = window.getSelection()

            const text = selection.toString();
            const rect = selection.getRangeAt(0).getBoundingClientRect()
            gSelectionInfo = {
                text: text,
                top: rect.top,
                left: rect.left,
                bottom: rect.bottom,
                right: rect.right
            }
        }
    }

    async function onUp(e) {
        if (e.target == divElement) return;

        const clientX = Math.max((typeof e.clientX === 'undefined' ? 0 : e.clientX), (typeof e.changedTouches === 'undefined' ? 0 : e.changedTouches[0].clientX));
        const clientY = Math.max((typeof e.clientY === 'undefined' ? 0 : e.clientY), (typeof e.changedTouches === 'undefined' ? 0 : e.changedTouches[0].clientY));

        const selectedText = getSelectionText().trim()
        if (!selectedText || selectedText.length < 1) return;
        let detectedLanguage = await detectTextLanguage(selectedText)
        if (!detectedLanguage) detectedLanguage = "und";

        if (((dontShowIfSelectedTextIsTargetLang == "yes" && detectedLanguage !== currentTargetLanguage) || dontShowIfSelectedTextIsTargetLang != "yes")
        && ((dontShowIfSelectedTextIsUnknown == "yes" && detectedLanguage !== "und") || dontShowIfSelectedTextIsUnknown != "yes")
        ) {
            init()
            if (plataformInfo.isMobile.any) {
                eButtonTransSelText.style.left = window.innerWidth - 45 + "px"
                eButtonTransSelText.style.top = clientY + "px"
            } else {
                eButtonTransSelText.style.left = clientX + 20 + "px"
                eButtonTransSelText.style.top = clientY - 30 + "px"
            }

            eButtonTransSelText.style.display = "block"
        }
    }
    
    function onMouseup(e) {
        if (e.button != 0) return;
        if (e.target == divElement) return;
        readSelection()
        setTimeout(()=>onUp(e), 120)
    }

    function onTouchend(e) {
        if (e.target == divElement) return;
        readSelection()
        setTimeout(()=>onUp(e), 120)
    }

    function onSelectionchange(e) {
        if (isTouchSelection) {
            readSelection()
        }
    }

    function updateEventListener() {
        if (showTranslateSelectedButton == "yes" && (awaysTranslateThisSite || (translateThisSite && translateThisLanguage))
        && ((dontShowIfPageLangIsTargetLang == "yes" && originalPageLanguage !== currentTargetLanguage) || dontShowIfPageLangIsTargetLang != "yes")
        && ((dontShowIfPageLangIsUnknown == "yes" && originalPageLanguage !== "und") || dontShowIfPageLangIsUnknown != "yes")
        ) {
            document.addEventListener("mouseup", onMouseup)

            document.addEventListener("blur", destroy)
            document.addEventListener("visibilitychange", destroy)

            if (plataformInfo.isMobile.any) {
                document.addEventListener("touchend", onTouchend)
                document.addEventListener("selectionchange", onSelectionchange)
            }
        } else {
            document.removeEventListener("mouseup", onMouseup)

            document.removeEventListener("blur", destroy)
            document.removeEventListener("visibilitychange", destroy)

            if (plataformInfo.isMobile.any) {
                document.removeEventListener("touchend", onTouchend)
                document.removeEventListener("selectionchange", onSelectionchange)
            }
        }
    }
    updateEventListener()

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "TranslateSelectedText") {
            readSelection()
            translateSelText()
        }
    })
})