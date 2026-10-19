/* =========================================================================
 * test-r72-fun.js — R72 好玩＋美觀輪守門（真瀏覽器、真實點擊）
 *  1. 招牌玩法「裂潮」：回合充能、未滿點擊只提示、滿潮真實點擊施放、AI 會施放
 *  2. 星級挑戰：真實致死後結算顯示星數並寫入最佳紀錄
 *  3. VS 開場：?intro=1 顯示、點擊可略過；自動化預設不擋操作
 *  4. 桌機矮視口：戰場與手牌卡片完整入框、不被 command dock 蓋住
 *  5. 品牌與卡包：標題為《裂潮卡牌》、卡包不再是 🎁 emoji
 * 執行：node scripts/test-r72-fun.js
 * ========================================================================= */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".css": "text/css", ".mp3": "audio/mpeg",
};
let passed = 0;
let failed = 0;
function assert(cond, message) {
  if (cond) { passed++; console.log("  ✓ " + message); }
  else { failed++; console.error("  ✗ " + message); }
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const pathname = decodeURIComponent(new URL(req.url, "http://local").pathname);
      const filePath = path.resolve(ROOT, "." + (pathname === "/" ? "/index.html" : pathname));
      const relative = path.relative(ROOT, filePath);
      if (relative.startsWith("..") || path.isAbsolute(relative) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404); res.end(); return;
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function openBattle(browser, base, viewport, query) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.addInitScript(() => { try { localStorage.setItem("cb_guide_done_v1", "1"); } catch {} });
  await page.goto(`${base}/templates/card-battle/index.html${query || ""}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__test && window.__test.game() && window.__test.tide);
  await page.evaluate(() => {
    document.querySelectorAll(".overlay.show, #battleGuide.show").forEach((el) => el.classList.remove("show"));
    window.__test.setPerfMode("high");
  });
  return { context, page, errors };
}

async function waitPlayerTurn(page) {
  await page.waitForFunction(() => { const g = window.__test.game(); return g.over || (g.turn === "player" && !document.querySelector(".combat-ghost")); }, null, { timeout: 20000 });
  await page.waitForTimeout(250);
}

(async () => {
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    console.log("\n[R72-1] 招牌玩法「裂潮」");
    {
      const { context, page, errors } = await openBattle(browser, base, { width: 1366, height: 768 });
      const start = await page.evaluate(() => window.__test.tide());
      assert(start.player === 0 && start.enemy === 0 && start.max === 6, "新局雙方潮能 0/6");
      assert(start.enemyRates.label === "守城潮", "預設對手哈爾登帶「守城潮」親和");
      const ui = await page.evaluate(() => {
        const btn = document.getElementById("tidebreakBtn");
        const r = btn.getBoundingClientRect();
        return { w: r.width, h: r.height, ready: btn.classList.contains("ready"), meter: document.getElementById("enemyTideCount").textContent, style: document.getElementById("enemyTideStyle").textContent };
      });
      assert(ui.w >= 44 && ui.h >= 44 && !ui.ready, "裂潮鈕 ≥44px、未滿時不是 ready 狀態");
      assert(ui.meter === "0/6" && ui.style === "守城潮", "敵方潮能計顯示 0/6 與親和名");

      // 未滿點擊：只提示、不造成傷害
      const hpBefore = await page.evaluate(() => window.__test.game().enemy.hp);
      await page.locator("#tidebreakBtn").click();
      const afterEarly = await page.evaluate(() => ({ hp: window.__test.game().enemy.hp, toast: document.getElementById("toastStack")?.textContent || "" }));
      assert(afterEarly.hp === hpBefore && /潮能 0\/6/.test(afterEarly.toast), "未滿潮真實點擊：提示充能規則、不扣血");

      // 真實結束回合 → 對手回合開始 +1、玩家回合開始 +1
      await page.evaluate(() => { const g = window.__test.game(); g.enemy.hand = []; g.enemy.field = []; g.player.field = []; });
      await page.locator("#endTurnBtn").click();
      await waitPlayerTurn(page);
      const afterTurn = await page.evaluate(() => window.__test.tide());
      assert(afterTurn.player === 1 && afterTurn.enemy === 1, "真實結束回合一輪後雙方各 +1 潮能");
      const bannerSeen = await page.evaluate(() => !!document.getElementById("turnBanner"));
      assert(bannerSeen, "回合橫幅節點存在");

      // 滿潮：真實點擊施放
      await page.evaluate(() => { window.__test.setup(["wolf"], ["footman", "golem"]); window.__test.setTide(6, 0); });
      const before = await page.evaluate(() => ({ hp: window.__test.game().enemy.hp, field: window.__test.game().enemy.field.map((m) => m.health), ready: document.getElementById("tidebreakBtn").classList.contains("ready") }));
      assert(before.ready, "滿潮時裂潮鈕進入 ready 發光狀態");
      await page.locator("#tidebreakBtn").click();
      await page.waitForTimeout(120);
      const waveRunning = await page.evaluate(() => document.getElementById("tideWave").classList.contains("run"));
      const anticipation = await page.evaluate(() => ({hp:window.__test.game().enemy.hp,field:window.__test.game().enemy.field.map(m=>m.health),tide:window.__test.tide()}));
      assert(anticipation.hp===before.hp && anticipation.field.every((h,i)=>h===before.field[i]) && anticipation.tide.player===6, "蓄勢階段不先扣血或消耗潮能");
      await page.waitForFunction(() => window.__test.tide().player===0);
      const after = await page.evaluate(() => ({ hp: window.__test.game().enemy.hp, field: window.__test.game().enemy.field.map((m) => m.health), tide: window.__test.tide() }));
      assert(after.hp === before.hp - 2, "裂潮爆發：敵方英雄 -2");
      assert(after.field.length === before.field.length && after.field.every((h, i) => h === before.field[i] - 1), "裂潮爆發：敵方每個隨從 -1");
      assert(after.tide.player === 0 && after.tide.playerUsed === 1, "施放後潮能歸零、使用次數 1");
      assert(waveRunning, "施放時播放潮浪特效（高動畫）");
      await page.waitForFunction(() => !document.getElementById('tideWave').classList.contains('run'));

      // AI 施放：對手滿潮且玩家有 1 血隨從 → 對手回合會掀起裂潮清掉
      await page.evaluate(() => {
        window.__test.setup(["footman"], []);
        const g = window.__test.game();
        g.player.field[0].health = 1;
        g.enemy.hand = [];
        window.__test.setTide(0, 5);
      });
      const playerHpBefore = await page.evaluate(() => window.__test.game().player.hp);
      await page.locator("#endTurnBtn").click();
      await waitPlayerTurn(page);
      const aiResult = await page.evaluate(() => ({ tide: window.__test.tide(), field: window.__test.game().player.field.length, hp: window.__test.game().player.hp, log: window.__test.logText() }));
      assert(aiResult.tide.enemyUsed === 1 && aiResult.field === 0 && aiResult.hp <= playerHpBefore - 2 && /掀起守城潮爆發/.test(aiResult.log),
        "AI 滿潮時施放裂潮爆發，清掉 1 血隨從並打臉");
      assert(errors.length === 0, `裂潮流程無 console/page error（${errors.length}）`);
      await context.close();
    }

    console.log("\n[R72-2] 星級挑戰");
    {
      const { context, page, errors } = await openBattle(browser, base, { width: 1366, height: 768 });
      await page.evaluate(() => {
        localStorage.removeItem("card_star_challenges_v1");
        window.__test.setup(["titan"], []);
        const g = window.__test.game();
        g.enemy.hp = 2;
        g.player.tidebreaksUsed = 1;
      });
      await page.locator("#playerField .card").first().click();
      await page.locator("#enemyHero").click();
      await page.waitForFunction(() => document.getElementById("overlay").classList.contains("show"), null, { timeout: 8000 });
      const stars = await page.evaluate(() => ({
        result: window.__test.starResult(),
        record: window.__test.starRecord(),
        lit: document.querySelectorAll("#resultStars .star-slot.lit").length,
        slots: document.querySelectorAll("#resultStars .star-slot").length,
        text: document.getElementById("resultStars").textContent,
      }));
      assert(stars.slots === 3 && stars.lit === 3 && stars.result.count === 3, "滿血＋用過裂潮的真實致死勝利：結算點亮 3 星");
      assert(stars.record.best["op_ser_halden:easy"] === 3 && /新紀錄/.test(stars.text), "最佳星數寫入 localStorage 並顯示新紀錄");
      await page.locator("#restartBtn").click();
      await page.evaluate(() => {
        document.querySelectorAll("#battleGuide.show").forEach((el) => el.classList.remove("show"));
        window.__test.finishGame(false);
      });
      await page.waitForFunction(() => document.getElementById("overlay").classList.contains("show"), null, { timeout: 8000 });
      const loss = await page.evaluate(() => ({ lit: document.querySelectorAll("#resultStars .star-slot.lit").length, best: window.__test.starRecord().best["op_ser_halden:easy"], text: document.getElementById("resultStars").textContent }));
      assert(loss.lit === 0 && loss.best === 3 && /下一顆星：獲勝/.test(loss.text), "敗北 0 星不覆蓋最佳紀錄，並提示下一顆星");
      assert(errors.length === 0, `星級流程無 console/page error（${errors.length}）`);
      await context.close();
    }

    console.log("\n[R72-3] VS 開場");
    {
      const { context, page } = await openBattle(browser, base, { width: 390, height: 844 }, "?intro=1");
      const shown = await page.evaluate(() => ({ open: window.__test.introOpen(), name: document.getElementById("vsName").textContent, line: document.getElementById("vsLine").textContent, portrait: getComputedStyle(document.getElementById("vsPortrait")).backgroundImage }));
      assert(shown.open && /哈爾登/.test(shown.name) && shown.line.length > 4 && /heroSerHalden\.png/.test(shown.portrait), "?intro=1：開場顯示對手名、台詞與角色立繪");
      await page.locator("#vsIntro").click();
      await page.waitForFunction(() => !document.getElementById("vsIntro").classList.contains("show"), null, { timeout: 3000 });
      assert(true, "點擊開場即可略過");
      await context.close();
      const plain = await openBattle(browser, base, { width: 1366, height: 768 });
      assert(!(await plain.page.evaluate(() => window.__test.introOpen())), "自動化預設不播開場（不擋既有 E2E）");
      const avatar = await plain.page.evaluate(() => {
        const el = document.querySelector("#enemyHero .avatar");
        return { cls: el.classList.contains("has-portrait"), bg: getComputedStyle(el).backgroundImage, text: el.textContent };
      });
      assert(avatar.cls && /heroSerHalden\.png/.test(avatar.bg) && /🛡/.test(avatar.text), "敵方頭像使用角色立繪，emoji 仍保留給讀屏");
      await plain.page.locator("#endTurnBtn").click();
      const bgm = await plain.page.evaluate(() => window.__test.bgm());
      assert(bgm.url === null ? (bgm.missing && !bgm.created) : bgm.created,
        "背景音樂：缺件時互動後不建立播放器（不產生 404），有檔時建立循環播放器");
      await plain.context.close();
    }

    console.log("\n[R72-4] 桌機矮視口卡片完整入框");
    for (const viewport of [{ width: 1366, height: 768 }, { width: 1366, height: 600 }, { width: 1280, height: 640 }]) {
      const { context, page } = await openBattle(browser, base, viewport);
      await page.evaluate(() => {
        window.__test.setup(["wolf", "knight", "golem"], ["footman", "archer", "golem"]);
        const g = window.__test.game();
        g.player.hand = [];
        ["wolf", "knight", "golem", "firebolt", "dragon"].forEach((id) => window.__test.giveCard(id));
      });
      const fit = await page.evaluate(() => {
        const inside = (card, box) => { const c = card.getBoundingClientRect(); const b = box.getBoundingClientRect(); return c.top >= b.top - 1 && c.bottom <= b.bottom + 1; };
        const ef = document.getElementById("enemyField");
        const pf = document.getElementById("playerField");
        const hand = document.getElementById("playerHand");
        const dockTop = document.getElementById("commandDock").getBoundingClientRect().top;
        return {
          enemy: [...ef.querySelectorAll(".card")].every((c) => inside(c, ef)),
          player: [...pf.querySelectorAll(".card")].every((c) => inside(c, pf)),
          hand: [...hand.querySelectorAll(".card")].every((c) => inside(c, hand) && c.getBoundingClientRect().bottom <= dockTop),
          questHidden: getComputedStyle(document.getElementById("questPanel")).display === "none",
          centerHitsCard: [...document.querySelectorAll("#playerField .card, #enemyField .card, #playerHand .card")].every((card) => {
            const r = card.getBoundingClientRect();
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return !!(hit && card.contains(hit) && !hit.closest(".card-info-btn"));
          }),
        };
      });
      assert(fit.centerHitsCard, `${viewport.width}×${viewport.height}：縮小後卡片中心仍是主動作（不被「詳」鈕吃掉）`);
      assert(fit.enemy && fit.player, `${viewport.width}×${viewport.height}：兩排戰場卡片完整入框（攻/血寶石不被裁）`);
      assert(fit.hand, `${viewport.width}×${viewport.height}：手牌卡片完整入框且在 command dock 之上`);
      assert(fit.questHidden, `${viewport.width}×${viewport.height}：每日任務收進任務抽屜，不再壓手牌`);
      await context.close();
    }

    console.log("\n[R72-5] 品牌與卡包");
    {
      const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
      const page = await context.newPage();
      await page.goto(`${base}/templates/index.html`, { waitUntil: "domcontentloaded" });
      const hub = await page.evaluate(() => ({ title: document.title, brand: document.querySelector(".brand-text")?.textContent || "" }));
      assert(/裂潮卡牌/.test(hub.title) && /裂潮卡牌/.test(hub.brand) && !/卡牌遊戲/.test(hub.brand), "入口標題與字標為《裂潮卡牌》");
      await page.goto(`${base}/templates/card-pack/index.html`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.__deckTest);
      const pack = await page.evaluate(() => ({
        title: document.title,
        header: document.querySelector("header")?.textContent || "",
        emoji: /🎁/.test(document.getElementById("pack").textContent),
        brand: document.querySelector("#pack .pack-brand")?.textContent || "",
        emblem: !!document.querySelector("#pack .pack-icon img"),
      }));
      assert(/裂潮卡牌/.test(pack.title) && /裂潮卡牌/.test(pack.header), "開包頁標題為《裂潮卡牌》");
      assert(!pack.emoji && /裂潮卡牌/.test(pack.brand) && pack.emblem, "卡包改為程序化補充包（字標＋徽記），不再是 🎁 emoji");
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`\nR72 fun gate: ${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
})().catch((err) => { console.error(err); process.exit(1); });
