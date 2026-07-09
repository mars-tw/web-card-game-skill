/* =========================================================================
 * test-cards.js — cards.js 的健全性測試（CI 用，零依賴，純 Node）
 * 執行：node scripts/test-cards.js
 * 任何斷言失敗會以 exit code 1 結束，讓 CI 標記失敗。
 * ========================================================================= */

const path = require("path");
const cards = require(path.join(__dirname, "..", "templates", "card-battle", "cards.js"));
const { CARD_POOL, RARITY, KEYWORDS, CARD_TYPE, DISMANTLE_VALUE, AXIS_LABELS, FACTIONS, CARD_FACTION, rollCardByRarity, getCardById, collectKey, cardAxisLabel, factionLabel } = cards;
const R16_NEW_IDS = [
  "sparkSquire", "alleySkirmisher", "emberVolley", "bulwarkMonk", "dawnRider",
  "battleDrummer", "sanctuaryWarden", "tidebinderHex", "bastionColossus", "highArchivist",
];
const R47_NEW_IDS = [
  "frenzyCub", "frostBiter", "arcaneApprentice", "novicePage", "ragingBrute", "frostChanneler",
  "arcaneInfusion", "frostReaver", "arcaneWeaver", "flameBurst", "archLoremaster", "frostboundTyrant",
];
const R48_NEW_IDS = [
  "emberpup", "frostfangDire", "thunderRoc", "soulfrostRaven", "runicScrivener", "tidecallerAdept",
  "watchtowerBowman", "oathbannerHerald", "dawnArchbishop", "tacticalRequisition", "glaciarchWarden", "countessLongNight",
];

let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log("  ✓ " + msg); }
  else { console.error("  ✗ " + msg); failed++; }
}

console.log("== 結構檢查 ==");
assert(Array.isArray(CARD_POOL) && CARD_POOL.length >= 62, `卡池至少 62 張（實際 ${CARD_POOL.length}）`);
assert(Array.isArray(CARD_POOL) && CARD_POOL.length >= 74, `CARD_POOL has at least 74 cards (actual ${CARD_POOL.length})`);
assert(Object.keys(RARITY).length === 4, "稀有度有 4 級");
assert(Object.keys(KEYWORDS).length >= 5, "關鍵字技能至少 5 種");
assert(KEYWORDS.lifesteal?.label === "吸血" && KEYWORDS.rush?.label === "突襲", "新關鍵字吸血與突襲有繁中 label");
assert(KEYWORDS.frenzy?.label === "狂怒" && KEYWORDS.spellpower?.label === "法強", "R47 關鍵字狂怒與法強有繁中 label");
assert(AXIS_LABELS.aggro === "快攻" && AXIS_LABELS.control === "控制" && AXIS_LABELS.neutral === "中立", "軸線標籤完整");

console.log("== 欄位完整性 ==");
let badFields = 0;
for (const c of CARD_POOL) {
  if (!c.id || !c.name || !c.type || !c.rarity || c.cost == null) badFields++;
  if (!("image" in c)) badFields++;
  if (!("foil" in c)) badFields++;
  if (typeof c.flavor !== "string" || c.flavor.trim().length < 8) badFields++;
  if (!["aggro", "control", "neutral"].includes(c.axis)) badFields++;
  if (!cardAxisLabel(c)) badFields++;
  if (!FACTIONS[c.faction]) badFields++;
  if (!factionLabel(c)) badFields++;
  if (c.type === CARD_TYPE.MINION && !Array.isArray(c.keywords)) badFields++;
}
assert(badFields === 0, `所有卡欄位完整（異常 ${badFields}）`);

console.log("== R16 新卡分布 ==");
const newCards = R16_NEW_IDS.map((id) => getCardById(id));
const newRarity = newCards.reduce((acc, c) => { if (c) acc[c.rarity] = (acc[c.rarity] || 0) + 1; return acc; }, {});
const newAxis = newCards.reduce((acc, c) => { if (c) acc[c.axis] = (acc[c.axis] || 0) + 1; return acc; }, {});
const newCosts = newCards.map((c) => c && c.cost).filter((n) => typeof n === "number");
assert(newCards.every(Boolean), "R16 新卡 id 全部存在");
assert(newRarity.common === 4 && newRarity.rare === 3 && newRarity.epic === 2 && newRarity.legendary === 1,
  `R16 新卡四稀有度分布為 4/3/2/1（實際 ${JSON.stringify(newRarity)}）`);
assert(newAxis.aggro === 5 && newAxis.control === 5, `R16 新卡快攻/控制各 5 張（實際 ${JSON.stringify(newAxis)}）`);
assert(Math.min(...newCosts) <= 1 && Math.max(...newCosts) >= 6 && newCosts.filter((cost) => cost <= 3).length >= 6,
  "R16 新卡費用曲線含低費節奏與高費控制收束");

console.log("== R47 霜鋒與奧術 ==");
const r47Cards = R47_NEW_IDS.map((id) => getCardById(id));
const r47Rarity = r47Cards.reduce((acc, c) => { if (c) acc[c.rarity] = (acc[c.rarity] || 0) + 1; return acc; }, {});
const r47Axis = r47Cards.reduce((acc, c) => { if (c) acc[c.axis] = (acc[c.axis] || 0) + 1; return acc; }, {});
const r47Costs = r47Cards.map((c) => c && c.cost).filter((n) => typeof n === "number");
assert(r47Cards.every(Boolean), "R47 12 張新卡 id 全部存在");
assert(r47Rarity.common === 4 && r47Rarity.rare === 3 && r47Rarity.epic === 3 && r47Rarity.legendary === 2,
  `R47 稀有度分布為 4/3/3/2（實際 ${JSON.stringify(r47Rarity)}）`);
assert(r47Axis.aggro === 6 && r47Axis.control === 6, `R47 快攻/控制各 6 張（實際 ${JSON.stringify(r47Axis)}）`);
assert(r47Costs.includes(1) && r47Costs.includes(7), "R47 費用曲線含 1 費與 7 費");
assert(r47Cards.every((c) => typeof c.flavor === "string" && c.flavor.length >= 8), "R47 風味文字完整且至少 8 字");

console.log("== R48 White Tide Chronicle ==");
const r48Cards = R48_NEW_IDS.map((id) => getCardById(id));
const r48Rarity = r48Cards.reduce((acc, c) => { if (c) acc[c.rarity] = (acc[c.rarity] || 0) + 1; return acc; }, {});
const r48Axis = r48Cards.reduce((acc, c) => { if (c) acc[c.axis] = (acc[c.axis] || 0) + 1; return acc; }, {});
const r48Costs = r48Cards.map((c) => c && c.cost).filter((n) => typeof n === "number");
assert(r48Cards.every(Boolean), "R48 12 new ids exist");
assert(r48Rarity.common === 4 && r48Rarity.rare === 3 && r48Rarity.epic === 3 && r48Rarity.legendary === 2,
  `R48 rarity split is 4/3/3/2 (actual ${JSON.stringify(r48Rarity)})`);
assert(r48Axis.aggro === 6 && r48Axis.control === 6, `R48 axis split is 6/6 (actual ${JSON.stringify(r48Axis)})`);
assert(r48Costs.includes(1) && r48Costs.includes(7), "R48 cost curve includes 1 and 7");
assert(r48Cards.every((c) => typeof c.flavor === "string" && c.flavor.trim().length >= 8), "R48 flavor text is present");
assert(r48Cards.every((c) => FACTIONS[c.faction]), "R48 faction ids all resolve");
assert(Object.keys(FACTIONS).length === 4 && Object.keys(CARD_FACTION).length >= 74, "R48 factions cover the full card pool");

console.log("== id 唯一性 ==");
const ids = CARD_POOL.map((c) => c.id);
assert(new Set(ids).size === ids.length, "卡片 id 無重複");

console.log("== 技能 trigger 對應 ==");
// 戰吼/亡語的卡必須有 trigger
let missingTrigger = 0;
for (const c of CARD_POOL) {
  const kw = c.keywords || [];
  if ((kw.includes("battlecry") || kw.includes("deathrattle")) && !c.trigger) missingTrigger++;
}
assert(missingTrigger === 0, `戰吼/亡語卡都有 trigger（缺 ${missingTrigger}）`);

let unknownKeyword = 0;
for (const c of CARD_POOL) {
  for (const keyword of c.keywords || []) {
    if (!KEYWORDS[keyword] || !KEYWORDS[keyword].label) unknownKeyword++;
  }
}
assert(unknownKeyword === 0, `所有卡牌關鍵字都有定義（缺 ${unknownKeyword}）`);

console.log("== 嚴格優勢回歸檢查 ==");
const firebolt = getCardById("firebolt");
const emberVolley = getCardById("emberVolley");
const shieldUp = getCardById("shieldUp");
const arcaneVeil = getCardById("arcaneVeil");
const sparkSquire = getCardById("sparkSquire");
const frontScout = getCardById("frontScout");
const griffin = getCardById("griffin");
const thunderRoc = getCardById("thunderRoc");
assert(emberVolley.effect === firebolt.effect && emberVolley.cost === firebolt.cost,
  "餘燼齊射不再以更低費嚴格優於火焰箭");
assert(arcaneVeil.effect === shieldUp.effect && arcaneVeil.cost === shieldUp.cost,
  "秘能護幕不再以更高費嚴格劣於聖盾術");
assert(frontScout.cost > sparkSquire.cost && frontScout.health > sparkSquire.health,
  "前線斥候用較高生命區隔火花侍從");
assert(thunderRoc.cost < griffin.cost && thunderRoc.attack < griffin.attack && thunderRoc.health === griffin.health,
  "雷翼巨鵬用低費低攻區隔獅鷲");

console.log("== 抽卡機率分布（30000 抽）==");
const N = 30000, dist = {};
let foilCount = 0;
for (let i = 0; i < N; i++) {
  const c = rollCardByRarity();
  dist[c.rarity] = (dist[c.rarity] || 0) + 1;
  if (c.foil) foilCount++;
}
const legendaryPct = (dist.legendary / N) * 100;
const foilPct = (foilCount / N) * 100;
console.log(`    分布:`, dist, `| 傳說 ${legendaryPct.toFixed(2)}% | 閃卡 ${foilPct.toFixed(2)}%`);
assert(legendaryPct > 0.5 && legendaryPct < 5, `傳說機率在合理範圍（${legendaryPct.toFixed(2)}%）`);
assert(foilPct > 4 && foilPct < 14, `閃卡機率接近 8%（${foilPct.toFixed(2)}%）`);

console.log("== 工具函式 ==");
assert(getCardById("dragon")?.name === "烈焰巨龍", "getCardById 正常");
assert(collectKey({ id: "x", foil: true }) === "x#foil", "collectKey 區分閃卡");

console.log("== 經濟回收 ==");
assert(DISMANTLE_VALUE.common === 2 && DISMANTLE_VALUE.rare === 8 && DISMANTLE_VALUE.epic === 25 && DISMANTLE_VALUE.legendary === 80,
  "分解值使用 cards.js 真實匯出值（普 2 / 稀 8 / 史 25 / 傳 80）");
const totalWeight = Object.values(RARITY).reduce((sum, rarity) => sum + rarity.weight, 0);
const duplicateDustPerCard = Object.entries(RARITY).reduce((sum, [rarity, spec]) => {
  return sum + (spec.weight / totalWeight) * DISMANTLE_VALUE[rarity];
}, 0);
const duplicateDustPerPack = duplicateDustPerCard * 5;
console.log(`    全重複一包期望回收：${duplicateDustPerPack.toFixed(2)} 金幣`);
assert(duplicateDustPerPack < 50, `全重複分解期望低於包價 50%（${duplicateDustPerPack.toFixed(2)} < 50）`);

console.log("");
if (failed === 0) { console.log("✅ 全部測試通過"); process.exit(0); }
else { console.error(`❌ ${failed} 項測試失敗`); process.exit(1); }
