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
                font-family: Arial, Helvetica, sans-serif;
                font-style: normal;
                font-variant: normal;
                line-height: normal;
                font-size: 16px;
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
    
    var gSelText = ""
    selTextButton.addEventListener("click", e => {
        if (gSelText) {
            translateSingleText(gSelText)
            .then(result => {
                selTextDiv.style.top = e.clientY + 15 + "px"
                selTextDiv.style.left = e.clientX + "px"
                selTextDiv.textContent = result
                selTextDiv.style.display = "block"
    
                var height = parseInt(selTextDiv.offsetHeight)
                var top = e.clientY + 15
                top = Math.max(0, top)
                top = Math.min(window.innerHeight - height, top)
    
                var width = parseInt(selTextDiv.offsetWidth)
                var left = parseInt(e.clientX - width / 2)
                left = Math.max(0, left)
                left = Math.min(window.innerWidth - width, left)
    
                selTextDiv.style.top = top + "px";
                selTextDiv.style.left = left + "px"
            })
    
            selTextButton.style.display = "none"
        }
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
        var seltext = document.getSelection().toString().trim()
        if (seltext) {
            gSelText = seltext
            //selTextButton.classList.remove("show")
            selTextButton.style.top = e.clientY - 20 + "px"
            selTextButton.style.left = e.clientX + 10 + "px"
            //selTextButton.classList.add("show")
            selTextButton.style.display = "block"
        } else {
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
})
