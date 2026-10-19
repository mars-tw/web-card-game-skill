const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { serve } = require('./capture-r73-mobile');
const root = path.resolve(__dirname, '..');
async function playTrialCards(f) {
  for (const uid of ['trial-hand-wolf','trial-hand-squire','trial-hand-pup']) {
    const drawer=f.locator('#handDrawerToggle');
    if(await drawer.isVisible() && await drawer.getAttribute('aria-expanded')!=='true') await drawer.click();
    await f.locator(`#playerHand [data-uid="${uid}"]`).click({position:{x:25,y:45}});
    if(await f.locator('#handConfirmBtn').isVisible()) await f.locator('#handConfirmBtn').click();
    await f.locator(`#playerField [data-uid="${uid}"]`).waitFor();
    await f.waitForTimeout(650);
  }
}
async function attack(f, p, e) {
  await f.locator(`[data-uid="${p}"]`).click();
  await f.locator(`[data-uid="${e}"]`).click();
  const confirm = f.locator('.target-action-popover .confirm');
  if (await confirm.isVisible()) await confirm.click();
  await f.waitForFunction(uid => !document.querySelector(`#playerField [data-uid="${uid}"]`), p);
  await f.waitForTimeout(450);
}
async function capture(phase = 'after') {
  if(phase!=='before')throw Error('This helper preserves only the incoming R79 baseline. Use capture-r79-art.js for delivery.');
  const out = path.join(root, 'docs/art/compare/r79', phase);
  if(fs.existsSync(path.join(out,'capture.json')))throw Error('Incoming baseline already recorded; refuse to overwrite it.');
  fs.mkdirSync(out, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const errors = [], files = [], castReceipts = [];
  try {
    const sizes = [[390,844,1],[844,390,1],[1366,600,1],[1032,1376,1]];
    if (phase === 'after') sizes.push([430,932,3],[1032,1376,2]);
    const landscapeOnly = process.argv.includes('--landscape-only');
    if (process.argv.includes('--mobile-only')) sizes.splice(0,sizes.length,[390,844,1]);
    if (landscapeOnly) sizes.splice(0,sizes.length,[844,390,1]);
    for (const [width,height,deviceScaleFactor] of sizes) {
      const c = await browser.newContext({ viewport:{width,height},deviceScaleFactor,hasTouch:true,isMobile:width<600 });
      const page = await c.newPage();
      page.on('pageerror', e => errors.push(e.message));
      const shot = async name => {
        console.log('capture',width,height,name); await page.waitForTimeout(250);
        const file = `${name}-${width*deviceScaleFactor}x${height*deviceScaleFactor}.png`;
        const target = phase === 'after' && deviceScaleFactor>1 ? path.join(root,'docs/store/screenshots',file) : path.join(out,file);
        await page.screenshot({ path:target });
        files.push(path.relative(root,target).replaceAll('\\','/'));
      };
      await page.goto(base+'/index.html');
      await page.waitForURL('**/templates/harbor.html');
      await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
      await shot('harbor');
      await page.locator('#trialStart').click();
      await page.waitForSelector('#battle');
      const f = await (await page.locator('#battle').elementHandle()).contentFrame();
      await f.locator('#trialBegin').click();
      await f.locator('[data-uid="trial-p1"]').waitFor();
      await f.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
      await f.waitForTimeout(1300);
      if(phase==='after') await playTrialCards(f);
      await shot('battle');
      await attack(f,'trial-p1','trial-e1');
      await attack(f,'trial-p2','trial-e2');
      await f.waitForTimeout(800);
      await shot('trial');
      await f.locator('#trialChart').click();
      await shot('tide-chart');
      const waveOut=path.join(root,'docs/art/compare/r79/wave');fs.mkdirSync(waveOut,{recursive:true});
      await f.locator('#tideChartClose').click();
      await page.screenshot({path:path.join(waveOut,`official-${width*deviceScaleFactor}x${height*deviceScaleFactor}-01-before.png`)});
      await f.locator('#tidebreakBtn').click();await f.waitForFunction(()=>document.querySelector("#tideWave").classList.contains("run"));await f.waitForTimeout(420);
      const peak=await f.evaluate(()=>({active:document.querySelector('#tideWave').classList.contains('run'),waveWidth:document.querySelector('.r76-wave-art').getBoundingClientRect().width/innerWidth,foam:[...document.querySelectorAll('.r77-impact-foam')].map(i=>Number(getComputedStyle(i).opacity)),time:document.querySelector('.r76-wave-art').getAnimations().map(a=>a.currentTime),hp:document.querySelector('#enemyHp').textContent}));
      if(!peak.active||peak.waveWidth<.7||peak.foam.length<2||peak.foam.some(a=>a<.6))throw Error('Missing visible tidal peak');
      await page.screenshot({path:path.join(waveOut,`official-${width*deviceScaleFactor}x${height*deviceScaleFactor}-02-impact.png`)});
      if(phase==='after' && deviceScaleFactor>1) fs.copyFileSync(path.join(waveOut,`official-${width*deviceScaleFactor}x${height*deviceScaleFactor}-02-impact.png`),path.join(root,'docs/store/screenshots',`trial-${width*deviceScaleFactor}x${height*deviceScaleFactor}.png`));
      castReceipts.push({size:[width*deviceScaleFactor,height*deviceScaleFactor],peak,storeFrame:phase==='after'&&deviceScaleFactor>1?`trial-${width*deviceScaleFactor}x${height*deviceScaleFactor}.png`:null});
      await f.locator('#overlay.show').waitFor();
      await page.waitForTimeout(1400);
      await page.screenshot({path:path.join(waveOut,`official-${width*deviceScaleFactor}x${height*deviceScaleFactor}-03-after.png`)});
      files.push(...['01-before','02-impact','03-after'].map(stage=>path.relative(root,path.join(waveOut,`official-${width*deviceScaleFactor}x${height*deviceScaleFactor}-${stage}.png`)).replaceAll('\\','/')));
      await shot('victory');
      if(phase==='after' && deviceScaleFactor===1){
        await page.goto(base+'/templates/card-pack/index.html');
        await page.waitForFunction(()=>window.__deckTest);
        await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
        const pack=path.join(root,'docs/evidence/r79-art',`pack-${width}x${height}.png`);
        await page.screenshot({path:pack});files.push(path.relative(root,pack).replaceAll('\\','/'));
      }
      await c.close();
    }
    fs.writeFileSync(path.join(out,landscapeOnly?'capture-landscape-qa.json':'capture.json'),JSON.stringify({phase,status:errors.length?'BLOCKED':'VERIFIED',method:'headless Chromium; official root and real five-card trial actions; no test state injection; PNGs unedited; store trial frame is actual cast peak',files,castReceipts,errors},null,2));
    if(errors.length) throw Error(errors.join('\n'));
  } finally { await browser.close(); await new Promise(r=>server.close(r)); }
}
if(require.main===module) capture(process.argv[2]).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={capture,attack,playTrialCards};
