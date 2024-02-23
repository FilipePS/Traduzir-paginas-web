"use strict";

// get mimetype
var tabToMimeType = {};
chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
    if (details.tabId !== -1) {
      let contentTypeHeader = null;
      for (const header of details.responseHeaders) {
        if (header.name.toLowerCase() === "content-type") {
          contentTypeHeader = header;
          break;
        }
      }
      tabToMimeType[details.tabId] =
        contentTypeHeader && contentTypeHeader.value.split(";", 1)[0];
    }
  },
  {
    urls: ["*://*/*"],
    types: ["main_frame"],
  },
  ["responseHeaders"]
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getMainFramePageLanguageState") {
    chrome.tabs.sendMessage(
      sender.tab.id,
      {
        action: "getCurrentPageLanguageState",
      },
      {
        frameId: 0,
      },
      (pageLanguageState) => {
        checkedLastError();
        sendResponse(pageLanguageState);
      }
    );

    return true;
  } else if (request.action === "getMainFrameTabLanguage") {
    chrome.tabs.sendMessage(
      sender.tab.id,
      {
        action: "getOriginalTabLanguage",
      },
      {
        frameId: 0,
      },
      (tabLanguage) => {
        checkedLastError();
        sendResponse(tabLanguage);
      }
    );

    return true;
  } else if (request.action === "setPageLanguageState") {
    updateContextMenu(request.pageLanguageState);
  } else if (request.action === "openOptionsPage") {
    tabsCreate(chrome.runtime.getURL("/options/options.html"));
  } else if (request.action === "openDonationPage") {
    tabsCreate(chrome.runtime.getURL("/options/options.html#donation"));
  } else if (request.action === "detectTabLanguage") {
    if (!sender.tab) {
      // https://github.com/FilipePS/Traduzir-paginas-web/issues/478
      sendResponse("und");
      return;
    }
    try {
      if (
        (platformInfo.isMobile.any && !platformInfo.isFirefox) ||
        (platformInfo.isDesktop.any && platformInfo.isOpera)
      ) {
        chrome.tabs.sendMessage(
          sender.tab.id,
          { action: "detectLanguageUsingTextContent" },
          { frameId: 0 },
          (result) => sendResponse(result)
        );
      } else {
        chrome.tabs.detectLanguage(sender.tab.id, (result) => {
          checkedLastError();
          sendResponse(result);
        });
      }
    } catch (e) {
      console.error(e);
      sendResponse("und");
    }

    return true;
  } else if (request.action === "getTabHostName") {
    sendResponse(new URL(sender.tab.url).hostname);
  } else if (request.action === "thisFrameIsInFocus") {
    chrome.tabs.sendMessage(
      sender.tab.id,
      { action: "anotherFrameIsInFocus" },
      checkedLastError
    );
  } else if (request.action === "getTabMimeType") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse(tabToMimeType[tabs[0].id]);
    });
    return true;
  } else if (request.action === "restorePagesWithServiceNames") {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, request, checkedLastError);
      });
    });
  } else if (request.action == "authorizationToOpenOptions") {
    chrome.storage.local.set({
      authorizationToOpenOptions: request.authorizationToOpenOptions,
    });
  }
});

function updateTranslateSelectedContextMenu() {
  if (typeof chrome.contextMenus !== "undefined") {
    chrome.contextMenus.remove("translate-selected-text", checkedLastError);
    if (twpConfig.get("showTranslateSelectedContextMenu") === "yes") {
      chrome.contextMenus.create({
        id: "translate-selected-text",
        title: twpI18n.getMessage("msgTranslateSelectedText"),
        contexts: ["selection"],
      });
    }
  }
}

function updateContextMenu(pageLanguageState = "original") {
  let contextMenuTitle;
  if (pageLanguageState === "translated") {
    contextMenuTitle = twpI18n.getMessage("btnRestore");
  } else {
    const targetLanguage = twpConfig.get("targetLanguage");
    contextMenuTitle = twpI18n.getMessage(
      "msgTranslateFor",
      twpLang.codeToLanguage(targetLanguage)
    );
  }
  if (typeof chrome.contextMenus != "undefined") {
    chrome.contextMenus.remove("translate-web-page", checkedLastError);
    chrome.contextMenus.remove(
      "translate-restore-this-frame",
      checkedLastError
    );

    if (twpConfig.get("enableIframePageTranslation") === "yes") {
      if (twpConfig.get("showTranslatePageContextMenu") == "yes") {
        chrome.contextMenus.create({
          id: "translate-web-page",
          title: contextMenuTitle,
          contexts: ["page", "frame"],
          documentUrlPatterns: [
            "http://*/*",
            "https://*/*",
            "file://*/*",
            "ftp://*/*",
          ],
        });
      }
    } else {
      if (twpConfig.get("showTranslatePageContextMenu") == "yes") {
        chrome.contextMenus.create({
          id: "translate-web-page",
          title: contextMenuTitle,
          contexts: ["page"],
          documentUrlPatterns: [
            "http://*/*",
            "https://*/*",
            "file://*/*",
            "ftp://*/*",
          ],
        });
      }

      chrome.contextMenus.create({
        id: "translate-restore-this-frame",
        title: twpI18n.getMessage("btnTranslateRestoreThisFrame"),
        contexts: ["frame"],
        documentUrlPatterns: ["http://*/*", "https://*/*"],
      });
    }
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason == "install") {
    tabsCreate(chrome.runtime.getURL("/options/options.html"));
    twpConfig.onReady(async () => {
      if (chrome.i18n.getUILanguage() === "zh-CN") {
        twpConfig.set("pageTranslatorService", "bing");
        twpConfig.set("textTranslatorService", "bing");
      }
    });
  } else if (
    details.reason == "update" &&
    chrome.runtime.getManifest().version != details.previousVersion
  ) {
    twpConfig.onReady(async () => {
      if (platformInfo.isMobile.any) {
        twpConfig.set("neverTranslateLangs", []);
        twpConfig.set("neverTranslateSites", []);
        twpConfig.set("alwaysTranslateLangs", []);
        twpConfig.set("alwaysTranslateSites", []);
        return;
      }
      if (twpConfig.get("showReleaseNotes") !== "yes") return;
      let lastTimeShowingReleaseNotes = twpConfig.get(
        "lastTimeShowingReleaseNotes"
      );
      let showReleaseNotes = false;
      if (lastTimeShowingReleaseNotes) {
        const date = new Date();
        date.setDate(date.getDate() - 26);
        if (date.getTime() > lastTimeShowingReleaseNotes) {
          showReleaseNotes = true;
          lastTimeShowingReleaseNotes = Date.now();
          twpConfig.set(
            "lastTimeShowingReleaseNotes",
            lastTimeShowingReleaseNotes
          );
        }
      } else {
        showReleaseNotes = true;
        lastTimeShowingReleaseNotes = Date.now();
        twpConfig.set(
          "lastTimeShowingReleaseNotes",
          lastTimeShowingReleaseNotes
        );
      }
      if (showReleaseNotes) {
        tabsCreate(
          chrome.runtime.getURL("/options/options.html#release_notes")
        );
      }
    });
    twpConfig.onReady(async () => {
      translationCache.deleteTranslationCache();
    });
    twpConfig.onReady(async () => {
      twpConfig.set(
        "textTranslatorService",
        twpConfig.get("enabledServices")[0]
      );
    });
  }

  twpConfig.onReady(async () => {
    if (platformInfo.isMobile.any) {
      const enabledServices = twpConfig.get("enabledServices");
      const index = enabledServices.indexOf("deepl");
      if (index !== -1) {
        enabledServices.splice(index, 1);
        twpConfig.set("enabledServices", enabledServices);
      }
    }
  });
});

function resetPageAction(tabId, forceShow = false) {
  if (!chrome.pageAction) return;
  if (twpConfig.get("translateClickingOnce") === "yes" && !forceShow) {
    chrome.pageAction.setPopup({
      popup: "",
      tabId,
    });
  } else {
    if (twpConfig.get("useOldPopup") === "yes") {
      chrome.pageAction.setPopup({
        popup: "popup/old-popup.html",
        tabId,
      });
    } else {
      chrome.pageAction.setPopup({
        popup: "popup/popup.html",
        tabId,
      });
    }
  }
}

function resetBrowserAction(forceShow = false) {
  if (twpConfig.get("translateClickingOnce") === "yes" && !forceShow) {
    chrome.browserAction.setPopup({
      popup: "",
    });
  } else {
    if (twpConfig.get("useOldPopup") === "yes") {
      chrome.browserAction.setPopup({
        popup: "popup/old-popup.html",
      });
    } else {
      chrome.browserAction.setPopup({
        popup: "popup/popup.html",
      });
    }
  }
}

function sendToggleTranslationMessage(tabId) {
  if (twpConfig.get("enableIframePageTranslation") === "yes") {
    chrome.tabs.sendMessage(
      tabId,
      {
        action: "toggle-translation",
      },
      checkedLastError
    );
  } else {
    chrome.tabs.sendMessage(
      tabId,
      {
        action: "toggle-translation",
      },
      { frameId: 0 },
      checkedLastError
    );
  }
}

function sendTranslatePageMessage(tabId, targetLanguage) {
  if (twpConfig.get("enableIframePageTranslation") === "yes") {
    chrome.tabs.sendMessage(
      tabId,
      {
        action: "translatePage",
        targetLanguage,
      },
      checkedLastError
    );
  } else {
    chrome.tabs.sendMessage(
      tabId,
      {
        action: "translatePage",
        targetLanguage,
      },
      { frameId: 0 },
      checkedLastError
    );
  }
}

if (typeof chrome.contextMenus !== "undefined") {
  const updateActionContextMenu = () => {
    chrome.contextMenus.remove("browserAction-showPopup", checkedLastError);
    chrome.contextMenus.remove("pageAction-showPopup", checkedLastError);
    chrome.contextMenus.remove("never-translate", checkedLastError);
    chrome.contextMenus.remove("more-options", checkedLastError);
    chrome.contextMenus.remove("browserAction-translate-pdf", checkedLastError);
    chrome.contextMenus.remove("pageAction-translate-pdf", checkedLastError);

    chrome.contextMenus.create({
      id: "browserAction-showPopup",
      title: twpI18n.getMessage("btnShowPopup"),
      contexts: ["browser_action"],
    });
    chrome.contextMenus.create({
      id: "pageAction-showPopup",
      title: twpI18n.getMessage("btnShowPopup"),
      contexts: ["page_action"],
    });
    chrome.contextMenus.create({
      id: "never-translate",
      title: twpI18n.getMessage("btnNeverTranslate"),
      contexts: ["browser_action", "page_action"],
    });
    chrome.contextMenus.create({
      id: "more-options",
      title: twpI18n.getMessage("btnMoreOptions"),
      contexts: ["browser_action", "page_action"],
    });
    chrome.contextMenus.create({
      id: "browserAction-translate-pdf",
      title: twpI18n.getMessage("msgTranslatePDF"),
      contexts: ["browser_action"],
    });
    chrome.contextMenus.create({
      id: "pageAction-translate-pdf",
      title: twpI18n.getMessage("msgTranslatePDF"),
      contexts: ["page_action"],
    });
  };
  updateActionContextMenu();

  const tabHasContentScript = {};
  let currentTabId = null;
  chrome.tabs.onActivated.addListener((activeInfo) => {
    currentTabId = activeInfo.tabId;
    updateActionContextMenu();
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId == "translate-web-page") {
      const mimeType = tabToMimeType[tab.id];
      if (
        mimeType &&
        mimeType.toLowerCase() === "application/pdf" &&
        chrome.pageAction &&
        chrome.pageAction.openPopup
      ) {
        chrome.pageAction.openPopup();
      } else {
        sendToggleTranslationMessage(tab.id);
      }
    } else if (info.menuItemId == "translate-restore-this-frame") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(
          tab.id,
          {
            action: "toggle-translation",
          },
          { frameId: info.frameId },
          checkedLastError
        );
      });
    } else if (info.menuItemId == "translate-selected-text") {
      if (
        chrome.pageAction &&
        chrome.pageAction.openPopup &&
        (!tab || !tabHasContentScript[tab.id] || tab.isInReaderMode)
      ) {
        chrome.pageAction.setPopup({
          popup:
            "popup/popup-translate-text.html#text=" +
            encodeURIComponent(info.selectionText),
          tabId: tab?.id || currentTabId,
        });
        chrome.pageAction.openPopup();

        resetPageAction(tab?.id || currentTabId);
      } else {
        // a merda do chrome não suporte openPopup
        chrome.tabs.sendMessage(
          tab.id,
          {
            action: "TranslateSelectedText",
            selectionText: info.selectionText,
          },
          checkedLastError
        );
      }
    } else if (info.menuItemId == "browserAction-showPopup") {
      resetBrowserAction(true);

      if (chrome.browserAction.openPopup) {
        chrome.browserAction.openPopup();
      }

      resetBrowserAction();
    } else if (info.menuItemId == "pageAction-showPopup") {
      resetPageAction(tab.id, true);

      if (chrome.pageAction) {
        chrome.pageAction.openPopup();
      }

      resetPageAction(tab.id);
    } else if (info.menuItemId == "never-translate") {
      const hostname = new URL(tab.url).hostname;
      twpConfig.addSiteToNeverTranslate(hostname);
    } else if (info.menuItemId == "more-options") {
      tabsCreate(chrome.runtime.getURL("/options/options.html"));
    } else if (info.menuItemId == "browserAction-translate-pdf") {
      const mimeType = tabToMimeType[tab.id];
      if (
        mimeType &&
        mimeType.toLowerCase() === "application/pdf" &&
        typeof chrome.browserAction.openPopup !== "undefined"
      ) {
        chrome.browserAction.openPopup();
      } else {
        tabsCreate("https://pdf.translatewebpages.org/");
      }
    } else if (info.menuItemId == "pageAction-translate-pdf") {
      const mimeType = tabToMimeType[tab.id];
      if (
        mimeType &&
        mimeType.toLowerCase() === "application/pdf" &&
        typeof chrome.pageAction.openPopup !== "undefined"
      ) {
        chrome.pageAction.openPopup();
      } else {
        tabsCreate("https://pdf.translatewebpages.org/");
      }
    }
  });

  chrome.tabs.onActivated.addListener((activeInfo) => {
    twpConfig.onReady(() => {
      updateContextMenu();
      updateTranslateSelectedContextMenu();
    });
    chrome.tabs.sendMessage(
      activeInfo.tabId,
      {
        action: "getCurrentPageLanguageState",
      },
      {
        frameId: 0,
      },
      (pageLanguageState) => {
        checkedLastError();
        if (pageLanguageState) {
          twpConfig.onReady(() => updateContextMenu(pageLanguageState));
        }
      }
    );
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.active && changeInfo.status == "loading") {
      twpConfig.onReady(() => updateContextMenu());
    } else if (changeInfo.status == "complete") {
      chrome.tabs.sendMessage(
        tabId,
        {
          action: "contentScriptIsInjected",
        },
        {
          frameId: 0,
        },
        (response) => {
          checkedLastError();
          tabHasContentScript[tabId] = !!response;
        }
      );
    }
  });

  chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    delete tabHasContentScript[tabId];
  });

  chrome.tabs.query({}, (tabs) =>
    tabs.forEach((tab) =>
      chrome.tabs.sendMessage(
        tab.id,
        {
          action: "contentScriptIsInjected",
        },
        {
          frameId: 0,
        },
        (response) => {
          checkedLastError();
          if (response) {
            tabHasContentScript[tab.id] = true;
          }
        }
      )
    )
  );
}

twpConfig.onReady(() => {
  if (platformInfo.isMobile.any) {
    chrome.tabs.query({}, (tabs) =>
      tabs.forEach((tab) => {
        if (chrome.pageAction) {
          chrome.pageAction.hide(tab.id);
        }
      })
    );

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status == "loading" && chrome.pageAction) {
        chrome.pageAction.hide(tabId);
      }
    });

    chrome.browserAction.onClicked.addListener((tab) => {
      chrome.tabs.sendMessage(
        tab.id,
        {
          action: "showPopupMobile",
        },
        {
          frameId: 0,
        },
        checkedLastError
      );
    });
  } else {
    if (chrome.pageAction) {
      chrome.pageAction.onClicked.addListener((tab) => {
        if (twpConfig.get("translateClickingOnce") === "yes") {
          sendToggleTranslationMessage(tab.id);
        }
      });
    }
    chrome.browserAction.onClicked.addListener((tab) => {
      if (twpConfig.get("translateClickingOnce") === "yes") {
        sendToggleTranslationMessage(tab.id);
      }
    });

    resetBrowserAction();

    twpConfig.onChanged((name, newvalue) => {
      switch (name) {
        case "useOldPopup":
          resetBrowserAction();
          break;
        case "translateClickingOnce":
          resetBrowserAction();
          chrome.tabs.query(
            {
              currentWindow: true,
              active: true,
            },
            (tabs) => {
              resetPageAction(tabs[0].id);
            }
          );
          break;
      }
    });

    {
      let pageLanguageState = "original";

      // https://github.com/FilipePS/Traduzir-paginas-web/issues/548
      const isFirefoxAlpenglow = function (theme) {
        let isFirefoxAlpenglowTheme = false;
        try {
          if (
            [
              '{"additional_backgrounds_alignment":["right top","left top","right top"],"additional_backgrounds_tiling":["no-repeat","no-repeat","repeat-x"],"color_scheme":null,"content_color_scheme":null,"zap_gradient":"linear-gradient(90deg, #9059FF 0%, #FF4AA2 52.08%, #FFBD4F 100%)"}',
              '{"additional_backgrounds_alignment":["right top","left top","right top"],"additional_backgrounds_tiling":["no-repeat","no-repeat","repeat-x"],"color_scheme":null,"content_color_scheme":null}',
            ].includes(JSON.stringify(theme.properties)) &&
            [
              '{"accentcolor":null,"bookmark_text":"hsla(261, 53%, 15%, 1)","button_background_active":"hsla(240, 26%, 11%, .16)","button_background_hover":"hsla(240, 26%, 11%, .08)","frame":"hsla(240, 20%, 98%, 1)","frame_inactive":null,"icons":"hsla(258, 66%, 48%, 1)","icons_attention":"hsla(180, 100%, 32%, 1)","ntp_background":"#F9F9FB","ntp_card_background":null,"ntp_text":"hsla(261, 53%, 15%, 1)","popup":"hsla(254, 46%, 21%, 1)","popup_border":"hsla(255, 100%, 94%, .32)","popup_highlight":"hsla(255, 100%, 94%, .12)","popup_highlight_text":"hsla(0, 0%, 100%, 1)","popup_text":"hsla(255, 100%, 94%, 1)","sidebar":"hsla(240, 15%, 95%, 1)","sidebar_border":"hsla(261, 53%, 15%, .24)","sidebar_highlight":"hsla(265, 100%, 72%, 1)","sidebar_highlight_text":"hsla(0, 0%, 100%, 1)","sidebar_text":"hsla(261, 53%, 15%, 1)","tab_background_separator":"hsla(261, 53%, 15%, 1)","tab_background_text":"hsla(261, 53%, 15%, 1)","tab_line":"hsla(265, 100%, 72%, 1)","tab_loading":"hsla(265, 100%, 72%, 1)","tab_selected":null,"tab_text":"hsla(261, 53%, 15%, 1)","textcolor":null,"toolbar":"hsla(0, 0%, 100%, .76)","toolbar_bottom_separator":"hsla(261, 53%, 15%, .32)","toolbar_field":"hsla(0, 0%, 100%, .8)","toolbar_field_border":"transparent","toolbar_field_border_focus":"hsla(265, 100%, 72%, 1)","toolbar_field_focus":"hsla(261, 53%, 15%, .96)","toolbar_field_highlight":"hsla(265, 100%, 72%, .32)","toolbar_field_highlight_text":null,"toolbar_field_separator":null,"toolbar_field_text":"hsla(261, 53%, 15%, 1)","toolbar_field_text_focus":"hsla(255, 100%, 94%, 1)","toolbar_text":"hsla(261, 53%, 15%, 1)","toolbar_top_separator":"transparent","toolbar_vertical_separator":"hsla(261, 53%, 15%, .2)","focus_outline":"hsla(258, 65%, 48%, 1)"}',
              '{"accentcolor":null,"bookmark_text":"hsla(261, 53%, 15%, 1)","button_background_active":"hsla(240, 26%, 11%, .16)","button_background_hover":"hsla(240, 26%, 11%, .08)","frame":"hsla(240, 20%, 98%, 1)","frame_inactive":null,"icons":"hsla(258, 66%, 48%, 1)","icons_attention":"hsla(180, 100%, 32%, 1)","ntp_background":"hsla(0, 0%, 100%, 1)","ntp_card_background":null,"ntp_text":"hsla(261, 53%, 15%, 1)","popup":"hsla(254, 46%, 21%, 1)","popup_border":"hsla(255, 100%, 94%, .32)","popup_highlight":"hsla(255, 100%, 94%, .12)","popup_highlight_text":null,"popup_text":"hsla(255, 100%, 94%, 1)","sidebar":"hsla(240, 15%, 95%, 1)","sidebar_border":"hsla(261, 53%, 15%, .24)","sidebar_highlight":"hsla(265, 100%, 72%, 1)","sidebar_highlight_text":"hsla(0, 0%, 100%, 1)","sidebar_text":"hsla(261, 53%, 15%, 1)","tab_background_separator":"hsla(261, 53%, 15%, 1)","tab_background_text":"hsla(261, 53%, 15%, 1)","tab_line":"hsla(265, 100%, 72%, 1)","tab_loading":"hsla(265, 100%, 72%, 1)","tab_selected":null,"tab_text":"hsla(261, 53%, 15%, 1)","textcolor":null,"toolbar":"hsla(0, 0%, 100%, .76)","toolbar_bottom_separator":"hsla(261, 53%, 15%, .32)","toolbar_field":"hsla(0, 0%, 100%, .8)","toolbar_field_border":"hsla(261, 53%, 15%, .32)","toolbar_field_border_focus":"hsla(265, 100%, 72%, 1)","toolbar_field_focus":"hsla(261, 53%, 15%, .96)","toolbar_field_highlight":"hsla(265, 100%, 72%, .32)","toolbar_field_highlight_text":null,"toolbar_field_separator":"hsla(261, 53%, 15%, .32)","toolbar_field_text":"hsla(261, 53%, 15%, 1)","toolbar_field_text_focus":"hsla(255, 100%, 94%, 1)","toolbar_text":"hsla(261, 53%, 15%, 1)","toolbar_top_separator":"hsla(261, 53%, 15%, 1)","toolbar_vertical_separator":"hsla(261, 53%, 15%, .08)"}',
            ].includes(JSON.stringify(theme.colors))
          ) {
            isFirefoxAlpenglowTheme = true;
          }
        } catch {}
        return isFirefoxAlpenglowTheme;
      };

      let themeColorFrame = null;
      let themeColorToolbar = null;
      let themeColorToolbarField = null;
      let themeColorFieldText = null;
      let themeColorAttention = null;
      let isUsingTheme = false;
      let isFirefoxAlpenglowTheme = false;
      if (typeof browser != "undefined" && browser.theme) {
        function onThemeUpdated() {
          browser.theme.getCurrent().then((theme) => {
            themeColorFrame = null;
            themeColorToolbar = null;
            themeColorToolbarField = null;
            themeColorFieldText = null;
            themeColorAttention = null;
            if (theme.colors && theme.colors.frame) {
              themeColorFrame = theme.colors.frame;
            }
            if (theme.colors && theme.colors.toolbar) {
              themeColorToolbar = theme.colors.toolbar;
            }
            if (theme.colors && theme.colors.toolbar_field) {
              themeColorToolbarField = theme.colors.toolbar_field;
            }
            if (theme.colors && theme.colors.toolbar_field_text) {
              themeColorFieldText = theme.colors.toolbar_field_text;
            }
            if (theme.colors && theme.colors.icons_attention) {
              themeColorAttention = theme.colors.icons_attention;
            }

            isUsingTheme = false;
            if (theme.colors || theme.images || theme.properties) {
              isUsingTheme = true;
            }

            isFirefoxAlpenglowTheme = isFirefoxAlpenglow(theme);

            updateIconInAllTabs();
          });
        }
        onThemeUpdated();
        browser.theme.onUpdated.addListener(() => onThemeUpdated());
      }

      let darkMode = false;
      darkMode = matchMedia("(prefers-color-scheme: dark)").matches;
      updateIconInAllTabs();

      matchMedia("(prefers-color-scheme: dark)").addEventListener(
        "change",
        () => {
          darkMode = matchMedia("(prefers-color-scheme: dark)").matches;
          updateIconInAllTabs();
        }
      );

      function getSVGIcon(incognito = false) {
        const svgXml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                    <path fill="$(fill);" fill-opacity="$(fill-opacity);" d="M 45 0 C 20.186 0 0 20.186 0 45 L 0 347 C 0 371.814 20.186 392 45 392 L 301 392 C 305.819 392 310.34683 389.68544 313.17383 385.77344 C 315.98683 381.84744 316.76261 376.82491 315.22461 372.25391 L 195.23828 10.269531 A 14.995 14.995 0 0 0 181 0 L 45 0 z M 114.3457 107.46289 L 156.19336 107.46289 C 159.49489 107.46289 162.41322 109.61359 163.39258 112.76367 L 163.38281 112.77539 L 214.06641 276.2832 C 214.77315 278.57508 214.35913 281.05986 212.93555 282.98828 C 211.52206 284.90648 209.27989 286.04688 206.87695 286.04688 L 179.28516 286.04688 C 175.95335 286.04687 173.01546 283.86624 172.06641 280.67578 L 159.92969 240.18945 L 108.77148 240.18945 L 97.564453 280.52344 C 96.655774 283.77448 93.688937 286.03711 90.306641 286.03711 L 64.347656 286.03711 C 61.954806 286.03711 59.71461 284.90648 58.291016 282.98828 C 56.867422 281.05986 56.442021 278.57475 57.138672 276.29297 L 107.14648 112.79492 C 108.11572 109.62465 111.03407 107.46289 114.3457 107.46289 z M 133.39648 137.70117 L 114.55664 210.03125 L 154.06445 210.03125 L 133.91211 137.70117 L 133.39648 137.70117 z " />
                    <path fill="$(fill);" fill-opacity="$(fill-opacity);" d="M226.882 378.932c28.35 85.716 26.013 84.921 34.254 88.658a14.933 14.933 0 0 0 6.186 1.342c5.706 0 11.16-3.274 13.67-8.809l36.813-81.19z" />
                    <g>
                    <path fill="$(fill);" fill-opacity="$(fill-opacity);" d="M467 121H247.043L210.234 10.268A15 15 0 0 0 196 0H45C20.187 0 0 20.187 0 45v301c0 24.813 20.187 45 45 45h165.297l36.509 110.438c2.017 6.468 7.999 10.566 14.329 10.566.035 0 .07-.004.105-.004h205.761c24.813 0 45-20.187 45-45V166C512 141.187 491.813 121 467 121zM45 361c-8.271 0-15-6.729-15-15V45c0-8.271 6.729-15 15-15h140.179l110.027 331H45zm247.729 30l-29.4 64.841L241.894 391zM482 467c0 8.271-6.729 15-15 15H284.408l45.253-99.806a15.099 15.099 0 0 0 .571-10.932L257.015 151H467c8.271 0 15 6.729 15 15z" />
                    <path fill="$(fill);" fill-opacity="$(fill-opacity);" d="M444.075 241h-45v-15c0-8.284-6.716-15-15-15-8.284 0-15 6.716-15 15v15h-45c-8.284 0-15 6.716-15 15 0 8.284 6.716 15 15 15h87.14c-4.772 14.185-15.02 30.996-26.939 47.174a323.331 323.331 0 0 1-7.547-10.609c-4.659-6.851-13.988-8.628-20.838-3.969-6.85 4.658-8.627 13.988-3.969 20.839 4.208 6.189 8.62 12.211 13.017 17.919-7.496 8.694-14.885 16.57-21.369 22.94-5.913 5.802-6.003 15.299-.2 21.212 5.777 5.889 15.273 6.027 21.211.201.517-.508 8.698-8.566 19.624-20.937 10.663 12.2 18.645 20.218 19.264 20.837 5.855 5.855 15.35 5.858 21.208.002 5.858-5.855 5.861-15.352.007-21.212-.157-.157-9.34-9.392-21.059-23.059 21.233-27.448 34.18-51.357 38.663-71.338h1.786c8.284 0 15-6.716 15-15 0-8.284-6.715-15-14.999-15z" />
                    </g>
                </svg>
                `;

        let svg64;
        if (
          pageLanguageState === "translated" &&
          twpConfig.get("popupBlueWhenSiteIsTranslated") === "yes"
        ) {
          svg64 = svgXml.replace(/\$\(fill\-opacity\)\;/g, "1.0");
          if (isFirefoxAlpenglowTheme) {
            if (darkMode || incognito) {
              svg64 = btoa(
                svg64.replace(/\$\(fill\)\;/g, "hsla(157, 100%, 66%, 1)")
              );
            } else {
              svg64 = btoa(
                svg64.replace(/\$\(fill\)\;/g, "hsla(180, 100%, 32%, 1)")
              );
            }
          } else {
            if (
              themeColorFrame &&
              themeColorToolbar &&
              themeColorToolbarField
            ) {
              try {
                darkMode = isDarkColor(
                  standardize_color(
                    themeColorFrame,
                    themeColorToolbar,
                    themeColorToolbarField
                  )
                );
              } catch (e) {
                console.error(e);
              }
            } else if (themeColorFieldText) {
              try {
                darkMode = !isDarkColor(
                  standardize_color(
                    themeColorFieldText,
                    themeColorFieldText,
                    themeColorFieldText
                  )
                );
              } catch (e) {
                console.error(e);
              }
            }

            if (themeColorAttention) {
              svg64 = btoa(svg64.replace(/\$\(fill\)\;/g, themeColorAttention));
            } else if (!isUsingTheme && (darkMode || incognito)) {
              svg64 = btoa(svg64.replace(/\$\(fill\)\;/g, "#00ddff"));
            } else if (isUsingTheme && darkMode) {
              svg64 = btoa(svg64.replace(/\$\(fill\)\;/g, "#00ddff"));
            } else {
              svg64 = btoa(svg64.replace(/\$\(fill\)\;/g, "#0061e0"));
            }
          }
        } else {
          if ((isUsingTheme && darkMode) || (!isUsingTheme && incognito)) {
            svg64 = svgXml.replace(/\$\(fill\-opacity\)\;/g, "1.0");
          } else {
            svg64 = svgXml.replace(/\$\(fill\-opacity\)\;/g, "0.7");
          }
          if (isFirefoxAlpenglowTheme) {
            if (darkMode || incognito) {
              svg64 = btoa(
                svg64.replace(/\$\(fill\)\;/g, "hsla(255, 100%, 94%, 1)")
              );
            } else {
              svg64 = btoa(
                svg64.replace(/\$\(fill\)\;/g, "hsla(261, 53%, 15%, 1)")
              );
            }
          } else {
            if (themeColorFieldText) {
              svg64 = btoa(svg64.replace(/\$\(fill\)\;/g, themeColorFieldText));
            } else if (!isUsingTheme && (darkMode || incognito)) {
              svg64 = btoa(svg64.replace(/\$\(fill\)\;/g, "white"));
            } else {
              svg64 = btoa(svg64.replace(/\$\(fill\)\;/g, "black"));
            }
          }
        }

        const b64Start = "data:image/svg+xml;base64,";
        return b64Start + svg64;
      }

      function standardize_color(str1, str2, str3) {
        var ctx = new OffscreenCanvas(1, 1).getContext("2d");
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = str1;
        ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = str2;
        ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = str3;
        ctx.fillRect(0, 0, 1, 1);
        var data = ctx.getImageData(0, 0, 1, 1).data;
        var rgb = [data[0], data[1], data[2]];
        ctx.fillStyle = "rgb(" + rgb.join(",") + ")";
        return ctx.fillStyle;
      }

      function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
            }
          : null;
      }

      function isDarkColor(hexColor) {
        var rgb = hexToRgb(hexColor);

        // Normalizando os valores RGB para o intervalo [0, 1]
        var r = rgb.r / 255,
          g = rgb.g / 255,
          b = rgb.b / 255,
          max = Math.max(r, g, b),
          min = Math.min(r, g, b),
          l = (max + min) / 2;

        // Verificando a luminosidade
        return l <= 0.5;
      }

      function updateIcon(tabId) {
        chrome.tabs.get(tabId, (tabInfo) => {
          const incognito = tabInfo ? tabInfo.incognito : false;

          if (chrome.pageAction) {
            resetPageAction(tabId);
            chrome.pageAction.setIcon({
              tabId: tabId,
              path: getSVGIcon(incognito),
            });

            if (twpConfig.get("showButtonInTheAddressBar") == "no") {
              chrome.pageAction.hide(tabId);
            } else {
              chrome.pageAction.show(tabId);
            }
          }

          if (chrome.browserAction) {
            if (
              pageLanguageState === "translated" &&
              twpConfig.get("popupBlueWhenSiteIsTranslated") === "yes"
            ) {
              chrome.browserAction.setIcon({
                tabId: tabId,
                path: "/icons/icon-32-translated.png",
              });
            } else {
              chrome.browserAction.setIcon({
                tabId: tabId,
                path: "/icons/icon-32.png",
              });
            }
          }
        });
      }

      function updateIconInAllTabs() {
        chrome.tabs.query({}, (tabs) =>
          tabs.forEach((tab) => updateIcon(tab.id))
        );
      }

      chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status == "loading") {
          pageLanguageState = "original";
          updateIcon(tabId);
        } else if (changeInfo.status == "complete") {
          chrome.tabs.sendMessage(
            tabId,
            {
              action: "getCurrentPageLanguageState",
            },
            {
              frameId: 0,
            },
            (_pageLanguageState) => {
              checkedLastError();
              if (_pageLanguageState) {
                pageLanguageState = _pageLanguageState;
                updateIcon(tabId);
              }
            }
          );
        }
      });

      chrome.tabs.onActivated.addListener((activeInfo) => {
        pageLanguageState = "original";
        updateIcon(activeInfo.tabId);
        chrome.tabs.sendMessage(
          activeInfo.tabId,
          {
            action: "getCurrentPageLanguageState",
          },
          {
            frameId: 0,
          },
          (_pageLanguageState) => {
            checkedLastError();
            if (_pageLanguageState) {
              pageLanguageState = _pageLanguageState;
              updateIcon(activeInfo.tabId);
            }
          }
        );
      });

      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "setPageLanguageState") {
          pageLanguageState = request.pageLanguageState;
          updateIcon(sender.tab.id);
        }
      });

      twpConfig.onChanged((name, newvalue) => {
        switch (name) {
          case "useOldPopup":
            updateIconInAllTabs();
            break;
          case "showButtonInTheAddressBar":
            updateIconInAllTabs();
            break;
        }
      });
    }
  }
});

if (typeof chrome.commands !== "undefined") {
  chrome.commands.onCommand.addListener((command) => {
    if (command === "hotkey-toggle-translation") {
      chrome.tabs.query(
        {
          currentWindow: true,
          active: true,
        },
        (tabs) => sendToggleTranslationMessage(tabs[0].id)
      );
    } else if (command === "hotkey-translate-selected-text") {
      chrome.tabs.query(
        {
          currentWindow: true,
          active: true,
        },
        (tabs) =>
          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              action: "TranslateSelectedText",
            },
            checkedLastError
          )
      );
    } else if (command === "hotkey-swap-page-translation-service") {
      chrome.tabs.query(
        {
          active: true,
          currentWindow: true,
        },
        (tabs) =>
          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              action: "swapTranslationService",
              newServiceName: twpConfig.swapPageTranslationService(),
            },
            checkedLastError
          )
      );
    } else if (command === "hotkey-show-original") {
      chrome.tabs.query(
        {
          active: true,
          currentWindow: true,
        },
        (tabs) =>
          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              action: "translatePage",
              targetLanguage: "original",
            },
            checkedLastError
          )
      );
    } else if (command === "hotkey-translate-page-1") {
      chrome.tabs.query(
        {
          active: true,
          currentWindow: true,
        },
        (tabs) => {
          twpConfig.setTargetLanguage(twpConfig.get("targetLanguages")[0]);
          sendTranslatePageMessage(
            tabs[0].id,
            twpConfig.get("targetLanguages")[0]
          );
        }
      );
    } else if (command === "hotkey-translate-page-2") {
      chrome.tabs.query(
        {
          active: true,
          currentWindow: true,
        },
        (tabs) => {
          twpConfig.setTargetLanguage(twpConfig.get("targetLanguages")[1]);
          sendTranslatePageMessage(
            tabs[0].id,
            twpConfig.get("targetLanguages")[1]
          );
        }
      );
    } else if (command === "hotkey-translate-page-3") {
      chrome.tabs.query(
        {
          active: true,
          currentWindow: true,
        },
        (tabs) => {
          twpConfig.setTargetLanguage(twpConfig.get("targetLanguages")[2]);
          sendTranslatePageMessage(
            tabs[0].id,
            twpConfig.get("targetLanguages")[2]
          );
        }
      );
    } else if (command === "hotkey-hot-translate-selected-text") {
      chrome.tabs.query(
        {
          active: true,
          currentWindow: true,
        },
        (tabs) => {
          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              action: "hotTranslateSelectedText",
            },
            checkedLastError
          );
        }
      );
    }
  });
}

twpConfig.onReady(async () => {
  updateContextMenu();
  updateTranslateSelectedContextMenu();

  twpConfig.onChanged((name, newvalue) => {
    if (name === "showTranslateSelectedContextMenu") {
      updateTranslateSelectedContextMenu();
    }
  });

  if (!twpConfig.get("installDateTime")) {
    twpConfig.set("installDateTime", Date.now());
  }
});

twpConfig.onReady(async () => {
  let navigationsInfo = {};
  let tabsInfo = {};

  function tabsOnRemoved(tabId) {
    delete navigationsInfo[tabId];
    delete tabsInfo[tabId];
  }

  function runtimeOnMessage(request, sender, sendResponse) {
    if (request.action === "setPageLanguageState") {
      tabsInfo[sender.tab.id] = {
        pageLanguageState: request.pageLanguageState,
        host: new URL(sender.tab.url).host,
      };
    }
  }

  //TODO ver porque no Firefox o evento OnCommitted executa antes de OnCreatedNavigationTarget e OnBeforeNavigate quando [target="_blank"]

  function webNavigationOnCreatedNavigationTarget(details) {
    const navInfo = navigationsInfo[details.tabId] || {};
    navInfo.sourceTabId = details.sourceTabId;
    navigationsInfo[details.tabId] = navInfo;
  }

  function webNavigationOnBeforeNavigate(details) {
    if (details.frameId !== 0) return;

    const navInfo = navigationsInfo[details.tabId] || {
      sourceTabId: details.tabId,
    };
    navInfo.beforeNavigateIsExecuted = true;
    if (tabsInfo[navInfo.sourceTabId]) {
      navInfo.sourceHost = tabsInfo[navInfo.sourceTabId].host;
      navInfo.sourcePageLanguageState =
        tabsInfo[navInfo.sourceTabId].pageLanguageState;
    }
    navigationsInfo[details.tabId] = navInfo;

    if (navInfo.promise_resolve) {
      navInfo.promise_resolve();
    }
  }

  async function webNavigationOnCommitted(details) {
    if (details.frameId !== 0) return;

    const navInfo = navigationsInfo[details.tabId] || {
      sourceTabId: details.tabId,
    };
    navInfo.transitionType = details.transitionType;
    navigationsInfo[details.tabId] = navInfo;

    if (!navInfo.beforeNavigateIsExecuted) {
      await new Promise((resolve) => (navInfo.promise_resolve = resolve));
    }
  }

  function webNavigationOnDOMContentLoaded(details) {
    if (details.frameId !== 0) return;

    const navInfo = navigationsInfo[details.tabId];

    if (navInfo && navInfo.sourceHost) {
      const host = new URL(details.url).host;
      if (
        navInfo.transitionType === "link" &&
        navInfo.sourcePageLanguageState === "translated" &&
        navInfo.sourceHost === host
      ) {
        setTimeout(
          () =>
            chrome.tabs.sendMessage(
              details.tabId,
              {
                action: "autoTranslateBecauseClickedALink",
              },
              {
                frameId: 0,
              },
              checkedLastError
            ),
          500
        );
      }
    }

    delete navigationsInfo[details.tabId];
  }

  function enableTranslationOnClickingALink() {
    disableTranslationOnClickingALink();
    if (!chrome.webNavigation) return;

    chrome.tabs.onRemoved.addListener(tabsOnRemoved);
    chrome.runtime.onMessage.addListener(runtimeOnMessage);

    chrome.webNavigation.onCreatedNavigationTarget.addListener(
      webNavigationOnCreatedNavigationTarget
    );
    chrome.webNavigation.onBeforeNavigate.addListener(
      webNavigationOnBeforeNavigate
    );
    chrome.webNavigation.onCommitted.addListener(webNavigationOnCommitted);
    chrome.webNavigation.onDOMContentLoaded.addListener(
      webNavigationOnDOMContentLoaded
    );
  }

  function disableTranslationOnClickingALink() {
    navigationsInfo = {};
    tabsInfo = {};
    chrome.tabs.onRemoved.removeListener(tabsOnRemoved);
    chrome.runtime.onMessage.removeListener(runtimeOnMessage);

    if (chrome.webNavigation) {
      chrome.webNavigation.onCreatedNavigationTarget.removeListener(
        webNavigationOnCreatedNavigationTarget
      );
      chrome.webNavigation.onBeforeNavigate.removeListener(
        webNavigationOnBeforeNavigate
      );
      chrome.webNavigation.onCommitted.removeListener(webNavigationOnCommitted);
      chrome.webNavigation.onDOMContentLoaded.removeListener(
        webNavigationOnDOMContentLoaded
      );
    } else {
      console.info("No webNavigation permission");
    }
  }

  twpConfig.onChanged((name, newvalue) => {
    if (name === "autoTranslateWhenClickingALink") {
      if (newvalue == "yes") {
        enableTranslationOnClickingALink();
      } else {
        disableTranslationOnClickingALink();
      }
    }
  });

  if (chrome.permissions.onRemoved) {
    chrome.permissions.onRemoved.addListener((permissions) => {
      if (permissions.permissions.indexOf("webNavigation") !== -1) {
        twpConfig.set("autoTranslateWhenClickingALink", "no");
      }
    });
  }

  chrome.permissions.contains(
    {
      permissions: ["webNavigation"],
    },
    (hasPermissions) => {
      if (
        hasPermissions &&
        twpConfig.get("autoTranslateWhenClickingALink") === "yes"
      ) {
        enableTranslationOnClickingALink();
      } else {
        twpConfig.set("autoTranslateWhenClickingALink", "no");
      }
    }
  );
});

// garante que a extensão só seja atualizada quando reiniciar o navegador.
// caso seja uma atualização manual, realiza uma limpeza e recarrega a extensão para instalar a atualização.
chrome.runtime.onUpdateAvailable.addListener((details) => {
  var reloaded = false;

  setTimeout(function () {
    if (!reloaded) {
      reloaded = true;
      chrome.runtime.reload();
    }
  }, 2200);

  chrome.tabs.query({}, (tabs) => {
    const cleanUpsPromises = [];
    tabs.forEach((tab) => {
      cleanUpsPromises.push(
        new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id, { action: "cleanUp" }, resolve);
        })
      );
    });
    Promise.all(cleanUpsPromises).finally(() => {
      if (!reloaded) {
        reloaded = true;
        chrome.runtime.reload();
      }
    });
  });

  // chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  //   const url = new URL(tabs[0].url);
  //   if (
  //     (url.hostname === "github.com" &&
  //       url.pathname.includes("FilipePS/Traduzir-paginas-web/releases")) ||
  //     (url.hostname === "addons.mozilla.org" &&
  //       url.pathname.includes("addon/traduzir-paginas-web/versions"))
  //   ) {
  //     chrome.tabs.query({}, (tabs) => {
  //       const cleanUpsPromises = [];
  //       tabs.forEach((tab) => {
  //         cleanUpsPromises.push(
  //           new Promise((resolve) => {
  //             chrome.tabs.sendMessage(tab.id, { action: "cleanUp" }, resolve);
  //           })
  //         );
  //       });
  //       Promise.all(cleanUpsPromises).finally(() => {
  //         chrome.runtime.reload();
  //       });
  //     });
  //   }
  // });
});
