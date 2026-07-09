/* =========================================================================
 * pack.js — 抽牌 / 卡包機制 v2
 *   - 重複機制：抽到已有的卡標「重複」，不計新收集（提高收集難度）。
 *   - 閃卡與普通版分開收藏（collectKey 區分），閃卡更難集滿。
 *   - 保底減弱：每包只保證「不全是普通」，不再保證稀有，且機率更低。
 *   - 視覺：稀有度光柱、閃卡光澤、星級、傳說彩帶。
 * ========================================================================= */

(() => {
  "use strict";

  const PACK_SIZE = 5;
  const SAVE_KEY = "cardpack_collection_v2";
  const DECK_KEY = "card_deck_v1";
  const QUEST_KEY = "card_quests_v1";
  const GOAL_KEY = "card_goals_v1";
  const PITY_KEY = "card_pack_pity_v1";
  const PITY_LIMIT = 20;
  const SAVE_BACKUP_KEY = "card_save_backup_v1";
  const TEXT_SIZE_KEY = "card_text_size_v1";
  const Core = window.CardCore;
  if (!Core) throw new Error("CardCore 未載入");

  // collection: { collectKey: count }，collectKey 由 cards.js 提供（含 #foil）
  let collection = loadCollection();
  let deckState = loadDeck();
  let lastNewCards = [];
  let deckFilters = { search: "", cost: "all", rarity: "all" };
  let collectionFilters = { search: "", axis: "all", keyword: "all", rarity: "all", ownership: "all", sort: "cost" };
  let recordFilters = { difficulty: "all" };
  let lastRecordCopy = "";
  let lastSaveCopy = "";
  let missionReturnFocus = null;

  function loadCollection() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; }
    catch { return {}; }
  }
  function saveCollection() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(collection)); } catch {}
  }

  const PACK_COST = 100; // 開包成本（用對戰賺的金幣，CP0-2 經濟閉環）
  // stats 存檔由 core.js 統一版本化與遷移，battle.js / pack.js 共用同一個 shape。
  function loadStats() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem("card_stats_v1")); } catch {}
    return Core.migrateStats(raw);
  }
  function saveStats(s) { try { localStorage.setItem("card_stats_v1", JSON.stringify(Core.migrateStats(s))); } catch {} }

  function recoveryToast(message) {
    const div = document.createElement("div");
    div.textContent = message;
    div.setAttribute("role", "status");
    div.setAttribute("aria-live", "polite");
    div.setAttribute("aria-atomic", "true");
    div.style.cssText = "position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:220;background:rgba(15,23,42,.96);color:#fff;border:1px solid rgba(250,204,21,.35);border-radius:12px;padding:10px 14px;font-size:13px;font-weight:900;box-shadow:0 8px 24px rgba(0,0,0,.35);pointer-events:none;";
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 2600);
  }

  function currentTextSize() {
    let size = "medium";
    try { size = localStorage.getItem(TEXT_SIZE_KEY) || "medium"; } catch {}
    return ["small", "medium", "large"].includes(size) ? size : "medium";
  }

  function applyTextSize(size) {
    const next = ["small", "medium", "large"].includes(size) ? size : "medium";
    document.documentElement.dataset.textSize = next;
    const sel = document.getElementById("packTextSizeSel");
    if (sel) sel.value = next;
    return next;
  }

  function setTextSize(size) {
    const next = applyTextSize(size);
    try { localStorage.setItem(TEXT_SIZE_KEY, next); } catch {}
    return next;
  }

  function swUrl() {
    return new URL(`../../sw.js?v=${window.__CARD_CACHE_VERSION || "card-battle-r51-v1"}`, location.href).toString();
  }

  const SW_BOOT = window.__CARD_SW_BOOT || {};
  const SW_AUTO_RELOAD_WINDOW_MS = SW_BOOT.SW_AUTO_RELOAD_WINDOW_MS || 15000;
  const SW_AUTO_RELOAD_KEY = SW_BOOT.SW_AUTO_RELOAD_KEY || "card_sw_auto_reload_r51_v1";
  const swPageLoadedAt = SW_BOOT.swPageLoadedAt || Date.now();
  function hasAutoReloadedForSwUpdate() {
    try { return sessionStorage.getItem(SW_AUTO_RELOAD_KEY) === "1"; } catch { return true; }
  }
  function markAutoReloadedForSwUpdate() {
    try { sessionStorage.setItem(SW_AUTO_RELOAD_KEY, "1"); } catch {}
  }
  function shouldAutoReloadForSwUpdate(now) {
    if (typeof SW_BOOT.shouldAutoReloadForSwUpdate === "function") return SW_BOOT.shouldAutoReloadForSwUpdate(now);
    return (Number(now || Date.now()) - swPageLoadedAt) <= SW_AUTO_RELOAD_WINDOW_MS
      && !hasAutoReloadedForSwUpdate();
  }
  function showPwaUpdateNotice() {
    recoveryToast("新版本可用，請在方便時重新整理。");
  }

  let pwaReloading = false;
  window.__cardSwUpdatePrompt = showPwaUpdateNotice;
  if (window.__cardSwUpdatePending) showPwaUpdateNotice();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (window.__cardSwBootGuardInstalled) return;
      if (pwaReloading) return;
      if (shouldAutoReloadForSwUpdate()) {
        pwaReloading = true;
        markAutoReloadedForSwUpdate();
        location.reload();
        return;
      }
      showPwaUpdateNotice();
    });
  }

  function applyWaitingWorker(registration) {
    if (registration && registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }

  async function readCacheVersion() {
    let version = "unknown";
    try {
      const text = await fetch(swUrl(), { cache: "no-store" }).then((res) => res.text());
      const match = text.match(/CACHE_VERSION\s*=\s*"([^"]+)"/);
      version = match ? match[1] : "unknown";
    } catch {}
    const label = document.getElementById("packPwaVersion");
    if (label) label.textContent = `版本 ${version}`;
    return version;
  }

  async function checkForUpdate() {
    const version = await readCacheVersion();
    try {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration("../../");
        if (reg) {
          await reg.update();
          if (reg.waiting) applyWaitingWorker(reg);
        }
      }
      recoveryToast(`已檢查更新：${version}`);
    } catch {
      recoveryToast("目前無法檢查更新");
    }
    return version;
  }

  function installAccessibilityLabels() {
    const labels = {
      missionDrawerBtn: "開啟任務抽屜",
      missionClaimAllBtn: "領取所有可領任務",
      missionDrawerClose: "關閉任務抽屜",
      goBattleTop: "前往對戰",
      pack: "打開卡包",
      againBtn: "再開一包",
      toBattleBtn: "前往對戰",
      autoFillDeckBtn: "自動補滿牌組",
      aggroTemplateBtn: "套用快攻模板",
      controlTemplateBtn: "套用控制模板",
      saveDeckBtn: "儲存牌組",
      clearDeckBtn: "清空牌組",
      copyRecordBtn: "複製戰績 JSON",
      clearRecordBtn: "清除戰績",
      exportSaveBtn: "匯出存檔",
      importSaveBtn: "匯入存檔",
      packPwaCheckBtn: "檢查更新",
    };
    Object.entries(labels).forEach(([id, label]) => {
      const el = document.getElementById(id);
      if (el && !el.getAttribute("aria-label")) el.setAttribute("aria-label", label);
    });
    ["recordDifficultyFilter", "packTextSizeSel", "deckSearch", "deckCostFilter", "deckRarityFilter", "collectionSearch", "collectionAxisFilter", "collectionKeywordFilter", "collectionRarityFilter", "collectionOwnershipFilter", "collectionSort", "saveImportText"]
      .forEach((id) => {
        const el = document.getElementById(id);
        if (el && !el.getAttribute("aria-label")) el.setAttribute("aria-label", id);
      });
    const drawer = document.getElementById("missionDrawer");
    if (drawer) {
      drawer.setAttribute("role", "dialog");
      drawer.setAttribute("aria-modal", "true");
      drawer.setAttribute("aria-hidden", drawer.classList.contains("show") ? "false" : "true");
    }
  }

  function safeSaveAfterError(message) {
    try {
      saveStats(Core.protectSave(loadStats(), message, Date.now()));
      recoveryToast("系統偵測到錯誤，已保護本地存檔。重新整理可繼續遊玩。");
    } catch {}
  }

  function installErrorRecovery() {
    if (window.__cardPackErrorRecoveryInstalled) return;
    window.__cardPackErrorRecoveryInstalled = true;
    window.addEventListener("error", (event) => safeSaveAfterError(event && event.message ? event.message : "unknown error"));
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event && event.reason;
      safeSaveAfterError(reason && reason.message ? reason.message : String(reason || "unhandled rejection"));
    });
  }

  function textToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.slice(i, i + 0x8000));
    }
    return btoa(binary);
  }

  function base64ToText(code) {
    const binary = atob(String(code || "").trim());
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function plainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function migrateCollectionInput(raw) {
    if (!plainObject(raw)) throw new Error("collection 格式錯誤");
    return Object.keys(raw).reduce((acc, key) => {
      const id = String(key).replace(/#(?:foil|tide)$/, "");
      const card = getCardById(id);
      const count = Math.max(0, Math.floor(Number(raw[key]) || 0));
      if (!card) throw new Error("collection 含未知卡牌");
      if (count > 0) acc[key] = count;
      return acc;
    }, Object.create(null));
  }

  function buildSaveBundle() {
    return {
      schema: "card-save-r32",
      exportedAt: new Date().toISOString(),
      stats: loadStats(),
      collection: migrateCollectionInput(collection),
      deck: loadDeck(),
      goals: loadGoals(),
      quests: loadQuests(),
    };
  }

  function encodeSaveBundle(bundle) {
    return textToBase64(JSON.stringify(bundle));
  }

  function decodeSaveBundle(code) {
    let payload;
    try { payload = JSON.parse(base64ToText(code)); }
    catch { throw new Error("存檔碼無法解碼"); }
    if (!plainObject(payload) || payload.schema !== "card-save-r32") throw new Error("不是有效的 R32 存檔碼");
    if (!plainObject(payload.stats) || !plainObject(payload.collection) || !plainObject(payload.deck) || !plainObject(payload.goals) || !plainObject(payload.quests)) {
      throw new Error("存檔缺少必要欄位");
    }
    return {
      stats: Core.migrateStats(payload.stats),
      collection: migrateCollectionInput(payload.collection),
      deck: Core.migrateDeck(payload.deck),
      goals: Core.migrateGoals(payload.goals, weekSeed()),
      quests: Core.migrateQuests(payload.quests, todaySeed()),
    };
  }

  async function exportSaveBundle() {
    const code = encodeSaveBundle(buildSaveBundle());
    lastSaveCopy = code;
    const input = document.getElementById("saveImportText");
    if (input) input.value = code;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(code);
      recoveryToast("完整存檔已複製到剪貼簿。");
    } catch {
      recoveryToast("無法寫入剪貼簿，已放入文字框。");
    }
    return code;
  }

  function importSaveBundle(code, options) {
    const decoded = decodeSaveBundle(code);
    let backup = "";
    try {
      backup = encodeSaveBundle(buildSaveBundle());
      localStorage.setItem(SAVE_BACKUP_KEY, backup);
      localStorage.setItem("card_stats_v1", JSON.stringify(decoded.stats));
      localStorage.setItem(SAVE_KEY, JSON.stringify(decoded.collection));
      localStorage.setItem(DECK_KEY, JSON.stringify(decoded.deck));
      localStorage.setItem(GOAL_KEY, JSON.stringify(decoded.goals));
      localStorage.setItem(QUEST_KEY, JSON.stringify(decoded.quests));
    } catch (err) {
      throw new Error("寫入存檔失敗");
    }
    collection = loadCollection();
    deckState = loadDeck();
    renderCollection();
    renderDeckEditor();
    renderGoals();
    renderMissionDrawer();
    updateCoinDisplay();
    renderRecordPanel();
    recoveryToast("存檔匯入成功，已建立匯入前備份。");
    if (!options || options.reload !== false) setTimeout(() => location.reload(), 350);
    return { ok: true, backup };
  }

  function todaySeed() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  function weekSeed(date) {
    const d = date ? new Date(date) : new Date();
    const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = (local.getDay() + 6) % 7;
    local.setDate(local.getDate() - day + 3);
    const firstThursday = new Date(local.getFullYear(), 0, 4);
    const firstDay = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
    const week = 1 + Math.round((local - firstThursday) / 604800000);
    return `${local.getFullYear()}-W${String(week).padStart(2, "0")}`;
  }

  function loadQuests() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(QUEST_KEY)); } catch {}
    return Core.migrateQuests(raw, todaySeed());
  }
  function saveQuests(questState) {
    try { localStorage.setItem(QUEST_KEY, JSON.stringify(Core.migrateQuests(questState, todaySeed()))); } catch {}
  }
  function progressQuest(event) {
    saveQuests(Core.applyQuestProgress(loadQuests(), event));
  }

  function loadGoals(seed) {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(GOAL_KEY)); } catch {}
    return Core.migrateGoals(raw, seed || weekSeed());
  }
  function saveGoals(goalState, seed) {
    try { localStorage.setItem(GOAL_KEY, JSON.stringify(Core.migrateGoals(goalState, seed || weekSeed()))); } catch {}
  }
  function progressWeeklyGoal(event) {
    saveGoals(Core.applyWeeklyQuestProgress(loadGoals(), event));
    renderMissionDrawer();
    updateMissionBadge();
  }

  function loadDeck() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(DECK_KEY)); } catch {}
    return Core.migrateDeck(raw);
  }
  function saveDeckState() {
    const migrated = Core.migrateDeck(deckState);
    deckState = migrated;
    try { localStorage.setItem(DECK_KEY, JSON.stringify(migrated)); } catch {}
  }

  function loadPity() {
    try {
      const value = Math.floor(Number(localStorage.getItem(PITY_KEY)) || 0);
      return Math.max(0, value);
    } catch {
      return 0;
    }
  }

  function savePity(value) {
    try { localStorage.setItem(PITY_KEY, String(Math.max(0, Math.floor(Number(value) || 0)))); } catch {}
  }

  function isRarePlus(card) {
    return !!card && card.rarity !== "common";
  }

  function openPack() {
    const stats = loadStats();
    // 第一包免費（新玩家體驗）；之後花金幣
    const isFree = (stats.packsOpened || 0) === 0;
    if (!isFree && stats.coins < PACK_COST) {
      updateCoinDisplay();
      const hint = document.querySelector(".pack-hint");
      if (hint) { hint.textContent = `金幣不足！(需 ${PACK_COST}，去對戰賺金幣)`; hint.style.color = "#f87171"; }
      return;
    }
    if (!isFree) stats.coins -= PACK_COST;
    stats.packsOpened = (stats.packsOpened || 0) + 1;
    saveStats(stats);
    progressQuest({ type: "openPack", amount: 1 });
    progressWeeklyGoal({ type: "openPack", amount: 1 });
    updateCoinDisplay();

    const pack = document.getElementById("pack");
    pack.classList.add("opening");
    pack.style.pointerEvents = "none";

    const cards = [];
    for (let i = 0; i < PACK_SIZE; i++) cards.push(rollCardByRarity());
    applyPityToCards(cards);

    setTimeout(() => revealCards(cards), 600);
  }

  // 保底：重抽到至少 rare（但不像舊版那麼好抽）
  function rollAtLeastRare() {
    let card, guard = 0;
    do { card = rollCardByRarity(); guard++; } while (card.rarity === "common" && guard < 30);
    return card;
  }

  function applyPityToCards(cards) {
    const pityBefore = loadPity();
    const naturalRarePlus = cards.some(isRarePlus);
    const pityForced = !naturalRarePlus && pityBefore >= PITY_LIMIT - 1;
    if (pityForced) cards[PACK_SIZE - 1] = rollAtLeastRare();
    const hasRarePlus = cards.some(isRarePlus);
    const pityAfter = hasRarePlus ? 0 : pityBefore + 1;
    savePity(pityAfter);
    return { before: pityBefore, after: pityAfter, forced: pityForced, hasRarePlus };
  }

  function revealCards(cards) {
    const row = document.getElementById("revealRow");
    row.innerHTML = "";
    document.getElementById("packStage").style.display = "none";

    let newCount = 0, dupCount = 0;
    const last = cards.length - 1;
    let revealTime = 0;
    lastNewCards = [];
    cards.forEach((card, i) => {
      const key = collectKey(card);
      const had = (collection[key] || 0) > 0;
      if (had) { dupCount++; card._dup = true; }
      else { newCount++; card._dup = false; lastNewCards.push(cloneCard(card)); }
      collection[key] = (collection[key] || 0) + 1;

      const el = renderRevealCard(card);
      row.appendChild(el);
      // 最後一張延遲加大製造壓軸懸念（CP1-13）
      const gap = i === last ? 520 : 340;
      revealTime += gap;
      const t = revealTime;
      setTimeout(() => {
        const isHigh = card.foil || card.tide || card.rarity === "legendary";
        const cls = isHigh ? "legend-pull"
                  : (card.rarity === "epic" || card.rarity === "rare") ? "rare-pull" : "flip-in";
        el.classList.add(cls);
        if (i === last) el.classList.add("finale"); // 壓軸卡額外光效
        if (isHigh) { burstConfetti(); legendFlash(); } // 開傳說/閃卡 → 全螢幕金光
      }, t);
    });

    saveCollection();
    setTimeout(() => {
      document.getElementById("actions").style.display = "flex";
      const sum = document.getElementById("summary");
      sum.innerHTML = `本包：<span class="new">新收集 ${newCount}</span> · <span class="dup">重複 ${dupCount}</span>`;
      renderCollection();
    }, revealTime + 500);
  }

  // 開傳說/閃卡：全螢幕金色 vignette flash（CP1-13）
  function legendFlash() {
    const f = document.createElement("div");
    f.className = "legend-flash";
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 900);
  }

  function renderRevealCard(card) {
    const r = RARITY[card.rarity] || RARITY.common;
    const el = document.createElement("div");
    el.className = "card" + (card.type === CARD_TYPE.SPELL ? " spell" : "") + (card.foil ? " foil" : "") + (card.tide ? " tide" : "");
    el.style.setProperty("--rarity", r.color);
    el.style.setProperty("--glow", r.glow);
    const art = card.image
      ? `<img src="${card.image}" alt="${card.name}" onerror="this.replaceWith(document.createTextNode('${card.emoji}'))">`
      : card.emoji;
    const kw = (card.keywords || []).map((k) => {
      const def = (typeof KEYWORDS !== "undefined") ? KEYWORDS[k] : null;
      return def ? `<span class="kw" title="${def.label}">${def.icon}</span>` : "";
    }).join("");
    el.innerHTML = `
      <div class="beam"></div>
      <div class="cost">${card.cost}</div>
      <div class="stars">${"★".repeat(r.stars)}</div>
      ${card._dup ? '<div class="dup-tag">重複</div>' : ''}
      ${card._dup ? '' : '<div class="new-card-tag">本包新卡</div>'}
      <div class="art">${art}</div>
      <div class="kwrow">${kw}</div>
      <div class="cardname">${card.name}</div>
      <div class="rarity-tag">${r.label}</div>
      <div class="stats">
        <div class="atk">${card.attack ?? ""}</div>
        <div class="hp">${card.health ?? ""}</div>
      </div>
      ${card.foil ? '<div class="foil-tag">✦ 閃卡 FOIL</div>' : ''}
      ${card.tide ? '<div class="tide-tag">≋ 潮鑄 TIDE</div>' : ''}`;
    return el;
  }

  // 收藏冊：普通版 + 閃卡版 + 潮鑄版分開算（總槽位 = 卡池 × 3）
  function renderCollection() {
    const grid = document.getElementById("collectionGrid");
    grid.innerHTML = "";
    let owned = 0;
    const variants = [
      { kind: "normal", keySuffix: "", foil: false, tide: false, rank: 0 },
      { kind: "foil", keySuffix: "#foil", foil: true, tide: false, rank: 1 },
      { kind: "tide", keySuffix: "#tide", foil: false, tide: true, rank: 2 },
    ];
    const totalSlots = CARD_POOL.length * variants.length;

    const slots = [];
    CARD_POOL.forEach((card) => {
      variants.forEach((variant) => {
        const key = card.id + variant.keySuffix;
        const count = collection[key] || 0;
        if (count > 0) owned++;
        const isOwned = count > 0;
        if (!cardMatchesQuery(card, collectionFilters, isOwned)) return;
        slots.push({ card, variant, key, count, isOwned });
      });
    });
    slots.sort((a, b) => sortCards(a.card, b.card, collectionFilters.sort) || (a.variant.rank - b.variant.rank));
    slots.forEach(({ card, variant, key, count, isOwned }) => {
      const r = RARITY[card.rarity] || RARITY.common;
      const slot = document.createElement("div");
      slot.className = "slot " + (isOwned ? ("owned" + (variant.foil ? " foil" : "") + (variant.tide ? " tide" : "")) : "locked");
      slot.dataset.cardId = card.id;
      slot.dataset.foil = variant.foil ? "1" : "0";
      slot.dataset.tide = variant.tide ? "1" : "0";
      slot.dataset.variant = variant.kind;
      slot.dataset.rarity = card.rarity;
      slot.dataset.axis = card.axis || "neutral";
      slot.dataset.cost = String(card.cost);
      slot.dataset.owned = isOwned ? "1" : "0";
      slot.dataset.name = card.name;
      slot.style.setProperty("--rarity", r.color);
      slot.style.setProperty("--glow", r.glow);
      const icon = isOwned
        ? (card.image ? `<img src="${card.image}" alt="">` : card.emoji)
        : "❓";
      // CP2-7 重複卡可分解成金幣（dup 出口）：保留 1 張，多的可分解
      const dupes = Math.max(0, count - 1);
      const dustValue = DISMANTLE_VALUE[card.rarity] || 10;
      slot.innerHTML = `
        ${variant.foil ? '<div class="fstar">✦</div>' : ''}
        ${variant.tide ? '<div class="fstar tide-mark">≋</div>' : ''}
        <div>${icon}</div>
        <div class="nm">${isOwned ? card.name : "未擁有"}</div>
        ${count > 1 ? `<div class="count">×${count}</div>` : ""}
        ${dupes > 0 ? `<button class="dismantle-btn" data-key="${key}" data-val="${dustValue}" data-dupes="${dupes}">分解 +${dupes * dustValue}💰</button>` : ""}`;
      grid.appendChild(slot);
    });
    if (slots.length === 0) {
      const empty = document.createElement("div");
      empty.className = "deck-empty";
      empty.textContent = "沒有符合篩選的收藏格。";
      grid.appendChild(empty);
    }

    // 綁分解按鈕（兩段式確認：第一下變「確定？」，再點才真的分解，避免誤觸一次拆光）
    grid.querySelectorAll(".dismantle-btn").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        if (!btn.dataset.confirm) {
          btn.dataset.confirm = "1";
          btn.textContent = "確定分解？";
          setTimeout(() => { if (btn.isConnected) { delete btn.dataset.confirm; btn.textContent = `分解 +${+btn.dataset.dupes * +btn.dataset.val}💰`; } }, 2500);
          return;
        }
        const key = btn.dataset.key, val = +btn.dataset.val, dupes = +btn.dataset.dupes;
        collection[key] = 1; // 保留 1 張
        saveCollection();
        const s = loadStats(); s.coins = s.coins + dupes * val; saveStats(s);
        updateCoinDisplay();
        renderCollection();
      };
    });

    document.getElementById("progress").textContent = `${owned} / ${totalSlots} 已收集（含閃卡/潮鑄）`;
    const filterCount = document.getElementById("collectionFilterCount");
    if (filterCount) filterCount.textContent = `顯示 ${slots.length} / ${totalSlots}`;
    renderDeckEditor();
    renderGoals();
  }

  function renderGoals(goalState) {
    const summaryEl = document.getElementById("goalSummary");
    const milestoneList = document.getElementById("milestoneList");
    const weeklyEl = document.getElementById("weeklyGoal");
    if (!summaryEl || !milestoneList || !weeklyEl) return;
    const state = goalState || loadGoals();
    const summary = Core.collectionSummary(collection);
    summaryEl.textContent = `收藏 ${summary.unique}/${CARD_POOL.length} 種，閃卡 ${summary.foil}/15 張，潮鑄 ${summary.tide}/3 張`;

    milestoneList.innerHTML = "";
    Core.listMilestones(state, collection).forEach((milestone) => {
      const row = document.createElement("div");
      row.className = "goal-item" + (milestone.claimed ? " claimed" : "");
      row.innerHTML = `
        <div class="goal-title">${milestone.title}</div>
        <div class="goal-progress">${Math.min(milestone.progress, milestone.target)} / ${milestone.target} · ${milestone.reward} 金幣</div>
        <button data-milestone-id="${milestone.id}">${milestone.claimed ? "已領取" : "領取"}</button>`;
      const btn = row.querySelector("button");
      btn.disabled = !milestone.achieved || milestone.claimed;
      btn.onclick = () => claimMilestoneUi(milestone.id);
      milestoneList.appendChild(row);
    });

    const weekly = state.weeklyQuest;
    if (!weekly) {
      weeklyEl.innerHTML = `<div class="goal-title">本週任務</div><div class="goal-progress">尚未產生任務</div>`;
      return;
    }
    const done = weekly.progress >= weekly.target;
    weeklyEl.classList.toggle("claimed", weekly.claimed);
    weeklyEl.innerHTML = `
      <div class="goal-title">本週任務 · ${state.dateSeed}</div>
      <div class="goal-progress">${weekly.title}</div>
      <div class="goal-progress">${Math.min(weekly.progress, weekly.target)} / ${weekly.target} · ${weekly.reward} 金幣</div>
      <button id="weeklyClaimBtn">${weekly.claimed ? "已領取" : "領取"}</button>`;
    const btn = document.getElementById("weeklyClaimBtn");
    if (btn) {
      btn.disabled = !done || weekly.claimed;
      btn.onclick = claimWeeklyUi;
    }
    renderMissionDrawer();
    updateMissionBadge();
  }

  function claimMilestoneUi(milestoneId) {
    const result = Core.claimMilestone(loadGoals(), milestoneId, collection);
    if (!result.ok) {
      renderGoals(result.state);
      return result;
    }
    saveGoals(result.state);
    const stats = loadStats();
    stats.coins += result.reward;
    saveStats(stats);
    updateCoinDisplay();
    renderGoals(result.state);
    recoveryToast(`收藏里程碑完成：+${result.reward} 金幣`);
    return result;
  }

  function claimWeeklyUi() {
    const result = Core.claimWeeklyQuest(loadGoals());
    if (!result.ok) {
      renderGoals(result.state);
      return result;
    }
    saveGoals(result.state);
    const stats = loadStats();
    stats.coins += result.reward;
    saveStats(stats);
    updateCoinDisplay();
    renderGoals(result.state);
    recoveryToast(`本週任務完成：+${result.reward} 金幣`);
    return result;
  }

  function isReady(item) {
    return item && item.progress >= item.target && !item.claimed;
  }

  function addMissionReward(amount) {
    if (!amount) return;
    const stats = loadStats();
    stats.coins += amount;
    saveStats(stats);
    updateCoinDisplay();
  }

  function claimQuestUi(questId) {
    const result = Core.claimQuest(loadQuests(), questId);
    if (!result.ok) {
      renderMissionDrawer();
      return result;
    }
    saveQuests(result.state);
    addMissionReward(result.reward);
    renderMissionDrawer();
    updateMissionBadge();
    recoveryToast(`任務完成：+${result.reward} 金幣`);
    return result;
  }

  function missionClaimableCount() {
    const daily = loadQuests().quests.filter(isReady).length;
    const goals = loadGoals();
    const weekly = isReady(goals.weeklyQuest) ? 1 : 0;
    const milestones = Core.listMilestones(goals, collection).filter((milestone) => milestone.achieved && !milestone.claimed).length;
    return daily + weekly + milestones;
  }

  function updateMissionBadge() {
    const badge = document.getElementById("missionBadge");
    if (!badge) return;
    const count = missionClaimableCount();
    badge.textContent = String(count);
    badge.classList.toggle("show", count > 0);
  }

  function missionItemHtml(item, buttonText) {
    return `
      <div class="mission-name">${item.title}</div>
      <div class="mission-progress">${Math.min(item.progress || 0, item.target)} / ${item.target} · ${item.reward} 金幣</div>
      <button>${item.claimed ? "已領取" : buttonText}</button>`;
  }

  function renderMissionDrawer() {
    const dailyList = document.getElementById("missionDailyList");
    const weeklyList = document.getElementById("missionWeeklyList");
    const milestoneList = document.getElementById("missionMilestoneList");
    const claimAllBtn = document.getElementById("missionClaimAllBtn");
    if (!dailyList || !weeklyList || !milestoneList) return;

    const dailyState = loadQuests();
    dailyList.innerHTML = "";
    dailyState.quests.forEach((quest) => {
      const row = document.createElement("div");
      row.className = "mission-item" + (isReady(quest) ? " ready" : "") + (quest.claimed ? " claimed" : "");
      row.innerHTML = missionItemHtml(quest, "領取");
      const btn = row.querySelector("button");
      btn.disabled = !isReady(quest);
      btn.onclick = () => claimQuestUi(quest.id);
      dailyList.appendChild(row);
    });

    const goals = loadGoals();
    weeklyList.innerHTML = "";
    if (goals.weeklyQuest) {
      const quest = goals.weeklyQuest;
      const row = document.createElement("div");
      row.className = "mission-item" + (isReady(quest) ? " ready" : "") + (quest.claimed ? " claimed" : "");
      row.innerHTML = missionItemHtml(quest, "領取");
      const btn = row.querySelector("button");
      btn.disabled = !isReady(quest);
      btn.onclick = claimWeeklyUi;
      weeklyList.appendChild(row);
    }

    milestoneList.innerHTML = "";
    Core.listMilestones(goals, collection).forEach((milestone) => {
      const row = document.createElement("div");
      row.className = "mission-item" + (milestone.achieved && !milestone.claimed ? " ready" : "") + (milestone.claimed ? " claimed" : "");
      row.innerHTML = missionItemHtml(milestone, "領取");
      const btn = row.querySelector("button");
      btn.disabled = !milestone.achieved || milestone.claimed;
      btn.onclick = () => claimMilestoneUi(milestone.id);
      milestoneList.appendChild(row);
    });

    if (claimAllBtn) claimAllBtn.disabled = missionClaimableCount() === 0;
    updateMissionBadge();
  }

  function claimAllMissionsUi() {
    let reward = 0;
    let count = 0;
    let dailyState = loadQuests();
    for (const quest of dailyState.quests) {
      if (!isReady(quest)) continue;
      const result = Core.claimQuest(dailyState, quest.id);
      if (!result.ok) continue;
      dailyState = result.state;
      reward += result.reward;
      count++;
    }
    saveQuests(dailyState);

    let goals = loadGoals();
    if (isReady(goals.weeklyQuest)) {
      const result = Core.claimWeeklyQuest(goals);
      if (result.ok) {
        goals = result.state;
        reward += result.reward;
        count++;
      }
    }
    for (const milestone of Core.listMilestones(goals, collection)) {
      if (!milestone.achieved || milestone.claimed) continue;
      const result = Core.claimMilestone(goals, milestone.id, collection);
      if (!result.ok) continue;
      goals = result.state;
      reward += result.reward;
      count++;
    }
    saveGoals(goals);
    addMissionReward(reward);
    renderGoals(goals);
    renderMissionDrawer();
    recoveryToast(count > 0 ? `已領取 ${count} 個獎勵：+${reward} 金幣` : "目前沒有可領取的任務獎勵");
    return { ok: count > 0, reward, count };
  }

  function openMissionDrawer() {
    renderMissionDrawer();
    const drawer = document.getElementById("missionDrawer");
    if (!drawer) return;
    missionReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    drawer.classList.add("show");
    drawer.setAttribute("aria-hidden", "false");
    setTimeout(() => (document.getElementById("missionClaimAllBtn") || document.getElementById("missionDrawerClose"))?.focus(), 0);
  }

  function closeMissionDrawer() {
    const drawer = document.getElementById("missionDrawer");
    if (!drawer) return;
    const restore = missionReturnFocus;
    missionReturnFocus = null;
    drawer.classList.remove("show");
    drawer.setAttribute("aria-hidden", "true");
    if (restore && document.contains(restore)) setTimeout(() => restore.focus(), 0);
  }

  function totalOwned(cardId) {
    const normal = Number(collection[cardId] || 0);
    const foil = Number(collection[cardId + "#foil"] || 0);
    const tide = Number(collection[cardId + "#tide"] || 0);
    return (Number.isFinite(normal) ? normal : 0)
      + (Number.isFinite(foil) ? foil : 0)
      + (Number.isFinite(tide) ? tide : 0);
  }

  function deckCounts() {
    return deckState.cards.reduce((acc, id) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, Object.create(null));
  }

  function cardSort(a, b) {
    return (a.cost - b.cost) || a.name.localeCompare(b.name, "zh-Hant") || a.id.localeCompare(b.id);
  }

  function sortCards(a, b, sortKey) {
    const rarityRank = { common: 0, rare: 1, epic: 2, legendary: 3 };
    if (sortKey === "rarity") {
      return ((rarityRank[a.rarity] ?? 0) - (rarityRank[b.rarity] ?? 0))
        || (a.cost - b.cost)
        || a.name.localeCompare(b.name, "zh-Hant")
        || a.id.localeCompare(b.id);
    }
    if (sortKey === "name") {
      return a.name.localeCompare(b.name, "zh-Hant")
        || (a.cost - b.cost)
        || a.id.localeCompare(b.id);
    }
    return cardSort(a, b);
  }

  function normalizeSearch(text) {
    return String(text || "").trim().toLocaleLowerCase("zh-Hant");
  }

  function costMatches(card, filter) {
    if (filter === "0-1") return card.cost <= 1;
    if (filter === "2") return card.cost === 2;
    if (filter === "3") return card.cost === 3;
    if (filter === "4") return card.cost === 4;
    if (filter === "5+") return card.cost >= 5;
    return true;
  }

  function cardSearchText(card) {
    const keywordText = (card.keywords || []).map((key) => KEYWORDS[key]?.label || key).join(" ");
    const axisText = typeof cardAxisLabel === "function" ? cardAxisLabel(card) : card.axis;
    const factionText = typeof factionLabel === "function" ? factionLabel(card) : card.faction;
    return normalizeSearch([card.name, card.id, card.text, card.flavor, keywordText, axisText, factionText, RARITY[card.rarity]?.label].join(" "));
  }

  function ownershipMatches(filter, owned) {
    if (filter === "owned") return owned === true;
    if (filter === "missing") return owned === false;
    return true;
  }

  function cardMatchesQuery(card, filters, owned) {
    const query = Object.assign({ search: "", cost: "all", rarity: "all", axis: "all", keyword: "all", ownership: "all" }, filters || {});
    if (!costMatches(card, query.cost)) return false;
    if (query.rarity !== "all" && card.rarity !== query.rarity) return false;
    if (query.axis !== "all" && card.axis !== query.axis) return false;
    if (query.keyword !== "all" && !(card.keywords || []).includes(query.keyword)) return false;
    if (typeof owned === "boolean" && !ownershipMatches(query.ownership, owned)) return false;
    const q = normalizeSearch(query.search);
    return !q || cardSearchText(card).includes(q);
  }

  function cardMatchesFilters(card) {
    return cardMatchesQuery(card, deckFilters, totalOwned(card.id) > 0);
  }

  function cardArt(card) {
    return card.image ? `<img src="${card.image}" alt="">` : card.emoji;
  }

  function deckAddBlockReason(card, counts) {
    if (!card) return "找不到這張卡。";
    const owned = totalOwned(card.id);
    const inDeck = counts ? (counts[card.id] || 0) : (deckCounts()[card.id] || 0);
    const maxCopies = card.rarity === "legendary" ? 1 : 2;
    if (owned <= 0) return "尚未擁有這張卡。";
    if (deckState.cards.length >= Core.DECK_SIZE) return `牌組已滿（${Core.DECK_SIZE} 張）。`;
    if (inDeck >= owned) return `${card.name} 只有 ${owned} 張。`;
    if (inDeck >= maxCopies) return card.rarity === "legendary" ? "傳說卡最多 1 張。" : "同名卡最多 2 張。";
    return "";
  }

  function cardUpgradeScore(card) {
    if (!card) return 0;
    const rarityScore = { common: 0, rare: 1, epic: 2, legendary: 3 }[card.rarity] || 0;
    const keywordScore = (card.keywords || []).length * 2;
    const statScore = (Number(card.attack) || 0) + (Number(card.health) || 0);
    const effectScore = card.effect || card.trigger ? 2 : 0;
    return statScore + keywordScore + effectScore + rarityScore;
  }

  function isVanillaMinion(card) {
    return card && card.type === CARD_TYPE.MINION && !(card.keywords || []).length && !card.trigger;
  }

  function findDeckRecommendation(counts) {
    if (!lastNewCards.length || deckState.cards.length !== Core.DECK_SIZE) return null;
    for (const fresh of lastNewCards) {
      const freshBase = getCardById(fresh.id);
      if (!freshBase) continue;
      const freshLimit = Math.min(totalOwned(freshBase.id), freshBase.rarity === "legendary" ? 1 : 2);
      if ((counts[freshBase.id] || 0) >= freshLimit) continue;
      const reason = deckAddBlockReason(freshBase, counts);
      if (reason && !reason.startsWith("牌組已滿")) continue;
      const freshScore = cardUpgradeScore(freshBase);
      const candidates = deckState.cards
        .map((id) => getCardById(id))
        .filter((card) => card && card.id !== fresh.id && card.type === CARD_TYPE.MINION && card.cost === freshBase.cost)
        .sort((a, b) => cardUpgradeScore(a) - cardUpgradeScore(b));
      const oldCard = candidates[0];
      if (!oldCard) continue;
      if (freshScore <= cardUpgradeScore(oldCard)) continue;
      const oldLabel = isVanillaMinion(oldCard) ? "白板" : oldCard.name;
      return {
        fresh: freshBase,
        old: oldCard,
        reason: `可替換 ${oldCard.cost} 費${oldLabel}，曲線不變。`,
      };
    }
    return null;
  }

  function replaceDeckCard(oldId, newId) {
    const idx = deckState.cards.indexOf(oldId);
    const fresh = getCardById(newId);
    if (idx === -1 || !fresh) return false;
    deckState.cards.splice(idx, 1);
    const reason = deckAddBlockReason(fresh, deckCounts());
    if (reason) {
      deckState.cards.splice(idx, 0, oldId);
      setDeckMessage(reason);
      renderDeckEditor();
      return false;
    }
    deckState.cards.push(newId);
    setDeckMessage(`已套用推薦：加入 ${fresh.name}。記得儲存牌組。`);
    renderDeckEditor();
    return true;
  }

  function renderDeckRecommendation(counts) {
    const box = document.getElementById("deckRecommend");
    if (!box) return;
    const rec = findDeckRecommendation(counts);
    if (!rec) { box.innerHTML = ""; return; }
    box.innerHTML = `
      <div class="deck-recommend-card">
        <div>
          <div class="deck-recommend-title">推薦替換：${rec.fresh.name}</div>
          <div class="deck-recommend-reason">${rec.reason}</div>
        </div>
        <button type="button" data-old-id="${rec.old.id}" data-new-id="${rec.fresh.id}">套用</button>
      </div>`;
    const btn = box.querySelector("button");
    btn.onclick = () => replaceDeckCard(btn.dataset.oldId, btn.dataset.newId);
  }

  function deckStats(counts) {
    const curve = Array.from({ length: 9 }, () => 0);
    let minions = 0;
    let spells = 0;
    for (const [id, count] of Object.entries(counts || deckCounts())) {
      const card = getCardById(id);
      if (!card) continue;
      const bucket = Math.max(1, Math.min(9, Number(card.cost) || 0)) - 1;
      curve[bucket] += count;
      if (card.type === CARD_TYPE.SPELL) spells += count;
      else minions += count;
    }
    return { curve, minions, spells, total: minions + spells };
  }

  function renderDeckStats(counts) {
    const curveEl = document.getElementById("deckCurve");
    const ratioEl = document.getElementById("deckRatio");
    if (!curveEl || !ratioEl) return;
    const stats = deckStats(counts);
    const max = Math.max(1, ...stats.curve);
    ratioEl.innerHTML = `
      <span class="ratio-pill">隨從 ${stats.minions}</span>
      <span class="ratio-pill">法術 ${stats.spells}</span>
      <span class="ratio-pill">比例 ${stats.total ? Math.round(stats.minions / stats.total * 100) : 0}% / ${stats.total ? Math.round(stats.spells / stats.total * 100) : 0}%</span>`;
    curveEl.innerHTML = stats.curve.map((count, index) => {
      const label = index === 8 ? "9+" : String(index + 1);
      const height = Math.max(4, Math.round((count / max) * 54));
      return `
        <div class="curve-cell">
          <div class="curve-count">${count}</div>
          <div class="curve-bar" style="height:${height}px"></div>
          <div>${label}</div>
        </div>`;
    }).join("");
  }

  function renderDeckEditor() {
    const collectionList = document.getElementById("deckCollectionList");
    const deckList = document.getElementById("deckList");
    const deckCount = document.getElementById("deckCount");
    const errorsBox = document.getElementById("deckErrors");
    const saveBtn = document.getElementById("saveDeckBtn");
    const filterCount = document.getElementById("deckFilterCount");
    if (!collectionList || !deckList || !deckCount || !errorsBox || !saveBtn) return;

    deckState = Core.migrateDeck(deckState);
    const counts = deckCounts();
    const validation = Core.validateDeck(deckState.cards, collection, CARD_POOL);
    deckCount.textContent = `${deckState.cards.length}/${Core.DECK_SIZE}`;
    saveBtn.disabled = !validation.ok;

    collectionList.innerHTML = "";
    const visibleCards = [...CARD_POOL].filter(cardMatchesFilters).sort((a, b) => sortCards(a, b, "cost"));
    if (filterCount) filterCount.textContent = `${visibleCards.length} / ${CARD_POOL.length} 張`;
    visibleCards.forEach((card) => {
      const owned = totalOwned(card.id);
      const inDeck = counts[card.id] || 0;
      const maxCopies = card.rarity === "legendary" ? 1 : 2;
      const blockReason = deckAddBlockReason(card, counts);
      const row = document.createElement("div");
      row.className = "deck-card-row" + (owned <= 0 ? " locked" : "") + (inDeck > Math.min(owned, maxCopies) ? " over" : "") + (blockReason ? " blocked-add" : "");
      row.dataset.cardId = card.id;
      row.innerHTML = `
        <div class="deck-art">${cardArt(card)}</div>
        <div>
          <div class="deck-name">${card.name}</div>
          <div class="deck-meta">${card.cost} 費 · ${RARITY[card.rarity]?.label || card.rarity} · 擁有 ${owned} · 牌組 ${inDeck}</div>
        </div>
        <button class="deck-add-btn" data-card-id="${card.id}">加入</button>`;
      const btn = row.querySelector("button");
      btn.disabled = !!blockReason;
      btn.title = blockReason || "加入牌組";
      row.title = blockReason || "";
      row.onclick = () => {
        if (blockReason) setDeckMessage(blockReason);
      };
      btn.onclick = (event) => {
        event.stopPropagation();
        addDeckCard(card.id);
      };
      collectionList.appendChild(row);
    });
    if (visibleCards.length === 0) {
      const empty = document.createElement("div");
      empty.className = "deck-empty";
      empty.textContent = "沒有符合篩選的卡。";
      collectionList.appendChild(empty);
    }

    deckList.innerHTML = "";
    const grouped = Object.keys(counts)
      .map((id) => ({ card: getCardById(id), count: counts[id] }))
      .filter((item) => item.card)
      .sort((a, b) => cardSort(a.card, b.card));
    if (grouped.length === 0) {
      const empty = document.createElement("div");
      empty.className = "deck-empty";
      empty.textContent = "尚未加入卡牌。";
      deckList.appendChild(empty);
    } else {
      grouped.forEach(({ card, count }) => {
        const owned = totalOwned(card.id);
        const maxCopies = card.rarity === "legendary" ? 1 : 2;
        const row = document.createElement("div");
        row.className = "deck-card-row" + (count > maxCopies || count > owned ? " over" : "");
        row.dataset.cardId = card.id;
        row.innerHTML = `
          <div class="deck-art">${cardArt(card)}</div>
          <div>
            <div class="deck-name">${card.name} ×${count}</div>
            <div class="deck-meta">${card.cost} 費 · 擁有 ${owned} · 上限 ${maxCopies}</div>
          </div>
          <button class="deck-remove-btn" data-card-id="${card.id}">移除</button>`;
        row.querySelector("button").onclick = () => removeDeckCard(card.id);
        deckList.appendChild(row);
      });
    }

    errorsBox.classList.toggle("ok", validation.ok);
    errorsBox.innerHTML = validation.ok
      ? "<div>牌組合法，可以儲存並帶進對戰。</div>"
      : validation.errors.map((msg) => `<div>${msg}</div>`).join("");
    renderDeckStats(counts);
    renderDeckRecommendation(counts);
  }

  function addDeckCard(cardId) {
    const card = getCardById(cardId);
    const reason = deckAddBlockReason(card, deckCounts());
    if (reason) {
      setDeckMessage(reason);
      renderDeckEditor();
      return false;
    }
    deckState.cards.push(cardId);
    setDeckMessage("");
    renderDeckEditor();
    return true;
  }

  function autoFillDeck() {
    deckState = Core.migrateDeck(deckState);
    let added = 0;
    const candidates = [...CARD_POOL]
      .filter((card) => totalOwned(card.id) > 0)
      .sort((a, b) => (a.cost - b.cost) || (cardUpgradeScore(b) - cardUpgradeScore(a)) || a.name.localeCompare(b.name, "zh-Hant"));
    let progressed = true;
    while (deckState.cards.length < Core.DECK_SIZE && progressed) {
      progressed = false;
      for (const card of candidates) {
        if (deckState.cards.length >= Core.DECK_SIZE) break;
        const reason = deckAddBlockReason(card, deckCounts());
        if (reason) continue;
        deckState.cards.push(card.id);
        added++;
        progressed = true;
      }
    }
    const validation = Core.validateDeck(deckState.cards, collection, CARD_POOL);
    if (validation.ok) setDeckMessage(`已自動補滿 ${Core.DECK_SIZE} 張，可儲存。`);
    else if (added > 0) setDeckMessage(`已加入 ${added} 張；收藏不足以補成合法 ${Core.DECK_SIZE} 張。`);
    else setDeckMessage("目前收藏沒有可加入的卡。");
    renderDeckEditor();
    return validation.ok;
  }

  function templateScore(card, kind) {
    if (!card) return -999;
    const keywords = card.keywords || [];
    const attack = Number(card.attack) || 0;
    const health = Number(card.health) || 0;
    const cost = Number(card.cost) || 0;
    const isSpell = card.type === CARD_TYPE.SPELL;
    const rarityScore = { common: 0, rare: 1, epic: 2, legendary: 3 }[card.rarity] || 0;
    if (kind === "control") {
      let score = cost * 9 + health * 2 + attack + rarityScore * 2;
      if (card.axis === "control") score += 28;
      if (card.axis === "aggro") score -= 12;
      if (keywords.includes("taunt")) score += 16;
      if (keywords.includes("lifesteal")) score += 14;
      if (keywords.includes("spellpower")) score += 14;
      if (keywords.includes("frenzy")) score += 8;
      if (keywords.includes("divineshield")) score += 10;
      if (keywords.includes("regenerate")) score += 10;
      if (card.effect === "aoe1" || card.effect === "aoe2") score += 22;
      if (card.effect === "damage8" || card.effect === "polymorph") score += 18;
      if (card.effect === "draw2") score += 20;
      if (card.effect === "heal5") score += 10;
      if (isSpell && cost <= 1) score -= 8;
      return score;
    }
    let score = 120 - cost * 12 + attack * 4 + health + rarityScore;
    if (card.axis === "aggro") score += 28;
    if (card.axis === "control") score -= 10;
    if (keywords.includes("charge")) score += 20;
    if (keywords.includes("rush")) score += 14;
    if (keywords.includes("windfury")) score += 12;
    if (keywords.includes("lifesteal")) score += 8;
    if (keywords.includes("frenzy")) score += 8;
    if (keywords.includes("spellpower")) score += 6;
    if (card.effect === "damage2" || card.effect === "damage3" || card.effect === "mana2" || card.effect === "draw2") score += 18;
    if (card.effect === "giveShield") score += 8;
    if (cost >= 6) score -= 18;
    return score;
  }

  function fillDeckFromCandidates(candidates) {
    let added = 0;
    let progressed = true;
    while (deckState.cards.length < Core.DECK_SIZE && progressed) {
      progressed = false;
      for (const card of candidates) {
        if (deckState.cards.length >= Core.DECK_SIZE) break;
        if (deckAddBlockReason(card, deckCounts())) continue;
        deckState.cards.push(card.id);
        added++;
        progressed = true;
      }
    }
    return added;
  }

  function applyDeckTemplate(kind) {
    deckState = Core.migrateDeck({ version: 1, cards: [] });
    const owned = [...CARD_POOL].filter((card) => totalOwned(card.id) > 0);
    const preferred = [...owned].sort((a, b) =>
      (templateScore(b, kind) - templateScore(a, kind))
      || (a.cost - b.cost)
      || a.name.localeCompare(b.name, "zh-Hant")
      || a.id.localeCompare(b.id)
    );
    const fallback = [...owned].sort((a, b) =>
      (cardUpgradeScore(b) - cardUpgradeScore(a))
      || (a.cost - b.cost)
      || a.name.localeCompare(b.name, "zh-Hant")
      || a.id.localeCompare(b.id)
    );
    fillDeckFromCandidates(preferred);
    fillDeckFromCandidates(fallback);
    const validation = Core.validateDeck(deckState.cards, collection, CARD_POOL);
    const label = kind === "control" ? "控制模板" : "快攻模板";
    if (validation.ok) setDeckMessage(`${label}已建立 ${Core.DECK_SIZE}/${Core.DECK_SIZE}，可直接儲存。`);
    else setDeckMessage(`${label}缺少可用卡，已先補到 ${deckState.cards.length}/${Core.DECK_SIZE}。`);
    renderDeckEditor();
    return validation.ok;
  }

  function removeDeckCard(cardId) {
    const idx = deckState.cards.indexOf(cardId);
    if (idx === -1) return;
    deckState.cards.splice(idx, 1);
    setDeckMessage("");
    renderDeckEditor();
  }

  function clearDeck() {
    deckState.cards = [];
    setDeckMessage("");
    renderDeckEditor();
  }

  function saveDeck() {
    const validation = Core.validateDeck(deckState.cards, collection, CARD_POOL);
    if (!validation.ok) { renderDeckEditor(); return false; }
    saveDeckState();
    setDeckMessage("牌組已儲存。");
    renderDeckEditor();
    return true;
  }

  function setDeckMessage(message) {
    const el = document.getElementById("deckSaveMsg");
    if (el) el.textContent = message || "";
  }

  function goBattle() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "switchTab", target: "battle" }, "*");
    } else {
      window.location.href = "../card-battle/index.html";
    }
  }
  function burstConfetti() {
    for (let i = 0; i < 28; i++) {
      const c = document.createElement("div");
      c.textContent = ["✨", "⭐", "💫", "🌟", "🎉"][i % 5];
      c.style.cssText = `position:fixed;left:50%;top:42%;font-size:24px;pointer-events:none;z-index:50;transition:all 1.3s ease-out;`;
      document.body.appendChild(c);
      requestAnimationFrame(() => {
        const ang = (Math.PI * 2 * i) / 28, dist = 28 + Math.random() * 18;
        c.style.left = 50 + Math.cos(ang) * dist + "%";
        c.style.top = 42 + Math.sin(ang) * dist + "%";
        c.style.opacity = "0";
      });
      setTimeout(() => c.remove(), 1400);
    }
  }

  function resetForNextPack() {
    document.getElementById("revealRow").innerHTML = "";
    document.getElementById("summary").innerHTML = "";
    document.getElementById("actions").style.display = "none";
    const stage = document.getElementById("packStage");
    stage.style.display = "flex";
    const pack = document.getElementById("pack");
    pack.classList.remove("opening");
    pack.style.pointerEvents = "auto";
  }

  // ===== 綁定 =====
  installAccessibilityLabels();
  applyTextSize(currentTextSize());
  readCacheVersion();
  document.getElementById("pack").onclick = openPack;
  document.getElementById("againBtn").onclick = resetForNextPack;
  document.getElementById("toBattleBtn").onclick = goBattle;
  document.getElementById("goBattleTop").onclick = goBattle;
  document.getElementById("saveDeckBtn").onclick = saveDeck;
  document.getElementById("clearDeckBtn").onclick = clearDeck;
  document.getElementById("autoFillDeckBtn").onclick = autoFillDeck;
  const aggroTemplateBtn = document.getElementById("aggroTemplateBtn");
  const controlTemplateBtn = document.getElementById("controlTemplateBtn");
  if (aggroTemplateBtn) aggroTemplateBtn.onclick = () => applyDeckTemplate("aggro");
  if (controlTemplateBtn) controlTemplateBtn.onclick = () => applyDeckTemplate("control");
  const missionDrawerBtn = document.getElementById("missionDrawerBtn");
  const missionDrawerClose = document.getElementById("missionDrawerClose");
  const missionClaimAllBtn = document.getElementById("missionClaimAllBtn");
  const missionDrawer = document.getElementById("missionDrawer");
  if (missionDrawerBtn) missionDrawerBtn.onclick = openMissionDrawer;
  if (missionDrawerClose) missionDrawerClose.onclick = closeMissionDrawer;
  if (missionClaimAllBtn) missionClaimAllBtn.onclick = claimAllMissionsUi;
  if (missionDrawer) {
    missionDrawer.addEventListener("click", (event) => {
      if (event.target === missionDrawer) closeMissionDrawer();
    });
  }
  const deckSearch = document.getElementById("deckSearch");
  const deckCostFilter = document.getElementById("deckCostFilter");
  const deckRarityFilter = document.getElementById("deckRarityFilter");
  if (deckSearch) deckSearch.oninput = () => { deckFilters.search = deckSearch.value; renderDeckEditor(); };
  if (deckCostFilter) deckCostFilter.onchange = () => { deckFilters.cost = deckCostFilter.value; renderDeckEditor(); };
  if (deckRarityFilter) deckRarityFilter.onchange = () => { deckFilters.rarity = deckRarityFilter.value; renderDeckEditor(); };
  const collectionSearch = document.getElementById("collectionSearch");
  const collectionAxisFilter = document.getElementById("collectionAxisFilter");
  const collectionKeywordFilter = document.getElementById("collectionKeywordFilter");
  const collectionRarityFilter = document.getElementById("collectionRarityFilter");
  const collectionOwnershipFilter = document.getElementById("collectionOwnershipFilter");
  const collectionSort = document.getElementById("collectionSort");
  if (collectionSearch) collectionSearch.oninput = () => { collectionFilters.search = collectionSearch.value; renderCollection(); };
  if (collectionAxisFilter) collectionAxisFilter.onchange = () => { collectionFilters.axis = collectionAxisFilter.value; renderCollection(); };
  if (collectionKeywordFilter) collectionKeywordFilter.onchange = () => { collectionFilters.keyword = collectionKeywordFilter.value; renderCollection(); };
  if (collectionRarityFilter) collectionRarityFilter.onchange = () => { collectionFilters.rarity = collectionRarityFilter.value; renderCollection(); };
  if (collectionOwnershipFilter) collectionOwnershipFilter.onchange = () => { collectionFilters.ownership = collectionOwnershipFilter.value; renderCollection(); };
  if (collectionSort) collectionSort.onchange = () => { collectionFilters.sort = collectionSort.value; renderCollection(); };
  const recordDifficultyFilter = document.getElementById("recordDifficultyFilter");
  if (recordDifficultyFilter) recordDifficultyFilter.onchange = () => { recordFilters.difficulty = recordDifficultyFilter.value; renderRecordPanel(); };
  const copyRecordBtn = document.getElementById("copyRecordBtn");
  if (copyRecordBtn) copyRecordBtn.onclick = () => copyRecordJson();
  const exportSaveBtn = document.getElementById("exportSaveBtn");
  if (exportSaveBtn) exportSaveBtn.onclick = () => exportSaveBundle();
  const importSaveBtn = document.getElementById("importSaveBtn");
  if (importSaveBtn) importSaveBtn.onclick = () => {
    const code = document.getElementById("saveImportText")?.value || "";
    try { importSaveBundle(code); }
    catch (err) { recoveryToast("匯入失敗：存檔碼無效，未覆蓋現有存檔。"); }
  };
  const clearRecordBtn = document.getElementById("clearRecordBtn");
  if (clearRecordBtn) clearRecordBtn.onclick = clearRecordStats;
  const packTextSizeSel = document.getElementById("packTextSizeSel");
  if (packTextSizeSel) packTextSizeSel.onchange = () => setTextSize(packTextSizeSel.value);
  const packPwaCheckBtn = document.getElementById("packPwaCheckBtn");
  if (packPwaCheckBtn) packPwaCheckBtn.onclick = () => checkForUpdate();
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.getElementById("missionDrawer")?.classList.contains("show")) closeMissionDrawer();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === TEXT_SIZE_KEY) applyTextSize(currentTextSize());
  });

  // 更新金幣顯示（CP0-2）
  function updateCoinDisplay() {
    const el = document.getElementById("coinBalance");
    if (el) el.textContent = loadStats().coins;
  }

  function percent(wins, total) {
    return total ? Math.round((wins / total) * 100) + "%" : "0%";
  }

  function summarizeGames(games, key) {
    return games.reduce((acc, game) => {
      const name = game[key] || "neutral";
      if (!acc[name]) acc[name] = { wins: 0, total: 0 };
      acc[name].total++;
      if (game.win) acc[name].wins++;
      return acc;
    }, Object.create(null));
  }

  function filteredRecordGames(stats) {
    const allGames = stats.telemetry.games || [];
    const difficulty = recordFilters.difficulty || "all";
    return difficulty === "all" ? allGames : allGames.filter((game) => game.difficulty === difficulty);
  }

  function recordSummary(stats) {
    const games = filteredRecordGames(stats);
    const filtered = (recordFilters.difficulty || "all") !== "all";
    const wins = filtered ? games.filter((game) => game.win).length : stats.wins;
    const losses = filtered ? games.filter((game) => !game.win).length : stats.losses;
    const totalTurns = games.reduce((sum, game) => sum + (game.turns || 0), 0);
    return {
      filter: Object.assign({}, recordFilters),
      games,
      wins,
      losses,
      total: wins + losses,
      avgTurns: games.length ? (totalTurns / games.length).toFixed(1) : "0.0",
    };
  }

  function recordSnapshot() {
    const stats = loadStats();
    const diffLabels = { easy: "簡單", normal: "普通", hard: "困難" };
    const axisLabels = { aggro: "快攻", control: "控制", neutral: "中立" };
    const summary = recordSummary(stats);
    const byDifficulty = summarizeGames(summary.games, "difficulty");
    const byArchetype = summarizeGames(summary.games, "archetype");
    const topCards = Object.entries(stats.telemetry.cardPlays || {})
      .map(([id, count]) => ({ card: getCardById(id), count }))
      .filter((item) => item.card)
      .sort((a, b) => b.count - a.count || a.card.name.localeCompare(b.card.name, "zh-Hant"))
      .slice(0, 5)
      .map((item) => ({ id: item.card.id, name: item.card.name, count: item.count }));
    return {
      exportedAt: new Date().toISOString(),
      filter: summary.filter,
      total: { wins: summary.wins, losses: summary.losses, winRate: percent(summary.wins, summary.total), avgTurns: summary.avgTurns },
      difficulty: Object.keys(diffLabels).reduce((acc, key) => {
        const row = byDifficulty[key] || { wins: 0, total: 0 };
        acc[key] = { label: diffLabels[key], wins: row.wins, total: row.total, winRate: percent(row.wins, row.total) };
        return acc;
      }, {}),
      archetype: Object.keys(axisLabels).reduce((acc, key) => {
        const row = byArchetype[key] || { wins: 0, total: 0 };
        acc[key] = { label: axisLabels[key], wins: row.wins, total: row.total, winRate: percent(row.wins, row.total) };
        return acc;
      }, {}),
      topCards,
    };
  }

  async function copyRecordJson() {
    const text = JSON.stringify(recordSnapshot(), null, 2);
    lastRecordCopy = text;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      recoveryToast("戰績 JSON 已複製到剪貼簿。");
    } catch {
      recoveryToast("無法寫入剪貼簿，已保留 JSON 內容供測試讀取。");
    }
    return text;
  }

  function renderRecordPanel() {
    const grid = document.getElementById("recordGrid");
    if (!grid) return;
    const stats = loadStats();
    const summary = recordSummary(stats);
    const games = summary.games;
    const diffLabels = { easy: "簡單", normal: "普通", hard: "困難" };
    const axisLabels = { aggro: "快攻", control: "控制", neutral: "中立" };
    const byDifficulty = summarizeGames(games, "difficulty");
    const byArchetype = summarizeGames(games, "archetype");
    const filterLabel = recordFilters.difficulty === "all" ? "全部難度" : diffLabels[recordFilters.difficulty] || "全部難度";
    const topCards = Object.entries(stats.telemetry.cardPlays || {})
      .map(([id, count]) => ({ card: getCardById(id), count }))
      .filter((item) => item.card)
      .sort((a, b) => b.count - a.count || a.card.name.localeCompare(b.card.name, "zh-Hant"))
      .slice(0, 5);
    const diffText = Object.keys(diffLabels).map((key) => {
      const row = byDifficulty[key] || { wins: 0, total: 0 };
      return `${diffLabels[key]}：${row.wins}/${row.total}（${percent(row.wins, row.total)}）`;
    }).join("\n");
    const archetypeText = Object.keys(axisLabels).map((key) => {
      const row = byArchetype[key] || { wins: 0, total: 0 };
      return `${axisLabels[key]}：${row.wins}/${row.total}（${percent(row.wins, row.total)}）`;
    }).join("\n");
    grid.innerHTML = `
      <div class="record-card"><div class="record-title">總覽｜${filterLabel}</div><div class="record-value">${summary.wins} 勝 ${summary.losses} 敗\n勝率 ${percent(summary.wins, summary.total)}\n平均 ${summary.avgTurns} 回合</div></div>
      <div class="record-card"><div class="record-title">難度勝率</div><div class="record-value">${diffText}</div></div>
      <div class="record-card"><div class="record-title">牌組軸線分組</div><div class="record-value">${archetypeText}</div></div>
      <div class="record-card"><div class="record-title">常用卡 Top 5</div><div class="record-value">${topCards.length ? topCards.map((item, index) => `${index + 1}. ${item.card.name} x${item.count}`).join("\n") : "尚無出牌紀錄"}</div></div>`;
  }

  function clearRecordStats() {
    const stats = loadStats();
    stats.wins = 0;
    stats.losses = 0;
    stats.streak = 0;
    stats.lossStreak = 0;
    stats.bestStreak = 0;
    stats.telemetry = { games: [], cardPlays: {} };
    saveStats(stats);
    renderRecordPanel();
    return stats;
  }

  installErrorRecovery();
  renderCollection();
  updateCoinDisplay();
  renderRecordPanel();

  window.__deckTest = {
    deck: () => Core.migrateDeck(deckState),
    validation: () => Core.validateDeck(deckState.cards, collection, CARD_POOL),
    add: addDeckCard,
    autoFill: autoFillDeck,
    template: applyDeckTemplate,
    curve: () => deckStats(deckCounts()),
    save: saveDeck,
    clear: clearDeck,
    render: renderDeckEditor,
    setFilters(next) {
      deckFilters = Object.assign({}, deckFilters, next || {});
      if (deckSearch) deckSearch.value = deckFilters.search || "";
      if (deckCostFilter) deckCostFilter.value = deckFilters.cost || "all";
      if (deckRarityFilter) deckRarityFilter.value = deckFilters.rarity || "all";
      renderDeckEditor();
      return Object.assign({}, deckFilters);
    },
    visibleCards: () => [...document.querySelectorAll("#deckCollectionList .deck-card-row")].map((el) => el.dataset.cardId),
    setCollectionFilters(next) {
      collectionFilters = Object.assign({}, collectionFilters, next || {});
      if (collectionSearch) collectionSearch.value = collectionFilters.search || "";
      if (collectionAxisFilter) collectionAxisFilter.value = collectionFilters.axis || "all";
      if (collectionKeywordFilter) collectionKeywordFilter.value = collectionFilters.keyword || "all";
      if (collectionRarityFilter) collectionRarityFilter.value = collectionFilters.rarity || "all";
      if (collectionOwnershipFilter) collectionOwnershipFilter.value = collectionFilters.ownership || "all";
      if (collectionSort) collectionSort.value = collectionFilters.sort || "cost";
      renderCollection();
      return Object.assign({}, collectionFilters);
    },
    visibleCollection: () => [...document.querySelectorAll("#collectionGrid .slot")].map((el) => ({
      id: el.dataset.cardId,
      foil: el.dataset.foil === "1",
      tide: el.dataset.tide === "1",
      variant: el.dataset.variant || "normal",
      rarity: el.dataset.rarity,
      axis: el.dataset.axis,
      cost: Number(el.dataset.cost),
      owned: el.dataset.owned === "1",
      name: el.dataset.name,
    })),
    pity: () => loadPity(),
    setPity(value) {
      savePity(value);
      return loadPity();
    },
    testPack(cards) {
      revealCards((cards || []).map(cloneCard));
      return { pity: loadPity(), collection: Object.assign({}, collection) };
    },
    applyPity(cards) {
      const next = (cards || []).map(cloneCard);
      const result = applyPityToCards(next);
      return Object.assign(result, { rarities: next.map((card) => card.rarity), cards: next.map((card) => card.id) });
    },
    collectionToolsBox: () => {
      const box = document.getElementById("collectionTools")?.getBoundingClientRect();
      return box ? { top: box.top, bottom: box.bottom, height: box.height, width: box.width } : null;
    },
    owned: totalOwned,
    score: (cardId) => cardUpgradeScore(getCardById(cardId)),
    setCollection(next) {
      collection = Object.assign(Object.create(null), next || {});
      saveCollection();
      renderCollection();
      return collection;
    },
    goals: (seed) => loadGoals(seed),
    setGoals(next, seed) {
      saveGoals(next || {}, seed);
      renderGoals();
      return loadGoals(seed);
    },
    quests: () => loadQuests(),
    setQuests(next) {
      saveQuests(next || {});
      renderMissionDrawer();
      return loadQuests();
    },
    missionCount: () => missionClaimableCount(),
    openMissionDrawer: () => openMissionDrawer(),
    missionOpen: () => document.getElementById("missionDrawer")?.classList.contains("show") || false,
    claimAllMissions: () => claimAllMissionsUi(),
    claimMilestone: (id) => claimMilestoneUi(id),
    progressWeekly: (event) => { progressWeeklyGoal(event); renderGoals(); return loadGoals(); },
    claimWeekly: () => claimWeeklyUi(),
    setDeck(cards) {
      deckState = Core.migrateDeck({ version: 1, cards: Array.isArray(cards) ? cards : [] });
      renderDeckEditor();
      return Core.migrateDeck(deckState);
    },
    setLastNewCards(cardIds) {
      lastNewCards = (Array.isArray(cardIds) ? cardIds : []).map((id) => getCardById(id)).filter(Boolean);
      renderDeckEditor();
      return lastNewCards.map((card) => card.id);
    },
    recommendation: () => findDeckRecommendation(deckCounts()),
    recommendationText: () => (document.getElementById("deckRecommend")?.textContent || "").trim(),
    recordText: () => (document.getElementById("recordPanel")?.textContent || "").trim(),
    setRecordFilter(next) {
      recordFilters = Object.assign({}, recordFilters, next || {});
      if (recordDifficultyFilter) recordDifficultyFilter.value = recordFilters.difficulty || "all";
      renderRecordPanel();
      return Object.assign({}, recordFilters);
    },
    recordSnapshot: () => recordSnapshot(),
    copyRecord: () => copyRecordJson(),
    lastRecordCopy: () => lastRecordCopy,
    exportSave: () => exportSaveBundle(),
    importSave: (code, options) => importSaveBundle(code, options || { reload: false }),
    lastSaveCopy: () => lastSaveCopy,
    decodeSave: (code) => decodeSaveBundle(code),
    backupText: () => localStorage.getItem(SAVE_BACKUP_KEY) || "",
    setTextSize: (size) => setTextSize(size),
    textSize: () => ({ value: currentTextSize(), attr: document.documentElement.dataset.textSize, select: document.getElementById("packTextSizeSel")?.value || "" }),
    pwaVersion: () => document.getElementById("packPwaVersion")?.textContent || "",
    readCacheVersion: () => readCacheVersion(),
    swUpdateGuard: () => ({ key: SW_AUTO_RELOAD_KEY, windowMs: SW_AUTO_RELOAD_WINDOW_MS, early: shouldAutoReloadForSwUpdate(), late: shouldAutoReloadForSwUpdate(swPageLoadedAt + SW_AUTO_RELOAD_WINDOW_MS + 1) }),
    clearRecord: () => clearRecordStats(),
  };

  // 對戰 iframe 打完仗寫入金幣時，這頁（另一個 window）會收到 storage 事件——即時刷新餘額，
  // 不然兩個 iframe 常駐不重載，切回來看到的是舊值
  window.addEventListener("storage", (e) => {
    if (e.key === "card_stats_v1") {
      updateCoinDisplay();
      renderRecordPanel();
    }
  });
})();
