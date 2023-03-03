"use strict";

fetch("./release-notes/en.html")
  .then((response) => response.text())
  .then((responseText) => {
    document.getElementById("release_notes").innerHTML = responseText;
  });

var $ = document.querySelector.bind(document);

twpConfig.onReady(function () {
  if (platformInfo.isMobile.any) {
    let style = document.createElement("style");
    style.textContent = ".desktopOnly {display: none !important}";
    document.head.appendChild(style);
  }

  let sideBarIsVisible = false;
  $("#btnOpenMenu").onclick = (e) => {
    $("#menuContainer").classList.toggle("change");

    if (sideBarIsVisible) {
      $("#sideBar").style.display = "none";
      sideBarIsVisible = false;
    } else {
      $("#sideBar").style.display = "block";
      sideBarIsVisible = true;
    }
  };

  function hashchange() {
    const hash = location.hash || "#languages";
    const divs = [
      $("#languages"),
      $("#sites"),
      $("#translations"),
      $("#style"),
      $("#hotkeys"),
      $("#storage"),
      $("#others"),
      $("#donation"),
      $("#release_notes"),
    ];
    divs.forEach((element) => {
      element.style.display = "none";
    });

    document.querySelectorAll("nav a").forEach((a) => {
      a.classList.remove("w3-light-grey");
    });

    $(hash).style.display = "block";
    $('a[href="' + hash + '"]').classList.add("w3-light-grey");

    let text;
    if (hash === "#donation") {
      text = chrome.i18n.getMessage("lblMakeDonation");
    } else if (hash === "#release_notes") {
      text = chrome.i18n.getMessage("lblReleaseNotes");
    } else {
      text = chrome.i18n.getMessage("lblSettings");
    }
    $("#itemSelectedName").textContent = text;

    if (sideBarIsVisible) {
      $("#menuContainer").classList.toggle("change");
      $("#sideBar").style.display = "none";
      sideBarIsVisible = false;
    }

    if (hash === "#release_notes") {
      $("#btnPatreon").style.display = "none";
    } else {
      $("#btnPatreon").style.display = "block";
    }
  }
  hashchange();
  window.addEventListener("hashchange", hashchange);

  function fillLanguageList(select) {
    let langs = twpLang.getLanguageList();

    const langsSorted = [];

    for (const i in langs) {
      langsSorted.push([i, langs[i]]);
    }

    langsSorted.sort(function (a, b) {
      return a[1].localeCompare(b[1]);
    });

    langsSorted.forEach((value) => {
      const option = document.createElement("option");
      option.value = value[0];
      option.textContent = value[1];
      select.appendChild(option);
    });
  }

  fillLanguageList($("#selectTargetLanguage"));
  fillLanguageList($("#selectTargetLanguageForText"));

  fillLanguageList($("#favoriteLanguage1"));
  fillLanguageList($("#favoriteLanguage2"));
  fillLanguageList($("#favoriteLanguage3"));

  fillLanguageList($("#addToNeverTranslateLangs"));
  fillLanguageList($("#addToAlwaysTranslateLangs"));
  fillLanguageList($("#addLangToTranslateWhenHovering"));

  function updateDarkMode() {
    switch (twpConfig.get("darkMode")) {
      case "auto":
        if (matchMedia("(prefers-color-scheme: dark)").matches) {
          enableDarkMode();
        } else {
          disableDarkMode();
        }
        break;
      case "yes":
        enableDarkMode();
        break;
      case "no":
        disableDarkMode();
        break;
      default:
        break;
    }
  }
  updateDarkMode();

  // target languages

  const targetLanguage = twpConfig.get("targetLanguage");
  $("#selectTargetLanguage").value = targetLanguage;
  $("#selectTargetLanguage").onchange = (e) => {
    twpConfig.setTargetLanguage(e.target.value);
    location.reload();
  };

  const targetLanguageTextTranslation = twpConfig.get(
    "targetLanguageTextTranslation"
  );
  $("#selectTargetLanguageForText").value = targetLanguageTextTranslation;
  $("#selectTargetLanguageForText").onchange = (e) => {
    twpConfig.setTargetLanguage(e.target.value, true);
    twpConfig.setTargetLanguage(targetLanguage, false);
    location.reload();
  };

  const targetLanguages = twpConfig.get("targetLanguages");

  $("#favoriteLanguage1").value = targetLanguages[0];
  $("#favoriteLanguage2").value = targetLanguages[1];
  $("#favoriteLanguage3").value = targetLanguages[2];

  $("#favoriteLanguage1").onchange = (e) => {
    targetLanguages[0] = e.target.value;
    twpConfig.set("targetLanguages", targetLanguages);
    if (targetLanguages.indexOf(twpConfig.get("targetLanguage")) == -1) {
      twpConfig.set("targetLanguage", targetLanguages[0]);
    }
    if (
      targetLanguages.indexOf(twpConfig.get("targetLanguageTextTranslation")) ==
      -1
    ) {
      twpConfig.set("targetLanguageTextTranslation", targetLanguages[0]);
    }
    location.reload();
  };

  $("#favoriteLanguage2").onchange = (e) => {
    targetLanguages[1] = e.target.value;
    twpConfig.set("targetLanguages", targetLanguages);
    if (targetLanguages.indexOf(twpConfig.get("targetLanguage")) == -1) {
      twpConfig.set("targetLanguage", targetLanguages[0]);
    }
    if (
      targetLanguages.indexOf(twpConfig.get("targetLanguageTextTranslation")) ==
      -1
    ) {
      twpConfig.set("targetLanguageTextTranslation", targetLanguages[0]);
    }
    location.reload();
  };

  $("#favoriteLanguage3").onchange = (e) => {
    targetLanguages[2] = e.target.value;
    twpConfig.set("targetLanguages", targetLanguages);
    if (targetLanguages.indexOf(twpConfig.get("targetLanguage")) == -1) {
      twpConfig.set("targetLanguage", targetLanguages[0]);
    }
    if (
      targetLanguages.indexOf(twpConfig.get("targetLanguageTextTranslation")) ==
      -1
    ) {
      twpConfig.set("targetLanguageTextTranslation", targetLanguages[0]);
    }
    location.reload();
  };

  // Never translate these languages

  function createNodeToNeverTranslateLangsList(langCode, langName) {
    const li = document.createElement("li");
    li.setAttribute("class", "w3-display-container");
    li.value = langCode;
    li.textContent = langName;

    const close = document.createElement("span");
    close.setAttribute("class", "w3-button w3-transparent w3-display-right");
    close.innerHTML = "&times;";

    close.onclick = (e) => {
      e.preventDefault();

      twpConfig.removeLangFromNeverTranslate(langCode);
      li.remove();
    };

    li.appendChild(close);

    return li;
  }

  const neverTranslateLangs = twpConfig.get("neverTranslateLangs");
  neverTranslateLangs.sort((a, b) => a.localeCompare(b));
  neverTranslateLangs.forEach((langCode) => {
    const langName = twpLang.codeToLanguage(langCode);
    const li = createNodeToNeverTranslateLangsList(langCode, langName);
    $("#neverTranslateLangs").appendChild(li);
  });

  $("#addToNeverTranslateLangs").onchange = (e) => {
    const langCode = e.target.value;
    const langName = twpLang.codeToLanguage(langCode);
    const li = createNodeToNeverTranslateLangsList(langCode, langName);
    $("#neverTranslateLangs").appendChild(li);

    twpConfig.addLangToNeverTranslate(langCode);
  };

  // Always translate these languages

  function createNodeToAlwaysTranslateLangsList(langCode, langName) {
    const li = document.createElement("li");
    li.setAttribute("class", "w3-display-container");
    li.value = langCode;
    li.textContent = langName;

    const close = document.createElement("span");
    close.setAttribute("class", "w3-button w3-transparent w3-display-right");
    close.innerHTML = "&times;";

    close.onclick = (e) => {
      e.preventDefault();

      twpConfig.removeLangFromAlwaysTranslate(langCode);
      li.remove();
    };

    li.appendChild(close);

    return li;
  }

  const alwaysTranslateLangs = twpConfig.get("alwaysTranslateLangs");
  alwaysTranslateLangs.sort((a, b) => a.localeCompare(b));
  alwaysTranslateLangs.forEach((langCode) => {
    const langName = twpLang.codeToLanguage(langCode);
    const li = createNodeToAlwaysTranslateLangsList(langCode, langName);
    $("#alwaysTranslateLangs").appendChild(li);
  });

  $("#addToAlwaysTranslateLangs").onchange = (e) => {
    const langCode = e.target.value;
    const langName = twpLang.codeToLanguage(langCode);
    const li = createNodeToAlwaysTranslateLangsList(langCode, langName);
    $("#alwaysTranslateLangs").appendChild(li);

    twpConfig.addLangToAlwaysTranslate(langCode);
  };

  // langsToTranslateWhenHovering

  function createNodeToLangsToTranslateWhenHoveringList(langCode, langName) {
    const li = document.createElement("li");
    li.setAttribute("class", "w3-display-container");
    li.value = langCode;
    li.textContent = langName;

    const close = document.createElement("span");
    close.setAttribute("class", "w3-button w3-transparent w3-display-right");
    close.innerHTML = "&times;";

    close.onclick = (e) => {
      e.preventDefault();

      twpConfig.removeLangFromTranslateWhenHovering(langCode);
      li.remove();
    };

    li.appendChild(close);

    return li;
  }

  const langsToTranslateWhenHovering = twpConfig.get(
    "langsToTranslateWhenHovering"
  );
  langsToTranslateWhenHovering.sort((a, b) => a.localeCompare(b));
  langsToTranslateWhenHovering.forEach((langCode) => {
    const langName = twpLang.codeToLanguage(langCode);
    const li = createNodeToLangsToTranslateWhenHoveringList(langCode, langName);
    $("#langsToTranslateWhenHovering").appendChild(li);
  });

  $("#addLangToTranslateWhenHovering").onchange = (e) => {
    const langCode = e.target.value;
    const langName = twpLang.codeToLanguage(langCode);
    const li = createNodeToLangsToTranslateWhenHoveringList(langCode, langName);
    $("#langsToTranslateWhenHovering").appendChild(li);

    twpConfig.addLangToTranslateWhenHovering(langCode);
  };

  // Always translate these Sites

  function createNodeToAlwaysTranslateSitesList(hostname) {
    const li = document.createElement("li");
    li.setAttribute("class", "w3-display-container");
    li.value = hostname;
    li.textContent = hostname;

    const close = document.createElement("span");
    close.setAttribute("class", "w3-button w3-transparent w3-display-right");
    close.innerHTML = "&times;";

    close.onclick = (e) => {
      e.preventDefault();

      twpConfig.removeSiteFromAlwaysTranslate(hostname);
      li.remove();
    };

    li.appendChild(close);

    return li;
  }

  const alwaysTranslateSites = twpConfig.get("alwaysTranslateSites");
  alwaysTranslateSites.sort((a, b) => a.localeCompare(b));
  alwaysTranslateSites.forEach((hostname) => {
    const li = createNodeToAlwaysTranslateSitesList(hostname);
    $("#alwaysTranslateSites").appendChild(li);
  });

  $("#addToAlwaysTranslateSites").onclick = (e) => {
    const hostname = prompt("Enter the site hostname", "www.site.com");
    if (!hostname) return;

    const li = createNodeToAlwaysTranslateSitesList(hostname);
    $("#alwaysTranslateSites").appendChild(li);

    twpConfig.addSiteToAlwaysTranslate(hostname);
  };

  // Never translate these Sites

  function createNodeToNeverTranslateSitesList(hostname) {
    const li = document.createElement("li");
    li.setAttribute("class", "w3-display-container");
    li.value = hostname;
    li.textContent = hostname;

    const close = document.createElement("span");
    close.setAttribute("class", "w3-button w3-transparent w3-display-right");
    close.innerHTML = "&times;";

    close.onclick = (e) => {
      e.preventDefault();

      twpConfig.removeSiteFromNeverTranslate(hostname);
      li.remove();
    };

    li.appendChild(close);

    return li;
  }

  const neverTranslateSites = twpConfig.get("neverTranslateSites");
  neverTranslateSites.sort((a, b) => a.localeCompare(b));
  neverTranslateSites.forEach((hostname) => {
    const li = createNodeToNeverTranslateSitesList(hostname);
    $("#neverTranslateSites").appendChild(li);
  });

  $("#addToNeverTranslateSites").onclick = (e) => {
    const hostname = prompt("Enter the site hostname", "www.site.com");
    if (!hostname) return;

    const li = createNodeToNeverTranslateSitesList(hostname);
    $("#neverTranslateSites").appendChild(li);

    twpConfig.addSiteToNeverTranslate(hostname);
  };

  function createcustomDictionary(keyWord, customValue) {
    const li = document.createElement("li");
    li.setAttribute("class", "w3-display-container");
    li.value = keyWord;
    if (customValue !== "") {
      li.textContent = keyWord + " ------------------- " + customValue;
    } else {
      li.textContent = keyWord;
    }
    const close = document.createElement("span");
    close.setAttribute("class", "w3-button w3-transparent w3-display-right");
    close.innerHTML = "&times;";

    close.onclick = (e) => {
      e.preventDefault();
      twpConfig.removeKeyWordFromcustomDictionary(keyWord);
      li.remove();
    };
    li.appendChild(close);
    return li;
  }

  let customDictionary = twpConfig.get("customDictionary");
  customDictionary = new Map(
    [...customDictionary.entries()].sort((a, b) =>
      String(a[0]).localeCompare(String(b[0]))
    )
  );
  customDictionary.forEach(function (customValue, keyWord) {
    const li = createcustomDictionary(keyWord, customValue);
    $("#customDictionary").appendChild(li);
  });

  $("#addToCustomDictionary").onclick = (e) => {
    let keyWord = prompt("Enter the keyWord, Minimum two letters ", "");
    if (!keyWord || keyWord.length < 2) return;
    keyWord = keyWord.trim().toLowerCase();
    let customValue = prompt(
      "(Optional)\nYou can enter a value to replace it , or fill in nothing.",
      ""
    );
    if (!customValue) customValue = "";
    customValue = customValue.trim();
    const li = createcustomDictionary(keyWord, customValue);
    $("#customDictionary").appendChild(li);
    twpConfig.addKeyWordTocustomDictionary(keyWord, customValue);
  };

  // sitesToTranslateWhenHovering

  function createNodeToSitesToTranslateWhenHoveringList(hostname) {
    const li = document.createElement("li");
    li.setAttribute("class", "w3-display-container");
    li.value = hostname;
    li.textContent = hostname;

    const close = document.createElement("span");
    close.setAttribute("class", "w3-button w3-transparent w3-display-right");
    close.innerHTML = "&times;";

    close.onclick = (e) => {
      e.preventDefault();

      twpConfig.removeSiteFromTranslateWhenHovering(hostname);
      li.remove();
    };

    li.appendChild(close);

    return li;
  }

  const sitesToTranslateWhenHovering = twpConfig.get(
    "sitesToTranslateWhenHovering"
  );
  sitesToTranslateWhenHovering.sort((a, b) => a.localeCompare(b));
  sitesToTranslateWhenHovering.forEach((hostname) => {
    const li = createNodeToSitesToTranslateWhenHoveringList(hostname);
    $("#sitesToTranslateWhenHovering").appendChild(li);
  });

  $("#addSiteToTranslateWhenHovering").onclick = (e) => {
    const hostname = prompt("Enter the site hostname", "www.site.com");
    if (!hostname) return;

    const li = createNodeToSitesToTranslateWhenHoveringList(hostname);
    $("#sitesToTranslateWhenHovering").appendChild(li);

    twpConfig.addSiteToTranslateWhenHovering(hostname);
  };

  // translations options
  $("#pageTranslatorService").onchange = (e) => {
    twpConfig.set("pageTranslatorService", e.target.value);
  };
  $("#pageTranslatorService").value = twpConfig.get("pageTranslatorService");

  $("#textTranslatorService").onchange = (e) => {
    twpConfig.set("textTranslatorService", e.target.value);
  };
  $("#textTranslatorService").value = twpConfig.get("textTranslatorService");

  $("#ttsSpeed").oninput = (e) => {
    twpConfig.set("ttsSpeed", e.target.value);
    $("#displayTtsSpeed").textContent = e.target.value;
  };
  $("#ttsSpeed").value = twpConfig.get("ttsSpeed");
  $("#displayTtsSpeed").textContent = twpConfig.get("ttsSpeed");

  $("#showOriginalTextWhenHovering").onchange = (e) => {
    twpConfig.set("showOriginalTextWhenHovering", e.target.value);
  };
  $("#showOriginalTextWhenHovering").value = twpConfig.get(
    "showOriginalTextWhenHovering"
  );

  $("#translateTag_pre").onchange = (e) => {
    twpConfig.set("translateTag_pre", e.target.value);
  };
  $("#translateTag_pre").value = twpConfig.get("translateTag_pre");

  $("#enableDeepL").onchange = (e) => {
    twpConfig.set("enableDeepL", e.target.value);
  };
  $("#enableDeepL").value = twpConfig.get("enableDeepL");

  $("#dontSortResults").onchange = (e) => {
    twpConfig.set("dontSortResults", e.target.value);
  };
  $("#dontSortResults").value = twpConfig.get("dontSortResults");

  $("#translateDynamicallyCreatedContent").onchange = (e) => {
    twpConfig.set("translateDynamicallyCreatedContent", e.target.value);
  };
  $("#translateDynamicallyCreatedContent").value = twpConfig.get(
    "translateDynamicallyCreatedContent"
  );

  $("#autoTranslateWhenClickingALink").onchange = (e) => {
    if (e.target.value == "yes") {
      chrome.permissions.request(
        {
          permissions: ["webNavigation"],
        },
        (granted) => {
          if (granted) {
            twpConfig.set("autoTranslateWhenClickingALink", "yes");
          } else {
            twpConfig.set("autoTranslateWhenClickingALink", "no");
            e.target.value = "no";
          }
        }
      );
    } else {
      twpConfig.set("autoTranslateWhenClickingALink", "no");
      chrome.permissions.remove({
        permissions: ["webNavigation"],
      });
    }
  };
  $("#autoTranslateWhenClickingALink").value = twpConfig.get(
    "autoTranslateWhenClickingALink"
  );

  if (twpConfig.get("enableDeepL") === "yes") {
    $('#textTranslatorService option[value="deepl"]').removeAttribute("hidden");
  } else {
    $('#textTranslatorService option[value="deepl"]').setAttribute(
      "hidden",
      ""
    );
  }
  twpConfig.onChanged((name, newvalue) => {
    switch (name) {
      case "enableDeepL":
        if (newvalue === "yes") {
          $('#textTranslatorService option[value="deepl"]').removeAttribute(
            "hidden"
          );
        } else {
          twpConfig.set("textTranslatorService", "google");
          $("#textTranslatorService").value = "google";
          $('#textTranslatorService option[value="deepl"]').setAttribute(
            "hidden",
            ""
          );
        }
        break;
    }
  });

  function enableOrDisableTranslateSelectedAdvancedOptions(value) {
    if (value === "no") {
      document
        .querySelectorAll("#translateSelectedAdvancedOptions input")
        .forEach((input) => {
          input.setAttribute("disabled", "");
        });
    } else {
      document
        .querySelectorAll("#translateSelectedAdvancedOptions input")
        .forEach((input) => {
          input.removeAttribute("disabled");
        });
    }
  }

  $("#showTranslateSelectedButton").onchange = (e) => {
    twpConfig.set("showTranslateSelectedButton", e.target.value);
    enableOrDisableTranslateSelectedAdvancedOptions(e.target.value);
  };
  $("#showTranslateSelectedButton").value = twpConfig.get(
    "showTranslateSelectedButton"
  );
  enableOrDisableTranslateSelectedAdvancedOptions(
    twpConfig.get("showTranslateSelectedButton")
  );

  $("#dontShowIfPageLangIsTargetLang").onchange = (e) => {
    twpConfig.set(
      "dontShowIfPageLangIsTargetLang",
      e.target.checked ? "yes" : "no"
    );
  };
  $("#dontShowIfPageLangIsTargetLang").checked =
    twpConfig.get("dontShowIfPageLangIsTargetLang") === "yes" ? true : false;

  $("#dontShowIfPageLangIsUnknown").onchange = (e) => {
    twpConfig.set(
      "dontShowIfPageLangIsUnknown",
      e.target.checked ? "yes" : "no"
    );
  };
  $("#dontShowIfPageLangIsUnknown").checked =
    twpConfig.get("dontShowIfPageLangIsUnknown") === "yes" ? true : false;

  $("#dontShowIfSelectedTextIsTargetLang").onchange = (e) => {
    twpConfig.set(
      "dontShowIfSelectedTextIsTargetLang",
      e.target.checked ? "yes" : "no"
    );
  };
  $("#dontShowIfSelectedTextIsTargetLang").checked =
    twpConfig.get("dontShowIfSelectedTextIsTargetLang") === "yes"
      ? true
      : false;

  $("#dontShowIfSelectedTextIsUnknown").onchange = (e) => {
    twpConfig.set(
      "dontShowIfSelectedTextIsUnknown",
      e.target.checked ? "yes" : "no"
    );
  };
  $("#dontShowIfSelectedTextIsUnknown").checked =
    twpConfig.get("dontShowIfSelectedTextIsUnknown") === "yes" ? true : false;

  // style options
  $("#useOldPopup").onchange = (e) => {
    twpConfig.set("useOldPopup", e.target.value);
    updateDarkMode();
  };
  $("#useOldPopup").value = twpConfig.get("useOldPopup");

  $("#darkMode").onchange = (e) => {
    twpConfig.set("darkMode", e.target.value);
    updateDarkMode();
  };
  $("#darkMode").value = twpConfig.get("darkMode");

  $("#popupBlueWhenSiteIsTranslated").onchange = (e) => {
    twpConfig.set("popupBlueWhenSiteIsTranslated", e.target.value);
  };
  $("#popupBlueWhenSiteIsTranslated").value = twpConfig.get(
    "popupBlueWhenSiteIsTranslated"
  );

  // hotkeys options
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  $('[data-i18n="lblTranslateSelectedWhenPressTwice"]').innerHTML = $(
    '[data-i18n="lblTranslateSelectedWhenPressTwice"]'
  ).innerHTML.replace("[Ctrl]", "<kbd>Ctrl</kbd>");
  $('[data-i18n="lblTranslateTextOverMouseWhenPressTwice"]').innerHTML = $(
    '[data-i18n="lblTranslateTextOverMouseWhenPressTwice"]'
  ).innerHTML.replace("[Ctrl]", "<kbd>Ctrl</kbd>");

  $("#openNativeShortcutManager").onclick = (e) => {
    chrome.tabs.create({
      url: "chrome://extensions/shortcuts",
    });
  };

  $("#translateSelectedWhenPressTwice").onclick = (e) => {
    twpConfig.set(
      "translateSelectedWhenPressTwice",
      e.target.checked ? "yes" : "no"
    );
  };
  $("#translateSelectedWhenPressTwice").checked =
    twpConfig.get("translateSelectedWhenPressTwice") === "yes";

  $("#translateTextOverMouseWhenPressTwice").onclick = (e) => {
    twpConfig.set(
      "translateTextOverMouseWhenPressTwice",
      e.target.checked ? "yes" : "no"
    );
  };
  $("#translateTextOverMouseWhenPressTwice").checked =
    twpConfig.get("translateTextOverMouseWhenPressTwice") === "yes";

  const defaultShortcuts = {};
  for (const name of Object.keys(chrome.runtime.getManifest().commands || {})) {
    const info = chrome.runtime.getManifest().commands[name];
    if (info.suggested_key && info.suggested_key.default) {
      defaultShortcuts[name] = info.suggested_key.default;
    } else {
      defaultShortcuts[name] = "";
    }
  }

  function addHotkey(hotkeyname, description) {
    if (hotkeyname === "_execute_browser_action" && !description) {
      description = "Enable the extension";
    }

    const li = document.createElement("li");
    li.classList.add("shortcut-row");
    li.setAttribute("id", hotkeyname);
    li.innerHTML = `
        <div>${description}</div>
        <div class="shortcut-input-options">
            <div style="position: relative;">
                <input name="input" class="w3-input w3-border shortcut-input" type="text" readonly placeholder="Enter a shortcut" data-i18n-placeholder="enterShortcut">
                <p name="error" class="shortcut-error" style="position: absolute;"></p>
            </div>
            <div class="w3-hover-light-grey shortcut-button" name="removeKey"><i class="gg-trash"></i></div>
            <div class="w3-hover-light-grey shortcut-button" name="resetKey"><i class="gg-sync"></i></div>
        </div>  
        `;
    $("#KeyboardShortcuts").appendChild(li);

    const input = li.querySelector(`[name="input"]`);
    const error = li.querySelector(`[name="error"]`);
    const removeKey = li.querySelector(`[name="removeKey"]`);
    const resetKey = li.querySelector(`[name="resetKey"]`);

    input.value = twpConfig.get("hotkeys")[hotkeyname];
    if (input.value) {
      resetKey.style.display = "none";
    } else {
      removeKey.style.display = "none";
    }

    function setError(errorname) {
      const text = chrome.i18n.getMessage("hotkeyError_" + errorname);
      switch (errorname) {
        case "ctrlOrAlt":
          error.textContent = text ? text : "Include Ctrl or Alt";
          break;
        case "letter":
          error.textContent = text ? text : "Type a letter";
          break;
        case "invalid":
          error.textContent = text ? text : "Invalid combination";
          break;
        default:
          error.textContent = "";
          break;
      }
    }

    function getKeyString(e) {
      let result = "";
      if (e.ctrlKey) {
        result += "Ctrl+";
      }
      if (e.altKey) {
        result += "Alt+";
      }
      if (e.shiftKey) {
        result += "Shift+";
      }
      if (e.code.match(/Key([A-Z])/)) {
        result += e.code.match(/Key([A-Z])/)[1];
      } else if (e.code.match(/Digit([0-9])/)) {
        result += e.code.match(/Digit([0-9])/)[1];
      }

      return result;
    }

    function setShortcut(name, keystring) {
      const hotkeys = twpConfig.get("hotkeys");
      hotkeys[hotkeyname] = keystring;
      twpConfig.set("hotkeys", hotkeys);
      browser.commands.update({
        name: name,
        shortcut: keystring,
      });
    }

    function onkeychange(e) {
      input.value = getKeyString(e);

      if (e.Key == "Tab") {
        return;
      }
      if (e.key == "Escape") {
        input.blur();
        return;
      }
      if (e.key == "Backspace" || e.key == "Delete") {
        setShortcut(hotkeyname, getKeyString(e));
        input.blur();
        return;
      }
      if (!e.ctrlKey && !e.altKey) {
        setError("ctrlOrAlt");
        return;
      }
      if (e.ctrlKey && e.altKey && e.shiftKey) {
        setError("invalid");
        return;
      }
      e.preventDefault();
      if (!e.code.match(/Key([A-Z])/) && !e.code.match(/Digit([0-9])/)) {
        setError("letter");
        return;
      }

      setShortcut(hotkeyname, getKeyString(e));
      input.blur();

      setError("none");
    }

    input.onkeydown = (e) => onkeychange(e);
    input.onkeyup = (e) => onkeychange(e);

    input.onfocus = (e) => {
      input.value = "";
      setError("");
    };

    input.onblur = (e) => {
      input.value = twpConfig.get("hotkeys")[hotkeyname];
      setError("");
    };

    removeKey.onclick = (e) => {
      input.value = "";
      setShortcut(hotkeyname, "");

      removeKey.style.display = "none";
      resetKey.style.display = "block";
    };

    resetKey.onclick = (e) => {
      input.value = defaultShortcuts[hotkeyname];
      setShortcut(hotkeyname, defaultShortcuts[hotkeyname]);

      removeKey.style.display = "block";
      resetKey.style.display = "none";
    };

    //*
    if (typeof browser === "undefined") {
      input.setAttribute("disabled", "");
      resetKey.style.display = "none";
      removeKey.style.display = "none";
    } else {
      $("#openNativeShortcutManager").style.display = "none";
    }
    // */
  }

  if (typeof chrome.commands !== "undefined") {
    chrome.commands.getAll((results) => {
      for (const result of results) {
        addHotkey(result.name, result.description);
      }
    });
  }

  // storage options
  $("#deleteTranslationCache").onclick = (e) => {
    if (confirm(chrome.i18n.getMessage("doYouWantToDeleteTranslationCache"))) {
      chrome.runtime.sendMessage({
        action: "deleteTranslationCache",
        reload: true,
      });
    }
  };

  $("#backupToFile").onclick = (e) => {
    const configJSON = twpConfig.export();

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(configJSON)
    );
    element.setAttribute(
      "download",
      "twp-backup_" +
        new Date()
          .toISOString()
          .replace(/T/, "_")
          .replace(/\..+/, "")
          .replace(/\:/g, ".") +
        ".txt"
    );

    element.style.display = "none";
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  };
  $("#restoreFromFile").onclick = (e) => {
    const element = document.createElement("input");
    element.setAttribute("type", "file");
    element.setAttribute("accept", "text/plain");

    element.style.display = "none";
    document.body.appendChild(element);

    element.oninput = (e) => {
      const input = e.target;

      const reader = new FileReader();
      reader.onload = function () {
        try {
          if (
            confirm(chrome.i18n.getMessage("doYouWantOverwriteAllSettings"))
          ) {
            twpConfig.import(reader.result);
          }
        } catch (e) {
          alert(chrome.i18n.getMessage("fileIsCorrupted"));
          console.error(e);
        }
      };

      reader.readAsText(input.files[0]);
    };

    element.click();

    document.body.removeChild(element);
  };
  $("#resetToDefault").onclick = (e) => {
    if (confirm(chrome.i18n.getMessage("doYouWantRestoreSettings"))) {
      twpConfig.restoreToDefault();
    }
  };

  // others options
  $("#showReleaseNotes").onchange = (e) => {
    twpConfig.set("showReleaseNotes", e.target.value);
  };
  $("#showReleaseNotes").value = twpConfig.get("showReleaseNotes");

  $("#showPopupMobile").onchange = (e) => {
    twpConfig.set("showPopupMobile", e.target.value);
  };
  $("#showPopupMobile").value = twpConfig.get("showPopupMobile");

  $("#showTranslatePageContextMenu").onchange = (e) => {
    twpConfig.set("showTranslatePageContextMenu", e.target.value);
  };
  $("#showTranslatePageContextMenu").value = twpConfig.get(
    "showTranslatePageContextMenu"
  );

  $("#showTranslateSelectedContextMenu").onchange = (e) => {
    twpConfig.set("showTranslateSelectedContextMenu", e.target.value);
  };
  $("#showTranslateSelectedContextMenu").value = twpConfig.get(
    "showTranslateSelectedContextMenu"
  );

  $("#showButtonInTheAddressBar").onchange = (e) => {
    twpConfig.set("showButtonInTheAddressBar", e.target.value);
  };
  $("#showButtonInTheAddressBar").value = twpConfig.get(
    "showButtonInTheAddressBar"
  );

  $("#translateClickingOnce").onchange = (e) => {
    twpConfig.set("translateClickingOnce", e.target.value);
  };
  $("#translateClickingOnce").value = twpConfig.get("translateClickingOnce");

  $("#btnCalculateStorage").style.display = "inline-block";
  $("#storageUsed").style.display = "none";
  $("#btnCalculateStorage").onclick = (e) => {
    $("#btnCalculateStorage").style.display = "none";

    chrome.runtime.sendMessage(
      {
        action: "getCacheSize",
      },
      (result) => {
        $("#storageUsed").textContent = result;
        $("#storageUsed").style.display = "inline-block";
      }
    );
  };

  if (navigator.language === "pt-BR") {
    $("#currency").value = "BRL";
    $("#donateInUSD").style.display = "none";
  } else {
    $("#currency").value = "USD";
    $("#donateInBRL").style.display = "none";
  }

  $("#currency").onchange = (e) => {
    if (e.target.value === "BRL") {
      $("#donateInUSD").style.display = "none";
      $("#donateInBRL").style.display = "block";
    } else {
      $("#donateInUSD").style.display = "block";
      $("#donateInBRL").style.display = "none";
    }
  };
});

window.scrollTo({
  top: 0,
});
