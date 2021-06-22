"use strict";

var plataformInfo = {}

twpConfig.onReady(function () {
    if (chrome.tabs) {
        twpConfig.set("originalUserAgent", navigator.userAgent)
    }

    let userAgent
    if (twpConfig.get("originalUserAgent")) {
        userAgent = twpConfig.get("originalUserAgent")
    } else {
        userAgent = navigator.userAgent
    }

    plataformInfo.isMobile = {
        Android: userAgent.match(/Android/i),
        BlackBerry: userAgent.match(/BlackBerry/i),
        iOS: userAgent.match(/iPhone|iPad|iPod/i),
        Opera: userAgent.match(/Opera Mini/i),
        Windows: userAgent.match(/IEMobile/i) || userAgent.match(/WPDesktop/i)
    }
    plataformInfo.isMobile.any = plataformInfo.isMobile.Android || plataformInfo.isMobile.BlackBerry || plataformInfo.isMobile.iOS || plataformInfo.isMobile.Opera || plataformInfo.isMobile.Windows

    plataformInfo.isDesktop = {
        any: !plataformInfo.isMobile.any
    }
})