# 阿軒卡牌對戰

[![CI & Deploy Pages](https://github.com/mars-tw/web-card-game-skill/actions/workflows/ci.yml/badge.svg)](https://github.com/mars-tw/web-card-game-skill/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Play Online](https://img.shields.io/badge/Play-Pages-brightgreen)](https://mars-tw.github.io/web-card-game-skill/)

原生 HTML/CSS/JavaScript 製作的網頁 TCG 小遊戲，包含卡牌對戰、開卡包、收藏、牌組工作台、每日任務、收藏里程碑與週任務。所有進度透過 localStorage 保存，不需要後端。

## 主要內容

- 回合制對戰：30 血英雄、10 點法力上限、7 格場面、8 張手牌上限。
- 手機 Shell：對戰畫面有固定手牌區、操作 Dock、戰鬥紀錄與任務列，支援 390px 級手機寬度。
- 首場導引：第一次進入對戰會提示抽牌、出牌、攻擊與任務領取。
- 卡牌池：40 種卡，含 24 種早期卡與 R10 擴充卡；支援隨從、法術、關鍵字與觸發效果。
- 關鍵字：嘲諷、衝鋒、戰吼、亡語、聖盾、連擊、劇毒、回復、吸血、突襲。
- 卡牌詳情：點擊卡牌可開啟詳情面板，顯示圖像、費用、攻防、稀有度、效果與關鍵字說明。
- 開卡包：每包 5 張，首包免費，之後 100 金幣；若整包皆普通，最後一張保底至少稀有。
- 收藏與閃卡：收藏 key 使用 `cardId` 或 `cardId#foil`；閃卡機率 8%。
- 牌組工作台：20 張牌組、同名最多 2 張、傳說最多 1 張；支援搜尋、費用/稀有度篩選、曲線圖、攻擊/控制模板與推薦替換。
- 任務與目標：每日任務走 `card_quests_v1`；收藏里程碑與本週任務走 `card_goals_v1`。

## 玩法

1. 從入口進入「開卡包」取得首包免費卡牌。
2. 到牌組工作台套用「快攻」或「控制」模板，也可手動依曲線調整。
3. 進入對戰，使用手牌、法力與關鍵字擊倒 AI 英雄。
4. 對戰、開包、召喚、施法與傷害會推進每日/每週任務。
5. 完成任務取得金幣，再開包擴充收藏與閃卡數量。

## 關鍵數值

| 類別 | 現況 |
|---|---|
| 卡牌 | 40 種；普通、稀有、史詩、傳說 |
| 抽卡權重 | 62 / 26 / 10 / 2 |
| 閃卡 | 8% |
| 卡包 | 5 張；首包免費，之後 100 金幣 |
| 牌組 | 20 張；同名最多 2，傳說最多 1 |
| 對戰 | 英雄 30 血、法力上限 10、場面上限 7、手牌上限 8 |
| 每日任務 | 8 選 3，獎勵 20-40 金幣 |
| 收藏里程碑 | unique 10/20/40、foil 5/15 |
| 週任務 | 每週固定種子 4 選 1，獎勵 80-120 金幣 |

## 專案結構

| 檔案 | 說明 |
|---|---|
| `templates/index.html` | 遊戲入口與分頁 Shell |
| `templates/card-battle/cards.js` | 卡牌池、稀有度、閃卡、關鍵字與抽卡函式 |
| `templates/card-battle/core.js` | 對戰核心、存檔遷移、任務、里程碑、週任務、牌組驗證 |
| `templates/card-battle/battle.js` | 對戰 UI、AI、卡牌詳情、每日任務面板 |
| `templates/card-pack/pack.js` | 開包、收藏、分解、牌組工作台、週任務與里程碑 UI |
| `references/data-model.md` | 存檔與數值模型 |

## 測試

```bash
npm test
npm run test:e2e
```

`npm test` 覆蓋卡牌資料與核心規則；E2E 覆蓋對戰流程、RWD、任務與牌組互通。

## 📋 更新日誌

- R6：完成手機 Shell、戰鬥 Dock、首場導引與牌組工作台。
- R10：新增卡牌詳情、曲線模板、收藏里程碑與 `card_goals_v1` 週任務。
- 早期版本：建立 40 種卡牌、開包/收藏、閃卡、每日任務與 localStorage 經濟閉環。

## 授權

[MIT](LICENSE) © 2026 mars-tw
