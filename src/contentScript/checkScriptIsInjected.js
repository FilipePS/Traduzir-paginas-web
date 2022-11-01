// if the site has any restriction that prevent contentScript from running, then this listener will not work and the backgroundScript will know that
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "contentScriptIsInjected") {
    sendResponse(true);
  }
});
