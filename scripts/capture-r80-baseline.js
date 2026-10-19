/* Unedited headless captures: natural player route and explicitly labelled nonlethal QA. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const{chromium}=require('playwright'),{serve}=require('./capture-r73-mobile');
const{playTrialCards,attack}=require('./capture-r78-art');const{setupFixture,series}=require('./capture-r80-baseline-wave');
const R=path.resolve(__dirname,'..'),O=path.join(R,'docs/art/compare/r80/before'),S=path.join(R,'docs/art/compare/r80/before/store'),W=path.join(R,'docs/art/compare/r80/before/wave');fs.mkdirSync(O,{recursive:true});
(async()=>{const s=await serve(),b=await chromium.launch({headless:true});const files=[],receipts=[],errors=[];
try{for(const[w,h,scale]of[[390,844,1],[844,390,1],[1366,600,1],[1032,1376,1],[430,932,3],[1032,1376,2]]){
 const c=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:scale,hasTouch:true,isMobile:w<600,serviceWorkers:'block'}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 const prefix=`${w*scale}x${h*scale}`,take=async name=>{await p.waitForTimeout(220);const dest=path.join(O,`${name}-${prefix}.png`);await p.screenshot({path:dest});if(scale>1)fs.copyFileSync(dest,path.join(S,`${name}-${prefix}.png`));files.push(path.relative(R,dest).replaceAll('\\','/'));};
 await p.goto(`http://127.0.0.1:${s.address().port}/index.html`);await p.waitForURL('**/harbor.html');await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));await take('harbor');
 await p.locator('#trialStart').click();const f=await(await p.locator('#battle').elementHandle()).contentFrame();await f.locator('#trialBegin').click();await playTrialCards(f);await f.locator('[data-uid="trial-p1"]').click();await f.waitForTimeout(1000);await take('battle');
 assert.ok(await f.locator('#playerField .selected').count()===1&&await f.locator('#enemyField .r79-target-arrow').count()===2,'tutorial selection and targets visible');
 await setupFixture(f);
 if(scale>1){const style=await f.addStyleTag({content:'.battlefield .cardname,.battlefield .stats,.battlefield .cost,.battlefield .r77-card-state{visibility:hidden!important}'});await p.screenshot({path:path.join(R,'docs/evidence/r80-art',`same-name-no-labels-${prefix}.png`)});await style.evaluate(i=>i.remove());}
 await f.locator('#trialChart').click();await take('tide-chart');await f.locator('#tideChartClose').click();
 // This series is one uninterrupted nonlethal fixture. No hidden state writes after before.
 const r=await series(f,prefix,p);receipts.push(r);
 for(const[name,stage]of[['tide-before','01-before'],['trial','02-impact'],['tide-after','03-after'],['tide-next-turn','04-next-turn']]){
  const src=path.join(W,`${prefix}-${stage}.png`),dest=path.join(O,`${name}-${prefix}.png`);fs.copyFileSync(src,dest);if(scale>1)fs.copyFileSync(src,path.join(S,`${name}-${prefix}.png`));files.push(path.relative(R,dest).replaceAll('\\','/'));
 }
 // Natural fixed trial is reset through its existing menu, then genuinely won for victory shot.
 await f.locator('#moreActionsBtn').click();await f.locator('#tideTrialReplay').click();await playTrialCards(f);await attack(f,'trial-p1','trial-e1');await attack(f,'trial-p2','trial-e2');await f.locator('#tidebreakBtn').click();await f.locator('#overlay.show').waitFor();await f.waitForTimeout(1450);await f.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));await take('victory');
 console.log('R79 captured',prefix);await c.close();
}
assert.equal(errors.length,0);fs.writeFileSync(path.join(O,'capture.json'),JSON.stringify({status:'VERIFIED',files,errors,receipts,method:'Natural harbor/selected trial/victory; clearly labelled reproducible nonlethal QA for tide chart and three-frame/next-turn series. No image editing/scaling, original device-scale PNGs. Same series state only changed by actual cast and end-turn.'},null,2));
}finally{await b.close();await new Promise(r=>s.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
