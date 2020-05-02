if (typeof browser !== 'undefined') {
    chrome = browser
}

function yandexDetectLanguage(text, callback)
{
    if (text.length > 10) {
        let url = "https://translate.yandex.net/api/v1.5/tr.json/detect"
        let apiKey = "trnsl.1.1.20200410T160011Z.1dabbc738bb3abea.bec131e2ab8e9346e2e5feb85666a4ab4d14a3c7"
        text = text.substring(0, 100)

        fetch(url, {
            method: "post",
            headers: {'Content-Type':'application/x-www-form-urlencoded'},
            body: "key=" + apiKey + "&text=" + encodeURIComponent(text)
        })
        .then(data => data.text())
        .then(data => {
            if (data && (data = JSON.parse(data)) && data.code == 200) {
                callback(data.lang)
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

function googleDetectLanguage(text, callback)
{
    if (text.length > 10) {
        let url = "https://translate.google.com/translate_a/single?client=gtx&sl=auto"
        text = text.substring(0, 200)

        fetch(url, {
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

var eHtml = document.getElementsByTagName("html")[0]

if (eHtml) {
    var langAttribute = eHtml.getAttribute("lang") || eHtml.getAttribute("xml:lang") || null;
}

if (langAttribute) {
    langAttribute = langAttribute.split("-")[0]
}

var navigatorLang = navigator.language.split("-")[0]

chrome.storage.local.get("neverTranslateSites").then(onGot => {
    var neverTranslateSites = onGot.neverTranslateSites
    if (!neverTranslateSites) {
        neverTranslateSites = []
    }

    if (neverTranslateSites.indexOf(window.location.hostname) == -1) {
        googleDetectLanguage(document.body.innerText, (lang) => {
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
    }
})

function readFile(_path, _cb){
    fetch(_path, {mode:'same-origin'})   // <-- important

    .then(function(_res) {
        return _res.blob();
    })

    .then(function(_blob) {
        var reader = new FileReader();

        reader.addEventListener("loadend", function() {
            _cb(this.result);
        });

        reader.readAsText(_blob); 
    })

    .catch( e => {
        //console.log(e)
    })
};

function injectPopup()
{
    const element = document.createElement("div")
    element.setAttribute("translate", "no")
    element.classList.add("notranslate")
    element.style = `
        z-index: 100001;
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

    readFile(chrome.runtime.getURL("scripts/mobile.html"), (data) => {
        shadowRoot.innerHTML = data

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
    
        const btnOriginal = shadowRoot.getElementById("btnOriginal")
        const btnTranslate= shadowRoot.getElementById("btnTranslate")
        const spin = shadowRoot.getElementById("spin")
        const btnMenu = shadowRoot.getElementById("btnMenu")
        const menu = shadowRoot.getElementById("menu")
        const menuSelectLanguage = shadowRoot.getElementById("menuSelectLanguage")
        const btnNeverTranslate = shadowRoot.getElementById("btnNeverTranslate")
        const btnChangeLanguages = shadowRoot.getElementById("btnChangeLanguages")
        const btnDonate = shadowRoot.getElementById("btnDonate")
        const btnClose = shadowRoot.getElementById("btnClose")

        btnOriginal.textContent = chrome.i18n.getMessage("btnMobileOriginal")
        btnTranslate.textContent = chrome.i18n.getMessage("btnMobileTranslated")
        btnNeverTranslate.textContent = chrome.i18n.getMessage("btnMobileNeverTranslate")
        btnChangeLanguages.textContent = chrome.i18n.getMessage("btnChangeLanguages")
        btnDonate.textContent = chrome.i18n.getMessage("btnMobileDonate")
        btnDonate.innerHTML += " &#10084;"
    
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
                chrome.runtime.sendMessage({action: "getStatus"}, response => {
                    if (typeof response == "string" && response != "progress") {
                        btnTranslate.style.display = "block"
                        spin.style.display = "none"
                        btnTranslate.style.color = "#2196F3"
                    } else {
                        setTimeout(updateStatus, 100);
                    }
                })
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
    
        btnClose.addEventListener("click", () => {
            btnCloseIsClicked = true
            element.style.display = "none"
        })

        ;(function() {
            chrome.runtime.sendMessage({action: "getLangs"}, langs => {
                langs.forEach(value => {
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
    })
}
