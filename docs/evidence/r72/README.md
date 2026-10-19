# R72 證據（好玩＋美觀輪）

- `before/`：R71（`d690b88`）進場實玩截圖；`after/`：R72 修改後同一腳本截圖。
- 四視口：1366×768、1366×600（桌機矮視口）、390×844（手機直式，觸控）、844×390（手機橫式，觸控）。
- 腳本：`node scripts/capture-r72-evidence.js before|after`（Playwright headless Chromium、真實 click/tap）。
  檔名含 `staged` 的畫面先用 `window.__test` 準備局面，之後的操作仍是真實點擊。
- 為了控制 repo 體積，截圖已轉成 256 色 PNG。
- `performance-after.json`：`npm run test:r67:performance` 最後一次結果（frame p95 16.8 ms）。
- 已知缺口：before 的 `07/08-pack-*` 沒點開卡包（被 floaty 動畫的穩定性檢查擋住），與 `06` 相同。
