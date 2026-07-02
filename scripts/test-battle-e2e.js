/* =========================================================================
 * test-battle-e2e.js — 卡牌對戰引擎 gate E2E（真瀏覽器）
 *
 * 對應 Stage 1（規則修復）驗收：
 *   1. AI 攻擊權每回合重置——非衝鋒隨從第二回合起會攻擊（修：canAttack 永遠 false）
 *   2. pendingSpell 期間點其他手牌 → 取消指定、不 crash、不扣錯卡（修：過期 idx）
 *   3. Mulligan 只限第一回合；無效點擊（法力不足）不沒收重抽權
 *   4. 壞掉的 card_stats_v1 存檔讀回來欄位補齊，金幣不會 NaN
 *   5. 場上隨從上限 MAX_FIELD；亡語 token 在死者移除後才召喚（滿場邊界正確）
 *   6. 桌機 1280×900 + 手機 390×844 都跑；390px 無水平溢出；全程無 console error
 * 執行：node scripts/test-battle-e2e.js   （需 devDependency: playwright）
 * ========================================================================= */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MIME = { ".html": "text/html", ".js": "application/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css" };

let failed = 0;
function assert(cond, msg) { if (cond) console.log("  ✓ " + msg); else { console.error("  ✗ " + msg); failed++; } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const pathname = decodeURIComponent(new URL(req.url, "http://local").pathname);
      const safePath = pathname === "/" ? "/index.html" : pathname;
      const fp = path.resolve(ROOT, "." + safePath);
      const rel = path.relative(ROOT, fp);
      if (rel.startsWith("..") || path.isAbsolute(rel) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { "Content-Type": MIME[path.extname(fp)] || "application/octet-stream" });
      fs.createReadStream(fp).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

// 等 AI 回合跑完（回合回到玩家手上）；AI 攻擊鏈每步 620ms，多留餘裕
async function waitPlayerTurn(page, max) {
  const t0 = Date.now();
  while (Date.now() - t0 < (max || 15000)) {
    const st = await page.evaluate(() => ({ turn: window.__test.game().turn, over: window.__test.game().over }));
    if (st.turn === "player" || st.over) return st;
    await sleep(200);
  }
  return null;
}

async function run() {
  let chromium;
  try { ({ chromium } = require("playwright")); }
  catch (e) { console.error("需要 devDependency: playwright"); process.exit(2); }

  const server = await startServer();
  const port = server.address().port;
  const base = "http://127.0.0.1:" + port + "/templates/card-battle/index.html";
  const browser = await chromium.launch();

  try {
  for (const vp of [{ w: 1280, h: 900, name: "桌面 1280x900" }, { w: 390, h: 844, name: "手機 390x844" }]) {
    console.log("\n== 視窗 " + vp.name + " ==");
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error" && !/favicon|net::ERR/.test(m.text())) errors.push("console: " + m.text()); });
    page.on("pageerror", (e) => errors.push("pageerror: " + (e && e.message)));

    await page.goto(base);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__test && window.__test.game);
    await sleep(300);
    // 關掉首次教學浮層（若有）
    await page.evaluate(() => document.querySelectorAll(".overlay.show, .tutorial-overlay, #tutorialOverlay").forEach((el) => el.classList.remove("show")));

    // 1. 開局健全
    const boot = await page.evaluate(() => {
      const g = window.__test.game();
      return { turn: g.turn, playerHand: g.player.hand.length, playerHp: g.player.hp, enemyHp: g.enemy.hp };
    });
    assert(boot.turn === "player", "開局輪到玩家");
    assert(boot.playerHand >= 3, `玩家起手 ≥3 張（${boot.playerHand}）`);

    // 2. Stage 1 核心修復：AI 隨從攻擊權每回合重置
    //    模擬「AI 上回合召喚的非衝鋒隨從」（canAttack=false 掛在場上），
    //    結束玩家回合 → AI 回合它必須恢復攻擊權並打過來（修復前它永遠不攻擊）
    const beforeAi = await page.evaluate(() => {
      const T = window.__test;
      T.setup([], ["archer"]); // 敵方一隻 2/2 弓箭手（無衝鋒）
      const g = T.game();
      g.enemy.field[0].canAttack = false; // 模擬召喚失調殘留
      g.player.hp = 30;
      return { hp: g.player.hp };
    });
    await page.evaluate(() => window.__test.endTurn());
    const afterAi = await waitPlayerTurn(page);
    assert(!!afterAi, "AI 回合有結束（沒有卡死）");
    const hpAfter = await page.evaluate(() => window.__test.game().player.hp);
    assert(hpAfter < beforeAi.hp, `AI 非衝鋒隨從下回合有攻擊（玩家 HP ${beforeAi.hp} → ${hpAfter}）`);

    // 3. pendingSpell 中斷安全：點火焰箭 → 點另一張手牌 → 再點目標，不 crash、不扣錯卡
    const spellSafe = await page.evaluate(async () => {
      const T = window.__test; const g = T.game();
      T.setup([], ["knight"]); // 敵方一隻 3/4 騎士當目標
      g.player.hand = []; g.player.mana = g.player.manaMax = 10;
      const boltUid = T.giveCard("firebolt");   // 2 費指定敵方隨從
      const healUid = T.giveCard("heal");       // 2 費不用指定
      T.playFromHand(boltUid);                  // 進入待指定
      const pendingSet = !!g.pendingSpell;
      T.playFromHand(healUid);                  // 中途點別張 → 應取消指定並施放治療
      const pendingCleared = !g.pendingSpell;
      const handAfter = g.player.hand.map((c) => c.id);
      return { pendingSet, pendingCleared, handAfter, mana: g.player.mana, knightHp: g.enemy.field[0].health };
    });
    assert(spellSafe.pendingSet === true, "點指定型法術後進入待指定狀態");
    assert(spellSafe.pendingCleared === true, "待指定期間點其他手牌 → 自動取消指定");
    assert(spellSafe.handAfter.length === 1 && spellSafe.handAfter[0] === "firebolt", `火焰箭留在手上、治療術已施放（手牌剩 ${spellSafe.handAfter.join(",")}）`);
    assert(spellSafe.mana === 8, `只扣治療術的 2 費（剩 ${spellSafe.mana}）`);
    assert(spellSafe.knightHp === 4, "騎士沒有被錯誤結算傷害");

    // 4. Mulligan 規則：無效點擊不沒收；結束回合即失效
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__test && window.__test.game);
    await sleep(300);
    const mull = await page.evaluate(() => {
      const T = window.__test; const g = T.game();
      const btnVisible0 = document.getElementById("mulliganBtn").style.display !== "none";
      const bigUid = T.giveCard("dragon"); // 7 費，第一回合 1 法力出不起
      T.playFromHand(bigUid);              // 無效點擊（法力不足）
      const stillAvailable = !g.mulliganUsed && document.getElementById("mulliganBtn").style.display !== "none";
      T.endTurn();                          // 結束回合 → 重抽權失效
      const burnedAfterEndTurn = g.mulliganUsed;
      return { btnVisible0, stillAvailable, burnedAfterEndTurn };
    });
    assert(mull.btnVisible0 === true, "開局顯示重抽按鈕");
    assert(mull.stillAvailable === true, "法力不足的無效點擊不沒收重抽權");
    assert(mull.burnedAfterEndTurn === true, "結束回合後重抽權失效（只限第一回合）");
    await waitPlayerTurn(page); // 讓 AI 回合跑完，避免幽靈計時器干擾後續

    // 4b. 指定型法術結算也要沒收重抽權（Codex 複審抓到的缺口：只有 playFromHand
    //     直接出牌路徑有燒，經 resolvePendingSpell 結算的第一張牌沒燒）
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.__test && window.__test.game);
    await sleep(300);
    const mullSpell = await page.evaluate(() => {
      const T = window.__test; const g = T.game();
      T.setup([], ["knight"]);              // 敵方一隻目標
      g.player.mana = g.player.manaMax = 10;
      g.mulliganUsed = false;                // 明確歸位，只驗證這條路徑
      const boltUid = T.giveCard("firebolt");
      T.playFromHand(boltUid);               // 進入待指定（此時還不算出牌）
      const beforeResolve = g.mulliganUsed;
      // 走正式 UI 路徑：點擊敵方隨從卡（.card[data-uid=...] 的 onclick → clickEnemyMinion → resolvePendingSpell）
      const targetEl = document.querySelector(`.card[data-uid="${g.enemy.field[0].uid}"]`);
      if (targetEl) targetEl.click();
      return { beforeResolve, resolved: !g.pendingSpell, afterResolve: g.mulliganUsed, targetFound: !!targetEl };
    });
    assert(mullSpell.targetFound === true, "敵方隨從卡可被點擊（UI 目標路徑存在）");
    assert(mullSpell.beforeResolve === false && mullSpell.resolved === true, "進入待指定時未沒收、點目標後法術結算");
    assert(mullSpell.afterResolve === true, "指定法術結算後沒收重抽權（resolvePendingSpell 也燒）");

    // 5. 壞存檔安全：缺欄位的 card_stats_v1 讀回來自動補齊，不會 NaN
    const statsSafe = await page.evaluate(() => {
      localStorage.setItem("card_stats_v1", JSON.stringify({ wins: 3 })); // 缺 coins/streak/bestStreak
      const s = window.__test.stats();
      return { coins: s.coins, streak: s.streak, bestStreak: s.bestStreak, wins: s.wins,
        allNumbers: [s.coins, s.streak, s.bestStreak, s.wins, s.losses, s.packsOpened].every((v) => typeof v === "number" && !isNaN(v)) };
    });
    assert(statsSafe.allNumbers === true, "壞存檔欄位自動補齊，全部是數字");
    assert(statsSafe.wins === 3 && statsSafe.coins === 0, `保留舊值、補新欄位（wins=${statsSafe.wins} coins=${statsSafe.coins}）`);

    // 6. 場上上限：7 隻滿場時出隨從被擋（不扣費）；亡語在死者移除後召喚
    const cap = await page.evaluate(() => {
      const T = window.__test; const g = T.game();
      T.setup(["archer", "archer", "archer", "archer", "archer", "archer", "archer"], []);
      g.player.mana = g.player.manaMax = 10; g.turn = "player"; g.over = false;
      const wolfUid = T.giveCard("wolf");
      const manaBefore = g.player.mana;
      T.playFromHand(wolfUid);
      const blocked = g.player.field.length === 7 && g.player.mana === manaBefore;
      // 亡語邊界：敵方滿場 7 隻含 1 隻巫妖 → 殺巫妖 → 死者先移除、骷髏補位 → 仍是 7
      T.setup([], ["lich", "archer", "archer", "archer", "archer", "archer", "archer"]);
      const lichUid = g.enemy.field[0].uid;
      T.killMinion(lichUid, "enemy");
      const enemyNames = g.enemy.field.map((m) => m.name);
      return { blocked, maxField: T.maxField, enemyCount: g.enemy.field.length, hasSkeleton: enemyNames.includes("骷髏") };
    });
    assert(cap.blocked === true, `滿場（${cap.maxField} 隻）時出隨從被擋且不扣費`);
    assert(cap.enemyCount === 7 && cap.hasSkeleton === true, `亡語 token 在死者移除後補位（場上 ${cap.enemyCount} 隻，含骷髏）`);

    // 7. RWD：無水平溢出
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 2, `無水平溢出（${overflow}）`);

    // 8. 全程無 console error / pageerror
    assert(errors.length === 0, "無 console 錯誤 / pageerror" + (errors.length ? "：" + errors.slice(0, 3).join(" | ") : ""));

    await page.close();
  }
  } finally {
    await browser.close();
    server.close();
  }
  if (failed > 0) { console.error("\n❌ " + failed + " 項失敗"); process.exit(1); }
  console.log("\n✅ 卡牌對戰 Stage 1 E2E 全部通過");
}

run().catch((err) => { console.error(err); process.exit(1); });
