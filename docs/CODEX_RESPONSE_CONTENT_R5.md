# 裂潮卡牌｜新內容第 5 輪

版本 **0.18.0**，PWA **card-battle-content-r5-v1**。狀態：**VERIFIED（本機五項驗收與全部測試案例；E2E 分段重測）**。外部缺件仍列 BLOCKED。結果已由 `docs/content/r5/test-exits.json`、`e2e-constituents.json` 與 `verification.json` 讀回。只在本 repo `main` 本機執行；沒有 push、部署、商店操作、發訊息或委派外部服務。

## 三項內容與正常入口

1. **六道潮汐殘局**：港口同名入口／五站同名按鈕／研習第一分頁。首題保留引導，第 2～6 題只顯示目標和一行情境，包含移除第四題「先處理」提示。玩家自行觀察盾、血量與嘲諷，安排交換、施法與潮術。未完成會用銅框標卡、指出缺少的步驟，可立即重試。修正港口把複驗算入六題的錯誤：六題依合法題目 ID 計數，封頂 6/6；複驗另列 0/1。研習六題下方常駐「複驗：護住騎士」，鎖定時顯示「解完六道開啟」，通關後可直接進入，不必經完成彈窗。補正已施法／已完成正確交換後的診斷，避免把缺少收尾誤判為尚未行動或交換錯人。
2. **潮汐預報**：港口／研習第二分頁為固定短局，五站同名入口保留一般預報對戰。入口改為「善用唯一一次反轉，保住能反攻的隨從並擊敗英雄」，不提供操作順序。公開前三回合，一局反轉一次；按住預覽、放開才套用。已過回合顯示「時機不符」；觀潮台「方向限制」說明目前不能選的方向，兩者不消耗資源。第四回合恢復自由潮術，守備狼、己方騎士和兩張潮向卡完整同屏；收合仍保留兩個 ≥44px 方向鈕，可實際切換方向。
3. **茉恩的退潮考驗**：港口／五站／研習第三分頁。結束整備回合，觀察茉恩退潮留守，再依聖盾與血量安排反攻；拖延會讓敵騎士實際出擊並失去士兵。沿用既有生成盾圖，破盾圖不再裁在卡內，裂紋與碎片跨出卡框；同一騎士破盾前後都是四血。離線狀態依 `navigator.onLine` 與 online／offline 事件更新，進場就顯示「離線遊玩 · 進度儲存在此裝置」。它是裝置連線狀態提示，實際離線能力另外以 Playwright 真停網、進場、完成、重載驗證。

## Muse 五項清單與原尺寸證據

以下 `phone-*.png` 全部位於 **`docs/content/r5/`**，為 **390×844 原尺寸 PNG**，由無頭 Chromium 實際 DOM 操作取得，不注入對戰狀態，不拼接或縮放。

前輪對照另保留 `before-phone-harbor-progress.png`、`before-phone-forecast-fourth.png`、`before-phone-moen-shield-after.png`，是 R4 原圖的逐位元組副本，沒有冒稱本輪重拍；不放進 15 張精選集。

### 1．計數與複驗入口

`phone-harbor-six-completed.png`：六題 6/6、複驗 0/1。`phone-harbor-verification-completed.png`：六題仍為 6/6、複驗 1/1。`phone-study-verification-locked.png`／`phone-study-verification-unlocked.png`：常駐鎖定條件與直接入口。`phone-verification-playing.png`／`phone-verification-completed.png`：從研習直接進場並完成；重載及匯出入保留進度。重複、損壞及特殊 ID 的單元案例不會產生 7/6。

### 2．六題各四態、失敗不捏造行動

| 題目 | 遊玩 | 失敗 | 重試 | 完成 |
|---|---|---|---|---|
| 一席換滿潮 | `phone-puzzle-fallen-playing.png` | `phone-puzzle-fallen-failed.png` | `phone-puzzle-fallen-retry.png` | `phone-puzzle-fallen-completed.png` |
| 先剝貝盾 | `phone-puzzle-shield-playing.png` | `phone-puzzle-shield-failed.png` | `phone-puzzle-shield-retry.png` | `phone-puzzle-shield-completed.png` |
| 退浪留弓 | `phone-puzzle-shelter-playing.png` | `phone-puzzle-shelter-failed.png` | `phone-puzzle-shelter-retry.png` | `phone-puzzle-shelter-completed.png` |
| 浪後的缺口 | `phone-puzzle-taunt-playing.png` | `phone-puzzle-taunt-failed.png` | `phone-puzzle-taunt-retry.png` | `phone-puzzle-taunt-completed.png` |
| 留一滴給海 | `phone-puzzle-spell-playing.png` | `phone-puzzle-spell-failed.png` | `phone-puzzle-spell-retry.png` | `phone-puzzle-spell-completed.png` |
| 兩線同退 | `phone-puzzle-cross-playing.png` | `phone-puzzle-cross-failed.png` | `phone-puzzle-cross-retry.png` | `phone-puzzle-cross-completed.png` |

六題失敗圖皆為「未做任何操作就結束回合」的真實結果，同時顯示銅框卡圖與缺少步驟，不宣稱已施法或已陣亡。第 2～6 題遊玩文字逐題自動檢查無先／再／接著／最後。另以 `phone-puzzle-cross-playing.png` → `phone-puzzle-cross-exchange-1.png` → `phone-puzzle-cross-exchange-2.png` 呈現同一局的兩次真實交換、蓄潮與兩敵同剩一血。

### 3．第四回合新版同屏與收合

`phone-forecast-fourth-choices.png`：敵狼、己騎士、雙方向完整同屏，卡片在觀潮台面板外。`phone-forecast-fourth-collapsed.png`：同一局收合後切到退潮，兩個方向與返回鈕可見可點。`phone-forecast-fourth-battle.png`：同局戰場。`acceptance.json` 逐卡記錄矩形、視口邊界與面板不重疊條件；另有手機橫向、iPad 直橫、1366×600 截圖 `layout-forecast-<寬>x<高>-1.png`。

### 4．入口只講目標、區分時機與方向

`phone-study-forecast.png`：入口沒有先點／再／接著。`phone-forecast-wrong-direction.png`：被禁止的方向保持 disabled，玩家可查「方向不符」原因，前後潮能與反轉狀態相同。`phone-forecast-wrong-timing.png`：點已過回合後顯示「時機不符」，不改預報。`phone-forecast-press-1-before.png` → `phone-forecast-press-2-down.png` → `phone-forecast-press-3-applied.png`：真 pointer down／up，按住沒有改變狀態，放開才反轉。`phone-forecast-completed.png`：真實完成，反轉消耗可重載，納入九項進度匯出入。

### 5．破盾同血量、離線圖可辨

`phone-moen-shield-before.png`／`phone-moen-shield-after.png`：同一騎士、同為 **4 血**，破盾後有貫穿裂紋與跨卡框碎片；DOM 同時量測 art 超出卡框且 overflow 未裁切，真實 shield 已失去。`phone-moen-wave-1-anticipation.png` → `phone-moen-wave-2-impact.png` → `phone-moen-wave-3-cleared.png`：蓄勢尚未加盾，命中才護盾／回血，退浪後進入反攻。`phone-moen-delay-before.png`／`phone-moen-delay-after.png`：拖延實際失去士兵。茉恩畫作是戰場中央空檔的常駐狀態橫幅，沒有冒稱短暫人物出場動畫。

`phone-moen-offline-entry.png`：Chromium 真停網後從正常入口進場，頂部離線狀態列可見。`phone-moen-offline-completed.png`：同樣停網狀態下完成；兩張內容和檔案不同，完成後再離線重載驗證進度。

## 15 張審查精選

審查用 **`docs/content/r5/review-set/`**，檔名 01～15 排序，三項各五張，每項至少三張對戰進行中。每張都是上列原圖的逐位元組副本；來源、尺寸、SHA-256 及證明內容在 `review-set-index.json`。01～05 殘局（獨立入口、三格交換、銅框失敗），06～10 預報（目標入口、第四回合同屏／收合、方向診斷、戰場），11～15 茉恩（離線進場、浪牆命中／退浪、同血量破盾前後）。完整六題四態與其他時序另保留在 r5 根目錄，沒有用入口／完成圖取代遊玩證據。

商店新增：`docs/store/screenshots/content-r5-forecast-1290x2796.png`、`content-r5-forecast-2064x2752.png`，以 430×932／DPR 3、1032×1376／DPR 2 原生擷取，不刪既有圖。

## 測試與保護

新增 R5 單元與 E2E 已接入 `npm test`／`npm run test:e2e`。既有斷言未刪除或放寬：同步精確 PWA revision；R1 研習控項由精確 12 改為精確 13，對應新增的常駐複驗按鈕，另加「唯一存在且可見」斷言，原有全部控項的 ≥44px、視口邊界、命中和不重疊檢查保留。所有 server／browser 依序啟閉。

| 檢查 | 最終結果與證據 |
|---|---|
| `npm test` | VERIFIED，最終重新執行 exit 0，R5 規則 **41 PASS**。`static-final.txt`。 |
| E2E 全部 18 支腳本 | VERIFIED，**18/18 分段通過**。原完整鏈前 13 支通過；修正精確控項後 R1～R5 逐支 exit 0，分別 **105／114／95／149／86 PASS**，共 549 項內容檢查。`e2e-constituents.json` 記錄每支指令與原始 log；來源雜湊綁定本次 runtime。 |
| `npm run test:rwd` | VERIFIED，exit 0，十一視口×三頁 **33/33 零違規**。`rwd-final.txt`。 |
| `npm run test:r67:performance` | VERIFIED，exit 0，三跑首畫面中位 **2937.1ms**、可互動 **7606.4ms**、幀 p95 **16.7ms**。`ci-performance-final.txt` 與 `legacy-receipts/docs/evidence/R67/after/performance.json`。 |
| R5 桌機／手機效能 | VERIFIED，exit 0，各三跑×240 個 rAF 間隔，中位 p95 均 **16.8ms**。保留最高單幀 **50.1ms** 的波動，屬並發載參考。`frame-times.json`。 |
| 語法、秘密、版號、圖片 | VERIFIED，**73** 份 JS 語法通過，秘密掃描 **0 命中**，執行期舊版號 **0 命中**；手機圖、15 張副本、商店原尺寸與 SHA-256 全數核對。`verification.json`。 |
| 進場資料保護 | VERIFIED，**2,237** 份進場文件逐位元組核對，還原 **299** 份歷史測試輸出；原 R67 修改與既有未追蹤檔保留。`preservation.json`。 |

為對齊 Git 的文字換行規範，`sourceHashes` 採 LF 正規化並逐檔比對提交索引；`testedRawSourceHashes` 保留實測工作檔原始雜湊。28 份 runtime 文字檔只有 CRLF→LF 差異，對照見 `line-ending-proof.json`；沒有在實測後修改程式內容。

**E2E 退出碼說明：最後一次完整 `npm run test:e2e` 程序仍保留 exit 1**，停在舊 R1「只能有 12 顆按鈕」斷言。修正為需求指定的 13 顆、加入更嚴格的複驗入口斷言後，五支內容腳本已逐一實跑通過；前 13 支已在同一份未再更動的 runtime 通過。沒有把該完整 npm 程序改記為 exit 0；`test-exits.json` 的 E2E `aggregate:true` 表示全項分段驗證。重跑入口 `run-content-r5-checks.py` 仍保留正常完整指令。

原失敗與診斷留存於 `content-initial.txt`、`content-recheck*.txt`、`failure.txt`、`e2e-initial-failed.txt`、`e2e-second-failed.txt`：分別是重載時測試多點已關閉選單、說明鈕誤掛試航區塊、舊收合樣式優先序、一般觀潮台控制結構，以及新增複驗後的精確數量契約。上述均已修正；`failure.txt` 是已修復嘗試的原始紀錄，現況以最終逐支結果、`acceptance.json` 與 `verification.json` 為準。

進場已修改的 `docs/evidence/R67/gates/visual-assets.json` 與既有未追蹤檔均保留。歷史測試寫入先備份，執行後歸檔本輪 JSON／文字憑據並逐位元組還原；本輪重複歷史圖片只歸檔 `.audit-tmp/content-r5-generated/`。`preservation.json` 與原始 inventory 驗證保護結果。

本輪 **新增原圖 0、執行期新裁圖 0**。沿用 `image_gen.imagegen` 既有生成畫作，沒有新增提示詞或以色塊／emoji 代替素材；來源 manifest、原圖工具與本次重用雜湊在 `docs/art/ASSET_MANIFEST_CONTENT_R5.json`。破盾是技能狀態插畫，浪牆是技能 VFX，不宣稱人物逐幀動畫或碎片物理模擬。

## Apple 4.3 與缺件

**Apple 4.3 風險：高。** 自有潮汐交換、公開預報與手工首領具有差異，但未完成新版全陣容盲測，也沒有 Apple 接受結果；本機修正與證據補齊不能保證審核。維持 MIT、免費、無廣告、無內購、無帳號、無新增外部連結／SDK／線上功能，支援離線。

- **BLOCKED**：Muse 8 分以上複審，需要審查員實際讀取這 15 張新圖；未以自評冒充獨立分數。
- **BLOCKED**：實體手機／iPad 的 Safari、原生簽章包與飛航重開，需要實際裝置、安裝包及持有者操作紀錄。
- **BLOCKED**：真人親子試玩、新玩家理解與五秒辨盾，需要參與者與計時紀錄。
- **BLOCKED**：正式 attack／hurt／death 人物姿勢幀仍缺件，保留既有 `pose-player.js` 可替換管線；整卡狀態變化不算人物動畫完成。
- **BLOCKED**：乾淨機況效能；本機同時有其他線路，p95 只作並發載參考。

## 繁中文案 mode 2

| 原句 | 原因 | 改成什麼 |
|---|---|---|
| 六道潮汐殘局 7/6 | 複驗誤算進六題 | 六道 6/6，複驗 1/1 獨立顯示 |
| 先點第 2 回合改潮向，再回戰場擊敗英雄。 | 入口直接報答案 | 善用唯一一次反轉，保住能反攻的隨從並擊敗英雄。 |
| 本回合擊敗英雄；先處理擋路的嘲諷。 | 第四題仍含操作提示 | 本回合清空敵陣並擊敗英雄。 |
| 錯在還沒完成施法／錯在交換對象 | 已正確完成部分步驟時診斷失真 | 依手牌與盤面指出缺少交換或漲潮收尾 |
| 複驗通關前隱藏 | 看不見入口與開啟條件 | 常駐「複驗：護住騎士 · 解完六道開啟」 |
