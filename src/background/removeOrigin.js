function originWithId(header) {
  return (
    header.name.toLowerCase() === "origin" &&
    (header.value.indexOf("moz-extension://") === 0 ||
    header.value.indexOf("chrome-extension://") === 0)
  );
}

let ManifestURL = browser.runtime.getURL("");

browser.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (details.originUrl.startsWith(ManifestURL)) {
      return {
        requestHeaders: details.requestHeaders.filter((x) => !originWithId(x)),
      };
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking", "requestHeaders"]
);
