const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const source = process.env.TWP_SOURCE_DIR || path.resolve(__dirname, '../src/contentScript');
const executablePath = process.env.CHROMIUM_PATH;
const passed = [];
let browser;

async function fixture({ hover = false, auto = false, language = 'en', dynamic = true } = {}) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body:
    '<html><head></head><body><nav>Navigation text</nav><main id="content"><p id="stable">Original English paragraph</p></main></body></html>' }));
  await page.goto('https://example.com/feed');
  await page.evaluate(({ hover, auto, language, dynamic }) => {
    const config = { targetLanguage: 'it', targetLanguages: ['it', 'en', 'de'], pageTranslatorService: 'google',
      customDictionary: new Map(), popupPanelSection: 2, dontSortResults: 'no',
      showOriginalTextWhenHovering: hover ? 'yes' : 'no', translateDynamicallyCreatedContent: dynamic ? 'yes' : 'no',
      alwaysTranslateSites: [], neverTranslateSites: [], alwaysTranslateLangs: auto ? ['en'] : [], neverTranslateLangs: [] };
    window.twpConfig = { get: k => config[k], set: (k, v) => config[k] = v,
      onReady(fn) { if (fn) fn(); return Promise.resolve(); }, onChanged() {} };
    window.platformInfo = { isMobile: { any: false } };
    window.twpLang = { fixTLanguageCode: s => s };
    window.checkedLastError = () => {};
    window.testVisibility = 'visible';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => testVisibility });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => testVisibility === 'hidden' });
    window.changeVisibility = value => { testVisibility = value; document.dispatchEvent(new Event('visibilitychange')); };
    window.calls = []; window.held = []; window.hold = false;
    window.language = language; window.detectionCalls = 0; window.holdDetection = false; window.languageCallbacks = [];
    window.messageListeners = [];
    window.chrome = { extension: { inIncognitoContext: false }, i18n: { getMessage: () => '' }, runtime: {
      getURL: p => location.origin + p, onMessage: { addListener(fn) { messageListeners.push(fn); } },
      sendMessage(request, callback = () => {}) {
        if (request.action === 'getTabHostName') return callback(location.hostname);
        if (request.action === 'detectTabLanguage') {
          detectionCalls++;
          if (holdDetection) languageCallbacks.push(callback); else callback(window.language);
          return;
        }
        if (request.action === 'translateHTML') {
          calls.push(request.sourceArray2d);
          const done = () => callback(request.sourceArray2d.map(piece => piece.map(text => `IT(${text})`)));
          if (hold) held.push(done); else setTimeout(done, 20);
          return;
        }
        if (request.action === 'translateSingleText') return callback(request.source);
        if (request.action === 'translateText') return callback(request.sourceArray);
        callback();
      }
    } };
  }, { hover, auto, language, dynamic });
  for (const name of ['showOriginal.js', 'twitterTranslator.js', 'pageTranslator.js']) {
    await page.addScriptTag({ content: fs.readFileSync(path.join(source, name), 'utf8') });
  }
  await page.waitForFunction(() => typeof pageTranslator.translatePage === 'function');
  return { page, errors };
}
async function translated(page, id, text) {
  await page.waitForFunction(({ id, text }) => document.getElementById(id)?.textContent === `IT(${text}) `,
    { id, text }, { timeout: 3000 });
}
async function start(page) {
  await page.evaluate(() => pageTranslator.translatePage('it'));
  await translated(page, 'stable', 'Original English paragraph');
}
async function test(name, fn) {
  if (process.env.TEST_FILTER && !name.includes(process.env.TEST_FILTER)) return;
  await fn(); passed.push(name); console.log('PASS', name);
}
(async () => {
  browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
  try {
    await test('SPA content loaded while hidden is translated after return', async () => {
      const { page, errors } = await fixture(); await start(page);
      await page.evaluate(() => { changeVisibility('hidden'); content.innerHTML = '<p id="post">Reddit post loaded in the background</p>'; });
      await page.waitForTimeout(250);
      assert.equal(await page.locator('#post').textContent(), 'Reddit post loaded in the background');
      await page.evaluate(() => changeVisibility('visible'));
      await translated(page, 'post', 'Reddit post loaded in the background');
      assert.deepEqual(errors, []); await page.close();
    });
    await test('Nodes already queued before hiding are recovered', async () => {
      const { page, errors } = await fixture(); await start(page);
      await page.evaluate(() => { const p = document.createElement('p'); p.id = 'queued'; p.textContent = 'Queued English text'; content.append(p); });
      await page.waitForTimeout(30);
      await page.evaluate(() => changeVisibility('hidden'));
      await page.waitForTimeout(80);
      await page.evaluate(() => changeVisibility('visible'));
      await translated(page, 'queued', 'Queued English text');
      assert.deepEqual(errors, []); await page.close();
    });
    await test('Repeated tab changes do not retranslate stable text or hover wrappers', async () => {
      for (const hover of [false, true]) {
        const { page, errors } = await fixture({ hover }); await start(page);
        const count = await page.evaluate(() => calls.length);
        for (let i = 0; i < 5; i++) {
          await page.evaluate(() => { changeVisibility('hidden'); changeVisibility('visible'); });
          await page.waitForTimeout(35);
        }
        assert.equal(await page.evaluate(() => calls.length), count);
        await page.evaluate(() => pageTranslator.restorePage());
        assert.equal(await page.locator('#stable').textContent(), 'Original English paragraph');
        assert.deepEqual(errors, []); await page.close();
      }
    });
    await test('Inline additions and changed reused text nodes are recovered', async () => {
      const { page, errors } = await fixture(); await start(page);
      await page.evaluate(() => {
        changeVisibility('hidden'); stable.firstChild.data = 'Updated original paragraph';
        const span = document.createElement('span'); span.id = 'inline'; span.textContent = ' New inline text'; stable.append(span);
      });
      await page.evaluate(() => changeVisibility('visible'));
      await page.waitForFunction(() => stable.textContent.includes('IT(Updated original paragraph)') && inline.textContent.includes('IT( New inline text)'));
      await page.evaluate(() => pageTranslator.restorePage());
      assert.equal(await page.locator('#stable').textContent(), 'Updated original paragraph New inline text');
      assert.deepEqual(errors, []); await page.close();
    });
    await test('In-flight stale results do not overwrite a changed post after return', async () => {
      const { page, errors } = await fixture();
      await page.evaluate(() => { hold = true; pageTranslator.translatePage('it'); });
      await page.waitForFunction(() => held.length > 0);
      await page.evaluate(() => { changeVisibility('hidden'); stable.firstChild.data = 'Latest English version'; changeVisibility('visible'); });
      await page.evaluate(() => { hold = false; held.splice(0).forEach(done => done()); });
      await translated(page, 'stable', 'Latest English version');
      await page.evaluate(() => pageTranslator.restorePage());
      assert.equal(await page.locator('#stable').textContent(), 'Latest English version');
      assert.deepEqual(errors, []); await page.close();
    });
    await test('Unchanged in-flight requests are not duplicated on tab return', async () => {
      const { page, errors } = await fixture();
      await page.evaluate(() => { hold = true; pageTranslator.translatePage('it'); });
      await page.waitForFunction(() => held.length > 0);
      const count = await page.evaluate(() => calls.length);
      await page.evaluate(() => { changeVisibility('hidden'); changeVisibility('visible'); });
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => calls.length), count);
      await page.evaluate(() => { hold = false; held.splice(0).forEach(done => done()); });
      await translated(page, 'stable', 'Original English paragraph');
      assert.deepEqual(errors, []); await page.close();
    });
    await test('Manual restore and protected content are respected on return', async () => {
      const { page, errors } = await fixture({ auto: true });
      await translated(page, 'stable', 'Original English paragraph');
      await page.evaluate(() => { pageTranslator.restorePage(); changeVisibility('hidden'); content.innerHTML += '<p id="newpost">Keep original after restore</p>'; changeVisibility('visible'); });
      await page.waitForTimeout(400);
      assert.equal(await page.locator('#newpost').textContent(), 'Keep original after restore');
      await page.evaluate(() => {
        pageTranslator.translatePage('it'); changeVisibility('hidden');
        const p = document.createElement('p'); p.id = 'protected'; p.className = 'notranslate'; p.textContent = 'Protected English text'; content.append(p);
        changeVisibility('visible');
      });
      await page.waitForTimeout(200);
      assert.equal(await page.locator('#protected').textContent(), 'Protected English text');
      assert.deepEqual(errors, []); await page.close();
    });
    await test('Unknown startup language is retried on return, with a limit', async () => {
      const { page, errors } = await fixture({ auto: true, language: 'und' });
      await page.waitForFunction(() => detectionCalls === 1);
      await page.evaluate(() => { changeVisibility('hidden'); window.language = 'en'; changeVisibility('visible'); });
      await translated(page, 'stable', 'Original English paragraph');
      assert.equal(await page.evaluate(() => detectionCalls), 2);
      assert.deepEqual(errors, []); await page.close();
      const other = await fixture({ auto: true, language: 'und' });
      await other.page.waitForFunction(() => detectionCalls === 1);
      for (let i = 0; i < 7; i++) await other.page.evaluate(() => { changeVisibility('hidden'); changeVisibility('visible'); });
      assert.ok(await other.page.evaluate(() => detectionCalls) <= 3);
      assert.deepEqual(other.errors, []); await other.page.close();
    });
    await test('Ordinary collection stays at two seconds, without fast-v2 scheduling', async () => {
      const { page, errors } = await fixture(); await start(page);
      await page.evaluate(() => { const p = document.createElement('p'); p.id = 'slow'; p.textContent = 'Ordinary dynamic content'; content.append(p); });
      await page.waitForTimeout(400);
      assert.equal(await page.locator('#slow').textContent(), 'Ordinary dynamic content');
      await translated(page, 'slow', 'Ordinary dynamic content');
      assert.deepEqual(errors, []); await page.close();
    });
    await test('First activation of an initially hidden page detects language once', async () => {
      const { page, errors } = await fixture({ auto: true });
      await page.evaluate(() => changeVisibility('hidden'));
      await page.waitForTimeout(220);
      assert.equal(await page.evaluate(() => detectionCalls), 0);
      await page.evaluate(() => changeVisibility('visible'));
      await translated(page, 'stable', 'Original English paragraph');
      assert.equal(await page.evaluate(() => detectionCalls), 1);
      assert.deepEqual(errors, []); await page.close();
    });
    await test('Pending auto-detection cannot override manual restore; auto-off stays off', async () => {
      const { page, errors } = await fixture({ auto: true });
      await page.evaluate(() => { holdDetection = true; });
      await page.waitForFunction(() => languageCallbacks.length > 0);
      await page.evaluate(() => { pageTranslator.restorePage(); languageCallbacks.splice(0).forEach(callback => callback('en')); changeVisibility('hidden'); changeVisibility('visible'); });
      await page.waitForTimeout(150);
      assert.equal(await page.locator('#stable').textContent(), 'Original English paragraph');
      assert.deepEqual(errors, []); await page.close();
      const other = await fixture({ language: 'und' });
      await other.page.waitForFunction(() => detectionCalls === 1);
      for (let i = 0; i < 5; i++) await other.page.evaluate(() => { changeVisibility('hidden'); changeVisibility('visible'); });
      assert.equal(await other.page.evaluate(() => detectionCalls), 1);
      assert.deepEqual(other.errors, []); await other.page.close();
    });
    await test('Disabled dynamic translation stays disabled after tab return', async () => {
      const { page, errors } = await fixture({ dynamic: false }); await start(page);
      await page.evaluate(() => { changeVisibility('hidden'); content.innerHTML += '<p id="disabled">Disabled dynamic text</p>'; changeVisibility('visible'); });
      await page.waitForTimeout(350);
      assert.equal(await page.locator('#disabled').textContent(), 'Disabled dynamic text');
      assert.deepEqual(errors, []); await page.close();
    });
    console.log(JSON.stringify({ browser: browser.version(), environment: 'Real Chromium DOM; controlled visibility events and extension API responses', passed: passed.length, tests: passed }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
