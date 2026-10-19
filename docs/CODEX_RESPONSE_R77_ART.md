# 裂潮卡牌 R77｜美術第三輪

2026-10-16。VERIFIED（本機五項驗收與下列測試；缺件另列）。版本 **0.10.0**，PWA `card-battle-r77-v1`，main，進場基準 `9e216fd736668b828151e81ff346db71f8040296`。最終收據已寫入並讀回。只改本 repo，全部背景／無頭執行，沒有 push、部署、操作商店、傳訊、派工或讀取秘密目錄。

## 三項主要改變

1. **掀潮有完整因果。** 先解碼浪牆／泡沫／水窪，蓄勢不扣血；360ms 命中才結算，1300ms 退浪。浪牆跨 108% 視口，泡沫直接覆到敵卡，甲板留下水窪。連點不重複結算，換局取消舊傷害；低效能／減少動態保留原畫與結算時點。
2. **真正四種卡上場。** 試航借用迅捷狼、火花侍從兩張真手牌與 3 點法力，從既有出牌流程進場，連同士兵、弓箭手共四種。移除圖庫橫條。同名第二張鏡像並壓暗 30%，另標位置；待命壓暗、已行動有耗盡標示，可攻擊輪廓排除禁止行動者。借用衝鋒牌不能直接打英雄跳過試航的掀潮目標；一般對戰規則未改。
3. **同一片夜海甲板與收藏卡。** 取消乾甲板／亮藍海／乾甲板三橫帶，改為同透視的木甲板、水膜與接觸陰影。月貝銅框保留四種稀有度與既有雙層閃卡；攻血在卡框上方，iPad 四卡依高度放大。勝利採同身份舉旗人物的夜海版本，字標只精修材質與色溫。

## Muse 唯一五項驗收

本表是本線實作與自審，不是新的獨立 Muse 分數。進場 6.6／10 保留，未冒稱已達 8 分。

| 項目 | 狀態、實證與原尺寸截圖 |
|---|---|
| 1．先交施放三格 | VERIFIED：首次完成後才解除其他畫面凍結，初次收據留在 `docs/art/compare/r77/wave/first-gate/`。目前完整三格：`docs/art/compare/r77/wave/1290x2796-01-before.png`、`docs/art/compare/r77/wave/1290x2796-02-impact.png`、`docs/art/compare/r77/wave/1290x2796-03-after.png`。這組是明示的非致命 QA，實際按鈕施放，25→23、退浪後保留水窪；不是商店造景。另有正式根入口、真試航的 `official-1290x2796-01-before.png`／`02-impact.png`／`03-after.png`，同目錄；致死後接結算 |
| 2．同名區分、至少四種上場 | VERIFIED：`docs/store/screenshots/battle-1290x2796.png`。真出牌、費用消耗與四種 card ID 由測試核對；390 寬所有場上主圖 ≥40px。兩次交換後狼／侍從留場，`docs/store/screenshots/trial-1290x2796.png`。圖庫 DOM 已移除，不拿縮圖充數 |
| 3．同透視與 0／6 水位 | VERIFIED：`docs/evidence/r77-art/water-0-390x844.png`、`docs/evidence/r77-art/water-6-390x844.png`，原尺寸 QA、同一場面。水線高度差 90px，短橫向 50px。取色 `docs/evidence/r77-art/water-palette-contact.png`／`water-palette.json`；首頁中間調 #3F4369，舊水域 #274882，新積水 #282E4F、浪牆 #343E5E；水層 saturate(.8)、浪牆 .85，沒有以整屏亮青藍取代夜海 |
| 4．單一預覽、正確時序、空位清楚 | VERIFIED：`docs/art/compare/r77/before/tide-chart-1290x2796.png` → `docs/store/screenshots/tide-chart-1290x2796.png`；滿潮同場景為 `docs/art/compare/r77/before/trial-1290x2796.png` → `docs/store/screenshots/trial-1290x2796.png`。只保留觀潮文字＋目標描邊，移除全部卡面／英雄預覽浮字；預覽與取消不改生命／潮能。空場另有 `docs/evidence/r77-art/empty-field-fixture-390x844.png`，是明示 QA；浪紋空位無括號殘字 |
| 5．五圖逐張簽核與夜海勝利 | VERIFIED：`docs/art/STORE_QA_R77.md`，五張 1290×2796 逐項勾核，另查五張 2064×2752。舊黃昏勝利 `docs/art/compare/r77/before/victory-1290x2796.png` 與採用夜海 `docs/store/screenshots/victory-1290x2796.png` 並存 |

## 新素材與大小

**10 張生成原圖**：浪牆、泡沫、水窪、甲板背景、夜海舉旗領航員、夜海港口、月貝銅框、裂潮圖示、字標、App 圖示提案。實際工具 **`image_gen.imagegen`**，未提供可核實模型 slug，manifest 記 `model_slug=null`，不推定型號。

共用風格與規格化提示詞：`docs/art/PROMPTS_R77.json`；主 `PROMPTS.json` 保留舊內容並連到本輪。原圖 `docs/art/source/r77/`，逐檔尺寸／格式／SHA-256／alpha／色彩及參考來源 `ASSET_MANIFEST_R77.json`；角色與字標保留 R76 參考原圖的 hash。授權已追加 CREDITS，原素材與授權不刪除。

執行期為 11 張 WebP（甲板含高／低兩版）與 1 張 App 提案 PNG，合計 **1,761,416 bytes，淨增加約 1.68 MiB**；不刪舊契約素材。10 張原圖約 **21.58 MiB**，比較圖與測試證據屬開發資料；沒有產生簽章 IPA／AAB，不能把資料夾差額當原生包體增量。App 圖示是本機提案，未改商店或既有 PWA 圖示契約。

保留工具實際原生 RGBA，後製只做縮放、壓縮、mask 與 QA contact sheet，沒有用程序形狀替代畫作。透明／白底邊緣對照 `docs/art/thumbs/r77/alpha-fringe-review.png`，64px 自審 `contact-64.png`。角色原圖與實際 WebP 皆通過亮度／飽和雙閘；月白字標、銀框與泡沫不是人物，未假稱符合人物門檻。原生 alpha 最大值有 253／254，沒有改成假的全不透明；領航員保留腰部裁切，底角 alpha 252／251，非四角皆空的全身 sprite。這項裁切如實留在 manifest，不冒稱全身三視圖或完整動畫資產。

## 測試與證據

原測試未刪除、未降低數值門檻。R72 保留原傷害／耗潮斷言，增加蓄勢無傷害後等待命中；R74 退潮等待相同的真命中。R76 將已要求移除的圖庫／浮字斷言改為真四卡上場／零浮字／正確描邊，保留舊水位、遮擋、42% 面板等門檻，並補文字不截斷、攻血不被卡框蓋住、行動標籤不壓卡名。

| 指令／檢查 | 結果 |
|---|---|
| `npm test` | VERIFIED：核心、卡牌、品質、平衡、舊素材、航程、規則與本輪素材全綠；最終完整輸出 `docs/evidence/r77-art/npm-test-final.log` |
| `npm run test:e2e` | VERIFIED：完整流程 exit 0，`e2e-final-delivery.log`；含舊對戰／控制／R67／R72／R73／R74／R75、R76 美術 **103**。最後入口／禁止行動者修正另以 **R77 22 項**（`r77-tide-final.log`）與既有完整 Stage 5 對戰（`battle-e2e-final-guard.log`，exit 0）覆驗 |
| `npm run test:rwd` | VERIFIED：十一視口 × shell／battle／pack，**33/33 零違規**；含 320×568、844×390、1366×600，`rwd-ship.log` |
| 原效能三跑 | EXECUTED：Fast 3G＋4× CPU，視覺就緒中位 **2972ms**，可互動 **7352.6ms**，p95 **16.8ms**，原斷言全過。`performance.json`／`performance.log`；未把畫面就緒當完整可操作 |
| 桌機／手機三跑 | EXECUTED：1366×768 為 16.7／16.8／16.8ms，中位 **16.8ms**；390×844 三跑皆約 16.7ms。`frame-times.json`。**並發載量測，僅供參考**，非 GPU 耗時或實機出貨證明 |
| 版本／語法／秘密／原圖尺寸 | VERIFIED：0.10.0／R77 revision、執行期舊版號零命中、JS 全語法通過、十張原尺寸 PNG、秘密 regex **零命中**。`verification.json`／`secret-scan.json` |

本輪先擷取改前、再按五項修改。四種一般視口 before／after 在 `docs/art/compare/r77/`；兩個商店尺寸共十張在 `docs/store/screenshots/`。全部原尺寸 PNG，沒有加框或改字。正式商店圖使用真出牌／交換／施放；0／6 水位、非致命濕痕、空位與稀有度展示另標 QA，不冒充自然對局。

歷史測試會覆寫舊 evidence，收尾已依 `.audit-tmp/r77-preserve/` 的進場 hash 核對 **455 份**歷史證據，還原被測試覆寫的 25 份，本輪輸出另存 `docs/evidence/r77-art/legacy-output/`；原本已修改的 R67 JSON 與所有既有未追蹤檔保留，暫存不提交。早期失敗輸出留存：快取漏登、短橫向英雄觸控邊緣、舊 120ms 結算假設、雙擊時序、文字遮擋與裝飾框蓋攻血。均按實際原因修正。

## Apple 4.3 與未完成

**Apple 4.3 風險：高。** 夜海甲板、裂浪機制、舉旗領航員與收藏框的身份已延伸進正式對局；這不代表帳號層差異或審查結果已獲 Apple 接受。

- PREPARED：等待新的獨立複評，進場 6.6／10 不改寫，也不以本線自審宣稱 8 分。五人盲辨與 64px 盲測未做。
- BLOCKED：原生 iPhone／Android／iPad、Safari／WebKit、乾淨機況效能與新簽章 IPA／AAB。沒有商店上傳。
- BLOCKED：角色 walk／attack anticipation-impact-recovery／hurt／death 真姿勢及三視圖仍缺。保留既有 pose-player 替換管線；水浪、卡片材質、位移與 UI 動態均不冒稱人物動畫。
- PREPARED：其餘 84／92 張卡圖未在本輪重繪，次級 emoji 與 9–10px 狀態標籤仍有殘留；本輪不宣稱全卡池、全圖示或全作字級皆統一。

## 繁中文案 mode 2

修改五處；數字、牌名、規則與專名保真，直接套用，不另要求確認。

| 原句／原狀態 | 原因 | 改成什麼 |
|---|---|---|
| 試航未交代可用手牌 | 真四卡上場須有可理解入口 | 補「可先開啟手牌，召喚迅捷狼與火花侍從。」 |
| （你的隨從）／（敵方戰場） | 空場低對比殘字 | 換浪紋空位；完整空位語意留給讀屏 |
| 無明示行動狀態 | 同名卡與可動者難區分 | 可攻擊＋位置、待命、已行動 |
| 素材未解碼仍直接演出 | 慢載可能只看到扣血 | 素材失敗提示「浪潮素材載入失敗，潮能未消耗，請再試一次。」 |
| 衝鋒可略過試航核心演示 | 借用卡應保留既定試航目標 | 「試航要用裂潮破陣，先讓士兵交換蓄潮。」；一般對戰不受限 |
