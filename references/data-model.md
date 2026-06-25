# 卡牌資料結構說明 (data-model.md)

要新增卡片、調整數值、加稀有度或加法術效果，都在這份說明的範圍內。
唯一要改的檔案是 `templates/card-battle/cards.js`（卡包模板也載入它）。

## 一張卡的欄位

```js
{
  id: "dragon",            // 唯一識別字；也用於圖檔命名 assets/cards/<id>.png
  name: "烈焰巨龍",         // 顯示名稱
  type: CARD_TYPE.MINION,  // MINION（隨從，可上場攻擊）或 SPELL（法術，即時效果）
  rarity: "legendary",     // common | rare | epic | legendary
  cost: 7,                 // 法力消耗
  attack: 8,               // 攻擊力（minion 用；spell 可省略）
  health: 8,               // 生命值（minion 用；spell 可省略）
  emoji: "🐉",             // 佔位圖案（沒有 image 時顯示）
  image: null,             // 美術路徑；null = 用 emoji；填路徑後自動換圖
  keywords: ["charge"],    // 隨從的關鍵字技能陣列（見下方「關鍵字技能」）
  trigger: "rebirth",      // 戰吼/亡語對應的效果代號（對應 battle.js 的 ABILITY_EFFECTS）
  text: "傳說中的毀滅之力。", // 卡面說明
  effect: "damage3",       // 僅 SPELL 需要：對應 battle.js 的 SPELL_EFFECTS 代號
  foil: false,             // 星級變體：母表一律 false，抽卡時才 roll 成 true（閃卡）
}
```

## 關鍵字技能

隨從靠 `keywords` 陣列帶技能，這是「需要思考」的核心。可組合多個（如 `["taunt","divineshield"]`）：

| 代號 | 技能 | 規則 |
|------|------|------|
| `taunt` | 嘲諷 | 場上有嘲諷時，攻擊方只能打嘲諷隨從（不能打臉/打別的） |
| `charge` | 衝鋒 | 召喚當回合即可攻擊（無召喚病） |
| `battlecry` | 戰吼 | 出場時觸發 `trigger` 效果一次 |
| `deathrattle` | 亡語 | 死亡時觸發 `trigger` 效果一次 |
| `divineshield` | 聖盾 | 免疫第一次受到的傷害（破盾後才正常扣血） |

`battlecry` / `deathrattle` 要搭配 `trigger`，對應 `battle.js` 的 `ABILITY_EFFECTS`（如
`healHero2`、`damageAny1`、`summonSkeleton`、`rebirth`、`aoeEnemy2`）。要加新觸發效果就在
`ABILITY_EFFECTS` 註冊一個代號。

## 新增一張隨從

在 `CARD_POOL` 陣列加一筆即可，例如：

```js
// 一個帶嘲諷+聖盾的肉盾
{ id: "wall", name: "魔法石牆", type: CARD_TYPE.MINION, rarity: "rare",
  cost: 4, attack: 1, health: 6, emoji: "🧱", image: null,
  keywords: ["taunt", "divineshield"], text: "嘲諷 + 聖盾。", foil: false },
```

## 新增一張法術

法術要有 `effect`，並到 `battle.js` 的 `SPELL_EFFECTS` 註冊行為：

```js
// cards.js
{ id: "frost", name: "冰霜新星", type: CARD_TYPE.SPELL, rarity: "rare",
  cost: 3, emoji: "❄️", image: null,
  text: "對所有敵方隨從造成 1 點傷害。", effect: "aoe1" },

// battle.js 的 SPELL_EFFECTS 物件加：
aoe1: { needsTarget: null,
        apply: (g) => { [...g.enemy.field].forEach(m => damageMinion(g, m, 1)); } },
```

`needsTarget` 可為：
- `null`：施放後立即生效（如治療、全體傷害、加法力）
- `"enemyMinion"`：需玩家點選一個敵方隨從當目標（如單體火焰箭）

## 調整稀有度 / 抽卡機率

`RARITY` 物件的 `weight` 決定抽到的相對機率（不需加總為 100）：

```js
const RARITY = {
  common:    { label: "普通", weight: 60, color: "#9aa5b1", glow: "..." },
  rare:      { label: "稀有", weight: 25, color: "#3b82f6", glow: "..." },
  epic:      { label: "史詩", weight: 12, color: "#a855f7", glow: "..." },
  legendary: { label: "傳說", weight: 3,  color: "#f59e0b", glow: "..." },
};
```

`color` 同時是卡框邊色與發光色，改這裡整套卡的視覺就變。

## 平衡建議（經驗法則）

- **法力曲線**：cost ≈ (attack + health) / 2 上下浮動。低費小、高費大。
- **傳說卡**要明顯比同費強，但保持 cost 6+ 避免太早出場。
- **法術**通常 cost 比「等值隨從」略低，因為即時且無法被反打。
- 牌庫預設 20 張隨機抽（`buildDeck()`）；想要固定牌組可改成手寫陣列。

## 數值如何流動（給要改引擎的人）

1. `buildDeck()` → 用 `rollCardByRarity()` 抽 20 張組牌庫
2. `drawCard()` → 從牌庫 pop 一張進手牌，並貼上戰局唯一 `uid`
3. `playFromHand()` → 扣法力、隨從進 `field` / 法術跑 `SPELL_EFFECTS`
4. `resolveAttack()` → 雙方互扣血量，`cleanupField()` 清掉 health ≤ 0 的隨從
5. `checkWin()` → 任一英雄 hp ≤ 0 結束
