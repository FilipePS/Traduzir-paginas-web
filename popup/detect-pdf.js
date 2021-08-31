chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    if (tabs[0].url.toLowerCase().endsWith(".pdf")) {
        window.location = "popup-translate-document.html"
    }
})