# 裂潮卡牌｜新內容第 7 輪

版本 **0.20.0**，PWA **card-battle-content-r7-v1**。狀態：VERIFIED（本機五項修正、功能／畫面／離線與回歸；Muse 實際分數仍待複審）。本輪只修 R6 Muse 審查指出的細節，沒有增加第四種玩法。僅在本 repo `main` 本機作業，未 push、部署、操作商店、傳訊或委派，未讀取秘密目錄。

## 三項內容、操作與入口

1. **六道潮汐殘局**：港口同名入口、五站航程的殘局按鈕，或研習第一分頁。選友軍看交換預覽，再確認交換或取消。機制籤改為至少與卡名同級，放在卡下及潮溝內，交換時收起會被面板遮住的旁註。第 3 題英雄生命以「—／本題不計」呈現，實際規則生命不變；第 4 題註明「開局已受傷」。六題、立即重試、完成計數及獨立複驗均由正常入口實玩。
2. **潮汐預報**：港口／研習第二分頁為固定短局，五站保留一般預報對戰。按住某回合預覽，放開套用，移出取消；滿潮後仍需親手施放。說明直接讀取實際潮向，退潮說聖盾與回復，漲潮說傷害。原觀潮台與預報面板統稱「潮汐預報」，入口按鈕同名；戰場常駐顯示第幾回合被反轉、潮向圖示及名稱，重載仍保留。
3. **茉恩的退潮考驗**：港口、五站 Boss、研習第三分頁。先結束整備，觀察敵方茉恩退潮留守，再依護盾與血量安排交換。立繪旁標「敵方 · 茉恩」，護航線標「茉恩護盾 → 騎士」，敵方騎士卡下標「聖盾擋 1 次」。真實治療命中顯示「+3 治療 · 4 → 7」，我方另標聖盾面數及「藍菱形＝嘲諷」；可出手說明補上迅捷狼。保留原有三姿勢與盾裂，不以卡牌位移宣稱人物動畫，也沒有擴大成通用 AI。

## 唯一五項驗收與原尺寸證據

以下手機原圖均為無頭 Chromium **390×844、DPR 1** 的真實 DOM 操作截圖，未注入戰局、拼接或縮放。路徑皆相對 repo，完整測試收據在 `docs/content/r7/acceptance.json`。

| R6 Muse 下一輪驗收 | 修正與截圖 |
|---|---|
| 1．反轉後方向、效果、回合一致 | `docs/content/r7/phone-forecast-flood-to-ebb-applied.png`：第 2 回合退潮，說明首詞「退潮時」，效果為聖盾及回復。`phone-forecast-ebb-to-flood-applied.png`：第 3 回合漲潮，說明首詞「漲潮時」，效果為敵軍 1／英雄 2 傷。均自動核對回合與方向，純規則測試另覆核實際反轉與存檔。 |
| 2．390×844 交換視窗無裁切 | `docs/content/r7/phone-exchange-preview.png` → `phone-exchange-cancelled.png` → `phone-exchange-confirmed.png`。四卡、完整血量預覽與兩按鈕同屏，文字範圍保有至少 8px 視口邊距；取消逐 UID 血量、盾、位置、潮能完全不變，確認後士兵退場、弓手 1 血、潮 6 與預覽相符。 |
| 3．茉恩陣營、護盾對象與治療明確 | `docs/content/r7/phone-moen-preparing.png` → `phone-moen-impact.png` → `phone-moen-guarding.png`。中格顯示真實 +3／4→7；留守一格可直接讀出敵方茉恩護住敵方騎士、擋 1 次。我方明示 0 面聖盾，藍菱形為嘲諷。`phone-moen-shield-impact.png`／`phone-moen-shield-after.png` 補同 UID 騎士破盾，仍 3 攻 4 血。 |
| 4．六題機制字可讀、第三題不誤導 | `docs/content/r7/phone-puzzle-fallen-playing.png`、`phone-puzzle-shield-playing.png`、`phone-puzzle-shelter-playing.png`、`phone-puzzle-taunt-playing.png`、`phone-puzzle-spell-playing.png`、`phone-puzzle-cross-playing.png`。六題逐一核對機制文字的實際字級不小於卡名、文字範圍完整落在視口；直式主要機制字 14px、卡名 12px。第三題改中性生命及本題不計；第四題交代預設傷。 |
| 5．預報與施放同一套用語、關閉後仍可知改哪回合 | `docs/content/r7/phone-forecast-closed-playing.png`：未開選單就可讀「第 2 回合已反轉 → 退潮護航」及既有盾圖示。`phone-forecast-third-round-closed.png` 為反方向對照。面板與入口均稱「潮汐預報」，兩處潮術名稱均為「漲潮破陣／退潮護航」。 |

精選集：**`docs/content/r7/review-set/`，固定 15 張原尺寸 PNG，每項各 5 張**。01–05 為第三／四題新標記與交換預覽、取消、確認；06–10 為按住預覽、雙向套用、關閉後戰場及第四回合自由潮向；11–15 為真實治療命中、留守、破盾後，以及拖延前後士兵消失。每項都有進行中畫面，動態採連續 2–3 格；六題完整盤面仍保留上表原圖路徑。`review-set-index.json` 記錄原圖與 SHA-256，精選是位元組副本。

R6 標「未見證據」的完整補圖另存本輪原圖目錄：六題各自 `phone-puzzle-<id>-failed.png`／`-retried.png`／`-completed.png`；`phone-puzzle-counts-verification.png` 顯示六道 6/6 與複驗 1/1 分列；交換取消及確認見上表；`phone-forecast-held.png` → `phone-forecast-drag-cancelled.png` 證明移出未消耗反轉，`phone-forecast-fourth.png` 顯示第四回合兩方向可用；`phone-moen-delay-before.png` → `phone-moen-delay-after.png` 顯示拖延後真正失去士兵。這些補件不全在 15 張精選內，沒有聲稱精選已涵蓋每一項補件。茉恩仍是固定手工腳本，沒有增加隨機重玩變化。

商店新增且保留舊圖：`docs/store/screenshots/content-r7-moen-1290x2796.png`、`content-r7-moen-2064x2752.png`，為對應視口／DPR 的實玩原圖。`docs/evidence/content-r7/` 另存三組前後對照、手機橫向及 iPad 圖；before 明確是 R6 歷史原圖副本，來源與雜湊見 `provenance.json`。

## 測試與保存

- VERIFIED：`npm test` 全綠，含既有卡牌、核心、平衡、美術與 R1–R6 規則，以及本輪 25 項規則檢查。
- VERIFIED：本輪瀏覽器 102 項，六題及兩項短局皆實際完成，取消／確認、失敗立即重試、獨立複驗、重載與匯出入均通過。另有 7 項離線補測：殘局、預報皆斷網通關並重載，兩種反轉圖示均從預快取載入；與主測試的茉恩斷網完成／重載合計覆蓋三項。
- VERIFIED：完整 `npm run test:e2e` 的 18 支全過，RWD 11 視口 × 3 頁共 33 組零違規；獨立 R6 瀏覽器 84 項及破盾演出 6 項全過。最後移除隱藏內容的五個 preload 後，另重跑 `npm test`、完整 R7 實玩與離線補測，全數通過；沒有聲稱最後又重跑一次整條 18 支鏈。命令、歷史失敗與各命令最後結果均保留在 `test-exits.json`。
- 本輪實玩測試另覆蓋手機橫向、iPad 直橫、矮桌機、商店兩種原生尺寸，檢查卡牌與主要控制至少 44px 且在視口內。
- 沒有刪除測試或放寬斷言；既有 E2E 的固定版本字串隨 PWA 一起升版。新增比較欄資料屬性使用 `data-forecast-round`，避免與原回合按鈕的 `data-round` 衝突。
- 初次本輪測試的複驗入口選擇錯用不存在的分頁，已改走正式「複驗」按鈕；過程失敗收據保留於 `docs/content/r7/diagnostics/` 與本機 `.audit-tmp`，最終 102 項為修正後完整實跑。不是以跳過斷言取得通過。
- 原有文件與未提交素材以入場快照保全；已核對 2508 個入場文件的 SHA-256；既有測試重產的歷史圖與收據均恢復，當次文字收據另存本輪，見 `preservation.json`。原有未追蹤檔不刪除，不納入本輪 commit。

本輪實際茉恩施法量測採桌機／手機各三跑、每跑 240 個 rAF 間隔，p95 三跑中位為 **桌機 16.8ms、手機 16.7ms**，均 ≤18ms。桌機其中一跑為 33.3ms，原始六跑全部保留在 `frame-times.json`，不將中位通過說成每跑都通過。這是共用機器並發載參考值，不是乾淨機況、實體裝置或 GPU 執行時間。

既有 Fast 3G／4× CPU gate 前兩組背景就緒中位為 **3051.1ms／3073.1ms**，均未達 3000ms；沒有放寬門檻。移除五個隱藏內容樣式的提早 preload，保留正式 stylesheet 與離線預快取後，最終三跑背景就緒中位 **2782.7ms**、互動 **7686.8ms**、frame p95 **16.8ms**，全數達原門檻。失敗原始 JSON 在 `diagnostics/ci-performance-initial.json` 與 `ci-performance-confirm-before-optimization.json`，最終為 `ci-performance-optimized.json`。最後的離線圖示 URL 修正與預載調整均已由補測及 R7 重跑覆核。

## 美術、文案與風險

新增美術 **0 張**。茉恩三姿勢、整盾／裂盾與潮向圖示沿用既有生成圖；本輪只改排版與狀態標籤，沒有呼叫產圖工具或新增占位圖。來源沿用 R6／R4／R79／R75 manifest，重用雜湊見 `docs/art/ASSET_MANIFEST_CONTENT_R7.json`。

文案 mode 2 修改摘要：原「滿潮時」會被誤認為潮向，改成依狀態產生「退潮時／漲潮時」，保留滿六格施放條件；原「觀潮台／預報」兩個名稱，統一「潮汐預報」；原「護航→」缺施法者與對象，改「茉恩護盾→騎士」並標敵方；原「三種隨從都能出手」漏狼，補齊四名；原 30 血假目標改「—／本題不計」；原一血無前因，補「開局已受傷」。數值、牌名與實際玩法未變更。

**Apple 4.3 風險：高。** 這一輪降低規則辨識與版面問題，三項決策仍具本作特色；整體仍採常見卡框與攻血形式，沒有新版全陣容盲測或 Apple 實際審查結果。MIT、免費、無廣告／內購、無帳號／第三方 SDK／線上依賴維持。

**BLOCKED**：實體手機與 iPad 觸控／效能需實體裝置；真人／親子試玩需受測者；乾淨機況效能需獨占時段，本輪共用機並發載僅供參考；Muse 8 分以上需審查員實際複審，不能自行宣稱達標。正式隨從攻擊／受傷／死亡姿勢幀仍缺，保留可替換 CardPosePlayer；茉恩僅有既有三張施法姿勢，沒有完整走路、受傷或死亡動畫。
