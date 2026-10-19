const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{serve}=require('./capture-r73-mobile'),{attack}=require('./capture-r75-art');
const out=path.resolve(__dirname,'../docs/evidence/r76-art');let passed=0;function check(v,label){assert.ok(v,label);passed++;}
(async()=>{const s=await serve(),b=await chromium.launch({headless:true}),errors=[],results=[];
try{for(const [width,height] of [[390,844],[844,390],[1032,1376],[1366,600],[320,568]]){
 const c=await b.newContext({viewport:{width,height},hasTouch:true,isMobile:width<600,serviceWorkers:'block'}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto(`http://127.0.0.1:${s.address().port}/index.html`);await p.waitForURL('**/harbor.html');await p.locator('#trialStart').click();const f=await(await p.locator('#battle').elementHandle()).contentFrame();await f.locator('#trialBegin').click();
 await f.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
 check(await f.locator('.r76-trial-deck,.r76-trial-deck-label').count()===0,'no gallery advertising strip in combat');
 await require('./capture-r77-art').playTrialCards(f);
 check(await f.locator('.battlefield .card').evaluateAll(list=>new Set(list.map(i=>i.dataset.cardId)).size>=4),'four distinct card types played onto the actual battlefield');
 check(await f.evaluate(()=>['emberpup','wolf','sparkSquire','alleySkirmisher','frontScout','firebolt'].every(id=>CardVoyage.DECKS[0].cards.includes(id))),'six paintings are actual trial/voyage deck cards');
 check(await f.locator('#enemyField .r76-duplicate').count()===1,'same-name pair has visible alternate composition');
 check(await f.locator('.battlefield .card').evaluateAll(list=>list.every(i=>{const a=i.getBoundingClientRect(),b=i.closest('.battlefield').getBoundingClientRect();return a.top>=b.top-1&&a.bottom<=b.bottom+1;})),'complete card face and stats fit inside battlefield');
 check(await f.locator('.battlefield .cardname,.battlefield .r77-card-state').evaluateAll(list=>list.every(i=>i.scrollWidth<=i.clientWidth+1)),'four-card trial names and action labels never truncate');
 check(await f.locator('.battlefield .card').evaluateAll(list=>list.every(i=>Number(getComputedStyle(i.querySelector('.stats')).zIndex)>Number(getComputedStyle(i.querySelector('.r75-card-frame')).zIndex))),'attack and health painted above decorative border');
 check(await f.locator('.battlefield .card').evaluateAll(list=>list.every(i=>i.querySelector('.r77-card-state').getBoundingClientRect().bottom<=i.querySelector('.cardname').getBoundingClientRect().top)),'action labels never overlap card names');
 if(width===390)check(await f.locator('.battlefield .art>img:not(.faction-emblem)').evaluateAll(list=>list.every(i=>i.getBoundingClientRect().width>=40)),'390px characters at least40px');
 // Explicit deterministic tide fixtures used only for waterline QA, not store screenshots.
 await f.evaluate(()=>window.__test.setTide(0,0));await f.waitForTimeout(500);
 const zero=await f.locator('.r75-tide-channel').evaluate(i=>parseFloat(getComputedStyle(i,'::before').height));
 await p.screenshot({path:path.join(out,`water-0-${width}x${height}.png`)});
 await f.evaluate(()=>window.__test.setTide(6,0));await f.waitForTimeout(500);
 const six=await f.locator('.r75-tide-channel').evaluate(i=>parseFloat(getComputedStyle(i,'::before').height));
 check(six-zero>=40,'tide0to6 changes visible waterline by40px or more');await p.screenshot({path:path.join(out,`water-6-${width}x${height}.png`)});
 await f.locator('#trialChart').click();const sheet=await f.locator('#tideChartPanel .tide-chart-sheet').boundingBox();const vh=await f.evaluate(()=>innerHeight);
 check(sheet.height<=vh*.42+1,`chart <=42% at${width}`);
 check(await f.locator('#enemyField .card').evaluateAll((list,top)=>list.every(i=>i.getBoundingClientRect().bottom<=top),sheet.y),'chart never covers enemy attack or health values');
 check(await f.locator('#tideChartPanel .tide-chart-sheet').evaluate(i=>i.scrollTop===0&&i.scrollHeight<=i.clientHeight+1),'chart title and controls fit without automatic scrolling');
 const hp=await f.locator('#enemyHp').textContent();
 check(await f.locator('.r75-preview-number').count()===0,'zero preview damage floats, including hero');
 check(await f.locator('#enemyField .r75-preview-hit').count()===2,'both enemy targets outlined');
 check(await f.locator('#enemyHero.r75-preview-hit').count()===1,'hero preview uses outline only');
 check(/敵方英雄受 2 點/.test(await f.locator('#tidePreview').textContent()),'single preview text retains damage information');
 check(await f.locator('#enemyHp').textContent()===hp,'preview never damages');await f.locator('#tideChartClose').click();
 check(await f.locator('.r75-preview-number').count()===0,'cancel removes floating preview');
 // Baseline separation measured from nearest card edges in the formal trial.
 const gap=await f.evaluate(()=>{const a=[...document.querySelectorAll('#enemyField .card')].map(i=>i.getBoundingClientRect()),b=[...document.querySelectorAll('#playerField .card')].map(i=>i.getBoundingClientRect());return Math.min(...a.flatMap(x=>b.map(y=>Math.max(x.left-y.right,y.left-x.right,x.top-y.bottom,y.top-x.bottom))));});
 check(gap>=0&&gap<=vh*.18+1,'opposing units never overlap and are separated by at most18% screen height');results.push({width,height,chartRatio:sheet.height/vh,waterDelta:six-zero,unitGapRatio:gap/vh});await c.close();
 }
 // Real actions on reduced-motion/low graphics still show painted tide, then settle.
 for(const reduced of [false,true]){const c=await b.newContext({viewport:{width:390,height:844},reducedMotion:reduced?'reduce':'no-preference',serviceWorkers:'block'}),p=await c.newPage();await p.goto(`http://127.0.0.1:${s.address().port}/templates/card-battle/index.html?trial=1`);await p.locator('#trialBegin').click();await attack(p,'trial-p1','trial-e1');await attack(p,'trial-p2','trial-e2');await p.evaluate(()=>window.__test.setPerfMode('low'));await p.locator('#tidebreakBtn').click();check(await p.locator('#tideWave').evaluate(i=>i.classList.contains('run')),'low/reduced wave exists');check(!await p.locator('#overlay').isVisible(),'wave precedes visible result');await p.waitForTimeout(1450);check(await p.locator('#r75VictoryHero').evaluate(i=>new URL(i.src).pathname.endsWith('/assets/art/r80/victory-navigator.webp')),'dedicated victory pose');await c.close();}
 check(errors.length===0,'zero page errors');fs.writeFileSync(path.join(out,'art-browser.json'),JSON.stringify({status:'VERIFIED',passed,results,errors,waterNote:'0/6 QA fixtures clearly identified; store screenshots use real actions.'},null,2));console.log(`R76 art: ${passed} PASS, 0 FAIL`);
}finally{await b.close();await new Promise(r=>s.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
