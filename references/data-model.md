# 卡牌資料模型

本文件對齊 `templates/card-battle/cards.js`、`core.js`、`battle.js` 與 `templates/card-pack/pack.js`。

## Storage Key

| key | 用途 | schema |
|---|---|---|
| `card_stats_v1` | 對戰/開包共同經濟與戰績 | `STATS_VERSION = 3` |
| `cardpack_collection_v2` | 收藏與閃卡數量 | 物件 map |
| `card_deck_v1` | 玩家牌組 | `DECK_VERSION = 1` |
| `card_quests_v1` | 每日任務 | `QUEST_VERSION = 1` |
| `card_goals_v1` | 收藏里程碑與週任務 | `GOAL_VERSION = 1` |
| `card_chronicle_v1` | 編年史章節領取狀態 | `CHRONICLE_VERSION = 1` |

## 卡牌母表

```js
card = {
  id: "dragon",
  name: "烈焰巨龍",
  type: CARD_TYPE.MINION,      // minion | spell
  rarity: "legendary",        // common | rare | epic | legendary
  cost: 7,
  attack: 8,                  // minion only
  health: 8,                  // minion only
  emoji: "🐉",
  image: "../../assets/cards/dragon.png",
  keywords: ["charge"],
  trigger: "rebirth",
  effect: "damage8",
  text: "顯示文字",
  foil: false
};
```

- `CARD_POOL` 目前 74 張。
- `image: null` 代表使用 emoji fallback。
- `foil` 只在抽卡結果上產生，母表固定 false。

## 稀有度、開包與收藏

| 稀有度 | 權重 | 星級 | 分解值 |
|---|---:|---:|---:|
| common | 62 | 1 | 2 |
| rare | 26 | 2 | 8 |
| epic | 10 | 3 | 25 |
| legendary | 2 | 4 | 80 |

- 閃卡機率 `FOIL_CHANCE = 0.08`。
- `PACK_SIZE = 5`。
- `PACK_COST = 100`，首包免費。
- 若 5 張全為 common，最後一張會重抽到至少 rare。

收藏 shape：

```js
collection = {
  dragon: 1,
  "phoenix#foil": 1
};
```

`collectionSummary(collection)` 會回傳：

```js
{ unique: 74, foil: 15 }
```

## 對戰與牌組

| 常數 | 值 |
|---|---:|
| `START_HP` | 30 |
| `MAX_MANA` | 10 |
| `MAX_FIELD` | 7 |
| `HAND_LIMIT` | 8 |
| `DECK_SIZE` | 20 |

牌組 shape：

```js
deck = {
  version: 1,
  cards: ["footman", "archer"]
};
```

驗證規則：

- 必須剛好 20 張。
- 同名卡最多 2 張。
- 傳說卡最多 1 張。
- 牌組數量不能超過收藏擁有數。
- 進對戰時 `buildBattleDeck(deckCardIds, CARD_POOL, rng, collection)` 會洗牌並保留閃卡狀態。

## 每日任務 `card_quests_v1`

```js
questState = {
  version: 1,
  dateSeed: "2026-07-05",
  quests: [
    { id: "win_1", type: "win", title: "贏得 1 場", target: 1, progress: 0, reward: 30, claimed: false }
  ]
};
```

每日任務池 11 選 3：

| id | type | target | reward |
|---|---|---:|---:|
| `win_1` | `win` | 1 | 30 |
| `play_spell_5` | `playSpell` | 5 | 25 |
| `summon_minion_8` | `summonMinion` | 8 | 25 |
| `hero_damage_20` | `heroDamage` | 20 | 30 |
| `open_pack_1` | `openPack` | 1 | 20 |
| `deck_win_1` | `deckWin` | 1 | 40 |
| `win_2` | `win` | 2 | 40 |
| `summon_minion_12` | `summonMinion` | 12 | 35 |
| `trigger_frenzy_3` | `frenzy` | 3 | 35 |
| `empower_minion_3` | `buffTarget` | 3 | 30 |
| `cast_spell_6` | `playSpell` | 6 | 35 |

`questEventMatches()` 會把 `spellCast` 對應到 `playSpell`，`minionSummoned` 對應到 `summonMinion`。

## 收藏目標 `card_goals_v1`

```js
goalState = {
  version: 1,
  dateSeed: "2026-W27",
  claimedMilestones: ["unique_10"],
  weeklyQuest: {
    id: "weekly_win_3",
    type: "win",
    title: "本週贏得 3 場",
    target: 3,
    progress: 0,
    reward: 100,
    claimed: false
  }
};
```

收藏里程碑：

| id | metric | target | reward |
|---|---|---:|---:|
| `unique_10` | unique | 10 | 40 |
| `unique_20` | unique | 20 | 60 |
| `unique_40` | unique | 40 | 80 |
| `unique_55` | unique | 55 | 20 |
| `foil_5` | foil | 5 | 40 |
| `foil_15` | foil | 15 | 60 |

週任務池：

| id | type | target | reward |
|---|---|---:|---:|
| `weekly_win_3` | `win` | 3 | 100 |
| `weekly_open_pack_3` | `openPack` | 3 | 80 |
| `weekly_summon_30` | `summonMinion` | 30 | 90 |
| `weekly_damage_80` | `heroDamage` | 80 | 120 |
| `weekly_spell_12` | `playSpell` | 12 | 100 |

## 編年史 `card_chronicle_v1`

```js
chronicleState = {
  version: 1,
  claimed: ["prologue_white_tide"]
};
```

編年史章節由勝場、收藏種數或兩者組合解鎖；領取章節獎勵後只保存 `claimed` id 清單。章節內容與解鎖規則以 `CHRONICLE_CHAPTERS` 為準。

## 測試契約

| 指令 | 覆蓋 |
|---|---|
| `node scripts/test-cards.js` | 卡牌資料、稀有度、圖片路徑、抽卡函式 |
| `node scripts/test-core.js` | 對戰核心、存檔遷移、任務、里程碑、週任務、牌組驗證 |
| `node scripts/test-quality-gates.js` | PWA 版本、快取清單、文案與資源一致性 |
| `node scripts/test-battle-e2e.js` | 對戰/開包整合流程、PWA、存檔與手機互動 |
| `node scripts/test-rwd-matrix.js` | shell / battle / pack 九視口 RWD 零違規 |
