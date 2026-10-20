# 裂潮卡牌｜新內容 R13

VERIFIED：版本 0.25.0，main，本機修正與驗證；沒有推送、部署、商店操作或對外派工。最終檢查狀態以本文件下方及 docs/content/r13/checks/ 為準。

## 三項既有內容與入口

**六道潮汐殘局**：港口「六道潮汐殘局」，或對戰設定「潮汐研習／新內容」→殘局分頁。規則與六個題目不變。收據改為每筆實際事件的來源＋傷害，例如「火焰箭 3＋漲潮 1」，記錄實際先後步驟、敵我姓名條與最終存活。六題用主卡／強調色區分；新增「查看最終盤面／返回解題收據」，第六題的複驗入口明寫「下一道：保4血」。不再把交換後的一血當作最終存活。結算雙卡欄寬相同，「血」字與同行同色。

**潮汐預報**：港口「潮汐預報」，或研習預報分頁。按住未來回合試看、移出取消、放開套用，繼續對戰前可撤回。英雄與隨從旁直接標預測傷害；按住百分比與外圈用同一個真實計時值。取消區明寫「拖到此處取消」。320／390 寬標題的潮向名稱不拆字，推算句左右內距12px，移除游標狀線，面板沒有舊的大段留白。命中英雄收據以血量框為錨點，有箭頭，避開卡框與詳情鈕。

**茉恩的退潮考驗**：港口「茉恩的退潮考驗」，或研習茉恩分頁；首戰通過後同入口進入二式。敵潮能改成會累積的六格，第2格是治療線，達線高亮；增加時顯示實際增量，反攻與治療分行。兩路結算插圖改為鋼鐵騎士的黑甲、紅羽、紅披風與狼紋盾。結算列實際承傷：讓治療發生是「4 − 交換3 − 反攻0 ＝ 1」，阻止治療是「4 − 交換0 − 反攻3 ＝ 1」，並列雙方最終存活摘要。沒有改動戰鬥數值或新增玩法。舊存檔若缺少承傷來源，只列實際血量與「承傷來源未完整保留」，不補猜交換／反攻數字。

## R12 Muse 五項驗收與 A 回歸

以下皆為原尺寸PNG。精選15張位於 `docs/content/r13/review-set/`，檔名01～15排序，每項5張；六題完整結果與其餘狀態另外保存在同輪原圖目錄，沒有用拼圖或縮放圖冒充原尺寸。最終原圖採乾淨副本的實玩輸出，先核對遊戲程式與素材雜湊，再逐位元複製；擷取來源記錄在review-index.json。

| 驗收 | 原圖路徑（前綴 docs/content/r13/） | 精選 |
|---|---|---|
| 1 來源＋數字、聖盾／漲潮收尾用語 | phone-puzzle-fallen-completed.png、phone-puzzle-shield-completed.png、phone-puzzle-shelter-completed.png、phone-puzzle-taunt-completed.png、phone-puzzle-spell-completed.png、phone-puzzle-cross-completed.png | 02～05；六題完整原圖皆附 |
| 2 敵我、實際步驟與最終盤面 | 上述六張結果；phone-puzzle-taunt-playing.png、phone-exchange-preview.png | 01～05 |
| 3 目標旁預測、半程百分比、取消不耗額度 | phone-forecast-flood-preview.png、phone-forecast-flood-cancelled.png、phone-forecast-flood-applied.png、phone-forecast-undone.png | 06～07 |
| 4 同局0→1→2格與治療線 | phone-moen-tide-0.png、phone-moen-tide-1.png、phone-moen-tide-2.png | 11～13連拍 |
| 5 統一按鈕、主卡辨識與結算露出盤面 | 六題結果及「查看最終盤面」實際操作 | 01～05 |
| A1 同一黑甲紅羽騎士 | phone-moen-return-triggered-completed.png、phone-moen-return-prevented-completed.png，與 phone-moen-tide-0.png 卡面對照 | 11、14、15 |
| A2 血量來源可驗算 | 同上兩張結算；交換／反攻分項由真實Core傷害事件產生 | 14～15 |
| A3 320／390預報內距、完整潮名 | phone-forecast-320-held.png、phone-forecast-320-applied.png、phone-forecast-390-held.png、phone-forecast-390-applied.png；另有phone-forecast320-preview.png、phone-forecast320-applied.png | 06～07 |
| A4 命中收據近英雄 | phone-forecast-flood-before.png、phone-forecast-flood-impact.png、phone-forecast-flood-after.png、phone-impact-anchor.png；impact-anchor.json記錄座標 | 08～10連拍 |
| A5 卡名、嘲諷、血色、結尾、複驗語意 | 六題結果、phone-puzzle-taunt-playing.png、兩路茉恩結算 | 01～05、14～15 |

六題錯解／立即重試／重載各有原圖與實玩測試，完整180ms攻擊、360ms潮術、茉恩治療前後及破盾姿勢連拍也存於本輪目錄。精選15張上限下，六題逐題結果未全放入精選，額外兩題結果可由上表精確定位；這是精選可見範圍限制，不能宣稱審查員已看過六題全部結果。

BLOCKED（固定盤面與該項驗收衝突）：殘局「一兵換滿潮」的正解最終雙方隨從皆退場，不能在不改玩法的情況下偽造一張存活隨從；保留真實空場與英雄，其餘存活題露出真實留場卡。Muse第5項「每張都要有存活卡」在這個既定空場題有此限制。

## 公開 CI 與本機證據分流

`.github/workflows/ci.yml` 執行 `npm test`、`npm run test:ci:e2e`、`npm run test:rwd` 及JS語法檢查。公開玩法E2E包含核心對戰、控制可達性、R13三項實玩與全新離線快取。CI不讀審查截圖、不讀本機Git狀態，也不依賴Git歷史效能基準。

歷史邏輯測試中的素材來源斷言以 `--logic` 分組；預設直接呼叫原腳本仍執行原斷言，`npm run verify:local:rules` 保留原本完整 npm test（含Python素材與證據檢查）。`npm run verify:local` 再串起舊E2E、RWD、R6～R13、離線、錯解、效能與完整性檢查。沒有刪除測試或放寬命中／尺寸／數值門檻。R1的結算按鈕精確數量由3改成4，納入新「查看最終盤面」，所有原命中與不重疊條件保留；舊快取及新插圖的精確預期也同步至R13。

`npm run verify:ci:clean` 建立沒有.git、沒有docs/evidence／docs/content媒體的乾淨副本。僅保留docs/art/masters、docs/art/source及程式實際引用的媒體，執行上述三組CI指令；輸入清單、退出碼及副本路徑記錄在checks/clean-ci.json。此為本機等價驗收，沒有宣稱遠端GitHub Actions已執行成功。

## 美術、清理與保護

新增美術2張，實際工具 `image_gen.imagegen`；模型slug未公開。提示詞、原圖、runtime及SHA-256見docs/art/PROMPTS_CONTENT_R13.json、ASSET_MANIFEST_CONTENT_R13.json。Pillow只用於WebP編碼。新增商店圖 `docs/store/screenshots/content-r13-moen-1290x2796.png`、`content-r13-moen-2064x2752.png`，均由指定viewport／DPR原生擷取，舊商店圖保留。

EXECUTED：只刪除218個Git已追蹤、被取代且未發現驗證引用的舊媒體，工作樹刪除量共161,557,369 bytes（154.07 MiB；未扣本輪新檔，不含Git歷史物件）。逐檔路徑／SHA／位元組與1,352個保留媒體的理由在cleanup.json。原有未追蹤檔、Markdown、來源及商店圖均保留；276份入場保護檔逐位元組驗證。一次批次寫檔曾正規化未追蹤audit-oc-r1.js的換行，已依入場SHA找回完全相同位元組；該檔未納入提交。

繁中文案mode2摘要：「弓手」指稱不一致→收據統一「弓箭手」，保留其他正式卡名「望塔弓手」；「先剝貝盾」未定義→「先剝聖盾」；「浪收割／漲潮斬殺」→「漲潮收尾」；「換目標複驗」→「下一道：保4血」；兩路二式結尾半形空格移除，補實際承傷來源而不編造事件。

## 最終驗證與限制

VERIFIED：刪除舊證據後，16組完整本機檢查的最後退出碼皆為0，包含npm test、原npm完整素材／證據斷言、舊test:e2e、RWD、R6～R13各專項、離線、錯解、三跑效能與完整性。R13規則60項、瀏覽器／版面749項、RWD33個頁面×視口組合均通過。乾淨副本的npm ci、npm test、test:ci:e2e、test:rwd及CI的JS語法範圍全綠；輸入不含docs/evidence、docs/content與.git，也不能向上找到本機Git。詳見release-gates.json、checks/results.json與checks/clean-ci.json；歷次失敗紀錄保留，不把舊失敗當成最終結果。

VERIFIED：119份JS語法通過，秘密掃描零命中，276份入場保護檔及48張既有商店圖完整未變。兩個視口各3次、每次240個rAF間隔，p95三跑中位為1366×768：16.70ms、390×844：16.70ms，均≤18ms；另有50.1ms最大間隔，原始數據保留。這是共用機並發參考，不能冒充乾淨機況或實體裝置效能。命中英雄收據距血量框6px、距血量數字37.86px；原始座標在impact-anchor.json。

**Apple 4.3風險：高。** 潮能／潮向／敵潮治療的取捨有辨識度，奇幻兵種、卡框、攻血與上下對陣仍接近常見類型。這是本機自評，沒有Apple審核或新的Muse分數。MIT、免費、離線、無廣告、無內購、無帳號、無線上功能及無新增第三方SDK維持。

**BLOCKED**：實體手機／iPad需裝置；真人／親子試玩及三位旁觀者的同角色辨識需受測者；乾淨機況效能需獨占時段；Muse達8分以上需真正複審。全角色高影格動畫仍非本輪完成範圍，沒有以單張卡圖位移宣稱角色動畫完成。
