---
name: web-card-game
description: 維護「阿軒卡牌對戰」時使用。這是一款原生 HTML/CSS/JS 網頁 TCG，包含對戰、卡包、收藏、牌組工作台、每日任務、收藏里程碑與週任務。
---

# Web Card Game Skill

## 使用情境

在修改 `skill` repo 時，請把它視為一個無後端的卡牌遊戲套件，而不是單一對戰頁。卡牌資料、開包、牌組、任務與對戰都會互相讀寫 localStorage。

## 重要檔案

| 檔案 | 責任 |
|---|---|
| `templates/card-battle/cards.js` | 卡牌母表、稀有度權重、閃卡、關鍵字與抽卡 |
| `templates/card-battle/core.js` | 純規則與存檔遷移：對戰、任務、里程碑、週任務、牌組驗證 |
| `templates/card-battle/battle.js` | 對戰 UI、AI、卡牌詳情、每日任務 |
| `templates/card-pack/pack.js` | 開卡包、收藏、分解、牌組工作台、模板與週任務 |
| `references/data-model.md` | storage key、schema 與數值契約 |

## 現況契約

- `CARD_POOL` 目前 92 張；`cards.js` 是唯一卡牌事實來源。稀有度分布為普通 25、稀有 24、史詩 23、傳說 20。
- 五個陣營為白潮守軍、奧術結社、荒野獸群、凜冬暗影與潮間中立。
- 稀有度權重為 common 62、rare 26、epic 10、legendary 2；閃卡機率 8%。
- 卡包每包 5 張，首包免費，之後 100 金幣；稀有以上 20 包保底，角色傳說另有 35 包保底。
- R60–R61「對座六影」包含六張具名角色傳說；角色子池偏向 28%，角色立繪在戰場、開包與收藏共用。
- `cardpack_collection_v2` 使用 `{ [cardId]: count, [cardId + "#foil"]: count }`。
- `card_deck_v1` 只保存 `{ version, cards: [id] }`；實際進對戰前會以收藏驗證。
- 牌組必須 20 張，同名最多 2 張，傳說最多 1 張。
- `card_quests_v1` 是每日任務，依 `YYYY-MM-DD` 從 8 個任務抽 3 個。
- `card_goals_v1` 是收藏目標，保存已領里程碑與每週任務；週種子格式為 `YYYY-Www`。

## 修改原則

- 新增卡牌時，同步補 `image` 或接受 emoji fallback，並確認 `keywords` / `trigger` / `effect` 能被 `core.js` 與 `battle.js` 解讀。
- 新增關鍵字時，需補 `KEYWORDS` 說明、對戰規則、卡牌詳情文案與測試。
- 新增任務或週任務時，需確保 `questEventMatches()` 有事件對應，且 battle/pack 會送出進度事件。
- 牌組工作台不可繞過 `Core.validateDeck()`；模板也必須產生合法 20 張牌組。
- 儲存格式變動時，要保留遷移與舊資料容錯。

## 驗證

```bash
npm test
npm run test:e2e
```

文件-only 修改通常只需 `npm test`；若改卡牌資料、任務事件、牌組驗證或 UI，需加跑 E2E。
