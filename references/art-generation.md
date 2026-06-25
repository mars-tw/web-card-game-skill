# 卡牌美術生成指南 (art-generation.md)

卡牌美術採「**統一設定檔 + 多後端**」架構，可擴充、可自訂：

- **設定一處**：所有卡片清單、提示詞、風格樣板都在 `art-config.json`。
- **後端可換**：`gen-art.ps1`（Grok CLI）或 `gen-art-openai.ps1`（OpenAI GPT 圖像 API），共用同一份設定。
- **三種使用方式**：手動自己寫提示詞、用 Grok 生、用 GPT API 生 —— 自由選擇。

## 一、設定檔 art-config.json

```jsonc
{
  "outputDir": "assets/cards",         // 圖檔輸出目錄
  "size": "1024x1024",                 // 尺寸
  "styleSuffix": "Fantasy trading-card art, ...",  // 預設風格樣板（接在每張提示詞後）
  "themePresets": {                    // 可選風格樣板，用 -Theme 切換
    "fantasy": "...", "cyber": "...", "forest": "...", "ink": "..."
  },
  "cards": [                           // 卡片清單：id 要與 cards.js 的 id 一致
    { "id": "dragon", "prompt": "a colossal fire dragon breathing flames, menacing" },
    ...
  ]
}
```

**要改美術，只改這個檔**：
- 改某張卡長相 → 改它的 `prompt`
- 加新卡 → 在 `cards` 加一筆（id 對應 cards.js）
- 整套換風格 → 改 `styleSuffix`，或生成時用 `-Theme cyber`

## 二、用 Grok CLI 生成（已安裝、可實跑）

```powershell
cd skill

# 先登入一次（互動式，需 SuperGrok / X Premium+）
grok login

# 預覽提示詞（不耗額度）
.\scripts\gen-art.ps1 -DryRun

# 生成全部
.\scripts\gen-art.ps1

# 只生指定幾張
.\scripts\gen-art.ps1 -Only dragon,phoenix

# 換風格樣板生成
.\scripts\gen-art.ps1 -Theme cyber
```

## 三、用 OpenAI (GPT) 生成（架構已備好，需 API Key）

```powershell
cd skill

# 設定金鑰（從環境變數讀，不寫進檔案）
$env:OPENAI_API_KEY = "sk-..."        # 從 https://platform.openai.com 取得

# 預覽（不需 Key、不耗額度）
.\scripts\gen-art-openai.ps1 -DryRun

# 生成
.\scripts\gen-art-openai.ps1 -Only dragon
.\scripts\gen-art-openai.ps1 -Theme cyber
```

> 預設模型 `gpt-image-1`，可用 `-Model dall-e-3` 切換。回傳 base64 或 url 都會自動存檔。
> OpenAI 圖像 API 為付費，請留意用量。

## 四、手動自己做（不依賴任何後端）

不想用 AI 生圖也可以：
1. 自己用任何工具（Photoshop、Midjourney、免費素材…）做好 1024×1024 的方圖
2. 命名為 `<卡片id>.png` 放進 `assets/cards/`
3. 想要好的提示詞，直接抄 `art-config.json` 裡每張卡的 `prompt` + `styleSuffix` 餵給任何 AI 繪圖工具

## 五、接回遊戲（生完圖之後，所有後端通用）

1. 確認圖檔在 `assets/cards/<id>.png`
2. 開 `templates/card-battle/cards.js`，把該卡的 `image` 設為相對路徑：
   ```js
   { id: "dragon", ..., image: "../../assets/cards/dragon.png" }
   ```
3. 重新整理瀏覽器即可。圖壞掉或路徑錯時，`<img onerror>` 會自動退回 emoji，不破版。

> 重要：本機 server 要開在 **`skill/` 根目錄**（不是 `templates/`），否則 `../../assets/...`
> 會超出 server 根目錄而 404、只顯示 emoji。
> 正確：在 `skill/` 下 `python -m http.server 8000`，開 `http://localhost:8000/templates/index.html`。

## 提示詞要素（卡面通用）

- **主體明確**：`a fire dragon` / `an armored knight`
- **風格**：`painterly digital art, fantasy TCG card art, dramatic lighting`
- **構圖**：`single subject centered, square composition`
- **乾淨**：`no text, no card frame, no border`（卡框由 CSS 畫）
- 法術卡用 `no creature` 強調只畫效果（火球、光環）

## 疑難排解

| 狀況 | 處理 |
|------|------|
| Grok 要求登入 | `grok login` 或設 `XAI_API_KEY` |
| OpenAI 報未設 Key | `$env:OPENAI_API_KEY = "sk-..."` |
| ConvertFrom-Json 中文亂碼 | 腳本已用明確 UTF-8 讀檔；若自行改檔請存成 UTF-8 |
| 圖在卡面被裁切 | 用 square / 正方構圖最合 `object-fit: cover` |
| 圖沒接上、只見 emoji | server 要開在 `skill/` 根目錄（見上方「重要」） |
