const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  process.env.HOVER_SCRIPT || path.join(root, "src/contentScript/showTranslated.js"),
  "utf8"
);
const translator = fs.readFileSync(
  path.join(root, "src/contentScript/pageTranslator.js"), "utf8"
);
const wrapper = translator.slice(
  translator.indexOf("function backgroundTranslateSingleText("),
  translator.indexOf("var pageTranslator = {}")
);

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
    },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    dispatch(type, event = {}) {
      for (const callback of [...(listeners.get(type) || [])]) callback(event);
    },
  };
}

async function fixture(overrides = {}) {
  const config = {
    sitesToTranslateWhenHovering: [], langsToTranslateWhenHovering: [],
    translateTextOverMouseWhenPressTwice: "yes", textTranslatorService: "google",
    targetLanguages: ["en", "es", "de"], targetLanguageTextTranslation: "en",
    translateTag_pre: "yes", darkMode: "no", ...overrides,
  };
  const messageListeners = [], configListeners = [], requests = [], timers = new Map();
  const popups = new Set();
  let time = 1000, nextTimer = 0, languageCallback, pageStateCallback;
  const paragraph = {
    nodeName: "P", childNodes: [],
    textContent: "A private fixture paragraph", innerText: "A private fixture paragraph",
  };
  function element() {
    const children = new Map();
    return Object.assign(eventTarget(), {
      style: {}, offsetHeight: 20, offsetWidth: 100,
      classList: { add() {}, remove() {} }, setAttribute() {},
      remove() { popups.delete(this); },
      insertBefore() {}, appendChild() {},
      getElementById(id) {
        if (id.startsWith("#")) return null;
        if (!children.has(id)) children.set(id, element());
        return children.get(id);
      },
      attachShadow() { return element(); },
      querySelectorAll() { return [element(), element(), element()]; },
    });
  }
  const window = Object.assign(eventTarget(), {
    innerHeight: 800, innerWidth: 1000,
    getSelection: () => ({ type: "None" }),
  });
  const document = Object.assign(eventTarget(), {
    activeElement: null,
    body: { appendChild: popup => popups.add(popup) },
    createElement: () => element(),
    querySelectorAll: selector => {
      assert.equal(selector, ":hover");
      return [paragraph];
    },
  });
  const context = {
    window, document, console,
    chrome: { runtime: {
      getURL: value => "chrome-extension://fixture" + value,
      onMessage: { addListener: callback => messageListeners.push(callback) },
      sendMessage(request, callback) {
        if (request.action === "getTabHostName") callback("example.test");
        else if (request.action === "translateSingleText") requests.push({ request, callback });
        else throw Error("Unexpected request: " + request.action);
      },
    } },
    twpConfig: {
      onReady: () => Promise.resolve(), get: key => config[key],
      onChanged: callback => configListeners.push(callback),
    },
    twpLang: { isRtlLanguage: () => false, codeToLanguage: value => value },
    twpI18n: { translateDocument() {} },
    platformInfo: { isMobile: { any: false } },
    pageTranslator: {
      onGetOriginalTabLanguage: callback => { languageCallback = callback; },
      onPageLanguageStateChange: callback => { pageStateCallback = callback; },
    },
    fetch: async () => ({ text: async () => "" }), checkedLastError() {},
    performance: { now: () => time },
    setTimeout(callback, delay, ...args) {
      const id = ++nextTimer;
      timers.set(id, { at: time + delay, callback, args });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
  };
  vm.createContext(context);
  vm.runInContext(wrapper + "\n" + source, context);
  await new Promise(resolve => setImmediate(resolve));
  return {
    requests, popups,
    toggle() {
      messageListeners.forEach(callback => callback({ action: "ToggleHoverCurrentTab" }));
    },
    hover() {
      window.dispatch("mousemove", { target: paragraph, buttons: 0, clientX: 10, clientY: 10 });
    },
    advance(ms) {
      time += ms;
      for (const [id, task] of [...timers]) if (task.at <= time) {
        timers.delete(id); task.callback(...task.args);
      }
    },
    control() { document.dispatch("keyup", { key: "Control", isTrusted: true }); },
    language(value) { languageCallback(value); },
    pageState(value) { pageStateCallback(value); },
    change(name, value) {
      config[name] = value;
      configListeners.forEach(callback => callback(name, value));
    },
    async resolve(index = 0) {
      requests[index].callback("Translated fixture paragraph");
      await new Promise(resolve => setImmediate(resolve));
    },
  };
}

test("double-Control enabled does not translate ordinary hovering before opt-in", async () => {
  const page = await fixture();
  page.hover(); page.advance(1300);
  assert.equal(page.requests.length, 0);
});

for (const doubleControl of ["yes", "no"]) {
  test(`off cancels a queued hover with double-Control ${doubleControl}`, async () => {
    const page = await fixture({ translateTextOverMouseWhenPressTwice: doubleControl });
    page.toggle(); page.hover(); page.advance(500); page.toggle(); page.advance(800);
    assert.equal(page.requests.length, 0);
  });
}

test("off invalidates a late response while double-Control keeps listeners attached", async () => {
  const page = await fixture();
  page.toggle(); page.hover(); page.advance(1300);
  assert.equal(page.requests.length, 1);
  page.toggle(); await page.resolve();
  assert.equal(page.popups.size, 0);
});

test("off removes an already visible hover popup", async () => {
  const page = await fixture();
  page.toggle(); page.hover(); page.advance(1300); await page.resolve();
  assert.equal(page.popups.size, 1);
  page.toggle();
  assert.equal(page.popups.size, 0);
});

test("hover can be re-enabled over the same element", async () => {
  const page = await fixture();
  page.toggle(); page.hover(); page.advance(1300);
  assert.equal(page.requests.length, 1);
  page.toggle();
  page.toggle(); page.hover(); page.advance(1300);
  assert.equal(page.requests.length, 2);
  assert.equal(page.requests[1].request.source, "A private fixture paragraph");
});

test("intentional double-Control still translates with hover toggled off", async () => {
  const page = await fixture();
  page.toggle(); page.toggle();
  page.control(); page.advance(100); page.control();
  assert.equal(page.requests.length, 1);
  await page.resolve();
  assert.equal(page.popups.size, 1);
});

test("unchanged disabled hover does not dismiss a deliberate double-Control result", async () => {
  const page = await fixture();
  page.control(); page.advance(100); page.control();
  page.language("de"); await page.resolve();
  assert.equal(page.popups.size, 1);
});

test("removing a saved site hover rule cancels queued hover work", async () => {
  const page = await fixture({ sitesToTranslateWhenHovering: ["example.test"] });
  page.hover(); page.advance(500);
  page.change("sitesToTranslateWhenHovering", []); page.advance(800);
  assert.equal(page.requests.length, 0);
});

test("removing a saved language hover rule cancels queued hover work", async () => {
  const page = await fixture({ langsToTranslateWhenHovering: ["de"] });
  page.language("de"); page.hover(); page.advance(500);
  page.change("langsToTranslateWhenHovering", []); page.advance(800);
  assert.equal(page.requests.length, 0);
});

test("saved hover rules still apply on a fresh document", async () => {
  const page = await fixture({ sitesToTranslateWhenHovering: ["example.test"] });
  page.hover(); page.advance(1300);
  assert.equal(page.requests.length, 1);
});

test("switching page state to translated cancels pending hover work", async () => {
  const page = await fixture();
  page.toggle(); page.hover(); page.advance(500); page.pageState("translated"); page.advance(800);
  assert.equal(page.requests.length, 0);
});
