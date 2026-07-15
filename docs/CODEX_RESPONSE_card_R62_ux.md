# card R62 UX/RWD 重設計回報

## 稽核對照

- A. 手機 Command Dock：完成。手機底部固定 safe-area HUD，左側保留重抽/結束回合主行動，中間為手牌抽屜把手與張數，右側「更多」收合次要操作；移除手機橫向長控制列。
- B. 設定抽出：完成。難度、對手、動態調節、AI 思路、效能、文字、SFX 移到右上齒輪就地面板。主列保留短行動列，提示改在英雄旁燈泡。
- C. 桌機填滿：完成。對戰 `.board` 與卡包 `.pack-main` 改為 `clamp()` 視口寬度，卡牌尺寸隨桌機寬度放大，降低兩側留白。
- D. 篩選 diegetic 化：完成。卡包收藏與牌組編輯器篩選改為 chip rows；手機收藏篩選壓成緊湊兩欄 chip 面板，移除冗長 select。
- E. 點物件就地操作：完成。指定型法術/戰吼先點場上目標，再於該卡浮出「確認 / 取消」；提示由玩家英雄旁小燈泡觸發。
- F. 手機直式戰場擴容：完成。手機 `.battlefield` 改為 flex 可成長，底部 dock 與手牌抽屜共用高度預算，避免雙重壓縮。

## 主要改動檔案

- `templates/card-battle/index.html`
- `templates/card-battle/battle.js`
- `templates/card-pack/index.html`
- `templates/card-pack/pack.js`
- `scripts/test-battle-e2e.js`
- `scripts/test-rwd-matrix.js`
- `index.html`
- `templates/index.html`
- `sw.js`
- `package.json`
- `package-lock.json`

## 截圖證據

- `docs/evidence/R62_ux/mobile_battle_command_dock_390x844.png`
- `docs/evidence/R62_ux/desktop_battle_settings_1440x900.png`
- `docs/evidence/R62_ux/desktop_pack_filter_chips_1366x768.png`

## 驗證

- `npm test`：通過。
- `npm run test:e2e`：通過。
- 秘密掃描：通過，零命中（排除 `.git` / `node_modules`）。
- 版本：`0.4.6`，快取版本 `card-battle-r62-v1`，SW reload key `card_sw_auto_reload_r62_v1`。

## R62 RWD regression fix

- 修正 pack 頁收藏篩選 chip 在 390/360/320 與 844x390 視口把內容推到 fold 外的迴歸。
- 390px 手機改為單列固定高度橫向捲動 chip 軌道；<=360px 與 <=400px 高度 landscape 預設收合篩選，保留可展開面板。
- 補 tablet battle board 寬度限制，避免 RWD 閘在 820/768 視口出現水平溢出。
- 版本 bump：`0.4.7`；PWA cache key 維持 `card-battle-r62-v1`。
- 驗證：`npm run test:rwd` 全矩陣通過，30 個頁面×視口零違規、頁捲 0、水平溢出 0。
