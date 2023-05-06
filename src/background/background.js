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
    chrome.tabs.create({
      url: chrome.runtime.getURL("/options/options.html"),
    });
  } else if (request.action === "openDonationPage") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("/options/options.html#donation"),
    });
  } else if (request.action === "detectTabLanguage") {
    if (!sender.tab) {
      // https://github.com/FilipePS/Traduzir-paginas-web/issues/478
      sendResponse("und");
      return;
    }
    try {
      chrome.tabs.detectLanguage(sender.tab.id, (result) =>
        sendResponse(result)
      );
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
  }
});

function updateTranslateSelectedContextMenu() {
  if (typeof chrome.contextMenus !== "undefined") {
    chrome.contextMenus.remove("translate-selected-text", checkedLastError);
    if (twpConfig.get("showTranslateSelectedContextMenu") === "yes") {
      chrome.contextMenus.create({
        id: "translate-selected-text",
        title: chrome.i18n.getMessage("msgTranslateSelectedText"),
        contexts: ["selection"],
      });
    }
  }
}

function updateContextMenu(pageLanguageState = "original") {
  let contextMenuTitle;
  if (pageLanguageState === "translated") {
    contextMenuTitle = chrome.i18n.getMessage("btnRestore");
  } else {
    const targetLanguage = twpConfig.get("targetLanguage");
    contextMenuTitle = chrome.i18n.getMessage(
      "msgTranslateFor",
      twpLang.codeToLanguage(targetLanguage)
    );
  }
  if (typeof chrome.contextMenus != "undefined") {
    chrome.contextMenus.remove("translate-web-page", checkedLastError);
    if (twpConfig.get("showTranslatePageContextMenu") == "yes") {
      chrome.contextMenus.create({
        id: "translate-web-page",
        title: contextMenuTitle,
        contexts: ["page", "frame"],
      });
    }
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason == "install") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("/options/options.html"),
    });
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
      if (platformInfo.isMobile.any) return;
      if (twpConfig.get("showReleaseNotes") !== "yes") return;

      let lastTimeShowingReleaseNotes = twpConfig.get(
        "lastTimeShowingReleaseNotes"
      );
      let showReleaseNotes = false;
      if (lastTimeShowingReleaseNotes) {
        const date = new Date();
        date.setDate(date.getDate() - 21);
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
        chrome.tabs.create({
          url: chrome.runtime.getURL("/options/options.html#release_notes"),
        });
      }
    });

    twpConfig.onReady(async () => {
      translationCache.deleteTranslationCache();
    });
  }

  twpConfig.onReady(async () => {
    if (platformInfo.isMobile.any) {
      twpConfig.set("enableDeepL", "no");
    }
  });
});

function resetPageAction(tabId, forceShow = false) {
  if (twpConfig.get("translateClickingOnce") === "yes" && !forceShow) {
    chrome.pageAction.setPopup({
      popup: null,
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
      popup: null,
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

if (typeof chrome.contextMenus !== "undefined") {
  chrome.contextMenus.create({
    id: "browserAction-showPopup",
    title: chrome.i18n.getMessage("btnShowPopup"),
    contexts: ["browser_action"],
  });
  chrome.contextMenus.create({
    id: "pageAction-showPopup",
    title: chrome.i18n.getMessage("btnShowPopup"),
    contexts: ["page_action"],
  });
  chrome.contextMenus.create({
    id: "never-translate",
    title: chrome.i18n.getMessage("btnNeverTranslate"),
    contexts: ["browser_action", "page_action"],
  });
  chrome.contextMenus.create({
    id: "more-options",
    title: chrome.i18n.getMessage("btnMoreOptions"),
    contexts: ["browser_action", "page_action"],
  });
  chrome.contextMenus.create({
    id: "browserAction-pdf-to-html",
    title: chrome.i18n.getMessage("msgPDFtoHTML"),
    contexts: ["browser_action"],
  });
  chrome.contextMenus.create({
    id: "pageAction-pdf-to-html",
    title: chrome.i18n.getMessage("msgPDFtoHTML"),
    contexts: ["page_action"],
  });

  const tabHasContentScript = {};

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId == "translate-web-page") {
      chrome.tabs.sendMessage(
        tab.id,
        {
          action: "toggle-translation",
        },
        checkedLastError
      );
    } else if (info.menuItemId == "translate-selected-text") {
      if (
        chrome.pageAction &&
        chrome.pageAction.openPopup &&
        (!tabHasContentScript[tab.id] || tab.isInReaderMode)
      ) {
        chrome.pageAction.setPopup({
          popup:
            "popup/popup-translate-text.html#text=" +
            encodeURIComponent(info.selectionText),
          tabId: tab.id,
        });
        chrome.pageAction.openPopup();

        resetPageAction(tab.id);
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

      chrome.browserAction.openPopup();

      resetBrowserAction();
    } else if (info.menuItemId == "pageAction-showPopup") {
      resetPageAction(tab.id, true);

      chrome.pageAction.openPopup();

      resetPageAction(tab.id);
    } else if (info.menuItemId == "never-translate") {
      const hostname = new URL(tab.url).hostname;
      twpConfig.addSiteToNeverTranslate(hostname);
    } else if (info.menuItemId == "more-options") {
      chrome.tabs.create({
        url: chrome.runtime.getURL("/options/options.html"),
      });
    } else if (info.menuItemId == "browserAction-pdf-to-html") {
      const mimeType = tabToMimeType[tab.id];
      if (
        mimeType &&
        mimeType.toLowerCase() === "application/pdf" &&
        typeof chrome.browserAction.openPopup !== "undefined"
      ) {
        chrome.browserAction.openPopup();
      } else {
        chrome.tabs.create({
          url: "https://translatewebpages.org/",
        });
      }
    } else if (info.menuItemId == "pageAction-pdf-to-html") {
      const mimeType = tabToMimeType[tab.id];
      if (
        mimeType &&
        mimeType.toLowerCase() === "application/pdf" &&
        typeof chrome.pageAction.openPopup !== "undefined"
      ) {
        chrome.pageAction.openPopup();
      } else {
        chrome.tabs.create({
          url: "https://translatewebpages.org/",
        });
      }
    }
  });

  chrome.tabs.onActivated.addListener((activeInfo) => {
    twpConfig.onReady(() => updateContextMenu());
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
      tabs.forEach((tab) => chrome.pageAction.hide(tab.id))
    );

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status == "loading") {
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
          chrome.tabs.sendMessage(
            tab.id,
            {
              action: "toggle-translation",
            },
            checkedLastError
          );
        }
      });
    }
    chrome.browserAction.onClicked.addListener((tab) => {
      if (twpConfig.get("translateClickingOnce") === "yes") {
        chrome.tabs.sendMessage(
          tab.id,
          {
            action: "toggle-translation",
          },
          checkedLastError
        );
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

      let themeColorFieldText = null;
      let themeColorAttention = null;
      if (typeof browser != "undefined" && browser.theme) {
        browser.theme.getCurrent().then((theme) => {
          themeColorFieldText = null;
          themeColorAttention = null;
          if (theme.colors && theme.colors.toolbar_field_text) {
            themeColorFieldText = theme.colors.toolbar_field_text;
          }
          if (theme.colors && theme.colors.icons_attention) {
            themeColorAttention = theme.colors.icons_attention;
          }

          updateIconInAllTabs();
        });

        chrome.theme.onUpdated.addListener((updateInfo) => {
          themeColorFieldText = null;
          themeColorAttention = null;
          if (
            updateInfo.theme.colors &&
            updateInfo.theme.colors.toolbar_field_text
          ) {
            themeColorFieldText = updateInfo.theme.colors.toolbar_field_text;
          }
          if (
            updateInfo.theme.colors &&
            updateInfo.theme.colors.icons_attention
          ) {
            themeColorAttention = updateInfo.theme.colors.icons_attention;
          }

          updateIconInAllTabs();
        });
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
          if (themeColorAttention) {
            svg64 = btoa(svg64.replace(/\$\(fill\)\;/g, themeColorAttention));
          } else if (darkMode || incognito) {
            svg64 = btoa(svg64.replace(/\$\(fill\)\;/g, "#00ddff"));
          } else {
            svg64 = btoa(svg64.replace(/\$\(fill\)\;/g, "#0061e0"));
          }
        } else {
          svg64 = svgXml.replace(/\$\(fill\-opacity\)\;/g, "0.5");
          if (themeColorFieldText) {
            svg64 = btoa(svg64.replace(/\$\(fill\)\;/g, themeColorFieldText));
          } else if (darkMode || incognito) {
            svg64 = btoa(svg64.replace(/\$\(fill\)\;/g, "white"));
          } else {
            svg64 = btoa(svg64.replace(/\$\(fill\)\;/g, "black"));
          }
        }

        const b64Start = "data:image/svg+xml;base64,";
        return b64Start + svg64;
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
        (tabs) => {
          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              action: "toggle-translation",
            },
            checkedLastError
          );
        }
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
          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              action: "translatePage",
              targetLanguage: twpConfig.get("targetLanguages")[0],
            },
            checkedLastError
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
          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              action: "translatePage",
              targetLanguage: twpConfig.get("targetLanguages")[1],
            },
            checkedLastError
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
          chrome.tabs.sendMessage(
            tabs[0].id,
            {
              action: "translatePage",
              targetLanguage: twpConfig.get("targetLanguages")[2],
            },
            checkedLastError
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

// garante que a extensão só seja atualizada quando reiniciar o navegador ao reiniciar manualmente a extensão.
chrome.runtime.onUpdateAvailable.addListener((details) => {});
