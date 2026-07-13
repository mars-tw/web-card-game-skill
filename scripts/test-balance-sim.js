const path = require("path");
const Core = require(path.join(__dirname, "..", "templates", "card-battle", "core.js"));
const cards = require(path.join(__dirname, "..", "templates", "card-battle", "cards.js"));

const { CARD_POOL, CARD_TYPE, getCardById } = cards;
const P0_CARD_IDS = [
  "saltShieldSquire", "iceNeedle", "packHowler", "toxinViper", "graveScribe",
  "mirrorRime", "dualTalon", "voidTithe", "captainGreywake", "ladyAshenBell",
];
const HERO_CARD_IDS = [
  "heroSerHalden", "heroMagisterVey", "heroScarra",
  "heroIsoldLongdusk", "heroRuneFrostfang", "heroMoenTidearbiter",
];
const SIM_SEEDS = 240;
const MAX_TURNS = 60;
const CURVE = [1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 7];

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function maxCopies(card) {
  return card && card.rarity === "legendary" ? 1 : 2;
}

function cloneIds(ids) {
  return Array.isArray(ids) ? ids.slice() : [];
}

function countIds(ids) {
  return ids.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, Object.create(null));
}

function pick(list, rng) {
  return list[Math.floor(rng() * list.length)];
}

function randomDeck(seed, excludeIds, predicate) {
  const rng = mulberry32(seed);
  const exclude = new Set(excludeIds || []);
  const counts = Object.create(null);
  const deck = [];
  for (const cost of CURVE) {
    let candidates = CARD_POOL.filter((card) => !exclude.has(card.id)
      && (!predicate || predicate(card))
      && card.cost === cost
      && (counts[card.id] || 0) < maxCopies(card));
    if (!candidates.length) {
      candidates = CARD_POOL.filter((card) => !exclude.has(card.id)
        && (!predicate || predicate(card))
        && Math.abs(card.cost - cost) <= 1
        && (counts[card.id] || 0) < maxCopies(card));
    }
    if (!candidates.length) {
      candidates = CARD_POOL.filter((card) => !exclude.has(card.id)
        && (!predicate || predicate(card))
        && (counts[card.id] || 0) < maxCopies(card));
    }
    const card = pick(candidates, rng);
    deck.push(card.id);
    counts[card.id] = (counts[card.id] || 0) + 1;
  }
  return deck;
}

function injectCard(baseDeck, cardId, copies) {
  const card = getCardById(cardId);
  const count = Math.min(copies, maxCopies(card));
  const deck = cloneIds(baseDeck).filter((id) => id !== cardId);
  const rankReplacement = (id) => {
    const c = getCardById(id);
    if (!c) return 999;
    return Math.abs(c.cost - card.cost) * 20
      + (c.type === card.type ? 0 : 6)
      + (c.rarity === "legendary" ? 5 : 0)
      + (c.axis === card.axis ? 0 : 3);
  };
  for (let i = 0; i < count; i++) {
    if (deck.length >= Core.DECK_SIZE) {
      let best = 0;
      for (let j = 1; j < deck.length; j++) {
        if (rankReplacement(deck[j]) < rankReplacement(deck[best])) best = j;
      }
      deck.splice(best, 1);
    }
    deck.push(cardId);
  }
  while (deck.length > Core.DECK_SIZE) deck.pop();
  assert(deck.length === Core.DECK_SIZE, `deck length after injecting ${cardId}`);
  return deck;
}

function prepDeck(ids, seed, transform) {
  const rng = mulberry32(seed);
  return Core.buildBattleDeck(ids, CARD_POOL, rng).map((card, index) => {
    const copy = Object.assign({}, card, { keywords: Array.isArray(card.keywords) ? [...card.keywords] : [] });
    copy.uid = `${card.id}_${seed}_${index}`;
    if (copy.health != null) copy.maxHealth = copy.health;
    return typeof transform === "function" ? (transform(copy) || copy) : copy;
  });
}

function makeState(playerDeckIds, enemyDeckIds, seed, options) {
  const setup = options || {};
  const player = {
    side: "player",
    hp: 30,
    maxHp: 30,
    mana: 1,
    manaMax: 1,
    deck: prepDeck(playerDeckIds, seed * 2 + 1, setup.playerTransform),
    hand: [],
    field: [],
    strategy: setup.playerStrategy || "neutral",
  };
  const enemy = {
    side: "enemy",
    hp: 30,
    maxHp: 30,
    mana: 0,
    manaMax: 0,
    deck: prepDeck(enemyDeckIds, seed * 2 + 2, setup.enemyTransform),
    hand: [],
    field: [],
    strategy: setup.enemyStrategy || "neutral",
  };
  player.opp = enemy;
  enemy.opp = player;
  const state = {
    turn: "player",
    player,
    enemy,
    selected: null,
    pendingSpell: null,
    pendingBattlecry: null,
    comboCount: 0,
    mulliganUsed: true,
    over: false,
    winner: null,
  };
  const rng = mulberry32(seed * 17 + 3);
  for (let i = 0; i < (setup.playerOpening || 3); i++) Core.drawCard(state, { side: "player" }, rng);
  for (let i = 0; i < (setup.enemyOpening || 3); i++) Core.drawCard(state, { side: "enemy" }, rng);
  checkWinner(state);
  return state;
}

function hasKeyword(card, keyword) {
  return Array.isArray(card && card.keywords) && card.keywords.includes(keyword);
}

function playableCost(side, card) {
  const discount = card.type === CARD_TYPE.SPELL ? Math.max(0, Math.floor(Number(side.nextSpellDiscount) || 0)) : 0;
  return Math.max(0, Number(card.cost) - discount);
}

function threat(card) {
  if (!card) return 0;
  let score = (card.attack || 0) * 3 + (card.health || 0);
  if (hasKeyword(card, "taunt")) score += 4;
  if (hasKeyword(card, "poison")) score += 6;
  if (hasKeyword(card, "spellpower")) score += 5;
  if (hasKeyword(card, "lifesteal")) score += 4;
  if (hasKeyword(card, "divineshield") || card.shield) score += 3;
  if (hasKeyword(card, "deathrattle")) score += 2;
  return score;
}

function spellDamage(card, side) {
  if (!card || card.type !== CARD_TYPE.SPELL) return 0;
  if (Number.isFinite(Number(card.baseDamage))) return Number(card.baseDamage) + Core.spellPower(side);
  if (card.effect === "damage8") return 8 + Core.spellPower(side);
  if (card.effect === "damage5") return 5 + Core.spellPower(side);
  if (card.effect === "damage3") return 3 + Core.spellPower(side);
  if (card.effect === "damage2") return 2 + Core.spellPower(side);
  return 0;
}

function chooseEnemyTarget(state, sideKey, card) {
  const side = state[sideKey];
  const foe = side.opp;
  const enemies = foe.field.filter((minion) => minion.health > 0);
  if (!enemies.length) return null;
  const taunts = enemies.filter((minion) => hasKeyword(minion, "taunt"));
  const pool = taunts.length ? taunts : enemies;
  if (card && (card.effect === "damage2" || card.effect === "damage3" || card.effect === "damage5" || card.effect === "damage8")) {
    const damage = spellDamage(card, side);
    const lethal = pool.filter((minion) => minion.health <= damage).sort((a, b) => threat(b) - threat(a))[0];
    if (lethal) return lethal;
  }
  return [...pool].sort((a, b) => threat(b) - threat(a) || a.health - b.health)[0] || null;
}

function chooseFriendlyTarget(state, sideKey, card) {
  const side = state[sideKey];
  const friendly = side.field.filter((minion) => minion.health > 0);
  if (!friendly.length) return null;
  if (card && card.mirrorRime) {
    const hasTauntSource = friendly.some((minion) => hasKeyword(minion, "taunt"));
    if (!hasTauntSource) return null;
    return [...friendly].sort((a, b) => a.health - b.health || threat(b) - threat(a))[0] || null;
  }
  return [...friendly].sort((a, b) => threat(b) - threat(a))[0] || null;
}

function chooseSpellTarget(state, sideKey, card) {
  const spec = Core.SPELL_EFFECTS[card.effect] || { needsTarget: null };
  if (spec.needsTarget === "enemyMinion") return chooseEnemyTarget(state, sideKey, card);
  if (spec.needsTarget === "friendlyMinion") return chooseFriendlyTarget(state, sideKey, card);
  return null;
}

function cardScore(state, sideKey, card) {
  const side = state[sideKey];
  const foe = side.opp;
  let score = 80 - playableCost(side, card) * 3 + Number(card.cost || 0);
  if (card.type === CARD_TYPE.MINION) {
    score += (card.attack || 0) * 4 + (card.health || 0) * 2;
    if (hasKeyword(card, "taunt")) score += side.hp <= 15 ? 14 : 6;
    if (hasKeyword(card, "charge")) score += 12;
    if (hasKeyword(card, "rush")) score += foe.field.length ? 10 : 2;
    if (hasKeyword(card, "poison")) score += foe.field.some((m) => (m.attack || 0) + (m.health || 0) >= 7) ? 12 : 5;
    if (hasKeyword(card, "lifesteal")) score += side.hp <= 20 ? 8 : 2;
    if (card.trigger === "aoeEnemy1" || card.trigger === "aoeEnemy2") score += foe.field.length * 6;
    if (card.trigger === "buffAdjacent1") score += Math.min(2, side.field.length) * 5;
    if (card.trigger === "summonTwo1_1") score += 5;
    if (card.trigger === "drawCard1") score += side.hand.length <= 4 ? 6 : 1;
    if (card.trigger === "silenceIfDamaged") score += foe.field.some((m) => m.health < (m.maxHealth || m.health)) ? 8 : -8;
    if (side.strategy === "control" && hasKeyword(card, "taunt")) score += 12;
    if (side.strategy === "spellburst" && hasKeyword(card, "spellpower")) score += 16;
  } else {
    if (card.effect === "heal5") score += side.hp <= 20 ? 18 : -18;
    if (card.effect === "mana2") score += side.manaMax <= 6 ? 12 : -10;
    if (card.effect === "draw2") score += side.hand.length <= Core.HAND_LIMIT - 3 ? 12 : -20;
    if (card.effect === "aoe1" || card.effect === "aoe2") score += foe.field.length >= 2 ? 18 + foe.field.length * 3 : -18;
    if (card.effect === "giveShield" || card.effect === "buffTarget") score += side.field.length ? 10 : -30;
    if (card.effect === "polymorph") score += foe.field.length ? 16 : -30;
    if (card.effect === "nextSpellMinus1") score += side.hand.some((c) => c !== card && c.type === CARD_TYPE.SPELL) ? 14 : 3;
    if (card.effect === "damage2" || card.effect === "damage3" || card.effect === "damage5" || card.effect === "damage8") {
      const target = chooseEnemyTarget(state, sideKey, card);
      score += target ? (target.health <= spellDamage(card, side) ? 18 : 8) : -25;
    }
    if (side.strategy === "spellburst" && ["damage2", "damage3", "damage5", "damage8", "aoe1", "aoe2"].includes(card.effect)) score += 12;
  }
  return score;
}

function playCards(state, sideKey, rng) {
  const side = state[sideKey];
  let progressed = true;
  let guard = 0;
  while (progressed && guard++ < 20 && !state.over) {
    progressed = false;
    const candidates = side.hand
      .filter((card) => playableCost(side, card) <= side.mana)
      .filter((card) => card.type !== CARD_TYPE.MINION || side.field.length < Core.MAX_FIELD)
      .map((card) => ({ card, score: cardScore(state, sideKey, card) }))
      .sort((a, b) => b.score - a.score);
    for (const { card, score } of candidates) {
      if (score < 35) continue;
      const spec = card.type === CARD_TYPE.SPELL ? (Core.SPELL_EFFECTS[card.effect] || { needsTarget: null }) : { needsTarget: null };
      let target = spec.needsTarget ? chooseSpellTarget(state, sideKey, card) : null;
      if (card.type === CARD_TYPE.MINION && card.trigger === "attuneFlexible") {
        target = chooseFriendlyTarget(state, sideKey, card) || card;
      }
      if (spec.needsTarget && !target) continue;
      const result = Core.playCard(state, {
        side: sideKey,
        cardUid: card.uid,
        targetUid: target && target.uid,
        deferBattlecry: false,
        burnMulligan: false,
        trackCombo: false,
      }, rng);
      checkWinner(state);
      if (result.ok && !result.events.some((event) => event.type === "spellPending")) {
        progressed = true;
        break;
      }
    }
  }
}

function attackWithBoard(state, sideKey, rng) {
  const side = state[sideKey];
  const foe = side.opp;
  let guard = 0;
  while (!state.over && guard++ < 20) {
    const attacker = side.field.find((minion) => minion.canAttack && minion.attack > 0 && minion.health > 0);
    if (!attacker) break;
    const taunts = foe.field.filter((minion) => minion.health > 0 && hasKeyword(minion, "taunt"));
    if (taunts.length) {
      const target = [...taunts].sort((a, b) => a.health - b.health || threat(b) - threat(a))[0];
      Core.resolveAttack(state, { attackerSide: sideKey, attackerUid: attacker.uid, defenderUid: target.uid }, rng);
      checkWinner(state);
      continue;
    }
    if (hasKeyword(attacker, "chillbind") && foe.field.length) {
      const chillTarget = [...foe.field].filter((minion) => minion.health > 0)
        .sort((a, b) => (a.health > attacker.attack) - (b.health > attacker.attack) || threat(b) - threat(a))[0];
      if (chillTarget) {
        Core.resolveAttack(state, { attackerSide: sideKey, attackerUid: attacker.uid, defenderUid: chillTarget.uid }, rng);
        checkWinner(state);
        continue;
      }
    }
    if ((side.strategy === "control" || side.strategy === "controlFull" || side.strategy === "spellburst") && foe.field.length) {
      const threshold = side.strategy === "control" ? 3 : side.strategy === "spellburst" ? 4 : 0;
      const candidates = [...foe.field].filter((minion) => minion.health > 0 && (minion.attack || 0) >= threshold);
      const killable = candidates.filter((minion) => minion.health <= attacker.attack).sort((a, b) => threat(b) - threat(a))[0];
      const target = killable || candidates.sort((a, b) => threat(b) - threat(a))[0];
      if (target) {
        Core.resolveAttack(state, { attackerSide: sideKey, attackerUid: attacker.uid, defenderUid: target.uid }, rng);
        checkWinner(state);
        continue;
      }
    }
    if (!hasKeyword(attacker, "rush") || !attacker.justPlayed || foe.field.length === 0 || foe.hp <= attacker.attack) {
      const hero = Core.resolveHeroAttack(state, { attackerSide: sideKey, attackerUid: attacker.uid, defenderSide: foe.side }, rng);
      if (hero.ok) {
        checkWinner(state);
        continue;
      }
    }
    const killable = foe.field
      .filter((minion) => minion.health > 0 && minion.health <= attacker.attack)
      .sort((a, b) => threat(b) - threat(a))[0];
    const target = killable || [...foe.field].filter((minion) => minion.health > 0).sort((a, b) => threat(b) - threat(a))[0];
    if (!target) {
      attacker.canAttack = false;
      continue;
    }
    Core.resolveAttack(state, { attackerSide: sideKey, attackerUid: attacker.uid, defenderUid: target.uid }, rng);
    checkWinner(state);
  }
}

function checkWinner(state) {
  if (state.player.hp <= 0 || state.enemy.hp <= 0) {
    state.over = true;
    if (state.player.hp <= 0 && state.enemy.hp <= 0) state.winner = "draw";
    else state.winner = state.player.hp > 0 ? "player" : "enemy";
  }
}

function runTurn(state, sideKey, rng) {
  playCards(state, sideKey, rng);
  attackWithBoard(state, sideKey, rng);
}

function runGameDetailed(playerDeckIds, enemyDeckIds, seed, options) {
  const rng = mulberry32(seed * 101 + 11);
  const state = makeState(playerDeckIds, enemyDeckIds, seed, options);
  let turns = 0;
  for (let turn = 0; turn < MAX_TURNS && !state.over; turn++) {
    turns = turn + 1;
    runTurn(state, "player", rng);
    if (state.over) break;
    Core.advanceTurn(state, { phase: "endPlayer" }, rng);
    Core.advanceTurn(state, { phase: "startEnemy" }, rng);
    checkWinner(state);
    if (state.over) break;
    runTurn(state, "enemy", rng);
    if (state.over) break;
    Core.advanceTurn(state, { phase: "endEnemy" }, rng);
    checkWinner(state);
  }
  if (!state.over) {
    state.winner = state.player.hp === state.enemy.hp ? "draw" : (state.player.hp > state.enemy.hp ? "player" : "enemy");
  }
  return { winner: state.winner, turns };
}

function runGame(playerDeckIds, enemyDeckIds, seed) {
  return runGameDetailed(playerDeckIds, enemyDeckIds, seed).winner;
}

function scoreFocus(cardId, copies, seedOffset) {
  let score = 0;
  for (let i = 0; i < SIM_SEEDS; i++) {
    const seed = seedOffset + i;
    const base = randomDeck(seed * 3 + 1, [cardId, ...HERO_CARD_IDS]);
    const focus = injectCard(base, cardId, copies);
    const winA = runGame(focus, base, seed * 7 + 1);
    const winB = runGame(base, focus, seed * 7 + 2);
    score += winA === "player" ? 1 : winA === "draw" ? 0.5 : 0;
    score += winB === "enemy" ? 1 : winB === "draw" ? 0.5 : 0;
  }
  return score / (SIM_SEEDS * 2);
}

function scoreFocusMetrics(cardId, seedOffset) {
  let score = 0;
  let turns = 0;
  let baselineTurns = 0;
  for (let i = 0; i < SIM_SEEDS; i++) {
    const seed = seedOffset + i;
    const base = randomDeck(seed * 3 + 1, HERO_CARD_IDS);
    const focus = injectCard(base, cardId, 1);
    const gameA = runGameDetailed(focus, base, seed * 7 + 1);
    const gameB = runGameDetailed(base, focus, seed * 7 + 2);
    score += gameA.winner === "player" ? 1 : gameA.winner === "draw" ? 0.5 : 0;
    score += gameB.winner === "enemy" ? 1 : gameB.winner === "draw" ? 0.5 : 0;
    turns += gameA.turns + gameB.turns;
    baselineTurns += runGameDetailed(base, base, seed * 7 + 3).turns;
    baselineTurns += runGameDetailed(base, base, seed * 7 + 4).turns;
  }
  return {
    winRate: score / (SIM_SEEDS * 2),
    avgTurns: turns / (SIM_SEEDS * 2),
    baselineTurns: baselineTurns / (SIM_SEEDS * 2),
    games: SIM_SEEDS * 2,
  };
}

function pairedDeckMatch(buildA, buildB, seedOffset, gameOptions) {
  let scoreA = 0;
  let turns = 0;
  for (let i = 0; i < SIM_SEEDS; i++) {
    const seed = seedOffset + i;
    const deckA = buildA(seed);
    const deckB = buildB(seed);
    const gameA = runGameDetailed(deckA, deckB, seed * 11 + 1, gameOptions);
    const gameB = runGameDetailed(deckB, deckA, seed * 11 + 2, gameOptions);
    scoreA += gameA.winner === "player" ? 1 : gameA.winner === "draw" ? 0.5 : 0;
    scoreA += gameB.winner === "enemy" ? 1 : gameB.winner === "draw" ? 0.5 : 0;
    turns += gameA.turns + gameB.turns;
  }
  return { winRate: scoreA / (SIM_SEEDS * 2), avgTurns: turns / (SIM_SEEDS * 2), games: SIM_SEEDS * 2 };
}

function pairedMoenFactionMatch(deckIds, seedOffset) {
  const monoTransform = (card) => {
    if (card.faction && card.faction !== "neutral") card.faction = "wardens";
    return card;
  };
  let scoreMulti = 0;
  let turns = 0;
  for (let i = 0; i < SIM_SEEDS; i++) {
    const seed = seedOffset + i;
    const multiFirst = runGameDetailed(deckIds, deckIds, seed * 11 + 1, { enemyTransform: monoTransform });
    const monoFirst = runGameDetailed(deckIds, deckIds, seed * 11 + 2, { playerTransform: monoTransform });
    scoreMulti += multiFirst.winner === "player" ? 1 : multiFirst.winner === "draw" ? 0.5 : 0;
    scoreMulti += monoFirst.winner === "enemy" ? 1 : monoFirst.winner === "draw" ? 0.5 : 0;
    turns += multiFirst.turns + monoFirst.turns;
  }
  return { winRate: scoreMulti / (SIM_SEEDS * 2), avgTurns: turns / (SIM_SEEDS * 2), games: SIM_SEEDS * 2 };
}

function focusShellBuilder(cardId, anchorId, predicate, seedSalt) {
  return (seed) => {
    const base = randomDeck(seed * 13 + seedSalt, [cardId, anchorId], predicate);
    return injectCard(base, cardId, 1);
  };
}

function budgetedArchetypeDeck(seed, axis, epicCount, legendaryCount) {
  const rng = mulberry32(seed * 31 + 7);
  const predicate = (card) => card.axis === axis && (card.rarity === "common" || card.rarity === "rare");
  let deck = randomDeck(seed * 23 + 1, HERO_CARD_IDS, predicate);
  const injectTier = (rarity, count) => {
    const pool = CARD_POOL.filter((card) => card.axis === axis && card.rarity === rarity && !HERO_CARD_IDS.includes(card.id));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    for (const card of pool.slice(0, count)) deck = injectCard(deck, card.id, 1);
  };
  injectTier("epic", epicCount);
  injectTier("legendary", legendaryCount);
  return deck;
}

function fixedPlayerRate(enemyDeck, seedOffset, enemyStrategy) {
  let score = 0;
  let turns = 0;
  for (let i = 0; i < SIM_SEEDS; i++) {
    const playerAxis = enemyStrategy === "control"
      ? "aggro"
      : enemyStrategy === "aggro" && i % 5 === 0
        ? "aggro"
        : "control";
    const playerSeed = (seedOffset + i) * 17 + 5;
    let playerDeck;
    if (enemyStrategy === "control" && i % 2 === 0) {
      // The fixed-opponent gate samples both mature and budget aggro collections.
      playerDeck = randomDeck(playerSeed, HERO_CARD_IDS, (card) => card.axis === playerAxis);
    } else {
      const epicCount = enemyStrategy === "aggro" ? 2 : enemyStrategy === "control" ? 8 : 2;
      const legendCount = enemyStrategy === "control" ? 2 : 0;
      playerDeck = budgetedArchetypeDeck(playerSeed, playerAxis, epicCount, legendCount);
    }
    const game = runGameDetailed(playerDeck, enemyDeck, (seedOffset + i) * 19 + 7, {
      enemyOpening: 4,
      enemyStrategy: enemyStrategy || "neutral",
    });
    score += game.winner === "player" ? 1 : game.winner === "draw" ? 0.5 : 0;
    turns += game.turns;
  }
  return { winRate: score / SIM_SEEDS, avgTurns: turns / SIM_SEEDS, games: SIM_SEEDS };
}

function injectIntoFixed(baseIds, cardId) {
  return injectCard(baseIds, cardId, 1);
}

const OPPONENT_DECKS = Object.freeze({
  halden: Object.freeze([
    "saltShieldSquire", "saltShieldSquire", "footman", "footman", "bulwarkMonk", "bulwarkMonk",
    "knight", "knight", "guardian", "guardian", "bannerGuard", "bannerGuard",
    "oathbannerHerald", "oathbannerHerald", "captainGreywake", "heroSerHalden",
    "mirrorRime", "mirrorRime", "shieldUp", "shieldUp",
  ]),
  vey: Object.freeze([
    "arcaneApprentice", "arcaneApprentice", "tidecallerAdept", "tidecallerAdept",
    "frostChanneler", "frostChanneler", "mage", "heroMagisterVey", "arcaneWeaver", "arcaneWeaver",
    "firebolt", "firebolt", "iceNeedle", "iceNeedle", "emberVolley", "emberVolley",
    "flameBurst", "flameBurst", "voidTithe", "voidTithe",
  ]),
  scarra: Object.freeze([
    "emberpup", "emberpup", "wolf", "wolf", "alleySkirmisher", "alleySkirmisher",
    "sparkSquire", "sparkSquire", "frontScout", "frontScout", "packHowler", "packHowler",
    "dualTalon", "heroScarra", "dawnRider", "dawnRider", "firebolt", "firebolt",
    "emberVolley", "emberVolley",
  ]),
});

const SHIELD_CONTROL_BASE = Object.freeze([
  "saltShieldSquire", "saltShieldSquire", "footman", "footman", "guardian", "guardian",
  "paladin", "paladin", "shieldUp", "shieldUp", "arcaneVeil", "arcaneVeil",
  "knight", "knight", "sanctuaryWarden", "sanctuaryWarden", "oathbannerHerald", "oathbannerHerald",
  "dawnArchbishop", "skyJudicator",
]);

const MOEN_MULTI_BASE = Object.freeze([
  "saltShieldSquire", "saltShieldSquire", "emberpup", "emberpup", "arcaneApprentice", "arcaneApprentice",
  "wolf", "wolf", "knight", "knight", "ragingBrute", "ragingBrute",
  "guardian", "guardian", "frostChanneler", "frostChanneler", "frostReaver", "frostReaver",
  "captainGreywake", "archLoremaster",
]);

const VEY_SPELL_BASE = Object.freeze([
  "arcaneApprentice", "arcaneApprentice", "tidecallerAdept", "tidecallerAdept",
  "frostChanneler", "frostChanneler", "mage", "mage", "arcaneWeaver", "arcaneWeaver",
  "runicScrivener", "runicScrivener", "novicePage", "novicePage",
  "firebolt", "firebolt", "iceNeedle", "iceNeedle", "flameBurst", "flameBurst",
]);

const HALDEN_DUEL_BASE = Object.freeze([
  "golem", "golem", "bastionColossus", "bastionColossus", "glaciarchWarden", "glaciarchWarden",
  "abyssWalker", "abyssWalker", "sanctuaryWarden", "sanctuaryWarden", "frostChanneler", "frostChanneler",
  "heal", "heal", "mirrorRime", "mirrorRime", "tacticalRequisition", "tacticalRequisition", "polymorph", "polymorph",
]);

function run() {
  const results = [];
  for (const [index, id] of P0_CARD_IDS.entries()) {
    const card = getCardById(id);
    const copies = maxCopies(card);
    const rate = scoreFocus(id, copies, 10000 + index * 1000);
    const oneCopy = copies === 1 ? rate : scoreFocus(id, 1, 30000 + index * 1000);
    results.push({ id, name: card.name, copies, games: SIM_SEEDS * 2, winRate: rate, oneCopy });
  }
  const poolMean = results.reduce((sum, item) => sum + item.winRate, 0) / results.length;
  const raptorRate = scoreFocus("raptor", 2, 70000);
  const archivistRate = scoreFocus("highArchivist", 1, 71000);
  const toxin = results.find((item) => item.id === "toxinViper");
  const captain = results.find((item) => item.id === "captainGreywake");

  console.log("== R60 balance sim ==");
  console.log(`Seeds per card: ${SIM_SEEDS}; paired games per card: ${SIM_SEEDS * 2}; pool mean: ${(poolMean * 100).toFixed(2)}%`);
  for (const item of results) {
    const delta = item.winRate - poolMean;
    const mustHave = item.copies > 1 ? item.winRate - item.oneCopy : 0;
    console.log(`${item.id.padEnd(18)} ${(item.winRate * 100).toFixed(2)}% delta ${(delta * 100).toFixed(2)}pp one-copy ${(item.oneCopy * 100).toFixed(2)}% must-have ${(mustHave * 100).toFixed(2)}pp`);
  }
  console.log(`raptor ${(raptorRate * 100).toFixed(2)}% | toxinViper ${(toxin.winRate * 100).toFixed(2)}%`);
  console.log(`highArchivist ${(archivistRate * 100).toFixed(2)}% | captainGreywake ${(captain.winRate * 100).toFixed(2)}%`);

  const failures = [];
  for (const item of results) {
    if (Math.abs(item.winRate - poolMean) > 0.05) failures.push(`${item.id} outside pool mean ±5%`);
    if (item.copies > 1 && item.winRate > poolMean + 0.05) failures.push(`${item.id} two-copy rate above mean +5%`);
    if (item.copies > 1 && item.winRate - item.oneCopy > 0.06) failures.push(`${item.id} two-copy uplift >6pp`);
  }
  if (toxin.winRate > raptorRate + 0.03) failures.push("toxinViper is stably above raptor by more than 3pp");
  if (captain.winRate > archivistRate + 0.03) failures.push("captainGreywake is above highArchivist by more than 3pp");

  console.log("\n== R60 hero injection S0-S4 ==");
  const heroMetrics = HERO_CARD_IDS.map((id, index) => ({ id, ...scoreFocusMetrics(id, 90000 + index * 2000) }));
  const heroPoolMean = heroMetrics.reduce((sum, item) => sum + item.winRate, 0) / heroMetrics.length;
  for (const item of heroMetrics) {
    const delta = item.winRate - heroPoolMean;
    const turnDelta = item.avgTurns - item.baselineTurns;
    console.log(`${item.id.padEnd(24)} ${(item.winRate * 100).toFixed(2)}% delta ${(delta * 100).toFixed(2)}pp turns ${item.avgTurns.toFixed(2)} base ${item.baselineTurns.toFixed(2)} (${turnDelta >= 0 ? "+" : ""}${turnDelta.toFixed(2)}) games ${item.games}`);
    if (item.games < 200) failures.push(`${item.id} has fewer than 200 games`);
    if (Math.abs(delta) > 0.05) failures.push(`${item.id} outside hero pool mean ±5%`);
    if (item.winRate >= heroPoolMean + 0.08) failures.push(`${item.id} violates no-must-have +8% cap`);
    if (Math.abs(turnDelta) > 1.5) failures.push(`${item.id} changes average turns by more than 1.5`);
  }

  const heroCards = HERO_CARD_IDS.map(getCardById);
  if (!heroCards.every((card) => card && card.rarity === "legendary") || new Set(heroCards.map((card) => card.id)).size !== 6) {
    failures.push("S0 hero cards must be six unique legendaries");
  }
  if (!heroCards.every((card) => maxCopies(card) === 1 && card.maxCopies === 1)) failures.push("S1 hero maxCopies must be 1");

  const halden = getCardById("heroSerHalden");
  const vey = getCardById("heroMagisterVey");
  const scarra = getCardById("heroScarra");
  const isold = getCardById("heroIsoldLongdusk");
  const rune = getCardById("heroRuneFrostfang");
  const moen = getCardById("heroMoenTidearbiter");
  if (!(halden.cost === 6 && halden.health <= getCardById("highArchivist").health && !halden.trigger)) failures.push("Halden structurally dominates highArchivist");
  if (!(vey.attack < getCardById("archLoremaster").attack && vey.health <= getCardById("archLoremaster").health && !vey.trigger)) failures.push("Vey structurally dominates archLoremaster");
  if (!(scarra.attack < getCardById("dragon").attack && scarra.health < getCardById("dragon").health)) failures.push("Scarra structurally dominates dragon");
  if (!(isold.health <= getCardById("countessLongNight").health && !isold.trigger)) failures.push("Isold structurally dominates countessLongNight");
  if (!(rune.health < getCardById("highArchivist").health && !rune.trigger)) failures.push("Rune structurally dominates highArchivist");
  if (!(moen.attack === 2 && moen.health <= 4 && moen.trigger === "attuneFlexible")) failures.push("Moen exceeds conditional support budget");

  console.log("\n== R60 opponent and gold-standard matchups M1-M9 ==");
  const m1 = fixedPlayerRate(OPPONENT_DECKS.halden, 120000, "control");
  const m2 = fixedPlayerRate(OPPONENT_DECKS.vey, 122000, "spellburst");
  const m3 = fixedPlayerRate(OPPONENT_DECKS.scarra, 124000, "aggro");
  const aggroPredicate = (card) => card.axis === "aggro";
  const winterPredicate = (card) => card.faction === "wintershadow" || card.axis === "control";
  const m4 = pairedDeckMatch(
    () => injectIntoFixed(HALDEN_DUEL_BASE, "heroSerHalden"),
    () => injectIntoFixed(HALDEN_DUEL_BASE, "highArchivist"),
    130000,
  );
  const m5 = pairedDeckMatch(
    () => injectIntoFixed(VEY_SPELL_BASE, "heroMagisterVey"),
    () => injectIntoFixed(VEY_SPELL_BASE, "archLoremaster"),
    132000,
  );
  const m6 = pairedDeckMatch(
    focusShellBuilder("heroScarra", "dragon", aggroPredicate, 47),
    focusShellBuilder("dragon", "heroScarra", aggroPredicate, 47),
    134000,
  );
  const m7 = pairedDeckMatch(
    focusShellBuilder("heroIsoldLongdusk", "ladyAshenBell", winterPredicate, 53),
    focusShellBuilder("ladyAshenBell", "heroIsoldLongdusk", winterPredicate, 53),
    136000,
  );
  const m8Shield = pairedDeckMatch(
    () => injectIntoFixed(SHIELD_CONTROL_BASE, "heroRuneFrostfang"),
    () => injectIntoFixed(SHIELD_CONTROL_BASE, "frostChanneler"),
    138000,
    { playerStrategy: "controlFull", enemyStrategy: "controlFull" },
  );
  const noShieldPredicate = (card) => !hasKeyword(card, "divineshield") && card.effect !== "giveShield";
  const m8Plain = pairedDeckMatch(
    focusShellBuilder("heroRuneFrostfang", "ladyAshenBell", noShieldPredicate, 59),
    focusShellBuilder("ladyAshenBell", "heroRuneFrostfang", noShieldPredicate, 59),
    140000,
  );
  const m9 = pairedMoenFactionMatch(injectIntoFixed(MOEN_MULTI_BASE, "heroMoenTidearbiter"), 142000);
  const m9Difference = m9.winRate - (1 - m9.winRate);
  const matchupRows = [
    ["M1 player vs Halden AI", m1], ["M2 player vs Vey AI", m2], ["M3 player vs Scarra AI", m3],
    ["M4 Halden vs Archivist", m4], ["M5 Vey vs Loremaster", m5], ["M6 Scarra vs Dragon", m6],
    ["M7 Isold vs AshenBell", m7], ["M8 Rune vs shield control", m8Shield], ["M8 Rune vs plain", m8Plain],
    ["M9 Moen multi vs mono", m9],
  ];
  matchupRows.forEach(([label, metric]) => console.log(`${label.padEnd(30)} ${(metric.winRate * 100).toFixed(2)}% turns ${metric.avgTurns.toFixed(2)} games ${metric.games}`));
  console.log(`M9 three-faction uplift ${(m9Difference * 100).toFixed(2)}pp`);

  if (m1.winRate < 0.48 || m1.winRate > 0.58) failures.push("M1 player rate outside 48-58%");
  if (m2.winRate < 0.48 || m2.winRate > 0.58) failures.push("M2 player rate outside 48-58%");
  if (m3.winRate < 0.45 || m3.winRate > 0.55) failures.push("M3 player rate outside 45-55%");
  if (m4.winRate < 0.44 || m4.winRate > 0.52) failures.push("M4 Halden outside 44-52%");
  if (m5.winRate < 0.46 || m5.winRate > 0.54) failures.push("M5 Vey outside 46-54%");
  if (m6.winRate < 0.48 || m6.winRate > 0.56) failures.push("M6 Scarra outside 48-56%");
  if (m7.winRate < 0.46 || m7.winRate > 0.54) failures.push("M7 Isold outside 46-54%");
  if (m8Shield.winRate < 0.50 || m8Shield.winRate > 0.60) failures.push("M8 Rune shield matchup outside 50-60%");
  if (m8Plain.winRate < 0.46 || m8Plain.winRate > 0.54) failures.push("M8 Rune plain matchup outside 46-54%");
  if (m9Difference < 0.02 || m9Difference > 0.07) failures.push("M9 multi-faction uplift outside +2 to +7pp");
  if (failures.length) {
    console.error("Balance failures:");
    failures.forEach((failure) => console.error(" - " + failure));
    process.exit(1);
  }
  console.log("Balance sim passed.");
}

run();
