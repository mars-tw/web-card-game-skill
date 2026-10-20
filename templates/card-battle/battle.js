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
  // R68（辯論裁決 B-01/B-02）：三位具名對手台詞包（每類 1 句起步）與勝敗結語
  const OPPONENT_LINES = Object.freeze({
    op_ser_halden: { intro: "盾在，門就在。上前吧——讓我看看你值不值得通過。", win: "城門緩緩敞開。哈爾登收盾致意：「今日的白潮，屬於你。」", lose: "哈爾登舉盾遮面：「回去練十年，門還會在這裡。」", heroPlay: "「白潮聽令——列陣！」", lethal: "「守住！最後一道浪頭！」" },
    op_magister_vey: { intro: "殘響未落，下一句咒語已經寫好了。", win: "維伊闔上法典：「你的名字，值得寫進殘響。」", lose: "維伊輕笑：「你翻頁的速度，追不上我的詠唱。」", heroPlay: "「見證吧——這一頁由我執筆。」", lethal: "「墨已研好，就差你的句點。」" },
    op_scarra: { intro: "狼群早到了。你，才是遲來的獵物。", win: "斯卡拉吹了聲口哨：「今晚放你走。下次沒這種運氣。」", lose: "狼嚎掠過戰場。斯卡拉丟下一句：「下次，跑快一點。」", heroPlay: "「撕開他們的前排！」", lethal: "「你的血線在發抖。狼群，收尾！」" },
  });
  const OPPONENTS = Object.freeze({
    op_ser_halden: Object.freeze({
      id: "op_ser_halden",
      name: "哈爾登隊長",
      emoji: "🛡️",
      archetype: "control",
      deckIds: Object.freeze([
        "saltShieldSquire", "saltShieldSquire", "footman", "footman", "bulwarkMonk", "bulwarkMonk",
        "knight", "knight", "guardian", "guardian", "bannerGuard", "bannerGuard",
        "oathbannerHerald", "oathbannerHerald", "captainGreywake", "heroSerHalden",
        "mirrorRime", "mirrorRime", "shieldUp", "shieldUp",
      ]),
      heroCardId: "heroSerHalden",
      easyReplacementId: "highArchivist",
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
        "frostChanneler", "frostChanneler", "mage", "heroMagisterVey", "arcaneWeaver", "arcaneWeaver",
        "firebolt", "firebolt", "iceNeedle", "iceNeedle", "emberVolley", "emberVolley",
        "flameBurst", "flameBurst", "voidTithe", "voidTithe",
      ]),
      heroCardId: "heroMagisterVey",
      easyReplacementId: "mage",
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
        "dualTalon", "heroScarra", "dawnRider", "dawnRider", "firebolt", "firebolt",
        "emberVolley", "emberVolley",
      ]),
      heroCardId: "heroScarra",
      easyReplacementId: "dualTalon",
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
    attuneFlexible: (g, side, target, source) => triggerAbilityUi(g, side, "attuneFlexible", target, source),
  };

  let game;
  // Presentation only: never insert empty slots or accessory metadata into Core state.
  const r80Views = new WeakMap();
  function r80View() {
    if (!r80Views.has(game)) r80Views.set(game, {player:[],enemy:[],variants:new Map(),counts:new Map()});
    return r80Views.get(game);
  }
  function r80Variant(card) {
    if (!game || !card.uid || !['footman','archer'].includes(card.id)) return 0;
    const view=r80View();
    if (!view.variants.has(card.uid)) {
      const count=view.counts.get(card.id)||0;view.variants.set(card.uid,count%2);view.counts.set(card.id,count+1);
    }
    return view.variants.get(card.uid);
  }
  function r80Slots(field,side) {
    const view=r80View(), slots=view[side], live=new Set(field.map(c=>c.uid));
    for (let n=0;n<slots.length;n++) {
      const slot=slots[n];if(!slot)continue;
      if(!live.has(slot.uid) && slot.fallenTurn===undefined)slot.fallenTurn=game.turnCount||1;
      if(slot.fallenTurn!==undefined && (game.turnCount||1)>slot.fallenTurn+1)slots[n]=null;
    }
    for(const card of field) {
      r80Variant(card);
      if(slots.some(slot=>slot?.uid===card.uid))continue;
      let free=slots.findIndex(slot=>slot===null);
      if(free<0 && slots.length>=7)free=slots.findIndex(slot=>!live.has(slot?.uid));
      const value={uid:card.uid,id:card.id};if(free<0)slots.push(value);else slots[free]=value;
    }
    // Only trailing expired slots collapse; a live survivor never changes its original slot.
    while(slots.length && slots.at(-1)===null)slots.pop();
    return slots.map((slot,index)=>({slot,index,card:field.find(c=>c.uid===slot?.uid)}));
  }
  function r80WetMark(el,side) {
    const board=document.querySelector('.board');
    if(!board?.classList.contains('r76-wet') || (board.dataset.wetSide==='enemy'?'player':'enemy')!==side)return;
    const mark=document.createElement('img');mark.className='r80-watermark';mark.src='../../assets/art/r79/foam.webp?v=r79-foam';mark.alt='';el.appendChild(mark);
  }
  let sessionReady = false;
  let tideMode = 'flood';
  let tideReturnFocus = null;
  let pendingTargetUid = null;
  const pendingSummonFx = new Set();
  const GUIDE_KEY = "cb_guide_done_v1";
  const PERF_KEY = "card_perf_mode_v1";
  const TEXT_SIZE_KEY = "card_text_size_v1";
  const AUDIO_MUTE_KEY = "card_audio_muted_v1";
  const AUDIO_VOLUME_KEY = "card_audio_volume_v1";
  const R67_BATTLEFIELDS = Object.freeze([
    Object.freeze({ id: "white-tide-citadel", faction: "wardens", urls: Object.freeze({ high: "../../assets/battlefields/white-tide-citadel-high.webp?v=f57dd495", med: "../../assets/battlefields/white-tide-citadel-med.webp?v=7e3aa7a2", low: "../../assets/battlefields/white-tide-citadel-low.webp?v=50075ecc" }) }),
    Object.freeze({ id: "astral-conclave", faction: "conclave", urls: Object.freeze({ high: "../../assets/battlefields/astral-conclave-high.webp?v=aa8b6fe4", med: "../../assets/battlefields/astral-conclave-med.webp?v=a391a7b2", low: "../../assets/battlefields/astral-conclave-low.webp?v=fcf44103" }) }),
    Object.freeze({ id: "thunderwild-pass", faction: "wild", urls: Object.freeze({ high: "../../assets/battlefields/thunderwild-pass-high.webp?v=c0693a23", med: "../../assets/battlefields/thunderwild-pass-med.webp?v=47d3f827", low: "../../assets/battlefields/thunderwild-pass-low.webp?v=5af6a310" }) }),
    Object.freeze({ id: "longnight-necropolis", faction: "wintershadow", urls: Object.freeze({ high: "../../assets/battlefields/longnight-necropolis-high.webp?v=4b7300c8", med: "../../assets/battlefields/longnight-necropolis-med.webp?v=9a48f27c", low: "../../assets/battlefields/longnight-necropolis-low.webp?v=927f8f26" }) }),
    Object.freeze({ id: "tidebreak-confluence", faction: "neutral", urls: Object.freeze({ high: "../../assets/battlefields/tidebreak-confluence-high.webp?v=ae55f8e7", med: "../../assets/battlefields/tidebreak-confluence-med.webp?v=35c28764", low: "../../assets/battlefields/tidebreak-confluence-low.webp?v=bcaabe4e" }) }),
  ]);
  // R68（辯論裁決 B-03 縮幅）：五戰場中文名——R67 美術投資自此有名可稱
  const BATTLEFIELD_NAMES = Object.freeze({
    "white-tide-citadel": "白潮堡壘", "astral-conclave": "星輟議庭", "thunderwild-pass": "雷莽隘口",
    "longnight-necropolis": "長夜陵城", "tidebreak-confluence": "碎潮匯流",
  });
  let battlefieldCursor = -1;
  let battlefieldLoadToken = 0;
  const SW_BOOT = window.__CARD_SW_BOOT || {};
  const SW_AUTO_RELOAD_WINDOW_MS = SW_BOOT.SW_AUTO_RELOAD_WINDOW_MS || 15000;
  const SW_AUTO_RELOAD_KEY = SW_BOOT.SW_AUTO_RELOAD_KEY || "card_sw_auto_reload_content_r6_v1";
  const swPageLoadedAt = SW_BOOT.swPageLoadedAt || Date.now();
  let guide = { active: false, step: 0, selectedAttacker: null };
  let audioCtx = null;
  let audioUnlocked = false;
  let combatInFlight = false;
  let finishFx = { win: false, lethal: false, confetti: 0, defeatFade: false };
  const perfState = { mode: "auto", effective: "high", fps: 60, frames: 0, last: 0, reason: "自動觀察中", history: [] };
  let detailReturnFocus = null;
  let missionReturnFocus = null;
  let chronicleReturnFocus = null;
  let questRenderKey = "";
  let lastUnlockedChapterIds = null;
  const ACTIVE_FX_SELECTOR = ".combat-ghost, .dmg-float, .hit-spark, .combo-float, .kw-pop, .confetti-piece, .burst-star, .spell-flash";
  const GUIDE_STEPS = [
    { label: "第 1／3 步", title: "先出一張牌", copy: "點手牌中發亮的「迅捷狼」；手機預覽後再按「確認出牌」。它有衝鋒，登場後可以立刻攻擊。" },
    { label: "第 2／3 步", title: "選擇攻擊", copy: "先點你場上的迅捷狼，再點敵方英雄完成一次攻擊。" },
    { label: "第 3／3 步", title: "結束回合", copy: "攻擊後點「結束回合」，讓對手行動。之後就照這個節奏出牌、攻擊、結束回合。" },
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
    const stateEl = document.getElementById("handDrawerState");
    if (stateEl) stateEl.textContent = next ? "收合" : "展開";
    const countEl = document.getElementById("handCount");
    if (countEl) countEl.textContent = String(count);
    // R70 R1-B02：觸控抽屜會蓋過英雄列；提示鈕若仍顯示就必須可點，因此被蓋住時明確移出可見/焦點樹。
    // R72：改為「實際幾何被抽屜蓋住才隱藏」——直向手機抽屜不碰英雄列，裂潮鈕要一直看得到充能。
    syncDrawerCoveredControls(next);
    clearTimeout(drawerCoverTimer);
    if (next) drawerCoverTimer = setTimeout(() => syncDrawerCoveredControls(drawer.classList.contains("open")), 230);
  }

  var drawerCoverTimer = 0;
  function syncDrawerCoveredControls(open) {
    const drawer = document.getElementById("handDrawer");
    const touch = window.__controlMode === "touch";
    const drawerRect = drawer ? drawer.getBoundingClientRect() : null;
    ["hintBtn", "tidebreakBtn"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      let covered = false;
      if (open && touch && drawerRect && !el.closest(".controls")) {
        // 先暫時顯示以取得原位置，再判斷是否與抽屜（含展開中的最終高度）重疊
        const wasHidden = el.hidden;
        el.hidden = false;
        const r = el.getBoundingClientRect();
        el.hidden = wasHidden;
        const finalTop = drawerRect.bottom - Math.max(drawerRect.height, drawer.classList.contains("open") ? openDrawerHeight(drawer) : 0);
        covered = r.width > 0 && r.bottom > finalTop - 2 && r.top < drawerRect.bottom;
      }
      el.hidden = covered;
      el.setAttribute("aria-hidden", covered ? "true" : "false");
      el.tabIndex = covered ? -1 : 0;
    });
  }

  function openDrawerHeight(drawer) {
    // 抽屜高度有 .18s 過渡；用不帶過渡的淺複本量最終高度，不打斷畫面上的展開動畫
    const ghost = drawer.cloneNode(false);
    ghost.removeAttribute("id");
    ghost.classList.add("open");
    ghost.style.transition = "none";
    ghost.style.visibility = "hidden";
    ghost.style.pointerEvents = "none";
    drawer.parentNode.appendChild(ghost);
    const h = ghost.getBoundingClientRect().height;
    ghost.remove();
    return h;
  }

  function setSettingsOpen(open) {
    const panel = document.getElementById("settingsPanel");
    const btn = document.getElementById("settingsToggleBtn");
    if (!panel || !btn) return;
    const next = !!open;
    panel.classList.toggle("show", next);
    panel.setAttribute("aria-hidden", next ? "false" : "true");
    btn.setAttribute("aria-expanded", String(next));
  }

  function setMoreActionsOpen(open) {
    const dock = document.getElementById("commandDock");
    const btn = document.getElementById("moreActionsBtn");
    if (!dock || !btn) return;
    const next = !!open;
    dock.classList.toggle("more-open", next);
    btn.setAttribute("aria-expanded", String(next));
  }

  function audioMuted() {
    try { return localStorage.getItem(AUDIO_MUTE_KEY) === "1"; }
    catch { return false; }
  }

  function writeStorage(key, value, label) {
    try {
      localStorage.setItem(key, value);
      if (localStorage.getItem(key) !== value) throw new Error("readback mismatch");
      return true;
    } catch (err) {
      try { showToast(`${label || "儲存"}失敗：瀏覽器儲存不可用，請先到卡包頁匯出存檔。`); } catch {}
      return false;
    }
  }

  function audioVolume() {
    try {
      const raw = Number(localStorage.getItem(AUDIO_VOLUME_KEY));
      return Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0.75;
    } catch { return 0.75; }
  }

  function syncAudioVolumeControl() {
    const input = document.getElementById("audioVolumeRange");
    if (!input) return;
    input.value = String(Math.round(audioVolume() * 100));
  }

  function syncAudioButton() {
    const btn = document.getElementById("audioToggleBtn");
    if (!btn) return;
    const muted = audioMuted();
    btn.classList.toggle("is-muted", muted);
    btn.textContent = muted ? "靜音" : "音效";
    btn.title = muted ? "音效已關閉" : (audioUnlocked ? "音效已開啟" : "操作後啟用音效");
    btn.setAttribute("aria-label", muted ? "開啟音效" : "關閉音效");
    btn.setAttribute("aria-pressed", muted ? "true" : "false");
    syncAudioVolumeControl();
    if (typeof syncBgm === "function") syncBgm();
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
    writeStorage(AUDIO_MUTE_KEY, muted ? "1" : "0", "音效設定儲存");
    if (!muted) ensureAudio();
    syncAudioButton();
    return audioMuted();
  }

  function setAudioVolume(value) {
    const next = Math.max(0, Math.min(1, Number(value) || 0));
    writeStorage(AUDIO_VOLUME_KEY, String(next), "音量設定儲存");
    if (next > 0 && !audioMuted()) ensureAudio();
    syncAudioVolumeControl();
    return audioVolume();
  }

  function playTone(freq, duration, type, gain, delay, endFreq) {
    if (!audioUnlocked || audioMuted()) return;
    const volume = audioVolume();
    if (volume <= 0) return;
    const ctx = audioCtx;
    if (!ctx) return;
    const now = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime((gain || 0.045) * volume, now + 0.012);
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
    else if (kind === "win") { playTone(330, .12, "triangle", .038); playTone(660, .16, "sine", .032, .09); playTone(990, .24, "sine", .026, .22); }
    else if (kind === "lose") { playTone(180, .2, "sawtooth", .042, 0, 80); playTone(92, .28, "triangle", .032, .14, 48); }
    else if (kind === "lethal") { playSound("win"); }
    else if (kind === "death") { playTone(180, .22, "triangle", .038, 0, 48); }
    else if (kind === "ui") { playTone(520, .045, "triangle", .024); }
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
    writeStorage(PERF_KEY, next, "效能設定儲存");
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
    if (battlefieldCursor >= 0) applyBattlefieldScene({ advance: false });
  }

  function battlefieldTier(forcedTier) {
    if (["low", "med", "high"].includes(forcedTier)) return forcedTier;
    const constrainedDevice = Number(navigator.deviceMemory || 8) <= 4;
    if (isLowPerf() || constrainedDevice || innerWidth <= 700) return "low";
    if (innerWidth <= 1200) return "med";
    return "high";
  }

  function applyBattlefieldScene(options) {
    const config = options || {};
    if (config.id) {
      const forcedIndex = R67_BATTLEFIELDS.findIndex((scene) => scene.id === config.id);
      if (forcedIndex >= 0) battlefieldCursor = forcedIndex;
    } else if (config.advance !== false) {
      battlefieldCursor = (battlefieldCursor + 1) % R67_BATTLEFIELDS.length;
    } else if (battlefieldCursor < 0) {
      battlefieldCursor = 0;
    }
    const scene = R67_BATTLEFIELDS[battlefieldCursor];
    const tier = battlefieldTier(config.tier);
    const requested = scene.urls[tier];
    if (window.__r67VisualState && window.__r67VisualState.id === scene.id && window.__r67VisualState.tier === tier) {
      return Promise.resolve(window.__r67VisualState);
    }
    const token = ++battlefieldLoadToken;
    window.__r67VisualState = { id: scene.id, faction: scene.faction, tier, url: new URL(requested, location.href).href, loaded: false };
    document.body.dataset.battlefieldLoading = "true";
    const image = new Image();
    image.decoding = "async";
    image.fetchPriority = "high";
    const ready = () => {
      if (token !== battlefieldLoadToken) return false;
      const absoluteUrl = new URL(requested, location.href).href;
      document.documentElement.style.setProperty("--battlefield-image", `url("${absoluteUrl}")`);
      document.body.dataset.battlefield = scene.id;
      document.body.dataset.battlefieldTier = tier;
      document.body.dataset.battlefieldLoading = "false";
      window.__r67VisualState = { id: scene.id, faction: scene.faction, tier, url: absoluteUrl, loaded: true };
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!performance.getEntriesByName("r67-visual-ready").length) {
          performance.mark("r67-visual-ready", { detail: window.__r67VisualState });
        }
      }));
      return true;
    };
    const failed = () => {
      if (token !== battlefieldLoadToken) return false;
      if (tier !== "low") return applyBattlefieldScene({ id: scene.id, tier: "low", advance: false });
      document.body.dataset.battlefieldLoading = "error";
      window.__r67VisualState = { id: scene.id, faction: scene.faction, tier, url: requested, loaded: false };
      return false;
    };
    image.onload = () => { image.decode().catch(() => {}).finally(ready); };
    image.onerror = failed;
    image.src = requested;
    return new Promise((resolve) => {
      const finish = () => resolve(window.__r67VisualState || { id: scene.id, tier, loaded: false });
      image.addEventListener("load", () => image.decode().catch(() => {}).finally(() => setTimeout(finish, 0)), { once: true });
      image.addEventListener("error", () => setTimeout(finish, 0), { once: true });
    });
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
    writeStorage(TEXT_SIZE_KEY, next, "文字設定儲存");
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
      guideHintBtn: "關閉教學提示",
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
      settingsToggleBtn: "開啟設定",
      moreActionsBtn: "更多行動",
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
      audioVolumeRange: "音效音量",
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
  function newGame(voyageStageId) {
    if (parent !== window) parent.postMessage({type:"battleFullBleed",active:false},location.origin);
    delete document.body.dataset.r76Wave;
    document.getElementById('tideWave')?.classList.remove('run','enemy');
    window.CardMobile?.cancel(false);
    document.getElementById('tideTrialBar').hidden = true;
    document.getElementById('trialResultActions').hidden = true;
    document.querySelector('#overlay .overlay-actions:not(#trialResultActions)').hidden = false;
    ['contentPanel','contentResult','forecastPanel','contentBar'].forEach(id=>document.getElementById(id).hidden=true);
    tideMode = 'flood';
    setHandDrawerOpen(false);
    const voyageStage = CardVoyage.STAGES.find(s => s.id === voyageStageId);
    if (voyageStage && !CardVoyage.canStart(CardMobile.load(), voyageStage.id)) return;
    applyBattlefieldScene({ advance: true });
    combatInFlight = false;
    pendingSummonFx.clear();
    pendingTargetUid = null;
    stopGuide(false);
    document.body.classList.remove("defeat-fade");
    clearTransientFx();
    const board = document.querySelector(".board");
    if (board) board.classList.remove("lethal-slow", "shake-screen", "r76-wet");
    finishFx = { win: false, lethal: false, confetti: 0, defeatFade: false };
    const diffKey = voyageStage ? voyageStage.difficulty : currentDifficulty();
    const D = DIFFICULTY[diffKey];
    const trial = voyageStage && CardVoyage.DECKS.find(d => d.id === CardMobile.load().deck);
    const playerDeck = trial ? Core.buildBattleDeck(trial.cards, CARD_POOL, rng) : buildDeck(true);
    if (trial) playerDeck._deckSource = 'trial';
    const playerDeckSource = playerDeck._deckSource || "fallback";
    const playerDeckIds = playerDeck.map((card) => card.id);
    const playerArchetype = detectDeckArchetype(playerDeckIds);
    const stats = loadStats();
    const dda = Core.ddaProfile(stats.dda);
    const opponent = voyageStage ? (CardVoyage.OPPONENTS[voyageStage.opponent] || OPPONENTS[voyageStage.opponent]) : currentOpponent();
    const enemyPlan = buildAiDeck(diffKey, playerArchetype, opponent);
    const enemyDeck = enemyPlan.deck;
    const enemyDeckIds = enemyDeck.map((card) => card.id);
    delete playerDeck._deckSource;
    game = {
      difficulty: diffKey, aiSmart: D.aiSmart,
      voyageStage: voyageStage ? voyageStage.id : null,
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
      pendingBattlecry: null,
      over: false,
    };
    game.player.opp = game.enemy; game.enemy.opp = game.player;
    // R72 裂潮：雙方潮能歸零；具名對手帶自己的潮汐親和
    game.player.tide = 0; game.enemy.tide = 0;
    game.player.tidebreaksUsed = 0; game.enemy.tidebreaksUsed = 0;
    game.enemy.tideRates = Object.assign({}, opponent.tideRates || (Core.OPPONENT_TIDE_RATES || {})[opponent.id] || {});
    game.tideFullAnnounced = false;
    game.starResult = null;
    game.comboCount = 0;
    game.mulliganUsed = false; // CP2-6 起手可重抽一次
    for (let i = 0; i < D.playerDraw; i++) drawCard(game.player);
    for (let i = 0; i < D.enemyDraw; i++) drawCard(game.enemy);
    assertOpeningDeckTotal("player", game.player);
    assertOpeningDeckTotal("enemy", game.enemy);
    document.getElementById("overlay").classList.remove("show", "win", "lose");
    document.getElementById("log").innerHTML = "";
    log(`⚔️ 對戰開始！難度：${D.label}；對手：${opponent.emoji} ${opponent.name}。`, "me");
    { const op = OPPONENT_LINES[opponent.id]; if (op && op.intro) log(`${op.intro}`, "ai"); }
    { const scene = R67_BATTLEFIELDS[battlefieldCursor]; const bn = scene && BATTLEFIELD_NAMES[scene.id]; if (bn) log(`戰場——${bn}`, "me"); }
    if (opponent.heroCardId && playerDeckIds.includes(opponent.heroCardId)) {
      log(`「${opponent.name}對上了……另一個${opponent.name}。」`, "me");
    }
    applyOpponentPortrait(opponent);
    if (voyageStage) {
      applyBattlefieldScene({ id: voyageStage.scene, advance: false });
      log(`${voyageStage.name}：${voyageStage.tip}`, 'me');
    }
    render();
    showVsIntro(opponent);
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
      writeStorage(GUIDE_KEY, "1", "教學狀態儲存");
      writeStorage("cb_tutorial_seen", "1", "教學狀態儲存");
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

  function prepGuideCard(card) {
    if (!card) return null;
    if (!card.uid) card.uid = "guide" + Math.random().toString(36).slice(2, 8);
    card.maxHealth = card.health;
    return card;
  }

  function ensureGuideCardInHand(cardId) {
    const handCard = game.player.hand.find((card) => card.id === cardId);
    if (handCard) return prepGuideCard(handCard);
    const deckIndex = game.player.deck.findIndex((card) => card.id === cardId);
    if (deckIndex >= 0) {
      const [card] = game.player.deck.splice(deckIndex, 1);
      game.player.hand.unshift(prepGuideCard(card));
      return card;
    }
    const source = getCardById(cardId);
    if (!source) return null;
    const replacement = prepGuideCard(cloneCard(source));
    if (game.player.hand.length > 0) {
      game.player.hand[0] = replacement;
    } else if (game.player.deck.length > 0) {
      game.player.deck.pop();
      game.player.hand.unshift(replacement);
    }
    return replacement;
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
    ensureGuideCardInHand("wolf");
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

  function advanceGuide(eventName, detail) {
    if (!guide.active) return;
    if (guide.step === 0 && eventName === "play") {
      if (detail && detail.cardId && detail.cardId !== "wolf") {
        flash("教學步驟需先打出迅捷狼。");
        renderGuide();
        return;
      }
      guide.step = 1;
      guide.selectedAttacker = null;
      renderGuide();
    } else if (guide.step === 1 && eventName === "attackerSelected") {
      if (detail && detail.attackerId && detail.attackerId !== "wolf") {
        flash("教學步驟需選擇迅捷狼攻擊。");
        renderGuide();
        return;
      }
      guide.selectedAttacker = game.selected;
      renderGuide();
    } else if (guide.step === 1 && eventName === "attack") {
      if (detail && detail.attackerId && detail.attackerId !== "wolf") {
        flash("教學步驟需用迅捷狼完成攻擊。");
        renderGuide();
        return;
      }
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
      if (guide.active) prepareGuideScenario();
      else render();
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

  function buildOpponentDeck(opponent, diffKey) {
    const picked = opponent || currentOpponent();
    const ids = Array.isArray(picked.deckIds) ? [...picked.deckIds] : [];
    if (diffKey === "easy" && picked.heroCardId && picked.easyReplacementId) {
      const heroIndex = ids.indexOf(picked.heroCardId);
      if (heroIndex >= 0) ids[heroIndex] = picked.easyReplacementId;
    }
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
    const deck = buildOpponentDeck(picked, diffKey);
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
    if (game.turn !== "player" || game.over || combatInFlight) return;
    window.CardMobile?.cancel(false);
    const result = Core.playCard(game, { side: "player", cardUid: uid }, rng);
    handleCoreResult(result);
    if (!result.ok) {
      if (result.reason === "pendingCancelledSame") { pendingTargetUid = null; render(); return; }
      showCoreFailure(result);
      render();
      return;
    }
    setHandDrawerOpen(false);
    pendingTargetUid = null;
    const spellPending = result.events.find((e) => e.type === "spellPending");
    if (spellPending) {
      flash(spellPending.need === "friendlyMinion" ? "選擇一個友方隨從" : "選擇一個敵方隨從");
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
    const battlecryPending = result.events.find((e) => e.type === "battlecryPending");
    if (battlecryPending) {
      flash("調印：選擇一個友方隨從");
      render();
      return;
    }
    render(); checkWin();
    advanceGuide("play", { cardId: result.card && result.card.id });
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

  function hasPendingTargetChoice() {
    return !!(game && (game.pendingSpell || game.pendingBattlecry));
  }

  function selectPendingTarget(uid) {
    if (!hasPendingTargetChoice()) return false;
    pendingTargetUid = uid || null;
    render();
    return true;
  }

  function cancelPendingTargetChoice() {
    if (!pendingTargetUid) return false;
    pendingTargetUid = null;
    render();
    return true;
  }

  function confirmPendingTarget(uid) {
    if (!hasPendingTargetChoice()) return false;
    const target = [...game.player.field, ...game.enemy.field].find((m) => m.uid === uid);
    if (!target) {
      pendingTargetUid = null;
      render();
      return false;
    }
    pendingTargetUid = null;
    resolvePendingSpell(target);
    return true;
  }

  function clickEnemyMinion(uid) {
    if (game.turn !== "player" || game.over || combatInFlight) return;
    const target = game.enemy.field.find((m) => m.uid === uid);
    if (!target) return;

    if (game.pendingSpell || game.pendingBattlecry) {
      if (game.pendingBattlecry) { flash("調印需指定友方隨從。"); return; }
      if (game.pendingSpell.need !== "enemyMinion") { flash("此法術需指定友方隨從。"); return; }
      selectPendingTarget(target.uid); return;
    }
    if (game.selected) {
      if (!isLegalTarget(game.enemy, target)) { flash("必須先攻擊嘲諷隨從！"); return; }
      const attacker = game.player.field.find((m) => m.uid === game.selected);
      if (attacker) resolveAttack(game.player, attacker, target);
    }
  }

  function clickFriendlyMinionAsTarget(target) {
    if (game.pendingBattlecry && game.pendingBattlecry.need === "friendlyMinion") { selectPendingTarget(target.uid); return true; }
    if (game.pendingSpell && game.pendingSpell.need === "friendlyMinion") { selectPendingTarget(target.uid); return true; }
    return false;
  }

  function resolvePendingSpell(target) {
    const resolvingBattlecry = !!game.pendingBattlecry;
    const result = Core.resolveTarget(game, { side: "player", targetUid: target && target.uid }, rng);
    handleCoreResult(result);
    if (!result.ok) showCoreFailure(result);
    else if (resolvingBattlecry && result.card) {
      const amount = result.events.find((event) => event.type === "attune")?.amount || 1;
      log(`${result.card.name}調印 ${result.target?.name || "友方隨從"}，獲得 +${amount}/+${amount}。`, "me");
    } else if (result.card) {
      trackCardUse(result.card);
      logSpellEffect(result.card, result.target, "player");
    }
    pendingTargetUid = null;
    render(); checkWin();
  }

  function clickEnemyHero() {
    if (game.turn !== "player" || game.over || combatInFlight) return;
    if (game.tideTrial) { showToast('試航要用裂潮破陣，先讓士兵交換蓄潮。'); return; }
    if (game.pendingSpell || game.pendingBattlecry) { flash(game.pendingBattlecry ? "調印需指定友方隨從。" : "此法術需指定隨從。"); return; }
    if (game.selected) {
      if (hasTaunt(game.enemy.field)) { flash("敵方有嘲諷，不能直接攻擊英雄！"); return; }
      const attacker = game.player.field.find((m) => m.uid === game.selected);
      if (attacker) {
        resolveHeroAttackUi(game.player, attacker, game.enemy);
      }
    }
  }

  function selectMyMinion(uid) {
    if (game.turn !== "player" || game.over || combatInFlight) return;
    const m = game.player.field.find((x) => x.uid === uid);
    if (!m) return;
    if ((game.pendingSpell || game.pendingBattlecry) && clickFriendlyMinionAsTarget(m)) return;
    if (!m.canAttack || m._cantAttackThisTurn) { flash("這個隨從本回合無法攻擊。"); return; }
    game.selected = game.selected === uid ? null : uid;
    render();
    if (game.selected === uid) advanceGuide("attackerSelected", { attackerId: m.id });
  }

  function cancelTargeting(message) {
    if (!game) return;
    if (cancelPendingTargetChoice()) return;
    if (game.pendingBattlecry) {
      flash("調印戰吼需指定一個友方隨從。");
      return;
    }
    const hadTargeting = !!(game.selected || game.pendingSpell || game.pendingBattlecry);
    game.selected = null;
    game.pendingSpell = null;
    game.pendingBattlecry = null;
    pendingTargetUid = null;
    if (message && hadTargeting) flash(message);
    if (hadTargeting) render();
  }

  function bindKeyboardAction(el, label, action, options) {
    if (!el || typeof action !== "function") return;
    el.setAttribute("role", "button");
    el.tabIndex = options && options.disabled ? -1 : 0;
    el.setAttribute("aria-label", label || "可操作項目");
    if (options && options.disabled) el.setAttribute("aria-disabled", "true");
    else el.removeAttribute("aria-disabled");
    if (options && Object.prototype.hasOwnProperty.call(options, "pressed")) {
      el.setAttribute("aria-pressed", options.pressed ? "true" : "false");
    } else {
      el.removeAttribute("aria-pressed");
    }
    el.onkeydown = (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      action(event);
    };
  }

  function cardAriaLabel(card, context) {
    const parts = [context, card.name, `${card.cost} 費`];
    if (card.type === CARD_TYPE.MINION) parts.push(`${card.attack || 0} 攻 ${card.health || 0} 血`);
    if (card.text) parts.push(card.text);
    return parts.filter(Boolean).join("，");
  }

  function targetStatusText() {
    if (!game) return "載入中。";
    if (game.over) return "對戰已結束。";
    if (game.turn !== "player") return "對手行動中。";
    if (pendingTargetUid && (game.pendingSpell || game.pendingBattlecry)) {
      const target = [...game.player.field, ...game.enemy.field].find((m) => m.uid === pendingTargetUid);
      return target ? `確認 ${target.name} 或取消` : "請重新選擇目標";
    }
    if (game.pendingBattlecry) return "調印：請選擇友方隨從";
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
    el.classList.toggle("active", !!(game && (game.selected || game.pendingSpell || game.pendingBattlecry || game.turn !== "player")));
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
    if (Core.canTidebreak(game, "player")) {
      const kills = tidebreakKillCount("player");
      const lethalTide = game.enemy.hp <= (Core.TIDEBREAK_HERO_DAMAGE || 2);
      actions.push({
        type: "tidebreak", score: (lethalTide ? 900 : 0) + 24 + kills * 14,
        label: "建議施放：裂潮爆發",
        reason: lethalTide ? "裂潮爆發的 2 點英雄傷害就能斬殺。" : kills ? "潮浪能一次清掉低血隨從。" : "潮能已滿，放掉才能重新累積。",
        estimate: kills ? `預計清掉 ${kills} 隻敵方隨從。` : `預計對敵方英雄造成 ${Core.TIDEBREAK_HERO_DAMAGE} 點傷害。`,
      });
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
    if(game?.forecast){openForecast();return;}
    if(game?.content){openContent();return;}
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
    const primary = action.type === "tidebreak" ? document.getElementById("tidebreakBtn") : primaryUid ? elFor(primaryUid) : null;
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
  function coreFailure(reason, extra) {
    return Object.assign({ ok: false, reason, events: [] }, extra || {});
  }

  function validateMinionAttack(attackerSide, attacker, defender) {
    const defenderSide = attackerSide && attackerSide.opp ? attackerSide.opp : (attackerSide.side === "player" ? game.enemy : game.player);
    if (!attacker || !defender) return coreFailure("targetNotFound", { attacker, defender });
    if (!attacker.canAttack || attacker._cantAttackThisTurn) return coreFailure("cannotAttack", { attacker, defender });
    if (!isLegalTarget(defenderSide, defender)) return coreFailure("illegalTarget", { attacker, defender });
    return { ok: true, defenderSide };
  }

  function validateHeroAttack(attackerSide, attacker, defenderSide) {
    if (!attacker) return coreFailure("targetNotFound", { attacker });
    if (!attacker.canAttack || attacker._cantAttackThisTurn) return coreFailure("cannotAttack", { attacker });
    if (isRushHeroLocked(attacker)) return coreFailure("rushBlocksHero", { attacker });
    if (hasTaunt(defenderSide.field)) return coreFailure("tauntBlocksHero", { attacker });
    return { ok: true };
  }

  function resolveAttack(attackerSide, attacker, defender) {
    if (combatInFlight) return Promise.resolve(coreFailure("cannotAttack"));
    const preflight = validateMinionAttack(attackerSide, attacker, defender);
    if (!preflight.ok) {
      showCoreFailure(preflight);
      return Promise.resolve(preflight);
    }
    combatInFlight = true;
    if(game.content)CardContentR6.renderExchange(Core,game,{busy:true});
    const attackerName = attacker.name;
    const defenderName = defender.name;
    const attackerUid = attacker.uid;
    const defenderUid = defender.uid;
    const sideKey = attackerSide.side;
    return animateAttackToward(attackerUid, defenderUid, () => {
      const result = Core.resolveAttack(game, { attackerSide: sideKey, attackerUid, defenderUid }, rng);
      handleCoreResult(result);
      if (result.ok) playSound("attack");
      if (result.ok) log(`${attackerName} 與 ${defenderName} 交戰！`, sideKey === "player" ? "me" : "ai");
      else showCoreFailure(result);
      if (result.ok && sideKey === "player") advanceGuide("attack", { attackerId: attacker.id, defenderId: defender.id });
      return result;
    }).then((result) => {
      combatInFlight = false;
      game.selected = null;
      render(); checkWin();
      return result || coreFailure("targetNotFound");
    }).catch((err) => {
      combatInFlight = false;
      throw err;
    });
  }

  function resolveHeroAttackUi(attackerSide, attacker, defenderSide) {
    if (combatInFlight) return Promise.resolve(coreFailure("cannotAttack"));
    const preflight = validateHeroAttack(attackerSide, attacker, defenderSide);
    if (!preflight.ok) {
      showCoreFailure(preflight);
      return Promise.resolve(preflight);
    }
    combatInFlight = true;
    const attackerName = attacker.name;
    const attack = attacker.attack;
    const attackerUid = attacker.uid;
    const sideKey = attackerSide.side;
    const defenderSideKey = defenderSide.side;
    const heroId = defenderSideKey === "enemy" ? "enemyHero" : "playerHero";
    return animateAttackToward(attackerUid, heroId, () => {
      const result = Core.resolveHeroAttack(game, { attackerSide: sideKey, attackerUid, defenderSide: defenderSideKey }, rng);
      handleCoreResult(result);
      if (result.ok) playSound("attack");
      if (result.ok) {
        const who = defenderSideKey === "enemy" ? "敵方英雄" : "你的英雄";
        log(`${sideKey === "enemy" ? "對手的 " : ""}${attackerName} 攻擊${who}，造成 ${attack} 點傷害！`, sideKey === "player" ? "me" : "ai");
      } else {
        showCoreFailure(result);
      }
      if (result.ok && sideKey === "player") advanceGuide("attack", { attackerId: attacker.id, hero: defenderSideKey });
      return result;
    }).then((result) => {
      combatInFlight = false;
      game.selected = null;
      render(); checkWin();
      return result || coreFailure("targetNotFound");
    }).catch((err) => {
      combatInFlight = false;
      throw err;
    });
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
    if (game.turn !== "player" || game.over || combatInFlight) return;
    if (game.content && CardTideContent.isPuzzle(game.content.id)) { flash('本題不可結束回合。可在「目標／提示」結束這次挑戰。'); return; }
    window.CardMobile?.cancel(false);
    if (game.pendingBattlecry) {
      flash("請先完成調印戰吼。");
      return;
    }
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
    writeStorage("card_ai_thoughts_v1", enabled ? "1" : "0", "AI 思路設定儲存");
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
    if (game.content) { scriptedContentTurn(); return; }
    const ai = game.enemy;
    handleCoreResult(Core.advanceTurn(game, { phase: "startEnemy" }, rng));
    if (game.over) { render(); return; }
    showTurnBanner("enemy");

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
          const attuneTarget = card.trigger === "attuneFlexible"
            ? ([...ai.field].sort((a, b) => minionThreatScore(b) - minionThreatScore(a))[0] || card)
            : null;
          const result = Core.playCard(game, {
            side: "enemy",
            cardUid: card.uid,
            targetUid: attuneTarget && attuneTarget.uid,
            deferBattlecry: false,
            burnMulligan: false,
            trackCombo: false,
          }, rng);
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
    // R72：出完牌後判斷是否掀起裂潮爆發（有施放就多留時間看潮浪）
    const aiTideFired = maybeAiTidebreak();
    if (game.over) { render(); return; }

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
        const afterAttack = (attackPromise) => {
          Promise.resolve(attackPromise).then(() => {
            if (game !== gRef) return;
            // 連擊（windfury）：第一擊後 canAttack 仍為 true，把它排回佇列吃第二擊。
            if (ai.field.includes(atk) && atk.canAttack && atk._windUsed) queue.push(atk);
            render(); checkWin();
            setTimeout(step, 620);
          }).catch((err) => {
            combatInFlight = false;
            console.error(err);
            setTimeout(step, 620);
          });
        };
        const playerTaunts = game.player.field.filter((m) => (m.keywords || []).includes("taunt"));
        if (playerTaunts.length) {
          const t = maybeDdaSecondBest(playerTaunts.sort((a, b) => a.health - b.health || minionThreatScore(b) - minionThreatScore(a)))[0];
          logAiThought(aiAttackReason(atk, t, { forcedTaunt: true, lethal }));
          afterAttack(resolveAttack(ai, atk, t));
          return;
        } else {
          const threat = chooseAiAttackTarget(atk, lethal);
          if (threat) {
            logAiThought(aiAttackReason(atk, threat, { lethal }));
            afterAttack(resolveAttack(ai, atk, threat));
            return;
          }
          else if (canAttackHeroNow(atk)) {
            logAiThought(aiAttackReason(atk, null, { hero: true, lethal }));
            afterAttack(resolveHeroAttackUi(ai, atk, game.player));
            return;
          } else {
            step(); return;
          }
        }
      };
      step();
    }, aiTideFired ? 1450 : 600);
  }

  function endAiTurn() {
    if (game.over) return;
    handleCoreResult(Core.advanceTurn(game, { phase: "endEnemy" }, rng));
    if (game.over) { render(); return; }
    game.turnCount = (game.turnCount || 1) + 1;
    log("輪到你了。", "me");
    render();
    showTurnBanner("player");
  }

  function checkWin() {
    settleIfGameEnded();
  }

  function settleIfGameEnded() {
    if (!game || game.over) return false;
    if (game.content) { const outcome=CardTideContent.outcome(game); if(outcome) { finishContent(outcome==='completed'); return true; } return false; }
    if (game.enemy.hp > 0 && game.player.hp > 0) return false;
    game.over = true;
    clearSession();
    game.selected = null;
    game.pendingSpell = null;
    const win = game.enemy.hp <= 0;
    triggerFinishEffect(win);
    showOverlay(win ? "勝利！" : "敗北", win);
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
    renderTide();

    const hand = document.getElementById("playerHand");
    requestAnimationFrame(() => { hand.dataset.overflow = hand.scrollWidth > hand.clientWidth + 4 ? "true" : "false"; });
    const handFrag = document.createDocumentFragment();
    game.player.hand.forEach((card) => {
      const el = renderCard(card);
      if (playableCost(game.player, card) <= game.player.mana && game.turn === "player") el.classList.add("playable");
      else el.classList.add("disabled");
      const playAction = () => playFromHand(card.uid);
      el.onclick = playAction;
      bindKeyboardAction(el, cardAriaLabel(card, window.__controlMode === 'touch' ? "手牌，選牌後確認出牌" : "手牌，可按 Enter 或 Space 出牌"), playAction);
      window.CardMobile?.bind(el, card);
      handFrag.appendChild(el);
    });
    hand.replaceChildren(handFrag);
    const handCount = document.getElementById("handCount");
    if (handCount) handCount.textContent = String(game.player.hand.length);

    const enemyHero = document.getElementById("enemyHero");
    const selectedMinion = game.selected ? game.player.field.find((m) => m.uid === game.selected) : null;
    enemyHero.classList.toggle("targetable", !!selectedMinion && !game.tideTrial && game.turn === "player" && !hasTaunt(game.enemy.field) && !isRushHeroLocked(selectedMinion));
    enemyHero.onclick = clickEnemyHero;
    bindKeyboardAction(enemyHero, `敵方英雄 ${game.enemy.hp}/${game.enemy.maxHp} 生命${game.tideTrial ? '，試航以裂潮破陣' : selectedMinion ? "，可按 Enter 或 Space 攻擊" : ""}`, clickEnemyHero, { disabled: game.turn !== "player" || game.over || game.tideTrial });
    const playerHero = document.getElementById("playerHero");
    if (playerHero) {
      playerHero.tabIndex = 0;
      playerHero.setAttribute("role", "img");
      playerHero.setAttribute("aria-label", `你的英雄 ${game.player.hp}/${game.player.maxHp} 生命`);
    }
    updateTargetStatus();

    document.getElementById("endTurnBtn").disabled = game.turn !== "player" || game.over || combatInFlight || !!(game.content && CardTideContent.isPuzzle(game.content.id));
    // R68（C-02 精簡版）：無可行動時結束回合鈕發光引導（純資訊，零摩擦）
    {
      const btn = document.getElementById("endTurnBtn");
      let hasActions = false;
      if (game.turn === "player" && !game.over) {
        hasActions = game.player.hand.some((c) => c.cost <= game.player.mana) ||
          game.player.field.some((m) => m.canAttack && !m._cantAttackThisTurn);
      }
      btn.classList.toggle("glow", !btn.disabled && !hasActions);
    }
    updateHintButton();
    renderQuests();
    focusGuideTarget();
    renderTideTrial();
    renderContentBar();
    CardContentR6.renderSignals(game);CardContentR10.render(game);CardContentR11.render(game);
    CardContentR6.renderExchange(Core,game,{busy:combatInFlight,cancel:()=>cancelTargeting(),confirm:(a,t)=>resolveAttack(game.player,a,t)});
    saveSession();
  }

  function appendTargetActions(cardEl, uid) {
    if (!cardEl || pendingTargetUid !== uid) return;
    const pop = document.createElement("div");
    pop.className = "target-action-popover";
    pop.innerHTML = '<button class="confirm" type="button">確認</button><button class="cancel" type="button">取消</button>';
    pop.querySelector(".confirm").onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      confirmPendingTarget(uid);
    };
    pop.querySelector(".cancel").onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      cancelPendingTargetChoice();
    };
    cardEl.appendChild(pop);
  }

  function renderField(elId, field, side) {
    const el = document.getElementById(elId);
    const previousCard=el.querySelector('.card');
    if(previousCard){const size=getComputedStyle(previousCard);el.style.setProperty('--r80-slot-w',size.width);el.style.setProperty('--r80-slot-h',size.height);}
    el.onclick = (event) => {
      if (event.target === el || event.target.classList.contains("empty-hint")) cancelTargeting("已取消選取。");
    };
    const slots=r80Slots(field,side);
    if (field.length === 0 && !slots.some(({slot})=>slot)) {
      const hint = document.createElement("div");
      hint.className = "empty-hint";
      hint.textContent = '';
      hint.setAttribute('aria-label', side === 'enemy' ? '敵方空位' : '我方空位');
      el.replaceChildren(hint);
      return;
    }
    const enemyHasTaunt = hasTaunt(game.enemy.field);
    const frag = document.createDocumentFragment();
    slots.forEach(({slot,index,card}) => {
      if(!card) {
        const ghost=document.createElement('div');ghost.className='r80-empty-slot';ghost.dataset.slot=String(index);
        if(slot){ghost.dataset.fallenUid=slot.uid;ghost.setAttribute('aria-label','退場空位');}
        else ghost.setAttribute('aria-hidden','true');
        r80WetMark(ghost,side);frag.appendChild(ghost);return;
      }
      const c = renderCard(card);c.dataset.slot=String(index);
      r80WetMark(c,side);
      const ready = side==='player' && card.canAttack && !card._cantAttackThisTurn && game.turn==='player' && !game.over && !combatInFlight;
      if (field.filter(previous => previous.id === card.id).length>1 && r80Variant(card)===1) c.classList.add("r76-duplicate");
      if (side === "player" && !ready) c.classList.add("r76-spent");
      const station = document.createElement('span'); station.className = 'r77-card-state';
      station.textContent = side === 'enemy' ? '' : ready ? '' : card._r77SpentTurn===game.turnCount ? '已行動' : '待命';
      c.dataset.actionState = side === 'enemy' ? 'enemy' : ready ? 'ready' : card._r77SpentTurn===game.turnCount ? 'spent' : 'waiting';
      if (c.dataset.actionState === 'spent') {
        const seal=document.createElement('span');seal.className='r79-spent-seal';seal.setAttribute('aria-hidden','true');c.appendChild(seal);
      }
      if (ready) {
        const arrow = document.createElement('span'); arrow.className = 'r78-ready-arrow';
        arrow.setAttribute('aria-hidden','true'); arrow.textContent = '↑'; c.appendChild(arrow);
      }
      c.appendChild(station);
      if (pendingSummonFx.has(card.uid)) {
        c.classList.add("landing");
        pendingSummonFx.delete(card.uid);
      }
      if (side === "player") {
        if (ready) c.classList.add("can-attack");
        if (game.selected === card.uid) c.classList.add("selected");
        if ((game.pendingSpell && game.pendingSpell.need === "friendlyMinion") || (game.pendingBattlecry && game.pendingBattlecry.need === "friendlyMinion")) c.classList.add("targetable");
        if (pendingTargetUid === card.uid) c.classList.add("target-queued");
        const selectAction = (event) => { if (event) event.stopPropagation(); selectMyMinion(card.uid); };
        c.onclick = selectAction;
        bindKeyboardAction(c, cardAriaLabel(card, ready ? "你的場上卡，可按 Enter 或 Space 選為攻擊者" : "你的場上卡，待命或已行動"), selectAction, { pressed: game.selected === card.uid });
      } else {
        const spellTargetable = game.pendingSpell && game.pendingSpell.need === "enemyMinion";
        const attackTargetable = game.selected && isLegalTarget(game.enemy, card);
        if (spellTargetable || attackTargetable) c.classList.add("targetable");
        const lessonTarget = game.tideTrial && game.selected && card.id==='archer' && attackTargetable;
        if (attackTargetable || lessonTarget) {
          const arrow=document.createElement('span');arrow.className='r79-target-arrow';arrow.setAttribute('aria-hidden','true');c.appendChild(arrow);
          if(lessonTarget)c.classList.add('r79-tutorial-target');
        }
        if (pendingTargetUid === card.uid) c.classList.add("target-queued");
        if (game.selected && enemyHasTaunt && !(card.keywords || []).includes("taunt")) c.classList.add("blocked");
        const targetAction = (event) => { if (event) event.stopPropagation(); clickEnemyMinion(card.uid); };
        c.onclick = targetAction;
        bindKeyboardAction(c, cardAriaLabel(card, spellTargetable || attackTargetable ? "敵方場上卡，可按 Enter 或 Space 指定" : "敵方場上卡"), targetAction);
      }
      appendTargetActions(c, card.uid);
      frag.appendChild(c);
    });
    el.replaceChildren(frag);
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

    const variant=r80Variant(card);el.dataset.artVariant=String(variant);
    const variantFull=variant===1?({footman:'../../assets/art/r80/footman-band.webp',archer:'../../assets/art/r80/archer-hood.webp'})[card.id]:null;
    const variantLow=variant===1?({footman:'../../assets/art/r80/footman-band-low.webp',archer:'../../assets/art/r80/archer-hood-low.webp'})[card.id]:null;
    const artSource = variantFull || ({ footman:'../../assets/art/r75/footman.webp?v=c1f52344', archer:'../../assets/art/r75/archer.webp?v=66fff3e9', emberpup:'../../assets/art/r76/emberpup.webp?v=d5ccf1ed', wolf:'../../assets/art/r76/wolf.webp?v=b3a469e2', sparkSquire:'../../assets/art/r76/sparkSquire.webp?v=670a755a', alleySkirmisher:'../../assets/art/r76/alleySkirmisher.webp?v=eb357347', frontScout:'../../assets/art/r76/frontScout.webp?v=34058513', firebolt:'../../assets/art/r76/firebolt.webp?v=6583d849' })[card.id] || card.image;
    const artLowSource = variantLow || ({ emberpup:'../../assets/art/r76/emberpup-low.webp?v=f6527647', wolf:'../../assets/art/r76/wolf-low.webp?v=c333e737', sparkSquire:'../../assets/art/r76/sparkSquire-low.webp?v=ffb146b0', alleySkirmisher:'../../assets/art/r76/alleySkirmisher-low.webp?v=dade5b6b', frontScout:'../../assets/art/r76/frontScout-low.webp?v=6f407c18', firebolt:'../../assets/art/r76/firebolt-low.webp?v=8f558c82', footman:'../../assets/art/r76/footman-low.webp?v=aedc66c0', archer:'../../assets/art/r76/archer-low.webp?v=b78bf635' })[card.id];
    const art = artSource
      ? `<img src="${artLowSource || artSource}" ${artLowSource ? `srcset="${artLowSource} 1x, ${artSource} 2x"` : ""} alt="${card.name}" onerror="this.replaceWith(document.createTextNode('${card.emoji}'))">`
      : `<span class="art-glyph" aria-hidden="true">${card.emoji}</span>`;
    const factionInfo = FACTIONS[card.faction] || FACTIONS.neutral;
    const factionEmblem = factionInfo && factionInfo.emblem
      ? `<img class="faction-emblem" src="${factionInfo.emblem}" alt="" aria-hidden="true" onerror="this.remove()">`
      : "";

    // 技能徽章
    const kwBadges = (card.keywords || []).map((k) => {
      const kw = (typeof KEYWORDS !== "undefined") ? KEYWORDS[k] : null;
      return kw ? `<span class="kw" title="${kw.label}：${kw.desc}">${kw.icon}</span>` : "";
    }).join("");

    const stars = "★".repeat(r.stars);

    el.innerHTML = `
      <img class="r75-card-frame" src="../../assets/art/r79/frame-low.webp" srcset="../../assets/art/r79/frame-low.webp 1x, ../../assets/art/r79/frame.webp?v=r79-frame 2x" alt="" aria-hidden="true">
      <div class="summon-impact"></div>
      <div class="frame-sheen" aria-hidden="true"></div>
      <div class="cost">${card.cost}</div>
      ${card.shield ? '<div class="shield-ring"></div><img class="r8-shield-icon" src="../../assets/art/content-r8/divine-shield.webp" alt="聖盾擋一次">' : ""}
      ${(card.keywords || []).includes("taunt") ? '<div class="taunt-crest" title="嘲諷：必須先攻擊這張卡"><img src="../../assets/art/content-r8/taunt-wall.webp" alt="嘲諷石牆"></div>' : ""}
      <div class="stars">${stars}</div>
      <div class="art${card.image ? "" : " art-fallback"}"${card.image ? "" : ` aria-label="${card.name}・${FACTIONS[card.faction]?.name || "中立"}佔位圖"`}>${art}${factionEmblem}</div>
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
      const variantFull=r80Variant(card)===1?({footman:'../../assets/art/r80/footman-band.webp',archer:'../../assets/art/r80/archer-hood.webp'})[card.id]:null;
      img.src = variantFull || ({ footman:'../../assets/art/r75/footman.webp?v=c1f52344', archer:'../../assets/art/r75/archer.webp?v=66fff3e9', emberpup:'../../assets/art/r76/emberpup.webp?v=d5ccf1ed', wolf:'../../assets/art/r76/wolf.webp?v=b3a469e2', sparkSquire:'../../assets/art/r76/sparkSquire.webp?v=670a755a', alleySkirmisher:'../../assets/art/r76/alleySkirmisher.webp?v=eb357347', frontScout:'../../assets/art/r76/frontScout.webp?v=34058513', firebolt:'../../assets/art/r76/firebolt.webp?v=6583d849' })[card.id] || card.image;
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
    CardContentR12.record(game,result);
    const tidalImpact = result.events.some(e=>e.type==='tidebreak'||e.type==='tideEbb');
    for(const key of ['player','enemy']) {
      const gains=result.events.filter(e=>e.type==='tideGain'&&e.side===key&&e.reason==='fallen');
      if(gains.length)game[key]._r79TideSource={amount:gains.reduce((n,e)=>n+e.amount,0),turn:game.turnCount};
    }
    for (const event of result.events) {
      if(event.type==='attackSpent') { const unit=findBattleMinion(event.uid);if(unit)unit._r77SpentTurn=game.turnCount; }
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
        const broken=findBattleMinion(event.uid);if(broken&&game.content?.id==='moen')broken._r3ShieldBroken=true;
        if(broken&&game.content?.id==='moen'&&game.enemy.field.some(c=>c.uid===event.uid))set('contentBarGoal',`聖盾抵擋命中；敵騎士仍 ${broken.health} 血。`);
        CardContentR6.shieldBreak(game,event.uid);
        flashCard(event.uid, "shield-break");
        flashKeyword2(event.uid, "聖盾破裂");
      } else if (event.type === "damage") {
        flashCard(event.uid, "damaged");
        if (!tidalImpact) floatDamage(event.uid, event.amount);
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
        flashKeyword2(event.uid, `+${event.attack}/+${event.health}`);
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
      } else if (event.type === "shieldwall") {
        flashKeyword2(event.sourceUid, "列盾 -1");
      } else if (event.type === "resonance") {
        flashKeyword2(event.sourceUid, "殘響");
      } else if (event.type === "bloodtrail") {
        flashKeyword2(event.sourceUid, "血跡");
      } else if (event.type === "bloodtrailBuff") {
        flashKeyword2(event.uid, "+1 攻");
      } else if (event.type === "chillbind") {
        flashKeyword2(event.targetUid, "寒噤");
      } else if (event.type === "sunder") {
        flashKeyword2(event.sourceUid, "裂甲");
      } else if (event.type === "attune") {
        flashKeyword2(event.uid, `調印 +${event.amount}/+${event.amount}`);
      } else if (event.type === "spellCast") {
        playSound("play");
        triggerSpellFlash(event.side);
        const sideObj = event.side === "enemy" ? game.enemy : game.player;
        const sp = spellDamage(event.effect) ? Core.spellPower(sideObj) : 0;
        if (sp > 0) log(`法強 +${sp} 強化了${event.side === "enemy" ? "對手" : "你的"}法術。`, event.side === "enemy" ? "ai" : "me");
      } else if (event.type === "tideGain") {
        pulseTide(event.side);
      } else if (event.type === "tideFull") {
        if (event.side === "player" && game && !game.tideFullAnnounced) {
          game.tideFullAnnounced = true;
          if (!game.tideTrial&&!game.content) showToast("潮能滿了，按裂潮掀起浪潮。");
        } else if (event.side === "enemy") {
          flashKeyword("enemyHero", "滿潮！");
        }
      } else if (event.type === "heroDamage") {
        if (!tidalImpact) floatDamage(event.defenderSide === "enemy" ? "enemyHero" : "playerHero", event.amount);
        playSound("hurt");
        if ((event.amount || 0) >= 4) screenShake();
        if(event.defenderSide==='enemy')CardContentR10.react(game,game.enemy.hp<=0);
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
    ghost.classList.remove("spawn", "selected", "targetable", "can-attack", "blocked", "guide-focus", "target-queued");
    ghost.querySelectorAll('.cardtext,.card-info-btn,.target-action-popover,.r77-card-state,.r78-ready-arrow').forEach(el=>el.remove());
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

  // 攻擊者朝目標衝刺；規則結算只能由 active impact callback 觸發。
  function animateAttackToward(attackerUid, targetUidOrId, onImpact) {
    let impacted = false;
    const resolveImpact = () => {
      if (impacted) return undefined;
      impacted = true;
      return typeof onImpact === "function" ? onImpact() : undefined;
    };
    const a = elFor(attackerUid), t = elFor(targetUidOrId);
    const poseAsset = a && window.CardPosePlayer?.get(a.dataset.cardId);
    const poseArt = a?.querySelector('.art > img:not(.faction-emblem)');
    // Content encounters use timed card-exchange feedback until minion pose assets exist.
    // Never move a flat character/card to claim a character attack animation.
    if(game.content && !(poseArt && window.CardPosePlayer?.plan(poseAsset,'attack').status==='PREPARED')){
      return new Promise((resolve,reject)=>{
        a?.classList.add('r6-contact-ready');
        setTimeout(()=>{try{const result=resolveImpact();a?.classList.remove('r6-contact-ready');t?.classList.add('r6-contact-impact');setTimeout(()=>{t?.classList.remove('r6-contact-impact');resolve(result);},350);}catch(e){reject(e);}},150);
      });
    }
    if (game.content && poseArt && window.CardPosePlayer?.plan(poseAsset, 'attack').status === 'PREPARED') {
      const originalSrc = poseArt.getAttribute('src');
      const cleanPose=CardContentR11.poseLayer(a,poseArt);
      const originalSrcset=poseArt.getAttribute('srcset');poseArt.removeAttribute('srcset');
      let result;
      return CardPosePlayer.play(poseAsset, 'attack', src => { poseArt.src = src;a.dataset.posePhase=src.split('-').at(-1).split('.')[0]; }, () => {
        result = resolveImpact();
        const unit=findBattleMinion(targetUidOrId),art=t?.querySelector('.art>img'),asset=t&&CardPosePlayer.get(t.dataset.cardId);
        if(unit&&art&&CardPosePlayer.plan(asset,'hurt').status==='PREPARED'){
          const old=art.src,set=art.getAttribute('srcset');art.removeAttribute('srcset');
          const cleanHurt=CardContentR11.poseLayer(t,art);
          CardPosePlayer.play(asset,'hurt',src=>art.src=t.dataset.shellState==='breaking'&&unit.id==='knight'?'../../assets/animations/content-r10/knight-break.webp':src).then(()=>{art.src=old;if(set)art.setAttribute('srcset',set);cleanHurt();});
        }
      }).then(() => { poseArt.setAttribute('src', originalSrc);if(originalSrcset)poseArt.setAttribute('srcset',originalSrcset);cleanPose();delete a.dataset.posePhase;return result; });
    }
    if (prefersReducedMotion()) return Promise.resolve(resolveImpact());
    if (!a) return Promise.resolve(resolveImpact());
    return new Promise((resolve, reject) => {
      const finishImpact = () => {
        try { resolve(resolveImpact()); }
        catch (err) { reject(err); }
      };
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
        finishImpact();
        setTimeout(() => {
          hitEl.classList.remove("hit-shake", "hit-flash");
          if (liveTarget) liveTarget.classList.remove("hit-shake", "hit-flash");
        }, hitMs);
        removeGhost(targetGhost, hitMs + 60);
      }, hitDelay);
    } else {
      const attackMs = isLowPerf() ? 160 : 300;
      const hitDelay = isLowPerf() ? 80 : 130;
      const attackGhost = cloneCardGhost(a, "attacking");
      removeGhost(attackGhost, attackMs + 40);
      a.classList.add("attacking"); setTimeout(() => a.classList.remove("attacking"), attackMs);
      setTimeout(finishImpact, hitDelay);
    }
    });
  }

  // 傷害數字分級（CP1-12）：≤2 小白、3~5 中金、≥6 大紅金
  function floatDamage(uidOrId, amount) {
    if (prefersReducedMotion()) return;
    const el = elFor(uidOrId); if (!el) return;
    if (isLowPerf() && amount <= 2) return;
    const anchor = uidOrId==='enemyHero' ? document.getElementById('enemyHp') : uidOrId==='playerHero' ? document.getElementById('playerHp') : el;
    const r = anchor.getBoundingClientRect();
    const d = document.createElement("div");
    const tier = amount >= 6 ? "dmg-big" : amount >= 3 ? "dmg-mid" : "dmg-sm";
    d.className = "dmg-float r79-target-damage " + tier; d.textContent = "-" + amount;
    d.style.left = (r.left + r.width / 2) + "px";
    d.style.top = (r.top + r.height / 2) + "px";
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 300);
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
    if(game.content?.id==='moen'&&(label==='滿潮！'||label.includes('生命')))return;
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
    const asset=CardPosePlayer.get(el.dataset.cardId);
    if(game.content&&CardPosePlayer.plan(asset,'death').status==='PREPARED'){
      const ghost=cloneCardGhost(el,'r9-dying'),art=ghost?.querySelector('.art>img');
      if(art){CardContentR11.poseLayer(ghost,art);art.removeAttribute('srcset');CardPosePlayer.play(asset,'death',src=>art.src=src).then(()=>ghost.remove());}
      return;
    }
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
    playSound(win ? "win" : "lose");
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
  function saveStats(s) { return writeStorage("card_stats_v1", JSON.stringify(Core.migrateStats(s)), "戰績儲存"); }

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
    if (!card || !card.id || game?.content) return;
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
    writeStorage(QUEST_KEY, JSON.stringify(Core.migrateQuests(questState, todaySeed())), "任務儲存");
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
    writeStorage(GOAL_KEY, JSON.stringify(Core.migrateGoals(goalState, seed || weekSeed())), "目標儲存");
  }

  function loadChronicle() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(CHRONICLE_KEY)); } catch {}
    return Core.migrateChronicle(raw);
  }

  function saveChronicle(chronicleState) {
    writeStorage(CHRONICLE_KEY, JSON.stringify(Core.migrateChronicle(chronicleState)), "編年史儲存");
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
        <h3 style="color:${faction.color || "#facc15"}">${faction.emblem ? `<img src="${faction.emblem}" alt="" aria-hidden="true">` : (faction.emoji || "")}<span>${faction.name}</span></h3>
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
    if (document.getElementById("missionDrawer")?.classList.contains("show")) renderMissionDrawer();
    else updateMissionBadge();
    return next;
  }

  function trackQuestFromCoreEvent(event) {
    if (!event || game?.tideTrial || game?.content) return;
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
    const nextKey = `${state.dateSeed}|${state.quests.map((quest) => `${quest.id}:${quest.progress}/${quest.target}:${quest.claimed ? 1 : 0}`).join(";")}`;
    const changed = nextKey !== questRenderKey;
    if (changed) {
      questRenderKey = nextKey;
      if (label) label.textContent = state.dateSeed;
      const frag = document.createDocumentFragment();
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
        frag.appendChild(row);
      });
      list.replaceChildren(frag);
      updateQuestCtas(state);
    }
    if (document.getElementById("missionDrawer")?.classList.contains("show")) renderMissionDrawer();
    else if (changed) updateMissionBadge();
  }

  function showOverlay(title, win) {
    const ov = document.getElementById("overlay");
    document.getElementById('r75VictoryHero').src = '../../assets/art/r80/victory-navigator.webp';
    if (game.tideTrial) {
      if (win) writeStorage(CardTideSession.DONE, '1', '試航紀錄儲存');
      document.getElementById('tideTrialBar').hidden = true;
      document.getElementById('overlayTitle').textContent = win ? '潮汐試航完成' : '再試一次';
      document.getElementById('overlayEpilogue').hidden = false;
      document.getElementById('overlayEpilogue').textContent = win ? '滿潮施放，浪峰命中敵陣。這次的航程由你掌舵。' : '讓兩位見習士兵各交換一次，滿潮再施放漲潮。';
      document.getElementById('resultStats').textContent = '固定戰術短局 · 不計戰績、不發金幣。下一步可進入五站航程，或返回港口。';
      document.querySelector('#overlay .overlay-actions:not(#trialResultActions)').hidden = true;
      document.getElementById('trialResultActions').hidden = false;
      document.getElementById('resultStars').textContent = '';
      ov.classList.toggle('win', win); ov.classList.toggle('lose', !win); ov.classList.add('show');
      return;
    }
    document.getElementById("overlayTitle").textContent = title;
    // R68：對手化結語（勝=玩家贏→對手 win 句）
    const epi = document.getElementById("overlayEpilogue");
    if (epi) {
      const op = OPPONENT_LINES[game && game.opponentId] || null;
      epi.textContent = op ? (win ? op.win : op.lose) : "";
      epi.hidden = !op;
    }
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
    writeStorage("card_win_streak_v1", JSON.stringify({ current: s.streak || 0, best: s.bestStreak || 0 }), "連勝紀錄儲存");
    const ddaInfo = Core.ddaProfile(s.dda);
    if (win) {
      progressQuest({ type: "win", amount: 1 });
      progressWeeklyGoal({ type: "win", amount: 1 });
      if (game.playerDeckSource === "saved") progressQuest({ type: "deckWin", amount: 1 });
    }
    const lossEncourage = !win && s.lossStreak >= 2
      ? `<div class="hint">連敗 ${s.lossStreak} 場：已給敗場金幣，動態調節會依設定小幅放慢對手。</div>`
      : "";
    // 顯示戰績（R69 CT-1：三層資訊層次——本場戰報 chips → 獎勵主視覺 → 次要 meta 縮階）
    const stats = document.getElementById("resultStats");
    if (stats) {
      const turnCount = game && game.turnCount ? game.turnCount : 1;
      const playerHpLeft = game && game.player ? Math.max(0, game.player.hp) : 0;
      stats.innerHTML = `
        <div class="result-report" role="group" aria-label="本場戰報">
          <span class="report-chip">⏱ ${turnCount} 回合</span>
          <span class="report-chip">❤️ 我方剩餘 ${playerHpLeft}</span>
          <span class="report-chip">🎯 ${reward.label}</span>
        </div>
        <div class="streak">${win && s.streak >= 2 ? `🔥 ${s.streak} 連勝！` : ""}</div>
        <div class="coin">${rewardLine}</div>
        <div class="result-meta">
          <div>戰績：${s.wins} 勝 ${s.losses} 敗 · 最高連勝 ${s.bestStreak}</div>
          <div>難度獎勵：${reward.label}${win ? "勝場" : "敗場"} +${reward.amount} 金幣</div>
          <div>動態調節：${ddaInfo.enabled ? ddaInfo.label : "關閉"}（依近期勝敗調整 AI）</div>
        </div>
        ${lossEncourage}
        <div class="hint">💡 用金幣去「開卡包」抽更強的卡，組成你的牌組！</div>`;
    }
    renderResultStars(settleStars(win));
    CardMobile.cancel(false);
    CardMobile.result(win);
    updateQuestCtas();
    refreshChronicle();
    updateChronicleBadge();
    if (win) { burstStars(); burstConfetti(); }
    const gRef = game;
    setTimeout(() => { if (game === gRef) ov.classList.add("show"); }, win ? 500 : 100);
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

  // ===================== R72 招牌玩法「裂潮」＋開場／回合／星級 =====================
  // R72 P6 背景音樂：可替換的循環曲（本機 AI 派工器 music 產出，見 CREDITS）。檔案缺件時靜默略過。
  // 缺件（R72）：本機 AI 派工器 music 兩次因 GPU 佇列逾時未產出；放入 assets/audio/battle-tide-loop.mp3
  // 後把下行改成該路徑即可啟用（音量跟 SFX 音量連動、靜音同步、只在對戰分頁前景播放）。
  var BGM_URL = null;
  var bgm = null;
  var bgmMissing = !BGM_URL;
  var bgmFrameVisible = true;
  function syncBgm() {
    const want = audioUnlocked && !audioMuted() && audioVolume() > 0 && !document.hidden && bgmFrameVisible;
    if (!want) { if (bgm && !bgm.paused) bgm.pause(); return false; }
    if (bgmMissing || !BGM_URL) return false;
    if (!bgm) {
      bgm = new Audio(BGM_URL);
      bgm.loop = true;
      bgm.preload = "auto";
      bgm.addEventListener("error", () => { bgmMissing = true; });
    }
    bgm.volume = Math.max(0, Math.min(1, audioVolume() * 0.3));
    const played = bgm.play();
    if (played && played.catch) played.catch(() => {});
    return true;
  }
  document.addEventListener("visibilitychange", () => syncBgm());
  window.addEventListener("message", (e) => {
    if (e.data && e.data.type === "frameVisibility") { bgmFrameVisible = !!e.data.visible; syncBgm(); }
  });
  const STARS_KEY = "card_star_challenges_v1";
  const TIDE_MAX = Core.TIDE_MAX || 6;
  const OPPONENT_PORTRAITS = Object.freeze({
    op_rune: { url: "../../assets/cards/heroRuneFrostfang.png", pos: "50% 20%", zoom: "240%" },
    op_isold: { url: "../../assets/cards/heroIsoldLongdusk.png", pos: "50% 20%", zoom: "240%" },
    op_moen: { url: "../../assets/art/content-r12/moen-portrait.webp", zoom: "cover", pos: "center" },
    op_ser_halden: { url: "../../assets/cards/heroSerHalden.png", pos: "46% 14%", zoom: "260%" },
    op_magister_vey: { url: "../../assets/cards/heroMagisterVey.png", pos: "40% 17%", zoom: "260%" },
    op_scarra: { url: "../../assets/cards/heroScarra.png", pos: "55% 37%", zoom: "230%" },
  });
  const STAR_LABELS = Object.freeze(["獲勝", "生命過半", "用過裂潮爆發"]);
  let vsIntroTimer = 0;
  let turnBannerTimer = 0;

  function opponentTideStyle(opponentId) {
    if(opponentId==='op_moen')return{label:'退潮守約',desc:'手工腳本：先滿潮護住騎士、留守一回合，再出擊'};
    const rates = (Core.OPPONENT_TIDE_RATES || {})[opponentId] || CardVoyage.OPPONENTS[opponentId]?.tideRates;
    return rates || { label: "潮汐", desc: "每回合 +1、隨從陣亡 +1" };
  }

  function applyOpponentPortrait(opponent) {
    const portrait = OPPONENT_PORTRAITS[opponent && opponent.id];
    const root = document.body;
    const avatar = document.querySelector("#enemyHero .avatar");
    if (!portrait) {
      root.style.removeProperty("--opponent-portrait");
      if (avatar) avatar.classList.remove("has-portrait");
      return;
    }
    root.style.setProperty("--opponent-portrait", `url("${portrait.url}")`);
    if (avatar) {
      avatar.classList.add("has-portrait");
      avatar.style.backgroundSize = `${portrait.zoom}, auto`;
      avatar.style.backgroundPosition = `${portrait.pos}, center`;
    }
  }

  function introAllowed() {
    // 自動化（webdriver）預設略過開場，避免遮擋既有 E2E；?intro=1 可強制播放供截圖與測試。
    const forced = new URLSearchParams(location.search).get("intro");
    if (forced === "1") return true;
    if (forced === "0") return false;
    return !navigator.webdriver;
  }

  function hideVsIntro() {
    const el = document.getElementById("vsIntro");
    clearTimeout(vsIntroTimer);
    if (!el || !el.classList.contains("show")) return;
    el.classList.add("hide");
    el.setAttribute("aria-hidden", "true");
    setTimeout(() => { el.classList.remove("show", "hide"); }, 300);
    showTurnBanner("player");
  }

  function showVsIntro(opponent) {
    const el = document.getElementById("vsIntro");
    if (!el || !introAllowed()) { showTurnBanner("player"); return false; }
    const lines = OPPONENT_LINES[opponent.id] || {};
    const scene = R67_BATTLEFIELDS[battlefieldCursor];
    const fieldName = scene && BATTLEFIELD_NAMES[scene.id];
    const tide = opponentTideStyle(opponent.id);
    const set = (id, text) => { const node = document.getElementById(id); if (node) node.textContent = text || ""; };
    set("vsKicker", `裂潮之戰 · ${DIFFICULTY[game.difficulty] ? DIFFICULTY[game.difficulty].label : ""}`);
    set("vsName", opponent.name);
    set("vsLine", lines.intro ? `「${lines.intro}」` : "");
    set("vsField", fieldName ? `戰場：${fieldName}` : "");
    set("vsTide", `對手潮汐：${tide.label}（${tide.desc}）`);
    el.classList.remove("hide");
    el.classList.add("show");
    el.setAttribute("aria-hidden", "false");
    el.onclick = hideVsIntro;
    clearTimeout(vsIntroTimer);
    vsIntroTimer = setTimeout(hideVsIntro, prefersReducedMotion() ? 1200 : 1900);
    return true;
  }

  function showTurnBanner(side) {
    const el = document.getElementById("turnBanner");
    const text = document.getElementById("turnBannerText");
    if (!el || !text || !game || game.over) return;
    text.textContent = side === "enemy" ? `${game.opponentName || "對手"}的回合` : "你的回合";
    el.classList.toggle("enemy", side === "enemy");
    el.classList.remove("show");
    void el.offsetWidth;
    const source=document.querySelector('.r75-tide-channel').getBoundingClientRect();
    el.style.top=`${source.top+source.height/2}px`;
    el.classList.add("show");
    clearTimeout(turnBannerTimer);
    turnBannerTimer = setTimeout(() => el.classList.remove("show"), 1200);
  }

  function renderTide() {
    if (!game) return;
    const playerTide = Core.tideOf(game.player);
    const enemyTide = Core.tideOf(game.enemy);
    if (playerTide>=4 || enemyTide>=4) preloadTidalArt().catch(()=>{});
    document.body.dataset.tideTrial = String(!!game.tideTrial);
    const wasReady = document.body.dataset.tideReady === "true";
    document.body.dataset.tideReady = String(playerTide >= TIDE_MAX);
    if (playerTide >= TIDE_MAX && !wasReady) document.getElementById("tidebreakBtn")?.classList.add("r78-first-full");
    if (playerTide < TIDE_MAX) document.getElementById("tidebreakBtn")?.classList.remove("r78-first-full");
    document.body.style.setProperty('--r75-tide', String(playerTide));
    let heroTide = document.querySelector('.r78-hero-tide');
    if (!heroTide) { heroTide = document.createElement('span'); heroTide.className = 'r78-hero-tide';document.querySelector('.player-hero-scene').appendChild(heroTide); }
    heroTide.textContent = `潮 ${playerTide}/6`;
    document.querySelectorAll('#r75BoardPips i,#r75ChartPips i').forEach((el, i) => el.classList.toggle('filled', i % 6 < playerTide));
    document.querySelector('.r75-tide-channel')?.setAttribute('aria-label', `潮位 ${playerTide}/6`);
    const chartPips = document.getElementById('r75ChartPips');
    if (chartPips) { chartPips.removeAttribute('aria-hidden'); chartPips.setAttribute('role','img'); chartPips.setAttribute('aria-label', `我方潮能 ${playerTide}/6`); }
    const btn = document.getElementById("tidebreakBtn");
    if (btn) {
      const ready = Core.canTidebreak(game, "player") && !combatInFlight;
      btn.disabled = game.over || combatInFlight || game.turn !== 'player';
      btn.setAttribute('aria-disabled',String(btn.disabled));
      btn.classList.toggle("ready", ready);
      const ring = btn.querySelector(".tide-ring");
      if (ring) ring.style.setProperty("--tide-pct", String(playerTide / TIDE_MAX));
      const glyph = btn.querySelector(".tide-glyph");
      if (glyph) glyph.textContent = playerTide >= TIDE_MAX ? "潮" : String(playerTide);
      const count = document.getElementById("playerTideCount");
      if (count) count.textContent = playerTide >= TIDE_MAX ? (tideMode === 'ebb' ? '護航！' : '爆發！') : `${playerTide}/${TIDE_MAX}`;
      btn.setAttribute("aria-label", ready
        ? `裂潮爆發：潮能已滿，對所有敵方隨從造成 ${Core.TIDEBREAK_MINION_DAMAGE} 點、敵方英雄 ${Core.TIDEBREAK_HERO_DAMAGE} 點`
        : `裂潮爆發：潮能 ${playerTide}/${TIDE_MAX}`);
      btn.title = ready ? "潮能已滿：點擊施放裂潮爆發" : `潮能 ${playerTide}/${TIDE_MAX}：每回合 +1、己方隨從陣亡 +1`;
      if (tideMode === 'ebb') btn.setAttribute('aria-label', `退潮護航：潮能 ${playerTide}/6，友軍聖盾、英雄回復 3 點`);
    }
    const meter = document.getElementById("enemyTide");
    if (meter) {
      meter.classList.toggle("ready", enemyTide >= TIDE_MAX);
      const ring = meter.querySelector(".tide-ring");
      if (ring) ring.style.setProperty("--tide-pct", String(enemyTide / TIDE_MAX));
      const glyph = meter.querySelector(".tide-glyph");
      if (glyph) glyph.textContent = enemyTide >= TIDE_MAX ? "潮" : String(enemyTide);
      const count = document.getElementById("enemyTideCount");
      if (count) count.textContent = `${enemyTide}/${TIDE_MAX}`;
      const style = opponentTideStyle(game.opponentId);
      const styleEl = document.getElementById("enemyTideStyle");
      if (styleEl) styleEl.textContent = style.label;
      meter.setAttribute("aria-label", `對手潮能 ${enemyTide}/${TIDE_MAX}（${style.label}：${style.desc}）`);
      meter.title = `${style.label}：${style.desc}`;
      let source=meter.querySelector('.r79-tide-source');
      if(!source){source=document.createElement('span');source.className='r79-tide-source';source.setAttribute('aria-live','polite');meter.appendChild(source);}
      const gain=game.enemy._r79TideSource;
      source.textContent=gain&&gain.turn>=game.turnCount-1?`陣亡蓄潮 +${gain.amount}`:'';
    }
  }

  function pulseTide(side) {
    const el = side === "enemy" ? document.getElementById("enemyTide") : document.getElementById("tidebreakBtn");
    if (!el || prefersReducedMotion()) return;
    el.classList.remove("charging");
    void el.offsetWidth;
    el.classList.add("charging");
    setTimeout(() => el.classList.remove("charging"), 520);
  }

  new ResizeObserver(entries => {
    for (const entry of entries) if (entry.contentRect.height > 0) {
      const sheet = entry.target.getBoundingClientRect(), hero = document.querySelector('.player-hero-row');
      document.body.style.setProperty('--r10-chart-reserve',`${innerHeight-sheet.top+8}px`);
      const matrix = getComputedStyle(hero).transform;
      const shift = matrix === 'none' ? 0 : new DOMMatrix(matrix).m42;
      const rect = hero.getBoundingClientRect();
      document.body.style.setProperty('--r78-hero-shift', `${Math.min(0,sheet.top-10-rect.height-(rect.top-shift))}px`);
    }
  }).observe(document.querySelector("#tideChartPanel .tide-chart-sheet"));
  const resultShellObserver = new MutationObserver(() => {
    if (parent !== window) parent.postMessage({type:"battleFullBleed",active:!!(game?.content||game?.forecast) || !document.getElementById('contentPanel').hidden || (document.getElementById("overlay").classList.contains("show") && document.body.dataset.r76Wave !== 'true')},location.origin);
  });
  resultShellObserver.observe(document.getElementById("overlay"),{attributes:true,attributeFilter:["class"]});
  resultShellObserver.observe(document.body,{attributes:true,attributeFilter:["data-r76-wave"]});
  let tidalArtReady;
  function preloadTidalArt() {
    if (!tidalArtReady) tidalArtReady=Promise.all([
      '../../assets/art/r80/wave.webp',
      '../../assets/art/r79/foam.webp?v=r79-foam',
      '../../assets/art/r77/puddle.webp?v=03e81419',
    ].map(src=>{const i=new Image();i.src=src;return i.decode();})).catch(error=>{tidalArtReady=null;throw error;});
    return tidalArtReady;
  }
  function playTidalWave(side, targetUids) {
    const waveGame = game;
    const wave = document.getElementById("tideWave");
    (targetUids || []).forEach((uid, index) => {
      const card = elFor(uid);
      if (!card) return;
      setTimeout(() => { if(game!==waveGame)return;card.classList.add("tide-hit"); setTimeout(() => card.classList.remove("tide-hit"), 520); }, 360);
    });
    if (audioUnlocked && !audioMuted()) {
      playTone(110, .5, "sawtooth", .03, 0, 340);
      playTone(220, .45, "triangle", .03, .08, 660);
      playTone(880, .35, "sine", .022, .22, 1320);
    }
    if (!wave) return;
    wave.replaceChildren();
    const img = document.createElement('img'); img.className = 'r76-wave-art'; img.src = '../../assets/art/r80/wave.webp'; img.alt = ''; wave.appendChild(img);
    const field = document.getElementById(side === 'enemy' ? 'playerField' : 'enemyField');
    const board = document.querySelector('.board');
    const rect = field.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    board.style.setProperty('--r77-wet-y', `${rect.top-boardRect.top+rect.height*.55}px`);
    board.style.setProperty('--r77-wet-h', `${Math.max(80,rect.height*.8)}px`);
    wave.style.setProperty('--impact-y', `${rect.top + rect.height * .5}px`);
    wave.style.setProperty('--wave-height', `${Math.max(180, rect.height * 1.8)}px`);
    const waveHeight=Math.max(180,rect.height*1.8);
    const origin=document.getElementById(side==='enemy'?'enemyField':'r75BoardPips').getBoundingClientRect();
    const caster=document.getElementById(side==='enemy'?'enemyField':'playerField').getBoundingClientRect();
    const horizontal=Math.abs(caster.left+caster.width*.5-rect.left-rect.width*.5)>Math.abs(caster.top+caster.height*.5-rect.top-rect.height*.5);
    wave.dataset.axis=horizontal?'x':'y';
    wave.style.setProperty('--r79-travel-x',horizontal?`${origin.left+origin.width*.5-rect.left-rect.width*.5}px`:'0px');
    wave.style.setProperty('--r79-wave-top',`${rect.top+rect.height*.5-waveHeight*.27}px`);
    wave.style.setProperty('--r79-travel',horizontal?'0px':`${(origin.top+origin.height*.5)-(rect.top+rect.height*.5)}px`);
    // A source-anchored path remains visible while the crest advances; allies are below its clip.
    const source=document.querySelector('.r75-tide-channel').getBoundingClientRect();
    const height=Math.max(140,rect.height*1.35);
    wave.style.setProperty('--wave-height',`${height}px`);
    wave.style.setProperty('--r79-wave-top',`${rect.top+rect.height*.5-height*.5}px`);
    wave.style.setProperty('--r79-travel',horizontal?'0px':`${origin.top+origin.height*.5-(rect.top+rect.height*.5)}px`);
    wave.style.setProperty('--r80-clip-bottom',side==='player'&&!horizontal?`${Math.max(0,innerHeight-source.bottom-2)}px`:'0px');
    wave.style.setProperty('--r80-clip-left',horizontal&&side==='player'?`${caster.right+2}px`:'0px');
    wave.style.setProperty('--r80-clip-top',horizontal?`${Math.max(0,rect.top-4)}px`:'0px');
    if(horizontal)wave.style.setProperty('--r80-clip-bottom',`${Math.max(0,innerHeight-Math.max(rect.bottom+24,source.bottom+2))}px`);
    wave.dataset.source='waterline';wave.dataset.caster=side;
    const trail=document.createElement('div');trail.className='r80-current-path';
    if(!horizontal)Object.assign(trail.style,{left:`${origin.left+origin.width*.5-24}px`,top:`${rect.bottom-8}px`,width:'48px',height:`${Math.max(20,source.top-rect.bottom+16)}px`});
    else Object.assign(trail.style,{left:`${origin.left}px`,top:`${rect.top+rect.height*.5-18}px`,width:`${Math.max(24,rect.left-origin.left)}px`,height:'36px'});
    wave.appendChild(trail);
    // Real painted foam is placed over each target, including lethal targets that leave at impact.
    for (const uid of targetUids || []) {
      const target = elFor(uid); if (!target) continue;
      const r = target.getBoundingClientRect(), foam = document.createElement('img');
      foam.className = 'r77-impact-foam'; foam.src = '../../assets/art/r79/foam.webp?v=r79-foam'; foam.alt = '';
      Object.assign(foam.style, {left:`${r.left-12}px`,top:`${r.top+r.height*.4}px`,width:`${r.width+24}px`,height:`${r.height*.65}px`});
      if(game.content||game.forecast)Object.assign(foam.style,{top:`${r.top+r.height*.35}px`,height:`${r.height*.22}px`});
      wave.appendChild(foam);
    }
    board.classList.remove('r76-wet');
    setTimeout(() => { if (game===waveGame && document.body.dataset.r76Wave === 'true') { board.classList.add('r76-wet'); board.dataset.wetSide = side; } }, 360);
    document.body.dataset.r76Wave = 'true';document.body.dataset.r80Caster=side;
    wave.classList.remove("run", "enemy");
    void wave.offsetWidth;
    wave.classList.toggle("enemy", side === "enemy");
    wave.classList.add("run");
    screenShake();
  }

  function tidebreakKillCount(sideKey) {
    const foe = sideKey === "enemy" ? game.player : game.enemy;
    return foe.field.filter((m) => !m.shield && m.health <= (Core.TIDEBREAK_MINION_DAMAGE || 1)).length;
  }

  function castTidebreak(sideKey, mode) {
    const key = sideKey === "enemy" ? "enemy" : "player";
    if (!game || game.over) return null;
    if (key === "player") {
      if (game.turn !== "player" || combatInFlight) return null;
      if (!Core.canTidebreak(game, "player")) {
        const tide = Core.tideOf(game.player);
        showToast(game.turn === "player" ? `潮能 ${tide}/${TIDE_MAX}：每回合 +1、己方隨從陣亡 +1，滿了就能掀起裂潮。` : "等你的回合再掀起裂潮。");
        return null;
      }
    }
    const chosen = key === 'player' ? (mode || tideMode || 'flood') : (mode || 'flood');
    if (key==='player' && CardTideContent.direction(game) && chosen!==CardTideContent.direction(game)) { showToast('當回合潮向不符，請先在預報中反轉一次。'); return null; }
    if (combatInFlight || !Core.canTidebreak(game, key)) return null;
    const reference = game;
    const targets = (chosen === 'ebb' ? game[key] : key === 'enemy' ? game.player : game.enemy).field.map(m => m.uid);
    game.selected = null;
    pendingTargetUid = null;
    combatInFlight = true;
    preloadTidalArt().then(()=>{
    if (game!==reference) return;
    document.body.dataset.tidePhase='anticipation';
    playTidalWave(chosen==='ebb' ? (key==='enemy'?'player':'enemy') : key, targets);
    if(key==='enemy'&&chosen==='ebb')CardContentR6.setPose(reference,1,'anticipation');
    renderTide();
    document.getElementById('endTurnBtn').disabled = true;
    // Reserve the action, then mutate rules only when the crest reaches its targets.
    setTimeout(() => {
      if (game !== reference) return;
      document.body.dataset.tidePhase='impact';
      const r9Before=CardContentR9.capture(game);
      const hpBefore=game[key].hp;
      const result = Core.tidebreak(game, { side: key, mode: chosen }, rng);
      if(result.ok&&key==='player'&&chosen==='flood')CardContentR9.record(game,r9Before);
      if(key==='enemy'&&chosen==='ebb'&&result.ok)CardContentR6.heal(game,game[key].hp-hpBefore,hpBefore,game[key].hp);
      if(key==='enemy'&&chosen==='ebb')CardContentR6.setPose(reference,2,'impact');
      if (!result.ok) { combatInFlight = false; render(); return; }
    const side = key === "enemy" ? game.enemy : game.player;
    if (key==='enemy' && chosen==='ebb') { if(game.content)game.content.enemyEbbUsed=true; log('茉恩退潮護航：騎士獲得聖盾，英雄回復 3 點。先剝盾，再安排交換。','ai');
    } else if (key === 'player' && chosen === 'ebb') {
      log('退潮護航：友方隨從獲得聖盾，英雄最多回復 3 點生命。', 'me');
    } else if (key === "player") {
      game.player.tidebreaksUsed = side.tidebreaksUsed;
      log(`🌊 你掀起裂潮爆發！敵方全體隨從受 ${Core.TIDEBREAK_MINION_DAMAGE} 點、敵方英雄受 ${Core.TIDEBREAK_HERO_DAMAGE} 點。`, "me");
    } else {
      log(`🌊 ${game.opponentName || "對手"}掀起${opponentTideStyle(game.opponentId).label}爆發！你的隨從各受 ${Core.TIDEBREAK_MINION_DAMAGE} 點、你受 ${Core.TIDEBREAK_HERO_DAMAGE} 點。`, "ai");
    }
    handleCoreResult(result);
    render();
    }, 360);
    setTimeout(() => {
      if (game !== reference) return;
      // End the visible wave and release its input lock in one synchronous transition.
      delete document.body.dataset.r76Wave;delete document.body.dataset.r80Caster;delete document.body.dataset.tidePhase;
      document.getElementById('tideWave')?.classList.remove('run','enemy');
      combatInFlight = false; render();
      if(key==='enemy'&&chosen==='ebb')CardContentR6.setPose(reference,0,'guarding');
    }, reference.content?.id==='moen'?780:1300);
    }).catch(()=>{if(game===reference){combatInFlight=false;render();showToast('浪潮素材載入失敗，潮能未消耗，請再試一次。');}});
    return { ok: true, pending: true };
  }

  // AI：滿潮時看局面決定是否施放——能清隨從、能斬殺、我方場空、或已經憋了一回合就放。
  function maybeAiTidebreak() {
    if (!game || game.over || !Core.canTidebreak(game, "enemy")) return false;
    const kills = tidebreakKillCount("enemy");
    const lethal = game.player.hp <= (Core.TIDEBREAK_HERO_DAMAGE || 2);
    const held = (game.enemy._tideHeldTurns || 0) >= 1;
    const smart = (game.aiSmart || 0) >= 1;
    const shouldFire = lethal || kills >= (smart ? 1 : 0) || game.player.field.length === 0 || held;
    if (!shouldFire) {
      game.enemy._tideHeldTurns = (game.enemy._tideHeldTurns || 0) + 1;
      logAiThought(`潮能已滿，先按住等更好的時機（可清 ${kills} 隻）。`);
      return false;
    }
    game.enemy._tideHeldTurns = 0;
    logAiThought(lethal ? "裂潮爆發可以直接斬殺。" : kills ? `裂潮爆發能清掉 ${kills} 隻低血隨從。` : "潮能已滿，先放掉免得浪費充能。");
    const result = castTidebreak("enemy");
    return !!(result && result.ok);
  }

  function loadStarRecord() {
    try { return Core.migrateStarRecord(JSON.parse(localStorage.getItem(STARS_KEY) || "null")); } catch { return Core.migrateStarRecord(null); }
  }

  function settleStars(win) {
    if (!game) return null;
    const verdict = Core.computeStars({
      won: win,
      hpLeft: Math.max(0, game.player.hp),
      maxHp: game.player.maxHp,
      tidebreaksUsed: game.player.tidebreaksUsed || 0,
    });
    const merged = Core.mergeBestStars(loadStarRecord(), game.opponentId, game.difficulty, verdict.count);
    writeStorage(STARS_KEY, JSON.stringify(merged.record), "星級紀錄儲存");
    game.starResult = { stars: verdict.stars, count: verdict.count, best: merged.best, improved: merged.improved };
    return game.starResult;
  }

  function renderResultStars(starResult) {
    const box = document.getElementById("resultStars");
    if (!box) return;
    if (!starResult) { box.innerHTML = ""; return; }
    const nextIndex = starResult.stars.findIndex((lit) => !lit);
    const slots = starResult.stars.map((lit, i) => `
      <div class="star-slot${lit ? " lit" : ""}" style="--i:${i}">
        <span class="star" aria-hidden="true">★</span>
        <span class="star-label">${STAR_LABELS[i]}</span>
      </div>`).join("");
    const opponentName = game.opponentName || "對手";
    const bestLine = starResult.improved
      ? `新紀錄！${opponentName}（${DIFFICULTY[game.difficulty].label}）最佳 ${starResult.best}/3 星`
      : `${opponentName}（${DIFFICULTY[game.difficulty].label}）最佳 ${starResult.best}/3 星`;
    const nextLine = nextIndex >= 0 ? `下一顆星：${STAR_LABELS[nextIndex]}` : "三星達成！換個對手或提高難度再挑戰。";
    box.innerHTML = `${slots}<div class="star-best${starResult.improved ? " improved" : ""}">${bestLine} · ${nextLine}</div>`;
    box.setAttribute("aria-label", `本局 ${starResult.count}/3 星。${bestLine}。${nextLine}`);
  }

  // R74 正式短局與檢查點；固定局面提供給所有玩家，不呼叫測試掛鉤。
  function clearSession() {
    try { localStorage.removeItem(CardTideSession.KEY); } catch {}
  }
  function loadSession() {
    try { return CardTideSession.decode(localStorage.getItem(CardTideSession.KEY), CARD_POOL); } catch { return null; }
  }
  function saveSession() {
    if (!sessionReady || !game || game.over || game.turn !== 'player' || combatInFlight || guide.active || game.pendingSpell || game.pendingBattlecry) return;
    writeStorage(CardTideSession.KEY, CardTideSession.encode(game), '對局檢查點儲存');
  }
  function startTideTrial() {
    const previous = sessionReady; sessionReady = false;
    newGame(); stopGuide(false); hideVsIntro(); hideMulliganButton();
    document.getElementById('trialBrief').hidden = true;
    document.getElementById('tideChartPanel').hidden = true;
    game.tideTrial = true; game.difficulty = 'normal'; game.turnCount = 1;
    game.player.hp = game.player.maxHp = 12; game.enemy.hp = game.enemy.maxHp = 2;
    game.player.mana = game.player.manaMax = 4;
    document.querySelector(".board").classList.remove("r76-wet");
    game.player.tide = 4; game.enemy.tide = 0;
    const card = (id, uid) => {
      const c = cloneCard(getCardById(id)); c.uid = uid; c.maxHealth = c.health; c.canAttack = true; return c;
    };
    game.player.field = [card('footman','trial-p1'),card('footman','trial-p2')];
    game.enemy.field = [card('archer','trial-e1'),card('archer','trial-e2')];
    game.player.hand = [card('wolf','trial-hand-wolf'),card('sparkSquire','trial-hand-squire'),card('emberpup','trial-hand-pup')];
    game.enemy.hand = [];
    game.player.deck = Core.buildBattleDeck(CardVoyage.DECKS[0].cards, CARD_POOL, rng);
    game.enemy.deck = Core.buildBattleDeck(OPPONENTS.op_ser_halden.deckIds, CARD_POOL, rng);
    game.opponent = OPPONENTS.op_ser_halden; game.opponentId = game.opponent.id; game.opponentName = game.opponent.name;
    game.player.opp = game.enemy; game.enemy.opp = game.player;
    applyBattlefieldScene({ id: 'tidebreak-confluence', advance: false });
    tideMode = 'flood'; sessionReady = previous;
    document.getElementById('log').textContent = '';
    log('試航目標：兩位見習士兵各攻擊一位弓箭手，陣亡充能後以漲潮破陣。', 'me');
    render();
  }
  function renderTideTrial() {
    const bar = document.getElementById('tideTrialBar');
    if (!bar || !game) return;
    bar.hidden = !game.tideTrial || game.over;
    if (!bar.hidden) document.getElementById('trialStep').textContent = combatInFlight ? '浪峰命中敵陣，退浪後可繼續對戰。' : game.player.tidebreaksUsed>0 ? game.turnCount>1 ? '回合蓄潮 +1；交戰與陣亡另結算，水痕仍在。' : '裂潮只耗潮能，不耗法力；敵陣水痕留到下一回合。' : Core.tideOf(game.player) < 6
      ? game.selected ? '已選取，點有箭頭的弓箭手。' : `潮能 ${Core.tideOf(game.player)}/6：點見習士兵，再點弓箭手。陣亡 +1。`
      : '滿潮了！按裂潮，只耗潮能、不耗法力。';
  }
  function drawTideChart() {
    const p = game.player, e = game.enemy, tide = Core.tideOf(p);
    document.getElementById('tideChartTitle').textContent=CardContentR6.tideCopy(tideMode).name+(tide<6?'（潮能未滿）':CardTideContent.direction(game)&&CardTideContent.direction(game)!==tideMode?'（方向不符）':' · 確認施放');
    document.getElementById('tideChartStatus').textContent = `我方 ${tide}/6 · 對手 ${Core.tideOf(e)}/6 · ${game.tideTrial ? '固定試航短局' : '單人對戰'}`;
    document.getElementById('tideGauge').value = tide;
    const rate = (side, why, fallback) => Core.tideRate(side, why, fallback);
    document.getElementById('tideSources').textContent = `我方：回合 +${rate(p,'turn',1)}／陣亡 +${rate(p,'fallen',1)}／法術 +${rate(p,'spell',0)}。滿六格後可施放。裂潮只耗潮能，不耗法力。`;
    document.getElementById('tideSources').title = `對手：回合 +${rate(e,'turn',1)}／陣亡 +${rate(e,'fallen',1)}／法術 +${rate(e,'spell',0)}。`;
    for (const [id, mode] of [['chooseFlood','flood'],['chooseEbb','ebb']]) {
      const el = document.getElementById(id); el.disabled=!!CardTideContent.direction(game)&&CardTideContent.direction(game)!==mode; el.classList.toggle('selected', tideMode === mode); el.setAttribute('aria-pressed', String(tideMode === mode));
      if(mode==='ebb')for(const text of el.childNodes)if(text.nodeType===Node.TEXT_NODE&&text.textContent.includes('友軍聖盾'))text.textContent=p.hp>=p.maxHp?'友軍聖盾；已滿血，不回復':`友軍聖盾、回復 ${Math.min(3,p.maxHp-p.hp)}`;
    }
    for(const [id,mode]of [['foldFlood','flood'],['foldEbb','ebb']]){
      const b=document.getElementById(id);if(!b)continue;
      b.disabled=!!CardTideContent.direction(game)&&CardTideContent.direction(game)!==mode;
      b.setAttribute('aria-pressed',String(tideMode===mode));
    }
    const why=document.getElementById('forecastDirectionWhy');if(why)why.hidden=!CardTideContent.direction(game);
    document.getElementById('tidePreview').textContent = tideMode === 'flood'
      ? `只耗潮能，不耗法力。敵方英雄受 2 點；每位敵方隨從受 1 點。${e.field.filter(m => !m.shield && m.health <= 1).length} 位可能退場（亡語另結算）。`
      : `退潮預覽：${CardContentR10.healLabel(p)}；${p.field.filter(m => !m.shield).length} 位友軍取得聖盾，可擋下下一次傷害。`;
    const wrongDirection=!!CardTideContent.direction(game)&&CardTideContent.direction(game)!==tideMode;
    document.getElementById('tideChartCast').disabled = wrongDirection || !Core.canTidebreak(game,'player') || combatInFlight || !!game.pendingSpell;
    document.getElementById('tideChartCast').textContent=wrongDirection?'目前不可用':Core.tideOf(game.player)<6?`潮能 ${Core.tideOf(game.player)}/6 未滿`:combatInFlight?'結算中，請稍候':game.pendingSpell?'請先完成法術選擇':'確認施放';
    document.querySelectorAll('.r80-preview-damage').forEach(el=>el.remove());
    document.querySelectorAll('.r75-preview-number').forEach(el => el.remove());
    document.querySelectorAll('.r75-preview-hit,.r75-preview-safe').forEach(el => el.classList.remove('r75-preview-hit','r75-preview-safe'));
    document.querySelectorAll('.r79-preview-exit').forEach(el=>el.remove());
    document.querySelectorAll('.r79-preview-lethal').forEach(el=>el.classList.remove('r79-preview-lethal'));
    const affected = tideMode === 'flood' ? '#enemyField .card,#enemyHero' : '#playerField .card,#playerHero';
    document.querySelectorAll(affected).forEach(el => {
      el.classList.add(tideMode === 'flood' ? 'r75-preview-hit' : 'r75-preview-safe');
      const unit=e.field.find(m=>m.uid===el.dataset.uid);
      if(tideMode==='flood') {
        const damage=document.createElement('span');damage.className='r80-preview-damage';
        damage.textContent=unit?(unit.shield?'擋下':'−1'):'−2';
        damage.setAttribute('aria-label',unit?(unit.shield?'聖盾擋下傷害':'將受1點傷害'):'英雄將受2點傷害');el.appendChild(damage);
      }
      if(tideMode==='flood'&&unit&&!unit.shield&&unit.health<=Core.TIDEBREAK_MINION_DAMAGE){
        el.classList.add('r79-preview-lethal');const mark=document.createElement('span');mark.className='r79-preview-exit';mark.setAttribute('aria-hidden','true');el.appendChild(mark);
      }
    });
  }
  function openTideChart() {
    if (!game.over && (game.turn !== 'player' || combatInFlight)) { showToast('等這次行動結束再觀潮。'); return; }
    CardMobile.cancel(false); setSettingsOpen(false); setMoreActionsOpen(false);
    tideReturnFocus = document.activeElement;
    const sheet=document.querySelector('#tideChartPanel .tide-chart-sheet');
    let fold=document.getElementById('tideChartFold');
    if(game.forecast){
      if(!document.getElementById('forecastDirectionWhy')){
        const why=document.createElement('button');why.id='forecastDirectionWhy';why.type='button';why.textContent='方向限制';
        why.onclick=()=>{const mode=CardTideContent.direction(game);tideMode=mode==='ebb'?'flood':'ebb';drawTideChart();document.getElementById('tidePreview').textContent=`方向不符：第 ${game.turnCount} 回合預報為${mode==='ebb'?'退潮':'漲潮'}。目前不可用，不消耗潮能或反轉次數。`;};
        sheet.querySelector('.tide-chart-footer').prepend(why);
      }
      if(!fold){fold=document.createElement('button');fold.id='tideChartFold';fold.type='button';sheet.querySelector('h2').after(fold);}
      if(!document.getElementById('foldDirections')){
        const compact=document.createElement('div');compact.id='foldDirections';
        for(const [id,mode,label]of [['foldFlood','flood','漲潮破陣'],['foldEbb','ebb','退潮護航']]){
          const b=document.createElement('button');b.id=id;b.type='button';b.textContent=label;
          b.onclick=()=>{tideMode=mode;drawTideChart();};compact.appendChild(b);
        }
        fold.after(compact);
      }
      sheet.dataset.folded='false';fold.textContent='精簡選項';fold.setAttribute('aria-expanded','true');
      fold.onclick=()=>{const folded=sheet.dataset.folded!=='true';sheet.dataset.folded=String(folded);fold.textContent=folded?'詳細選項':'精簡選項';fold.setAttribute('aria-expanded',String(!folded));};
    }else{fold?.remove();document.getElementById('foldDirections')?.remove();document.getElementById('forecastDirectionWhy')?.remove();sheet.dataset.folded='false';}
    if(CardTideContent.direction(game))tideMode=CardTideContent.direction(game);
    drawTideChart(); document.getElementById('tideChartPanel').hidden = false;
    if(game.forecast){const board=document.querySelector('.board');board.scrollTop=0;board.scrollLeft=0;}
    document.getElementById('tideChartClose').focus(); saveSession();
  }
  function closeTideChart() {
    document.getElementById('tideChartPanel').hidden = true;
    document.querySelectorAll('.r80-preview-damage').forEach(el=>el.remove());
    document.querySelectorAll('.r79-preview-exit').forEach(el=>el.remove());
    document.querySelectorAll('.r79-preview-lethal').forEach(el=>el.classList.remove('r79-preview-lethal'));
    document.querySelectorAll('.r75-preview-number').forEach(el => el.remove());
    document.querySelectorAll('.r75-preview-hit,.r75-preview-safe').forEach(el => el.classList.remove('r75-preview-hit','r75-preview-safe'));
    const target = tideReturnFocus?.closest('#dockMorePanel') ? document.getElementById('moreActionsBtn') : tideReturnFocus;
    target?.focus({ preventScroll: true });
  }
  function installTideChart() {
    for (const [id, icon] of [['chooseFlood','../../assets/art/r79/icon-wave.webp?v=r79-icon'],['chooseEbb','../../assets/art/r75/icon-shield.webp']]) {
      document.getElementById(id).insertAdjacentHTML('afterbegin', `<img class="r75-icon" src="${icon}" alt="">`);
    }
    document.getElementById('tideChartBtn').onclick = openTideChart;
    document.getElementById('trialChart').onclick = openTideChart;
    document.getElementById('tideChartClose').onclick = closeTideChart;
    document.getElementById('trialBegin').onclick = startTideTrial;
    const harbor = () => { saveSession(); window.top.location.href = new URL('../harbor.html', location.href).href; };
    document.getElementById('trialLeave').onclick = harbor;
    document.getElementById('tideHarbor').onclick = harbor;
    document.getElementById('tideTrialReplay').onclick = startTideTrial;
    document.getElementById('trialResultReplay').onclick = startTideTrial;
    document.getElementById('trialResultHarbor').onclick = harbor;
    document.getElementById('trialResultVoyage').onclick = () => { newGame(); CardMobile.openVoyage(); };
    document.getElementById('chooseFlood').onclick = () => { tideMode = 'flood'; drawTideChart(); };
    document.getElementById('chooseEbb').onclick = () => { tideMode = 'ebb'; drawTideChart(); };
    document.getElementById('tideChartCast').onclick = () => {
      if (document.getElementById('tideChartCast').disabled) return;
      closeTideChart(); castTidebreak('player', tideMode);
    };
    document.addEventListener('keydown', e => {
      const panel = !document.getElementById('tideChartPanel').hidden ? document.getElementById('tideChartPanel') : !document.getElementById('trialBrief').hidden ? document.getElementById('trialBrief') : null;
      if (!panel) return;
      if (e.key === 'Escape' && panel.id === 'tideChartPanel') { e.preventDefault(); closeTideChart(); }
      if (e.key === 'Tab') {
        const buttons = [...panel.querySelectorAll('button:not(:disabled)')].filter(b=>b.getClientRects().length), first = buttons[0], last = buttons[buttons.length-1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    document.addEventListener('visibilitychange', saveSession);
    window.addEventListener('pagehide', saveSession);
  }

  // Content R1: hand-authored lessons, reusing actual Core actions and renderer.
  let contentSelection = CardTideContent.get(new URLSearchParams(location.search).get('lesson'))?.id || 'fallen';
  let contentReturnFocus = null;
  function syncContentShell(){if(parent!==window)parent.postMessage({type:'battleFullBleed',active:!!(game?.content||game?.forecast)||!document.getElementById('contentPanel').hidden||(document.getElementById('overlay').classList.contains('show')&&document.body.dataset.r76Wave!=='true')},location.origin);}
  function contentProgress() {
    try { return CardTideContent.progress(localStorage.getItem(CardTideContent.KEY)); }
    catch { return CardTideContent.progress(null); }
  }
  function drawContent() {
    const d=CardTideContent.get(contentSelection), puzzle=CardTideContent.isPuzzle(d.id);
    const tab=puzzle?'puzzles':d.id;
    document.querySelectorAll('[data-content-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.contentTab===tab)));
    document.getElementById('contentName').textContent=d.name;
    document.getElementById('contentGoal').textContent=d.goal;
    document.getElementById('contentHint').textContent='';
    let reveal=document.getElementById('contentReveal');
    if(!reveal){reveal=document.createElement('button');reveal.id='contentReveal';reveal.type='button';document.getElementById('contentHint').after(reveal);}
    reveal.textContent='查看觀察提示';let hintLevel=0;
    reveal.onclick=()=>{hintLevel++;document.getElementById('contentHint').textContent=hintLevel===1?d.hint:CardContentR9.solutions[d.id]||d.hint;reveal.textContent=hintLevel===1?'再看解法':'解法已顯示';};
    const done=contentProgress().completed;
    const count=CardTideContent.counts(contentProgress());
    document.getElementById('contentProgress').textContent=`六道已解 ${count.puzzles}/6 · 複驗 ${count.verification}/1${done.includes(d.id)?' · 本題已完成':''}。試用卡不計戰績。`;
    document.getElementById('contentArt').src=d.id==='moen'?'../../assets/art/content-r10/moen-ready.webp':'../../assets/art/content-r1/tide-study.webp';
    document.getElementById('contentArt').alt=d.id==='moen'?'潮間仲裁者茉恩':'銅製三潮儀與六張海藏牌';
    const list=document.getElementById('contentPuzzles');list.replaceChildren();
    if(puzzle)CardTideContent.PUZZLES.forEach((item,i)=>{
      const b=document.createElement('button');b.type='button';b.dataset.puzzle=item.id;b.textContent=`${i+1} · ${item.name}${done.includes(item.id)?' ✓':''}`;b.setAttribute('aria-pressed',String(item.id===d.id));b.onclick=()=>{contentSelection=item.id;drawContent();};list.appendChild(b);
    });
    const verify=document.getElementById('contentVerify');verify.hidden=!puzzle;verify.disabled=!CardTideContent.unlocked(contentProgress());verify.textContent=verify.disabled?'複驗：護住騎士 · 解完六道開啟':`複驗：護住騎士 · ${count.verification}/1`;
  }
  function openContent() {
    if(combatInFlight)return;
    contentReturnFocus=document.activeElement;stopGuide(false);hideVsIntro();hideMulliganButton();CardMobile.cancel(false);setSettingsOpen(false);setMoreActionsOpen(false);closeTideChart();
    if(game.content)contentSelection=game.content.id;
    document.getElementById('contentResult').hidden=true;document.getElementById('forecastPanel').hidden=true;
    drawContent();document.getElementById('contentAbandon').hidden=!game.content||game.over;document.getElementById('contentPanel').hidden=false;syncContentShell();document.getElementById('contentClose').focus();saveSession();
  }
  function startContent(id,harborBoss=false) {
    if(combatInFlight)return;
    document.getElementById('contentResultRetry').disabled=false;document.getElementById('contentResultRetry').textContent='立即重試';
    const previous=sessionReady;sessionReady=false;newGame();stopGuide(false);hideVsIntro();hideMulliganButton();
    CardTideContent.setup(game,id,CARD_POOL);game.content.harborBoss=harborBoss;contentSelection=id;
    if(id==='moen'){
      game.content.returning=contentProgress().completed.includes('moen');
      game.opponent={id:'op_moen',name:'茉恩',heroCardId:'heroMoenTidearbiter'};game.opponentId='op_moen';game.opponentName=game.opponent.name;game.opponentEmoji='';
    }else{game.opponentId='op_ser_halden';game.opponent=OPPONENTS.op_ser_halden;game.opponentName='潮汐研習守備';}
    applyOpponentPortrait(game.opponent);applyBattlefieldScene({id:'tidebreak-confluence',advance:false});
    tideMode=CardTideContent.direction(game)||'flood';sessionReady=previous;
    document.getElementById('log').textContent='';log(CardTideContent.get(id).goal,'me');render();
    if(id==='forecast')openForecast();
    CardContentR6.entrance(game);
  }
  function startForecastFree() {
    newGame();stopGuide(false);hideVsIntro();hideMulliganButton();
    game.forecast={directions:['flood','flood','ebb'],original:['flood','flood','ebb'],reversed:false,scope:'free'};
    render();openForecast();saveSession();
  }
  function contentInstruction() {
    if(!game.content)return '';
    if(game.selected||game.pendingSpell||game.pendingBattlecry)return targetStatusText();
    const d=CardTideContent.get(game.content.id);
    if(d.id!=='moen')return d.goal;
    if(!game.content.enemyEbbUsed)return '結束整備：茉恩為騎士授盾，並回復自己 3 血。'+(game.content.returning?'二式：下輪敵潮滿2格才回2血。':'首航：只治療這一次。');
    if(game.turn!=='player')return '茉恩正在行動，等浪退去。';
    const knight=game.enemy.field.find(c=>c.id==='knight');
    if(game.content.delayedCasualty==='footman')return '拖延：騎士撞上士兵，聖盾擋下反擊後破裂；見習士兵已陣亡。敵騎士'+(knight?'仍有 '+knight.health+' 血。':'已退場。');
    if(knight?.shield)return '先用見習士兵拆盾；敵騎士下輪會打他3傷。現在清掉騎士，可搶先反攻。'+(game.content.returning?'二式：下輪敵潮滿2格才回2血；騎士陣亡補1格。':'');
    if(knight)return '敵騎士剩 '+knight.health+' 血，下一輪將出擊。';
    const reserve=CardContentR9.wolfInstruction(game);
    return game.content.returning&&!CardContentR9.returnCompleted(game)?'回潮二式：下輪敵潮滿2格才回2血。'+reserve:CardContentR9.returnCompleted(game)?(game.content.returnHeal?'反攻前敵潮達2格，追加治療已觸發。':'反攻前敵潮未達2格，追加治療已阻止。')+reserve:'敵陣已空；留意茉恩血量與仍能出手的隨從。';
  }
  function renderContentBar() {
    syncContentShell();
    document.body.dataset.contentActive=String(!!(game.content||game.forecast)&&!game.over);
    document.body.dataset.contentId=game.content?.id||(game.forecast?'forecast':'');
    const bar=document.getElementById('contentBar');bar.hidden=!(game.content||game.forecast)||game.over;
    renderMoenStage();
    if(bar.hidden)return;
    const d=CardTideContent.get(game.content?.id);document.getElementById('contentBarTitle').textContent=d?.name||'潮汐預報';
    const forecast=CardTideContent.direction(game);
    document.getElementById('contentBarGoal').textContent=game.forecast?`第 ${game.turnCount} 回合 · ${forecast?forecast==='ebb'?'退潮護航':'漲潮破陣':'自由潮向'} · ${game.forecast.reversed?'反轉已用':'可反轉一次'}`:contentInstruction();
    document.getElementById('contentHelp').textContent=game.forecast?'潮汐預報':'目標／提示';
    document.getElementById('forecastReversal')?.remove();
    if(game.forecast?.reversed){
      const f=game.forecast,i=f.directions.findIndex((mode,j)=>mode!==f.original?.[j]);
      if(i>=0){const copy=CardContentR6.tideCopy(f.directions[i]),mark=document.createElement('span'),icon=document.createElement('img');mark.id='forecastReversal';icon.src=copy.icon;icon.alt='';mark.append(icon,document.createTextNode(`第 ${i+1} 回合已反轉 → ${copy.name} · 反轉已用`));document.getElementById('contentBarGoal').appendChild(mark);}
    }
    for(const id of ['contentHelp','contentRetry','contentMenu'])document.getElementById(id).disabled=combatInFlight||game.turn!=='player';
    if(forecast)tideMode=forecast;
  }
  function renderMoenStage(){ CardContentR6.renderMoen(game); CardContentR9.render(game); }
  function replayContent() {
    const ref=game,id=game.content.id,boss=game.content.harborBoss,button=document.getElementById('contentResultRetry');
    button.disabled=true;button.textContent=combatInFlight?'退浪後重試…':'正在重試…';
    const retry=()=>{if(game!==ref)return;if(combatInFlight){setTimeout(retry,40);return;}startContent(id,boss);};retry();
  }
  function finishContent(win) {
    const art=document.querySelector('#contentResult .content-result-art'),recap=document.getElementById('contentRecap');
    const summary=CardTideContent.RECAP[game.content.id];
    art.hidden=!!summary;recap.hidden=!summary;recap.replaceChildren();recap.dataset.puzzle=game.content.id;
    art.src=game.content.id==='moen'?'../../assets/art/content-r10/moen-defeated.webp':'../../assets/art/content-r1/tide-study.webp';
    art.alt=game.content.id==='moen'?'茉恩在月光甲板前守約':'銅製三潮儀與海藏牌';
    if(summary)for(const [id,label]of summary.cards){
      const card=CARD_POOL.find(c=>c.id===id),figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption'),name=document.createElement('strong');
      img.src=({footman:'../../assets/art/r75/footman.webp?v=c1f52344',archer:'../../assets/art/r75/archer.webp?v=66fff3e9',wolf:'../../assets/art/r76/wolf.webp?v=b3a469e2',firebolt:'../../assets/art/r76/firebolt.webp?v=6583d849'})[id]||card.image;img.alt=card.name;name.textContent=card.name;caption.append(name,document.createTextNode(label));figure.append(img,caption);recap.appendChild(figure);
      if(!win&&id===CardTideContent.failureCard(game)){figure.dataset.error='true';caption.prepend(document.createTextNode('錯序卡片 · '));}
    }
    game.over=true;game.selected=null;game.pendingSpell=null;game.pendingBattlecry=null;clearSession();
    document.getElementById('contentBar').hidden=true;document.getElementById('forecastPanel').hidden=true;document.getElementById('tideChartPanel').hidden=true;
    const d=CardTideContent.get(game.content.id);
    const progress=CardTideContent.complete(contentProgress(),d.id);if(win&&d.id==='moen'&&game.content.harborBoss)progress.harborBossCleared=true;
    const saved=win?writeStorage(CardTideContent.KEY,JSON.stringify(progress),'研習進度儲存'):true;
    document.getElementById('contentResultTitle').textContent=win?'通關':'再試一次';
    document.getElementById('contentResultName').textContent=d.name;
    document.getElementById('contentResult').dataset.outcome=win?'completed':'failed';
    if(game.content.id==='moen'&&win){art.hidden=false;}
    document.getElementById('contentResultText').textContent=(win?(game.content.id==='moen'?CardContentR11.closingLine(game)+' '+CardContentR11.recap(game):summary?.line||d.lesson):CardTideContent.failure(game))+(saved?'':' 進度未能儲存，請檢查裝置空間。');
    CardContentR12.result(game,win);
    if(!win)for(const caption of recap.querySelectorAll('figcaption'))caption.prepend(document.createTextNode('重試目標 · '));
    const i=CardTideContent.PUZZLES.indexOf(d),verify=win&&i===5&&CardTideContent.unlocked(progress);
    let next=document.getElementById('contentNext');
    if(!next){next=document.createElement('button');next.id='contentNext';next.type='button';next.className='content-primary';document.querySelector('#contentResult footer').appendChild(next);}
    next.textContent=i>=0&&i<5?'下一道':verify?'下一道：保4血':'返回選題';
    if(next.textContent==='返回選題')next.remove();
    document.body.dataset.contentStage='';document.body.dataset.contentActive='false';document.getElementById('moenTideMeter')?.remove();document.getElementById('endTurnLockReason')?.remove();
    CardContentR6.renderSignals(game);CardContentR6.renderExchange(Core,game,{busy:true});renderMoenStage();CardContentR10.render(game);CardContentR11.render(game);
    next.onclick=()=>{if(combatInFlight)return;i>=0&&i<5?startContent(CardTideContent.PUZZLES[i+1].id):verify?startContent('undertow'):openContent();};
    document.getElementById('contentResult').hidden=false;document.getElementById('contentResultMenu').focus();
  }
  function openForecast() {
    if(!game.forecast||combatInFlight||game.turn!=='player'||game.over)return;
    const f=game.forecast;f.original=f.original||f.directions.slice();
    const panel=document.getElementById('forecastPanel');panel.dataset.gesture=f.reversed?'applied':'idle';
    const suggested=Math.max(1,Math.min(2,game.turnCount-1));
    document.getElementById('forecastRule').textContent=f.reversed?(CardContentR10.canUndo(game)?'已套用（已改向）・繼續對戰前可撤回。':'已鎖定（不能改）・依新潮向對戰。'):game.turnCount>3?'第 4 回合起，自由選潮向。':'反轉（改潮向）一次・按住看・移出取消。';
    const compare=document.getElementById('forecastCompare');
    const comparison=(i,held=false)=>CardContentR12.forecastView(game,i,held);
    const rounds=document.getElementById('forecastRounds');rounds.replaceChildren();
    game.forecast.directions.forEach((mode,i)=>{
      const wrap=document.createElement('div');wrap.className='forecast-round';
      const b=document.createElement('button');b.type='button';b.dataset.round=String(i);
      const title=document.createElement('strong'),value=document.createElement('span'),tip=document.createElement('small');title.textContent=`第 ${i+1} 回合${i===game.turnCount-1?' · 現在':''}`;value.textContent=mode==='ebb'?'退潮護航':'漲潮破陣';
      const past=i<game.turnCount-1,guide=!f.reversed&&!past&&i===suggested;
      tip.textContent=f.reversed&&mode!==f.original[i]?'已套用・'+(mode==='ebb'?'退潮':'漲潮'):past?'已過':f.reversed?'未改向':guide?'按住改向':'可改一次';b.append(title,value,tip);const ring=document.createElement('i');ring.className='r11-hold-ring';ring.setAttribute('aria-hidden','true');b.appendChild(ring);b.classList.toggle('forecast-current',i===game.turnCount-1);b.classList.toggle('forecast-guide',guide);
      b.disabled=f.reversed||past;
      let cancelled=false,holdFrame=0,holdStart=0;
      const stopRing=()=>{cancelAnimationFrame(holdFrame);b.style.removeProperty('--r12-hold');delete b.dataset.holdPercent;};
      const tick=()=>{if(!b.classList.contains('forecast-press'))return;const pct=Math.min(100,Math.round((performance.now()-holdStart)/10));b.style.setProperty('--r12-hold',pct*3.6+'deg');b.dataset.holdPercent=String(pct);const cue=document.getElementById('forecastHoldCue');if(cue)cue.textContent='按住中 '+pct+'%・放開套用／移出取消';holdFrame=requestAnimationFrame(tick);};
      b.onpointerdown=()=>{if(!b.disabled){cancelled=false;panel.dataset.gesture='holding';document.getElementById('forecastCancelZone').textContent='拖到此處取消';b.classList.add('forecast-press');holdStart=performance.now();tick();tip.textContent='放開改'+(mode==='flood'?'退潮':'漲潮');comparison(i,true);}};
      const cancel=()=>{stopRing();document.getElementById('forecastHoldCue').textContent='';cancelled=true;panel.dataset.gesture='cancelled';document.getElementById('forecastCancelZone').textContent='已取消・原潮向保留';b.classList.remove('forecast-press');tip.textContent='已取消';comparison(i);document.getElementById('forecastRule').textContent='已取消：潮向未改・剩餘 1 次。';};
      b.onpointercancel=cancel;b.onpointerleave=()=>{if(b.classList.contains('forecast-press'))cancel();};
      b.onpointermove=event=>{if(!b.classList.contains('forecast-press'))return;const r=b.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)cancel();};
      b.onclick=event=>{stopRing();if(combatInFlight||(cancelled&&event.detail!==0))return;if(CardTideContent.reverse(game,i)){CardContentR10.remember(game,i);const p=contentProgress();p.forecastUses++;writeStorage(CardTideContent.KEY,JSON.stringify(p),'預報反轉紀錄');render();openForecast();saveSession();}};
      wrap.appendChild(b);
      if(past){wrap.classList.add('forecast-locked');wrap.tabIndex=0;wrap.setAttribute('role','button');wrap.setAttribute('aria-label',`第 ${i+1} 回合已鎖定，查看原因`);const reason=()=>{document.getElementById('forecastRule').textContent=`第 ${i+1} 回合已過，不能改寫（時機不符）。`;wrap.dataset.explained='true';};wrap.onclick=reason;wrap.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();reason();}};}
      rounds.appendChild(wrap);
    });
    const changed=f.directions.findIndex((x,i)=>x!==f.original[i]),i=changed<0?Math.max(1,Math.min(2,game.turnCount-1)):changed;
    comparison(i);
    document.getElementById('forecastUndo')?.remove();if(CardContentR10.canUndo(game)){const undo=document.createElement('button');undo.id='forecastUndo';undo.type='button';undo.textContent='撤回反轉';document.getElementById('forecastClose').before(undo);undo.onclick=()=>{if(combatInFlight||!CardContentR10.revert(game))return;const p=contentProgress();p.forecastUses=Math.max(0,p.forecastUses-1);writeStorage(CardTideContent.KEY,JSON.stringify(p),'撤回預報');render();openForecast();document.getElementById('forecastRule').textContent='已撤回：原潮向與反轉額度已恢復。';saveSession();};}
    document.getElementById('forecastPanel').hidden=false;CardContentR11.positionForecast();document.getElementById('forecastClose').focus();
  }
  async function scriptedContentTurn() {
    const ref=game;handleCoreResult(Core.advanceTurn(game,{phase:'startEnemy'},rng));render();
    if(game.over)return;
    if(game.content.id==='forecast'&&game.turnCount===3){
      const card=JSON.parse(JSON.stringify(CARD_POOL.find(c=>c.id==='wolf')));
      handleCoreResult(Core.summon(game,{side:'enemy',card,reason:'forecastWatch'},rng));
      log('第四回合守備狼登船。無嘲諷，可選交換或直取英雄。','ai');render();
    }
    if(game.content.id==='moen'&&!game.content.enemyEbbUsed&&Core.canTidebreak(game,'enemy')){
      castTidebreak('enemy','ebb');
      while(game===ref&&combatInFlight)await new Promise(r=>setTimeout(r,40));
    }
    if(game!==ref||game.over)return;
    if(game.content.id==='forecast'&&game.turnCount<=2){
      log('預報守備前兩輪留守；你可以保留滿潮，等指定回合再施放。','ai');endAiTurn();render();return;
    }
    if(game.content.id==='moen'&&game.content.returning&&game.turnCount===2&&!CardContentR9.returnCompleted(game)){
      game.content.returnResolved=true;game.content.returnTide=Core.tideOf(game.enemy);
      if(CardContentR9.returnCanHeal(game)){
      const before=game.enemy.hp;game.enemy.hp=Math.min(game.enemy.maxHp,before+2);game.content.returnHeal=true;
      game.content.returnHealAmount=game.enemy.hp-before;
      CardContentR6.heal(game,game.enemy.hp-before,before,game.enemy.hp);log(`回潮二式：茉恩再次治療自己，${before} → ${game.enemy.hp} 血。`,'ai');render();await new Promise(r=>setTimeout(r,800));
      }else{game.content.returnHeal=false;log('敵潮未滿2格，回潮二式的追加治療已阻止。','me');render();}
    }
    if(game.content.id==='moen'&&game.turnCount===1){log('茉恩留下騎士的聖盾，這回合留守；下一輪才出擊。','ai');endAiTurn();render();return;}
    const knight=game.enemy.field.find(c=>c.id==='knight'&&c.canAttack);
    if(knight){
      const target=game.player.field.find(c=>(c.keywords||[]).includes('taunt'))||game.player.field[0];
      const counterBefore=target?.health??game.player.hp;
      if(game.content.id==='moen')game.content.counterOccurred=true;
      if(target)await resolveAttack(game.enemy,knight,target);else await resolveHeroAttackUi(game.enemy,knight,game.player);
      if(game.content.id==='moen')game.content.counterDamage=(game.content.counterDamage||0)+Math.max(0,counterBefore-(target?Math.max(0,target.health):game.player.hp));
      if(target?.id==='footman'&&!game.player.field.some(c=>c.uid===target.uid))game.content.delayedCasualty='footman';
    }
    if(game!==ref||game.over)return;
    endAiTurn();render();
  }
  function installContent() {
    const measureContent=()=>{
      CardContentR11.render(game);
      document.body.style.setProperty('--r8-content-top',`${document.getElementById('contentBar').getBoundingClientRect().bottom+8}px`);
      const sheet=document.querySelector('#forecastPanel .content-sheet');
      if(sheet?.getClientRects().length){document.body.style.setProperty('--r9-panel-reserve',`${document.documentElement.clientHeight-sheet.getBoundingClientRect().top+8}px`);CardContentR11.positionForecast();}
    };
    new ResizeObserver(measureContent).observe(document.getElementById('contentBar'));
    new ResizeObserver(measureContent).observe(document.querySelector('#forecastPanel .content-sheet'));
    const offline=document.getElementById('offlineStatus');
    const updateOffline=()=>{offline.hidden=navigator.onLine;document.body.dataset.offline=String(!navigator.onLine);};
    window.addEventListener('online',updateOffline);window.addEventListener('offline',updateOffline);updateOffline();
    document.getElementById('contentOpen').onclick=openContent;
    document.querySelectorAll('[data-content-tab]').forEach(b=>b.onclick=()=>{contentSelection=b.dataset.contentTab==='puzzles'?'fallen':b.dataset.contentTab;drawContent();});
    document.getElementById('contentStart').onclick=()=>startContent(contentSelection);
    document.getElementById('contentVerify').onclick=()=>{if(CardTideContent.unlocked(contentProgress())){contentSelection='undertow';drawContent();startContent('undertow');}};
    document.getElementById('contentClose').onclick=()=>{document.getElementById('contentPanel').hidden=true;syncContentShell();if(game.over)document.getElementById('contentResult').hidden=false;else contentReturnFocus?.focus({preventScroll:true});};
    document.getElementById('contentHarbor').onclick=()=>{saveSession();window.top.location.href=new URL('../harbor.html',location.href).href;};
    document.getElementById('contentMenu').onclick=()=>game.content?openContent():CardMobile.openVoyage();
    document.getElementById('contentHelp').onclick=()=>game.forecast?openForecast():openContent();
    document.getElementById('contentRetry').onclick=()=>game.content?startContent(game.content.id,game.content.harborBoss):startForecastFree();
    document.getElementById('voyageForecast').onclick=()=>{document.getElementById('voyagePanel').hidden=true;startForecastFree();};
    document.getElementById('voyageBoss').onclick=()=>{document.getElementById('voyagePanel').hidden=true;startContent('moen',true);};
    document.getElementById('voyageLessons').onclick=()=>{document.getElementById('voyagePanel').hidden=true;contentSelection='fallen';openContent();};
    document.getElementById('contentResultRetry').onclick=replayContent;
    document.getElementById('contentResultMenu').onclick=openContent;
    document.getElementById('forecastClose').onclick=()=>{CardContentR10.seal(game);document.getElementById('forecastPanel').hidden=true;document.getElementById('contentHelp').focus();};
    document.addEventListener('keydown',e=>{
      const panel=['contentPanel','forecastPanel','contentResult'].map(id=>document.getElementById(id)).find(x=>!x.hidden);if(!panel)return;
      if(e.key==='Escape'){e.preventDefault();if(panel.id==='contentPanel')document.getElementById('contentClose').click();if(panel.id==='forecastPanel')document.getElementById('forecastClose').click();}
      if(e.key==='Tab'){const a=[...panel.querySelectorAll('button:not(:disabled)')],first=a[0],last=a[a.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
    });
  }

  // ===== 綁定 & 啟動 =====
  installErrorRecovery();
  installSwAutoReload();
  installAccessibilityLabels();
  applyTextSize(currentTextSize());
  installAudioUnlock();
  document.getElementById('contentAbandon').onclick=()=>{if(combatInFlight||!game.content||game.over)return;document.getElementById('contentPanel').hidden=true;finishContent(false);};
  document.getElementById("endTurnBtn").onclick = endTurn;
  const hintBtn = document.getElementById("hintBtn");
  if (hintBtn) hintBtn.onclick = showHint;
  const tidebreakBtnEl = document.getElementById("tidebreakBtn");
  if (tidebreakBtnEl) tidebreakBtnEl.onclick = () => castTidebreak("player");
  // R72：觸控版把裂潮鈕放進常駐 command dock（抽屜展開也看得到充能、按得到）；桌機留在英雄列旁。
  function placeTidebreakButton() {
    const btn = document.getElementById("tidebreakBtn");
    const dock = document.getElementById("commandDock");
    const scene = document.querySelector(".player-hero-scene");
    if (!btn || !dock || !scene) return;
    if (window.__controlMode === "touch") {
      const primary = dock.querySelector(".primary-actions");
      if (btn.parentNode !== dock) primary.insertAdjacentElement("afterend", btn);
      dock.classList.add("has-tide");
    } else {
      if (btn.parentNode !== scene) scene.appendChild(btn);
      dock.classList.remove("has-tide");
    }
    btn.hidden = false;
    btn.setAttribute("aria-hidden", "false");
    btn.tabIndex = 0;
  }
  placeTidebreakButton();
  if (window.matchMedia) {
    const coarse = window.matchMedia("(pointer: coarse)");
    const onPointerChange = () => setTimeout(placeTidebreakButton, 0);
    if (coarse.addEventListener) coarse.addEventListener("change", onPointerChange);
    else if (coarse.addListener) coarse.addListener(onPointerChange);
  }
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
  const audioVolumeRange = document.getElementById("audioVolumeRange");
  if (audioVolumeRange) {
    syncAudioVolumeControl();
    audioVolumeRange.oninput = () => setAudioVolume(Number(audioVolumeRange.value) / 100);
  }
  const settingsToggleBtn = document.getElementById("settingsToggleBtn");
  if (settingsToggleBtn) settingsToggleBtn.onclick = (event) => {
    event.stopPropagation();
    setMoreActionsOpen(false);
    setSettingsOpen(settingsToggleBtn.getAttribute("aria-expanded") !== "true");
  };
  const moreActionsBtn = document.getElementById("moreActionsBtn");
  if (moreActionsBtn) moreActionsBtn.onclick = (event) => {
    event.stopPropagation();
    setSettingsOpen(false);
    setMoreActionsOpen(moreActionsBtn.getAttribute("aria-expanded") !== "true");
  };
  const settingsPanel = document.getElementById("settingsPanel");
  if (settingsPanel) settingsPanel.addEventListener("click", (event) => event.stopPropagation());
  const dockMorePanel = document.getElementById("dockMorePanel");
  if (dockMorePanel) dockMorePanel.addEventListener("click", (event) => {
    event.stopPropagation();
    if (event.target.closest("button")) setTimeout(() => setMoreActionsOpen(false), 0);
  });
  const handDrawerToggle = document.getElementById("handDrawerToggle");
  if (handDrawerToggle) handDrawerToggle.onclick = () => {
    const drawer = document.getElementById("handDrawer");
    setHandDrawerOpen(!drawer?.classList.contains("open"));
  };
  document.getElementById("restartBtn").onclick = () => game?.content ? startContent(game.content.id) : game?.tideTrial ? startTideTrial() : newGame(game && game.voyageStage);
  document.getElementById("overlayPackBtn").onclick = goPack;
  document.getElementById("overlayQuestBtn").onclick = claimAllQuestsUi;
  const claimAllBtn = document.getElementById("questClaimAllBtn");
  if (claimAllBtn) claimAllBtn.onclick = claimAllQuestsUi;
  const boardEl = document.querySelector(".board");
  if (boardEl) {
    boardEl.addEventListener("click", (event) => {
      if (event.target.closest(".card, .hero, button, select, label, .quest-panel, .controls, .hand, .settings-hud")) return;
      cancelTargeting("已取消選取。");
      setMoreActionsOpen(false);
      setSettingsOpen(false);
    });
  }
  // 對戰中重開（牌庫會重新讀最新收藏——開完新卡包回來按這顆就能用到新卡）
  const ngBtn = document.getElementById("newGameBtn");
  if (ngBtn) ngBtn.onclick = newGame;
  const newGameQuickBtn = document.getElementById("newGameQuickBtn");
  if (newGameQuickBtn) newGameQuickBtn.onclick = newGame;
  const toPackBtn = document.getElementById("toPackBtn");
  if (toPackBtn) toPackBtn.onclick = goPack;
  const toPackQuickBtn = document.getElementById("toPackQuickBtn");
  if (toPackQuickBtn) toPackQuickBtn.onclick = goPack;
  startPerfMonitor();
  CardMobile.init({
    game: () => game, busy: () => combatInFlight,
    cost: card => playableCost(game.player, card),
    play: playFromHand, start: newGame, save: writeStorage,
    opponent: id => CardVoyage.OPPONENTS[id] || OPPONENTS[id],
    closeMenus: () => { setSettingsOpen(false); setMoreActionsOpen(false); },
  });
  const launch = new URLSearchParams(location.search);
  const savedSession = (launch.has('resume') || launch.has('trial') || launch.has('content')) ? loadSession() : null;
  newGame();
  sessionReady = true;
  if (savedSession && (!launch.has('trial') || savedSession.tideTrial) && (!launch.has('content') || savedSession.content)) {
    game = savedSession;
    game.opponent = game.opponentId==='op_moen' ? {id:'op_moen',name:'茉恩',heroCardId:'heroMoenTidearbiter'} : OPPONENTS[game.opponentId] || CardVoyage.OPPONENTS[game.opponentId] || OPPONENTS.op_ser_halden;
    applyOpponentPortrait(game.opponent);
    hideVsIntro(); hideMulliganButton(); stopGuide(false); render();
    log('已恢復上次玩家回合的安全檢查點。', 'me');
  } else if (launch.has('trial')) {
    stopGuide(false); hideVsIntro();
    document.getElementById('trialBrief').hidden = false;
    document.getElementById('trialBegin').focus();
  } else if (launch.has('content')) { stopGuide(false); hideVsIntro(); openContent(); }
  else maybeStartGuide();
  installTideChart();
  installContent();
  CardContentR9.installPoses(CardPosePlayer);
  CardContentR10.installPoses(CardPosePlayer);
  if(launch.get('voyage')==='1'){stopGuide(false);hideVsIntro();CardMobile.openVoyage();}

  const guideReplayBtn = document.getElementById("guideReplayBtn");
  if (guideReplayBtn) guideReplayBtn.onclick = () => startGuide(true);
  const guideSkipBtn = document.getElementById("guideSkipBtn");
  if (guideSkipBtn) guideSkipBtn.onclick = () => stopGuide(true);
  const guideHintBtn = document.getElementById("guideHintBtn");
  if (guideHintBtn) guideHintBtn.onclick = () => stopGuide(true);
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
    if (typeof window.__kwCodexOpen === "function" && window.__kwCodexOpen()) { window.__closeKwCodex(); return; }
    if (document.getElementById("settingsPanel")?.classList.contains("show")) { setSettingsOpen(false); return; }
    if (document.getElementById("commandDock")?.classList.contains("more-open")) { setMoreActionsOpen(false); return; }
    if (document.getElementById("handDrawer")?.classList.contains("open")) setHandDrawerOpen(false);
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
    if (e.key === AUDIO_MUTE_KEY || e.key === AUDIO_VOLUME_KEY) syncAudioButton();
  });

  // 測試掛鉤：讓自動化測試能建立確定性場景並驗證技能（不影響正常遊玩）
  window.__test = {
    game: () => game,
    setup(playerField, enemyField) {
      clearTransientFx();
      r80Views.delete(game); // A new deterministic fixture is a new presentation, not deaths in the old one.
      pendingTargetUid = null;
      game.selected = null;
      game.pendingSpell = null;
      game.pendingBattlecry = null;
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
      if (a && d) return resolveAttack(game.player, a, d);
      return Promise.resolve(coreFailure("targetNotFound"));
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
    battlefield: () => ({ ...(window.__r67VisualState || {}), cursor: battlefieldCursor, count: R67_BATTLEFIELDS.length }),
    setBattlefield: (id, tier) => applyBattlefieldScene({ id, tier, advance: false }),
    perf: () => perfSnapshot(),
    forceFps: (fps) => applyPerfEstimate(fps),
    setTextSize: (size) => setTextSize(size),
    textSize: () => ({ value: currentTextSize(), attr: document.documentElement.dataset.textSize, select: document.getElementById("textSizeSel")?.value || "" }),
    setAudioMuted: (muted) => setAudioMuted(muted),
    setAudioVolume: (value) => setAudioVolume(value),
    audio: () => ({ muted: audioMuted(), volume: audioVolume(), unlocked: audioUnlocked, button: document.getElementById("audioToggleBtn")?.textContent || "" }),
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
      writeStorage(OPPONENT_KEY, id, "對手設定儲存");
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
    // R72 裂潮／星級／開場掛鉤
    tide: () => ({ player: Core.tideOf(game.player), enemy: Core.tideOf(game.enemy), max: TIDE_MAX, enemyRates: Object.assign({}, game.enemy.tideRates || {}), playerUsed: game.player.tidebreaksUsed || 0, enemyUsed: game.enemy.tidebreaksUsed || 0 }),
    setTide: (player, enemy) => { if (player != null) game.player.tide = player; if (enemy != null) game.enemy.tide = enemy; render(); return { player: Core.tideOf(game.player), enemy: Core.tideOf(game.enemy) }; },
    castTidebreak: (side) => { const r = castTidebreak(side || "player"); return r ? { ok: r.ok, reason: r.reason || "" } : null; },
    aiTidebreak: () => maybeAiTidebreak(),
    starResult: () => game.starResult,
    starRecord: () => loadStarRecord(),
    showIntro: () => showVsIntro(game.opponent || currentOpponent()),
    hideIntro: () => hideVsIntro(),
    bgm: () => ({ url: BGM_URL, missing: bgmMissing, created: !!bgm, playing: !!(bgm && !bgm.paused), volume: bgm ? bgm.volume : 0, frameVisible: bgmFrameVisible }),
    introOpen: () => document.getElementById("vsIntro")?.classList.contains("show") || false,
  };
  function prepMinion(c) { c.uid = "t" + Math.random().toString(36).slice(2, 8); c.maxHealth = c.health; if ((c.keywords || []).includes("divineshield")) c.shield = true; c.canAttack = true; return c; }

  const CAPTURE_POSES = Object.freeze([
    "legendTauntFoil", "heroCritical", "fourRarityHand", "enemyTripleField",
    "opponentHalden", "opponentVey", "opponentScarra",
  ]);
  const CAPTURE_ALIASES = Object.freeze({ threeOpponents:"enemyTripleField" });
  const CAPTURE_OPPONENTS = Object.freeze({
    opponentHalden:"op_ser_halden",
    opponentVey:"op_magister_vey",
    opponentScarra:"op_scarra",
  });
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
    const requestedName = name;
    name = CAPTURE_ALIASES[name] || name;
    if (!CAPTURE_POSES.includes(name)) return { ok:false, name:requestedName, available:[...CAPTURE_POSES] };
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
    setHandDrawerOpen(false);
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
      setHandDrawerOpen(true);
    } else if (name === "enemyTripleField") {
      game.enemy.field = [
        captureCard("knight", {}, true), captureCard("arcaneWeaver", { foil:true }, true), captureCard("frostboundTyrant", {}, true),
      ];
      game.player.field = [captureCard("dawnArchbishop", {}, true)];
    } else {
      const opponent = OPPONENTS[CAPTURE_OPPONENTS[name]];
      game.opponent = opponent;
      game.opponentId = opponent.id;
      game.opponentName = opponent.name;
      game.opponentEmoji = opponent.emoji;
      game.enemy.field = [captureCard(
        name === "opponentHalden" ? "knight" : name === "opponentVey" ? "arcaneWeaver" : "packHowler",
        { foil:name === "opponentVey" }, true,
      )];
      game.player.field = [captureCard("dawnArchbishop", {}, true)];
    }
    render();
    return { ok:true, name, requestedName, opponent:document.body.dataset.opponent || "", cards:document.querySelectorAll(".battlefield .card, .hand .card").length };
  }
  function clearCapturePose() {
    document.body.classList.remove("capture-pose");
    delete document.body.dataset.capturePose;
    setHandDrawerOpen(false);
    newGame();
    return true;
  }
  window.__capture = Object.freeze({ poses:[...CAPTURE_POSES], pose:applyCapturePose, clear:clearCapturePose });
  window.__test.pose = applyCapturePose;
  window.__test.capturePoses = () => [...CAPTURE_POSES];
  const initialCapturePose = new URLSearchParams(location.search).get("capture");
  if (initialCapturePose) applyCapturePose(initialCapturePose);
})();
