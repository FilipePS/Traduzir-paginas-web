function btnClick()
{
    var eIframe = document.getElementById(":1.container")
    var eBtnTranslate = eIframe.contentWindow.document.getElementById(":1.confirm")

    var eSkip = document.querySelector(".skiptranslate")

    if (eSkip.style.display == "" || window.twp_googleTranslateIsInject) {
        document.querySelector(".skiptranslate").style.display = "none"
        window.twp_googleTranslateIsInject = true
        eBtnTranslate.click()
    } else {
        setTimeout(btnClick, 100)
    }
}

function translate()
{
    var eIframe = document.getElementById(":1.container")
    if (eIframe) {
        btnClick()
    } else {
        setTimeout(translate, 100)
    }
}
translate()