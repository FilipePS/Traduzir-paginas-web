
# <img src="https://github.com/FilipePS/Traduzir-paginas-web/blob/master/src/icons/icon-128.png" height="50"> Translate Web Pages

Translate your page in real time using Google, Bing, Yandex, or an optional OpenRouter provider.

[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/FilipePS/Traduzir-paginas-web?label=latest%20version&sort=semver)](https://github.com/FilipePS/Traduzir-paginas-web/releases)
[![GitHub release date](https://img.shields.io/github/release-date/FilipePS/Traduzir-paginas-web?labely)](https://github.com/FilipePS/Traduzir-paginas-web/latest)
[![GitHub issues](https://img.shields.io/github/issues/FilipePS/Traduzir-paginas-web?color=red)](https://github.com/FilipePS/Traduzir-paginas-web/issues)
[![GitHub license](https://img.shields.io/github/license/FilipePS/Traduzir-paginas-web?color=lightgrey)](https://github.com/FilipePS/Traduzir-paginas-web/blob/master/LICENSE)

## Install

### Firefox
- Desktop users, download from [Mozilla Addons](https://addons.mozilla.org/firefox/addon/traduzir-paginas-web/).
- Android users
  1. Install the latest version of _Firefox (v120+)_.
  2. Open the extension manager.
  3. Scroll down and click **Find more add-ons**.
  4. On the add-ons website, search for **TWP**.
  5. Install the **TWP - Translate For Mobile** extension.

### Chrome, Edge and Brave
- The extension will be officially released for these browsers in the future.
- If you installed the extension in these browsers previously through a registry modification, please undo those changes.\
Note: If you want to undo registry changes, download and run this [twp-registry-uninstall-self.reg](https://raw.githubusercontent.com/FilipePS/Traduzir-paginas-web/master/dist/chromium/twp-registry-uninstall-self.reg). If you want a deeper removal download and run this other file [twp-registry-uninstall-all.reg](https://raw.githubusercontent.com/FilipePS/Traduzir-paginas-web/master/dist/chromium/twp-registry-uninstall-all.reg)

## Screenshots
| Menu 1 | Menu 2 | Translated |
| :--: | :--: | :--: |
| <img src="https://addons.mozilla.org/user-media/previews/full/258/258434.png" height="200"> | <img src="https://addons.mozilla.org/user-media/previews/full/258/258435.png" height="200"> | <img src="https://addons.mozilla.org/user-media/previews/full/258/258436.png" height="200"> |

## Contribute

- To collaborate with the translation of the extension interface use [Crowdin](https://crowdin.com/project/translate-web-pages).

## Donations

To make a donation use [Patreon](https://www.patreon.com/filipeps).

[<img src="https://github.com/FilipePS/Traduzir-paginas-web/blob/master/src/icons/patreon.png" alt="Patreon" height="50">](https://www.patreon.com/filipeps)

## FAQ

**What can this extension do?**

Your current page is translated without having to open new tabs.
It is possible to change the translation language.
You can select to automatically translate.
To change the translation engine just touch the Google Translate icon. 

**Why do you need to access your data on all the websites you visit?**

To translate any website it is necessary to access and modify the text of the web pages. And the extension can only do that, with that permission.

**How are the pages translated?**

The pages are translated using the Google, Bing, Yandex, or OpenRouter translation engine (you choose).

**How does OpenRouter support work?**

OpenRouter is optional and disabled by default. To use it, open the extension options, go to the experimental settings, and add your own OpenRouter API key. After the key is added, OpenRouter becomes available in both **Page translation service** and **Text Translation Service**.

OpenRouter uses the `google/gemini-3-flash-preview` model by default, but you can enter a different OpenRouter model ID in the settings. Page translation requests use structured JSON output so translated fragments can be matched back to the original page text in the correct order. API usage may be billed by OpenRouter depending on your account and selected model.

**And how's my privacy?**

[Privacy policy](https://addons.mozilla.org/addon/traduzir-paginas-web/privacy/): We do not collect any information. However, to translate, the contents of the web pages will be sent to the selected translation provider. If OpenRouter is enabled, translated text is sent to OpenRouter and to the model provider selected by OpenRouter.

**Limitations**

Some pages like [support.mozilla.org](https://support.mozilla.org/) and [addons.mozilla.org](http://addons.mozilla.org/) will not be translated. For security reasons, the browser blocks extensions from accessing these sites.

## Build instructions
- You can see all the build instructions in the [build-instructions.md](build-instructions.md) file.
