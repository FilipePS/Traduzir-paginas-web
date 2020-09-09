if (typeof browser !== 'undefined') {
    chrome = browser
}

(function() {
    var showTranslateSelectedButton = "yes"
    chrome.storage.local.get("showTranslateSelectedButton", onGot => {
        if (onGot.showTranslateSelectedButton) {
            showTranslateSelectedButton = onGot.showTranslateSelectedButton 
        }
    })

    var element = document.createElement("div")
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
    
            #selTextButton {
                z-index: 999999999;
                position: fixed;
                background-repeat: no-repeat;
                background-size: cover;
                width: 22px;
                height: 22px;
                top: 0px;
                left: 0px;
                cursor: pointer;
                display: none;
            }
    
            #selTextButton.show {
                opacity: 1;
                transition: opacity .4s linear;
            }
    
            #selTextDiv {
                z-index: 999999999;
                position: fixed;
                border-radius: 5px;
                max-width: 280px;
                max-height: 250px;
                top: 0px;
                left: 0px;
                padding: 16px;
                background-color: white;
                border: 1px solid lightGrey;
                overflow: auto;
                display: none;
            }
    
            #selTextDiv.show {
                opacity: 1;
                transition: opacity .2s linear;
            }
    
        </style>
        <div id="selTextButton"></div>
        <div id="selTextDiv"></div>
    `
    
    document.body.appendChild(element)
    
    var selTextButton = shadowRoot.getElementById("selTextButton")
    var selTextDiv = shadowRoot.getElementById("selTextDiv")
    
    selTextButton.style.backgroundImage = "url(" + chrome.runtime.getURL("icons/google-translate-32.png") + ")"
    
    var gSelectionInfo = null
    function translateSelText() {
        if (gSelectionInfo) {
            translateSingleText(gSelectionInfo.text)
            .then(result => {
                var eTop = gSelectionInfo.bottom
                var eLeft = gSelectionInfo.left

                selTextDiv.style.top = eTop + 5 + "px"
                selTextDiv.style.left = eLeft + "px"
                selTextDiv.textContent = result
                selTextDiv.style.display = "block"
    
                var height = parseInt(selTextDiv.offsetHeight)
                var top = eTop + 5
                top = Math.max(0, top)
                top = Math.min(window.innerHeight - height, top)
    
                var width = parseInt(selTextDiv.offsetWidth)
                var left = parseInt(eLeft /*- width / 2*/)
                left = Math.max(0, left)
                left = Math.min(window.innerWidth - width, left)
    
                selTextDiv.style.top = top + "px";
                selTextDiv.style.left = left + "px"
            })
        }
    }

    selTextButton.addEventListener("click", e => {
        translateSelText()
        selTextButton.style.display = "none"
    })

    function onDown(e) {
        if (e.target != element) {
            selTextDiv.style.display = "none"
            selTextButton.style.display = "none"
        }
    }
    
    document.addEventListener("mousedown", e => {
        onDown(e)
    })

    var isTouchSelection = false
    document.addEventListener("touchstart", e => {
        isTouchSelection = true
        onDown(e)
    })

    function getSelectionText() {
        var text = "";
        var activeEl = document.activeElement;
        var activeElTagName = activeEl ? activeEl.tagName.toLowerCase() : null;
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
        var selection = document.getSelection()
        var focusNode = selection.focusNode
        if (focusNode.nodeType == 3) {
            focusNode = focusNode.parentNode
        } else if (focusNode.nodeType != 1) {
            return;
        }
        var rect = focusNode.getBoundingClientRect()
        gSelectionInfo = {
            text: getSelectionText(),
            top: rect.top,
            left: rect.left,
            bottom: rect.bottom,
            right: rect.right
        }
    }

    function onUp(e) {
        if (e.target == element) return;

        var clientX = e.clientX || e.changedTouches[0].clientX
        var clientY = e.clientY || e.changedTouches[0].clientY

        if (document.getSelection().toString().trim()) {
            //selTextButton.classList.remove("show")
            selTextButton.style.top = clientY - 20 + "px"
            selTextButton.style.left = clientX + 10 + "px"
            //selTextButton.classList.add("show")
            if (showTranslateSelectedButton == "yes") {
                selTextButton.style.display = "block"
            }
        } else {
            gSelectionInfo = null
            selTextButton.style.display = "none"
            //selTextButton.classList.remove("show")
        }
    }
    
    document.addEventListener("mouseup", e => {
        if (e.button != 0) return;
        if (e.target == element) return;
        readSelection()
        setTimeout(()=>onUp(e), 120)
    })

    document.addEventListener("touchend", e => {
        if (e.target == element) return;
        readSelection()
        setTimeout(()=>onUp(e), 120)
    })

    document.addEventListener("selectionchange", e => {
        if (isTouchSelection) {
            readSelection()
        }
    })

    chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
        if (request.action == "TranslateSelectedText") {
            readSelection()
            translateSelText()
        }
    })
})()
