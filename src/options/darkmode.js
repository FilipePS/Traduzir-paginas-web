var $ = document.querySelector.bind(document);

function enableDarkMode() {
  if (sessionStorage !== null) {
    sessionStorage.setItem("darkModeIsEnabled", "yes");
  }

  if (!$("#darkModeElement")) {
    const el = document.createElement("style");
    el.setAttribute("id", "darkModeElement");
    el.setAttribute("rel", "stylesheet");
    el.textContent = `
            * {
                scrollbar-color: #202324 #454a4d;
            }
            html *, nav, #header {
                color: rgb(231, 230, 228) !important;
                background-color: #181a1b !important;
            }
            `;
    document.head.appendChild(el);
  }
}

if (  
  sessionStorage !== null &&
  sessionStorage.getItem("darkModeIsEnabled") === "yes"
) {
  enableDarkMode();
}

function disableDarkMode() {
  if (sessionStorage !== null) {
    sessionStorage.setItem("darkModeIsEnabled", "no");
  }
  if ($("#darkModeElement")) {
    $("#darkModeElement").remove();
  }
}
