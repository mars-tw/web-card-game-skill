# 《卡牌對戰》card-battle-r54-v1 — Grok 對抗式覆核 R4（爽度層）

| 欄位 | 內容 |
|---|---|
| 版本對齊 | **card-battle-r54-v1**（commit `c439ffc`：攻擊撲擊／傷害 pop／大傷微震／死亡溶散／斬殺 slow／勝利彩帶／敗北灰階／連勝 streak／開包爆閃潮紋／WebAudio） |
| 審查角色 | **監工・對抗覆核**（只審不改） |
| 審查範圍 | `templates/card-battle/{battle.js,index.html,core.js,cards.js}`、`templates/card-pack/{pack.js,index.html}`、`scripts/test-battle-e2e.js`、git diff（R52 `843a423` → R54 `c439ffc`） |
| 方法 | 靜態路徑追蹤 + `git rev-parse` 雜湊對照 + E2E 守門對照；**不修改任何遊戲／測試程式碼** |
| 約束 | 本文件只寫審查結論與證據；**不改**實作 |
| 日期 | 2026-07-11 |

## 總覽

| # | 覆核題 | 結論 | 一句話 |
|---|---|---|---|
| (1) | 動畫是否真不阻塞／快速連點佇列 | **規則不阻塞；DOM 特效有堆積風險；卡面撲擊／溶散在真路徑幾乎看不見** | 無中央佇列，但 `render()` 同步清場讓多項「爽點」失效 |
| (2) | 斬殺 slow 與 `aiTurn`／`endTurn` 時序 | **規則層安全；演出層未鎖 UI 但 `game.over` 擋戰鬥輸入** | 結算同步寫入 stats；演出期間不會再改變對戰狀態 |
| (3) | `core.js` 是否零改動 | **PASS** | R52／HEAD／工作樹 blob 雜湊一致，`git diff` 空 |
| (4) | `prefers-reduced-motion` 覆蓋 | **戰鬥側大致完整；開包 JS 缺口** | CSS 全局縮時有效；pack 彩帶／音效未對齊 battle 的 JS 閘門 |
| (5) | 連勝 streak 與勝敗判定 | **正式終局一致；無投降鈕；中途重開不斷 streak** | 疲勞死走同一 `settleIfGameEnded`；棄局≠敗 |

優先級：

| 級別 | 意義 |
|---|---|
| **P0** | 正確性／狀態錯亂／宣稱功能在真路徑失效且測試掩護 |
| **P1** | 明顯體驗落差、規格／實作漂移、可擴充時放大 |
| **P2** | 打磨／雙寫冗餘／測試覆蓋不足 |

---

## (1) 動畫是否真不阻塞操作（快速連點出牌時佇列堆積／錯亂）

### 1.1 架構：沒有「動畫佇列」，規則同步、特效 fire-and-forget

| 項目 | 檔案:行號 | 觀察 |
|---|---|---|
| 出牌 | `battle.js:898-920` | `Core.playCard` → `handleCoreResult` → `render()` 同呼叫棧完成；**不 await 動畫** |
| 攻擊結算 | `battle.js:1248-1259` | `animateAttackToward` 只掛 class／`setTimeout`，立刻 `Core.resolveAttack` |
| 傷害 pop／火花 | `battle.js:2182-2214` | 掛在 `document.body`，定時 `remove`；與規則無關 |
| 事件派發 | `battle.js:1988-2066` | `handleCoreResult` 逐 event 觸發 FX 後 `settleIfGameEnded()` |
| AI 攻擊節流 | `battle.js:1633-1668` | `setTimeout(step, 620)` 串步；**玩家出牌無此節流** |

**判定：規則狀態不會被動畫「卡住」。** 快速連點出牌時，每一擊都是同步狀態機推進，不存在「動畫佇列滿了就不出牌」的模型。此點 **PASS（不阻塞）**。

### 1.2 連點會不會「堆積／錯亂」？

| 風險 | 證據 | 嚴重度 |
|---|---|---|
| **DOM 特效堆積** | 每次傷害 `floatDamage`（`2182-2192`）append `.dmg-float`；火花 2～6 顆（`2203-2214`）；清理只靠各自 `setTimeout`。連點 AoE／多段傷可同時存在數十節點 | **P1 效能／視覺噪音**，非狀態錯亂 |
| **setTimeout 孤兒** | 撲擊清理 190/360ms、受擊 90/150ms、微震 260ms、溶散 class 無自動移除（靠 render 清掉） | **P2**；`newGame` 有清 board class（`454-459`） |
| **狀態錯亂** | 出牌／攻擊入口皆 `game.turn !== "player" \|\| game.over` early-return（`898`、`950`、`984`、`1010`、`1311`） | **未見規則錯亂** |
| **開包連點** | `pack.js:472-475` `pointerEvents = "none"` 直到 `resetForNextPack`（`1371-1379`） | **PASS** 防連開 |

**沒有中央 FX queue**，故不存在「佇列重排導致錯誤目標」；只有 **並行 timer + 殘留 DOM**。

### 1.3 P0：撲擊／死亡溶散在「真戰鬥路徑」被 `render()` 同步抹掉

這是本輪最關鍵的對抗發現：**CSS 與 helper 寫了，但主路徑立刻重建戰場 DOM，玩家幾乎看不到。**

| 步驟 | 檔案:行號 | 行為 |
|---|---|---|
| 掛撲擊 class | `battle.js:2158-2169` | `a.classList.add("lunge-to")` 並排程清理 |
| 同步結算 | `battle.js:1248-1255` | 同函式內立刻 `Core.resolveAttack` + `handleCoreResult` |
| 死亡 class | `battle.js:2031-2033`、`2230` | `markDying` → `.dying` |
| **立刻清場** | `battle.js:1739-1741`、`920`、`963`、`1005`、`1666` | `renderField` → `el.innerHTML = ""` 再重建**存活**隨從 |

呼叫序（玩家互毆，典型）：

```text
resolveAttack → animateAttackToward(加 lunge-to)
             → handleCoreResult(加 dying / dmg-float)
caller       → render()          ← 舊 card 節點銷毀
             → checkWin()
```

後果：

1. **`.lunge-to` 動畫**：節點被銷毀，**看不到撲擊**（`index.html:191`、`525` 定義形同死碼）。
2. **`.dying` 溶散**：死者已不在 `field`，重建時不會再畫該卡；**溶散掃光幾乎永不演出**（`index.html:184-188`、`522-523`）。
3. **延遲受擊** `setTimeout` 對 `t` 加 `hit-shake`（`2171-2174`）：`t` 已是 **detached node**，class 加在幽靈節點上，**螢幕上看不到**；`spawnSparks` 因用座標寫 body 仍可能出現。
4. **仍存活的爽點**：`floatDamage`／`hit-spark`（body）、`screenShake`（`.board`，`2231-2236`）、終局 `lethal-slow`／confetti／`defeat-fade`。

AI 路徑還有 **雙重撲擊排程**（浪費但同樣被 render 抹掉）：

- `battle.js:1642-1643`：`animateAttackToward` 後再 `resolveAttack`（內部又 `1249` 呼叫一次）。

### 1.4 測試掩護（方法學盲點）

| 測試 | 檔案:行號 | 問題 |
|---|---|---|
| 傷害 pop | `test-battle-e2e.js:315-320` | `attackMinion` 後 80ms 數 `.dmg-float` — **合理**（body 存活） |
| 死亡溶散 | `test-battle-e2e.js:321-327` | 只呼叫 `__test.markDying`，**不經 `resolveAttack` + `render`** | **假陽性**：證明 class 能掛上，不證明對戰可見 |
| 撲擊 | （無） | E2E **完全未測** `.lunge-to` 在結算後是否仍存在 |

**小結 (1)**

| 子項 | 判定 |
|---|---|
| 不阻塞操作 | **PASS** |
| 佇列堆積致狀態錯亂 | **PASS**（無規則佇列） |
| DOM／timer 堆積 | **P1** |
| 撲擊／溶散真可見 | **P0 FAIL**（render 抹除） |
| 傷害 pop／微震／終局彩帶 | **大致 PASS**（board／body 錨點） |

---

## (2) 斬殺 slow 與 `aiTurn`／`endTurn` 時序——演出中輸入會否狀態錯亂

### 2.1 終局單一入口

| 函式 | 檔案:行號 | 行為 |
|---|---|---|
| `settleIfGameEnded` | `1686-1695` | `game.over` 已 true → return；否則 `over=true`，清 selected／pending，算 win，呼叫演出 + overlay |
| 觸發點 | `2066`（`handleCoreResult` 尾）、`1682-1683`（`checkWin`） | 雙觸發安全：第二次被 `over` 擋下 |
| 斬殺演出 | `2238-2249` | `finishFx.lethal = true`（**任何終局都標 lethal**）、音效、`.lethal-slow` 720ms、敗場 `defeat-fade` |
| Overlay／stats | `2815-2864` | **同步**改 wins／losses／streak／coins；overlay DOM **延遲 500ms** `classList.add("show")` |

### 2.2 與 `endTurn`／`aiTurn` 交錯

| 路徑 | 時序 | 防護 |
|---|---|---|
| 玩家結束回合 | `1310-1317`：`advanceTurn(endPlayer)` → 700ms 後 `aiTurn` | `game === gRef` 幽靈局防護 |
| AI 開始 | `1581-1585`：`over` 則 return | 斬殺後不會再抽／出牌 |
| AI 出牌迴圈 | `1589-1618`：每步查 `game.over` | 法術斬殺可中斷 |
| AI 攻擊鏈 | `1625-1668`：`over` → `endAiTurn`；每步 `gRef` | 臉殺後不再攻擊 |
| `endAiTurn` | `1673-1679` | `if (game.over) return` — **不會**在敗勢再 `startPlayer` |

**玩家在 slow-mo 期間點手牌／結束回合：**

- `playFromHand`／`endTurn`／攻擊入口皆要求 `!game.over`（見上列行號）→ **戰鬥輸入無效，狀態不推進**。
- `endTurnBtn` 在 `render` 後 `disabled`（`1733`）；終局路徑多數會 `render`（AI）或玩家 caller `render`。
- **未設全局 `pointer-events:none` 遮罩**；`newGame`／開包／任務鈕仍可點 — 這是 UX 問題，**不是**對戰狀態機錯亂。

### 2.3 潛在時序邊角（非 P0 狀態腐壞）

| 邊角 | 說明 | 級別 |
|---|---|---|
| 演出期間仍可 `newGame` | `2901`／`2914-2915`；`newGame` 清 FX class（`454-459`）並換新 `game` 物件；舊 AI `setTimeout` 因 `gRef` 失效 | 安全；見 (5) 對 streak 含義 |
| `finishFx.lethal` 語意 | 疲勞磨死也 `lethal: true`（`2239`） | **P2** 命名／測試語意膨脹 |
| Overlay 500ms 空白窗 | stats 已寫、畫面未蓋滿 | 可點新局；stats 不重複（`over` 鎖） |
| E2E | `328-337` 用 `finishGame` 驗 confetti／defeatFade | 不覆蓋「AI 斬殺中連點」 |

**小結 (2)：不會在 slow 演出中因戰鬥輸入造成規則狀態錯亂。**  
防護靠 **`game.over` 閘門 + AI timer 的 `gRef`／`over` 檢查**，不是靠「等動畫播完」。**PASS（時序安全）**；若規格要求「斬殺播完前禁止任何 UI」，則現況 **P2 未鎖全頁**。

---

## (3) `core.js` 是否真的零改動（git diff 驗證）

### 3.1 證據

| 檢查 | 結果 |
|---|---|
| `git diff 843a423..c439ffc -- templates/card-battle/core.js` | **空**（0 行） |
| `git rev-parse 843a423:templates/card-battle/core.js` | `88ec70fae0b28ab9076d9af89654cfd206af1289` |
| `git rev-parse HEAD:templates/card-battle/core.js` | `88ec70fae0b28ab9076d9af89654cfd206af1289`（相同） |
| 工作樹 `git hash-object templates/card-battle/core.js` | 同上 |
| R54 commit `--stat` | **未列出** `core.js`；變更集中在 `battle.js`（+147）、`index.html`、`pack.js`、版本字串、e2e |

### 3.2 邊界說明（非 core 規則變更）

| 檔案 | 變更 | 是否算破「core 純規則不動」 |
|---|---|---|
| `cards.js` | 註解 `R52 P0` → `R54 P0`（資料本體未動） | **否**（註解噪音） |
| `core.js` 內既有 `streak` 欄位（`41`）與 `nextDdaState`（`259-269`） | R54 **未改**；UI 寫入 streak 仍走既有 migrate | **相容** |

**判定 (3)：PASS — `core.js` 真零改動。**

---

## (4) `prefers-reduced-motion` 覆蓋完整度

### 4.1 戰鬥頁 CSS（強覆蓋）

`templates/card-battle/index.html:554-561`：

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0ms !important;
    scroll-behavior: auto !important;
  }
  .confetti-piece, .hit-spark { display: none !important; }
}
```

效果：撲擊、溶散、微震、overlay pop、ambient、foil 無限動畫等 **CSS 動畫被壓成近乎瞬切**；彩帶／火花 **直接不顯示**。此層 **PASS**。

### 4.2 戰鬥頁 JS 閘門

| API | 檔案:行號 | 對 reduce 的處理 |
|---|---|---|
| `prefersReducedMotion()` | `158-160` | `matchMedia` |
| `screenShake` | `2231-2235` | **early return**（與 low-perf） |
| `burstConfetti` | `2252-2253` | **early return** |
| `triggerFinishEffect` lethal-slow | `2242-2247` | **不掛** `.lethal-slow` |
| `defeat-fade` | `2248` | **仍加 class**（靜態灰階終態；動畫時長被 CSS 壓掉）— 可接受的「結果回饋」 |
| `floatDamage`／`spawnSparks`／`burstStars` | `2182+`、`2866-2879` | **無 JS 跳過**；靠 CSS 縮時／`transition-duration:0`；`burstStars` 仍插 30 個 emoji 節點 |
| WebAudio | `195-220` | **不綁** reduced-motion（合理：動效≠靜音；另有 mute `162-165`） |

### 4.3 開包頁缺口

| 項目 | 檔案:行號 | 判定 |
|---|---|---|
| CSS 縮時 | `card-pack/index.html:414-418` | 有 `*` 縮時，**無** battle 的 confetti／spark `display:none` |
| pack `burstConfetti` | `pack.js:1355-1368` | emoji + `transition`；**無** `prefersReducedMotion` 檢查 |
| `legendFlash` | `pack.js:546-550` | 仍插入全螢幕 flash DOM |
| tide-wave／flip | CSS | 縮時後應瞬顯（卡片預設 `opacity:0` 靠 animation `forwards` 到 1，`.001ms` 通常仍到終幀）— **大致 OK** |
| pack.js | 全檔 | **無** `prefersReducedMotion` 函式 |

### 4.4 覆蓋完整度總表

| 區塊 | 完整度 | 級別 |
|---|---|---|
| 戰鬥 CSS 全局 | 高 | — |
| 戰鬥 JS 重特效（震、彩帶、slow） | 高 | — |
| 戰鬥 burstStars／dmg DOM 量 | 中（仍建 DOM） | **P2** |
| 開包 JS 特效 | 低於戰鬥 | **P1**（與 commit 訊息「reduced-motion 尊重」不完全對齊） |
| 音效 | 不在 motion 範圍 | 依 mute 鍵 |

**小結 (4)：戰鬥側「可用／大致完整」；開包側 JS 未對齊，整體不能算「完整覆蓋」。**

---

## (5) 連勝 streak 與勝敗判定一致（疲勞死／投降算不算斷）

### 5.1 單一結算寫入點

| 動作 | 檔案:行號 | streak 行為 |
|---|---|---|
| 勝 | `2815-2828` | `wins++`；`streak++`；更新 `bestStreak`；`lossStreak=0`；加金幣 |
| 敗 | `2830-2832` | `losses++`；**`streak = 0`**；`lossStreak++` |
| 持久化 | `2836-2837` | `card_stats_v1` + **mirror** `card_win_streak_v1` |
| UI | `2851-2852` | streak≥2 顯示「🔥 N 連勝」 |
| 入口 | 僅 `settleIfGameEnded` → `showOverlay` | 正式終局唯一路徑 |

### 5.2 疲勞死

| 項目 | 檔案:行號 | 結論 |
|---|---|---|
| 疲勞事件 FX | `2047-2051` | pop + log；傷害已在 core 扣 HP |
| 終局 | `2066` → `1686-1695` | `player.hp` 或 `enemy.hp` ≤0 → 同一 settle |
| streak | 同上 showOverlay | **疲勞勝＝連勝+1；疲勞敗＝連勝歸零** |

**判定：疲勞死與血殺一致，算正式勝敗。** **PASS**

### 5.3 「投降」

| 事實 | 證據 |
|---|---|
| **沒有**投降／concede 按鈕或 API | 全 `battle.js` 無 surrender／resign／投降 |
| 中途「新對戰」 | `newGame`（`454+`）、`#newGameBtn`／`#restartBtn`（`2901`、`2914-2915`） | **不呼叫** `showOverlay`，**不改** wins／losses／streak |

因此：

- **規格若把「投降＝敗」**：現況 **無投降**；最接近的棄局是 **中途 newGame → 不斷 streak、不記敗** → **P1 設計／經濟漏洞**（可連勝中途棄劣局保 streak）。
- **規格若「僅正式終局計 streak」**：現況自洽 — 只有 HP 歸零 settle 才動 streak。

審查採對抗立場：**若產品文案承諾「連勝」，玩家可用中途重開規避斷 streak**，應標 **P1**。

### 5.4 雙寫與讀取

| 鍵 | 寫 | 讀 |
|---|---|---|
| `card_stats_v1`.streak | `showOverlay`／`migrateStats` | `loadStats`、DDA `nextDdaState`（`core.js:262`） |
| `card_win_streak_v1` | **只寫** `2837` | **全 repo 無讀取** |

`card_win_streak_v1` 為死 mirror；`pack.js:1583-1591` `clearRecordStats` 清 stats 時 **未清** `card_win_streak_v1` → 長期可不同步（**P2**）。

### 5.5 與 DDA

`showOverlay` 在更新 streak 後呼叫 `Core.nextDdaState(s.dda, s, win ? "win" : "loss")`（`2835`）。`core.js:265-266` 用 **已更新後** 的 streak／lossStreak 加碼。疲勞勝敗同樣走此路徑 → **一致**。

**小結 (5)**

| 情境 | streak |
|---|---|
| 斬殺勝／敗 | 加／斷 |
| 疲勞勝／敗 | 加／斷 |
| 正式 overlay 終局 | 唯一計數點 |
| 投降 | **功能不存在** |
| 中途新對戰 | **不計、不斷** |

---

## 跨切：WebAudio 與開包爽度（附帶）

| 項目 | 位置 | 備註 |
|---|---|---|
| 解鎖 | `battle.js:222-226`、`pack.js` 對稱 | 首次 pointer／key；符合瀏覽器政策 |
| mute | 共用鍵 `card_audio_muted_v1` | 跨頁一致 **佳** |
| 種類 | play／attack／hurt／lethal／death；pack／flip／rare | R54 新增 |
| 潮紋 | `pack.js:529` `tide-pull` + `index.html:156-159` | 有；e2e `revealEffects.tide` |
| 開包序 | `502-542` 延遲翻開 | 與 battle 不同，**刻意阻塞操作**（pointerEvents）屬體驗設計 |

---

## 優先級發現清單

| ID | 級 | 標題 | 證據 |
|---|---|---|---|
| R4-01 | **P0** | 攻擊撲擊／受擊 flash／死亡溶散在真路徑被 `render()` 同步銷毀，宣稱爽點大量不可見 | `2158-2174`、`2031-2033`、`1739-1741` + 各 caller `render()` |
| R4-02 | **P0** | E2E 用 `markDying` 假陽性，未驗證結算後 DOM 是否仍帶 `.dying`／`.lunge-to` | `test-battle-e2e.js:321-327` |
| R4-03 | **P1** | 快速連點可堆積 dmg-float／spark／timer（不毀規則） | `2182-2214` |
| R4-04 | **P1** | 無投降；中途 `newGame` 可保 streak（棄局不斷連勝） | `454+` vs `2815-2832` |
| R4-05 | **P1** | 開包 JS 未尊重 reduced-motion（彩帶／flash 仍插入） | `pack.js:1355-1368`、`546-550` vs battle `2252-2253` |
| R4-06 | **P2** | AI 攻擊雙重 `animateAttackToward` | `1642-1643` + `1249` |
| R4-07 | **P2** | `card_win_streak_v1` 只寫不讀；清戰績不同步 | `2837`；`pack.js:1583-1591` |
| R4-08 | **P2** | `finishFx.lethal` 涵蓋所有終局含疲勞 | `2239` |
| R4-09 | **P2** | `burstStars` 未走 confetti 的 reduce／low-perf 閘 | `2862`、`2866-2879` vs `2252` |

**明確 PASS**

| ID | 項 |
|---|---|
| R4-P1 | 動畫不阻塞規則推進 |
| R4-P2 | 斬殺／終局期間戰鬥輸入被 `game.over` 擋住，AI 幽靈 timer 安全 |
| R4-P3 | **`core.js` 雜湊級零改動** |
| R4-P4 | 疲勞死與血殺共用 settle，streak 增減一致 |
| R4-P5 | 戰鬥頁 CSS reduced-motion 全局縮時 + confetti／spark 隱藏 |
| R4-P6 | 傷害 pop、board 微震、終局 slow／灰階／彩帶（非 low-perf）主路徑可成立 |

---

## 逐條結案（對使用者五問）

### (1) 動畫是否真不阻塞？佇列會不會堆積／錯亂？

- **不阻塞：是。** 規則同步；無 await 動畫佇列（`898-920`、`1248-1259`、`1988-2066`）。
- **狀態錯亂：未見。** 回合／`over` 閘門完整。
- **堆積：會（DOM／timer），P1。**
- **更嚴重：多項卡面動畫因 `render()` 根本播不出來，P0。**

### (2) 斬殺 slow 與 aiTurn／endTurn 時序？

- **規則安全：PASS。** `settleIfGameEnded` 立刻 `over=true`（`1686-1695`）；AI `1582+`、`1626`、`1635`、`1674` 均早退；`endTurn` 700ms 回呼有 `gRef`（`1316-1317`）。
- **演出中戰鬥輸入：被擋，不會改狀態。**
- **非戰鬥 UI：仍可點（含 newGame）。**

### (3) core.js 零改動？

- **PASS。** `843a423`／`HEAD`／工作樹 blob 皆 `88ec70fae0b28ab9076d9af89654cfd206af1289`；diff 空。

### (4) prefers-reduced-motion 覆蓋？

- **戰鬥 CSS + 重 FX JS：大致完整**（`index.html:554-561`；`2234`、`2242`、`2253`）。
- **開包 JS：不完整（P1）**；`burstStars` 等次要路徑 P2。

### (5) streak 與勝敗？

- **正式終局（含疲勞）：一致。** 勝加敗斷（`2825`／`2830`）。
- **投降：無此功能。**
- **中途重開：不斷 streak（P1 若視作逃勝保連勝）。**

---

## 建議後續（僅建議，本輪不實作）

1. **死亡／撲擊**：`renderField` 延遲移除死者，或先離場動畫再 `innerHTML`；至少 E2E 在 `attackMinion` 後、`render` 前／後分別 snapshot class。
2. **受擊 flash**：改查 uid 重抓 `elFor` 再加 class，勿閉包舊節點。
3. **中途棄局政策**：記敗斷 streak，或明示「未完賽不計」。
4. **pack** 對齊 `prefersReducedMotion` early-return。
5. 刪或真正使用 `card_win_streak_v1`。

---

## 審查聲明

- 本文件為 **R4 對抗覆核報告**，**未修改**任何原始碼或測試。
- 驗證以靜態路徑 + git 雜湊為主；未在本輪重跑完整 Playwright 套件（E2E 內容已對照原始碼）。
- 結論對齊版本 **card-battle-r54-v1**／commit **c439ffc**。
