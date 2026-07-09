# 《卡牌對戰》web-card-game-skill — Grok 對抗式審查 R1

| 欄位 | 內容 |
|---|---|
| 版本對齊 | card-battle-r48-v1（現行上線） |
| 審查範圍 | `templates/card-battle/core.js`、`cards.js`、`battle.js`、`templates/card-pack/pack.js`（對照 `scripts/test-core.js`、`references/data-model.md`） |
| 卡池規模 | `CARD_POOL` = **74** 張（common 23 / rare 20 / epic 19 / legendary 12） |
| 方法 | 深讀規則引擎與 UI/AI 串接；對抗式聚焦可重現、可修、有實質影響的項目 |
| 約束 | 本文件只寫審查；**不改**遊戲程式碼 / 測試 / 資源 |
| 日期 | 2026-07-09 |

## 總覽

`core.js` 作為「無 DOM / 可注入 rng」的規則層，邊界清晰，且已有紮實單元測試（風怒、狂怒、法強、亡語滿場、Mulligan pending、存檔 migrate、編年史等）。整體成熟度高。

本輪對抗式審查仍挖到數個**會影響公平性或長局正確性**的問題：牌庫張數雙軌（20 vs 24）、無疲勞導致控制鏡可能軟鎖、戰吼指定型效果無玩家選擇、AI 連擊斬殺漏算、以及卡池內嚴格優勢卡。

優先級定義：

| 級別 | 意義 |
|---|---|
| **P0** | 正確性/公平性缺陷，或長局可能壞體驗；建議下一個修補版處理 |
| **P1** | 明顯 bug、強度失衡、或擴充成本會快速上升的架構債 |
| **P2** | 效能/可維護性/體驗打磨；卡池再擴大後會變痛 |

---

## 前 5 大最有價值優化（摘要）

1. **統一牌庫張數為 `DECK_SIZE`（20）** — 修掉 fallback/簡單 AI 用 24 張、自訂/構軸 AI 用 20 張的公平性裂縫。  
2. **牌庫抽空疲勞（fatigue）傷害** — 補上 `drawCardInternal` 空庫後果，消除控制鏡無限拖。  
3. **戰吼 `damageAny1` 可指定目標** — 與文案「一個目標」對齊，並避免自動打最低血導致戰術失真。  
4. **AI 斬殺總傷計入風怒第二擊** — 修正 hard/normal 在連擊场面下的漏殺/誤換。  
5. **清理嚴格優勢法術/隨從** — 如 `emberVolley`(1 費 3 傷) 嚴格優於 `firebolt`(2 費 3 傷)，降低構築單調與開包貶值。

---

## (1) 正確性 / 潛在 Bug

### P0

| # | 檔案:問題:建議＋效益 |
|---|---|
| C-P0-1 | **`battle.js:buildDeck` vs `core.js:DECK_SIZE`：牌庫張數雙軌（24 vs 20）**。自訂牌組與 normal/hard AI 構軸皆為 20 張；但 `buildDeck` fallback（無合法自訂牌組）與 easy AI 的 `buildDeck(false)` 硬編碼 `while (deck.length < 24)`，玩家/簡單 AI 多 4 張資源。**建議**：全程改用 `Core.DECK_SIZE`，並加 e2e/單元斷言「開局雙方 `deck+hand` 初始總張數 = DECK_SIZE」。**效益**：消除隱性優勢、難度曲線可解釋、避免「沒組牌反而牌庫更深」的逆向激勵。 |
| C-P0-2 | **`core.js:drawCardInternal`：牌庫空時靜默 `return null`，無疲勞/無失敗狀態**。`draw2`、戰吼 `drawCard1`、回合抽牌皆同。控制軸（回復+嘲諷+再生）可無限拖至雙方空庫後「什麼都不發生」。**建議**：引入遞增疲勞（例如第 n 次空抽造成 n 點英雄傷害，事件 `fatigue`），並在 `handleCoreResult`/`settleIfGameEnded` 結算。**效益**：長局必結束、抽牌軸有風險、與主流卡牌戰對齊。 |
| C-P0-3 | **`core.js:pickBattlecryTarget` + `playCard`：指定型戰吼無玩家選擇、且不可打英雄**。`damageAny1` 固定選敵方最低血隨從；無目標時靜默跳過。卡文（如秘法師「對一個目標造成 1 點傷害」、戰鼓手）語意像可選；函式名 `damageAny` 亦暗示 any。玩家無法 reping 嘲諷、無法補刀指定、無法打臉。**建議**：比照 `pendingSpell` 做 `pendingBattlecry`（或 `playCard` 接受 `targetUid`，缺省再 auto）；明確規則「僅敵方隨從」或「可英雄」並改文案。**效益**：戰術深度與文案一致性，避免 AI/提示與玩家預期分裂。 |

### P1

| # | 檔案:問題:建議＋效益 |
|---|---|
| C-P1-1 | **`battle.js:aiTurn` 斬殺總傷未計風怒第二擊**。`totalAtk = queue.filter(canAttackHeroNow).reduce(... attack)` 每隻只加一次；`griffin`/`thunderRoc`/`stormGriffin` 連擊實際可打兩次。導致 `lethal` 漏判 → `chooseAiAttackTarget` 可能先換場而非全壓臉。**建議**：風怒單位在可打臉時以 `attack * (windfury ? 2 : 1)`（並扣掉 rush 鎖臉）估算。**效益**：hard AI 斬殺可靠、對局結果符合盤面算術。 |
| C-P1-2 | **`battle.js:chooseAiSpellPlay`（`random` 原型）永不使用 `polymorph` / `giveShield`**。easy 難度 `archetype: "random"` 走到函式末端 `used: false`。簡單 AI 手持變形/聖盾術會永久卡手占費。**建議**：random 分支補上與 damage 類似的「有合理目標就用」。**效益**：easy 仍弱但不再「廢手牌」，體驗更像正常人。 |
| C-P1-3 | **`core.js:cleanupSide` 亡語一律 `target=null`**。若未來把 `damageAny1` 做成亡語，將永遠不生效（靜默）。目前卡池亡語僅 `summonSkeleton`/`rebirth` 故未爆。**建議**：亡語目標策略寫進 trigger 規格（`needsTarget` + 預設 picker），或禁止資料層配置需目標的亡語並在 `test-cards` gate 擋下。**效益**：擴充時不踩隱形陷阱。 |
| C-P1-4 | **`core.js:cleanupBoth` 結算順序固定 player→enemy，且亡語內可重入 `cleanupBoth`**。同波雙邊死亡時，玩家亡語完整鏈（含巢狀死亡）先於敵方；與「同時進墓地佇列」模型不同。目前卡池可接受，但 `archmage`/`highArchivist` 戰吼 AOE + 多亡語互動會讓玩家困惑。**建議**：文件化正式時序；中長期改「收集 dying → 佇列亡語 → 再執行」單一层。**效益**：可預測、可測、減少未來連鎖 bug。 |
| C-P1-5 | **`battle.js:offerMulligan` 洗牌用 `Math.random()`，未走 `rng()`**。核心宣稱可注入 rng 做決定性重播，但 Mulligan 與 `buildDeck` 內洗牌/補牌仍用全域亂數。**建議**：一律 `rng`/`nextRandom` 風格封裝。**效益**：e2e/重播/除錯可重現起手。 |
| C-P1-6 | **`core.js:makeUid`：rng 退化時 UID 碰撞**。`nextRandom` 若恒為 0，`toString(36).slice(2)` 為空 → pad 成 `c0000000` 重複；`findIndex`/`field.find` 會打到錯卡。**建議**：uid 加遞增序號或 `state.uidSeq`。**效益**：決定性測試與異常 rng 下仍正確。 |
| C-P1-7 | **`battle.js:buildDeck` fallback 無視構築限制**。從收藏塞滿時可超過「同名 2 / 傳說 1」，只要擁有份數夠。與 `validateDeck` 嚴格規則不一致。**建議**：fallback 也走「合法 20 張抽樣」或強制導向牌組編輯。**效益**：所有進戰場牌庫遵守同一契約。 |
| C-P1-8 | **`core.js:applyAbility` 的 `damageAny1` 傷害 `source=null`**。吸血靠 `dyingCard` 另算（正確）；但劇毒/未來「來源關鍵字」不會作用於戰吼傷害。目前無戰吼劇毒卡。**建議**：`applyDamageToMinion(target, 1, dyingCard, events)` 或文件註明「戰吼傷害無來源關鍵字」。**效益**：語意一致、擴充安全。 |

### P2

| # | 檔案:問題:建議＋效益 |
|---|---|
| C-P2-1 | **`core.js:comboCount` 只做 UI 連擊閃光，無規則效果**。成功出牌累加、回合結束歸零，但無 combo 關鍵字或加成。**建議**：要么做真正 combo 機制，要么降級為 battle 層 UI 計數，避免誤導擴充者。**效益**：API 表面積變小、意圖清楚。 |
| C-P2-2 | **`core.js:polymorph` 未清 `_frenzyDone` / `justPlayed` / `canAttack` 等 runtime 欄位**。keywords 已清空，實戰影響極小。**建議**：polymorph 時重置 runtime flags 到「新生 1/1」。**效益**：狀態機乾淨。 |
| C-P2-3 | **`core.js:mana2` 可讓 `mana` 遠超 `MAX_MANA`/`manaMax`**（多張法力湧動）。屬設計選擇但未寫明。**建議**：文件化「臨時法力可超過上限」或改為 `min(mana+2, manaMax+2)` 一類。**效益**：平衡討論有基準。 |
| C-P2-4 | **雙方英雄同時 ≤0 時 `settleIfGameEnded` 優先判定敵方 ≤0 → 玩家勝**。極端交換下無平手。**建議**：定義平手或「同時致死的主動方勝」。**效益**：競速交換規則明確。 |
| C-P2-5 | **編年史 / 里程碑資料與文件漂移**：`STATS_VERSION=3`、`unique_55`、池 74 張；`references/data-model.md` 仍寫 version 2、池 40、缺編年史。**建議**：文件與 gate 同步。**效益**：減少貢獻者誤改。 |

**core 已驗證為相對健康的部分（本輪未列 bug，供對照）：**

- 聖盾擋傷後不觸發狂怒/劇毒；致死不觸發狂怒；狂怒一次。  
- 法強只加成傷害法術，不加戰吼。  
- 突襲當回合可打隨從不可打臉；衝鋒可打臉。  
- 亡語先移出再召喚，滿場仍可補 token（有測試）。  
- pending 法術不預扣費；取消安全。  
- 手牌上限燒牌（`handBurn`）行為明確。  
- 存檔 migrate（stats/deck/quest/goal/chronicle）防污染紮實。

---

## (2) 效能

現況：單局場上 ≤7+7、手牌 ≤8，DOM 全量重繪可接受；收藏 74×2=148 槽也尚可。重點在**成長曲線**與不必要工作。

### P1

| # | 檔案:問題:建議＋效益 |
|---|---|
| P-P1-1 | **`battle.js:render` 每次操作 `innerHTML=""` 重建整手牌+雙方戰場**。AI 一步含多次 `render()` + 動畫 timeout，低階機易掉 FPS（雖有 perf 模式）。**建議**：以 `uid` 做 DOM diff（只更新 atk/hp/class），或 AI 結算批次 render 一次。**效益**：AI 回合掉幀減少、耗電下降。 |
| P-P1-2 | **`pack.js` 收藏/牌組搜尋 `oninput` 無 debounce，每次按鍵全量 `renderCollection`/`renderDeckEditor`**。**建議**：150–200ms debounce；篩選結果 cache。**效益**：輸入跟手，卡池再擴到 150+ 仍順。 |

### P2

| # | 檔案:問題:建議＋效益 |
|---|---|
| P-P2-1 | **`core` 無 `cloneState`；狀態皆 in-place mutation**。目前 AI 不搜樹故無痛；若要 minimax/MCTS 會被迫 `structuredClone` 整局。**建議**：先提供淺層可測的 `cloneBattleState`（field/hand/deck 卡物件拷貝），AI 再漸進。**效益**：為更強 AI 鋪路且不一次大重構。 |
| P-P2-2 | **`pack.js:renderCollection` 每次重綁所有分解按鈕、重畫未變更槽**。**建議**：虛擬列表或「僅 dirty 槽更新」。**效益**：開包後刷新成本下降。 |
| P-P2-3 | **`cards.js:getCardById` 線性 `find`；AI 構軸對每張排序時反覆 `getCardById`**。74 張可忽略；**建議**建 `Map` 索引。**效益**：O(1) 查表、構軸/驗證更快。 |
| P-P2-4 | **`battle.js:startPerfMonitor` 永久 `requestAnimationFrame`**。**建議**：僅 auto 模式或對戰場景啟用。**效益**：開包頁省電。 |

---

## (3) 架構可維護性

### P0

| # | 檔案:問題:建議＋效益 |
|---|---|
| A-P0-1 | **效果系統仍是 core 內巨型 `switch`（`SPELL_EFFECTS` 僅描述 `needsTarget`，真正邏輯在 `applySpellEffect`/`applyAbility`）**。新法術/新 trigger 必須改 core + cards + AI 分支 + 測試 + 可能 battle 事件動畫。**建議**：資料驅動表：`{ id, needsTarget, apply(ctx) }` 或小型 effect DSL；AI 用 effect tag（`removal`/`heal`/`draw`）而非列舉每個 id。**效益**：新卡成本從「改 4 檔」降到「加資料 + 1 測」。 |

### P1

| # | 檔案:問題:建議＋效益 |
|---|---|
| A-P1-1 | **`cards.js` 註解仍寫「規則在 battle.js」、卡池「24 張」；實際規則在 core、池 74**。**建議**：註解與 `KEYWORDS` 說明改指向 core；以 `CARD_POOL.length` 或生成文件避免硬編碼。**效益**：新人不再改錯層。 |
| A-P1-2 | **雙重真相：`CARD_TYPE`/`cloneCard` 在 cards 與 core 各有一份**。**建議**：戰鬥卡複製以 core 為準或共享單一 module。**效益**：避免拷貝語意漂移。 |
| A-P1-3 | **陣營 `FACTIONS` / `CARD_FACTION` 無機械效果，僅 UI/編年史**。擴「陣營協同」時無處掛 hook。**建議**：預留 `factionAura` 或明確「純敘事永不進規則」。**效益**：產品方向清楚。 |
| A-P1-4 | **AI 評分、提示評分、構軸 `templateScore` 三套启发式重複**（`battle.js` 多處）。**建議**：抽 `scoreMinionThreat` / `scoreCardForAxis(axis, card, context)` 共用。**效益**：改平衡只調一處。 |
| A-P1-5 | **`battle.js` 仍暴露 `SPELL_EFFECTS`/`ABILITY_EFFECTS` 測試掛鉤包一層 core**。合理，但 `castSpellEffect` 寫死 `side: "player"`（`battle.js` 初始 map）。敵方施法走 `playCard` 故現況 OK；若測試直接 `SPELL_EFFECTS.x.apply` 會錯邊。**建議**：apply 帶 side 參數。**效益**：測試掛鉤不誤導。 |

### P2

| # | 檔案:問題:建議＋效益 |
|---|---|
| A-P2-1 | **關鍵字是字串陣列，無 schema 驗證**（typo `divine_shield` 會靜默無效）。**建議**：`test-cards` 對 `KEYWORDS` 白名單 + battlecry/deathrattle 必填 trigger。**效益**：資料錯誤 CI 擋下。 |
| A-P2-2 | **Token（綿羊/骷髏/浴火鳳凰）硬編碼在 core**。**建議**：`TOKEN_DEFS` 資料表。**效益**：調數值不改引擎邏輯。 |
| A-P2-3 | **遥测/DDA/任務/編年史全塞在 core 導出**。規則引擎與 meta-progression 耦合。**建議**：中長期拆 `meta.js`（仍 pure），core 只留對戰。**效益**：檔案邊界更利 review。 |

---

## (4) 玩法 / 平衡 / AI 強度

### P0

| # | 檔案:問題:建議＋效益 |
|---|---|
| B-P0-1 | **嚴格優勢卡使構築坍縮**（同效果更低費或同 cap 更強）：`emberVolley`(1) ≫ `firebolt`(2) 皆 `damage3`；`shieldUp`(1) ≫ `arcaneVeil`(2) 皆給盾；`sparkSquire`(1 費 2/1 rush) ≫ `frontScout`(2 費 2/1 rush)；`thunderRoc` 實質複製 `griffin`。**建議**：差異化（費用/數值/關鍵字/軸限制）或降稀有度並改效果；CI 加「同 effect 費用支配」gate。**效益**：卡池張張有意義、開包成長感回來。 |
| B-P0-2 | **normal/hard AI 構軸 = 全卡池最強 20 張（不受收藏限制）**。控制軸均費約 6.0，塞滿傳說/史詩牆（`skyJudicator`/`titan`/`frostboundTyrant`/雙 `bastionColossus`…）；快攻均費約 1.4（雙 `manaSurge`+大量 charge/rush）。玩家殘缺收藏時體感「作弊」。**建議**：AI 牌庫從「有限全池」改「標準套+難度預組」或模擬收藏解鎖；hard 才接近強軸。**效益**：難度曲線可調、成長感與公平性。 |

### P1

| # | 檔案:問題:建議＋效益 |
|---|---|
| B-P1-1 | **再生+高血嘲諷過多**（`titan`/`bastionColossus`/`glaciarchWarden`）+ 多份治療/吸血 + **無疲勞** → 控制鏡極難斬殺。**建議**：再生改「回復 1～2」或「每回合計一次」；或提高 monodamage 工具。**效益**：中後期節奏健康。 |
| B-P1-2 | **快攻工具過剩且低費**：`emberpup`/`sparkSquire`/`alleySkirmisher`/`dawnRider`(charge+lifesteal)/`bloodmoonQueen`(7 費 charge+lifesteal)/`dragon`(7 費 8/8 charge)。配合 AI aggro 模板壓制力極高。**建議**：調血量曲線或 charge 體型；lifesteal charge 分拆。**效益**：中速牌組有生存空間。 |
| B-P1-3 | **法強軸上限偏低**：`spellpower` 每源 +1，但高傷法少（`flameBurst` 5、`meteor` 8）；戰吼傷害不受法強（已測）。軸有主題但勝利條件弱於「低費移除+快攻」。**建議**：法強 +1 改可疊的有價，或給 `damage5`/`aoe` 更清晰的法師套件。**效益**：三軸（快攻/控制/法術）都可上桌。 |
| B-P1-4 | **AI 出牌貪心：單卡 priority，不模擬曲線與留解**。例如 control 可能回合初打滿費嘲諷而留不住 AOE；aggro 可能不計算「下回 lethal」。**建議**：同回合 1-ply 搜索「可負擔子集」最大化 threat delta（狀態 clone 後評估）。**效益**：強度穩定、減少自殺式出牌。 |
| B-P1-5 | **變形三張**（4/4/5 費）功能重複；`starfall` 5 費 aoe2 弱於 `lightning` 4 費 aoe2。**建議**：合併或差異（凍/沉默/傷英雄）。**效益**：減少「嚴格更差」的收集挫敗。 |
| B-P1-6 | **`runicScrivener` 等抽牌戰吼被標 `aggro` 軸**，扭曲 `detectDeckArchetype` 與編年史/提示。**建議**：抽牌/法強歸 control 或 neutral。**效益**：配對與 DDA 原型判斷正確。 |

### P2

| # | 檔案:問題:建議＋效益 |
|---|---|
| B-P2-1 | **困難難度改血量+起手+aiSmart 三重懲罰**（玩家 26 血、AI 34 血、AI 起手 5）。疊加全明星牌庫後過陡。**建議**：先修牌庫公平，再微調血量差。**效益**：hard 難在技術而非數值碾壓。 |
| B-P2-2 | **DDA 只動 AI 失誤率/分數偏置，不改牌庫**。連勝後仍可能被同構軸穿。**建議**：DDA 高等級才啟用完整構軸。**效益**：動態難度體感更明顯。 |
| B-P2-3 | **開包權重 legendary 2% × 74 池**，功能重複卡多 → 抽到「更差的那張變形」挫敗。**建議**：權重與新卡差異化綁定。**效益**：保留收集慾望。 |
| B-P2-4 | **導引只教狼衝鋒打臉**，未教嘲諷/突襲/法強/狂怒。**建議**：進階提示或圖鑑任務。**效益**：降低複雜關鍵字流失。 |

---

## 測試缺口（建議補測，仍不在本輪改碼）

| 優先 | 場景 | 理由 |
|---|---|---|
| P0 | 開局 `player.deck.length + hand` / enemy 同 = 期望牌庫規則 | 鎖死 20/24 雙軌回歸 |
| P0 | 空庫連續 draw → 英雄掉血至死亡 | 疲勞規格 |
| P0 | 戰吼 `damageAny1` 指定高威脅非最低血 | 目標選擇 |
| P1 | 風怒×2 總傷 ≥ 敵英雄血量時 AI 全壓臉 | 斬殺 |
| P1 | 雙邊同時死亡 + 雙亡語巢狀 AOE 事件順序快照 | 時序契約 |
| P1 | easy AI 手持 polymorph 會施放 | random 分支 |
| P2 | 同 effect 卡費用支配靜態分析（可進 quality-gates） | 平衡守門 |

---

## 結語與建議修補順序

`core.js` 作為 pure-ish 規則引擎**主幹可信**；真正伤筋动骨的問題多在 **battle 組牌契約**、**空庫終局規則缺失**、**戰吼目標模型不完整**，以及 **卡池/AI 強度擴張快於規則與平衡工具**。

建議修補波次：

1. **R1a（正確性熱修）**：DECK_SIZE 統一、疲勞、戰吼目標（或文案降級為「隨機/最低血敵方隨從」並改 UI 說明）。  
2. **R1b（AI）**：風怒斬殺、random 法術覆蓋、構軸改預組。  
3. **R1c（平衡）**：嚴格優勢卡差異化、再生/快攻曲線微調。  
4. **R1d（架構）**：effect 表驅動、文件/註解與 data-model 對齊、cloneState 預留。

---

*本審查為對抗式意見，非變更紀錄。實作時請維持 core 無 DOM、rng 可注入、既有 CI 守門全綠。*
