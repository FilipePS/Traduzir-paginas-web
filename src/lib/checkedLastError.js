// Avoid outputting the error message "Receiving end does not exist" in the Console.
function checkedLastError() {
  chrome.runtime.lastError;
}
