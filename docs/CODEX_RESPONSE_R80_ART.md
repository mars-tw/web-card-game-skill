# 裂潮卡牌 R80｜美術第六輪

2026-10-18，基底 `609f215`／`main`，版本 **0.13.0**，PWA **card-battle-r80-v1**。只修改本repo，依RESCORE5第四節五項執行，對照RESCORE4未完項。沒有新玩法或新畫面；本機無頭，沒有派工、push、部署、商店操作、對外訊息或讀取秘密目錄。

進場獨立分數 **7.9／10**。本線完成不等於新的獨立8分複評，分數仍待Muse重審。

## 五項唯一驗收與原尺寸證據

| 項目 | 改動與改後原尺寸路徑 |
|---|---|
| 1．拆同名卡複製 | 先畫士兵／弓手正側背與配件設定表，再產紅頭帶士兵、象牙兜帽弓手；UID綁定外觀，保留一亮一待命。`docs/store/screenshots/tide-before-1290x2796.png`、`docs/store/screenshots/tide-before-2064x2752.png`。去字診斷在 `docs/evidence/r80-art/same-name-no-labels-1290x2796.png`、`same-name-no-labels-2064x2752.png`，不是商店合成圖。 |
| 2．唯一浪向 | 自水線圖示列發射短尾單鉤浪牆，明確向敵陣推進；友軍只有防護漣漪，施放中隱去待命與虛線。浪、字標、旗紋使用同一浪母形參考。`docs/store/screenshots/trial-1290x2796.png`、`docs/store/screenshots/trial-2064x2752.png`；母形對照 `harbor-*`／`victory-*`。 |
| 3．全場預覽 | 左右弓手各貼身−1、致死者破框／退場輪廓、敵英雄頭像旁−2；取消與切換退潮立即清除。`docs/store/screenshots/tide-chart-1290x2796.png`、`docs/store/screenshots/tide-chart-2064x2752.png`。 |
| 4．消除遮擋與換位 | 回合短橫幅移到兩列間水線空區，攻血列不被遮住；退場槽位殘影至少保留完整下一回合，存活弓手保持UID／原槽位／x座標與兜帽。`docs/store/screenshots/tide-after-1290x2796.png`、`docs/store/screenshots/tide-after-2064x2752.png`、`docs/store/screenshots/tide-next-turn-1290x2796.png`、`docs/store/screenshots/tide-next-turn-2064x2752.png`。 |
| 5．連續性總校對 | 同場前／中／後／下一回合四格，法力、潮能、生命、卡血、UID、位置與濕痕收據在 `docs/art/compare/r80/after/capture.json`。兩種尺寸的 `tide-before-*` → `trial-*` → `tide-after-*` → `tide-next-turn-*` 均為原生倍率PNG。試航提示與可見預覽明示「只耗潮能，不耗法力」，不改任何標準卡攻血或Core規則。敵卡與空位下緣有實際接觸水痕。 |

非致死四格為**明示QA準備場景**，不宣稱自然首局：標準卡、一名先前受傷弓手，下一回合抽標準六費哈爾登英雄卡但五法力不能出牌，既有AI仍遵循士兵嘲諷完成真實交換。只有準備階段設定場景，施放前開始不再注入狀態。下一回合弓手與士兵在交戰中退場，雙方各按原規則回合／陣亡蓄潮；不是凍結AI或把仍存活的卡移走。港口、選取與勝利截圖由正式入口與真操作取得。

## 美術交付

6張新母圖，實際工具 **image_gen.imagegen**；工具未公開可核實模型slug，manifest記null，不推定gpt-image型號。原圖 `docs/art/source/r80/`、角色表 `docs/art/character-sheets/soldier-archer-r80.png`、提示詞 `PROMPTS_R80.json`、工具收據 `GENERATION_RECEIPTS_R80.json`、來源／參考雜湊與alpha／雙閘 `ASSET_MANIFEST_R80.json`；CREDITS追加並保留全部舊授權。

執行期7張WebP共 **904,094 bytes（約0.86 MiB增量）**，6張原圖 **16,072,051 bytes（約15.33 MiB）**。另有兩張1024×1024真PNG規格版，存 `docs/art/canonical/r80/`，共3,757,863 bytes（約3.58 MiB），只作文件素材歸檔，不預載至遊戲。這是新增assets大小，不是簽章IPA／AAB差。背景、UI框、一般圖示與App提案沿用既有R79，不為湊項目重製。後製僅尺寸、WebP與QA拼圖，原生alpha保留。兩張卡圖在母版／執行期均通過亮度／飽和雙閘；浪沫與字標的白色是材質用途，完整原始診斷值保留，不冒稱所有白色VFX都滿足人物飽和門檻。64px與白／夜海透明邊緣對照 `docs/art/thumbs/r80/`，為本線自審，沒有冒稱第三方盲測。

改前無頭原圖 `docs/art/compare/r80/before/`，改後同尺寸 `docs/art/compare/r80/after/`；先審後做記錄 `ART_REVIEW_R80.md`，方向主檔與 `ART_DIRECTION_R80_ADDENDUM.md`。

## 驗證狀態

VERIFIED：六個驗證階段全數exit0，逐張開啟16張最終原尺寸商店PNG檢查。完整命令／結束碼在 `docs/evidence/r80-art/validation-stages.json`，版本、JS語法、商店圖尺寸／雜湊與零秘密命中在 `verification.json`。

| 驗證 | 最終結果 |
|---|---|
| `npm test` | VERIFIED：完整卡牌／核心／品質／平衡／航程／歷輪與R80素材守門全通過。最終截圖後另跑一次亦exit0。`static-final.txt`、`static-post-capture.txt`。 |
| `npm run test:e2e` | VERIFIED：完整既有測試全通過；含R79 83項與R80 **147 PASS**。`e2e-final.txt`、`acceptance.json`。 |
| `npm run test:rwd` | VERIFIED：11視口×3頁面，**33／33零違規**。`rwd-final.txt`。 |
| 桌機／手機三跑 | VERIFIED：1366×768與390×844中位p95均 **16.8ms**，每跑240個rAF間隔。`frame-times.json`。這是並發載參考，不是原生裝置或GPU耗時。 |
| 慢網路 | VERIFIED：Fast3G＋4倍CPU，三跑中位可見 **2,574.2ms**、可互動 **7,059.8ms**，畫面間隔p95 **16.7ms**，原3,000ms／18ms門檻通過。`performance.json`。量測工具保留歷史欄位標籤，當次R80雜湊以verification.json為準。 |
| 商店圖與連續性 | VERIFIED：16張1290×2796／2064×2752原生PNG，六視口拍攝；存活者前後X／Y均不動，空位留到下一回合，實際AI交換與潮能變化均有對應。`STORE_QA_R80.md`、`compare/r80/after/capture.json`。 |

VERIFIED：752份進場歷史evidence逐檔核對，58份測試覆寫另存本輪 `legacy-output/` 後還原原始位元組，包含原本已修改的R67 gate；兩份乾淨的歷史art manifest也已還原。`preservation.json`。既有未追蹤檔完整保留，`.audit-tmp`不提交。執行期素材已停止重寫；全部瀏覽器／本輪server均已關閉。

既有測試未刪除，數值、時間與尺寸斷言未放寬。只同步PWA版本／自動更新guard精確值與R76勝利素材精確路徑。新增本輪五項回歸加入npm test／test:e2e。靜態首測發現動態素材路徑無法納入原有離線守門，改用明確路徑後重測；第一輪E2E的7個失敗皆為測試仍精確比對舊PWA guard key，已同步新版本，原15秒規則不變。失敗紀錄保留。

第二次E2E在R79施放檢查逾時；單獨重跑83項全通過，原因未確定，不宣稱已證明是素材讀寫重疊。後續固定所有執行期素材，整套重新驗證；以最後完整收據為準。

第一次最終截圖在1366寬抓到浪向判斷錯誤，已改以雙方卡列中心判斷軸向，橫向裁切排除友軍；再補提示文字固定高度，消除1290商店圖的約7px垂直位移，新增軸向與X／Y不動檢查。未降低20px方向位移斷言。R80關鍵樣式補預載，最終慢網路可見時間降至2,574.2ms。最後完整E2E、RWD、效能及重拍全綠，失敗截圖／收據保留。

Apple 4.3風險：**高**。個體、浪向與操作證據改善，沒有帳號層審查接受證據。

PREPARED：待新的獨立Muse複評，未驗證超過8分。BLOCKED：實體iPhone／iPad／Android、Safari／WebKit與簽章包未驗；效能僅並發載本機參考。人物attack／hurt／death肢體幀仍缺，保留pose-player替換管線；卡片狀態、浪牆補間、靜態差分不當作已完成角色動畫。其餘卡池與次級emoji不在本輪五項範圍。

## 繁中文案mode2

| 原句 | 原因 | 改成什麼 |
|---|---|---|
| 滿潮了！按裂潮，或到觀潮台確認漲潮。 | 未說明10／10法力不變的原因 | 滿潮了！按裂潮，只耗潮能、不耗法力。 |
| 裂潮已退，濕甲板保留到下一回合。 | 連續四格需要明示消耗來源 | 裂潮只耗潮能，不耗法力；敵陣水痕留到下一回合。 |
| 兩次交換留下潮能；這次的勝利來自你選擇的浪潮。 | 避免把固定試航的交換次數套用到其他驗證流程 | 滿潮施放，浪峰命中敵陣。這次的航程由你掌舵。 |
