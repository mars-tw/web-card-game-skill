# 《卡牌對戰》card-battle-r54-v1 — Grok 對抗式覆核 R5（combat-ghost 解耦）

| 欄位 | 內容 |
|---|---|
| 版本對齊 | **card-battle-r54-v1**（commit **`182de21`**：combat-ghost 動畫層與 render 解耦、e2e 改驗真路徑、pack reduced-motion guard） |
| 對照前版 | R4 宣稱 P0「撲擊／溶散被 `render()` 銷毀」；Codex 回覆見 `docs/CODEX_RESPONSE_card_R4.md` |
| 審查角色 | **監工・對抗覆核**（只審不改） |
| 審查範圍 | `templates/card-battle/{battle.js,index.html}`、`scripts/test-battle-e2e.js`；對照 `git show 182de21` diff |
| 方法 | 靜態路徑追蹤（`resolveAttack` → ghost clone → `handleCoreResult` → `render`）+ 選擇器語意 + e2e 時序推演；**不修改任何程式碼** |
| 約束 | 本文件只寫審查結論與證據；**不改**實作 |
| 日期 | 2026-07-11 |

## 總覽

| # | 覆核題 | 結論 | 一句話 |
|---|---|---|---|
| (1) | ghost 元素生命週期 | **主路徑建立／定時清除成立；無疊加上限；終局靠 timer 自消** | `cloneCardGhost` 建、`removeGhost`／`clearTransientFx` 清；AI 路徑會**雙倍**建立 |
| (2) | ghost 與實體卡位置同步 | **刻意 fixed 快照，不跟隨 reflow** | 撲擊／溶散不漂移；倖存者 reflow 時可出現**雙重 flash 錯位**（邊角） |
| (3) | e2e 新驗證有效性 | **大致有效，真路徑 + render 後存活可證** | 已告别 `markDying` 假陽性；未顯式斷言 `combat-ghost`、未蓋 AI 雙呼叫 |
| (4) | 新引入 bug | **無規則層 P0；有演出層 P1／P2** | AI 雙 `animateAttackToward`、斬殺雙 ghost 疊影、無上限堆積 |

**對 R4-P0 宣稱的總判定：P0「動畫被 render 銷毀」在玩家隨從互毆主路徑上已實質修復。**  
ghost 掛在 `document.body`，`renderField` 的 `innerHTML = ""` 不再抹掉撲擊／溶散／受擊 flash。

優先級：

| 級別 | 意義 |
|---|---|
| **P0** | 正確性／狀態錯亂／宣稱功能在真路徑仍失效且測試掩護 |
| **P1** | 明顯體驗落差、可擴充時放大、測試方法學缺口 |
| **P2** | 打磨／雙寫冗餘／邊角錯位 |

---

## (1) ghost 元素生命週期

### 1.1 誰建立

| 入口 | 檔案:行號 | 建立內容 |
|---|---|---|
| `cloneCardGhost(source, extraClass)` | `battle.js:2163-2181` | `cloneNode(true)` → 加 `combat-ghost` → `position:fixed` 座標／尺寸 → `document.body.appendChild` |
| 隨從互毆 | `battle.js:2190-2205` | `attackGhost`（`lunge-to`）+ `targetGhost`（無 extra，稍後再掛 flash） |
| 打臉（無 `.card` 目標） | `battle.js:2225-2228` | 僅 `attackGhost`（`attacking`）；英雄非 `.card`，`cloneCardGhost` 對目標回 `null`（`2164`） |
| 死亡 | `battle.js:2282-2288` + `2033-2035` | `markDying` → ghost + `dying`；由 `handleCoreResult` 的 `dying` event 觸發 |
| 玩家互毆 | `battle.js:1250-1251` | `resolveAttack` 內呼叫一次 `animateAttackToward` |
| 玩家打臉 | `battle.js:998` | 直接 `animateAttackToward(..., "enemyHero")`（一次） |
| **AI 互毆** | `battle.js:1644-1645`、`1650-1651` | **先** `animateAttackToward`，**再** `resolveAttack`（內部又呼叫一次）→ **雙倍 ghost** |

守衛條件：

- 來源必須有 class `card`（`2164`）
- `getBoundingClientRect()` 寬高為 0 則不建（`2165-2166`）
- clone 前剝離 `spawn/selected/targetable/can-attack/blocked/guide-focus`（`2168`）
- `aria-hidden="true"`、`pointer-events:none`、`z-index:180`（`2171-2179`）
- CSS 隱藏 ghost 上的詳情鈕（`index.html:190-191`）

### 1.2 誰清除

| 機制 | 檔案:行號 | 時機 |
|---|---|---|
| `removeGhost(ghost, delay)` | `battle.js:2184-2187` | 僅 `setTimeout(() => ghost.remove(), delay)` |
| 撲擊 ghost | `2205` | `lungeMs + 40`（high ≈ **400ms**；low ≈ 230ms） |
| 受擊 ghost | `2223` | `hitDelay` 後再 `hitMs + 60`（high 總壽命 ≈ **530ms**） |
| 打臉 attack ghost | `2228` | `attackMs + 40`（high ≈ 340ms） |
| 死亡 ghost | `2288` | `deathMs + 80`（high ≈ **640ms**） |
| `clearTransientFx()` | `2159-2161` + `ACTIVE_FX_SELECTOR` `151` | 一次掃掉 `.combat-ghost` 及 dmg/spark/combo/kw/confetti/burst-star |
| `newGame()` | `458` | 開新局清 transient FX |
| `__test.setup` | `3049` | e2e 場景重置前清 FX |

**沒有**在 `checkWin`／`showOverlay`／`render()` 內清除 combat-ghost。終局殘留依賴各自 timer；玩家按「新對戰」才強制清。

`removeGhost` 不處理「節點已被 `clearTransientFx` 拔掉」的情況，但對 detached node 再 `.remove()` 無害（P2 整潔度）。

### 1.3 快速連續攻擊：疊加上限

| 觀察 | 證據 | 判定 |
|---|---|---|
| **無上限** | 每次 `animateAttackToward` 無條件 `appendChild`；無 pool、無 max concurrent | **P1** 堆積風險 |
| 玩家連擊 | 多隻可攻隨從可在前一擊 ghost 未到期前再攻；每擊至少 2 ghost（攻+受）+ 可能 1 dying | 視覺疊卡 |
| AI 節流 620ms | `battle.js:1669` `setTimeout(step, 620)` | 單步通常 > ghost 壽命，**單步內**仍因雙呼叫一次產 4 個 card-ghost |
| 斬殺同幀 | `targetGhost`（`2201`）+ `markDying` ghost（`2286`）同 uid 同位 | **雙影**直到 hit ghost 先清 |

對比 R4 的 dmg-float／spark 堆積：ghost 是完整卡面 clone（含 `<img>`），**單節點成本更高**。

### 1.4 對局結束殘留

| 情境 | 行為 | 判定 |
|---|---|---|
| 終局 overlay | `checkWin`→`triggerFinishEffect`／`showOverlay` **不清** ghost | timer 自消；overlay 可能蓋住殘影（P2） |
| 中途 `newGame` | `clearTransientFx`（`458`） | **PASS** 不殘留 |
| AI 舊局 timer | `gRef` 防護（`1636-1637`）停規則步進；**已排程的** `removeGhost` 仍會 fire（只是 remove DOM） | 可接受 |
| e2e `setup` | 清 FX（`3049`） | **PASS** |

### 1.5 小結 (1)

| 子項 | 判定 |
|---|---|
| 建立時機正確（render 前） | **PASS** — `1251` → events/`markDying` → caller `render()` |
| 定時移除 | **PASS**（主路徑） |
| 新局清理 | **PASS** |
| 疊加上限 | **FAIL / P1** — 無 cap |
| 終局顯式清理 | **弱 / P2** — 靠 timer |
| AI 雙建立 | **P1** — 見 §4 |

---

## (2) ghost 與實體卡片位置同步

### 2.1 定位模型

```text
clone 當下 getBoundingClientRect()
  → style.left/top/width/height = 像素快照
  → position:fixed 掛 body
  → 之後 renderField 重排場上真卡，ghost 座標不變
```

證據：`battle.js:2165-2176`。  
撲擊位移靠 CSS 變數 `--lx/--ly`（`2203-2204`）+ `lungeTo` keyframes（`index.html:193`、`527`），**不是**追蹤活卡 DOM。

### 2.2 會不會「漂移錯位」？

| 情境 | 預期視覺 | 判定 |
|---|---|---|
| 攻擊者 ghost 撲擊 | 從攻擊**當下**位置朝目標向量衝刺；真卡已被 render 換新（常無 lunge class） | **正確解耦**，不應跟新卡走 |
| 死亡溶散 ghost | 留在死亡前格子，場上該 uid 已不存在 | **正確**；reflow 後空位由活卡補上，溶散不該黏在新卡上 |
| 受擊 flash：目標死亡 | `liveTarget` 經 `elFor` 可能指到 **ghost 自己**（場上已無真卡，body 上 ghost 仍帶同 `data-uid`）→ `hitEl === liveTarget`，只 flash 一次 | **可接受**（`2214-2218`） |
| 受擊 flash：目標存活且同場有其他單位死亡 reflow | `targetGhost` 停在舊座標 + `liveTarget` 在新座標各 flash 一次（`2215-2218`） | **P2 雙重 flash 錯位**（亡語清場、AoE 後較易） |
| 視窗 resize／捲動於動畫中 | fixed 相對 viewport；對戰板少捲動 | 邊角 P2 |
| 英雄受擊 | 目標非 `.card`，無 target ghost；`hit-shake`/`hit-flash` 加在 `.hero` 上，但 CSS 選擇器是 **`.card.hit-flash`**（`index.html:360`） | 英雄 flash **本就不生效**（既有缺口，非 ghost 引入，但解耦也沒補） |

### 2.3 `elFor` 與 ghost 同 uid

```js
// battle.js:2155-2157
document.querySelector(`.card[data-uid="${uidOrId}"]`)
```

- 場上真卡在 `.board` 內，DOM 順序通常**早於** append 到 `body` 末端的 ghost → 有真卡時優先命中真卡。**PASS**
- 真卡被 render 移除後，同 uid 的 **ghost 會成為 `elFor` 命中對象**。  
  - 對 delayed hit flash：仍能打到 ghost，**有利**  
  - 若未來有人在 render **之後**對已死 uid 做 `flashCard`／`floatDamage`，座標會落在 ghost 上或依賴殘留 ghost 壽命 — 架構隱性耦合（**P2 可維護性**）

### 2.4 小結 (2)

| 子項 | 判定 |
|---|---|
| 撲擊不因 render 重排而「黏錯卡」 | **PASS**（fixed 快照） |
| 溶散位置 | **PASS** |
| 與活卡持續同步 | **不做**（設計如此） |
| reflow 雙 flash | **P2** |
| 英雄 hit 演出 | **既有缺口**，ghost 未覆蓋 |

---

## (3) e2e 新驗證的有效性

### 3.1 改動對照（R4 假陽性 → R5 真路徑）

| 項目 | R4（`c439ffc` 時代） | R5（`182de21`） | 檔案:行號 |
|---|---|---|---|
| 攻擊 FX | 只斷 `damagePops` | `damagePops` + **`lunge >= 1`** | `test-battle-e2e.js:313-320` |
| 死亡 | `T.markDying(uid)` 直接掛 class | `setup(dragon, wolf)` + **`attackMinion`** | `321-330` |
| 受擊 flash | 無 | `sleep(160)` 後 `hitFlash >= 1` | `331-334` |
| 生命週期結束 | 無 | 再 `sleep(620)` 後 dying/lunge/hitFlash 皆 0 | `335-338` |
| effects 探測 | 無 ghost/lunge/hitFlash | 擴充計數 | `battle.js:3093-3103` |

`__test.attackMinion` 路徑（`3064-3068`）：

```text
resolveAttack → animateAttackToward（建 ghost）
             → Core.resolveAttack + handleCoreResult（dying ghost）
             → render()          ← 真卡重建／死者消失
```

與玩家 UI 主路徑 `clickEnemyMinion`（`963-965`）同序。**這點成立。**

### 3.2 斷言是否真的在驗「render 後存活」？

| 斷言 | 機制 | 有效？ |
|---|---|---|
| `lunge >= 1` @ t≈80ms | 計數 `.combat-ghost.lunge-to, .card.lunge-to`（`3101`）。render 後真卡是新建 DOM、**不會**帶 `lunge-to`；能過幾乎必然靠 **ghost** | **有效（隱式）** |
| `dying >= 1` | 計數 `.card.dying`（`3099`）。wolf 被龍斬殺後場上無該卡；能過靠 **ghost.dying**（仍含 class `card`） | **有效（隱式）** |
| `hitFlash >= 1` @ t≈240ms | high perf：`hitDelay=150` 才掛 class（`2199`、`2216`）；240ms 落在 flash 窗內 | **有效（時序合理）** |
| 結束後歸零 @ t≈860ms | lunge 清 ≈400ms、hit ghost ≈530ms、dying ≈640ms | **有效** |
| 場景數據 | dragon 8/8 vs titan 8/8（互砍雙死仍有 lunge）；dragon vs wolf 2/2（斬殺 dying） | **有效** |

### 3.3 方法學剩餘缺口

| 缺口 | 嚴重度 | 說明 |
|---|---|---|
| **未顯式** `ghosts >= 1` 或 `.combat-ghost` | P2 | 訊息寫 "render-surviving"，斷言卻只數 class；目前因 render 清場而「碰巧」綁死 ghost，但可讀性／抗回歸弱於直接斷言 |
| 不驗證 **動畫在播**（computed style / opacity） | P2 | 只驗證 DOM class 存在（對此 P0 足夠） |
| 不覆蓋 **AI 雙呼叫** 路徑 | P1 | e2e 只打 `__test.attackMinion`（單次 `animateAttackToward`） |
| 不覆蓋打臉／無 target ghost | P2 | |
| 不覆蓋連續多擊堆積 | P2 | |
| 不覆蓋 reflow 雙 flash 座標 | P2 | |
| `settledFx` 未斷言 `ghosts === 0` | P2 | 若未來留下「無 lunge/dying/hitFlash class 的裸 ghost」會漏 |
| 僅 `vp.w === 1280` 分支執行 | 既有 | 窄視口 e2e 不跑此 FX 塊 |

### 3.4 小結 (3)

**判定：e2e 新驗證對「R4 P0 假陽性」的修正成立；能合理證明真攻擊路徑 + `render()` 後撲擊／溶散／flash 的 DOM 仍在，並於時長後清除。**  
不是完美契約測試，但**不再是** `markDying` 自欺。

---

## (4) 新引入 bug 與殘留風險

### 4.1 P0 複驗（R4 主訴）

| 宣稱 | R4 狀態 | R5 狀態 |
|---|---|---|
| 撲擊被 render 抹掉 | P0 真失效 | **已修** — body ghost + e2e `lunge` |
| 溶散被 render 抹掉 | P0 真失效 | **已修** — dying ghost + e2e 真路徑 |
| 受擊 shake/flash 打在 detached node | P0 體驗失效 | **已修** — `targetGhost` 延遲掛 class（`2213-2223`） |
| 規則被動畫阻塞 | 無 | 仍無 — 同步結算不變 |
| `core.js` 被改 | 無 | **本 commit diff 空**（規則零動） |

→ **R4-01 P0 主訴關閉（玩家主路徑）。**

### 4.2 本輪新發／被放大問題

| ID | 級別 | 問題 | 證據 |
|---|---|---|---|
| **R5-01** | **P1** | **AI 互毆雙重 `animateAttackToward`** → 每次 2× 攻 ghost + 2× 受 ghost，雙重撲擊／雙重 hit 排程 | `1644-1645`、`1650-1651` 外呼 + `1251` 內呼；R4 已點名，**ghost 解耦後從「看不見的浪費」變成「看得見的雙影」** |
| **R5-02** | **P1** | **無 ghost 併發上限**；完整卡面 clone（含 art img）連擊可堆 DOM／合成層 | `2163-2181` 無 cap；對照 `ACTIVE_FX` 只在新局清 |
| **R5-03** | **P2** | **斬殺雙 ghost**：`targetGhost`（flash）與 `dying` ghost 同位疊加 | `2201` + `2286` |
| **R5-04** | **P2** | 真卡仍被掛 `lunge-to`／`dying` 後立刻被 render 銷毀 — 冗餘寫入 | `2210`、`2287` vs `1741-1743` |
| **R5-05** | **P2** | 倖存目標 + 同場 reflow → ghost 與 live 雙 flash 座標不一致 | `2215-2218` + `renderField` 全量重建 |
| **R5-06** | **P2** | 終局／overlay 不掃 ghost；僅 `newGame`／`setup` | `1684-1696` vs `458` |
| **R5-07** | **P2** | `elFor` 在死者僅剩 ghost 時命中 ghost — 隱性 API 語意 | `2155-2157` |
| **R5-08** | **P2** | e2e 未斷言 `combat-ghost`／`ghosts`、未測 AI 雙呼叫 | `test-battle-e2e.js:309-338`、`battle.js:3093-3103` |
| **R5-09** | 既有 | 打臉無 target ghost；`.card.hit-flash` 不作用於 `.hero` | `2164`、`index.html:360`、`713-723` |

### 4.3 Codex 回覆對照（`CODEX_RESPONSE_card_R4.md`）

| Codex 說法 | 覆核 |
|---|---|
| combat-ghost 與 render 解耦，撲擊／flash／溶散真可見 | **同意（玩家主路徑）** |
| e2e 改驗真路徑 | **同意**（§3） |
| `newGame`／setup 清 transient FX | **同意** |
| 「AI 攻擊同走 `animateAttackToward`，ghost 修正後不再被 render 抹掉」 | **半對**：AI 確實可見，但因**雙呼叫**變成雙影；應刪外層呼叫 |

### 4.4 非 bug 的正確行為（避免誤殺）

- ghost `pointer-events:none` + 詳情鈕隱藏：不擋操作、不誤開 detail。
- `cloneNode` 不複製 JS `onclick`：安全。
- 規則／`core.js` 未捲入動畫生命週期：狀態正確性不受 ghost 影響。
- `prefers-reduced-motion` 下 CSS 動畫近 0 時長，但 ghost 仍按 JS delay 佔 DOM — 與既有 dmg-float 策略一致，非回歸 P0。

---

## 優先級汇总（僅審查建議，不實作）

| 優先 | ID | 建議方向（審稿用，非 patch） |
|---|---|---|
| P1 | R5-01 | AI 分支刪除外層 `animateAttackToward`，只留 `resolveAttack` 內一次 |
| P1 | R5-02 | 可選：同 uid 取代舊 ghost、或全域 max concurrent combat-ghost |
| P2 | R5-03 | 斬殺時跳過 plain `targetGhost`，或 dying ghost 兼 hit flash |
| P2 | R5-05 | flash 只打 ghost **或** 只打 live，避免雙掛 |
| P2 | R5-06 | `checkWin`／overlay 前 `clearTransientFx` 或縮短 delay |
| P2 | R5-08 | e2e：`assert(effects.ghosts >= 1)` 且 lunge 節點含 `combat-ghost`；可加 AI 單步 ghost 數 == 2 而非 4 |

---

## 結論

1. **R4 P0 主訴已修：** `combat-ghost` 把撲擊／受擊 flash／死亡溶散移出 `renderField` 銷毀範圍，玩家 `resolveAttack → handleCoreResult → render` 真路徑上動畫 DOM **可存活至 timer**。  
2. **生命週期：** 建立清楚、移除以 `setTimeout` 為主、新局有硬清；**缺疊加上限**；終局不硬清。  
3. **位置：** fixed 快照是正確的解耦策略；**不**跟隨 render reflow；邊角有雙 flash 錯位，非主路徑崩壞。  
4. **e2e：** 已從假陽性升級為真路徑 render 後存活驗證，**有效**；仍缺顯式 `combat-ghost` 斷言與 AI 雙呼叫覆蓋。  
5. **新／放大問題最高為 P1：** AI 雙重 `animateAttackToward` 在 ghost 可見後變成雙影；其餘為 P2 打磨。

**總評：P0 修復成立，可接受合併；建議後續 ticket 清 R5-01／R5-02 再稱「演出層完成」。**

---

## 證據索引（檔案:行號）

| 主題 | 位置 |
|---|---|
| commit / 版本 | `182de21`；`index.html`／`battle.js` 等 `card-battle-r54-v1` |
| ACTIVE_FX / clear | `battle.js:151`、`458`、`2159-2161`、`3049` |
| clone / remove ghost | `battle.js:2163-2187` |
| 攻擊動畫 + hit 延遲 | `battle.js:2190-2230` |
| 死亡 ghost | `battle.js:2033-2035`、`2282-2288` |
| resolveAttack 序 | `battle.js:1250-1261` |
| 玩家 UI render | `battle.js:963-965`、`1007` |
| AI 雙呼叫 | `battle.js:1644-1651`、`1668-1669` |
| render 清場 | `battle.js:1701-1770`、`1741-1743` |
| elFor | `battle.js:2155-2157` |
| effects 掛鉤 | `battle.js:3093-3103` |
| attackMinion | `battle.js:3064-3068` |
| CSS combat-ghost / lunge / dying / hit-flash | `index.html:184-193`、`360`、`525-527` |
| e2e FX 塊 | `scripts/test-battle-e2e.js:309-338` |
| Codex 自述 | `docs/CODEX_RESPONSE_card_R4.md` |
| R4 對抗底稿 | `docs/GROK_REVIEW_card_R4.md` §1.3–1.4 |

*本報告只審不改。結論對齊版本 **card-battle-r54-v1**／commit **182de21**。*
