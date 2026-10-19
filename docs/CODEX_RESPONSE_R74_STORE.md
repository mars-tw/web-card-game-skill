# 裂潮卡牌 R74 上架可能性優化報告

2026-10-15。版本 `0.7.0`／PWA `card-battle-r74-v1`，進場 commit `29d996d7aa3d252ecdffaff0403f69eeeedbca21`。只修改本 repo，全部背景／無頭執行；未派工、push、部署、操作商店、發訊息或讀取憑證目錄。

## 上架風險

Apple 4.3：高。已知退件是帳號整批同質化及生成服務判定。R74 把陣亡蓄潮與漲退潮做成正式玩法，提供開頭就能玩的戰術短局，但沒有真人 beta、新原生包、實機證據或已接受的動作／音樂。文件、改名、零整檔共用命中與自動測試都不能視為 Apple 認可重大改變。

Google：本機功能及資料行為的證據較完整；仍缺新版 AAB、實機品質及當前商店資料安全讀回。本輪不保證任何平台通過。舊發行紀錄把裂潮卡牌列為暫不再送 Apple；本輪是準備優化，沒有自動改變送審決策。

## 做了什麼

| 工作 | 狀態與具體結果 |
|---|---|
| 開頭招牌玩法 | VERIFIED：正式根入口改為海綠「潮汐領航」港口；試航從四格開始，玩家兩次交換陣亡蓄到六格，以正式漲潮擊敗殘血防線。固定短局明示給所有玩家，不灌入收藏、戰績或金幣，結算可實際接五站航程 |
| 潮向決策 | VERIFIED：一般對戰新增退潮護航，用同樣六格給友軍聖盾、英雄最多回復三點。觀潮台顯示雙方充能方式與當前預覽，未滿或非法狀態不可消耗，快捷裂潮仍為原漲潮。AI 維持原本漲潮策略，退潮長局平衡仍需真人驗證 |
| 離線與恢復 | VERIFIED：新增安全玩家回合檢查點，儲存返回港口後可繼續；敵方行動中關閉回到上一個安全點。保留衍生物、拒絕壞／超大／不安全存檔，還原圖片只用卡池來源。修正 Service Worker query 回退及未 await Promise 的短路，真正斷網可完成整場試航 |
| 身分與文字 | VERIFIED：新增專屬航海儀表；移除跨遊戲宣傳連結與系列口號；音效與靜音提示改繁中。139 個本作檔案與 13 款作品做限定範圍 SHA-256 比對，沒有整檔相同命中；共享瀏覽器 API、系統字型、製作架構及 Capacitor 照實揭露 |
| 商店草稿 | PREPARED：逐款差異、官方同類參照、名稱／副標／說明／關鍵字、英文三分鐘審查路徑與九題事實邊界、隱私報告；沒有上傳 |
| 截圖 | VERIFIED：兩種指定解析度各四張，共八張。全部從正式根入口與玩家試航操作擷取，沒有 __test、capture pose、血線注入或圖像後製 |
| 動作與音樂 | BLOCKED：沒有正式姿勢幀、骨架、hurt／death 或可授權配樂。新增 pose-player 可替換三段幀播放器及攻擊 adapter，只有合法 anticipation／impact／recovery 幀註冊才播放，命中只回呼一次；低效能／減少動態下也保留此逐幀路徑。沒有新幀時原卡片位移只算牌桌 UI，BGM_URL=null |

八大面向：美術／人物／地圖／角色外觀沿用正式 R67 卡圖與場景及原視覺閘；按鈕與選單補短橫向觀潮台雙欄、窄手機版、焦點圈與返回；技能補雙潮向與預覽；人物動作仍為缺件，不將卡片閃光或位移列為完成。沒有新增 raster 美術；`ASSET_GAPS.json` 的 generationModelSlug=null，本輪未取得可指定並核實為 gpt-image-2 的生成路徑，也未派出生成工作。

## 驗證

最終原始輸出在 `docs/evidence/r74-store/`。新測試接入原 CI 使用的 `npm test`／`npm run test:e2e`；既有測試未刪除或放寬，只把 PWA revision 的原預期同步到 R74。靜態／瀏覽器測試若寫入歷史 R67／R73 證據，將當次內容封存後還原進場資料。

| 指令／證據 | 結果 |
|---|---|
| `npm test`／`npm-test-final.log` | VERIFIED：既有卡牌、核心 154、品質、平衡、R67 素材閘與 R73 航程 48 全綠；新增 R74 規則／存檔／逐幀合同 29/29 |
| `npm run test:e2e`／`e2e-complete.log` | VERIFIED：既有對戰、控制、R67 browser、R72、R73 全綠；R74 正式審查路徑及退潮 UI 整合回歸全綠。最終通過數以 log 與 review-path.json 為準 |
| `test-r74-review.js`／`review-path.json` | VERIFIED：310/310，9 種尺寸，從冷入口、導引、正式交換、蓄潮勝利、銜接航程、觀潮暫停、返回、重載恢復與真正離線勝利。沒有測試狀態注入。自動操作在 180 秒內可達，不是人類操作時間或留存數據 |
| `test-r74-ebb.js`／`ebb-ui.log` | VERIFIED：9 項，退潮回復、聖盾、單次消耗、敵方不受傷、再施放禁用。此支明示使用確定性測試場面，不用於商店圖 |
| `npm run test:rwd`／`rwd-final.log` | VERIFIED：既有 11 視口 × shell／battle／pack＝33/33 零違規；新增路徑另含 320×568、375×667、430×932、844×390、1024×1366、1366×1024、1032×1376、1376×1032、1366×600。可見互動元件實際 hit-test 且至少 44px |
| 原效能腳本三跑／`performance-final.json` | EXECUTED：原數值斷言通過；Fast 3G＋4× CPU 可互動三跑中位 4975ms，視覺就緒 1383.1ms，桌機 frame 取樣 p95 16.8ms。**並發載量測，僅供參考**；沒有獨立手機三跑及乾淨機況，不宣稱出貨效能閘 VERIFIED |
| `verify-r74-release.py`／`verification.json` | VERIFIED：全部 JS 語法、舊 runtime revision／受管版本、8 張 PNG 實際像素及 SHA-256；秘密掃描零命中。保留本輪 runtime hash 與唯讀原生來源 hash |

原 capture 測試伺服器對 `/` 回 404，導致 SW `./` precache 失敗，已修正為正式 index。其他測試過程揭露並修正：窄／短橫向面板裁切、牌庫尚無 uid 時檢查點被誤判、離線 query 回退、試航結算的一般領獎控制未隱藏。早期失敗 log 保留作診斷，最終結果以 `*-final.log`／`e2e-complete.log` 為準。

## 證據與草稿路徑

- `docs/OPTIM_PLAN_R74.md`：逐項驗收計畫。
- `docs/store/DIFFERENTIATION.md`、`SHARED_ASSETS_AUDIT.md`：所有同帳號 App 比較、官方同類參考、共享檔案及來源界線。
- `docs/store/STORE_METADATA_ZH-TW.md`、`APP_REVIEW_NOTES_EN.md`、`PRIVACY_POLICY_AUDIT.md`：商店及政策草稿。
- `docs/store/SCREENSHOTS.md`、`screenshots/`：兩種指定解析度的真實港口、滿潮局面、觀潮台及試航結算。
- `docs/evidence/r74-store/before/`、`after/`：390×844、844×390、1366×600 一般對戰與手牌比較圖；教學略過以便比較，起手牌為正常隨機，不是同一顆種子的數值對照。
- `docs/evidence/r74-store/legacy-r67/`：當次 R67 gate 與三視口圖片；JSON 原本指向 R67/after 的路徑，對應此封存資料夾的 after 同名檔案。`preservation.json` 記錄歷史證據還原與進場檔雜湊。
- `docs/store/ASSET_GAPS.json`：動作／配樂缺件與可替換介面。測試用幀回呼驗證不代表正式素材存在。

## 未完成與缺件

1. BLOCKED：新的簽章 IPA／AAB、原生版本／build bump、最終素材包 hash、裝置與商店宣告讀回。native-kit 唯讀，所見仍是 native 1.0.0/build 1 舊來源，不能把本輪網頁 0.7.0 說成原生已更新。
2. BLOCKED：實機 iPhone／Android、Safari／WebKit、原生 iPad 13 吋直橫向、背景／程序終止恢復，以及乾淨機況桌機／手機出貨效能。現有生命週期測試只用 Chromium freeze／active，不等於作業系統終止測試。
3. PREPARED：真人 beta、可查證回饋與長局平衡。試航只有一題，退潮保護多名隨從的強度尚無真人勝率資料。沒有捏造 TestFlight 測試者或回饋。
4. BLOCKED：正式人物姿勢、hurt／death 回收配套與音樂。沒有程序化方塊或整張圖晃動冒充新素材；詳見缺件合同。
5. PREPARED：新版正式隱私政策補上檢查點／試航本機紀錄，及 Google 資料安全當前版本再核對。所見 Google 畫面只證明歷史草稿已儲存，沒有證明送審／發布。
6. PREPARED：新增檢查點與試航完成紀錄目前只存本機，未納入舊版完整存檔碼的匯出／匯入；既有收藏、牌組、航程匯出流程不變。港口與 README 已說明移除／清除資料的風險。
7. BLOCKED：4.2.6 內容提供者／素材權利的發行者佐證、最終二進位的共用碼分析。來源零整檔重複不等於模板判定解除。本輪未做外部獨立覆核，遵守禁止派工的工作單。

原有 `docs/audit_openclose/`、`docs/playtest/`、`scripts/audit-oc-r1.js` 與進場 `docs/evidence/R67/gates/visual-assets.json` 狀態均保留，不列入本輪 commit。
