chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0].url.toLowerCase();
  if (url.startsWith("file:") && url.endsWith(".pdf")) {
    window.location = "popup-translate-document.html";
  }
});

chrome.runtime.sendMessage({ action: "getTabMimeType" }, (mimeType) => {
  checkedLastError();

  if (mimeType && mimeType.toLowerCase() === "application/pdf") {
    window.location = "popup-translate-document.html";
  }
});
