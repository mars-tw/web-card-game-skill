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
  const Core = window.CardCore;
  if (!Core) throw new Error("CardCore 未載入");

  // collection: { collectKey: count }，collectKey 由 cards.js 提供（含 #foil）
  let collection = loadCollection();
  let deckState = loadDeck();
  let lastNewCards = [];

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

  function todaySeed() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
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
    updateCoinDisplay();

    const pack = document.getElementById("pack");
    pack.classList.add("opening");
    pack.style.pointerEvents = "none";

    const cards = [];
    for (let i = 0; i < PACK_SIZE; i++) cards.push(rollCardByRarity());
    // 保底減弱：只保證「至少一張非普通」，而非保證稀有
    if (cards.every((c) => c.rarity === "common")) {
      cards[PACK_SIZE - 1] = rollAtLeastRare();
    }

    setTimeout(() => revealCards(cards), 600);
  }

  // 保底：重抽到至少 rare（但不像舊版那麼好抽）
  function rollAtLeastRare() {
    let card, guard = 0;
    do { card = rollCardByRarity(); guard++; } while (card.rarity === "common" && guard < 30);
    return card;
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
        const isHigh = card.foil || card.rarity === "legendary";
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
    el.className = "card" + (card.type === CARD_TYPE.SPELL ? " spell" : "") + (card.foil ? " foil" : "");
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
      ${card.foil ? '<div class="foil-tag">✦ 閃卡 FOIL</div>' : ''}`;
    return el;
  }

  // 收藏冊：普通版 + 閃卡版分開算（總槽位 = 卡池 × 2）
  function renderCollection() {
    const grid = document.getElementById("collectionGrid");
    grid.innerHTML = "";
    let owned = 0;
    const totalSlots = CARD_POOL.length * 2; // 每張卡有普通+閃卡兩種

    CARD_POOL.forEach((card) => {
      [false, true].forEach((isFoil) => {
        const r = RARITY[card.rarity] || RARITY.common;
        const key = isFoil ? card.id + "#foil" : card.id;
        const count = collection[key] || 0;
        if (count > 0) owned++;
        const slot = document.createElement("div");
        slot.className = "slot " + (count > 0 ? (isFoil ? "owned foil" : "owned") : "locked");
        slot.style.setProperty("--rarity", r.color);
        slot.style.setProperty("--glow", r.glow);
        const icon = count > 0
          ? (card.image ? `<img src="${card.image}" alt="">` : card.emoji)
          : "❓";
        // CP2-7 重複卡可分解成金幣（dup 出口）：保留 1 張，多的可分解
        const dupes = Math.max(0, count - 1);
        const dustValue = DISMANTLE_VALUE[card.rarity] || 10;
        slot.innerHTML = `
          ${isFoil ? '<div class="fstar">✦</div>' : ''}
          <div>${icon}</div>
          <div class="nm">${count > 0 ? card.name : "???"}</div>
          ${count > 1 ? `<div class="count">×${count}</div>` : ""}
          ${dupes > 0 ? `<button class="dismantle-btn" data-key="${key}" data-val="${dustValue}" data-dupes="${dupes}">分解 +${dupes * dustValue}💰</button>` : ""}`;
        grid.appendChild(slot);
      });
    });

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

    document.getElementById("progress").textContent = `${owned} / ${totalSlots} 已收集（含閃卡）`;
    renderDeckEditor();
  }

  function totalOwned(cardId) {
    const normal = Number(collection[cardId] || 0);
    const foil = Number(collection[cardId + "#foil"] || 0);
    return (Number.isFinite(normal) ? normal : 0) + (Number.isFinite(foil) ? foil : 0);
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

  function cardArt(card) {
    return card.image ? `<img src="${card.image}" alt="">` : card.emoji;
  }

  function deckAddBlockReason(card, counts) {
    if (!card) return "找不到這張卡。";
    const owned = totalOwned(card.id);
    const inDeck = counts ? (counts[card.id] || 0) : (deckCounts()[card.id] || 0);
    const maxCopies = card.rarity === "legendary" ? 1 : 2;
    if (owned <= 0) return "尚未擁有這張卡。";
    if (deckState.cards.length >= Core.DECK_SIZE) return "牌組已滿（20 張）。";
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

  function renderDeckEditor() {
    const collectionList = document.getElementById("deckCollectionList");
    const deckList = document.getElementById("deckList");
    const deckCount = document.getElementById("deckCount");
    const errorsBox = document.getElementById("deckErrors");
    const saveBtn = document.getElementById("saveDeckBtn");
    if (!collectionList || !deckList || !deckCount || !errorsBox || !saveBtn) return;

    deckState = Core.migrateDeck(deckState);
    const counts = deckCounts();
    const validation = Core.validateDeck(deckState.cards, collection, CARD_POOL);
    deckCount.textContent = `${deckState.cards.length}/${Core.DECK_SIZE}`;
    saveBtn.disabled = !validation.ok;

    collectionList.innerHTML = "";
    [...CARD_POOL].sort(cardSort).forEach((card) => {
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
  document.getElementById("pack").onclick = openPack;
  document.getElementById("againBtn").onclick = resetForNextPack;
  document.getElementById("toBattleBtn").onclick = goBattle;
  document.getElementById("goBattleTop").onclick = goBattle;
  document.getElementById("saveDeckBtn").onclick = saveDeck;
  document.getElementById("clearDeckBtn").onclick = clearDeck;

  // 更新金幣顯示（CP0-2）
  function updateCoinDisplay() {
    const el = document.getElementById("coinBalance");
    if (el) el.textContent = loadStats().coins;
  }

  renderCollection();
  updateCoinDisplay();

  window.__deckTest = {
    deck: () => Core.migrateDeck(deckState),
    validation: () => Core.validateDeck(deckState.cards, collection, CARD_POOL),
    add: addDeckCard,
    save: saveDeck,
    clear: clearDeck,
    render: renderDeckEditor,
    owned: totalOwned,
    score: (cardId) => cardUpgradeScore(getCardById(cardId)),
    setCollection(next) {
      collection = Object.assign(Object.create(null), next || {});
      saveCollection();
      renderCollection();
      return collection;
    },
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
  };

  // 對戰 iframe 打完仗寫入金幣時，這頁（另一個 window）會收到 storage 事件——即時刷新餘額，
  // 不然兩個 iframe 常駐不重載，切回來看到的是舊值
  window.addEventListener("storage", (e) => {
    if (e.key === "card_stats_v1") updateCoinDisplay();
  });
})();
