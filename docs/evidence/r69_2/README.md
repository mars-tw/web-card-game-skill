# Card R69.2 守門精度強化證據

驗證日期：2026-07-22（Asia/Taipei）

版本：`0.4.16`／`card-battle-r71-v1`／`card_sw_auto_reload_r71_v1`

## 加嚴後首次命中的真實缺陷

1. `844×390` 敵方英雄視覺框約 `98×28px`、偽元素框約 `110×44px`，但 44px 上緣落出 viewport、下緣由 `.battlefield.enemy` 命中；舊版只在較內側抽上下兩點，未抓到真正外緣。
2. 收藏／牌組首顆 chip 的右、下外緣命中 `.filter-chip-row`／`.filter-chip-board`；牌組首顆 chip 左外緣另被橫捲容器裁切。
3. 矮桌機收藏 chip 約 `38×26px`，舊固定左右各 2px 的 `::after` 只有約 `42×46px`，水平未達 44px；擴張後又由四向命中抓到相鄰 chip 的偽命中區在 4px gap 互蓋。
4. 1440×780、1366×600、1280×640、1024×768 等矮桌機的 footer 三個外部連結中心被固定 command dock 蓋住；根因是三個高度 media query 以單值 `padding` 覆寫 base 的 dock 底部避讓。

修正後：英雄列建立高於 battlefield 的 stacking 層、橫向 touch board 頂距補足英雄 44px 外緣；chip 偽元素寬高皆對稱補足 44px，列四向 padding 與 8px gap 防裁切／互蓋；矮桌機 board 各斷點保留 dock＋safe-area 底部避讓。

## 守門誤判排除紀錄

最初把實捲維持為 `block:'nearest'` 時，已在 viewport 內但被 fixed/sticky 層遮住的控制不會移動，且巢狀 scrollport 有多筆假紅。最終規則改為：先以 `elementFromPoint` 證明遮擋；若控制位於捲動鏈，再以 `block:'center'` 驅動完整巢狀鏈並重新命中。只有置中實捲後仍命不中才失敗，沒有恢復任何幾何放行。

## 最終 gate 證據

| 指令 | 結果 | 關鍵計數 |
|---|---|---|
| `npm test` | PASS | cards/core `131/0`；quality、balance、R67 visual 全綠 |
| `npm run test:controls` | PASS | 6/6 視口；英雄與 chip 每顆 8 點四向抽樣；兩個 touch 視口真實致死結算＋pointer probe |
| `npm run test:rwd` | PASS | 3 頁 × 11 視口＝`33/33` 零違規；頁捲與水平溢出皆 0 |
| `npm run test:e2e` | PASS | Stage 5、真 SW 離線、內含 reachability、R67 browser 全綠 |
| `git diff --check` | PASS | 無 whitespace error |
| active 舊版號掃描 | PASS | `card-battle-r70-v1`、`card_sw_auto_reload_r70_v1`、`0.4.15` 零命中（排除歷史 docs／node_modules） |
| 交付檔秘密格式掃描 | PASS | OpenAI／xAI／GitHub／Google／AWS／PEM 常見格式零命中 |

完整 gate 由實際命令執行；未重試任何配額型外部服務，未偽造或手改測試輸出。`npm run test:e2e` 會重寫 R67 歷史瀏覽器證據，本輪已在驗證後還原，僅保留此新輪目錄。
