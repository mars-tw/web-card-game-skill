/* =========================================================================
 * test-cards.js — cards.js 的健全性測試（CI 用，零依賴，純 Node）
 * 執行：node scripts/test-cards.js
 * 任何斷言失敗會以 exit code 1 結束，讓 CI 標記失敗。
 * ========================================================================= */

const path = require("path");
const cards = require(path.join(__dirname, "..", "templates", "card-battle", "cards.js"));
const { CARD_POOL, RARITY, KEYWORDS, CARD_TYPE, rollCardByRarity, getCardById, collectKey } = cards;

let failed = 0;
function assert(cond, msg) {
  if (cond) { console.log("  ✓ " + msg); }
  else { console.error("  ✗ " + msg); failed++; }
}

console.log("== 結構檢查 ==");
assert(Array.isArray(CARD_POOL) && CARD_POOL.length >= 20, `卡池至少 20 張（實際 ${CARD_POOL.length}）`);
assert(Object.keys(RARITY).length === 4, "稀有度有 4 級");
assert(Object.keys(KEYWORDS).length >= 5, "關鍵字技能至少 5 種");

console.log("== 欄位完整性 ==");
let badFields = 0;
for (const c of CARD_POOL) {
  if (!c.id || !c.name || !c.type || !c.rarity || c.cost == null) badFields++;
  if (!("image" in c)) badFields++;
  if (!("foil" in c)) badFields++;
  if (c.type === CARD_TYPE.MINION && !Array.isArray(c.keywords)) badFields++;
}
assert(badFields === 0, `所有卡欄位完整（異常 ${badFields}）`);

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

console.log("");
if (failed === 0) { console.log("✅ 全部測試通過"); process.exit(0); }
else { console.error(`❌ ${failed} 項測試失敗`); process.exit(1); }
