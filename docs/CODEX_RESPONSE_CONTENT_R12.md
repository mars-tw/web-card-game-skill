# 裂潮卡牌｜新內容第12輪修正

VERIFIED（本機驗收），版本 **0.24.0**、分支 main、離線快取 **card-battle-content-r12-v1**。本輪僅修既有三項內容，完整驗收狀態見 `docs/content/r12/release-gates.json`。本機 commit，不 push、不部署、不操作商店、不派工；全程使用背景／無頭瀏覽器，未讀秘密目錄。

## 三項修正與正常入口

**六道潮汐殘局**：港口「六道潮汐殘局」→選題→開始。保留六題不可結束回合、兩級主動提示、完整卡面與火焰箭手牌槽。嘲諷石牆加上清楚短標籤，放在左側，與右側尖底聖盾不同；非嘲諷卡沒有標記，卡牌「詳」也列出嘲諷。問題改為「這名士兵倒下後，局勢會怎麼變？」；題名改「一兵換滿潮」。火焰箭下方空白改為可讀手牌規則。遊玩中的一步收據與完成收據取自真實 Core 事件，列出傷害拆解、破盾、陣亡補潮與存活血量；失敗用目前未達目標及實際選錯解釋，不再把主動放棄說成結束回合。

**潮汐預報**：港口「潮汐預報」→開始。面板大字固定說明「正在改／已改成：第3回合，退潮→漲潮破陣」，選中回合有金邊及指向盤面的連線。按住半秒可看見裂潮鈕外圈半環與「按住中…放開套用／移出取消」。取消不花額度；套用可撤回，繼續對戰後鎖定。套用前明寫「依目前盤面推算：敵方英雄5→3、敵方騎士4→3」，不是保證未來盤面不變。兩張實際傷害收據各自帶對象名稱，避開完整卡框與詳情按鈕；未改向格維持正常亮度，真正過去的回合才灰階。

**茉恩的退潮考驗**：港口同名入口→開始。首戰先結束整備，觀察退潮授盾與自己4→7；首戰通關後再次進入為回潮二式。頂欄頭像裁自同一張藍袍、棕髮女性茉恩立繪。聖盾留守／護盾碎裂／反攻空檔持續切換不同肢體畫作；真實受擊反應仍優先。常駐三類資訊為同一敵潮能量表「目前/6、治療線2」、距離治療與行動增量、反攻對象／傷害／剩血，其他規則由目標／提示查看。敵騎士居中，390寬下完整卡框距右緣超過一個卡寬。

二式兩路皆可通關：擊倒敵騎士會增加敵潮能，下一輪合計2格觸發茉恩追加回復；保留騎士則敵潮1格、治療被阻止，但承受反攻。結果用不同生成插圖、副標、並排數字與結尾呈現。觸發路線沒有反攻就明寫沒有反攻；阻止路線寫「治療被阻止」，不寫「追加回復0血」。整備的3血與二式追加的2血分別列明，數字均依實際血量上限與事件紀錄。

## Muse R11 唯一五項驗收

以下原圖均為390×844、DPR1，未拼貼或縮放。

| 項目 | 本輪驗收與原尺寸路徑 |
|---|---|
| 1．改哪一回合 | `docs/content/r12/phone-forecast-flood-preview.png`、`phone-forecast-flood-applied.png`：第1回合預改第3回合，大字潮向、選中格與盤面指向同屏。 |
| 2．可見按住進度 | 同一 `phone-forecast-flood-preview.png`：真實按住500ms，比例介於1/3與2/3；外圈在裂潮鈕，短字緊鄰外圈，取消區不壓英雄列／卡牌。`phone-forecast-flood-cancelled.png`保留原潮向與額度。 |
| 3．茉恩資訊與卡框 | `docs/content/r12/phone-moen-heal-impact.png`、`phone-moen-broken.png`、`phone-moen-opening.png`：三姿勢可辨，頭像一致；治療線與上限同屏，資訊不與卡牌相交。 |
| 4．兩路可掃讀結算 | `docs/content/r12/phone-moen-return-triggered-completed.png`、`phone-moen-return-prevented-completed.png`：各自插圖、副標、治療量、反攻承傷、騎士剩血與正確結尾。 |
| 5．六題一步／完成回饋 | `docs/content/r12/phone-puzzle-{fallen,shield,shelter,taunt,spell,cross}-completed.png` 六張均含本局事件收據；`phone-puzzle-fallen-step-result.png`為交換後仍可繼續玩的即時回饋。六題實際選錯結果另有 `phone-puzzle-<id>-wrong-result.png`。 |

## 指定問題、R10／R11 回歸與完整補圖

- **頭像／姿勢**：同源頭像 `assets/art/content-r12/moen-portrait.webp`；三態為既有 `moen-cast`／`moen-hurt`／`moen-recover`，來源與SHA256全部列入本輪 manifest。不是只改文字，也不是整張圖位移、縮放或晃動。
- **嘲諷可辨**：`docs/content/r12/phone-puzzle-taunt-marked.png`、`phone-moen-heal-impact.png`。與聖盾不同圖形與位置，原詳情解釋保留。
- **治療／傷害時序**：`phone-moen-before.png`→`phone-moen-heal-impact.png`；359ms未回復，360ms才4→7並授盾。`phone-moen-break-anticipation.png`→`phone-moen-break-impact.png`→`phone-moen-break-recovery.png`；179ms有盾，180ms破盾仍4血。騎士／士兵滿版卡面背景、獨立姿勢層、牌名、攻血保留。`phone-moen-hurt-{before,impact,after}.png`補受擊鏈。
- **交換與學習**：`phone-exchange-preview.png`、`phone-exchange-result.png`：取消不改盤面，確認後士兵退場、弓手1血、獅鷲4血及潮能6相符。六題各正常通關、實際錯誤操作、重試與重載；結果使用事件，不是共用空泛評語。
- **預報完整流程**：`phone-forecast-{preview,cancelled,applied,undone,closed}.png`；滿血與授盾為 `phone-forecast-full-health-preview.png`、`phone-forecast-ebb-shields.png`。保留每名友軍各一盾，不顯示0點回復。第3回合命中另有 `phone-forecast-flood-{before,impact,after}.png`。波浪沒有提早扣血；兩張收據逐一驗證不碰卡角／詳情鈕。
- **存檔與離線**：`feedback.json`、`offline-puzzles-forecast.json`；真實重載確認，沒有注入盤面或通關進度。全新service worker快取後斷網，三項內容都通關；兩張新分支插圖在離線狀態實際decode成功。
- **版面**：320／360／390寬、844×390橫向、iPad直橫及1366×600短桌機模擬；原圖 `layout-*.png`、`phone-puzzle320-<id>-playing.png`及`phone-forecast320-*.png`。命中至少44px、文字Range無裁切、英雄列完整。這些是瀏覽器模擬，不是實體裝置證明。

## 審查精選、素材與商店

只交15張手機原圖副本到 **`docs/content/r12/review-set/`**，來源、用途、原尺寸與SHA256見 `review-set-index.json`。01～06為六題完整結果；07為嘲諷題正常遊玩；08～10是同局第1回合試改第3回合→套用→第3回合真實命中；11～13為同局茉恩授盾命中→破盾仍4血→騎士2血反攻空檔；14、15是二式兩條真實結果。

為同時保留六題各一張結果、嘲諷題遊玩與茉恩五張必要圖，分配為殘局7／預報3／茉恩5。取消、撤回、六題錯誤結果、連續精確命中幀、320與橫向圖在完整資料夾；不把未入選補圖說成審查員已看過。完整圖表在 `screenshot-inventory.json`，前後比對副本在 `docs/evidence/content-r12/`。

新增 **2張生成插圖**，實際工具 `image_gen.imagegen`；另1張同源頭像衍生圖，3張沿用姿勢不重算。完整提示詞、來源原圖、衍生及SHA256見 `docs/art/PROMPTS_CONTENT_R12.json`、`ASSET_MANIFEST_CONTENT_R12.json`、`ART_DIRECTION_CONTENT_R12.md`。

商店新增 `docs/store/screenshots/content-r12-moen-1290x2796.png`、`content-r12-moen-2064x2752.png`，以實際視口／DPR擷取，未刪既有圖。

## 測試與限制

最終命令、退出碼與歷次執行紀錄在 `docs/content/r12/checks/`；`release-gates.json`彙整最後結果，`source-hashes.json`綁定來源。既有測試斷言未刪除或放寬；首輪E2E六項失敗是測試仍精確鎖定R11快取，僅同步預期值至R12。續跑另揭露844×390結算按鈕溢出，已改為左右排版，短手機保留完整結果控制；補上六題與茉恩兩路的320寬／橫向結果命中檢查。R3要求失敗回饋保留「錯在」辨識語，已在真實未達成原因前補回，並確認未操作的放棄不捏造施法或陣亡。R9另攔下立繪縮小回歸，已恢復162×168的既有尺寸，資訊移回相鄰區域；R12新增相同尺寸下限檢查，沒有放寬原斷言。以上修正後重跑相關專項。舊測試仍產生真實截圖與收據，寫入隔離的`.audit-tmp/r12/legacy`；Python輸出在寫入前即轉址，沒有覆寫既有未提交檔案。

繁中文案mode2直接套用：原「這一席士兵」量詞不自然，改「這名士兵…」；題名改「一兵換滿潮」。原「敵軍、英雄」對象不清楚，改「敵方隨從、敵方英雄」及血量推算。原「追加回復0血」改「治療被阻止」；原共用「守住了反攻的人」改為各路實際事件與不同結尾。

VERIFIED：15組必要檢查最後退出碼皆為0，包含npm test、npm run test:e2e、npm run test:rwd、R6～R11專項與R12實玩／離線／回饋檢查。R12規則與素材46項、瀏覽器與版面680項、六題錯後重試49項均通過；RWD的33個頁面×視口組合零違規。114份JS語法通過，秘密掃描零命中；入場272份保護檔逐位元組未變，見preservation.json。

桌機與手機各3次、每次240個rAF間隔，p95三跑中位皆為**16.7ms**，低於18ms；原CI限速／CPU效能守門亦通過。原始數據為frame-times.json、ci-performance.json。這是共用機並發參考，不是乾淨機況或實體裝置證明。

**Apple 4.3風險：高。** 潮能／潮向、解謎與敵潮治療取捨更清楚，仍有常見奇幻卡框與攻血版式。這是本機自評，沒有Apple審核或新的Muse分數。MIT、免費、無廣告、無內購、無帳號、無第三方SDK與離線可玩維持。

**BLOCKED**：實體手機／iPad測試需要裝置；真人／親子試玩需要受測者；乾淨獨占效能需要獨占時段；Muse8分以上需真正複審。其他缺正式姿勢的隨從仍是既有缺件，本輪不宣稱全角色高影格動畫完成。
