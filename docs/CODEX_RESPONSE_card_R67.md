# 《裂潮卡牌》card R67 — Wave 2 五戰場與陣營徽記報告

日期：2026-07-17  
版本：`0.4.13`  
PWA revision：`card-battle-r67-v1`  
狀態：已封版（總稽核接手完成最終回歸，見文末附註）。

## 結論

- 以 Codex 內建 imagegen／`gpt-image-2` 逐張生成五張戰場與五枚陣營徽記 master；10/10 C2PA master 通過 `caBX`、`softwareAgent = gpt-image`、`version = 2.0`、`trainedAlgorithmicMedia`。
- 五戰場均有 high `1536×1024`、med `1152×768`、low `768×512` 真 WebP；每次 `newGame()` 依固定五景順序循環，只改桌布視覺狀態，不新增卡牌、規則、數值或傷害流程。
- 五徽記均為 256×256 alpha PNG，已接入戰鬥卡框、開包卡框、收藏陣營選單、戰鬥陣營誌與主選單識別。
- 首屏以 17.4KiB low 正式桌布漸進繪製，再由 runtime 管線升級至 viewport／效能階級對應的 med/high，避免首畫被既有大卡圖競爭。
- R67 沒有修改角色移動、攻擊、受傷或死亡動畫；只將既有全畫面環境光暈漂移固定成靜態，保留相同漸層視覺以消除背景合成 frame hitch。

## 產圖與來源

戰場：`white-tide-citadel`、`astral-conclave`、`thunderwild-pass`、`longnight-necropolis`、`tidebreak-confluence`。  
徽記：`wardens`、`conclave`、`wild`、`wintershadow`、`neutral`。

- style board 與完整提示詞：`docs/evidence/R67/R67_STYLE_BOARD_AND_PROMPTS.md`
- 不可變 C2PA masters：`docs/evidence/R67/masters/`
- 色鍵移除後 alpha sources：`docs/evidence/R67/alpha_sources/`
- model、master/runtime SHA-256、後製參數與內容雜湊：`docs/evidence/R67/source-manifest.json`
- C2PA 逐檔結果：`docs/evidence/R67/c2pa-verification.json`
- 生成介面只有 Codex 內建 imagegen；未使用搜尋圖、外部圖片或第三方素材。

## 確定性後製與預算

戰場 master 經固定 3:2 中裁、中央 feathered quieting、Gaussian blur 2.2、contrast 0.76、brightness 0.78，再以 Lanczos 輸出三階 WebP。徽記使用 imagegen skill 隨附 `remove_chroma_key.py`，參數為 `--auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill`，再依 alpha bbox 置中至 256px、主體上限 232px。

| 解壓貼圖預算 | 實測 | 上限 | 結果 |
|---|---:|---:|---|
| desktop 全 15 張桌布階級＋5 徽記 | 58,327,040 bytes（55.63MiB） | 64MiB | 通過 |
| mobile 五張 low＋5 徽記 | 9,175,040 bytes（8.75MiB） | 32MiB | 通過 |

runtime 檔案合計 1.31MiB；所有 R67 runtime URL 均使用 `?v=<SHA-256 前 8 碼>`，並列入 `card-battle-r67-v1` Service Worker offline 清單。

## 量化視覺閘門

| 閘門 | 最差實測 | 硬門檻 | 結果 |
|---|---:|---:|---|
| 卡面／文字疊圖對比（5 景 × 3 階） | 9.188:1 | ≥4.5:1 | 通過 |
| 中央 60% 高頻雜訊 RMS | 1.559/255 | ≤18/255 | 通過 |
| 中央 60% 亮度標準差 | 8.148/255 | ≤32/255 | 通過 |
| high→med/low 一致性 RMS | 4.348/255 | ≤8/255 | 通過 |
| 三視口 cover 安全裁切 | 15/15 | 全數通過 | 通過 |
| 64px 徽記主體最小邊 | 44px | ≥44px | 通過 |
| 64px alpha occupancy | 32.25%–64.38% | 18%–78% | 通過 |
| 徽記連通元件／綠邊 | 1／0% | ≤3／≤0.2% | 通過 |

機器可讀結果：`docs/evidence/R67/gates/visual-assets.json`。品質對照與 64px contact sheet 位於 `docs/evidence/R67/quality/`。

## 實機整合

- 五景 runtime API 真載入；連續五次 `newGame()` 得到五個不重複場景。
- desktop 1366×768 high、mobile 390×844 low、landscape 844×390 med 均載入正確內容雜湊檔，`scrollWidth` 等於 viewport 寬度。
- battle 可見卡圖 4/4、徽記 4/4 載入，`art-fallbacks = 0`。
- pack 陣營選單 5/5 與測試開包卡框 5/5 徽記皆為 256×256 真 PNG；console/pageerror = 0。
- JSON：`docs/evidence/R67/gates/browser-integration.json`。
- 截圖：`docs/evidence/R67/after/desktop-1366x768.png`、`mobile-390x844.png`、`landscape-844x390.png`。

## 效能 before／after

R66 before 由相同 runner 直接服務 Git `HEAD` 版本：Fast 3G（150ms RTT、200KiB/s down）＋4× CPU 下，主視覺 31,098.9ms、互動 31,479.4ms。早期外層逾時原樣保留在 `docs/evidence/R67/before/browser_timeout.json`，可完成基線在 `docs/evidence/R67/before/performance.json`。

R67 三次正式量測：主視覺 659.6／657.0／863.3ms，median **659.6ms**；互動 3,525.3／3,609.4／2,958.2ms，median **3,525.3ms**；穩態 high-tier rAF p95 **16.7ms**（175 samples）。三項斷言全部通過：主視覺 ≤3,000ms、互動 ≤34,627.34ms、p95 ≤18ms。完整 JSON：`docs/evidence/R67/after/performance.json`。

本機量測標記為 concurrent-machine evidence；正式數值只採沒有其他臨時 Playwright root 的窗口。其他 Wave browser 併發造成的失敗嘗試未用來放寬門檻。

## 回歸與 CI 同款腳本

最終全量回歸（總稽核 Claude 於 Codex session 因額度封頂後接手執行，2026-07-17）：

| 套件 | 結果 |
|---|---|
| `npm test`（cards/core/quality-gates/balance-sim/R67 visual gates） | PASS，exit 0 |
| `npm run test:e2e`（battle-e2e＋controls-reachability＋R67 browser） | PASS，470 ✓、0 失敗 |
| `npm run test:rwd` | PASS，10 視口 × 頁面共 30 組全零違規 |
| 秘密掃描 | 0 命中 |

註：首次 e2e 出現 1 項失敗「r61 hero art: 開包五張展示與收藏六張縮圖皆使用專屬 PNG」——根因為 R67 在 `.art` 容器內新增 `.faction-emblem` 徽記 img，R61 守門的 `.art img` 選擇器誤將徽記算入 hero 主圖。總稽核修正守門選擇器為 `img:not(.faction-emblem)`（hero 主圖必須為專屬 PNG 的斷言強度不變；徽記由 R67 專屬 alpha/64px 閘門驗證），重跑 470 項全綠。

CI 已改為直接呼叫相同 package scripts：`npm test`、`npm run test:e2e`、`npm run test:rwd`、`npm run test:r67:performance`；test job 另安裝 Pillow，E2E job 安裝 Playwright Chromium。

## 變更面與回滾

- runtime：`assets/battlefields/`、`assets/factions/`
- 接線：battle／pack／menu HTML、`battle.js`、`cards.js`、`pack.js`
- PWA：入口版本化引用、Service Worker revision 與 offline 清單
- evidence／守門：`docs/evidence/R67/`、`scripts/process-r67-assets.py`、三支 R67 gate scripts
- 標註：`art-config.json`、`CREDITS.md`、`README.md`

新素材使用獨立路徑且未覆寫 `assets/backgrounds/*.png`。回滾以 `git revert <R67 本地提交>` 完成。

## 總稽核審計附註（Claude，2026-07-17，Grok 複審 NO_P0）

Grok P1 品質債入帳（不擋本輪出貨，列下輪必辦）：
1. R61 守門選擇器修正需補「hero 主圖缺失時必 fail」的負向斷言閉環（本次僅證明消除徽記誤報）。
2. 互動門檻 ≤34.6s 為 before×1.1 相對閘、對 after 3.5s 無鎖定力——下輪改固定硬預算（建議 ≤6s）。
3. before/after 效能 metric 定義需釘死同一口徑（首繪 vs 戰局就緒），不得作為倍數加速宣稱。
4. 桌布中央 quieting 閘僅保安靜度，缺「五景兩兩可分」辨識度斷言。
5. 徽記 64px 最小邊 44px 零裕度，建議放大主體或降門檻敏感度。
- p95 16.7ms 為併發機況量測，出貨判定待總稽核淨機重測。
- C2PA 10/10 由總稽核親驗 marker；e2e 470/rwd 30/npm test 由總稽核親自執行全綠。
