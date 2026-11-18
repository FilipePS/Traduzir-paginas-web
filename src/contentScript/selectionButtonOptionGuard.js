"use strict";

(() => {
  const shadowRoots = new Set();
  let showTranslateSelectedButton = true;

  function updateButtonVisibility(root) {
    if (!root.host.isConnected) {
      shadowRoots.delete(root);
      return;
    }

    let style = root.getElementById("twp-selection-button-option-guard");
    if (showTranslateSelectedButton) {
      if (style) style.remove();
      return;
    }

    if (!style) {
      style = document.createElement("style");
      style.id = "twp-selection-button-option-guard";
      root.appendChild(style);
    }
    style.textContent = "#eButtonTransSelText { display: none !important; }";
  }

  // translateSelected.js creates its button inside a closed shadow root. Hook
  // creation before that script runs so the preference can hide the button
  // even when an async selection handler completes after the option changes.
  const attachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (options) {
    const root = attachShadow.call(this, options);
    if (this.classList && this.classList.contains("notranslate")) {
      shadowRoots.add(root);
      updateButtonVisibility(root);
    }
    return root;
  };

  twpConfig.onReady(() => {
    function updateFromConfig() {
      showTranslateSelectedButton =
        twpConfig.get("showTranslateSelectedButton") === "yes";
      shadowRoots.forEach(updateButtonVisibility);
    }

    updateFromConfig();
    twpConfig.onChanged((name) => {
      if (name === "showTranslateSelectedButton") updateFromConfig();
    });
  });
})();
