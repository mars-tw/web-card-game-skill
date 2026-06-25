# 貢獻指南 (Contributing)

歡迎為 **web-card-game-skill** 貢獻！不論是加卡、加技能、修 bug、改善文件都很歡迎。

## 開發環境

零依賴，只需要：
- 任何瀏覽器
- Python 3（或任何能起 HTTP server 的工具）跑本地預覽
- Node.js（選用，跑測試用）

```bash
# 在 repo 根目錄起 server
python -m http.server 8000
# 開 http://localhost:8000/templates/index.html
```

> ⚠️ server 要開在 **repo 根目錄**，否則卡面圖會 404。

## 本地測試

提 PR 前請先跑卡牌邏輯測試（CI 也會跑同一份）：

```bash
node scripts/test-cards.js
```

互動測試：在瀏覽器 console 用 `window.__test` 掛鉤建立確定性場景：

```js
// 敵方放石巨人(嘲諷)+弓箭手，驗證嘲諷強制
__test.setup([], ["golem", "archer"]);
__test.hasTaunt("enemy");        // true
```

## 怎麼加一張卡

只改 `templates/card-battle/cards.js` 的 `CARD_POOL`：

```js
// 隨從（可帶關鍵字技能）
{ id: "wall", name: "魔法石牆", type: CARD_TYPE.MINION, rarity: "rare",
  cost: 4, attack: 1, health: 6, emoji: "🧱", image: null,
  keywords: ["taunt", "divineshield"], text: "嘲諷 + 聖盾。", foil: false },
```

詳見 [references/data-model.md](references/data-model.md)。

## 怎麼加一個關鍵字技能

1. 在 `cards.js` 的 `KEYWORDS` 加定義
2. 在 `battle.js` 實作規則（攻擊限制 / 召喚 / 受傷 / 死亡的對應處理）
3. 若是觸發型（戰吼/亡語），在 `battle.js` 的 `ABILITY_EFFECTS` 加效果代號

## 怎麼加一個主題

在 `templates/index.html`、`templates/card-battle/index.html`、`templates/card-pack/index.html`
三處的 `:root[data-theme="你的主題"]` 各加一組 CSS 變數，並在入口頁加一顆色票。

## 怎麼加卡牌美術

編輯 `art-config.json` 的 `cards`（id 要對應 cards.js），再跑：

```powershell
.\scripts\gen-art.ps1 -Only <id>          # Grok
# 或 .\scripts\gen-art-openai.ps1 -Only <id>   # OpenAI
```

詳見 [references/art-generation.md](references/art-generation.md)。

## 提交規範

- **commit 訊息**用中文或英文皆可，建議帶前綴：`feat:` / `fix:` / `docs:` / `refactor:`
- **保持零依賴**：不要引入 CDN / npm 套件
- **改動務必本地實測**：起 server 玩過、`node scripts/test-cards.js` 通過再提 PR
- PR 請說明：改了什麼、為什麼、怎麼測試的

## 行為準則

請友善、尊重。這是一個學習與分享的開源專案 🎴

---

有任何問題，開 [issue](https://github.com/mars-tw/web-card-game-skill/issues) 討論即可。
