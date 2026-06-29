---
name: web-card-game
description: 快速製作純原生（零依賴）網頁卡牌遊戲。當使用者想做卡牌對戰、抽卡/開卡包、集換式卡牌、TCG、爐石風格的網頁小遊戲時觸發。提供可直接執行的單頁 HTML/CSS/JS 模板，含關鍵字技能戰鬥、星級閃卡、主題切換，並用統一設定檔串接 Grok CLI 或 GPT API 生成卡牌美術。
when_to_use: 觸發語句包含「做一個卡牌遊戲」「卡牌對戰」「開卡包」「抽卡」「集換式卡牌」「TCG」「web card game」「卡牌技能」「用 Grok/GPT 生成卡圖」。
shell: powershell
---

# 網頁卡牌遊戲快速製作 (web-card-game)

在幾分鐘內生出一個**可直接在瀏覽器執行**的網頁卡牌遊戲。
技術路線**純原生**：只用 HTML + CSS + 原生 JavaScript，零框架、零建置、零 npm。

## 何時用這個 skill

當使用者要做以下任一種卡牌遊戲：

- **戰鬥卡牌對戰**（爐石/萬智牌風格）：手牌、法力、隨從、**關鍵字技能**、AI 對手
- **抽卡 / 開卡包**：卡池、稀有度權重、**星級閃卡**、重複機制、收藏冊
- 兩者結合（完整 TCG 體驗，含主題切換）

## 主要功能

- **關鍵字技能系統**（益智、需思考）：嘲諷、衝鋒、戰吼、亡語、聖盾
- **星級變體**：每張卡有普通版與閃卡(foil)金色版，收集難度加倍
- **強化動畫**：攻擊撞擊+震動、傷害跳字、召喚飛入、死亡碎裂、勝負特效
- **主題切換**：暗黑/奇幻/科幻/森林 四套主題，即時切換、存 localStorage
- **可擴充美術**：統一設定檔 `art-config.json` + 雙後端（Grok CLI / GPT API）

## 專案結構

```
skill/
├── SKILL.md                  # 本檔
├── art-config.json           # ★ 美術生成統一設定（卡片清單、提示詞、風格樣板）
├── templates/
│   ├── index.html            # ★ 單一入口：頂部分頁(對戰/開卡包) + 主題選擇器
│   ├── card-battle/
│   │   ├── index.html        #   對戰頁面 + 全部 CSS（含主題變數、動畫）
│   │   ├── cards.js          #   ★ 卡牌資料層（兩模板共用，單一事實來源，24 張）
│   │   └── battle.js         #   回合制引擎 + 關鍵字技能 + AI
│   └── card-pack/
│       ├── index.html        #   開卡包頁面 + 收藏冊
│       └── pack.js           #   抽卡機率、重複機制、開包動畫
├── assets/cards/             # 卡面圖（生成後放這）
├── scripts/
│   ├── gen-art.ps1           # 用 Grok CLI 生成美術（讀 art-config.json）
│   └── gen-art-openai.ps1    # 用 OpenAI GPT API 生成美術（同設定檔）
└── references/
    ├── data-model.md         # 卡牌資料結構、加卡、加技能、調平衡
    └── art-generation.md     # 美術生成指南（雙後端 + 手動 + 提示詞）
```

## 快速開始（玩現成的）

1. 在 **`skill/` 根目錄**（SKILL.md 所在處）起本機 server：
   `python -m http.server 8000`
2. 瀏覽器開**單一入口**：`http://localhost:8000/templates/index.html`
   （頂部分頁切換對戰/開卡包，右上角切主題）

> 註一：用了 `localStorage` 與相對載入，請用 HTTP server 開，不要 `file://` 雙擊。
> 註二：**server 必須開在 `skill/` 根目錄**，否則卡面圖（`../../assets/...`）會 404 只顯示 emoji。

## 做一個新卡牌遊戲

1. 改 `templates/card-battle/cards.js` 的 `CARD_POOL`（加卡、調數值、設 `keywords` 技能）
   —— 細節見 [references/data-model.md](references/data-model.md)
2. 加新法術效果 → 改 `battle.js` 的 `SPELL_EFFECTS`；加新戰吼/亡語 → 改 `ABILITY_EFFECTS`
3. 加新主題 → 在 `index.html` 與兩個子頁的 `:root[data-theme="..."]` 加一組變數
4. 生美術 → 編輯 `art-config.json` 再跑生成腳本（見下節）

## 核心設計原則（改動時請遵守）

1. **`cards.js` 是單一事實來源**：對戰與卡包共用同一卡池與技能定義。
2. **每張卡有 `image` 欄位**：`null` 用 emoji 佔位；填路徑自動換圖，圖壞 `onerror` 退回 emoji。**接美術不需改邏輯。**
3. **關鍵字技能**：隨從的 `keywords` 陣列 + `trigger`（戰吼/亡語效果代號）驅動 `battle.js` 規則。
4. **稀有度與星級**：`RARITY[x].weight` 控機率、`.color` 控卡框、`.stars` 控星級；`foil` 控閃卡。
5. **零依賴**：不引入任何 CDN / npm，維持可分享特性。

## ⭐ 必備核心循環（生成卡牌遊戲時必接，否則只是玩具）

卡牌遊戲的靈魂是**「開包收集 → 組牌 → 對戰 → 賺金 → 再開包」的閉環**。
這三段**絕不能斷裂**（最常見的致命錯誤就是開包抽到的卡在對戰用不到）：

1. **收藏 → 牌組接通**：`buildDeck(true)` 必須讀玩家收藏（`localStorage` 的收藏 key）組牌庫，
   不足才用 `rollCardByRarity()` 保底補；AI 用隨機卡池（`buildDeck(false)`）。
   **驗收：開包抽到的卡，下一局對戰要能出現在牌庫。**
2. **戰績 + 金幣經濟**：勝負存 `localStorage`（wins/losses/streak/coins），勝負畫面顯示連勝戰績；
   贏局發金幣 → 金幣回開卡包消耗（首包免費）。閉合成癮迴圈。
3. **治療上限用 maxHp**：`healHero` 用 `side.maxHp` 而非硬編碼，否則高血量難度會治療失效。
4. **重複卡有出口**：開到重複卡可分解成金幣（普 10/稀 30/史 80/傳 200），回流開包經濟。

## ⭐ 深度與爽感機制（讓人一直玩下去）

1. **AI 斬殺檢查**：AI 偵測「總攻擊 ≥ 玩家血量且玩家無嘲諷」就全壓臉斬殺——困難感靠智慧非灌血。
2. **連擊 combo**：本回合出牌數累積，第 3 張起跳「N 連擊!」回饋，換回合清零。
3. **起手 Mulligan**：開局可重抽起手牌一次，降低運氣權重。
4. **開包儀式感**：逐張翻牌（stagger）+ 最後一張壓軸光效 + 開傳說全螢幕金光。
5. **數值平衡守則**：baseline 費用 ≈ (atk+hp)/2，關鍵字（衝鋒/劇毒/AOE）要加費補償，否則低費高效卡破壞平衡。

## ⭐ 視覺與引導基線（預設要做，否則醜又難上手）

1. **稀有度色階拉開**：普通卡關 glow（只留邊框），稀有→史詩→傳說發光遞增；傳說呼吸光、史詩以上金屬邊框。
2. **卡框分區精緻**：`.art` 內陷框、卡名底帶、寶石漸層的 atk/hp/cost 徽章；卡尺寸別太小（≥120×170）。
3. **打擊回饋**：攻擊位移走全程 + 撞擊粒子 + 傷害數字分級（克制變紅放大）。
4. **新手引導**：首次 3 步引導浮層（出牌→攻擊→打臉）+ 常駐關鍵字圖鑑按鈕（手機看不到 hover tooltip）。
5. **難度友善**：首次玩預設「簡單」（玩家血量領先、多抽牌），落敗可切簡單。
6. **觸控**：`@media (hover:none)` 分支，點選放大卡詳情取代 hover。

## 生成卡牌美術

採「統一設定檔 + 多後端」：所有提示詞在 `art-config.json`，後端可選 Grok 或 GPT。
**完整流程見 [references/art-generation.md](references/art-generation.md)。** 精簡版：

```powershell
cd skill
# Grok（已裝，需先 grok login，互動式需使用者本人完成）
.\scripts\gen-art.ps1 -DryRun          # 預覽提示詞
.\scripts\gen-art.ps1                   # 生成全部
.\scripts\gen-art.ps1 -Only dragon -Theme cyber

# 或 OpenAI GPT API（需設 $env:OPENAI_API_KEY）
.\scripts\gen-art-openai.ps1 -Only dragon
```

生完後到 `cards.js` 把該卡 `image` 設為 `"../../assets/cards/<id>.png"`。

## 驗證遊戲可玩

改完務必實測（不要只看程式碼）：起 server → 開 `templates/index.html` → 出牌、用技能、結束回合、
確認 AI 回應、切主題、開一次卡包。Console 只有 `favicon.ico 404` 屬正常。

> 測試提示：`battle.js` 有 `window.__test` 掛鉤，可在 console 用
> `__test.setup([], ["golem","archer"])` 建立確定性場景驗證技能（嘲諷/聖盾/亡語等）。
