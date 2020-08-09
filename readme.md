# Translate Web Pages

## Translate your page in real time using Google or Yandex.

### To install the extension on a browser other than Firefox follow these steps:
1. Download the source code.
2. Open the file *manifest.json*.
3. Remove the **"page_action"** key. Basically all of this:
```JSON
"page_action": {
    "browser_style": false,
    "default_icon": {
        "16": "icons/google-translate-16.png",
        "24": "icons/google-translate-24.png",
        "32": "icons/google-translate-32.png"
    },
    "show_matches": ["<all_urls>"],
    "default_title": "__MSG_pageActionTitle__",
    "default_popup": "popup/popup.html"
},
```
4. Save the file.


### To collaborate with the translation of the interface use [Crowdin](https://crowdin.com/project/translate-web-pages).

### To make a donation use [PayPal](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=N4Q7ACFV3GK2U&source=url) or [Patreon](https://www.patreon.com/filipeps).

### Access the Firefox [extension page](https://addons.mozilla.org/firefox/addon/traduzir-paginas-web/).

### Open [website](https://filipeps.github.io/Traduzir-paginas-web/).