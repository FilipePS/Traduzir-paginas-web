const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const {make,settle}=require('./google-page-fixture.cjs');
const code=fs.readFileSync(path.join(__dirname,'../src/contentScript/twitterTranslator.js'),'utf8');
function addX(f,count=1,hover=false){
 const posts=Array.from({length:count},(_,i)=>{
  const post={nodeType:1,isConnected:true,querySelectorAll:()=>[],matches:()=>true,closest(){return this;},getBoundingClientRect:()=>({top:10,bottom:40,height:30,width:500})};
  post.nodes=['Recover X'+i+' first English sentence.',' More English content.'].map(text=>({nodeType:3,isConnected:true,parentElement:post,_text:text,get data(){return this._text;},set data(v){this._text=v;},get textContent(){return this._text;},set textContent(v){this._text=v;}}));return post;
 });
 f.context.document={visibilityState:'visible',body:{},querySelectorAll:()=>posts,createTreeWalker(post){let i=-1;return{nextNode(){i++;this.currentNode=post.nodes[i];return i<post.nodes.length;}};}};
 f.context.NodeFilter={SHOW_TEXT:4};f.context.MutationObserver=class{constructor(cb){this.cb=cb;}observe(){}disconnect(){}};
 f.context.showOriginal={isEnabled:hover,add(){}};vm.runInContext(code,f.context);
 f.context.options={dynamic:true,retryFailed:true,getPieces:post=>[{nodes:post.nodes}],isProtected:n=>!!n.protected,acquireRecovery:vm.runInContext('acquireGoogleRecovery',f.context),translate:(sources,retry)=>{f.context.xSource=sources;f.context.xRetry=retry;return vm.runInContext('backgroundTranslateHTML("google","auto","it",xSource,false,xRetry,true)',f.context);}};
 vm.runInContext('twitterTranslator.start(options)',f.context);return posts;
}
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS',name);}
(async()=>{
 await test('X helper and normal page blocks share two recovery slots',async()=>{
  const f=make('x.com','failThenPending',{rows:Array.from({length:5},(_,i)=>['Recover page '+i+' English text'])});const posts=addX(f,3);f.run();await settle();f.state.maxLive=0;await f.advance(2400);assert.equal(f.state.live,2);assert.ok(f.state.maxLive<=2);
  f.state.mode='success';f.state.pending.splice(0).forEach(done=>done());await settle();await f.advance(5000);assert.ok(f.state.maxLive<=2);assert.ok(f.context.piecesToTranslate.every(p=>p.isTranslated));assert.ok(posts.every(p=>p.nodes.every(n=>n.data.startsWith('IT('))));
 });
 await test('X still stops after three failed attempts per text revision',async()=>{
  const f=make('x.com','alwaysFail');const posts=addX(f);await settle();await f.advance(20000);assert.equal(f.state.network.length,3);const n=f.state.network.length;await f.advance(20000);assert.equal(f.state.network.length,n);assert.equal(posts[0].nodes[0].data,'Recover X0 first English sentence.');
 });
 await test('X hover keeps original Text node identities and restoration intact',async()=>{
  const f=make('x.com','success');const posts=addX(f,1,true);const node=posts[0].nodes[0];await settle();assert.ok(node.data.startsWith('IT('));vm.runInContext('twitterTranslator.restore()',f.context);assert.equal(posts[0].nodes[0],node);assert.equal(node.data,'Recover X0 first English sentence.');
 });
 await test('X restoration cancels pending writes and releases recovery slots when requests settle',async()=>{
  const f=make('x.com','failThenPending');const posts=addX(f);await settle();await f.advance(2400);assert.equal(vm.runInContext('googleRecoveriesInFlight',f.context),1);vm.runInContext('twitterTranslator.restore()',f.context);
  f.state.mode='success';f.state.pending.splice(0).forEach(done=>done());await settle();assert.equal(vm.runInContext('googleRecoveriesInFlight',f.context),0);assert.equal(posts[0].nodes[0].data,'Recover X0 first English sentence.');
 });
 await test('X collector failure cannot leak a shared recovery slot',async()=>{
  const f=make('x.com','alwaysFail');addX(f);await settle();f.context.options.getPieces=()=>{throw Error('controlled stale DOM collection');};await f.advance(3000);assert.equal(vm.runInContext('googleRecoveriesInFlight',f.context),0);
 });
 console.log(JSON.stringify({passed,environment:'production X helper plus page recovery gate; controlled DOM contracts and provider; no browser',benchmark:false}));
})().catch(e=>{console.error(e);process.exitCode=1;});
