# 裂潮卡牌｜新內容第10輪修正

版本 **0.23.0**，快取 **card-battle-content-r10-v1**。狀態：**VERIFIED**，12類最近退出碼均為0，詳見 release-gates.json。本輪只修既有三項內容，沒有新增玩法。沿用 main；不 push、部署、操作商店、開可見視窗或透過服務派工，未讀秘密目錄。

## 三項做了什麼、怎麼玩、入口

**六道潮汐殘局**：港口「六道潮汐殘局」／研習第一分頁／五站原入口。維持陣亡補潮、聖盾、長弓存活、嘲諷、法術與雙線交換六種決策。火焰箭是真實可點擊的手牌，放在我方英雄列下方、有「手牌」標示的槽；移除卡面截斷效果字，完整規則仍可按「詳」查看。六題首屏只呈現目標、限制與當前潮能，解法保留在主動兩級提示。滿潮改寫「潮能已滿 6/6」，長弓題改寫「不計血量」。每題以正式操作失敗、立即重試、完成並重載存檔；交換取消與真實弓手1血／獅鷲4血結果保留。

**潮汐預報**：港口同名入口／研習第二分頁／五站原入口。按住預覽，移出顯示「已取消」，放開套用，面板內可按「撤回反轉」恢復原潮向及額度；繼續對戰、跨回合或發生戰鬥結算後鎖定，不能施放後再反悔。套用只消耗一次。滿血時選項與預覽同時明寫「已滿血，不回復」。戰場根不再播放會改變固定定位基準的 transform／filter 動畫；預報及施放面板各依實際高度保留空間，因此英雄列與底欄在蓄勢、命中及關閉後都維持可讀。浪峰降至22%透明度，泡沫限卡圖中央；收據留有指向短線，卡名、攻血與兩份傷害結果可同時核對。聖盾數移到卡框外，避免費用寶石。

**茉恩的退潮考驗**：港口同名入口／研習第三分頁／五站頭目入口。先結束整備，明寫「為騎士授盾並回復英雄 3 血」。茉恩有整備、施法、兩階段受擊、敗退姿勢；騎士有完整武器的蓄勢、命中、恢復、受擊、跪地、破盾姿勢；舊士兵命中圖的劍尖裁切也一併補成5張完整姿勢。士兵攻擊180ms命中才破盾，騎士仍4血；治療360ms才讓英雄4→7。騎士離場後也會更新中央提示，不再留下「護盾已解除」或已不存在的騎士反攻提示。二式持續顯示判定敵潮／2格門檻：擊殺騎士補潮會促成追加治療；留騎士可阻止治療，但我方騎士需承受反攻。兩路均能完成。收尾用茉恩垂下天秤的敗退圖與角色台詞。

## Muse 唯一五項清單與原尺寸證據

以下相對路徑都在 docs/content/r10/，手機原圖為 **390×844、DPR1**。採正式 DOM 輸入；沒有注入盤面。精確命中使用虛擬時間及原始 CDP 截圖，規則仍由正式計時器結算；沒有把截圖拼接或縮放成證據。

| 項目 | 完成與驗收方式 | 原尺寸路徑 |
|---|---|---|
| 1．六題公開首屏、各有不同決策 | 六題未開提示，勝利條件／不可結束回合／潮能與完整手牌可見，不指定攻擊目標與順序 | phone-puzzle-fallen-playing.png、phone-puzzle-shield-playing.png、phone-puzzle-shelter-playing.png、phone-puzzle-taunt-playing.png、phone-puzzle-spell-playing.png、phone-puzzle-cross-playing.png |
| 2．預報完整閉環 | 預覽、移出取消、套用與關閉；取消不改潮向／額度，套用前後面板同高、頂欄同回合；另證明撤回 | phone-forecast-preview.png → phone-forecast-cancelled.png → phone-forecast-applied.png → phone-forecast-closed.png；phone-forecast-undone.png |
| 3．命中特效不遮卡 | 反轉後第3回合實際漲潮，英雄5→3、騎士4→3；命中當下可讀卡名、3攻／3血與兩張收據，英雄列及底欄完整 | phone-forecast-flood-before.png → phone-forecast-flood-impact.png → phone-forecast-flood-after.png |
| 4．茉恩文案與姿勢 | 整備、治療命中、真正破盾三格；整備／施法姿勢不同，騎士破盾仍4血；完整劍尖以圖集切片與截圖核對 | phone-moen-preparation.png → phone-moen-heal-impact.png → phone-moen-break-impact.png；phone-moen-break-anticipation.png、phone-moen-break-recovery.png |
| 5．三項專屬視覺錨點 | 中央戰場分別放六道解潮結、三潮羅盤、茉恩守約貝印；茉恩本人成為主角，不讓鋼鐵騎士同時擔任三項主角 | phone-puzzle-spell-playing.png、phone-forecast-flood-impact.png、phone-moen-preparation.png；商店 content-r10-moen-1290x2796.png、content-r10-moen-2064x2752.png |

指定嚴重問題補件：

| 問題 | 證據 |
|---|---|
| R9圖08／11英雄列消失、底欄上浮、卡牌被切 | phone-forecast-flood-before.png、phone-forecast-flood-impact.png、phone-moen-before.png、phone-moen-heal-impact.png；acceptance.json 的各狀態英雄／卡牌／底欄矩形，底欄距螢幕底8px |
| 火焰箭浮在敵方高度、露出殘字 | phone-puzzle-spell-playing.png；手牌槽低於我方英雄，與敵方卡牌垂直帶不相交，截斷效果字不再顯示 |
| 滿血預覽0點、聖盾截字、差0格、不計血量 | phone-forecast-full-health-preview.png、phone-puzzle-shield-playing.png、phone-puzzle-spell-playing.png、phone-puzzle-shelter-playing.png |
| 浪花遮卡、盾標籤遮費用 | phone-forecast-flood-impact.png、phone-forecast-ebb-shields.png、phone-moen-break-impact.png |
| 預報誤提交、茉恩主角與收尾 | phone-forecast-applied.png、phone-forecast-undone.png、phone-moen-hurt-impact.png、phone-moen-completed.png |

## R8 回歸與「未見證據」補件

- 原位交換：phone-exchange-preview.png、phone-exchange-result.png；取消不犧牲單位，確認後弓手1血／獅鷲4血與潮能同步，說明是即時結果。
- 六題各有 phone-puzzle-<id>-failed.png、-retried.png、-completed.png；每題真正重載檢查保存，舊 R9 規則／計數／匯出匯入測試同時重跑。
- 預報：phone-forecast-flood-completed.png 是實際第3回合反轉漲潮後完成；退潮路也以正式輸入通關並核對重載。phone-forecast-ebb-shields.png 可數兩名友軍各聖盾×1；phone-forecast-full-health-preview.png 保留完整英雄列與一致滿血說明。
- 茉恩：phone-moen-return-triggered-before.png／phone-moen-return-triggered.png／phone-moen-return-triggered-completed.png，及對應 prevented 三圖，顯示反攻前敵潮2格／1格、追加治療與阻止治療，以及我方騎士4→1血的代價。phone-moen-return-wolf-spent.png 保留「下回合」文字。首戰與二式重載去重由正式存檔核對。
- 320×568、360×640、844×390、1032×1376、1376×1032、1366×600及商店原生視口／DPR保留 layout-*.png；另由既有 RWD、控制、離線與命中邊界測試驗收。這是瀏覽器模擬，不稱實體手機／iPad。
- docs/evidence/content-r10/ 保留三項 R9 before／R10 after 原圖副本，以及手機直式、短橫式與iPad三視口。

## 精選、美術與商店

**審查只看 docs/content/r10/review-set/**：15張原尺寸位元組副本，01～06六題首屏、07～11預報手勢／實際命中／聖盾、12～15茉恩整備／治療／真正破盾／收尾。分配6／5／4，每項都有實際遊玩進行中畫面；review-set-index.json 記來源、用途及SHA-256。精選中預報浪峰、聖盾、固定面板、茉恩主角及治療指向也是R8回歸圖。

15張上限無法同時容納所有失敗／重試／完成、四態預報、交換、兩條頭目分支及全部姿勢；完整原圖另列 screenshot-inventory.json。精選將「關閉」呈現在第10張真實施放畫面，單獨關閉、滿血說明、交換、受擊與分支圖仍提供原尺寸路徑。不能把未入選圖片稱為審查員已看過。

新增 **19張執行美術**：茉恩5、騎士6、士兵5、專屬標記3；5次 image_gen.imagegen 呼叫，保留4張原圖集與1張透明背景比對圖。模型slug未提供；alpha、完整提示詞、身份參考、非等寬／非等高裁切及SHA-256見 docs/art/PROMPTS_CONTENT_R10.json、ASSET_MANIFEST_CONTENT_R10.json。只切圖集與加透明安全邊，不畫程序占位圖。

商店新增 docs/store/screenshots/content-r10-moen-1290x2796.png、content-r10-moen-2064x2752.png，均為指定視口／DPR直接取得的實際遊玩圖，既有商店圖全部保留。尺寸與雜湊在 store-screenshots.json。

## 測試、文案與限制

VERIFIED：R10規則／素材64項、實玩287項；11視口×3頁共33組RWD零違規。12類最近執行結果全數為0；R6、R7、R8、R9與原CI效能皆通過。桌機／手機各3跑、每跑240個rAF間隔，p95中位皆16.8ms；桌機單幀峰值50ms。原CI的Fast 3G／4倍CPU守門亦全過，影格p95為16.7ms。這些數值是並發載參考。

完整命令、退出碼、首次失敗與修正後重跑，保留在 docs/content/r10/checks/；release-gates.json 彙整最終結果並綁定 source-hashes.json。舊測試仍實際執行所有輸入與截圖，原歷史檔案保留；新寫出隔離在 .audit-tmp/r10/retained-legacy 及 .audit-tmp/r10/legacy，不入commit。本輪正式回歸採本輪原圖；原始stdout與退出碼在checks。入場未提交的R67視覺證據以原位元組核對，26筆既有未追蹤項目保留，詳見preservation.json。

文字來源雜湊依 .gitattributes 的LF換行計算，可與Git保存內容直接核對；圖片雜湊使用未修改的原始位元組。方法另記在 source-hash-method.json。

測試涵蓋 npm test、npm run test:e2e、npm run test:rwd、R6／效果、R7／離線、R8全套、R9全套／六題首屏、R10實玩、103份JS語法、桌機／手機各三跑rAF與原CI效能守門。既有測試及斷言保留；唯一既有測試修改是確切快取版本由R9更新R10。秘密掃描不輸出匹配內容，結果須零命中。效能是共用機並發載參考，不稱乾淨實機出貨證明。

繁中文案mode2已直接套用：

| 原句 | 原因 | 改成什麼 |
|---|---|---|
| 英雄回復0點／回復3 | 滿血時看似矛盾 | 英雄已滿血，不回復；非滿血顯示實際可回復量 |
| 貝盾擋一次（舊圖易誤讀「目盾」） | 術語及截字判讀不一致 | 聖盾擋一次，完整文字保留空間 |
| 潮能6/6（差0格） | 滿潮多餘資訊與斷行 | 潮能已滿6/6 |
| —／本題不計 | 容易看成資料缺漏 | 不計血量 |
| 茉恩先護騎士並回復3血 | 動作與治療對象不明 | 茉恩先為騎士授盾並回復英雄3血 |
| 茉恩護盾已解除 | 下一階段殘留事件 | 當下敵潮門檻、治療判定或防線已開 |

**Apple 4.3風險：高。** 本輪把潮汐、原位交換與公開門檻的識別補清楚，但常見奇幻卡框與攻血外觀仍有相似風險。這是本機評估，沒有Apple審核結果。MIT、免費、無廣告、無內購、無帳號、無第三方SDK與離線玩法維持。

**BLOCKED**：實體手機／iPad需實機；真人／親子試玩需受測者；乾淨獨占效能需獨占時段；Muse是否達8分需真正複審。本輪補完指定角色的最小關鍵姿勢，不宣稱其他隨從已具完整攻擊／受傷／死亡或高影格動畫；其餘角色素材仍是既有缺件。
