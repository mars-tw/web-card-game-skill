/* R67 first-screen and frame-time measurement. Runs one browser at a time. */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
};

const HEAD_SOURCE_FILES = new Set([
  "templates/card-battle/index.html",
  "templates/card-battle/cards.js",
  "templates/card-battle/core.js",
  "templates/card-battle/battle.js",
]);

function headSources() {
  const sources = new Map();
  for (const relative of HEAD_SOURCE_FILES) {
    sources.set(relative, execFileSync("git", ["show", `HEAD:${relative}`], { cwd: ROOT }));
  }
  return sources;
}

function startServer(useHead) {
  const sources = useHead ? headSources() : new Map();
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const pathname = decodeURIComponent(new URL(req.url, "http://local").pathname);
      const safePath = pathname === "/" ? "/index.html" : pathname;
      const file = path.resolve(ROOT, `.${safePath}`);
      const rel = path.relative(ROOT, file);
      const normalized = rel.replaceAll("\\", "/");
      if (rel.startsWith("..") || path.isAbsolute(rel) || (!sources.has(normalized) && (!fs.existsSync(file) || fs.statSync(file).isDirectory()))) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, {
        "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Cache-Control": /\.(?:png|webp)\?v=[a-f0-9]{8}(?:$|&)/.test(req.url) ? "public, max-age=31536000, immutable" : "no-store",
      });
      if (sources.has(normalized)) {
        res.end(sources.get(normalized));
        return;
      }
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function percentile(values, p) {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * p))] || 0;
}

function median(values) {
  return percentile(values, 0.5);
}

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} exceeded ${timeoutMs}ms`)), timeoutMs)),
  ]);
}

async function measureThrottled(chromium, url) {
  const context = await chromium.launch().then(async (browser) => ({
    browser,
    context: await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: "block" }),
  }));
  const page = await context.context.newPage();
  const cdp = await context.context.newCDPSession(page);
  try {
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: 200 * 1024,
      uploadThroughput: 90 * 1024,
      connectionType: "cellular3g",
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.goto(`${url}?perf=high&r67measure=1`, { waitUntil: "commit", timeout: 45000 });
    await page.waitForFunction(() => window.__test, undefined, { timeout: 60000 });
    const readyAt = await withTimeout(page.evaluate(async () => {
      const cssValue = getComputedStyle(document.documentElement).getPropertyValue("--battlefield-image").trim()
        || getComputedStyle(document.documentElement).getPropertyValue("--bg-img").trim();
      const urlMatch = cssValue.match(/url\(["']?([^"')]+)["']?\)/);
      if (urlMatch) {
        const img = new Image();
        img.src = new URL(urlMatch[1], location.href).href;
        try {
          await Promise.race([
            img.decode(),
            new Promise((resolve) => setTimeout(resolve, 30000)),
          ]);
        } catch { /* resource timing still records failures */ }
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const visualMark = performance.getEntriesByName("r67-visual-ready").at(-1);
      const nav = performance.getEntriesByType("navigation")[0];
      const imageResources = performance.getEntriesByType("resource").filter((entry) => /assets\/(?:backgrounds|battlefields)\//.test(entry.name));
      const backgroundResponseEnd = Math.max(0, ...imageResources.map((entry) => entry.responseEnd));
      return {
        interactiveMs: Number(performance.now().toFixed(2)),
        visualReadyMs: Number((visualMark ? visualMark.startTime : Math.max(nav?.domInteractive || 0, backgroundResponseEnd)).toFixed(2)),
        domInteractiveMs: Number((nav?.domInteractive || 0).toFixed(2)),
        backgroundResponseEndMs: Number(backgroundResponseEnd.toFixed(2)),
        visualMarkPresent: Boolean(visualMark),
        backgroundResources: imageResources.map((entry) => ({ name: entry.name.split("/").at(-1), bytes: entry.transferSize, responseEndMs: Number(entry.responseEnd.toFixed(2)) })),
      };
    }), 45000, "visual-ready evaluation");
    return readyAt;
  } finally {
    await page.goto("about:blank", { waitUntil: "commit", timeout: 5000 }).catch(() => {});
    await withTimeout(context.context.close(), 5000, "throttled context close").catch(() => {});
    await withTimeout(context.browser.close(), 5000, "throttled browser close").catch(() => {});
  }
}

async function measureFrameP95(chromium, url) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: "block" });
  const page = await context.newPage();
  try {
    await page.goto(`${url}?perf=high&r67frame=1`, { waitUntil: "commit", timeout: 45000 });
    await page.waitForFunction(() => window.__test, undefined, { timeout: 60000 });
    await page.evaluate(() => window.__test.setPerfMode("high"));
    await page.waitForFunction(() => {
      const battlefield = window.__test && window.__test.battlefield();
      const visibleCardImages = [...document.querySelectorAll(".hand .card .art > img:not(.faction-emblem), .battlefield .card .art > img:not(.faction-emblem)")];
      return battlefield && battlefield.loaded === true
        && visibleCardImages.length > 0
        && visibleCardImages.every((image) => image.complete && image.naturalWidth > 0)
        && [...document.images].every((image) => image.complete && image.naturalWidth > 0);
    }, undefined, { timeout: 60000 });
    await page.evaluate(async () => {
      const images = [...document.images];
      await Promise.all(images.map((image) => image.decode().catch(() => {})));
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });
    return await Promise.race([page.evaluate(() => new Promise((resolve) => {
      const deltas = [];
      let previous = performance.now();
      const tick = (now) => {
        deltas.push(now - previous);
        previous = now;
        if (deltas.length >= 180) {
          const sorted = deltas.slice(5).sort((a, b) => a - b);
          resolve({
            samples: sorted.length,
            p95Ms: Number((sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] || 0).toFixed(2)),
          });
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    })), new Promise((_, reject) => setTimeout(() => reject(new Error("frame p95 sampling exceeded 30 seconds")), 30000))]);
  } finally {
    await page.goto("about:blank", { waitUntil: "commit", timeout: 5000 }).catch(() => {});
    await withTimeout(context.close(), 5000, "frame context close").catch(() => {});
    await withTimeout(browser.close(), 5000, "frame browser close").catch(() => {});
  }
}

async function run() {
  let chromium;
  try { ({ chromium } = require("playwright")); }
  catch { console.error("Playwright is required."); process.exit(2); }
  const outIndex = process.argv.indexOf("--out");
  const outFile = outIndex >= 0 ? process.argv[outIndex + 1] : "";
  const baselineIndex = process.argv.indexOf("--baseline");
  const baselineFile = baselineIndex >= 0 ? process.argv[baselineIndex + 1] : "";
  const assertMode = process.argv.includes("--assert");
  const runsIndex = process.argv.indexOf("--runs");
  const runCount = runsIndex >= 0 ? Math.max(1, Number(process.argv[runsIndex + 1]) || 1) : 3;
  const useHead = process.argv.includes("--head");
  const skipFrame = process.argv.includes("--skip-frame");
  const server = await startServer(useHead);
  const url = `http://127.0.0.1:${server.address().port}/templates/card-battle/index.html`;
  try {
    if (!skipFrame) console.log("R67 performance: frame p95 run");
    const frame = skipFrame ? { skipped: true, reason: "interaction-only git HEAD baseline" } : await measureFrameP95(chromium, url);
    const throttled = [];
    for (let i = 0; i < runCount; i++) {
      console.log(`R67 performance: throttled run ${i + 1}/${runCount}${useHead ? " (git HEAD baseline)" : ""}`);
      throttled.push(await measureThrottled(chromium, url));
    }
    const result = {
      generatedAt: new Date().toISOString(),
      source: useHead ? "git HEAD (R66)" : "working tree (R67)",
      profile: "Fast 3G (150ms RTT, 200KiB/s down) + 4x CPU throttle",
      concurrentMachine: true,
      trustNote: "Local p95 is concurrent-machine evidence; release decision requires clean-machine audit.",
      runs: throttled,
      median: {
        interactiveMs: Number(median(throttled.map((item) => item.interactiveMs)).toFixed(2)),
        visualReadyMs: Number(median(throttled.map((item) => item.visualReadyMs)).toFixed(2)),
      },
      frame,
      assertions: {},
    };
    if (assertMode) {
      const baseline = baselineFile ? JSON.parse(fs.readFileSync(path.resolve(ROOT, baselineFile), "utf8")) : null;
      const interactiveLimit = baseline ? Number((baseline.median.interactiveMs * 1.1).toFixed(2)) : Infinity;
      result.assertions.visualReadyWithin3000ms = result.median.visualReadyMs <= 3000;
      result.assertions.interactiveRegressionWithin10Percent = result.median.interactiveMs <= interactiveLimit;
      result.assertions.interactiveLimitMs = interactiveLimit;
      result.assertions.frameP95Within18ms = !result.frame.skipped && result.frame.p95Ms <= 18;
    }
    if (outFile) {
      const abs = path.resolve(ROOT, outFile);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, `${JSON.stringify(result, null, 2)}\n`);
    }
    console.log(JSON.stringify(result, null, 2));
    if (assertMode && Object.entries(result.assertions).some(([key, value]) => key !== "interactiveLimitMs" && value !== true)) process.exitCode = 1;
  } finally {
    server.close();
  }
}

run()
  .then(() => setTimeout(() => process.exit(process.exitCode || 0), 50))
  .catch((error) => { console.error(error); process.exit(1); });
