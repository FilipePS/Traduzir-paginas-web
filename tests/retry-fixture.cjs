// Exercise production content scripts AND the Google adapter/cache. Only XHR,
// extension APIs, visibility events and the remote provider are controlled.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const script = name => fs.readFileSync(path.join(root, 'src', name), 'utf8');
async function fixture(browser, { variant = 'patched', mode = 'success', clock = true, posts = 1, dynamic = true, host = 'x.com', onlyFirst = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<html><head><title>Fixture</title><style>body{margin:0}article{height:5px;font:4px/5px Arial;overflow:hidden}</style></head><body>${Array.from({length:posts},(_,i)=>`<article><div data-testid="tweetText" id="post${i}"><span id="first${i}">Recover ${i} first sentence.</span><span id="tail${i}"> Recover ${i} second sentence.</span><a href="https://example.org/${i}">example.org/${i}</a></div></article>`).join('')}</body></html>` }));
  await page.goto(`https://${host}/fixture`);
  if (clock) await page.clock.install({time:new Date('2026-11-09T12:00:00Z')});
  await page.evaluate(({mode,dynamic,onlyFirst}) => {
    const config = {targetLanguage:'it',targetLanguages:['it','en','de'],pageTranslatorService:'google',customDictionary:new Map(),popupPanelSection:2,translateDynamicallyCreatedContent:dynamic?'yes':'no',dontSortResults:'no',showOriginalTextWhenHovering:'no',alwaysTranslateSites:[],neverTranslateSites:[],alwaysTranslateLangs:[],neverTranslateLangs:[],enabledServices:['google','bing','yandex'],customServices:[],proxyServers:{},enableDiskCache:'yes'};
    window.twpConfig={get:k=>config[k],set:(k,v)=>config[k]=v,onReady(cb){if(cb)cb();return Promise.resolve();},onChanged(){}};
    window.platformInfo={isMobile:{any:false}};
    window.twpLang={fixTLanguageCode:x=>x,getAlternativeService:(lang,service)=>service};
    window.checkedLastError=()=>{};
    window.testVisibility='visible';
    Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>testVisibility});
    window.setVisibility=v=>{testVisibility=v;document.dispatchEvent(new Event('visibilitychange'));};
    window.mode=mode;window.network=[];window.messages=[];window.pending=[];window.disk=new Map();window.attempts=new Map();
    window.cacheReads=0;window.cacheWrites=0;window.stats={};
    const key=(...a)=>JSON.stringify(a);
    window.translationCache={async get(...a){cacheReads++;const entry=disk.get(key(...a));if(entry)return entry;if(window.mode==='cachedOriginal'&&a[3].includes('Recover'))return {translatedText:a[3],detectedLanguage:window.detected||'en'};if(window.mode==='badDisk'&&a[3].includes('Recover'))return {translatedText:'<pre><a i=0>Cached partial translation</a></pre>',detectedLanguage:'en'};return null;},set(...a){cacheWrites++;disk.set(key(...a.slice(0,4)),{translatedText:a[4],detectedLanguage:a[5]});}};
    const affected=s=>s.includes('Recover')&&(!onlyFirst||s.includes('Recover 0 '));
    const translated=html=>html.includes('<a i=') ? html.replace(/(<a i=\d+>)([\s\S]*?)(<\/a>)/g,(_,a,t,b)=>`${a}IT(${t})${b}`) : html.replace(/<pre>([\s\S]*)<\/pre>/,(_,t)=>`<pre>IT(${t})</pre>`);
    window.XMLHttpRequestShim=class {
      open(method,url){this.url=url;}setRequestHeader(){}
      send(body){
        if(this.url.includes('/_/translate_http/')){this.responseText=`'x-goog-api-key':'${'a'.repeat(39)}'`;queueMicrotask(()=>this.onload());return;}
        const source=JSON.parse(body)[0][0];
        const relevant=source.some(s=>s.includes('Recover'));
        const perPiece=source.map(s=>{const n=(attempts.get(s)||0)+1;attempts.set(s,n);return n;});
        network.push({source,time:Date.now(),relevant,perPiece});
        const done=()=>{
          const failing=source.some((s,i)=>affected(s)&&((window.mode==='failOnce'&&perPiece[i]===1)||(window.mode==='failTwice'&&perPiece[i]<=2)||window.mode==='alwaysFail'));
          if(failing){this.onerror(new Error('controlled transport failure'));return;}
          this.response=[source.map((s,i)=>{
            if(affected(s)&&perPiece[i]===1){
              if(window.mode==='originalOnce')return s;
              if(window.mode==='emptyOnce')return '';
              if(window.mode==='whitespaceOnce')return '<pre>   </pre>';
              if(window.mode==='partialOnce')return '<pre><a i=0>IT(Recover 0 first sentence.)</a></pre>';
              if(window.mode==='malformedOnce')return null;
            }
            return window.mode==='unchanged'?s:translated(s);
          }),source.map(()=> window.detected||'en')];
          this.onload();
        };
        if(relevant&&window.mode==='pending')pending.push(done);else queueMicrotask(done);
      }
    };
    const listeners=[];
    window.chrome={extension:{inIncognitoContext:false},i18n:{getMessage:()=>''},runtime:{getURL:p=>location.origin+'/'+p,onMessage:{addListener:fn=>listeners.push(fn)},sendMessage(request,callback=()=>{}){
      messages.push(request);
      if(request.action==='getTabHostName')return callback(location.hostname);
      if(request.action==='detectTabLanguage')return callback('en');
      if(['translateHTML','translateText','translateSingleText'].includes(request.action))return listeners[0](request,{tab:{incognito:false}},callback);
      if(request.action==='removeTranslationsWithError'){listeners[0](request,{tab:{incognito:false}},callback);return callback();}
      callback();
    }}};
  },{mode,dynamic,onlyFirst});
  for (const name of ['background/translationService.js', 'contentScript/showOriginal.js', 'contentScript/twitterTranslator.js', 'contentScript/pageTranslator.js']) {
    const content = variant === 'baseline' && name === 'contentScript/twitterTranslator.js'
      ? fs.readFileSync(path.join(__dirname, 'fixtures/twitterTranslator-v1.1.js'), 'utf8')
      : script(name);
    await page.addScriptTag({ content });
  }
  await page.waitForFunction(()=>typeof pageTranslator.translatePage==='function');
  return {page,errors};
}
async function settle(page){for(let i=0;i<4;i++)await page.evaluate(()=>Promise.resolve());}
async function advance(page,ms){await page.clock.runFor(ms);await settle(page);}
async function stats(page){return page.evaluate(()=>({network:network.filter(r=>r.relevant).length,messages:messages.filter(r=>r.action==='translateHTML'&&r.sourceArray2d.flat().some(s=>s.includes('Recover'))).length,times:network.filter(r=>r.relevant).map(r=>r.time),text:first0.textContent,tail:tail0.textContent,reads:cacheReads,writes:cacheWrites,refresh:messages.filter(r=>r.retryFailedTranslation).length}));}
module.exports={fixture,settle,advance,stats};
