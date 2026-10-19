# 裂潮卡牌 R78｜美術第四輪

工作單 2026-10-17，執行至 2026-10-18。main，版本 **0.11.0**／`card-battle-r78-v1`。本機修改與提交，沒有派工、push、部署、商店操作、對外訊息或讀取秘密目錄。

本輪以 `ART_RESCORE3_MUSE.md` 第四節五項為唯一驗收，對照 RESCORE2 未收項；沒有新增系統或畫面。先凍結其他修改，接入新浪牆並交連續三格，再做其餘四項。進場分數 **7.0/10**；本線不把自審當獨立 8 分複評。

## 五項驗收與原尺寸改後證據

| Muse 唯一清單 | 實作與證據 |
|---|---|
| 1．掀潮前／中／後 | 實際按鈕施放，蓄勢不扣血，360ms 命中、1300ms 退浪。浪牆跨畫面 108%，由我方向敵陣推進，兩張目標卡各有繪製泡沫。正式商店高峰是 `docs/store/screenshots/trial-1290x2796.png`、`trial-2064x2752.png`，不再以滿潮待按圖交差。連續原尺寸 `docs/art/compare/r78/wave/official-1290x2796-01-before.png`／`02-impact.png`／`03-after.png`（2064×2752 同名組）。非致命 QA 另交 `docs/evidence/r78-art/nonlethal-1290x2796-01-before.png`／`02-impact.png`／`03-after.png`／`04-next-turn.png`；真施放後水窪保留至下一個完整回合，沒有手動注入 wet class。 |
| 2．同名狀態與五種卡圖 | 移除「可攻擊 1」「敵陣 1」等卡面編號，可動者統一箭頭／描邊，待命壓暗 30%，耗盡略傾斜加已行動標記。同名沿用原畫、鏡像與明暗區別，不假稱另一張插畫。正式試航真實支付 4 費召喚狼、侍從、幼犬，加上士兵、弓手五種圖同場：`docs/store/screenshots/battle-1290x2796.png`、`battle-2064x2752.png`。390 寬卡圖全數 ≥40px。`acceptance.json` 留實際 card ID；沒有展示圖庫。 |
| 3．會漲的潮 | 新單一甲板＋梯形透視浪層，遠窄近寬、前緣有浪高，沿甲板向敵陣推進；保留卡腳接觸陰影與滿潮水緣。0 潮水層透明、6 潮高度與覆蓋同時增加：`docs/evidence/r78-art/water-0-1290x2796.png`／`water-6-1290x2796.png`，以及 `water-0-2064x2752.png`／`water-6-2064x2752.png`。這組為明示 QA 同場景；商店 `battle` 為真 4/6、`tide-chart` 為真 6/6、`trial` 為真施放高峰，三者均可見新水域。 |
| 4．觀潮台與裂潮鈕 | 上移英雄視覺列並保留原佔位，不再推低敵卡；頭像、生命 12、潮 6/6 同時可見。`docs/store/screenshots/tide-chart-1290x2796.png`、`tide-chart-2064x2752.png`。五視口英雄列均在面板上方；面板仍 ≤42%。底部完整「裂潮」字樣、滿潮只播兩次脈動；商店戰鬥圖可直接讀到。保留取消無耗潮、命中結算、連點一次結算與換局取消延遲傷害守門。 |
| 5．全幅頁與十圖簽核 | 港口／勝利全幅規格一致；只在退浪完成、結果真正顯示後收起 shell 功能頂欄，避免施放中改變座標。`docs/store/screenshots/harbor-1290x2796.png`／`harbor-2064x2752.png`、`victory-1290x2796.png`／`victory-2064x2752.png`。逐圖簽核 `docs/art/STORE_QA_R78.md`。 |

前後對照在 `docs/art/compare/r78/before/` 與 `after/`。本輪進場無頭四視口五畫面皆保留；兩個商店尺寸的 before 是進場 R77 官方 PNG 原始位元組，來源與基底記於 `before/incoming-store-origin.json`。after 與商店均從根入口真實出牌／交換／施放，無測試狀態注入、無後製改字或縮放。0／6 與非致命測試另標 QA，不冒充自然對局。

## 新圖與大小

**9 張生成原圖**：浪牆、透視浪層、領航員三視圖／表情、持牌領航員、月貝甲板、細貝銅卡框、裂潮圖示、字標、App 圖示提案。實際工具 **`image_gen.imagegen`**；無可核實模型 slug，manifest 為 null，不推定 gpt-image 型號。

原圖 `docs/art/source/r78/`，三視圖 `docs/art/character-sheets/navigator-r78.png`，共用前綴與逐張提示詞 `docs/art/PROMPTS_R78.json`，主 `PROMPTS.json` 已連到本輪。`ASSET_MANIFEST_R78.json` 記來源／參考／執行期 SHA-256、尺寸、原生 alpha、角色亮度／飽和度；`CREDITS.md` 追加新圖授權且保留所有舊素材授權。所有新素材已存 repo，沒有僅依賴工具預設目錄。

執行期 13 張 WebP（含低解析版本、獨立頭像與設定表參考），合計 **1,776,578 bytes，增加約 1.69 MiB**；9 張原圖約 **22.39 MiB**，另有截圖與 QA 開發證據。沒有簽章 IPA／AAB，所以這是 assets 增量，非實測原生包體差。App 圖示仍是本機提案，未更換商店或 PWA 圖示。

後製只有縮放、頭像裁切、WebP 壓縮與 QA contact sheet，保留工具原生透明；沒有程序方塊或假透明。`docs/art/thumbs/r78/contact-64.png` 為自審縮圖，各透明圖另有白／夜海背景邊緣對照。人物原圖與執行期立繪通過亮度 0.30–0.75、近黑 <35%、飽和 ≥0.32、低飽和 <20% 雙閘。設定表不是動畫幀；原生 alpha 部分最大值 253／254，立繪下緣可佔角，均如實記錄。

## 測試

既有測試沒有刪除或降低斷言。`test-battle-e2e.js` 只將必須精確比對的 revision／session key 從 R77 同步至 R78；15 秒門檻、圖示尺寸、離線載入與所有規則數值不變。新增 R78 素材守門與 75 項瀏覽器驗收，已加入既有 npm test／test:e2e。

| 驗證 | 結果與輸出 |
|---|---|
| `npm test` | VERIFIED：全量核心／卡牌／品質／平衡／航程／素材綠，`static-shipping.log`；最後另作資產與發行讀回。 |
| `npm run test:e2e` | VERIFIED：完整流程 exit 0，`e2e-ship-final.log`，含所有舊測試與當時 R78 73 項。原尺寸複查後清理死亡殘影中的卡牌說明與互動控制，另跑最終 R78 **75 PASS**（`acceptance-final.log`）及 R77 **22 PASS**（`tide-final.log`）；最後的純視覺清理沒有再次重跑全量。 |
| `npm run test:rwd` | VERIFIED：11 視口 × shell／battle／pack，33/33 零違規，`rwd-shipping.log`。另加五卡試航的完整入框／牌名不截斷斷言，補掉一般對局矩陣未涵蓋的橫向換行。 |
| 桌機／手機 rAF 三跑 | EXECUTED：1366×768 中位 p95 **16.8ms**；390×844 中位 **16.7ms**，`frame-times.json`／`frame-times-shipping.log`；並發載參考。 |
| 正式商店圖 | VERIFIED：6 視口／倍率從根入口真出牌，兩個商店尺寸共十張。`compare/r78/after/capture.json` 留實際高峰寬度 1.08、兩目標泡沫 opacity 1 及動畫時間；減少動畫路徑保留同一命中畫作。 |

收尾結果與最終雜湊見 `docs/evidence/r78-art/verification.json`；各執行完整輸出留同目錄。首輪捕捉的預快取重複登錄已修正並加入唯一性守門。慢網路首屏初測 10,127ms，經低解析圖、獨立頭像、修正預載及未出場卡按需載入，三跑中位 **2,571.9ms**；可互動 **6,879.8ms**，rAF p95 **16.8ms**，原斷言全部通過。高倍率保留完整素材，沒有放寬 3000ms／18ms 門檻。過程失敗紀錄保留，`performance-shipping.json`／`.log` 是採用結果；效能皆為並發載參考，不當作乾淨實機或 GPU 耗時證明。

VERIFIED：發行讀回確認十張 PNG 原尺寸、執行期版本／revision 同步、全部 JS 語法通過、秘密掃描零命中。最後補上浪尾 alpha 漸隱，避免施放畫作下緣形成硬切橫帶，再以完整根入口流程重拍；`capture-delivery.log` 是交付照片的最後擷取紀錄。`STORE_QA_R78.md` 逐張簽核本次原尺寸畫面。

VERIFIED：504 份進場歷史 evidence 全部核對，測試覆寫的 26 份已還原至進場位元組，當次測試產物另存本輪 `legacy-output/`；原本已修改的 R67 JSON 與所有既有未追蹤檔保留。`.audit-tmp` 備份不提交，商店十張是本輪授權替換的新照片。

## 未完成與風險

- **Apple 4.3 風險：高。** 視覺與潮汐賣點更一致，仍沒有帳號層差異或 Apple 接受的證據；沒有動商店。
- PREPARED：待新的獨立 Muse 複評；目前已知仍是進場 7.0，不自稱 8 分。64px 僅本線自審，未做五人盲測。
- BLOCKED：原生 iPhone／iPad／Android、Safari／WebKit、乾淨機況效能與簽章包未驗。本次只用本機無頭 Chromium。
- BLOCKED：人物 walk／attack／hurt／death 真肢體幀仍缺；保留 `pose-player.js` 可替換管線。浪牆／水域為技能與環境補間，卡片傾斜是狀態標記，不稱人物動畫。
- PREPARED：其餘卡池、次級 emoji 與舊小字未全面重繪；本輪只收前 3 分鐘及 Muse 五項，不宣稱全卡池與全作動畫完成。

## 繁中文案 mode 2

直接套用 3 處介面語言調整，牌名／規則數值保真：卡面「敵陣 N／可攻擊 N」因像除錯標籤而改為統一箭頭與狀態；藏起的單字「潮」補可見完整「裂潮」；觀潮台新增英雄列「潮 N/6」，避免在關鍵決策時失去潮能資訊。未另開新文案或導覽系統。
