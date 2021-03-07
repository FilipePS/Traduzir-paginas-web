"use strict";

var plataformInfo = {}

{
    plataformInfo.isMobile = {
        Android: navigator.userAgent.match(/Android/i),
        BlackBerry: navigator.userAgent.match(/BlackBerry/i),
        iOS: navigator.userAgent.match(/iPhone|iPad|iPod/i),
        Opera: navigator.userAgent.match(/Opera Mini/i),
        Windows: navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i)
    }
    plataformInfo.isMobile.any = plataformInfo.isMobile.Android || plataformInfo.isMobile.BlackBerry || plataformInfo.isMobile.iOS || plataformInfo.isMobile.Opera || plataformInfo.isMobile.Windows
    
    plataformInfo.isDesktop = {
        any: !plataformInfo.isMobile.any
    }
}