// Execute current production source without rewriting it for the tests.
// Page routines are extracted verbatim into a Node VM; DOM nodes, transport,
// cache backend and timers are controlled contracts. No remote provider calls.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(process.env.TWP_SOURCE_ROOT || path.join(__dirname,'../src'));
const background=fs.readFileSync(path.join(root,'background/translationService.js'),'utf8');
const page=fs.readFileSync(path.join(root,'contentScript/pageTranslator.js'),'utf8');
const section=(start,end)=>{const a=page.indexOf(start),b=page.indexOf(end,a+start.length);assert.ok(a>=0&&b>a);return page.slice(a,b);};
const functions=[
 page.slice(0,page.indexOf('var pageTranslator = {}')),
 section('  function encapsulateTextNode(', '\n  function translateAttributes('),
 page.includes('  let googleRecoveriesInFlight = 0;') ? section('  let googleRecoveriesInFlight = 0;', '\n  function translationRoutine()') : '',
 section('  function translationRoutine() {', '\n  translationRoutine();'),
 section('  function recoverContentAfterTabReturn()', '\n  // isto faz')
].join('\n');
const source='Recover This paragraph describes an intermittent translation failure on an ordinary web page. Other paragraphs may already be translated while this one remains in the source language.';
const tail=' More English text in the same paragraph.';
const initial=[[source,tail],['Unaffected English paragraph',' More unaffected English content.']];
const turn=()=>new Promise(resolve=>setImmediate(resolve));
async function settle(){for(let i=0;i<5;i++)await turn();}
function make(host,mode,{disk=new Map(),detected='en',rows=initial,unsorted=false}={}){
 const state={host,mode,detected,disk,network:[],messages:[],attempts:new Map(),timers:new Map(),clock:0,sequence:0,pending:[],errors:[],cacheReads:0,cacheWrites:0,rows,live:0,maxLive:0,aborted:0,authRequests:0};
 const listeners=[];
 class XHR {
  constructor(){this.timeout=0;this.finished=false;}
  abort(){if(this.finished)return;this.finished=true;state.aborted++;if(this.live)state.live--;if(this.onabort)this.onabort(new Error('controlled abort'));}
  open(method,url){this.url=url;}setRequestHeader(){}
  send(body){
   if(this.url.includes('/_/translate_http/')){state.authRequests++;this.responseText="'x-goog-api-key':'"+'a'.repeat(39)+"'";if(state.mode!=='authPending')queueMicrotask(()=>{if(!this.finished){this.finished=true;this.onload();}});return;}
   const strings=JSON.parse(body)[0][0];const counts=strings.map(s=>{const n=(state.attempts.get(s)||0)+1;state.attempts.set(s,n);return n;});
   const affected=s=>s.includes('Recover');
   state.network.push({strings,counts,timeout:this.timeout,time:state.clock});this.live=true;state.live++;state.maxLive=Math.max(state.maxLive,state.live);
   const done=()=>{
    if(this.finished)return;this.finished=true;state.live--;
    if(strings.some((s,i)=>affected(s)&&((state.mode==='failOnce'&&counts[i]===1)||state.mode==='alwaysFail'))){this.onerror(new Error('controlled transport error'));return;}
    this.response=[strings.map((s,i)=>{
     if(affected(s)&&counts[i]===1){
      if(state.mode==='originalOnce')return s;
      if(state.mode==='failThenPending')return null;
      if(state.mode==='emptyOnce')return '';
      if(state.mode==='partialOnce')return '<pre><a i=0>Only first translated node</a></pre>';
      if(state.mode==='malformedOnce')return null;
     }
     if(state.mode==='unchanged')return s;
     return s.includes('<a i=')?s.replace(/(<a i=\d+>)([\s\S]*?)(<\/a>)/g,(_,a,t,b)=>a+'IT('+t+')'+b):s.replace(/<pre>([\s\S]*)<\/pre>/,(_,t)=>'<pre>IT('+t+')</pre>');
    }),strings.map(()=>state.detected)];this.onload();
   };
   if(state.mode==='pending'||(state.mode==='failThenPending'&&counts.some(n=>n>1)))state.pending.push(done);else queueMicrotask(done);
  }
 }
 const cfg={enableDiskCache:'yes',enabledServices:['google','bing','yandex'],customServices:[],proxyServers:{}};
 const context=vm.createContext({
  console:{log(){},error(e){state.errors.push(e?.message||String(e));},warn(){}},
  TextDecoder,Uint8Array,URL,Map,Set,Promise,Date:class extends Date{constructor(...args){super(...(args.length?args:[1770000000000+state.clock]));}static now(){return 1770000000000+state.clock;}},XMLHttpRequestShim:XHR,
  twpConfig:{get:k=>cfg[k],onReady(cb){if(cb)cb();return Promise.resolve();},onChanged(){}},
  twpLang:{getAlternativeService:(lang,service)=>service},
  translationCache:{async get(...a){state.cacheReads++;const x=disk.get(JSON.stringify(a));if(x)return x;if(state.mode==='cachedOriginal'&&a[3].includes('Recover'))return {translatedText:a[3],detectedLanguage:detected};return null;},set(...a){state.cacheWrites++;disk.set(JSON.stringify(a.slice(0,4)),{translatedText:a[4],detectedLanguage:a[5]});}},
  chrome:{runtime:{onMessage:{addListener:f=>listeners.push(f)},sendMessage(r,cb=()=>{}){state.messages.push(r);return listeners[0](r,{tab:{incognito:false}},cb);}}},
  checkedLastError(){},location:{hostname:host},
  setTimeout(fn,ms){const id=++state.sequence;state.timers.set(id,{fn,at:state.clock+ms});return id;},clearTimeout(id){state.timers.delete(id);},
  setInterval(fn,ms){const id=++state.sequence;state.timers.set(id,{fn,at:state.clock+ms,repeat:ms});return id;},clearInterval(id){state.timers.delete(id);},
  window:{innerHeight:800},
  piecesToTranslate:[],attributesToTranslate:[],nodesToRestore:[],
  pageIsVisible:true,pageLanguageState:'translated',fooCount:1,translationRoutine_handler:null,
  currentPageTranslatorService:'google',currentSourceLanguage:'auto',currentTargetLanguage:'it',
  dontSortResults:unsorted,customDictionary:new Map(),showOriginal:{isEnabled:false},mutationObserver:{takeRecords(){return[];}},
  isProtectedIdentityText:node=>!!node.protected,document:{body:{}},getPiecesToTranslate:()=>context.piecesToTranslate.filter(p=>!p.obsolete).map(p=>({...p,isTranslated:false,pendingSource:null,attempts:0,nodes:[...p.nodes]})),
  translateAttributes(){throw Error('No attributes in this fixture');},
 });
 vm.runInContext(background,context,{filename:'unmodified/background/translationService.js'});
 vm.runInContext(functions,context,{filename:'exact-page-functions.js'});
 function collect(){
  context.piecesToTranslate=state.rows.map(row=>{
   const el={getBoundingClientRect:()=>({top:10,bottom:30,width:300,height:20})};
   return {isTranslated:false,obsolete:false,topElement:el,bottomElement:el,nodes:row.map(text=>({nodeType:3,isConnected:true,textContent:text,parentNode:el}))};
  });
  state.originalNodes=context.piecesToTranslate.map(p=>p.nodes);
 }
 collect();
 return {state,context,collect,run(){vm.runInContext('translationRoutine()',context);},read(){return state.originalNodes.map(row=>row.map(n=>n.textContent));},async direct(extra=false){context.diagnosticSource=state.rows;context.diagnosticExtra=extra;return vm.runInContext('translationService.translateHTML("google","auto","it",diagnosticSource,false,false,diagnosticExtra,diagnosticExtra)',context);},async advance(ms){const end=state.clock+ms;for(let guard=0;guard<2000;guard++){let next=null;for(const [id,t]of state.timers)if(t.at<=end&&(!next||t.at<next[1].at))next=[id,t];if(!next){state.clock=end;await settle();return;}state.clock=next[1].at;if(next[1].repeat)next[1].at+=next[1].repeat;else state.timers.delete(next[0]);next[1].fn();await settle();}throw Error('Unexpected timer loop');}};
}

module.exports={make,settle,source,tail,initial};
