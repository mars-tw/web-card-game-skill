/* =========================================================================
 * core.js - 卡牌對戰核心規則層
 *
 * 這裡只處理狀態轉換與規則判定；不碰 DOM、時間或全域亂數。
 * 需要亂數時一律由呼叫端注入 rng，方便瀏覽器 UI 與 Node 測試共用。
 * ========================================================================= */

(function exposeCardCore(root, factory) {
  "use strict";
  const api = factory();
  if (root) root.CardCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function buildCardCore() {
  "use strict";

  const MAX_MANA = 10;
  const START_HP = 30;
  const MAX_FIELD = 7;
  const HAND_LIMIT = 8;
  const STATS_VERSION = 3;
  const DECK_VERSION = 1;
  const DECK_SIZE = 20;
  const QUEST_VERSION = 1;
  const GOAL_VERSION = 1;
  const DDA_MIN_LEVEL = -2;
  const DDA_MAX_LEVEL = 2;
  const DDA_DEFAULT = Object.freeze({
    enabled: true,
    level: 0,
  });
  const CARD_TYPE = { MINION: "minion", SPELL: "spell" };
  const TELEMETRY_DEFAULT = Object.freeze({
    games: Object.freeze([]),
    cardPlays: Object.freeze({}),
  });
  const STATS_DEFAULT = Object.freeze({
    version: STATS_VERSION,
    wins: 0,
    losses: 0,
    streak: 0,
    lossStreak: 0,
    bestStreak: 0,
    coins: 0,
    packsOpened: 0,
    dda: DDA_DEFAULT,
    telemetry: TELEMETRY_DEFAULT,
    lastSafeSaveAt: 0,
    lastErrorMessage: "",
  });
  const DECK_DEFAULT = Object.freeze({
    version: DECK_VERSION,
    cards: Object.freeze([]),
  });
  const QUEST_POOL = Object.freeze([
    Object.freeze({ id: "win_1", type: "win", title: "贏得 1 場對戰", target: 1, reward: 30 }),
    Object.freeze({ id: "play_spell_5", type: "playSpell", title: "打出 5 張法術", target: 5, reward: 25 }),
    Object.freeze({ id: "summon_minion_8", type: "summonMinion", title: "召喚 8 隻隨從", target: 8, reward: 25 }),
    Object.freeze({ id: "hero_damage_20", type: "heroDamage", title: "對敵方英雄造成 20 點傷害", target: 20, reward: 30 }),
    Object.freeze({ id: "open_pack_1", type: "openPack", title: "開啟 1 包卡包", target: 1, reward: 20 }),
    Object.freeze({ id: "deck_win_1", type: "deckWin", title: "使用自訂牌組贏得 1 場", target: 1, reward: 40 }),
    Object.freeze({ id: "win_2", type: "win", title: "贏得 2 場對戰", target: 2, reward: 40 }),
    Object.freeze({ id: "summon_minion_12", type: "summonMinion", title: "召喚 12 隻隨從", target: 12, reward: 35 }),
  ]);

  const MILESTONE_DEFS = Object.freeze([
    Object.freeze({ id: "unique_10", metric: "unique", target: 10, title: "收藏 10 種卡牌", reward: 40 }),
    Object.freeze({ id: "unique_20", metric: "unique", target: 20, title: "收藏 20 種卡牌", reward: 60 }),
    Object.freeze({ id: "unique_40", metric: "unique", target: 40, title: "收藏 40 種卡牌", reward: 80 }),
    Object.freeze({ id: "foil_5", metric: "foil", target: 5, title: "收藏 5 張閃卡", reward: 40 }),
    Object.freeze({ id: "foil_15", metric: "foil", target: 15, title: "收藏 15 張閃卡", reward: 60 }),
  ]);
  const WEEKLY_QUEST_POOL = Object.freeze([
    Object.freeze({ id: "weekly_win_3", type: "win", title: "本週勝利 3 場", target: 3, reward: 100 }),
    Object.freeze({ id: "weekly_open_pack_3", type: "openPack", title: "本週開啟 3 包", target: 3, reward: 80 }),
    Object.freeze({ id: "weekly_summon_30", type: "summonMinion", title: "本週召喚 30 個手下", target: 30, reward: 90 }),
    Object.freeze({ id: "weekly_damage_80", type: "heroDamage", title: "本週造成 80 點英雄傷害", target: 80, reward: 120 }),
  ]);

  const SPELL_EFFECTS = Object.freeze({
    damage3: Object.freeze({ needsTarget: "enemyMinion" }),
    damage8: Object.freeze({ needsTarget: "enemyMinion" }),
    heal5: Object.freeze({ needsTarget: null }),
    aoe1: Object.freeze({ needsTarget: null }),
    aoe2: Object.freeze({ needsTarget: null }),
    mana2: Object.freeze({ needsTarget: null }),
    giveShield: Object.freeze({ needsTarget: "friendlyMinion" }),
    polymorph: Object.freeze({ needsTarget: "enemyMinion" }),
  });

  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function migrateDda(raw) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    return {
      enabled: source.enabled !== false,
      level: clampNumber(source.level, DDA_MIN_LEVEL, DDA_MAX_LEVEL, 0),
    };
  }

  function migrateTelemetry(raw) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const cardPlays = source.cardPlays && typeof source.cardPlays === "object" && !Array.isArray(source.cardPlays)
      ? Object.keys(source.cardPlays).reduce((acc, id) => {
          const count = Math.max(0, Math.floor(Number(source.cardPlays[id]) || 0));
          if (id && count > 0) acc[id] = count;
          return acc;
        }, Object.create(null))
      : Object.create(null);
    const games = Array.isArray(source.games)
      ? source.games.slice(-100).map((game) => {
          const item = game && typeof game === "object" ? game : {};
          return {
            difficulty: String(item.difficulty || "easy"),
            win: item.win === true,
            turns: Math.max(0, Math.floor(Number(item.turns) || 0)),
            archetype: ["aggro", "control", "neutral"].includes(item.archetype) ? item.archetype : "neutral",
            at: Math.max(0, Math.floor(Number(item.at) || 0)),
          };
        })
      : [];
    return { games, cardPlays };
  }

  function ddaProfile(rawDda) {
    const dda = migrateDda(rawDda);
    if (!dda.enabled) return { enabled: false, level: 0, mistakeRate: 0, scoreBias: 0, label: "關閉" };
    const level = dda.level;
    return {
      enabled: true,
      level,
      mistakeRate: level < 0 ? Math.abs(level) * 0.1 : 0,
      scoreBias: level > 0 ? level * 0.1 : 0,
      label: level < 0 ? `軟化 ${Math.abs(level)}` : level > 0 ? `強化 ${level}` : "標準",
    };
  }

  function nextDdaState(rawDda, resultStats, outcome) {
    const current = migrateDda(rawDda);
    if (!current.enabled) return current;
    const winStreak = Math.max(0, Math.floor(Number(resultStats && resultStats.streak) || 0));
    const lossStreak = Math.max(0, Math.floor(Number(resultStats && resultStats.lossStreak) || 0));
    let delta = 0;
    if (outcome === "win" && winStreak >= 3 && (winStreak - 3) % 2 === 0) delta = 1;
    if (outcome === "loss" && lossStreak >= 2 && lossStreak % 2 === 0) delta = -1;
    return Object.assign({}, current, {
      level: clampNumber(current.level + delta, DDA_MIN_LEVEL, DDA_MAX_LEVEL, 0),
    });
  }

  function protectSave(rawStats, errorMessage, timestamp) {
    const next = migrateStats(rawStats);
    next.lastSafeSaveAt = Math.max(0, Math.floor(Number(timestamp) || 0));
    next.lastErrorMessage = String(errorMessage || "").slice(0, 160);
    return next;
  }

  function migrateStats(raw) {
    let source = raw;
    if (typeof source === "string") {
      try { source = JSON.parse(source); }
      catch { source = null; }
    }
    if (!source || typeof source !== "object" || Array.isArray(source)) source = {};
    const next = Object.assign({}, STATS_DEFAULT, source);
    for (const key of Object.keys(STATS_DEFAULT)) {
      if (key === "dda") {
        next.dda = migrateDda(next.dda);
      } else if (key === "telemetry") {
        next.telemetry = migrateTelemetry(next.telemetry);
      } else if (key === "lastErrorMessage") {
        next.lastErrorMessage = typeof next.lastErrorMessage === "string" ? next.lastErrorMessage.slice(0, 160) : "";
      } else if (typeof next[key] !== "number" || !Number.isFinite(next[key])) {
        next[key] = STATS_DEFAULT[key];
      }
    }
    next.version = STATS_VERSION;
    return next;
  }

  function migrateDeck(raw) {
    let source = raw;
    if (typeof source === "string") {
      try { source = JSON.parse(source); }
      catch { source = null; }
    }
    if (!source || typeof source !== "object" || Array.isArray(source)) source = {};
    const next = Object.assign({}, DECK_DEFAULT, source);
    next.cards = Array.isArray(next.cards)
      ? next.cards.filter((id) => typeof id === "string")
      : [];
    next.version = DECK_VERSION;
    return next;
  }

  function questDateKey(dateSeed) {
    return String(dateSeed || "");
  }

  function hashSeed(seed) {
    const text = questDateKey(seed);
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
  }

  function cloneQuest(def, existing) {
    const progress = existing && typeof existing.progress === "number" && Number.isFinite(existing.progress)
      ? Math.max(0, Math.min(def.target, existing.progress))
      : 0;
    return Object.assign({}, def, {
      progress,
      claimed: !!(existing && existing.claimed === true),
    });
  }

  function getDailyQuests(dateSeed) {
    const pool = QUEST_POOL.map((quest) => cloneQuest(quest));
    let hash = hashSeed(dateSeed);
    for (let i = pool.length - 1; i > 0; i--) {
      hash = (Math.imul(hash, 1664525) + 1013904223) >>> 0;
      const j = hash % (i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 3);
  }

  function cloneQuestState(questState, dateSeed) {
    const seed = questDateKey(dateSeed == null ? questState && questState.dateSeed : dateSeed);
    const quests = Array.isArray(questState && questState.quests)
      ? questState.quests.map((quest) => {
          const def = QUEST_POOL.find((item) => item.id === quest.id) || quest;
          return cloneQuest(Object.assign({}, def, {
            id: String(def.id || quest.id || ""),
            type: String(def.type || quest.type || ""),
            title: String(def.title || quest.title || ""),
            target: Math.max(1, Number(def.target || quest.target || 1)),
            reward: Math.max(0, Number(def.reward || quest.reward || 0)),
          }), quest);
        }).filter((quest) => quest.id && quest.type)
      : [];
    return { version: QUEST_VERSION, dateSeed: seed, quests };
  }

  function migrateQuests(raw, dateSeed) {
    let source = raw;
    if (typeof source === "string") {
      try { source = JSON.parse(source); }
      catch { source = null; }
    }
    if (!source || typeof source !== "object" || Array.isArray(source)) source = {};
    const seed = questDateKey(dateSeed);
    const oldSeed = questDateKey(source.dateSeed);
    const existingById = Object.create(null);
    if (oldSeed === seed && Array.isArray(source.quests)) {
      for (const quest of source.quests) {
        if (quest && typeof quest.id === "string") existingById[quest.id] = quest;
      }
    }
    const quests = getDailyQuests(seed).map((quest) => cloneQuest(quest, existingById[quest.id]));
    return { version: QUEST_VERSION, dateSeed: seed, quests };
  }

  function questEventMatches(questType, eventType) {
    if (questType === eventType) return true;
    if (questType === "playSpell" && eventType === "spellCast") return true;
    if (questType === "summonMinion" && eventType === "minionSummoned") return true;
    return false;
  }

  function applyQuestProgress(questState, event) {
    const next = cloneQuestState(questState);
    const eventType = event && (event.questType || event.type);
    const amountRaw = event && event.amount == null ? 1 : Number(event && event.amount);
    const amount = Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : 1;
    for (const quest of next.quests) {
      if (quest.claimed || !questEventMatches(quest.type, eventType)) continue;
      quest.progress = Math.min(quest.target, quest.progress + amount);
    }
    return next;
  }

  function claimQuest(questState, questId) {
    const next = cloneQuestState(questState);
    const quest = next.quests.find((item) => item.id === questId);
    if (!quest) return { ok: false, reason: "notFound", reward: 0, state: next };
    if (quest.claimed) return { ok: false, reason: "alreadyClaimed", reward: 0, state: next, quest };
    if (quest.progress < quest.target) return { ok: false, reason: "incomplete", reward: 0, state: next, quest };
    quest.claimed = true;
    return { ok: true, reason: null, reward: quest.reward, state: next, quest };
  }

  function cleanClaimedMilestones(source) {
    const list = [];
    if (Array.isArray(source && source.claimedMilestones)) {
      list.push(...source.claimedMilestones);
    } else if (Array.isArray(source && source.milestones)) {
      for (const item of source.milestones) {
        if (typeof item === "string") list.push(item);
        else if (item && item.claimed && typeof item.id === "string") list.push(item.id);
      }
    }
    return [...new Set(list.filter((id) => typeof id === "string" && MILESTONE_DEFS.some((def) => def.id === id)))];
  }

  function getWeeklyQuest(dateSeed) {
    if (!WEEKLY_QUEST_POOL.length) return null;
    const idx = hashSeed(dateSeed) % WEEKLY_QUEST_POOL.length;
    return cloneQuest(WEEKLY_QUEST_POOL[idx]);
  }

  function migrateGoals(raw, dateSeed) {
    let source = raw;
    if (typeof source === "string") {
      try { source = JSON.parse(source); }
      catch { source = null; }
    }
    if (!source || typeof source !== "object" || Array.isArray(source)) source = {};
    const seed = questDateKey(dateSeed == null ? source.dateSeed : dateSeed);
    const def = getWeeklyQuest(seed);
    const oldSeed = questDateKey(source.dateSeed);
    const existing = oldSeed === seed && source.weeklyQuest && source.weeklyQuest.id === (def && def.id)
      ? source.weeklyQuest
      : null;
    return {
      version: GOAL_VERSION,
      dateSeed: seed,
      claimedMilestones: cleanClaimedMilestones(source),
      weeklyQuest: def ? cloneQuest(def, existing) : null,
    };
  }

  function collectionSummary(collection) {
    const unique = new Set();
    const foil = new Set();
    if (collection && typeof collection === "object" && !Array.isArray(collection)) {
      for (const [rawKey, rawCount] of Object.entries(collection)) {
        const count = Number(rawCount);
        if (!Number.isFinite(count) || count <= 0) continue;
        const key = String(rawKey || "");
        if (!key) continue;
        if (key.endsWith("#foil")) {
          const id = key.slice(0, -5);
          if (id) {
            unique.add(id);
            foil.add(id);
          }
        } else {
          unique.add(key);
        }
      }
    }
    return { unique: unique.size, foil: foil.size };
  }

  function milestoneProgress(def, summary) {
    if (!def || !summary) return 0;
    if (def.metric === "foil") return summary.foil || 0;
    return summary.unique || 0;
  }

  function listMilestones(goalState, collection) {
    const state = migrateGoals(goalState);
    const summary = collectionSummary(collection);
    return MILESTONE_DEFS.map((def) => {
      const progress = milestoneProgress(def, summary);
      return Object.assign({}, def, {
        progress,
        achieved: progress >= def.target,
        claimed: state.claimedMilestones.includes(def.id),
      });
    });
  }

  function claimMilestone(goalState, milestoneId, collection) {
    const state = migrateGoals(goalState);
    const def = MILESTONE_DEFS.find((item) => item.id === milestoneId);
    if (!def) return { ok: false, reason: "notFound", reward: 0, state };
    if (state.claimedMilestones.includes(def.id)) {
      return { ok: false, reason: "alreadyClaimed", reward: 0, state, milestone: def };
    }
    const summary = collectionSummary(collection);
    const progress = milestoneProgress(def, summary);
    if (progress < def.target) {
      return { ok: false, reason: "incomplete", reward: 0, state, milestone: Object.assign({}, def, { progress }) };
    }
    state.claimedMilestones = [...state.claimedMilestones, def.id];
    return {
      ok: true,
      reason: null,
      reward: def.reward,
      state,
      milestone: Object.assign({}, def, { progress, achieved: true, claimed: true }),
    };
  }

  function applyWeeklyQuestProgress(goalState, event) {
    const next = migrateGoals(goalState);
    const quest = next.weeklyQuest;
    if (!quest || quest.claimed) return next;
    const eventType = event && (event.questType || event.type);
    if (!questEventMatches(quest.type, eventType)) return next;
    const amountRaw = event && event.amount == null ? 1 : Number(event && event.amount);
    const amount = Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : 1;
    quest.progress = Math.min(quest.target, quest.progress + amount);
    return next;
  }

  function claimWeeklyQuest(goalState) {
    const next = migrateGoals(goalState);
    const quest = next.weeklyQuest;
    if (!quest) return { ok: false, reason: "notFound", reward: 0, state: next };
    if (quest.claimed) return { ok: false, reason: "alreadyClaimed", reward: 0, state: next, quest };
    if (quest.progress < quest.target) return { ok: false, reason: "incomplete", reward: 0, state: next, quest };
    quest.claimed = true;
    return { ok: true, reason: null, reward: quest.reward, state: next, quest };
  }

  function milestoneRewardTotal() {
    return MILESTONE_DEFS.reduce((sum, milestone) => sum + milestone.reward, 0);
  }

  function cloneCard(card) {
    return Object.assign({}, card, { keywords: Array.isArray(card.keywords) ? [...card.keywords] : [] });
  }

  function cardById(cardPool, id) {
    return (cardPool || []).find((card) => card && card.id === id) || null;
  }

  function collectionCount(collection, id) {
    if (!collection || typeof collection !== "object") return 0;
    const normal = Number(collection[id] || 0);
    const foil = Number(collection[id + "#foil"] || 0);
    return Math.max(0, Number.isFinite(normal) ? normal : 0) + Math.max(0, Number.isFinite(foil) ? foil : 0);
  }

  function countIds(ids) {
    const counts = Object.create(null);
    for (const id of ids || []) counts[id] = (counts[id] || 0) + 1;
    return counts;
  }

  function validateDeck(deckCardIds, collection, cardPool) {
    const ids = Array.isArray(deckCardIds) ? deckCardIds.filter((id) => typeof id === "string") : [];
    const errors = [];
    if (ids.length !== DECK_SIZE) errors.push(`牌組必須剛好 ${DECK_SIZE} 張（目前 ${ids.length} 張）。`);

    const counts = countIds(ids);
    for (const [id, count] of Object.entries(counts)) {
      const card = cardById(cardPool, id);
      if (!card) {
        errors.push(`未知卡牌「${id}」不能放入牌組。`);
        continue;
      }
      const owned = collectionCount(collection, id);
      if (owned <= 0) errors.push(`未擁有「${card.name}」，不能放入牌組。`);
      else if (count > owned) errors.push(`「${card.name}」只有 ${owned} 張，牌組放了 ${count} 張。`);
      if (card.rarity === "legendary" && count > 1) errors.push(`傳說卡「${card.name}」最多只能放 1 張。`);
      else if (count > 2) errors.push(`「${card.name}」最多只能放 2 張。`);
    }
    return { ok: errors.length === 0, errors };
  }

  function buildBattleDeck(deckCardIds, cardPool, rng, collection) {
    const deck = [];
    const usedById = Object.create(null);
    for (const id of Array.isArray(deckCardIds) ? deckCardIds : []) {
      const card = cardById(cardPool, id);
      if (card) {
        const copy = cloneCard(card);
        if (collection && typeof collection === "object") {
          const used = usedById[id] || 0;
          const normal = Math.max(0, Number.isFinite(Number(collection[id] || 0)) ? Number(collection[id] || 0) : 0);
          const foil = Math.max(0, Number.isFinite(Number(collection[id + "#foil"] || 0)) ? Number(collection[id + "#foil"] || 0) : 0);
          copy.foil = used >= normal && used < normal + foil;
          usedById[id] = used + 1;
        }
        deck.push(copy);
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(nextRandom(rng) * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function ok(events, extra) {
    return Object.assign({ ok: true, reason: null, events: events || [] }, extra || {});
  }

  function fail(reason, events, extra) {
    return Object.assign({ ok: false, reason, events: events || [] }, extra || {});
  }

  function nextRandom(rng) {
    const value = typeof rng === "function" ? Number(rng()) : 0;
    if (!Number.isFinite(value)) return 0;
    return Math.abs(value % 1);
  }

  function makeUid(rng, prefix) {
    return (prefix || "c") + nextRandom(rng).toString(36).slice(2, 9).padEnd(7, "0");
  }

  function keywords(card) {
    return Array.isArray(card && card.keywords) ? card.keywords : [];
  }

  function hasKeyword(card, keyword) {
    return keywords(card).includes(keyword);
  }

  function sideKeyOf(state, sideOrKey) {
    if (sideOrKey === "enemy" || sideOrKey === "player") return sideOrKey;
    if (sideOrKey && sideOrKey.side) return sideOrKey.side;
    if (state && sideOrKey === state.enemy) return "enemy";
    return "player";
  }

  function getSide(state, sideOrKey) {
    return sideKeyOf(state, sideOrKey) === "enemy" ? state.enemy : state.player;
  }

  function opponentKey(sideKey) {
    return sideKey === "enemy" ? "player" : "enemy";
  }

  function getOpponent(state, sideOrKey) {
    return getSide(state, opponentKey(sideKeyOf(state, sideOrKey)));
  }

  function allMinions(state) {
    return [
      ...(state.player && state.player.field ? state.player.field : []),
      ...(state.enemy && state.enemy.field ? state.enemy.field : []),
    ];
  }

  function findMinion(state, uid) {
    return allMinions(state).find((m) => m.uid === uid) || null;
  }

  function hasTaunt(field) {
    return (field || []).some((m) => hasKeyword(m, "taunt"));
  }

  function isLegalTarget(defenderSide, target) {
    if (!target) return false;
    if (!hasTaunt(defenderSide.field)) return true;
    return hasKeyword(target, "taunt");
  }

  function healHero(side, amount, events) {
    const before = side.hp;
    side.hp = Math.min(side.maxHp || START_HP, side.hp + amount);
    if (events) events.push({ type: "heroHeal", side: side.side, amount: side.hp - before });
  }

  function addShield(minion, events) {
    minion.shield = true;
    if (events) events.push({ type: "shieldGain", uid: minion.uid });
  }

  function polymorph(minion, events) {
    minion.name = "綿羊";
    minion.attack = 1;
    minion.health = 1;
    minion.maxHealth = 1;
    minion.emoji = "🐑";
    minion.image = null;
    minion.keywords = [];
    minion.shield = false;
    if (events) events.push({ type: "polymorph", uid: minion.uid });
  }

  function summonCard(side, card, rng, events, reason) {
    if (!side || !card) return false;
    if (side.field.length >= MAX_FIELD) {
      if (events) events.push({ type: "summonBlocked", side: side.side, name: card.name, reason: "fieldFull" });
      return false;
    }
    if (card.maxHealth == null) card.maxHealth = card.health;
    if (!card.uid) card.uid = makeUid(rng, "c");
    side.field.push(card);
    if (events) events.push({ type: "minionSummoned", side: side.side, uid: card.uid, name: card.name, reason: reason || "play" });
    return true;
  }

  function makeToken(name, attack, health, emoji) {
    return {
      id: "token",
      name,
      type: CARD_TYPE.MINION,
      rarity: "common",
      cost: 0,
      attack,
      health,
      maxHealth: health,
      emoji,
      image: null,
      keywords: [],
      foil: false,
    };
  }

  function applyDamageToMinion(minion, amount, source, events) {
    if (!minion || amount <= 0) return 0;
    if (minion.shield) {
      minion.shield = false;
      if (events) events.push({ type: "shieldBreak", uid: minion.uid });
      return 0;
    }
    minion.health -= amount;
    if (events) events.push({ type: "damage", uid: minion.uid, amount });
    if (source && hasKeyword(source, "poison") && amount > 0 && minion.health > 0) {
      minion.health = 0;
      if (events) events.push({ type: "poison", uid: minion.uid });
    }
    return amount;
  }

  function applyLifesteal(source, sourceSide, amount, events) {
    if (!source || !sourceSide || amount <= 0 || !hasKeyword(source, "lifesteal")) return;
    healHero(sourceSide, amount, events);
    if (events) events.push({ type: "lifesteal", side: sourceSide.side, uid: source.uid, amount });
  }

  function applyAbility(state, side, trigger, target, dyingCard, rng, events) {
    if (!trigger) return;
    if (events) events.push({ type: "ability", side: side.side, trigger, uid: dyingCard && dyingCard.uid, targetUid: target && target.uid });
    if (trigger === "healHero2") {
      healHero(side, 2, events);
    } else if (trigger === "damageAny1") {
      if (target) {
        const dealt = applyDamageToMinion(target, 1, null, events);
        applyLifesteal(dyingCard, side, dealt, events);
        cleanupBoth(state, rng, events);
      }
    } else if (trigger === "aoeEnemy2") {
      const foe = getOpponent(state, side);
      for (const minion of [...foe.field]) applyDamageToMinion(minion, 2, null, events);
      cleanupBoth(state, rng, events);
    } else if (trigger === "summonSkeleton") {
      summonCard(side, makeToken("骷髏", 2, 2, "☠️"), rng, events, "deathrattle");
    } else if (trigger === "rebirth") {
      summonCard(side, makeToken("浴火鳳凰", 5, 1, "🔥"), rng, events, "deathrattle");
    }
  }

  function cleanupSide(state, side, rng, events) {
    if (!side || !Array.isArray(side.field)) return;
    const dying = side.field.filter((m) => m.health <= 0);
    if (dying.length === 0) return;
    side.field = side.field.filter((m) => m.health > 0);
    for (const minion of dying) {
      if (events) events.push({ type: "dying", side: side.side, uid: minion.uid, name: minion.name });
      if (hasKeyword(minion, "deathrattle") && minion.trigger) {
        if (events) events.push({ type: "deathrattle", side: side.side, uid: minion.uid, trigger: minion.trigger });
        applyAbility(state, side, minion.trigger, null, minion, rng, events);
      }
    }
  }

  function cleanupBoth(state, rng, events) {
    cleanupSide(state, state.player, rng, events);
    cleanupSide(state, state.enemy, rng, events);
  }

  function cleanupField(state, action, rng) {
    const events = [];
    if (action && action.side) cleanupSide(state, getSide(state, action.side), rng, events);
    else cleanupBoth(state, rng, events);
    return ok(events);
  }

  function targetPoolForNeed(state, sideKey, need) {
    if (need === "enemyMinion") return getOpponent(state, sideKey).field;
    if (need === "friendlyMinion") return getSide(state, sideKey).field;
    return [];
  }

  function findSpellTarget(state, sideKey, need, targetUid) {
    return targetPoolForNeed(state, sideKey, need).find((m) => m.uid === targetUid) || null;
  }

  function applySpellEffect(state, sideKey, effect, target, rng, events) {
    const side = getSide(state, sideKey);
    const foe = getOpponent(state, sideKey);
    if (effect === "damage3") {
      applyDamageToMinion(target, 3, null, events);
      cleanupBoth(state, rng, events);
    } else if (effect === "damage8") {
      applyDamageToMinion(target, 8, null, events);
      cleanupBoth(state, rng, events);
    } else if (effect === "heal5") {
      healHero(side, 5, events);
    } else if (effect === "aoe1") {
      for (const minion of [...foe.field]) applyDamageToMinion(minion, 1, null, events);
      cleanupBoth(state, rng, events);
    } else if (effect === "aoe2") {
      for (const minion of [...foe.field]) applyDamageToMinion(minion, 2, null, events);
      cleanupBoth(state, rng, events);
    } else if (effect === "mana2") {
      side.mana += 2;
      events.push({ type: "manaGain", side: side.side, amount: 2 });
    } else if (effect === "giveShield") {
      addShield(target, events);
    } else if (effect === "polymorph") {
      polymorph(target, events);
    }
  }

  function burnMulligan(state, events) {
    const wasAvailable = !state.mulliganUsed;
    state.mulliganUsed = true;
    if (wasAvailable && events) events.push({ type: "mulliganBurned" });
  }

  function registerCombo(state, uid, events) {
    state.comboCount = (state.comboCount || 0) + 1;
    if (events) events.push({ type: "combo", uid, count: state.comboCount });
  }

  function commitCardFromHand(side, index) {
    return side.hand.splice(index, 1)[0];
  }

  function pickBattlecryTarget(state, sideKey, trigger) {
    if (trigger === "damageAny1") {
      const foe = getOpponent(state, sideKey);
      return [...foe.field].sort((a, b) => a.health - b.health)[0] || null;
    }
    return null;
  }

  function playCard(state, action, rng) {
    const events = [];
    const sideKey = action && action.side ? action.side : "player";
    const side = getSide(state, sideKey);
    if (!action || !action.cardUid) return fail("missingCardUid", events);
    if (state.over && !action.ignoreOver) return fail("gameOver", events);
    if (state.turn && state.turn !== sideKey && !action.ignoreTurn) return fail("notYourTurn", events);

    if (state.pendingSpell && action.handlePending !== false) {
      const wasSame = state.pendingSpell.uid === action.cardUid;
      state.pendingSpell = null;
      events.push({ type: "pendingCancelled", uid: action.cardUid, wasSame });
      if (wasSame) return fail("pendingCancelledSame", events);
    }

    const index = side.hand.findIndex((c) => c.uid === action.cardUid);
    if (index === -1) return fail("cardNotFound", events);
    const card = side.hand[index];
    if (card.cost > side.mana) return fail("insufficientMana", events, { card });

    if (card.type === CARD_TYPE.SPELL) {
      const spec = SPELL_EFFECTS[card.effect] || { needsTarget: null };
      if (spec.needsTarget && !action.targetUid) {
        const pool = targetPoolForNeed(state, sideKey, spec.needsTarget);
        if (pool.length === 0) return fail("noTarget", events, { card, need: spec.needsTarget });
        state.pendingSpell = { uid: card.uid, need: spec.needsTarget, side: sideKey };
        events.push({ type: "spellPending", uid: card.uid, need: spec.needsTarget, effect: card.effect });
        return ok(events, { card });
      }
      const target = spec.needsTarget ? findSpellTarget(state, sideKey, spec.needsTarget, action.targetUid) : null;
      if (spec.needsTarget && !target) return fail("targetNotFound", events, { card, need: spec.needsTarget });
      side.mana -= card.cost;
      commitCardFromHand(side, index);
      if (action.burnMulligan !== false) burnMulligan(state, events);
      if (action.trackCombo !== false) registerCombo(state, card.uid, events);
      events.push({ type: "spellCast", side: side.side, uid: card.uid, effect: card.effect, targetUid: target && target.uid });
      applySpellEffect(state, sideKey, card.effect, target, rng, events);
      return ok(events, { card, target });
    }

    if (side.field.length >= MAX_FIELD) return fail("fieldFull", events, { card });
    side.mana -= card.cost;
    commitCardFromHand(side, index);
    if (action.burnMulligan !== false) burnMulligan(state, events);
    if (action.trackCombo !== false) registerCombo(state, card.uid, events);
    card.canAttack = hasKeyword(card, "charge") || hasKeyword(card, "rush");
    card.justPlayed = true;
    if (hasKeyword(card, "divineshield")) card.shield = true;
    summonCard(side, card, rng, events, "play");
    if (hasKeyword(card, "rush") && !hasKeyword(card, "charge")) {
      events.push({ type: "rushReady", side: side.side, uid: card.uid });
    }

    if (hasKeyword(card, "battlecry") && card.trigger) {
      const target = pickBattlecryTarget(state, sideKey, card.trigger);
      events.push({ type: "battlecry", side: side.side, uid: card.uid, trigger: card.trigger, targetUid: target && target.uid });
      applyAbility(state, side, card.trigger, target, card, rng, events);
    }
    return ok(events, { card });
  }

  function resolveTarget(state, action, rng) {
    const events = [];
    if (action && action.mode === "attack") {
      const defender = getSide(state, action.defenderSide || opponentKey(action.attackerSide || "player"));
      const target = defender.field.find((m) => m.uid === action.targetUid) || null;
      return isLegalTarget(defender, target) ? ok(events, { target }) : fail("illegalTarget", events, { target });
    }

    const pending = state.pendingSpell;
    if (!pending) return fail("noPendingSpell", events);
    const sideKey = pending.side || (action && action.side) || "player";
    const side = getSide(state, sideKey);
    const index = side.hand.findIndex((c) => c.uid === pending.uid);
    if (index === -1) {
      state.pendingSpell = null;
      events.push({ type: "pendingMissing", uid: pending.uid });
      return fail("cardNotFound", events);
    }
    const card = side.hand[index];
    const spec = SPELL_EFFECTS[card.effect] || { needsTarget: null };
    if (spec.needsTarget !== pending.need) {
      state.pendingSpell = null;
      events.push({ type: "pendingInvalid", uid: pending.uid });
      return fail("pendingInvalid", events, { card });
    }
    const target = findSpellTarget(state, sideKey, pending.need, action && action.targetUid);
    if (!target) return fail("targetNotFound", events, { card, need: pending.need });
    if (card.cost > side.mana) {
      state.pendingSpell = null;
      events.push({ type: "pendingCancelled", uid: pending.uid, wasSame: false });
      return fail("insufficientMana", events, { card });
    }
    side.mana -= card.cost;
    commitCardFromHand(side, index);
    burnMulligan(state, events);
    registerCombo(state, card.uid, events);
    state.pendingSpell = null;
    events.push({ type: "spellCast", side: side.side, uid: card.uid, effect: card.effect, targetUid: target.uid });
    applySpellEffect(state, sideKey, card.effect, target, rng, events);
    return ok(events, { card, target });
  }

  function spendAttack(attacker, events) {
    if (hasKeyword(attacker, "windfury") && !attacker._windUsed) {
      attacker._windUsed = true;
      if (events) events.push({ type: "windfuryReady", uid: attacker.uid });
    } else {
      attacker.canAttack = false;
      attacker._windUsed = false;
      if (events) events.push({ type: "attackSpent", uid: attacker.uid });
    }
  }

  function resolveAttack(state, action, rng) {
    const events = [];
    const attackerSideKey = action && action.attackerSide ? action.attackerSide : "player";
    const attackerSide = getSide(state, attackerSideKey);
    const defenderSide = getSide(state, action && action.defenderSide ? action.defenderSide : opponentKey(attackerSideKey));
    const attacker = attackerSide.field.find((m) => m.uid === action.attackerUid) || null;
    const defender = defenderSide.field.find((m) => m.uid === action.defenderUid) || null;
    if (!attacker || !defender) return fail("targetNotFound", events, { attacker, defender });
    if (!action.ignoreCanAttack && !attacker.canAttack) return fail("cannotAttack", events, { attacker, defender });
    if (!action.ignoreTaunt && !isLegalTarget(defenderSide, defender)) return fail("illegalTarget", events, { attacker, defender });

    events.push({ type: "attack", attackerSide: attackerSide.side, attackerUid: attacker.uid, defenderUid: defender.uid });
    const attackDamage = applyDamageToMinion(defender, attacker.attack, attacker, events);
    applyLifesteal(attacker, attackerSide, attackDamage, events);
    if (defender.attack > 0) {
      const counterDamage = applyDamageToMinion(attacker, defender.attack, defender, events);
      applyLifesteal(defender, defenderSide, counterDamage, events);
    }
    spendAttack(attacker, events);
    cleanupBoth(state, rng, events);
    return ok(events, { attacker, defender });
  }

  function resolveHeroAttack(state, action, rng) {
    const events = [];
    const attackerSideKey = action && action.attackerSide ? action.attackerSide : "player";
    const defenderSideKey = action && action.defenderSide ? action.defenderSide : opponentKey(attackerSideKey);
    const attackerSide = getSide(state, attackerSideKey);
    const defenderSide = getSide(state, defenderSideKey);
    const attacker = attackerSide.field.find((m) => m.uid === action.attackerUid) || null;
    if (!attacker) return fail("targetNotFound", events, { attacker });
    if (!action.ignoreCanAttack && !attacker.canAttack) return fail("cannotAttack", events, { attacker });
    if (!action.ignoreRush && attacker.justPlayed && hasKeyword(attacker, "rush") && !hasKeyword(attacker, "charge")) {
      return fail("rushBlocksHero", events, { attacker });
    }
    if (!action.ignoreTaunt && hasTaunt(defenderSide.field)) return fail("tauntBlocksHero", events, { attacker });
    defenderSide.hp -= attacker.attack;
    events.push({ type: "heroDamage", attackerSide: attackerSide.side, defenderSide: defenderSide.side, attackerUid: attacker.uid, amount: attacker.attack });
    applyLifesteal(attacker, attackerSide, attacker.attack, events);
    spendAttack(attacker, events);
    return ok(events, { attacker });
  }

  function drawCardInternal(side, rng, events) {
    if (!side || side.deck.length === 0) return null;
    if (side.hand.length >= HAND_LIMIT) {
      const burned = side.deck.pop();
      if (events) events.push({ type: "handBurn", side: side.side, cardId: burned && burned.id });
      return null;
    }
    const card = side.deck.pop();
    if (!card.uid) card.uid = makeUid(rng, "c");
    card.maxHealth = card.health;
    side.hand.push(card);
    if (events) events.push({ type: "draw", side: side.side, uid: card.uid, cardId: card.id });
    return card;
  }

  function drawCard(state, action, rng) {
    const events = [];
    const card = drawCardInternal(getSide(state, action && action.side), rng, events);
    return ok(events, { card });
  }

  function resetAttack(side, events) {
    for (const minion of side.field) {
      minion.canAttack = true;
      minion.justPlayed = false;
      minion._windUsed = false;
      if (events) events.push({ type: "attackReady", side: side.side, uid: minion.uid });
    }
  }

  function regenerateSide(side, events) {
    for (const minion of side.field) {
      if (hasKeyword(minion, "regenerate") && minion.health < minion.maxHealth) {
        minion.health = minion.maxHealth;
        if (events) events.push({ type: "regen", side: side.side, uid: minion.uid });
      }
    }
  }

  function regenerateField(state, action) {
    const events = [];
    regenerateSide(getSide(state, action && action.side), events);
    return ok(events);
  }

  function advanceTurn(state, action, rng) {
    const events = [];
    const phase = action && action.phase;
    if (phase === "endPlayer") {
      burnMulligan(state, events);
      state.selected = null;
      state.pendingSpell = null;
      state.comboCount = 0;
      regenerateSide(state.player, events);
      state.turn = "enemy";
      events.push({ type: "turnChanged", turn: "enemy" });
    } else if (phase === "startEnemy") {
      const enemy = state.enemy;
      enemy.manaMax = Math.min(MAX_MANA, enemy.manaMax + 1);
      enemy.mana = enemy.manaMax;
      drawCardInternal(enemy, rng, events);
      resetAttack(enemy, events);
    } else if (phase === "endEnemy") {
      regenerateSide(state.enemy, events);
      state.turn = "player";
      state.player.manaMax = Math.min(MAX_MANA, state.player.manaMax + 1);
      state.player.mana = state.player.manaMax;
      drawCardInternal(state.player, rng, events);
      resetAttack(state.player, events);
      events.push({ type: "turnChanged", turn: "player" });
    } else {
      return fail("unknownTurnPhase", events);
    }
    return ok(events);
  }

  function castSpellEffect(state, action, rng) {
    const events = [];
    const sideKey = action && action.side ? action.side : "player";
    const spec = SPELL_EFFECTS[action.effect] || { needsTarget: null };
    const target = spec.needsTarget ? findSpellTarget(state, sideKey, spec.needsTarget, action.targetUid) : null;
    if (spec.needsTarget && !target) return fail("targetNotFound", events);
    applySpellEffect(state, sideKey, action.effect, target, rng, events);
    return ok(events, { target });
  }

  function triggerAbility(state, action, rng) {
    const events = [];
    const sideKey = action && action.side ? action.side : "player";
    const side = getSide(state, sideKey);
    const target = action && action.targetUid ? findMinion(state, action.targetUid) : null;
    const source = action && action.sourceUid ? findMinion(state, action.sourceUid) : null;
    applyAbility(state, side, action && action.trigger, target, source, rng, events);
    return ok(events, { target, source });
  }

  function applyDamage(state, action, rng) {
    const events = [];
    const target = findMinion(state, action && action.targetUid);
    const source = action && action.sourceUid ? findMinion(state, action.sourceUid) : null;
    if (!target) return fail("targetNotFound", events);
    applyDamageToMinion(target, action.amount || 0, source, events);
    if (action && action.cleanup) cleanupBoth(state, rng, events);
    return ok(events, { target, source });
  }

  function dealDamageToMinion(state, action, rng) {
    const res = applyDamage(state, Object.assign({}, action, { cleanup: true }), rng);
    return res;
  }

  function aoe(state, action, rng) {
    const events = [];
    const side = getSide(state, action && action.side);
    for (const minion of [...side.field]) applyDamageToMinion(minion, action.amount || 0, null, events);
    cleanupBoth(state, rng, events);
    return ok(events);
  }

  function summon(state, action, rng) {
    const events = [];
    const summoned = summonCard(getSide(state, action && action.side), action && action.card, rng, events, action && action.reason);
    return summoned ? ok(events, { card: action.card }) : fail("fieldFull", events, { card: action && action.card });
  }

  return {
    MAX_MANA,
    START_HP,
    MAX_FIELD,
    HAND_LIMIT,
    STATS_VERSION,
    STATS_DEFAULT,
    DDA_MIN_LEVEL,
    DDA_MAX_LEVEL,
    DDA_DEFAULT,
    DECK_VERSION,
    DECK_SIZE,
    DECK_DEFAULT,
    QUEST_VERSION,
    QUEST_POOL,
    GOAL_VERSION,
    MILESTONE_DEFS,
    WEEKLY_QUEST_POOL,
    CARD_TYPE,
    SPELL_EFFECTS,
    migrateStats,
    migrateDda,
    ddaProfile,
    nextDdaState,
    protectSave,
    migrateDeck,
    migrateQuests,
    getDailyQuests,
    applyQuestProgress,
    claimQuest,
    migrateGoals,
    getWeeklyQuest,
    collectionSummary,
    listMilestones,
    claimMilestone,
    applyWeeklyQuestProgress,
    claimWeeklyQuest,
    milestoneRewardTotal,
    validateDeck,
    buildBattleDeck,
    hasTaunt,
    isLegalTarget,
    playCard,
    resolveTarget,
    resolveAttack,
    resolveHeroAttack,
    advanceTurn,
    cleanupField,
    drawCard,
    regenerateField,
    castSpellEffect,
    triggerAbility,
    applyDamage,
    dealDamageToMinion,
    aoe,
    summon,
    healHero,
    addShield,
    polymorph,
  };
});
