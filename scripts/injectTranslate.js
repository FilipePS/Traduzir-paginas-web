
if (!document.getElementById("twp_google_translate_element")) {
    var twp_element

    twp_element = document.createElement("div")
    twp_element.id = "twp_google_translate_element"
    twp_element.style.display = "none"
    document.body.appendChild(twp_element)

    twp_element = document.createElement("script");
    twp_element.textContent = `
    function twp_googleTranslateElementInit() {
        new google.translate.TranslateElement({}, "twp_google_translate_element");
    }
    `
    document.body.appendChild(twp_element)

    twp_element = document.createElement("style")
    twp_element.textContent = ".skiptranslate { opacity: 0; }"
    document.body.appendChild(twp_element)

    var twp_origBodyStyle = document.body.getAttribute("style")

    twp_element = document.createElement("script")
    twp_element.src = "//translate.google.com/translate_a/element.js?cb=twp_googleTranslateElementInit"
    document.body.appendChild(twp_element)

    var twp_resetBodyStyle = () => {
        if (document.body.getAttribute("style") != twp_origBodyStyle) {
            document.body.setAttribute("style", twp_origBodyStyle)
        } else {
            setTimeout(twp_resetBodyStyle, 100)
        }
    }
    twp_resetBodyStyle()
}
