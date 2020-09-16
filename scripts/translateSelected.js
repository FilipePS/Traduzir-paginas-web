if (typeof browser !== 'undefined') {
    chrome = browser
}

(function() {
    var isMobile = {
        Android: function() {
            return navigator.userAgent.match(/Android/i);
        },
        BlackBerry: function() {
            return navigator.userAgent.match(/BlackBerry/i);
        },
        iOS: function() {
            return navigator.userAgent.match(/iPhone|iPad|iPod/i);
        },
        Opera: function() {
            return navigator.userAgent.match(/Opera Mini/i);
        },
        Windows: function() {
            return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
        },
        any: function() {
            return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
        }
    };
    var isAnyMobile = isMobile.any()

    var showTranslateSelectedButton = "yes"
    var translateThisSite = true
    var translateThisLanguage = true
    var targetLanguage = ""
    chrome.storage.local.get(["showTranslateSelectedButton", "neverTranslateSites", "neverTranslateThisLanguages", "targetLanguage"], onGot => {
        if (onGot.showTranslateSelectedButton) {
            showTranslateSelectedButton = onGot.showTranslateSelectedButton 
        }

        var neverTranslateSites = onGot.neverTranslateSites
        if (!neverTranslateSites) {
            neverTranslateSites = []
        }

        if (neverTranslateSites.indexOf(window.location.hostname) != -1) {
            translateThisSite = false
        }

        var neverTranslateThisLanguages = onGot.neverTranslateThisLanguages
        if (!neverTranslateThisLanguages) {
            neverTranslateThisLanguages = []
        }

        if (onGot.targetLanguage) {
            targetLanguage = onGot.targetLanguage
        } else {
            targetLanguage = chrome.i18n.getUILanguage()

            if (targetLanguage == "zh") {
                if (chrome.i18n.getUILanguage() == "zh-TW") {
                    targetLanguage == "zh-TW"
                } else {
                    targetLanguage == "zh-CN"
                }
            }
    
            if (targetLanguage.toLowerCase() != "zh-cn" && targetLanguage.toLowerCase() != "zh-tw") {
                targetLanguage = targetLanguage.split("-")[0]
            }
        }

        function foo() {
            if (typeof window.detectedLanguage != "undefined") {
                if (neverTranslateThisLanguages.indexOf(window.detectedLanguage) != -1) {
                    translateThisLanguage = false
                }
            } else {
                setTimeout(foo, 500)
            }
        }
        foo()
        
        updateEventListener()
    })

    chrome.storage.onChanged.addListener(changes => {
        if (changes.showTranslateSelectedButton) {
            showTranslateSelectedButton = changes.showTranslateSelectedButton.newValue
            if (showTranslateSelectedButton != "yes" && selTextButton) {
                selTextButton.style.display = "none"
            }
            updateEventListener()
        }

        if (changes.targetLanguage) {
            targetLanguage = changes.targetLanguage.newValue
        }
        
        if (changes.neverTranslateSites) {
            var neverTranslateSites = changes.neverTranslateSites.newValue
            if (!neverTranslateSites) {
                neverTranslateSites = []
            }
    
            if (neverTranslateSites.indexOf(window.location.hostname) == -1) {
                translateThisSite = true
            } else {
                translateThisSite = false
            }
            updateEventListener()
        }
        
        if (changes.neverTranslateThisLanguages && typeof window.detectedLanguage != "undefined") {
            var neverTranslateThisLanguages = changes.neverTranslateThisLanguages.newValue
            if (!neverTranslateThisLanguages) {
                neverTranslateThisLanguages = []
            }

            if (neverTranslateThisLanguages.indexOf(window.detectedLanguage) == -1) {
                translateThisLanguage = true
            } else {
                translateThisLanguage = false
            }
            updateEventListener()
        }
    })

    var element, selTextButton, selTextDiv

    function init() {
        if (element) return
        element = document.createElement("div")
        shadowRoot = element.attachShadow({mode: "closed"})

        shadowRoot.innerHTML = `
          <style>
              div {
                  font-family: 'Helvetica', 'Arial', sans-serif;
                  font-style: normal;
                  font-variant: normal;
                  line-height: normal;
                  font-size: 14px;
                  font-weight: 500;
              }

              #selTextButton {
                  z-index: 999999999;
                  position: fixed;
                  background-repeat: no-repeat;
                  background-size: cover;
                  background-image: url(${chrome.runtime.getURL("icons/google-translate-32.png")});
                  width: 22px;
                  height: 22px;
                  top: 0px;
                  left: 0px;
                  cursor: pointer;
                  display: none;
              }

              #selTextButton.show {
                  opacity: 1;
                  transition: opacity .4s linear;
              }

              #selTextDiv {
                  z-index: 999999999;
                  position: fixed;
                  border-radius: 5px;
                  max-width: 280px;
                  max-height: 250px;
                  top: 0px;
                  left: 0px;
                  padding: 16px;
                  color: #000;
                  background-color: white;
                  border: 1px solid lightGrey;
                  overflow: auto;
                  display: none;
              }

              #selTextDiv.show {
                  opacity: 1;
                  transition: opacity .2s linear;
              }

          </style>
          <div id="selTextButton"></div>
          <div id="selTextDiv"></div>
        `

        selTextButton = shadowRoot.getElementById("selTextButton")
        selTextDiv = shadowRoot.getElementById("selTextDiv")

        document.body.appendChild(element)

        if (isAnyMobile) {
            selTextButton.style.width = "30px"
            selTextButton.style.height = "30px"
            document.addEventListener("touchstart", onTouchstart)
        }

        selTextButton.addEventListener("click", onClick)
        document.addEventListener("mousedown", onDown)
    }

    function destroy() {
        if (!element) return
        selTextButton.removeEventListener("click", onClick)
        document.removeEventListener("mousedown", onDown)
        if (isAnyMobile) {
            document.removeEventListener("touchstart", onTouchstart)
        }
        element.remove()
        element = selTextButton = selTextDiv = null
    }


    var gSelectionInfo = null
    function translateSelText() {
        if (gSelectionInfo) {
            translateSingleText(gSelectionInfo.text, targetLanguage)
            .then(result => {
                if(!result) return
                init()
                var eTop = gSelectionInfo.bottom
                var eLeft = gSelectionInfo.left

                selTextDiv.style.top = "0px"
                selTextDiv.style.left = "0px"
                selTextDiv.textContent = result
                selTextDiv.style.display = "block"
    
                var height = parseInt(selTextDiv.offsetHeight)
                var top = eTop + 5
                top = Math.max(0, top)
                top = Math.min(window.innerHeight - height, top)
    
                var width = parseInt(selTextDiv.offsetWidth)
                var left = parseInt(eLeft /*- width / 2*/)
                left = Math.max(0, left)
                left = Math.min(window.innerWidth - width, left)
    
                selTextDiv.style.top = top + "px"
                selTextDiv.style.left = left + "px"
            })
        }
    }


    function onClick(e) {
        translateSelText()
        selTextButton.style.display = "none"
    }

    function onDown(e) {
        if (e.target != element) {
            selTextDiv.style.display = "none"
            selTextButton.style.display = "none"
            destroy()
        }
    }
    

    var isTouchSelection = false
    function onTouchstart (e) {
        isTouchSelection = true
        onDown(e)
    }

    function getSelectionText() {
        var text = "";
        var activeEl = document.activeElement;
        var activeElTagName = activeEl ? activeEl.tagName.toLowerCase() : null;
        if (
          (activeElTagName == "textarea") || (activeElTagName == "input" &&
          /^(?:text|search|password|tel|url)$/i.test(activeEl.type)) &&
          (typeof activeEl.selectionStart == "number")
        ) {
            text = activeEl.value.slice(activeEl.selectionStart, activeEl.selectionEnd);
        } else if (window.getSelection) {
            text = window.getSelection().toString();
        }
        return text;
    }

    function readSelection() {
        var selection = document.getSelection()
        var focusNode = selection.focusNode
        if (focusNode.nodeType == 3) {
            focusNode = selection.getRangeAt(0);
        } else if (focusNode.nodeType != 1) {
            return;
        }
        var rect = focusNode.getBoundingClientRect()
        gSelectionInfo = {
            text: getSelectionText(),
            top: rect.top,
            left: rect.left,
            bottom: rect.bottom,
            right: rect.right
        }
    }

    function onUp(e) {
        if (showTranslateSelectedButton != "yes") {
            return destroy()
        }
        if (e.target == element) return;

        var clientX = e.clientX || e.changedTouches[0].clientX
        var clientY = e.clientY || e.changedTouches[0].clientY

        if (document.getSelection().toString().trim()) {
            init()
            //selTextButton.classList.remove("show")
            selTextButton.style.top = clientY - 20 + "px"
            selTextButton.style.left = clientX + 10 + "px"
            //selTextButton.classList.add("show")

            selTextButton.style.display = "block"
        }
    }
    
    function onMouseup(e) {
        if (e.button != 0) return;
        if (e.target == element) return;
        readSelection()
        setTimeout(()=>onUp(e), 120)
    }

    function onTouchend(e) {
        if (e.target == element) return;
        readSelection()
        setTimeout(()=>onUp(e), 120)
    }

    function onSelectionchange(e) {
        if (isTouchSelection) {
            readSelection()
        }
    }

    function updateEventListener() {
        if (showTranslateSelectedButton == "yes" && translateThisSite && translateThisLanguage) {
            document.addEventListener("mouseup", onMouseup)
            if (isAnyMobile) {
                document.addEventListener("touchend", onTouchend)
                document.addEventListener("selectionchange", onSelectionchange)
            }
        } else {
            document.removeEventListener("mouseup", onMouseup)
            if (isAnyMobile) {
                document.removeEventListener("touchend", onTouchend)
                document.removeEventListener("selectionchange", onSelectionchange)
            }
        }
    }

    chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
        if (request.action == "TranslateSelectedText") {
            readSelection()
            translateSelText()
        }
    })
})()
