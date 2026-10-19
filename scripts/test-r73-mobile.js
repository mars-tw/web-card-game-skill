const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { serve, open } = require('./capture-r73-mobile');
let count = 0;
function check(value, label) { assert.ok(value, label); count++; console.log('  ✓ ' + label); }
async function target(page, selector) {
  return page.locator(selector).evaluate(el => {
    const r = el.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return !el.hidden && r.width >= 44 && r.height >= 44 && r.x >= 0 && r.y >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && (hit === el || el.contains(hit));
  });
}
async function hand(page, ids = ['wolf', 'firebolt']) {
  await page.evaluate(ids => {
    const T = window.__test; T.setup([], ['footman']);
    T.game().player.hand = ids.map((id, i) => ({ ...getCardById(id), uid: 'r73-' + i }));
    window.__rerenderBattle();
  }, ids);
  if (!await page.locator('#handDrawer').evaluate(el => el.classList.contains('open'))) await page.locator('#handDrawerToggle').click();
  await page.waitForTimeout(280);
}
async function snapshot(page) {
  return page.evaluate(() => { const g = window.__test.game(); return { mana: g.player.mana, hand: g.player.hand.map(c => c.uid), field: g.player.field.length, enemyHp: g.enemy.hp }; });
}
async function drag(page, end, mode = 'end') {
  const start = await page.locator('#playerHand .card').first().boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const x = start.x + 22, y = start.y + 40;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (end.x - x) * i / 8, y: y + (end.y - y) * i / 8 }] });
  if (mode === 'multi') await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: end.x, y: end.y }, { x: end.x + 40, y: end.y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: mode === 'cancel' ? 'touchCancel' : 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await page.waitForTimeout(550);
}
(async () => {
  const server = await serve();
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const evidence = path.resolve(__dirname, '../docs/evidence/r73-mobile');
  fs.mkdirSync(evidence, { recursive: true });
  try {
    for (const [w, h] of [[390, 844], [844, 390]]) {
      const { context, page } = await open(browser, `http://127.0.0.1:${server.address().port}`, w, h);
      page.on('pageerror', e => errors.push(e.message));
      console.log(`R73 touch ${w}x${h}`);
      await hand(page);
      const before = await snapshot(page);
      await page.locator('#playerHand .card').first().tap({ position: { x: 22, y: 40 } });
      check(await page.locator('#handPreview').isVisible(), '點選只預覽');
      check(JSON.stringify(await snapshot(page)) === JSON.stringify(before), '預覽前後法力、手牌、場地不變');
      for (const id of ['handCancelBtn', 'handConfirmBtn', 'settingsToggleBtn']) check(await target(page, '#' + id), id + ' 可見、命中且至少 44px');
      await page.locator('#handCancelBtn').click();
      check(JSON.stringify(await snapshot(page)) === JSON.stringify(before), '取消零消耗');
      await page.locator('#playerHand .card').first().tap({ position: { x: 22, y: 40 } });
      await page.locator('#handConfirmBtn').click();
      await page.evaluate(() => document.getElementById('handConfirmBtn').click());
      check((await snapshot(page)).mana === 8 && (await snapshot(page)).field === 1, '確認後只出一張狼並扣 2 費');
      check(!await page.locator('#handPreview').isVisible(), '確認後清空預覽，重複事件不多扣費');
      await hand(page, ['titan']);
      await page.evaluate(() => { window.__test.game().player.mana = 1; });
      await page.locator('#playerHand .card').first().tap({ position: { x: 22, y: 40 } });
      check(await page.locator('#handConfirmBtn').isDisabled(), '法力不足時不可確認');
      await page.locator('#handCancelBtn').click();
      await hand(page);
      const field = await page.locator('#playerField').boundingBox();
      const source = await page.locator('#playerHand .card').first().boundingBox();
      const end = { x: Math.max(field.x + 5, Math.min(source.x + 22, field.x + field.width - 5)), y: field.y + Math.min(25, field.height / 2) };
      await drag(page, end, 'cancel');
      check(!await page.locator('#handPreview').isVisible() && (await snapshot(page)).field === 0, 'pointercancel 零消耗');
      await drag(page, end, 'multi');
      check(!await page.locator('#handPreview').isVisible() && (await snapshot(page)).field === 0, '多指中斷零消耗');
      await drag(page, end);
      check(await page.locator('#handPreview').isVisible() && (await snapshot(page)).field === 0, '上拖至己方場地放開只進預覽');
      await page.locator('#handCancelBtn').click();
      const card = await page.locator('#playerHand .card').first().boundingBox();
      await drag(page, { x: card.x + 100, y: card.y + 40 });
      check(!await page.locator('#handPreview').isVisible() && (await snapshot(page)).field === 0, '橫滑不出牌');
      await page.locator('#moreActionsBtn').click();
      check(await target(page, '#voyageBtn'), '航程入口可達');
      await page.locator('#voyageBtn').click();
      for (const id of ['voyageClose', 'voyageStart', 'voyageFree', 'voyageNext', 'voyageDeck']) check(await target(page, '#' + id), id + ' 可達且至少 44px');
      await page.locator('#voyageNext').click();
      check(await page.locator('#voyageStart').isDisabled(), '未通過前站不可越級');
      await page.locator('#voyagePrev').click();
      const originalSaves = await page.evaluate(() => ['card_deck_v1', 'cardpack_collection_v2'].map(k => localStorage.getItem(k)));
      await page.locator('#voyageStart').click();
      check(await page.evaluate(() => window.__test.game().voyageStage === 'gate' && window.__test.game().playerDeckSource === 'trial' && window.__test.game().playerDeckIds.length === 20), '第一站帶入合法試用牌組');
      // 決定性局面只準備血線與攻擊者；實際勝利走正式攻擊、命中與結算。
      for (const [index, stage] of ['gate', 'trail', 'echo', 'frost', 'dusk'].entries()) {
        check(await page.evaluate(id => window.__test.game().voyageStage === id, stage), stage + ' 真正進入對戰');
        check(await page.evaluate(() => document.getElementById('enemyHero').textContent.includes(window.__test.game().opponentName)), stage + ' 畫面顯示當站對手');
        if (index === 3) { await page.waitForTimeout(700); await page.screenshot({ path: path.join(evidence, `after/frost-battle-${w}x${h}.png`) }); }
        if (index >= 3) {
          await page.locator('#endTurnBtn').click();
          await page.waitForFunction(() => { const g = window.__test.game(); return g.turn === 'player' && g.turnCount >= 2; });
          check(await page.evaluate(() => window.__test.game().enemy.manaMax >= 1 && window.__test.game().enemyDeckSource === 'opponent'), stage + ' 新對手完成正式 AI 回合');
        }
        await page.evaluate(() => { const T = window.__test; T.setup(['titan'], []); T.game().enemy.hp = 1; });
        await page.locator('#playerField .card').click();
        await page.locator('#enemyHero').click();
        await page.waitForSelector('#overlay.show');
        check(await page.evaluate(n => CardMobile.load().cleared.length === n, index + 1), stage + ' 正式致死推進且讀回');
        check(await target(page, '#voyageContinue'), stage + ' 結算返回航程可點');
        for (const id of ['restartBtn', 'overlayPackBtn', 'overlayQuestBtn']) check(await target(page, '#' + id), stage + ' ' + id + ' 結算控制不截斷');
        if (index === 0) { await page.waitForTimeout(3200); await page.screenshot({ path: path.join(evidence, `after/staged-result-${w}x${h}.png`) }); }
        await page.locator('#voyageContinue').click();
        if (index < 4) {
          if (index === 0) await page.locator('#voyageDeck').selectOption('wardens');
          if (index === 2) await page.locator('#voyageDeck').selectOption('conclave');
          if (index === 2) { await page.waitForTimeout(3200); await page.screenshot({ path: path.join(evidence, `after/unlocked-deck-${w}x${h}.png`) }); }
          await page.locator('#voyageStart').click();
        }
      }
      check(await page.locator('#voyageProgress').textContent() === '已通過 5 / 5 站 · 試用牌不加入收藏', '航程完成有明確回饋');
      check(JSON.stringify(originalSaves) === JSON.stringify(await page.evaluate(() => ['card_deck_v1', 'cardpack_collection_v2'].map(k => localStorage.getItem(k)))), '全航程不覆寫收藏與自訂牌組');
      await page.reload(); await page.waitForFunction(() => window.__test?.game());
      check(await page.evaluate(() => CardMobile.load().cleared.length === 5 && CardMobile.load().deck === 'conclave'), '重載保留五站進度與牌組選擇');
      await page.goto(`http://127.0.0.1:${server.address().port}/templates/card-pack/index.html`);
      await page.waitForFunction(() => window.__deckTest);
      const save = await page.evaluate(async () => {
        const T = window.__deckTest;
        T.autoFill(); T.save();
        const code = await T.exportSave();
        const exported = T.decodeSave(code);
        localStorage.setItem(CardVoyage.KEY, JSON.stringify(CardVoyage.migrate(null)));
        T.importSave(code, { reload: false });
        const restored = JSON.parse(localStorage.getItem(CardVoyage.KEY));
        const legacy = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(code), c => c.charCodeAt(0)))); delete legacy.voyage;
        const legacyCode = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(legacy))));
        const compatibility = T.decodeSave(legacyCode).voyage;
        return { exported: exported.voyage, restored, compatibility };
      });
      check(save.exported.cleared.length === 5 && save.restored.cleared.length === 5, '完整存檔匯出／匯入包含航程進度');
      check(save.compatibility.cleared.length === 5, '舊版存檔無航程欄位時保留當前航程');
      await context.close();
    }
    check(errors.length === 0, '手機流程無未捕捉錯誤');
    fs.mkdirSync(path.resolve(__dirname, '../docs/evidence/r73-mobile'), { recursive: true });
    fs.writeFileSync(path.resolve(__dirname, '../docs/evidence/r73-mobile/mobile-test.json'), JSON.stringify({ status: 'VERIFIED', passed: count, errors, fixture: '決定性手牌／血線，正式點擊、拖曳、攻擊與結算' }, null, 2));
    console.log(`R73 mobile: ${count} PASS, 0 FAIL`);
  } finally { await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
