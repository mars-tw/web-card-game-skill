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

// 重複卡分解金幣值。卡包頁與 Node 測試共用，避免經濟 gate 測到複製常數。
const DISMANTLE_VALUE = { common: 2, rare: 8, epic: 25, legendary: 80 };

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
  { id: "archer",    name: "弓箭手",   type: CARD_TYPE.MINION, rarity: "common", cost: 2, attack: 2, health: 2, emoji: "🏹", image: "../../assets/cards/archer.png", keywords: [], text: "輸出穩定的萬用兵。", foil: false },
  { id: "wolf",      name: "迅捷狼",   type: CARD_TYPE.MINION, rarity: "common", cost: 2, attack: 2, health: 2, emoji: "🐺", image: "../../assets/cards/wolf.png", keywords: ["charge"], text: "登場即可撲咬。", foil: false },
  { id: "cleric",    name: "見習牧師", type: CARD_TYPE.MINION, rarity: "common", cost: 2, attack: 1, health: 3, emoji: "🙏", image: "../../assets/cards/cleric.png", keywords: ["battlecry"], trigger: "healHero2", text: "戰吼：為英雄恢復 2 點。", foil: false },
  // 稀有
  { id: "knight",    name: "鋼鐵騎士", type: CARD_TYPE.MINION, rarity: "rare", cost: 3, attack: 3, health: 4, emoji: "🛡️", image: "../../assets/cards/knight.png", keywords: ["taunt"], text: "攻守兼備的中堅。", foil: false },
  { id: "mage",      name: "秘法師",   type: CARD_TYPE.MINION, rarity: "rare", cost: 4, attack: 4, health: 3, emoji: "🔮", image: "../../assets/cards/mage.png", keywords: ["battlecry"], trigger: "damageAny1", text: "戰吼：對一個目標造成 1 點傷害。", foil: false },
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
  { id: "frontScout",    name: "前線斥候", type: CARD_TYPE.MINION, rarity: "common", cost: 2, attack: 2, health: 1, emoji: "🪶", image: null, keywords: ["rush"], text: "突襲：登場可攻擊隨從。", foil: false },
  { id: "groveHerbalist", name: "林地藥師", type: CARD_TYPE.MINION, rarity: "common", cost: 3, attack: 2, health: 3, emoji: "🌿", image: null, keywords: ["battlecry"], trigger: "healHero2", text: "戰吼：為英雄恢復 2 點。", foil: false },
  { id: "holyGlimmer",   name: "聖光閃耀", type: CARD_TYPE.SPELL,  rarity: "common", cost: 2, emoji: "🌤️", image: null, text: "為你的英雄恢復 5 點生命。", effect: "heal5", foil: false },

  // 稀有
  { id: "duskwrightBat", name: "暮影蝠",   type: CARD_TYPE.MINION, rarity: "rare", cost: 2, attack: 2, health: 2, emoji: "🦇", image: null, keywords: ["lifesteal"], text: "吸血：穩定回補生命。", foil: false },
  { id: "linebreaker",   name: "破陣槍兵", type: CARD_TYPE.MINION, rarity: "rare", cost: 3, attack: 3, health: 2, emoji: "🪓", image: null, keywords: ["rush"], text: "突襲：清掉前排威脅。", foil: false },
  { id: "bannerGuard",   name: "戰旗守衛", type: CARD_TYPE.MINION, rarity: "rare", cost: 4, attack: 2, health: 6, emoji: "🚩", image: null, keywords: ["taunt", "battlecry"], trigger: "healHero2", text: "嘲諷。戰吼：恢復 2 點生命。", foil: false },
  { id: "thunderClap",   name: "雷霆震擊", type: CARD_TYPE.SPELL,  rarity: "rare", cost: 3, emoji: "🌩️", image: null, text: "對所有敵方隨從造成 1 點傷害。", effect: "aoe1", foil: false },
  { id: "arcaneVeil",    name: "秘能護幕", type: CARD_TYPE.SPELL,  rarity: "rare", cost: 2, emoji: "🔷", image: null, text: "給一個友方隨從一層聖盾。", effect: "giveShield", foil: false },

  // 史詩
  { id: "abyssWalker",   name: "深淵行者", type: CARD_TYPE.MINION, rarity: "epic", cost: 5, attack: 4, health: 6, emoji: "🕳️", image: null, keywords: ["taunt", "lifesteal"], text: "嘲諷 + 吸血的續戰核心。", foil: false },
  { id: "stormGriffin",  name: "暴風獅鷲", type: CARD_TYPE.MINION, rarity: "epic", cost: 6, attack: 4, health: 4, emoji: "🦅", image: null, keywords: ["rush", "windfury"], text: "突襲 + 連擊：一回合處理兩個威脅。", foil: false },
  { id: "duskWitch",     name: "暮光女巫", type: CARD_TYPE.MINION, rarity: "epic", cost: 5, attack: 3, health: 5, emoji: "🧹", image: null, keywords: ["battlecry", "lifesteal"], trigger: "damageAny1", text: "戰吼：造成 1 點傷害。吸血。", foil: false },
  { id: "starfall",      name: "星界崩落", type: CARD_TYPE.SPELL,  rarity: "epic", cost: 5, emoji: "☄️", image: null, text: "對所有敵方隨從造成 2 點傷害。", effect: "aoe2", foil: false },
  { id: "forbiddenHex",  name: "禁咒變形", type: CARD_TYPE.SPELL,  rarity: "epic", cost: 5, emoji: "🐸", image: null, text: "把一個敵方隨從變成 1/1 綿羊。", effect: "polymorph", foil: false },

  // 傳說
  { id: "bloodmoonQueen", name: "血月女王", type: CARD_TYPE.MINION, rarity: "legendary", cost: 7, attack: 6, health: 6, emoji: "👑", image: null, keywords: ["charge", "lifesteal"], text: "衝鋒 + 吸血：逆轉血線的傳說威脅。", foil: false },
  { id: "skyJudicator",  name: "天穹裁決者", type: CARD_TYPE.MINION, rarity: "legendary", cost: 9, attack: 9, health: 9, emoji: "⚖️", image: null, keywords: ["rush", "taunt", "divineshield"], text: "突襲 + 嘲諷 + 聖盾：終局裁決。", foil: false },
  // ===== R16 構築軸線擴充：快攻 5 張、控制 5 張 =====
  { id: "sparkSquire",    name: "火花侍從", type: CARD_TYPE.MINION, rarity: "common", cost: 1, attack: 2, health: 1, emoji: "🗡️", image: null, keywords: ["rush"], text: "突襲：前期搶回場面的小型突擊手。", foil: false },
  { id: "alleySkirmisher", name: "巷戰斥候", type: CARD_TYPE.MINION, rarity: "common", cost: 2, attack: 3, health: 1, emoji: "🏃", image: null, keywords: ["charge"], text: "衝鋒：立刻壓低敵方血量。", foil: false },
  { id: "emberVolley",    name: "餘燼齊射", type: CARD_TYPE.SPELL,  rarity: "common", cost: 1, emoji: "🔥", image: null, text: "對一個敵方手下造成 3 點傷害。", effect: "damage3", foil: false },
  { id: "bulwarkMonk",    name: "壁壘武僧", type: CARD_TYPE.MINION, rarity: "common", cost: 3, attack: 1, health: 5, emoji: "🛡️", image: null, keywords: ["taunt"], text: "嘲諷：用厚實身軀拖慢快攻。", foil: false },
  { id: "dawnRider",      name: "晨鋒騎手", type: CARD_TYPE.MINION, rarity: "rare", cost: 3, attack: 3, health: 2, emoji: "🌅", image: null, keywords: ["charge", "lifesteal"], text: "衝鋒 + 吸血：進攻同時穩住血線。", foil: false },
  { id: "battleDrummer",  name: "戰鼓手", type: CARD_TYPE.MINION, rarity: "rare", cost: 2, attack: 1, health: 3, emoji: "🥁", image: null, keywords: ["battlecry"], trigger: "damageAny1", text: "戰吼：對一個敵方手下造成 1 點傷害。", foil: false },
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
});

for (const card of CARD_POOL) {
  card.axis = CARD_AXIS[card.id] || "neutral";
  card.flavor = CARD_FLAVOR[card.id] || "這張卡仍在等待屬於自己的傳說。";
}

function cardAxisLabel(card) {
  const axis = card && card.axis ? card.axis : "neutral";
  return AXIS_LABELS[axis] || AXIS_LABELS.neutral;
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
  card.foil = Math.random() < FOIL_CHANCE; // 閃卡
  return card;
}

// 收集鍵：閃卡與普通版視為不同收藏（提高收集難度）。
function collectKey(card) {
  return card.foil ? card.id + "#foil" : card.id;
}

// 讓瀏覽器與 Node 兩種載入都可用。
if (typeof window !== "undefined") {
  Object.assign(window, { RARITY, FOIL_CHANCE, DISMANTLE_VALUE, CARD_TYPE, KEYWORDS, CARD_POOL, AXIS_LABELS, getCardById, cloneCard, rollCardByRarity, collectKey, cardAxisLabel });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RARITY, FOIL_CHANCE, DISMANTLE_VALUE, CARD_TYPE, KEYWORDS, CARD_POOL, AXIS_LABELS, getCardById, cloneCard, rollCardByRarity, collectKey, cardAxisLabel };
}
