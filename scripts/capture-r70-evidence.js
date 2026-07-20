/* R70 PLAYTEST-R1 before/after evidence: real input at the three acceptance viewports. */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const PHASE = process.argv[2];
if (!new Set(["before", "after"]).has(PHASE)) {
  console.error("usage: node scripts/capture-r70-evidence.js before|after");
  process.exit(2);
}

const VIEWPORTS = [
  { width: 390, height: 844, name: "390x844", touch: true },
  { width: 844, height: 390, name: "844x390", touch: true },
  { width: 1366, height: 768, name: "1366x768", touch: false },
];
const MIME = {
  ".html": "text/html", ".js": "application/javascript", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".css": "text/css",
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

async function captureBattle(page, base, outputDir, viewport) {
  console.log(`battle navigate ${viewport.name}`);
  await page.goto(`${base}/templates/card-battle/index.html`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__test && window.__test.game());
  await page.evaluate(() => {
    document.querySelectorAll(".overlay.show, #battleGuide.show").forEach((el) => el.classList.remove("show"));
    window.__test.setup(["wolf"], []);
  });
  const card = page.locator("#playerField .card").first();
  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();
  await card.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await page.screenshot({ path: path.join(outputDir, `battle-center-${viewport.name}.png`) });
  console.log(`battle center ${viewport.name}`);

  await page.evaluate(() => {
    window.__test.closeDetail();
    const game = window.__test.game();
    game.player.hand = [];
    game.player.mana = game.player.manaMax = 10;
    ["iceNeedle", "wolf", "archer", "firebolt", "cleric"].forEach((id) => window.__test.giveCard(id));
  });
  if (viewport.touch) {
    const drawer = page.locator("#handDrawer");
    if (!(await drawer.evaluate((el) => el.classList.contains("open")))) await page.locator("#handDrawerToggle").click();
  }
  await page.screenshot({ path: path.join(outputDir, `battle-drawer-${viewport.name}.png`) });
  console.log(`battle drawer ${viewport.name}`);
}

async function capturePack(page, base, outputDir, viewport) {
  console.log(`pack navigate ${viewport.name}`);
  await page.goto(`${base}/templates/card-pack/index.html`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__deckTest && document.getElementById("collectionTools"));
  const panel = page.locator("#collectionTools .filter-panel");
  await panel.evaluate((el) => { el.open = true; });
  await page.locator("#collectionTools").scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(outputDir, `pack-filters-${viewport.name}.png`) });
  console.log(`pack filters ${viewport.name}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const outputDir = path.join(ROOT, "docs", "evidence", "r70", PHASE);
  fs.mkdirSync(outputDir, { recursive: true });
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        hasTouch: viewport.touch,
        isMobile: viewport.touch,
        reducedMotion: "reduce",
        serviceWorkers: "block",
      });
      await context.addInitScript(() => localStorage.setItem("cb_guide_done_v1", "1"));
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.setDefaultNavigationTimeout(15000);
      await captureBattle(page, base, outputDir, viewport);
      await capturePack(page, base, outputDir, viewport);
      await context.close();
      console.log(`captured ${PHASE} ${viewport.name}`);
    }
  } finally {
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
    server.close();
    // Some Windows Playwright builds keep browser.close() pending after every
    // page is already written. Bound cleanup so the evidence command remains
    // deterministic without weakening any capture step.
    await Promise.race([browser.close(), delay(5000)]);
  }
})()
  .then(() => process.exit(0))
  .catch((error) => { console.error(error); process.exit(1); });
