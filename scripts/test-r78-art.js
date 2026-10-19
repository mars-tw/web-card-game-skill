/* R78 acceptance: real five-card trial; separately labelled nonlethal/water QA. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{serve}=require('./capture-r73-mobile');
const {playTrialCards}=require('./capture-r78-art');
const out=path.resolve(__dirname,'../docs/evidence/r78-art');fs.mkdirSync(out,{recursive:true});
(async()=>{const s=await serve(),b=await chromium.launch({headless:true});let passed=0;const results=[],errors=[];
const check=(v,label)=>{assert.ok(v,label);passed++;};
try{
 for(const [width,height,scale] of [[390,844,1],[844,390,1],[1366,600,1],[430,932,3],[1032,1376,2]]){
  const c=await b.newContext({viewport:{width,height},deviceScaleFactor:scale,hasTouch:true,isMobile:width<600,serviceWorkers:'block'}),p=await c.newPage();
  p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()===404)errors.push(r.url());});
  await p.goto(`http://127.0.0.1:${s.address().port}/index.html`);await p.waitForURL('**/harbor.html');await p.locator('#trialStart').click();
  const f=await(await p.locator('#battle').elementHandle()).contentFrame();await f.locator('#trialBegin').click();await playTrialCards(f);
  await f.waitForTimeout(800);const prefix=`${width*scale}x${height*scale}`;
  const cardIds=await f.locator('.battlefield .card').evaluateAll(a=>[...new Set(a.map(i=>i.dataset.cardId))]);check(cardIds.length>=5,'five real card illustrations');
  check(await f.locator('#playerField .r78-ready-arrow').count()===await f.locator('#playerField .can-attack').count(),'all legal attackers use same arrow');
  check(await f.locator('.r77-card-state').evaluateAll(a=>a.every(i=>!/(敵陣|可攻擊)\s*\d/.test(i.textContent))),'zero numbered state labels');
  check(await f.locator('.battlefield .card').evaluateAll(a=>a.every(i=>{const c=i.getBoundingClientRect(),f=i.closest('.battlefield').getBoundingClientRect();return c.top>=f.top-1&&c.bottom<=f.bottom+1&&c.left>=f.left-1&&c.right<=f.right+1;})),'all five-card scenes fully inside their fields');
  check(await f.locator('.battlefield .cardname').evaluateAll(a=>a.every(i=>i.scrollWidth<=i.clientWidth+1)),'five-card names never truncate');
  check(await f.locator('#enemyField .r76-duplicate .art>img:not(.faction-emblem)').evaluate(i=>getComputedStyle(i).filter.includes('brightness(0.7)')),'same-name alternate dimmed30percent');
  if(width===390)check(await f.locator('.battlefield .art>img:not(.faction-emblem)').evaluateAll(a=>a.every(i=>i.getBoundingClientRect().width>=40)),'all field art at least40px at390width');
  await p.screenshot({path:path.join(out,`five-cards-${prefix}.png`)});
  // Deterministic QA fixture: same board, only tide differs. Never used as store.
  await f.evaluate(()=>window.__test.setTide(0,0));await f.waitForTimeout(650);
  const water0=await f.locator('.board').evaluate(i=>({height:parseFloat(getComputedStyle(i,'::before').height),opacity:parseFloat(getComputedStyle(i,'::before').opacity)}));
  await p.screenshot({path:path.join(out,`water-0-${prefix}.png`)});
  await f.evaluate(()=>window.__test.setTide(6,0));await f.waitForTimeout(650);
  const water6=await f.locator('.board').evaluate(i=>({height:parseFloat(getComputedStyle(i,'::before').height),opacity:parseFloat(getComputedStyle(i,'::before').opacity)}));
  check(water6.height-water0.height>=40,'waterheight grows40px');check(water0.opacity===0&&water6.opacity>=.65,'zero/full coverage clearly different');
  await p.screenshot({path:path.join(out,`water-6-${prefix}.png`)});
  await f.locator('#trialChart').click();await f.waitForTimeout(300);
  const geometry=await f.evaluate(()=>{const h=document.querySelector('.player-hero-row').getBoundingClientRect(),s=document.querySelector('#tideChartPanel .tide-chart-sheet').getBoundingClientRect();return{hero:h.toJSON(),sheet:s.toJSON(),heroVisible:h.top>=0&&h.bottom<=s.top,life:document.querySelector('#playerHp').textContent,tide:document.querySelector('.r78-hero-tide').textContent};});
  console.log(prefix,JSON.stringify(geometry));
  await p.screenshot({path:path.join(out,`chart-hero-${prefix}.png`)});
  check(geometry.heroVisible,'chart keeps hero portrait life tide visible');check(geometry.tide==='潮 6/6'&&geometry.life==='12','hero information live');
  check(geometry.sheet.height<=height*.42+1,'chart still within42percent');
  await p.screenshot({path:path.join(out,`chart-hero-${prefix}.png`)});await f.locator('#tideChartClose').click();
  check(await f.locator('#tidebreakBtn strong').isVisible(),'full tidebreak name visible');
  const dock=await f.evaluate(()=>{const a=['endTurnBtn','tidebreakBtn','handDrawerToggle','moreActionsBtn'].map(id=>document.getElementById(id)).filter(i=>i.getBoundingClientRect().width).map(i=>({id:i.id,r:i.getBoundingClientRect().toJSON()}));return a.every((x,i)=>a.slice(i+1).every(y=>Math.min(x.r.right,y.r.right)-Math.max(x.r.left,y.r.left)<=1||Math.min(x.r.bottom,y.r.bottom)-Math.max(x.r.top,y.r.top)<=1));});check(dock,'dock controls never overlap');
  if(width===390){
   await f.locator('#tidebreakBtn').click();await f.locator('#overlay.show').waitFor();await f.waitForTimeout(1450);
   check(!await p.locator('.tabbar').isVisible(),'result uses full-bleed art');
   await f.evaluate(()=>parent.postMessage({type:'switchTab',target:'pack'},location.origin));
   await p.locator('#pack.active').waitFor();check(await p.locator('.tabbar').isVisible(),'leaving result restores shell navigation');
   await p.locator('.tab[data-target="battle"]').click();check(!await p.locator('.tabbar').isVisible(),'returning to result restores full-bleed art');
  }
  results.push({prefix,cardIds,water0,water6,geometry});await c.close();
 }
 // Nonlethal QA across a complete turn: actual cast, no manual wet-state injection.
 const c=await b.newContext({viewport:{width:430,height:932},deviceScaleFactor:3,serviceWorkers:'block'}),p=await c.newPage();
 await p.addInitScript(()=>localStorage.setItem('cb_guide_done_v1','1'));await p.goto(`http://127.0.0.1:${s.address().port}/templates/card-battle/index.html?intro=0`);await p.waitForFunction(()=>window.__test);
 await p.evaluate(()=>{window.__test.setup(['wolf','sparkSquire'],['archer','footman']);window.__test.game().tideTrial=true;window.__test.game().enemy.field.forEach(m=>m.health=1);window.__test.setTide(6,0);});await p.waitForTimeout(1200);
 const before=await p.evaluate(()=>({hp:window.__test.game().enemy.hp,turn:window.__test.game().turnCount,tide:window.__test.game().player.tide}));
 await p.screenshot({path:path.join(out,'nonlethal-1290x2796-01-before.png')});await p.locator('#tidebreakBtn').click();
 check(await p.evaluate(hp=>window.__test.game().enemy.hp===hp,before.hp),'no damage at attack input');
 await p.waitForFunction(()=>document.querySelector('.board').classList.contains('r76-wet'));
 const impact=await p.evaluate(()=>({hp:window.__test.game().enemy.hp,ratio:document.querySelector('.r76-wave-art').getBoundingClientRect().width/innerWidth,foam:[...document.querySelectorAll('.r77-impact-foam')].map(i=>({opacity:getComputedStyle(i).opacity,box:i.getBoundingClientRect().toJSON()}))}));
 check(await p.locator('.combat-ghost.dying').count()===2,'lethal targets produce real death feedback');
 check(await p.locator('.combat-ghost .cardtext,.combat-ghost button,.combat-ghost .r77-card-state').count()===0,'death copies never leak descriptions controls or state text');
 await p.screenshot({path:path.join(out,'nonlethal-1290x2796-02-impact.png')});check(impact.hp===before.hp-2&&impact.ratio>=.7&&impact.foam.length===2,'actual impact width foam damage');
 await p.waitForFunction(()=>!document.querySelector('#tideWave').classList.contains('run'));await p.screenshot({path:path.join(out,'nonlethal-1290x2796-03-after.png')});
 await p.locator('#endTurnBtn').click();await p.waitForFunction(t=>window.__test.game().turnCount>t&&window.__test.game().turn==='player',before.turn);
 check(await p.locator('.board').evaluate(i=>i.classList.contains('r76-wet')),'wet deck persists through one whole turn');await p.screenshot({path:path.join(out,'nonlethal-1290x2796-04-next-turn.png')});await c.close();
 check(errors.length===0,'no browser errors or missing resources');fs.writeFileSync(path.join(out,'acceptance.json'),JSON.stringify({status:'VERIFIED',passed,results,before,impact,errors,note:'five cards real trial; tide fixtures and nonlethal state labelled QA; unedited original-size PNGs'},null,2));console.log(`R78 art: ${passed} PASS`);
}finally{await b.close();await new Promise(r=>s.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
