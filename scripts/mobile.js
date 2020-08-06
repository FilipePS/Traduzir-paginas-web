if (typeof browser !== 'undefined') {
    chrome = browser
}

var htmlMobile = `
<style>
    .item {
        flex: 1;
        text-align: center;
        vertical-align: middle;
        font-family: "Arial";
        font-weight: 600;
        height: 50px;
        font-size: 22px;
        background-color: white;
        border: none;
        cursor: pointer;
    }

    .item2 {
        flex: 1;
        text-align: center;
        vertical-align: middle;
        height: 50px;
        background-color: white;
        border: none;
        cursor: pointer;      
    }

    .button:focus {
        outline: none;
        animation: btn-color 0.8s forwards linear;
    }

    .button::-moz-focus-inner, .item2::-moz-focus-inner {
        border: 0;
    }

    .item2:focus {
        border: 0;
    }

    .button:active {
        background-color: #bbb;
    }

    @keyframes btn-color {
        0% {
            background: white;
        }

        50% {
            background: #ddd;
        }

        100% {
            background: white;
        }
    }

    .loader {
        border: 4px solid #eee;
        border-radius: 50%;
        border-top: 5px solid #2196F3;
        width: 28px;
        height: 28px;
        animation: spin 1.5s linear infinite;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }

        100% {
            transform: rotate(360deg);
        }
    }

    .menuDot {
        width: 4px;
        height: 4px;
        background-color: black;
        margin: 4px auto;
        border-radius: 50%;
    }

    #menu {
        box-shadow: 0px 0px 3px rgba(0, 0, 0, 1);
        font-family: "Arial";
        font-size: 16px;
    }

    #menuSelectLanguage {
        position: fixed;
        height: calc(100% - 20px);
        overflow: scroll;
        box-shadow: 0px 0px 3px rgba(0, 0, 0, 1);
        font-family: "Arial";
        font-size: 16px;
    }

    .dropup {
        position: absolute;
        right: 1px;
    }

    .dropup-content {
        display: none;
        position: absolute;
        background-color: #f1f1f1;
        width: 250px;
        bottom: 10px;
        right: 0;
        z-index: 1000000001;
    }

    .dropup-content a {
        color: black;
        padding: 6px;
        text-decoration: none;
        display: block;
    }

    .dropup-content a:hover {background-color: #ccc}

    .dropup:hover .dropup-content {
        display: block;
    }

    .dropup:hover .dropbtn {
        background-color: #2980B9;
    }

    #iconTranslate {
        cursor: pointer;
    }

</style>

<div style="display:flex; align-items: center; margin: 0 auto; vertical-align: middle; padding-left: 10px">
    <img id="iconTranslate" style="max-width: 38px; max-height: 38px;">
    <button id="btnOriginal" class="item button" style="color: #2196F3">Original</button>
    <button id="btnTranslate" class="item button">Translated</button>
    <button id="spin" class="item button" style="display: none">
        <div class="loader button" style="margin: 0 auto;"></div>
    </button>
    <button id="btnMenu" class="item2" style="width: 40px; max-width: 40px">
        <div class="dropup">
            <div id="menu" class="dropup-content">
                <a id="btnChangeLanguages" href="#">Change languages</a>
                <a id="btnNeverTranslate" href="#">Never translate this site</a>
                <a id="btnDonate" href="https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=N4Q7ACFV3GK2U&source=url" target="_blank" value="btnDonate" rel="noopener noreferrer">Donate &#10084;</a>
                <a id="btnMoreOptions" href="#">More options</a>
            </div>
        </div>
        <div class="dropup">
            <div id="menuSelectLanguage" class="dropup-content"></div>
        </div>
        <div class="menuDot"></div>
        <div class="menuDot"></div>
        <div class="menuDot"></div>
    </button>
    <button id="btnClose" class="item" style="width: 40px; max-width: 40px">&times;</button>
</div>
`

function googleDetectLanguage(text, callback)
{
    if (text.length > 10) {
        let url = "https://translate.google.com/translate_a/single?client=gtx&sl=auto"
        text = text.trim().substring(0, 200)

        fetch(url, {
            credentials: "omit",
            method: "post",
            headers: {'Content-Type':'application/x-www-form-urlencoded'},
            body: "q=" + encodeURIComponent(text)
        })
        .then(data => data.text())
        .then(data => {
            if (data && (data = JSON.parse(data)) && data[2]) {
                callback(data[2])
            } else {
                callback()
            }
        })
        .catch(err => {
            callback()
        })
    } else {
        callback()
    }   
}

var langAttribute = document.documentElement.getAttribute("lang") || document.documentElement.getAttribute("xml:lang") || null;

if (langAttribute) {
    langAttribute = langAttribute.split("-")[0]
}

var navigatorLang = navigator.language.split("-")[0]

chrome.storage.local.get("neverTranslateSites", onGot => {
    var neverTranslateSites = onGot.neverTranslateSites
    if (!neverTranslateSites) {
        neverTranslateSites = []
    }

    if (neverTranslateSites.indexOf(window.location.hostname) == -1) {
        chrome.runtime.sendMessage({action: "getShowPopupConfig"}, showPopupConfig => {
            if (showPopupConfig == "threeFingersOnTheScreen") {
                injectPopup()
            }
        })

        setTimeout(() => {
            var pageText = document.body.innerText
            var pageTextLength = pageText.length
            var middleIdx = Math.floor(pageTextLength / 2)
            if (pageTextLength <= 200) {
                googleDetectLanguage(pageText, (lang) => {
                    if (lang) {
                        if (lang.split("-")[0] != navigatorLang) {
                            injectPopup()
                        }
                    } else {
                        if (navigatorLang !== langAttribute) {
                            injectPopup()
                        }
                    }
                })
            } else {
                googleDetectLanguage(pageText.substring(middleIdx, middleIdx + 200), (lang) => {
                    if (lang) {
                        if (lang.split("-")[0] != navigatorLang) {
                            injectPopup()
                        } else {
                            googleDetectLanguage(pageText.substring(0, 200), (lang) => {
                                if (lang.split("-")[0] != navigatorLang) {
                                    injectPopup()
                                } else {
                                    googleDetectLanguage(pageText.substring(pageTextLength - 200, pageTextLength), (lang) => {
                                        if (lang.split("-")[0] != navigatorLang) {
                                            injectPopup()
                                        }               
                                    })
                                }                 
                            })
                        }
                    } else {
                        if (navigatorLang !== langAttribute) {
                            injectPopup()
                        }
                    }
                })
            }
        }, 120)
    }
})

var popupIsInjected = false

function injectPopup()
{
    if (popupIsInjected) return;
    popupIsInjected = true

    const element = document.createElement("div")
    element.setAttribute("translate", "no")
    element.classList.add("notranslate")
    element.style = `
        z-index: 1000000000;
        position: fixed;
        left: 0;
        bottom: 0;
        background-color: white;
        box-shadow: 0px 0px 4px rgba(0, 0, 0, 1);
        width: 100%;
        height: 50px;
        user-select: none;
        display: none;
    `

    const shadowRoot = element.attachShadow({mode: 'closed'})

    shadowRoot.innerHTML = htmlMobile

    document.body.appendChild(element)

    let neverTranslateThisSite = false
    let btnCloseIsClicked = false
    let prevPageY = window.pageYOffset + 50

    chrome.runtime.sendMessage({action: "getShowPopupConfig"}, showPopupConfig => {
        if (showPopupConfig == "threeFingersOnTheScreen") {
            element.style.display = "none"
            window.addEventListener("touchstart", (e) => {
                if (e.touches.length == 3 && !neverTranslateThisSite) {
                    element.style.display = "block"
                }
            })
        } else {
            element.style.display = "block"
            window.addEventListener("scroll", () => {
                if (!btnCloseIsClicked) {
                    let offsetY = window.pageYOffset - prevPageY
                    if (offsetY > 50) {
                        offsetY = 50
                        prevPageY = window.pageYOffset - 50
                    } else if (offsetY < -50) {
                        offsetY = -50
                        prevPageY = window.pageYOffset + 50      
                    }
                    element.style.bottom = parseInt((offsetY + 50) / -2) + "px"
                    if (offsetY >= 50) {
                        element.style.display = "none"
                        menu.style.display = "none"
                        menuSelectLanguage.style.display = "none";
                    } else {
                        element.style.display = "block"
                    }
                }
            })
        }
    })

    const iconTranslate = shadowRoot.getElementById("iconTranslate")
    const btnOriginal = shadowRoot.getElementById("btnOriginal")
    const btnTranslate= shadowRoot.getElementById("btnTranslate")
    const spin = shadowRoot.getElementById("spin")
    const btnMenu = shadowRoot.getElementById("btnMenu")
    const menu = shadowRoot.getElementById("menu")
    const menuSelectLanguage = shadowRoot.getElementById("menuSelectLanguage")
    const btnNeverTranslate = shadowRoot.getElementById("btnNeverTranslate")
    const btnChangeLanguages = shadowRoot.getElementById("btnChangeLanguages")
    const btnDonate = shadowRoot.getElementById("btnDonate")
    const btnMoreOptions = shadowRoot.getElementById("btnMoreOptions")
    const btnClose = shadowRoot.getElementById("btnClose")

    btnOriginal.textContent = chrome.i18n.getMessage("btnMobileOriginal")
    btnTranslate.textContent = chrome.i18n.getMessage("btnMobileTranslated")
    btnNeverTranslate.textContent = chrome.i18n.getMessage("btnMobileNeverTranslate")
    btnChangeLanguages.textContent = chrome.i18n.getMessage("btnChangeLanguages")
    btnDonate.textContent = chrome.i18n.getMessage("btnMobileDonate")
    btnDonate.innerHTML += " &#10084;"
    btnMoreOptions.textContent = chrome.i18n.getMessage("btnMoreOptions")

    // set translation engine icon
    chrome.runtime.sendMessage({action: "getTranslationEngine"}, translationEngine => {
        if (translationEngine == "yandex") {
            iconTranslate.setAttribute("src", chrome.runtime.getURL("/icons/yandex-translate-32.png"))
        } else { // google
            iconTranslate.setAttribute("src", chrome.runtime.getURL("/icons/google-translate-32.png"))
        }
    })

    iconTranslate.addEventListener("click", () => {
        chrome.runtime.sendMessage({action: "swapEngineTranslator"})
        location.reload()
    })

    btnOriginal.addEventListener("click", () => {
        chrome.runtime.sendMessage({action: "Restore"})
        btnOriginal.style.color = "#2196F3"
        btnTranslate.style.color = "black"
    })

    var lang = null
    chrome.runtime.sendMessage({action: "getTargetLanguage"}, targetLanguage => {
        lang = targetLanguage
    })

    function translate()
    {
        chrome.runtime.sendMessage({action: "Translate", lang: lang})
        btnOriginal.style.color = "black"
        btnTranslate.style.color = "#2196F3"
        btnTranslate.style.display = "none"
        spin.style.display = "block"

        let updateStatus = () => {
            var status = getStatus()
            if (status == "finish" || status == "error") {
                btnTranslate.style.display = "block"
                spin.style.display = "none"
                btnTranslate.style.color = "#2196F3"
            } else {
                setTimeout(updateStatus, 100);
            }
        }
        updateStatus()
    }

    btnTranslate.addEventListener("click", () => {
        translate()
    })

    btnMenu.addEventListener("click", () => {
        menu.style.display = "block"
        menuSelectLanguage.style.display = "none";
    })

    document.addEventListener("click", e => {
        if (e.target != element) {
            menu.style.display = "none";
            menuSelectLanguage.style.display = "none";
            if (aSelected) {aSelected.style.backgroundColor = null}
        }
    })

    shadowRoot.addEventListener("click", e => {
        if (e.target != btnMenu) {
            menu.style.display = "none";
            if (e.target == btnChangeLanguages) {
                menuSelectLanguage.style.display = "block";
            } else {
                menuSelectLanguage.style.display = "none";
                if (aSelected) {aSelected.style.backgroundColor = null}
            }
        }
    })

    btnNeverTranslate.addEventListener("click", () => {
        chrome.runtime.sendMessage({action: "neverTranslateThisSite"})
        neverTranslateThisSite = true
        btnCloseIsClicked = true
        element.style.display = "none"
    })

    var aSelected = null
    btnChangeLanguages.addEventListener("click", () => {
        menuSelectLanguage.style.display = "block"
        aSelected = shadowRoot.querySelector("#menuSelectLanguage a[value='" + lang + "']")
        aSelected.style.backgroundColor = "#ccc"
        menuSelectLanguage.scrollTop = aSelected.offsetTop
    })

    btnMoreOptions.addEventListener("click", () => {
        chrome.runtime.sendMessage({action: "openOptionsPage"})
    })

    btnClose.addEventListener("click", () => {
        btnCloseIsClicked = true
        element.style.display = "none"
    })

    ;(function() {
        chrome.runtime.sendMessage({action: "getLangs"}, langs => {
            langs.forEach(value => {
                if (value[0] == "zh") return;
                var a = document.createElement("a")
                a.setAttribute("href", "#")
                a.setAttribute("value", value[0])
                a.textContent = value[1]
                a.addEventListener("click", () => {
                    lang = value[0]
                    translate()
                })
                menuSelectLanguage.appendChild(a)
            })
        })
    })()
}
