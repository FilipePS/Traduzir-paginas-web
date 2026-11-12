const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const shim=fs.readFileSync(path.join(__dirname,'../src/lib/XMLHttpRequestShim.js'),'utf8');
const {make,settle,source}=require('./google-page-fixture.cjs');
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS',name);}
function actualShim(f,mode){
 f.context.EventTarget=EventTarget;f.context.AbortController=AbortController;f.context.DOMException=DOMException;f.context.Blob=Blob;
 f.context.CustomEvent=class extends Event{constructor(name){super(name);}};
 f.context.fetch=(url,options)=>{
  if(url.includes('/_/translate_http/'))return Promise.resolve({url,status:200,statusText:'OK',headers:{},text:async()=>"'x-goog-api-key':'"+'a'.repeat(39)+"'"});
  f.state.fetchCount=(f.state.fetchCount||0)+1;
  const response={url,status:200,statusText:'OK',headers:{},json:()=>mode==='reject'?Promise.reject(new SyntaxError('controlled invalid JSON')):new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true}))};
  return Promise.resolve(response);
 };
 vm.runInContext(shim,f.context); // overrides the fixture's shim with the real implementation
}
(async()=>{
 await test('JSON body parsing errors dispatch error instead of leaving an unhandled rejection',async()=>{
  const f=make('github.com','success',{rows:[[source]]});actualShim(f,'reject');f.run();await settle();assert.equal(f.context.piecesToTranslate[0].attempts,1);assert.equal(f.context.piecesToTranslate[0].pendingSource,null);assert.ok(f.context.piecesToTranslate[0].retryAt>0);await f.advance(9000);assert.equal(f.context.piecesToTranslate[0].failed,true);assert.equal(f.state.fetchCount,3);
 });
 await test('Google deadline covers a body stalled after HTTP headers arrived',async()=>{
  const f=make('github.com','success',{rows:[[source]]});actualShim(f,'pending');f.run();await settle();await f.advance(29999);assert.ok(f.context.piecesToTranslate[0].pendingSource);await f.advance(1);assert.equal(f.context.piecesToTranslate[0].pendingSource,null);assert.equal(f.state.fetchCount,1);await f.advance(2000);assert.equal(f.state.fetchCount,2);
 });
 console.log(JSON.stringify({passed,environment:'production XMLHttpRequestShim, Google adapter and page routines; controlled fetch bodies, no network',benchmark:false}));
})().catch(e=>{console.error(e);process.exitCode=1;});
