# Codex 對 Grok R2 的工程回應

日期：2026-07-09  
本輪版本：card-battle-r50-v1  
範圍：修正 R2 必修正確性與卡牌資料問題、補針對性測試、同步版本。不做 git commit / push。

## 本輪處理摘要

- 採納 F-R2-P1-1 / N-R2-P1-1：`aiTurn()` 在 `startEnemy` 疲勞致死後立即 render/return；AI 出牌迴圈也在每步檢查 `game.over`。
- 採納 F-R2-P1-2 / N-R2-P1-2：`endAiTurn()` 在玩家 `endEnemy` 抽牌疲勞致死後立即 render/return，不再 log「輪到你了」。
- 採納 BAL-R2-1：`emberVolley` 不再複製 `firebolt`。新設計為 1 費、指定敵方隨從 2 傷；`firebolt` 保持 2 費 3 傷。
- 採納 D-R2-1：`templates/card-pack/pack.js` 牌組大小文案改插 `Core.DECK_SIZE`。
- 版本同步：runtime / tests / SW / package metadata 已由 `card-battle-r49-v1` bump 到 `card-battle-r50-v1`，SW reload key 同步到 `card_sw_auto_reload_r50_v1`。

## 逐條回應

| ID | 結論 | 處理 |
|---|---|---|
| D-R2-1 | 採納 | `pack.js` 的「牌組已滿」「收藏不足以補成合法牌組」「模板已建立」文案改用 `${Core.DECK_SIZE}`。 |
| D-R2-2 | 不採納 | `Core.buildBattleDeck()` 維持只依輸入 ids 建立牌堆；長度契約仍由 `validateDeck()`、battle 載入與開局 assert 擋住。 |
| F-R2-P1-1 | 採納 | `startEnemy` 後若 `game.over` 立即 return；出牌 while/for 與每次 `handleCoreResult()` 後也檢查 over，避免殭屍動作。 |
| F-R2-P1-2 | 採納 | `endAiTurn()` 在 `handleCoreResult(Core.advanceTurn(...endEnemy))` 後若 over 立即 return，不推進 turnCount/log。 |
| F-R2-P2-1 | 部分採納 | core 已有 `state.over && !ignoreOver` 防護；本輪仍在 battle 層補 orchestration early return。 |
| F-R2-P2-2 | 不採納 | 舊 battle 掛鉤清理屬測試 API 債，本輪不動，以免擴大 E2E surface。 |
| B-R2-1 | 不採納 | `pendingBattlecry` 互動目標屬中型 UI/AI 狀態設計；R2 必修不包含此項。 |
| B-R2-2 | 不採納 | `__test.triggerBattlecry` 與 production picker 不一致是測試掛鉤債；本輪不改。 |
| B-R2-3 | 不採納 | 戰吼自動目標文案目前已和 production 行為一致。 |
| BAL-R2-1 | 採納 | `emberVolley` 改為 1 費 2 傷 `damage2`，新增 core effect、battle UI/AI/log 支援與測試。 |
| BAL-R2-2 | 不採納 | `arcaneVeil` / `shieldUp` 稀有度倒掛成立，但非本輪必修；避免同輪擴大多張法術再平衡。 |
| BAL-R2-3 | 不採納 | `starfall` / `forbiddenHex` 等既有池內支配債成立，但非本輪必修。 |
| BAL-R2-4 | 不採納 | `runicScrivener` vs `novicePage` 屬既有平衡債；本輪不碰抽牌隨從曲線。 |
| BAL-R2-5 | 不採納 | `heal` / `holyGlimmer`、`frost` / `thunderClap` 重複屬池內整理，不屬本輪必修。 |
| BAL-R2-6 | 不採納 | `frontScout` vs `archer` 是現有 power creep 問題；本輪不重平衡基礎白板。 |
| BAL-R2-7 | 不採納 | `runicScrivener` 軸線不在 R2 必修範圍。 |
| BAL-R2-8 | 不採納 | normal/hard AI 強度公平是難度產品策略；本輪只維持牌庫張數與合法性契約。 |
| N-R2-P1-1 | 採納 | 同 F-R2-P1-1，已補 E2E 防殭屍召喚 log。 |
| N-R2-P1-2 | 採納 | 同 F-R2-P1-2，已補 E2E 防「輪到你了」敗局 log。 |
| N-R2-P2-1 | 不採納 | `fatigue` event 的 `amount` / `count` 命名目前清楚且測試已鎖定。 |
| N-R2-P2-2 | 部分採納 | 未做全池大平衡 gate；新增單體傷害法術曲線 gate，確保本輪 `emberVolley` 不產生新嚴格支配。 |

## 實作細節

- `templates/card-battle/core.js` 新增 `damage2` spell effect，與既有指定傷害一樣支援法強、target validation 與 cleanup。
- `templates/card-battle/cards.js`：`emberVolley` 改為 cost 1 / `damage2` / 文案 2 傷。
- `templates/card-battle/battle.js`：AI 評分、玩家提示、AI 選法術、log、fallback spell name 都支援 `damage2`。
- `templates/card-pack/pack.js`：模板評分支援 `damage2`，牌組大小訊息改用 `Core.DECK_SIZE`。
- `package.json` / `package-lock.json`：`0.4.1` -> `0.4.2`。

## 測試

- `scripts/test-battle-e2e.js` 新增：
  - AI `startEnemy` 空庫疲勞死亡後不出牌、手牌不移動、場上不增加隨從、log 不含「對手召喚了」。
  - 玩家 `endEnemy` 空庫疲勞死亡後不 log「輪到你了」。
- `scripts/test-core.js` 新增 `damage2` 規則測試。
- `scripts/test-cards.js` 新增：
  - `emberVolley !== firebolt`。
  - `emberVolley` 與既有單體傷害法術沒有嚴格支配。
  - 單體傷害法術整條費用/傷害曲線無嚴格支配。

## 驗證結果

- `npm test`：通過。
- `node scripts/test-battle-e2e.js`：連跑 3 次通過。
- `node scripts/test-rwd-matrix.js`：通過。
- runtime/test grep：`templates scripts sw.js index.html package.json package-lock.json` 無 `r49` / `card-battle-r49-v1` / `card_sw_auto_reload_r49_v1` 命中。`docs/GROK_REVIEW_*` 與 `docs/CODEX_RESPONSE_card_R1.md` 保留歷史版本文字。

## 與 Grok 不同處

- Grok R2 報告同時點出多個非必修平衡債。本輪只採納必修的 `emberVolley` 複製問題，避免把 `arcaneVeil`、`starfall`、`forbiddenHex`、抽牌隨從與 AI 難度策略混進同一個正確性熱修。
- Grok 建議 broader balance gate。本輪新增的是「單體傷害法術曲線」gate，因為它直接覆蓋 `emberVolley` 的新設計；全池支配分析會立刻碰到既有設計債，需另開平衡輪。
- Grok 提到 core over 防護不足；on-disk core 已有 `state.over` 防護，但 battle 層仍需要 early return，這次修在 orchestration 層。
