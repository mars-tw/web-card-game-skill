/* R72 好玩＋美觀輪：四視口真實輸入試玩截圖（before/after 共用）。
 * 用法：node scripts/capture-r72-evidence.js before|after [--base http://127.0.0.1:5104]
 * 全程用 Playwright 真實 click/tap；只在「準備場景」時使用 window.__test（截圖檔名會標 staged）。 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const PHASE = process.argv[2];
if (!new Set(["before", "after"]).has(PHASE)) {
  console.error("usage: node scripts/capture-r72-evidence.js before|after");
  process.exit(2);
}
const baseArg = process.argv.indexOf("--base");
const VIEWPORTS = [
  { width: 1366, height: 768, name: "1366x768", touch: false },
  { width: 1366, height: 600, name: "1366x600", touch: false },
  { width: 390, height: 844, name: "390x844", touch: true },
  { width: 844, height: 390, name: "844x390", touch: true },
];
const MIME = {
  ".html": "text/html", ".js": "application/javascript", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".css": "text/css", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".flac": "audio/flac",
};

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

async function tapOrClick(page, locator, touch) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  if (touch) await locator.tap({ timeout: 4000 });
  else await locator.click({ timeout: 4000 });
}

async function shot(page, dir, name) {
  await page.screenshot({ path: path.join(dir, `${name}.png`) });
  console.log(`  shot ${name}`);
}

async function battleFlow(page, base, dir, vp) {
  // ?intro=1：after 版強制播 VS 開場（before 版無此功能，參數無作用）
  await page.goto(`${base}/templates/card-battle/index.html?intro=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__test && window.__test.game());
  await page.waitForTimeout(900);
  await shot(page, dir, `01-battle-first-load-${vp.name}`);
  const intro = page.locator("#vsIntro.show");
  if (await intro.count()) { await tapOrClick(page, intro, vp.touch).catch(() => {}); await page.waitForTimeout(500); }
  // 關掉第一次教學（真實點）
  const guideBtn = page.locator("#guideHintBtn");
  if (await guideBtn.isVisible().catch(() => false)) await tapOrClick(page, guideBtn, vp.touch).catch(() => {});
  const mull = page.locator("#mulliganBtn, .mulligan-btn").first();
  await page.waitForTimeout(300);
  // 真實出牌兩回合
  for (let turn = 0; turn < 3; turn++) {
    if (vp.touch) {
      const drawer = page.locator("#handDrawer");
      const open = await drawer.evaluate((el) => el.classList.contains("open")).catch(() => true);
      if (!open) await tapOrClick(page, page.locator("#handDrawerToggle"), true).catch(() => {});
    }
    const playable = page.locator("#playerHand .card.playable").first();
    if (await playable.count()) {
      await tapOrClick(page, playable, vp.touch).catch(() => {});
      await page.waitForTimeout(900);
      const confirm = page.locator("#targetConfirmBtn:visible, .target-confirm:visible").first();
      if (await confirm.count()) await tapOrClick(page, confirm, vp.touch).catch(() => {});
    }
    if (turn === 1) await shot(page, dir, `02-battle-midgame-${vp.name}`);
    const end = page.locator("#endTurnBtn");
    await tapOrClick(page, end, vp.touch).catch(() => {});
    await page.waitForFunction(() => { const g = window.__test.game(); return g && (g.turn === "player" || g.over || g.current === "player" || !g.aiThinking); }, null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);
  }
  await shot(page, dir, `03-battle-turn3-${vp.name}`);
  // staged：攻擊瞬間的打擊感（真實 click 攻擊者→敵英雄）
  await page.evaluate(() => {
    document.querySelectorAll(".overlay.show, #battleGuide.show").forEach((el) => el.classList.remove("show"));
    window.__test.setup(["wolf", "knight"], ["golem"]);
    const g = window.__test.game(); g.enemy.hp = Math.max(g.enemy.hp, 12);
  });
  if (vp.touch) {
    const openNow = await page.locator("#handDrawer").evaluate((el) => el.classList.contains("open")).catch(() => false);
    if (openNow) await tapOrClick(page, page.locator("#handDrawerToggle"), true).catch(() => {});
    await page.waitForTimeout(250);
  }
  const attacker = page.locator("#playerField .card").first();
  await tapOrClick(page, attacker, vp.touch).catch(() => {});
  const enemyCard = page.locator("#enemyField .card").first();
  await tapOrClick(page, enemyCard, vp.touch).catch(() => {});
  await page.waitForTimeout(260);
  await shot(page, dir, `04-staged-attack-impact-${vp.name}`);
  await page.waitForTimeout(1500);
  // staged：裂潮爆發（after 才有；真實點擊按鈕，截潮浪掃過瞬間）
  const tideBtn = page.locator("#tidebreakBtn");
  if (await tideBtn.count()) {
    await page.evaluate(() => {
      window.__test.closeDetail();
      document.querySelectorAll("#toastStack").forEach((el) => el.remove());
      window.__test.setPerfMode("high");
      window.__test.setup(["wolf", "knight"], ["footman", "archer", "golem"]);
      window.__test.setTide(6, 3);
    });
    if (vp.touch) {
      const open = await page.locator("#handDrawer").evaluate((el) => el.classList.contains("open")).catch(() => false);
      if (open) await tapOrClick(page, page.locator("#handDrawerToggle"), true).catch(() => {});
    }
    await shot(page, dir, `09-staged-tide-ready-${vp.name}`);
    await tapOrClick(page, tideBtn, vp.touch).catch((e) => console.log("  tide click fail", e.message.split("\n")[0]));
    await page.waitForTimeout(330);
    await shot(page, dir, `10-staged-tidebreak-wave-${vp.name}`);
    await page.waitForTimeout(1200);
  }
  // staged：真實致死→結算
  await page.evaluate(() => {
    window.__test.setup(["titan"], []);
    const g = window.__test.game(); g.enemy.hp = 3;
  }).catch(() => {});
  await page.evaluate(() => { const g = window.__test.game(); if (!g.player.field.length) window.__test.setup(["knight"], []); g.enemy.hp = 2; });
  await tapOrClick(page, page.locator("#playerField .card").first(), vp.touch).catch(() => {});
  const heroTarget = page.locator("#enemyHero, .enemy-hero, [data-target='enemy-hero']").first();
  await tapOrClick(page, heroTarget, vp.touch).catch(() => {});
  await page.waitForTimeout(2600);
  await shot(page, dir, `05-staged-victory-${vp.name}`);
}

async function packFlow(page, base, dir, vp) {
  await page.goto(`${base}/templates/card-pack/index.html`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__deckTest);
  await page.waitForTimeout(900);
  await shot(page, dir, `06-pack-first-load-${vp.name}`);
  const pack = page.locator("#pack, .pack, [data-pack]").first();
  if (await pack.count()) {
    // 卡包有 floaty 漂浮動畫，Playwright 穩定性檢查會一直等；改用 force 真實點擊
    if (vp.touch) await pack.tap({ force: true }).catch((e) => console.log("  pack tap fail", e.message.split("\n")[0]));
    else await pack.click({ force: true }).catch((e) => console.log("  pack click fail", e.message.split("\n")[0]));
    await page.waitForTimeout(700);
    await shot(page, dir, `07-pack-tearing-${vp.name}`);
    await page.waitForTimeout(3500);
    await shot(page, dir, `08-pack-revealed-${vp.name}`);
  }
}

async function hubFlow(page, base, dir, vp) {
  await page.goto(`${base}/templates/index.html`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);
  await shot(page, dir, `00-hub-first-impression-${vp.name}`);
}

(async () => {
  let server = null;
  let base = baseArg > -1 ? process.argv[baseArg + 1] : null;
  if (!base) { server = await startServer(); base = `http://127.0.0.1:${server.address().port}`; }
  const outRoot = path.join(ROOT, "docs", "evidence", "r72", PHASE);
  fs.mkdirSync(outRoot, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  for (const vp of VIEWPORTS) {
    console.log(`viewport ${vp.name}`);
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`${vp.name} pageerror ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") errors.push(`${vp.name} console ${m.text()}`); });
    try { await hubFlow(page, base, outRoot, vp); } catch (e) { console.log("  hub fail", e.message.split("\n")[0]); }
    try { await battleFlow(page, base, outRoot, vp); } catch (e) { console.log("  battle fail", e.message.split("\n")[0]); }
    try { await packFlow(page, base, outRoot, vp); } catch (e) { console.log("  pack fail", e.message.split("\n")[0]); }
    await ctx.close();
  }
  await browser.close();
  if (server) server.close();
  fs.writeFileSync(path.join(outRoot, "console-errors.json"), JSON.stringify(errors, null, 2));
  console.log(`errors: ${errors.length}`);
})();
