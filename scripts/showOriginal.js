if (typeof browser !== 'undefined') {
    chrome = browser
}

chrome.storage.local.get("showOriginalTextWhenHovering", onGot => {
    if (onGot.showOriginalTextWhenHovering === "no") return;

    var htmlTagsInlineText = ['#text', 'A', 'ABBR', 'ACRONYM', 'B', 'BDO', 'BIG', 'CITE', 'DFN', 'EM', 'I', 'LABEL', 'Q', 'S', 'SMALL', 'SPAN', 'STRONG', 'SUB', 'SUP', 'U', 'TT', 'VAR']
    var htmlTagsInlineIgnore = ['BR', 'CODE', 'KBD', 'WBR'] // and input if type is submit or button

    var elementsOriginalText = []

    window.saveToShowOriginal = function(node) {
        do {
            if (node.nodeType == 1 && node != document.body) {
                if (htmlTagsInlineText.indexOf(node.nodeName) == -1 && htmlTagsInlineIgnore.indexOf(node.nodeName) == -1) {
                    break
                } else {
                    node = node.parentNode
                }
            } else if (node.nodeType == 3) {
                node = node.parentNode
            } else {
                return
            }
            if (!node) return;
        } while (node);
        
        if (!elementsOriginalText.find(a => a.node == node)) {
            elementsOriginalText.push({node: node, textContent: node.textContent})
            node.addEventListener("mouseenter", onMouseEnter)
            node.addEventListener("mouseout", onMouseOut)
        }
    }

    window.restoreShowOriginal = function() {
        elementsOriginalText.forEach(a => {
            a.node.removeEventListener("mouseenter", onMouseEnter)
            a.node.removeEventListener("mouseout", onMouseOut)
        })
        elementsOriginalText = []
    }

    var timeOutHandler = null
    function onMouseEnter(e) {
        if (e.target == element) return;
        var node = e.target
        
        var elementInfo = elementsOriginalText.find(a => a.node == node)

        if (elementInfo) {
            timeOutHandler = setTimeout(() => {
                showOriginalText(elementInfo)
            }, 1300)
        }
    }

    function onMouseOut(e) {
        if (timeOutHandler) {
            clearTimeout(timeOutHandler)
            timeOutHandler = null
        }
        if (e.relatedTarget == element) return;
        originalTextDiv.style.display = "none"
    }

    document.addEventListener("mousedown", e => {
        if (e.target == element) return;
        originalTextDiv.style.display = "none"
    })

    var mousePos = {x:0, y:0}
    document.addEventListener("mousemove", e => {
        mousePos.x = e.clientX
        mousePos.y = e.clientY
    })

    var element = null
    var shadowRoot = null
    var originalTextDiv = null
    function init() {
        if (element) return
        element = document.createElement("div")
        shadowRoot = element.attachShadow({mode: "closed"})

        shadowRoot.innerHTML = `
        <style>
            div {
                font-family: 'Helvetica', 'Arial', sans-serif;
                font-style: normal;
                font-variant: normal;
                line-height: normal;
                font-size: 14px;
                font-weight: 500;
            }

            #originalTextDiv {
                z-index: 999999999;
                position: fixed;
                border-radius: 5px;
                max-width: 280px;
                max-height: 250px;
                top: 0px;
                left: 0px;
                padding: 16px;
                color: #000;
                background-color: white;
                border: 1px solid lightGrey;
                overflow: auto;
                display: none;
            }

            #originalTextDiv.show {
                opacity: 1;
                transition: opacity .2s linear;
            }

        </style>
        <div id="originalTextDiv"></div>
        `

        document.body.appendChild(element)

        originalTextDiv = shadowRoot.getElementById("originalTextDiv")
    }
    init()

    function showOriginalText(elementInfo) {
        if (!shadowRoot) return;

        originalTextDiv.textContent = elementInfo.textContent
        originalTextDiv.style.top = "0px"
        originalTextDiv.style.left = "0px"
        originalTextDiv.style.display = "block"

        var height = parseInt(originalTextDiv.offsetHeight)
        var top = mousePos.y + 5
        top = Math.max(0, top)
        top = Math.min(window.innerHeight - height, top)

        var width = parseInt(originalTextDiv.offsetWidth)
        var left = parseInt(mousePos.x /*- width / 2*/)
        left = Math.max(0, left)
        left = Math.min(window.innerWidth - width, left)

        originalTextDiv.style.top = top + "px"
        originalTextDiv.style.left = left + "px"
    }
})