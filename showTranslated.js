"use strict";

var showTranslated = {}

twpConfig.onReady(function () {
    if (plataformInfo.isMobile.any) return;

    let originalPageLanguage = "und"
    let currentTargetLanguage = twpConfig.get("targetLanguages")[0]
    let currentPageTranslatorService = twpConfig.get("pageTranslatorService")
    let translateThisSite = twpConfig.get("neverTranslateSites").indexOf(location.hostname) === -1
    let translateThisLanguage = twpConfig.get("neverTranslateLangs").indexOf(originalPageLanguage) === -1
    let showTranslatedTextWhenHovering = twpConfig.get("showTranslatedTextWhenHovering")

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
                showTranslated.enable()
                break
            case "neverTranslateLangs":
                translateThisLanguage = newValue.indexOf(originalPageLanguage) === -1
                showTranslated.enable()
                break
            case "showTranslatedTextWhenHovering":
                showTranslatedTextWhenHovering = newValue
                showTranslated.enable()
                break
        }
    })

    const htmlTagsInlineText = ['#text', 'A', 'ABBR', 'ACRONYM', 'B', 'BDO', 'BIG', 'CITE', 'DFN', 'EM', 'I', 'LABEL', 'Q', 'S', 'SMALL', 'SPAN', 'STRONG', 'SUB', 'SUP', 'U', 'TT', 'VAR']
    const htmlTagsInlineIgnore = ['BR', 'CODE', 'KBD', 'WBR', 'PRE'] // and input if type is submit or button
    const htmlTagsNoTranslate = ['TITLE', 'SCRIPT', 'STYLE', 'TEXTAREA']

    let divElement
    let shadowRoot
    let currentNodeOverMouse
    let timeoutHandler

    const mousePos = {x: 0, y: 0}

    function onMouseMove(e) {
        mousePos.x = e.clientX
        mousePos.y = e.clientY

        if (!divElement) return;
        if (e.target === divElement) return;

        if (e.target === currentNodeOverMouse) return;
        currentNodeOverMouse = e.target

        hideTranslatedText()
        timeoutHandler = setTimeout(translateThisNode, 1200, e.target)
    }

    function onMouseDown(e) {
        if (!divElement) return;
        if (e.target === divElement) return;
        hideTranslatedText()
    }

    function translateThisNode(node) {
        if (!divElement) return;
        hideTranslatedText()
        
        let hasChildNodeBlock = function (node) {
            let foo = function (node) {
                if (htmlTagsInlineText.indexOf(node.nodeName) === -1 && htmlTagsInlineIgnore.indexOf(node.nodeName) === -1) {
                    return true
                }

                for (const child of node.childNodes) {
                    if (foo(child)) {
                        return true
                    }
                }
            }
            for (const child of node.childNodes) {
                if (foo(child)) {
                    return true
                }
            }
        }
        
        if (htmlTagsInlineText.indexOf(node.nodeName) === -1 && htmlTagsInlineIgnore.indexOf(node.nodeName) === -1) {
            if (hasChildNodeBlock(node)) return;
        }

        let text
        if (node.nodeName === "INPUT" || node.nodeName === "TEXTAREA") {
            text = node.placeholder
            if (node.nodeName === "INPUT" && (node.type === "BUTTON" || node.type === "SUBMIT")) {
                text = node.value
                if (!text && node.type === "SUBMIT") {
                    text = "Submit Query"
                }
            }
        } else {
            do {
                if (htmlTagsNoTranslate.indexOf(node.nodeName) !== -1) return;
                if (htmlTagsInlineText.indexOf(node.nodeName) === -1 && htmlTagsInlineIgnore.indexOf(node.nodeName) === -1) {
                    break
                } else {
                    node = node.parentNode
                }
            } while (node && node !== document.body)

            if (!node) return;
            text = node.innerText
        }
        
        if (!text || text.length < 1 || text > 1000) return;

        backgroundTranslateSingleText(currentPageTranslatorService, currentTargetLanguage, text)
        .then(result => {
            if (!divElement) return;
            hideTranslatedText()

            const eTranslatedText = shadowRoot.getElementById("translatedText")
            eTranslatedText.textContent = result
            document.body.appendChild(divElement)

            const height = eTranslatedText.offsetHeight
            let top = mousePos.y + 10
            top = Math.max(0, top)
            top = Math.min(window.innerHeight - height, top)
    
            const width = eTranslatedText.offsetWidth
            let left = parseInt(mousePos.x /*- (width / 2) */)
            left = Math.max(0, left)
            left = Math.min(window.innerWidth - width, left)
    
            eTranslatedText.style.top = top + "px"
            eTranslatedText.style.left = left + "px"
        })
    }

    function hideTranslatedText() {
        if (divElement) {
            divElement.remove()
        }
        clearTimeout(timeoutHandler)
    }

    showTranslated.enable = function () {
        showTranslated.disable()
    
        if (plataformInfo.isMobile.any) return;
        if (showTranslatedTextWhenHovering !== "yes" || !translateThisSite || !translateThisLanguage) return;
        if (divElement) return;

        divElement = document.createElement("div")
        divElement.style = "all: initial"
        divElement.classList.add("notranslate")
        
        shadowRoot = divElement.attachShadow({mode: "closed"})
        shadowRoot.innerHTML = `
            <style>
                #translatedText {
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
                    display: block;
                    opacity: 1;
                }
            </style>
            <div id="translatedText"></div>
        `
        
        window.addEventListener("mousemove", onMouseMove)
        window.addEventListener("mousedown", onMouseDown)

        document.addEventListener("blur", hideTranslatedText)
        document.addEventListener("visibilitychange", hideTranslatedText)
    }

    showTranslated.disable = function () {
        if (divElement) {
            hideTranslatedText()
            divElement.remove()
            divElement = null
            shadowRoot = null
        }

        window.removeEventListener("mousemove", onMouseMove)
        window.removeEventListener("mousedown", onMouseDown)

        document.removeEventListener("blur", hideTranslatedText)
        document.removeEventListener("visibilitychange", hideTranslatedText)
    }

    showTranslated.enable()

    pageTranslator.onGetOriginalPageLanguage(function (pagelanguage) {
        originalPageLanguage = pagelanguage
        translateThisLanguage = twpConfig.get("neverTranslateLangs").indexOf(originalPageLanguage) === -1
        showTranslated.enable()
    })
    
    pageTranslator.onPageLanguageStateChange(pageLanguageState => {
        if (pageLanguageState === "translated") {
            showTranslated.disable()
        } else {
            showTranslated.enable()
        }
    })
})