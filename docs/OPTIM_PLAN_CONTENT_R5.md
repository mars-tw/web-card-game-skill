# 裂潮卡牌｜新內容第 5 輪計畫

狀態：VERIFIED（本機五項驗收、全部 E2E 腳本分段通過）；本計畫先以 PREPARED 建立，再依證據讀回更新。2026-10-19 執行 2026-10-18 工作單。只在本 repo `main` 修改並本機提交；不派工、不推送、不部署。唯一驗收清單為 `docs/content/CONTENT_REVIEW_R4_MUSE.md` 的五件事；Muse 8 分以上須由獨立複審取得。

## 三項設計、驗收與檔案

| 內容 | 設計與驗收 | 預計檔案 |
|---|---|---|
| 六道潮汐殘局 | 六題以合法六題 ID 計數，永不超過 6/6；複驗獨立 0/1，研習六題下方常駐入口，鎖定時顯示開啟條件。六題各用真操作取得遊玩／失敗／重試／完成四張 390×844 原圖。第 2～6 題只給目標與一行情境；無操作失敗不捏造行動。 | `tide-puzzles.js`、`battle.js`、`harbor.html`、`index.html`、R5 CSS、單元與 E2E |
| 潮汐預報 | 入口改為目標句；錯誤回饋區分時機和方向。第四回合敵狼、己騎士與兩張潮向選擇同屏，零遮擋；收合後保留可點方向控制。補真實按下／放開、鎖定、錯方向零消耗及完成、存檔驗證。 | `tide-puzzles.js`、`battle.js`、R5 CSS、E2E |
| 茉恩的退潮考驗 | 沿用已生成的完整盾與破盾畫作，核對同騎士同血量、裂紋碎片跨卡框；三格浪牆時序及拖延後果均真操作。加入反映 navigator.onLine 的離線標示，真停網後進場、完成、重載。 | `battle.js`、`index.html`、R5 CSS、E2E、`sw.js` |

## 五件事的證據與交付

1. 港口 6/6 封頂與複驗 0/1；研習鎖定／解鎖入口直接進複驗。
2. 六題各四態圖，失敗圖含銅框錯序卡和缺少步驟。另測六題未操作即結束回合。
3. `phone-forecast-fourth-choices.png` 與 `phone-forecast-fourth-collapsed.png` 都量測卡片不被面板遮擋，收合後仍可選方向。
4. `phone-study-forecast.png` 入口無操作順序；實際錯方向／錯時機圖附明確診斷。
5. `phone-moen-shield-before.png`／`after.png` 原尺寸同血量；離線進場圖有狀態列且與完成圖不同。

`docs/content/r5/review-set/` 精選 15 張原尺寸手機直式圖，三項各五張，每項至少三張對戰進行中；動態用連續 2～3 格。其他驗收圖留 `docs/content/r5/` 並於報告逐項索引。商店新增 1290×2796、2064×2752 原生 DPR 圖，不刪舊圖。

## 品質閘門與保護

- 已存在的未提交 R67 gate、所有未追蹤檔和歷史證據先備份雜湊；歷史測試輸出歸檔本輪後逐位元組還原，不覆蓋他人工作。
- 沿用 `ART_DIRECTION.md` 的海事暮紫、月白與珊瑚銅，重用既有合格生成美術；本輪若無新素材需求則新增美術為 0，不用色塊或 emoji 充數。
- 沿用可替換姿勢管線；缺 attack／hurt／death 正式幀照實列 BLOCKED，不以整卡位移冒充角色動畫。
- 使用 game-engine、Playwright 與 speak-human-tw（核心規則 mode 2）指引。全程無頭，單一 server，context 用完即關。
- 加入 R5 單元／瀏覽器測試，執行 `npm test`、`npm run test:e2e`、`npm run test:rwd`、既有三跑效能及本輪 p95 ≤18ms（並發載參考）。既有測試不刪、不放寬。
- bump 0.18.0 與 PWA revision，秘密掃描零命中，明確路徑 staging，本機繁中 commit。
- 實體裝置／Safari、真人親子試玩、乾淨機況效能和 Muse 分數列 BLOCKED，說明所需證據。
- 收尾 `docs/CODEX_RESPONSE_CONTENT_R5.md`：三項入口玩法、五項圖路徑、測試、Apple 4.3 風險與缺件。

## 執行讀回

五項原尺寸證據與 15 張精選已完成；R5 單元 41 PASS、瀏覽器 86 PASS；RWD 33/33、p95 三跑中位 16.8ms（並發載）、秘密 0 命中。18 支 E2E 全項已驗證：前 13 支於完整鏈通過，精確按鈕數量改為 13 並增加入口斷言後，後五支逐一重測通過；完整 npm 程序原 exit 1 留存，沒有改稱單次完整程序 exit 0。詳見 `docs/content/r5/e2e-constituents.json` 與收尾報告。實機、真人、正式人物姿勢幀與 Muse 分數仍 BLOCKED。
