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
 *   7. Stage 3 牌組：合法存檔牌組進對戰、非法牌組 fallback、卡包頁可編輯並保存牌組
 *   8. Stage 4 每日任務：完成任務、領取、金幣增加
 * 執行：node scripts/test-battle-e2e.js   （需 devDependency: playwright）
 * ========================================================================= */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MIME = { ".html": "text/html", ".js": "application/javascript", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".css": "text/css" };

let failed = 0;
function assert(cond, msg) { if (cond) console.log("  ✓ " + msg); else { console.error("  ✗ " + msg); failed++; } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LEGAL_DECK_IDS = [
  "footman", "footman", "archer", "archer", "wolf", "wolf", "cleric", "cleric", "knight", "knight",
  "mage", "mage", "raptor", "raptor", "guardian", "guardian", "golem", "golem", "griffin", "griffin",
];
const R16_NEW_IDS = [
  "sparkSquire", "alleySkirmisher", "emberVolley", "bulwarkMonk", "dawnRider",
  "battleDrummer", "sanctuaryWarden", "tidebinderHex", "bastionColossus", "highArchivist",
];
const R16_AGGRO_IDS = ["sparkSquire", "alleySkirmisher", "emberVolley", "dawnRider", "battleDrummer"];
const R16_CONTROL_IDS = ["bulwarkMonk", "sanctuaryWarden", "tidebinderHex", "bastionColossus", "highArchivist"];
const R20_AGGRO_DECK_IDS = [
  "wolf", "wolf", "raptor", "raptor", "griffin", "griffin", "firebolt", "firebolt", "manaSurge", "manaSurge",
  "frontScout", "frontScout", "linebreaker", "linebreaker", "sparkSquire", "sparkSquire", "alleySkirmisher", "alleySkirmisher", "dawnRider", "dawnRider",
];

function countIds(ids) {
  return ids.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});
}

function sameMultiset(a, b) {
  const ca = countIds(a || []);
  const cb = countIds(b || []);
  const keys = new Set([...Object.keys(ca), ...Object.keys(cb)]);
  return [...keys].every((key) => ca[key] === cb[key]);
}

function collectionForDeck(ids) {
  return countIds(ids);
}

function richCollection() {
  const collection = collectionForDeck(LEGAL_DECK_IDS);
  for (const id of R16_NEW_IDS) collection[id] = id === "highArchivist" ? 1 : 2;
  return collection;
}

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

async function waitCardDetail(page, open) {
  await page.waitForFunction((expected) => {
    const el = document.getElementById("cardDetail");
    if (!el) return false;
    const visible = el.classList.contains("show")
      && el.getAttribute("aria-hidden") === "false"
      && getComputedStyle(el).display !== "none";
    return visible === expected;
  }, open);
}

async function isLocatorHittable(page, selector) {
  const locator = page.locator(selector).first();
  await locator.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" }));
  await sleep(50);
  return locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= innerWidth || rect.top >= innerHeight) return false;
    const x = Math.min(Math.max(rect.left + rect.width / 2, 0), innerWidth - 1);
    const y = Math.min(Math.max(rect.top + rect.height / 2, 0), innerHeight - 1);
    const hit = document.elementFromPoint(x, y);
    return !!(hit && (hit === el || el.contains(hit)));
  });
}

async function areLocatorsHittable(page, selectors) {
  for (const selector of selectors) {
    if (!(await isLocatorHittable(page, selector))) return false;
  }
  return true;
}

async function areAllMatchingHittable(page, selector) {
  const count = await page.locator(selector).count();
  if (count === 0) return false;
  for (let i = 0; i < count; i++) {
    const locator = page.locator(selector).nth(i);
    await locator.evaluate((el) => el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" }));
    await sleep(50);
    const ok = await locator.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= innerWidth || rect.top >= innerHeight) return false;
      const x = Math.min(Math.max(rect.left + rect.width / 2, 0), innerWidth - 1);
      const y = Math.min(Math.max(rect.top + rect.height / 2, 0), innerHeight - 1);
      const hit = document.elementFromPoint(x, y);
      return !!(hit && (hit === el || el.contains(hit)));
    });
    if (!ok) return false;
  }
  return true;
}

async function run() {
  let chromium;
  try { ({ chromium } = require("playwright")); }
  catch (e) { console.error("需要 devDependency: playwright"); process.exit(2); }

  const server = await startServer();
  const port = server.address().port;
  const shellBase = "http://127.0.0.1:" + port + "/templates/index.html";
  const base = "http://127.0.0.1:" + port + "/templates/card-battle/index.html";
  const basePack = "http://127.0.0.1:" + port + "/templates/card-pack/index.html";
  const browser = await chromium.launch();

  try {
    const swContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "allow" });
    const swPage = await swContext.newPage();
    const swErrors = [];
    swPage.on("console", (m) => { if (m.type() === "error" && !/favicon|net::ERR/.test(m.text())) swErrors.push("console: " + m.text()); });
    swPage.on("pageerror", (e) => swErrors.push("pageerror: " + (e && e.message)));
    await swPage.goto(shellBase + "?swtest=1", { waitUntil: "domcontentloaded" });
    await swPage.waitForFunction(() => window.__pwaTest);
    const swInstall = await swPage.evaluate(async () => {
      const state = await window.__pwaTest.registerPwa();
      const reg = await navigator.serviceWorker.ready;
      return { registered: state.registered, scope: reg.scope, controller: !!navigator.serviceWorker.controller };
    });
    try {
      await swPage.reload({ waitUntil: "domcontentloaded" });
    } catch (err) {
      void err;
    }
    await swPage.waitForFunction(() => navigator.serviceWorker.controller && document.getElementById("battle"));
    await swPage.waitForFunction(() => document.getElementById("battle")?.contentWindow?.__test);
    await swContext.setOffline(true);
    try {
      await swPage.reload({ waitUntil: "domcontentloaded" });
    } catch (err) {
      void err;
    }
    await swPage.waitForFunction(() => document.getElementById("battle")?.contentWindow?.__test);
    const offlineSw = await swPage.evaluate(() => ({
      controlled: !!navigator.serviceWorker.controller,
      shell: !!document.querySelector(".tabbar"),
      battleReady: !!document.getElementById("battle")?.contentWindow?.__test,
      battleTurn: document.getElementById("battle")?.contentWindow?.__test?.game?.().turn || "",
    }));
    assert(swInstall.registered && swInstall.scope.endsWith("/"), "SW test 旗標下可在 webdriver 註冊 root scope");
    assert(offlineSw.controlled && offlineSw.shell && offlineSw.battleReady && offlineSw.battleTurn === "player",
      "真 SW 離線 reload 後 shell 與對戰頁仍可載入");
    await swContext.setOffline(false);
    await swPage.evaluate(async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    });
    assert(swErrors.length === 0, "真 SW 離線測試無 console/pageerror" + (swErrors.length ? "：" + swErrors.slice(0, 3).join(" | ") : ""));
    await swContext.close();

  for (const vp of [{ w: 1280, h: 900, name: "桌面 1280x900" }, { w: 1366, h: 700, name: "矮桌機 1366x700" }, { w: 390, h: 844, name: "手機 390x844" }]) {
    console.log("\n== 視窗 " + vp.name + " ==");
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error" && !/favicon|net::ERR/.test(m.text())) errors.push("console: " + m.text()); });
    page.on("pageerror", (e) => errors.push("pageerror: " + (e && e.message)));

    if (vp.w === 1280) {
      await page.goto(shellBase);
      await page.waitForFunction(() => window.__pwaTest);
      const pwaCheck = await page.evaluate(async () => {
        const manifestLink = document.querySelector('link[rel="manifest"]');
        const manifestResponse = await fetch("../manifest.webmanifest");
        const manifest = await manifestResponse.json();
        const swText = await fetch("../sw.js").then((res) => res.text());
        const shellText = document.documentElement.outerHTML;
        const battleHtml = await fetch("card-battle/index.html").then((res) => res.text());
        const packHtml = await fetch("card-pack/index.html").then((res) => res.text());
        const version = await window.__pwaTest.readCacheVersion();
        const state = await window.__pwaTest.registerPwa();
        window.__pwaTest.showPwaUpdate();
        const checked = await window.__pwaTest.checkForUpdate();
        const guard = {
          windowMs: window.__pwaTest.SW_AUTO_RELOAD_WINDOW_MS,
          key: window.__pwaTest.SW_AUTO_RELOAD_KEY,
          early: window.__pwaTest.shouldAutoReloadForSwUpdate(),
          shell: /SW_AUTO_RELOAD_WINDOW_MS\s*=\s*15000/.test(shellText) && /sessionStorage/.test(shellText) && /controllerchange/.test(shellText),
          battle: /SW_AUTO_RELOAD_WINDOW_MS\s*=\s*15000/.test(battleHtml) && /sessionStorage/.test(battleHtml) && /controllerchange/.test(battleHtml),
          pack: /SW_AUTO_RELOAD_WINDOW_MS\s*=\s*15000/.test(packHtml) && /sessionStorage/.test(packHtml) && /controllerchange/.test(packHtml),
          versionedRefs: /cards\.js\?v=card-battle-r56-v1/.test(battleHtml)
            && /battle\.js\?v=card-battle-r56-v1/.test(battleHtml)
            && /pack\.js\?v=card-battle-r56-v1/.test(packHtml)
            && /manifest\.webmanifest\?v=card-battle-r56-v1/.test(shellText),
        };
        return {
          manifestHref: manifestLink && manifestLink.getAttribute("href"),
          manifest,
          swText,
          version,
          checked,
          guard,
          versionLabel: document.getElementById("pwaVersion")?.textContent || "",
          skipped: state.skippedForWebdriver,
          promptVisible: document.getElementById("pwaUpdateToast").classList.contains("show"),
        };
      });
      assert(pwaCheck.manifestHref === "../manifest.webmanifest?v=card-battle-r56-v1"
        && pwaCheck.manifest.name === "卡牌對戰"
        && pwaCheck.manifest.icons.some((icon) => icon.sizes === "192x192")
        && pwaCheck.manifest.icons.some((icon) => icon.sizes === "512x512"),
        "PWA manifest 掛在入口 shell 且含 192/512 icon");
      assert(/CACHE_VERSION/.test(pwaCheck.swText)
        && /networkFirst/.test(pwaCheck.swText)
        && /cacheFirst/.test(pwaCheck.swText)
        && pwaCheck.swText.includes("card-battle-r56-v1")
        && pwaCheck.swText.includes("offline.html")
        && pwaCheck.swText.includes("versioned(\"sw.js\")")
        && pwaCheck.swText.includes("templates/card-battle")
        && pwaCheck.swText.includes("templates/card-pack")
        && pwaCheck.swText.includes("templates/card-battle/battle.js")
        && pwaCheck.swText.includes("templates/card-pack/pack.js")
        && pwaCheck.swText.includes("assets/cards/wolf.png")
        && pwaCheck.version === "card-battle-r56-v1"
        && pwaCheck.versionLabel.includes("card-battle-r56-v1")
        && pwaCheck.checked.version === "card-battle-r56-v1",
        "Service worker 使用版本快取並涵蓋 battle/pack 子路徑");
      assert(/self\.skipWaiting\(\)/.test(pwaCheck.swText) && /self\.clients\.claim\(\)/.test(pwaCheck.swText),
        "Service worker install 會 skipWaiting，activate 會 clients.claim");
      assert(pwaCheck.guard.windowMs === 15000 && pwaCheck.guard.key === "card_sw_auto_reload_r56_v1"
        && pwaCheck.guard.early === true && pwaCheck.guard.shell && pwaCheck.guard.battle && pwaCheck.guard.pack && pwaCheck.guard.versionedRefs,
        "入口 shell、battle、pack 都有 15 秒自動重載、sessionStorage 守衛與版本化本地資源");
      assert(pwaCheck.skipped === true && pwaCheck.promptVisible === true, "navigator.webdriver 會跳過 SW 註冊且更新提示可顯示");
    }

    if (vp.w === 1366) {
      await page.goto(shellBase);
      await page.waitForFunction(() => window.__pwaTest && document.getElementById("battle"));
      const shellLowHit = {
        tabOk: await areAllMatchingHittable(page, ".tab"),
        buttons: { pwaCheckBtn: await isLocatorHittable(page, "#pwaCheckBtn") },
        overflowX: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
      };
      assert(shellLowHit.tabOk && shellLowHit.buttons.pwaCheckBtn && shellLowHit.overflowX <= 2,
        "矮桌機 shell 分頁與檢查更新按鈕可達可點");
      await page.locator("#pwaCheckBtn").click();
    }

    await page.goto(base);
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem("cb_guide_done_v1", "1"); });
    await page.reload();
    await page.waitForFunction(() => window.__test && window.__test.game);
    await sleep(300);
    // 關掉首次教學浮層（若有）
    await page.evaluate(() => document.querySelectorAll(".overlay.show, .tutorial-overlay, #tutorialOverlay, #cbTutorial, #battleGuide").forEach((el) => el.classList.remove("show")));

    // 1. 開局健全
    const boot = await page.evaluate(() => {
      const g = window.__test.game();
      return { turn: g.turn, playerHand: g.player.hand.length, playerHp: g.player.hp, enemyHp: g.enemy.hp };
    });
    assert(boot.turn === "player", "開局輪到玩家");
    assert(boot.playerHand >= 3, `玩家起手 ≥3 張（${boot.playerHand}）`);
    const battleSwGuard = await page.evaluate(() => window.__test.swUpdateGuard());
    assert(battleSwGuard.key === "card_sw_auto_reload_r56_v1" && battleSwGuard.windowMs === 15000 && battleSwGuard.late === false,
      "對戰頁 SW 自動更新守衛超過 15 秒不會自動 reload");

    if (vp.w === 1280) {
      await page.evaluate(() => {
        const T = window.__test;
        T.setPerfMode("high");
        T.setAudioMuted(true);
        T.setup(["dragon"], ["titan"]);
        const g = T.game();
        T.attackMinion(g.player.field[0].uid, g.enemy.field[0].uid);
      });
      await sleep(80);
      const combatFx = await page.evaluate(() => window.__test.effects());
      assert(combatFx.damagePops >= 1 && combatFx.lunge >= 1 && combatFx.lethalSlow === false,
        "battle FX guard: render-surviving attack lunge and damage pop are emitted on the real attack path");
      await page.evaluate(() => {
        const T = window.__test;
        T.setup(["dragon"], ["wolf"]);
        const g = T.game();
        T.attackMinion(g.player.field[0].uid, g.enemy.field[0].uid);
      });
      await sleep(80);
      const deathFx = await page.evaluate(() => window.__test.effects());
      assert(deathFx.dying >= 1 && deathFx.lunge >= 1,
        "battle FX guard: render-surviving death dissolve stays mounted after attack render");
      await sleep(160);
      const hitFx = await page.evaluate(() => window.__test.effects());
      assert(hitFx.hitFlash >= 1,
        "battle FX guard: render-surviving hit flash appears after attack render");
      await sleep(620);
      const settledFx = await page.evaluate(() => window.__test.effects());
      assert(settledFx.dying === 0 && settledFx.lunge === 0 && settledFx.hitFlash === 0,
        "battle FX guard: render-surviving combat animations are removed after their full duration");
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.evaluate(() => {
        const T = window.__test;
        T.setup(["dragon"], ["wolf"]);
        const g = T.game();
        T.attackMinion(g.player.field[0].uid, g.enemy.field[0].uid);
      });
      await sleep(80);
      const reducedFx = await page.evaluate(() => window.__test.effects());
      assert(reducedFx.ghosts === 0 && reducedFx.damagePops === 0 && reducedFx.dying === 0,
        "reduced-motion guard: combat ghost、傷害浮字與死亡動畫不建立 DOM");
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.evaluate(() => { window.__newGame(); window.__test.setPerfMode("high"); window.__test.setAudioMuted(true); window.__test.finishGame(true); });
      await sleep(120);
      const winFx = await page.evaluate(() => window.__test.effects());
      assert(winFx.finishFx.win === true && winFx.finishFx.lethal === true && winFx.confetti > 0,
        "battle FX guard: lethal win slow state and confetti are emitted");
      await page.evaluate(() => { window.__newGame(); window.__test.setAudioMuted(true); window.__test.finishGame(false); });
      await sleep(60);
      const loseFx = await page.evaluate(() => window.__test.effects());
      assert(loseFx.finishFx.win === false && loseFx.defeatFade === true,
        "battle FX guard: defeat applies grayscale fade state");
      await page.evaluate(() => window.__newGame());
    }

    if (vp.w === 1366) {
      const battleLowHit = {
        buttons: await areLocatorsHittable(page, ["#hintBtn", "#newGameBtn", "#toPackBtn", "#guideReplayBtn", "#endTurnBtn", "#missionDrawerBtn", "#kwCodexBtn"]),
        ...(await page.evaluate(() => {
        const scrollBox = (selector) => {
          const el = document.querySelector(selector);
          const style = el && getComputedStyle(el);
          return !!(style && style.maxHeight !== "none" && /(auto|scroll)/.test(style.overflowY));
        };
        return {
          detail: scrollBox(".card-detail-card"),
          codex: scrollBox(".kw-codex-card"),
          mission: scrollBox(".mission-card"),
          overlay: /(auto|scroll)/.test(getComputedStyle(document.getElementById("overlay")).overflowY),
        };
        })),
      };
      assert(battleLowHit.buttons && battleLowHit.detail && battleLowHit.codex && battleLowHit.mission && battleLowHit.overlay,
        "矮桌機對戰主要按鈕可點，詳情/圖鑑/任務/結算層可垂直捲動");
    }

    if (vp.w === 390) {
      const liveRegions = await page.evaluate(() => ({
        log: document.getElementById("log")?.getAttribute("aria-live"),
        target: document.getElementById("targetStatus")?.getAttribute("aria-live"),
        quest: document.getElementById("questList")?.getAttribute("aria-live"),
        badge: document.getElementById("missionBadge")?.getAttribute("aria-live"),
      }));
      assert(liveRegions.log === "polite" && liveRegions.target === "polite"
        && liveRegions.quest === "polite" && liveRegions.badge === "polite",
        "手機對戰主要提示與任務通知使用 aria-live=polite");
      await page.locator("#hintBtn").focus();
      await page.keyboard.press("Tab");
      const tabSmoke = await page.evaluate(() => {
        const active = document.activeElement;
        const style = active ? getComputedStyle(active) : null;
        return {
          id: active && active.id,
          inControls: !!(active && active.closest && active.closest(".controls")),
          outline: !!(style && style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2),
        };
      });
      assert(tabSmoke.inControls && tabSmoke.outline, `手機鍵盤 Tab 可移動到主要控制並顯示焦點（${tabSmoke.id || "unknown"}）`);
    }

    // Stage 3：合法存檔牌組進對戰；非法存檔不擋新局，改走既有 fallback 牌庫
    const legalDeckCheck = await page.evaluate(({ deckIds, collection }) => {
      localStorage.setItem("cardpack_collection_v2", JSON.stringify(collection));
      localStorage.setItem("card_deck_v1", JSON.stringify({ version: 1, cards: deckIds }));
      window.__newGame();
      return window.__test.deckInfo();
    }, { deckIds: LEGAL_DECK_IDS, collection: collectionForDeck(LEGAL_DECK_IDS) });
    assert(legalDeckCheck.source === "saved", "合法 card_deck_v1 會作為玩家對戰牌庫");
    assert(legalDeckCheck.ids.length === 20 && sameMultiset(legalDeckCheck.ids, LEGAL_DECK_IDS), "玩家牌庫 20 張皆來自儲存牌組");
    assert(legalDeckCheck.liveIds.length === 20 && sameMultiset(legalDeckCheck.liveIds, LEGAL_DECK_IDS), "開局抽牌後手牌加牌庫仍完整對應儲存牌組");

    const invalidDeckCheck = await page.evaluate(({ deckIds, collection }) => {
      localStorage.setItem("cardpack_collection_v2", JSON.stringify(collection));
      localStorage.setItem("card_deck_v1", JSON.stringify({ version: 1, cards: deckIds.slice(0, 19) }));
      window.__newGame();
      return window.__test.deckInfo();
    }, { deckIds: LEGAL_DECK_IDS, collection: collectionForDeck(LEGAL_DECK_IDS) });
    assert(invalidDeckCheck.source === "fallback", "非法 card_deck_v1 會 fallback，不阻擋開局");
    assert(invalidDeckCheck.liveIds.length === 20, "fallback 玩家開局手牌加牌庫總張數為 DECK_SIZE");

    const opponentCheck = await page.evaluate(() => {
      const opponents = window.__test.opponents();
      return {
        opponents,
        validations: opponents.map((opponent) => {
          const collection = opponent.deckIds.reduce((acc, id) => {
            acc[id] = (acc[id] || 0) + 1;
            return acc;
          }, {});
          const validation = window.CardCore.validateDeck(opponent.deckIds, collection, window.CARD_POOL);
          return { id: opponent.id, len: opponent.deckIds.length, ok: validation.ok, errors: validation.errors };
        }),
        selectValue: document.getElementById("opponentSel")?.value || "",
      };
    });
    assert(opponentCheck.opponents.length === 3
      && opponentCheck.opponents.map((opponent) => opponent.id).sort().join(",") === "op_magister_vey,op_scarra,op_ser_halden",
      "具名 AI 對手表提供哈爾登、維伊、斯卡拉三人");
    assert(opponentCheck.validations.every((item) => item.len === 20 && item.ok),
      `三個 AI 固定牌組都通過 validateDeck（${JSON.stringify(opponentCheck.validations)}）`);
    assert(opponentCheck.selectValue === "op_ser_halden", "對手下拉選單預設哈爾登隊長");

    const defaultAiDeck = await page.evaluate(() => window.__test.aiDeckInfo());
    assert(defaultAiDeck.source === "opponent" && defaultAiDeck.opponentId === "op_ser_halden"
      && defaultAiDeck.opponentName === "哈爾登隊長" && defaultAiDeck.tauntBias > defaultAiDeck.faceBias
      && defaultAiDeck.liveIds.length === 20 && sameMultiset(defaultAiDeck.ids, defaultAiDeck.templateIds),
      "預設 AI 使用哈爾登固定嘲諷控制牌組");

    const scarraAiDeck = await page.evaluate(() => {
      const selected = window.__test.setOpponent("op_scarra");
      const ai = window.__test.aiDeckInfo();
      return {
        selected,
        ai,
        stored: localStorage.getItem("cardgame_opponent"),
        heroName: document.querySelector("#enemyHero .name")?.textContent || "",
        heroAvatar: document.querySelector("#enemyHero .avatar")?.textContent || "",
        selectValue: document.getElementById("opponentSel")?.value || "",
      };
    });
    assert(scarraAiDeck.selected === "op_scarra" && scarraAiDeck.stored === "op_scarra"
      && scarraAiDeck.ai.source === "opponent" && scarraAiDeck.ai.archetype === "aggro"
      && scarraAiDeck.ai.faceBias > scarraAiDeck.ai.tauntBias && /斯卡拉狼首/.test(scarraAiDeck.heroName)
      && /🐺/.test(scarraAiDeck.heroAvatar) && scarraAiDeck.selectValue === "op_scarra",
      "切換斯卡拉後 localStorage、英雄顯示、快攻 faceBias 與固定牌組同步");

    const hardAiDeck = await page.evaluate(({ deckIds, collection }) => {
      localStorage.clear();
      localStorage.setItem("cb_guide_done_v1", "1");
      localStorage.setItem("cardgame_difficulty", "hard");
      localStorage.setItem("cardgame_opponent", "op_magister_vey");
      localStorage.setItem("cardpack_collection_v2", JSON.stringify(collection));
      localStorage.setItem("card_deck_v1", JSON.stringify({ version: 1, cards: deckIds }));
      window.__newGame();
      return window.__test.aiDeckInfo();
    }, { deckIds: R20_AGGRO_DECK_IDS, collection: collectionForDeck(R20_AGGRO_DECK_IDS) });
    assert(hardAiDeck.source === "opponent" && hardAiDeck.playerArchetype === "aggro"
      && hardAiDeck.opponentId === "op_magister_vey" && hardAiDeck.archetype === "spellburst"
      && hardAiDeck.faceBias > hardAiDeck.tauntBias,
      "困難 AI 仍使用玩家指定的維伊固定法強爆發牌組與偏置");
    assert(hardAiDeck.ids.length === 20 && sameMultiset(hardAiDeck.ids, hardAiDeck.templateIds),
      "困難 AI 牌堆來自具名對手模板卡池");
    assert(hardAiDeck.liveIds.length === 20, "困難 AI 開局手牌加牌庫總張數為 DECK_SIZE");

    await page.evaluate(() => { localStorage.clear(); localStorage.setItem("cb_guide_done_v1", "1"); });
    await page.reload();
    await page.waitForFunction(() => window.__test && window.__test.game);
    await sleep(300);
    await page.evaluate(() => document.querySelectorAll(".overlay.show, .tutorial-overlay, #tutorialOverlay, #cbTutorial, #battleGuide").forEach((el) => el.classList.remove("show")));

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
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem("cb_guide_done_v1", "1"); });
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
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem("cb_guide_done_v1", "1"); });
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

    // Stage 4：每日任務可完成、領取，且金幣只透過領取增加
    const questClaim = await page.evaluate(() => {
      localStorage.setItem("card_stats_v1", JSON.stringify({ version: 2, wins: 0, losses: 0, streak: 0, bestStreak: 0, coins: 0, packsOpened: 0 }));
      const T = window.__test;
      const q = T.quests().quests[0];
      T.progressQuest({ type: q.type, amount: q.target });
      const btn = document.querySelector(`.quest-claim[data-quest-id="${q.id}"]`);
      const enabled = !!btn && !btn.disabled;
      const before = T.stats().coins;
      if (btn) btn.click();
      const after = T.stats().coins;
      const claimed = T.quests().quests.find((item) => item.id === q.id);
      return { enabled, before, after, reward: q.reward, claimed: claimed && claimed.claimed };
    });
    assert(questClaim.enabled === true, "每日任務完成後領取按鈕可用");
    assert(questClaim.before === 0 && questClaim.after === questClaim.reward && questClaim.claimed === true, `領取每日任務會增加金幣並標記已領（+${questClaim.reward}）`);

    const rewardTable = await page.evaluate(() => window.__test.rewardTable());
    assert(rewardTable.easy.win === 50 && rewardTable.easy.loss === 15
      && rewardTable.normal.win === 65 && rewardTable.normal.loss === 20
      && rewardTable.hard.win === 85 && rewardTable.hard.loss === 30,
      "難度獎勵分層符合 easy 50/15、normal 65/20、hard 85/30");

    const naturalDefeat = await page.evaluate(() => new Promise((resolve) => {
      const T = window.__test;
      const overlay = document.getElementById("overlay");
      overlay.classList.remove("show");
      T.setup([], ["dragon"]);
      const g = T.game();
      g.player.hp = 1;
      g.turn = "player";
      g.over = false;
      g.enemy.hand = [];
      g.enemy.mana = 0;
      g.enemy.manaMax = 0;
      if (g.enemy.field[0]) g.enemy.field[0].canAttack = true;
      let hpZeroAt = null;
      const start = performance.now();
      const timer = setInterval(() => {
        const live = T.game();
        if (!hpZeroAt && live.player.hp <= 0) hpZeroAt = performance.now();
        if (hpZeroAt && overlay.classList.contains("show")) {
          clearInterval(timer);
          resolve({ overlay: true, delay: performance.now() - hpZeroAt, hp: live.player.hp, over: live.over });
        } else if (performance.now() - start > 6000) {
          clearInterval(timer);
          resolve({ overlay: false, delay: null, hp: live.player.hp, over: live.over });
        }
      }, 25);
      T.endTurn();
    }));
    assert(naturalDefeat.overlay === true && naturalDefeat.delay <= 800,
      `玩家自然戰敗後 0.8 秒內顯示結算（delay=${naturalDefeat.delay && naturalDefeat.delay.toFixed(0)}ms, hp=${naturalDefeat.hp}, over=${naturalDefeat.over}）`);
    await page.evaluate(() => window.__newGame());
    await sleep(300);

    const aiFatigueNoZombie = await page.evaluate(() => {
      const T = window.__test;
      const g = T.game();
      document.getElementById("log").innerHTML = "";
      const wolf = Object.assign({}, window.getCardById("wolf"));
      wolf.uid = "aiFatigueWolf";
      wolf.maxHealth = wolf.health;
      g.turn = "enemy";
      g.over = false;
      g.enemy.hp = 1;
      g.enemy.deck = [];
      g.enemy.hand = [wolf];
      g.enemy.field = [];
      g.enemy.mana = g.enemy.manaMax = 10;
      g.player.field = [];
      T.runAiTurn();
      return {
        over: g.over,
        enemyHp: g.enemy.hp,
        hand: g.enemy.hand.map((card) => card.id),
        field: g.enemy.field.map((card) => card.id),
        log: T.logText(),
      };
    });
    assert(aiFatigueNoZombie.over === true && aiFatigueNoZombie.enemyHp <= 0
      && aiFatigueNoZombie.hand.includes("wolf") && aiFatigueNoZombie.field.length === 0
      && !/對手召喚了/.test(aiFatigueNoZombie.log),
      "AI startEnemy 疲勞致死後不再出牌或產生殭屍召喚 log");
    await page.evaluate(() => window.__newGame());
    await sleep(300);

    const playerFatigueNoTurnLog = await page.evaluate(() => new Promise((resolve) => {
      const T = window.__test;
      const g = T.game();
      document.getElementById("log").innerHTML = "";
      const deckCard = Object.assign({}, window.getCardById("footman"));
      deckCard.uid = "enemyDeckSafeDraw";
      deckCard.maxHealth = deckCard.health;
      g.turn = "enemy";
      g.over = false;
      g.player.hp = 1;
      g.player.deck = [];
      g.player.hand = [];
      g.player.field = [];
      g.enemy.hp = 30;
      g.enemy.deck = [deckCard];
      g.enemy.hand = [];
      g.enemy.field = [];
      g.enemy.mana = g.enemy.manaMax = 10;
      T.runAiTurn();
      setTimeout(() => {
        resolve({
          over: g.over,
          playerHp: g.player.hp,
          turn: g.turn,
          log: T.logText(),
        });
      }, 1300);
    }));
    assert(playerFatigueNoTurnLog.over === true && playerFatigueNoTurnLog.playerHp <= 0
      && !/輪到你了/.test(playerFatigueNoTurnLog.log),
      `玩家 endEnemy 疲勞致死後不推進輪到你文案（turn=${playerFatigueNoTurnLog.turn}, log=${playerFatigueNoTurnLog.log.slice(-80)}）`);
    await page.evaluate(() => window.__newGame());
    await sleep(300);

    const overlayTimerSafe = await page.evaluate(() => new Promise((resolve) => {
      const T = window.__test;
      const overlay = document.getElementById("overlay");
      overlay.classList.remove("show");
      T.setup([], ["dragon"]);
      const g = T.game();
      g.player.hp = 1;
      g.turn = "player";
      g.over = false;
      g.enemy.hand = [];
      g.enemy.mana = 0;
      g.enemy.manaMax = 0;
      if (g.enemy.field[0]) g.enemy.field[0].canAttack = true;
      const start = performance.now();
      const timer = setInterval(() => {
        if (T.game().over && !overlay.classList.contains("show")) {
          document.getElementById("newGameBtn").click();
          clearInterval(timer);
          setTimeout(() => {
            resolve({
              hidden: !overlay.classList.contains("show"),
              turn: T.game().turn,
              elapsed: performance.now() - start,
            });
          }, 800);
        } else if (performance.now() - start > 6000) {
          clearInterval(timer);
          resolve({ hidden: false, turn: T.game().turn, elapsed: performance.now() - start });
        }
      }, 25);
      T.endTurn();
    }));
    assert(overlayTimerSafe.hidden === true && overlayTimerSafe.turn === "player",
      `結算 pending 計時器在重開後不會蓋住新局（elapsed=${overlayTimerSafe.elapsed.toFixed(0)}ms）`);

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

    if (vp.w <= 400) {
      const stickySetup = await page.evaluate(() => {
        window.scrollTo(0, 0);
        const tutorial = document.getElementById("cbTutorial");
        if (tutorial) tutorial.classList.remove("show");
        const T = window.__test;
        const g = T.game();
        g.turn = "player";
        g.over = false;
        g.selected = null;
        g.pendingSpell = null;
        g.player.hand = [];
        g.player.field = [];
        g.enemy.field = [];
        g.player.mana = g.player.manaMax = 10;
        const uid = T.giveCard("footman");
        const hand = document.getElementById("playerHand").getBoundingClientRect();
        const endBtn = document.getElementById("endTurnBtn");
        const end = endBtn.getBoundingClientRect();
        const hit = document.elementFromPoint(end.left + end.width / 2, end.top + end.height / 2);
        return {
          uid,
          handVisible: hand.top < window.innerHeight && hand.bottom > 0 && hand.left >= 0 && hand.right <= window.innerWidth,
          endVisible: end.top >= 0 && end.bottom <= window.innerHeight && end.left >= 0 && end.right <= window.innerWidth,
          endHit: !!(hit && hit.closest && hit.closest("#endTurnBtn")),
          endRect: { left: end.left, right: end.right, top: end.top, bottom: end.bottom },
          scrollY: window.scrollY,
        };
      });
      assert(stickySetup.handVisible && stickySetup.endVisible && stickySetup.endHit && stickySetup.scrollY === 0,
        `手機首屏可看到且可點擊手牌與結束回合按鈕（end left=${stickySetup.endRect.left}, right=${stickySetup.endRect.right}）`);
      await page.locator("#hintBtn").click();
      const hintCheck = await page.evaluate((uid) => {
        const g = window.__test.game();
        return {
          highlights: window.__test.hintHighlights().length,
          stillInHand: g.player.hand.some((card) => card.uid === uid),
          fieldCount: g.player.field.length,
          hintDisabled: document.getElementById("hintBtn").disabled,
          lastHint: window.__test.lastHint(),
          logText: window.__test.logText(),
          toastLive: document.getElementById("toastStack")?.getAttribute("aria-live") || "",
          logLive: document.getElementById("log")?.getAttribute("aria-live") || "",
        };
      }, stickySetup.uid);
      assert(hintCheck.highlights >= 1 && hintCheck.stillInHand && hintCheck.fieldCount === 0 && hintCheck.hintDisabled,
        "手機提示會高亮建議且不自動出牌/攻擊");
      assert(hintCheck.lastHint && hintCheck.lastHint.reason && /建議|用足|衝鋒|突襲|嘲諷|吸血/.test(hintCheck.logText),
        "提示高亮時會附上為什麼文案");
      assert(hintCheck.toastLive === "polite" && hintCheck.logLive === "polite",
        "提示 toast 與 log 使用 polite live region");
      await page.locator("#ddaToggle").uncheck();
      const ddaOff = await page.evaluate(() => window.__test.dda());
      assert(ddaOff.stats.enabled === false && ddaOff.profile.enabled === false && ddaOff.profile.mistakeRate === 0 && ddaOff.profile.scoreBias === 0,
        "動態難度調節可由設定完全關閉");
      await page.locator("#ddaToggle").check();
      const ddaOn = await page.evaluate(() => window.__test.dda());
      assert(ddaOn.stats.enabled === true && ddaOn.profile.enabled === true, "動態難度調節預設/重新開啟有效");
      const perfModes = await page.evaluate(() => {
        const sel = document.getElementById("perfModeSel");
        sel.value = "low";
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        const low = window.__test.perf();
        sel.value = "high";
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        const high = window.__test.perf();
        sel.value = "auto";
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        const autoLow = window.__test.forceFps(40);
        const autoHigh = window.__test.forceFps(55);
        const finalPerf = window.__test.perf();
        return {
          low,
          high,
          autoLow,
          autoHigh,
          attr: document.documentElement.dataset.perf,
          diag: document.getElementById("perfDiag")?.textContent || "",
          history: finalPerf.history,
          historyText: finalPerf.historyText,
        };
      });
      assert(perfModes.low.mode === "low" && perfModes.low.effective === "low"
        && perfModes.high.mode === "high" && perfModes.high.effective === "high",
        "效能設定可鎖定高/低動畫");
      assert(perfModes.autoLow.mode === "auto" && perfModes.autoLow.effective === "low"
        && perfModes.autoHigh.effective === "high" && perfModes.attr === "high" && /FPS/.test(perfModes.diag) && perfModes.diag.includes("55"),
        "自動效能會在 FPS 低於 45 降低動畫並於回穩恢復");
      assert(perfModes.history.length >= 2
        && perfModes.history.some((item) => /低於 45/.test(item.reason) && item.time)
        && perfModes.history.some((item) => /回穩/.test(item.reason) && item.time)
        && /紀錄/.test(perfModes.historyText),
        "效能診斷記錄最近降級/恢復歷史");

      const textSizeCheck = await page.evaluate(() => {
        const T = window.__test;
        T.setTextSize("small");
        const small = parseFloat(getComputedStyle(document.getElementById("log")).fontSize);
        T.setTextSize("large");
        const large = parseFloat(getComputedStyle(document.getElementById("log")).fontSize);
        return { small, large, state: T.textSize(), stored: localStorage.getItem("card_text_size_v1") };
      });
      assert(textSizeCheck.state.attr === "large" && textSizeCheck.state.select === "large"
        && textSizeCheck.stored === "large" && textSizeCheck.large > textSizeCheck.small,
        "對戰頁文字大小設定可調整 log 字級並保存");

      await page.locator("#handDrawerToggle").click();
      await page.waitForFunction(() => document.getElementById("handDrawer")?.classList.contains("open"));
      await page.locator(`.hand .card[data-uid="${stickySetup.uid}"] .card-info-btn`).click();
      await waitCardDetail(page, true);
      const handDetail = await page.evaluate((uid) => {
        const g = window.__test.game();
        return {
          open: window.__test.detailOpen(),
          stillInHand: g.player.hand.some((card) => card.uid === uid),
          fieldCount: g.player.field.length,
          turn: g.turn,
          title: document.getElementById("cardDetailTitle").textContent,
          meta: document.getElementById("cardDetailMeta").textContent,
          flavor: document.getElementById("cardDetailFlavor").textContent,
          keywordButtons: document.querySelectorAll("#cardDetailKeywords .detail-keyword").length,
        };
      }, stickySetup.uid);
      assert(handDetail.open && handDetail.stillInHand && handDetail.fieldCount === 0 && handDetail.turn === "player",
        "手機點卡牌詳情不會誤觸出牌");
      assert(handDetail.title.length > 0 && handDetail.keywordButtons >= 1, "手機卡牌詳情顯示大卡資料與可點關鍵字");
      assert(/軸線/.test(handDetail.meta) && handDetail.flavor.includes("「"), "手機卡牌詳情顯示軸線標籤與風味文字");
      await page.keyboard.press("Escape");
      await waitCardDetail(page, false);
      await page.locator(`.hand .card[data-uid="${stickySetup.uid}"]`).click();
      await page.locator("#endTurnBtn").click();
      const mobileAction = await page.evaluate(() => ({
        turn: window.__test.game().turn,
        fieldCount: window.__test.game().player.field.length,
      }));
      assert(mobileAction.turn === "enemy" && mobileAction.fieldCount >= 1, "手機首屏不捲動即可出牌並結束回合");
      await waitPlayerTurn(page);

      const spellHintSetup = await page.evaluate(() => {
        const T = window.__test;
        T.setup([], ["footman"]);
        const g = T.game();
        g.player.hand = [];
        g.player.mana = g.player.manaMax = 10;
        g.hintUsedTurn = null;
        g.lastHint = null;
        T.giveCard("firebolt");
        return { enemyCount: g.enemy.field.length };
      });
      const spellHint = await page.evaluate(() => {
        window.__test.hint();
        return {
          setupOk: document.querySelectorAll("#enemyField .card").length,
          lastHint: window.__test.lastHint(),
          logText: window.__test.logText(),
        };
      });
      assert(spellHintSetup.enemyCount === 1 && spellHint.setupOk === 1
        && /先解嘲諷才能打臉|高威脅/.test(spellHint.lastHint.reason)
        && /預計擊殺/.test(spellHint.lastHint.estimate)
        && /預計擊殺/.test(spellHint.logText),
        "指定法術提示會說明理由並預估擊殺目標");

      await page.locator("#aiThoughtToggle").check();
      const aiThoughtLog = await page.evaluate(() => {
        const T = window.__test;
        const g = T.game();
        const card = Object.assign({}, window.getCardById("wolf"));
        card.uid = "aiThought" + Math.random().toString(36).slice(2, 8);
        card.maxHealth = card.health;
        g.turn = "enemy";
        g.over = false;
        g.enemyArchetype = "aggro";
        g.enemy.mana = g.enemy.manaMax = 10;
        g.enemy.hand = [card];
        g.enemy.deck = [];
        g.enemy.field = [];
        g.player.field = [];
        document.getElementById("log").innerHTML = "";
        T.runAiTurn();
        const text = T.logText();
        window.__newGame();
        return { toggle: T.aiThoughts(), text };
      });
      assert(aiThoughtLog.toggle.enabled && /AI：/.test(aiThoughtLog.text) && /快攻|鋪場|施壓|費用/.test(aiThoughtLog.text),
        "開啟顯示 AI 思路後，AI 出牌會在 log 附理由");

      const fieldSetup = await page.evaluate(() => {
        const g = window.__test.game();
        window.__test.setup(["footman"], []);
        g.turn = "player";
        g.over = false;
        g.selected = null;
        g.pendingSpell = null;
        g.enemy.hp = 30;
        if (g.player.field[0]) g.player.field[0].canAttack = true;
        window.__rerenderBattle();
        const uid = g.player.field[0] && g.player.field[0].uid;
        return { uid, enemyHp: g.enemy.hp };
      });
      await page.waitForFunction((uid) => {
        const btn = document.querySelector(`#playerField .card[data-uid="${uid}"] .card-info-btn`);
        const rect = btn && btn.getBoundingClientRect();
        const hit = rect && document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return !!btn && rect.width >= 32 && rect.height >= 32 && !!(hit && hit.closest && hit.closest(".card-info-btn"));
      }, fieldSetup.uid);
      const fieldButton = await page.evaluate((uid) => {
        const btn = document.querySelector(`#playerField .card[data-uid="${uid}"] .card-info-btn`);
        const rect = btn && btn.getBoundingClientRect();
        return rect ? { width: rect.width, height: rect.height } : null;
      }, fieldSetup.uid);
      assert(fieldSetup.uid && fieldButton && fieldButton.width >= 32 && fieldButton.height >= 32,
        `手機場上卡詳情按鈕有獨立命中區（${fieldButton ? fieldButton.width + "x" + fieldButton.height : "missing"}）`);
      await page.locator(`#playerField .card[data-uid="${fieldSetup.uid}"] .card-info-btn`).click();
      await waitCardDetail(page, true);
      const fieldDetail = await page.evaluate((enemyHpBefore) => {
        const g = window.__test.game();
        return {
          open: window.__test.detailOpen(),
          selected: g.selected,
          enemyHp: g.enemy.hp,
          enemyHpBefore,
        };
      }, fieldSetup.enemyHp);
      assert(fieldDetail.open && fieldDetail.selected === null && fieldDetail.enemyHp === fieldDetail.enemyHpBefore, "手機場上卡詳情不會誤選攻擊者或攻擊英雄");
      await page.locator("#cardDetailClose").click();
      await waitCardDetail(page, false);

      const codexHit = await page.evaluate(() => {
        const btn = document.getElementById("kwCodexBtn");
        const rect = btn.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return {
          visible: rect.top >= 0 && rect.bottom <= window.innerHeight && rect.left >= 0 && rect.right <= window.innerWidth,
          hit: !!(hit && hit.closest && hit.closest("#kwCodexBtn")),
        };
      });
      assert(codexHit.visible && codexHit.hit, "手機關鍵字圖鑑按鈕未被底部操作列遮住");
      await page.locator("#kwCodexBtn").click();
      const codexOpen = await page.evaluate(() => document.getElementById("kwCodex").classList.contains("show"));
      assert(codexOpen === true, "手機可點開關鍵字圖鑑");
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.getElementById("kwCodex").classList.contains("show") && document.getElementById("kwCodex").getAttribute("aria-hidden") === "true");

      const battleMissionSetup = await page.evaluate(({ collection }) => {
        localStorage.setItem("card_stats_v1", JSON.stringify({ version: 2, wins: 0, losses: 0, streak: 0, bestStreak: 0, coins: 0, packsOpened: 0 }));
        localStorage.setItem("cardpack_collection_v2", JSON.stringify(collection));
        const T = window.__test;
        T.setQuests({});
        T.setGoals({});
        const daily = T.quests().quests[0];
        T.progressQuest({ type: daily.type, amount: daily.target });
        const weekly = T.goals().weeklyQuest;
        T.progressWeeklyGoal({ type: weekly.type, amount: weekly.target });
        return {
          count: T.missionCount(),
          badge: document.getElementById("missionBadge").textContent,
        };
      }, { collection: collectionForDeck(LEGAL_DECK_IDS) });
      assert(battleMissionSetup.count >= 3 && Number(battleMissionSetup.badge) >= 3, "對戰頁任務抽屜紅點合併每日/每週/里程碑可領數");
      await page.locator("#missionDrawerBtn").click();
      const battleMissionOpen = await page.evaluate(() => {
        const btn = document.getElementById("missionClaimAllBtn");
        const rect = btn.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return {
          open: document.getElementById("missionDrawer").classList.contains("show"),
          daily: document.querySelectorAll("#missionDailyList .mission-item").length,
          weekly: document.querySelectorAll("#missionWeeklyList .mission-item").length,
          milestones: document.querySelectorAll("#missionMilestoneList .mission-item").length,
          claimVisible: rect.top >= 0 && rect.bottom <= window.innerHeight,
          claimHit: !!(hit && hit.closest && hit.closest("#missionClaimAllBtn")),
        };
      });
      assert(battleMissionOpen.open && battleMissionOpen.daily >= 3 && battleMissionOpen.weekly === 1 && battleMissionOpen.milestones >= 5,
        "對戰頁任務抽屜整合每日/每週/里程碑");
      assert(battleMissionOpen.claimVisible && battleMissionOpen.claimHit, "手機任務抽屜一屏可點全部領取");
      await page.locator("#missionClaimAllBtn").click();
      const battleMissionClaimed = await page.evaluate(() => ({
        coins: window.__test.stats().coins,
        count: window.__test.missionCount(),
        badgeShown: document.getElementById("missionBadge").classList.contains("show"),
      }));
      assert(battleMissionClaimed.coins > 0 && battleMissionClaimed.count === 0 && !battleMissionClaimed.badgeShown,
        "對戰頁任務抽屜可一鍵領取所有可領獎勵並清除紅點");
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.getElementById("missionDrawer").classList.contains("show") && document.getElementById("missionDrawer").getAttribute("aria-hidden") === "true");

      const mobileDock = await page.evaluate(() => {
        const rect = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
        };
        const hitOk = (sel) => {
          const r = rect(sel);
          if (!r) return false;
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return !!(hit && hit.closest && hit.closest(sel));
        };
        const overlap = (a, b) => !!(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
        const hand = rect("#playerHand"), controls = rect(".controls");
        const target = rect("#targetStatus"), log = rect("#log"), quest = rect("#questPanel");
        return {
          target, log, quest, hand, controls,
          targetHit: hitOk("#targetStatus"),
          logHit: hitOk("#log"),
          questButtonHit: hitOk("#questClaimAllBtn"),
          targetCovered: overlap(target, hand) || overlap(target, controls),
          logCovered: overlap(log, hand) || overlap(log, controls),
          questCovered: overlap(quest, hand) || overlap(quest, controls),
        };
      });
      assert(mobileDock.targetHit && mobileDock.logHit && mobileDock.questButtonHit, "手機目標列、日誌、任務按鈕可見且可命中");
      assert(!mobileDock.targetCovered && !mobileDock.logCovered && !mobileDock.questCovered, "手機目標/日誌/任務不被固定手牌或控制列遮住");

      await page.goto(shellBase);
      await page.waitForSelector(".tabbar");
      const shellMobile = await page.evaluate(() => {
        const tabs = [...document.querySelectorAll(".tab")].map((tab) => {
          const r = tab.getBoundingClientRect();
          return { text: tab.textContent.trim(), width: r.width, height: r.height, scrollHeight: tab.scrollHeight, clientHeight: tab.clientHeight };
        });
        const bar = document.querySelector(".tabbar").getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          barHeight: bar.height,
          tabs,
          swatches: document.querySelectorAll(".swatch").length,
        };
      });
      assert(shellMobile.overflow <= 2 && shellMobile.barHeight <= 64, `手機入口 shell 無水平溢出且高度緊湊（overflow=${shellMobile.overflow}, h=${shellMobile.barHeight}）`);
      assert(shellMobile.tabs.every((tab) => tab.scrollHeight <= tab.clientHeight + 2 && tab.height <= 56 && tab.width >= 54), "手機入口 tab 不直排、不被文字撐高");

      await page.goto(base);
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.waitForFunction(() => window.__test && window.__test.game);
      const guideAuto = await page.evaluate(() => ({
        active: window.__test.guide().active,
        step: window.__test.guide().step,
        visible: document.getElementById("battleGuide").classList.contains("show"),
        hasWolf: !!document.querySelector('.hand .card[data-card-id="wolf"]'),
      }));
      assert(guideAuto.active && guideAuto.step === 0 && guideAuto.visible && guideAuto.hasWolf, "清空存檔後首次對戰自動開啟三步導引");
      await page.locator("#guideSkipBtn").click();
      const guideSkipped = await page.evaluate(() => ({
        visible: document.getElementById("battleGuide").classList.contains("show"),
        stored: localStorage.getItem("cb_guide_done_v1"),
      }));
      assert(!guideSkipped.visible && guideSkipped.stored === "1", "三步導引可略過並記錄已完成");
      await page.locator("#guideReplayBtn").click();
      await page.waitForFunction(() => window.__test.guide().active && window.__test.guide().step === 0);
      await page.locator('.hand .card[data-card-id="wolf"]').click();
      await page.waitForFunction(() => window.__test.guide().step === 1);
      await page.locator('#playerField .card[data-card-id="wolf"]').click();
      await page.locator("#enemyHero").click();
      await page.waitForFunction(() => window.__test.guide().step === 2);
      await page.locator("#endTurnBtn").click();
      await page.waitForFunction(() => !window.__test.guide().active);
      const guideDone = await page.evaluate(() => ({ stored: localStorage.getItem("cb_guide_done_v1"), turn: window.__test.game().turn }));
      assert(guideDone.stored === "1" && guideDone.turn === "enemy", "可依 UI 完成出牌→攻擊→結束回合三步導引");
    }

    // Stage 3：卡包頁牌組編輯器可用真實點擊加入、儲存，重載後仍存在
    await page.evaluate(({ collection }) => {
      localStorage.clear();
      localStorage.setItem("cardpack_collection_v2", JSON.stringify(collection));
    }, { collection: collectionForDeck(LEGAL_DECK_IDS) });
    await page.goto(basePack);
    await page.waitForFunction(() => window.__deckTest && document.getElementById("deckCollectionList"));
    if (vp.w === 1280) {
      await page.evaluate(() => { window.__deckTest.setAudioMuted(true); window.__deckTest.revealTest(); });
      await page.locator("#revealRow .card").first().click();
      await page.locator("#skipRevealBtn").click();
      await sleep(120);
      const packFx = await page.evaluate(() => ({
        ...window.__deckTest.revealEffects(),
        allRevealed: [...document.querySelectorAll("#revealRow .card")].every((el) => /已翻開/.test(el.getAttribute("aria-label") || "")),
        actionsVisible: getComputedStyle(document.getElementById("actions")).display !== "none",
        skipHidden: !document.getElementById("skipRevealBtn").classList.contains("show"),
      }));
      assert(packFx.cards === 5 && packFx.rare >= 3 && packFx.tide >= 1
        && packFx.allRevealed && packFx.actionsVisible && packFx.skipHidden,
        "pack FX guard: 可點單張翻牌並一鍵全部翻開，rare+/tide 效果與後續操作同步完成");
    }

    const tidePityCheck = await page.evaluate(() => {
      const T = window.__deckTest;
      T.setCollection({ wolf: 1, "wolf#foil": 1, "wolf#tide": 1 });
      T.setCollectionFilters({ search: "wolf", axis: "all", keyword: "all", rarity: "all", ownership: "all", sort: "cost" });
      const variants = T.visibleCollection().filter((card) => card.id === "wolf");
      const common = window.getCardById("wolf");
      const allCommon = Array.from({ length: 5 }, () => Object.assign({}, common, { foil: false, tide: false }));
      T.setPity(0);
      const miss = T.applyPity(allCommon);
      T.setPity(19);
      const forced = T.applyPity(allCommon);
      return {
        owned: T.owned("wolf"),
        variants: variants.map((card) => ({ variant: card.variant, owned: card.owned, foil: card.foil, tide: card.tide })),
        miss,
        forced,
        progress: document.getElementById("progress")?.textContent || "",
      };
    });
    assert(tidePityCheck.owned === 3
      && tidePityCheck.variants.length === 3
      && tidePityCheck.variants.some((card) => card.variant === "normal" && card.owned)
      && tidePityCheck.variants.some((card) => card.variant === "foil" && card.owned && card.foil)
      && tidePityCheck.variants.some((card) => card.variant === "tide" && card.owned && card.tide)
      && /潮鑄/.test(tidePityCheck.progress),
      "收藏冊將普通、閃卡、潮鑄分槽顯示且 #tide 計入擁有數");
    assert(tidePityCheck.miss.forced === false && tidePityCheck.miss.after === 1
      && tidePityCheck.forced.forced === true && tidePityCheck.forced.after === 0
      && tidePityCheck.forced.rarities.some((rarity) => rarity !== "common"),
      "開包 pity 會累積未中 rare+，第 20 包強制 rare+ 後歸零");
    await page.evaluate(({ collection }) => {
      window.__deckTest.setCollection(collection);
      window.__deckTest.setCollectionFilters({ search: "", axis: "all", keyword: "all", rarity: "all", ownership: "all", sort: "cost" });
      window.__deckTest.setPity(0);
    }, { collection: collectionForDeck(LEGAL_DECK_IDS) });
    if (vp.w <= 400) {
      await page.locator("#missionDrawerBtn").click();
      const packMissionOpen = await page.evaluate(() => ({
        open: document.getElementById("missionDrawer").classList.contains("show"),
        daily: document.querySelectorAll("#missionDailyList .mission-item").length,
        weekly: document.querySelectorAll("#missionWeeklyList .mission-item").length,
        milestones: document.querySelectorAll("#missionMilestoneList .mission-item").length,
      }));
      assert(packMissionOpen.open && packMissionOpen.daily >= 3 && packMissionOpen.weekly === 1 && packMissionOpen.milestones >= 5,
        "開包頁也可開啟整合任務抽屜");
      await page.locator("#missionDrawerClose").click();

      await page.locator("#collectionOwnershipFilter").selectOption("missing");
      await page.locator("#collectionRarityFilter").selectOption("rare");
      await page.locator("#collectionSort").selectOption("cost");
      const collectionFilter = await page.evaluate(() => {
        const cards = window.__deckTest.visibleCollection();
        const costs = cards.map((card) => card.cost);
        const sortedByCost = costs.every((cost, index) => index === 0 || costs[index - 1] <= cost);
        const box = window.__deckTest.collectionToolsBox();
        return {
          count: cards.length,
          allRareMissing: cards.every((card) => card.rarity === "rare" && card.owned === false),
          sortedByCost,
          box,
          controls: document.querySelectorAll("#collectionTools input, #collectionTools select").length,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
        };
      });
      assert(collectionFilter.count > 0 && collectionFilter.allRareMissing,
        "手機收藏冊可篩選未擁有＋稀有度組合");
      assert(collectionFilter.sortedByCost && collectionFilter.controls === 6 && collectionFilter.box.height <= 180 && collectionFilter.overflow <= 2,
        "手機收藏冊排序生效且篩選控件一屏可操作");
      await page.evaluate(() => window.__deckTest.setCollectionFilters({ search: "", axis: "all", keyword: "all", rarity: "all", ownership: "all", sort: "cost" }));

      await page.locator("#deckSearch").fill("迅捷");
      await page.locator("#deckCostFilter").selectOption("2");
      await page.locator("#deckRarityFilter").selectOption("common");
      const filtered = await page.evaluate(() => window.__deckTest.visibleCards());
      assert(filtered.includes("wolf") && filtered.every((id) => id === "wolf"), "手機牌組編輯器可用搜尋/費用/稀有度篩出迅捷狼");
      await page.evaluate(() => window.__deckTest.setFilters({ search: "", cost: "all", rarity: "all" }));
      await page.locator("#autoFillDeckBtn").click();
    } else {
      for (const id of LEGAL_DECK_IDS) {
        await page.locator(`button.deck-add-btn[data-card-id="${id}"]`).click();
      }
    }
    await page.locator("#saveDeckBtn").click();
    const deckSaved = await page.evaluate(() => {
      const saved = JSON.parse(localStorage.getItem("card_deck_v1") || "{}");
      return {
        saved,
        validation: window.__deckTest.validation(),
        message: document.getElementById("deckSaveMsg").textContent,
        count: document.getElementById("deckCount").textContent,
      };
    });
    if (vp.w <= 400) {
      assert(deckSaved.validation.ok === true && deckSaved.count === "20/20" && deckSaved.saved.cards.length === 20, "手機牌組編輯器可自動補滿合法 20 張並儲存");
      await page.goto(base);
      await page.waitForFunction(() => window.__test && window.__test.game);
      const savedBattleDeck = await page.evaluate(() => window.__test.deckInfo());
      assert(savedBattleDeck.source === "saved" && savedBattleDeck.ids.length === 20, "手機自動補滿牌組會帶入下一場對戰");
      await page.goto(basePack);
      await page.waitForFunction(() => window.__deckTest && document.getElementById("deckList"));
    } else {
      assert(deckSaved.validation.ok === true && sameMultiset(deckSaved.saved.cards, LEGAL_DECK_IDS), "牌組編輯器可加入 20 張合法牌並儲存");
    }
    assert(deckSaved.message === "牌組已儲存。", "儲存成功訊息顯示正確");
    await page.reload();
    await page.waitForFunction(() => window.__deckTest && document.getElementById("deckList"));
    const deckReloaded = await page.evaluate(() => ({
      deck: window.__deckTest.deck(),
      validation: window.__deckTest.validation(),
      countText: document.getElementById("deckCount").textContent,
    }));
    assert(deckReloaded.validation.ok === true && deckReloaded.countText === "20/20" && sameMultiset(deckReloaded.deck.cards, LEGAL_DECK_IDS), "重載後牌組仍保留並維持合法");

    const templateDecks = await page.evaluate(({ collection, aggroIds, controlIds }) => {
      const T = window.__deckTest;
      T.setCollection(collection);
      T.clear();
      const aggroOk = T.template("aggro");
      const aggroValidation = T.validation();
      const aggroCurve = T.curve();
      const aggroCards = T.deck().cards;
      const aggroSaved = T.save();
      T.clear();
      const controlOk = T.template("control");
      const controlValidation = T.validation();
      const controlCurve = T.curve();
      const controlCards = T.deck().cards;
      const controlSaved = T.save();
      const saved = JSON.parse(localStorage.getItem("card_deck_v1") || "{}");
      return {
        aggroOk,
        aggroValid: aggroValidation.ok,
        aggroTotal: aggroCurve.total,
        aggroBars: aggroCurve.curve.filter((n) => n > 0).length,
        aggroNewCount: aggroCards.filter((id) => aggroIds.includes(id)).length,
        aggroSaved,
        controlOk,
        controlValid: controlValidation.ok,
        controlTotal: controlCurve.total,
        controlBars: controlCurve.curve.filter((n) => n > 0).length,
        controlNewCount: controlCards.filter((id) => controlIds.includes(id)).length,
        controlSaved,
        savedCount: Array.isArray(saved.cards) ? saved.cards.length : 0,
        countText: document.getElementById("deckCount").textContent,
        ratioText: document.getElementById("deckRatio").textContent,
      };
    }, { collection: richCollection(), aggroIds: R16_AGGRO_IDS, controlIds: R16_CONTROL_IDS });
    assert(templateDecks.aggroOk && templateDecks.aggroValid && templateDecks.aggroSaved && templateDecks.aggroTotal === 20 && templateDecks.aggroBars >= 3,
      "快攻模板可一鍵建立合法 20 張並顯示費用曲線");
    assert(templateDecks.controlOk && templateDecks.controlValid && templateDecks.controlSaved && templateDecks.controlTotal === 20 && templateDecks.savedCount === 20,
      "控制模板可一鍵建立合法 20 張並存檔");
    assert(templateDecks.aggroNewCount >= 4 && templateDecks.controlNewCount >= 4,
      `R16 新卡會被模板選入：快攻 ${templateDecks.aggroNewCount}，控制 ${templateDecks.controlNewCount}`);
    assert(templateDecks.countText === "20/20" && /隨從/.test(templateDecks.ratioText), "牌組比例與 20/20 狀態可見");
    await page.goto(base);
    await page.waitForFunction(() => window.__test && window.__test.game);
    const templateBattleDeck = await page.evaluate(() => window.__test.deckInfo());
    assert(templateBattleDeck.source === "saved" && templateBattleDeck.ids.length === 20, "模板牌組存檔後可進入對戰並使用 saved 來源");

    const telemetrySeed = await page.evaluate(() => {
      localStorage.setItem("card_stats_v1", JSON.stringify({ version: 3, wins: 0, losses: 0, streak: 0, lossStreak: 0, bestStreak: 0, coins: 0, packsOpened: 0 }));
      window.__newGame();
      const T = window.__test;
      const g = T.game();
      g.player.mana = g.player.manaMax = 10;
      const uid = T.giveCard("wolf");
      T.playFromHand(uid);
      const stats = T.finishGame(true);
      return { wolfName: window.getCardById("wolf").name, stats };
    });
    await page.goto(basePack);
    await page.waitForFunction(() => window.__deckTest && document.getElementById("deckList"));
    if (vp.w === 1366) {
      const packLowHit = {
        buttons: await areLocatorsHittable(page, ["#goBattleTop", "#pack", "#packPwaCheckBtn", "#autoFillDeckBtn", "#saveDeckBtn"]),
        ...(await page.evaluate(() => {
        const scrollBox = (selector) => {
          const el = document.querySelector(selector);
          const style = el && getComputedStyle(el);
          return !!(style && style.maxHeight !== "none" && /(auto|scroll)/.test(style.overflowY));
        };
        return {
          goal: scrollBox(".goal-panel"),
          record: scrollBox(".record-panel"),
          deckPanel: scrollBox(".deck-panel"),
          mission: scrollBox(".mission-card"),
        };
        })),
      };
      assert(packLowHit.buttons && packLowHit.goal && packLowHit.record && packLowHit.deckPanel && packLowHit.mission,
        "矮桌機開包主要按鈕含檢查更新可點，目標/戰績/牌組/任務面板可垂直捲動");
      await page.locator("#packPwaCheckBtn").click();
    }
    const packR36 = await page.evaluate(async () => {
      const T = window.__deckTest;
      await T.readCacheVersion();
      T.setTextSize("small");
      const smallEl = document.querySelector("#recordGrid .record-value") || document.getElementById("recordPanel");
      const small = parseFloat(getComputedStyle(smallEl).fontSize);
      T.setTextSize("large");
      const largeEl = document.querySelector("#recordGrid .record-value") || document.getElementById("recordPanel");
      const large = parseFloat(getComputedStyle(largeEl).fontSize);
      T.openMissionDrawer();
      return {
        small,
        large,
        textState: T.textSize(),
        pwaVersion: T.pwaVersion(),
        missionOpen: T.missionOpen(),
        missionAria: document.getElementById("missionDrawer").getAttribute("aria-hidden"),
        summaryLive: document.getElementById("summary")?.getAttribute("aria-live") || "",
        missionDailyLive: document.getElementById("missionDailyList")?.getAttribute("aria-live") || "",
        badgeLive: document.getElementById("missionBadge")?.getAttribute("aria-live") || "",
        deckSaveLive: document.getElementById("deckSaveMsg")?.getAttribute("aria-live") || "",
        swGuard: T.swUpdateGuard(),
      };
    });
    await page.waitForFunction(() => /mission/.test(document.activeElement?.id || ""));
    const packMissionFocus = await page.evaluate(() => document.activeElement?.id || "");
    assert(packR36.textState.attr === "large" && packR36.textState.select === "large"
      && packR36.large > packR36.small && packR36.pwaVersion.includes("card-battle-r56-v1"),
      "開包戰績區顯示版本並可調整文字大小");
    assert(packR36.missionOpen && packR36.missionAria === "false" && /mission/.test(packMissionFocus),
      "開包任務抽屜開啟後焦點進入抽屜控制");
    assert(packR36.swGuard.key === "card_sw_auto_reload_r56_v1" && packR36.swGuard.windowMs === 15000 && packR36.swGuard.late === false,
      "開包頁 SW 自動更新守衛超過 15 秒不會自動 reload");
    assert(packR36.summaryLive === "polite" && packR36.missionDailyLive === "polite"
      && packR36.badgeLive === "polite" && packR36.deckSaveLive === "polite",
      "開包頁摘要、任務與牌組通知使用 aria-live=polite");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.getElementById("missionDrawer").classList.contains("show") && document.getElementById("missionDrawer").getAttribute("aria-hidden") === "true");
    const recordText = await page.evaluate(() => window.__deckTest.recordText());
    assert(/1 勝 0 敗/.test(recordText) && /勝率 100%/.test(recordText) && /平均 1\.0 回合/.test(recordText) && recordText.includes(telemetrySeed.wolfName),
      "打完一場後戰績面板顯示勝率、平均回合與常用卡");

    await page.evaluate(() => {
      localStorage.setItem("card_stats_v1", JSON.stringify({
        version: 3,
        wins: 2,
        losses: 1,
        streak: 1,
        lossStreak: 0,
        bestStreak: 2,
        coins: 0,
        packsOpened: 0,
        telemetry: {
          games: [
            { difficulty: "easy", win: true, turns: 4, archetype: "aggro", at: 1 },
            { difficulty: "hard", win: false, turns: 8, archetype: "control", at: 2 },
            { difficulty: "hard", win: true, turns: 6, archetype: "neutral", at: 3 },
          ],
          cardPlays: { wolf: 2, firebolt: 1 },
        },
      }));
    });
    await page.locator("#recordDifficultyFilter").selectOption("hard");
    const filteredRecord = await page.evaluate(async () => {
      const copyText = await window.__deckTest.copyRecord();
      return {
        text: window.__deckTest.recordText(),
        snapshot: window.__deckTest.recordSnapshot(),
        copied: JSON.parse(copyText),
        lastCopy: JSON.parse(window.__deckTest.lastRecordCopy()),
      };
    });
    assert(/總覽｜困難/.test(filteredRecord.text) && /1 勝 1 敗/.test(filteredRecord.text)
      && /控制：0\/1/.test(filteredRecord.text) && /中立：1\/1/.test(filteredRecord.text),
      "戰績面板可依難度篩選並依牌組軸線分組顯示");
    assert(filteredRecord.copied.filter.difficulty === "hard" && filteredRecord.copied.total.wins === 1
      && filteredRecord.lastCopy.archetype.control.total === 1 && filteredRecord.snapshot.topCards[0].id === "wolf",
      "戰績可複製目前篩選後的 JSON 文字");

    const saveManager = await page.evaluate(({ deckIds, collection }) => {
      localStorage.setItem("card_stats_v1", JSON.stringify({
        version: 3,
        wins: 7,
        losses: 2,
        streak: 2,
        lossStreak: 0,
        bestStreak: 4,
        coins: 321,
        packsOpened: 6,
        telemetry: { games: [{ difficulty: "normal", win: true, turns: 5, archetype: "aggro", at: 10 }], cardPlays: { wolf: 3 } },
      }));
      localStorage.setItem("cardpack_collection_v2", JSON.stringify(collection));
      localStorage.setItem("card_deck_v1", JSON.stringify({ version: 1, cards: deckIds }));
      const T = window.__deckTest;
      const code = T.exportSave();
      return Promise.resolve(code).then((saveCode) => {
        const decoded = T.decodeSave(saveCode);
        localStorage.setItem("card_stats_v1", JSON.stringify({ version: 3, wins: 0, losses: 0, coins: 1 }));
        localStorage.setItem("cardpack_collection_v2", JSON.stringify({ wolf: 1 }));
        localStorage.setItem("card_deck_v1", JSON.stringify({ version: 1, cards: [] }));
        const beforeBad = localStorage.getItem("card_stats_v1");
        T.importSave(saveCode, { reload: false });
        const restored = {
          stats: JSON.parse(localStorage.getItem("card_stats_v1")),
          collection: JSON.parse(localStorage.getItem("cardpack_collection_v2")),
          deck: JSON.parse(localStorage.getItem("card_deck_v1")),
          backup: T.backupText(),
          decoded,
        };
        let badRejected = false;
        const beforeReject = localStorage.getItem("card_stats_v1");
        try { T.importSave("not-a-valid-save", { reload: false }); }
        catch { badRejected = true; }
        return {
          codeLength: saveCode.length,
          textareaFilled: document.getElementById("saveImportText").value === saveCode,
          restored,
          badRejected,
          unchangedAfterBad: localStorage.getItem("card_stats_v1") === beforeReject,
          changedFromBeforeBad: beforeBad !== beforeReject,
        };
      });
    }, { deckIds: LEGAL_DECK_IDS, collection: collectionForDeck(LEGAL_DECK_IDS) });
    assert(saveManager.codeLength > 80 && saveManager.textareaFilled && saveManager.restored.decoded.stats.coins === 321,
      "存檔管家可匯出 stats/collection/deck/goals/quests Base64 並放入文字框");
    assert(saveManager.restored.stats.coins === 321
      && saveManager.restored.collection.wolf === 2
      && saveManager.restored.deck.cards.length === 20
      && saveManager.restored.backup.length > 80
      && saveManager.changedFromBeforeBad,
      "存檔管家匯入會遷移還原資料並在匯入前自動備份");
    assert(saveManager.badRejected && saveManager.unchangedAfterBad, "壞存檔碼會拒絕且不覆蓋現有存檔");

    const downgradeRecommendation = await page.evaluate(({ deckIds, collection }) => {
      const T = window.__deckTest;
      T.setCollection({ ...collection, groveHerbalist: 1 });
      T.setDeck(deckIds);
      T.setLastNewCards(["groveHerbalist"]);
      const rec = T.recommendation();
      return {
        text: T.recommendationText(),
        rec: rec && { fresh: rec.fresh.id, old: rec.old.id },
        newScore: T.score("groveHerbalist"),
        oldScore: T.score("knight"),
      };
    }, { deckIds: LEGAL_DECK_IDS, collection: collectionForDeck(LEGAL_DECK_IDS) });
    assert(downgradeRecommendation.newScore <= downgradeRecommendation.oldScore
      && !downgradeRecommendation.rec
      && downgradeRecommendation.text === "",
      `新卡分數不高於舊卡時不顯示推薦替換（new=${downgradeRecommendation.newScore}, old=${downgradeRecommendation.oldScore}）`);

    const goalCheck = await page.evaluate(({ collection }) => {
      const T = window.__deckTest;
      const Core = window.CardCore;
      T.setCollection(collection);
      T.setGoals({}, "2026-W30");
      localStorage.setItem("card_stats_v1", JSON.stringify({ version: 2, wins: 0, losses: 0, streak: 0, bestStreak: 0, coins: 0, packsOpened: 0 }));
      const visibleMilestones = document.querySelectorAll("#milestoneList .goal-item").length;
      const first = T.claimMilestone("unique_10");
      const afterFirst = JSON.parse(localStorage.getItem("card_stats_v1")).coins;
      const second = T.claimMilestone("unique_10");
      const afterSecond = JSON.parse(localStorage.getItem("card_stats_v1")).coins;
      const weekly = Core.migrateGoals({}, "2026-W30");
      const q = weekly.weeklyQuest;
      const progressed = Core.applyWeeklyQuestProgress(weekly, { type: q.type, amount: q.target });
      const claimed = Core.claimWeeklyQuest(progressed);
      const reset = Core.migrateGoals(claimed.state, "2026-W31");
      return {
        visibleMilestones,
        firstOk: first.ok,
        firstReward: first.reward,
        afterFirst,
        secondOk: second.ok,
        secondReason: second.reason,
        afterSecond,
        weeklyReward: claimed.reward,
        weeklyClaimed: claimed.ok && claimed.state.weeklyQuest.claimed,
        resetProgress: reset.weeklyQuest.progress,
        resetClaimed: reset.weeklyQuest.claimed,
        milestoneTotal: Core.milestoneRewardTotal(),
      };
    }, { collection: collectionForDeck(LEGAL_DECK_IDS) });
    assert(goalCheck.visibleMilestones >= 5 && goalCheck.firstOk && goalCheck.firstReward === 40 && goalCheck.afterFirst === 40,
      "收藏里程碑 UI 可一次性領取並發放金幣");
    assert(!goalCheck.secondOk && goalCheck.secondReason === "alreadyClaimed" && goalCheck.afterSecond === 40,
      "收藏里程碑重複領取不會再次加金幣");
    assert(goalCheck.weeklyReward >= 80 && goalCheck.weeklyReward <= 120 && goalCheck.weeklyClaimed && goalCheck.resetProgress === 0 && goalCheck.resetClaimed === false,
      "週任務可完成領取且跨週重置");
    assert(goalCheck.milestoneTotal <= 300, "里程碑總增發不超過三包價值");

    // 8. 全程無 console error / pageerror
    assert(errors.length === 0, "無 console 錯誤 / pageerror" + (errors.length ? "：" + errors.slice(0, 3).join(" | ") : ""));

    await page.close();
  }
  } finally {
    await browser.close();
    server.close();
  }
  if (failed > 0) { console.error("\n❌ " + failed + " 項失敗"); process.exit(1); }
  console.log("\n✅ 卡牌對戰 Stage 5 E2E 全部通過");
}

run().catch((err) => { console.error(err); process.exit(1); });
