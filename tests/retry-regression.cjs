const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {fixture,settle,advance,stats}=require('./retry-fixture.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});let passed=0;
 async function test(name,fn){await fn();passed++;console.log('PASS',name);}
 async function start(options){const f=await fixture(browser,options);await f.page.evaluate(()=>pageTranslator.translatePage('it'));await settle(f.page);return f;}
 async function close(f){assert.deepEqual(f.errors,[]);await f.page.close();}
 try{
  await test('pre-recovery helper reproduces failure; cached errors prevent a real retry',async()=>{
   const f=await start({variant:'baseline',mode:'failOnce'});await advance(f.page,10000);assert.equal((await stats(f.page)).text,'Recover 0 first sentence.');assert.equal((await stats(f.page)).network,1);
   await f.page.evaluate(()=>backgroundTranslateHTML('google','auto','it',[['Recover 0 first sentence.',' Recover 0 second sentence.']],false));await settle(f.page);assert.equal((await stats(f.page)).network,1);await close(f);
  });
  for(const mode of ['failOnce','failTwice','emptyOnce','whitespaceOnce','partialOnce','malformedOnce','badDisk']){
   await test(`${mode}: production Google adapter, targeted cache refresh and recovery`,async()=>{
    const f=await start({mode});const initial=await stats(f.page);if(mode==='badDisk')assert.ok(initial.tail.startsWith('IT('));else assert.ok(!initial.tail.startsWith('IT('));
    await advance(f.page,1200);assert.equal((await stats(f.page)).network,initial.network);
    await advance(f.page,900);if(mode==='failTwice')await advance(f.page,4500);
    const s=await stats(f.page);assert.equal(s.text,'IT(Recover 0 first sentence.) ');assert.equal(s.tail,'IT( Recover 0 second sentence.) ');
    assert.equal(s.network,mode==='badDisk'?1:mode==='failTwice'?3:2);assert.ok(mode==='badDisk'?s.refresh===0:s.refresh>=1);assert.ok(s.times.length<2||s.times[1]-s.times[0]>=1500);
    const count=s.network;await advance(f.page,10000);assert.equal((await stats(f.page)).network,count);
    assert.equal(await f.page.locator('a').textContent(),'example.org/0');
    await f.page.evaluate(()=>pageTranslator.restorePage());assert.equal((await stats(f.page)).text,'Recover 0 first sentence.');await close(f);
   });
  }
  await test('persistent outage stops after three attempts, including repeated tab returns',async()=>{
   const f=await start({mode:'alwaysFail'});await advance(f.page,15000);let s=await stats(f.page);assert.equal(s.network,3);assert.equal(s.messages,3);assert.equal(s.text,'Recover 0 first sentence.');assert.ok(s.times[2]-s.times[1]>=4000);
   for(let i=0;i<8;i++){await f.page.evaluate(()=>{setVisibility('hidden');setVisibility('visible');});await advance(f.page,1200);}assert.equal((await stats(f.page)).network,3);await close(f);
  });
  for(const mode of ['success','unchanged'])await test(`${mode}: no extra requests after success or valid unchanged text`,async()=>{
   const f=await start({mode});await advance(f.page,15000);const s=await stats(f.page);assert.equal(s.network,1);assert.equal(s.messages,1);assert.equal(s.refresh,0);await close(f);
  });
  await test('hidden and offscreen posts wait; returning visible recovers without bursts',async()=>{
   const f=await start({mode:'failOnce'});await f.page.evaluate(()=>setVisibility('hidden'));await advance(f.page,10000);assert.equal((await stats(f.page)).network,1);
   await f.page.evaluate(()=>{post0.style.position='relative';post0.style.top='2000px';setVisibility('visible');});await advance(f.page,3000);assert.equal((await stats(f.page)).network,1);
   await f.page.evaluate(()=>post0.style.top='0px');await advance(f.page,600);assert.equal((await stats(f.page)).network,2);assert.ok((await stats(f.page)).text.startsWith('IT('));await close(f);
  });
  await test('manual restore cancels scheduled retries',async()=>{
   const f=await start({mode:'failOnce'});await f.page.evaluate(()=>pageTranslator.restorePage());await advance(f.page,12000);assert.equal((await stats(f.page)).network,1);assert.equal((await stats(f.page)).text,'Recover 0 first sentence.');await close(f);
  });
  await test('removal and text revisions invalidate old retry state',async()=>{
   const f=await start({mode:'failOnce'});await f.page.evaluate(()=>{window.mode='success';first0.firstChild.data='Recover NEW revision.';});await settle(f.page);await advance(f.page,12000);assert.equal((await stats(f.page)).network,2);assert.equal((await stats(f.page)).text,'IT(Recover NEW revision.) ');await close(f);
   const g=await start({mode:'failOnce'});await g.page.evaluate(()=>post0.remove());await advance(g.page,12000);assert.equal(await g.page.evaluate(()=>network.filter(r=>r.relevant).length),1);await close(g);
  });
  await test('late response after restore cannot overwrite the page',async()=>{
   const f=await start({mode:'pending'});await advance(f.page,10000);assert.equal((await stats(f.page)).network,1);await f.page.evaluate(()=>{pageTranslator.restorePage();mode='success';pending.splice(0).forEach(fn=>fn());});await settle(f.page);await advance(f.page,10000);assert.equal((await stats(f.page)).text,'Recover 0 first sentence.');assert.equal((await stats(f.page)).network,1);await close(f);
  });
  await test('pending Google requests remain deduplicated during refresh',async()=>{
   const f=await start({mode:'pending'});await f.page.evaluate(()=>{window.second=backgroundTranslateHTML('google','auto','it',[['Recover 0 first sentence.',' Recover 0 second sentence.']],false,true);});await settle(f.page);assert.equal((await stats(f.page)).network,1);await f.page.evaluate(()=>{mode='success';pending.splice(0).forEach(fn=>fn());});await settle(f.page);assert.ok((await stats(f.page)).text.startsWith('IT('));await close(f);
  });
  await test('many failures: at most two recovery requests pending at once',async()=>{
   const f=await start({mode:'failOnce',posts:10});await f.page.evaluate(()=>mode='pending');await advance(f.page,2400);assert.equal(await f.page.evaluate(()=>pending.length),2);await advance(f.page,6000);assert.equal(await f.page.evaluate(()=>pending.length),2);
   await f.page.evaluate(()=>{mode='success';pending.splice(0).forEach(fn=>fn());});await settle(f.page);await advance(f.page,2100);assert.equal((await stats(f.page)).network,20);assert.equal(await f.page.evaluate(()=>[...document.querySelectorAll('[data-testid="tweetText"]')].every(p=>p.textContent.startsWith('IT('))),true);await close(f);
  });
  await test('mass outage has a finite per-revision request budget',async()=>{
   const f=await start({mode:'alwaysFail',posts:20});await advance(f.page,30000);assert.equal((await stats(f.page)).network,60);await advance(f.page,60000);assert.equal((await stats(f.page)).network,60);await close(f);
  });
  console.log(JSON.stringify({browser:browser.version(),passed,provider:'controlled XHR with production Google parser and cache',time:'controlled browser clock'}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
