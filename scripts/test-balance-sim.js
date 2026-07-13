const path = require("path");
const Core = require(path.join(__dirname, "..", "templates", "card-battle", "core.js"));
const cards = require(path.join(__dirname, "..", "templates", "card-battle", "cards.js"));

const { CARD_POOL, CARD_TYPE, getCardById } = cards;
const P0_CARD_IDS = [
  "saltShieldSquire", "iceNeedle", "packHowler", "toxinViper", "graveScribe",
  "mirrorRime", "dualTalon", "voidTithe", "captainGreywake", "ladyAshenBell",
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

function randomDeck(seed, excludeIds) {
  const rng = mulberry32(seed);
  const exclude = new Set(excludeIds || []);
  const counts = Object.create(null);
  const deck = [];
  for (const cost of CURVE) {
    let candidates = CARD_POOL.filter((card) => !exclude.has(card.id)
      && card.cost === cost
      && (counts[card.id] || 0) < maxCopies(card));
    if (!candidates.length) {
      candidates = CARD_POOL.filter((card) => !exclude.has(card.id)
        && Math.abs(card.cost - cost) <= 1
        && (counts[card.id] || 0) < maxCopies(card));
    }
    if (!candidates.length) {
      candidates = CARD_POOL.filter((card) => !exclude.has(card.id)
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

function prepDeck(ids, seed) {
  const rng = mulberry32(seed);
  return Core.buildBattleDeck(ids, CARD_POOL, rng).map((card, index) => {
    const copy = Object.assign({}, card, { keywords: Array.isArray(card.keywords) ? [...card.keywords] : [] });
    copy.uid = `${card.id}_${seed}_${index}`;
    if (copy.health != null) copy.maxHealth = copy.health;
    return copy;
  });
}

function makeState(playerDeckIds, enemyDeckIds, seed) {
  const player = {
    side: "player",
    hp: 30,
    maxHp: 30,
    mana: 1,
    manaMax: 1,
    deck: prepDeck(playerDeckIds, seed * 2 + 1),
    hand: [],
    field: [],
  };
  const enemy = {
    side: "enemy",
    hp: 30,
    maxHp: 30,
    mana: 0,
    manaMax: 0,
    deck: prepDeck(enemyDeckIds, seed * 2 + 2),
    hand: [],
    field: [],
  };
  player.opp = enemy;
  enemy.opp = player;
  const state = {
    turn: "player",
    player,
    enemy,
    selected: null,
    pendingSpell: null,
    comboCount: 0,
    mulliganUsed: true,
    over: false,
    winner: null,
  };
  const rng = mulberry32(seed * 17 + 3);
  for (let i = 0; i < 3; i++) {
    Core.drawCard(state, { side: "player" }, rng);
    Core.drawCard(state, { side: "enemy" }, rng);
  }
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
      const target = spec.needsTarget ? chooseSpellTarget(state, sideKey, card) : null;
      if (spec.needsTarget && !target) continue;
      const result = Core.playCard(state, {
        side: sideKey,
        cardUid: card.uid,
        targetUid: target && target.uid,
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

function runGame(playerDeckIds, enemyDeckIds, seed) {
  const rng = mulberry32(seed * 101 + 11);
  const state = makeState(playerDeckIds, enemyDeckIds, seed);
  for (let turn = 0; turn < MAX_TURNS && !state.over; turn++) {
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
  return state.winner;
}

function scoreFocus(cardId, copies, seedOffset) {
  let score = 0;
  for (let i = 0; i < SIM_SEEDS; i++) {
    const seed = seedOffset + i;
    const base = randomDeck(seed * 3 + 1, [cardId]);
    const focus = injectCard(base, cardId, copies);
    const winA = runGame(focus, base, seed * 7 + 1);
    const winB = runGame(base, focus, seed * 7 + 2);
    score += winA === "player" ? 1 : winA === "draw" ? 0.5 : 0;
    score += winB === "enemy" ? 1 : winB === "draw" ? 0.5 : 0;
  }
  return score / (SIM_SEEDS * 2);
}

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

  console.log("== R59 balance sim ==");
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
  if (failures.length) {
    console.error("Balance failures:");
    failures.forEach((failure) => console.error(" - " + failure));
    process.exit(1);
  }
  console.log("Balance sim passed.");
}

run();
