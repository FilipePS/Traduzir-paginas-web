function backgroundFetchJson(url, options) {
    return new Promise(resolve => {
        chrome.runtime.sendMessage({action: "backgroundFetchJson", url: url, options: options}, response => {
            resolve(response)
        })
    })
}

function backgroundFetchText(url, options) {
    return new Promise(resolve => {
        chrome.runtime.sendMessage({action: "backgroundFetchText", url: url, options: options}, response => {
            resolve(response)
        })
    })
}