"use strict";

var translateSelected = {}

twpConfig.onReady(function() {
    let divElement
    let selTextButton
    let selTextTranslated

    let originalPageLanguage = "und"
    let currentTargetLanguage = twpConfig.get("targetLanguages")[0]
    let currentPageTranslatorService = twpConfig.get("pageTranslatorService")
    let translateThisSite = twpConfig.get("neverTranslateSites").indexOf(location.hostname) === -1
    let translateThisLanguage = twpConfig.get("neverTranslateLangs").indexOf(originalPageLanguage) === -1
    let showTranslateSelectedButton = twpConfig.get("showTranslateSelectedButton")

    pageTranslator.onGetOriginalPageLanguage(function (pagelanguage) {
        originalPageLanguage = pagelanguage
        translateThisLanguage = twpConfig.get("neverTranslateLangs").indexOf(originalPageLanguage) === -1
        updateEventListener()
    })

    function init() {
        destroy()

        divElement = document.createElement("div")
        divElement.style = "all: initial"
        divElement.classList.add("notranslate")

        const shadowRoot = divElement.attachShadow({mode: "closed"})
        shadowRoot.innerHTML = `
            <style>
                #selTextTranslated {
                    all: initial;
                    font-family: 'Helvetica', 'Arial', sans-serif;
                    font-style: normal;
                    font-variant: normal;
                    line-height: normal;
                    font-size: 14px;
                    font-weight: 500;

                    z-index: 2147483647;
                    position: fixed;
                    border-radius: 5px;
                    max-width: 280px;
                    max-height: 250px;
                    top: 0px;
                    left: 0px;
                    background-color: white;
                    color: black;
                    border: 1px solid lightGrey;
                    overflow: auto;
                    padding: 16px;
                    visible: true;
                    opacity: 1;
                    display: none;
                }

                #selTextButton {
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
                    visible: true;
                    opacity: 1;
                    display: none;
                }
            </style>
            <div id="selTextButton"></div>
            <div id="selTextTranslated"></div>
        `

        selTextButton = shadowRoot.getElementById("selTextButton")
        selTextTranslated = shadowRoot.getElementById("selTextTranslated")

        document.body.appendChild(divElement)

        if (plataformInfo.isMobile.any) {
            selTextButton.style.width = "30px"
            selTextButton.style.height = "30px"
            document.addEventListener("touchstart", onTouchstart)
        }

        selTextButton.addEventListener("click", onClick)
        document.addEventListener("mousedown", onDown)
    }

    function destroy() {
        if (!divElement) return;

        selTextButton.removeEventListener("click", onClick)
        document.removeEventListener("mousedown", onDown)
        if (plataformInfo.isMobile.any) {
            document.removeEventListener("touchstart", onTouchstart)
        }
        divElement.remove()
        divElement = selTextButton = selTextTranslated = null
    }

    twpConfig.onChanged(function (name, newValue) {
        switch (name) {
            case "pageTranslatorService":
                currentPageTranslatorService = newValue
                break
            case "targetLanguages":
                currentTargetLanguage = newValue
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
        }
    })

    let gSelectionInfo

    function translateSelText() {
        if (gSelectionInfo) {
            backgroundTranslateSingleText(currentPageTranslatorService, currentTargetLanguage, gSelectionInfo.text)
            .then(result => {
                if(!result) return
                init()
                const eTop = gSelectionInfo.bottom
                const eLeft = gSelectionInfo.left

                selTextTranslated.style.top = "0px"
                selTextTranslated.style.left = "0px"
                selTextTranslated.textContent = result
                selTextTranslated.style.display = "block"
    
                const height = parseInt(selTextTranslated.offsetHeight)
                let top = eTop + 5
                top = Math.max(0, top)
                top = Math.min(window.innerHeight - height, top)
    
                const width = parseInt(selTextTranslated.offsetWidth)
                let left = parseInt(eLeft /*- width / 2*/)
                left = Math.max(0, left)
                left = Math.min(window.innerWidth - width, left)
    
                selTextTranslated.style.top = top + "px"
                selTextTranslated.style.left = left + "px"
            })
        }
    }


    function onClick(e) {
        translateSelText()
        selTextButton.style.display = "none"
    }

    function onDown(e) {
        if (e.target != divElement) {
            selTextTranslated.style.display = "none"
            selTextButton.style.display = "none"
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
          /^(?:text|search|password|tel|url)$/i.test(activeEl.type)) &&
          (typeof activeEl.selectionStart == "number")
        ) {
            text = activeEl.value.slice(activeEl.selectionStart, activeEl.selectionEnd);
        } else if (window.getSelection) {
            text = window.getSelection().toString();
        }
        return text;
    }

    function readSelection() {
        const selection = document.getSelection()
        let focusNode = selection.focusNode
        if (!focusNode) return;

        if (focusNode.nodeType == 3) {
            focusNode = selection.getRangeAt(0);
        } else if (focusNode.nodeType != 1) {
            return;
        }
        const rect = focusNode.getBoundingClientRect()
        gSelectionInfo = {
            text: getSelectionText(),
            top: rect.top,
            left: rect.left,
            bottom: rect.bottom,
            right: rect.right
        }
    }

    function onUp(e) {
        if (e.target == divElement) return;

        const clientX = Math.max((typeof e.clientX === 'undefined' ? 0 : e.clientX), (typeof e.changedTouches === 'undefined' ? 0 : e.changedTouches[0].clientX));
        const clientY = Math.max((typeof e.clientY === 'undefined' ? 0 : e.clientY), (typeof e.changedTouches === 'undefined' ? 0 : e.changedTouches[0].clientY));

        if (document.getSelection().toString().trim()) {
            init()
            if (plataformInfo.isMobile.any) {
                selTextButton.style.left = window.innerWidth - 35 + "px"
            } else {
                selTextButton.style.left = clientX + 10 + "px"
            }
            selTextButton.style.top = clientY - 20 + "px"

            selTextButton.style.display = "block"
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
        if (showTranslateSelectedButton == "yes" && translateThisSite && translateThisLanguage) {
            document.addEventListener("mouseup", onMouseup)
            if (plataformInfo.isMobile.any) {
                document.addEventListener("touchend", onTouchend)
                document.addEventListener("selectionchange", onSelectionchange)
            }
        } else {
            document.removeEventListener("mouseup", onMouseup)
            if (plataformInfo.isMobile.any) {
                document.removeEventListener("touchend", onTouchend)
                document.removeEventListener("selectionchange", onSelectionchange)
            }
        }
    }
    updateEventListener()
})