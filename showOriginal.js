"use strict";

//TODO mostrar o texto original apenas da frase sobre o mouse

var showOriginal = {}

{
    let originalTextIsShowing = false
    let divElement
    let shadowRoot
    let currentNodeOverMouse
    let timeoutHandler

    let nodesToShowOriginal = []

    const mousePos = {x: 0, y: 0}
    function onMouseMove(e) {
        mousePos.x = e.clientX
        mousePos.y = e.clientY
    }

    function onMouseDown(e) {
        if (!divElement) return;
        if (e.target === divElement) return;
        hideOriginalText()
    }

    function showOriginalText(node) {
        if (!divElement) return;
        hideOriginalText()

        const nodeInf = nodesToShowOriginal.find(nodeInf => nodeInf.node === node)
        if (nodeInf) {
            const eOriginalText = shadowRoot.getElementById("originalText")
            eOriginalText.textContent = nodeInf.original
            document.body.appendChild(divElement)
            originalTextIsShowing = true

            const height = eOriginalText.offsetHeight
            let top = mousePos.y + 10
            top = Math.max(0, top)
            top = Math.min(window.innerHeight - height, top)
    
            const width = eOriginalText.offsetWidth
            let left = parseInt(mousePos.x /*- (width / 2) */)
            left = Math.max(0, left)
            left = Math.min(window.innerWidth - width, left)
    
            eOriginalText.style.top = top + "px"
            eOriginalText.style.left = left + "px"
        }
    }

    function hideOriginalText() {
        if (divElement) {
            divElement.remove()
            originalTextIsShowing = false
        }
    }

    function isShowingOriginalText() {
        return originalTextIsShowing
    }

    function onMouseEnter(e) {
        if (!divElement) return;
        if (currentNodeOverMouse && e.target === currentNodeOverMouse) return;
        currentNodeOverMouse = e.target
        if (timeoutHandler) clearTimeout(timeoutHandler);
        timeoutHandler = setTimeout(showOriginalText, 1500, currentNodeOverMouse)
    }

    function onMouseOut(e) {
        if (!divElement) return;
        if (!isShowingOriginalText()) return;
        
        if (e.target === currentNodeOverMouse && e.relatedTarget === divElement) return;
        if (e.target === divElement && e.relatedTarget === currentNodeOverMouse) return;

        currentNodeOverMouse = null
        if (timeoutHandler) clearTimeout(timeoutHandler);
        hideOriginalText()
    }

    showOriginal.add = function (node) {
        if (plataformInfo.isMobile.any) return;

        if (node && nodesToShowOriginal.indexOf(node) === -1) {
            nodesToShowOriginal.push({node: node, original: node.textContent})
            node.addEventListener("mouseenter", onMouseEnter)
            node.addEventListener("mouseout", onMouseOut)
        }
    }

    showOriginal.removeAll = function () {
        if (plataformInfo.isMobile.any) return;

        nodesToShowOriginal.forEach(nodeInf => {
            nodeInf.node.removeEventListener("mouseenter", onMouseEnter)
            nodeInf.node.removeEventListener("mouseout", onMouseOut)
        })
        nodesToShowOriginal = []
    }

    showOriginal.enable = function () {
        if (plataformInfo.isMobile.any) return;

        if (!divElement) {
            divElement = document.createElement("div")
            divElement.style = "all: initial"
            divElement.classList.add("notranslate")
            
            shadowRoot = divElement.attachShadow({mode: "closed"})
            shadowRoot.innerHTML = `
                <style>
                    #originalText {
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
                <div id="originalText">Ola</div>
            `

            divElement.addEventListener("mouseout", onMouseOut)

            document.addEventListener("mousemove", onMouseMove)
            document.addEventListener("mousedown", onMouseDown)
        }
    }

    showOriginal.disable = function () {
        if (plataformInfo.isMobile.any) return;
        
        if (divElement) {
            hideOriginalText()
            divElement.remove()
            divElement = null
            shadowRoot = null
        }

        showOriginal.removeAll()

        document.removeEventListener("mousemove", onMouseMove)
        document.removeEventListener("mousedown", onMouseDown)
    }
}