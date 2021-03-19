"use strict";

var showTranslated = {}

twpConfig.onReady(function () {
    if (plataformInfo.isMobile.any) return;

    let pageLanguageState = "original"
    let originalPageLanguage = "und"
    let currentTargetLanguage = twpConfig.get("targetLanguages")[0]
    let currentPageTranslatorService = twpConfig.get("pageTranslatorService")
    let showTranslatedTextWhenHoveringThisSite = twpConfig.get("sitesToTranslateWhenHovering").indexOf(location.hostname) !== -1
    let showTranslatedTextWhenHoveringThisLang = false

    twpConfig.onChanged(function (name, newValue) {
        switch (name) {
            case "pageTranslatorService":
                currentPageTranslatorService = newValue
                break
            case "targetLanguages":
                currentTargetLanguage = newValue[0]
                break
            case "sitesToTranslateWhenHovering":
                showTranslatedTextWhenHoveringThisSite = newValue.indexOf(location.hostname) !== -1
                showTranslated.enable()
                break
            case "langsToTranslateWhenHovering":
                showTranslatedTextWhenHoveringThisLang = newValue.indexOf(originalPageLanguage) !== -1
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
    
        if (pageLanguageState == "translated") return;
        if (plataformInfo.isMobile.any) return;
        if (!showTranslatedTextWhenHoveringThisSite && !showTranslatedTextWhenHoveringThisLang) return;
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
                    border: 1px solid grey;
                    overflow: auto;
                    padding: 16px;
                    visible: true;
                    display: block;
                    opacity: 1;
                }
            </style>
            <div id="translatedText"></div>
        `

        function enableDarkMode() {
            if (!shadowRoot.getElementById("darkModeElement")) {
                const el = document.createElement("style")
                el.setAttribute("id", "darkModeElement")
                el.setAttribute("rel", "stylesheet")
                el.textContent = `
                    * {
                        scrollbar-color: #202324 #454a4d;
                    }
                    #translatedText {
                        color: rgb(231, 230, 228) !important;
                        background-color: #181a1b !important;
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

    pageTranslator.onGetOriginalPageLanguage(function (pagelanguage) {
        originalPageLanguage = pagelanguage
        showTranslatedTextWhenHoveringThisLang = twpConfig.get("langsToTranslateWhenHovering").indexOf(originalPageLanguage) !== -1
        showTranslated.enable()
    })
    
    pageTranslator.onPageLanguageStateChange(_pageLanguageState => {
        pageLanguageState = _pageLanguageState
        showTranslated.enable()
    })
})