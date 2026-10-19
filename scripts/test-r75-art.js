/* R75 visual integration: official trial actions; test fixtures only for the named foil plate. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { serve } = require('./capture-r73-mobile');
const { attack } = require('./capture-r75-art');
const out = path.resolve(__dirname,'../docs/evidence/r75-art');
let passed=0;
function check(value,label){assert.ok(value,label);passed++;console.log('✓ '+label);}
async function hit(f,selector){return f.locator(selector).evaluate(el=>{
  const r=el.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
  return r.width>=44 && r.height>=44 && r.top>=0 && r.left>=0 && r.right<=innerWidth+1 && r.bottom<=innerHeight+1 && (h===el||el.contains(h));
});}
(async()=>{
  fs.mkdirSync(out,{recursive:true});const server=await serve();
  const browser=await chromium.launch({headless:true});const errors=[],results=[];
  try {
    for(const [width,height] of [[390,844],[844,390],[1032,1376],[1366,600]]){
      const c=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width<600});
      const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
      await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);await p.waitForURL('**/harbor.html');
      for(const id of ['trialStart','voyageStart','privacyOpen'])check(await hit(p,'#'+id),`${width} harbor ${id} ≥44px, visible, hit-tested`);
      check(await p.locator('.harbor-navigator').evaluate(i=>i.complete&&i.naturalWidth>0),'navigator uses real loaded art');
      check(await p.evaluate(()=>getComputedStyle(document.querySelector('#trialStart')).backgroundColor!==getComputedStyle(document.querySelector('#voyageStart')).backgroundColor),'one primary CTA color');
      await p.locator('#trialStart').click();const f=await (await p.locator('#battle').elementHandle()).contentFrame();
      await f.locator('#trialBegin').click();await f.locator('[data-uid="trial-p1"]').waitFor();
      await f.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
      check(await f.locator('#r75BoardPips .filled').count()===4,'four real starting tide segments');
      check(await hit(f,'#trialChart'),'trial chart never covered by settings');
      const ratio=await f.locator('#enemyField .card').first().evaluate(el=>el.querySelector('.art').getBoundingClientRect().height/el.getBoundingClientRect().height);
      check(ratio>=.58,`${width} battlefield illustration occupies ≥58% (${ratio.toFixed(3)})`);
      check(await f.locator('#enemyField .r75-card-frame').count()===2,'generated frame actually mounted');
      await attack(f,'trial-p1','trial-e1');
      check(await f.locator('#r75BoardPips .filled').count()===5,'real death advances tide artwork to five');
      check(await f.evaluate(()=>document.body.style.getPropertyValue('--r75-tide'))==='5','battlefield waterline binds to real tide');
      const hp=await f.locator('#enemyHp').textContent();
      await f.locator('#trialChart').click();
      check(await f.locator('#r75ChartPips .filled').count()===5,'chart segments match battlefield');
      check(await f.locator('#chooseFlood img').evaluate(i=>i.complete&&i.naturalWidth>0),'flood icon loaded');
      check(await f.locator('.r75-preview-hit').count()===3,'two enemy units and enemy hero previewed');
      check(await f.locator('#enemyField .card').first().evaluate(el=>{const r=el.getBoundingClientRect();return !el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'modal blocks underlying card actions while previews remain visible');
      check(await f.locator('#enemyHp').textContent()===hp,'preview causes no damage');
      check(await f.locator('#tideChartCast').isDisabled(),'five energy cannot cast');
      for(const id of ['chooseFlood','chooseEbb','tideChartClose'])check(await hit(f,'#'+id),`${width} chart ${id} ≥44px, hit-tested`);
      await f.locator('#chooseEbb').click();
      check(await f.locator('.r75-preview-safe').count()===2,'remaining ally and hero have protection previews');
      await f.locator('#tideChartClose').click();
      check(await f.locator('.r75-preview-number,.r75-preview-safe,.r75-preview-hit').count()===0,'cancel clears every preview marker');
      await f.locator('#moreActionsBtn').click();
      for(const id of ['tideTrialReplay','tideHarbor'])check(await hit(f,'#'+id),`${width} more ${id} ≥44px, hit-tested`);
      await f.locator('#moreActionsBtn').click();
      if(width===1032){
        await f.evaluate(()=>{window.__test.setup(['dragon','heroMoenTidearbiter'],['archer']);document.querySelector('#playerField .card').classList.add('foil');});
        await f.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
        check(await f.locator('.battlefield .art>img:not(.faction-emblem)').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0)),'foil showcase waits for real card illustrations');
        await p.screenshot({path:path.join(out,'foil-rarity-fixture-1032x1376.png')});
      }
      results.push({width,height,artHeightRatio:ratio,status:'VERIFIED'});await c.close();
    }
    check(errors.length===0,'zero page errors');
    fs.writeFileSync(path.join(out,'art-browser.json'),JSON.stringify({status:'VERIFIED',passed,results,errors,fixtureNote:'Only foil-rarity-fixture uses explicit test state; not a store screenshot.'},null,2));
    console.log(`R75 art: ${passed} PASS, 0 FAIL`);
  } finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
