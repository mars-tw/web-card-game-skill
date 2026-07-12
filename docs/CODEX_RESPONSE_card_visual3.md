# Card Visual r58 回報

版本：`card-battle-r58-v1`

## 完成

- battle 命名展示盤產品化：`legendTauntFoil`、`heroCritical`、`fourRarityHand`、`threeOpponents`。可用 `?capture=<pose>` 一鍵載入，或呼叫 `window.__capture.pose(name)`；固定牌、血量、foil 與材質峰值，不靠抓動畫幀。
- pack 海報幀產品化：`suspense`、`legendPeak`、`foilPeak`。同樣支援 `?capture=<frame>` 與 `window.__capture.freezeReveal(name)`；會清除 reveal timers、停止動畫並固定黑影／金柱／虹彩峰值。
- P1 英雄列完成：頭像加入徑向陣營底、雙圈描邊、inset 高光與色暈；hero-row 補多層列底、內高光與暗角。手機／矮視口同步壓縮。
- capture 靜幀、傳說框與 foil 均受 reduced-motion／low-perf 無動畫覆蓋；新增 quality gate + 真瀏覽器 e2e。
- cache、SW key、資源 query、測試標籤全同步 `r58`；active source/tests 舊版字串 grep 為 0。`core.js` 未修改；未 commit、未 push。

## 驗證

- `npm test`：PASS（core 116/116；R58 quality gates；balance-sim）。
- `npm run test:e2e`：PASS ×2；命名 battle pose、英雄框、pack 三海報幀與 reduced-motion 全通過。
- `npm run test:rwd`：PASS；shell／battle／pack 10 視口，共 30 組零違規。
- `node scripts/test-balance-sim.js`：PASS。
- Browser QA：battle `legendTauntFoil` 與 pack `legendPeak` 實頁確認；動畫皆 `none`、水平溢出 0、console/page error 0。
