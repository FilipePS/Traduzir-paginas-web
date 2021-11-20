const send = document.getElementById("send")
const error = document.getElementById("error")
const selectService = document.getElementById("selectService")
const pleaseWait = document.getElementById("selectService")
const googleTranslate = document.getElementById("googletranslate")
const cannotUseGoogle = document.getElementById("cannotusegoogle")
const cannotTranslate = document.getElementById("cannottranslate")
const conversion = document.getElementById("conversion")
const conversionAlert = document.getElementById("conversionalert")

selectService.onclick = e => {
    selectService.style.display = "none"
    pleaseWait.style.display = "block"
    chrome.tabs.query({active: true, currentWindow: true}, async tabs => {
        try {
            const service = e.target.dataset.name
            if (tabs[0].url.startsWith("file:")) {
                if (service == "google") {
                    chrome.tabs.create({url: "https://translate.google.com/?op=docs"})
                } else {
                    chrome.tabs.create({url: "https://translatewebpages.org/"})
                }
                return window.close()
            }
            const data = await downloadDocument(tabs[0].url)
            pleaseWait.style.display = "none"
            if (data.byteLength > 1048576 && service == "google") {
                googleTranslate.style.display = "none"
                cannotUseGoogle.style.display = "block"
                cannotUseGoogle.innerHTML = chrome.i18n.getMessage("msgFileLargerThan", "10 MB")
                selectService.style.display = "block"
            } else {
                convertDocument(service, data)
            }
        } catch (e) {
            console.error(e)
            selectService.style.display = "none"
            conversion.style.display = "none"
            conversionAlert.style.display = "none"
            pleaseWait.style.display = "none"
            cannotTranslate.style.display = "block"
        }
    })
}

function downloadDocument(url) {
    return new Promise((resolve, reject) => {
        const http = new XMLHttpRequest
        http.open("get", url, true)
        http.responseType = "arraybuffer";
        http.onprogress = e => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                pleaseWait.innerHTML = "Please wait, " + percentComplete.toFixed(1) + "%"
            }
        }
        http.onload = e => {
            resolve(e.target.response)
        }
        http.onerror = e => {
            selectService.style.display = "none"
            conversion.style.display = "none"
            conversionAlert.style.display = "none"
            pleaseWait.style.display = "none"
            cannotTranslate.style.display = "block"
            reject(e)
        }
        http.send()
    })
}

function convertDocument(service, data) {
    const file = new File([data], "document.pdf",{type:"application/pdf", lastModified: new Date().getTime()});
    const container = new DataTransfer();
    container.items.add(file)
    const myForm = document.getElementById("form_" + service)
    myForm.querySelector('[type="file"]').files = container.files
    conversion.style.display = "none"
    conversionAlert.style.display = "none"
    pleaseWait.style.display = "none"
    send.style.display = "block"
    send.onclick = e => {
        myForm.querySelector('[type="submit"]').click()
        window.close()
    }
}



$ = document.querySelector.bind(document)

function disableDarkMode() {
    if (!$("#lightModeElement")) {
        const el = document.createElement("style")
        el.setAttribute("id", "lightModeElement")
        el.setAttribute("rel", "stylesheet")
        el.textContent = `
        body {
            color: rgb(0, 0, 0);
            background-color: rgb(224, 224, 224);
        }
        .servicebutton, .sendbutton, .title {
            background-color: rgba(0, 0, 0, 0.2);
        }
        
        .servicebutton:hover, .sendbutton:hover {
            background-color: rgba(0, 0, 0, 0.4);
        }
        `
        document.head.appendChild(el)
    }
}

function enableDarkMode() {
    if ($("#lightModeElement")) {
        $("#lightModeElement").remove()
    }
}

twpConfig.onReady(() => {
    switch (twpConfig.get("darkMode")) {
        case "auto":
            if (matchMedia("(prefers-color-scheme: dark)").matches) {
                enableDarkMode()
            } else {
                disableDarkMode()
            }
            break
        case "yes":
            enableDarkMode()
            break
        case "no":
            disableDarkMode()
            break
        default:
            break
    }
})
