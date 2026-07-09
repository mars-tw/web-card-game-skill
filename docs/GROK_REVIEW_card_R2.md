# 《卡牌對戰》web-card-game-skill — Grok 對抗式覆核 R2

| 欄位 | 內容 |
|---|---|
| 版本對齊 | **card-battle-r49-v1**（Codex 對 R1 的熱修後） |
| 審查目標 | 對抗性驗證 R1/r49 五項修正是否**真的成立**，並找殘留／新 bug |
| 審查範圍 | `templates/card-battle/core.js`、`cards.js`、`battle.js`（對照 `scripts/test-core.js`、`test-cards.js`、`test-battle-e2e.js`、`docs/CODEX_RESPONSE_card_R1.md`） |
| 方法 | 讀真實程式路徑 + 本地推導／`node` 重現；**只審不改** |
| 約束 | 本文件只寫審查；**不改**遊戲程式碼／測試／資源 |
| 日期 | 2026-07-09 |

## 總覽

| R1 修正項 | 覆核結論 | 一句話 |
|---|---|---|
| (1) `DECK_SIZE=20` 全路徑統一 | **成立** | 組牌／驗證／AI／開局／E2E 皆 20；無 runtime 殘留 24 張牌庫 |
| (2) 空庫疲勞 + 必終局 | **核心成立，UI 層有缺口** | 遞增疲勞與 core 終局算術正確；battle AI 在致死疲勞後仍可能「殭屍出牌」 |
| (3) 戰吼自動選敵 | **成立（契約降級後）** | 文案與 core 一致；玩家／AI 同路徑；非互動式指定 |
| (4) 四卡再平衡 | **點名配對成立；池內仍有殘留優勢／無效卡** | 原 P0 四組已消除；完整複製與嚴格劣勢卡仍在 |
| (5) 新引入 bug | **有** | 主要是疲勞致死後 AI 流程未 early-return；其餘為平衡／測試掛鉤債 |

優先級定義（與 R1 相同）：

| 級別 | 意義 |
|---|---|
| **P0** | 正確性／公平性缺陷，或長局可能壞體驗；建議下一個修補版處理 |
| **P1** | 明顯 bug、強度失衡、或擴充成本會快速上升的架構債 |
| **P2** | 效能／可維護性／體驗打磨 |

---

## (1) `DECK_SIZE=20` 是否全路徑一致？有無殘留 24？

### 結論：**成立**（無 runtime 牌庫雙軌）

| 路徑 | 檔案:行號 | 行為 | 判定 |
|---|---|---|---|
| 常數 | `core.js:22`、`core.js:1274` | `DECK_SIZE = 20` 並 export | 單一真相 |
| 驗證 | `core.js:644-647` | `validateDeck` 要求剛好 `DECK_SIZE` | OK |
| 構軸 AI | `battle.js:580-592`、`596-600` | `buildArchetypeDeckIds` 以 `Core.DECK_SIZE` 截斷 | OK（normal/hard） |
| easy AI | `battle.js:619-621` | `buildDeck(false)` → 同 fallback 路徑 | OK（不再 24） |
| 玩家自訂 | `battle.js:527-536`、`688-691` | `loadSavedBattleDeck` + `length === Core.DECK_SIZE` | OK |
| fallback 補牌 | `battle.js:693-710`、`666-677` | `while (deck.length < Core.DECK_SIZE)` + `canAddDeckCopy`（同名 2／傳說 1） | OK |
| 開局契約 | `battle.js:348-360`、`680-685` | 雙方 `fatigue: 0`；`assertOpeningDeckTotal` 要求 `hand+deck === DECK_SIZE` | OK |
| 牌組編輯 | `pack.js` 多處 + `index.html` `0/20` | 使用 `Core.DECK_SIZE` | OK |
| 測試 | `test-core.js` 牌組 20；`test-battle-e2e.js:361-389` saved／fallback／easy／hard | 鎖 20 | OK |

### 殘留「24」掃描

在 `templates/card-battle/**/*.{js,html}` 內：

- **沒有** `while (... < 24)`、`DECK_SIZE = 24`、或「牌庫 24 張」邏輯。
- 出現的 `24` 僅為 CSS 尺寸（`index.html`）、AI 評分權重（`battle.js:893`、`1336`、`1345-1346`）——**與牌庫張數無關**。
- 歷史文件 `docs/GROK_REVIEW_card_R1.md` 仍描述舊 bug（預期）；`README.md` 有「24 種早期卡」敘事用語，不是 runtime 雙軌。

### 最小重現（開局契約）

1. 清 `localStorage` 或放非法 19 張 `card_deck_v1` → `__newGame()`。  
2. 斷言：`player.hand.length + player.deck.length === 20` 且 enemy 同（fallback／easy AI 路徑）。  
3. 合法 20 張存檔 → `source === "saved"` 且 liveIds 長度 20。  

（E2E 已覆蓋；runtime 另有 `assertOpeningDeckTotal` 硬失敗。）

### 殘留小債（非雙軌回歸）

| # | 級別 | 說明 |
|---|---|---|
| D-R2-1 | P2 | `pack.js:881` 等字串仍寫死「20 張」；若未來改 `DECK_SIZE` 會與常數漂移。建議訊息也插 `Core.DECK_SIZE`。 |
| D-R2-2 | P2 | `Core.buildBattleDeck` 本身不強制輸出長度＝`DECK_SIZE`（缺卡 id 會變短）；目前由 `loadSavedBattleDeck` 與開局 assert 擋下，可接受。 |

---

## (2) 疲勞是否正確累加？雙方空庫會不會無限？

### 結論：**core 規格成立；終局算術有界；battle 流程有 P1 缺口**

### 規則路徑（成立）

| 項目 | 檔案:行號 | 觀察 |
|---|---|---|
| 空庫 | `core.js:1134-1138` | `drawCardInternal` 空庫 → `applyFatigue`，不再靜默 `return null` 而無代價 |
| 遞增 | `core.js:767-773` | `fatigue = floor(prev)+1`；英雄扣 `count`；事件 `{ type: "fatigue", amount, count }` |
| 共用入口 | `core.js:877-878`、`948-950`、`1198`、`1205` | `drawCard1`／`draw2`／回合抽牌同路徑 |
| UI | `battle.js:1802-1806`、`1817` | 跳字／log；`handleCoreResult` 末呼叫 `settleIfGameEnded` |
| 勝負 | `battle.js:1469-1476` | 任一方 `hp <= 0` 結束；敵方先 ≤0 則玩家勝（含雙死） |
| 單元測 | `test-core.js:474-511` | 空抽 1；`draw2` 連觸 1+2；雙方空庫遞增並分勝負 |

### 有界性（不會無限）

- 第 n 次空抽傷害 n；累積 `1+…+n = n(n+1)/2`。  
- 以 30 血估算：約第 8 次空抽累積 36，必穿（`node` 推導一致）。  
- 模擬雙方空庫、無場、僅輪抽：約 **step 7** 敵方 `fatigue=8` 先死，玩家仍存活（`p≈2, e=-6`）——**控制鏡無法永久拖**。  
- 吸血／治療只能延後，無法取消遞增；場上有界（`MAX_FIELD=7`），淨回復無法永遠壓過遞增疲勞。

### `draw2` 雙跳（成立且有測）

空庫打 `draw2` → 連續 `fatigue 1` 再 `2`（合計 3 傷）。合理且與 Hearthstone 類設計對齊。

### 殘留／新問題

| # | 級別 | 檔案:問題 | 最小重現 | 建議 |
|---|---|---|---|---|
| F-R2-P1-1 | **P1** | **`battle.js:1371-1405`：`aiTurn` 在 `startEnemy` 抽牌致死疲勞後未 `return`**。`handleCoreResult` 已 `game.over=true` 並秀勝敗，但 while 出牌迴圈仍可能繼續 `playCard`（core 不看 `over`）。攻擊相位有 `game.over` 檢查（`1411`），出牌沒有。 | 敵方 `hp=1`、`deck=[]`、手牌有 0 費隨從 → 結束玩家回合進 AI → 疲勞擊殺後仍可能 log「對手召喚了…」。`node` 驗證：core 在 `hp<=0` 後 `playCard` 仍 `ok`。 | `startEnemy` 後 `if (game.over) return`；出牌 loop 每步也檢查。 |
| F-R2-P1-2 | **P1** | **`battle.js:1457-1462`：`endAiTurn` 在玩家 `endEnemy` 抽牌疲勞致死後仍 log「輪到你了」**。結算 overlay 已顯示落敗，訊息矛盾。 | 玩家 `hp=1`、`deck=[]` → AI 回合正常結束 → 玩家抽牌疲勞死亡 → 見敗方 UI 與「輪到你了」。 | `handleCoreResult` 後若 `over` 則 `return`，勿推進文案。 |
| F-R2-P2-1 | P2 | core **不**設 `state.over`；終局完全依賴 battle。測試層只斷言 HP，不涵蓋「致死後禁止再行動」。 | — | 補 e2e：空庫 AI 起手致死後 `enemy.field` 不再增加。 |
| F-R2-P2-2 | P2 | 困難難度敵方 34 血（`battle.js:31`）只延長疲勞回合，不破壞有界性。 | — | 文件化即可。 |

**對 R1 C-P0-2 的裁決：** 規則層採納成功；「長局必結束」在**血量算術**上成立。若定義包含「結束後不再有遊戲動作」，則 battle 流程尚未完整。

---

## (3) 戰吼自動選敵是否公平？AI 與玩家是否一致？

### 結論：**在 r49「文案降級」契約下成立且公平**

Codex 明確**不**做 `pendingBattlecry`，改鎖「自動命中生命最低敵方隨從」。覆核此契約：

| 檢查 | 檔案:行號 | 結果 |
|---|---|---|
| 選目標 | `core.js:969-974` | `damageAny1` → 敵方場 `sort(a.health-b.health)[0]` |
| 出牌入口 | `core.js:1030-1033` | `playCard` 一律 `pickBattlecryTarget`，**忽略** `action.targetUid` |
| 結算 | `core.js:863-868` | 有 target 才打 1 傷；吸血用 `dyingCard`（來源卡） |
| 文案 | `cards.js:105`、`146`、`159` | 「自動對生命最低的敵方隨從／手下…」 |
| 測試 | `test-core.js:514-525` | 傳 `targetUid: "high"` 仍打 `low` |
| 玩家 | `battle.js:722` | `Core.playCard(..., { side: "player" })` |
| AI | `battle.js:1386` | 同 `Core.playCard(..., { side: "enemy" })` |

### 公平性細節

1. **同碼路徑**：無「AI 自選、玩家最低血」分裂。  
2. **等血決勝**：stable sort 保留場上順序（先上場者優先）。雙方規則相同。  
3. **無目標**：`target=null`，戰吼事件仍發、傷害跳過，身體照進場（`node`：`ok`、`targetUid=null`）。雙方相同。  
4. **不可打英雄**：契約如此；文案已不再暗示 any-target／打臉。  
5. **聖盾最低血**：1 點可能被盾吃掉（戰術損失），雙方同規。

### 殘留（非 r49 回歸失敗，屬已知取捨）

| # | 級別 | 說明 |
|---|---|---|
| B-R2-1 | P1（產品深度） | 無法 reping 嘲諷、無法指定補刀——R1 原建議的互動式戰吼仍未做。若產品要深度，需另開 `pendingBattlecry` 設計輪。 |
| B-R2-2 | P2 | 測試掛鉤 `battle.js:2705` `triggerBattlecry` 仍打 `enemy.field[0]`，**與 production 最低血不一致**。E2E 目前未用此測 `damageAny1`，但會誤導手動／未來測試。 |
| B-R2-3 | P2 | `mage`/`duskWitch` 用「隨從」、`battleDrummer` 用「手下」——用詞不統一，規則相同。 |

---

## (4) 再平衡後有無新優勢卡／無效卡？

### 點名四卡（R1 B-P0-1）— **修正成立**

| 卡 | r49 狀態（`cards.js`） | 對照 | `test-cards.js` gate |
|---|---|---|---|
| `emberVolley` | cost **2**，`damage3`（:156） | 與 `firebolt` 同費同效 | :121-122 防再變低費 |
| `arcaneVeil` | cost **1**，`giveShield`（:141） | 與 `shieldUp` 同費同效 | :123-124 |
| `frontScout` | 2 費 **2/2** rush（:132） | vs `sparkSquire` 1 費 2/1 rush | :125-126 |
| `thunderRoc` | 4 費 **2/4** windfury（:182） | vs `griffin` 5 費 3/4 | :127-128 |

**未引入「新的嚴格優勢」於這四組本身**；`frontScout`/`thunderRoc` 有清楚費用／體型階梯。

### 再平衡後的次生問題

| # | 級別 | 問題 | 證據 |
|---|---|---|---|
| BAL-R2-1 | **P1** | **`emberVolley` ≡ `firebolt`**（同 rare 階 common、同 cost、同 effect）→ 純複製，開包／構築無差異，只占 id。 | `cards.js:120` vs `:156` |
| BAL-R2-2 | **P1** | **`arcaneVeil`（rare）≡ `shieldUp`（common）** 同費同效 → rare **嚴格劣於** common 的收藏價值（更難抽到卻無機械優勢）。r49 把 veil 從「較貴劣勢」修成「等價」，但稀有度仍懲罰。 | `cards.js:122` vs `:141` |
| BAL-R2-3 | P1 | **仍存在嚴格費用支配（未在本輪 touch）**：`lightning` 4 費 `aoe2` ≫ `starfall` 5 費 `aoe2`；`polymorph`/`tidebinderHex` 4 費 ≫ `forbiddenHex` 5 費。 | `cards.js:125-126`、`147-148`、`161` |
| BAL-R2-4 | P1 | **`runicScrivener`（2 費 1/2 抽）嚴格優於 `novicePage`（2 費 1/1 抽）**。 | `cards.js:169` vs `:184` |
| BAL-R2-5 | P1 | **`heal` ≡ `holyGlimmer`**、**`frost` ≡ `thunderClap`**（同費同 effect 複製）。 | `cards.js:121/134`、`124/140` |
| BAL-R2-6 | P2 | `frontScout` 2/2 rush 相對 `archer` 2/2 無關鍵字（同費）→ scout 嚴格較優；可接受為「有關鍵字溢價」。 | `cards.js:100` vs `:132` |
| BAL-R2-7 | P1（殘留 R1） | **`runicScrivener` 仍標 `aggro` 軸**（`cards.js:213`），扭曲 `detectDeckArchetype`。R1 B-P1-6 未修。 | 構軸／DDA 原型誤判 |
| BAL-R2-8 | P1（殘留 R1） | normal/hard AI 全池最強 20 張（`buildArchetypeDeck`）不受收藏限制——張數公平已修，**強度公平未修**（R1 B-P0-2）。 | `battle.js:596-629` |

**對 R1 B-P0-1 的裁決：** 點名嚴格優勢**已消除**；策略從「支配」變成「複製／稀有度倒掛／池內其他支配」——平衡債縮小但未清零。

---

## (5) 新引入 bug 與 r49 順帶修補覆核

### r49 一併宣稱的修補

| 項目 | 覆核 |
|---|---|
| 風怒斬殺 `heroAttackPotential` | **成立**（`battle.js:758-761`、`1415-1416`）：`windfury && !_windUsed` 計 2 擊 |
| easy/random `polymorph`/`giveShield` | **成立**（`battle.js:1272-1278`） |
| fallback 構築上限 | **成立**（`canAddDeckCopy` + `legalCopyLimit`） |
| Mulligan／組牌 `rng()` | **成立**（`shuffleInPlace` 用 `rng()`；`offerMulligan:499`） |
| 文件／版本 r49 | cache query、SW key、`data-model.md` `DECK_SIZE=20` 對齊 |

### r49 新引入／新暴露

| # | 級別 | 問題 | 重現 |
|---|---|---|---|
| N-R2-P1-1 | **P1** | 同 F-R2-P1-1：疲勞致死後 AI 殭屍出牌（疲勞是新機制才讓此路徑變高頻） | 見 §2 |
| N-R2-P1-2 | **P1** | 同 F-R2-P1-2：敗方仍「輪到你了」 | 見 §2 |
| N-R2-P2-1 | P2 | 疲勞事件有 `amount`/`count` 雙鍵同值——無功能 bug，API 略冗余 | `core.js:772` |
| N-R2-P2-2 | P2 | 嚴格優勢 gate 只鎖「Grok 點名四組」；`starfall`/`forbiddenHex` 等不會被 CI 擋住 | `test-cards.js:112-128` |

### 未在 r49 修、仍成立的舊債（摘錄，避免重複整份 R1）

- 亡語 `target=null`（C-P1-3）、cleanup 順序（C-P1-4）、`makeUid` 碰撞（C-P1-6）  
- effect 巨型 switch（A-P0-1）  
- 同時致死無平手（C-P2-4）  

---

## 逐條裁決表（對 Codex R1 回應）

| R1 ID | Codex | R2 對抗裁決 |
|---|---|---|
| C-P0-1 DECK 24/20 | 採納 | **PASS** — 全路徑 20，無 runtime 24 牌庫 |
| C-P0-2 疲勞 | 採納 | **PASS（core）／PARTIAL（battle）** — 有界終局成立；AI／文案流程缺口 |
| C-P0-3 戰吼指定 | 部分採納（文案） | **PASS（契約內）** — 文案＝實作＝雙邊一致；互動深度仍缺 |
| C-P1-1 風怒斬殺 | 採納 | **PASS** |
| C-P1-2 random 法術 | 採納 | **PASS** |
| C-P1-5/7 rng 與 fallback 上限 | 採納 | **PASS** |
| B-P0-1 四卡平衡 | 採納 | **PASS（點名）／PARTIAL（池）** — 複製與其他支配仍在 |
| B-P0-2 AI 收藏公平 | 部分 | **仍 FAIL（產品）** — 僅張數公平 |
| B-P1-1 控制鏡 | 疲勞落地 | **PASS（終局）** — 再生仍慢，但不無限 |

---

## 測試缺口（建議下輪補，本輪不改碼）

| 優先 | 場景 | 理由 |
|---|---|---|
| P0 | AI `startEnemy` 疲勞致死後 `playCard` 次數＝0、無新召喚 log | 鎖 F-R2-P1-1 |
| P0 | 玩家空庫抽牌致死後不出現「輪到你了」 | 鎖 F-R2-P1-2 |
| P1 | 靜態 gate：同 `effect` 不得存在「更高 cost 完全相同效果」；同 cost 同 trigger 時 body 不得嚴格支配 | 取代單點四卡 assert |
| P1 | 敵我各召喚 `damageAny1` 戰吼，目標皆為對方最低血 | 雙邊契約 e2e |
| P2 | `__test.triggerBattlecry` 與 production picker 對齊或標 `@deprecated` | 避免測試債 |

本地已跑：`node scripts/test-core.js` → **100/100 PASS**；`test-cards.js` 嚴格優勢四組 PASS。

---

## 建議修補順序（仍只建議不實作）

1. **R2a（正確性）**：`aiTurn`／`endAiTurn` 在 `handleCoreResult` 後若 `game.over` 立即 return；補 e2e。  
2. **R2b（平衡守門）**：擴充 `test-cards` 的 effect 支配分析；處理 `starfall`／`forbiddenHex`／`novicePage`／稀有度倒掛的 `arcaneVeil`。  
3. **R2c（產品）**：AI 預組牌庫或收藏模擬；`runicScrivener` 軸別修正。  
4. **R2d（深度）**：若要戰術深度再做 `pendingBattlecry`（勿再只改文案）。

---

## 結語

r49 對 R1 的 **P0 熱修主軸（20 張牌庫、疲勞、戰吼契約、四卡再平衡）在 core／資料層大致兌現**，且有單元／E2E 釘住，對抗式覆核**沒有**挖回「仍是 24 張」或「空庫完全無代價」。

真正還會在實戰冒出的問題集中在：

1. **疲勞 × battle AI 流程**（致死後仍動作／錯誤 log）— r49 新暴露；  
2. **平衡從「嚴格優勢」退化成「完整複製 + 未掃到的支配」**；  
3. **AI 全明星構軸**仍是體驗向不公平（張數已平）。

*本審查為對抗式意見，非變更紀錄。實作時請維持 core 無 DOM、rng 可注入、既有 CI 守門全綠。*
