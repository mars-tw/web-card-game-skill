# Asset P0 回應：六張角色傳說卡立繪

日期：2026-07-14  
版本：`card-battle-r61-v1`

## 完成摘要

- 使用內建 `image_gen`，以哈爾登作共同筆觸／材質／光照基準，再用同一張風格參考生成其餘五位角色。
- 六張均為 1024×1024 PNG、單一主角、半身至 3/4 身、中上臉部安全構圖、暗氛圍背景；無文字、卡框、邊框、UI 或浮水印。
- `cards.js` 六個 `image` 欄位已接到 `../../assets/cards/<id>.png`。
- `art-config.json` 已補錄六個 prompt；`sw.js` 已加入六張預快取。
- 現有 card renderer 本來就共用 `card.image`：戰場 `renderCard`、開包 `renderRevealCard`、收藏 `renderCollection` 均會輸出 `<img>`。本輪新增 E2E 守門，直接驗證三處均載入角色 PNG，且戰場無 `art-fallback`。

## 交付圖與壓縮

| id | 檔案 | 原始 bytes | 交付 bytes | 減少 |
|---|---|---:|---:|---:|
| `heroSerHalden` | `assets/cards/heroSerHalden.png` | 2,551,846 | 147,039 | 94.2% |
| `heroMagisterVey` | `assets/cards/heroMagisterVey.png` | 2,693,831 | 143,853 | 94.7% |
| `heroScarra` | `assets/cards/heroScarra.png` | 2,499,065 | 145,561 | 94.2% |
| `heroIsoldLongdusk` | `assets/cards/heroIsoldLongdusk.png` | 2,399,505 | 148,804 | 93.8% |
| `heroRuneFrostfang` | `assets/cards/heroRuneFrostfang.png` | 2,919,655 | 141,851 | 95.1% |
| `heroMoenTidearbiter` | `assets/cards/heroMoenTidearbiter.png` | 2,330,957 | 143,324 | 93.9% |
| **合計** |  | **15,394,859** | **870,432** | **94.3%** |

壓縮採 1024×1024 indexed PNG 與最佳化 deflate；六張皆嚴格低於 150,000 bytes。品質守門允許 PNG RGB／indexed 色彩類型，並逐張檢查尺寸、大小、接線、prompt 與 SW 快取。

## 最終 prompt set

共同規格：`Fantasy trading-card art, painterly digital illustration, grounded stylized realism, dramatic single key light plus rim light, half-body to three-quarter-body, single subject centered, face and chest in upper-middle 40–70% height, about 8% dark safe margin, dark low-detail atmospheric background, square composition, no text, no letters, no card frame, no border, no UI, no watermark.`

- `heroSerHalden`：`battle-scarred human captain holding a wide tower shield horizontally across his chest, white-tide tabard, battered steel armor, night rampart behind, determined eyes, blue-gold cold light`
- `heroMagisterVey`：`calm magister in ornate purple-gold arcane robes, floating spellbook, soft echo afterimages of hand sigils, scholarly examiner vibe, violet and gold light, dark archive hall`
- `heroScarra`：`feral woman wolf-chieftain mid-charge, wolf-head pelt mantle, amber eyes, wilderness ridge at night, ember and restrained blood-trail accents, aggressive pose`
- `heroIsoldLongdusk`：`elegant pale woman of the long dusk, indigo-violet gown, silver crescent diadem, frost mist freezing a gesture mid-air, serene and melancholy, cold moonlight`
- `heroRuneFrostfang`：`frost-armored centurion with glacial tower shield engraved with abstract frostfang relief, golden divine-shield film cracking under ice edge, disciplined jailer-warden, blue ice light`
- `heroMoenTidearbiter`：`neutral tide arbiter woman with balanced scales and a glowing attunement seal, travel cloak, belt charms of salt ink fang and frost-bell, slate-blue silver palette, diplomatic calm, dark moody background`

## 顯示驗證

- 戰場：六張同時放入雙方場面，6/6 圖片完成載入，0 張 emoji fallback。
- 開包：五張角色同時進 reveal row，5/5 使用角色 PNG。
- 收藏：六張設為已擁有，6/6 收藏縮圖使用角色 PNG。
- 本機瀏覽器另檢查戰場與開包／收藏頁可正常載入、版面無破圖或阻斷錯誤。

## 版本與測試

- cache version、SW reload key、manifest/script query、測試標籤與文件已同步至 r61。
- 舊 revision 字串 `rg`（排除 `.git`、`node_modules`）為 0。
- `npm test`：PASS。
- `npm run test:e2e`：PASS ×2；兩輪皆通過新增的戰場／開包／收藏角色 PNG 斷言。
- `npm run test:rwd`：PASS；shell、card-battle、card-pack 共 30 組頁面×視口零違規。
- `node scripts/test-balance-sim.js`：PASS。

未執行 `git commit` 或 `git push`。
