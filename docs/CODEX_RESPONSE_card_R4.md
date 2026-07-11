# Codex Response - card-battle R4

版本：card-battle-r54-v1

## 結論

- R4-01 / R4-02 已修。攻擊撲擊、受擊 flash、死亡溶散改為 render-surviving combat ghost 播放；真實 `resolveAttack -> handleCoreResult -> render()` 後動畫 DOM 仍保留到時長結束，不阻塞操作。
- `core.js` 零改動，規則結算仍立即完成。
- e2e 已移除只靠 `markDying` 的假陽性，改驗真攻擊路徑 render 後 `.lunge-to` / `.dying` / `.hit-flash` 存活，並驗證動畫結束後移除。
- r54 版本字串已同步；舊版 token grep 無命中。

## 處置

- R4-01 P0：`battle.js` 新增 `combat-ghost` clone 層。攻擊者、受擊者、死亡者會在同步 render 前複製為 fixed/pointer-events-none ghost，動畫完整播放後移除。
- R4-02 P0：`scripts/test-battle-e2e.js` 新增真路徑 FX guard，覆蓋攻擊撲擊、死亡溶散、受擊 flash 的 render 後生命週期。
- R4-03 P1：`newGame()` / e2e `setup()` 會清 transient FX；勝利星星補 class，與 combat ghosts / damage pops / sparks / confetti 一併清理。
- R4-04 P1：中途新局仍不記勝敗、不改 streak，符合現有正式終局只走 `settleIfGameEnded -> showOverlay` 的統計邊界。
- R4-05 P1：`pack.js` 補 `prefersReducedMotion()`，legend flash 與開包彩帶在 reduced-motion 下不再插入動畫 DOM。
- R4-06 P2：AI 攻擊同走 `animateAttackToward()`，ghost 層修正後不再被隨後 render 抹掉。
- R4-07 P2：開包戰績清除時同步移除 `card_win_streak_v1` mirror。
- R4-08 P2：`finishFx` 維持終局狀態語意，`newGame()` 重置並清 FX。
- R4-09 P2：`burstStars()` 尊重 low-perf / reduced-motion。

## 驗證

- `npm test`：PASS
- `npm run test:e2e`：PASS（2 次）
- `npm run test:rwd`：PASS
- `node scripts/test-balance-sim.js`：PASS
- `git diff -- templates/card-battle/core.js`：無輸出
- 舊版 token grep：無命中
