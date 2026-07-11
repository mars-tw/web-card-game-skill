/* =========================================================================
 * cards.js — 卡牌資料定義（戰鬥對戰 + 抽牌卡包共用的核心資料層）
 *
 * 改版重點：
 *  - 卡池已擴充到 74 張，戰鬥與開包共用同一份資料。
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
const TIDE_CHANCE = 0.03;

// 重複卡分解金幣值。卡包頁與 Node 測試共用，避免經濟 gate 測到複製常數。
const DISMANTLE_VALUE = { common: 2, rare: 8, epic: 25, legendary: 80 };

const CARD_TYPE = { MINION: "minion", SPELL: "spell" };

const FACTIONS = Object.freeze({
  wardens: Object.freeze({
    id: "wardens",
    name: "白潮守軍",
    emoji: "⚜️",
    color: "#3b82f6",
    legend: "白潮守軍在永冬邊緣築城，不以退路計算勇氣。他們相信城牆不是石頭，而是每一個仍願意留下的人；當霜鋒軍團敲響北門，守軍便把晨鐘、傷兵與最後一盞燈都藏進盾後，直到白潮再度拍上王城的階梯。",
  }),
  conclave: Object.freeze({
    id: "conclave",
    name: "奧術結社",
    emoji: "🔮",
    color: "#a855f7",
    legend: "奧術結社守著典藏塔，也守著世界仍可被理解的秩序。他們不把知識視為王冠，而視為天秤；每一本禁書都被鎖在星光與誓言之間，因為法術一旦只為勝利服務，下一個被犧牲的往往就是明日。",
  }),
  wild: Object.freeze({
    id: "wild",
    name: "荒野獸群",
    emoji: "🐾",
    color: "#f59e0b",
    legend: "荒野獸群不承認王城的疆界，也不接受典藏塔的註解。牠們從雷雨、林火與月下獵徑中學會自由，願意為一口熱血衝向寒冬；牠們不是白潮的臣民，卻常在城門將破時，從最不可能的山脊奔來。",
  }),
  wintershadow: Object.freeze({
    id: "wintershadow",
    name: "凜冬暗影",
    emoji: "🌘",
    color: "#60a5fa",
    legend: "凜冬暗影以絕望為食，卻從不急著吞下獵物。霜縛暴君把整個冬天鎖進胸腔，血月女王便在圍城的夢裡倒酒；他們帶來的不是死亡本身，而是讓人相信春天從未存在過的漫長夜色。",
  }),
});

/* 關鍵字技能定義（顯示用；實際規則在 core.js）：
 *   taunt        嘲諷  — 敵方必須先攻擊有嘲諷的隨從
 *   charge       衝鋒  — 召喚當回合即可攻擊（無召喚病）
 *   battlecry    戰吼  — 出場時觸發一次效果
 *   deathrattle  亡語  — 死亡時觸發一次效果
 *   divineshield 聖盾  — 免疫第一次受到的傷害
 *   windfury     連擊  — 每回合可攻擊兩次
 *   poison       劇毒  — 對隨從造成傷害時，無視血量直接消滅
 *   regenerate   回復  — 每回合結束時補滿生命
 *   lifesteal    吸血  — 造成傷害時為己方英雄恢復等量生命
 *   rush         突襲  — 登場當回合可攻擊隨從，但不能攻擊英雄
 *   frenzy       狂怒  — 首次受傷存活後，攻擊 +2
 *   spellpower   法強  — 在場時你的傷害法術 +1
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
  lifesteal:    { label: "吸血", icon: "🩸", desc: "造成傷害時，為己方英雄恢復等量生命。" },
  rush:         { label: "突襲", icon: "💨", desc: "登場當回合可攻擊隨從，但不能攻擊英雄。" },
  frenzy:       { label: "狂怒", icon: "🔥", desc: "首次受傷存活後，攻擊 +2。" },
  spellpower:   { label: "法強", icon: "✨", desc: "在場時你的傷害法術 +1（可疊加）。" },
  silence:      { label: "靜默", icon: "🤫", desc: "移除隨從的關鍵字、聖盾與觸發效果（包含亡語），但保留攻擊與生命。" },
};

/**
 * 卡牌總表（卡池）。
 *   keywords  關鍵字技能陣列（隨從用），如 ["taunt"]、["battlecry"]
 *   trigger   戰吼/亡語對應的效果代號，由 core.js 解析
 *   foil      星級變體：母表一律 false，抽卡時才可能 roll 成 true
 */
const CARD_POOL = [
  // ===== 隨從 minion（16）=====
  // 普通
  { id: "footman",   name: "見習士兵", type: CARD_TYPE.MINION, rarity: "common", cost: 1, attack: 1, health: 2, emoji: "🗡️", image: "../../assets/cards/footman.png", keywords: ["taunt"], text: "前排肉盾。", foil: false },
  { id: "archer",    name: "弓箭手",   type: CARD_TYPE.MINION, rarity: "common", cost: 2, attack: 2, health: 2, emoji: "🏹", image: "../../assets/cards/archer.png", keywords: [], text: "輸出穩定的萬用兵。", foil: false },
  { id: "wolf",      name: "迅捷狼",   type: CARD_TYPE.MINION, rarity: "common", cost: 2, attack: 2, health: 2, emoji: "🐺", image: "../../assets/cards/wolf.png", keywords: ["charge"], text: "登場即可撲咬。", foil: false },
  { id: "cleric",    name: "見習牧師", type: CARD_TYPE.MINION, rarity: "common", cost: 2, attack: 1, health: 3, emoji: "🙏", image: "../../assets/cards/cleric.png", keywords: ["battlecry"], trigger: "healHero2", text: "戰吼：為英雄恢復 2 點。", foil: false },
  // 稀有
  { id: "knight",    name: "鋼鐵騎士", type: CARD_TYPE.MINION, rarity: "rare", cost: 3, attack: 3, health: 4, emoji: "🛡️", image: "../../assets/cards/knight.png", keywords: ["taunt"], text: "攻守兼備的中堅。", foil: false },
  { id: "mage",      name: "秘法師",   type: CARD_TYPE.MINION, rarity: "rare", cost: 4, attack: 4, health: 3, emoji: "🔮", image: "../../assets/cards/mage.png", keywords: ["battlecry"], trigger: "damageAny1", text: "戰吼：自動對生命最低的敵方隨從造成 1 點傷害。", foil: false },
  { id: "raptor",    name: "迅猛龍",   type: CARD_TYPE.MINION, rarity: "rare", cost: 4, attack: 2, health: 3, emoji: "🦖", image: "../../assets/cards/raptor.png", keywords: ["charge", "poison"], text: "衝鋒 + 劇毒：撲咬即殺。", foil: false },
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
  { id: "archmage",  name: "大法師",   type: CARD_TYPE.MINION, rarity: "legendary", cost: 7, attack: 4, health: 6, emoji: "🧙", image: "../../assets/cards/archmage.png", keywords: ["battlecry"], trigger: "aoeEnemy2", text: "戰吼：對所有敵方隨從造成 2 點傷害。", foil: false },

  // ===== 法術 spell（8）=====
  { id: "firebolt",  name: "火焰箭",   type: CARD_TYPE.SPELL, rarity: "common", cost: 2, emoji: "☄️", image: "../../assets/cards/firebolt.png", text: "對一個敵方隨從造成 3 點傷害。", effect: "damage3", foil: false },
  { id: "heal",      name: "治療術",   type: CARD_TYPE.SPELL, rarity: "common", cost: 2, emoji: "💚", image: "../../assets/cards/heal.png", text: "為你的英雄恢復 5 點生命。", effect: "heal5", foil: false },
  { id: "shieldUp",  name: "聖盾術",   type: CARD_TYPE.SPELL, rarity: "common", cost: 1, emoji: "🛡️", image: "../../assets/cards/shieldUp.png", text: "給一個友方隨從一層聖盾。", effect: "giveShield", foil: false },
  { id: "manaSurge", name: "法力湧動", type: CARD_TYPE.SPELL, rarity: "rare", cost: 0, emoji: "💎", image: "../../assets/cards/manaSurge.png", text: "本回合獲得 2 點額外法力。", effect: "mana2", foil: false },
  { id: "frost",     name: "冰霜新星", type: CARD_TYPE.SPELL, rarity: "rare", cost: 3, emoji: "❄️", image: "../../assets/cards/frost.png", text: "對所有敵方隨從造成 1 點傷害。", effect: "aoe1", foil: false },
  { id: "lightning", name: "閃電風暴", type: CARD_TYPE.SPELL, rarity: "epic", cost: 4, emoji: "⚡", image: "../../assets/cards/lightning.png", text: "對所有敵方隨從造成 2 點傷害。", effect: "aoe2", foil: false },
  { id: "polymorph", name: "變形術",   type: CARD_TYPE.SPELL, rarity: "epic", cost: 4, emoji: "🐑", image: "../../assets/cards/polymorph.png", text: "把一個敵方隨從變成 1/1 綿羊。", effect: "polymorph", foil: false },
  { id: "meteor",    name: "隕石術",   type: CARD_TYPE.SPELL, rarity: "legendary", cost: 6, emoji: "🌠", image: "../../assets/cards/meteor.png", text: "對一個敵方隨從造成 8 點傷害。", effect: "damage8", foil: false },

  // ===== Stage 4 擴充（16 張，追加不改舊卡 id）=====
  // 普通
  { id: "mooncat",       name: "月光貓",   type: CARD_TYPE.MINION, rarity: "common", cost: 1, attack: 1, health: 2, emoji: "🐈", image: null, keywords: ["lifesteal"], text: "吸血：小巧但能拖住血線。", foil: false },
  { id: "frontScout",    name: "前線斥候", type: CARD_TYPE.MINION, rarity: "common", cost: 2, attack: 2, health: 2, emoji: "🪶", image: null, keywords: ["rush"], text: "突襲：登場可攻擊隨從。", foil: false },
  { id: "groveHerbalist", name: "林地藥師", type: CARD_TYPE.MINION, rarity: "common", cost: 3, attack: 2, health: 3, emoji: "🌿", image: null, keywords: ["battlecry"], trigger: "healHero2", text: "戰吼：為英雄恢復 2 點。", foil: false },
  { id: "holyGlimmer",   name: "聖光閃耀", type: CARD_TYPE.SPELL,  rarity: "common", cost: 2, emoji: "🌤️", image: null, text: "為你的英雄恢復 5 點生命。", effect: "heal5", foil: false },

  // 稀有
  { id: "duskwrightBat", name: "暮影蝠",   type: CARD_TYPE.MINION, rarity: "rare", cost: 2, attack: 2, health: 2, emoji: "🦇", image: null, keywords: ["lifesteal"], text: "吸血：穩定回補生命。", foil: false },
  { id: "linebreaker",   name: "破陣槍兵", type: CARD_TYPE.MINION, rarity: "rare", cost: 3, attack: 3, health: 2, emoji: "🪓", image: null, keywords: ["rush"], text: "突襲：清掉前排威脅。", foil: false },
  { id: "bannerGuard",   name: "戰旗守衛", type: CARD_TYPE.MINION, rarity: "rare", cost: 4, attack: 2, health: 6, emoji: "🚩", image: null, keywords: ["taunt", "battlecry"], trigger: "healHero2", text: "嘲諷。戰吼：恢復 2 點生命。", foil: false },
  { id: "thunderClap",   name: "雷霆震擊", type: CARD_TYPE.SPELL,  rarity: "rare", cost: 3, emoji: "🌩️", image: null, text: "對所有敵方隨從造成 1 點傷害。", effect: "aoe1", foil: false },
  { id: "arcaneVeil",    name: "秘能護幕", type: CARD_TYPE.SPELL,  rarity: "rare", cost: 1, emoji: "🔷", image: null, text: "給一個友方隨從一層聖盾。", effect: "giveShield", foil: false },

  // 史詩
  { id: "abyssWalker",   name: "深淵行者", type: CARD_TYPE.MINION, rarity: "epic", cost: 5, attack: 4, health: 6, emoji: "🕳️", image: null, keywords: ["taunt", "lifesteal"], text: "嘲諷 + 吸血的續戰核心。", foil: false },
  { id: "stormGriffin",  name: "暴風獅鷲", type: CARD_TYPE.MINION, rarity: "epic", cost: 6, attack: 4, health: 4, emoji: "🦅", image: null, keywords: ["rush", "windfury"], text: "突襲 + 連擊：一回合處理兩個威脅。", foil: false },
  { id: "duskWitch",     name: "暮光女巫", type: CARD_TYPE.MINION, rarity: "epic", cost: 5, attack: 3, health: 5, emoji: "🧹", image: null, keywords: ["battlecry", "lifesteal"], trigger: "damageAny1", text: "戰吼：自動對生命最低的敵方隨從造成 1 點傷害。吸血。", foil: false },
  { id: "starfall",      name: "星界崩落", type: CARD_TYPE.SPELL,  rarity: "epic", cost: 5, emoji: "☄️", image: null, text: "對所有敵方隨從造成 2 點傷害。", effect: "aoe2", foil: false },
  { id: "forbiddenHex",  name: "禁咒變形", type: CARD_TYPE.SPELL,  rarity: "epic", cost: 5, emoji: "🐸", image: null, text: "把一個敵方隨從變成 1/1 綿羊。", effect: "polymorph", foil: false },

  // 傳說
  { id: "bloodmoonQueen", name: "血月女王", type: CARD_TYPE.MINION, rarity: "legendary", cost: 7, attack: 6, health: 6, emoji: "👑", image: null, keywords: ["charge", "lifesteal"], text: "衝鋒 + 吸血：逆轉血線的傳說威脅。", foil: false },
  { id: "skyJudicator",  name: "天穹裁決者", type: CARD_TYPE.MINION, rarity: "legendary", cost: 9, attack: 9, health: 9, emoji: "⚖️", image: null, keywords: ["rush", "taunt", "divineshield"], text: "突襲 + 嘲諷 + 聖盾：終局裁決。", foil: false },
  // ===== R16 構築軸線擴充：快攻 5 張、控制 5 張 =====
  { id: "sparkSquire",    name: "火花侍從", type: CARD_TYPE.MINION, rarity: "common", cost: 1, attack: 2, health: 1, emoji: "🗡️", image: null, keywords: ["rush"], text: "突襲：前期搶回場面的小型突擊手。", foil: false },
  { id: "alleySkirmisher", name: "巷戰斥候", type: CARD_TYPE.MINION, rarity: "common", cost: 2, attack: 3, health: 1, emoji: "🏃", image: null, keywords: ["charge"], text: "衝鋒：立刻壓低敵方血量。", foil: false },
  { id: "emberVolley",    name: "餘燼齊射", type: CARD_TYPE.SPELL,  rarity: "common", cost: 1, emoji: "🔥", image: null, text: "對一個敵方手下造成 2 點傷害。", effect: "damage2", foil: false },
  { id: "bulwarkMonk",    name: "壁壘武僧", type: CARD_TYPE.MINION, rarity: "common", cost: 3, attack: 1, health: 5, emoji: "🛡️", image: null, keywords: ["taunt"], text: "嘲諷：用厚實身軀拖慢快攻。", foil: false },
  { id: "dawnRider",      name: "晨鋒騎手", type: CARD_TYPE.MINION, rarity: "rare", cost: 3, attack: 3, health: 2, emoji: "🌅", image: null, keywords: ["charge", "lifesteal"], text: "衝鋒 + 吸血：進攻同時穩住血線。", foil: false },
  { id: "battleDrummer",  name: "戰鼓手", type: CARD_TYPE.MINION, rarity: "rare", cost: 2, attack: 1, health: 3, emoji: "🥁", image: null, keywords: ["battlecry"], trigger: "damageAny1", text: "戰吼：自動對生命最低的敵方手下造成 1 點傷害。", foil: false },
  { id: "sanctuaryWarden", name: "聖所看守", type: CARD_TYPE.MINION, rarity: "rare", cost: 4, attack: 2, health: 6, emoji: "⛪", image: null, keywords: ["taunt", "battlecry"], trigger: "healHero2", text: "嘲諷。戰吼：為你的英雄恢復 2 點生命。", foil: false },
  { id: "tidebinderHex",  name: "縛潮咒印", type: CARD_TYPE.SPELL,  rarity: "epic", cost: 4, emoji: "🌊", image: null, text: "將一個敵方手下變成 1/1 綿羊。", effect: "polymorph", foil: false },
  { id: "bastionColossus", name: "棱堡巨像", type: CARD_TYPE.MINION, rarity: "epic", cost: 6, attack: 4, health: 8, emoji: "🗿", image: null, keywords: ["taunt", "regenerate"], text: "嘲諷 + 再生：控制牌組的防線核心。", foil: false },
  { id: "highArchivist",  name: "至高典藏師", type: CARD_TYPE.MINION, rarity: "legendary", cost: 6, attack: 3, health: 8, emoji: "📚", image: null, keywords: ["taunt", "battlecry"], trigger: "aoeEnemy2", text: "嘲諷。戰吼：對所有敵方手下造成 2 點傷害。", foil: false },

  // ===== R47 霜鋒與奧術：狂怒 6 張、法強/法術 6 張 =====
  { id: "frenzyCub",       name: "燼鬃幼獅", type: CARD_TYPE.MINION, rarity: "common", cost: 1, attack: 1, health: 2, emoji: "🦁", image: "../../assets/cards/frenzyCub.png", keywords: ["frenzy"], text: "狂怒：首次受傷存活後攻擊 +2。", foil: false },
  { id: "frostBiter",      name: "霜齒撕咬者", type: CARD_TYPE.MINION, rarity: "common", cost: 2, attack: 2, health: 2, emoji: "🐺", image: "../../assets/cards/frostBiter.png", keywords: ["rush", "frenzy"], text: "突襲 + 狂怒：越打越兇。", foil: false },
  { id: "arcaneApprentice", name: "奧術學徒", type: CARD_TYPE.MINION, rarity: "common", cost: 2, attack: 1, health: 3, emoji: "📘", image: "../../assets/cards/arcaneApprentice.png", keywords: ["spellpower"], text: "法強：你的傷害法術 +1。", foil: false },
  { id: "novicePage",      name: "見習書僮", type: CARD_TYPE.MINION, rarity: "common", cost: 2, attack: 1, health: 1, emoji: "📜", image: "../../assets/cards/novicePage.png", keywords: ["battlecry"], trigger: "drawCard1", text: "戰吼：抽 1 張牌。", foil: false },
  { id: "ragingBrute",     name: "狂怒蠻兵", type: CARD_TYPE.MINION, rarity: "rare", cost: 3, attack: 3, health: 4, emoji: "🪓", image: "../../assets/cards/ragingBrute.png", keywords: ["frenzy"], text: "狂怒：受傷後立刻變成重擊威脅。", foil: false },
  { id: "frostChanneler",  name: "霜脈引導者", type: CARD_TYPE.MINION, rarity: "rare", cost: 4, attack: 2, health: 5, emoji: "❄️", image: "../../assets/cards/frostChanneler.png", keywords: ["spellpower"], text: "法強：讓霜火法術更加致命。", foil: false },
  { id: "arcaneInfusion",  name: "秘能灌注", type: CARD_TYPE.SPELL, rarity: "rare", cost: 3, emoji: "💫", image: "../../assets/cards/arcaneInfusion.png", text: "使一個友方隨從 +2/+2。", effect: "buffTarget", foil: false },
  { id: "frostReaver",     name: "霜鋒劫掠者", type: CARD_TYPE.MINION, rarity: "epic", cost: 5, attack: 4, health: 5, emoji: "🧊", image: "../../assets/cards/frostReaver.png", keywords: ["rush", "frenzy"], text: "突襲 + 狂怒：先解場，再壓迫。", foil: false },
  { id: "arcaneWeaver",    name: "奧術織者", type: CARD_TYPE.MINION, rarity: "epic", cost: 4, attack: 3, health: 4, emoji: "🪄", image: "../../assets/cards/arcaneWeaver.png", keywords: ["spellpower", "battlecry"], trigger: "drawCard1", text: "法強。戰吼：抽 1 張牌。", foil: false },
  { id: "flameBurst",      name: "烈焰爆裂", type: CARD_TYPE.SPELL, rarity: "epic", cost: 4, emoji: "🔥", image: "../../assets/cards/flameBurst.png", text: "對一個敵方隨從造成 5 點傷害。", effect: "damage5", foil: false },
  { id: "archLoremaster",  name: "大博學者", type: CARD_TYPE.MINION, rarity: "legendary", cost: 7, attack: 4, health: 7, emoji: "📚", image: "../../assets/cards/archLoremaster.png", keywords: ["spellpower", "battlecry"], trigger: "drawCard1", text: "法強。戰吼：抽 1 張牌。", foil: false },
  { id: "frostboundTyrant", name: "霜縛暴君", type: CARD_TYPE.MINION, rarity: "legendary", cost: 7, attack: 6, health: 8, emoji: "👑", image: "../../assets/cards/frostboundTyrant.png", keywords: ["taunt", "frenzy"], text: "嘲諷 + 狂怒：受傷後守線反擊。", foil: false },

  // ===== R48 白潮編年史：快攻 6 張、控制 6 張 =====
  { id: "emberpup",        name: "餘燼幼犬", type: CARD_TYPE.MINION, rarity: "common", cost: 1, attack: 2, health: 1, emoji: "🐕", image: null, keywords: ["charge"], text: "衝鋒：小小火光也能先咬住戰線。", foil: false },
  { id: "frostfangDire",   name: "霜牙巨狼", type: CARD_TYPE.MINION, rarity: "epic", cost: 5, attack: 5, health: 4, emoji: "🐺", image: "../../assets/cards/frostfangDire.png", keywords: ["rush", "frenzy"], text: "突襲 + 狂怒：冰息撕開前排。", foil: false },
  { id: "thunderRoc",      name: "雷翼巨鵬", type: CARD_TYPE.MINION, rarity: "rare", cost: 4, attack: 2, health: 4, emoji: "🦅", image: null, keywords: ["windfury"], text: "連擊：雷聲落下兩次。", foil: false },
  { id: "soulfrostRaven",  name: "魂霜渡鴉", type: CARD_TYPE.MINION, rarity: "rare", cost: 3, attack: 2, health: 3, emoji: "🐦", image: null, keywords: ["lifesteal"], text: "吸血：啄食寒意，回補生命。", foil: false },
  { id: "runicScrivener",  name: "符文抄寫員", type: CARD_TYPE.MINION, rarity: "common", cost: 2, attack: 1, health: 2, emoji: "✒️", image: null, keywords: ["battlecry"], trigger: "drawCard1", text: "戰吼：抽 1 張牌。", foil: false },
  { id: "tidecallerAdept", name: "喚潮學徒", type: CARD_TYPE.MINION, rarity: "common", cost: 2, attack: 1, health: 3, emoji: "🌊", image: null, keywords: ["spellpower"], text: "法強：潮聲推高你的傷害法術。", foil: false },
  { id: "watchtowerBowman", name: "望塔弓手", type: CARD_TYPE.MINION, rarity: "common", cost: 2, attack: 2, health: 3, emoji: "🏹", image: null, keywords: [], text: "守線射手：穩定壓低敵方攻勢。", foil: false },
  { id: "oathbannerHerald", name: "誓旗傳令", type: CARD_TYPE.MINION, rarity: "rare", cost: 3, attack: 2, health: 4, emoji: "🚩", image: "../../assets/cards/oathbannerHerald.png", keywords: ["battlecry", "taunt"], trigger: "healHero2", text: "嘲諷。戰吼：為英雄恢復 2 點。", foil: false },
  { id: "dawnArchbishop", name: "晨曦大主教", type: CARD_TYPE.MINION, rarity: "legendary", cost: 7, attack: 4, health: 8, emoji: "⛪", image: "../../assets/cards/dawnArchbishop.png", keywords: ["battlecry", "divineshield"], trigger: "healHero2", text: "聖盾。戰吼：為英雄恢復 2 點。", foil: false },
  { id: "tacticalRequisition", name: "戰術徵調", type: CARD_TYPE.SPELL, rarity: "epic", cost: 3, emoji: "📦", image: null, text: "抽 2 張牌。", effect: "draw2", foil: false },
  { id: "glaciarchWarden", name: "冰獄看守", type: CARD_TYPE.MINION, rarity: "epic", cost: 6, attack: 3, health: 8, emoji: "🧊", image: "../../assets/cards/glaciarchWarden.png", keywords: ["taunt", "regenerate"], text: "嘲諷 + 回復：寒牢不讓任何人通過。", foil: false },
  { id: "countessLongNight", name: "長夜伯爵夫人", type: CARD_TYPE.MINION, rarity: "legendary", cost: 7, attack: 5, health: 7, emoji: "🌙", image: "../../assets/cards/countessLongNight.png", keywords: ["deathrattle", "lifesteal"], trigger: "summonSkeleton", text: "吸血。亡語：召喚一個骷髏(2/2)。", foil: false },

  // ===== R55 快贏內容基線：10 張差分卡 + silence 2 張 =====
  { id: "saltShieldSquire", name: "鹽盾侍從", type: CARD_TYPE.MINION, rarity: "common", cost: 1, attack: 0, health: 3, emoji: "🛡️", image: null, keywords: ["taunt"], text: "嘲諷。便宜的前排，不負責收頭。", foil: false },
  { id: "iceNeedle", name: "冰針", type: CARD_TYPE.SPELL, rarity: "common", cost: 1, emoji: "❄️", image: null, text: "對一個敵方隨從造成 1 點傷害；若其有嘲諷，再造成 1 點。", effect: "damage2", baseDamage: 1, tauntBonusDamage: 1, foil: false },
  { id: "packHowler", name: "狼群嚎者", type: CARD_TYPE.MINION, rarity: "rare", cost: 3, attack: 2, health: 3, emoji: "🐺", image: null, keywords: ["charge", "battlecry"], trigger: "buffAdjacent1", text: "衝鋒。戰吼：相鄰友方隨從攻擊 +1。", foil: false },
  { id: "toxinViper", name: "毒涎蝰", type: CARD_TYPE.MINION, rarity: "rare", cost: 3, attack: 1, health: 3, emoji: "🐍", image: null, keywords: ["poison", "rush"], text: "劇毒、突襲。低攻擊的精準交換工具。", foil: false },
  { id: "graveScribe", name: "墓碑抄寫員", type: CARD_TYPE.MINION, rarity: "rare", cost: 3, attack: 1, health: 4, emoji: "✒️", image: null, keywords: ["deathrattle"], trigger: "drawCard1", text: "亡語：抽 1 張牌。", foil: false },
  { id: "mirrorRime", name: "鏡霜", type: CARD_TYPE.SPELL, rarity: "epic", cost: 2, emoji: "🪞", image: null, text: "選擇友方隨從，複製你場上嘲諷隨從的生命差，最多 +3 生命。", effect: "buffTarget", mirrorRime: true, foil: false },
  { id: "dualTalon", name: "雙爪獵手", type: CARD_TYPE.MINION, rarity: "epic", cost: 4, attack: 2, health: 3, emoji: "🗡️", image: null, keywords: ["windfury"], text: "連擊。可攻擊兩次。", foil: false },
  { id: "voidTithe", name: "虛空什一稅", type: CARD_TYPE.SPELL, rarity: "epic", cost: 3, emoji: "🕳️", image: null, text: "對敵方英雄造成 2 點傷害；本回合你的下一張法術少 1 費。", effect: "nextSpellMinus1", foil: false },
  { id: "captainGreywake", name: "灰潮船長", type: CARD_TYPE.MINION, rarity: "legendary", cost: 6, attack: 5, health: 6, emoji: "⚓", image: null, keywords: ["taunt", "battlecry"], trigger: "aoeEnemy1", text: "嘲諷。戰吼：對所有敵方隨從造成 1 點傷害。", foil: false },
  { id: "ladyAshenBell", name: "灰鐘女士", type: CARD_TYPE.MINION, rarity: "legendary", cost: 5, attack: 3, health: 5, emoji: "🔔", image: null, keywords: ["deathrattle", "lifesteal"], trigger: "summonTwo1_1", text: "吸血。亡語：召喚兩個 1/1 灰鈴侍從。", foil: false },
  { id: "silenceOne", name: "封口咒", type: CARD_TYPE.SPELL, rarity: "epic", cost: 2, emoji: "🤫", image: null, keywords: ["silence"], text: "使一個敵方隨從靜默，移除關鍵字、聖盾與亡語。保留攻擊與生命。", effect: "polymorph", silenceOnly: true, foil: false },
  { id: "scoutInterrogator", name: "斥候訊問", type: CARD_TYPE.MINION, rarity: "rare", cost: 3, attack: 2, health: 3, emoji: "🕵️", image: null, keywords: ["battlecry"], trigger: "silenceIfDamaged", text: "戰吼：使一個已受傷的敵方隨從靜默。", foil: false },
];

const AXIS_LABELS = Object.freeze({ aggro: "快攻", control: "控制", neutral: "中立" });
const CARD_AXIS = Object.freeze({
  footman: "control", archer: "neutral", wolf: "aggro", cleric: "neutral",
  knight: "control", mage: "neutral", raptor: "aggro", guardian: "control",
  golem: "control", griffin: "aggro", lich: "neutral", paladin: "control",
  dragon: "aggro", phoenix: "neutral", titan: "control", archmage: "control",
  firebolt: "aggro", heal: "control", shieldUp: "control", manaSurge: "aggro",
  frost: "control", lightning: "control", polymorph: "control", meteor: "control",
  mooncat: "aggro", frontScout: "aggro", groveHerbalist: "control", holyGlimmer: "control",
  duskwrightBat: "aggro", linebreaker: "aggro", bannerGuard: "control", thunderClap: "aggro",
  arcaneVeil: "control", abyssWalker: "control", stormGriffin: "aggro", duskWitch: "control",
  starfall: "control", forbiddenHex: "control", bloodmoonQueen: "aggro", skyJudicator: "control",
  sparkSquire: "aggro", alleySkirmisher: "aggro", emberVolley: "aggro", bulwarkMonk: "control",
  dawnRider: "aggro", battleDrummer: "aggro", sanctuaryWarden: "control", tidebinderHex: "control",
  bastionColossus: "control", highArchivist: "control",
  frenzyCub: "aggro", frostBiter: "aggro", arcaneApprentice: "control", novicePage: "control",
  ragingBrute: "aggro", frostChanneler: "control", arcaneInfusion: "aggro", frostReaver: "aggro",
  arcaneWeaver: "control", flameBurst: "aggro", archLoremaster: "control", frostboundTyrant: "control",
  emberpup: "aggro", frostfangDire: "aggro", thunderRoc: "aggro", soulfrostRaven: "aggro",
  runicScrivener: "aggro", tidecallerAdept: "aggro", watchtowerBowman: "control", oathbannerHerald: "control",
  dawnArchbishop: "control", tacticalRequisition: "control", glaciarchWarden: "control", countessLongNight: "control",
  saltShieldSquire: "control", iceNeedle: "aggro", packHowler: "aggro", toxinViper: "aggro", graveScribe: "control",
  mirrorRime: "control", dualTalon: "aggro", voidTithe: "control", captainGreywake: "control", ladyAshenBell: "control",
  silenceOne: "control", scoutInterrogator: "control",
});
const CARD_FLAVOR = Object.freeze({
  footman: "城門下的第一面盾，總是比晨鐘更早醒來。",
  archer: "她的箭會先抵達，警告才跟著風聲傳來。",
  wolf: "迅捷狼只認得兩種路：獵物的路與回家的路。",
  cleric: "巡禮者說他的祝禱像暖燈，也像最後一道命令。",
  knight: "白潮騎士守住的不是橋，而是城民仍能相信的明天。",
  mage: "她把火星藏進袖口，讓敵人以為那只是禮節。",
  raptor: "毒牙迅猛龍的影子掠過時，草葉會先枯一半。",
  guardian: "守護者從不追擊；他只是讓敵人無路可走。",
  golem: "古岩魔像每走一步，都像王國舊誓重新落印。",
  griffin: "雙翼獅鷲俯衝兩次，第二次通常已經沒人看見。",
  lich: "巫妖保存記憶的方式，是讓死者替他繼續說話。",
  paladin: "聖盾騎士的盔甲映著太陽，也映著未退的敵軍。",
  dragon: "炎龍只在王冠熔化時，才承認自己曾經降落。",
  phoenix: "不滅鳳凰的灰燼裡，總有一枚還燙手的黎明。",
  titan: "遠古泰坦睡在山脈之下，呼吸就是季節。",
  archmage: "大法師從不高聲施法，因為雷霆會替他回答。",
  firebolt: "火焰箭很短，短到敵人來不及後悔。",
  heal: "治癒術不能改寫戰爭，只能替下一次選擇爭取時間。",
  shieldUp: "聖盾術的光很薄，卻足以隔開命運的一擊。",
  manaSurge: "法力湧泉在地底翻身時，連學徒都能聽見星光。",
  frost: "霜環術不是寒冷，而是把戰場按下暫停。",
  lightning: "雷鏈只問距離，不問身分。",
  polymorph: "變形術最殘酷的地方，是敵人還記得自己曾經威風。",
  meteor: "隕星術墜落後，地圖師會多畫一個湖。",
  mooncat: "月影貓踩過屋脊，傷口便像夜色一樣慢慢合攏。",
  frontScout: "前線斥候帶回的不是情報，而是敵人還沒反應的空隙。",
  groveHerbalist: "林地藥師認得每片葉子，也認得每種疼痛。",
  holyGlimmer: "聖光微芒不足以照亮城牆，卻足以讓守軍站起來。",
  duskwrightBat: "暮翼蝠從鐘樓倒掛，等戰鼓替牠數拍。",
  linebreaker: "破陣者只衝最窄的缺口，因為那裡最容易撕開戰線。",
  bannerGuard: "戰旗守衛倒下之前，旗影不會碰到地面。",
  thunderClap: "雷鳴掌響起時，前排士兵會同時低頭。",
  arcaneVeil: "秘法帷幕像薄霧，遮住的是傷口，也是恐懼。",
  abyssWalker: "深淵行者把黑潮披在肩上，替盟友擋下最冷的浪。",
  stormGriffin: "暴風獅鷲在雲層裡磨爪，等一道閃電開門。",
  duskWitch: "暮色女巫從不交易靈魂，她只收取未說出口的願望。",
  starfall: "星墜術落下時，整片夜空都像被重新洗牌。",
  forbiddenHex: "禁咒變形把傲慢折小，直到牠只剩咩聲。",
  bloodmoonQueen: "血月女王的微笑很輕，足以讓整座城失眠。",
  skyJudicator: "天穹裁決者降臨時，審判先於影子落地。",
  sparkSquire: "火花侍從還不懂恐懼，只懂向前。",
  alleySkirmisher: "巷戰斥候熟悉每一條捷徑，也熟悉每一次背刺。",
  emberVolley: "餘燼齊射來自撤退的火堆，專打追兵的腳步。",
  bulwarkMonk: "壁壘武僧的沉默，比任何城門都厚。",
  dawnRider: "晨鋒騎手把第一道日光磨成槍尖。",
  battleDrummer: "戰鼓手敲下節拍，讓整條前線同時吸氣。",
  sanctuaryWarden: "聖所看守不問來者姓名，只問還能不能站起來。",
  tidebinderHex: "縛潮咒印把怒濤繫成細繩，再繫到敵人的腳踝。",
  bastionColossus: "棱堡巨像不是被建造出來的，是城牆自己學會了走路。",
  highArchivist: "至高典藏師翻開禁頁時，灰塵會先替敵軍默哀。",
  frenzyCub: "牠第一次嚐到疼痛時，鬃火才真正醒來。",
  frostBiter: "霜齒咬住獵物，也咬住敵人的退路。",
  arcaneApprentice: "學徒背熟的第一句咒語，是別讓光熄滅。",
  novicePage: "見習書僮跑得不快，卻總能把關鍵頁送到。",
  ragingBrute: "狂怒蠻兵聽不懂撤退，只聽得見骨裂聲。",
  frostChanneler: "霜脈引導者把呼吸放慢，讓整座戰場結冰。",
  arcaneInfusion: "秘能灌注像第二次心跳，催促勇者再上前。",
  frostReaver: "霜鋒劫掠者的刀光，會先把恐懼凍住。",
  arcaneWeaver: "奧術織者牽動一線星光，就能改寫整場交換。",
  flameBurst: "烈焰爆裂沒有方向，只有被吞沒的中心。",
  archLoremaster: "大博學者翻頁之前，敵軍已被答案壓低頭。",
  frostboundTyrant: "霜縛暴君舉盾時，冬天便有了王座。",
  emberpup: "牠守著營火最小的一角，卻總是第一個衝進暴雪。",
  frostfangDire: "霜牙巨狼的喘息像破裂冰湖，獵物聽見時已無路可退。",
  thunderRoc: "雷翼巨鵬掠過雲脊，替荒野把自由寫成閃電。",
  soulfrostRaven: "魂霜渡鴉啄走垂死者的寒意，也啄回一點不肯熄滅的心跳。",
  runicScrivener: "他抄下每一道退路，只為在最亂的夜裡找回前進的句子。",
  tidecallerAdept: "喚潮學徒聽見海在冰層下翻身，便相信白潮終會回來。",
  watchtowerBowman: "他數過雪落的次數，卻從不數自己站了多久。",
  oathbannerHerald: "誓旗升起時，連受傷的人都想起自己曾經發誓不退。",
  dawnArchbishop: "他祝禱的不是勝利，是還有人值得被守護。",
  tacticalRequisition: "補給隊遲到三天，卻總在最需要的那一頁準時抵達。",
  glaciarchWarden: "冰獄看守不問囚名，因為被關住的其實是整個冬天。",
  countessLongNight: "她收藏黑夜，只為了記得白天長什麼樣子。",
  saltShieldSquire: "他把鹽殼盾舉得很高，讓後排終於能喘一口氣。",
  iceNeedle: "針尖只刺一點，卻足以讓盾牆出現裂縫。",
  packHowler: "狼群聽見嚎聲時，連影子都會向前一步。",
  toxinViper: "毒涎蝰不追求壯烈，只追求一次正確的咬合。",
  graveScribe: "墓碑抄寫員記下名字，也把下一頁留給仍在戰鬥的人。",
  mirrorRime: "鏡霜不複製榮光，只借來一層能活下去的寒意。",
  dualTalon: "雙爪獵手從不問哪一爪命中，牠只確認兩爪都已揮出。",
  voidTithe: "虛空收走一枚代價，再把下一句咒語說得更輕。",
  captainGreywake: "灰潮船長登岸時，甲板上的浪先替他清場。",
  ladyAshenBell: "灰鐘女士的鐘聲落下後，侍從才真正開始工作。",
  silenceOne: "封口咒不改寫肉身，只把那些吵鬧的奇蹟一一熄掉。",
  scoutInterrogator: "斥候訊問擅長找到裂口，然後讓那裂口失去聲音。",
});

const CARD_FACTION = Object.freeze({
  footman: "wardens", archer: "wardens", cleric: "wardens", knight: "wardens", guardian: "wardens",
  golem: "wardens", paladin: "wardens", titan: "wardens", groveHerbalist: "wardens", holyGlimmer: "wardens",
  bannerGuard: "wardens", sanctuaryWarden: "wardens", bulwarkMonk: "wardens", dawnRider: "wardens",
  shieldUp: "wardens", heal: "wardens", arcaneVeil: "wardens", bastionColossus: "wardens",
  battleDrummer: "wardens", watchtowerBowman: "wardens", oathbannerHerald: "wardens", dawnArchbishop: "wardens",
  saltShieldSquire: "wardens", mirrorRime: "wardens", captainGreywake: "wardens", scoutInterrogator: "wardens",
  mage: "conclave", archmage: "conclave", arcaneApprentice: "conclave", arcaneWeaver: "conclave",
  archLoremaster: "conclave", novicePage: "conclave", highArchivist: "conclave", frostChanneler: "conclave",
  manaSurge: "conclave", firebolt: "conclave", frost: "conclave", lightning: "conclave", meteor: "conclave",
  polymorph: "conclave", forbiddenHex: "conclave", tidebinderHex: "conclave", starfall: "conclave",
  thunderClap: "conclave", arcaneInfusion: "conclave", flameBurst: "conclave", emberVolley: "conclave",
  runicScrivener: "conclave", tidecallerAdept: "conclave", tacticalRequisition: "conclave",
  iceNeedle: "conclave", graveScribe: "conclave", silenceOne: "conclave",
  wolf: "wild", raptor: "wild", griffin: "wild", phoenix: "wild", dragon: "wild", frenzyCub: "wild",
  frostBiter: "wild", ragingBrute: "wild", frostReaver: "wild", stormGriffin: "wild", mooncat: "wild",
  frontScout: "wild", linebreaker: "wild", sparkSquire: "wild", alleySkirmisher: "wild", emberpup: "wild",
  frostfangDire: "wild", thunderRoc: "wild", packHowler: "wild", toxinViper: "wild", dualTalon: "wild",
  lich: "wintershadow", duskwrightBat: "wintershadow", duskWitch: "wintershadow", abyssWalker: "wintershadow",
  skyJudicator: "wintershadow", bloodmoonQueen: "wintershadow", frostboundTyrant: "wintershadow",
  soulfrostRaven: "wintershadow", glaciarchWarden: "wintershadow", countessLongNight: "wintershadow",
  voidTithe: "wintershadow", ladyAshenBell: "wintershadow",
});

for (const card of CARD_POOL) {
  card.axis = CARD_AXIS[card.id] || "neutral";
  card.faction = CARD_FACTION[card.id] || "wardens";
  card.flavor = CARD_FLAVOR[card.id] || "這張卡仍在等待屬於自己的傳說。";
}

function cardAxisLabel(card) {
  const axis = card && card.axis ? card.axis : "neutral";
  return AXIS_LABELS[axis] || AXIS_LABELS.neutral;
}

function factionLabel(card) {
  const faction = card && card.faction ? card.faction : "wardens";
  return FACTIONS[faction] ? FACTIONS[faction].name : FACTIONS.wardens.name;
}

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
  card.tide = Math.random() < TIDE_CHANCE;
  card.foil = !card.tide && Math.random() < FOIL_CHANCE; // 閃卡
  return card;
}

// 收集鍵：閃卡與普通版視為不同收藏（提高收集難度）。
function collectKey(card) {
  if (card.tide) return card.id + "#tide";
  return card.foil ? card.id + "#foil" : card.id;
}

// 讓瀏覽器與 Node 兩種載入都可用。
if (typeof window !== "undefined") {
  Object.assign(window, { RARITY, FOIL_CHANCE, TIDE_CHANCE, DISMANTLE_VALUE, CARD_TYPE, KEYWORDS, FACTIONS, CARD_POOL, AXIS_LABELS, CARD_FACTION, getCardById, cloneCard, rollCardByRarity, collectKey, cardAxisLabel, factionLabel });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RARITY, FOIL_CHANCE, TIDE_CHANCE, DISMANTLE_VALUE, CARD_TYPE, KEYWORDS, FACTIONS, CARD_POOL, AXIS_LABELS, CARD_FACTION, getCardById, cloneCard, rollCardByRarity, collectKey, cardAxisLabel, factionLabel };
}
