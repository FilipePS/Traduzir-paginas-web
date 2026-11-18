"use strict";

(() => {
  let showTranslateSelectedButton =
    twpConfig.get("showTranslateSelectedButton") === "yes";

  function destroyButtonIfDisabled() {
    if (showTranslateSelectedButton) return;

    const divElements = document.querySelectorAll("div.notranslate");
    divElements.forEach((element) => {
      if (typeof element.remove === "function") element.remove();
    });
  }

  twpConfig.onReady(() => {
    showTranslateSelectedButton =
      twpConfig.get("showTranslateSelectedButton") === "yes";
    destroyButtonIfDisabled();

    twpConfig.onChanged((name, value) => {
      if (name === "showTranslateSelectedButton") {
        showTranslateSelectedButton = value === "yes";
        if (!showTranslateSelectedButton) destroyButtonIfDisabled();
      }
    });
  });
})();
