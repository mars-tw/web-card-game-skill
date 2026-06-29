/* =========================================================================
 * cards.js — 卡牌資料定義（戰鬥對戰 + 抽牌卡包共用的核心資料層）
 *
 * v2 改版重點：
 *  - 卡池擴充到 24 張（隨從 16 + 法術 8），收集難度自然提高。
 *  - 每張隨從可帶「關鍵字技能」keywords：嘲諷/衝鋒/亡語/戰吼/聖盾。
 *  - 調降高稀有權重（傳說 3→1.5），抽卡更難。
 *  - 加入「星級變體」：抽卡時有機率變成 foil（閃卡，金色版），更稀有。
 *  - 每張卡都有 image 欄位，預設 null → emoji 佔位；填路徑後自動換圖。
 *  - 此檔同時被 card-battle 與 card-pack 載入，是單一事實來源。
 * ========================================================================= */

// 稀有度：權重越大越常抽到；高稀有權重已調降以提高難度。
// glowSize：稀有度發光強度（普通不發光，越稀有越亮）。idle：是否常駐呼吸光。
const RARITY = {
  common:    { label: "普通", stars: 1, weight: 62,  color: "#9aa5b1", glow: "rgba(154,165,177,.5)", glowSize: 0,  idle: false },
  rare:      { label: "稀有", stars: 2, weight: 26,  color: "#3b82f6", glow: "rgba(59,130,246,.6)",  glowSize: 14, idle: false },
  epic:      { label: "史詩", stars: 3, weight: 10,  color: "#a855f7", glow: "rgba(168,85,247,.75)", glowSize: 20, idle: false },
  legendary: { label: "傳說", stars: 4, weight: 2,   color: "#f59e0b", glow: "rgba(245,158,11,.9)",  glowSize: 28, idle: true },
};

// 抽卡變成閃卡(foil)的機率（疊在稀有度之上，更稀有）。
const FOIL_CHANCE = 0.08;

const CARD_TYPE = { MINION: "minion", SPELL: "spell" };

/* 關鍵字技能定義（顯示用；實際規則在 battle.js）：
 *   taunt        嘲諷  — 敵方必須先攻擊有嘲諷的隨從
 *   charge       衝鋒  — 召喚當回合即可攻擊（無召喚病）
 *   battlecry    戰吼  — 出場時觸發一次效果
 *   deathrattle  亡語  — 死亡時觸發一次效果
 *   divineshield 聖盾  — 免疫第一次受到的傷害
 *   windfury     連擊  — 每回合可攻擊兩次
 *   poison       劇毒  — 對隨從造成傷害時，無視血量直接消滅
 *   regenerate   回復  — 每回合結束時補滿生命
 */
const KEYWORDS = {
  taunt:        { label: "嘲諷", icon: "🛡", desc: "敵方必須優先攻擊它。" },
  charge:       { label: "衝鋒", icon: "⚡", desc: "登場當回合即可攻擊。" },
  battlecry:    { label: "戰吼", icon: "📣", desc: "登場時觸發效果。" },
  deathrattle:  { label: "亡語", icon: "💀", desc: "死亡時觸發效果。" },
  divineshield: { label: "聖盾", icon: "✨", desc: "免疫第一次受到的傷害。" },
  windfury:     { label: "連擊", icon: "🌀", desc: "每回合可攻擊兩次。" },
  poison:       { label: "劇毒", icon: "🐍", desc: "傷害到隨從即將其消滅。" },
  regenerate:   { label: "回復", icon: "💗", desc: "每回合結束補滿生命。" },
};

/**
 * 卡牌總表（卡池，24 張）。
 *   keywords  關鍵字技能陣列（隨從用），如 ["taunt"]、["battlecry"]
 *   trigger   戰吼/亡語對應的效果代號，由 battle.js 的 ABILITY_EFFECTS 解析
 *   foil      星級變體：母表一律 false，抽卡時才可能 roll 成 true
 */
const CARD_POOL = [
  // ===== 隨從 minion（16）=====
  // 普通
  { id: "footman",   name: "見習士兵", type: CARD_TYPE.MINION, rarity: "common", cost: 1, attack: 1, health: 2, emoji: "🗡️", image: "../../assets/cards/footman.png", keywords: ["taunt"], text: "前排肉盾。", foil: false },
  { id: "archer",    name: "弓箭手",   type: CARD_TYPE.MINION, rarity: "common", cost: 2, attack: 2, health: 1, emoji: "🏹", image: "../../assets/cards/archer.png", keywords: [], text: "脆皮但輸出穩定。", foil: false },
  { id: "wolf",      name: "迅捷狼",   type: CARD_TYPE.MINION, rarity: "common", cost: 2, attack: 2, health: 2, emoji: "🐺", image: "../../assets/cards/wolf.png", keywords: ["charge"], text: "登場即可撲咬。", foil: false },
  { id: "cleric",    name: "見習牧師", type: CARD_TYPE.MINION, rarity: "common", cost: 2, attack: 1, health: 3, emoji: "🙏", image: "../../assets/cards/cleric.png", keywords: ["battlecry"], trigger: "healHero2", text: "戰吼：為英雄恢復 2 點。", foil: false },
  // 稀有
  { id: "knight",    name: "鋼鐵騎士", type: CARD_TYPE.MINION, rarity: "rare", cost: 3, attack: 3, health: 4, emoji: "🛡️", image: "../../assets/cards/knight.png", keywords: ["taunt"], text: "攻守兼備的中堅。", foil: false },
  { id: "mage",      name: "秘法師",   type: CARD_TYPE.MINION, rarity: "rare", cost: 4, attack: 4, health: 3, emoji: "🔮", image: "../../assets/cards/mage.png", keywords: ["battlecry"], trigger: "damageAny1", text: "戰吼：對一個目標造成 1 點傷害。", foil: false },
  { id: "raptor",    name: "迅猛龍",   type: CARD_TYPE.MINION, rarity: "rare", cost: 3, attack: 2, health: 2, emoji: "🦖", image: "../../assets/cards/raptor.png", keywords: ["charge", "poison"], text: "衝鋒 + 劇毒：撲咬即殺。", foil: false },
  { id: "guardian",  name: "符文守衛", type: CARD_TYPE.MINION, rarity: "rare", cost: 4, attack: 2, health: 5, emoji: "🗿", image: "../../assets/cards/guardian.png", keywords: ["taunt", "divineshield"], text: "嘲諷 + 聖盾的銅牆。", foil: false },
  // 史詩
  { id: "golem",     name: "石巨人",   type: CARD_TYPE.MINION, rarity: "epic", cost: 5, attack: 4, health: 7, emoji: "🗿", image: "../../assets/cards/golem.png", keywords: ["taunt"], text: "難以撼動的肉盾。", foil: false },
  { id: "griffin",   name: "獅鷲",     type: CARD_TYPE.MINION, rarity: "epic", cost: 5, attack: 3, health: 4, emoji: "🦅", image: "../../assets/cards/griffin.png", keywords: ["windfury"], text: "連擊：每回合可攻擊兩次。", foil: false },
  { id: "lich",      name: "巫妖",     type: CARD_TYPE.MINION, rarity: "epic", cost: 5, attack: 3, health: 5, emoji: "💀", image: "../../assets/cards/lich.png", keywords: ["deathrattle"], trigger: "summonSkeleton", text: "亡語：召喚一個骷髏(2/2)。", foil: false },
  { id: "paladin",   name: "聖光騎士", type: CARD_TYPE.MINION, rarity: "epic", cost: 4, attack: 3, health: 4, emoji: "⚔️", image: "../../assets/cards/paladin.png", keywords: ["divineshield", "taunt"], text: "聖盾嘲諷的前線壁壘。", foil: false },
  // 傳說
  { id: "dragon",    name: "烈焰巨龍", type: CARD_TYPE.MINION, rarity: "legendary", cost: 7, attack: 8, health: 8, emoji: "🐉", image: "../../assets/cards/dragon.png", keywords: ["charge"], text: "傳說中的毀滅之力，登場即焚敵。", foil: false },
  { id: "phoenix",   name: "不死鳳凰", type: CARD_TYPE.MINION, rarity: "legendary", cost: 6, attack: 5, health: 5, emoji: "🔥", image: "../../assets/cards/phoenix.png", keywords: ["deathrattle"], trigger: "rebirth", text: "亡語：以 1 點生命浴火重生。", foil: false },
  { id: "titan",     name: "遠古泰坦", type: CARD_TYPE.MINION, rarity: "legendary", cost: 8, attack: 8, health: 8, emoji: "🏛️", image: "../../assets/cards/titan.png", keywords: ["taunt", "regenerate"], text: "嘲諷 + 回復：永不倒下的巨神。", foil: false },
  { id: "archmage",  name: "大法師",   type: CARD_TYPE.MINION, rarity: "legendary", cost: 6, attack: 4, health: 6, emoji: "🧙", image: "../../assets/cards/archmage.png", keywords: ["battlecry"], trigger: "aoeEnemy2", text: "戰吼：對所有敵方隨從造成 2 點傷害。", foil: false },

  // ===== 法術 spell（8）=====
  { id: "firebolt",  name: "火焰箭",   type: CARD_TYPE.SPELL, rarity: "common", cost: 2, emoji: "☄️", image: "../../assets/cards/firebolt.png", text: "對一個敵方隨從造成 3 點傷害。", effect: "damage3", foil: false },
  { id: "heal",      name: "治療術",   type: CARD_TYPE.SPELL, rarity: "common", cost: 2, emoji: "💚", image: "../../assets/cards/heal.png", text: "為你的英雄恢復 5 點生命。", effect: "heal5", foil: false },
  { id: "shieldUp",  name: "聖盾術",   type: CARD_TYPE.SPELL, rarity: "common", cost: 1, emoji: "🛡️", image: "../../assets/cards/shieldUp.png", text: "給一個友方隨從一層聖盾。", effect: "giveShield", foil: false },
  { id: "manaSurge", name: "法力湧動", type: CARD_TYPE.SPELL, rarity: "rare", cost: 0, emoji: "💎", image: "../../assets/cards/manaSurge.png", text: "本回合獲得 2 點額外法力。", effect: "mana2", foil: false },
  { id: "frost",     name: "冰霜新星", type: CARD_TYPE.SPELL, rarity: "rare", cost: 3, emoji: "❄️", image: "../../assets/cards/frost.png", text: "對所有敵方隨從造成 1 點傷害。", effect: "aoe1", foil: false },
  { id: "lightning", name: "閃電風暴", type: CARD_TYPE.SPELL, rarity: "epic", cost: 4, emoji: "⚡", image: "../../assets/cards/lightning.png", text: "對所有敵方隨從造成 2 點傷害。", effect: "aoe2", foil: false },
  { id: "polymorph", name: "變形術",   type: CARD_TYPE.SPELL, rarity: "epic", cost: 4, emoji: "🐑", image: "../../assets/cards/polymorph.png", text: "把一個敵方隨從變成 1/1 綿羊。", effect: "polymorph", foil: false },
  { id: "meteor",    name: "隕石術",   type: CARD_TYPE.SPELL, rarity: "legendary", cost: 6, emoji: "🌠", image: "../../assets/cards/meteor.png", text: "對一個敵方隨從造成 8 點傷害。", effect: "damage8", foil: false },
];

// 依 id 取卡（淺拷貝，避免改到母表）。
function getCardById(id) {
  const c = CARD_POOL.find((c) => c.id === id);
  return c ? cloneCard(c) : null;
}

// 卡片深層一點的拷貝（keywords 陣列也複製）。
function cloneCard(c) {
  return { ...c, keywords: c.keywords ? [...c.keywords] : [] };
}

// 依稀有度權重隨機抽一張；並 roll 是否為閃卡(foil)。
function rollCardByRarity() {
  const total = Object.values(RARITY).reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  let picked = "common";
  for (const [key, r] of Object.entries(RARITY)) {
    if (roll < r.weight) { picked = key; break; }
    roll -= r.weight;
  }
  const pool = CARD_POOL.filter((c) => c.rarity === picked);
  const card = cloneCard(pool[Math.floor(Math.random() * pool.length)]);
  card.foil = Math.random() < FOIL_CHANCE; // 閃卡
  return card;
}

// 收集鍵：閃卡與普通版視為不同收藏（提高收集難度）。
function collectKey(card) {
  return card.foil ? card.id + "#foil" : card.id;
}

// 讓瀏覽器與 Node 兩種載入都可用。
if (typeof window !== "undefined") {
  Object.assign(window, { RARITY, FOIL_CHANCE, CARD_TYPE, KEYWORDS, CARD_POOL, getCardById, cloneCard, rollCardByRarity, collectKey });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RARITY, FOIL_CHANCE, CARD_TYPE, KEYWORDS, CARD_POOL, getCardById, cloneCard, rollCardByRarity, collectKey };
}
