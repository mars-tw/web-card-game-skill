# Card Visual r56 回報

版本：`card-battle-r56-v1`

## 完成

- 卡面：普通銀鋼、稀有藍晶光、史詩紫紋、傳說動態金箔四階框材質；費用改寶石切面，攻／血改立體徽章；無卡圖時依白潮守軍／奧術結社／荒野獸群／凜冬暗影顯示不同抽象紋理。
- 戰場：依哈爾登藍、維伊紫、斯卡拉橙切換環境與敵場色調；召喚事件以 UID 只播一次落地／衝擊光；嘲諷新增盾形 crest；法術事件新增全屏色光閃。
- 開包：包體裂紋與全屏光爆加強；稀有以上／閃卡／潮印翻開前先顯示短暫剪影；傳說框金箔掃動與潮印雙層掃光加強。
- 效能：新增動效以 `transform`／`opacity` 為主；`prefers-reduced-motion` 與低效能模式均停用全屏光、粒子／掃光、常駐框動畫並縮短入場。
- Kenney：未採用。現行深色奇幻卡面已有完整材質語言，通用 UI Pack 會使面板與按鈕風格割裂，因此維持純 CSS、未新增授權資產或 `CREDITS.md` 項目。
- `core.js` 未修改；未 commit、未 push。

## 驗證

- 舊版標記全 repo grep：0（排除 `.git`、`node_modules`）。
- `npm test`：PASS（core 116/116、quality gates、內含 balance-sim）。
- `npm run test:e2e`：PASS ×2。
- `npm run test:rwd`：PASS，shell／battle／pack 共 30 組頁面×視口零違規。
- `node scripts/test-balance-sim.js`：PASS。
- Chromium 視覺 QA：1280×720 與 390×844；三陣營色調、四階卡框、傳說金箔、稀有剪影、開包五卡排版與零水平溢出均確認。
