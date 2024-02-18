function checkAuthorization(authorizationToOpenOptions) {
  if (authorizationToOpenOptions === location.hash.split("=")[1]) {
    location.replace(chrome.runtime.getURL('/options/options.html'))
    chrome.storage.local.remove(["authorizationToOpenOptions"]);
  }
}

chrome.storage.local.get(["authorizationToOpenOptions"], (onGot) => {
  checkAuthorization(onGot.authorizationToOpenOptions);
});

chrome.storage.local.onChanged.addListener((changes) => {
  if (changes.authorizationToOpenOptions) {
    checkAuthorization(changes.authorizationToOpenOptions.newValue);
  }
});
