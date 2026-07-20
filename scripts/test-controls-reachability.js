/* R65：關鍵控制在各高度都必須可見、可命中、至少 44px，且彼此不重疊。 */
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
  { width: 1920, height: 1080, touch: false },
  { width: 1440, height: 780, touch: false },
  { width: 1366, height: 600, touch: false },
  { width: 1280, height: 640, touch: false },
  { width: 390, height: 844, touch: true },
  { width: 844, height: 390, touch: true },
];

let failures = 0;
function assert(condition, message) {
  if (condition) console.log("  ✓ " + message);
  else { console.error("  ✗ " + message); failures++; }
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const pathname = decodeURIComponent(new URL(req.url, "http://local").pathname);
      const safePath = pathname === "/" ? "/index.html" : pathname;
      const filePath = path.resolve(ROOT, "." + safePath);
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

async function controlAudit(frame, selectors) {
  return frame.evaluate((items) => {
    const controls = items.map((selector) => {
      const el = document.querySelector(selector);
      if (!el) return { selector, exists: false };
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const centerInViewport = x >= 0 && x < innerWidth && y >= 0 && y < innerHeight;
      const hit = centerInViewport ? document.elementFromPoint(x, y) : null;
      return {
        selector,
        exists: true,
        displayed: style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0,
        width: rect.width,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        centerInViewport,
        fullInViewport: rect.left >= -0.5 && rect.top >= -0.5 && rect.right <= innerWidth + 0.5 && rect.bottom <= innerHeight + 0.5,
        hitSelf: !!(hit && (hit === el || el.contains(hit))),
        hitLabel: hit ? `${hit.tagName.toLowerCase()}${hit.id ? "#" + hit.id : ""}${hit.className ? "." + String(hit.className).trim().replace(/\s+/g, ".") : ""}` : "none",
      };
    });
    const overlaps = [];
    for (let i = 0; i < controls.length; i++) {
      for (let j = i + 1; j < controls.length; j++) {
        const a = controls[i];
        const b = controls[j];
        if (!a.displayed || !b.displayed) continue;
        const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (overlapX > 0.5 && overlapY > 0.5) overlaps.push(`${a.selector}×${b.selector}`);
      }
    }
    return { controls, overlaps, innerWidth, innerHeight };
  }, selectors);
}

function assertControlAudit(audit, label) {
  const bad = audit.controls.filter((item) => !item.exists || !item.displayed || item.width < 43.5 || item.height < 43.5
    || !item.centerInViewport || !item.fullInViewport || !item.hitSelf);
  assert(bad.length === 0,
    `${label}：中心/全框在視口、elementFromPoint 命中自身、命中區 ≥44px`
      + (bad.length ? `（${bad.map((item) => `${item.selector}:${Math.round(item.width || 0)}x${Math.round(item.height || 0)}@${Math.round(item.left || 0)},${Math.round(item.top || 0)}-${Math.round(item.right || 0)},${Math.round(item.bottom || 0)} hit=${item.hitSelf}/${item.hitLabel} vp=${audit.innerWidth}x${audit.innerHeight}`).join(", ")}）` : ""));
  assert(audit.overlaps.length === 0,
    `${label}：控制不重疊${audit.overlaps.length ? `（${audit.overlaps.join(", ")}）` : ""}`);
}

async function closeOpenLayers(frame) {
  await frame.evaluate(() => {
    document.getElementById("cardDetail")?.classList.remove("show");
    document.getElementById("kwCodex")?.classList.remove("show");
    document.getElementById("missionDrawer")?.classList.remove("show");
    document.getElementById("chronicleModal")?.classList.remove("show");
    document.getElementById("battleGuide")?.classList.remove("show");
  });
}

async function auditStickyModalClose(frame, open, scrollSelector, closeSelector, label) {
  await open();
  await frame.waitForFunction((selector) => {
    const el = document.querySelector(selector);
    return !!el && getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0;
  }, closeSelector);
  await frame.evaluate((selector) => {
    const scroller = document.querySelector(selector);
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, scrollSelector);
  assertControlAudit(await controlAudit(frame, [closeSelector]), label);
  await frame.locator(closeSelector).click();
}

async function run() {
  let chromium;
  try { ({ chromium } = require("playwright")); }
  catch { console.error("需要 devDependency: playwright"); process.exit(2); }

  const server = await startServer();
  const port = server.address().port;
  const browser = await chromium.launch();
  try {
    const viewportFilter = process.argv[2] || "";
    for (const viewport of VIEWPORTS.filter((item) => !viewportFilter || `${item.width}x${item.height}` === viewportFilter)) {
      const name = `${viewport.width}x${viewport.height} ${viewport.touch ? "touch" : "desktop"}`;
      console.log(`\n== ${name} ==`);
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        hasTouch: viewport.touch,
        isMobile: viewport.touch,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error" && !/favicon|net::ERR/.test(message.text())) errors.push(message.text()); });
      await page.addInitScript(() => { try { localStorage.setItem("cb_guide_done_v1", "1"); } catch {} });
      await page.goto(`http://127.0.0.1:${port}/templates/index.html`, { waitUntil: "domcontentloaded" });
      const shellA11y = await page.evaluate(() => ({
        tablist: document.querySelector(".tabbar")?.getAttribute("role"),
        tabs: [...document.querySelectorAll(".tab")].map((tab) => ({ role: tab.getAttribute("role"), selected: tab.getAttribute("aria-selected"), controls: tab.getAttribute("aria-controls") })),
        swatches: [...document.querySelectorAll(".swatch")].map((swatch) => ({ tag: swatch.tagName.toLowerCase(), label: swatch.getAttribute("aria-label"), pressed: swatch.getAttribute("aria-pressed") })),
      }));
      assert(shellA11y.tablist === "tablist"
        && shellA11y.tabs.length === 2
        && shellA11y.tabs.every((tab) => tab.role === "tab" && tab.controls)
        && shellA11y.swatches.length === 4
        && shellA11y.swatches.every((swatch) => swatch.tag === "button" && swatch.label && swatch.pressed !== null),
        `${name}：入口分頁與主題選項具備 tab/radio 語意`);
      await page.locator('.swatch[data-theme="cyber"]').focus();
      await page.keyboard.press("Enter");
      const themeKeyboard = await page.evaluate(() => ({
        stored: localStorage.getItem("cardgame_theme"),
        pressed: document.querySelector('.swatch[data-theme="cyber"]')?.getAttribute("aria-pressed"),
      }));
      assert(themeKeyboard.stored === "cyber" && themeKeyboard.pressed === "true", `${name}：主題選項可用鍵盤 Enter 切換`);
      await page.locator('.tab[data-target="pack"]').focus();
      await page.keyboard.press("Enter");
      const packTabActive = await page.evaluate(() => document.getElementById("pack")?.classList.contains("active"));
      assert(packTabActive, `${name}：入口 tab 可用鍵盤 Enter 切到卡包`);
      await page.locator('.tab[data-target="battle"]').focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => document.getElementById("battle")?.contentWindow?.__test, { timeout: 30000 });
      const frame = page.frames().find((candidate) => /card-battle\/index\.html/.test(candidate.url()));
      if (!frame) { assert(false, `${name}：找到對戰 iframe`); await context.close(); continue; }
      await frame.waitForFunction(() => window.__test && window.__test.game && window.__controlMode);
      await frame.evaluate(() => document.querySelectorAll(".overlay.show, #battleGuide.show").forEach((el) => el.classList.remove("show")));

      const mode = await frame.evaluate(() => ({ mode: window.__controlMode, root: document.documentElement.dataset.controlMode }));
      assert(mode.mode === (viewport.touch ? "touch" : "desktop") && mode.root === mode.mode,
        `${name}：控制型態由 primary pointer 正確判定為 ${viewport.touch ? "touch" : "desktop"}`);

      const desktopControls = [
        "#settingsToggleBtn", "#hintBtn", "#mulliganBtn", "#endTurnBtn", "#newGameQuickBtn", "#toPackQuickBtn",
        "#guideReplayBtn", "#missionDrawerBtn", "#kwCodexBtn", "#chronicleBtn",
      ];
      const touchControls = ["#settingsToggleBtn", "#hintBtn", "#mulliganBtn", "#endTurnBtn", "#handDrawerToggle", "#moreActionsBtn"];
      assertControlAudit(await controlAudit(frame, viewport.touch ? touchControls : desktopControls), `${name} 主控制`);

      if (viewport.touch) {
        await frame.locator("#handDrawerToggle").click();
        const drawer = await frame.evaluate(() => {
          const hand = document.getElementById("handDrawer").getBoundingClientRect();
          const dock = document.getElementById("commandDock").getBoundingClientRect();
          return { open: document.getElementById("handDrawer").classList.contains("open"), handBottom: hand.bottom, dockTop: dock.top };
        });
        assert(drawer.open && drawer.handBottom <= drawer.dockTop + 0.5,
          `${name}：手牌抽屜展開後停在 Command Dock 上方、不遮主行動`);
        const drawerHint = await frame.evaluate(() => {
          const hint = document.getElementById("hintBtn");
          const style = getComputedStyle(hint);
          const rect = hint.getBoundingClientRect();
          const displayed = style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0
            && rect.width > 0 && rect.height > 0;
          const hit = displayed ? document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) : null;
          return {
            displayed,
            hitSelf: !!(hit && (hit === hint || hint.contains(hit))),
            ariaHidden: hint.getAttribute("aria-hidden"),
            tabIndex: hint.tabIndex,
          };
        });
        assert(drawerHint.displayed ? drawerHint.hitSelf : (drawerHint.ariaHidden === "true" && drawerHint.tabIndex === -1),
          `${name}：抽屜開啟時提示鈕可見即可點，否則明確隱藏並移出焦點序`);
        // R69：抽屜是底部面板、z 高於棋盤層（修 844×390 手牌 0/12 可點 P0）；
        // 展開時允許蓋住棋盤層的 #hintBtn（橫向矮視口幾何重疊），收合即恢復——
        // dock/設定等固定控制仍須全數可命中；抽屜收合狀態的全量 audit 在前面已跑。
        assertControlAudit(await controlAudit(frame, touchControls.filter((selector) => selector !== "#hintBtn")),
          `${name} 抽屜展開主控制`);

        // R69 P0-1 負向斷言：抽屜展開後手牌逐卡＋詳鈕 elementFromPoint 必中自身、真實 click 可出牌。
        // 844×390 曾因 .player-hero-row z-index:75 蓋住抽屜 z70 導致 12 個互動元素 0 命中。
        await frame.evaluate(() => {
          const T = window.__test;
          T.setup([], []);
          const g = T.game();
          g.player.hand = [];
          g.player.mana = g.player.manaMax = 10;
          ["wolf", "knight", "golem", "dragon", "firebolt", "titan"].forEach((id) => T.giveCard(id));
        });
        const handHits = await frame.evaluate(() => {
          const hand = document.getElementById("playerHand");
          const cards = [...document.querySelectorAll("#playerHand .card")];
          let ok = 0;
          let infoTotal = 0;
          let infoOk = 0;
          const misses = [];
          for (const card of cards) {
            // 手牌橫捲：每張先捲到視野中央再打點（scrollIntoView 會被 scroll-snap
            // proximity 彈回、卡半張在視口外——改用 delta 置中 scrollLeft）
            const handRect = hand.getBoundingClientRect();
            const beforeRect = card.getBoundingClientRect();
            hand.scrollLeft += (beforeRect.left + beforeRect.width / 2) - (handRect.left + handRect.width / 2);
            const rect = card.getBoundingClientRect();
            const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
            if (hit && (hit === card || card.contains(hit))) ok++;
            else misses.push(hit ? `${hit.tagName.toLowerCase()}.${String(hit.className).trim().replace(/\s+/g, ".")}` : "none");
            const btn = card.querySelector(".card-info-btn");
            if (btn) {
              infoTotal++;
              const btnRect = btn.getBoundingClientRect();
              const btnHit = document.elementFromPoint(btnRect.left + btnRect.width / 2, btnRect.top + btnRect.height / 2);
              if (btnHit && (btnHit === btn || btn.contains(btnHit))) infoOk++;
            }
          }
          return { total: cards.length, ok, infoTotal, infoOk, misses: misses.slice(0, 3) };
        });
        assert(handHits.total === 6 && handHits.ok === handHits.total && handHits.infoOk === handHits.infoTotal,
          `${name}：抽屜展開手牌逐卡可命中 ${handHits.ok}/${handHits.total}、詳鈕 ${handHits.infoOk}/${handHits.infoTotal}`
            + (handHits.misses.length ? `（蓋住者：${handHits.misses.join(", ")}）` : ""));
        await frame.locator('#playerHand .card[data-card-id="wolf"]').click();
        await frame.waitForFunction(() => !!document.querySelector('#playerField .card[data-card-id="wolf"]'));
        assert(true, `${name}：真實 click 抽屜手牌可出牌`);

        if (viewport.width === 844 && viewport.height === 390) {
          await frame.evaluate(() => {
            window.__test.closeDetail();
            window.__test.setup(["wolf"], []);
          });
          const centerGeometry = await frame.locator('#playerField .card[data-card-id="wolf"]').evaluate((card) => {
            const cardRect = card.getBoundingClientRect();
            const infoRect = card.querySelector(".card-info-btn").getBoundingClientRect();
            const x = cardRect.left + cardRect.width / 2;
            const y = cardRect.top + cardRect.height / 2;
            return {
              cardWidth: cardRect.width,
              cardHeight: cardRect.height,
              centerInsideInfo: x >= infoRect.left && x <= infoRect.right && y >= infoRect.top && y <= infoRect.bottom,
            };
          });
          const fieldCard = frame.locator('#playerField .card[data-card-id="wolf"]');
          const fieldBox = await fieldCard.boundingBox();
          await fieldCard.click({ position: { x: fieldBox.width / 2, y: fieldBox.height / 2 } });
          const centerAction = await frame.evaluate(() => ({
            selected: !!window.__test.game().selected,
            detail: window.__test.detailOpen(),
          }));
          assert(!centerGeometry.centerInsideInfo && centerAction.selected && !centerAction.detail,
            `${name}：66×86 場上卡中心真實 tap 選攻擊者，不誤開詳情`);
          await frame.locator('#playerField .card[data-card-id="wolf"] .card-info-btn').click();
          await frame.waitForFunction(() => window.__test.detailOpen());
          assert(true, `${name}：右上 32×32 明確小區仍可真實開啟卡牌詳情`);
          await frame.locator("#cardDetailClose").click();
        }

        // R69.1 Z-DRAWER-01：抽屜開啟時，結算 overlay（z100）必須壓過抽屜（z76）——
        // 打開 overlay 後在手牌區中心打點，命中不得落入抽屜層。
        if (!(await frame.evaluate(() => document.getElementById("handDrawer")?.classList.contains("open")))) {
          await frame.locator("#handDrawerToggle").click();
        }
        const overlayOverDrawer = await frame.evaluate(() => {
          const overlay = document.getElementById("overlay");
          const drawer = document.getElementById("handDrawer");
          const hand = document.getElementById("playerHand");
          overlay.classList.add("show", "win");
          const handRect = hand.getBoundingClientRect();
          const hit = document.elementFromPoint(handRect.left + handRect.width / 2, handRect.top + handRect.height / 2);
          const result = {
            open: drawer.classList.contains("open"),
            overlayZ: parseInt(getComputedStyle(overlay).zIndex, 10) || 0,
            drawerZ: parseInt(getComputedStyle(drawer).zIndex, 10) || 0,
            hitInOverlay: !!(hit && overlay.contains(hit)),
            hitInDrawer: !!(hit && drawer.contains(hit)),
          };
          overlay.classList.remove("show", "win");
          return result;
        });
        assert(overlayOverDrawer.open && overlayOverDrawer.overlayZ > overlayOverDrawer.drawerZ
          && overlayOverDrawer.hitInOverlay && !overlayOverDrawer.hitInDrawer,
          `${name}：抽屜開啟時結算 overlay 壓過抽屜（z ${overlayOverDrawer.overlayZ}>${overlayOverDrawer.drawerZ}、手牌區命中 overlay 層）`);

        await frame.evaluate(() => {
          const T = window.__test;
          T.setup([], []);
          T.game().player.hand = [];
        });
        if (await frame.evaluate(() => document.getElementById("handDrawer")?.classList.contains("open"))) {
          await frame.locator("#handDrawerToggle").click();
        }

        await frame.locator("#moreActionsBtn").click();
        assertControlAudit(await controlAudit(frame, [
          "#moreActionsBtn", "#newGameBtn", "#toPackBtn", "#guideReplayBtn", "#missionDrawerBtn", "#kwCodexBtn", "#chronicleBtn",
        ]), `${name} 更多面板`);
        await frame.locator("#moreActionsBtn").click();
      } else {
        const mobileOnly = await frame.evaluate(() => ["#handDrawerToggle", "#moreActionsBtn"].map((selector) => {
          const el = document.querySelector(selector);
          return { selector, display: el ? getComputedStyle(el).display : "missing", width: el ? el.getBoundingClientRect().width : -1 };
        }));
        assert(mobileOnly.every((item) => item.display === "none" && item.width === 0),
          `${name}：非觸控桌機不顯示手機專屬手牌把手／更多控制`);
      }

      // R69.1 HIT-PSEUDO-01：偽元素擴命中區閉環抽樣——英雄（攻擊目標）在視覺框
      // 「外緣但 44px 擴張區內」的點必須解析回宿主，且無 overflow 祖先把擴張區裁掉。
      const pseudoHero = await frame.evaluate(() => {
        window.__samplePseudoHit = (el) => {
          // 抽樣規則：外緣點須命中宿主。overflow:hidden 祖先把點排除＝靜態裁切
          // 缺陷（硬失敗）；捲動殼（auto/scroll）或視口邊界排除＝該側幾何上無從
          // 擴張（螢幕外），豁免該側——但至少一側必須可用且命中。
          if (!el) return { skip: false, ok: false, reason: "missing", detail: "硬失敗(missing)" };
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0
            || rect.width < 1 || rect.height < 1) {
            return { skip: false, ok: false, reason: "hidden", detail: "硬失敗(hidden)", height: Math.round(rect.height), pad: 0 };
          }
          if (rect.height >= 43.5) return { skip: true, reason: "tall-enough" };
          // 取視覺框與 44px 外界之間的中點，保證點在框外、也嚴格落在 ::after 內。
          const pad = Math.min(Math.max((44 - rect.height) / 4, 0.25), 6);
          const points = [
            [rect.left + rect.width / 2, rect.top - pad],
            [rect.left + rect.width / 2, rect.bottom + pad],
          ];
          const evals = points.map(([x, y]) => {
            if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return { available: false, why: "viewport-edge" };
            let anc = el.parentElement;
            while (anc && anc !== document.body) {
              const acs = getComputedStyle(anc);
              const ar = anc.getBoundingClientRect();
              const outsideX = x < ar.left - 0.5 || x > ar.right + 0.5;
              const outsideY = y < ar.top - 0.5 || y > ar.bottom + 0.5;
              const xHardClip = outsideX && /^(hidden|clip)$/.test(acs.overflowX);
              const yHardClip = outsideY && /^(hidden|clip)$/.test(acs.overflowY);
              const xScrollEdge = outsideX && /^(auto|scroll)$/.test(acs.overflowX);
              const yScrollEdge = outsideY && /^(auto|scroll)$/.test(acs.overflowY);
              if (xHardClip || yHardClip) {
                const name = anc.id ? `#${anc.id}` : `.${String(anc.className).trim().replace(/\s+/g, ".").slice(0, 36)}`;
                const axes = `${xHardClip ? "x" : ""}${yHardClip ? "y" : ""}`;
                return { available: true, ok: false, hit: `hidden-clip-${axes}:${name}` };
              }
              if (xScrollEdge || yScrollEdge) {
                const name = anc.id ? `#${anc.id}` : `.${String(anc.className).trim().replace(/\s+/g, ".").slice(0, 36)}`;
                const axes = `${xScrollEdge ? "x" : ""}${yScrollEdge ? "y" : ""}`;
                return { available: false, why: `scrollport-edge-${axes}:${name}` };
              }
              anc = anc.parentElement;
            }
            const hit = document.elementFromPoint(x, y);
            const sameLabel = !!(hit && el.closest("label") && el.closest("label") === hit.closest("label"));
            return { available: true, ok: !!(hit && (hit === el || el.contains(hit) || sameLabel)), hit: hit ? `${hit.tagName.toLowerCase()}.${String(hit.className).trim().replace(/\s+/g, ".").slice(0, 36)}` : "none" };
          });
          const usable = evals.filter((e) => e.available);
          return {
            skip: false,
            ok: usable.length >= 1 && usable.every((e) => e.ok),
            detail: evals.map((e) => (e.available ? `${e.ok ? "✓" : "✗"}${e.hit}` : `豁免(${e.why})`)).join("|"),
            height: Math.round(rect.height), pad,
          };
        };
        return { enemyHero: window.__samplePseudoHit(document.getElementById("enemyHero")), playerHero: window.__samplePseudoHit(document.getElementById("playerHero")) };
      });
      for (const [who, data] of Object.entries(pseudoHero)) {
        if (data.skip) { assert(true, `${name}：${who} 免偽元素擴張抽樣（${data.reason}）`); continue; }
        assert(data.ok, `${name}：${who} 偽元素擴命中閉環 h=${data.height} pad=${data.pad}（${data.detail}）`);
      }

      await frame.locator("#settingsToggleBtn").click();
      const settings = await frame.evaluate(() => {
        const panel = document.getElementById("settingsPanel");
        const rect = panel.getBoundingClientRect();
        return {
          open: panel.classList.contains("show"),
          fullInViewport: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
        };
      });
      assert(settings.open && settings.fullInViewport, `${name}：設定面板完整留在視口內`);
      assertControlAudit(await controlAudit(frame, ["#settingsToggleBtn"]), `${name} 設定關閉鈕`);
      await frame.locator("#settingsToggleBtn").click();

      await frame.evaluate(() => {
        const T = window.__test;
        T.setup([], []);
        const g = T.game();
        g.player.hand = [];
        g.player.mana = g.player.manaMax = 10;
        T.giveCard("wolf");
      });
      const handA11y = await frame.evaluate(() => {
        const card = document.querySelector('#playerHand .card[data-card-id="wolf"]');
        return { role: card?.getAttribute("role"), tabIndex: card?.tabIndex, label: card?.getAttribute("aria-label") || "" };
      });
      assert(handA11y.role === "button" && handA11y.tabIndex === 0 && /迅捷狼/.test(handA11y.label),
        `${name}：手牌卡有語意、焦點與可讀名稱`);
      if (viewport.touch) await frame.locator("#handDrawerToggle").click();
      await frame.locator('#playerHand .card[data-card-id="wolf"]').focus();
      await frame.locator('#playerHand .card[data-card-id="wolf"]').press("Enter");
      await frame.waitForFunction(() => !!document.querySelector('#playerField .card[data-card-id="wolf"]'));
      const fieldA11y = await frame.evaluate(() => {
        const card = document.querySelector('#playerField .card[data-card-id="wolf"]');
        const hero = document.getElementById("enemyHero");
        return {
          cardRole: card?.getAttribute("role"),
          cardLabel: card?.getAttribute("aria-label") || "",
          heroRole: hero?.getAttribute("role"),
          heroLabel: hero?.getAttribute("aria-label") || "",
        };
      });
      assert(fieldA11y.cardRole === "button" && /攻擊者/.test(fieldA11y.cardLabel)
        && fieldA11y.heroRole === "button" && /敵方英雄/.test(fieldA11y.heroLabel),
        `${name}：場上卡與英雄有語意和操作提示`);
      await frame.locator('#playerField .card[data-card-id="wolf"]').focus();
      await frame.locator('#playerField .card[data-card-id="wolf"]').press(" ");
      await frame.locator("#enemyHero").focus();
      await frame.locator("#enemyHero").press("Enter");
      await frame.waitForFunction(() => window.__test.game().enemy.hp < window.__test.game().enemy.maxHp);
      assert(true, `${name}：鍵盤可完成手牌出牌、選攻擊者與攻擊敵方英雄`);

      await frame.evaluate(() => {
        const T = window.__test;
        T.setup([], ["footman"]);
        const game = T.game();
        game.player.hand = [];
        game.player.mana = game.player.manaMax = 10;
        const spellUid = T.giveCard("firebolt");
        T.playFromHand(spellUid);
        document.querySelector("#enemyField .card")?.click();
      });
      assertControlAudit(await controlAudit(frame, [".target-action-popover .confirm", ".target-action-popover .cancel"]), `${name} 就地目標確認/取消`);
      await frame.locator(".target-action-popover .cancel").click();

      await frame.evaluate(() => {
        const T = window.__test;
        T.setup([], []);
        T.game().player.hand = [];
        T.giveCard("footman");
        document.querySelector("#playerHand .card-info-btn")?.click();
      });
      await auditStickyModalClose(frame, async () => {}, ".card-detail-card", "#cardDetailClose", `${name} 卡牌詳情 sticky 關閉`);

      await auditStickyModalClose(frame,
        async () => { await frame.evaluate(() => document.getElementById("kwCodexBtn")?.click()); },
        ".kw-codex-card", "#kwCodexClose", `${name} 關鍵字 modal sticky 關閉`);
      await auditStickyModalClose(frame,
        async () => { await frame.evaluate(() => window.__test.openMissionDrawer()); },
        ".mission-card", "#missionDrawerClose", `${name} 任務 modal sticky 關閉`);
      await auditStickyModalClose(frame,
        async () => { await frame.evaluate(() => window.__test.openChronicle()); },
        ".chronicle-card", "#chronicleClose", `${name} 編年史 modal sticky 關閉`);

      await frame.evaluate(() => window.__test.startGuide());
      assertControlAudit(await controlAudit(frame, ["#guideSkipBtn", "#guideHintBtn"]), `${name} 導引確認/取消`);
      await frame.locator("#guideSkipBtn").click();
      await closeOpenLayers(frame);

      const pageScroll = await frame.evaluate(() => ({ y: scrollY, overflow: document.documentElement.scrollHeight - innerHeight }));
      assert(pageScroll.y === 0 && pageScroll.overflow <= 8, `${name}：不需頁面捲動即可操作`);
      await page.locator('.tab[data-target="pack"]').click();
      const packFrame = page.frames().find((candidate) => /card-pack\/index\.html/.test(candidate.url()));
      if (!packFrame) {
        assert(false, `${name}：找到卡包 iframe`);
      } else {
        await packFrame.waitForFunction(() => window.__deckTest && document.getElementById("pack"));
        await packFrame.evaluate(() => {
          localStorage.setItem("card_stats_v1", JSON.stringify({ version: 3, wins: 0, losses: 0, streak: 0, lossStreak: 0, bestStreak: 0, coins: 200, packsOpened: 0 }));
        });
        const packA11y = await packFrame.evaluate(() => {
          const pack = document.getElementById("pack");
          return { role: pack?.getAttribute("role"), tabIndex: pack?.tabIndex, label: pack?.getAttribute("aria-label") || "" };
        });
        assert(packA11y.role === "button" && packA11y.tabIndex === 0 && /卡包/.test(packA11y.label),
          `${name}：牌包本體有語意、焦點與可讀名稱`);
        await packFrame.locator("#missionDrawerBtn").focus();
        const packTabSequence = [];
        for (let i = 0; i < 3; i++) {
          await page.keyboard.press("Tab");
          packTabSequence.push(await packFrame.evaluate(() => document.activeElement?.id || ""));
        }
        assert(packTabSequence[2] === "pack" && !packTabSequence.includes("copyRecordBtn") && !packTabSequence.includes("packPwaCheckBtn"),
          `${name}：神祕卡包 CTA 依視覺格線在第 4 個焦點內，早於戰績／維護工具（${packTabSequence.join(" → ")}）`);
        await packFrame.locator("#pack").focus();
        await packFrame.locator("#pack").press("Enter");
        await packFrame.waitForFunction(() => document.querySelectorAll("#revealRow .card").length === 5);
        assert(true, `${name}：牌包可用鍵盤 Enter 開啟`);

        // R69.1 HIT-CHIP-01：filter-chip 偽元素擴命中區閉環抽樣——
        // 視覺框外緣、44px 區內的點必須解析回 chip；且無 overflow 祖先把擴張區裁掉。
        const chipSamples = await packFrame.evaluate(() => {
          // 與 battle 側 __samplePseudoHit 同規則（pack 是另一個 frame，內聯一份）：
          // hidden 祖先排除＝硬失敗；捲動殼/視口邊界排除＝豁免該側；至少一側可用且命中。
          const sample = (el) => {
            if (!el) return { skip: false, ok: false, reason: "missing", detail: "硬失敗(missing)" };
            const rect = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0
              || rect.width < 1 || rect.height < 1) {
              return { skip: false, ok: false, reason: "hidden", detail: "硬失敗(hidden)", height: Math.round(rect.height), pad: 0 };
            }
            if (rect.height >= 43.5) return { skip: true, reason: "tall-enough" };
            // 取視覺框與 44px 外界之間的中點，保證點在框外、也嚴格落在 ::after 內。
            const pad = Math.min(Math.max((44 - rect.height) / 4, 0.25), 6);
            const points = [
              [rect.left + rect.width / 2, rect.top - pad],
              [rect.left + rect.width / 2, rect.bottom + pad],
            ];
            const evals = points.map(([x, y]) => {
              if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return { available: false, why: "viewport-edge" };
              let anc = el.parentElement;
              while (anc && anc !== document.body) {
                const acs = getComputedStyle(anc);
                const ar = anc.getBoundingClientRect();
                const outsideX = x < ar.left - 0.5 || x > ar.right + 0.5;
                const outsideY = y < ar.top - 0.5 || y > ar.bottom + 0.5;
                const xHardClip = outsideX && /^(hidden|clip)$/.test(acs.overflowX);
                const yHardClip = outsideY && /^(hidden|clip)$/.test(acs.overflowY);
                const xScrollEdge = outsideX && /^(auto|scroll)$/.test(acs.overflowX);
                const yScrollEdge = outsideY && /^(auto|scroll)$/.test(acs.overflowY);
                if (xHardClip || yHardClip) {
                  const cname = anc.id ? `#${anc.id}` : `.${String(anc.className).trim().replace(/\s+/g, ".").slice(0, 36)}`;
                  const axes = `${xHardClip ? "x" : ""}${yHardClip ? "y" : ""}`;
                  return { available: true, ok: false, hit: `hidden-clip-${axes}:${cname}` };
                }
                if (xScrollEdge || yScrollEdge) {
                  const cname = anc.id ? `#${anc.id}` : `.${String(anc.className).trim().replace(/\s+/g, ".").slice(0, 36)}`;
                  const axes = `${xScrollEdge ? "x" : ""}${yScrollEdge ? "y" : ""}`;
                  return { available: false, why: `scrollport-edge-${axes}:${cname}` };
                }
                anc = anc.parentElement;
              }
              const hit = document.elementFromPoint(x, y);
              const sameLabel = !!(hit && el.closest("label") && el.closest("label") === hit.closest("label"));
              return { available: true, ok: !!(hit && (hit === el || el.contains(hit) || sameLabel)), hit: hit ? `${hit.tagName.toLowerCase()}.${String(hit.className).trim().replace(/\s+/g, ".").slice(0, 36)}` : "none" };
            });
            const usable = evals.filter((e) => e.available);
            return {
              skip: false,
              ok: usable.length >= 1 && usable.every((e) => e.ok),
              detail: evals.map((e) => (e.available ? `${e.ok ? "✓" : "✗"}${e.hit}` : `豁免(${e.why})`)).join("|"),
              height: Math.round(rect.height), pad,
            };
          };
          const pick = (selector) => {
            const el = document.querySelector(selector);
            if (el) {
              // 844×390 的收藏篩選預設收合；先走真實可展開狀態再抽樣。
              // 若展開後仍不可見，sample 會依 hidden 硬失敗，不能用 skip 洗掉。
              const details = el.closest("details");
              if (details) details.open = true;
              const row = el.closest(".filter-chip-row");
              if (row) row.scrollLeft = 0;
              el.scrollIntoView({ block: "center", inline: "nearest" });
            }
            return sample(el);
          };
          return {
            collectionChip: pick("#collectionAxisFilter .filter-chip"),
            deckChip: pick("#deckCostFilter .filter-chip"),
          };
        });
        for (const [which, data] of Object.entries(chipSamples)) {
          if (data.skip) { assert(true, `${name}：${which} 免偽元素擴張抽樣（${data.reason}）`); continue; }
          assert(data.ok, `${name}：${which} 偽元素擴命中閉環 h=${data.height} pad=${data.pad}（${data.detail}）`);
        }
      }
      assert(errors.length === 0, `${name}：無 console/page error${errors.length ? `（${errors.slice(0, 2).join(" | ")}）` : ""}`);
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
    if (typeof server.closeAllConnections === "function") server.closeAllConnections();
  }

  if (failures) {
    console.error(`\n❌ R65 控制可達性守門失敗：${failures} 項`);
    process.exit(1);
  }
  console.log("\n✅ R65 控制可達性守門通過");
}

run().catch((error) => { console.error(error); process.exit(1); });
