if (typeof browser !== 'undefined') {
    chrome = browser
}

var eHtml = document.getElementsByTagName("html")[0]

if (eHtml) {
    var pageLang = eHtml.getAttribute("lang") || eHtml.getAttribute("xml:lang");
}

if (pageLang) {
    pageLang = pageLang.split("-")[0]
    var navigatorLang = navigator.language.split("-")[0]

    if (navigatorLang != pageLang) {
        injectPopup()
    }
} else {
    chrome.runtime.sendMessage({action: "showPopup"})
    //injectPopup()
}

function injectPopup()
{
    var styles = document.createElement("style")
    styles.textContent = `
    #twpm-popup {
        all: initial;
        * {
          all: unset;
        }
    }
    .twpm-item {
        all: initial;
        flex: 1;
        text-align: center;
        vertical-align: middle;
        font-family: "Verdana";
        font-weight: bold;
        height: 50px;
        font-size: 100%;
        background-color: white;
        border: none;
        cursor: pointer;
    }
    .twpm-button:focus {
        outline: none;
        animation: twpm-btn-color 0.8s forwards linear;
    }
    .twpm-button::-moz-focus-inner { border:0; }
    .twpm-button:active {
        background-color: #bbb;
    }
    @keyframes twpm-btn-color { 0% { background: white; } 50% { background: #eee; } 100% { background: white; } }
    .twpm-loader {
        border: 4px solid #eee;
        border-radius: 50%;
        border-top: 5px solid #2196F3;
        width: 28px;
        height: 28px;
        animation: twpm-spin 1.5s linear infinite;
    }
    @keyframes twpm-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `
    document.body.appendChild(styles)

    var element = document.createElement("div")
    element.setAttribute("id", "twpm-popup")
    element.setAttribute("translate", "no")
    element.classList.add("notranslate")
    element.style = `
        z-index: 2000;
        position: fixed;
        bottom: 0;
        background-color: white;
        box-shadow: 0px -1px 4px rgba(0, 0, 0, 1);
        width: 100%;
        height: 50px;
        user-select: none;
    `
    element.innerHTML = `
    <div style="all: initial; display:flex; align-items: center; margin: 0 auto; vertical-align: middle; padding-left: 10px">
    <img style="max-width: 38px; max-height: 38px;" src="data:image/png;base64,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" alt="" />
    <button id="twpm-btnOriginal" class="twpm-item twpm-button" style="color: #2196F3">Original</button>
    <button id="twpm-btnTranslate" class="twpm-item twpm-button">Translated</button>
    <button id="twpm-spin" class="twpm-item twpm-button" style="display: none"><div class="twpm-loader twpm-button" style="margin: 0 auto;"></div></button>
    <button id="twpm-btnClose" class=" twpm-item twpm-button" style="max-width: 40px">&times;</button>
    </div>
    `
    document.body.appendChild(element)

    var twpm_btnCloseIsClicked = false

    window.addEventListener("scroll", () => {
        if (window.pageYOffset < 10 && !twpm_btnCloseIsClicked) {
            element.style.display = "block"
        } else {
            element.style.display = "none"
        }
    })

    const twpm_btnOriginal = document.getElementById("twpm-btnOriginal")
    const twpm_btnTranslate= document.getElementById("twpm-btnTranslate")
    const twpm_spin = document.getElementById("twpm-spin")
    const twpm_btnClose = document.getElementById("twpm-btnClose")

    twpm_btnOriginal.addEventListener("click", () => {
        chrome.runtime.sendMessage({action: "Restore"})
        twpm_btnOriginal.style.color = "#2196F3"
        twpm_btnTranslate.style.color = "black"
    })

    twpm_btnTranslate.addEventListener("click", () => {
        chrome.runtime.sendMessage({action: "Translate"})
        twpm_btnOriginal.style.color = "black"
        twpm_btnTranslate.style.color = "#2196F3"
        twpm_btnTranslate.style.display = "none"
        twpm_spin.style.display = "block"

        let updateStatus = () => {
            chrome.runtime.sendMessage({action: "getStatus"}, response => {
                console.log(response)
                if (typeof response == "string" && response != "progress") {
                    twpm_btnTranslate.style.display = "block"
                    twpm_spin.style.display = "none"
                    twpm_btnTranslate.style.color = "#2196F3"
                } else {
                    setTimeout(updateStatus, 100);
                }
            })
        }
        updateStatus()
    })

    twpm_btnClose.addEventListener("click", () => {
        twpm_btnCloseIsClicked = true
        element.style.display = "none"
    })
}
