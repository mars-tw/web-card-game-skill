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
  const CHRONICLE_VERSION = 1;
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
    Object.freeze({ id: "trigger_frenzy_3", type: "frenzy", title: "觸發 3 次狂怒", target: 3, reward: 35 }),
    Object.freeze({ id: "empower_minion_3", type: "buffTarget", title: "強化 3 個友方隨從", target: 3, reward: 30 }),
    Object.freeze({ id: "cast_spell_6", type: "playSpell", title: "打出 6 張法術", target: 6, reward: 35 }),
  ]);

  const MILESTONE_DEFS = Object.freeze([
    Object.freeze({ id: "unique_10", metric: "unique", target: 10, title: "收藏 10 種卡牌", reward: 40 }),
    Object.freeze({ id: "unique_20", metric: "unique", target: 20, title: "收藏 20 種卡牌", reward: 60 }),
    Object.freeze({ id: "unique_40", metric: "unique", target: 40, title: "收藏 40 種卡牌", reward: 80 }),
    Object.freeze({ id: "unique_55", metric: "unique", target: 55, title: "收藏 55 種卡牌", reward: 20 }),
    Object.freeze({ id: "foil_5", metric: "foil", target: 5, title: "收藏 5 張閃卡", reward: 40 }),
    Object.freeze({ id: "foil_15", metric: "foil", target: 15, title: "收藏 15 張閃卡", reward: 60 }),
    Object.freeze({ id: "tide_3", metric: "tide", target: 3, title: "收藏 3 張潮印", reward: 0 }),
  ]);
  const CHRONICLE_CHAPTERS = Object.freeze([
    Object.freeze({
      id: "prologue_white_tide",
      title: "序章：白潮未退",
      faction: "wardens",
      unlock: Object.freeze({ metric: "wins", value: 0 }),
      epigraph: "白潮拍上城階時，守軍才知道海仍記得回家的路。",
      body: Object.freeze([
        "白潮王城立在永冬邊緣，北牆之外是霜原，南門之內是仍願意點燈的人。古時候，奧術典藏塔以星軌與潮汐維持寒暖平衡，讓海霧每年一次翻過城垛，替石縫洗去霜鹽，也替人們留下春天會回來的證據。",
        "後來白潮遲到了。先是港口結冰，接著鐘樓的銅舌被霜咬住，最後連士兵的影子都比本人更冷。城民仍稱它為王城，因為只要城名不改，就好像世界尚未承認自己正在後退。",
      ]),
      featured: Object.freeze(["footman", "watchtowerBowman", "oathbannerHerald"]),
      reward: 20,
    }),
    Object.freeze({
      id: "chapter_king_jailer",
      title: "第一章：吞冬之王",
      faction: "wintershadow",
      unlock: Object.freeze({ metric: "wins", value: 1 }),
      epigraph: "有人說他墮落，有人說他只是把門關得太久。",
      body: Object.freeze([
        "霜縛暴君曾是守城之王。更古老的寒冬自北方裂谷醒來時，他沒有選擇逃亡，而是把整個冬天吞進體內，將自己鑄成牢門、鑰匙與獄卒。他擋住了第一場滅族風暴，也從此無法再分辨囚犯與被保護的人。",
        "當他率霜鋒軍團南下，旗幟上沒有征服的字句，只有被冰封的王徽。老兵看見那面旗時會脫帽，然後重新握緊武器；他們知道來者不是外敵，而是一個曾經替他們承受太多寒冷的名字。",
      ]),
      featured: Object.freeze(["frostboundTyrant", "glaciarchWarden", "frostfangDire"]),
      reward: 30,
    }),
    Object.freeze({
      id: "chapter_archival_balance",
      title: "第二章：典藏塔的天秤",
      faction: "conclave",
      unlock: Object.freeze({ metric: "unique", value: 12 }),
      epigraph: "每一本書都很輕，直到有人把王國放在同一側。",
      body: Object.freeze([
        "奧術結社守著典藏塔的七百二十一層階梯，也守著不被勝利沖昏頭的學問。塔頂的觀星井能看見潮汐下方的魔脈，塔底的禁書庫則鎖著所有曾讓帝國太快強盛、又太快毀滅的答案。",
        "當白潮不再準時，結社內部第一次出現裂痕。有人主張打開禁頁，將冬天重新縫回北方；有人堅持若以秩序之名犧牲秩序，典藏塔就只剩一座漂亮的火藥庫。於是學徒們在夜裡抄寫咒式，也抄寫遺書。",
      ]),
      featured: Object.freeze(["archLoremaster", "runicScrivener", "tidecallerAdept"]),
      reward: 40,
    }),
    Object.freeze({
      id: "chapter_wild_oath",
      title: "第三章：荒野不立誓",
      faction: "wild",
      unlock: Object.freeze({ metric: "wins", value: 3 }),
      epigraph: "牠們不屬於王城，卻仍聽得見城門將裂的聲音。",
      body: Object.freeze([
        "荒野獸群從未向白潮王城低頭。狼群穿越舊邊界時不看旗幟，雷翼巨鵬盤旋在典藏塔上方也不是為了致敬。牠們相信活著就是奔跑、獵食、受傷後再站起來，沒有哪一本法典能替風決定方向。",
        "然而霜鋒軍團南下後，連最深的林徑也覆上不會融化的白霜。幼獸不再追逐月影，山谷裡的水聲像被掐住喉嚨。荒野於是選擇了牠們唯一承認的盟約：誰奪走自由，誰就是獵物。",
      ]),
      featured: Object.freeze(["emberpup", "thunderRoc", "frostReaver"]),
      reward: 50,
    }),
    Object.freeze({
      id: "chapter_bloodmoon_siege",
      title: "第四章：血月圍城",
      faction: "wintershadow",
      unlock: Object.freeze({ metric: "wins", value: 5 }),
      epigraph: "城牆可以擋住刀劍，卻很難擋住一個夜晚變長。",
      body: Object.freeze([
        "血月女王抵達時沒有攻城槌，只有一輪掛得太低的月。她以圍城絕望為食，將飢餓、疑心與未寄出的家書釀成暗紅酒液。白潮王城每熄一盞燈，她的裙襬便多出一層更柔軟的夜色。",
        "長夜伯爵夫人在城內傳遞夢魘，讓守軍看見家門已空、典藏塔已焚、荒野已跪。可望塔弓手仍在雪裡數更，晨曦大主教仍替陌生人祝禱。絕望最怕的不是勇者，而是有人明明害怕卻仍不肯離開。",
      ]),
      featured: Object.freeze(["bloodmoonQueen", "countessLongNight", "dawnArchbishop"]),
      reward: 60,
    }),
    Object.freeze({
      id: "chapter_supply_pages",
      title: "第五章：補給頁與空白處",
      faction: "conclave",
      unlock: Object.freeze({ metric: "unique", value: 22 }),
      epigraph: "有些援軍不是從路上抵達，而是從下一頁。",
      body: Object.freeze([
        "戰術徵調最初只是典藏塔的一份後勤表格，記錄糧車、藥草、弩弦與願意繼續守夜的人數。圍城第三十日，符文抄寫員發現那些空白欄位會自行浮出名字，像是王城尚未放棄的人在紙上排隊。",
        "補給隊遲到三天，卻總在最需要的那一頁準時抵達。有人得到一捆箭，有人得到母親的字條，有人只得到一句『再守一刻』。那一刻不長，卻足以讓白潮守軍把城門重新插上門閂。",
      ]),
      featured: Object.freeze(["tacticalRequisition", "runicScrivener", "watchtowerBowman"]),
      reward: 70,
    }),
    Object.freeze({
      id: "chapter_glacial_prison",
      title: "第六章：冰獄開門",
      faction: "wardens",
      unlock: Object.freeze({ metric: "wins", value: 8 }),
      epigraph: "當獄門開啟，囚犯與獄卒都聽見自己的名字。",
      body: Object.freeze([
        "冰獄看守站在霜縛暴君身前，像一面從極北推來的城牆。牠的盾上結著無數面孔，有敵人，也有曾被暴君保護的白潮子民。每一張臉都提醒守軍：他們對抗的不是單純惡意，而是一段被寒冬扭曲的舊恩。",
        "誓旗傳令在那天攀上破裂城垛，把白金戰旗插進冰縫。旗面沒有命令，只有四個被血與雪洗亮的字：仍在此地。於是城門後的孩子停止哭泣，典藏塔的鐘重新發聲，荒野的群獸也在遠方回應。",
      ]),
      featured: Object.freeze(["glaciarchWarden", "oathbannerHerald", "bastionColossus"]),
      reward: 90,
    }),
    Object.freeze({
      id: "finale_white_tide_returns",
      title: "終章：白潮回聲",
      faction: "wardens",
      unlock: Object.freeze({ metric: "finale", value: Object.freeze({ wins: 12, unique: 30 }) }),
      epigraph: "潮聲沒有承諾勝利，只承諾仍會回來。",
      body: Object.freeze([
        "終戰前夜，霜縛暴君走到王城北門，聽見自己體內的冬天第一次退潮。他終於明白吞下寒冬並沒有拯救族人，只是把每一個明天都鎖進同一間牢房。晨曦大主教向他伸手，沒有赦免，也沒有審判，只問他是否還記得白天長什麼樣子。",
        "白潮回來時並不壯闊，只是先融開一枚釘子，再推動一艘小船，最後讓城牆下的鹽花重新發亮。典藏塔沒有關閉禁書，荒野也沒有接受王令；他們只是學會在寒冬再臨時，把知識、利爪與盾牌放在同一面城牆上。",
      ]),
      featured: Object.freeze(["frostboundTyrant", "dawnArchbishop", "countessLongNight"]),
      reward: 120,
    }),
  ]);
  const WEEKLY_QUEST_POOL = Object.freeze([
    Object.freeze({ id: "weekly_win_3", type: "win", title: "本週勝利 3 場", target: 3, reward: 100 }),
    Object.freeze({ id: "weekly_open_pack_3", type: "openPack", title: "本週開啟 3 包", target: 3, reward: 80 }),
    Object.freeze({ id: "weekly_summon_30", type: "summonMinion", title: "本週召喚 30 個手下", target: 30, reward: 90 }),
    Object.freeze({ id: "weekly_damage_80", type: "heroDamage", title: "本週造成 80 點英雄傷害", target: 80, reward: 120 }),
    Object.freeze({ id: "weekly_spell_12", type: "playSpell", title: "本週打出 12 張法術", target: 12, reward: 100 }),
  ]);

  const SPELL_EFFECTS = Object.freeze({
    damage2: Object.freeze({ needsTarget: "enemyMinion" }),
    damage3: Object.freeze({ needsTarget: "enemyMinion" }),
    damage5: Object.freeze({ needsTarget: "enemyMinion" }),
    damage8: Object.freeze({ needsTarget: "enemyMinion" }),
    heal5: Object.freeze({ needsTarget: null }),
    aoe1: Object.freeze({ needsTarget: null }),
    aoe2: Object.freeze({ needsTarget: null }),
    mana2: Object.freeze({ needsTarget: null }),
    giveShield: Object.freeze({ needsTarget: "friendlyMinion" }),
    buffTarget: Object.freeze({ needsTarget: "friendlyMinion" }),
    polymorph: Object.freeze({ needsTarget: "enemyMinion" }),
    draw2: Object.freeze({ needsTarget: null }),
    nextSpellMinus1: Object.freeze({ needsTarget: null }),
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
    const tide = new Set();
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
        } else if (key.endsWith("#tide")) {
          const id = key.slice(0, -5);
          if (id) {
            unique.add(id);
            tide.add(id);
          }
        } else {
          unique.add(key);
        }
      }
    }
    return { unique: unique.size, foil: foil.size, tide: tide.size };
  }

  function milestoneProgress(def, summary) {
    if (!def || !summary) return 0;
    if (def.metric === "foil") return summary.foil || 0;
    if (def.metric === "tide") return summary.tide || 0;
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

  function chronicleIds() {
    return new Set(CHRONICLE_CHAPTERS.map((chapter) => chapter.id));
  }

  function migrateChronicle(raw) {
    let source = raw;
    if (typeof source === "string") {
      try { source = JSON.parse(source); }
      catch { source = null; }
    }
    if (!source || typeof source !== "object" || Array.isArray(source)) source = {};
    const known = chronicleIds();
    const claimedSource = Array.isArray(source.claimed) ? source.claimed
      : Array.isArray(source.claimedChapters) ? source.claimedChapters
      : [];
    return {
      version: CHRONICLE_VERSION,
      claimed: [...new Set(claimedSource.filter((id) => typeof id === "string" && known.has(id)))],
    };
  }

  function chronicleContext(stats, collection) {
    const migratedStats = migrateStats(stats);
    const summary = collectionSummary(collection);
    return {
      wins: Math.max(0, Math.floor(Number(migratedStats.wins) || 0)),
      unique: Math.max(0, Math.floor(Number(summary.unique) || 0)),
    };
  }

  function chapterUnlocked(chapter, ctx) {
    const context = ctx || { wins: 0, unique: 0 };
    const unlock = chapter && chapter.unlock ? chapter.unlock : {};
    const metric = unlock.metric;
    const value = unlock.value;
    if (metric === "wins") return (context.wins || 0) >= Math.max(0, Number(value) || 0);
    if (metric === "unique") return (context.unique || 0) >= Math.max(0, Number(value) || 0);
    if (metric === "finale") {
      const need = value && typeof value === "object" ? value : {};
      return (context.wins || 0) >= Math.max(0, Number(need.wins) || 0)
        && (context.unique || 0) >= Math.max(0, Number(need.unique) || 0);
    }
    return false;
  }

  function chronicleUnlockLabel(chapter) {
    const unlock = chapter && chapter.unlock ? chapter.unlock : {};
    if (unlock.metric === "wins") {
      const value = Math.max(0, Number(unlock.value) || 0);
      return value <= 0 ? "序章已解鎖" : `贏得 ${value} 場對戰解鎖`;
    }
    if (unlock.metric === "unique") return `收藏 ${Math.max(0, Number(unlock.value) || 0)} 種卡牌解鎖`;
    if (unlock.metric === "finale") {
      const need = unlock.value && typeof unlock.value === "object" ? unlock.value : {};
      return `贏得 ${Math.max(0, Number(need.wins) || 0)} 場且收藏 ${Math.max(0, Number(need.unique) || 0)} 種卡牌解鎖`;
    }
    return "尚未解鎖";
  }

  function listChapters(chronicleState, stats, collection) {
    const state = migrateChronicle(chronicleState);
    const ctx = chronicleContext(stats, collection);
    return CHRONICLE_CHAPTERS.map((chapter) => Object.assign({}, chapter, {
      unlocked: chapterUnlocked(chapter, ctx),
      claimed: state.claimed.includes(chapter.id),
      unlockLabel: chronicleUnlockLabel(chapter),
    }));
  }

  function claimChapter(chronicleState, chapterId, stats, collection) {
    const state = migrateChronicle(chronicleState);
    const chapter = listChapters(state, stats, collection).find((item) => item.id === chapterId);
    if (!chapter) return { ok: false, reason: "notFound", reward: 0, state };
    if (!chapter.unlocked) return { ok: false, reason: "locked", reward: 0, state, chapter };
    if (state.claimed.includes(chapter.id)) return { ok: false, reason: "alreadyClaimed", reward: 0, state, chapter };
    state.claimed = [...state.claimed, chapter.id];
    return { ok: true, reason: null, reward: chapter.reward || 0, state, chapter: Object.assign({}, chapter, { claimed: true }) };
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
    const tide = Number(collection[id + "#tide"] || 0);
    return Math.max(0, Number.isFinite(normal) ? normal : 0)
      + Math.max(0, Number.isFinite(foil) ? foil : 0)
      + Math.max(0, Number.isFinite(tide) ? tide : 0);
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
          const tide = Math.max(0, Number.isFinite(Number(collection[id + "#tide"] || 0)) ? Number(collection[id + "#tide"] || 0) : 0);
          copy.foil = used >= normal && used < normal + foil;
          copy.tide = used >= normal + foil && used < normal + foil + tide;
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

  function spellPower(side) {
    return (side && Array.isArray(side.field) ? side.field : []).reduce((sum, minion) => (
      sum + (hasKeyword(minion, "spellpower") ? 1 : 0)
    ), 0);
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

  function applyFatigue(side, events) {
    if (!side) return 0;
    const count = Math.max(0, Math.floor(Number(side.fatigue) || 0)) + 1;
    side.fatigue = count;
    side.hp -= count;
    if (events) events.push({ type: "fatigue", side: side.side, amount: count, count });
    return count;
  }

  function addShield(minion, events) {
    minion.shield = true;
    if (events) events.push({ type: "shieldGain", uid: minion.uid });
  }

  function silenceMinion(minion, events) {
    if (!minion) return false;
    minion.keywords = [];
    delete minion.trigger;
    minion.shield = false;
    delete minion._frenzyDone;
    if (events) events.push({ type: "silence", uid: minion.uid });
    return true;
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

  function buffMinion(minion, attack, health, side, events) {
    if (!minion) return;
    minion.attack += attack;
    minion.health += health;
    minion.maxHealth = (minion.maxHealth == null ? minion.health - health : minion.maxHealth) + health;
    if (events) events.push({ type: "buffTarget", side: side && side.side, uid: minion.uid, attack, health });
  }

  function buffAttackOnly(minion, attack, side, events, eventType) {
    if (!minion || !attack) return;
    minion.attack += attack;
    if (events) events.push({ type: eventType || "buffAttack", side: side && side.side, uid: minion.uid, attack });
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

  function mirrorRime(target, side, events) {
    if (!target || target.health <= 0 || !side || !Array.isArray(side.field)) return 0;
    const source = side.field
      .filter((minion) => minion !== target && minion.health > 0 && hasKeyword(minion, "taunt"))
      .sort((a, b) => (b.health - a.health) || ((b.maxHealth || b.health) - (a.maxHealth || a.health)))[0] || null;
    if (!source) {
      if (events) events.push({ type: "mirrorRime", side: side.side, uid: target.uid, sourceUid: null, amount: 0 });
      return 0;
    }
    const gain = Math.max(0, Math.min(3, source.health - target.health));
    if (gain > 0) {
      target.health += gain;
      target.maxHealth = (target.maxHealth == null ? target.health - gain : target.maxHealth) + gain;
    }
    if (events) events.push({ type: "mirrorRime", side: side.side, uid: target.uid, sourceUid: source.uid, amount: gain });
    return gain;
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
    if (minion.health > 0 && hasKeyword(minion, "frenzy") && !minion._frenzyDone) {
      minion.attack += 2;
      minion._frenzyDone = true;
      if (events) events.push({ type: "frenzy", uid: minion.uid });
    }
    return amount;
  }

  function applyLifesteal(source, sourceSide, amount, events) {
    if (!source || !sourceSide || amount <= 0 || !hasKeyword(source, "lifesteal")) return;
    healHero(sourceSide, amount, events);
    if (events) events.push({ type: "lifesteal", side: sourceSide.side, uid: source.uid, amount });
  }

  function applyAbility(state, side, trigger, target, dyingCard, rng, events, options) {
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
    } else if (trigger === "aoeEnemy1") {
      const foe = getOpponent(state, side);
      for (const minion of [...foe.field]) applyDamageToMinion(minion, 1, null, events);
      cleanupBoth(state, rng, events);
    } else if (trigger === "buffAdjacent1") {
      let targets = [];
      if (options && Array.isArray(options.adjacentTargets)) {
        targets = options.adjacentTargets.filter((minion) => minion && minion.health > 0 && side.field.includes(minion));
      } else {
        const index = side.field.indexOf(dyingCard);
        // Deathrattles pass pre-death adjacent targets. If the source is no longer in field,
        // do not fall through to field[-1]/field[0] and buff the wrong minion.
        if (index < 0) {
          if (events) events.push({ type: "buffAdjacentMiss", side: side.side, uid: dyingCard && dyingCard.uid });
          return;
        }
        targets = [side.field[index - 1], side.field[index + 1]].filter(Boolean);
      }
      for (const minion of targets) buffAttackOnly(minion, 1, side, events, "buffAdjacent1");
    } else if (trigger === "summonSkeleton") {
      summonCard(side, makeToken("骷髏", 2, 2, "☠️"), rng, events, "deathrattle");
    } else if (trigger === "rebirth") {
      summonCard(side, makeToken("浴火鳳凰", 5, 1, "🔥"), rng, events, "deathrattle");
    } else if (trigger === "summonTwo1_1") {
      summonCard(side, makeToken("灰鈴侍從", 1, 1, "🕯️"), rng, events, "deathrattle");
      summonCard(side, makeToken("灰鈴侍從", 1, 1, "🕯️"), rng, events, "deathrattle");
    } else if (trigger === "drawCard1") {
      drawCardInternal(side, rng, events);
    } else if (trigger === "silenceIfDamaged") {
      const foe = getOpponent(state, side);
      const damaged = [...foe.field]
        .filter((minion) => minion.health > 0 && minion.health < (minion.maxHealth == null ? minion.health : minion.maxHealth))
        .sort((a, b) => ((b.attack || 0) * 3 + (b.health || 0)) - ((a.attack || 0) * 3 + (a.health || 0)))[0] || null;
      if (damaged) silenceMinion(damaged, events);
    }
  }

  function cleanupSide(state, side, rng, events) {
    if (!side || !Array.isArray(side.field)) return;
    const dying = side.field
      .map((minion, index, field) => ({ minion, adjacentTargets: [field[index - 1], field[index + 1]].filter(Boolean) }))
      .filter((entry) => entry.minion.health <= 0);
    if (dying.length === 0) return;
    side.field = side.field.filter((m) => m.health > 0);
    for (const entry of dying) {
      const minion = entry.minion;
      if (events) events.push({ type: "dying", side: side.side, uid: minion.uid, name: minion.name });
      if (hasKeyword(minion, "deathrattle") && minion.trigger) {
        if (events) events.push({ type: "deathrattle", side: side.side, uid: minion.uid, trigger: minion.trigger });
        applyAbility(state, side, minion.trigger, null, minion, rng, events, { adjacentTargets: entry.adjacentTargets });
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

  function targetedDamageAmount(effect, card) {
    if (card && Number.isFinite(Number(card.baseDamage))) return Number(card.baseDamage);
    if (effect === "damage8") return 8;
    if (effect === "damage5") return 5;
    if (effect === "damage3") return 3;
    if (effect === "damage2") return 2;
    return 0;
  }

  function applyTargetedDamage(state, sideKey, effect, target, card, rng, events) {
    const side = getSide(state, sideKey);
    const sp = spellPower(side);
    let damage = targetedDamageAmount(effect, card);
    if (card && card.tauntBonusDamage && hasKeyword(target, "taunt")) damage += Number(card.tauntBonusDamage) || 0;
    applyDamageToMinion(target, damage + sp, null, events);
    cleanupBoth(state, rng, events);
  }

  function spellCost(side, card) {
    const base = Math.max(0, Number(card && card.cost) || 0);
    if (!card || card.type !== CARD_TYPE.SPELL) return base;
    const discount = Math.max(0, Math.floor(Number(side && side.nextSpellDiscount) || 0));
    return Math.max(0, base - discount);
  }

  function spendCardMana(side, card, events) {
    const cost = spellCost(side, card);
    side.mana -= cost;
    if (card && card.type === CARD_TYPE.SPELL && Math.max(0, Math.floor(Number(side.nextSpellDiscount) || 0)) > 0) {
      const used = Math.min(Math.max(0, Number(card.cost) || 0), Math.max(0, Math.floor(Number(side.nextSpellDiscount) || 0)));
      side.nextSpellDiscount = 0;
      if (used > 0 && events) events.push({ type: "spellDiscount", side: side.side, uid: card.uid, amount: used });
    }
    return cost;
  }

  function clearTurnSpellDiscount(side, events) {
    const amount = Math.max(0, Math.floor(Number(side && side.nextSpellDiscount) || 0));
    if (!side || amount <= 0) return;
    side.nextSpellDiscount = 0;
    if (events) events.push({ type: "spellDiscountExpired", side: side.side, amount });
  }

  function applySpellEffect(state, sideKey, effect, target, rng, events, card) {
    const side = getSide(state, sideKey);
    const foe = getOpponent(state, sideKey);
    const sp = spellPower(side);
    if (effect === "damage2") {
      applyTargetedDamage(state, sideKey, effect, target, card, rng, events);
    } else if (effect === "damage3") {
      applyTargetedDamage(state, sideKey, effect, target, card, rng, events);
    } else if (effect === "damage5") {
      applyTargetedDamage(state, sideKey, effect, target, card, rng, events);
    } else if (effect === "damage8") {
      applyTargetedDamage(state, sideKey, effect, target, card, rng, events);
    } else if (effect === "heal5") {
      healHero(side, 5, events);
    } else if (effect === "aoe1") {
      for (const minion of [...foe.field]) applyDamageToMinion(minion, 1 + sp, null, events);
      cleanupBoth(state, rng, events);
    } else if (effect === "aoe2") {
      for (const minion of [...foe.field]) applyDamageToMinion(minion, 2 + sp, null, events);
      cleanupBoth(state, rng, events);
    } else if (effect === "mana2") {
      side.mana += 2;
      events.push({ type: "manaGain", side: side.side, amount: 2 });
    } else if (effect === "giveShield") {
      addShield(target, events);
    } else if (effect === "buffTarget") {
      if (card && card.mirrorRime) mirrorRime(target, side, events);
      else buffMinion(target, 2, 2, side, events);
    } else if (effect === "polymorph") {
      if (card && card.silenceOnly) silenceMinion(target, events);
      else polymorph(target, events);
    } else if (effect === "draw2") {
      drawCardInternal(side, rng, events);
      drawCardInternal(side, rng, events);
    } else if (effect === "nextSpellMinus1") {
      foe.hp -= 2;
      if (events) events.push({ type: "heroDamage", attackerSide: side.side, defenderSide: foe.side, amount: 2 });
      side.nextSpellDiscount = Math.max(1, Math.floor(Number(side.nextSpellDiscount) || 0));
      if (events) events.push({ type: "nextSpellDiscount", side: side.side, amount: 1 });
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
    if (spellCost(side, card) > side.mana) return fail("insufficientMana", events, { card });

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
      spendCardMana(side, card, events);
      commitCardFromHand(side, index);
      if (action.burnMulligan !== false) burnMulligan(state, events);
      if (action.trackCombo !== false) registerCombo(state, card.uid, events);
      events.push({ type: "spellCast", side: side.side, uid: card.uid, effect: card.effect, targetUid: target && target.uid });
      applySpellEffect(state, sideKey, card.effect, target, rng, events, card);
      return ok(events, { card, target });
    }

    if (side.field.length >= MAX_FIELD) return fail("fieldFull", events, { card });
    spendCardMana(side, card, events);
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
    if (spellCost(side, card) > side.mana) {
      state.pendingSpell = null;
      events.push({ type: "pendingCancelled", uid: pending.uid, wasSame: false });
      return fail("insufficientMana", events, { card });
    }
    spendCardMana(side, card, events);
    commitCardFromHand(side, index);
    burnMulligan(state, events);
    registerCombo(state, card.uid, events);
    state.pendingSpell = null;
    events.push({ type: "spellCast", side: side.side, uid: card.uid, effect: card.effect, targetUid: target.uid });
    applySpellEffect(state, sideKey, card.effect, target, rng, events, card);
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
    if (!side) return null;
    if (!Array.isArray(side.deck) || side.deck.length === 0) {
      applyFatigue(side, events);
      return null;
    }
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
      clearTurnSpellDiscount(state.player, events);
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
      clearTurnSpellDiscount(state.enemy, events);
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
    applySpellEffect(state, sideKey, action.effect, target, rng, events, action && action.card);
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
    CHRONICLE_VERSION,
    CHRONICLE_CHAPTERS,
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
    migrateChronicle,
    chronicleContext,
    chapterUnlocked,
    listChapters,
    claimChapter,
    applyWeeklyQuestProgress,
    claimWeeklyQuest,
    milestoneRewardTotal,
    validateDeck,
    buildBattleDeck,
    spellPower,
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
    silenceMinion,
    polymorph,
  };
});
