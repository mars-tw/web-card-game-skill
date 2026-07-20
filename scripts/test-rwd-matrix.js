/* =========================================================================
 * test-rwd-matrix.js — R65/R70 RWD 十一視口矩陣守門（真瀏覽器）
 *
 * 驗收標準（每頁 × 每視口都必須成立）：
 *   1. 所有可互動元素（button/select/input/textarea/a[href]/[role=button]/[onclick]）
 *      必須「完整在視口內」，或可經捲動鏈「真實抵達」。
 *      R69.1 RWD-CHAIN-01 收緊：幾何「鏈上任一可捲容器完整可見」只是前置過濾，
 *      不能當結論——每個候選一律實際 scrollIntoView({block:'nearest'}) 後以
 *      elementFromPoint 驗中心命中自身（含 label 包裹的冒泡等效），命不中判
 *      SCROLL_HIT_FAIL。近端 scrollport 被裁切時，外殼可見也不會假綠。
 *   2. 頁級捲動歸零：documentElement.scrollHeight <= innerHeight + 8。
 *   3. 水平溢出 <= 2px。
 *
 * 前置步驟：教學／導覽 overlay 於載入前以 localStorage 關閉、載入後再保險移除。
 * 執行：node scripts/test-rwd-matrix.js   （需 devDependency: playwright）
 * ========================================================================= */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MIME = {
  ".html": "text/html", ".js": "application/javascript", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".png": "image/png", ".css": "text/css",
  ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp",
};

const VIEWPORTS = [
  { w: 1920, h: 1080, kind: "desktop" },
  { w: 1440, h: 780, kind: "desktop" },
  { w: 1366, h: 768, kind: "desktop" },
  { w: 1366, h: 600, kind: "desktop" },
  { w: 1280, h: 640, kind: "desktop" },
  { w: 1024, h: 768, kind: "desktop" },
  { w: 820, h: 1180, kind: "tablet" },
  { w: 390, h: 844, kind: "mobile" },
  { w: 360, h: 640, kind: "mobile" },
  { w: 320, h: 568, kind: "mobile-short" },
  { w: 844, h: 390, kind: "landscape" },
];

const PAGES = [
  { name: "shell", url: "templates/index.html" },
  { name: "card-battle", url: "templates/card-battle/index.html" },
  { name: "card-pack", url: "templates/card-pack/index.html" },
];

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const pathname = decodeURIComponent(new URL(req.url, "http://local").pathname);
      const safePath = pathname === "/" ? "/index.html" : pathname;
      const fp = path.resolve(ROOT, "." + safePath);
      const rel = path.relative(ROOT, fp);
      if (rel.startsWith("..") || path.isAbsolute(rel) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
        res.writeHead(404); res.end(); return;
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(fp)] || "application/octet-stream" });
      fs.createReadStream(fp).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function auditPage(page) {
  return page.evaluate(() => {
    const tol = 2;
    const iw = window.innerWidth;
    const ih = window.innerHeight;
    const els = [...document.querySelectorAll('button, select, input, textarea, a[href], [role="button"], [onclick]')];
    const violations = [];
    const seen = new Set();
    for (const el of els) {
      if (seen.has(el)) continue;
      seen.add(el);
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || el.disabled) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (+cs.opacity === 0) continue;
      let anc = el.parentElement;
      let hidden = false;
      const scrollHosts = [];
      while (anc && anc !== document.body) {
        const acs = getComputedStyle(anc);
        if (acs.display === "none" || acs.visibility === "hidden" || +acs.opacity === 0) { hidden = true; break; }
        if (
          (/(auto|scroll)/.test(acs.overflowY) && anc.scrollHeight > anc.clientHeight + 4)
          || (/(auto|scroll)/.test(acs.overflowX) && anc.scrollWidth > anc.clientWidth + 4)
        ) scrollHosts.push(anc);
        anc = anc.parentElement;
      }
      if (hidden) continue;
      const scrollHost = scrollHosts[0] || null;
      const inVp = r.top >= -tol && r.left >= -tol && r.bottom <= ih + tol && r.right <= iw + tol;
      const label = (el.id ? "#" + el.id : "")
        || (el.getAttribute("aria-label") || el.textContent || el.className || el.tagName).toString().trim().slice(0, 28);
      let status;
      let hitLabel = "";
      if (inVp) status = "OK";
      else if (scrollHosts.length) {
        // R69.1 RWD-CHAIN-01：幾何鏈判定僅為「前置過濾」——鏈上任一可捲容器完整可見
        // 才有資格進功能性驗證；結論一律由「實捲＋命中」決定，防近端 scrollport
        // 被裁切時外殼可見的假綠。
        const hostVisible = scrollHosts.some((host) => {
          const hr = host.getBoundingClientRect();
          return hr.top >= -tol && hr.bottom <= ih + tol && hr.left >= -tol && hr.right <= iw + tol;
        });
        if (!hostVisible) status = "PAGE_SCROLL";
        else {
          // 功能性驗證：scrollIntoView 會沿捲動鏈把元素真的帶進視野；
          // 之後中心點 elementFromPoint 必須解析到自身/子孫，或（input 包在
          // label 內時）解析到同一個 label 宿主——點該處會冒泡觸發同一控制。
          el.scrollIntoView({ block: "nearest", inline: "nearest" });
          const r2 = el.getBoundingClientRect();
          const cx = r2.left + r2.width / 2;
          const cy = r2.top + r2.height / 2;
          const hit = (cx >= 0 && cx < iw && cy >= 0 && cy < ih) ? document.elementFromPoint(cx, cy) : null;
          const sameLabel = !!(hit && el.closest("label") && el.closest("label") === hit.closest("label"));
          const hitOk = !!(hit && (hit === el || el.contains(hit) || sameLabel));
          if (hitOk) status = "SCROLLABLE_OK";
          else {
            status = "SCROLL_HIT_FAIL";
            hitLabel = hit ? `${hit.tagName.toLowerCase()}${hit.id ? "#" + hit.id : ""}.${String(hit.className).trim().replace(/\s+/g, ".").slice(0, 40)}` : "none";
          }
        }
      } else status = (r.top >= ih || r.bottom <= 0) ? "PAGE_SCROLL" : "CLIPPED";
      if (status !== "OK" && status !== "SCROLLABLE_OK") {
        const hostRect = scrollHost ? scrollHost.getBoundingClientRect() : null;
        violations.push({
          label, status, hit: hitLabel,
          top: Math.round(r.top), bottom: Math.round(r.bottom),
          left: Math.round(r.left), right: Math.round(r.right),
          scrollHost: scrollHost ? (scrollHost.id ? "#" + scrollHost.id : "." + String(scrollHost.className || scrollHost.tagName).trim().replace(/\s+/g, ".")) : "",
          hostTop: hostRect ? Math.round(hostRect.top) : 0,
          hostBottom: hostRect ? Math.round(hostRect.bottom) : 0,
        });
      }
    }
    return {
      violations,
      pageScrollY: Math.max(0, document.documentElement.scrollHeight - ih),
      overflowX: Math.max(0, document.documentElement.scrollWidth - iw),
      audited: seen.size,
    };
  });
}

async function run() {
  let chromium;
  try { ({ chromium } = require("playwright")); }
  catch { console.error("需要 devDependency: playwright"); process.exit(2); }

  const server = await startServer();
  const port = server.address().port;
  const browser = await chromium.launch();
  let failures = 0;
  let checks = 0;

  const safeAreaFiles = ["index.html", "templates/index.html", "templates/card-battle/index.html", "templates/card-pack/index.html"];
  const safeAreaText = safeAreaFiles.map((file) => fs.readFileSync(path.join(ROOT, file), "utf8"));
  if (!safeAreaText.every((text) => /viewport-fit=cover/.test(text))
    || !safeAreaText.slice(1).every((text) => /env\(safe-area-inset-bottom/.test(text))) {
    throw new Error("viewport-fit=cover / safe-area-inset-bottom 未同步到全模板");
  }

  try {
    const pageFilter = process.argv[2] || "";
    const viewportFilter = process.argv[3] || "";
    for (const pg of PAGES.filter((item) => !pageFilter || item.name === pageFilter)) {
      console.log(`\n== ${pg.name} ==`);
      for (const vp of VIEWPORTS.filter((item) => !viewportFilter || `${item.w}x${item.h}` === viewportFilter)) {
        const isTouch = vp.kind === "mobile" || vp.kind === "mobile-short" || vp.kind === "landscape";
        const ctx = await browser.newContext({
          viewport: { width: vp.w, height: vp.h },
          hasTouch: isTouch,
          isMobile: isTouch,
        });
        const page = await ctx.newPage();
        // 前置：關閉首次教學／導覽 overlay（載入前旗標 + 載入後保險移除）
        await page.addInitScript(() => {
          try { localStorage.setItem("cb_guide_done_v1", "1"); } catch {}
        });
        await page.goto(`http://127.0.0.1:${port}/${pg.url}`, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(1200);
        await page.evaluate(() => {
          document.querySelectorAll(".overlay.show, #battleGuide.show, .battle-guide.show").forEach((el) => el.classList.remove("show"));
        }).catch(() => {});
        await page.waitForTimeout(300);

        const res = await auditPage(page);
        if (pg.name === "shell" && isTouch) {
          const battleFrame = page.frames().find((frame) => /card-battle\/index\.html/.test(frame.url()));
          if (battleFrame) {
            const child = await auditPage(battleFrame);
            res.violations.push(...child.violations.map((v) => ({ ...v, label: `iframe ${v.label}` })));
            res.overflowX = Math.max(res.overflowX, child.overflowX);
          }
        }
        if (pg.name === "card-battle" && isTouch) {
          const mobileFlow = await page.evaluate(async () => {
            const fields = [...document.querySelectorAll(".battlefield")];
            const combinedHeight = fields.reduce((sum, el) => sum + el.getBoundingClientRect().height, 0);
            const drawer = document.getElementById("handDrawer");
            const toggle = document.getElementById("handDrawerToggle");
            toggle.click();
            const open = drawer.classList.contains("open") && toggle.getAttribute("aria-expanded") === "true";
            toggle.click();
            const closed = !drawer.classList.contains("open") && toggle.getAttribute("aria-expanded") === "false";
            window.__test.setup(["wolf"], ["wolf"]);
            const attacker = document.querySelector("#playerField .card");
            const target = document.querySelector("#enemyField .card");
            const before = window.__test.game().enemy.field[0].health;
            const visible = [attacker, target].every((el) => {
              const r = el.getBoundingClientRect();
              return r.top >= 0 && r.bottom <= innerHeight;
            });
            attacker.click();
            const selected = attacker.classList.contains("selected") || !!window.__test.game().selected;
            target.click();
            await new Promise((resolve) => setTimeout(resolve, 240));
            const attacked = window.__test.game().enemy.field[0]?.health < before || window.__test.game().enemy.field.length === 0;
            return { combinedHeight, viewportHeight: innerHeight, open, closed, visible, selected, attacked };
          });
          const minBattlefieldRatio = vp.kind === "landscape" ? .32 : .42;
          if (mobileFlow.combinedHeight + 1 < mobileFlow.viewportHeight * minBattlefieldRatio
            || !mobileFlow.open || !mobileFlow.closed || !mobileFlow.visible || !mobileFlow.selected || !mobileFlow.attacked) {
            res.violations.push({ label: "手機攻擊同屏／手牌抽屜／44dvh", status: "FLOW", top: 0, bottom: 0, left: 0, right: 0 });
          }
        }
        if (pg.name === "card-pack" && new Set(["390x844", "844x390", "1366x768"]).has(`${vp.w}x${vp.h}`)) {
          await page.evaluate(() => {
            const panel = document.querySelector("#collectionTools .filter-panel");
            if (panel) panel.open = true;
            document.getElementById("collectionTools")?.scrollIntoView({ block: "center", inline: "nearest" });
          });
          const filterGeometry = await page.evaluate(() => {
            const board = document.querySelector("#collectionTools .filter-chip-board");
            const owned = document.querySelector('#collectionOwnershipFilter .filter-chip[data-value="owned"]');
            if (!board || !owned) return { exists: false };
            board.scrollLeft = 0;
            const boardRect = board.getBoundingClientRect();
            const ownedRect = owned.getBoundingClientRect();
            return {
              exists: true,
              boardClientWidth: board.clientWidth,
              boardScrollWidth: board.scrollWidth,
              ownedInBoardX: ownedRect.left >= boardRect.left - 1 && ownedRect.right <= boardRect.right + 1,
            };
          });
          let clicked = false;
          try {
            await page.locator('#collectionOwnershipFilter .filter-chip[data-value="owned"]').click();
            clicked = await page.evaluate(() => {
              const group = document.getElementById("collectionOwnershipFilter");
              const owned = group?.querySelector('.filter-chip[data-value="owned"]');
              return group?.dataset.value === "owned" && owned?.getAttribute("aria-pressed") === "true";
            });
          } catch {}
          if (!filterGeometry.exists || filterGeometry.boardScrollWidth > filterGeometry.boardClientWidth + 2
            || !filterGeometry.ownedInBoardX || !clicked) {
            res.violations.push({
              label: "R70 收藏篩選分組／已擁有真實點擊",
              status: "FILTER_FLOW",
              top: 0,
              bottom: 0,
              left: 0,
              right: Math.max(0, (filterGeometry.boardScrollWidth || 0) - (filterGeometry.boardClientWidth || 0)),
            });
          }
        }
        const bad = res.violations.length > 0 || res.pageScrollY > 8 || res.overflowX > 2;
        checks++;
        if (bad) {
          failures++;
          console.error(`  ✗ ${vp.w}x${vp.h} 違規 ${res.violations.length}、頁捲 ${res.pageScrollY}px、水平溢出 ${res.overflowX}px（稽核 ${res.audited} 元素）`);
          for (const v of res.violations.slice(0, 12)) {
            console.error(`      ${v.status} ${v.label} top=${v.top} bottom=${v.bottom} left=${v.left} right=${v.right}`
              + (v.scrollHost ? ` host=${v.scrollHost}(${v.hostTop}-${v.hostBottom})` : "")
              + (v.hit ? ` hit=${v.hit}` : ""));
          }
        } else {
          console.log(`  ✓ ${vp.w}x${vp.h} 零違規（頁捲 ${res.pageScrollY}px、水平溢出 ${res.overflowX}px、稽核 ${res.audited} 元素）`);
        }
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
  }

  if (failures > 0) {
    console.error(`\n❌ RWD 矩陣守門失敗：${failures}/${checks} 個 頁面×視口 有違規`);
    process.exit(1);
  }
  console.log(`\n✅ RWD 十一視口矩陣守門通過（${checks} 個 頁面×視口 全數零違規）`);
}

run().catch((err) => { console.error(err); process.exit(1); });
