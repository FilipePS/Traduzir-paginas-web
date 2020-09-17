if (typeof browser !== 'undefined') {
    chrome = browser
}

(function() {
    var isMobile = {
        Android: function() {
            return navigator.userAgent.match(/Android/i);
        },
        BlackBerry: function() {
            return navigator.userAgent.match(/BlackBerry/i);
        },
        iOS: function() {
            return navigator.userAgent.match(/iPhone|iPad|iPod/i);
        },
        Opera: function() {
            return navigator.userAgent.match(/Opera Mini/i);
        },
        Windows: function() {
            return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
        },
        any: function() {
            return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
        }
    };
    if (isMobile.any()) return;

    chrome.storage.local.get("showOriginalTextWhenHovering", onGot => {
        if (onGot.showOriginalTextWhenHovering === "no") return;
        window.saveToShowOriginal = saveToShowOriginal
        window.restoreShowOriginal = restoreShowOriginal
    })

    chrome.storage.onChanged.addListener(changes => {
        if (changes.showOriginalTextWhenHovering) {
            if (changes.showOriginalTextWhenHovering.newValue != "yes") {
                destroy()
                delete window.saveToShowOriginal
                delete window.restoreShowOriginal
            } else {
                init()
                window.saveToShowOriginal = saveToShowOriginal
                window.restoreShowOriginal = restoreShowOriginal
            }
        }
    })

    var htmlTagsInlineText = ['#text', 'A', 'ABBR', 'ACRONYM', 'B', 'BDO', 'BIG', 'CITE', 'DFN', 'EM', 'I', 'LABEL', 'Q', 'S', 'SMALL', 'SPAN', 'STRONG', 'SUB', 'SUP', 'U', 'TT', 'VAR']
    var htmlTagsInlineIgnore = ['BR', 'CODE', 'KBD', 'WBR'] // and input if type is submit or button

    var elementsOriginalText = []

    function saveToShowOriginal(node) {
        if (!element) {
            init()
        }
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

    function restoreShowOriginal() {
        elementsOriginalText.forEach(a => {
            a.node.removeEventListener("mouseenter", onMouseEnter)
            a.node.removeEventListener("mouseout", onMouseOut)
        })
        elementsOriginalText = []
        destroy()
    }

    var currentElementInfo = null
    var timeOutHandler = null
    function onMouseEnter(e) {
        if (e.target == element) return;
        var node = e.target
        
        var elementInfo = currentElementInfo || elementsOriginalText.find(a => a.node == node)

        if (elementInfo) {
            clearTimeout(timeOutHandler)
            timeOutHandler = setTimeout(() => {
                showOriginalText(elementInfo)
                currentElementInfo = elementInfo
            }, 1300)
        }
    }

    function onMouseOut(e) {
        if (!(currentElementInfo && !currentElementInfo.node.contains(e.relatedTarget)) && (
            e.target.contains(e.relatedTarget) || e.relatedTarget.contains(e.target)
        )) return
        if (timeOutHandler) {
            clearTimeout(timeOutHandler)
            timeOutHandler = null
        }
        if (e.relatedTarget == element) return;
        originalTextDiv.style.display = "none"
        currentElementInfo = null
    }

    var mousePos = {x:0, y:0}
    function onMouseMove(e) {
        mousePos.x = e.clientX
        mousePos.y = e.clientY
    }

    function onMouseDown(e) {
        if (e.target == element) return;
        originalTextDiv.style.display = "none"
    }

    var element = null
    var originalTextDiv = null
    function init() {
        if (element) return
        element = document.createElement("div")
        var shadowRoot = element.attachShadow({mode: "closed"})

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

        document.addEventListener("mousemove", onMouseMove)
        document.addEventListener("mousedown", onMouseDown)
    }

    function destroy() {
        if (!element) return
        document.removeEventListener("mousemove", onMouseMove)
        document.removeEventListener("mousedown", onMouseDown)
        element.remove()
        element = originalTextDiv = null
        currentElementInfo = null
    }

    function showOriginalText(elementInfo) {
        if (!element) return;

        if (!currentElementInfo) {
            originalTextDiv.textContent = elementInfo.textContent
            originalTextDiv.style.display = "block"
        }

        var height = originalTextDiv.offsetHeight
        var top = mousePos.y + 10
        top = Math.max(0, top)
        top = Math.min(window.innerHeight - height, top)

        var width = originalTextDiv.offsetWidth
        var left = parseInt(mousePos.x /*- width / 2*/)
        left = Math.max(0, left)
        left = Math.min(window.innerWidth - width, left)

        originalTextDiv.style.top = top + "px"
        originalTextDiv.style.left = left + "px"
    }
})()