const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const script = name => fs.readFileSync(path.join(process.env.TWP_SOURCE_ROOT || path.join(__dirname, '..'), 'src/contentScript', name), 'utf8');
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH, args:['--no-sandbox']});
  let passed = 0;
  async function fixture(html, {host='www.reddit.com', hover=false, unsorted=false}={}) {
    const page = await browser.newPage({viewport:{width:1200,height:1600}});
    const errors=[];page.on('pageerror', e=>errors.push(e.message));
    await page.route('**/*',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html><head><title>Fixture</title></head><body><p id="ordinary">Ordinary English paragraph</p>${html}</body></html>`}));
    await page.goto(`https://${host}/fixture`);
    await page.evaluate(({hover,unsorted})=>{
      const cfg={targetLanguage:'it',targetLanguages:['it','en','de'],pageTranslatorService:'google',customDictionary:new Map(),popupPanelSection:2,translateDynamicallyCreatedContent:'yes',dontSortResults:unsorted?'yes':'no',showOriginalTextWhenHovering:hover?'yes':'no',alwaysTranslateSites:[],neverTranslateSites:[],alwaysTranslateLangs:[],neverTranslateLangs:[]};
      window.twpConfig={get:k=>cfg[k],set:(k,v)=>cfg[k]=v,onReady(cb){if(cb)cb();return Promise.resolve();},onChanged(){}};
      window.platformInfo={isMobile:{any:false}};window.twpLang={fixTLanguageCode:x=>x};window.checkedLastError=()=>{};
      window.requests=[];window.pending=[];window.hold=false;window.testVisibility='visible';
      Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>testVisibility});
      window.changeVisibility=value=>{testVisibility=value;document.dispatchEvent(new Event('visibilitychange'));};
      const translate=text=>({'23K':'23.000','1,8K':'1,8 mila','1.8K':'1,8 mila','Comments':'Commenti','Share':'Condividi','2 hours ago':'2 ore fa','1 hour ago':"1 ora fa",'1 minute ago':'1 minuto fa','Read more':'Leggi tutto','Follow':'Segui','Email us':'Scrivici'}[text.trim()]||`IT(${text})`);
      window.chrome={extension:{inIncognitoContext:false},i18n:{getMessage:()=>''},runtime:{getURL:p=>location.origin+'/'+p,onMessage:{addListener(){}},sendMessage(request,callback=()=>{}){
        if(request.action==='getTabHostName')return callback(location.hostname);
        if(request.action==='detectTabLanguage')return callback('en');
        if(request.action==='translateHTML'){
          requests.push(request);const answer=request.sourceArray2d.map(row=>row.map(translate));
          if(hold)pending.push(()=>callback(answer));else callback(answer);return;
        }
        if(request.action==='translateSingleText')return callback(translate(request.source));
        if(request.action==='translateText')return callback(request.sourceArray.map(translate));
        callback();
      }}};
    },{hover,unsorted});
    for(const name of ['showOriginal.js','twitterTranslator.js','pageTranslator.js'])await page.addScriptTag({content:script(name)});
    await page.waitForFunction(()=>typeof pageTranslator.translatePage==='function');
    return {page,errors};
  }
  async function start(f){await f.page.evaluate(()=>pageTranslator.translatePage('it'));await f.page.waitForFunction(()=>document.getElementById("ordinary").textContent.startsWith('IT('));}
  async function close(f){assert.deepEqual(f.errors,[]);await f.page.close();}
  async function untouched(f,ids,values){for(let i=0;i<ids.length;i++)assert.equal(await f.page.locator('#'+ids[i]).textContent(),values[i]);}
  async function notSent(f,values){assert.equal(await f.page.evaluate(values=>requests.some(r=>r.sourceArray2d.flat().some(t=>values.includes(t.trim()))),values),false);}
  async function test(name,fn){if(process.env.TEST_FILTER&&!name.includes(process.env.TEST_FILTER))return;await fn();passed++;console.log('PASS',name);}
  try {
    for(const host of ['www.reddit.com','old.reddit.com']) await test(`${host}: subreddit and user names preserved, publication time translated`,async()=>{
      const f=await fixture('<a id="community" href="/r/oneui/">r/oneui</a><a id="user" href="/user/MrTree/">u/MrTree</a><time id="when" datetime="2026-11-10T17:00:00Z">2 hours ago</time><h2 id="heading">Side menu on Samsung tablet</h2>',{host});await start(f);
      await f.page.waitForFunction(()=>document.getElementById("when").textContent.trim()==='2 ore fa');await untouched(f,['community','user'],['r/oneui','u/MrTree']);await notSent(f,['r/oneui','u/MrTree']);
      assert.equal(await f.page.locator('#when').getAttribute('datetime'),'2026-11-10T17:00:00Z');assert.ok((await f.page.locator('#heading').textContent()).startsWith('IT('));await close(f);
    });
    await test('split and mixed Reddit name labels do not exclude adjacent actions',async()=>{
      const f=await fixture('<a href="/r/oneui/"><span id="prefix">r/</span><b id="name">oneui</b><span id="action">Read more</span></a><a id="bare" href="/r/technology/">technology</a>');await start(f);
      await f.page.waitForFunction(()=>document.getElementById("action").textContent.trim()==='Leggi tutto');await untouched(f,['prefix','name','bare'],['r/','oneui','technology']);await close(f);
    });
    for(const host of ['x.com','twitter.com']) await test(`${host}: profile names and handles protected, status-link times translated`,async()=>{
      const f=await fixture('<article><div data-testid="User-Name"><a id="name" href="/thatjoshguy"><span>That Josh Guy</span></a><a id="handle" href="/thatjoshguy">@thatjoshguy</a><a href="/thatjoshguy/status/123"><time id="when" datetime="2026-11-10">2 hours ago</time></a></div><div data-testid="tweetText"><span id="post">English post body</span><a id="postLink" href="https://example.org">example.org…</a></div><a id="more" href="https://example.org/read">Read more</a></article>',{host});await start(f);
      await f.page.waitForFunction(()=>document.getElementById("when").textContent.trim()==='2 ore fa'&&document.getElementById("more").textContent.trim()==='Leggi tutto');await untouched(f,['name','handle','postLink'],['That Josh Guy','@thatjoshguy','example.org…']);await notSent(f,['That Josh Guy','@thatjoshguy','example.org…']);assert.equal(await f.page.locator('#postLink').getAttribute('href'),'https://example.org');await close(f);
    });
    await test('X profile header and sidebar names do not suppress bios or buttons',async()=>{
      const f=await fixture('<div data-testid="UserName"><span id="headerName">The Big Tree</span><span id="headerHandle">@BigTree</span></div><div data-testid="UserCell"><a id="sideName" href="/johndoe">John Doe</a><p id="bio">I write about Android</p><button id="follow">Follow</button></div>',{host:'x.com'});await start(f);
      await f.page.waitForFunction(()=>document.getElementById("follow").textContent.trim()==='Segui'&&document.getElementById("bio").textContent.startsWith('IT('));await untouched(f,['headerName','headerHandle','sideName'],['The Big Tree','@BigTree','John Doe']);await close(f);
    });
    await test('generic structured authors protect only names, not dates, byline labels or article titles',async()=>{
      const f=await fixture('<article itemscope itemtype="https://schema.org/Article"><h2 id="headline" itemprop="name">A new technology</h2><div itemprop="author" itemscope itemtype="https://schema.org/Person"><span id="by">Written by</span><span itemprop="name" id="person">Rose Green</span><time id="when">2 hours ago</time></div></article><a rel="author" id="other" href="/people/john">John Smith</a>',{host:'example.org'});await start(f);
      await f.page.waitForFunction(()=>document.getElementById("when").textContent.trim()==='2 ore fa');await untouched(f,['person','other'],['Rose Green','John Smith']);for(const id of ['headline','by'])assert.ok((await f.page.locator('#'+id).textContent()).startsWith('IT('));await close(f);
    });
    await test('generic creator metadata and rel-author nested formatting retain original node identity',async()=>{
      const f=await fixture('<span itemprop="creator" id="creator">Mary White</span><a rel="author" href="/people/mary"><b id="name">Mary</b> <i id="surname">White</i></a>',{host:'example.org',hover:true});await f.page.evaluate(()=>window.savedName=document.getElementById("name").firstChild);await start(f);
      await untouched(f,['creator','name','surname'],['Mary White','Mary','White']);assert.equal(await f.page.evaluate(()=>document.getElementById("name").firstChild===savedName&&!document.getElementById("name").querySelector('font')),true);await close(f);
    });
    await test('relative time in a plain author-widget span still translates',async()=>{
      const f=await fixture('<a rel="author" href="/people/john"><b id="name">John Doe</b><span id="relative">2 hours ago</span></a>',{host:'example.org'});await start(f);
      await f.page.waitForFunction(()=>document.getElementById("relative").textContent.trim()==='2 ore fa');await untouched(f,['name'],['John Doe']);await close(f);
    });
    await test('standalone URL, email and handles protected; ordinary link and button labels translated',async()=>{
      const f=await fixture('<p id="url">https://example.org/a</p><a href="https://example.org/b" id="bare">example.org/b</a><p id="email">me@example.org</p><span id="mention">@person</span><a href="https://example.org/c" id="more">Read more</a><a href="mailto:me@example.org" id="emailAction">Email us</a>',{host:'example.org'});await start(f);
      await f.page.waitForFunction(()=>document.getElementById("more").textContent.trim()==='Leggi tutto'&&document.getElementById("emailAction").textContent.trim()==='Scrivici');await untouched(f,['url','bare','email','mention'],['https://example.org/a','example.org/b','me@example.org','@person']);await notSent(f,['https://example.org/a','example.org/b','me@example.org','@person']);await close(f);
    });
    await test('names, brands, hashtags and unmarked prose are not globally excluded',async()=>{
      const f=await fixture('<p id="prose">Rose likes Apple products and discusses #Technology.</p><h2 id="product">OneUI and Samsung news</h2><a id="redditProse" href="https://reddit.com/r/oneui/">Read more</a><p id="relative">2 hours ago</p>',{host:'example.org'});await start(f);
      await f.page.waitForFunction(()=>document.getElementById("relative").textContent.trim()==='2 ore fa');assert.ok((await f.page.locator('#prose').textContent()).startsWith('IT('));assert.ok((await f.page.locator('#product').textContent()).startsWith('IT('));assert.equal((await f.page.locator('#redditProse').textContent()).trim(),'Leggi tutto');await close(f);
    });
    await test('dynamically inserted metadata and relative timestamps retain normal collection',async()=>{
      const f=await fixture('');await start(f);await f.page.evaluate(()=>{const section=document.createElement('section');section.innerHTML='<a id="newName" href="/r/oneui/">r/oneui</a><p id="newPost">New English content</p><time id="newTime">2 hours ago</time>';document.body.append(section);});
      await f.page.waitForFunction(()=>document.getElementById("newPost").textContent.startsWith('IT(')&&document.getElementById("newTime").textContent.trim()==='2 ore fa');await untouched(f,['newName'],['r/oneui']);await notSent(f,['r/oneui']);await close(f);
    });
    await test('open shadow roots: author names protected and faceplate relative times translated',async()=>{
      const f=await fixture('<div itemprop="author" id="authorHost"></div><faceplate-timeago id="timeHost"></faceplate-timeago><div id="communityHost"></div>');
      await f.page.evaluate(()=>{document.getElementById("authorHost").attachShadow({mode:'open'}).textContent='Mary Shadow';document.getElementById("timeHost").attachShadow({mode:'open'}).textContent='2 hours ago';document.getElementById("communityHost").attachShadow({mode:'open'}).innerHTML='<a href="/r/oneui/">r/oneui</a><p id="shadowPost">Shadow English text</p>';});await start(f);
      await f.page.waitForFunction(()=>document.getElementById("timeHost").shadowRoot.textContent.trim()==='2 ore fa'&&document.getElementById("communityHost").shadowRoot.querySelector('#shadowPost').textContent.startsWith('IT('));assert.equal(await f.page.evaluate(()=>document.getElementById("authorHost").shadowRoot.textContent),'Mary Shadow');assert.equal(await f.page.evaluate(()=>document.getElementById("communityHost").shadowRoot.querySelector('a').textContent),'r/oneui');await close(f);
    });
    for(const unsorted of [false,true])await test(`late metadata classification during an in-flight request, unsorted=${unsorted}`,async()=>{
      const f=await fixture('<span id="lateName">John Pending</span>',{host:'example.org',unsorted});await f.page.evaluate(()=>{hold=true;pageTranslator.translatePage('it');});await f.page.waitForFunction(()=>pending.length>0);
      await f.page.evaluate(()=>{document.getElementById("lateName").setAttribute('itemprop','author');pending.splice(0).forEach(fn=>fn());});await f.page.waitForFunction(()=>document.getElementById("ordinary").textContent.startsWith('IT('));await untouched(f,['lateName'],['John Pending']);await close(f);
    });
    await test('tab returns, hover and restore keep protected identities intact',async()=>{
      const f=await fixture('<a id="name" href="/r/oneui/">r/oneui</a><time id="when">2 hours ago</time>',{hover:true});await start(f);await f.page.waitForFunction(()=>document.getElementById("when").textContent.trim()==='2 ore fa');
      for(let i=0;i<3;i++)await f.page.evaluate(()=>{changeVisibility('hidden');changeVisibility('visible');});await untouched(f,['name'],['r/oneui']);await notSent(f,['r/oneui']);assert.equal(await f.page.locator('#name font').count(),0);
      await f.page.evaluate(()=>pageTranslator.restorePage());await untouched(f,['name','when'],['r/oneui','2 hours ago']);await close(f);
    });
    for(const host of ['www.reddit.com','x.com'])await test(`${host}: compact time labels stay exact while full English times translate`,async()=>{
      const labels=['1h','1 min','2m','30s','3 d','4 hr.','1,5 h'];
      const f=await fixture('<article><div data-testid="User-Name">'+labels.map((s,i)=>`<a href="/person/status/${i}"><time id="compact${i}">${s}</time></a>`).join('')+'<time id="fullHour">1 hour ago</time><time id="fullMinute">1 minute ago</time></div></article>',{host,hover:true});await start(f);
      await f.page.waitForFunction(()=>document.getElementById('fullHour').textContent.trim()==='1 ora fa'&&document.getElementById('fullMinute').textContent.trim()==='1 minuto fa');
      await untouched(f,labels.map((_,i)=>'compact'+i),labels);await notSent(f,labels);
      for(let i=0;i<3;i++)await f.page.evaluate(()=>{changeVisibility('hidden');changeVisibility('visible');});
      await f.page.evaluate(()=>pageTranslator.restorePage());await untouched(f,labels.map((_,i)=>'compact'+i),labels);await close(f);
    });
    await test('compact times in plain author spans and open shadow roots are preserved',async()=>{
      const f=await fixture('<a rel="author" href="/people/john"><b>John Doe</b><span id="compactPlain">1 min</span><span id="fullPlain">1 minute ago</span></a><faceplate-timeago id="compactHost"></faceplate-timeago><faceplate-timeago id="fullHost"></faceplate-timeago>',{host:'example.org'});
      await f.page.evaluate(()=>{document.getElementById('compactHost').attachShadow({mode:'open'}).textContent='1h';document.getElementById('fullHost').attachShadow({mode:'open'}).textContent='1 hour ago';});await start(f);
      await f.page.waitForFunction(()=>document.getElementById('fullPlain').textContent.trim()==='1 minuto fa'&&document.getElementById('fullHost').shadowRoot.textContent.trim()==='1 ora fa');
      await untouched(f,['compactPlain'],['1 min']);assert.equal(await f.page.evaluate(()=>document.getElementById('compactHost').shadowRoot.textContent),'1h');await notSent(f,['1 min','1h']);await close(f);
    });
    await test('dynamic compact timestamps are preserved without excluding prose containing units',async()=>{
      const f=await fixture('');await start(f);await f.page.evaluate(()=>{const section=document.createElement('section');section.innerHTML='<time id="newCompact">1 min</time><time id="newFull">1 minute ago</time><p id="mixed">Wait 1 min before trying again.</p>';document.body.append(section);});
      await f.page.waitForFunction(()=>document.getElementById('newFull').textContent.trim()==='1 minuto fa'&&document.getElementById('mixed').textContent.startsWith('IT('));await untouched(f,['newCompact'],['1 min']);await notSent(f,['1 min']);await close(f);
    });
    for(const host of ['www.reddit.com','old.reddit.com'])await test(`${host}: Reddit numeric counters retain compact format and button labels translate`,async()=>{
      const labels=['23K','1,8K','1.8K','23','0','-12','−12','2.4M','1B','1 234'];
      const f=await fixture('<article>'+labels.map((s,i)=>`<button><span id="count${i}">${s}</span></button>`).join('')+'<a href="/r/test/comments/123"><span id="commentCount">1,8K</span> <span id="commentLabel">Comments</span></a><button id="share">Share</button><p id="counterProse">More than 23K people joined the discussion.</p></article>',{host,hover:true});await start(f);
      await f.page.waitForFunction(()=>document.getElementById('commentLabel').textContent.trim()==='Commenti'&&document.getElementById('share').textContent.trim()==='Condividi');
      await untouched(f,labels.map((_,i)=>'count'+i),labels);await untouched(f,['commentCount'],['1,8K']);await notSent(f,labels);assert.ok((await f.page.locator('#counterProse').textContent()).startsWith('IT('));await close(f);
    });
    await test('Reddit numeric counters in open shadow roots and split faceplate-number nodes stay exact',async()=>{
      const f=await fixture('<shreddit-post id="counterHost"></shreddit-post><faceplate-number id="splitCount"><span id="digits">23</span><span id="suffix">K</span></faceplate-number>');
      await f.page.evaluate(()=>{document.getElementById('counterHost').attachShadow({mode:'open'}).innerHTML='<button><faceplate-number id="votes">23K</faceplate-number></button><a href="/comments/123"><span id="comments">1.8K</span><span id="label">Comments</span></a>';window.originalDigits=document.getElementById('digits').firstChild;});await start(f);
      await f.page.waitForFunction(()=>document.getElementById('counterHost').shadowRoot.querySelector('#label').textContent.trim()==='Commenti');
      assert.deepEqual(await f.page.evaluate(()=>['votes','comments'].map(id=>document.getElementById('counterHost').shadowRoot.getElementById(id).textContent)),['23K','1.8K']);await untouched(f,['digits','suffix'],['23','K']);assert.equal(await f.page.evaluate(()=>document.getElementById('digits').firstChild===originalDigits),true);await notSent(f,['23K','1.8K','23','K']);await close(f);
    });
    await test('Reddit numeric counters survive live updates, inserted posts, tab returns and restore',async()=>{
      const f=await fixture('<button><span id="liveCount">23K</span></button>',{hover:true});await start(f);
      await f.page.evaluate(()=>{document.getElementById('liveCount').textContent='24K';const section=document.createElement('section');section.innerHTML='<button><span id="insertedCount">1,8K</span></button><p id="insertedPost">New discussion text</p>';document.body.append(section);changeVisibility('hidden');changeVisibility('visible');});
      await f.page.waitForFunction(()=>document.getElementById('insertedPost').textContent.startsWith('IT('));
      await untouched(f,['liveCount','insertedCount'],['24K','1,8K']);await notSent(f,['23K','24K','1,8K']);await f.page.evaluate(()=>pageTranslator.restorePage());await untouched(f,['liveCount','insertedCount'],['24K','1,8K']);await close(f);
    });
    await test('Reddit numeric counter protection does not exclude standalone counts on other sites',async()=>{
      const f=await fixture('<span id="otherCount">23K</span>',{host:'example.org'});await start(f);await f.page.waitForFunction(()=>document.getElementById('otherCount').textContent.trim()==='23.000');await close(f);
    });
    console.log(JSON.stringify({browser:browser.version(),passed,provider:'controlled translations; real DOM and content scripts; functional tests only'}));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
