chrome.runtime.sendMessage({ action: "getTabMimeType" }, (mimeType) => {
  checkedLastError();

  if (mimeType && mimeType.toLowerCase() === "application/pdf") {
    window.location = "popup-translate-document.html";
  }
});
