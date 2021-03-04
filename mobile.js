"use strict";

var mobile = {}

{
    const iframeDiv = document.createElement("div")
    iframeDiv.style = "height: 50px; width: 100%; bottom: 0px; left: 0px; padding: 0px; position: fixed; z-index: 2147483647; visibility: visible;"
    iframeDiv.classList.add("notranslate")

    const iframe = document.createElement("iframe")
    iframe.style = "height: 50px; width: 100%; border: 0px none; min-height: initial;"

    iframeDiv.appendChild(iframe)
    document.body.appendChild(iframeDiv)

    iframe.contentWindow.location = chrome.runtime.getURL("pagePopupMobile.html")

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "closePagePopupMobile") {
            iframeDiv.remove()
        }
    })

    /*
    const dpr = 1
    const origInnerWidth = window.innerWidth * window.devicePixelRatio
    console.log(origInnerWidth)
    const el = iframeDiv

    function f() {
        el.style.scale = dpr / window.devicePixelRatio
        el.style.width = ( 100 / (dpr / window.devicePixelRatio) ) + "%"
        el.style.left = "0px"
        el.style.bottom = "0px"

        const eWidth = parseFloat(window.innerWidth)

        const dX = (eWidth * window.devicePixelRatio - eWidth) / 2
        const dY = ((50 * (window.devicePixelRatio)) - 50) / (window.devicePixelRatio * 2)
        console.log({
            scale: dpr / window.devicePixelRatio,
            dpr: dpr,
            devicePixelRatio: devicePixelRatio,
            elWidth: getComputedStyle(el).width,
            dx: dX
        })
        el.style.left = - (origInnerWidth - innerWidth) / 2 + "px"
        el.style.bottom = -dY + "px" 
    }
    let oldwidth = null

    function foo() {
        if (oldwidth) {
            if (oldwidth != window.innerWidth) {
                f()
            }
            oldwidth = window.innerWidth
        } else {
            oldwidth = window.innerWidth
            f()
        }
        requestAnimationFrame(foo)
    }
    requestAnimationFrame(foo)
    //*/
}