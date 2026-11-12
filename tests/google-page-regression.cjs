const assert=require('node:assert/strict');
const vm=require('node:vm');
const {make,settle,source,tail,initial}=require('./google-page-fixture.cjs');
let passed=0;
async function test(name,fn){if(process.env.TEST_FILTER&&!name.includes(process.env.TEST_FILTER))return;await fn();passed++;console.log('PASS',name);}
const translated=f=>{assert.equal(f.read()[0][0],`IT(${source}) `);assert.equal(f.read()[0][1],`IT(${tail}) `);};
(async()=>{
 for(const host of ['github.com','www.reddit.com','example.org']){
  for(const mode of ['success','cachedOriginal','originalOnce','emptyOnce','partialOnce','failOnce','malformedOnce'])await test(`${host}: ${mode}`,async()=>{
   const f=make(host,mode);f.run();await settle();
   if(['originalOnce','emptyOnce','partialOnce','malformedOnce'].includes(mode)){
    assert.equal(f.read()[0][0],source);assert.equal(f.read()[0][1],tail);
    assert.equal(f.read()[1][0],`IT(${initial[1][0]}) `);
    assert.equal([...f.state.disk.values()].some(x=>x.translatedText.includes('Recover')),false);
   }
   await f.advance(9000);translated(f);
   assert.ok(f.context.piecesToTranslate.every(p=>p.isTranslated));
   assert.ok(f.context.piecesToTranslate.every(p=>p.attempts<=3));
   const n=f.state.network.length;await f.advance(20000);assert.equal(f.state.network.length,n);
   assert.ok(f.state.messages.filter(m=>m.action==='translateHTML').every(m=>m.validateOriginal));
   if(!['success','cachedOriginal'].includes(mode))assert.ok(f.state.messages.some(m=>m.retryFailedTranslation));
  });
 }
 await test('normal pending work is not flagged as translated or duplicated',async()=>{
  const f=make('github.com','pending');f.run();await settle();assert.equal(f.context.piecesToTranslate[0].isTranslated,false);assert.ok(f.context.piecesToTranslate[0].pendingSource);await f.advance(5000);f.run();await settle();assert.equal(f.state.network.length,1);
  f.state.mode='success';f.state.pending.splice(0).forEach(done=>done());await settle();translated(f);
 });
 await test('persistent transport failure has a finite per-revision budget across tab reconciliation',async()=>{
  const f=make('github.com','alwaysFail');f.run();await settle();await f.advance(20000);assert.ok(f.context.piecesToTranslate[0].failed&&f.context.piecesToTranslate[0].attempts===3);assert.ok(f.context.piecesToTranslate[1].isTranslated);const n=f.state.network.length;
  for(let i=0;i<5;i++){vm.runInContext('recoverContentAfterTabReturn()',f.context);await settle();}await f.advance(20000);assert.equal(f.state.network.length,n);
  const times=f.state.network.slice(1).map(r=>r.time);assert.ok(times[0]>=1500);assert.ok(times.at(-1)>=5500);
 });
 await test('unchanged known foreign text exhausts the same three attempts without poisoning disk cache',async()=>{
  const f=make('github.com','unchanged');f.run();await settle();await f.advance(20000);assert.equal(f.context.piecesToTranslate[0].attempts,3);assert.equal(f.context.piecesToTranslate[0].failed,true);assert.equal(f.read()[0][0],source);
  assert.equal([...f.state.disk.values()].some(x=>x.translatedText.includes('Recover')),false);
 });
 for(const detected of ['it','und'])await test(`unchanged ${detected} text remains valid without recovery`,async()=>{
  const f=make('github.com','unchanged',{detected});f.run();await settle();await f.advance(20000);assert.equal(f.read()[0][0],source+' ');assert.equal(f.context.piecesToTranslate[0].attempts,1);
 });
 await test('short names and numbers are not retried merely because they remain unchanged',async()=>{
  const f=make('example.org','unchanged',{rows:[['Gemini 4 Carbon'],['12345']]});f.run();await settle();await f.advance(20000);assert.equal(f.state.network.length,1);assert.ok(f.context.piecesToTranslate.every(p=>p.attempts===1));
 });
 await test('cached partial HTML is ignored before application and healthy disk entries remain reusable',async()=>{
  const f=make('github.com','success');const bad='<pre><a i=0>'+source+'</a><a i=1>'+tail+'</a></pre>';
  f.state.disk.set(JSON.stringify(['google','auto','it',bad]),{translatedText:'<pre><a i=0>Wrong partial cache</a></pre>',detectedLanguage:'en'});
  f.state.disk.set(JSON.stringify(['google','auto','it','<pre>Unrelated English text</pre>']),{translatedText:'<pre>Testo italiano estraneo</pre>',detectedLanguage:'en'});
  f.run();await settle();translated(f);
  assert.equal(f.state.disk.get(JSON.stringify(['google','auto','it','<pre>Unrelated English text</pre>'])).translatedText,'<pre>Testo italiano estraneo</pre>');
 });
 await test('completed invalid in-memory HTML is also bypassed',async()=>{
  const f=make('github.com','originalOnce');
  f.context.diagnosticSource=initial;await vm.runInContext('translationService.translateText("google","auto","it",[diagnosticSource[0][0]])',f.context); // legacy non-HTML path can seed an original
  f.state.mode='success';f.state.rows=[[source]];f.collect();f.run();await settle();assert.equal(f.read()[0][0],`IT(${source}) `);
 });
 await test('hidden/offscreen failures wait without consuming retry attempts',async()=>{
  const f=make('github.com','emptyOnce');f.run();await settle();f.context.pageIsVisible=false;await f.advance(10000);assert.equal(f.context.piecesToTranslate[0].attempts,1);
  f.context.pageIsVisible=true;const el=f.context.piecesToTranslate[0].topElement;el.getBoundingClientRect=()=>({top:2000,bottom:2100});await f.advance(6000);assert.equal(f.context.piecesToTranslate[0].attempts,1);
  el.getBoundingClientRect=()=>({top:10,bottom:20});await f.advance(1000);translated(f);
 });
 await test('changed or removed text cancels queued recovery',async()=>{
  for(const remove of [false,true]){const f=make('github.com','emptyOnce');f.run();await settle();const node=f.context.piecesToTranslate[0].nodes[0];if(remove)node.isConnected=false;else node.textContent='A newer source revision';await f.advance(8000);assert.equal(f.state.network.length,1);assert.equal(f.context.piecesToTranslate[0].obsolete,true);}
 });
 await test('stale pending provider response never overwrites updated DOM text',async()=>{
  const f=make('github.com','pending');f.run();await settle();f.context.piecesToTranslate[0].nodes[0].textContent='Latest source';f.state.mode='success';f.state.pending.splice(0).forEach(done=>done());await settle();assert.equal(f.read()[0][0],'Latest source');assert.equal(f.context.piecesToTranslate[0].obsolete,true);
 });
 await test('manual restoration/generation change blocks late results and further retries',async()=>{
  const f=make('github.com','pending');f.run();await settle();f.context.pageLanguageState='original';f.context.fooCount++;f.context.piecesToTranslate=[];f.state.mode='success';f.state.pending.splice(0).forEach(done=>done());await settle();await f.advance(8000);assert.equal(f.read()[0][0],source);assert.equal(f.state.network.length,1);
 });
 await test('late custom-dictionary processing cannot write after restore or a source change',async()=>{
  for(const change of [false,true]){const f=make('github.com','success');const held=[];f.context.handleCustomWords=(...a)=>new Promise(resolve=>held.push(()=>resolve(a[0])));f.run();await settle();assert.ok(held.length);if(change)f.context.piecesToTranslate[0].nodes[0].textContent='New authoritative source';else{f.context.fooCount++;f.context.pageLanguageState='original';}held.forEach(done=>done());await settle();assert.equal(f.read()[0][0],change?'New authoritative source':source);}
 });
 await test('custom dictionary survives transient failure and is restored through real keyword handlers',async()=>{
  const f=make('github.com','emptyOnce',{rows:[['Recover Alpha is the name of this product in a long explanatory sentence.']]});f.context.customDictionary=new Map([['alpha','AlphaProtetto']]);f.run();await settle();await f.advance(8000);assert.ok(f.read()[0][0].includes('AlphaProtetto'));assert.ok(!f.read()[0][0].includes('@%'));
 });
 await test('unsorted Google results still recover incomplete responses',async()=>{
  const f=make('github.com','partialOnce',{unsorted:true});f.run();await settle();await f.advance(8000);translated(f);
 });
 await test('late identity protection prevents writes and further recovery of protected text',async()=>{
  const f=make('github.com','pending');f.run();await settle();f.context.piecesToTranslate[0].nodes.forEach(n=>n.protected=true);f.state.mode='success';f.state.pending.splice(0).forEach(done=>done());await settle();await f.advance(8000);assert.equal(f.read()[0][0],source);assert.equal(f.context.piecesToTranslate[0].attempts,1);
 });
 await test('shared recovery gate admits at most two requests and releases slots',async()=>{
  const rows=Array.from({length:8},(_,i)=>['Recover '+i+' separate English text']);const f=make('github.com','failThenPending',{rows});f.run();await settle();await f.advance(2400);assert.equal(f.state.live,2);assert.equal(f.state.pending.length,2);assert.equal(vm.runInContext('googleRecoveriesInFlight',f.context),2);
  assert.equal(vm.runInContext('acquireGoogleRecovery()',f.context),null);f.state.mode='success';f.state.pending.splice(0).forEach(done=>done());await settle();await f.advance(2000);assert.ok(f.state.maxLive<=2);assert.equal(vm.runInContext('googleRecoveriesInFlight',f.context),0);assert.ok(f.context.piecesToTranslate.every(p=>p.isTranslated));
 });
 await test('30-second deadline aborts pending transport before another attempt starts',async()=>{
  const f=make('github.com','pending',{rows:[[source]]});f.run();await settle();await f.advance(29999);assert.equal(f.state.aborted,0);assert.equal(f.context.piecesToTranslate[0].attempts,1);
  await f.advance(1);assert.equal(f.state.aborted,1);assert.equal(f.state.live,0);f.state.mode='success';await f.advance(2000);assert.equal(f.read()[0][0],`IT(${source}) `);assert.equal(f.state.network.length,2);
 });
 await test('deadline also covers never-finishing Google authentication discovery',async()=>{
  const f=make('github.com','authPending',{rows:[[source]]});f.run();await settle();assert.equal(f.state.network.length,0);await f.advance(30001);await settle();assert.equal(f.state.aborted,1);assert.equal(f.read()[0][0],`IT(${source}) `);
 });
 await test('switching away from Google cancels the pending old generation',async()=>{
  const f=make('github.com','pending');f.run();await settle();f.context.fooCount++;f.context.currentPageTranslatorService='bing';f.context.piecesToTranslate=[];f.state.mode='success';f.state.pending.splice(0).forEach(done=>done());await settle();assert.equal(f.read()[0][0],source);
 });
 await test('healthy translations keep persistent cache reuse in a new context',async()=>{
  const f=make('github.com','success');f.run();await settle();const g=make('example.org','success',{disk:f.state.disk});g.run();await settle();translated(g);assert.equal(g.state.network.length,0);
 });
 await test('normal non-Google page path keeps one request without Google recovery flags',async()=>{
  const f=make('example.org','success');f.context.currentPageTranslatorService='bing';const calls=[];
  f.context.backgroundTranslateHTML=async(...args)=>{calls.push(args);return args[3].map(row=>row.map(t=>'IT('+t+')'));};f.run();await settle();await f.advance(8000);translated(f);assert.equal(calls.length,1);assert.equal(calls[0][5],false);assert.equal(calls[0][6],false);
 });
 console.log(JSON.stringify({passed,environment:'Node VM; production adapter and exact extracted page functions; controlled node/cache/transport/timer contracts; not a browser/live-provider test',benchmark:false}));
})().catch(e=>{console.error(e);process.exitCode=1;});
