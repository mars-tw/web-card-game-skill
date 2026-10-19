const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { serve } = require('./capture-r73-mobile');
const root = path.resolve(__dirname, '..');
async function attack(f, p, e) {
  await f.locator(`[data-uid="${p}"]`).click();
  await f.locator(`[data-uid="${e}"]`).click();
  const confirm = f.locator('.target-action-popover .confirm');
  if (await confirm.isVisible()) await confirm.click();
  await f.waitForFunction(uid => !document.querySelector(`#playerField [data-uid="${uid}"]`), p);
  await f.waitForTimeout(450);
}
async function capture(phase = 'after') {
  const out = path.join(root, 'docs/art/compare/r76', phase);
  fs.mkdirSync(out, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const errors = [], files = [];
  try {
    const sizes = [[390,844,1],[844,390,1],[1366,600,1],[1032,1376,1]];
    if (phase === 'after') sizes.push([430,932,3],[1032,1376,2]);
    const landscapeOnly = process.argv.includes('--landscape-only');
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
      await shot('battle');
      await attack(f,'trial-p1','trial-e1');
      await attack(f,'trial-p2','trial-e2');
      await f.waitForTimeout(800);
      await shot('trial');
      await f.locator('#trialChart').click();
      await shot('tide-chart');
      await f.locator('#tideChartCast').click();
      await f.locator('#overlay.show').waitFor();
      await page.waitForTimeout(1400);
      await shot('victory');
      if(phase==='after' && deviceScaleFactor===1){
        await page.goto(base+'/templates/card-pack/index.html');
        await page.waitForFunction(()=>window.__deckTest);
        await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
        const pack=path.join(root,'docs/evidence/r76-art',`pack-${width}x${height}.png`);
        await page.screenshot({path:pack});files.push(path.relative(root,pack).replaceAll('\\','/'));
      }
      await c.close();
    }
    fs.writeFileSync(path.join(out,landscapeOnly?'capture-landscape-qa.json':'capture.json'),JSON.stringify({phase,status:errors.length?'BLOCKED':'VERIFIED',method:'headless Chromium; official root and real trial actions; no test state injection; PNGs unedited',files,errors},null,2));
    if(errors.length) throw Error(errors.join('\n'));
  } finally { await browser.close(); await new Promise(r=>server.close(r)); }
}
if(require.main===module) capture(process.argv[2]).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={capture,attack};
