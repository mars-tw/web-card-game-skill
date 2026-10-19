# 裂潮卡牌｜新內容第 3 輪

狀態：VERIFIED（本機五項）；實機、真人及 Muse 獨立評分為 BLOCKED。版本 0.16.0。僅本 repo、main、本機 commit；不得派工、推送或發布。唯一驗收來源為 `docs/content/CONTENT_REVIEW_R2_MUSE.md` 的五件事。進場已修改的 R67 證據及所有未追蹤檔保留原樣。結果與逐項原尺寸圖見 `docs/CODEX_RESPONSE_CONTENT_R3.md`；全鏈及最後入口修正重驗均 exit 0。

| 三項內容 | 設計及要動的檔案 | 驗收 |
|---|---|---|
| 六道潮汐殘局 | `tide-puzzles.js` 動作句、明確錯序說明；`battle.js` 失敗回顧與六種卡圖構圖；內容樣式 | 六題各遊玩／錯序／完成 390×844 圖，另留立即重試；不靠標題的卡圖組合兩兩不同。失敗不增加進度，重試恢復盤面；真操作完成並存檔。 |
| 潮汐預報 | `battle.js` 第 2 回合高亮、點下確認、反轉結果；已過回合可點看鎖定原因但不能改動；內容樣式及 HTML | 教學前／點下／改後三張連續圖；鎖定原因、錯向零消耗、僅一次、第四回合自由、重載與匯出入都實測。 |
| 茉恩的退潮考驗 | 既有茉恩畫作接入中段，生成貝盾完整／裂開圖集；`battle.js` 真護盾狀態、受擊框及壓迫回饋；內容樣式 | 390×844 破盾前後不讀指令也能分辨；己方四張完整可點；浪牆蓄勢／命中／退去三格及原始時序、拖延反攻、完成與重載。 |

共用驗收 4：完成與失敗卡片、錯誤提示置中且不裁切；改掉不順文案。共用驗收 5：港口、五站、研習逐字使用「六道潮汐殘局」「潮汐預報」「茉恩的退潮考驗」；戰績頁一行說明研習不計勝敗。預計修改 `templates/harbor.html`、`card-pack/index.html`、`card-pack/pack.js`、`card-battle/index.html`、`battle.js`、`tide-puzzles.js`，新增 `content-r3.css`。

證據：`docs/content/r3/phone-<內容>-<狀態>.png` 為原尺寸 390×844；逐項證據索引寫入交付報告。商店新增 1290×2796 與 2064×2752，不覆寫舊圖。美術沿用 ART_DIRECTION／PROMPTS 前綴，生成工具記實際 `image_gen.imagegen`，保留原圖、提示詞與 SHA-256。

測試：先讀既有 npm scripts，保留所有斷言；新增規則與無頭 DOM 操作測試並接進 npm 鏈。依序執行 `npm test`、`npm run test:e2e`、`npm run test:rwd`、CI 效能及三跑 p95；單瀏覽器、測完即關。測試覆寫的舊證據先備份，產出歸檔後逐位元組還原進場狀態。同步 package／lock／PWA revision、版本檢查、秘密掃描零命中、語法檢查、PNG 尺寸驗證。

BLOCKED 邊界：實體 iPhone／Android／iPad、真人試玩、Safari 原生包、Muse 獨立複審及 8 分尚需外部人員／裝置。正式人物 attack／hurt／death 姿勢素材未齊，保留替換管線，不以整卡位移冒稱角色動畫。並發載效能僅供參考。
