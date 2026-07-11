# Codex 回應：card mobile

版本：`card-battle-r55-v1`

## 修正

- **M-L1 P0**：手機直式取消 controls／hand／quest／log／target 五層固定堆疊。手牌改為預設收合、可展開的橫向捲動抽屜（82×116 卡）；出牌後自動收合。結束回合縮為右下角固定鈕；兩個戰場合計固定 `50dvh`，攻擊者與目標同屏。
- **M-L2 P0**：root／shell／battle／pack 全加 `viewport-fit=cover`；固定底部 UI 全納入 `env(safe-area-inset-bottom, 0px)`。
- **觸控／版面 P1**：手牌不再垂直 wrap；詳情鈕與分解鈕 44×44；互動元件加 `touch-action: manipulation`；手機卡文最小 10px；次要控制改頁內橫捲，任務／log／target 回歸頁內；首次導引會自動展開／收合手牌且不攔截被引導目標。
- **動效 P1**：`prefers-reduced-motion` 下不建立 combat ghost、傷害浮字、火花、關鍵字浮字、死亡 ghost；常駐 foil／legend／shield／target 動畫停用。開包依 reduced-motion／低規格／省流量降載。
- **開包 P1**：支援點單張翻牌與「全部翻開」；手機 reveal 卡縮為 112×158；低效能關閉背景／光柱／潮波重特效。
- 桌面規則均置於 `max-width:700px` 之外或僅加 reduced-motion 行為；`templates/card-battle/core.js` 未修改。

## 守門

- RWD 矩陣新增 **320×568**，共 10 視口／30 組；加驗 shell 內嵌 battle、safe-area 宣告、戰場 ≥50% 視高、手牌抽屜狀態，以及真點擊「攻擊者→目標」。
- E2E 新增 reduced-motion 零 FX DOM、單張點翻／一鍵全翻；完整 E2E **連跑 2 次 PASS**。
- 版本／SW／reload key／query／測試同步 r55；`rg 'r54|R54' --glob '!docs/**'`：**0 命中**（歷史審查文件保留原版本證據）。

## 驗證

- `npm test`：PASS（含 core 116/116、quality gates、balance sim）
- `npm run test:e2e`：PASS ×2
- `npm run test:rwd`：PASS，30/30 零違規
- `node scripts/test-balance-sim.js`：PASS（另獨立執行）
- `git diff --check`：PASS
- 未 commit／push。
