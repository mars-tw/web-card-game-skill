# OPTIM_PLAN R69（美術＋遊戲內容＋選單/裝置 P0 修正）

2026-07-19。實作：Claude subagent（Codex 額度封鎖至 7/24）。
輸入：menuscan card 章節（19 畫面×2 視口實測）＋ OPTIM_PLAN_R68 裁決殘項＋ game-optimization-round 固定閘門。
套用技能：game-optimization-round（八大面向逐項檢視，本輪聚焦：按鈕/選單/美術/腳色樣子/戰鬥回饋）。

## A. 掃描 P0（必修）

| id | 內容 | 驗收標準 |
|---|---|---|
| P0-1 | 844×390 橫向：`.player-hero-row` z-index:75 蓋在手牌抽屜 z-index:70 之上，抽屜展開後 12 個互動元素（6 卡＋6 詳鈕）elementFromPoint 全 miss | 修 z 層級根因（抽屜展開時高於 hero-row、收合時 height:0 不影響）；`test-controls-reachability.js` 新增「抽屜展開後手牌逐卡 elementFromPoint 命中＋真實 click 出牌」負向斷言，844×390 與 390×844 全綠 |
| P0-2 | 開包頁行動版（≤700w 與 ≤560h 橫向）grid 把 5-6 區塊硬塞一屏，內窗 89-175px 三層巢狀捲、開包 CTA 初窗外 | 行動斷點改單一捲動欄（`.pack-main` 為唯一頁級捲動容器），區塊隨內容伸長、長清單內捲上限改 vh/dvh 語言；390×844 / 844×390 / 1366×768 三視口 RWD 稽核零違規、開包後 5 卡與「再開一包」CTA 可達 |
| P0-3 | <44px 控制 157 實例中修主流程前 20 大選擇器 | 詳下表；`test-controls-reachability.js`＋RWD 矩陣全綠、e2e 不回歸 |

### P0-3 44px 批次（依掃描實例數排序，戰鬥＋商店/開包主流程優先）

| # | 選擇器 | 掃描尺寸 | 修法（hit-area 優先，不必放大視覺） |
|---|---|---|---|
| 1 | `.mission-item button`（58 例大宗） | 330×31 | min-height:44 |
| 2 | `.goal-item button` / `#weeklyClaimBtn` | 330×31 | min-height:44 |
| 3 | `.filter-chip`（32 例） | 38×24 | 保持視覺、::after 垂直擴 hit-area＋min-height 提升 |
| 4 | `.chapter-claim`（16 例） | 322×33 | min-height:44 |
| 5 | `.quest-claim` ×3 | 40×29 | min-height:44、min-width:64 |
| 6 | `#questClaimAllBtn` | 64×27 | min-height:44 |
| 7 | `#ddaToggle` / `#aiThoughtToggle`（16×16） | 16×16 | 包裹 label min-height:44＋checkbox 22px（label 即 hit-area） |
| 8 | `#difficultySel` / `#opponentSel` | 65×29 | min-height:44 |
| 9 | `#perfModeSel` / `#textSizeSel` | 48×27 | min-height:44 |
| 10 | `#audioToggleBtn` | 334×34 | min-height:44 |
| 11 | `#audioVolumeRange` / `#packAudioVolumeRange` | 129×32 | min-height:44 |
| 12 | `#recordDifficultyFilter` / `#packTextSizeSel` | 88×35 | min-height:44 |
| 13 | `#copyRecordBtn` / `#clearRecordBtn`（record-head/ghost） | 85×31 | min-height:44 |
| 14 | `.deck-actions button`（自動補滿/模板/儲存/清空） | 90×34 | min-height:44 |
| 15 | `#collectionSearch` / `#deckSearch` | 348×30 | min-height:44 |
| 16 | `.filter-panel summary` | 800×26 | min-height:44（padding） |
| 17 | `.detail-keyword` | 64×31 | min-height:44 |
| 18 | `#enemyHero` / `#playerHero`（攻擊目標） | 98×28 | position:relative＋::after inset 擴 hit-area（不動列高） |
| 19 | `.deck-add-btn` / `.deck-remove-btn` | 42 寬 | min-width/min-height:44 |
| 20 | `.quest-claim-all`（quest-panel 頭） | 64×27 | min-height:44 |

## B. 美術（生成工具未連線：純程序化/CSS 打磨）

| id | 內容 | 驗收標準 |
|---|---|---|
| ART-1 | 稀有度視覺語言統一：battle 與 pack 兩頁卡框梯度/光暈不同步（rare/epic 邊框漸層色停不同、pack 無分級光暈強度） | 兩頁 rarity-common/rare/epic/legendary 邊框漸層字串一致；光暈梯度 common 0 → rare 17px → epic 21px → legendary 呼吸光同語言；grep 兩檔梯度一致 |
| ART-2 | faction-emblem 64px 可辨識度：亮色卡面上徽記對比不足 | 徽記加暗色半透明底暈＋雙層 drop-shadow；不動 R61 hero-art 守門 selector（`img:not(.faction-emblem)`） |
| ART-3 | 戰場與卡面同語言：戰場格線一律中性白，與對手色調/陣營語言脫節 | 戰場（敵/我）格線與內暈注入 `--opponent-tone` / `--accent` 色混，禁純換色占位；e2e 視覺不回歸 |

## C. 遊戲內容（R68 裁決精神、非 Codex 佇列；C-01/D-01/A-01/A-02 不碰)

| id | 內容 | 驗收標準 |
|---|---|---|
| CT-1 | 結算畫面資訊層次：resultStats 現為 7 行同級文字流，戰報/獎勵/雜訊混排 | 改三層結構：①本場戰報 chips（回合數 `game.turnCount`、我方剩餘 HP）②獎勵主視覺（金幣行放大）③次要 meta（戰績/難度/動態調節）縮階＋hint 收尾；CSS 層級可驗、e2e 不回歸 |

## D. 固定閘門（全過才算完）

- `npm test` 全綠；`test-battle-e2e.js`、`test-rwd-matrix.js`、`test-controls-reachability.js` 全綠（本機效能數字僅參考；audiodg 機況污染）。
- 版本 bump `card-battle-r67-v1` → `card-battle-r69-v1`；grep 舊版號歸零（docs 除外）；SW 快取版本一致。
- 秘密掃描 `sk-proj-…|sk-…40|xai-…20` 零命中（排除 .git/node_modules）。
- 證據 before/after 三視口（390×844、844×390、1366×768）入 `docs/evidence/r69/`；歷史 evidence 不動。
- 報告 `docs/CODEX_RESPONSE_R69.md`；main 分支繁中 commit，不 push。
