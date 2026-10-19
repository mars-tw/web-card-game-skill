# R72 好玩＋美觀輪報告（裂潮卡牌 TIDEREND CARDS）

- 執行者：Claude Code（Opus 5.5）。本輪沒有使用 Codex、Blender MCP，也沒有新增任何 AI 2D 原畫。
- 版本：`0.4.16 → 0.5.0`；PWA／SW `card-battle-r71-v1 → card-battle-r72-v1`；自動重載 key `card_sw_auto_reload_r71_v1 → card_sw_auto_reload_r72_v1`。
- 計畫：`docs/OPTIM_PLAN_R72.md`。證據：`docs/evidence/r72/{before,after}/`（1366×768、1366×600、390×844、844×390）。
- 試玩方式：Playwright headless Chromium、真實 click／tap；需要特定局面時以 `window.__test` 準備場景，截圖檔名標 `staged`。

## 1. 為什麼這輪更好玩

### F1 招牌玩法「裂潮」（回應 Apple 4.3）

進場時對戰流程就是「出牌→攻擊→結束回合」，和一般爐石式卡牌完全同構，遊戲名稱裡的「裂潮」在對戰中沒有任何對應機制。本輪把它做成核心規則（寫在 `core.js`，可單元測試）：

- **潮能 0–6**：每回合開始 +1，己方隨從陣亡 +1。被壓著打的一方反而充得快，形成翻盤節奏。
- **裂潮爆發**：滿潮時按「裂潮」（0 費），對所有敵方隨從造成 1 點、敵方英雄 2 點，潮能歸零。滿潮後不再累積，所以每次都要判斷「現在放，還是留著清 1 血隨從或斬殺」。
- **對手潮汐親和**：哈爾登「守城潮」（標準）、維伊「詠潮」（施法 +1、陣亡 +2）、斯卡拉「血潮」（陣亡 +2）。三位對手的浪頭節奏不同，人格更鮮明。親和數值放在 `Core.OPPONENT_TIDE_RATES`，遊戲與平衡模擬共用同一份。
- **AI 會用**：滿潮時看能不能清隨從、能不能斬殺、玩家場上是否空，最多憋一回合；有開「AI 思路」時會說明理由。
- **提示系統**：💡 會在合適時機建議「施放裂潮爆發」並說明預計效果。
- **平衡**：`test-balance-sim.js` 雙方都會使用裂潮。第一版（所有人同一套充能）讓「玩家 vs 維伊」從 52.08% 升到 65.42%、「玩家 vs 斯卡拉」從 49.58% 升到 56.25%，守門不過。改成對手親和後回到 M1 51.67%／M2 52.08%／M3 47.50%，M1–M9 與單卡守門全部通過；模擬中 19,440 局共施放 96,680 次，確認機制真的有被用到。

### F2 開頭 60 秒

新局先播約 1.9 秒的 VS 開場：對手立繪、名字、開場台詞、戰場名、對手潮汐親和，點一下就能略過，之後才出導引。以前對手是誰、在哪裡打，只埋在日誌的一行小字。自動化（webdriver）預設不播，避免擋住既有 E2E；`?intro=1` 可強制播放。

### F3 回饋

每次換手播「你的回合／哈爾登隊長的回合」橫幅；第一次滿潮跳提示，說明按下去會發生什麼；潮能計充能時會跳動。

### F4 再玩一局的理由：星級挑戰

每位對手 × 難度三顆星：獲勝、結算時生命過半、本局用過裂潮爆發。結算畫面逐顆點亮，顯示最佳紀錄與「下一顆星」要做什麼。紀錄存在 `card_star_challenges_v1`（有版本、會夾範圍），判定寫在 `core.js`。

### F5 打擊感

裂潮爆發會有潮浪從己方往敵方掃過、受擊卡片閃青光、短震與三段合成音；對手施放時浪從另一側來。`prefers-reduced-motion` 與效能「低」會關掉動畫或縮短。

## 2. 為什麼這輪更好看

| 項目 | before | after |
|---|---|---|
| P1 品牌 | 「卡牌遊戲／CARD BATTLE／CARD PACK」、manifest「卡牌對戰」 | 入口、對戰、開包、`<title>`、manifest 統一《裂潮卡牌 TIDEREND》，金→潮藍漸層字標 |
| P2 戰場 | 38px 方格像試算表 | 半透明潮紋場地墊（同心潮線＋岸邊光），R67 戰場圖透得出來 |
| P3 敵方頭像 | emoji 小圓章 | 三位對手改用 R61 角色立繪，依角色臉部位置裁切；emoji 留給讀屏 |
| P4 桌機版面 | 1366×768 手牌與戰場卡底部攻／血寶石被裁；1366×600 手牌只露約 3/4 | 每日任務收進原有的「任務」抽屜，手牌不再被壓縮，依高度分三階縮卡（94／84／68px）。1366×768、1366×600、1280×640 三排卡片都完整入框；68px 小卡的「詳」移到右上角，不會吃掉卡片中心的點擊 |
| P5 卡包 | 紫色方塊裡放一個 🎁 emoji | CSS 繪製的「裂潮補充包」：深海箔面、潮紋、金邊、上下鋸齒封口、中央潮間徽記與字標 |
| 觸控 dock | — | 觸控版的「裂潮」圓鈕放在常駐 command dock，橫向手牌抽屜打開時一樣看得到、按得到；400px 以下窄機會壓縮手牌鈕，dock 維持 62px 高 |

## 3. 測試結果（最後一次完整執行）

| 閘門 | 結果 |
|---|---|
| `npm test` | 通過（exit 0）。core `154 / 0`（新增 23 項裂潮／星級測試），cards、quality gates、balance sim、R67 visual 全綠 |
| `npm run test:e2e` | 通過（exit 0）。共 553 個 ✓：Stage 5 E2E、R65 控制可達性（新增 `#tidebreakBtn` 進桌機／觸控主控制，並加抽屜開啟時「可見即可點」斷言）、R67 browser、新增 `test-r72-fun.js` 38/0 |
| `npm run test:rwd` | 通過：33/33 頁面×視口零違規（中途 320×568 曾因 dock 變高出現 3 個 footer 命中違規，已修正後重跑） |
| `npm run test:r67:performance` | 通過：3 跑中位 interactive 2,969 ms、visual ready 827 ms、frame p95 **16.8 ms**（≤18）。原始資料：`docs/evidence/r72/performance-after.json` |
| 秘密掃描 | `grep -rniE "sk-proj-…|sk-…"`（排除 .git／node_modules）0 命中 |
| 舊版號 | `card-battle-r71-v1`、`card_sw_auto_reload_r71_v1`、`"0.4.16"` 在 docs 以外 0 命中 |
| 截圖過程 console／page error | 四視口 0（`docs/evidence/r72/after/console-errors.json`） |

效能限制：`test:r67:performance` 只量對戰頁桌機情境（Fast 3G＋4x CPU 載入、畫面 frame p95），沒有獨立的手機 p95 數字；這次也不是乾淨機況（同時有其他代理在跑），數字僅供參考。

## 4. 證據路徑

- before：`docs/evidence/r72/before/00–08-*.png`
- after：`docs/evidence/r72/after/00–10-*.png`。重點對照：
  - 品牌與開場：`00-hub-first-impression-*`、`01-battle-first-load-*`（after 是 VS 開場）
  - 戰場／頭像／版面：`03-battle-turn3-*`、`04-staged-attack-impact-*`
  - 招牌玩法：`09-staged-tide-ready-*`（滿潮發光）、`10-staged-tidebreak-wave-*`（潮浪掃過）
  - 星級結算：`05-staged-victory-*`
  - 卡包：`06-pack-first-load-*`、`08-pack-revealed-*`
- 重跑：`node scripts/capture-r72-evidence.js before|after`

## 5. 未完成與風險

1. **背景音樂缺件（BLOCKED）**：本機 AI 派工器 `music` 兩次都因 GPU 佇列逾時失敗（task `93dee227-6555-4583-b687-462698bd9e5e` queue_timeout；`d8df7b17-3e15-45d3-bde3-1dc1b52798a7` 兩個 worker 都 resource queue timeout）。載入架構已完成（`battle.js` 的 `BGM_URL`：音量連動 SFX、靜音同步、只在對戰分頁前景播放），目前 `BGM_URL = null`，不會發出 404。補檔：放 `assets/audio/battle-tide-loop.mp3`、把 `BGM_URL` 改成該路徑、在 CREDITS 記錄模型與提示詞。
2. **before 卡包開啟截圖沒拍到**：before 腳本點卡包時被 floaty 動畫的穩定性檢查擋住，`07/08-pack-*` before 與 `06` 相同；after 已改用 force 真實點擊。比較卡包外觀請看 `06-pack-first-load-*`。
3. **平衡只有模擬證據**：裂潮與對手親和的平衡來自 `test-balance-sim.js`（啟發式 AI），還沒有真人長局數據；簡單難度的手感需要真人再確認。
4. **1366×600 卡片縮到 68px**：為了讓三排卡完整入框，小卡隱藏效果文字（和觸控小視口一樣，要點「詳」看），可讀性比大螢幕低。
5. **音效主觀品質沒驗**：headless 環境無法人耳評估裂潮合成音。
6. **開場只在真人瀏覽器播放**：自動化預設略過，只有 `test-r72-fun.js` 用 `?intro=1` 驗證。
7. 不碰的範圍：沒有 push、部署或任何商店操作。工作樹裡原本就未追蹤的 `docs/audit_openclose/`、`docs/playtest/`、`scripts/audit-oc-r1.js` 沒有修改，也沒有納入 commit。測試期間被覆寫的 `docs/evidence/R67/` 已用 `git checkout` 還原。
