if (typeof browser !== 'undefined') {
    chrome = browser
}

chrome.storage.local.get("showTranslateSelectedButton", onGot => {
    if (onGot.showTranslateSelectedButton === "no") return;


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

    document.addEventListener("touchstart", e => {
        onDown(e)
    })

    function onUp(e) {
        if (e.target == element) return;

        if (document.getSelection().toString().trim()) {
            var selection = document.getSelection()
            var rect = selection.focusNode.parentNode.getBoundingClientRect()
            gSelectionInfo = {
                text: selection.toString().trim(),
                top: rect.top,
                left: rect.left,
                bottom: rect.bottom,
                right: rect.right
            }
            //selTextButton.classList.remove("show")
            selTextButton.style.top = e.clientY - 20 + "px"
            selTextButton.style.left = e.clientX + 10 + "px"
            //selTextButton.classList.add("show")
            selTextButton.style.display = "block"
        } else {
            gSelectionInfo = null
            selTextButton.style.display = "none"
            //selTextButton.classList.remove("show")
        }
    }
    
    document.addEventListener("mouseup", e => {
        if (e.button != 0) return;
        setTimeout(()=>onUp(e), 120)
    })

    document.addEventListener("touchend", e => {
        setTimeout(()=>onUp(e), 120)
    })

    chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
        if (request.action == "TranslateSelectedText") {
            translateSelText()
        }
    })
})
