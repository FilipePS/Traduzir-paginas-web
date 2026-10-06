const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "../src/contentScript/pageTranslator.js"),
  "utf8"
);
const context = vm.createContext({});
vm.runInContext(source.slice(0, source.indexOf("var pageTranslator = {};")), context);

test("Excluded words retain their position after newlines and repeated spaces", async () => {
  const dictionary = new Map([["app", ""]]);
  const original = "Hello\n  App!";
  const filtered = context.filterKeywordsInText(original, dictionary, "google");
  const restored = await context.handleCustomWords(
    filtered, original, dictionary, "google", "en", "ru"
  );
  assert.equal(restored, original);
});

test("A dictionary entry covering the entire text survives lost service markers", async () => {
  const dictionary = new Map([["firefox", ""]]);
  assert.equal(
    await context.handleCustomWords(
      "Translated browser name", "\n Firefox  ", dictionary, "google", "en", "ru"
    ),
    "\n Firefox  "
  );
  dictionary.set("firefox", "Browser");
  assert.equal(
    await context.handleCustomWords(
      "Translated browser name", "\n Firefox  ", dictionary, "google", "en", "ru"
    ),
    "\n Browser  "
  );
});
