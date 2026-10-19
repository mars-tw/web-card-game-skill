/* 冷啟動審查員路徑：只用玩家入口與 UI，沒有 __test、capture pose 或存檔注入。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { serve } = require('./capture-r73-mobile');
const E = path.resolve(__dirname, '../docs/evidence/r74-store');
const S = path.resolve(__dirname, '../docs/store/screenshots');
let passed = 0;
const check = (v, label) => { assert.ok(v, label); passed++; console.log('✓ ' + label); };
async function hit(frame, selector) {
  return frame.locator(selector).evaluate(el => {
    const r = el.getBoundingClientRect(), h = document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    return r.width>=44 && r.height>=44 && r.x>=0 && r.y>=0 && r.right<=innerWidth+1 && r.bottom<=innerHeight+1 && (h===el || el.contains(h));
  });
}
async function attack(frame, p, e) {
  await frame.locator(`[data-uid="${p}"]`).click();
  await frame.locator(`[data-uid="${e}"]`).click();
  const confirm=frame.locator('.target-action-popover .confirm');
  if(await confirm.isVisible()) await confirm.click();
  await frame.waitForFunction(uid => !document.querySelector(`#playerField [data-uid="${uid}"]`),p);
  await frame.waitForTimeout(430);
}
async function battle(page) {
  await page.waitForSelector('#battle');
  const f = await (await page.locator('#battle').elementHandle()).contentFrame();
  await f.locator('#trialBrief').waitFor({state:'visible'});
  return f;
}
(async()=>{
  fs.mkdirSync(E,{recursive:true});fs.mkdirSync(S,{recursive:true});
  const server=await serve(), base=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true});
  const errors=[], external=[], results=[], shots=[];
  try {
    const sizes=[[320,568,1],[375,667,1],[430,932,3],[844,390,1],[1032,1376,2],[1376,1032,1],[1024,1366,1],[1366,1024,1],[1366,600,1]];
    for (const [width,height,deviceScaleFactor] of sizes) {
      const started=Date.now();
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor,hasTouch:true,isMobile:width<600});
      const page=await context.newPage();
      page.on('pageerror',e=>errors.push(e.message));
      context.on('request',r=>{if(!r.url().startsWith(base) && !r.url().startsWith('data:'))external.push(r.url());});
      await page.goto(base+'/index.html');await page.waitForURL('**/templates/harbor.html');
      for(const id of ['trialStart','voyageStart','privacyOpen']) check(await hit(page,'#'+id),`${width}×${height} 港口 ${id} 可達`);
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'港口無水平溢出');
      await page.locator('#privacyOpen').click();check(await page.locator('#privacy').isVisible(),'隱私說明可讀');await page.locator('#privacyClose').click();
      const capture=deviceScaleFactor>1;
      if(capture){const file=`harbor-${width*deviceScaleFactor}x${height*deviceScaleFactor}.png`;await page.screenshot({path:path.join(S,file)});shots.push(file);}
      await page.locator('#trialStart').click();const f=await battle(page);
      for(const id of ['trialBegin','trialLeave']) check(await hit(f,'#'+id),'試航導引 '+id+' ≥44px');
      await f.locator('#trialBegin').click();
      await f.locator('[data-uid="trial-p1"]').waitFor();
      const before=await f.evaluate(()=>localStorage.getItem('card_stats_v1'));
      check((await f.locator('#trialStep').textContent()).includes('4/6'),'明示固定試航與初始潮能');
      await f.locator('#trialChart').click();
      check(await f.locator('#tideChartCast').isDisabled(),'未滿潮不能消耗');
      for(const id of ['chooseFlood','chooseEbb','tideChartClose'])check(await hit(f,'#'+id),'觀潮台 '+id+' 真實命中');
      await f.locator('#chooseEbb').click();check((await f.locator('#tidePreview').textContent()).includes('2 位友軍'),'退潮預覽符合當前場面');
      await f.locator('#chooseFlood').click();await f.locator('#tideChartClose').click();
      await attack(f,'trial-p1','trial-e1');
      check((await f.locator('#trialStep').textContent()).includes('5/6'),'第一次正式交換陣亡充能');
      // 透過可見入口儲存返回，再重新建立頁面；不直接竄改存檔。
      await f.locator('#moreActionsBtn').click();
      for(const id of ['tideTrialReplay','tideHarbor'])check(await hit(f,'#'+id),'更多選單 '+id+' 真實命中');
      await f.locator('#tideHarbor').click();
      await page.waitForURL('**/templates/harbor.html');check(await hit(page,'#resumeMatch'),'重開後提供繼續對局');
      await page.locator('#resumeMatch').click();
      const restored=await (await page.locator('#battle').elementHandle()).contentFrame();
      await restored.locator('#tideTrialBar').waitFor();
      check((await restored.locator('#trialStep').textContent()).includes('5/6') && await restored.locator('#playerField .card').count()===1,'恢復一次交換後的實際場面與潮能');
      const cdp=await context.newCDPSession(page);await cdp.send('Page.setWebLifecycleState',{state:'frozen'});await cdp.send('Page.setWebLifecycleState',{state:'active'});await cdp.detach();
      await attack(restored,'trial-p2','trial-e2');
      check((await restored.locator('#trialStep').textContent()).includes('滿潮'),'第二次交換滿六格');
      if(capture){const file=`trial-${width*deviceScaleFactor}x${height*deviceScaleFactor}.png`;await page.screenshot({path:path.join(S,file)});shots.push(file);}
      await restored.locator('#trialChart').click();
      check((await restored.locator('#tidePreview').textContent()).includes('2 位可能退場'),'滿潮預覽顯示兩位殘血敵軍');
      check(await hit(restored,'#tideChartCast'),'滿潮確認施放可達');
      if(capture){const file=`tide-chart-${width*deviceScaleFactor}x${height*deviceScaleFactor}.png`;await page.screenshot({path:path.join(S,file)});shots.push(file);}
      await restored.locator('#tideChartCast').click();
      await restored.locator('#overlay.show').waitFor();
      check((await restored.locator('#overlayTitle').textContent())==='潮汐試航完成','正式漲潮命中完成首個目標');
      check(await restored.evaluate(()=>localStorage.getItem('card_tide_trial_v1'))==='1','完成紀錄讀回');
      check(await restored.evaluate(()=>localStorage.getItem('card_stats_v1'))===before,'試航不灌入對戰戰績或金幣');
      check(!await restored.evaluate(()=>localStorage.getItem('card_tide_session_v1')),'勝利清除進行中檢查點');
      check(!await restored.locator('#overlayPackBtn').isVisible() && !await restored.locator('#overlayQuestBtn').isVisible(),'試航結算隱藏一般開包／領獎控制');
      for(const id of ['trialResultReplay','trialResultVoyage','trialResultHarbor'])check(await hit(restored,'#'+id),'結算 '+id+' 可達');
      if(capture){const file=`victory-${width*deviceScaleFactor}x${height*deviceScaleFactor}.png`;await page.screenshot({path:path.join(S,file)});shots.push(file);}
      await restored.locator('#trialResultVoyage').click();
      await restored.locator('#voyagePanel').waitFor({state:'visible'});
      check(await hit(restored,'#voyageStart'),'試航結算實際銜接五站航程');
      await restored.locator('#voyageStart').click();
      check((await restored.locator('#enemyHero').textContent()).includes('哈爾登'),'航程第一站進入正式對戰');
      check(await restored.locator('#trialResultActions').evaluate(el=>el.hidden),'回到一般對戰清除試航專屬結算');
      if(await restored.locator('#moreActionsBtn').isVisible())await restored.locator('#moreActionsBtn').click();
      await restored.locator('#tideHarbor').click();
      await page.waitForURL('**/templates/harbor.html');await page.reload();
      check((await page.locator('#progress').textContent()).includes('已完成'),'冷重載仍保留完成紀錄');
      const elapsedMs=Date.now()-started;check(elapsedMs<180000,'冷啟動至招牌完成小於三分鐘');
      if(width===430) {
        await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:30000});
        await context.setOffline(true);await page.reload();
        check(await page.locator('#trialStart').isVisible(),'真正離線重載港口');
        await page.locator('#trialStart').click();const offline=await battle(page);await offline.locator('#trialBegin').click();
        await attack(offline,'trial-p1','trial-e1');await attack(offline,'trial-p2','trial-e2');
        await offline.locator('#trialChart').click();await offline.locator('#tideChartCast').click();
        await offline.locator('#overlay.show').waitFor();check((await offline.locator('#overlayTitle').textContent()).includes('完成'),'真正離線完成完整試航');
        await context.setOffline(false);
      }
      results.push({width,height,deviceScaleFactor,elapsedMs,status:'VERIFIED'});
      await context.close();
    }
    check(errors.length===0,'路徑無未捕捉錯誤');check(external.length===0,'零外部網域請求');
    fs.writeFileSync(path.join(E,'review-path.json'),JSON.stringify({status:'VERIFIED',passed,errors,external,results,screenshots:shots,method:'正式冷入口、固定試航真實點擊；沒有測試注入；Chromium headless，非原生實機'},null,2));
    console.log(`R74 review: ${passed} PASS, 0 FAIL`);
  } finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
