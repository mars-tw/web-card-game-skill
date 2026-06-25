# 🎴 web-card-game — 快速製作網頁卡牌遊戲的 Claude Code Skill

一個 [Claude Code](https://claude.com/claude-code) **Skill**，幾分鐘內生出**純原生（零依賴）**的網頁卡牌遊戲。
只用 HTML + CSS + 原生 JavaScript——零框架、零 npm、零建置，起一個本機 server 即可玩。

內含完整可玩的**戰鬥卡牌對戰**與**開卡包**模組，並用統一設定檔串接 **Grok CLI** 或 **OpenAI GPT API** 生成卡牌美術。

> 作者：**阿軒** ([@mars-tw](https://github.com/mars-tw)) · 授權：MIT

---

## ✨ 功能特色

- **關鍵字技能系統**（益智、需思考）：嘲諷、衝鋒、戰吼、亡語、聖盾，出牌順序與搭配是關鍵
- **戰鬥卡牌對戰**：手牌、法力曲線、隨從上場、攻擊/血量、簡易 AI 對手、勝負判定
- **開卡包**：24 張卡池、稀有度權重、**星級閃卡(foil)**、重複機制、localStorage 收藏冊
- **強化動畫**：攻擊撞擊+螢幕震動、傷害跳字、召喚飛入、死亡碎裂、勝負彩帶
- **主題切換**：暗黑 / 奇幻 / 科幻 / 森林 四套主題，即時切換、跨頁同步
- **可擴充美術**：統一設定檔 `art-config.json` + 雙後端（Grok CLI / GPT API）+ 可手動

## 🚀 立即試玩

```bash
# 在 skill 根目錄（本檔所在處）起一個本機 server
python -m http.server 8000
```

瀏覽器開**單一入口**：**http://localhost:8000/templates/index.html**
（頂部分頁切換對戰/開卡包，右上角切主題）

> ⚠️ 請用 HTTP server 開，不要 `file://` 雙擊（瀏覽器會擋跨檔載入）。
> **server 必須開在 `skill/` 根目錄**，否則卡面圖（`../../assets/...`）會 404 只顯示 emoji。

## 📁 目錄總覽

| 路徑 | 說明 |
|------|------|
| `SKILL.md` | Skill 主檔（Claude 載入此檔決定如何使用） |
| `art-config.json` | ★ 美術生成統一設定（卡片清單、提示詞、風格樣板） |
| `templates/index.html` | 單一入口：分頁 + 主題選擇器 |
| `templates/card-battle/cards.js` | ★ 卡牌資料層（兩模組共用，24 張，含技能） |
| `templates/card-battle/battle.js` | 回合制引擎 + 關鍵字技能 + AI |
| `templates/card-pack/pack.js` | 抽卡機率、重複機制、開包動畫 |
| `references/data-model.md` | 卡牌資料結構、加卡、加技能、調平衡 |
| `references/art-generation.md` | 美術生成指南（雙後端 + 手動 + 提示詞） |
| `scripts/gen-art.ps1` | 用 Grok CLI 生成美術 |
| `scripts/gen-art-openai.ps1` | 用 OpenAI GPT API 生成美術 |

## 🎨 加上卡牌美術（選用）

未生圖時卡面自動用 Emoji 佔位，遊戲完整可玩。要生美術：

```powershell
cd skill
# 用 Grok（需先 grok login）
.\scripts\gen-art.ps1 -Only dragon -Theme cyber
# 或用 OpenAI（需設 $env:OPENAI_API_KEY）
.\scripts\gen-art-openai.ps1 -Only dragon
```

生完到 `cards.js` 把該卡 `image` 設為 `"../../assets/cards/<id>.png"`。詳見
[references/art-generation.md](references/art-generation.md)。

## 🧩 安裝成 Claude Code Skill（選用）

想在所有專案用 `/web-card-game` 喚起，把整個資料夾複製到：

```
~/.claude/skills/web-card-game/      # 即 C:\Users\<你>\.claude\skills\web-card-game\
```

裡面要有 `SKILL.md`。

## ✅ 已驗證（Playwright + Node 實測）

- 關鍵字技能：嘲諷強制、衝鋒即攻、聖盾免疫一次、亡語召喚、戰吼觸發 ✅
- 戰鬥流程：出牌、AI 回合、攻擊結算、勝負判定 ✅
- 開卡包：抽 5 張、保底、重複機制、星級閃卡收藏 ✅
- 主題切換：4 套主題跨 iframe 同步 ✅
- 抽卡機率分布符合權重（Node 測 20000 抽）✅
- 美術腳本：雙後端、`-Only`/`-Theme`/`-DryRun` 旗標 ✅

## 🛠️ 技術說明

- **零依賴**：不引入任何 CDN / npm 套件，維持單檔可分享。
- **單一事實來源**：`cards.js` 的 `CARD_POOL` 同時驅動對戰與開卡包。
- **美術接點零侵入**：卡片 `image` 欄位填路徑即換圖，圖壞自動退回 emoji。

## 🤝 貢獻

歡迎 issue 與 PR！加卡 / 加技能 / 加主題的方法都寫在
[references/data-model.md](references/data-model.md)。

## 📄 授權

[MIT](LICENSE) © 2026 阿軒 ([@mars-tw](https://github.com/mars-tw))
