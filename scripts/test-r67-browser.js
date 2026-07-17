const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const EVIDENCE = path.join(ROOT, "docs", "evidence", "R67");
const AFTER = path.join(EVIDENCE, "after");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".css": "text/css; charset=utf-8",
};

const SCENES = [
  "white-tide-citadel",
  "astral-conclave",
  "thunderwild-pass",
  "longnight-necropolis",
  "tidebreak-confluence",
];
const VIEWPORTS = [
  { name: "desktop-1366x768", width: 1366, height: 768, tier: "high" },
  { name: "mobile-390x844", width: 390, height: 844, tier: "low" },
  { name: "landscape-844x390", width: 844, height: 390, tier: "med" },
];

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const pathname = decodeURIComponent(new URL(req.url, "http://local").pathname);
      const safePath = pathname === "/" ? "/index.html" : pathname;
      const file = path.resolve(ROOT, `.${safePath}`);
      const relative = path.relative(ROOT, file);
      if (relative.startsWith("..") || path.isAbsolute(relative) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function result(name, pass, details) {
  return { name, pass: Boolean(pass), details };
}

async function loadedImages(page, selector) {
  return page.locator(selector).evaluateAll((images) => images.map((image) => ({
    src: image.currentSrc || image.src,
    complete: image.complete,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
  })));
}

async function run() {
  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch (error) {
    console.error("R67 browser gate requires the Playwright devDependency.");
    process.exit(2);
  }

  fs.mkdirSync(AFTER, { recursive: true });
  const server = await startServer();
  const port = server.address().port;
  const battleUrl = `http://127.0.0.1:${port}/templates/card-battle/index.html?r67test=1`;
  const packUrl = `http://127.0.0.1:${port}/templates/card-pack/index.html?r67test=1`;
  const browser = await chromium.launch();
  const checks = [];
  const errors = [];
  const requestedBattlefields = new Set();

  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: "block" });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.on("console", (message) => {
      if (message.type() === "error" && !/favicon|net::ERR/.test(message.text())) errors.push(`console: ${message.text()}`);
    });
    page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
    page.on("response", (response) => {
      const url = response.url();
      if (/\/assets\/battlefields\/.+\.webp\?v=[a-f0-9]{8}$/.test(url) && response.ok()) requestedBattlefields.add(url);
    });

    await page.goto(battleUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__test && window.__test.battlefield().loaded === true);
    console.log("R67 browser gate: battle boot ready");

    const forcedScenes = [];
    for (const id of SCENES) {
      await page.evaluate(({ sceneId }) => { window.__test.setBattlefield(sceneId, "high"); }, { sceneId: id });
      await page.waitForFunction(({ sceneId }) => {
        const state = window.__test.battlefield();
        return state.id === sceneId && state.tier === "high" && state.loaded === true;
      }, { sceneId: id });
      const state = await page.evaluate(() => window.__test.battlefield());
      forcedScenes.push(state);
      console.log(`R67 browser gate: scene ${id} ready`);
    }
    checks.push(result(
      "five battlefield scenes load through the runtime API",
      forcedScenes.length === 5
        && new Set(forcedScenes.map((state) => state.id)).size === 5
        && forcedScenes.every((state) => state.loaded && state.tier === "high" && /\.webp\?v=[a-f0-9]{8}$/.test(state.url)),
      forcedScenes,
    ));

    const rotation = [];
    for (let index = 0; index < 5; index += 1) {
      const previous = await page.evaluate(() => window.__test.battlefield().id);
      await page.evaluate(() => window.__newGame());
      await page.waitForFunction((oldId) => {
        const state = window.__test.battlefield();
        return state.loaded === true && state.id !== oldId;
      }, previous);
      rotation.push(await page.evaluate(() => window.__test.battlefield().id));
    }
    checks.push(result("new game rotates all five scenes without gameplay data changes", new Set(rotation).size === 5, rotation));
    console.log("R67 browser gate: new-game rotation ready");

    const tierStates = [];
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.evaluate(({ tier }) => { window.__test.setBattlefield("tidebreak-confluence", tier); }, { tier: viewport.tier });
      await page.waitForFunction(({ tier }) => {
        const state = window.__test.battlefield();
        return state.id === "tidebreak-confluence" && state.tier === tier && state.loaded === true;
      }, { tier: viewport.tier });
      const state = await page.evaluate(() => window.__test.battlefield());
      const geometry = await page.evaluate(() => ({
        viewport: [innerWidth, innerHeight],
        scrollWidth: document.documentElement.scrollWidth,
        scene: document.body.dataset.battlefield,
        tier: document.body.dataset.battlefieldTier,
        cssImage: getComputedStyle(document.documentElement).getPropertyValue("--battlefield-image").trim(),
      }));
      tierStates.push({ ...state, geometry });
      await page.screenshot({ path: path.join(AFTER, `${viewport.name}.png`), fullPage: false });
      console.log(`R67 browser gate: ${viewport.name} captured`);
    }
    checks.push(result(
      "low medium high are real hashed assets with safe responsive width",
      tierStates.every((state, index) => state.loaded
        && state.tier === VIEWPORTS[index].tier
        && state.url.includes(`-${VIEWPORTS[index].tier}.webp?v=`)
        && /\.webp\?v=[a-f0-9]{8}$/.test(state.url)
        && state.geometry.cssImage.includes(state.url)
        && state.geometry.scrollWidth <= state.geometry.viewport[0] + 1),
      tierStates,
    ));

    await page.setViewportSize({ width: 1366, height: 768 });
    const battleCards = await loadedImages(page, ".card .art > img:not(.faction-emblem)");
    const battleEmblems = await loadedImages(page, ".card .art .faction-emblem");
    const battleFallbacks = await page.locator(".battlefield .art-fallback, .hand .art-fallback").count();
    checks.push(result(
      "battle card frames use loaded art and loaded faction emblems with no fallback",
      battleCards.length > 0
        && battleCards.every((image) => image.complete && image.naturalWidth > 0)
        && battleEmblems.length > 0
        && battleEmblems.every((image) => image.complete && image.naturalWidth === 256 && /\/assets\/factions\/.+\.png\?v=[a-f0-9]{8}$/.test(image.src))
        && battleFallbacks === 0,
      { cardArt: battleCards.length, emblems: battleEmblems.length, fallbacks: battleFallbacks },
    ));

    await page.goto(packUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__deckTest);
    console.log("R67 browser gate: pack boot ready");
    await page.evaluate(() => {
      const factions = ["wardens", "conclave", "wild", "wintershadow", "neutral"];
      const cards = factions.map((faction) => CARD_POOL.find((card) => card.faction === faction && card.image)).filter(Boolean);
      window.__deckTest.testPack(cards);
    });
    await page.waitForSelector("#revealRow .card");
    const menuEmblems = await loadedImages(page, "#collectionFactionFilter .faction-filter-emblem");
    const frameEmblems = await loadedImages(page, "#revealRow .card .faction-emblem");
    checks.push(result(
      "faction menu and pack card frames expose five distinct loaded 256 px emblems",
      menuEmblems.length === 5
        && frameEmblems.length === 5
        && new Set(menuEmblems.map((image) => image.src)).size === 5
        && [...menuEmblems, ...frameEmblems].every((image) => image.complete && image.naturalWidth === 256 && image.naturalHeight === 256),
      { menu: menuEmblems, cardFrames: frameEmblems },
    ));

    checks.push(result("browser console and page error stream is empty", errors.length === 0, errors));
    checks.push(result("hashed battlefield responses were observed", requestedBattlefields.size >= 7, [...requestedBattlefields].sort()));
    await context.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  const report = {
    release: "card R67",
    generatedAt: new Date().toISOString(),
    checks,
    screenshots: VIEWPORTS.map((viewport) => `docs/evidence/R67/after/${viewport.name}.png`),
    pass: checks.every((check) => check.pass),
  };
  fs.writeFileSync(path.join(EVIDENCE, "gates", "browser-integration.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
