if (typeof browser !== 'undefined') {
    chrome = browser
}

var isAndroid = /(android)/i.test(navigator.userAgent);

//if (isAndroid) {
    var head  = document.getElementsByTagName('head')[0];
    var link  = document.createElement('link');
    link.id   = cssId;
    link.rel  = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL("w3css/4/w3.css");
    link.media = 'all';
    head.appendChild(link);

    var element = document.createElement("div");
    element.style = `
        user-select: none;
        position: fixed;
        z-index: 1000;
        //width: 100%;
        //height: 100%;
        top: 10px;
        left: 10px;
    `
    element.innerHTML = `
        <button class="w3-btn w3-border w3-blue">ola</button>
    `
    document.body.appendChild(element)
//}