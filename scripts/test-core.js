/* =========================================================================
 * test-core.js - core.js 純規則層單元測試
 * 執行：node scripts/test-core.js
 * ========================================================================= */

const path = require("path");
const Core = require(path.join(__dirname, "..", "templates", "card-battle", "core.js"));

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log("PASS " + message);
  } else {
    failed++;
    console.error("FAIL " + message);
  }
}

function rngFactory(values) {
  const seq = values && values.length ? values : [0.11, 0.22, 0.33, 0.44];
  let i = 0;
  return () => seq[(i++) % seq.length];
}

function minion(uid, overrides) {
  const o = overrides || {};
  const health = o.health == null ? 2 : o.health;
  return Object.assign({
    id: uid,
    uid,
    name: o.name || uid,
    type: Core.CARD_TYPE.MINION,
    rarity: "common",
    cost: o.cost == null ? 1 : o.cost,
    attack: o.attack == null ? 1 : o.attack,
    health,
    maxHealth: o.maxHealth == null ? health : o.maxHealth,
    keywords: [],
    foil: false,
  }, o);
}

function spell(uid, effect, overrides) {
  const o = overrides || {};
  return Object.assign({
    id: uid,
    uid,
    name: o.name || uid,
    type: Core.CARD_TYPE.SPELL,
    rarity: "common",
    cost: o.cost == null ? 0 : o.cost,
    effect,
    keywords: [],
    foil: false,
  }, o);
}

function deckCard(id, name, rarity) {
  return {
    id,
    name,
    type: Core.CARD_TYPE.MINION,
    rarity: rarity || "common",
    cost: 1,
    attack: 1,
    health: 1,
    keywords: [],
    foil: false,
  };
}

function deckTestPool() {
  return [
    deckCard("c1", "一號士兵"),
    deckCard("c2", "二號士兵"),
    deckCard("c3", "三號士兵"),
    deckCard("c4", "四號士兵"),
    deckCard("c5", "五號士兵"),
    deckCard("c6", "六號士兵"),
    deckCard("c7", "七號士兵"),
    deckCard("c8", "八號士兵"),
    deckCard("c9", "九號士兵"),
    deckCard("c10", "十號士兵"),
    deckCard("legend", "傳說勇者", "legendary"),
    deckCard("extra", "額外士兵"),
  ];
}

function legalDeckIds() {
  const ids = [];
  for (let i = 1; i <= 10; i++) ids.push("c" + i, "c" + i);
  return ids;
}

function fullCollection(cardPool, count) {
  const collection = {};
  for (const card of cardPool) collection[card.id] = count == null ? 2 : count;
  return collection;
}

function state(overrides) {
  const o = overrides || {};
  const player = Object.assign({
    side: "player",
    hp: 30,
    maxHp: 30,
    mana: 10,
    manaMax: 10,
    deck: [],
    hand: [],
    field: [],
  }, o.player || {});
  const enemy = Object.assign({
    side: "enemy",
    hp: 30,
    maxHp: 30,
    mana: 10,
    manaMax: 10,
    deck: [],
    hand: [],
    field: [],
  }, o.enemy || {});
  player.opp = enemy;
  enemy.opp = player;
  return Object.assign({
    turn: "player",
    player,
    enemy,
    selected: null,
    pendingSpell: null,
    comboCount: 0,
    mulliganUsed: false,
    over: false,
  }, o.game || {});
}

function testInsufficientMana() {
  const g = state({ player: { mana: 1, hand: [spell("expensive", "heal5", { cost: 2 })] } });
  const result = Core.playCard(g, { side: "player", cardUid: "expensive" }, rngFactory());
  assert(!result.ok && result.reason === "insufficientMana", "法力不足不可出牌");
  assert(g.player.mana === 1 && g.player.hand.length === 1 && !g.mulliganUsed, "法力不足不扣費、不移除手牌、不燒 Mulligan");
}

function testMaxField() {
  const fullField = Array.from({ length: Core.MAX_FIELD }, (_, i) => minion("p" + i));
  const g = state({ player: { mana: 10, field: fullField, hand: [minion("blocked", { cost: 2 })] } });
  const result = Core.playCard(g, { side: "player", cardUid: "blocked" }, rngFactory());
  assert(!result.ok && result.reason === "fieldFull", "MAX_FIELD 滿場不可召喚");
  assert(g.player.field.length === Core.MAX_FIELD && g.player.hand.length === 1 && g.player.mana === 10, "滿場不扣費也不移除手牌");
}

function testWindfuryLimit() {
  const attacker = minion("wind", { attack: 2, health: 8, keywords: ["windfury"], canAttack: true });
  const g = state({
    player: { field: [attacker] },
    enemy: { field: [minion("e1", { attack: 0, health: 8 }), minion("e2", { attack: 0, health: 8 }), minion("e3", { attack: 0, health: 8 })] },
  });
  const first = Core.resolveAttack(g, { attackerSide: "player", attackerUid: "wind", defenderUid: "e1" }, rngFactory());
  const firstKeptAttack = attacker.canAttack === true && attacker._windUsed === true;
  const second = Core.resolveAttack(g, { attackerSide: "player", attackerUid: "wind", defenderUid: "e2" }, rngFactory());
  const secondSpentAttack = attacker.canAttack === false && attacker._windUsed === false;
  const third = Core.resolveAttack(g, { attackerSide: "player", attackerUid: "wind", defenderUid: "e3" }, rngFactory());
  assert(first.ok && firstKeptAttack, "風怒第一次攻擊後保留第二次攻擊權");
  assert(second.ok && secondSpentAttack, "風怒第二次攻擊後關閉攻擊權");
  assert(!third.ok && third.reason === "cannotAttack", "風怒一回合第三次攻擊被拒絕");
}

function testDeathrattleOrder() {
  const lich = minion("lich", { name: "巫妖", health: 0, maxHealth: 5, keywords: ["deathrattle"], trigger: "summonSkeleton" });
  const fillers = Array.from({ length: Core.MAX_FIELD - 1 }, (_, i) => minion("f" + i));
  const g = state({ enemy: { field: [lich, ...fillers] } });
  const result = Core.cleanupField(g, { side: "enemy" }, rngFactory([0.5]));
  const names = g.enemy.field.map((m) => m.name);
  const dyingIndex = result.events.findIndex((e) => e.type === "dying" && e.uid === "lich");
  const summonIndex = result.events.findIndex((e) => e.type === "minionSummoned" && e.name === "骷髏");
  assert(g.enemy.field.length === Core.MAX_FIELD && names.includes("骷髏"), "亡語先移除死亡者再召喚 token，滿場仍可補上骷髏");
  assert(dyingIndex !== -1 && summonIndex !== -1 && dyingIndex < summonIndex, "亡語事件順序為先死亡、後召喚");
}

function testComboCount() {
  const g = state({ player: { hand: [spell("m1", "mana2"), spell("m2", "mana2"), spell("m3", "mana2")] } });
  Core.playCard(g, { side: "player", cardUid: "m1" }, rngFactory());
  Core.playCard(g, { side: "player", cardUid: "m2" }, rngFactory());
  const third = Core.playCard(g, { side: "player", cardUid: "m3" }, rngFactory());
  const comboEvent = third.events.find((e) => e.type === "combo");
  assert(g.comboCount === 3, "combo 計數會在成功出牌時累加");
  assert(comboEvent && comboEvent.count === 3, "第三張成功出牌回傳 combo count 3");
}

function testMulliganBurn() {
  const direct = state({ player: { hand: [spell("heal", "heal5")] } });
  const directResult = Core.playCard(direct, { side: "player", cardUid: "heal" }, rngFactory());
  assert(directResult.ok && direct.mulliganUsed === true, "成功打出非指定法術會燒 Mulligan");

  const targeted = state({
    player: { hand: [spell("bolt", "damage3", { cost: 2 })], mana: 10 },
    enemy: { field: [minion("target", { health: 5 })] },
  });
  const pending = Core.playCard(targeted, { side: "player", cardUid: "bolt" }, rngFactory());
  assert(pending.ok && targeted.pendingSpell && targeted.mulliganUsed === false, "指定法術進入 pending 時尚未燒 Mulligan");
  const resolved = Core.resolveTarget(targeted, { side: "player", targetUid: "target" }, rngFactory());
  assert(resolved.ok && targeted.mulliganUsed === true && !targeted.pendingSpell, "指定法術結算時燒 Mulligan 並清掉 pending");
}

function testStatsMigration() {
  const legacy = Core.migrateStats({ wins: 3, coins: 80 });
  assert(legacy.version === Core.STATS_VERSION && legacy.wins === 3 && legacy.coins === 80, "舊檔無 version 會無損升級並補 version");
  assert(legacy.losses === 0 && legacy.bestStreak === 0 && legacy.packsOpened === 0, "舊檔缺欄位會補預設值");

  const missing = Core.migrateStats({ version: Core.STATS_VERSION, losses: 2 });
  assert(missing.losses === 2 && missing.wins === 0 && missing.coins === 0, "欄位缺失會以 DEFAULT shape 補齊");

  const polluted = Core.migrateStats({ version: NaN, wins: NaN, coins: NaN, packsOpened: "x" });
  assert(polluted.version === Core.STATS_VERSION && polluted.wins === 0 && polluted.coins === 0 && polluted.packsOpened === 0, "NaN 或非數字污染會回到預設數字");
}

function testDeckValidation() {
  const pool = deckTestPool();
  const collection = fullCollection(pool, 2);
  const valid = Core.validateDeck(legalDeckIds(), collection, pool);
  assert(valid.ok && valid.errors.length === 0, "合法牌組：20 張、同卡最多 2 張且都有收藏");

  const shortDeck = legalDeckIds().slice(0, 19);
  const short = Core.validateDeck(shortDeck, collection, pool);
  assert(!short.ok && short.errors.some((msg) => msg.includes("20 張") && msg.includes("19")), "牌組不是 20 張會被拒絕");

  const overCopy = ["c1", "c1", "c1", ...legalDeckIds().slice(0, 17)];
  const over = Core.validateDeck(overCopy, collection, pool);
  assert(!over.ok && over.errors.some((msg) => msg.includes("最多只能放 2 張")), "非傳說同卡超過 2 張會被拒絕");

  const legendDeck = ["legend", "legend", ...legalDeckIds().slice(0, 18)];
  const legend = Core.validateDeck(legendDeck, collection, pool);
  assert(!legend.ok && legend.errors.some((msg) => msg.includes("傳說卡") && msg.includes("最多只能放 1 張")), "傳說卡超過 1 張會被拒絕");

  const missingCollection = Object.assign({}, collection, { c1: 0 });
  const missing = Core.validateDeck(legalDeckIds(), missingCollection, pool);
  assert(!missing.ok && missing.errors.some((msg) => msg.includes("未擁有") || msg.includes("只有")), "未擁有或擁有數不足會被拒絕");

  const foilCollection = fullCollection(pool, 2);
  foilCollection.c1 = 1;
  foilCollection["c1#foil"] = 1;
  const foilMerged = Core.validateDeck(legalDeckIds(), foilCollection, pool);
  assert(foilMerged.ok, "普通與閃卡收藏數會合計供牌組使用");

  for (const key of ["__proto__", "constructor", "hasOwnProperty"]) {
    const protoDeck = Array(Core.DECK_SIZE).fill(key);
    const proto = Core.validateDeck(protoDeck, {}, pool);
    assert(!proto.ok && proto.errors.some((msg) => msg.includes(`未知卡牌「${key}」`)), `原型鍵 ${key} 不會繞過未知卡牌檢查`);
  }
}

function testBuildBattleDeck() {
  const pool = deckTestPool();
  const ids = legalDeckIds();
  const rngValues = [0.1, 0.8, 0.3, 0.6, 0.2, 0.9];
  const deckA = Core.buildBattleDeck(ids, pool, rngFactory(rngValues));
  const deckB = Core.buildBattleDeck(ids, pool, rngFactory(rngValues));
  assert(deckA.length === Core.DECK_SIZE, "buildBattleDeck 會產生 20 張對戰牌堆");
  assert(deckA.map((c) => c.id).join(",") === deckB.map((c) => c.id).join(","), "注入固定 rng 時洗牌結果可重現");
  const counts = deckA.reduce((acc, card) => { acc[card.id] = (acc[card.id] || 0) + 1; return acc; }, {});
  assert(Object.keys(counts).length === 10 && Object.values(counts).every((n) => n === 2), "buildBattleDeck 保留輸入 20 張 id 的完整張數");
  assert(deckA[0] !== pool.find((card) => card.id === deckA[0].id), "buildBattleDeck 會複製卡牌物件，不直接共用 cardPool 物件");

  const foilOnly = Core.buildBattleDeck(["c1", "c1"], pool, rngFactory([0]), { "c1#foil": 2 });
  assert(foilOnly.length === 2 && foilOnly.every((card) => card.foil === true), "buildBattleDeck 會把純閃卡收藏還原成閃卡外觀");

  const mixedFoil = Core.buildBattleDeck(["c1", "c1"], pool, rngFactory([0]), { c1: 1, "c1#foil": 1 });
  assert(mixedFoil.filter((card) => card.foil === true).length === 1, "buildBattleDeck 會在 1 普通 + 1 閃卡收藏中分配一張閃卡外觀");
}

function testDeckMigration() {
  const legacy = Core.migrateDeck({ cards: ["c1", "c2"] });
  assert(legacy.version === Core.DECK_VERSION && legacy.cards.join(",") === "c1,c2", "牌組舊檔無 version 會補 version 並保留 cards");

  const missing = Core.migrateDeck({ version: Core.DECK_VERSION });
  assert(missing.version === Core.DECK_VERSION && Array.isArray(missing.cards) && missing.cards.length === 0, "牌組缺 cards 欄位會補空陣列");

  const polluted = Core.migrateDeck({ version: NaN, cards: ["c1", 7, null, "c2"] });
  assert(polluted.version === Core.DECK_VERSION && polluted.cards.join(",") === "c1,c2", "牌組污染值會移除非字串 id 並重設 version");
}

console.log("== core.js 單元測試 ==");
testInsufficientMana();
testMaxField();
testWindfuryLimit();
testDeathrattleOrder();
testComboCount();
testMulliganBurn();
testStatsMigration();
testDeckValidation();
testBuildBattleDeck();
testDeckMigration();

console.log("");
console.log(`PASS ${passed} / FAIL ${failed}`);
if (failed > 0) process.exit(1);
