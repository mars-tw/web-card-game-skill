/* =========================================================================
 * battle.js — 回合制卡牌對戰引擎 v2（關鍵字技能 + 強化動畫 + AI）
 *
 * 關鍵字技能規則：
 *   taunt        嘲諷  — 場上有嘲諷時，攻擊方只能打嘲諷隨從（不能打臉/打其他）
 *   charge       衝鋒  — 召喚當回合即可攻擊
 *   battlecry    戰吼  — 出場時觸發 trigger 效果一次
 *   deathrattle  亡語  — 死亡時觸發 trigger 效果一次
 *   divineshield 聖盾  — 第一次受到傷害時改為破盾、不扣血
 *
 * 動畫：攻擊撞擊+震動+受擊閃紅、傷害跳字、召喚飛入、死亡碎裂、
 *       聖盾破裂、技能觸發提示、勝負結算。
 * ========================================================================= */

(() => {
  "use strict";

  const Core = window.CardCore;
  if (!Core) throw new Error("CardCore 未載入");
  const MAX_FIELD = Core.MAX_FIELD; // 場上隨從上限（雙方皆同；手機版戰場列一行放得下的上限）
  const QUEST_KEY = "card_quests_v1";
  const GOAL_KEY = "card_goals_v1";
  const CHRONICLE_KEY = "card_chronicle_v1";

  // ===== 難度設定 =====
  // playerHp/enemyHp：雙方起始血量；playerDraw/enemyDraw：起手抽牌數
  // aiSmart：AI 聰明度（0=隨便打臉, 1=會換威脅, 2=會算殺/留嘲諷/用劇毒換大物）
  const DIFFICULTY = {
    easy:   { label: "簡單", playerHp: 35, enemyHp: 25, playerDraw: 4, enemyDraw: 3, aiSmart: 0 },
    normal: { label: "普通", playerHp: 30, enemyHp: 30, playerDraw: 3, enemyDraw: 4, aiSmart: 1 },
    hard:   { label: "困難", playerHp: 26, enemyHp: 34, playerDraw: 3, enemyDraw: 5, aiSmart: 2 },
  };
  const DIFFICULTY_REWARDS = {
    easy: { win: 50, loss: 15 },
    normal: { win: 65, loss: 20 },
    hard: { win: 85, loss: 30 },
  };
  const OPPONENT_KEY = "cardgame_opponent";
  const DEFAULT_OPPONENT_ID = "op_ser_halden";
  const OPPONENTS = Object.freeze({
    op_ser_halden: Object.freeze({
      id: "op_ser_halden",
      name: "哈爾登隊長",
      emoji: "🛡️",
      archetype: "control",
      deckIds: Object.freeze([
        "saltShieldSquire", "saltShieldSquire", "footman", "footman", "bulwarkMonk", "bulwarkMonk",
        "knight", "knight", "guardian", "guardian", "bannerGuard", "bannerGuard",
        "oathbannerHerald", "oathbannerHerald", "captainGreywake", "highArchivist",
        "mirrorRime", "mirrorRime", "shieldUp", "shieldUp",
      ]),
      tauntBias: 0.9,
      faceBias: 0.18,
    }),
    op_magister_vey: Object.freeze({
      id: "op_magister_vey",
      name: "維伊魔導師",
      emoji: "🔮",
      archetype: "spellburst",
      deckIds: Object.freeze([
        "arcaneApprentice", "arcaneApprentice", "tidecallerAdept", "tidecallerAdept",
        "frostChanneler", "frostChanneler", "mage", "mage", "arcaneWeaver", "arcaneWeaver",
        "firebolt", "firebolt", "iceNeedle", "iceNeedle", "emberVolley", "emberVolley",
        "flameBurst", "flameBurst", "voidTithe", "voidTithe",
      ]),
      tauntBias: 0.35,
      faceBias: 0.56,
    }),
    op_scarra: Object.freeze({
      id: "op_scarra",
      name: "斯卡拉狼首",
      emoji: "🐺",
      archetype: "aggro",
      deckIds: Object.freeze([
        "emberpup", "emberpup", "wolf", "wolf", "alleySkirmisher", "alleySkirmisher",
        "sparkSquire", "sparkSquire", "frontScout", "frontScout", "packHowler", "packHowler",
        "dualTalon", "dualTalon", "dawnRider", "dawnRider", "firebolt", "firebolt",
        "emberVolley", "emberVolley",
      ]),
      tauntBias: 0.15,
      faceBias: 0.9,
    }),
  });
  function currentOpponentId() {
    let id = DEFAULT_OPPONENT_ID;
    try { id = localStorage.getItem(OPPONENT_KEY) || DEFAULT_OPPONENT_ID; } catch {}
    return OPPONENTS[id] ? id : DEFAULT_OPPONENT_ID;
  }
  function currentOpponent() {
    return OPPONENTS[currentOpponentId()] || OPPONENTS[DEFAULT_OPPONENT_ID];
  }
  function difficultyReward(win) {
    const key = (game && game.difficulty) || currentDifficulty();
    const table = DIFFICULTY_REWARDS[key] || DIFFICULTY_REWARDS.easy;
    const diff = DIFFICULTY[key] || DIFFICULTY.easy;
    return { key, label: diff.label, amount: win ? table.win : table.loss };
  }
  function currentDifficulty() {
    // CP0-16：首次玩（無設定）預設「簡單」對新手友善；老玩家沿用已選難度
    let d = "easy";
    try { d = localStorage.getItem("cardgame_difficulty") || "easy"; } catch {}
    return DIFFICULTY[d] ? d : "easy";
  }
  // ---- 法術效果（spell.effect）----
  // 保留舊名稱給測試掛鉤；實際規則委派給 core.js。
  const SPELL_EFFECTS = Object.fromEntries(Object.entries(Core.SPELL_EFFECTS).map(([effect, spec]) => [
    effect,
    {
      needsTarget: spec.needsTarget,
      apply: (g, target) => {
        const result = Core.castSpellEffect(g, { side: "player", effect, targetUid: target && target.uid }, rng);
        handleCoreResult(result);
        logSpellEffect(result.card || { effect }, target, "player");
      },
    },
  ]));

  // ---- 技能效果（戰吼/亡語 trigger）----
  // 保留舊名稱給測試掛鉤；實際規則委派給 core.js。
  const ABILITY_EFFECTS = {
    healHero2:      (g, side, target, source) => triggerAbilityUi(g, side, "healHero2", target, source),
    damageAny1:     (g, side, target, source) => triggerAbilityUi(g, side, "damageAny1", target, source),
    aoeEnemy2:      (g, side, target, source) => triggerAbilityUi(g, side, "aoeEnemy2", target, source),
    aoeEnemy1:      (g, side, target, source) => triggerAbilityUi(g, side, "aoeEnemy1", target, source),
    buffAdjacent1:  (g, side, target, source) => triggerAbilityUi(g, side, "buffAdjacent1", target, source),
    summonSkeleton: (g, side, target, source) => triggerAbilityUi(g, side, "summonSkeleton", target, source),
    summonTwo1_1:   (g, side, target, source) => triggerAbilityUi(g, side, "summonTwo1_1", target, source),
    rebirth:        (g, side, target, source) => triggerAbilityUi(g, side, "rebirth", target, source),
    drawCard1:      (g, side, target, source) => triggerAbilityUi(g, side, "drawCard1", target, source),
    silenceIfDamaged: (g, side, target, source) => triggerAbilityUi(g, side, "silenceIfDamaged", target, source),
  };

  let game;
  const pendingSummonFx = new Set();
  const GUIDE_KEY = "cb_guide_done_v1";
  const PERF_KEY = "card_perf_mode_v1";
  const TEXT_SIZE_KEY = "card_text_size_v1";
  const AUDIO_MUTE_KEY = "card_audio_muted_v1";
  const SW_BOOT = window.__CARD_SW_BOOT || {};
  const SW_AUTO_RELOAD_WINDOW_MS = SW_BOOT.SW_AUTO_RELOAD_WINDOW_MS || 15000;
  const SW_AUTO_RELOAD_KEY = SW_BOOT.SW_AUTO_RELOAD_KEY || "card_sw_auto_reload_r58_v1";
  const swPageLoadedAt = SW_BOOT.swPageLoadedAt || Date.now();
  let guide = { active: false, step: 0, selectedAttacker: null };
  let audioCtx = null;
  let audioUnlocked = false;
  let finishFx = { win: false, lethal: false, confetti: 0, defeatFade: false };
  const perfState = { mode: "auto", effective: "high", fps: 60, frames: 0, last: 0, reason: "自動觀察中", history: [] };
  let detailReturnFocus = null;
  let missionReturnFocus = null;
  let chronicleReturnFocus = null;
  let lastUnlockedChapterIds = null;
  const ACTIVE_FX_SELECTOR = ".combat-ghost, .dmg-float, .hit-spark, .combo-float, .kw-pop, .confetti-piece, .burst-star, .spell-flash";
  const GUIDE_STEPS = [
    { label: "STEP 1 / 3", title: "先出一張牌", copy: "點手牌中發亮的「迅捷狼」。它有衝鋒，登場後可以立刻攻擊。" },
    { label: "STEP 2 / 3", title: "選擇攻擊", copy: "先點你場上的迅捷狼，再點敵方英雄完成一次攻擊。" },
    { label: "STEP 3 / 3", title: "結束回合", copy: "攻擊後點「結束回合」，讓對手行動。之後就照這個節奏出牌、攻擊、結束回合。" },
  ];

  function prefersReducedMotion() {
    try { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch { return false; }
  }

  function setHandDrawerOpen(open) {
    const drawer = document.getElementById("handDrawer");
    const toggle = document.getElementById("handDrawerToggle");
    if (!drawer || !toggle) return;
    const next = !!open;
    drawer.classList.toggle("open", next);
    toggle.setAttribute("aria-expanded", String(next));
    const count = game && game.player ? game.player.hand.length : 0;
    toggle.lastChild.textContent = next ? " · 點此收合" : " · 點此展開";
    const countEl = document.getElementById("handCount");
    if (countEl) countEl.textContent = String(count);
  }

  function audioMuted() {
    try { return localStorage.getItem(AUDIO_MUTE_KEY) === "1"; }
    catch { return false; }
  }

  function syncAudioButton() {
    const btn = document.getElementById("audioToggleBtn");
    if (!btn) return;
    const muted = audioMuted();
    btn.classList.toggle("is-muted", muted);
    btn.textContent = muted ? "M" : "SFX";
    btn.title = muted ? "Audio muted" : (audioUnlocked ? "Audio on" : "Audio unlocks on first gesture");
    btn.setAttribute("aria-pressed", muted ? "true" : "false");
  }

  function ensureAudio() {
    if (audioMuted()) { syncAudioButton(); return null; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    audioUnlocked = true;
    syncAudioButton();
    return audioCtx;
  }

  function setAudioMuted(muted) {
    try { localStorage.setItem(AUDIO_MUTE_KEY, muted ? "1" : "0"); } catch {}
    if (!muted) ensureAudio();
    syncAudioButton();
    return audioMuted();
  }

  function playTone(freq, duration, type, gain, delay, endFreq) {
    if (!audioUnlocked || audioMuted()) return;
    const ctx = audioCtx;
    if (!ctx) return;
    const now = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain || 0.045, now + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.025);
  }

  function playSound(kind) {
    if (!audioUnlocked || audioMuted()) return;
    if (kind === "play") { playTone(440, .06, "triangle", .035); playTone(660, .08, "triangle", .026, .055); }
    else if (kind === "attack") { playTone(190, .11, "sawtooth", .045, 0, 92); }
    else if (kind === "hurt") { playTone(120, .08, "square", .035, 0, 70); }
    else if (kind === "lethal") { playTone(220, .18, "sawtooth", .05); playTone(440, .16, "triangle", .04, .12); playTone(880, .28, "sine", .034, .24); }
    else if (kind === "death") { playTone(180, .22, "triangle", .038, 0, 48); }
  }

  function installAudioUnlock() {
    const unlock = () => ensureAudio();
    ["pointerdown", "keydown"].forEach((eventName) => document.addEventListener(eventName, unlock, { once: true, passive: true }));
    syncAudioButton();
  }

  function currentPerfMode() {
    let mode = "auto";
    try { mode = localStorage.getItem(PERF_KEY) || "auto"; } catch {}
    return ["auto", "high", "low"].includes(mode) ? mode : "auto";
  }

  function setPerfMode(mode) {
    const next = ["auto", "high", "low"].includes(mode) ? mode : "auto";
    try { localStorage.setItem(PERF_KEY, next); } catch {}
    applyPerfState(next, next === "low" ? "low" : "high", next === "auto" ? "自動觀察中" : next === "low" ? "手動鎖定低動畫" : "手動鎖定高動畫");
    flash(next === "auto" ? "效能模式：自動。" : next === "low" ? "效能模式：低動畫。" : "效能模式：高動畫。");
    return perfSnapshot();
  }

  function updatePerfDiagnostics() {
    const el = document.getElementById("perfDiag");
    const label = perfState.effective === "low" ? "低動畫" : "高動畫";
    const text = `FPS ${perfState.fps || "--"} · ${label} · ${perfState.reason || "自動觀察中"}`;
    if (el) {
      el.textContent = text;
      el.title = text;
    }
    return text;
  }

  function updatePerfHistory() {
    const el = document.getElementById("perfHistory");
    const text = perfState.history.length
      ? "紀錄 " + perfState.history.map((item) => `${item.time} ${item.reason}`).join("｜")
      : "紀錄 --";
    if (el) {
      el.textContent = text;
      el.title = text;
    }
    return text;
  }

  function perfTimeLabel(date) {
    const d = date || new Date();
    return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
  }

  function recordPerfHistory(reason) {
    if (!reason || !/(降低動畫|恢復高動畫)/.test(reason)) return;
    const last = perfState.history[0];
    if (last && last.reason === reason) return;
    perfState.history.unshift({ time: perfTimeLabel(), reason });
    perfState.history = perfState.history.slice(0, 5);
    updatePerfHistory();
  }

  function applyPerfState(mode, effective, reason, trackHistory) {
    const previousEffective = perfState.effective;
    perfState.mode = mode || currentPerfMode();
    perfState.effective = effective === "low" ? "low" : "high";
    if (reason) perfState.reason = reason;
    document.documentElement.dataset.perf = perfState.effective;
    const sel = document.getElementById("perfModeSel");
    if (sel) sel.value = perfState.mode;
    updatePerfDiagnostics();
    if (trackHistory && previousEffective !== perfState.effective) recordPerfHistory(perfState.reason);
    updatePerfHistory();
  }

  function applyPerfEstimate(fps) {
    perfState.fps = Math.round(Number(fps) || 0);
    const mode = currentPerfMode();
    if (mode === "low") applyPerfState("low", "low", "手動鎖定低動畫");
    else if (mode === "high") applyPerfState("high", "high", "手動鎖定高動畫");
    else if (perfState.fps < 45) applyPerfState("auto", "low", `FPS ${perfState.fps} 低於 45，自動降低動畫`, true);
    else if (perfState.fps >= 52) applyPerfState("auto", "high", `FPS ${perfState.fps} 回穩，恢復高動畫`, true);
    else applyPerfState("auto", perfState.effective, "自動觀察中");
    return perfSnapshot();
  }

  function isLowPerf() {
    return perfState.effective === "low";
  }

  function perfSnapshot() {
    return {
      mode: perfState.mode,
      effective: perfState.effective,
      fps: perfState.fps,
      reason: perfState.reason,
      text: updatePerfDiagnostics(),
      historyText: updatePerfHistory(),
      history: perfState.history.map((item) => ({ time: item.time, reason: item.reason })),
    };
  }

  function startPerfMonitor() {
    applyPerfState(currentPerfMode(), currentPerfMode() === "low" ? "low" : "high", currentPerfMode() === "low" ? "手動鎖定低動畫" : currentPerfMode() === "high" ? "手動鎖定高動畫" : "自動觀察中");
    const step = (now) => {
      if (!perfState.last) perfState.last = now;
      perfState.frames++;
      const elapsed = now - perfState.last;
      if (elapsed >= 1000) {
        applyPerfEstimate((perfState.frames * 1000) / elapsed);
        perfState.frames = 0;
        perfState.last = now;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function currentTextSize() {
    let size = "medium";
    try { size = localStorage.getItem(TEXT_SIZE_KEY) || "medium"; } catch {}
    return ["small", "medium", "large"].includes(size) ? size : "medium";
  }

  function applyTextSize(size) {
    const next = ["small", "medium", "large"].includes(size) ? size : "medium";
    document.documentElement.dataset.textSize = next;
    const sel = document.getElementById("textSizeSel");
    if (sel) sel.value = next;
    return next;
  }

  function setTextSize(size) {
    const next = applyTextSize(size);
    try { localStorage.setItem(TEXT_SIZE_KEY, next); } catch {}
    return next;
  }

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
    showToast("新版本可用，結束這場後重新整理即可更新。");
  }

  function installSwAutoReload() {
    window.__cardSwUpdatePrompt = showPwaUpdateNotice;
    if (window.__cardSwUpdatePending) showPwaUpdateNotice();
    if (window.__cardSwBootGuardInstalled) return;
    if (!("serviceWorker" in navigator)) return;
    let pwaReloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
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

  function installAccessibilityLabels() {
    const labels = {
      hintBtn: "取得本回合提示",
      newGameBtn: "開始新對戰",
      toPackBtn: "前往開包與牌組編輯",
      guideReplayBtn: "重看教學",
      endTurnBtn: "結束回合",
      mulliganBtn: "重抽起手",
      questClaimAllBtn: "領取所有可領每日任務",
      restartBtn: "再戰一場",
      overlayPackBtn: "前往開包",
      overlayQuestBtn: "領取每日任務",
      guideSkipBtn: "略過教學",
      guideHintBtn: "聚焦教學目標",
      missionDrawerBtn: "開啟任務抽屜",
      missionClaimAllBtn: "領取所有可領任務",
      missionDrawerClose: "關閉任務抽屜",
      kwCodexBtn: "開啟關鍵字圖鑑",
      kwCodexClose: "關閉關鍵字圖鑑",
      chronicleBtn: "開啟白潮編年史",
      chronicleClose: "關閉白潮編年史",
      chronicleChaptersTab: "顯示編年史章節",
      chronicleFactionsTab: "顯示陣營傳說",
      cardDetailClose: "關閉卡牌詳情",
    };
    Object.entries(labels).forEach(([id, label]) => {
      const el = document.getElementById(id);
      if (el && !el.getAttribute("aria-label")) el.setAttribute("aria-label", label);
    });
    const controls = {
      ddaToggle: "動態難度調節",
      aiThoughtToggle: "顯示 AI 思路",
      perfModeSel: "動畫效能模式",
      difficultySel: "選擇難度",
      opponentSel: "選擇對手",
      textSizeSel: "文字大小",
    };
    Object.entries(controls).forEach(([id, label]) => {
      const el = document.getElementById(id);
      if (el) el.setAttribute("aria-label", label);
    });
    const codex = document.getElementById("kwCodex");
    if (codex) {
      codex.setAttribute("role", "dialog");
      codex.setAttribute("aria-modal", "true");
      codex.setAttribute("aria-hidden", codex.classList.contains("show") ? "false" : "true");
    }
    const mission = document.getElementById("missionDrawer");
    if (mission) {
      mission.setAttribute("role", "dialog");
      mission.setAttribute("aria-modal", "true");
    }
    const chronicle = document.getElementById("chronicleModal");
    if (chronicle) {
      chronicle.setAttribute("role", "dialog");
      chronicle.setAttribute("aria-modal", "true");
      chronicle.setAttribute("aria-labelledby", "chronicleChaptersTab");
    }
    const detail = document.getElementById("cardDetail");
    if (detail) detail.setAttribute("aria-labelledby", "cardDetailTitle");
  }

  // ===== 初始化 =====
  function newGame() {
    pendingSummonFx.clear();
    stopGuide(false);
    document.body.classList.remove("defeat-fade");
    clearTransientFx();
    const board = document.querySelector(".board");
    if (board) board.classList.remove("lethal-slow", "shake-screen");
    finishFx = { win: false, lethal: false, confetti: 0, defeatFade: false };
    const diffKey = currentDifficulty();
    const D = DIFFICULTY[diffKey];
    const playerDeck = buildDeck(true);
    const playerDeckSource = playerDeck._deckSource || "fallback";
    const playerDeckIds = playerDeck.map((card) => card.id);
    const playerArchetype = detectDeckArchetype(playerDeckIds);
    const stats = loadStats();
    const dda = Core.ddaProfile(stats.dda);
    const opponent = currentOpponent();
    const enemyPlan = buildAiDeck(diffKey, playerArchetype, opponent);
    const enemyDeck = enemyPlan.deck;
    const enemyDeckIds = enemyDeck.map((card) => card.id);
    delete playerDeck._deckSource;
    game = {
      difficulty: diffKey, aiSmart: D.aiSmart,
      playerDeckSource,
      playerDeckIds,
      playerArchetype,
      enemyDeckSource: enemyPlan.source,
      enemyArchetype: enemyPlan.archetype,
      enemyDeckIds,
      enemyTemplateIds: enemyPlan.templateIds || [],
      opponentId: opponent.id,
      opponentName: opponent.name,
      opponentEmoji: opponent.emoji,
      opponent,
      dda,
      turnCount: 1,
      hintUsedTurn: null,
      lastHint: null,
      turn: "player",
      player: { side: "player", hp: D.playerHp, maxHp: D.playerHp, mana: 1, manaMax: 1, fatigue: 0, deck: playerDeck, hand: [], field: [] },
      enemy:  { side: "enemy",  hp: D.enemyHp, maxHp: D.enemyHp, mana: 0, manaMax: 0, fatigue: 0, deck: enemyDeck, hand: [], field: [] },
      selected: null,
      pendingSpell: null,
      over: false,
    };
    game.player.opp = game.enemy; game.enemy.opp = game.player;
    game.comboCount = 0;
    game.mulliganUsed = false; // CP2-6 起手可重抽一次
    for (let i = 0; i < D.playerDraw; i++) drawCard(game.player);
    for (let i = 0; i < D.enemyDraw; i++) drawCard(game.enemy);
    assertOpeningDeckTotal("player", game.player);
    assertOpeningDeckTotal("enemy", game.enemy);
    document.getElementById("overlay").classList.remove("show", "win", "lose");
    document.getElementById("log").innerHTML = "";
    log(`⚔️ 對戰開始！難度：${D.label}；對手：${opponent.emoji} ${opponent.name}。`, "me");
    render();
    syncDdaToggle();
    syncAiThoughtToggle();
    refreshChronicle();
    updateChronicleBadge();
    applyPerfState(currentPerfMode(), currentPerfMode() === "low" ? "low" : perfState.effective);
    offerMulligan(D.playerDraw); // 提供起手重抽
  }

  function hasSeenGuide() {
    try { return localStorage.getItem(GUIDE_KEY) === "1"; } catch { return true; }
  }

  function markGuideSeen() {
    try {
      localStorage.setItem(GUIDE_KEY, "1");
      localStorage.setItem("cb_tutorial_seen", "1");
    } catch {}
  }

  function guideEls() {
    return {
      root: document.getElementById("battleGuide"),
      title: document.getElementById("guideTitle"),
      label: document.getElementById("guideStepLabel"),
      copy: document.getElementById("guideCopy"),
    };
  }

  function clearGuideFocus() {
    document.querySelectorAll(".guide-focus").forEach((el) => el.classList.remove("guide-focus"));
  }

  function focusGuideTarget() {
    if (!guide.active) return;
    clearGuideFocus();
    let el = null;
    if (guide.step === 0) {
      setHandDrawerOpen(true);
      el = document.querySelector('.hand .card[data-card-id="wolf"]') || document.querySelector(".hand .card.playable");
    } else if (guide.step === 1) {
      setHandDrawerOpen(false);
      el = guide.selectedAttacker ? document.getElementById("enemyHero") : document.querySelector("#playerField .card.can-attack");
    } else if (guide.step === 2) {
      el = document.getElementById("endTurnBtn");
    }
    if (!el) return;
    el.classList.add("guide-focus");
    try { el.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch {}
  }

  function renderGuide() {
    const els = guideEls();
    if (!els.root) return;
    if (!guide.active) {
      els.root.classList.remove("show");
      clearGuideFocus();
      return;
    }
    const step = GUIDE_STEPS[guide.step] || GUIDE_STEPS[0];
    els.title.textContent = step.title;
    els.label.textContent = step.label;
    els.copy.textContent = step.copy;
    els.root.classList.add("show");
    focusGuideTarget();
  }

  function prepareGuideScenario() {
    if (!game) return;
    game.turn = "player";
    game.over = false;
    game.selected = null;
    game.pendingSpell = null;
    game.player.manaMax = Math.max(game.player.manaMax, 2);
    game.player.mana = Math.max(game.player.mana, 2);
    game.enemy.field = [];
    if (!game.player.hand.some((card) => card.id === "wolf")) {
      const wolf = getCardById("wolf");
      if (wolf) {
        wolf.uid = "guide" + Math.random().toString(36).slice(2, 8);
        wolf.maxHealth = wolf.health;
        game.player.hand.unshift(wolf);
      }
    }
    render();
  }

  function startGuide(resetGame) {
    if (resetGame) newGame();
    guide = { active: true, step: 0, selectedAttacker: null };
    prepareGuideScenario();
    renderGuide();
  }

  function stopGuide(markSeen) {
    if (!guide.active) return;
    guide.active = false;
    guide.selectedAttacker = null;
    if (markSeen) markGuideSeen();
    renderGuide();
  }

  function maybeStartGuide() {
    if (!hasSeenGuide()) startGuide(false);
  }

  function advanceGuide(eventName) {
    if (!guide.active) return;
    if (guide.step === 0 && eventName === "play") {
      guide.step = 1;
      guide.selectedAttacker = null;
      renderGuide();
    } else if (guide.step === 1 && eventName === "attackerSelected") {
      guide.selectedAttacker = game.selected;
      renderGuide();
    } else if (guide.step === 1 && eventName === "attack") {
      guide.step = 2;
      guide.selectedAttacker = null;
      renderGuide();
    } else if (guide.step === 2 && eventName === "endTurn") {
      stopGuide(true);
      flash("導引完成，輪到你自己判斷節奏。");
    }
  }

  // CP2-6 起手 Mulligan：開局可把起手牌洗回牌庫重抽一次，降低運氣權重
  function offerMulligan(drawCount) {
    const btn = document.getElementById("mulliganBtn");
    if (!btn) return;
    btn.style.display = "inline-block";
    btn.textContent = "🔄 重抽起手牌";
    btn.onclick = () => {
      if (game.mulliganUsed || game.turn !== "player") return;
      game.mulliganUsed = true;
      // 起手牌洗回牌庫再重抽
      game.player.deck.push(...game.player.hand);
      game.player.hand = [];
      shuffleInPlace(game.player.deck);
      for (let i = 0; i < drawCount; i++) drawCard(game.player);
      btn.style.display = "none";
      log("🔄 重抽起手牌！", "me");
      render();
    };
  }

  // 玩家牌庫：優先用「開卡包收藏」的卡（接通收藏→對戰，CP0-1）。
  // 讀 localStorage 的 cardpack_collection_v2（{collectKey: count}），
  // 把擁有的卡（含重複份數、閃卡）組進牌庫；不足 Core.DECK_SIZE 張才用卡池保底補。
  function loadCollection() {
    try { return JSON.parse(localStorage.getItem("cardpack_collection_v2")) || {}; }
    catch { return {}; }
  }
  function loadOwnedCards() {
    const coll = loadCollection();
    const owned = [];
    for (const [key, count] of Object.entries(coll)) {
      const foil = key.endsWith("#foil");
      const tide = key.endsWith("#tide");
      const id = foil || tide ? key.slice(0, -5) : key;
      const base = getCardById(id);
      if (!base) continue;
      for (let i = 0; i < count; i++) {
        const c = cloneCard(base);
        c.foil = foil;
        c.tide = tide;
        owned.push(c);
      }
    }
    return owned;
  }
  function loadSavedBattleDeck() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem("card_deck_v1")); } catch {}
    const saved = Core.migrateDeck(raw);
    const collection = loadCollection();
    const validation = Core.validateDeck(saved.cards, collection, CARD_POOL);
    if (!validation.ok) return null;
    const deck = Core.buildBattleDeck(saved.cards, CARD_POOL, rng, collection);
    if (deck.length !== Core.DECK_SIZE) return null;
    deck._deckSource = "saved";
    return deck;
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
      if (card.effect === "damage5" || card.effect === "damage8" || card.effect === "polymorph") score += 18;
      if (card.effect === "draw2") score += 20;
      if (card.effect === "buffTarget") score += 8;
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
    if (card.effect === "damage2" || card.effect === "damage3" || card.effect === "damage5" || card.effect === "mana2" || card.effect === "draw2") score += 18;
    if (card.effect === "giveShield" || card.effect === "buffTarget") score += 8;
    if (cost >= 6) score -= 18;
    return score;
  }

  function buildArchetypeDeckIds(kind) {
    const ids = [];
    const candidates = [...CARD_POOL].sort((a, b) =>
      (templateScore(b, kind) - templateScore(a, kind))
      || (a.cost - b.cost)
      || a.name.localeCompare(b.name, "zh-Hant")
      || a.id.localeCompare(b.id)
    );
    for (const card of candidates) {
      const maxCopies = card.rarity === "legendary" ? 1 : 2;
      for (let i = 0; i < maxCopies && ids.length < Core.DECK_SIZE; i++) ids.push(card.id);
      if (ids.length >= Core.DECK_SIZE) break;
    }
    return ids;
  }

  function buildArchetypeDeck(kind) {
    const ids = buildArchetypeDeckIds(kind);
    const deck = Core.buildBattleDeck(ids, CARD_POOL, rng);
    deck._templateIds = ids;
    return deck;
  }

  function detectDeckArchetype(ids) {
    const score = { aggro: 0, control: 0 };
    for (const id of Array.isArray(ids) ? ids : []) {
      const card = getCardById(id);
      if (!card || !score.hasOwnProperty(card.axis)) continue;
      score[card.axis] += 1;
    }
    if (score.aggro >= score.control + 2) return "aggro";
    if (score.control >= score.aggro + 2) return "control";
    return "neutral";
  }

  function randomArchetype() {
    return rng() < 0.5 ? "aggro" : "control";
  }

  function collectionForDeckIds(ids) {
    return (ids || []).reduce((acc, id) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, Object.create(null));
  }

  function buildOpponentDeck(opponent) {
    const picked = opponent || currentOpponent();
    const ids = Array.isArray(picked.deckIds) ? [...picked.deckIds] : [];
    const validation = Core.validateDeck(ids, collectionForDeckIds(ids), CARD_POOL);
    if (!validation.ok) {
      throw new Error(`AI opponent deck invalid: ${picked.id} ${validation.errors.join(" | ")}`);
    }
    const deck = Core.buildBattleDeck(ids, CARD_POOL, rng);
    deck._templateIds = ids;
    return deck;
  }

  function buildAiDeck(diffKey, playerArchetype, opponent) {
    const picked = opponent || currentOpponent();
    const deck = buildOpponentDeck(picked);
    return {
      deck,
      source: "opponent",
      archetype: picked.archetype || "neutral",
      templateIds: deck._templateIds || [],
      opponentId: picked.id,
      playerArchetype,
      difficulty: diffKey,
    };
  }

  function shuffleInPlace(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function legalCopyLimit(card) {
    return card && card.rarity === "legendary" ? 1 : 2;
  }

  function canAddDeckCopy(deck, card) {
    if (!card || !card.id) return false;
    return deck.filter((item) => item.id === card.id).length < legalCopyLimit(card);
  }

  function rollBattleCardByRarity() {
    const rarityEntries = Object.entries(window.RARITY || {});
    const total = rarityEntries.reduce((sum, [, spec]) => sum + (Number(spec.weight) || 0), 0);
    let roll = rng() * total;
    let picked = "common";
    for (const [key, spec] of rarityEntries) {
      const weight = Number(spec.weight) || 0;
      if (roll < weight) { picked = key; break; }
      roll -= weight;
    }
    const pool = CARD_POOL.filter((card) => card.rarity === picked);
    const source = pool[Math.floor(rng() * pool.length)] || CARD_POOL[0];
    const card = cloneCard(source);
    card.tide = rng() < (Number(window.TIDE_CHANCE) || 0);
    card.foil = !card.tide && rng() < (Number(window.FOIL_CHANCE) || 0);
    return card;
  }

  function fillDeckFromFullPool(deck) {
    const candidates = shuffleInPlace(CARD_POOL.map((card) => cloneCard(card)));
    let progressed = true;
    while (deck.length < Core.DECK_SIZE && progressed) {
      progressed = false;
      for (const card of candidates) {
        if (deck.length >= Core.DECK_SIZE) break;
        if (!canAddDeckCopy(deck, card)) continue;
        deck.push(cloneCard(card));
        progressed = true;
      }
    }
  }

  function assertOpeningDeckTotal(label, side) {
    const total = (side.hand ? side.hand.length : 0) + (side.deck ? side.deck.length : 0);
    if (total !== Core.DECK_SIZE) {
      throw new Error(`開局 ${label} 牌庫契約錯誤：hand+deck=${total}, expected=${Core.DECK_SIZE}`);
    }
  }

  function playableCost(side, card) {
    const base = Math.max(0, Number(card && card.cost) || 0);
    if (!card || card.type !== CARD_TYPE.SPELL) return base;
    const discount = Math.max(0, Math.floor(Number(side && side.nextSpellDiscount) || 0));
    return Math.max(0, base - discount);
  }

  // useCollection=true：玩家用開包收藏；false：AI 用隨機卡池
  function buildDeck(useCollection) {
    if (useCollection) {
      const savedDeck = loadSavedBattleDeck();
      if (savedDeck && savedDeck.length === Core.DECK_SIZE) return savedDeck;
    }
    const deck = [];
    if (useCollection) {
      const owned = loadOwnedCards();
      shuffleInPlace(owned);
      for (const c of owned) {
        if (deck.length >= Core.DECK_SIZE) break;
        if (canAddDeckCopy(deck, c)) deck.push(c);
      }
    }
    let guard = 0;
    while (deck.length < Core.DECK_SIZE && guard < Core.DECK_SIZE * 50) {
      const card = rollBattleCardByRarity();
      if (canAddDeckCopy(deck, card)) deck.push(card);
      guard++;
    }
    if (deck.length < Core.DECK_SIZE) fillDeckFromFullPool(deck);
    if (useCollection) deck._deckSource = "fallback";
    return deck;
  }

  function drawCard(side) {
    const result = Core.drawCard(game, { side: side.side }, rng);
    handleCoreResult(result);
    return result.card;
  }

  // ===== 玩家出牌 =====
  function playFromHand(uid) {
    if (game.turn !== "player" || game.over) return;
    const result = Core.playCard(game, { side: "player", cardUid: uid }, rng);
    handleCoreResult(result);
    if (!result.ok) {
      if (result.reason === "pendingCancelledSame") { render(); return; }
      showCoreFailure(result);
      render();
      return;
    }
    setHandDrawerOpen(false);
    const pending = result.events.find((e) => e.type === "spellPending");
    if (pending) {
      flash(pending.need === "friendlyMinion" ? "選擇一個友方隨從" : "選擇一個敵方隨從");
      render();
      return;
    }
    if (result.card && result.card.type === CARD_TYPE.MINION) {
      trackCardUse(result.card);
      log(`你召喚了 ${result.card.name}。`, "me");
    } else if (result.card && result.card.type === CARD_TYPE.SPELL) {
      trackCardUse(result.card);
      logSpellEffect(result.card, result.target, "player");
    }
    render(); checkWin();
    advanceGuide("play");
  }

  // ===== 攻擊：嘲諷限制 =====
  function hasTaunt(field) { return Core.hasTaunt(field); }
  function isLegalTarget(defenderSide, target) {
    return Core.isLegalTarget(defenderSide, target);
  }
  function isRushHeroLocked(minion) {
    return !!(minion && minion.justPlayed && (minion.keywords || []).includes("rush") && !(minion.keywords || []).includes("charge"));
  }
  function canAttackHeroNow(minion) {
    return !!(minion && minion.canAttack && !isRushHeroLocked(minion));
  }
  function heroAttackPotential(minion) {
    if (!canAttackHeroNow(minion)) return 0;
    const attacks = (minion.keywords || []).includes("windfury") && !minion._windUsed ? 2 : 1;
    return (Number(minion.attack) || 0) * attacks;
  }

  function goPack() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "switchTab", target: "pack" }, "*");
    } else {
      window.location.href = "../card-pack/index.html";
    }
  }

  function clickEnemyMinion(uid) {
    if (game.turn !== "player" || game.over) return;
    const target = game.enemy.field.find((m) => m.uid === uid);
    if (!target) return;

    if (game.pendingSpell) {
      if (game.pendingSpell.need !== "enemyMinion") { flash("此法術需指定友方隨從。"); return; }
      resolvePendingSpell(target); return;
    }
    if (game.selected) {
      if (!isLegalTarget(game.enemy, target)) { flash("必須先攻擊嘲諷隨從！"); return; }
      const attacker = game.player.field.find((m) => m.uid === game.selected);
      if (attacker) resolveAttack(game.player, attacker, target);
      game.selected = null;
      render(); checkWin();
    }
  }

  function clickFriendlyMinionAsTarget(target) {
    if (game.pendingSpell && game.pendingSpell.need === "friendlyMinion") { resolvePendingSpell(target); return true; }
    return false;
  }

  function resolvePendingSpell(target) {
    const result = Core.resolveTarget(game, { side: "player", targetUid: target && target.uid }, rng);
    handleCoreResult(result);
    if (!result.ok) showCoreFailure(result);
    else if (result.card) {
      trackCardUse(result.card);
      logSpellEffect(result.card, result.target, "player");
    }
    render(); checkWin();
  }

  function clickEnemyHero() {
    if (game.turn !== "player" || game.over) return;
    if (game.pendingSpell) { flash("此法術需指定隨從。"); return; }
    if (game.selected) {
      if (hasTaunt(game.enemy.field)) { flash("敵方有嘲諷，不能直接攻擊英雄！"); return; }
      const attacker = game.player.field.find((m) => m.uid === game.selected);
      if (attacker) {
        if (isRushHeroLocked(attacker)) {
          flash("突襲隨從登場當回合只能攻擊隨從！");
          game.selected = null;
          render();
          return;
        }
        animateAttackToward(attacker.uid, "enemyHero");
        const result = Core.resolveHeroAttack(game, { attackerSide: "player", attackerUid: attacker.uid, defenderSide: "enemy" }, rng);
        handleCoreResult(result);
        if (result.ok) playSound("attack");
        if (result.ok) log(`${attacker.name} 攻擊敵方英雄，造成 ${attacker.attack} 點傷害！`, "me");
        else showCoreFailure(result);
        if (result.ok) advanceGuide("attack");
      }
      game.selected = null;
      render(); checkWin();
    }
  }

  function selectMyMinion(uid) {
    if (game.turn !== "player" || game.over) return;
    const m = game.player.field.find((x) => x.uid === uid);
    if (!m) return;
    if (game.pendingSpell && clickFriendlyMinionAsTarget(m)) return;
    if (!m.canAttack) { flash("這個隨從本回合無法攻擊。"); return; }
    game.selected = game.selected === uid ? null : uid;
    render();
    if (game.selected === uid) advanceGuide("attackerSelected");
  }

  function cancelTargeting(message) {
    if (!game) return;
    const hadTargeting = !!(game.selected || game.pendingSpell);
    game.selected = null;
    game.pendingSpell = null;
    if (message && hadTargeting) flash(message);
    if (hadTargeting) render();
  }

  function targetStatusText() {
    if (!game) return "載入中。";
    if (game.over) return "對戰已結束。";
    if (game.turn !== "player") return "對手行動中。";
    if (game.pendingSpell) {
      return game.pendingSpell.need === "friendlyMinion" ? "請選擇友方隨從" : "請選擇敵方隨從";
    }
    if (game.selected) {
      const attacker = game.player.field.find((m) => m.uid === game.selected);
      if (hasTaunt(game.enemy.field)) return "請選擇有嘲諷的敵方隨從";
      if (isRushHeroLocked(attacker)) return "請選擇敵方隨從（突襲本回合不能攻擊英雄）";
      return "請選擇敵方隨從或敵方英雄";
    }
    return "輪到你行動。";
  }

  function updateTargetStatus() {
    const el = document.getElementById("targetStatus");
    if (!el) return;
    el.textContent = targetStatusText();
    el.classList.toggle("active", !!(game && (game.selected || game.pendingSpell || game.turn !== "player")));
  }

  function targetPoolForPlayerSpell(card) {
    const spec = Core.SPELL_EFFECTS[card.effect] || { needsTarget: null };
    if (spec.needsTarget === "enemyMinion") return [...game.enemy.field].sort((a, b) => minionThreatScore(b) - minionThreatScore(a));
    if (spec.needsTarget === "friendlyMinion") return [...game.player.field].sort((a, b) => minionThreatScore(b) - minionThreatScore(a));
    return [];
  }

  function playerHintScore(card, target) {
    const keywords = card.keywords || [];
    let score = 0;
    if (card.type === CARD_TYPE.MINION) {
      score = 20 - card.cost * 2 + (Number(card.attack) || 0) * 4 + (Number(card.health) || 0);
      if (keywords.includes("charge")) score += 16;
      if (keywords.includes("rush")) score += game.enemy.field.length ? 12 : 3;
      if (keywords.includes("taunt")) score += game.player.hp <= 16 ? 10 : 3;
      if (keywords.includes("lifesteal")) score += game.player.hp <= 20 ? 10 : 4;
      return score;
    }
    if (card.effect === "mana2") return game.player.hand.some((c) => c !== card && c.cost > game.player.mana) ? 28 : 8;
    if (card.effect === "heal5") return game.player.maxHp - game.player.hp >= 4 ? 24 : 6;
    if (card.effect === "draw2") return game.player.hand.length < Core.HAND_LIMIT ? (game.player.hand.length <= Core.HAND_LIMIT - 2 ? 26 : 14) : 4;
    if (card.effect === "aoe1" || card.effect === "aoe2") {
      const damage = effectiveSpellDamage(game.player, card, target);
      const kills = game.enemy.field.filter((m) => m.health <= damage).length;
      return game.enemy.field.length >= 2 ? 26 + game.enemy.field.length * 3 + kills * 5 : 5;
    }
    if (card.effect === "giveShield" || card.effect === "buffTarget") return target ? 16 + minionThreatScore(target) : -999;
    if (card.effect === "damage2" || card.effect === "damage3" || card.effect === "damage5" || card.effect === "damage8") {
      const damage = effectiveSpellDamage(game.player, card, target);
      return target ? 18 + minionThreatScore(target) + (target.health <= damage ? 8 : 0) : -999;
    }
    if (card.effect === "polymorph") return target ? 18 + minionThreatScore(target) : -999;
    return 0;
  }

  function minionLine(m) {
    if (!m) return "目標";
    return `${Number(m.attack) || 0}/${Number(m.health) || 0} ${m.name}`;
  }

  function spellDamage(effect, card, target) {
    if (card && Number.isFinite(Number(card.baseDamage))) {
      let base = Number(card.baseDamage);
      if (card.tauntBonusDamage && target && (target.keywords || []).includes("taunt")) base += Number(card.tauntBonusDamage) || 0;
      return base;
    }
    if (effect === "damage8") return 8;
    if (effect === "damage5") return 5;
    if (effect === "damage3") return 3;
    if (effect === "damage2") return 2;
    if (effect === "aoe2") return 2;
    if (effect === "aoe1") return 1;
    return 0;
  }

  function effectiveSpellDamage(side, effectOrCard, target) {
    const card = effectOrCard && typeof effectOrCard === "object" ? effectOrCard : null;
    const effect = card ? card.effect : effectOrCard;
    const base = spellDamage(effect, card, target);
    if (!base) return 0;
    return base + Core.spellPower(side || {});
  }

  function spellPowerNote(side, effectOrCard, target) {
    const card = effectOrCard && typeof effectOrCard === "object" ? effectOrCard : null;
    const effect = card ? card.effect : effectOrCard;
    const base = spellDamage(effect, card, target);
    const sp = base ? Core.spellPower(side || {}) : 0;
    return sp > 0 ? `（含法強 +${sp}）` : "";
  }

  function hintCopyForPlay(card, target) {
    const keywords = card.keywords || [];
    if (card.type === CARD_TYPE.MINION) {
      if (keywords.includes("charge")) return { reason: "有衝鋒，能立刻施壓。", estimate: "" };
      if (keywords.includes("rush") && game.enemy.field.length) return { reason: "有突襲，可立即處理敵方隨從。", estimate: "" };
      if (keywords.includes("taunt") && game.player.hp <= 16) return { reason: "血量偏低，先架嘲諷保護英雄。", estimate: "" };
      if (keywords.includes("lifesteal") && game.player.hp <= 20) return { reason: "吸血能穩住生命。", estimate: "" };
      return { reason: "用足法力建立場面。", estimate: "" };
    }
    if (card.effect === "mana2") return { reason: "先補法力，能接著打出更高費手牌。", estimate: "" };
    if (card.effect === "heal5") return { reason: "英雄受傷，治療能拉回安全血線。", estimate: "預計恢復 5 點生命。" };
    if (card.effect === "draw2") return { reason: "手牌還有空間，補兩張牌能延續後續回合資源。", estimate: "預計抽 2 張牌；手牌滿時會燒牌。" };
    if (card.effect === "aoe1" || card.effect === "aoe2") {
      const damage = effectiveSpellDamage(game.player, card);
      const kills = game.enemy.field.filter((m) => m.health <= damage).length;
      return kills > 0
        ? { reason: `此法術可換 ${kills} 隻隨從。`, estimate: `預計造成全場 ${damage} 點傷害${spellPowerNote(game.player, card)}。` }
        : { reason: "敵方場面展開，範圍法術能壓低全場血量。", estimate: `預計造成全場 ${damage} 點傷害${spellPowerNote(game.player, card)}。` };
    }
    if (card.effect === "giveShield") return { reason: "保護場上最高威脅隨從。", estimate: target ? `預計讓 ${target.name} 獲得聖盾。` : "" };
    if (card.effect === "buffTarget") return { reason: "強化場上最高威脅隨從。", estimate: target ? `預計讓 ${target.name} 獲得 +2/+2。` : "" };
    if (card.effect === "polymorph") return { reason: "變形高威脅隨從，降低反擊壓力。", estimate: target ? `預計把 ${minionLine(target)} 變成綿羊。` : "" };
    const damage = effectiveSpellDamage(game.player, card, target);
    if (damage && target) {
      const hasTauntTarget = (target.keywords || []).includes("taunt");
      return {
        reason: hasTauntTarget ? "先解嘲諷才能打臉。" : "先移除高威脅隨從，降低下回合傷害。",
        estimate: target.health <= damage ? `預計擊殺 ${minionLine(target)}${spellPowerNote(game.player, card, target)}。` : `預計對 ${target.name} 造成 ${damage} 點傷害${spellPowerNote(game.player, card, target)}。`,
      };
    }
    return { reason: "這一步能提升目前局面的交換效率。", estimate: "" };
  }

  function hintCopyForAttack(attacker, target, hero, forcedTaunt) {
    if (hero) return { reason: "場上沒有嘲諷，直接打臉能加速終結。", estimate: `預計造成 ${attacker.attack} 點英雄傷害。` };
    if (forcedTaunt) {
      return {
        reason: "先解嘲諷才能打臉。",
        estimate: target && target.health <= attacker.attack ? `預計擊殺 ${minionLine(target)}。` : `預計對 ${target.name} 造成 ${attacker.attack} 點傷害。`,
      };
    }
    return {
      reason: "先清掉高威脅隨從，降低下回合傷害。",
      estimate: target && target.health <= attacker.attack ? `預計擊殺 ${minionLine(target)}。` : `預計對 ${target.name} 造成 ${attacker.attack} 點傷害。`,
    };
  }

  function bestHintAction() {
    if (!game || game.turn !== "player" || game.over) return null;
    const actions = [];
    for (const card of game.player.hand) {
      if (playableCost(game.player, card) > game.player.mana) continue;
      if (card.type === CARD_TYPE.MINION) {
        if (game.player.field.length >= MAX_FIELD) continue;
        actions.push(Object.assign({ type: "play", card, score: playerHintScore(card), label: `建議出牌：${card.name}` }, hintCopyForPlay(card)));
      } else {
        const spec = Core.SPELL_EFFECTS[card.effect] || { needsTarget: null };
        const target = spec.needsTarget ? targetPoolForPlayerSpell(card)[0] : null;
        if (spec.needsTarget && !target) continue;
        actions.push(Object.assign({ type: "play", card, target, score: playerHintScore(card, target), label: target ? `建議施放 ${card.name} → ${target.name}` : `建議施放：${card.name}` }, hintCopyForPlay(card, target)));
      }
    }
    for (const attacker of game.player.field.filter((m) => m.canAttack)) {
      const taunts = game.enemy.field.filter((m) => (m.keywords || []).includes("taunt"));
      if (taunts.length) {
        const target = taunts.sort((a, b) => a.health - b.health || minionThreatScore(b) - minionThreatScore(a))[0];
        actions.push(Object.assign({ type: "attack", attacker, target, score: 18 + minionThreatScore(target), label: `建議攻擊：${attacker.name} → ${target.name}` }, hintCopyForAttack(attacker, target, false, true)));
      } else if (canAttackHeroNow(attacker)) {
        actions.push(Object.assign({ type: "attack", attacker, hero: "enemyHero", score: 30 + attacker.attack * 4, label: `建議攻擊敵方英雄：${attacker.name}` }, hintCopyForAttack(attacker, null, true, false)));
      } else if (game.enemy.field.length) {
        const target = [...game.enemy.field].sort((a, b) => a.health - b.health || minionThreatScore(b) - minionThreatScore(a))[0];
        actions.push(Object.assign({ type: "attack", attacker, target, score: 12 + minionThreatScore(target), label: `建議攻擊：${attacker.name} → ${target.name}` }, hintCopyForAttack(attacker, target, false, false)));
      }
    }
    return actions.sort((a, b) => b.score - a.score)[0] || null;
  }

  function clearHintHighlights() {
    document.querySelectorAll(".hint-highlight").forEach((el) => el.classList.remove("hint-highlight"));
  }

  function showHint() {
    if (!game || game.turn !== "player" || game.over) return null;
    if (game.hintUsedTurn === game.turnCount) {
      flash("本回合已使用提示。");
      return null;
    }
    const action = bestHintAction();
    if (!action) {
      flash("目前沒有可執行的建議。");
      return null;
    }
    game.hintUsedTurn = game.turnCount;
    clearHintHighlights();
    const primaryUid = action.card ? action.card.uid : action.attacker && action.attacker.uid;
    const primary = primaryUid ? elFor(primaryUid) : null;
    const target = action.target ? elFor(action.target.uid) : action.hero ? document.getElementById(action.hero) : null;
    if (primary) primary.classList.add("hint-highlight");
    if (target) target.classList.add("hint-highlight");
    const why = [action.reason, action.estimate].filter(Boolean).join(" ");
    game.lastHint = {
      type: action.type,
      label: action.label,
      reason: action.reason || "",
      estimate: action.estimate || "",
      cardId: action.card && action.card.id,
      attackerId: action.attacker && action.attacker.id,
      targetId: action.target && action.target.id,
      hero: action.hero || "",
    };
    flash(why ? `${action.label}｜${why}` : action.label);
    setTimeout(clearHintHighlights, 3000);
    updateHintButton();
    return action;
  }

  function updateHintButton() {
    const btn = document.getElementById("hintBtn");
    if (!btn || !game) return;
    const used = game.hintUsedTurn === game.turnCount;
    btn.disabled = game.turn !== "player" || game.over || used;
    btn.title = used ? "本回合已使用提示" : "本回合提示最佳一步";
  }

  // ===== 戰鬥結算（含聖盾、劇毒、連擊）=====
  function resolveAttack(attackerSide, attacker, defender) {
    animateAttackToward(attacker.uid, defender.uid);
    const result = Core.resolveAttack(game, {
      attackerSide: attackerSide.side,
      attackerUid: attacker.uid,
      defenderUid: defender.uid,
    }, rng);
    handleCoreResult(result);
    if (result.ok) playSound("attack");
    if (result.ok) log(`${attacker.name} 與 ${defender.name} 交戰！`, attackerSide.side === "player" ? "me" : "ai");
    else showCoreFailure(result);
    if (result.ok && attackerSide.side === "player") advanceGuide("attack");
  }

  // 對隨從造成傷害（含聖盾、劇毒、跳字；亡語在 cleanup 觸發）
  // source：造成傷害的隨從（用來判斷劇毒），可省略（法術傷害）
  function applyDamage(g, minion, amount, source) {
    const result = Core.applyDamage(g, { targetUid: minion && minion.uid, sourceUid: source && source.uid, amount }, rng);
    handleCoreResult(result);
  }
  function dealDamageToMinion(g, minion, amount) {
    const result = Core.dealDamageToMinion(g, { targetUid: minion && minion.uid, amount }, rng);
    handleCoreResult(result);
  }
  function aoe(g, side, amount) {
    const result = Core.aoe(g, { side: side.side, amount }, rng);
    handleCoreResult(result);
  }
  function healHero(side, amount) {
    Core.healHero(side, amount, []);
  }
  function addShield(m) {
    Core.addShield(m, []);
    flashCard(m.uid, "shield-gain");
  }

  function polymorph(g, minion) {
    Core.polymorph(minion, []);
    flashKeyword2(minion.uid, "變形！");
  }

  function summon(side, card, animate) {
    const result = Core.summon(game, { side: side.side, card, reason: animate ? "play" : "effect" }, rng);
    handleCoreResult(result);
    return result.ok;
  }

  // 清掉死亡隨從，並觸發亡語。
  // 順序刻意是「先移除全部死者、再觸發亡語」：亡語召喚的 token 才不會被垂死隨從
  // 佔住的場位擋掉（summon 有 MAX_FIELD 上限），也不依賴迭代中改動陣列的隱性行為。
  function cleanupField(side) {
    const result = Core.cleanupField(game, { side: side.side }, rng);
    handleCoreResult(result);
  }

  // 回復：回合結束時，帶 regenerate 的隨從補滿生命
  function regenerateField(side) {
    const result = Core.regenerateField(game, { side: side.side });
    handleCoreResult(result);
  }

  // ===== AI 回合 =====
  function endTurn() {
    if (game.turn !== "player" || game.over) return;
    const result = Core.advanceTurn(game, { phase: "endPlayer" }, rng);
    handleCoreResult(result);
    render();
    advanceGuide("endTurn");
    const gRef = game;
    setTimeout(() => { if (game === gRef) aiTurn(); }, 700); // 幽靈計時器防護
  }

  function minionThreatScore(m) {
    if (!m) return 0;
    const keywords = m.keywords || [];
    let score = (Number(m.attack) || 0) * 3 + (Number(m.health) || 0);
    if (keywords.includes("taunt")) score += 5;
    if (keywords.includes("charge") || keywords.includes("windfury")) score += 4;
    if (keywords.includes("poison") || keywords.includes("lifesteal")) score += 3;
    if (m.shield) score += 3;
    return score;
  }

  function ddaProfile() {
    return game && game.dda ? game.dda : Core.ddaProfile();
  }

  function maybeDdaSecondBest(items) {
    const list = Array.isArray(items) ? items : [];
    const profile = ddaProfile();
    if (profile.mistakeRate > 0 && list.length > 1 && rng() < profile.mistakeRate) {
      const copy = [...list];
      [copy[0], copy[1]] = [copy[1], copy[0]];
      return copy;
    }
    return list;
  }

  function aiThoughtEnabled() {
    try { return localStorage.getItem("card_ai_thoughts_v1") === "1"; }
    catch { return false; }
  }

  function syncAiThoughtToggle() {
    const toggle = document.getElementById("aiThoughtToggle");
    if (!toggle) return;
    toggle.checked = aiThoughtEnabled();
  }

  function setAiThoughtEnabled(enabled) {
    try { localStorage.setItem("card_ai_thoughts_v1", enabled ? "1" : "0"); } catch {}
    syncAiThoughtToggle();
    flash(enabled ? "已開啟 AI 思路。" : "已關閉 AI 思路。");
    return aiThoughtEnabled();
  }

  function logAiThought(message) {
    if (aiThoughtEnabled() && message) log(`AI：${message}`, "ai");
  }

  function findBattleMinion(uid) {
    if (!uid || !game) return null;
    return [...game.player.field, ...game.enemy.field].find((m) => m.uid === uid) || null;
  }

  function aiMinionReason(card) {
    const kind = game.enemyArchetype || "random";
    const keywords = card.keywords || [];
    if (kind === "aggro") {
      if (keywords.includes("charge")) return `快攻優先立即傷害，召喚 ${card.name} 施壓。`;
      if (keywords.includes("rush")) return `快攻先搶節奏，${card.name} 可處理阻擋者。`;
      return `快攻優先鋪場，打出 ${card.name} 增加場攻。`;
    }
    if (kind === "control") {
      if (keywords.includes("taunt")) return `控制優先護血，架起 ${card.name} 擋住攻勢。`;
      if (keywords.includes("lifesteal")) return `控制需要回復資源，${card.name} 可穩住血線。`;
      return `控制優先高品質站場，打出 ${card.name}。`;
    }
    return `依費用效率打出 ${card.name}。`;
  }

  function aiSpellReason(card, target) {
    const effect = card.effect;
    if (effect === "heal5") return `護血優先，${card.name} 回復英雄生命。`;
    if (effect === "mana2") return `先取得法力，準備接續高費手牌。`;
    if (effect === "draw2") return `資源不足，${card.name} 補充兩張手牌。`;
    if (effect === "aoe1" || effect === "aoe2") return `解場優先，${card.name} 壓低你的整個場面${spellPowerNote(game.enemy, effect)}。`;
    if (effect === "giveShield" && target) return `保護核心隨從，讓 ${target.name} 獲得聖盾。`;
    if (effect === "polymorph" && target) return `解掉高威脅，將 ${target.name} 變形。`;
    if ((effect === "damage2" || effect === "damage3" || effect === "damage5" || effect === "damage8") && target) return `解場優先，${card.name} 換掉 ${target.name}${spellPowerNote(game.enemy, card, target)}。`;
    if (effect === "buffTarget" && target) return `強化核心隨從，讓 ${target.name} 變成更穩的威脅。`;
    return `依局面施放 ${card.name || fallbackSpellName(effect)}。`;
  }

  function aiAttackReason(attacker, target, options) {
    const opt = options || {};
    if (opt.hero) {
      if (opt.lethal) return `已達斬殺線，${attacker.name} 直接攻擊英雄。`;
      return `沒有嘲諷阻擋，${attacker.name} 直接壓低英雄血量。`;
    }
    if (!target) return "";
    if (opt.forcedTaunt) return `先解嘲諷，${attacker.name} 攻擊 ${target.name} 才能打開路線。`;
    if (isRushHeroLocked(attacker)) return `突襲本回合不能打臉，${attacker.name} 先交換 ${target.name}。`;
    return `解場優先，${attacker.name} 攻擊 ${target.name} 降低下回合傷害。`;
  }

  function chooseRemovalTarget(effectOrCard) {
    const card = effectOrCard && typeof effectOrCard === "object" ? effectOrCard : null;
    const effect = card ? card.effect : effectOrCard;
    const field = [...game.player.field];
    if (!field.length) return null;
    if (effect === "polymorph") {
      const worthTransforming = field.filter((m) =>
        m.health >= 5 || m.attack >= 4 || (m.keywords || []).includes("taunt") || (m.keywords || []).includes("regenerate")
      );
      return maybeDdaSecondBest((worthTransforming.length ? worthTransforming : field).sort((a, b) => minionThreatScore(b) - minionThreatScore(a)))[0] || null;
    }
    if (spellDamage(effect, card) > 0) {
      return maybeDdaSecondBest(field.sort((a, b) => {
        const lethalA = a.health <= effectiveSpellDamage(game.enemy, card || effect, a) ? 1 : 0;
        const lethalB = b.health <= effectiveSpellDamage(game.enemy, card || effect, b) ? 1 : 0;
        return (lethalB - lethalA) || (minionThreatScore(b) - minionThreatScore(a));
      }))[0] || null;
    }
    return null;
  }

  function chooseShieldTarget() {
    return maybeDdaSecondBest([...game.enemy.field]
      .filter((m) => !m.shield)
      .sort((a, b) => {
        const tauntA = (a.keywords || []).includes("taunt") ? 1 : 0;
        const tauntB = (b.keywords || []).includes("taunt") ? 1 : 0;
        return (tauntB - tauntA) || (minionThreatScore(b) - minionThreatScore(a));
      }))[0] || null;
  }

  function chooseBuffTarget() {
    return maybeDdaSecondBest([...game.enemy.field]
      .sort((a, b) => {
        const tauntA = (a.keywords || []).includes("taunt") ? 1 : 0;
        const tauntB = (b.keywords || []).includes("taunt") ? 1 : 0;
        return (tauntB - tauntA) || (minionThreatScore(b) - minionThreatScore(a)) || ((b.health || 0) - (a.health || 0));
      }))[0] || null;
  }

  function chooseAiSpellPlay(card) {
    const kind = game.enemyArchetype || "random";
    const opponent = game.opponent || currentOpponent();
    const ai = game.enemy;
    const playerField = game.player.field;
    if (kind === "random") {
      if (card.effect === "heal5") return { used: ai.hp <= 22, targetUid: null };
      if (card.effect === "aoe1" || card.effect === "aoe2") return { used: playerField.length >= 2, targetUid: null };
      if (card.effect === "draw2") return { used: ai.hand.length <= Core.HAND_LIMIT - 2, targetUid: null };
      if (card.effect === "giveShield") {
        const target = chooseShieldTarget();
        return { used: !!target, targetUid: target && target.uid };
      }
      if (card.effect === "polymorph") {
        const target = chooseRemovalTarget(card);
        return { used: !!target, targetUid: target && target.uid };
      }
      if (card.effect === "damage2" || card.effect === "damage3" || card.effect === "damage5" || card.effect === "damage8") {
        const target = [...playerField].sort((a, b) => b.attack - a.attack)[0] || null;
        return { used: !!target, targetUid: target && target.uid };
      }
      if (card.effect === "buffTarget") {
        const target = chooseBuffTarget();
        return { used: !!target, targetUid: target && target.uid };
      }
      if (card.effect === "mana2") return { used: true, targetUid: null };
      if (card.effect === "nextSpellMinus1") return { used: true, targetUid: null };
      return { used: false, targetUid: null };
    }
    if (card.effect === "heal5") {
      const missingHp = ai.maxHp - ai.hp;
      return { used: missingHp >= (kind === "control" ? 4 : 8), targetUid: null };
    }
    if (card.effect === "aoe1" || card.effect === "aoe2") {
      const pressure = playerField.reduce((sum, m) => sum + (Number(m.attack) || 0), 0);
      const enoughTargets = kind === "control" ? (playerField.length >= 2 || pressure >= 4) : playerField.length >= 3;
      return { used: enoughTargets, targetUid: null };
    }
    if (card.effect === "mana2") {
      return { used: ai.hand.some((c) => c !== card && playableCost(ai, c) > ai.mana), targetUid: null };
    }
    if (card.effect === "draw2") {
      const room = Core.HAND_LIMIT - ai.hand.length;
      return { used: room >= (kind === "control" || kind === "spellburst" ? 1 : 2), targetUid: null };
    }
    if (card.effect === "giveShield") {
      const target = chooseShieldTarget();
      const used = !!target && (kind === "control" || (target.attack || 0) >= 3);
      return { used, targetUid: target && target.uid };
    }
    if (card.effect === "buffTarget") {
      const target = chooseBuffTarget();
      const used = !!target && (kind === "aggro" || (target.keywords || []).includes("taunt") || minionThreatScore(target) >= 10);
      return { used, targetUid: target && target.uid };
    }
    if (card.effect === "damage2" || card.effect === "damage3" || card.effect === "damage5" || card.effect === "damage8" || card.effect === "polymorph") {
      const target = chooseRemovalTarget(card);
      const hasTauntTarget = target && (target.keywords || []).includes("taunt");
      const used = !!target && (kind === "control" || kind === "spellburst" || hasTauntTarget || minionThreatScore(target) >= 12);
      return { used, targetUid: target && target.uid };
    }
    if (card.effect === "nextSpellMinus1") {
      const followSpell = ai.hand.some((c) => c !== card && c.type === CARD_TYPE.SPELL && c.cost > 0);
      return { used: followSpell || (Number(opponent.faceBias) || 0) >= 0.5, targetUid: null };
    }
    return { used: false, targetUid: null };
  }

  function aiPlayPriority(card) {
    const kind = game.enemyArchetype || "random";
    if (kind === "random") return card.cost * 10 + (card.type === CARD_TYPE.MINION ? 2 : 0);
    const keywords = card.keywords || [];
    const attack = Number(card.attack) || 0;
    const health = Number(card.health) || 0;
    const cost = Number(card.cost) || 0;
    const opponent = game.opponent || currentOpponent();
    const tauntBias = Math.max(0, Math.min(1, Number(opponent.tauntBias) || 0));
    const spellPlan = card.type === CARD_TYPE.SPELL ? chooseAiSpellPlay(card) : null;
    if (kind === "control") {
      let score = cost * 7 + health * 3 + attack;
      if (card.axis === "control") score += 24;
      if (keywords.includes("taunt")) score += 18 + tauntBias * 14;
      if (keywords.includes("lifesteal")) score += 12;
      if (keywords.includes("divineshield") || keywords.includes("regenerate")) score += 8;
      if (card.type === CARD_TYPE.SPELL) score += spellPlan && spellPlan.used ? 34 : -8;
      score += ddaProfile().scoreBias * (card.axis === "control" || (spellPlan && spellPlan.used) ? 40 : 10);
      return score;
    }
    if (kind === "spellburst") {
      let score = 80 - cost * 6 + attack * 2 + health;
      if (keywords.includes("spellpower")) score += 24;
      if (keywords.includes("battlecry")) score += 6;
      if (card.type === CARD_TYPE.SPELL) score += spellPlan && spellPlan.used ? 42 : -6;
      if (card.effect === "nextSpellMinus1") score += 18;
      score += ddaProfile().scoreBias * (card.type === CARD_TYPE.SPELL || keywords.includes("spellpower") ? 40 : 10);
      return score;
    }
    let score = 110 - cost * 9 + attack * 5 + health;
    if (card.axis === "aggro") score += 24;
    if (keywords.includes("charge")) score += 24;
    if (keywords.includes("rush")) score += 14;
    if (keywords.includes("windfury")) score += 10;
    if (keywords.includes("taunt")) score += tauntBias * 6;
    if (card.type === CARD_TYPE.SPELL) score += spellPlan && spellPlan.used ? 22 : -10;
    score += ddaProfile().scoreBias * (card.axis === "aggro" || keywords.includes("charge") ? 40 : 10);
    return score;
  }

  function chooseAiAttackTarget(atk, lethal) {
    const smart = game.aiSmart || 0;
    const kind = game.enemyArchetype || "random";
    const opponent = game.opponent || currentOpponent();
    const faceBias = Math.max(0, Math.min(1, Number(opponent.faceBias) || 0));
    if (lethal || smart < 1) return null;
    if (isRushHeroLocked(atk) && game.player.field.length) {
      return maybeDdaSecondBest([...game.player.field].sort((a, b) => a.health - b.health || minionThreatScore(b) - minionThreatScore(a)))[0] || null;
    }
    if (kind === "aggro" || (faceBias >= 0.75 && rng() < faceBias)) return null;
    if (smart >= 2 && (atk.keywords || []).includes("poison")) {
      return maybeDdaSecondBest([...game.player.field].sort((a, b) => b.health - a.health || minionThreatScore(b) - minionThreatScore(a)))[0] || null;
    }
    const thresholdOffset = ddaProfile().scoreBias > 0 ? 1 : 0;
    const threshold = Math.max(1, (kind === "control" ? (smart >= 2 ? 2 : 3) : (smart >= 2 ? 3 : 4)) - thresholdOffset);
    const candidates = game.player.field.filter((m) => m.attack >= threshold);
    return maybeDdaSecondBest(candidates.sort((a, b) => minionThreatScore(b) - minionThreatScore(a)))[0] || null;
  }

  function aiTurn() {
    if (game.over) return;
    const ai = game.enemy;
    handleCoreResult(Core.advanceTurn(game, { phase: "startEnemy" }, rng));
    if (game.over) { render(); return; }

    // 出牌：簡單維持貴牌優先；archetype AI 依快攻/控制權重調整出牌序。
    let acted = true;
    while (acted && !game.over) {
      acted = false;
      const affordable = maybeDdaSecondBest(ai.hand.filter((c) => playableCost(ai, c) <= ai.mana).sort((a, b) =>
        (aiPlayPriority(b) - aiPlayPriority(a)) || (b.cost - a.cost)
      ));
      for (const card of affordable) {
        if (game.over) break;
        if (card.type === CARD_TYPE.MINION) {
          if (ai.field.length >= MAX_FIELD) continue; // 場滿：跳過隨從，讓 AI 還有機會出法術
          const result = Core.playCard(game, { side: "enemy", cardUid: card.uid, burnMulligan: false, trackCombo: false }, rng);
          if (!result.ok) continue;
          handleCoreResult(result);
          if (game.over) { acted = false; break; }
          log(`對手召喚了 ${card.name}。`, "ai");
          logAiThought(aiMinionReason(card));
          acted = true; break;
        } else {
          const plan = chooseAiSpellPlay(card);
          if (plan.used) {
            const target = findBattleMinion(plan.targetUid);
            const result = Core.playCard(game, { side: "enemy", cardUid: card.uid, targetUid: plan.targetUid, burnMulligan: false, trackCombo: false }, rng);
            if (!result.ok) continue;
            handleCoreResult(result);
            if (game.over) { acted = false; break; }
            logAiSpell(card, target);
            logAiThought(aiSpellReason(card, target));
            acted = true; break;
          }
        }
      }
    }
    if (game.over) { render(); return; }
    render();

    // 攻擊（考慮玩家嘲諷）
    const gRef = game; // 幽靈計時器防護：newGame() 後舊局的排程回呼直接失效
    setTimeout(() => {
      if (game !== gRef || game.over) return;
      const queue = ai.field.filter((m) => m.canAttack);
      // CP2-5 致命斬殺檢查：玩家無嘲諷且 AI 總攻擊 ≥ 玩家血量 → 全壓臉直接結束遊戲
      const playerHasTaunt = game.player.field.some((m) => (m.keywords || []).includes("taunt"));
      const totalAtk = queue.reduce((s, m) => s + heroAttackPotential(m), 0);
      const lethal = !playerHasTaunt && totalAtk >= game.player.hp && game.player.hp > 0 && (game.aiSmart || 0) >= 1;
      let i = 0;
      const step = () => {
        if (game !== gRef) return; // 舊局的攻擊鏈在 newGame() 後直接中止
        if (game.over || i >= queue.length) { endAiTurn(); return; }
        const atk = queue[i++];
        if (!ai.field.includes(atk) || !atk.canAttack) { step(); return; }
        const playerTaunts = game.player.field.filter((m) => (m.keywords || []).includes("taunt"));
        if (playerTaunts.length) {
          const t = maybeDdaSecondBest(playerTaunts.sort((a, b) => a.health - b.health || minionThreatScore(b) - minionThreatScore(a)))[0];
          logAiThought(aiAttackReason(atk, t, { forcedTaunt: true, lethal }));
          animateAttackToward(atk.uid, t.uid);
          resolveAttack(ai, atk, t);
        } else {
          const threat = chooseAiAttackTarget(atk, lethal);
          if (threat) {
            logAiThought(aiAttackReason(atk, threat, { lethal }));
            animateAttackToward(atk.uid, threat.uid);
            resolveAttack(ai, atk, threat);
          }
          else if (canAttackHeroNow(atk)) {
            logAiThought(aiAttackReason(atk, null, { hero: true, lethal }));
            animateAttackToward(atk.uid, "playerHero");
            const result = Core.resolveHeroAttack(game, { attackerSide: "enemy", attackerUid: atk.uid, defenderSide: "player" }, rng);
            handleCoreResult(result);
            if (result.ok) playSound("attack");
            if (result.ok) log(`對手的 ${atk.name} 攻擊你的英雄，造成 ${atk.attack} 點傷害！`, "ai");
            else showCoreFailure(result);
          } else {
            step(); return;
          }
        }
        // 連擊（windfury）：第一擊後 canAttack 仍為 true，把它排回佇列吃第二擊
        // （第二擊結束後 resolveAttack/打臉分支會把 canAttack 設回 false，不會無限迴圈）
        if (ai.field.includes(atk) && atk.canAttack && atk._windUsed) queue.push(atk);
        render(); checkWin();
        setTimeout(step, 620);
      };
      step();
    }, 600);
  }

  function endAiTurn() {
    if (game.over) return;
    handleCoreResult(Core.advanceTurn(game, { phase: "endEnemy" }, rng));
    if (game.over) { render(); return; }
    game.turnCount = (game.turnCount || 1) + 1;
    log("輪到你了。", "me");
    render();
  }

  function checkWin() {
    settleIfGameEnded();
  }

  function settleIfGameEnded() {
    if (!game || game.over) return false;
    if (game.enemy.hp > 0 && game.player.hp > 0) return false;
    game.over = true;
    game.selected = null;
    game.pendingSpell = null;
    const win = game.enemy.hp <= 0;
    triggerFinishEffect(win);
    showOverlay(win ? "Victory!" : "Defeat", win);
    return true;
  }

  // ===== 渲染 =====
  function render() {
    set("playerHp", Math.max(0, game.player.hp));
    set("enemyHp", Math.max(0, game.enemy.hp));
    set("playerMana", game.player.mana);
    set("playerManaMax", game.player.manaMax);
    const playerHpBadge = document.getElementById("playerHp")?.closest(".hp-badge");
    const enemyHpBadge = document.getElementById("enemyHp")?.closest(".hp-badge");
    if (playerHpBadge) playerHpBadge.classList.toggle("critical", game.player.hp <= Math.max(8, Math.ceil(game.player.maxHp * .25)));
    if (enemyHpBadge) enemyHpBadge.classList.toggle("critical", game.enemy.hp <= Math.max(8, Math.ceil(game.enemy.maxHp * .25)));
    const enemyHeroInfo = document.getElementById("enemyHero");
    if (enemyHeroInfo) {
      const opponent = game.opponent || currentOpponent();
      document.body.dataset.opponent = opponent.id;
      const avatar = enemyHeroInfo.querySelector(".avatar");
      const name = enemyHeroInfo.querySelector(".name");
      if (avatar) avatar.textContent = opponent.emoji;
      if (name) name.textContent = opponent.name;
      enemyHeroInfo.title = `${opponent.name}｜${opponent.archetype}`;
    }

    renderField("playerField", game.player.field, "player");
    renderField("enemyField", game.enemy.field, "enemy");

    const hand = document.getElementById("playerHand");
    hand.innerHTML = "";
    game.player.hand.forEach((card) => {
      const el = renderCard(card);
      if (playableCost(game.player, card) <= game.player.mana && game.turn === "player") el.classList.add("playable");
      else el.classList.add("disabled");
      el.onclick = () => playFromHand(card.uid);
      hand.appendChild(el);
    });
    const handCount = document.getElementById("handCount");
    if (handCount) handCount.textContent = String(game.player.hand.length);

    const enemyHero = document.getElementById("enemyHero");
    const selectedMinion = game.selected ? game.player.field.find((m) => m.uid === game.selected) : null;
    enemyHero.classList.toggle("targetable", !!selectedMinion && game.turn === "player" && !hasTaunt(game.enemy.field) && !isRushHeroLocked(selectedMinion));
    enemyHero.onclick = clickEnemyHero;
    updateTargetStatus();

    document.getElementById("endTurnBtn").disabled = game.turn !== "player" || game.over;
    updateHintButton();
    renderQuests();
    focusGuideTarget();
  }

  function renderField(elId, field, side) {
    const el = document.getElementById(elId);
    el.innerHTML = "";
    el.onclick = (event) => {
      if (event.target === el || event.target.classList.contains("empty-hint")) cancelTargeting("已取消選取。");
    };
    if (field.length === 0) {
      const hint = document.createElement("div");
      hint.className = "empty-hint";
      hint.textContent = side === "enemy" ? "（敵方戰場）" : "（你的隨從）";
      el.appendChild(hint);
      return;
    }
    const enemyHasTaunt = hasTaunt(game.enemy.field);
    field.forEach((card) => {
      const c = renderCard(card);
      if (pendingSummonFx.has(card.uid)) {
        c.classList.add("landing");
        pendingSummonFx.delete(card.uid);
      }
      if (side === "player") {
        if (card.canAttack && game.turn === "player") c.classList.add("can-attack");
        if (game.selected === card.uid) c.classList.add("selected");
        if (game.pendingSpell && game.pendingSpell.need === "friendlyMinion") c.classList.add("targetable");
        c.onclick = (event) => { event.stopPropagation(); selectMyMinion(card.uid); };
      } else {
        const spellTargetable = game.pendingSpell && game.pendingSpell.need === "enemyMinion";
        const attackTargetable = game.selected && isLegalTarget(game.enemy, card);
        if (spellTargetable || attackTargetable) c.classList.add("targetable");
        if (game.selected && enemyHasTaunt && !(card.keywords || []).includes("taunt")) c.classList.add("blocked");
        c.onclick = (event) => { event.stopPropagation(); clickEnemyMinion(card.uid); };
      }
      el.appendChild(c);
    });
  }

  // 單張卡片 DOM（含技能徽章、聖盾、星級、閃卡）
  function renderCard(card) {
    const r = RARITY[card.rarity] || RARITY.common;
    const el = document.createElement("div");
    const factionClass = card.faction && FACTIONS[card.faction] ? " faction-" + card.faction : " faction-neutral";
    el.className = "card rarity-" + card.rarity + factionClass + (card.type === CARD_TYPE.SPELL ? " spell-card" : "") + (card.foil ? " foil" : "") + (card.tide ? " tide" : "") + (r.idle ? " legend-idle" : "");
    el.dataset.uid = card.uid;
    el.dataset.cardId = card.id;
    el.style.setProperty("--rarity", r.color);
    el.style.setProperty("--glow", r.glow);
    el.style.setProperty("--glow-size", (r.glowSize || 0) + "px");

    const art = card.image
      ? `<img src="${card.image}" alt="${card.name}" onerror="this.replaceWith(document.createTextNode('${card.emoji}'))">`
      : card.emoji;

    // 技能徽章
    const kwBadges = (card.keywords || []).map((k) => {
      const kw = (typeof KEYWORDS !== "undefined") ? KEYWORDS[k] : null;
      return kw ? `<span class="kw" title="${kw.label}：${kw.desc}">${kw.icon}</span>` : "";
    }).join("");

    const stars = "★".repeat(r.stars);

    el.innerHTML = `
      <div class="summon-impact"></div>
      <div class="frame-sheen" aria-hidden="true"></div>
      <div class="cost">${card.cost}</div>
      ${card.shield ? '<div class="shield-ring"></div>' : ""}
      ${(card.keywords || []).includes("taunt") ? '<div class="taunt-crest" title="嘲諷" aria-hidden="true">◆</div>' : ""}
      <div class="stars">${stars}</div>
      <div class="art">${art}</div>
      <div class="kwrow">${kwBadges}</div>
      <div class="cardname">${card.name}${card.foil ? " ✦" : ""}${card.tide ? " ≋" : ""}</div>
      <div class="cardtext">${card.text || ""}</div>
      <div class="stats">
        <div class="atk">${card.attack ?? ""}</div>
        <div class="hp ${card.health < card.maxHealth ? "hurt" : ""}">${card.health ?? ""}</div>
      </div>`;
    const infoBtn = document.createElement("button");
    infoBtn.type = "button";
    infoBtn.className = "card-info-btn";
    infoBtn.textContent = "詳";
    infoBtn.title = "查看卡牌詳情";
    infoBtn.setAttribute("aria-label", `查看 ${card.name} 詳情`);
    const stopInfoEvent = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };
    ["pointerdown", "mousedown", "touchstart"].forEach((eventName) => {
      infoBtn.addEventListener(eventName, (event) => {
        event.stopPropagation();
      }, { passive: true });
    });
    infoBtn.onclick = (event) => {
      stopInfoEvent(event);
      openCardDetail(card);
    };
    el.appendChild(infoBtn);
    return el;
  }

  function setChildren(el, children) {
    if (!el) return;
    el.innerHTML = "";
    children.forEach((child) => el.appendChild(child));
  }

  function makeDetailPill(text, className, onClick) {
    const pill = document.createElement("span");
    pill.className = "detail-pill" + (className ? " " + className : "");
    pill.textContent = text;
    if (typeof onClick === "function") {
      pill.setAttribute("role", "button");
      pill.tabIndex = 0;
      pill.title = "開啟陣營傳說";
      pill.style.cursor = "pointer";
      pill.onclick = onClick;
      pill.onkeydown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      };
    }
    return pill;
  }

  function renderDetailArt(card) {
    const art = document.getElementById("cardDetailArt");
    if (!art) return;
    art.innerHTML = "";
    if (card.image) {
      const img = document.createElement("img");
      img.src = card.image;
      img.alt = card.name;
      img.onerror = () => {
        art.innerHTML = "";
        art.textContent = card.emoji || "";
      };
      art.appendChild(img);
    } else {
      art.textContent = card.emoji || "";
    }
  }

  function showDetailKeyword(keywordId) {
    const box = document.getElementById("cardDetailKeywordInfo");
    const kw = typeof KEYWORDS !== "undefined" ? KEYWORDS[keywordId] : null;
    if (!box || !kw) return;
    box.textContent = `${kw.label}：${kw.desc}`;
  }

  function openCardDetail(card) {
    if (!card) return;
    const root = document.getElementById("cardDetail");
    if (!root) return;
    const rarity = RARITY[card.rarity] || RARITY.common;
    const title = document.getElementById("cardDetailTitle");
    const meta = document.getElementById("cardDetailMeta");
    const stats = document.getElementById("cardDetailStats");
    const text = document.getElementById("cardDetailText");
    const flavor = document.getElementById("cardDetailFlavor");
    const keywords = document.getElementById("cardDetailKeywords");
    if (title) title.textContent = `${card.name}${card.foil ? " 閃卡" : ""}${card.tide ? " 潮鑄" : ""}`;
    renderDetailArt(card);
    const factionName = typeof factionLabel === "function" ? factionLabel(card) : chapterFactionName(card.faction);
    setChildren(meta, [
      makeDetailPill(`${card.cost} 費`),
      makeDetailPill(rarity.label || card.rarity),
      makeDetailPill(card.type === CARD_TYPE.SPELL ? "法術" : "隨從"),
      makeDetailPill(`軸線 ${typeof cardAxisLabel === "function" ? cardAxisLabel(card) : "中立"}`),
      makeDetailPill(`陣營 ${factionName}`, "faction-pill", () => {
        closeCardDetail();
        openChronicle(card.faction || "wardens");
      }),
    ]);
    const statPills = card.type === CARD_TYPE.SPELL
      ? [makeDetailPill("法術效果")]
      : [makeDetailPill(`攻擊 ${card.attack}`), makeDetailPill(`生命 ${card.health}/${card.maxHealth || card.health}`)];
    setChildren(stats, statPills);
    if (text) text.textContent = card.text || "沒有額外效果。";
    if (flavor) flavor.textContent = card.flavor ? `「${card.flavor}」` : "";
    if (keywords) {
      keywords.innerHTML = "";
      (card.keywords || []).forEach((keywordId) => {
        const kw = typeof KEYWORDS !== "undefined" ? KEYWORDS[keywordId] : null;
        if (!kw) return;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "detail-keyword";
        btn.textContent = `${kw.icon} ${kw.label}`;
        btn.onclick = () => showDetailKeyword(keywordId);
        keywords.appendChild(btn);
      });
    }
    const firstKeyword = (card.keywords || [])[0];
    const keywordInfo = document.getElementById("cardDetailKeywordInfo");
    if (firstKeyword) showDetailKeyword(firstKeyword);
    else if (keywordInfo) keywordInfo.textContent = card.type === CARD_TYPE.SPELL ? "法術牌會在施放時立即結算效果。" : "此牌沒有關鍵字。";
    detailReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root.classList.add("show");
    root.setAttribute("aria-hidden", "false");
    setTimeout(() => document.getElementById("cardDetailClose")?.focus(), 0);
  }

  function closeCardDetail() {
    const root = document.getElementById("cardDetail");
    if (!root) return;
    const restore = detailReturnFocus;
    detailReturnFocus = null;
    root.classList.remove("show");
    root.setAttribute("aria-hidden", "true");
    if (restore && document.contains(restore)) setTimeout(() => restore.focus(), 0);
  }

  // ===== 動畫 / 工具 =====
  function set(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }
  function log(msg, who) {
    const box = document.getElementById("log");
    const line = document.createElement("div");
    const text = who === "ai" && game
      ? `${game.opponentEmoji || currentOpponent().emoji} ${game.opponentName || currentOpponent().name}：${msg}`
      : msg;
    line.className = who || ""; line.textContent = text;
    box.appendChild(line); box.scrollTop = box.scrollHeight;
    while (box.children.length > 8) box.removeChild(box.firstChild);
  }
  function flash(msg) {
    log("⚠️ " + msg, "me");
    showToast(msg);
  }
  function showToast(msg) {
    let stack = document.getElementById("toastStack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "toastStack";
      stack.className = "toast-stack";
      stack.setAttribute("role", "status");
      stack.setAttribute("aria-live", "polite");
      stack.setAttribute("aria-atomic", "false");
      document.body.appendChild(stack);
    }
    const d = document.createElement("div");
    d.className = "toast-float";
    d.setAttribute("aria-live", "polite");
    d.textContent = msg;
    stack.appendChild(d);
    setTimeout(() => {
      d.remove();
      if (stack && stack.children.length === 0) stack.remove();
    }, 1400);
  }
  function rng() { return Math.random(); }

  function hideMulliganButton() {
    const mb = document.getElementById("mulliganBtn");
    if (mb) mb.style.display = "none";
  }

  function handleCoreResult(result) {
    if (!result || !Array.isArray(result.events)) return;
    for (const event of result.events) {
      if (event.type === "minionSummoned") {
        if (event.uid) pendingSummonFx.add(event.uid);
      }
      if (event.type === "pendingCancelled") {
        flash("已取消指定。");
      } else if (event.type === "mulliganBurned") {
        hideMulliganButton();
      } else if (event.type === "combo") {
        showCombo(event.uid, event.count);
      } else if (event.type === "shieldBreak") {
        flashCard(event.uid, "shield-break");
        flashKeyword2(event.uid, "聖盾破裂");
      } else if (event.type === "damage") {
        flashCard(event.uid, "damaged");
        floatDamage(event.uid, event.amount);
        playSound("hurt");
        if ((event.amount || 0) >= 4) screenShake();
      } else if (event.type === "poison") {
        flashKeyword2(event.uid, "劇毒！");
        flashCard(event.uid, "poisoned");
      } else if (event.type === "frenzy") {
        flashKeyword2(event.uid, "狂怒 +2");
        flashCard(event.uid, "damaged");
        const minion = findBattleMinion(event.uid);
        if (minion) log(`${minion.name} 觸發狂怒，攻擊 +2。`, game.enemy.field.some((m) => m.uid === event.uid) ? "ai" : "me");
      } else if (event.type === "lifesteal") {
        flashKeyword2(event.uid, "吸血");
      } else if (event.type === "rushReady") {
        flashKeyword2(event.uid, "突襲");
      } else if (event.type === "shieldGain") {
        flashCard(event.uid, "shield-gain");
      } else if (event.type === "buffTarget") {
        flashKeyword2(event.uid, "+2/+2");
        flashCard(event.uid, "shield-gain");
      } else if (event.type === "buffAdjacent1") {
        flashKeyword2(event.uid, "+1 攻");
        flashCard(event.uid, "shield-gain");
      } else if (event.type === "mirrorRime") {
        flashKeyword2(event.uid, event.amount > 0 ? `+${event.amount} 生命` : "鏡霜");
        if (event.amount > 0) flashCard(event.uid, "shield-gain");
      } else if (event.type === "silence") {
        flashKeyword2(event.uid, "靜默");
      } else if (event.type === "polymorph") {
        flashKeyword2(event.uid, "變形！");
      } else if (event.type === "dying") {
        markDying(event.uid);
        playSound("death");
      } else if (event.type === "deathrattle") {
        flashKeyword2(event.uid, "亡語");
      } else if (event.type === "battlecry") {
        flashKeyword2(event.uid, "戰吼");
      } else if (event.type === "spellCast") {
        playSound("play");
        triggerSpellFlash(event.side);
        const sideObj = event.side === "enemy" ? game.enemy : game.player;
        const sp = spellDamage(event.effect) ? Core.spellPower(sideObj) : 0;
        if (sp > 0) log(`法強 +${sp} 強化了${event.side === "enemy" ? "對手" : "你的"}法術。`, event.side === "enemy" ? "ai" : "me");
      } else if (event.type === "heroDamage") {
        floatDamage(event.defenderSide === "enemy" ? "enemyHero" : "playerHero", event.amount);
        playSound("hurt");
        if ((event.amount || 0) >= 4) screenShake();
      } else if (event.type === "fatigue") {
        const heroId = event.side === "enemy" ? "enemyHero" : "playerHero";
        floatDamage(heroId, event.amount);
        flashKeyword(heroId, `疲勞 ${event.amount}`);
        log(`${event.side === "enemy" ? "對手" : "你"}牌庫已空，疲勞受到 ${event.amount} 點傷害。`, event.side === "enemy" ? "ai" : "me");
      } else if (event.type === "heroHeal") {
        if (event.amount > 0) flashKeyword(event.side === "player" ? "playerHero" : "enemyHero", `+${event.amount} 生命`);
      } else if (event.type === "nextSpellDiscount") {
        flashKeyword(event.side === "player" ? "playerHero" : "enemyHero", `下張法術 -${event.amount}`);
      } else if (event.type === "regen") {
        flashKeyword2(event.uid, "回復");
        flashCard(event.uid, "regen");
      } else if (event.type === "minionSummoned" && event.reason === "play") {
        playSound("play");
      } else if (event.type === "minionSummoned" && event.reason === "deathrattle") {
        logDeathrattleSummon(event);
      }
      trackQuestFromCoreEvent(event);
    }
    settleIfGameEnded();
  }

  function showCombo(uid, count) {
    if (count < 3) return;
    const el = elFor(uid);
    const r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0 };
    flashCombo(r.left + r.width / 2, r.top, count);
  }

  function showCoreFailure(result) {
    if (!result || !result.reason || result.reason === "cardNotFound") return;
    if (result.reason === "insufficientMana") flash("法力不足！");
    else if (result.reason === "fieldFull") flash("場上隨從已滿（最多 " + MAX_FIELD + " 隻）。");
    else if (result.reason === "noTarget" || result.reason === "targetNotFound") flash("沒有可指定的目標。");
    else if (result.reason === "illegalTarget") flash("必須先攻擊嘲諷隨從！");
    else if (result.reason === "tauntBlocksHero") flash("敵方有嘲諷，不能直接攻擊英雄！");
    else if (result.reason === "rushBlocksHero") flash("突襲隨從登場當回合只能攻擊隨從！");
    else if (result.reason === "cannotAttack") flash("這個隨從本回合不能攻擊。");
  }

  function fallbackSpellName(effect) {
    const names = {
      heal5: "治療術",
      aoe1: "冰霜新星",
      aoe2: "閃電風暴",
      mana2: "法力湧動",
      giveShield: "聖盾術",
      buffTarget: "秘能灌注",
      polymorph: "變形術",
      draw2: "戰術補給",
      nextSpellMinus1: "虛空什一稅",
      damage2: "餘燼齊射",
      damage3: "火焰箭",
      damage5: "烈焰爆裂",
      damage8: "隕石術",
    };
    return names[effect] || "法術";
  }

  function logSpellEffect(cardOrEffect, target, sideKey) {
    if (sideKey !== "player") return;
    const card = typeof cardOrEffect === "string" ? { effect: cardOrEffect } : (cardOrEffect || {});
    const effect = card.effect;
    const name = card.name || fallbackSpellName(effect);
    if (effect === "heal5") log(`你施放${name}，恢復 5 點生命。`, "me");
    else if (effect === "draw2") log(`${name}：抽了 2 張牌。`, "me");
    else if (effect === "aoe1" || effect === "aoe2") log(`${name}橫掃敵方，造成 ${effectiveSpellDamage(game.player, card)} 點傷害${spellPowerNote(game.player, card)}。`, "me");
    else if (effect === "mana2") log(`${name}：本回合 +2 法力。`, "me");
    else if (effect === "giveShield" && target) log(`${name}：${target.name} 獲得聖盾。`, "me");
    else if (effect === "buffTarget" && target) log(`${name}：${target.name}${cardOrEffect && cardOrEffect.mirrorRime ? "獲得鏡霜生命" : "獲得 +2/+2"}。`, "me");
    else if (effect === "polymorph") log(`${name}：敵方隨從被${cardOrEffect && cardOrEffect.silenceOnly ? "靜默" : "變成綿羊"}。`, "me");
    else if (effect === "nextSpellMinus1") log(`${name}：敵方英雄受 2 點傷害，本回合你的下一張法術少 1 費。`, "me");
    else if ((effect === "damage2" || effect === "damage3" || effect === "damage5" || effect === "damage8") && target) log(`${name}擊中了 ${target.name}，造成 ${effectiveSpellDamage(game.player, card, target)} 點傷害${spellPowerNote(game.player, card, target)}。`, "me");
  }

  function logAiSpell(cardOrEffect, target) {
    const card = typeof cardOrEffect === "string" ? { effect: cardOrEffect } : (cardOrEffect || {});
    const effect = card.effect;
    const name = card.name || fallbackSpellName(effect);
    if (effect === "heal5") log("對手施放治療術。", "ai");
    else if (effect === "draw2") log("對手施放戰術補給，抽了 2 張牌。", "ai");
    else if (effect === "aoe1" || effect === "aoe2") log(`對手施放範圍法術，造成 ${effectiveSpellDamage(game.enemy, card)} 點傷害${spellPowerNote(game.enemy, card)}。`, "ai");
    else if (effect === "damage2" || effect === "damage3" || effect === "damage5" || effect === "damage8") log(`對手用 ${name} 攻擊 ${target ? target.name : "你的隨從"}，造成 ${effectiveSpellDamage(game.enemy, card, target)} 點傷害${spellPowerNote(game.enemy, card, target)}。`, "ai");
    else if (effect === "polymorph") log(`對手將 ${target ? target.name : "你的隨從"} ${card && card.silenceOnly ? "靜默" : "變形"}。`, "ai");
    else if (effect === "giveShield") log(`對手施放聖盾術保護 ${target ? target.name : "隨從"}。`, "ai");
    else if (effect === "buffTarget") log(`對手強化了 ${target ? target.name : "隨從"}。`, "ai");
    else if (effect === "mana2") log("對手施放法力湧動。", "ai");
    else if (effect === "nextSpellMinus1") log("對手施放虛空什一稅，本回合下一張法術少 1 費。", "ai");
  }

  function logDeathrattleSummon(event) {
    if (event.name === "骷髏") log("亡語：召喚了骷髏(2/2)。", event.side === "player" ? "me" : "ai");
    else if (event.name === "浴火鳳凰") log("亡語：鳳凰浴火重生！", event.side === "player" ? "me" : "ai");
    else if (event.name) log(`亡語：召喚了 ${event.name}。`, event.side === "player" ? "me" : "ai");
  }

  function triggerAbilityUi(g, side, trigger, target, source) {
    const result = Core.triggerAbility(g, {
      side: side.side,
      trigger,
      targetUid: target && target.uid,
      sourceUid: source && source.uid,
    }, rng);
    handleCoreResult(result);
  }

  function elFor(uidOrId) {
    return document.querySelector(`.card[data-uid="${uidOrId}"]`) || document.getElementById(uidOrId);
  }

  function clearTransientFx() {
    document.querySelectorAll(ACTIVE_FX_SELECTOR).forEach((el) => el.remove());
  }

  function cloneCardGhost(source, extraClass) {
    if (!source || !source.classList || !source.classList.contains("card")) return null;
    const r = source.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const ghost = source.cloneNode(true);
    ghost.classList.remove("spawn", "selected", "targetable", "can-attack", "blocked", "guide-focus");
    ghost.classList.add("combat-ghost");
    if (extraClass) ghost.classList.add(extraClass);
    ghost.style.position = "fixed";
    ghost.style.left = r.left + "px";
    ghost.style.top = r.top + "px";
    ghost.style.width = r.width + "px";
    ghost.style.height = r.height + "px";
    ghost.style.margin = "0";
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex = "180";
    ghost.setAttribute("aria-hidden", "true");
    document.body.appendChild(ghost);
    return ghost;
  }

  function removeGhost(ghost, delay) {
    if (!ghost) return;
    setTimeout(() => ghost.remove(), delay);
  }

  // 攻擊者朝目標衝刺（用 transform 位移做撞擊）
  function animateAttackToward(attackerUid, targetUidOrId) {
    if (prefersReducedMotion()) return;
    const a = elFor(attackerUid), t = elFor(targetUidOrId);
    if (!a) return;
    if (t) {
      const ar = a.getBoundingClientRect(), tr = t.getBoundingClientRect();
      const dx = (tr.left + tr.width / 2) - (ar.left + ar.width / 2);
      const dy = (tr.top + tr.height / 2) - (ar.top + ar.height / 2);
      const lungeMs = isLowPerf() ? 190 : 360;
      const hitDelay = isLowPerf() ? 90 : 150;
      const hitMs = isLowPerf() ? 180 : 320;
      const attackGhost = cloneCardGhost(a, "lunge-to");
      const targetGhost = cloneCardGhost(t);
      if (attackGhost) {
        attackGhost.style.setProperty("--lx", dx * 0.85 + "px");
        attackGhost.style.setProperty("--ly", dy * 0.85 + "px");
        removeGhost(attackGhost, lungeMs + 40);
      }
      // 位移走全程（CP1-12，原 0.5 只走一半沒撞擊感）
      a.style.setProperty("--lx", dx * 0.85 + "px");
      a.style.setProperty("--ly", dy * 0.85 + "px");
      a.classList.add("lunge-to");
      setTimeout(() => { a.classList.remove("lunge-to"); a.style.removeProperty("--lx"); a.style.removeProperty("--ly"); }, lungeMs);
      // 命中：受擊震動 + 閃白 + 火花粒子 + 螢幕震
      setTimeout(() => {
        const liveTarget = elFor(targetUidOrId);
        const hitEl = targetGhost || liveTarget || t;
        hitEl.classList.add("hit-shake", "hit-flash");
        spawnSparks(tr.left + tr.width / 2, tr.top + tr.height / 2);
        if (liveTarget && liveTarget !== hitEl) liveTarget.classList.add("hit-shake", "hit-flash");
        setTimeout(() => {
          hitEl.classList.remove("hit-shake", "hit-flash");
          if (liveTarget) liveTarget.classList.remove("hit-shake", "hit-flash");
        }, hitMs);
        removeGhost(targetGhost, hitMs + 60);
      }, hitDelay);
    } else {
      const attackMs = isLowPerf() ? 160 : 300;
      const attackGhost = cloneCardGhost(a, "attacking");
      removeGhost(attackGhost, attackMs + 40);
      a.classList.add("attacking"); setTimeout(() => a.classList.remove("attacking"), attackMs);
    }
  }

  // 傷害數字分級（CP1-12）：≤2 小白、3~5 中金、≥6 大紅金
  function floatDamage(uidOrId, amount) {
    if (prefersReducedMotion()) return;
    const el = elFor(uidOrId); if (!el) return;
    if (isLowPerf() && amount <= 2) return;
    const r = el.getBoundingClientRect();
    const d = document.createElement("div");
    const tier = amount >= 6 ? "dmg-big" : amount >= 3 ? "dmg-mid" : "dmg-sm";
    d.className = "dmg-float " + tier; d.textContent = "-" + amount;
    d.style.left = (r.left + r.width / 2) + "px";
    d.style.top = (r.top + 8) + "px";
    document.body.appendChild(d);
    setTimeout(() => d.remove(), isLowPerf() ? 480 : 850);
  }
  // CP2-8 連擊回饋文字
  function flashCombo(x, y, n) {
    if (prefersReducedMotion()) return;
    const d = document.createElement("div");
    d.className = "combo-float"; d.textContent = `🔥 ${n} 連擊!`;
    d.style.left = x + "px"; d.style.top = (y - 10) + "px";
    document.body.appendChild(d);
    setTimeout(() => d.remove(), isLowPerf() ? 520 : 900);
  }
  // 命中火花粒子（CP1-12）
  function spawnSparks(x, y) {
    if (prefersReducedMotion()) return;
    const count = isLowPerf() ? 2 : 6;
    for (let i = 0; i < count; i++) {
      const s = document.createElement("div");
      s.className = "hit-spark";
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.5, dist = 20 + Math.random() * 25;
      s.style.left = x + "px"; s.style.top = y + "px";
      s.style.setProperty("--sx", Math.cos(a) * dist + "px");
      s.style.setProperty("--sy", Math.sin(a) * dist + "px");
      document.body.appendChild(s);
      setTimeout(() => s.remove(), isLowPerf() ? 260 : 450);
    }
  }

  function flashCard(uid, cls) {
    if (prefersReducedMotion()) return;
    const el = elFor(uid); if (el && cls) { el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 400); }
  }
  function flashKeyword2(uid, label) {
    if (prefersReducedMotion()) return;
    const el = elFor(uid); if (!el) return;
    const r = el.getBoundingClientRect();
    const b = document.createElement("div");
    b.className = "kw-pop"; b.textContent = label;
    b.style.left = (r.left + r.width / 2) + "px"; b.style.top = (r.top - 6) + "px";
    document.body.appendChild(b); setTimeout(() => b.remove(), isLowPerf() ? 520 : 900);
  }
  function flashKeyword(id, label) { flashKeyword2(id, label); }

  function markDying(uid) {
    const el = elFor(uid);
    if (!el) return;
    if (prefersReducedMotion()) return;
    const deathMs = isLowPerf() ? 260 : 560;
    const ghost = cloneCardGhost(el, "dying");
    el.classList.add("dying");
    removeGhost(ghost, deathMs + 80);
  }
  function screenShake() {
    const board = document.querySelector(".board");
    if (!board) return;
    if (isLowPerf() || prefersReducedMotion()) return;
    board.classList.add("shake-screen"); setTimeout(() => board.classList.remove("shake-screen"), 260);
  }

  function triggerSpellFlash(side) {
    if (isLowPerf() || prefersReducedMotion()) return;
    const flashEl = document.createElement("div");
    flashEl.className = "spell-flash" + (side === "enemy" ? " enemy" : "");
    flashEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(flashEl);
    setTimeout(() => flashEl.remove(), 560);
  }

  function triggerFinishEffect(win) {
    finishFx = { win: !!win, lethal: true, confetti: 0, defeatFade: !win };
    playSound("lethal");
    const board = document.querySelector(".board");
    if (board && !prefersReducedMotion()) {
      board.classList.remove("lethal-slow");
      void board.offsetWidth;
      board.classList.add("lethal-slow");
      setTimeout(() => board.classList.remove("lethal-slow"), 720);
    }
    if (!win) document.body.classList.add("defeat-fade");
    return finishFx;
  }

  function burstConfetti() {
    if (isLowPerf() || prefersReducedMotion()) return 0;
    const colors = ["#facc15", "#fb7185", "#38bdf8", "#4ade80", "#c084fc", "#f97316"];
    const count = 46;
    finishFx.confetti += count;
    for (let i = 0; i < count; i++) {
      const c = document.createElement("div");
      c.className = "confetti-piece";
      c.style.left = (8 + Math.random() * 84) + "vw";
      c.style.top = (-8 - Math.random() * 10) + "px";
      c.style.setProperty("--confetti-color", colors[i % colors.length]);
      c.style.setProperty("--cx", (Math.random() * 160 - 80) + "px");
      c.style.setProperty("--cy", (160 + Math.random() * 260) + "px");
      c.style.setProperty("--cr", (180 + Math.random() * 460) + "deg");
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 1700);
    }
    return count;
  }

  // 戰績 + 金幣經濟（CP0-2）：閉合「打贏→賺金→開包→變強」迴圈。
  // 存檔遷移集中在 core.js，battle.js 與 pack.js 共用同一個 versioned shape。
  function loadStats() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem("card_stats_v1")); } catch {}
    return Core.migrateStats(raw);
  }
  function saveStats(s) { try { localStorage.setItem("card_stats_v1", JSON.stringify(Core.migrateStats(s))); } catch {} }

  function syncDdaToggle() {
    const toggle = document.getElementById("ddaToggle");
    if (!toggle) return;
    const stats = loadStats();
    toggle.checked = stats.dda.enabled !== false;
    toggle.title = `動態調節：${Core.ddaProfile(stats.dda).label}`;
  }

  function setDdaEnabled(enabled) {
    const stats = loadStats();
    stats.dda.enabled = enabled !== false;
    saveStats(stats);
    if (game) game.dda = Core.ddaProfile(stats.dda);
    syncDdaToggle();
    flash(stats.dda.enabled ? "動態難度調節已開啟。" : "動態難度調節已關閉。");
    return Core.ddaProfile(stats.dda);
  }

  function trackCardUse(card) {
    if (!card || !card.id) return;
    const stats = loadStats();
    const plays = stats.telemetry.cardPlays;
    plays[card.id] = (plays[card.id] || 0) + 1;
    saveStats(stats);
  }

  function recordGameTelemetry(stats, win) {
    const telemetry = stats.telemetry;
    telemetry.games.push({
      difficulty: game && game.difficulty ? game.difficulty : currentDifficulty(),
      win: win === true,
      turns: game && game.turnCount ? game.turnCount : 1,
      archetype: game && game.playerArchetype ? game.playerArchetype : "neutral",
      at: Date.now(),
    });
    if (telemetry.games.length > 100) telemetry.games.splice(0, telemetry.games.length - 100);
  }

  function safeSaveAfterError(message) {
    try {
      const protectedStats = Core.protectSave(loadStats(), message, Date.now());
      saveStats(protectedStats);
      showToast("系統偵測到錯誤，已保護本地存檔。重新整理可繼續遊玩。");
    } catch {}
  }

  function installErrorRecovery() {
    if (window.__cardErrorRecoveryInstalled) return;
    window.__cardErrorRecoveryInstalled = true;
    window.addEventListener("error", (event) => {
      safeSaveAfterError(event && event.message ? event.message : "unknown error");
    });
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event && event.reason;
      safeSaveAfterError(reason && reason.message ? reason.message : String(reason || "unhandled rejection"));
    });
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
    const before = loadQuests();
    const next = Core.applyQuestProgress(before, event);
    saveQuests(next);
    renderQuests(next);
    next.quests.forEach((quest) => {
      const prev = before.quests.find((item) => item.id === quest.id);
      if (prev && prev.progress < prev.target && quest.progress >= quest.target && !quest.claimed) {
        showToast(`任務完成：${quest.title}`);
      }
    });
    return next;
  }

  function loadGoals(seed) {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(GOAL_KEY)); } catch {}
    return Core.migrateGoals(raw, seed || weekSeed());
  }

  function saveGoals(goalState, seed) {
    try { localStorage.setItem(GOAL_KEY, JSON.stringify(Core.migrateGoals(goalState, seed || weekSeed()))); } catch {}
  }

  function loadChronicle() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(CHRONICLE_KEY)); } catch {}
    return Core.migrateChronicle(raw);
  }

  function saveChronicle(chronicleState) {
    try { localStorage.setItem(CHRONICLE_KEY, JSON.stringify(Core.migrateChronicle(chronicleState))); } catch {}
  }

  function chapterFactionName(id) {
    return typeof FACTIONS !== "undefined" && FACTIONS[id] ? FACTIONS[id].name : "白潮守軍";
  }

  function chapterFeaturedNames(chapter) {
    return (chapter.featured || []).map((id) => getCardById(id)?.name || id).join("、");
  }

  function setChronicleTab(tab) {
    const showFactions = tab === "factions";
    const chaptersTab = document.getElementById("chronicleChaptersTab");
    const factionsTab = document.getElementById("chronicleFactionsTab");
    const chaptersPanel = document.getElementById("chronicleChaptersPanel");
    const factionsPanel = document.getElementById("chronicleFactionsPanel");
    chaptersTab?.classList.toggle("active", !showFactions);
    factionsTab?.classList.toggle("active", showFactions);
    chaptersTab?.setAttribute("aria-selected", showFactions ? "false" : "true");
    factionsTab?.setAttribute("aria-selected", showFactions ? "true" : "false");
    chaptersPanel?.classList.toggle("active", !showFactions);
    factionsPanel?.classList.toggle("active", showFactions);
  }

  function renderChronicle() {
    const list = document.getElementById("chronicleChapterList");
    if (!list) return;
    const chapters = Core.listChapters(loadChronicle(), loadStats(), loadCollection());
    list.innerHTML = "";
    chapters.forEach((chapter) => {
      const row = document.createElement("article");
      row.className = "chapter-item" + (chapter.unlocked ? " unlocked" : "") + (chapter.claimed ? " claimed" : "");
      const body = chapter.unlocked
        ? `<div class="chapter-epigraph">「${chapter.epigraph}」</div>
           <div class="chapter-body">${(chapter.body || []).map((p) => `<p>${p}</p>`).join("")}</div>
           <div class="chapter-featured">登場卡牌：${chapterFeaturedNames(chapter)}</div>`
        : `<div class="chapter-body"><p>${chapter.unlockLabel}</p></div>`;
      row.innerHTML = `
        <div class="chapter-top">
          <div>
            <div class="chapter-title">${chapter.title}</div>
            <div class="chapter-meta">${chapterFactionName(chapter.faction)} · ${chapter.reward} 金幣 · ${chapter.unlocked ? "已解鎖" : "未解鎖"}</div>
          </div>
          <button class="chapter-claim" type="button">${chapter.claimed ? "已領取" : "領取"}</button>
        </div>
        ${body}`;
      const btn = row.querySelector("button");
      btn.disabled = !chapter.unlocked || chapter.claimed;
      btn.onclick = () => claimChapterUi(chapter.id);
      list.appendChild(row);
    });
  }

  function renderFactionLegends() {
    const list = document.getElementById("chronicleFactionList");
    if (!list || typeof FACTIONS === "undefined") return;
    list.innerHTML = "";
    Object.values(FACTIONS).forEach((faction) => {
      const row = document.createElement("article");
      row.className = "faction-legend";
      row.dataset.factionId = faction.id;
      row.innerHTML = `
        <h3 style="color:${faction.color || "#facc15"}">${faction.emoji || ""} ${faction.name}</h3>
        <p>${faction.legend}</p>`;
      list.appendChild(row);
    });
  }

  function chronicleClaimableCount() {
    return Core.listChapters(loadChronicle(), loadStats(), loadCollection()).filter((chapter) => chapter.unlocked && !chapter.claimed).length;
  }

  function updateChronicleBadge() {
    const badge = document.getElementById("chronicleBadge");
    if (!badge) return;
    const count = chronicleClaimableCount();
    badge.textContent = String(count);
    badge.classList.toggle("show", count > 0);
  }

  function refreshChronicle() {
    const chapters = Core.listChapters(loadChronicle(), loadStats(), loadCollection());
    const unlocked = chapters.filter((chapter) => chapter.unlocked).map((chapter) => chapter.id);
    if (lastUnlockedChapterIds) {
      const previous = new Set(lastUnlockedChapterIds);
      chapters.forEach((chapter) => {
        if (chapter.unlocked && !previous.has(chapter.id)) showToast(`📜 編年史新章解鎖：${chapter.title}`);
      });
    }
    lastUnlockedChapterIds = unlocked;
    updateChronicleBadge();
    return chapters;
  }

  function claimChapterUi(chapterId) {
    const result = Core.claimChapter(loadChronicle(), chapterId, loadStats(), loadCollection());
    if (!result.ok) {
      renderChronicle();
      updateChronicleBadge();
      return result;
    }
    saveChronicle(result.state);
    addMissionReward(result.reward);
    renderChronicle();
    updateChronicleBadge();
    flash(`編年史章節完成：+${result.reward} 金幣`);
    return result;
  }

  function progressWeeklyGoal(event) {
    const next = Core.applyWeeklyQuestProgress(loadGoals(), event);
    saveGoals(next);
    renderMissionDrawer();
    updateMissionBadge();
    return next;
  }

  function trackQuestFromCoreEvent(event) {
    if (!event) return;
    if (event.type === "spellCast" && event.side === "player") {
      progressQuest({ type: "playSpell", amount: 1 });
      progressWeeklyGoal({ type: "playSpell", amount: 1 });
    } else if (event.type === "minionSummoned" && event.side === "player" && event.reason === "play") {
      progressQuest({ type: "summonMinion", amount: 1 });
      progressWeeklyGoal({ type: "summonMinion", amount: 1 });
    } else if (event.type === "heroDamage" && event.attackerSide === "player" && event.defenderSide === "enemy") {
      progressQuest({ type: "heroDamage", amount: event.amount || 1 });
      progressWeeklyGoal({ type: "heroDamage", amount: event.amount || 1 });
    } else if (event.type === "buffTarget" && event.side === "player") {
      progressQuest({ type: "buffTarget", amount: 1 });
    } else if (event.type === "frenzy" && game && game.player.field.some((m) => m.uid === event.uid)) {
      progressQuest({ type: "frenzy", amount: 1 });
    }
  }

  function claimQuestUi(questId) {
    const result = Core.claimQuest(loadQuests(), questId);
    if (!result.ok) return result;
    saveQuests(result.state);
    const stats = loadStats();
    stats.coins += result.reward;
    saveStats(stats);
    renderQuests(result.state);
    flash(`每日任務完成：+${result.reward} 金幣`);
    return result;
  }

  function hasClaimableQuests(questState) {
    const state = questState || loadQuests();
    return state.quests.some((quest) => quest.progress >= quest.target && !quest.claimed);
  }

  function updateQuestCtas(questState) {
    const ready = hasClaimableQuests(questState);
    const claimAllBtn = document.getElementById("questClaimAllBtn");
    if (claimAllBtn) {
      claimAllBtn.disabled = !ready;
      claimAllBtn.title = ready ? "領取所有已完成任務" : "目前沒有可領取的任務";
    }
    const overlayQuestBtn = document.getElementById("overlayQuestBtn");
    if (overlayQuestBtn) {
      overlayQuestBtn.disabled = !ready;
      overlayQuestBtn.classList.toggle("ready", ready);
      overlayQuestBtn.title = ready ? "領取已完成任務" : "目前沒有可領取的任務";
    }
  }

  function claimAllQuestsUi() {
    let state = loadQuests();
    let reward = 0;
    let count = 0;
    for (const quest of state.quests) {
      if (quest.progress < quest.target || quest.claimed) continue;
      const result = Core.claimQuest(state, quest.id);
      if (!result.ok) continue;
      state = result.state;
      reward += result.reward;
      count++;
    }
    if (count === 0) {
      renderQuests(state);
      flash("目前沒有可領取的任務。");
      return { ok: false, reward: 0, count: 0, state };
    }
    saveQuests(state);
    const stats = loadStats();
    stats.coins += reward;
    saveStats(stats);
    renderQuests(state);
    flash(`已領取 ${count} 個任務：+${reward} 金幣`);
    return { ok: true, reward, count, state };
  }

  function isReady(item) {
    return item && item.progress >= item.target && !item.claimed;
  }

  function addMissionReward(amount) {
    if (!amount) return;
    const stats = loadStats();
    stats.coins += amount;
    saveStats(stats);
  }

  function claimWeeklyUi() {
    const result = Core.claimWeeklyQuest(loadGoals());
    if (!result.ok) {
      renderMissionDrawer();
      return result;
    }
    saveGoals(result.state);
    addMissionReward(result.reward);
    renderMissionDrawer();
    updateMissionBadge();
    flash(`本週任務完成：+${result.reward} 金幣`);
    return result;
  }

  function claimMilestoneUi(milestoneId) {
    const result = Core.claimMilestone(loadGoals(), milestoneId, loadCollection());
    if (!result.ok) {
      renderMissionDrawer();
      return result;
    }
    saveGoals(result.state);
    addMissionReward(result.reward);
    renderMissionDrawer();
    updateMissionBadge();
    flash(`收藏里程碑完成：+${result.reward} 金幣`);
    return result;
  }

  function missionClaimableCount() {
    const daily = loadQuests().quests.filter(isReady).length;
    const goals = loadGoals();
    const weekly = isReady(goals.weeklyQuest) ? 1 : 0;
    const milestones = Core.listMilestones(goals, loadCollection()).filter((milestone) => milestone.achieved && !milestone.claimed).length;
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
      btn.onclick = () => { claimQuestUi(quest.id); renderMissionDrawer(); updateMissionBadge(); };
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
    Core.listMilestones(goals, loadCollection()).forEach((milestone) => {
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
    for (const milestone of Core.listMilestones(goals, loadCollection())) {
      if (!milestone.achieved || milestone.claimed) continue;
      const result = Core.claimMilestone(goals, milestone.id, loadCollection());
      if (!result.ok) continue;
      goals = result.state;
      reward += result.reward;
      count++;
    }
    saveGoals(goals);
    addMissionReward(reward);
    renderQuests(dailyState);
    renderMissionDrawer();
    if (count > 0) flash(`已領取 ${count} 個獎勵：+${reward} 金幣`);
    else flash("目前沒有可領取的任務獎勵");
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

  function openChronicle(factionId) {
    renderChronicle();
    renderFactionLegends();
    setChronicleTab(factionId ? "factions" : "chapters");
    const modal = document.getElementById("chronicleModal");
    if (!modal) return;
    chronicleReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    setTimeout(() => {
      if (factionId) document.querySelector(`.faction-legend[data-faction-id="${factionId}"]`)?.scrollIntoView({ block: "start", behavior: "smooth" });
      document.getElementById("chronicleClose")?.focus();
    }, 0);
  }

  function closeChronicle() {
    const modal = document.getElementById("chronicleModal");
    if (!modal) return;
    const restore = chronicleReturnFocus;
    chronicleReturnFocus = null;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    if (restore && document.contains(restore)) setTimeout(() => restore.focus(), 0);
  }

  function renderQuests(questState) {
    const panel = document.getElementById("questPanel");
    const list = document.getElementById("questList");
    const label = document.getElementById("questDateLabel");
    if (!panel || !list) return;
    const state = questState || loadQuests();
    if (label) label.textContent = state.dateSeed;
    list.innerHTML = "";
    state.quests.forEach((quest) => {
      const done = quest.progress >= quest.target;
      const row = document.createElement("div");
      row.className = "quest-item" + (done ? " done" : "") + (quest.claimed ? " claimed" : "");
      row.innerHTML = `
        <div>
          <div class="quest-title" title="${quest.title}">${quest.title}</div>
          <div class="quest-progress">${Math.min(quest.progress, quest.target)} / ${quest.target} · ${quest.reward} 金幣</div>
        </div>
        <button class="quest-claim" data-quest-id="${quest.id}">${quest.claimed ? "已領" : "領取"}</button>`;
      const btn = row.querySelector("button");
      btn.disabled = !done || quest.claimed;
      btn.onclick = () => claimQuestUi(quest.id);
      list.appendChild(row);
    });
    updateQuestCtas(state);
    renderMissionDrawer();
    updateMissionBadge();
  }

  function showOverlay(title, win) {
    const ov = document.getElementById("overlay");
    document.getElementById("overlayTitle").textContent = title;
    ov.classList.toggle("win", win); ov.classList.toggle("lose", !win);

    // 更新戰績與金幣
    const s = loadStats();
    const reward = difficultyReward(win);
    let rewardLine;
    if (win) {
      s.wins++; s.streak++; if (s.streak > s.bestStreak) s.bestStreak = s.streak;
      s.lossStreak = 0;
      s.coins += reward.amount;
      rewardLine = `💰 +${reward.amount} 金幣（共 ${s.coins}）`;
    } else {
      s.losses++; s.streak = 0; s.lossStreak = (s.lossStreak || 0) + 1;
      s.coins += reward.amount;
      rewardLine = `💰 +${reward.amount} 金幣（共 ${s.coins}）`;
    }
    recordGameTelemetry(s, win);
    s.dda = Core.nextDdaState(s.dda, s, win ? "win" : "loss");
    saveStats(s);
    try { localStorage.setItem("card_win_streak_v1", JSON.stringify({ current: s.streak || 0, best: s.bestStreak || 0 })); } catch {}
    const ddaInfo = Core.ddaProfile(s.dda);
    if (win) {
      progressQuest({ type: "win", amount: 1 });
      progressWeeklyGoal({ type: "win", amount: 1 });
      if (game.playerDeckSource === "saved") progressQuest({ type: "deckWin", amount: 1 });
    }
    const lossEncourage = !win && s.lossStreak >= 2
      ? `<div class="hint">連敗 ${s.lossStreak} 場：已給敗場金幣，動態調節會依設定小幅放慢對手。</div>`
      : "";
    // 顯示戰績
    const stats = document.getElementById("resultStats");
    if (stats) {
      stats.innerHTML = `
        <div class="streak">${win && s.streak >= 2 ? `🔥 ${s.streak} 連勝！` : ""}</div>
        <div>戰績：${s.wins} 勝 ${s.losses} 敗 · 最高連勝 ${s.bestStreak}</div>
        <div class="coin">${rewardLine}</div>
        <div>難度獎勵：${reward.label}${win ? "勝場" : "敗場"} +${reward.amount} 金幣</div>
        <div>動態調節：${ddaInfo.enabled ? ddaInfo.label : "關閉"}（依近期勝敗調整 AI）</div>
        ${lossEncourage}
        <div class="hint">💡 用金幣去「開卡包」抽更強的卡，組成你的牌組！</div>`;
    }
    updateQuestCtas();
    refreshChronicle();
    updateChronicleBadge();
    if (win) { burstStars(); burstConfetti(); }
    const gRef = game;
    setTimeout(() => { if (game === gRef) ov.classList.add("show"); }, 500);
  }
  function burstStars() {
    if (isLowPerf() || prefersReducedMotion()) return;
    for (let i = 0; i < 30; i++) {
      const c = document.createElement("div");
      c.className = "burst-star";
      c.textContent = ["✨", "⭐", "💫", "🌟", "🎉"][i % 5];
      c.style.cssText = `position:fixed;left:50%;top:45%;font-size:26px;pointer-events:none;z-index:200;transition:all 1.3s ease-out;`;
      document.body.appendChild(c);
      requestAnimationFrame(() => {
        const ang = (Math.PI * 2 * i) / 30, dist = 30 + Math.random() * 20;
        c.style.left = 50 + Math.cos(ang) * dist + "%";
        c.style.top = 45 + Math.sin(ang) * dist + "%";
        c.style.opacity = "0";
      });
      setTimeout(() => c.remove(), 1400);
    }
  }

  // ===== 綁定 & 啟動 =====
  installErrorRecovery();
  installSwAutoReload();
  installAccessibilityLabels();
  applyTextSize(currentTextSize());
  installAudioUnlock();
  document.getElementById("endTurnBtn").onclick = endTurn;
  const hintBtn = document.getElementById("hintBtn");
  if (hintBtn) hintBtn.onclick = showHint;
  const ddaToggle = document.getElementById("ddaToggle");
  if (ddaToggle) ddaToggle.onchange = () => setDdaEnabled(ddaToggle.checked);
  const aiThoughtToggle = document.getElementById("aiThoughtToggle");
  if (aiThoughtToggle) aiThoughtToggle.onchange = () => setAiThoughtEnabled(aiThoughtToggle.checked);
  const perfModeSel = document.getElementById("perfModeSel");
  if (perfModeSel) perfModeSel.onchange = () => setPerfMode(perfModeSel.value);
  const textSizeSel = document.getElementById("textSizeSel");
  if (textSizeSel) textSizeSel.onchange = () => setTextSize(textSizeSel.value);
  const audioToggleBtn = document.getElementById("audioToggleBtn");
  if (audioToggleBtn) audioToggleBtn.onclick = () => setAudioMuted(!audioMuted());
  const handDrawerToggle = document.getElementById("handDrawerToggle");
  if (handDrawerToggle) handDrawerToggle.onclick = () => {
    const drawer = document.getElementById("handDrawer");
    setHandDrawerOpen(!drawer?.classList.contains("open"));
  };
  document.getElementById("restartBtn").onclick = newGame;
  document.getElementById("overlayPackBtn").onclick = goPack;
  document.getElementById("overlayQuestBtn").onclick = claimAllQuestsUi;
  const claimAllBtn = document.getElementById("questClaimAllBtn");
  if (claimAllBtn) claimAllBtn.onclick = claimAllQuestsUi;
  const boardEl = document.querySelector(".board");
  if (boardEl) {
    boardEl.addEventListener("click", (event) => {
      if (event.target.closest(".card, .hero, button, select, label, .quest-panel, .controls, .hand")) return;
      cancelTargeting("已取消選取。");
    });
  }
  // 對戰中重開（牌庫會重新讀最新收藏——開完新卡包回來按這顆就能用到新卡）
  const ngBtn = document.getElementById("newGameBtn");
  if (ngBtn) ngBtn.onclick = newGame;
  startPerfMonitor();
  newGame();
  maybeStartGuide();

  const guideReplayBtn = document.getElementById("guideReplayBtn");
  if (guideReplayBtn) guideReplayBtn.onclick = () => startGuide(true);
  const guideSkipBtn = document.getElementById("guideSkipBtn");
  if (guideSkipBtn) guideSkipBtn.onclick = () => stopGuide(true);
  const guideHintBtn = document.getElementById("guideHintBtn");
  if (guideHintBtn) guideHintBtn.onclick = () => focusGuideTarget();
  const cardDetailClose = document.getElementById("cardDetailClose");
  if (cardDetailClose) cardDetailClose.onclick = closeCardDetail;
  const cardDetail = document.getElementById("cardDetail");
  if (cardDetail) {
    cardDetail.addEventListener("click", (event) => {
      if (event.target === cardDetail) closeCardDetail();
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (document.getElementById("cardDetail")?.classList.contains("show")) { closeCardDetail(); return; }
    if (document.getElementById("chronicleModal")?.classList.contains("show")) { closeChronicle(); return; }
    if (document.getElementById("missionDrawer")?.classList.contains("show")) { closeMissionDrawer(); return; }
    if (typeof window.__kwCodexOpen === "function" && window.__kwCodexOpen()) window.__closeKwCodex();
    else if (document.getElementById("handDrawer")?.classList.contains("open")) setHandDrawerOpen(false);
  });
  const missionDrawerBtn = document.getElementById("missionDrawerBtn");
  if (missionDrawerBtn) missionDrawerBtn.onclick = openMissionDrawer;
  const missionDrawerClose = document.getElementById("missionDrawerClose");
  if (missionDrawerClose) missionDrawerClose.onclick = closeMissionDrawer;
  const missionClaimAllBtn = document.getElementById("missionClaimAllBtn");
  if (missionClaimAllBtn) missionClaimAllBtn.onclick = claimAllMissionsUi;
  const missionDrawer = document.getElementById("missionDrawer");
  if (missionDrawer) {
    missionDrawer.addEventListener("click", (event) => {
      if (event.target === missionDrawer) closeMissionDrawer();
    });
  }
  const chronicleBtn = document.getElementById("chronicleBtn");
  if (chronicleBtn) chronicleBtn.onclick = () => openChronicle();
  const chronicleClose = document.getElementById("chronicleClose");
  if (chronicleClose) chronicleClose.onclick = closeChronicle;
  const chronicleChaptersTab = document.getElementById("chronicleChaptersTab");
  const chronicleFactionsTab = document.getElementById("chronicleFactionsTab");
  if (chronicleChaptersTab) chronicleChaptersTab.onclick = () => setChronicleTab("chapters");
  if (chronicleFactionsTab) chronicleFactionsTab.onclick = () => setChronicleTab("factions");
  const chronicleModal = document.getElementById("chronicleModal");
  if (chronicleModal) {
    chronicleModal.addEventListener("click", (event) => {
      if (event.target === chronicleModal) closeChronicle();
    });
  }

  // 提供給入口頁主題切換用（重繪卡面）
  window.__rerenderBattle = render;
  // 提供給難度選擇器：換難度後重開一局
  window.__newGame = newGame;
  window.__difficulties = DIFFICULTY;
  window.__opponents = OPPONENTS;
  window.addEventListener("storage", (e) => {
    if (e.key === QUEST_KEY) renderQuests();
    if (e.key === CHRONICLE_KEY || e.key === "card_stats_v1" || e.key === "cardpack_collection_v2") {
      refreshChronicle();
      renderChronicle();
    }
    if (e.key === TEXT_SIZE_KEY) applyTextSize(currentTextSize());
    if (e.key === AUDIO_MUTE_KEY) syncAudioButton();
  });

  // 測試掛鉤：讓自動化測試能建立確定性場景並驗證技能（不影響正常遊玩）
  window.__test = {
    game: () => game,
    setup(playerField, enemyField) {
      clearTransientFx();
      game.player.field = (playerField || []).map((id) => prepMinion(getCardById(id)));
      game.enemy.field = (enemyField || []).map((id) => prepMinion(getCardById(id)));
      game.player.mana = game.player.manaMax = 10;
      render();
    },
    hasTaunt: (who) => hasTaunt((who === "enemy" ? game.enemy : game.player).field),
    isLegalTarget: (uid) => { const t = game.enemy.field.find((m) => m.uid === uid); return t ? isLegalTarget(game.enemy, t) : null; },
    playSpellOn(effect, targetUid) {
      const target = [...game.enemy.field, ...game.player.field].find((m) => m.uid === targetUid);
      SPELL_EFFECTS[effect].apply(game, target); render();
    },
    triggerBattlecry(card) { const ab = ABILITY_EFFECTS[card.trigger]; if (ab) ab(game, game.player, game.enemy.field[0]); cleanupField(game.enemy); render(); },
    killMinion(uid, side) { const s = side === "enemy" ? game.enemy : game.player; const m = s.field.find((x) => x.uid === uid); if (m) { m.health = 0; cleanupField(s); render(); } },
    // 我方某隨從攻擊敵方某隨從（測劇毒/連擊互毆）
    attackMinion(attackerUid, defenderUid) {
      const a = game.player.field.find((m) => m.uid === attackerUid);
      const d = game.enemy.field.find((m) => m.uid === defenderUid);
      if (a && d) resolveAttack(game.player, a, d);
      render();
    },
    // 觸發玩家回合結束的回復（不進 AI 回合）
    regenTest() { regenerateField(game.player); render(); },
    difficulty: () => ({ key: game.difficulty, aiSmart: game.aiSmart, playerHp: game.player.hp, enemyHp: game.enemy.hp }),
    // ===== E2E 掛鉤（scripts/test-battle-e2e.js 用）=====
    endTurn: () => endTurn(),
    runAiTurn: () => aiTurn(),
    logText: () => document.getElementById("log")?.textContent || "",
    playFromHand: (uid) => playFromHand(uid),
    stats: () => loadStats(),
    quests: () => loadQuests(),
    setQuests: (questState) => { saveQuests(questState); renderQuests(); return loadQuests(); },
    progressQuest: (event) => progressQuest(event),
    setDdaEnabled: (enabled) => setDdaEnabled(enabled),
    dda: () => ({ stats: loadStats().dda, profile: Core.ddaProfile(loadStats().dda), game: game && game.dda }),
    setAiThoughts: (enabled) => setAiThoughtEnabled(enabled),
    aiThoughts: () => ({ enabled: aiThoughtEnabled(), checked: !!document.getElementById("aiThoughtToggle")?.checked }),
    setPerfMode: (mode) => setPerfMode(mode),
    perf: () => perfSnapshot(),
    forceFps: (fps) => applyPerfEstimate(fps),
    setTextSize: (size) => setTextSize(size),
    textSize: () => ({ value: currentTextSize(), attr: document.documentElement.dataset.textSize, select: document.getElementById("textSizeSel")?.value || "" }),
    setAudioMuted: (muted) => setAudioMuted(muted),
    audio: () => ({ muted: audioMuted(), unlocked: audioUnlocked, button: document.getElementById("audioToggleBtn")?.textContent || "" }),
    effects: () => ({
      finishFx: Object.assign({}, finishFx),
      confetti: document.querySelectorAll(".confetti-piece").length,
      lethalSlow: document.querySelector(".board")?.classList.contains("lethal-slow") || false,
      defeatFade: document.body.classList.contains("defeat-fade"),
      damagePops: document.querySelectorAll(".dmg-float").length,
      dying: document.querySelectorAll(".card.dying").length,
      ghosts: document.querySelectorAll(".combat-ghost").length,
      lunge: document.querySelectorAll(".combat-ghost.lunge-to, .card.lunge-to").length,
      hitFlash: document.querySelectorAll(".combat-ghost.hit-flash, .card.hit-flash").length,
    }),
    markDying: (uid) => { markDying(uid); return document.querySelectorAll(".card.dying").length; },
    swUpdateGuard: () => ({ key: SW_AUTO_RELOAD_KEY, windowMs: SW_AUTO_RELOAD_WINDOW_MS, early: shouldAutoReloadForSwUpdate(), late: shouldAutoReloadForSwUpdate(swPageLoadedAt + SW_AUTO_RELOAD_WINDOW_MS + 1) }),
    hint: () => showHint(),
    lastHint: () => game && game.lastHint,
    hintHighlights: () => [...document.querySelectorAll(".hint-highlight")].map((el) => el.dataset.uid || el.id || el.dataset.cardId || el.className),
    safeSaveAfterError: (message) => { safeSaveAfterError(message); return loadStats(); },
    goals: (seed) => loadGoals(seed),
    setGoals: (goalState, seed) => { saveGoals(goalState || {}, seed); return loadGoals(seed); },
    progressWeeklyGoal: (event) => progressWeeklyGoal(event),
    missionCount: () => missionClaimableCount(),
    openMissionDrawer: () => openMissionDrawer(),
    missionOpen: () => document.getElementById("missionDrawer")?.classList.contains("show") || false,
    claimAllMissions: () => claimAllMissionsUi(),
    chronicle: () => Core.listChapters(loadChronicle(), loadStats(), loadCollection()),
    claimChapter: (chapterId) => claimChapterUi(chapterId),
    openChronicle: (factionId) => openChronicle(factionId),
    closeChronicle: () => closeChronicle(),
    chronicleOpen: () => document.getElementById("chronicleModal")?.classList.contains("show") || false,
    chronicleBadge: () => chronicleClaimableCount(),
    claimQuest: (questId) => claimQuestUi(questId),
    claimAllQuests: () => claimAllQuestsUi(),
    rewardTable: () => JSON.parse(JSON.stringify(DIFFICULTY_REWARDS)),
    finishGame(win) {
      if (win) game.enemy.hp = 0;
      else game.player.hp = 0;
      settleIfGameEnded();
      return loadStats();
    },
    deckInfo: () => ({ source: game.playerDeckSource, ids: [...(game.playerDeckIds || [])], liveIds: [...game.player.hand, ...game.player.deck].map((c) => c.id) }),
    aiDeckInfo: () => ({
      source: game.enemyDeckSource,
      archetype: game.enemyArchetype,
      playerArchetype: game.playerArchetype,
      opponentId: game.opponentId,
      opponentName: game.opponentName,
      opponentEmoji: game.opponentEmoji,
      tauntBias: game.opponent && game.opponent.tauntBias,
      faceBias: game.opponent && game.opponent.faceBias,
      ids: [...(game.enemyDeckIds || [])],
      liveIds: [...game.enemy.hand, ...game.enemy.deck].map((c) => c.id),
      templateIds: [...(game.enemyTemplateIds || [])],
    }),
    opponents: () => Object.values(OPPONENTS).map((opponent) => ({
      id: opponent.id,
      name: opponent.name,
      emoji: opponent.emoji,
      archetype: opponent.archetype,
      deckIds: [...opponent.deckIds],
      tauntBias: opponent.tauntBias,
      faceBias: opponent.faceBias,
    })),
    setOpponent(id) {
      if (!OPPONENTS[id]) return currentOpponentId();
      try { localStorage.setItem(OPPONENT_KEY, id); } catch {}
      const sel = document.getElementById("opponentSel");
      if (sel) sel.value = id;
      newGame();
      return currentOpponentId();
    },
    archetypeTemplateIds: (kind) => buildArchetypeDeckIds(kind),
    guide: () => ({ active: guide.active, step: guide.step, selectedAttacker: guide.selectedAttacker }),
    startGuide: () => startGuide(true),
    skipGuide: () => stopGuide(true),
    detailOpen: () => document.getElementById("cardDetail")?.classList.contains("show") || false,
    closeDetail: () => closeCardDetail(),
    codexOpen: () => typeof window.__kwCodexOpen === "function" ? window.__kwCodexOpen() : document.getElementById("kwCodex")?.classList.contains("show") || false,
    // 直接塞一張指定卡進手牌（回傳 uid），測「法力不足點擊」「場滿」等指定劇本
    giveCard(cardId) {
      const c = Object.assign({}, getCardById(cardId));
      c.uid = "e2e" + Math.random().toString(36).slice(2, 8);
      c.maxHealth = c.health;
      game.player.hand.push(c); render();
      return c.uid;
    },
    maxField: MAX_FIELD,
  };
  function prepMinion(c) { c.uid = "t" + Math.random().toString(36).slice(2, 8); c.maxHealth = c.health; if ((c.keywords || []).includes("divineshield")) c.shield = true; c.canAttack = true; return c; }

  const CAPTURE_POSES = Object.freeze(["legendTauntFoil", "heroCritical", "fourRarityHand", "threeOpponents"]);
  function captureCard(id, extras, fieldCard) {
    const source = getCardById(id);
    if (!source) throw new Error(`Capture card not found: ${id}`);
    const card = Object.assign({}, source, extras || {});
    card.uid = "capture-" + id;
    if (fieldCard) {
      card.maxHealth = card.health;
      if ((card.keywords || []).includes("divineshield")) card.shield = true;
      card.canAttack = true;
    }
    return card;
  }
  function applyCapturePose(name) {
    if (!CAPTURE_POSES.includes(name)) return { ok:false, name, available:[...CAPTURE_POSES] };
    clearTransientFx();
    stopGuide(false);
    document.body.classList.add("capture-pose");
    document.body.dataset.capturePose = name;
    game.turn = "player";
    game.over = false;
    game.selected = null;
    game.player.hp = game.player.maxHp;
    game.enemy.hp = game.enemy.maxHp;
    game.player.mana = game.player.manaMax = 10;
    game.player.field = [];
    game.enemy.field = [];
    game.player.hand = [];
    if (name === "legendTauntFoil") {
      game.player.field = [captureCard("titan", { foil:true }, true)];
      game.enemy.field = [captureCard("frostboundTyrant", {}, true)];
    } else if (name === "heroCritical") {
      game.player.hp = 7;
      game.player.field = [captureCard("dragon", { foil:true }, true)];
      game.enemy.field = [captureCard("golem", {}, true), captureCard("knight", {}, true)];
    } else if (name === "fourRarityHand") {
      game.player.hand = [
        captureCard("wolf"), captureCard("knight"), captureCard("golem"), captureCard("dragon", { foil:true }),
      ];
    } else {
      game.enemy.field = [
        captureCard("knight", {}, true), captureCard("arcaneWeaver", { foil:true }, true), captureCard("frostboundTyrant", {}, true),
      ];
      game.player.field = [captureCard("dawnArchbishop", {}, true)];
    }
    render();
    return { ok:true, name, cards:document.querySelectorAll(".battlefield .card, .hand .card").length };
  }
  function clearCapturePose() {
    document.body.classList.remove("capture-pose");
    delete document.body.dataset.capturePose;
    newGame();
    return true;
  }
  window.__capture = Object.freeze({ poses:[...CAPTURE_POSES], pose:applyCapturePose, clear:clearCapturePose });
  window.__test.pose = applyCapturePose;
  window.__test.capturePoses = () => [...CAPTURE_POSES];
  const initialCapturePose = new URLSearchParams(location.search).get("capture");
  if (initialCapturePose) applyCapturePose(initialCapturePose);
})();
