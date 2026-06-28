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

  // collection: { collectKey: count }，collectKey 由 cards.js 提供（含 #foil）
  let collection = loadCollection();

  function loadCollection() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; }
    catch { return {}; }
  }
  function saveCollection() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(collection)); } catch {}
  }

  const PACK_COST = 100; // 開包成本（用對戰賺的金幣，CP0-2 經濟閉環）
  function loadStats() {
    try { return JSON.parse(localStorage.getItem("card_stats_v1")) || { wins: 0, losses: 0, coins: 0 }; }
    catch { return { wins: 0, losses: 0, coins: 0 }; }
  }
  function saveStats(s) { try { localStorage.setItem("card_stats_v1", JSON.stringify(s)); } catch {} }

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
    cards.forEach((card, i) => {
      const key = collectKey(card);
      const had = (collection[key] || 0) > 0;
      if (had) { dupCount++; card._dup = true; }
      else { newCount++; card._dup = false; }
      collection[key] = (collection[key] || 0) + 1;

      const el = renderRevealCard(card);
      row.appendChild(el);
      setTimeout(() => {
        const cls = card.foil || card.rarity === "legendary" ? "legend-pull"
                  : (card.rarity === "epic" || card.rarity === "rare") ? "rare-pull" : "flip-in";
        el.classList.add(cls);
        if (card.foil || card.rarity === "legendary") burstConfetti();
      }, i * 300);
    });

    saveCollection();
    setTimeout(() => {
      document.getElementById("actions").style.display = "flex";
      const sum = document.getElementById("summary");
      sum.innerHTML = `本包：<span class="new">新收集 ${newCount}</span> · <span class="dup">重複 ${dupCount}</span>`;
      renderCollection();
    }, cards.length * 300 + 400);
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
        slot.innerHTML = `
          ${isFoil ? '<div class="fstar">✦</div>' : ''}
          <div>${icon}</div>
          <div class="nm">${count > 0 ? card.name : "???"}</div>
          ${count > 1 ? `<div class="count">×${count}</div>` : ""}`;
        grid.appendChild(slot);
      });
    });

    document.getElementById("progress").textContent = `${owned} / ${totalSlots} 已收集（含閃卡）`;
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
  document.getElementById("toBattleBtn").onclick = () => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "switchTab", target: "battle" }, "*");
    } else {
      window.location.href = "../card-battle/index.html";
    }
  };

  // 更新金幣顯示（CP0-2）
  function updateCoinDisplay() {
    const el = document.getElementById("coinBalance");
    if (el) el.textContent = loadStats().coins;
  }

  renderCollection();
  updateCoinDisplay();
})();
