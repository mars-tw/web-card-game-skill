# Card Visual r57 回報

版本：`card-battle-r57-v1`

## 完成

- battle 傳說卡實掛 `.frame-sheen`，與 pack 統一為 3px mask 邊框掃光；rare／epic 改 3px 高對比切面，靜幀仍可讀。
- 英雄 HP／法力改徑向寶石、inset 高光、細描邊與暗角；HP ≤ 25%（至少 8）加危急光。手機壓為 28px 高，零水平溢出。
- battle／pack foil 改雙層多停點青／白／紅／紫＋黃／綠／藍色散；傳說框與 foil 均受 `prefers-reduced-motion`、low-perf 停動畫覆蓋。
- P2：補凜冬暗影 art 冰晶紋；可攻擊／可打改 outline＋內圈，保留稀有度身份光。log／粒子不加重。
- `core.js` 未修改；未 commit、未 push。

## 驗證

- active source/tests `rg -i 'r56|card-battle-r56-v1|card_sw_auto_reload_r56_v1' --glob '!docs/**'`：0（歷史審查／舊回報保留原版本證據）。
- `npm test`：PASS（core 116/116；含 r57 視覺 quality gates、balance-sim）。
- `npm run test:e2e`：PASS ×2；新增傳說框 DOM／動畫、雙層 foil、英雄寶石／低血、reduced-motion 回歸。
- `npm run test:rwd`：PASS，shell／battle／pack 共 30 組零違規。
- `node scripts/test-balance-sim.js`：PASS。
- Browser QA：1280×720、390×844；手機徽章 28px、overflow-x 0，桌機／手機材質與層次確認。
