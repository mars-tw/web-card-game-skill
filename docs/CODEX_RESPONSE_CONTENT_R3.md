# 裂潮卡牌｜新內容第 3 輪

版本 **0.16.0**；PWA **card-battle-content-r3-v1**。依 `docs/content/CONTENT_REVIEW_R2_MUSE.md` 五項驗收執行。僅本機 main；沒有 push、部署、商店操作或派工。狀態及原始測試退出碼以 `docs/content/r3/test-exits.json`、`acceptance.json`、`verification.json` 為準。

## 三項內容與玩法

1. **六道潮汐殘局**：港口同名按鈕、五站同名按鈕或研習第一分頁。首題直接說「點士兵打弓箭手，再掀浪擊敗英雄」。六題保留原本不同交換／施法決策，錯序後說明缺了哪一步，附正確目標卡圖並可立即重試；失敗不增加進度。
2. **潮汐預報**：港口同名入口進研習短局；五站同名入口進一般預報對戰。首次第 2 回合以航燈金框、脈衝與「點這裡改潮向」引導；按住可見準備套用方向，放開才真正反轉。過去回合有鎖頭與可點的原因；一次反轉、前三回合指定潮向、第四回合自由選規則保留。
3. **茉恩的退潮考驗**：港口、五站、研習同名入口；五站入口記錄正式首領通過。先結束整備，茉恩退潮護住騎士，再用士兵剝盾、弓手削血、己方騎士收尾，掀浪後反攻。中段加入既有月光旗艦畫作與真實戰況；完整貝盾／裂盾畫作及銀實線／銅斷線外框跟隨實際 `shieldBreak`，重載也保留。四張玩家卡完整置於同一列，沒有半截卡。

## 唯一五項驗收及原尺寸證據

以下檔案皆位於 `docs/content/r3/`，`phone-*.png` 均為 **390×844 原尺寸 PNG**，未縮成縮圖或拼接。

**1．六題證據包與動作入口：VERIFIED。** 每題都由正常 DOM 操作造成失敗、重試、再完成，沒有注入勝利或戰場。

| 題目 | 遊玩中 | 錯序失敗 | 完成 |
|---|---|---|---|
| 一席換滿潮 | `phone-puzzle-fallen-playing.png` | `phone-puzzle-fallen-failed.png` | `phone-puzzle-fallen-completed.png` |
| 先剝貝盾 | `phone-puzzle-shield-playing.png` | `phone-puzzle-shield-failed.png` | `phone-puzzle-shield-completed.png` |
| 退浪留弓 | `phone-puzzle-shelter-playing.png` | `phone-puzzle-shelter-failed.png` | `phone-puzzle-shelter-completed.png` |
| 浪後的缺口 | `phone-puzzle-taunt-playing.png` | `phone-puzzle-taunt-failed.png` | `phone-puzzle-taunt-completed.png` |
| 留一滴給海 | `phone-puzzle-spell-playing.png` | `phone-puzzle-spell-failed.png` | `phone-puzzle-spell-completed.png` |
| 兩線同退 | `phone-puzzle-cross-playing.png` | `phone-puzzle-cross-failed.png` | `phone-puzzle-cross-completed.png` |

各題另有同前綴 `-retry.png`，六次都實際按「立即重試」。入口 `phone-puzzles-entry.png`。完成圖的卡圖集合依序為士兵＋弓手、士兵＋守衛、弓手＋狼、士兵＋狼、火焰箭＋騎士、士兵＋弓手＋騎士＋獅鷲；排序後兩兩不重複。失敗圖標「重試目標」，不把正解回顧冒稱本次已達成的結果。

**2．茉恩中段、破盾與卡列：VERIFIED。** `phone-moen-shield-before.png`／`phone-moen-shield-after.png` 可不讀上方指令辨認完整盾與裂盾，對應真實護盾消失且騎士血量不變。中段同時從留守轉為反攻窗口。`phone-moen-before-r2.png` 保留前輪原尺寸對照；`phone-moen-preparing.png` 顯示四卡整備，`phone-moen-completed.png` 為真操作完成。`phone-moen-delay-before.png`／`after.png` 顯示拖延後騎士實際出擊、士兵退場。

浪牆圖序：`phone-moen-wave-1-anticipation.png` → `phone-moen-wave-2-impact.png` → `phone-moen-wave-3-cleared.png`。第一格尚未治療／加盾，第二格結算為 7 血與護盾，第三格浪牆退去；`acceptance.json` 的原始 `timeline` 記錄觀察時點。程式的命中計時器 360ms、退浪計時器 780ms；瀏覽器觀察含排程與畫面更新延遲，不以截圖宣稱毫秒級精確計時。頭像與中段取景均直接出現在這組新圖中。

**3．可見的預報第一步：VERIFIED。** 三張連續截圖為 `phone-forecast-teaching-1-before.png`、`phone-forecast-teaching-2-pressed.png`、`phone-forecast-teaching-3-changed.png`。使用真實 pointer down／up，按下時不先改狀態，放開才套用。`phone-forecast-past-locked.png` 有鎖頭及不能改寫原因；`phone-forecast-wrong-direction.png` 顯示不可選方向，核心規則亦驗證零消耗；`phone-forecast-reloaded.png` 為用過反轉後重載，`phone-forecast-fourth-choices.png` 為第四回合自由二選一，`phone-forecast-completed.png` 為通關。

**4．文案與彈窗裁切：VERIFIED（390×844 本機）。** 六題完成／失敗全部檢查標題、內文、按鈕在彈窗內且無內部溢出；預報及茉恩完成亦通過。同上所有結果圖可逐張查驗。預報結語改成「你改了未來的潮向，也保住下一回合能出擊的隨從。」`phone-save-corrupt-rejected.png` 顯示置中完整錯誤提示；錯誤碼前後每個 localStorage key 均未變更。不是以接受損壞碼換取測試通過。

**5．三入口名稱與進度語意：VERIFIED。** `phone-entries-harbor.png`、`phone-entries-voyage.png`、`phone-entries-study.png`／`phone-puzzles-entry.png` 中三項名稱逐字一致。入口頁原本會丟掉指定分頁，已改為只轉交白名單中的預報／茉恩參數；`phone-entry-forecast-selected.png`、`phone-entry-moen-selected.png` 是由港口連結實際進入對應分頁。`phone-progress-harbor-completed.png` 顯示六題、反轉次數與正式茉恩通過；`phone-progress-ledger.png` 在 0 勝 0 敗旁說明「研習通過只記解題進度，不計對戰勝敗；0 勝場也能顯示已通過。」固定試用卡、收藏與金幣規則不變。

## 測試、離線與交付

測試全部在背景／無頭執行，單一伺服器、瀏覽器依序關閉。新增規則測試與瀏覽器真操作測試接進原 `npm test`／`npm run test:e2e`，沒有刪除既有測試或放寬斷言。原有 PWA 精確比對只同步新版 revision，R2 港口名稱斷言同步同名入口；R67 加入可指定證據輸出路徑，運算及判斷不變，以免覆寫進場已修改的證據。

| 驗證 | 結果與原始紀錄 |
|---|---|
| `npm test` | VERIFIED，exit 0；既有測試全綠，新增規則 23 PASS。`static-final.txt`；最後入口修正再跑 `static-confirmed.txt`。 |
| `npm run test:e2e` | VERIFIED，exit 0；完整既有鏈及 R3 93 PASS，`e2e-final.txt`。入口參數修正後再跑 `npm run test:content:r3`：規則 **23 PASS**、瀏覽器 **95 PASS**，exit 0，見 `content-confirmed.txt`／`final-validation.json`。 |
| `npm run test:rwd` | VERIFIED，十一視口×三頁 33／33 零違規，`rwd-final.txt`。 |
| CI 效能三跑 | VERIFIED，首畫面中位 **2732.1ms**、可互動 **7679.3ms**、p95 **16.8ms**，原斷言全通過。`ci-performance-final.txt`／`legacy-receipts/docs/evidence/R67/after/performance.json`。 |
| 桌機／手機內容效能 | VERIFIED，各三跑×240 個 rAF 間隔，中位 p95 均 **16.8ms**，`frame-times.json`。屬並發載參考。 |
| 版本、語法、秘密與圖片尺寸／雜湊 | VERIFIED，66 份 JS 語法通過；1748 份文字檔秘密掃描 **0 命中**；執行期舊版 **0 命中**，所有原尺寸及雜湊通過，見 `verification.json`。 |

初次資源守門未通過的原因是新護盾動態字串被靜態掃描拆成 `.webp`；已改為兩條明確路徑，原斷言通過。失敗紀錄保留 `static-initial.txt`。全鏈結束後補上兩個港口連結的真實分頁驗證，未放寬原有斷言。

`phone-offline-moen.png` 與 `phone-offline-completed.png`：Chromium 真正關閉網路，從公開路徑進入，載入新盾圖並以真操作完成茉恩；所有新增執行期素材已納入 SW。匯出、清空網站儲存、匯入後逐值比對六題與首領進度，並測損壞碼不改原存檔。這些是本機瀏覽器證據。

商店新增 `docs/store/screenshots/content-r3-moen-1290x2796.png`、`content-r3-moen-2064x2752.png`，分別由 430×932／DPR 3 與 1032×1376／DPR 2 直接截取，未刪除舊圖。另留手機橫向、iPad 直橫與矮桌機的 `layout-moen-*.png`。歷史受管證據在測試前備份；910 份原檔全部核對，其中 172 份測試更新檔已另歸檔並還原原位元組。JSON／文字憑據留在 `legacy-receipts/`，重複舊圖僅歸檔於本機 `.audit-tmp/content-r3-generated/`，核對見 `preservation.json`。進場已修改的 R67 gate 未由測試覆寫。

採用 **1 張新生成原圖**、裁成 **2 張執行期 WebP**。實際工具 **image_gen.imagegen**；未取得可核實 model slug，記 null。原圖有真透明像素，前景 alpha 上限 254；後製僅圖集裁切、縮放與壓縮。額外一次未採用產圖也如實記在 `docs/art/PROMPTS_CONTENT_R3.json`，雜湊／尺寸在 `ASSET_MANIFEST_CONTENT_R3.json`，授權在 `CREDITS.md`。茉恩中段重用第二輪原畫，不把重用算新美術。

**Apple 4.3 風險：高。** 潮汐交換、公開預報與手工首領已在正常路徑可玩，五項證據補齊；仍缺新版全陣容盲測與 Apple 接受證據。本輪不自行代替 Muse 評分。

## 未完成與風險

- **BLOCKED**：Muse 獨立複審及 8 分以上結果尚未發生，需要審查員讀取本輪完整原尺寸證據。
- **BLOCKED**：實體 iPhone／Android 飛航測試、實體 iPad、Safari／WebKit、簽章原生包。需要持有裝置者實際安裝、斷網、重開、匯出入與原尺寸紀錄；本機 Chromium 不替代這些項目。
- **BLOCKED**：真人親子試玩、五位新玩家理解測試與五秒辨盾，需要實際參與者及計時紀錄。沒有捏造人數或理解率。
- **BLOCKED**：正式人物 attack／hurt／death 姿勢幀缺件，既有 `pose-player.js` 可替換管線保留。貝盾兩態、卡片框與浪牆是狀態／技能回饋，沒有以整卡位移或搖晃冒稱角色動畫完成。
- 效能量測為本機並發載參考，不宣稱乾淨機況或實體裝置效能。

## 繁中文案 mode 2

| 原句 | 原因 | 改成什麼 |
|---|---|---|
| 本回合蓄滿潮能，以漲潮擊敗英雄。 | 首題術語多，沒有先說點哪裡 | 點士兵打弓箭手，再掀浪擊敗英雄。 |
| 這次未達成目標。＋共用提示 | 無法知道錯在哪一步 | 各題指出未剝盾、未保弓手、提早結束或交換對象錯誤。 |
| 你安排了潮向，也為下一回合留下場面。 | 語意抽象；前輪審查另指出「留下面面」 | 你改了未來的潮向，也保住下一回合能出擊的隨從。 |
| 匯入失敗：原始解析例外 | 原始錯誤不利理解且曾被頂部裁切 | 匯入失敗：存檔碼不完整或格式有誤，原存檔未變更。 |
| 六道殘局／預報自由對戰／首領：茉恩退潮 | 同內容多名容易混淆 | 六道潮汐殘局／潮汐預報／茉恩的退潮考驗。 |

牌名、血量、六格、一次反轉及第四回合規則保留。沒有新增廣告、內購、帳號、線上功能、外部連結或第三方 SDK。
