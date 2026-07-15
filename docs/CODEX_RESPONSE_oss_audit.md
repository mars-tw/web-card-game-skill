# oss-audit：開源版全面檢查與更新

- 日期：2026-07-15（Asia/Taipei）
- Repo：`mars-tw/web-card-game-skill`
- 本地目錄：`skill`
- 線上遊玩：<https://mars-tw.github.io/web-card-game-skill/>
- 稽核基線：`b2305aa`（R61）

## 結論

本輪完成開源文件、素材來源、repo 衛生、社群分享 metadata、版本與功能 sanity 稽核。MIT 授權原本即存在且內容正確；遊戲程式邏輯與既有素材均未變更。新增三張由線上實機畫面擷取的文件截圖。

## 逐項結果

### 1. README 全面翻新

- 改為《裂潮卡牌｜TIDEREND CARDS》完整專案首頁。
- 修正線上遊玩網址為 `https://mars-tw.github.io/web-card-game-skill/`。
- 補上 R60–R61 六位具名角色傳說、R61 立繪、角色子池與 35 包角色保底說明。
- 更新卡池現況為 92 張：普通 25、稀有 24、史詩 23、傳說 20。
- 補齊對戰／開包／收藏／組牌操作、技術棧、本地開發與三種測試指令。
- 保留並核對 `CI & Deploy Pages` badge。
- 新增三張實機畫面：
  - `docs/screenshots/battle-opponent-vey.png`
  - `docs/screenshots/pack-legendary-reveal.png`
  - `docs/screenshots/game-shell.png`

### 2. LICENSE

- `LICENSE` 已存在。
- 內容為完整 MIT License，著作權為 `Copyright (c) 2026 阿軒 (mars-tw)`。
- 無需修改。

### 3. CREDITS 與素材盤點

- 新增 `CREDITS.md`，README 已連結。
- `assets/cards/*.png`：標註為本專案 AI 生成卡牌立繪／法術圖；R61 六張角色立繪明列為 OpenAI `image_gen` 產出。
- `assets/backgrounds/*.png`：標註為本專案 AI 生成背景。
- `assets/cover.png` 與 PWA icons：記錄為專案素材；repo 內未發現可核實的外部素材庫來源或獨立第三方授權檔。
- 字型：僅使用系統字型 fallback，無下載或散佈第三方字型。
- 圖示：使用 Unicode emoji、文字符號與 CSS 幾何圖形；未偵測到 Font Awesome、Material Icons、Lucide 等 icon library。
- 第三方開發依賴：Playwright 1.61.1（Apache-2.0），僅供測試使用。

### 4. Repo 衛生與 docs 連結

- `.gitignore` 補上 Playwright／coverage／cache、環境變數衍生檔與常見私鑰格式。
- 移除 `package-lock.json` 的 ignore 規則；lockfile 修正後納入版控，確保可重現安裝。
- 暫存清理前清單：

| 路徑 | 類型 | 內容 | 處理 |
|---|---|---:|---|
| `tmp/` | ignored 空目錄 | 0 個檔案 | 已確認位於 workspace 內並移除 |

- `node_modules/` 是本機測試依賴，保留且持續忽略。
- 未發現其他 `.tmp`、`.log`、`.bak`、`.orig`、`.rej` 或測試預覽暫存檔。
- Markdown 相對連結逐一解析，14 個目標全部存在。
- GitHub repo／issues／CI、badge、GitHub Pages 與 Playwright 公開網址均回應 HTTP 200。
- `http://localhost:8000/templates/index.html` 為本地開發網址，已由 E2E 啟動本地 server 實測；`https://platform.openai.com` 對匿名自動檢查回應 403，瀏覽器實測則正常導向 `https://platform.openai.com/login`（頁面標題 `OpenAI Platform`），屬需登入的官方入口而非失效連結。

### 5. OG metadata

根入口 `index.html` 已新增：

- `og:url=https://mars-tw.github.io/web-card-game-skill/`
- canonical 指向同一正確 Pages URL
- `twitter:image` 指向 `https://mars-tw.github.io/web-card-game-skill/assets/cover.png`

既有 `og:image` 已是正確 repo 路徑，保留不變。

### 6. 版本一致性

| 版本面向 | 結果 |
|---|---|
| `package.json` | `0.4.5` |
| `package-lock.json` root package | 由 `0.4.4` 修正為 `0.4.5` |
| PWA cache revision | `card-battle-r61-v1` |
| HTML／JS／SW versioned refs | 品質守門確認全數為 `card-battle-r61-v1` |
| Playwright | manifest 與 lockfile 均為 `^1.61.1`／resolved `1.61.1` |

`0.4.5` 是 npm package metadata 版本，`card-battle-r61-v1` 是 PWA cache revision；兩者用途不同，分別在各自範圍內一致。
排除 `docs/` 歷史稽核證據後，active source 的舊 package／PWA revision 掃描為 0；歷史報告保留當時版本號，不改寫過往證據。

### 7. 功能 sanity

- `npm test`：PASS（10.9 秒）
  - 卡牌資料測試通過。
  - core 規則 `PASS 131 / FAIL 0`。
  - 品質守門通過，含 R61 六張角色立繪、資源快取與版本化引用。
  - R61 balance sim 通過。
- `npm run test:e2e`：PASS（135.4 秒）
  - 桌機 1280×900、矮桌機 1366×700、手機 390×844 全綠。
  - PWA 離線 reload、對戰、開包、收藏、牌組、任務、角色 pity、存檔與 RWD 流程通過。
  - `無 console 錯誤 / pageerror`。

## 秘密掃描

執行使用者指定的 ERE 掃描，排除 `.git`：

```bash
grep -rniE "sk-proj-[A-Za-z0-9_-]{20}|sk-[a-z0-9]{40}" --exclude-dir=.git .
```

結果：0 命中。

## Scope guard

- 未修改 `templates/card-battle/*.js`、`templates/card-pack/*.js`、`sw.js` 或任何遊戲規則。
- 未修改既有 `assets/cards`、`assets/backgrounds`、封面或 PWA icon。
- 新增內容限於文件、文件截圖、metadata、ignore 規則與同步後的 lockfile。
- 本輪僅建立本地 commit，不 push。
