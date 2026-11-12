const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const script = name => fs.readFileSync(path.join(root, 'src/contentScript', name), 'utf8');
const report = [];

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });
  async function fixture({ host = 'x.com', dynamic = true, hover = false, unsorted = false } = {}) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `
      <html><head><title>Feed</title></head><body>
      <p id="ordinary">Ordinary page text</p><article><div data-testid="tweetText" id="post">
      <span id="first">Short English post</span><span id="tail"> and more</span>
      <a id="link" href="https://example.org/security" target="_blank"><span>example.org/security</span><span>…</span></a>
      </div></article></body></html>` }));
    await page.goto(`https://${host}/feed`);
    await page.evaluate(({ dynamic, hover, unsorted }) => {
      const defaults = { targetLanguage: 'it', targetLanguages: ['it', 'en', 'de'],
        pageTranslatorService: 'google', customDictionary: new Map(), popupPanelSection: 2,
        translateDynamicallyCreatedContent: dynamic ? 'yes' : 'no', dontSortResults: unsorted ? 'yes' : 'no',
        showOriginalTextWhenHovering: hover ? 'yes' : 'no', alwaysTranslateSites: [], neverTranslateSites: [],
        alwaysTranslateLangs: [], neverTranslateLangs: [] };
      window.twpConfig = { get: name => defaults[name], set: (k, v) => defaults[k] = v,
        onReady(callback) { if (callback) callback(); return Promise.resolve(); }, onChanged() {} };
      window.platformInfo = { isMobile: { any: false } };
      window.twpLang = { fixTLanguageCode: x => x };
      window.checkedLastError = () => {};
      window.testShadowRoots = [];
      const attachShadow = HTMLElement.prototype.attachShadow;
      HTMLElement.prototype.attachShadow = function (options) {
        const shadow = attachShadow.call(this, options);
        testShadowRoots.push(shadow);
        return shadow;
      };
      window.requests = []; window.pending = []; window.hold = false;
      window.chrome = { extension: { inIncognitoContext: false }, i18n: { getMessage: () => '' },
        runtime: { getURL: p => location.origin + p, onMessage: { addListener() {} },
          sendMessage(request, callback = () => {}) {
            if (request.action === 'getTabHostName') return callback(location.hostname);
            if (request.action === 'detectTabLanguage') return callback('en');
            if (request.action === 'translateHTML') {
              window.requests.push(request);
              const response = request.sourceArray2d.map(piece => piece.map(text => `IT(${text})`));
              if (window.hold) window.pending.push(() => callback(response));
              else callback(response);
              return;
            }
            if (request.action === 'translateSingleText') return callback(`IT(${request.source})`);
            if (request.action === 'translateText') return callback(request.sourceArray.map(x => `IT(${x})`));
            callback();
          } } };
    }, { dynamic, hover, unsorted });
    for (const file of ['showOriginal.js', 'twitterTranslator.js', 'pageTranslator.js']) {
      await page.addScriptTag({ content: script(file) });
    }
    await page.waitForFunction(() => typeof pageTranslator.translatePage === 'function');
    return { page, errors };
  }
  async function test(name, fn) {
    if (process.env.TEST_FILTER && !name.includes(process.env.TEST_FILTER)) return;
    await fn(); report.push(name); console.log('PASS', name);
  }
  try {
    for (const host of ['x.com', 'twitter.com', 'mobile.x.com']) {
      await test(`${host}: initial translation, links and text-node identity`, async () => {
        const { page, errors } = await fixture({ host });
        await page.evaluate(() => { window.originalNode = first.firstChild; window.originalLink = link; pageTranslator.translatePage('it'); });
        await page.waitForFunction(() => first.textContent === 'IT(Short English post) ');
        assert.equal(await page.locator('#link').textContent(), 'example.org/security…');
        assert.equal(await page.locator('#link').getAttribute('href'), 'https://example.org/security');
        assert.equal(await page.evaluate(() => first.firstChild === originalNode && link === originalLink), true);
        assert.equal(await page.evaluate(() => requests.some(r => r.sourceArray2d.flat().some(x => x.includes('example.org')))), false);
        assert.deepEqual(errors, []); await page.close();
      });
    }
    await test('Show more: reused text node, inserted inline span, retained original sources, no loop', async () => {
      const { page, errors } = await fixture();
      await page.evaluate(() => pageTranslator.translatePage('it'));
      await page.waitForFunction(() => first.textContent.startsWith('IT('));
      await page.evaluate(() => first.firstChild.data = 'Expanded English post');
      await page.waitForFunction(() => first.textContent === 'IT(Expanded English post) ');
      await page.evaluate(() => { const s = document.createElement('span'); s.id = 'inserted'; s.textContent = 'extra sentence'; post.append(s); });
      await page.waitForFunction(() => inserted.textContent === 'IT(extra sentence) ');
      assert.equal(await page.locator('#tail').textContent(), 'IT( and more) ');
      const count = await page.evaluate(() => requests.length);
      await page.waitForTimeout(1000);
      assert.equal(await page.evaluate(() => requests.length), count);
      assert.equal(await page.evaluate(() => requests.some(r => r.sourceArray2d.flat().some(t => t.includes('IT(')))), false);
      await page.evaluate(() => pageTranslator.restorePage());
      assert.equal(await page.locator('#first').textContent(), 'Expanded English post');
      assert.equal(await page.locator('#inserted').textContent(), 'extra sentence');
      assert.deepEqual(errors, []); await page.close();
    });
    await test('New feed post, replaced span, quotes and tall expanded post', async () => {
      const { page, errors } = await fixture();
      await page.evaluate(() => pageTranslator.translatePage('it'));
      await page.waitForFunction(() => first.textContent.startsWith('IT('));
      await page.evaluate(() => {
        first.innerHTML = '<span id="replaced">Replaced English text</span>';
        const article = document.createElement('article');
        article.innerHTML = '<div data-testid="tweetText" id="newpost"><span>New feed post</span><a href="https://example.com">example.com</a></div><div data-testid="tweetText" id="quote">Quoted post</div>';
        document.body.append(article);
        post.style.cssText = 'position:relative;top:-400px;height:1200px';
      });
      await page.waitForFunction(() => replaced.textContent === 'IT(Replaced English text) ');
      await page.evaluate(() => { post.style.cssText = ''; });
      await page.waitForFunction(() => newpost.firstChild.textContent === 'IT(New feed post) ' && quote.textContent === 'IT(Quoted post) ');
      assert.deepEqual(errors, []); await page.close();
    });
    await test('Out-of-order responses and restore while requests are pending', async () => {
      const { page, errors } = await fixture();
      await page.evaluate(() => { hold = true; pageTranslator.translatePage('it'); });
      await page.waitForFunction(() => pending.length >= 2);
      await page.evaluate(() => { first.firstChild.data = 'Newer version'; });
      await page.waitForFunction(() => pending.length >= 3);
      await page.evaluate(() => { pending.pop()(); });
      await page.waitForFunction(() => first.textContent === 'IT(Newer version) ');
      await page.evaluate(() => { pending.splice(0).forEach(done => done()); });
      await page.waitForTimeout(100);
      assert.equal(await page.locator('#first').textContent(), 'IT(Newer version) ');
      await page.evaluate(() => { first.firstChild.data = 'Latest version'; });
      await page.waitForFunction(() => pending.length > 0);
      await page.evaluate(() => { pageTranslator.restorePage(); pending.splice(0).forEach(done => done()); });
      await page.waitForTimeout(100);
      assert.equal(await page.locator('#first').textContent(), 'Latest version');
      assert.deepEqual(errors, []); await page.close();
    });
    await test('Original hover enabled without wrappers; service switch and unsorted results', async () => {
      const { page, errors } = await fixture({ hover: true, unsorted: true });
      await page.evaluate(() => { window.textNode = first.firstChild; pageTranslator.translatePage('it'); });
      await page.waitForFunction(() => first.textContent.startsWith('IT('));
      assert.equal(await page.evaluate(() => first.firstChild === textNode && !post.querySelector('font')), true);
      await page.evaluate(() => first.firstChild.data = 'Expanded with hover');
      await page.waitForFunction(() => first.textContent === 'IT(Expanded with hover) ');
      await page.locator('#first').hover();
      await page.waitForTimeout(1400);
      assert.equal(await page.evaluate(() => testShadowRoots.some(root =>
        root.getElementById('originalText')?.textContent.includes('Expanded with hover')
      )), true);
      assert.equal(await page.evaluate(() => post.querySelector('font') === null), true);
      await page.evaluate(() => pageTranslator.swapTranslationService('bing'));
      await page.waitForFunction(() => requests.some(r => r.translationService === 'bing' && r.sourceArray2d.flat().includes('Expanded with hover')));
      await page.evaluate(() => pageTranslator.restorePage());
      assert.equal(await page.locator('#first').textContent(), 'Expanded with hover');
      assert.deepEqual(errors, []); await page.close();
    });
    await test('Dynamic-content setting disabled, protected ancestors, non-X pages', async () => {
      let { page, errors } = await fixture({ dynamic: false });
      await page.evaluate(() => pageTranslator.translatePage('it'));
      await page.waitForFunction(() => first.textContent.startsWith('IT('));
      await page.evaluate(() => first.firstChild.data = 'Stay original');
      await page.waitForTimeout(700);
      assert.equal(await page.locator('#first').textContent(), 'Stay original');
      assert.deepEqual(errors, []); await page.close();
      ({ page, errors } = await fixture());
      await page.evaluate(() => { post.parentElement.className = 'notranslate'; pageTranslator.translatePage('it'); });
      await page.waitForTimeout(400);
      assert.equal(await page.locator('#first').textContent(), 'Short English post');
      assert.deepEqual(errors, []); await page.close();
      ({ page, errors } = await fixture({ host: 'example.com' }));
      await page.evaluate(() => pageTranslator.translatePage('it'));
      await page.waitForFunction(() => first.textContent.startsWith('IT('));
      assert.equal(await page.evaluate(() => twitterTranslator.isTwitter), false);
      assert.deepEqual(errors, []); await page.close();
    });
    await test('Offscreen posts wait until visible; post links outside article stay intact', async () => {
      const { page, errors } = await fixture();
      await page.evaluate(() => {
        document.body.append(post);
        post.style.cssText = 'position:relative;top:1200px';
        pageTranslator.translatePage('it');
      });
      await page.waitForTimeout(400);
      assert.equal(await page.locator('#first').textContent(), 'Short English post');
      await page.evaluate(() => { post.style.top = '0px'; });
      await page.waitForFunction(() => first.textContent === 'IT(Short English post) ');
      assert.equal(await page.locator('#link').textContent(), 'example.org/security…');
      assert.deepEqual(errors, []); await page.close();
    });
    console.log(JSON.stringify({ browser: browser.version(), passed: report.length, tests: report }, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
