實作者：OpenAI Codex（GPT-5）

# Card R69.2 守門精度強化回報

版本：`0.4.15 → 0.4.16`；PWA／SW：`card-battle-r70-v1 → card-battle-r71-v1`。

## 六項逐條修法

1. **R69.1-02｜`inVp===true` 遮擋短路**
   - `test-rwd-matrix.js` 的 viewport 內路徑現在也必做中心 `elementFromPoint`，接受自身、子孫或同一 label 宿主。
   - 若中心遭遮擋且存在 scroll chain，必須再以真實置中捲動移離 sticky／fixed 遮擋並重新命中；沒有 scroll chain 或實捲後仍 miss，分別記為 `VIEWPORT_HIT_FAIL`／`VIEWPORT_SCROLL_HIT_FAIL`，不再幾何假綠。

2. **R69.1-07｜`height >= 43.5` 灌水 pass**
   - 完全移除 `skip`／`assert(true)` 路徑。每個英雄與 chip 都必須同時通過中心對齊 `44×44px` 幾何、水平左右命中與偽元素外緣命中。
   - CSS far/right 邊界採「量測邊界內 1.5 CSS px」打點，另以獨立幾何斷言保證完整 44px，不以採樣內縮取代尺寸要求。

3. **R69.1-01｜RWD-CHAIN 幾何前置過濾**
   - 刪除 `scrollHosts.some(host 完整可見)` 前置條件；viewport 外且有捲動鏈的控制一律 `scrollIntoView({block:'center', inline:'center'})`，再以新位置做 `elementFromPoint`。
   - `center` 能驅動巢狀 scrollport，亦能處理幾何已在 viewport 但被固定層遮住、`nearest` 不會移動的情況；仍命不中才紅燈。

4. **R69.1-04｜偽元素只抽上下中線、pad cap 6**
   - 直接讀取 `getComputedStyle(el, '::after')` 的 top/right/bottom/left，計算偽元素實際框；不再用 cap 6 的估算 pad。
   - 每顆控制抽 8 點：中心對齊 44px 框的左／右／上／下外緣，以及偽元素實際框的左／右／上／下外緣；viewport 或 overflow 祖先裁切、被相鄰控制／浮層吃點都硬失敗。

5. **R69.1-05｜Z-DRAWER 合成 class＋z 數值**
   - 測試以確定性泰坦致死場景起步，但結算必須由真實 click 場上卡、真實 click 手牌抽屜開關、真實 click 敵方英雄觸發；等待遊戲自行進入 `game.over` 並顯示勝利 overlay，完全不再用 `classList.add('show')` 合成。
   - 除保留 z 關係外，新增 overlay／命中元素 computed `pointer-events !== none`、手牌座標 `elementFromPoint` 必落 overlay、實際 `pointerdown` probe 必為 overlay 1 次／drawer 0 次；最後以真實「再戰一場」CTA 還原。

6. **R69.1-10｜兩份 sample 規則漂移**
   - battle hero 與 pack chip 統一呼叫 Node 端唯一 `samplePseudoHitTarget`；Playwright `locator.evaluate` 將同一函式序列化到各 iframe，pack 已無內聯副本，規則只有一個來源。

## 守門變嚴後發現的真實遊戲缺陷

有，共三族，均已修遊戲端：

1. **844×390 英雄外緣不可命中**：敵方英雄 44px 上緣越出 viewport、下緣被 enemy battlefield 疊層吃掉。修正 touch 矮視口 board 頂距 `3→8px`、`.hero-row` 建立 `z-index:2` 疊層並明確啟用英雄偽元素 pointer；修後敵／我英雄八點全中。
2. **chip 水平不足、裁切與互蓋**：矮桌機收藏 chip 約 `38×26px`，舊左右 ±2px 僅約 42px；首顆 chip 外緣也被 scrollport 裁切，4px gap 使相鄰偽命中區互蓋。修正為寬高任一短邊都對稱補到至少 44px、chip 列四向 padding、8px gap、明確 z/pointer；六視口 collection/deck chip 八點全中。
3. **矮桌機 footer 被 command dock 遮住**：三個高度 media query 的單值 padding 清掉 base 底部避讓。三個斷點改為保留 `desktop-command-dock-h + safe-area + 8px`；新 in-viewport 遮擋 gate 在 1440×780、1366×600、1280×640、1024×768 等視口全綠。

## Gate、版本與證據

- `npm test`：PASS；cards/core `131/0`，quality、balance、R67 visual 全綠。
- `npm run test:controls`：PASS；6/6 視口，四向八點與真實結算 pointer gate 全綠。
- `npm run test:rwd`：PASS；3 頁 × 11 視口＝`33/33` 零違規，頁捲／水平溢出皆 0。
- `npm run test:e2e`：PASS；Stage 5、真 SW 離線、內含 reachability 與 R67 browser 全綠。
- `git diff --check`：PASS。
- active 舊版號 grep：`card-battle-r70-v1`、`card_sw_auto_reload_r70_v1`、`0.4.15` 零命中（排除歷史 docs／node_modules）。
- 秘密格式掃描：本輪 file-scoped 交付檔零命中。
- 證據：`docs/evidence/r69_2/README.md`、`gate-results.json`；E2E 產生的 R67 歷史證據已還原，未混入本輪。
- R69／R69.1／R70 既有斷言未移除或放寬；本輪只新增實際命中、實捲、四向外緣、pointer 與真實流程條件。

## 殘留與提交界線

- 已知本輪功能／守門殘留：無。
- `docs/audit_openclose/`、`docs/playtest/`、`scripts/audit-oc-r1.js` 是進場前既存未追蹤檔，未修改、未納入提交。
- Commit：本報告隨 R69.2 file-scoped commit 提交；hash 見最終回報。未 push。
