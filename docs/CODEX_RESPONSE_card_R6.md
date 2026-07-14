# Card R6 修復回報

版本：`card-battle-r61-v1`

## 三刀

1. **AI 雙 ghost**：移除 AI 打隨從路徑的兩個外層 `animateAttackToward`；動畫統一由 `resolveAttack` 建立一次。打臉仍保留唯一動畫。新增真 AI 回合守門，單次互毆 ghost 峰值固定為 **2**（攻／受各一），不再是 4。
2. **手機 × 展示盤**：`fourRarityHand` 會主動展開手機手牌抽屜，clear 後收合；原 `threeOpponents` 正名 `enemyTripleField`（舊名只作相容 alias），另增 `opponentHalden`／`opponentVey`／`opponentScarra` 三個可重現色場 pose。390×844 實畫面四卡可見、水平溢出 0；三色依序為藍 `#3b82f6`、紫 `#a855f7`、橙 `#f97316`。
3. **無圖卡地板**：battle／pack 的 `image:null` 卡統一掛 `art-fallback`；沿用四陣營漸層紋理，再加陣營徽印、水印暈影、accent 內框與 glyph 圓形底座。E2E 以四陣營 null 卡逐一驗 DOM 與 computed pseudo texture。

## 同步與守門

- cache、SW reload key、manifest／script query、測試標籤全同步 r61。
- active source／tests／config（排除歷史 `docs/`）舊 r58 字串 grep：**0**。
- `templates/card-battle/core.js`：**diff 0**。
- `npm test`：**PASS**（cards、core **116/116**、quality gates、balance-sim）。
- `npm run test:e2e`：**PASS ×2**。
- `npm run test:rwd`：**PASS**（3 頁 × 10 視口，共 30 組零違規）。
- `node scripts/test-balance-sim.js`：**PASS**（另行重跑）。
- `git diff --check`：**PASS**。
- 未 git commit，未 push。
