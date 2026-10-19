# R77 五圖簽核

2026-10-16。本線目視簽核與幾何守門；不是 Muse 獨立複評。PNG 均由正式根入口、真實試航出牌與兩次交換擷取，無測試狀態注入或截圖後製。原尺寸／SHA-256 見 `docs/evidence/r77-art/verification.json`。

| 1290×2796 原圖 | 無截斷 | 無殘字 | 唯一珊瑚主鈕 | 夜海水域一致 |
|---|---|---|---|---|
| `docs/store/screenshots/harbor-1290x2796.png` | [x] | [x] | [x] 開始潮汐試航 | [x] 首頁巨浪是色溫參考 |
| `docs/store/screenshots/battle-1290x2796.png` | [x] 卡名、狀態、攻血完整 | [x] 無圖庫橫條 | [x] 結束回合 | [x] 水膜與甲板共平面 |
| `docs/store/screenshots/trial-1290x2796.png` | [x] | [x] 狼與侍從仍在場 | [x] 裂潮，結束回合降為次要 | [x] 滿潮為靛紫積水 |
| `docs/store/screenshots/tide-chart-1290x2796.png` | [x] | [x] 無 −1／−2 浮字 | [x] 確認施放，底部 dock 隱藏 | [x] 保留同一戰場與水膜 |
| `docs/store/screenshots/victory-1290x2796.png` | [x] | [x] | [x] 開始五站航程 | [x] 已選夜海版本 |

另逐張檢查同五畫面的 `2064×2752` 版本：`harbor-2064x2752.png`、`battle-2064x2752.png`、`trial-2064x2752.png`、`tide-chart-2064x2752.png`、`victory-2064x2752.png`，均在 `docs/store/screenshots/`。iPad 四卡依高度放大，攻血在裝飾框上方；行動標籤與卡名有獨立垂直空間。

勝利二選一：舊版 `docs/art/compare/r77/before/victory-1290x2796.png`；採用版 `docs/store/screenshots/victory-1290x2796.png`。選擇夜海，保留原舉旗身份、浪紋旗幟與珊瑚圍巾，背景不再是黃昏。

觀潮圖中的紅色生命 1 來自前面兩次士兵交換，並非預覽先扣血。預覽前／取消後資料相同；非致命 QA 另驗證血量 2→預覽仍 2→命中後 1，英雄 9→預覽仍 9→命中後 7，見 `r77-tide.json`。不能只憑紅色數字推斷已施放。

這是無頭 Chromium 的本機圖，不是原生 iPhone／iPad 實機圖，沒有上傳商店。卡片次級行動標籤為 9–10px，完整語意另在卡片可讀名稱；本輪沒有宣稱全作文字皆完成 12pt 實機驗收。
