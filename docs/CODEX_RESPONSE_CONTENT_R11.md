# 裂潮卡牌｜新內容第11輪修正

版本 **0.23.1**，快取 **card-battle-content-r11-v1**，分支 main。狀態 VERIFIED，最終測試與證據彙整見 docs/content/r11/release-gates.json。本輪只修既有三項內容，沒有新增玩法；本機提交，不推送、不部署、不操作商店，不開可見視窗、不派工、不讀秘密目錄。

## 三項修正、玩法與正常入口

**六道潮汐殘局**：港口「六道潮汐殘局」→選題→開始，研習與五站舊入口保留。六題結束回合鈕一律真正 disabled、灰階加鎖；頂欄常駐「不可結束回合」，按鈕也引用同一句無障礙說明，直接呼叫結束回合不能改盤面。要放棄可到「目標／提示」按「結束這次挑戰」，再立即重試。六句中央問題分別問士兵機會、聖盾用傷、弓手存活、嘲諷路線、火焰箭3傷與雙線交換，火焰箭不再沿用交換題文案。手牌專屬槽、兩級主動提示、原位交換取消及弓手1血／獅鷲4血結果保留。

**潮汐預報**：港口「潮汐預報」→開始，研習第二分頁及原航程入口保留。按住顯示環形進度與改向試看；面板外有亮邊取消區，移出顯示「已取消」，原潮向與一次額度保留。放開套用後可撤回，繼續對戰即鎖定。每格只留回合、潮向與短狀態，不再截成「已取消・潮向未」；首次反轉／套用／鎖定附短註解。取消區另留空間，不壓英雄列。滿血不回復、浪峰目標可讀與兩筆傷害收據、友軍各聖盾×1皆回歸。

**茉恩的退潮考驗**：港口同名入口→開始，研習第三分頁及原五站頭目入口保留。整備明寫「茉恩為騎士授盾，並回復自己3血」。戰中常駐敵潮／2門檻、差額或已阻止狀態，並預告敵騎士反攻對象、傷害與我方騎士剩血；騎士離場即移除其反攻預告。姿勢切換改成原卡圖背景上方的獨立動畫層，保留完整卡框、牌名與攻血；士兵180ms命中才破盾，騎士仍4血，潮術360ms才結算。兩條回潮路線各有不同茉恩台詞及實際治療／反攻數據。結算標題改「通關」，只留一個返回選題，背景換成乾淨專屬畫作。

三項進行中甲板分別是六貝槽銅結、三月相羅盤環、貝柱守約庭。辨識來自實際甲板結構，不只放中央徽記。

## Muse 唯一五項驗收與原尺寸路徑

以下手機原圖均在 docs/content/r11/，主證據 **390×844、DPR1**，沒有拼貼、縮放或注入盤面。320寬補圖為320×568，商店圖使用指定實際視口／DPR。精確命中採虛擬時間及原始CDP擷取，規則仍由正式計時器結算。

| 唯一清單 | 完成與驗收 | 原尺寸截圖 |
|---|---|---|
| 1．規則禁止時灰階鎖定與原因 | 六題首屏均disabled，點按不改變盤面；原因不用開提示就可見 | phone-puzzle-{fallen,shield,shelter,taunt,spell,cross}-playing.png；phone-puzzle320-<id>-playing.png |
| 2．六題專屬決策問題 | 六句不重複、沒有操作順序，火焰箭問題直接對應法術3傷 | 同上六題首屏；phone-exchange-result.png為操作後即時結果 |
| 3．可見預報手勢 | 按住有環形進度與取消亮邊；移出保留原潮向／額度；套用可撤回，面板各步同高 | phone-forecast-preview.png → phone-forecast-cancelled.png → phone-forecast-applied.png；phone-forecast-undone.png、phone-forecast-closed.png；phone-forecast320-{preview,cancelled,applied}.png |
| 4．茉恩戰中可判斷 | 進度、差額及反攻對象同屏；擊殺補潮觸發治療，留守阻止治療並承受3傷 | phone-moen-return-triggered-before.png、phone-moen-return-triggered.png；phone-moen-return-prevented-before.png、phone-moen-return-prevented.png；兩路各自-completed.png |
| 5．三種戰場與乾淨收尾 | 六槽、羅盤環、貝柱三種甲板結構；結算不透出舊頂欄／任務文字 | phone-puzzle-spell-playing.png、phone-forecast-preview.png、phone-moen-heal-impact.png；phone-moen-return-{triggered,prevented}-completed.png |

## 指定嚴重問題與 R9／R10 回歸

- **04／06橘色結束鈕**：六題全部停用，有可見原因；放棄改走明確入口。六題仍實際失敗、重試、完成並重載核對保存。舊失敗／重試測試保留全部斷言，只更換原本不合法的結束回合輸入；錯誤交換造成失敗的舊測試也保留。
- **08截字復發**：新增逐文字節點Range檢查，對照視口與overflow裁切祖先；預報、研習、結算、潮術、交換、中央說明、敵潮儀表及遊玩中的英雄列皆納入。每一步量測存 acceptance.json 的textAudits。320寬也驗證按住、取消、套用及六題；研習守備使用完整短稱「守備」，無障礙標籤保留全名，390寬維持完整名稱。
- **14空白小姿勢卡面**：phone-moen-break-anticipation.png → phone-moen-break-impact.png → phone-moen-break-recovery.png，正式180ms命中；原畫滿版底層與獨立前景同在，完整卡框與背景不消失。騎士受擊／破盾、跪地保留原事件管線。
- **15結算與潮能疑慮**：結算只顯示本局結果、敗退圖及單一返回，標題「通關」。已重看R10原尺寸phone-moen-completed.png：上方敵潮實為2/6，下方我方潮能為1/6；低對比透底容易把6看成5。Core.TIDE_MAX仍為6，沒有潮能上限5的規則。R11清除舊介面透字，戰中保留清楚的潮能／6。
- **01火焰箭問題錯用模板**：中央改「火焰箭有3傷，怎樣與浪潮配合？」；火焰箭仍是我方英雄列下方有標示的真手牌。
- 原位交換取消與確認：phone-exchange-preview.png、phone-exchange-result.png；確認後士兵退場、弓手1血、獅鷲4血及潮能6一致。
- 漲潮收據：phone-forecast-flood-before.png → -impact.png → -after.png，359ms無傷，360ms英雄5→3、騎士4→3；卡名、攻血、兩份收據與英雄列同時保留。
- 退潮與滿血：phone-forecast-full-health-preview.png、phone-forecast-ebb-shields.png；不顯示0點回復，每名友軍各一盾，費用不被盾標籤蓋住。
- 茉恩：phone-moen-preparation.png、phone-moen-heal-impact.png，360ms自己4→7；破盾仍4血；phone-moen-hurt-before.png／-impact.png／-after.png呈現獨立反應。兩路結算採真實returnHealAmount／counterDamage與當前騎士生命，不固定假填3傷。
- 手機直橫、短桌機與iPad模擬：layout-*.png及acceptance.json；底欄貼近螢幕底、英雄列完整、卡牌不被壓住、所有相關可見控制至少44px。這不是實體裝置證明。

## 精選、美術、商店與驗證

審查只看 **docs/content/r11/review-set/**：15張原尺寸PNG副本，6張殘局／4張預報／5張茉恩，每項都有遊玩進行中圖。預報有按住→取消→套用連續三態；茉恩有蓄勢→破盾命中與兩路各自結算。review-set-index.json逐張記來源、用途、SHA256。六題首屏、手牌、命中收據、固定英雄列、聖盾與破盾也是R9／R10回歸圖。

15張無法容納全部重試、交換、撤回、關閉、滿血、全部角色姿勢與所有視口。完整原尺寸圖另列screenshot-inventory.json，不把未入選圖片說成審查員已看過；所有實跑測試及未入選動態原圖仍可追溯。

精選07～10取自同一局第三回合預報；11～13為同一局二式阻止治療路線的蓄勢、破盾及反攻前判斷；14為觸發治療分支結算，15為阻止治療分支結算。

新增 **3張美術**，全部為專屬戰場背景，實際工具image_gen.imagegen；沒有可核實模型slug。完整提示詞、來源與雜湊見docs/art/PROMPTS_CONTENT_R11.json、ASSET_MANIFEST_CONTENT_R11.json。沿用R10角色姿勢，不計為本輪新增美術。商店新增docs/store/screenshots/content-r11-moen-1290x2796.png及content-r11-moen-2064x2752.png，既有圖保留。

最終命令、退出碼、首次失敗與修正重跑見docs/content/r11/checks/；release-gates.json彙整最後結果，source-hashes.json綁定原始碼與素材。舊測試圖像／Node證據寫入隔離的.audit-tmp/r11/legacy，不覆寫歷史圖；測試產生的既有Python報表另在收尾還原。270份入場保護檔（含既有未追蹤檔）逐位元組核對見preservation.json。

VERIFIED：npm test、npm run test:e2e、npm run test:rwd與R6～R10全部專項最後退出碼均為0；R11實玩與版面檢查647項、規則與素材27項、108份JS語法全過，秘密掃描零命中。桌機／手機各3次、每次240個rAF間隔，p95中位為16.8／16.8ms（門檻18ms），原CI限速／CPU守門亦通過。這是共用機並發載參考。效能為共用機參考，不宣稱獨占機況。三項存檔驗證均採正常輸入後真正重載。

繁中文案mode2已直接套用：原「解成了」不自然，改「通關」；原「回復英雄3血」對象不明，改「茉恩…回復自己3血」；原「已取消・潮向未改」在分頁太長，改「已取消」，完整原潮向及額度另列；原法術題交換模板改為火焰箭專屬問題。

**Apple 4.3風險：高。** 三項機制及專屬甲板的辨識更清楚，仍保留常見奇幻卡框與攻血配置。這是本機自評，不是Apple審核或新的Muse分數。MIT、免費、無廣告、無內購、無帳號、無第三方SDK與離線玩法維持。

**BLOCKED**：實體手機／iPad需實機、真人／親子試玩需受測者、乾淨獨占效能需獨占時段、Muse8分以上需實際複審。其他沒有正式姿勢幀的隨從仍是既有缺件，本輪不宣稱全角色高影格動畫完成。
