實作者：OpenAI Codex（GPT-5）

# Card R70 真人試玩修正回報

## 六項修正與驗證

1. **P1 R1-B01｜手機橫向卡中心誤開詳情**
   - 將 touch 視口的 `.card-info-btn` 收斂到卡面右上 `32×32px`、`top:0/right:0`，不再覆蓋實測約 `66×86px` 場上卡中心；卡片根節點仍負責選攻擊者／出牌。
   - Playwright `844×390` 以真實 click 驗證：點場上卡正中心會選取攻擊者且詳情保持關閉；點右上明確小區仍能開啟詳情。

2. **P1 R1-B02｜手牌抽屜蓋住可見提示鈕**
   - touch 模式開啟手牌抽屜時，`#hintBtn` 同步設定 `hidden`、`aria-hidden="true"`、`tabIndex=-1`；抽屜關閉即恢復。
   - reachability 在 `390×844`、`844×390` 驗證「可見就能由 `elementFromPoint` 命中，否則必須明確隱藏且移出焦點序」。

3. **P1 R1-B03｜手機收藏篩選成 1949px 單橫列**
   - compact 視口改成可換行的雙欄 grid；狀態與排序提到最前並各占整列，關鍵字獨占整列，chip 維持 `44px` 可觸高度，面板本身改為垂直捲動。
   - RWD 守門在 `390×844`、`844×390`、`1366×768` 驗證 filter board 無水平溢出、「已擁有」位於初始可見範圍，並以真實 click 確認篩選狀態切換。

4. **P1 R1-B06｜新帳號無法組合法自訂牌組**
   - 新存檔首次進入卡包時配置 10 種普通基礎卡各 2 張，共 20 張可編輯收藏；僅在收藏 storage key 不存在時種入，不覆寫既有玩家收藏。
   - E2E 清空 localStorage 建立新帳號，確認 `10 種／20 張`，再由真實「自動補滿 → 儲存牌組」流程存下合法 20 張自訂牌組。

5. **P2 R1-B04｜STEP 1「我知道了」只重新聚焦**
   - `#guideHintBtn` 改為執行 `stopGuide(true)`，真正關閉導引並記錄已確認；同步修正可及名稱。
   - E2E 驗證 modal 關閉、guide inactive、完成旗標寫入，且原有「略過教學」與完整三步導引斷言均保留。

6. **P2 R1-B05｜神祕卡包 CTA 排到第 11**
   - 將 `open-panel` DOM 順序移到長線目標／戰績之前；既有 CSS grid area 保持桌面視覺版面不變。
   - reachability 從入口控制真實 Tab，確認卡包 CTA 在第 4 個焦點內，且早於複製戰績與 PWA 維護工具；Enter 仍可開包。

## 守門結果

- `npm test`：通過；cards、core `131/0`、quality、balance、R67 static 全綠。
- `npm run test:e2e`：通過；battle E2E、controls reachability、R67 browser 全綠。
- `npm run test:controls`：獨立通過；六個桌機／touch 情境無 console/page error。
- `npm run test:rwd`：通過；3 頁 × 11 視口，共 33 個頁面視口組合全數零違規。
- R69／R69.1 既有斷言未弱化；R70 新增中心 tap、抽屜提示、手機篩選、新帳號牌組、教學確認與 CTA Tab 順序控制。
- `git diff --check`：通過。
- 舊版號掃描：`card-battle-r69-v1`、`card_sw_auto_reload_r69_v1`、`0.4.14` 在現行程式區域合計 0 命中（歷史 docs 排除）。
- 秘密格式掃描：R70 交付文字檔 0 命中。

## 版本鏈

- package：`0.4.14 → 0.4.15`（`package.json` 與 `package-lock.json` 一致）。
- PWA/SW：`card-battle-r69-v1 → card-battle-r70-v1`。
- 自動重載守衛：`card_sw_auto_reload_r69_v1 → card_sw_auto_reload_r70_v1`。
- 根入口、templates shell、battle、pack、SW 與 E2E 版本斷言已同步。

## 證據

- Before：`docs/evidence/r70/before/`
- After：`docs/evidence/r70/after/`
- 每側包含 `390×844`、`844×390`、`1366×768` 的 battle center、battle drawer、pack filters，共 9 張；R67 等歷史 evidence 未保留任何覆寫。
- 可重跑：`node scripts/capture-r70-evidence.js before|after`

## 殘留與提交界線

- 已知功能殘留：無。
- 未納入 `docs/audit_openclose/`、`docs/playtest/`、`scripts/audit-oc-r1.js`；這些既有／使用者檔案保持未追蹤。
- Commit：本報告隨 R70 file-scoped commit 提交；hash 見最終交付輸出。未 push。
