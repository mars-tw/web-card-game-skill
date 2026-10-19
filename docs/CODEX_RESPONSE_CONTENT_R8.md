# 裂潮卡牌｜新內容第8輪

版本 **0.21.0**，離線快取 **card-battle-content-r8-v1**。狀態：VERIFIED（本機五項修正、14類檢查與截圖交付；Muse分數仍待複審）。僅既有 `main` 分支本機作業，未推送、部署、操作商店或委派；未讀秘密目錄。保留入場未提交與未追蹤檔。

## 三項內容與入口

1. **六道潮汐殘局**：港口同名按鈕、研習第一分頁、五站航程的殘局入口。選友軍看交換預覽，確認或取消。六題的機制名稱下都有一句白話；雙向連線接交戰雙方，每張卡直接標血量前後與退場。取消不改 UID、血量、盾、位置與潮能；確認才結算。成功解釋、失敗原因、立即重試與六題／複驗分列計數均保留。
2. **潮汐預報**：港口同名按鈕、研習第二分頁、五站預報入口。按住回合預覽，放開套用，移出取消。底部三回合橫條不超過手機畫面40%，戰場有獨立預留空間；只有被反轉回合寫「已套用・退潮／漲潮」，其餘寫「額度已用・未改」。實際潮術面板改稱「施放漲潮破陣／退潮護航」，潮能不足直接寫「潮能4/6未滿」。頭像、卡名、攻血與結束回合完整可見。
3. **茉恩的退潮考驗**：港口、研習第三分頁、五站Boss入口。先結束整備，觀察退潮授盾；治療標記掛在受治療的茉恩英雄頭像下方，聖盾×1掛在騎士上，破盾後移除。立繪縮到潮溝，不壓卡。首次通關後再挑戰會進入「回潮二式」，第二敵方回合追加回復2血，須保留迅捷狼補刀；時機與狀態存入原有對局存檔。仍是手工腳本，沒有擴成通用AI。

## Muse唯一五項驗收與原尺寸證據

所有 `phone-*.png` 都是無頭Chromium實際操作的390×844、DPR1原圖；沒有注入戰局、拼圖或縮放。短暫施放狀態以瀏覽器虛擬時間停在真實蓄勢／命中，再由CDP截取完整視口；規則仍由正式輸入與命中計時器結算。

| 項目 | 修正與證據（皆在 `docs/content/r8/`） |
|---|---|
| 1．六題術語＋白話 | `phone-puzzle-fallen-playing.png`、`phone-puzzle-shield-playing.png`、`phone-puzzle-shelter-playing.png`、`phone-puzzle-taunt-playing.png`、`phone-puzzle-spell-playing.png`、`phone-puzzle-cross-playing.png`。六題不開提示可讀限制；第三題英雄生命仍是「—／本題不計」，第四題註明開局已受傷。 |
| 2．交換雙向連線 | `phone-exchange-preview.png` → `phone-exchange-cancelled.png` → `phone-exchange-confirmed.png`。線接士兵與弓手；士兵2→0退場、弓手2→1，其餘兩卡4→4；確認後逐卡數值與潮5→6相符。取消前後完整存檔／逐UID盤面比較見規則測試及 `acceptance.json`。 |
| 3．預報不遮戰場 | `phone-forecast-held.png`、`phone-forecast-flood-to-ebb-applied.png`、`phone-forecast-ebb-to-flood-applied.png`；全部敵我卡名與攻血可見，已套用方向直接寫在回合按鈕。`phone-forecast-closed-playing.png`保留反轉回合；`phone-forecast-fourth.png`顯示自由潮向、施放動作與潮能不足原因。 |
| 4．治療與護盾指向 | `phone-moen-preparing.png` → `phone-moen-impact.png` → `phone-moen-shield-after.png`。4血無盾→7血授盾→破盾但騎士仍4血。治療標記不與頂欄、英雄資訊或卡牌相交，收據 `final-effects.json`。另有 `phone-moen-anticipation.png`、`phone-moen-shield-before.png`、`phone-moen-shield-impact.png`。 |
| 5．裁切與第二種變化 | `phone-moen-guarding.png`、`layout-moen-844x390-1.png`展示直橫完整卡牌／頭像；`phone-moen-return-heal-before.png` → `phone-moen-return-heal-impact.png`展示第二次挑戰的追加治療，3→5血。首場只治療一次，第二場須讓騎士先打到2血，再由保留的狼補刀；`phone-moen-return-completed.png`與重載去重計數補齊結果。 |

Claude六項嚴重問題一併處理：預報改為真實分區排版；原「敵陣X／4血」改「敵陣剩N隻」，血量各掛卡；頁尾在內容模式收起；嘲諷改寬石牆、聖盾用尖底貝盾，移除除錯圖例；拖延明示「騎士撞上士兵，聖盾擋下反擊後破裂」；停用施放顯示潮能或方向原因。第四回合觀潮時，移除英雄身上的白色矩形預覽框，保留卡牌目標提示。

GPT的學習與分支補件：六題各有 `phone-puzzle-<id>-failed.png`／`-retried.png`／`-completed.png`；`phone-puzzle-counts-verification.png`分列6/6與複驗1/1。`phone-forecast-drag-cancelled.png`補移出取消，重載與實際通關見 `acceptance.json`。另補 `phone-forecast-flood-before.png` → `-impact.png` → `-after.png`，實際把敵英雄5→3、騎士4→3；退潮的對應三格為 `phone-forecast-ebb-before.png` → `-impact.png` → `-after.png`，兩名友軍取得盾。兩方向都實際交換、通關、重載；退潮後保住兩名友軍，漲潮後剩一名，見 `forecast-effects.json`。`phone-moen-immediate-after.png`顯示立即拆盾清騎士並把英雄壓至3血；`phone-moen-delay-before.png` → `phone-moen-delay-after.png`顯示等待後騎士仍4血、英雄仍7血且士兵陣亡，提示交代破盾來源。

## 精選、商店與美術

`docs/content/r8/review-set/`固定15張手機直式原圖，三項各5張；01–05為第一／第五題限制與交換三格，補R7精選未見的題面；06–10為按住／套用連續兩格、漲潮與退潮的真實結果、停用原因，11–15為茉恩首次治療／破盾三格與第二次追加治療兩格。預報結果圖選退浪後，讓所有數值與盾圖清楚可讀；完整命中三格另存原圖目錄。`review-set-index.json`記錄來源與SHA-256，皆為位元組副本。六題所有盤面、失敗重試與其餘補件留在原圖目錄；15張平均分配的限制使精選無法同時放六題各一張及所有動態序列，不宣稱未入選圖片已被審查員看過。

商店新增四張：`docs/store/screenshots/content-r8-moen-1290x2796.png`、`content-r8-moen-2064x2752.png`，以及同尺寸的 `content-r8-forecast-1290x2796.png`、`content-r8-forecast-2064x2752.png`。預報圖已實際反轉第二回合，皆為對應原生視口／DPR實玩截圖，舊圖保留。`docs/evidence/content-r8/`有三項前後比較，before為R7歷史原圖副本，來源與雜湊在 `provenance.json`。

新增美術 **2張執行期圖、1張保留原圖集，實際產圖1次**。工具 `image_gen.imagegen`，模型slug未提供。石牆與聖盾沿用既有PROMPTS的完整風格前綴；僅裁切、縮放、無損WebP壓縮，保留透明度。提示詞與來源分別見 `docs/art/PROMPTS_CONTENT_R8.json`、`ASSET_MANIFEST_CONTENT_R8.json`，授權記錄追加於CREDITS。

文案mode2摘要：原機制術語補具體結果句；原「敵陣2／4血」因對象不明改成敵陣數量並逐卡顯示血量；原「潮汐預報」施放頁改成具體施放動作；原「反轉已用」按鈕分成已套用方向與未改；原無原因的停用改寫潮能；原除錯式我方盾圖例移除，改由不同圖像輪廓辨識。牌名與數值保留，第二次挑戰追加治療是本輪明確的新腳本變化。

## 測試與限制

VERIFIED：14類檢查最後退出碼皆為0，完整命令、每次退出碼及原始輸出在 `docs/content/r8/checks/`；失敗嘗試保留，不以跳過斷言取得通過。

- `npm test`全綠，含既有卡牌、核心、平衡、美術與各輪規則，以及R8新增32項規則／存檔／來源雜湊檢查。
- `npm run test:e2e`完整18支腳本全綠；R4保留原蓄勢斷言。`npm run test:rwd`為11視口×3頁，共33組零違規。
- R8主實玩148項、效果10項、預報雙向施放16項全過；六題另以實際文字範圍驗證不與卡牌、英雄或手牌畫作相交，見 `puzzle-readability.json`。兩種短橫向另外驗證完整卡名、攻血、角色標籤，以及施放面板展開／精簡後的可達性，見 `landscape-text.json`。
- 4倍CPU節流、每次故意延遲1秒讀回的四次真實施放全過；蓄勢未結算與命中後7血分別斷言，見 `timing-stability.json`。獨立效果測試亦確認359ms仍是4血無盾，361ms已是7血有盾。
- R6瀏覽器84項及效果6項全過；R7主實玩102項及離線補測7項全過。R8另有7項全新離線快取、實際通關與重載檢查；配合主實玩的茉恩離線通關，三項皆有離線保存證據。雙向潮術專項也各自通關、重載及核對真實命中存檔。
- 共用機並發載參考量測：桌機／手機各3跑、每跑240個rAF間隔，p95三跑中位為16.8ms／16.7ms。桌機其中一跑33.3ms，完整六跑與最大值均留在 `frame-times.json`；不把中位通過說成每跑都通過，也不代表實機或乾淨機況。
- 精選15張390×844原圖、四張商店圖的原生尺寸、來源位元組與SHA-256皆核對；秘密掃描零命中。原有612份文字文件已逐檔核對，受舊驗證器重產的兩份JSON恢復入場版本，明確授權更新的ART_DIRECTION另列，見 `preservation.json`。最終閘門與程式來源雜湊見 `release-gates.json`。

R4偶發失敗修正：MutationObserver在真正出現蓄勢狀態時，立即記錄 `enemyEbbUsed` 尚未成立的事實；測試等待該狀態紀錄並保留原「wave anticipation has not resolved damage」斷言，再截圖。不再等截圖完成後才詢問一個可能已經命中的現況。另以虛擬時間確認359ms仍無治療／盾，361ms已實際命中；4倍CPU節流下延遲1秒讀回，四次均保留正確的蓄勢證據。破盾命中時即移除×1與完整盾圖，嘲諷石牆仍保留；既有伸出卡框的繪製碎片效果與其斷言保留。R2正式航程及R3／R4舊通關操作遇到回潮二式時，須實際用保留的狼補最後2傷；加入正確殘血斷言，原通關與正式完成紀錄斷言保留。R7移除圖例的舊斷言改成同時檢查新石牆、聖盾圖與除錯圖例不存在。

舊測試仍渲染截圖並執行所有斷言。`r8-evidence-guard.js`阻止寫入歷史PNG，文字收據改存R8；Python驗證器重產的舊JSON由入場文字快照恢復。磁碟不足時僅移除本輪未完成且與來源逐檔核對的備份副本，沒有刪除任何入場未追蹤檔。

**Apple4.3風險：高。** 三種決策仍圍繞本作的交換、潮向與退潮守約，沒有加入每日任務等通用系統；整體卡框與攻血語彙仍常見。本輪沒有Apple實際審核或新版全陣容盲測，不把主觀改善換算成已通過審核。MIT、免費、無廣告／內購、無帳號／SDK／線上依賴維持。

**BLOCKED**：實體手機與iPad需實機；真人／親子試玩需受測者；乾淨機況效能需獨占時段；Muse8分以上需實際複審，本輪不自行給分。正式人物攻擊、受傷與死亡姿勢幀仍缺，保留可替換的CardPosePlayer與既有三張茉恩施法圖，不以整張卡位移冒充人物動畫。
