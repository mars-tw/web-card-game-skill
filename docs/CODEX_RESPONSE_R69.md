# CODEX_RESPONSE R69

實作：Claude subagent（Codex 額度封鎖至 7/24）

## 摘要

R69 三箭：掃描 P0 修正（橫向手牌 z 層級死鎖、開包迷你內窗、44px 批次前 20 大）＋
程序化美術（稀有度語言統一/徽記對比/戰場同語言）＋遊戲內容（結算三層資訊層次）。
版本 `card-battle-r67-v1` → `card-battle-r69-v1`。

## P0 修正

### P0-1 844×390 橫向手牌 0/12 可點（menuscan 唯一 P0）
- 根因：R64 給 `.player-hero-row` z-index:75（護 hint 鈕可達性），行動抽屜 `.hand-drawer`
  z-index:70 展開時與英雄列幾何重疊，全部手牌互動被英雄列吃掉。
- 修法：抽屜 z 70→76（仍低於 command dock 82／settings 96；收合時 height:0＋
  pointer-events:none 不影響英雄列；出牌/選目標時抽屜本就自動收合，targeting 不受影響）。
- 佐證（before 實測）：`docs/evidence/r69/before_battle_drawer_844x390.png`，
  elementFromPoint 12 元素 0 命中（蓋住者 `.hero-row.player-hero-row`）。
- 防回歸：`test-controls-reachability.js` 新增負向斷言——touch 視口抽屜展開後
  6 卡＋6 詳鈕逐一 elementFromPoint 必中自身＋真實 `locator.click()` 出牌成功
  （Playwright actionability 會在被蓋時逾時失敗）。

### P0-2 開包頁迷你內窗（390×844 內窗 175px／844×390 116px vs 內容 538-622px）
- 根因：行動斷點沿用桌機 app-shell 等分 grid，5-6 區塊硬塞一屏→三層巢狀捲、CTA 初窗外。
- 修法（`@media (max-width:700px), (max-height:560px)`）：`.pack-main` 成為唯一頁級捲動欄
  （頁本身仍零捲動、零水平溢出），區塊隨內容伸長；長清單內捲上限改 dvh 語言
  （deck-panel 62dvh、收藏格 64dvh）；reveal 卡尺寸 `clamp(84px, 20dvh, 112px)` 隨視口伸縮；
  open-panel 保底 `min(52dvh, 480px)`。桌機格線不動。
- RWD 守門同步演進：可捲容器「鏈」判定（鏈上任一容器完整可見即可達），
  十視口 card-pack 全數零違規（頁捲 0px、水平溢出 0px）。

### P0-3 44px 批次（157 實例中的主流程前 20 大選擇器）
戰鬥內：`.quest-claim`/`.quest-claim-all`（40×29→44）、設定面板 8 控件（select/checkbox
22px＋label 44/range/audio）、`.detail-keyword`、`.chapter-claim`×16、`.mission-item button`、
英雄攻擊目標（`.hero::after` 偽元素擴命中區、不動列高）。
開包/商店主流程：`.goal-item button`＋`#weeklyClaimBtn`、`.filter-chip`×32（偽元素垂直擴到
44px、視覺膠囊不變）、`.record-head button`、`.record-tools select`、`.deck-actions button`、
`.deck-add/remove-btn`、`#collectionSearch`/`#deckSearch`、`.filter-panel summary`、
`.top-actions button`、`.volume-field input`。
原則：padding/hit-area 擴大優先，視覺尺寸不放大（chip/英雄用偽元素）。

## 美術（生成工具未連線：程序化/CSS 打磨）

- ART-1 稀有度語言統一：pack 頁 rare/epic 邊框漸層改用與 battle 頁完全一致的字串；
  光暈梯度統一 common 無光 → rare 17px 藍 → epic 21px 紫 → legendary 金箔掃光＋呼吸光。
- ART-2 faction-emblem：徽記補暗色徑向底暈＋雙層 drop-shadow（兩頁同步），
  亮色卡面/64px 縮圖可辨陣營；R61 hero-art 守門 selector（`img:not(.faction-emblem)`）未動，
  r67-browser 徽記載入閘照常通過。
- ART-3 戰場同語言：戰場格線/內暈由中性白改注入 `--accent`（我方）與
  `--opponent-tone`（敵方）色混，與卡面陣營漸層、輪換戰場圖同一色彩語言（非換色占位）。

## 遊戲內容（R68 裁決精神、非 Codex 佇列項）

- CT-1 結算三層資訊層次（battle.js showOverlay＋CSS）：
  ① 本場戰報 chips（⏱ 回合數 `game.turnCount`、❤️ 我方剩餘 HP、🎯 難度）
  ② 獎勵主視覺（金幣行 20px 發光）
  ③ 次要 meta（戰績/難度獎勵/動態調節）縮階 12px 分隔線群組，hint 收尾。
  Codex 佇列項（C-01 preview／D-01 long-press／A-01／A-02）未觸碰。

## 閘門輸出（實跑數字）

- `npm test`：PASS 131 / FAIL 0，exit 0（含 quality-gates 版本一致性、r67 視覺靜態閘）。
- `test-rwd-matrix.js`：30/30 頁面×視口零違規（頁捲 0px、水平溢出 0px；card-pack 稽核 189 元素）。
- `test-controls-reachability.js`：六視口 186 ✓ / 0 ✗，exit 0（含新增 R69 P0-1
  斷言：390×844 與 844×390 抽屜手牌逐卡 6/6、詳鈕 6/6、真實 click 出牌成功）。
- `test-battle-e2e.js`：288 ✓，exit 0；`test-r67-browser.js`：exit 0。
- P0-1 實測（12 卡場景）：844×390 elementFromPoint 命中 0/12 → **12/12**；390×844 維持 12/12。
- P0-2 實測：open-panel 內窗 390×844 175px→618px、844×390 116px→302px（reveal 622→210px
  單列 dvh 縮放）；CTA 開包後即在流內可達；1366×768 桌機格線不變（290→284px，設計不動）。
- 版本：`card-battle-r69-v1`；舊版號 grep（程式碼區）0 命中；sw.js/三頁/manifest 參數一致。
- 秘密掃描（sk-proj/sk-40/xai-20，排除 .git/node_modules）：0 命中。
- 效能：本機數字僅參考（audiodg 機況污染），未變更渲染主迴圈，CSS 僅增少量
  color-mix 靜態背景與偽元素命中區，無新增常駐動畫。

## 守門演進（兩處，附理由）

1. `test-rwd-matrix.js`：可捲容器判定改「鏈」制——鏈上任一可捲容器完整可見即可達
   （對應 pack 行動版單欄捲動殼；頁級捲動歸零與水平溢出鐵律不變；無捲動宿主的
   CLIPPED/PAGE_SCROLL 判定照舊）。
2. `test-controls-reachability.js`：抽屜展開 audit 排除 `#hintBtn`——抽屜為底部面板、
   z 高於棋盤層是 P0-1 的修復本身；橫向矮視口幾何上必然蓋住 hero-row 的 hint 鈕，
   收合即恢復（收合態全量 audit 照跑）。同段新增手牌逐卡命中＋真實 click 負向斷言。

## 證據（docs/evidence/r69/）

- before/after_battle_drawer_390x844 / 844x390（P0-1：0/12 → 12/12 命中）
- before/after_pack_390x844 / 844x390 / opened_*（P0-2：內窗 175/116px → 隨視口伸縮單欄）
- before/after_battle_board_1366x768（ART-3 戰場同語言）
- before/after_result_overlay_390x844（CT-1 結算層次）
- 歷史 evidence（R63-R67）未動。

## 殘留風險 / 缺件

- menuscan 外部掃描的 `small` 清單以 getBoundingClientRect 量測：filter-chip／英雄採偽元素
  擴命中區，rect 仍 <44（實際命中區已 ≥44）；如需帳面歸零需放大視覺，待裁決。
- 44px 批次餘量：牌組編輯 109 控件中的 chip 以偽元素處理；`#log` 橫向 display:none
  無替代入口（掃描 P1）尚未修，列 R70。
- 開包頁 844×390 為單欄縱捲（內容多必然捲動）；如老闆堅持橫向也零捲動，需砍區塊改分頁。
- 生成美術工具（gpt-image-2／Blender MCP）未連線，本輪僅程序化打磨；高品質卡面/戰場圖
  仍待產線恢復後補。
- 機況 flake（非本輪引入）：1920×1080 shell swatch `locator.focus` 冷啟偶發 30s 逾時
  （實測 1/3；與本輪 diff 無關、重跑即過；audiodg 污染機）。列觀察，未改守門容忍度。
- `test-r67-browser.js` 每次執行會覆寫 docs/evidence/R67/after/*.png 與 gates JSON
  （bit 級差異）；本輪已 `git checkout --` 還原、未入 commit。後續輪次跑該閘後需留意還原。
