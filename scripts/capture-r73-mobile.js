const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
      const p = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!p.startsWith(root + path.sep) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404).end(); return; }
      const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
      res.setHeader('Content-Type', mime[path.extname(p)] || 'application/octet-stream');
      fs.createReadStream(p).pipe(res);
    }).listen(0, '127.0.0.1', () => resolve(server));
  });
}
async function open(browser, base, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 1000, isMobile: width < 1000, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('cb_guide_done_v1', '1'));
  await page.goto(base + '/templates/card-battle/index.html?intro=0');
  await page.waitForFunction(() => window.__test?.game());
  return { context, page };
}
async function capture() {
  const phase = process.argv[2] || 'after';
  const dir = path.join(root, 'docs/evidence/r73-mobile', phase);
  fs.mkdirSync(dir, { recursive: true });
  const server = await serve();
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    for (const [width, height] of [[390, 844], [844, 390], [1366, 600]]) {
      const { context, page } = await open(browser, `http://127.0.0.1:${server.address().port}`, width, height);
      page.on('pageerror', e => errors.push(e.message));
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(dir, `battle-${width}x${height}.png`) });
      if (width < 1000) await page.locator('#handDrawerToggle').click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(dir, `hand-${width}x${height}.png`) });
      if (phase === 'after') {
        if (width < 1000) {
          await page.locator('#playerHand .card').first().tap({ position: { x: 25, y: 65 } });
          await page.screenshot({ path: path.join(dir, `preview-${width}x${height}.png`) });
          await page.locator('#handCancelBtn').click();
        }
        if (width < 1000) await page.locator('#moreActionsBtn').click();
        await page.locator('#voyageBtn').click();
        await page.screenshot({ path: path.join(dir, `voyage-${width}x${height}.png`) });
      }
      await context.close();
    }
    fs.writeFileSync(path.join(dir, 'page-errors.json'), JSON.stringify(errors, null, 2));
    if (errors.length) throw new Error(errors.join('\n'));
  } finally { await browser.close(); await new Promise(r => server.close(r)); }
}
module.exports = { serve, open };
if (require.main === module) capture().catch(e => { console.error(e); process.exitCode = 1; });
