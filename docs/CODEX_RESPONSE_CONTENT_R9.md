# 裂潮卡牌｜新內容第9輪

版本 **0.22.0**，離線快取 **card-battle-content-r9-v1**。本機既有 main 分支；未 push、部署、操作商店或委派其他服務，未讀秘密目錄。保留入場修改及未追蹤檔。Muse 是否達 8 分仍待實際複審。

## 三項內容、入口與玩法

**六道潮汐殘局**：港口「六道潮汐殘局」、研習第一分頁、五站航程原入口。首屏只列勝利條件、不可結束回合的限制、潮能差額；攻擊順序收進「目標／提示」中的兩級提示。先看盤面觀察，再自行要求解法。火焰箭是真實可點擊的手牌，直式首屏四邊完整。交換取消不改盤面，確認後的說明直接取盤面數值，士兵退場時明示弓手1血、獅鷲4血；滿潮提示完整放在潮溝，停用原本會被英雄列壓住的重複浮字。空卡位保留原本位置，但移除淡色框與虛線，避免看成殘留輔助線。每題仍可失敗、立即重試及完成；六題與複驗分列。

**潮汐預報**：港口同名入口、研習第二分頁、五站原入口。按住預覽，放開套用，移出取消。三回合橫列固定高度，只顯示所選回合的效果；現在回合與已修改回合分列。預報守備前兩輪留守，讓玩家能保留滿潮並真正等到所選回合施放；第三輪開始出擊。這是既有研習短局的手工腳本，正常航程的自由預報沒有改成留守。漲潮命中時英雄、隨從各有傷害與前後血量收據，停留2.8秒；若後續攻擊改變血量，舊收據立即移除，避免對錯數字。退潮讓每名友軍顯示聖盾×1。不足潮能時標題明示「潮能未滿」，資訊另占一行，精簡按鈕不再擠壓。

**茉恩的退潮考驗**：港口同名入口、研習第三分頁、五站頭目入口。先結束整備，茉恩回復3血、為敵方騎士授盾，再決定拆盾、交換或延後出手。立繪保留1.5倍的獨立潮溝空間，敵名簡稱「茉恩」，「退潮守約」單行。首次通關解鎖回潮二式：第二次敵方回合反攻前，敵潮滿2格才追加回復2血；騎士陣亡會補1潮。立即清掉騎士會促成追加治療；留住騎士可阻止治療，但要承受其反攻。兩條路都能通關。迅捷狼已行動時明示「下回合」補刀。仍為手工腳本，沒有通用AI。舊R8存檔的已完成治療旗標仍被認列，不會重播追加治療。

## Muse 唯一五項驗收與原尺寸證據

以下手機圖都是無頭Chromium正常DOM輸入產生的 **390×844、DPR1原圖**，沒有注入盤面、拼圖、裁切或縮放。短暫命中／姿勢以虛擬時間及原尺寸CDP截圖保存，規則仍由正式命中計時器結算。路徑均相對 repo。

| 驗收項 | 實際證據 |
|---|---|
| 1．六題首屏與手牌安全區 | `docs/content/r9/phone-puzzle-fallen-playing.png`、`phone-puzzle-shield-playing.png`、`phone-puzzle-shelter-playing.png`、`phone-puzzle-taunt-playing.png`、`phone-puzzle-spell-playing.png`、`phone-puzzle-cross-playing.png`。`puzzle-readability.json`量測文字、卡牌、英雄與真實火焰箭手牌四邊。六題首屏未開提示；第一題選單保留「點士兵查看預覽」的引導，沒有指定攻擊對象與完整順序。 |
| 2．漲潮傷害收據 | `phone-forecast-reversed-flood-before.png` → `phone-forecast-reversed-flood-impact.png` → `phone-forecast-reversed-flood-after.png`。正是反轉後的第3回合施放，英雄5→3、騎士4→3；命中圖各自列−2與−1、血量前後值。 |
| 3．放大聖盾與破盾 | `phone-forecast-second-ebb-shields.png`為反轉後第2回合的兩名友軍各聖盾×1；`phone-moen-r9-impact.png` → `phone-moen-r9-broken.png`顯示騎士×1消失、聖盾已破、生命仍4血。完整盾為月白，裂盾保留既有外擴碎片並加銅紅色差。 |
| 4．預報固定高度與資訊完整 | `phone-forecast-fixed-held.png`、`phone-forecast-fixed-applied.png`、`phone-forecast-fixed-closed.png`同尺寸。面板204px＋底欄64px＋間距8px，共276/844＝32.7%，戰場到面板間距8px；英雄、卡名與攻血完整。`phone-forecast-unready-title.png`補不足潮能標題及獨立資訊列。 |
| 5．茉恩主角與治療指向 | `phone-moen-r9-before.png` → `phone-moen-r9-impact.png` → `phone-moen-r9-broken.png`。立繪162×168，相對R8的108×112為1.5倍；與全部卡牌及空卡位相交面積0。治療貼在敵英雄正下方，短線連回頭像，聖盾獨立貼在敵騎士。 |

三份審查其餘嚴重問題：`phone-exchange-live-result.png`的每個血量與盤面一致，按裂潮文字不被英雄列壓住；`phone-moen-return-wolf-spent.png`明示下回合保留狼，`phone-moen-return-wolf-ready.png`顯示下一回合狼可行動。各狀態與多尺寸相交、單行、44px控制量測在 `r9-acceptance.json`。320×568、360×640另採左右對陣、友軍雙列，茉恩有獨立區域，預報縮為126px且含底欄仍不超過35%。小直式立繪採108px，1.5倍規格適用390×844及較高視口。選題頁另固定頁首、分頁與底部開始按鈕，內容區獨立配置，修正新增提示鈕後短橫式遮住開始按鈕的回歸。

## 補齊未見證據

- 六題各自有 `phone-puzzle-<id>-failed.png`、`-retried.png`、`-completed.png`；`phone-puzzle-counts-verification.png`顯示六題6/6與複驗1/1。`phone-puzzle-requested-solution.png`為玩家主動打開第二級解法。
- `phone-forecast-fixed-cancelled.png`為移出取消；兩條真實反轉施放及結局為 `phone-forecast-reversed-flood-*.png`、`phone-forecast-reversed-ebb-*.png`及各自`-completed.png`。實際重載核對存檔，現在／未來方向與反轉額度維持。
- `phone-moen-first-completed.png`、`phone-moen-return-completed.png`、`phone-moen-return-prevented-completed.png`為首戰及二式兩條路的完成圖。`phone-moen-return-triggered.png`顯示騎士退場補潮後3→5的追加治療；`phone-moen-return-prevented.png`顯示敵潮不足、沒有追加治療，己方騎士承受反攻的代價。完成去重與兩條結果重載見測試收據。`return-tide.json`另核對反攻前敵潮1格、騎士退場後2格，結果文案明示判定在反攻前，不拿結算後潮值解釋先前判定。
- `phone-moen-soldier-anticipation.png` → `phone-moen-soldier-impact.png` → `phone-moen-soldier-recovery.png`是不同肢體姿勢，不是卡片平移。180ms命中前聖盾完整，命中才破盾。茉恩治療仍驗證359ms未結算、360ms實際命中。
- 離線與匯出／匯入、三項通關保存、短橫向、iPad直橫、各視口商店輸出及測試紀錄皆保留在原圖目錄與 `checks/`。這些是瀏覽器模擬，不稱實體裝置測試。

## 精選、美術與商店

`docs/content/r9/review-set/`只有15張原尺寸手機圖，三項各5張，排序01–15。至少一張實際進行中的畫面；漲潮前／命中與茉恩治療前／命中／破盾有連續圖。`review-set-index.json`記錄來源、證明目的及SHA256，都是位元組副本。

15張上限無法同時容納六張首屏、六組失敗重試完成、所有動態序列與結局。因此完整補件另在 `screenshot-inventory.json`，本報告不宣稱未入選圖片已被審查員看過。精選涵蓋指定的遮卡、頂欄斷字、交換後錯誤數值、狼跨回合提示及停用施放標題。

商店新增 `docs/store/screenshots/content-r9-moen-1290x2796.png`、`content-r9-moen-2064x2752.png`，以及同尺寸的`content-r9-forecast-*.png`。為原生視口／DPR的實際遊玩截圖，沒有刪除既有圖。`store-screenshots.json`記錄尺寸與雜湊。三項before/after在 `docs/evidence/content-r9/`，before明確標為R8歷史原圖副本。

新增美術 **10張執行期姿勢幀＋1張保留透明原圖集，實際產圖1次**；工具 `image_gen.imagegen`，模型slug未提供。士兵與騎士各有蓄勢、命中、恢復、受擊與跪地退場。原有CardPosePlayer接正式姿勢，傷害只在命中回呼；視覺與規則根節點分開，退場複本播完才回收。完整提示詞、來源、alpha、裁切與SHA256在 `docs/art/PROMPTS_CONTENT_R9.json`、`ASSET_MANIFEST_CONTENT_R9.json`，並追加CREDITS。這是最小關鍵姿勢動畫，不稱全角色高影格動畫；圖集劍尖仍有格邊裁切待精修，茉恩及其他隨從完整受傷／死亡幀仍缺。

繁中文案mode2：原固定「兩敵都剩1血」會誤述當步結果，改為即時弓手／獅鷲血量；原「保留迅捷狼」與已行動狀態衝突，改為「下回合保留迅捷狼」；原「施放退潮護航」與停用衝突，改為「退潮護航（潮能未滿）」；原常駐完整順序移入玩家要求的兩級提示。牌名、規則數值與受控術語保留。

## 測試與限制

VERIFIED。19類命令最近一次退出碼皆為0，完整命令、每次退出碼與原始輸出在 `docs/content/r9/checks/`；早期失敗紀錄保留，不刪測試、不放寬斷言。`release-gates.json`記錄最終來源SHA256及各類最近結果。

- `npm test`全綠，含既有卡牌／核心／平衡／美術與各輪規則，及R9的51項規則、存檔、舊旗標相容、三種狼狀態與素材來源檢查。
- `npm run test:e2e`完整18支腳本實跑通過；`npm run test:rwd`為11視口×3頁，共33組零違規。R6主實玩84項、效果6項，R7主實玩102項及離線補測、R8主實玩148項與效果／文字／離線／時序檢查全部通過。
- R9主實玩148項、專項99項、補驗13項全部通過。六題各自失敗／重試／完成、雙向真實施放通關、茉恩首戰及二式兩種結果、重載去重及匯出／匯入都有實際輸入。R9專項再涵蓋320×568、360×640小直式，立繪與全部卡位零相交、面板含底欄不超過35%、控制至少44px；補驗另核對五張卡的詳鈕不被盾標籤擋住。
- 359／360ms命中邊界與4倍CPU節流的四次真實施放通過；180ms攻擊姿勢命中前不破盾，命中才移除聖盾，生命仍4血。原R4蓄勢未結算斷言保留。
- 桌機／手機各3跑、每跑240個rAF間隔，p95三跑中位皆16.8ms，六跑p95均不超過18ms；桌機有單幀33.3ms。另實跑CI原 `npm run test:r67:performance`，四項守門皆通過。這是共用機並發載參考，不稱實機或乾淨獨占效能，原始數據在 `frame-times.json` 與CI命令log。
- 92張手機原圖、15張精選副本與4張商店圖的尺寸、來源及SHA256核對；秘密掃描零命中。874份入場文字逐檔對照，兩份由測試重產的歷史JSON恢復原樣；舊PNG受 `r9-evidence-guard.js`保護。詳見 `preservation.json`、`secret-scan.json` 與圖片索引。

既有E2E的修改僅有兩項：10處精確期待快取版本由R8更新R9，條件及斷言不變；選題新增提示鈕後，R1控制數由13增為14，保留每個控制的44px、視口內、點擊命中與互不重疊檢查，沒有排除任何原控制。原有測試全數保留。

**Apple 4.3風險：高。** 三項仍以陣亡蓄潮、交換與預先改潮向形成自己的決策，沒有新增每日任務、登入獎勵、抽卡或其他通用系統；奇幻卡框與攻血語彙仍常見。這是本機風險評估，沒有Apple審核結果或新一輪全陣容盲測。MIT、免費、無廣告／內購、無帳號／第三方SDK、離線可玩維持。

**BLOCKED**：實體手機／iPad需要實機；真人／親子試玩需要受測者；乾淨機況效能需要獨占時段；Muse是否達8分需要實際複審。正式茉恩及其餘隨從完整姿勢、圖集邊緣精修仍列缺件，不以單圖晃動冒充完成。
