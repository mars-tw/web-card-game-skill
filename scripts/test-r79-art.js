const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const{chromium}=require('playwright'),{serve}=require('./capture-r73-mobile');
const{prepare,state}=require('./capture-r79-wave'),{attack}=require('./capture-r78-art');
const O=path.resolve(__dirname,'../docs/evidence/r79-art');
(async()=>{const s=await serve();global.r79base=`http://127.0.0.1:${s.address().port}`;const b=await chromium.launch({headless:true});let passed=0;const errors=[],results=[];
const check=(v,label)=>{assert.ok(v,label);passed++;console.log('PASS',label);};
try{for(const[w,h]of[[390,844],[844,390],[1366,600],[1032,1376]]){
 const c=await b.newContext({viewport:{width:w,height:h},hasTouch:true,isMobile:w<600,serviceWorkers:'block'}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()===404)errors.push(r.url());});await prepare(p);
 const cards=p.locator('#playerField .card'),first=cards.nth(0),second=cards.nth(1);
 check(await first.getAttribute('data-card-id')===await second.getAttribute('data-card-id'),'same named pair');
 check(await first.getAttribute('data-action-state')==='ready'&&await second.getAttribute('data-action-state')==='waiting','same named pair has actual distinct action states');
 check(await second.locator('.art>img:not(.faction-emblem)').evaluate(i=>getComputedStyle(i).filter.includes('brightness(0.7)')),'waiting visibly thirty percent darker');
 check(await first.locator('.r78-ready-arrow').count()===1&&await second.locator('.r78-ready-arrow').count()===0,'ready arrow only on legal attacker');
 if(w===390)check(await p.locator('.battlefield .art>img:not(.faction-emblem)').evaluateAll(a=>a.every(i=>i.getBoundingClientRect().width>=40)),'field illustrations40px at390');
 await first.click();check(await first.evaluate(i=>i.classList.contains('selected')),'selected card outline synchronizes');
 check(await p.locator('#enemyField .targetable .r79-target-arrow').count()===2,'target arrows synchronize with selection');
 await p.locator('#trialChart').click();
 check(await p.locator('#tideChartPanel button').count()===4,'decision contains only two modes continue confirm');
 check(await p.locator('#dockMorePanel #tideHarbor,#dockMorePanel #tideTrialReplay').count()===2,'leave actions moved to existing menu');
 check(await p.locator('#enemyField .r79-preview-lethal').count()===1,'one wounded target has lethal outline');
 check(await p.locator('#enemyField .r79-preview-exit').count()===1,'lethal shape shown directly on affected card');
 const before=await state(p);await p.locator('#tideChartClose').click();assert.deepEqual(await state(p),before);passed++;
 check(await p.locator('.r79-preview-exit,.r79-preview-lethal').count()===0,'cancel clears lethal previews');
 await p.locator('#tidebreakBtn').click();await p.waitForFunction(()=>window.__test.game().player.tide===0);
 check(await p.locator('.dmg-float').count()===0,'tidal damage never floats into sea');
 check(await p.locator('#endTurnBtn').isDisabled()&&await p.locator('#tidebreakBtn').isDisabled(),'both actions disabled during active wave');
 check(await p.locator('.r79-tide-source').textContent()==='陣亡蓄潮 +1','enemy tide increase explained');
 check(await p.locator('#tidebreakBtn').evaluate(i=>getComputedStyle(i).backgroundColor!=='rgb(218, 138, 109)'),'empty tide never orange even during wave');
 await p.waitForFunction(()=>!document.querySelector('#tideWave').classList.contains('run'));
 check(await p.locator('#endTurnBtn').isEnabled(),'nonlethal battle remains playable');
 // An attack that survives legitimately produces the spent seal without replacing illustration art.
 await p.evaluate(()=>{window.__test.game().tideTrial=false;window.__rerenderBattle();});
 await p.locator('#playerField .can-attack').first().click();await p.locator('#enemyHero').click();
 if(await p.locator('.target-action-popover .confirm').isVisible())await p.locator('.target-action-popover .confirm').click();
 await p.waitForTimeout(650);
 check(await p.locator('#playerField [data-action-state="spent"] .r79-spent-seal').count()>=1,'real surviving attack produces spent contour');
 await p.screenshot({path:path.join(O,`states-${w}x${h}.png`)});
 results.push({w,h});await c.close();
}
// Real lethal trial, reduced-motion and low-performance still honor impact and disabled results.
for(const mode of ['normal','reduced','low']){const c=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:mode==='reduced'?'reduce':'no-preference',serviceWorkers:'block'}),p=await c.newPage();
 await p.goto(global.r79base+'/templates/card-battle/index.html?trial=1');await p.locator('#trialBegin').click();
 if(mode==='low')await p.evaluate(()=>window.__test.setPerfMode('low'));
 await attack(p,'trial-p1','trial-e1');await attack(p,'trial-p2','trial-e2');await p.locator('#tidebreakBtn').click();
 check(await p.locator('#enemyHp').textContent()==='2',mode+' no early damage');
 await p.waitForFunction(()=>window.__test.game().over);
 check(await p.locator('#tidebreakBtn').isDisabled()&&await p.locator('#endTurnBtn').isDisabled(),mode+' both actions disabled on game end');
 check(await p.locator('#tidebreakBtn').evaluate(i=>getComputedStyle(i).backgroundColor!=='rgb(218, 138, 109)'),mode+' ended tide has no orange');
 await p.waitForFunction(()=>!document.querySelector('#tideWave').classList.contains('run'));await p.screenshot({path:path.join(O,`ended-${mode}-390x844.png`)});await c.close();
}
check(!errors.length,'zero JS/resource errors');fs.writeFileSync(path.join(O,'acceptance.json'),JSON.stringify({status:'VERIFIED',passed,results,errors,method:'Explicit nonlethal QA and real lethal trial; no changed rule assertions or fake image edits.'},null,2));console.log(`R79 art ${passed} PASS`);
}finally{await b.close();await new Promise(r=>s.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
