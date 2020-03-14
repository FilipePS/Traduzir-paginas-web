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
    injectPopup()
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
    .twpm-button {
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
        animation: btn-color 0.8s forwards linear;
    }
    .twpm-button::-moz-focus-inner { border:0; }
    .twpm-button:active {
        background-color: #bbb;
    }
    @keyframes btn-color { 0% { background: white; } 50% { background: #aaa; } 100% { background: white; } }
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
    `
    element.innerHTML = `
    <div style="display:flex; align-items: center; margin: 0 auto; vertical-align: middle;">
    <button id="twpm-btnOriginal" class="twpm-button" style="color: #2196F3">Original</button>
    <button id="twpm-btnTranslate" class="twpm-button">Translated</button>
    <button id="twpm-btnClose" class="twpm-button" style="max-width: 40px">&times;</button>
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
    })

    twpm_btnClose.addEventListener("click", () => {
        twpm_btnCloseIsClicked = true
        element.style.display = "none"
    })
}
