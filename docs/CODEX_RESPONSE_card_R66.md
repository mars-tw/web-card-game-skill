# 《裂潮卡牌》card R66 — Wave 1 視覺量產報告

日期：2026-07-16  
版本：`0.4.12`  
PWA revision：`card-battle-r66-v1`  
狀態：完成；本報告所在提交為本地提交，未 push。

## 結論

- `CARD_POOL` 共 92 張，`image:null` 已由 25 降至 **0**；沒有刻意保留 emoji 卡圖的例外。
- 25 張長尾普通／稀有／史詩卡已接上 1024×1024 RGBA 真 PNG。
- `mage.png` 與 `lich.png` 已修為 1024×1024 RGBA 真 PNG，副檔名、magic bytes 與解碼格式一致。
- 開包與對戰實機畫面均為 `art_fallbacks: 0`；對戰證據中直接顯示 R66 的 `soulfrostRaven`、`graveScribe`。
- 版本、PWA 快取、測試期待、`art-config.json`、manifest、CREDITS 與 Service Worker 資產表均已同步。

通用 `.art-fallback` DOM／CSS 保留作網路或檔案載入失敗時的防護；它不再是任何卡片內容的正常路徑。

## 產圖清單

共 25 張：普通 5、稀有 11、史詩 9；依 `cards.js` 正式映射，陣營分布為守望者 8、密議會 8、荒野 5、冬影 4。

- 普通：`mooncat`、`groveHerbalist`、`holyGlimmer`、`runicScrivener`、`watchtowerBowman`
- 稀有：`duskwrightBat`、`linebreaker`、`thunderClap`、`arcaneVeil`、`battleDrummer`、`sanctuaryWarden`、`thunderRoc`、`soulfrostRaven`、`toxinViper`、`graveScribe`、`scoutInterrogator`
- 史詩：`abyssWalker`、`stormGriffin`、`duskWitch`、`starfall`、`forbiddenHex`、`tidebinderHex`、`bastionColossus`、`tacticalRequisition`、`silenceOne`

模型與稽核資料：

- `model_slug`: `gpt-image-2`
- `prompt_version`: `wave1-card-r66-v1.1`
- 安全區修訂：`wave1-card-r66-safearea-edit-v1.0`
- 提示詞 SHA-256：`fe4fe711780c7026c23ea422f40000257fd9978c23936a57862b96050bbe59e0`
- 25/25 生成源檔包含 C2PA `caBX`、`gpt-image` / `2.0`、`trainedAlgorithmicMedia` 標記。
- 未讀取、輸出或落盤任何 API key。

完整提示詞骨架、個別場景、每四張陣營辨識結果與安全區修訂紀錄見 `docs/evidence/R66_art/R66_PROMPTS.md`；每張 final/source SHA-256 見 `docs/evidence/R66_art/manifest.json`。

## 格式修復

| 檔案 | 修復前 | 修復後 |
|---|---|---|
| `mage.png` | 864×1152 RGB PNG | 1024×1024 RGBA PNG；焦點置中裁切 |
| `lich.png` | `.png` 副檔名但內容為 JPEG | 1024×1024 RGBA 真 PNG |

原始檔保存在 `docs/evidence/R66_art/pre_edit/`，修復前後 SHA-256 已列入 manifest。

## 閘門與測試

| 閘門 | 結果 |
|---|---|
| Wave 0 `alpha_gate.py --profile opaque` | 27/27 通過；magic bytes、PNG 解碼、1024×1024、RGBA、四角 alpha、occupancy 全過 |
| R66 MIME／尺寸／接線／SW gate | 25 張新圖＋2 張修圖全過 |
| `npm test` | 通過 |
| `npm run test:e2e` | 通過；含四陣營 R66 專屬 PNG、0 emoji fallback 守門 |
| `npm run test:rwd` | 通過；shell／battle／pack × 10 視口，共 30 組零違規 |
| `npm run test:controls` | 通過 |
| OpenAI / xAI token pattern 秘掃 | 0 命中 |
| `OPENAI_API_KEY` / `XAI_API_KEY` 值指派秘掃 | 0 命中 |

E2E 首輪曾命中一項已過時的 R61「無圖卡應顯示 fallback」期待；該期待已替換為 R66 四陣營長尾卡必須載入專屬 PNG 且 fallback 為 0，完整重跑後全綠。

## 證據索引

- `docs/evidence/R66_art/pack_open_no_fallback.png`：開包 5/5 圖片載入、fallback 0。
- `docs/evidence/R66_art/battle_no_fallback.png`：對戰手牌 4/4 圖片載入、fallback 0；可見兩張 R66 新圖。
- `docs/evidence/R66_art/browser_checks.json`：實機 DOM 圖片來源與載入結果。
- `docs/evidence/R66_art/batch_01_faction_qa.jpg` 至 `batch_07_faction_qa.jpg`：每四張陣營辨識 contact sheet（尾批 1 張）。
- `docs/evidence/R66_art/gates/*.json`：27 份機器可讀 alpha／MIME／尺寸閘門輸出。
- `docs/evidence/R66_art/generated_sources/`：25 張保留 C2PA 的生成源檔。
- `docs/evidence/R66_art/pre_edit/`、`rejected/`：安全區修訂與拒收證據。

## 變更面

- 卡圖：`assets/cards/*.png`
- 接線：`templates/card-battle/cards.js`
- 生成提示清單：`art-config.json`
- PWA：`sw.js`、入口／battle／pack 版本化引用與重載 key
- 守門：`scripts/test-cards.js`、`scripts/test-quality-gates.js`、`scripts/test-battle-e2e.js`
- 版本：`package.json`、`package-lock.json`、`README.md`
- 標註：`CREDITS.md`

本輪不涉及角色移動、攻擊、受傷或死亡動畫資產／邏輯變更。
