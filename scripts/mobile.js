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
    .twpm-button {
        flex: 1;
        text-align: center;
        font-family: "Verdana";
        height: 100%;
        font-size: 100%;
        background-color: white;
        border: none;
    }
    `
    document.body.appendChild(styles)

    var element = document.createElement("div")
    element.setAttribute("translate", "no")
    element.classList.add("notranslate")
    element.style = `
        all: initial;
        z-index: 2000;
        position: fixed;
        bottom: 0;
        background-color: white;
        box-shadow: 0px -1px 4px rgba(0, 0, 0, 1);
        width: 100%;
        height: 40px;
    `
    element.innerHTML = `
    <div style="display:flex; align-items: center; margin: 0 auto;">
    <button id="twpm-btnTranslate" class="twpm-button">Translate</button>
    <button id="twpm-btnShowOriginal" class="twpm-button">Show Original</button>
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

    const twpm_btnTranslate= document.getElementById("twpm-btnTranslate")
    const twpm_btnShowOriginal = document.getElementById("twpm-btnShowOriginal")
    const twpm_btnClose = document.getElementById("twpm-btnClose")

    twpm_btnTranslate.addEventListener("click", () => {
        chrome.runtime.sendMessage({command: "translate"})
    })

    twpm_btnShowOriginal.addEventListener("click", () => {
        chrome.runtime.sendMessage({command: "showOriginal"})
    })

    twpm_btnClose.addEventListener("click", () => {
        twpm_btnCloseIsClicked = true
        element.style.display = "none"
    })
}
