/* 退潮 UI 整合回歸：此測試明示用既有測試掛鉤準備場面，不用於商店截圖。 */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {serve,open}=require('./capture-r73-mobile');
(async()=>{
  const server=await serve(),browser=await chromium.launch({headless:true});
  try{
    const {context,page}=await open(browser,`http://127.0.0.1:${server.address().port}`,390,844);
    await page.evaluate(()=>{window.__test.setup(['footman'],['archer']);window.__test.game().player.hp=20;window.__test.setTide(6,0);});
    await page.locator('#moreActionsBtn').click();await page.locator('#tideChartBtn').click();
    await page.locator('#chooseEbb').click();
    assert.match(await page.locator('#tidePreview').textContent(),/回復 3 點；1 位友軍/);
    await page.locator('#tideChartCast').click();
    await page.waitForFunction(()=>window.__test.game().player.tide===0);
    const result=await page.evaluate(()=>{const g=window.__test.game();return{hp:g.player.hp,shield:g.player.field[0].shield,tide:g.player.tide,used:g.player.tidebreaksUsed,enemy:g.enemy.hp};});
    assert.equal(result.hp,23);assert.equal(result.shield,true);assert.equal(result.tide,0);assert.equal(result.used,1);assert.equal(result.enemy,25);
    await page.waitForFunction(()=>!document.querySelector('#tideWave').classList.contains('run'));
    await page.locator('#moreActionsBtn').click();await page.locator('#tideChartBtn').click();
    assert.equal(await page.locator('#tideChartCast').isDisabled(),true);
    await page.locator('#tideChartClose').click();
    assert.equal(await page.locator('#tideChartPanel').isVisible(),false);
    console.log('R74 ebb UI: 9 PASS, 0 FAIL (deterministic fixture; not store evidence)');
    await context.close();
  }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
