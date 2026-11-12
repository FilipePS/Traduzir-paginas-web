const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { fixture, settle, advance, stats } = require('./retry-fixture.cjs');
const before = process.argv.includes('--before');
const original = 'Recover Today we’re launching Gemini 4 Carbon, joining Argon at the frontier. Carbon is our strongest model, built for everything from complex engineering to scientific discovery, with safeguards to match.';
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH, args:['--no-sandbox']});
  let passed = 0;
  async function test(name, fn) { await fn(); passed++; console.log('PASS', name); }
  async function start({mode='success',detected='en',text=original,host='x.com'}={}) {
    const f = await fixture(browser,{mode,host});
    await f.page.evaluate(({text,detected})=>{first0.textContent=text;window.detected=detected;}, {text,detected});
    await f.page.evaluate(()=>pageTranslator.translatePage('it'));
    await settle(f.page);
    return f;
  }
  async function close(f) { assert.deepEqual(f.errors,[]); await f.page.close(); }
  try {
    if (before) {
      const f = await start({mode:'cachedOriginal'});
      await advance(f.page,20000);
      assert.equal((await stats(f.page)).text,original+' ');
      assert.equal((await stats(f.page)).network,0);
      console.log('REPRODUCED in 1.2: cached original English is accepted as complete, no fresh request and no recovery.');
      await close(f);return;
    }
    await test('cached original foreign paragraph is replaced without clearing global cache',async()=>{
      const f=await start({mode:'cachedOriginal'});await settle(f.page);
      assert.equal((await stats(f.page)).text,`IT(${original}) `);
      assert.equal((await stats(f.page)).network,1);
      await f.page.evaluate(()=>pageTranslator.restorePage());
      await f.page.evaluate(()=>pageTranslator.translatePage('it'));await settle(f.page);
      assert.equal((await stats(f.page)).network,1);
      assert.equal(await f.page.locator('a').textContent(),'example.org/0');await close(f);
    });
    await test('new unchanged foreign response is not cached as success and recovers',async()=>{
      const f=await start({mode:'originalOnce'});assert.equal((await stats(f.page)).network,1);
      assert.equal(await f.page.evaluate(()=>[...disk.values()].some(x=>x.translatedText.includes('Recover Today'))),false);
      await advance(f.page,2100);
      assert.equal((await stats(f.page)).text,`IT(${original}) `);assert.equal((await stats(f.page)).network,2);await close(f);
    });
    await test('unchanged foreign results stop after the existing three-attempt limit',async()=>{
      const f=await start({mode:'unchanged'});await advance(f.page,20000);
      assert.equal((await stats(f.page)).network,3);assert.equal((await stats(f.page)).text,original);
      await advance(f.page,30000);assert.equal((await stats(f.page)).network,3);await close(f);
    });
    for(const [name,options] of [
      ['already target-language text',{detected:'it'}],
      ['unknown detected language',{detected:'und'}],
      ['short product names',{text:'Recover Gemini 4 Carbon'}],
    ]) await test(`${name}: unchanged responses do not trigger recovery`,async()=>{
      const f=await start({mode:'unchanged',...options});await advance(f.page,15000);
      assert.equal((await stats(f.page)).network,1);assert.equal((await stats(f.page)).refresh,0);await close(f);
    });
    await test('ordinary non-X pages now receive the same bounded Google recovery',async()=>{
      const f=await start({mode:'unchanged',host:'example.com'});await advance(f.page,20000);assert.equal((await stats(f.page)).network,3);assert.equal((await stats(f.page)).text,original);await close(f);
    });
    await test('completed in-memory original result is also bypassed',async()=>{
      const f=await fixture(browser,{mode:'unchanged'});
      await f.page.evaluate(({original})=>{first0.textContent=original;window.detected='en';},{original});
      await f.page.evaluate(()=>{tail0.textContent='';return translationService.translateText('google','auto','it',[first0.textContent]);});
      await settle(f.page);assert.equal((await stats(f.page)).network,1);
      await f.page.evaluate(()=>{mode='success';pageTranslator.translatePage('it');});await settle(f.page);
      assert.equal((await stats(f.page)).network,2);assert.equal((await stats(f.page)).text,`IT(${original}) `);await close(f);
    });
    await test('post split around a mention recovers both pieces and preserves the link',async()=>{
      const f=await fixture(browser,{mode:'cachedOriginal'});
      const tail=' Recover we’re always asking how AI can be more helpful for the biggest challenges, and Carbon is another step forward.';
      await f.page.evaluate(({original,tail})=>{
        first0.textContent=original;tail0.textContent=tail;const link=post0.querySelector('a');
        link.textContent='@Google';link.href='https://x.com/Google';post0.insertBefore(link,tail0);
      },{original,tail});
      await f.page.evaluate(()=>pageTranslator.translatePage('it'));await settle(f.page);
      assert.equal((await stats(f.page)).text,`IT(${original}) `);assert.equal((await stats(f.page)).tail,`IT(${tail}) `);
      assert.equal(await f.page.locator('a').textContent(),'@Google');assert.equal(await f.page.locator('a').getAttribute('href'),'https://x.com/Google');await close(f);
    });
    await test('normal translated responses retain cache reuse',async()=>{
      const f=await start();assert.equal((await stats(f.page)).network,1);
      await f.page.evaluate(()=>{pageTranslator.restorePage();pageTranslator.translatePage('it');});await settle(f.page);
      assert.equal((await stats(f.page)).network,1);await close(f);
    });
    console.log(JSON.stringify({browser:browser.version(),passed,provider:'controlled production Google adapter and cache; no benchmark'}));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
