# 裂潮卡牌 R79｜美術第五輪

2026-10-18。基底 `0702936`／`main`，版本 **0.12.0**、PWA **card-battle-r79-v1**。依 RESCORE4 第四節五項執行，對照 RESCORE3 遺留；沒有新增玩法或畫面。本機 headless、沒有派工、push、部署、商店操作、對外訊息或讀取秘密目錄。進場獨立分數 **7.4/10**，不把本線自審當成8分複評。

VERIFIED：已接入新圖、完成下列五項的本機行為／截圖驗證，並逐張檢查16張最終原尺寸PNG。先審後做的改前證據在 `docs/art/compare/r79/before/`；最新自審 `ART_REVIEW_R79.md`，方向主檔與 R79 addendum、逐張prompt／來源／雜湊已保存。獨立8分目標尚待新Muse複評。

## Muse 五項唯一驗收

| 指定項目 | 本輪改動與改後原尺寸證據 |
|---|---|
| 1．同場非致死前／中／後 | 同一批標準卡、一位已受傷弓手、一位存活弓手；以真施放命中扣2英雄生命、耗6潮，第一位退場後原規則陣亡蓄潮+1，第二位仍留場。`docs/store/screenshots/tide-before-1290x2796.png`、`trial-1290x2796.png`、`tide-after-1290x2796.png`；2064×2752 同名組。`tide-next-turn-*` 保存真實下一完整回合濕痕。三格未插入測試狀態寫入，before／impact／after 的UID、HP、潮能、卡血與位置在 capture.json。 |
| 2．同名狀態形狀 | 同名士兵並排 ready／waiting：只有可動者完整亮框＋箭頭、待命壓暗30%；真實存活攻擊後略傾斜＋封印記號。`docs/store/screenshots/tide-before-1290x2796.png`／`docs/store/screenshots/tide-before-2064x2752.png`；另 `docs/evidence/r79-art/same-name-no-labels-*` 暫隱名稱數值作輪廓診斷，不冒充商店圖。 |
| 3．單一專屬浪牆 | 取消左右對稱雙渦與逐卡圓環，改為一道抬高的斜浪脊，單鉤月尖朝敵方、平行尾流朝我方；卡片下緣用開放式泡沫刷痕。`docs/store/screenshots/trial-1290x2796.png`／`docs/store/screenshots/trial-2064x2752.png`。同母圖作字標、旗紋、圖示與卡框生成參考，對照 `harbor-*`／`victory-*`；短橫向沿左右對陣軸推進。 |
| 4．施放後狀態與回饋 | 處理中及對戰結束兩鈕均停用、空潮無珊瑚橘；潮術完全不產數字浮標。其他攻擊的數字固定在卡／血值300ms後移除，不往海面飄。對手陣亡蓄潮明示來源，規則不改。`docs/store/screenshots/trial-1290x2796.png`／`docs/store/screenshots/tide-after-2064x2752.png`，致死／低效能／減少動畫驗證在 acceptance.json。 |
| 5．目標與觀潮台收尾 | 正式試航真出牌／選士兵，畫面同步亮框＋兩張敵卡目標箭頭：`docs/store/screenshots/battle-1290x2796.png`／`docs/store/screenshots/battle-2064x2752.png`。觀潮台只剩繼續、兩潮術與確認，受影響卡直接顯示退場破線輪廓：`docs/store/screenshots/tide-chart-1290x2796.png`／`docs/store/screenshots/tide-chart-2064x2752.png`。離場功能移到既有更多選單，44px命中維持；港口硬邊黑盒改為一層漸隱，`docs/store/screenshots/harbor-1290x2796.png`。逐張原尺寸檢查記於 STORE_QA_R79.md。 |

非致死三格是**明示QA準備場景**，不宣稱自然首局或新增試航模式。只有準備時使用既有測試掛鉤，未改標準攻血、規則、勝負或傷害量。港口、五卡試航選取與勝利由正式根入口及真實玩家操作取得。三格為原生倍率PNG，沒有改字、合成或後製縮放。完整來源分類見 `docs/art/compare/r79/after/capture.json`。

## 新圖與包體

9張生成原圖：單一浪牆、開放接觸泡沫、領航員三視圖／表情設定表、舉旗領航員、月貝甲板、珍珠銅卡框、裂潮圖示、繁中字標、App圖示提案。實際工具 **image_gen.imagegen**，工具未公開可核實模型slug，manifest記null，不推定gpt-image型號。

原圖 `docs/art/source/r79/`、設定表 `docs/art/character-sheets/navigator-r79.png`、提示詞 `PROMPTS_R79.json`、工具輸出收據 `GENERATION_RECEIPTS_R79.json`、雜湊／尺寸／原生alpha／角色雙閘 `ASSET_MANIFEST_R79.json`。新圖共用前綴、左上月光／右下銅反光。縮圖與白／夜海透明邊緣對照在 `docs/art/thumbs/r79/`；64px為本線自審，未冒稱盲測。

10張執行期WebP（含兩張低解析）共 **1,687,248 bytes，增加約1.61 MiB**；9張原圖 **23,784,820 bytes，約22.68 MiB**。舊母版與授權完整保留，CREDITS追加本輪。未有簽章IPA／AAB，這是assets增量，不是原生包體差。App圖示只作本機提案；設定表不是動畫幀。後製只有尺寸、WebP壓縮與QA拼圖，保留原生透明alpha與柔邊。慢網路修正只壓縮700px低解析甲板至61,032 bytes，完整1400px素材不變。

## 測試與限制

既有測試未刪除、數值與時限斷言未放寬；R74／R75離場命中檢查只移到新位置。版本／revision精確比對、R76勝利姿勢的精確素材路徑同步至R79。R79新增83項行為驗收，已加入npm test／test:e2e。最後整套執行結果均為exit0，完整命令／結束碼在 `docs/evidence/r79-art/validation-stages.json`。

| 驗證 | 結果與收據 |
|---|---|
| `npm test` | VERIFIED：全量核心、卡牌、品質、平衡、航程及R75–R79素材守門通過；`docs/evidence/r79-art/static-final.txt`。 |
| `npm run test:e2e` | VERIFIED：完整既有流程通過，含R74 310、R75 98、R76 103、R77 22、R78 75及R79 **83 PASS**；`e2e-final.txt`。 |
| `npm run test:rwd` | VERIFIED：11視口×shell／battle／pack，**33/33零違規**；`rwd-final.txt`。 |
| 桌機／手機三跑 | VERIFIED：1366×768中位p95 **16.8ms**、390×844 **16.7ms**，每跑240個rAF間隔；`frame-times.json`／`frames-final.txt`。並發載參考，不是GPU耗時或原生裝置證明。 |
| 慢網路戰場首屏 | VERIFIED：Fast3G＋4倍CPU，三跑中位可見 **2,552.3ms**、可互動 **6,955.9ms**，rAF p95 **16.7ms**；3000ms／18ms原斷言通過。`performance.json`／`performance-final.txt`。量測腳本的source欄沿用舊R76標籤，當次R79執行期雜湊另在verification.json。 |
| 商店圖 | VERIFIED：16張原生倍率PNG、六視口拍攝、同場非致死三格與一完整回合水痕；`capture-final.txt`、`compare/r79/after/capture.json`、`STORE_QA_R79.md`。 |

過程發現並修正桌機控制列擋手牌、舊勝利圖精確路徑，以及新甲板延遲載入／重複圖示請求。慢網路首測5,120.2ms，修正預載、統一請求URL及低解析壓縮後重跑整套。失敗紀錄保留，本表只採最後全綠結果；沒有降低門檻或刪除失敗斷言。

VERIFIED：發行讀回確認版本0.12.0、舊執行期revision零命中、全部JS語法通過、16張PNG尺寸／雜湊與秘密掃描零命中，見 `docs/evidence/r79-art/verification.json`。652份進場歷史evidence逐檔核對，51份測試覆寫已另存當次輸出後還原原始位元組，包含進場已修改的R67 gate；收據 `preservation.json`。全部既有未追蹤檔保留，`.audit-tmp`不提交。商店16張是本輪授權替換的交付圖。

Apple 4.3風險：**高**。浪形識別與玩法證據已具體改善，沒有帳號層審查接受的證據，沒有動商店。PREPARED：待獨立Muse新複評，未驗證超過8分。

BLOCKED：原生iPhone／iPad／Android、Safari／WebKit、簽章包與乾淨機況效能未驗；本輪是本機無頭Chromium與並發載參考。人物attack／hurt／death肢體幀仍缺，保留pose-player替換管線；卡片傾斜是狀態，浪牆是技能補間，不稱已完成角色動畫。其餘卡池與次級emoji未全面重繪，不擴張本輪五項範圍。

## 繁中文案mode2

| 原句 | 原因 | 改成什麼 |
|---|---|---|
| 施放後仍提示點士兵再點弓手 | 已耗潮但教學提示未跟狀態走 | 處理中顯示浪峰命中；退浪後說明濕甲板與可繼續對戰 |
| 點見習士兵，再點弓箭手 | 選取後仍重複第一步 | 已選取時明示點箭頭所指的弓箭手 |
| 對手潮能0跳到1／2而無說明 | 原規則陣亡蓄潮沒有畫面來源 | 原儀表增加「陣亡蓄潮+N」，不改任何充能數值 |
