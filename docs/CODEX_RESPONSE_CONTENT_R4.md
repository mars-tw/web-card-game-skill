# 裂潮卡牌｜新內容第 4 輪

版本 **0.17.0**，PWA **card-battle-content-r4-v1**。依 `docs/content/CONTENT_REVIEW_R3_MUSE.md` 的五項清單執行。僅本機 `main`，沒有 push、部署、商店操作、發訊息或透過外部服務派工。測試以 `docs/content/r4/test-exits.json`、`acceptance.json`、`verification.json` 為準。

## 三項內容、玩法與入口

1. **六道潮汐殘局**：港口同名入口／五站同名按鈕／研習第一分頁。首題保留逐步引導，第二至六題只給目標與一句盤面情境，讓玩家觀察血量、盾與攻擊對象，自行排順序。錯序結果用銅框標出卡片，指出缺少步驟，可立即重試。六題通關後，完成畫面的「換目標複驗」與研習的「複驗：護住騎士」會開啟同規則新目標：清掉狼，讓騎士至少保留四血。未受保護直接交換會失敗；先退潮再交換可完成。複驗檢查點、完成進度與匯出入沿用正常存檔。
2. **潮汐預報**：港口／研習第二分頁為短局，五站同名入口保留一般預報對戰。仍公開前三回合，一局反轉一次。觀潮台可收合，選方向時雙方完整單位與兩張潮向卡同屏，放大既有波浪／貝盾圖。短局第四回合由真實召喚流程加入無嘲諷守備狼，玩家可判斷交換或直接擊敗英雄，畫面呈現實際戰況。
3. **茉恩的退潮考驗**：港口／五站／研習第三分頁。結束整備後觀察茉恩退潮、留守與下一輪出擊，依盾與血量自行安排反攻。移除逐張報答案的提示，保留狀態與時間壓力。完整貝盾覆蓋卡圖右半；破盾改為跨卡圖裂紋和脫落碎片畫作，跟隨真實命中事件，破盾不扣騎士血量。三項完成畫面皆用短主標「解成了」，題名獨立呈現。

## 五項逐項證據

以下 `phone-*.png` 均在 **`docs/content/r4/`**，為 **390×844 原尺寸 PNG**。文字遮罩圖僅暫時隱藏文字及 HUD，沒有修改遊戲狀態；一般圖保留血量供核對。沒有用縮圖／拼接替代原尺寸圖。

### 1．放大破盾差異：VERIFIED（本機）

`phone-moen-shield-before.png`、`phone-moen-shield-after.png`：騎士同為 **4 血**，貝盾實際消失。遮字對照為 `phone-moen-shield-before-text-masked.png`／`phone-moen-shield-after-text-masked.png`。遮字後仍可由完整右半盾與跨卡裂紋、離體碎片辨認狀態，`acceptance.json` 另記錄真實 `shieldHP`。重載後保留破盾狀態，截圖不是獨立展示圖庫。

茉恩出場與浪牆三格：`phone-moen-preparing.png`、`phone-moen-wave-1-anticipation.png` → `phone-moen-wave-2-impact.png` → `phone-moen-wave-3-cleared.png`。蓄勢時尚未治療或加盾，命中後茉恩七血、騎士取得盾，退浪後輪到玩家；觀察時間在 `timeline`。拖延會實際失去士兵：`phone-moen-delay-before.png`／`phone-moen-delay-after.png`。碎片是破盾狀態插畫，不宣稱人物動作或碎片物理模擬。

### 2．八張完成彈窗與孤字：VERIFIED（本機）

八張完成圖：`phone-puzzle-fallen-completed.png`、`phone-puzzle-shield-completed.png`、`phone-puzzle-shelter-completed.png`、`phone-puzzle-taunt-completed.png`、`phone-puzzle-spell-completed.png`、`phone-puzzle-cross-completed.png`、`phone-forecast-completed.png`、`phone-moen-completed.png`。逐張檢查主標一行、內文與兩顆底部按鈕在框內、沒有內部溢出；失敗畫面亦檢查。主標統一「解成了」，未使用縮小孤字的補丁。

### 3．殘局從照做變判斷：VERIFIED（本機）

| 題目 | 遊玩 | 錯序 | 重試 | 完成 |
|---|---|---|---|---|
| 一席換滿潮 | `phone-puzzle-fallen-playing.png` | `phone-puzzle-fallen-failed.png` | `phone-puzzle-fallen-retry.png` | `phone-puzzle-fallen-completed.png` |
| 先剝貝盾 | `phone-puzzle-shield-playing.png` | `phone-puzzle-shield-failed.png` | `phone-puzzle-shield-retry.png` | `phone-puzzle-shield-completed.png` |
| 退浪留弓 | `phone-puzzle-shelter-playing.png` | `phone-puzzle-shelter-failed.png` | `phone-puzzle-shelter-retry.png` | `phone-puzzle-shelter-completed.png` |
| 浪後的缺口 | `phone-puzzle-taunt-playing.png` | `phone-puzzle-taunt-failed.png` | `phone-puzzle-taunt-retry.png` | `phone-puzzle-taunt-completed.png` |
| 留一滴給海 | `phone-puzzle-spell-playing.png` | `phone-puzzle-spell-failed.png` | `phone-puzzle-spell-retry.png` | `phone-puzzle-spell-completed.png` |
| 兩線同退 | `phone-puzzle-cross-playing.png` | `phone-puzzle-cross-failed.png` | `phone-puzzle-cross-retry.png` | `phone-puzzle-cross-completed.png` |

第二至六題在 playing 圖無完整操作順序；failed 圖直接標「錯序卡片」及缺少步驟。失敗不增加完成進度。未做任何操作便結束回合時，診斷會說尚未完成，不會憑空宣稱弓手已陣亡或法術已施放。

通關後複驗：`phone-verification-playing.png`、`phone-verification-failed.png`、`phone-verification-completed.png`。playing 為實際重載檢查點；完成進度與原八項一起匯出／清空／匯入逐值讀回。

### 4．預報戰場讓位給戰況：VERIFIED（本機）

`phone-forecast-fourth-choices.png`：第四回合，敵方守備狼、己方騎士、兩張潮向卡完整同屏；瀏覽器逐一量測卡片不在面板覆蓋區、控制可點，沒有捲動。`phone-forecast-fourth-collapsed.png` 展示真實收合，展開後仍可選方向。另留 `layout-forecast-844x390.png`、`layout-forecast-1032x1376.png`、`layout-forecast-1376x1032.png`、`layout-forecast-1366x600.png`。

補齊前輪未見證據：`phone-forecast-teaching-1-before.png` → `phone-forecast-teaching-2-pressed.png` → `phone-forecast-teaching-3-changed.png`，使用真 pointer down／up；按住未更改，放開才套用。`phone-forecast-past-locked.png`、`phone-forecast-wrong-direction.png`、`phone-forecast-reloaded.png` 分別證明鎖定、不可用方向、一次反轉已消耗；單元與瀏覽器比對錯方向零消耗。

### 5．研習背景與文字密度：VERIFIED（本機）

`phone-study-puzzles.png`、`phone-study-forecast.png`、`phone-study-moen.png`：不透光潮墨底完全遮住後方戰場控制；每項目標三行內，完整盤面情境移至開始後的戰場提示。保留三入口同名：`phone-entries-harbor.png`、`phone-entries-voyage.png`、`phone-entries-study.png`。

前後對照保留 `before-phone-moen-shield-before.png`、`before-phone-forecast-fourth-choices.png`、`before-phone-entries-study.png`；這三張是前輪原檔的逐位元組副本，未冒稱本輪操作。

## 測試與交付

狀態：VERIFIED（本機驗收；外部缺件仍見下列 BLOCKED）。既有測試未刪除或放寬斷言；PWA 精確版號斷言只同步新 revision。新增 R4 單元與真操作 E2E 已接進原 `npm test`／`npm run test:e2e`。全程背景／無頭，伺服器依序啟閉。

| 檢查 | 最終結果 |
|---|---|
| `npm test` | VERIFIED，exit 0；既有全鏈與 R4 規則 **22 PASS**。`static-final.txt`。最後的樣式預載修正後亦重跑通過。 |
| `npm run test:e2e` | VERIFIED，完整鏈 exit 0；R4 真操作 **149 PASS**，`e2e-final.txt`／`acceptance.json`。 |
| `npm run test:rwd` | VERIFIED，十一視口×三頁 **33／33 零違規**，exit 0，`rwd-final.txt`。 |
| CI 效能三跑 | VERIFIED，最後樣式預載修正後 exit 0；首畫面中位 **2883.7ms**、可互動 **7745.4ms**、p95 **16.8ms**，原斷言全綠。`ci-performance-final.txt`／`legacy-receipts/docs/evidence/R67/after/performance.json`。 |
| 內容桌機／手機效能 | VERIFIED，各三跑×240 個 rAF 間隔，中位 p95 均 **16.8ms**，exit 0，`frame-times.json`。桌機首跑為 **33.3ms**，保留原始波動；屬並發載參考，不能稱乾淨機況通過。 |
| 秘密、語法、版號、圖片尺寸／雜湊、進場檔案保護 | VERIFIED，**70** 份 JS 語法通過；**2232** 份文字檔秘密掃描 **0 命中**；執行期舊版 **0 命中**。所有手機 PNG／商店尺寸及 SHA-256 通過。進場 **2114** 份文件逐位元組保留，還原測試寫入的 **232** 份歷史證據，見 `verification.json`／`preservation.json`。 |

初次腳本誤把港口截圖當成完成彈窗檢查、一般觀潮台多出收合鈕、844×390 戰場置中／殘留捲動位置，以及 Fast 3G 首畫面 3106ms 的失敗均保留原始紀錄：`content-initial.txt`、`e2e-initial-failed.txt`、`content-recheck.txt`、`failure.txt`、`layout-diagnose*.txt`、`ci-performance-initial-failed.txt`。收合鈕改為預報模式動態建立，橫向戰場與英雄列固定在左側且進場歸零捲動，補上 R4 樣式預載；沒有放寬斷言。`failure.txt` 是已修復的初次橫向失敗，最終結果以五項 exit 0 與 `acceptance.json` 為準。全量 E2E／RWD 之後僅補樣式預載，對此載入修正再跑 `npm test` 與 CI 效能三跑。

歷史測試的 JSON／文字憑據歸檔於 `legacy-receipts/`；重複歷史圖片只歸檔本機 `.audit-tmp/content-r4-generated/`。進場已修改的 R67 gate 與所有既有未追蹤文件保持原位元組。沒有刪除既有商店圖或他人工作。

商店新增 `docs/store/screenshots/content-r4-moen-1290x2796.png`、`content-r4-moen-2064x2752.png`，以 430×932／DPR 3、1032×1376／DPR 2 直接擷取，既有商店圖全部保留。離線圖 `phone-offline-moen.png`／`phone-offline-completed.png` 由 Chromium 真正停用網路後正常進入並完成。手機橫向、iPad 直橫及矮桌機另有 `layout-moen-*.png`。

採用 **1 張新生成原圖、2 張執行期 WebP**；工具 **`image_gen.imagegen`**，未提供模型識別。原圖有真透明像素；只做裁切、縮放與壓縮。先前一張未採用嘗試因風格前綴非逐字相同而重生，實際提示詞與未採用原因皆記於 `PROMPTS_CONTENT_R4.json`。來源、尺寸、alpha 與 SHA-256 見 `ASSET_MANIFEST_CONTENT_R4.json`，授權見 `CREDITS.md`。

## Apple 4.3 與未完成

**Apple 4.3 風險：高。** 本輪把潮汐交換、公開預報與手工首領的決策和證據補強，但未完成新版全陣容盲測，也沒有 Apple 接受結果；這是本機風險判斷，不能保證審核通過。維持 MIT、免費、離線，沒有新增廣告、內購、外部連結、帳號、第三方 SDK 或線上功能。

- **BLOCKED**：Muse 獨立複審與 8 分以上結果，需要審查員實際讀取本輪原尺寸圖；本輪沒有自評冒充 Muse 分數。
- **BLOCKED**：實體手機／iPad、Safari／WebKit、原生簽章包及飛航重開測試，需要持有裝置者安裝、斷網、重開與存檔匯出入紀錄。
- **BLOCKED**：真人親子試玩、新玩家理解測試與五秒辨盾，需要參與者及計時紀錄；遮字對照圖不是人測結果。
- **BLOCKED**：正式人物 attack／hurt／death 姿勢幀仍缺件，保留既有 `pose-player.js` 可替換管線；沒有用整卡晃動冒稱角色動畫完成。
- 本機效能是並發載參考，不等於乾淨機況或實體裝置效能。

## 繁中文案 mode 2

| 原句 | 原因 | 改成什麼 |
|---|---|---|
| 第 2～6 題逐步解法提示 | 直接報答案，缺少判斷 | 目標＋一行情境；解法留給失敗回饋與通關回顧 |
| 茉恩的退潮考驗 · 解成了 | 長標題產生孤字 | 主標「解成了」，題名獨立一行 |
| 先點見習士兵，再點有聖盾的騎士 | 首領逐步報答案 | 聖盾擋一次傷害；見習士兵、弓手與騎士都能出手。 |
| 固定共用失敗提示 | 無法對照操作；未行動也可能誤述已陣亡 | 錯序卡圖銅框＋依盤面說明尚缺的動作 |

牌名、潮傷、前三回合公開與一次反轉規則保留。
