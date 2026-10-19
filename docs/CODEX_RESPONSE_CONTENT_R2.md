# 裂潮卡牌｜新內容第二輪

工作單 2026-10-18，執行 2026-10-19，分支 `main`，基底 `dc89a98`，版本 **0.15.0**，PWA **card-battle-content-r2-v1**。

VERIFIED：本輪程式、美術與自動驗證已在本機／無頭環境完成。BLOCKED：實機、新玩家樣本與 Muse 複評仍待外部驗收。不派工、不開可見視窗、不推送、不部署、不操作商店、不發訊息；沒有讀取秘密目錄，也沒有加入廣告、付費、外部連結、帳號、第三方 SDK 或線上功能。

## 三項內容與入口

| 內容 | 做了什麼、怎麼玩 | 正常入口 |
|---|---|---|
| 六道潮汐殘局 | 固定真卡盤面與原有解法保留。完成畫面用本題交換的卡圖、陣亡／存活／聖盾／一血收割標記呈現，六題有六套組合；完成文字具體說明你做了哪次交換。錯序明示失敗，可立即重試。 | 港口「潮汐研習」→六道殘局；對戰設定也可開研習。 |
| 潮汐預報 | 第一次打開即引導點未來第 2 回合，旁邊即時對照原本的漲潮傷害與反轉後的退潮護盾。這是真正使用本局唯一反轉；可重玩。規則拆成「改潮向」與「滿六格親手施放」，不再混寫。現在與未來可改、過去不可改；第四回合恢復自由選擇。 | 港口「自由對戰／五站航程」→「預報自由對戰」；研習中也能玩固定預報短局。 |
| 茉恩的退潮考驗 | 正式航程面板加入可重玩首領，沿用手工腳本。茉恩先回血到 7、護住騎士並留守；拖到下一個敵回合才出擊。上方只留一個隨狀態更新的指令：士兵剝盾→弓手削血→騎士收尾。修正本人頭像取景，浪牆在 780ms 結束，傷害／消耗仍在 360ms 命中。 | 港口「自由對戰／五站航程」→「首領：茉恩退潮」。通過後港口顯示「茉恩首領已通過」，可以再挑戰。 |

研習進度、累積反轉次數、正式茉恩首領狀態與完整安全玩家回合檢查點，現在一起進入卡包頁原有「匯出存檔／匯入存檔」。匯入仍先驗證，再寫 staging、備份及一次套用；損壞檢查點在任何寫入之前拒絕。新玩家合法的空白未組牌狀態可匯回，有卡但不合法的牌組仍拒絕；舊存檔碼不帶新欄位時保留裝置上的新進度。

## Muse 五項驗收與原尺寸證據

下列 `phone-*.png` 均在 `docs/content/r2/`，以 **390×844、DPR 1** 的原尺寸無頭 Chromium 直接截取，沒有縮放或合成。這是手機直式模擬，不能當實機證明。

1. **六題辨識度：VERIFIED（本機），真人盲看 BLOCKED。** 六題實際遊玩與結算如下。結算沒有共用一張研習航圖；至少火焰箭單體預傷、弓手保留、四張雙線交換在不看標題時仍有不同構圖。未找新玩家做隨機三題辨認，不宣稱真人驗收通過。

| 題目 | 解題中 | 完成 |
|---|---|---|
| 一席換滿潮 | `phone-puzzle-fallen-playing.png` | `phone-puzzle-fallen-completed.png` |
| 先剝貝盾 | `phone-puzzle-shield-playing.png` | `phone-puzzle-shield-completed.png` |
| 退浪留弓 | `phone-puzzle-shelter-playing.png` | `phone-puzzle-shelter-completed.png` |
| 浪後的缺口 | `phone-puzzle-taunt-playing.png` | `phone-puzzle-taunt-completed.png` |
| 留一滴給海 | `phone-puzzle-spell-playing.png` | `phone-puzzle-spell-completed.png` |
| 兩線同退 | `phone-puzzle-cross-playing.png` | `phone-puzzle-cross-completed.png` |

錯序失敗／立即重試：`phone-puzzle-shelter-failed.png`、`phone-puzzle-shelter-retry.png`。選題入口：`phone-puzzles-entry.png`。

2. **茉恩可讀性：VERIFIED（本機），實機五秒辨認 BLOCKED。** `phone-moen-shield-1.png`、`phone-moen-shield-2.png`、`phone-moen-shield-3.png` 依序是留盾、士兵剝盾、弓手削到 2 血。上方指令完整顯示，底部日誌與回合橫幅不再與指令重疊。`phone-moen-wave-1.png`～`3.png` 證明蓄勢、命中及退去，實際時序另存 `moen-wave-timing.json`。`phone-moen-delay-before.png`／`after.png` 證明拖延後騎士確實出擊；`phone-moen-completed.png` 是真操作勝利。

3. **互動教學：VERIFIED（本機），五人 30 秒測試 BLOCKED。** `phone-forecast-tutorial-before.png`／`after.png` 顯示親手改未來回合與效果對照；`phone-forecast-reloaded-once.png` 顯示重載後不能再用。`phone-forecast-past-locked-future-open.png` 顯示已過回合停用、未來仍可改；`phone-forecast-wrong-direction.png` 顯示錯向不可選且零消耗。`phone-forecast-fourth-free.png`／`fourth-choices.png` 顯示第四回合自由雙向；`phone-forecast-completed.png` 是完成結果。未招募五位新玩家，不宣稱 4/5 人已理解。

4. **走出研習室：VERIFIED。** `phone-harbor-before.png` → `phone-voyage-entry.png` → `phone-free-forecast-reversed.png` 是港口一般入口的實際反轉，測試要求三分鐘內且未開研習選題。`phone-voyage-moen-entry.png` 是正式首領入口後的盤面；真實擊敗再回港口，`phone-harbor-after.png` 顯示對應進度。`phone-ledger-before.png`／`after.png` 搭配原始狀態斷言，確認研習沒有增加勝敗、金幣或試用牌出牌統計。

5. **存檔閉環：VERIFIED（本機），iPhone／Android 飛航實測 BLOCKED。** 真正按匯出，清空 localStorage，再按匯入，逐欄比對六題、反轉次數、茉恩狀態與完整檢查點，原值／匯回值在 `save-roundtrip.json`。`phone-save-import-resumed.png` 證明使用過的反轉仍鎖定；`phone-save-corrupt-rejected.png` 與自動斷言證明損壞碼沒有改寫任何存檔。`phone-offline-completed.png` 是斷網通關；`phone-offline-checkpoint-resumed.png` 是關閉持久化 Chromium 程序後，使用同一份本機資料在斷網狀態重開並續玩。這不替代實體裝置測試。

## 驗證與交付

最終結果以 `docs/content/r2/` 的原始紀錄及 `verification.json` 為準。所有新內容測試使用正式入口與真 DOM 操作，`__test` 只讀狀態，沒有注入勝利或戰場。既有測試保留原斷言，只有 PWA 精確版本／guard 名稱同步新版本。

| 驗證 | 結果 | 紀錄 |
|---|---|---|
| `npm test` | VERIFIED，exit 0；新規則／遷移 21 PASS，原有測試全綠 | `static-final.txt` |
| `npm run test:e2e` 完整既有與新增鏈 | VERIFIED，exit 0 | `e2e-final.txt`、`full-test-exits.json` |
| 最後排版修改後的內容回歸 | VERIFIED，R1 97 PASS、R2 **114 PASS**，包含橫向真操作勝利 | `content-r1-final.txt`、`content-r2-final.txt`、`content-test-exits.json` |
| `npm run test:rwd` | VERIFIED，十一視口×三頁 **33/33** 零違規 | `rwd-final.txt` |
| 原 CI 與內容效能 | VERIFIED，原門檻全通過；p95 16.7／16.8ms | `ci-performance-final.json`、`frame-times.json` |
| 語法／秘密／版本／PNG 尺寸及來源雜湊 | VERIFIED；63 份 JS、秘密零命中、執行期舊版本零命中 | `release-final.txt`、`verification.json` |

完整鏈通過後的最後排版差異，另外由兩支內容瀏覽器測試覆蓋。商店與手機直式圖也由最後一輪重新產出。測試生成的歷史受管證據另存本機副本，再依進場快照還原原始位元組；包含進場已修改的 R67 gate。核對清單在 `preservation.json`，原有未追蹤文件不刪除、不提交。

原尺寸檢視另抓出短橫向與 1366×600 的卡牌下緣裁切，已改為左右對陣：英雄資訊各在己方卡列上方，卡名與攻血完整顯示，場上較多卡時隨數量縮小並保留至少 44px；極短寬度可橫滑卡列。新增整張卡都在場區內、生命列在操作列上方的斷言，以及橫向茉恩真操作通關。這些斷言沒有取代舊控制測試。

Fast 3G＋四倍 CPU 的初次首畫面中位數為 3088.5ms，超過既有 3000ms 門檻；將兩份內容樣式加入原有的關鍵樣式預載後，重測為 **2705.9ms**，可互動 **7378.5ms**，既有三項斷言全通過。初次失敗保留在 `ci-performance-initial.json`／`.txt`，通過結果在 `ci-performance-final.json`／`.txt`，沒有改動時間門檻或提早偽造就緒標記。CI 的 rAF p95 **16.7ms**；內容桌機與手機各三跑、每跑 240 個間隔，中位 p95 均 **16.8ms**，見 `frame-times.json`。以上均屬並發載本機參考。

商店新增兩張 PNG，既有圖保留：`docs/store/screenshots/content-r2-moen-1290x2796.png`、`content-r2-moen-2064x2752.png`。分別由 430×932／DPR 3 與 1032×1376／DPR 2 直接截取。另有手機橫向、iPad 直橫、矮桌機的 `layout-moen-*.png`，控制均需可見、命中自身且至少 44px。

新增 **1 張生成原圖**及 1 張執行期 WebP，實際工具 **image_gen.imagegen**，沒有可核實模型 slug，記 null。原圖 1536×1024、WebP 960×640；只做尺寸與壓縮。完整提示詞、角色參考、工具回傳與 SHA-256 在 `PROMPTS_CONTENT_R2.json`／`ASSET_MANIFEST_CONTENT_R2.json`，沿用原風格前綴、色盤與授權，`CREDITS.md` 已追加。

Apple 4.3 風險：**高**。預報與首領已進正常流程，六題交換的視覺辨識度也已改善；仍沒有全陣容新版真人盲測或 Apple 接受證據，不能宣稱風險已解除。

## 未完成與缺件

- BLOCKED：實體 iPhone／Android 各一台的飛航模式全流程、實體 iPad、Safari／WebKit 及簽章原生包。需要持有裝置者完成下載、飛航通關、關閉重開與存檔碼還原，留下原尺寸畫面。
- BLOCKED：五位未讀說明的新玩家測試、隨機三題不看標題辨識、茉恩五秒辨盾、真人親子試玩。需要實際樣本及計時紀錄，不能用自動測試代替人數。
- BLOCKED：Muse 獨立複審與 8 分以上評分尚未發生，本輪不自行打分。
- BLOCKED：正式角色 attack／hurt／death 姿勢幀仍缺，保留既有 `pose-player.js` 可替換管線；沒有把整張紙牌位移或浪潮 VFX 冒稱人物動畫完成。
- 本機效能屬並發載參考，不能冒稱乾淨機況或實機效能。

## 繁中文案 mode 2

| 原句 | 原因 | 改成什麼 |
|---|---|---|
| 先剝盾，再交換。 | 沒說下一步點哪張牌 | 先點見習士兵，再點有聖盾的騎士。 |
| 滿六格才可施放；預報不會自動消耗潮能。 | 改潮向與施放混在同段 | 點回合改潮向，全局只有一次；滿六格後，到觀潮台親手施放。 |
| 陣亡不是白白損失：最後一格潮能能換來斬殺。 | 抽象結語無法看出玩家做了哪步 | 你用士兵換弓手，陣亡補上第六格潮能，再以漲潮斬殺。 |

牌名、數值、三回合／一次反轉與四回合自由的規則均保留，沒有新增未驗證的真人或實機結論。
