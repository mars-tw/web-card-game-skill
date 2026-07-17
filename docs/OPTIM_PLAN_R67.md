# 裂潮卡牌 R67 Wave 2 實作與驗收計畫

- 輪次：card R67
- 日期：2026-07-17
- 依據：`AGENTS.md`、`docs/AUDIT_full.md`、`C:/Users/digimkt/Desktop/遊戲/WAVE2_PROTOCOL.md`
- 範圍：五戰場桌布、五陣營徽記、戰鬥畫面純視覺輪換、卡框與選單徽記；不新增規則、卡牌或數值，不修改角色動畫資產／命中幀流程。

## Wave 1 前置盤點

- `CARD_POOL` 92 張均有正式 PNG；`image:null = 0`。
- `npm test` before：通過；核心規則 `PASS 131 / FAIL 0`，R66 25 張長尾卡與 2 張修復卡 gate 全綠。
- R66 實機報告記錄 battle／pack `art_fallbacks = 0`。通用載入失敗防護 DOM 保留，但不是 production 卡片內容路徑。
- R66 manifest、CREDITS、SW 清單齊全。
- 舊 `assets/backgrounds/*.png` 只有四張，沒有本協定要求的 C2PA master 分離、中央雜訊、三品質檔與 content-hash runtime 引用；R67 以新 `assets/battlefields/` 管線補齊，不覆寫舊檔。

## Before 基線與 after 硬上限

| 指標 | before | R67 after 上限／斷言 |
|---|---:|---:|
| 卡圖 production fallback | 0 | 必須維持 0 |
| Fast 3G + 4x CPU 主視覺 | 前兩次外層曾逾時；分段 runner 對 Git `HEAD` R66 完成 31,098.9ms | R67 主視覺 mark ≤3,000ms |
| Fast 3G + 4x CPU 互動 | Git `HEAD` R66 31,479.4ms（同款 runner） | R67 互動中位數 ≤34,627.34ms（before +10%） |
| rAF p95（R65 最近可重現基線） | desktop 8.8ms；mobile 12.6ms | p95 ≤18ms；本機併發結果標註「併發、不可信」 |
| 新增桌機解壓貼圖記憶體 | 0 | 全 high/med/low＋徽記總和 ≤64MiB |
| 行動品質檔解壓貼圖記憶體 | 0 | low＋徽記總和 ≤32MiB |
| UI 文字／卡面疊圖對比 | 未有 R67 自動 gate | 每一戰場、每一視口最小 ≥4.5:1 |
| 中央 60% 局部雜訊 | 未有 R67 自動 gate | RMS 高頻差分 ≤18/255；局部亮度標準差 ≤32/255 |
| 徽記 64px 辨識 | 未有正式徽記 | alpha occupancy 18%–78%；邊界與主體連通性 gate 全過 |

正式 after：Fast 3G + 4× CPU 主視覺 median 659.6ms、互動 median 3,525.3ms；high-tier 穩態 rAF p95 16.7ms，三項皆在原硬上限內。

> 效能量測所在 Windows 機台同時有其他 Chrome／Node 工作負載；依協定，p95 證據標註「併發、不可信」，出貨判定仍需總稽核淨機重測，門檻不放寬。原始逾時留存在 `docs/evidence/R67/before/browser_timeout.json`，可完成的 Git `HEAD` R66 分段基線在 `docs/evidence/R67/before/performance.json`。

## 可驗收工作項

1. 內建 imagegen 逐張產出五張戰場與五張色鍵徽記 master；master 保存在 `docs/evidence/R67/masters/`，不得被後製覆寫。
2. 每張 master 驗證 PNG `caBX` C2PA、`softwareAgent.name = gpt-image`、`version = 2.x`、`trainedAlgorithmicMedia`；JSON 結果入 evidence，失敗即作廢。
3. 確定性 Pillow 管線：戰場焦點安全裁切、中央 60% 降噪／壓暗、輸出 high 1536×1024、med 1152×768、low 768×512 WebP；徽記移除色鍵、縮至 256px RGBA PNG並驗 alpha。
4. runtime manifest 逐檔記 model slug、master/runtime SHA-256、C2PA 摘要、轉製步驟與參數；同步 CREDITS。
5. 戰鬥每次 `newGame()` 循環五場景，只改 `data-battlefield` 與桌布 URL；不觸碰卡池、規則、AI、傷害、動畫或數值。
6. low/med/high 以同一 master 轉製；`data-perf=low` 與小視口必須載入 low 真素材，不准純色替代。
7. 所有 runtime URL 使用 `?v=<runtime sha256 前 8 碼>`；SW revision bump，offline 清單含全部新素材。
8. 自動 gate：安全裁切三視口、中央雜訊、文字／卡面對比 ≥4.5、品質檔一致、alpha、64px、解壓記憶體、Fast 3G 主視覺 mark、互動退步、p95。
9. 全量回歸：`npm test`、`npm run test:e2e`、`npm run test:rwd`、`npm run test:controls` 與 CI 同款語法檢查；特別保留 battle 零 fallback 卡圖守門。
10. 產出 before/after 與三視口證據、R67 報告、版本 bump、舊版號 grep、秘密掃描，最後繁中本地 commit，不 push。

## 回滾

R67 新資產與引用均為獨立路徑。回滾時對本地 R67 commit 執行 `git revert <R67-commit>`；舊 `assets/backgrounds/*.png` 與 R66 manifest 未覆寫，可由前一提交完整恢復。
