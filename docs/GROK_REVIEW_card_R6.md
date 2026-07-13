# 《卡牌對戰》card-battle-r58-v1 — Grok 全面健檢監工 R6

| 欄位 | 內容 |
|---|---|
| 版本對齊 | **card-battle-r58-v1**（HEAD **`694e231`**；功能基線 R58 **`059407c`**，其後為 formfactor 報告／封面 meta 入庫） |
| 前序 | R5（ghost 解耦）、mobile／formfactor、V1–V3 視覺三輪；Codex 回報 `CODEX_RESPONSE_card_mobile.md`／`card_visual{,2,3}.md` |
| 審查角色 | **監工・全面健檢**（只審不改） |
| 審題 | (1) 手機抽屜／R56–58 視覺整合殘留；(2) core 純度快檢；(3) 缺口排序＋下一輪最划算 3 步 |
| 審查範圍 | `templates/card-battle/{battle.js,index.html,core.js,cards.js}`、`templates/card-pack/*`、`scripts/{test-battle-e2e,test-rwd-matrix,test-quality-gates,test-core}.js`、`sw.js` |
| 方法 | 讀最新碼靜態路徑追蹤＋前序審查交叉複驗；**未執行瀏覽器、不修改任何程式碼** |
| 約束 | 本文件只寫審查結論與證據；**不改**實作 |
| 日期 | 2026-07-13 |

## 總覽

| # | 審題 | 結論 | 一句話 |
|---|---|---|---|
| (1) | 手機抽屜／R56–58 視覺整合殘留 | **主幹 PASS；殘差多為 P1／P2** | 抽屜＋50dvh＋safe-area 仍成立；R56–58 材質／capture 在桌機 e2e 有鎖；**手機×展示盤**與 **AI 雙 ghost** 仍是整合縫 |
| (2) | core 純度快檢 | **PASS** | 自 R52（`843a423`）起 `core.js` 零 diff；無 DOM／時間／全域亂數；規則 API 仍純注入 |
| (3) | 缺口排序＋最划算 3 步 | 見 §3 | **停材料大輪**；下一刀修演出雙呼叫 → 補 capture 語意／手機 → 再拉高頻 art 地板 |

**一句話總評：**  
R55–R58 把「可玩手機 + 可拍商品圖」主幹做完且 **core 乾淨**；本輪無新發現 **P0 規則崩壞**。剩餘最高 ROI 已從「再加箔」轉為 **演出正確性（AI 雙影）**、**截圖管線邊角（手機抽屜／三色場）**、**長尾無圖卡地板**。

優先級定義：

| 級別 | 意義 |
|---|---|
| **P0** | 正確性／狀態錯亂／宣稱主路徑在真裝置仍失效且測試掩護 |
| **P1** | 明顯體驗／整合縫、可擴充時放大、管線名實不符 |
| **P2** | 打磨、雙端微漂移、測試覆蓋深度 |

---

## (1) 手機抽屜／R56–58 視覺整合殘留

### 1.1 手機抽屜主幹（R55 宣稱）— 複驗

| 宣稱／能力 | 證據 | 判定 |
|---|---|---|
| 手牌預設收合固定底欄 | `@media (max-width:700px)` `.hand-drawer` fixed + peek `--mobile-hand-peek:46px`（`index.html:692–714`） | **PASS** |
| 展開橫向捲、卡 82×116 | `.hand` nowrap + `overflow-x:auto`；`.hand .card` 覆寫尺寸（`720–726`） | **PASS** |
| 出牌後自動收合 | `playFromHand` 成功路徑 `setHandDrawerOpen(false)`（`battle.js:926`） | **PASS** |
| 導引展開／收合 | step0 開、step1 關（`562–565`） | **PASS** |
| 結束回合釘右下 + safe-area | `#endTurnBtn` fixed + `env(safe-area-inset-bottom)`（`757–759`）；toggle 寬 `calc(100% - 108px)` 讓位（`716`） | **PASS** |
| 戰場雙方合計 50dvh（直式） | `@media (max-width:700px) and (orientation:portrait)` 各 `25dvh`（`796–803`） | **PASS** |
| 版面只看視口、不看觸控 | formfactor 審已結案；本輪再確認無 `maxTouchPoints`／UA mobile class | **PASS**（見 `GROK_REVIEW_card_formfactor.md`） |
| RWD 守門 | 抽屜 open/close、攻擊同屏、≥50% 視高（`test-rwd-matrix.js:165–192`） | **PASS 路徑存在** |
| E2E 手機 | 開抽屜、詳情、任務抽屜、dock 不被遮（`test-battle-e2e.js:942+`、`1124+`） | **PASS 路徑存在** |
| 舊版字串 r54–r57 | active source／tests（排除 docs）grep **0** | **PASS** |
| 版本 r58 | battle／sw／script `?v=`／reload key → `card-battle-r58-v1` | **PASS** |

**M-L1／M-L2 P0（五層固定底欄／無 safe-area）在現行碼上維持關閉。**

### 1.2 抽屜整合殘留（仍未關）

| ID | 級 | 問題 | 證據 | 影響 |
|---|---|---|---|---|
| **R6-M1** | **P1** | **Capture 手牌 pose 未展開抽屜** | `applyCapturePose("fourRarityHand")` 只塞 `game.player.hand` 後 `render()`（`battle.js:3276–3287`）；**無** `setHandDrawerOpen(true)`。手機 CSS：`.hand-drawer:not(.open) .hand { visibility:hidden }`（`index.html:714`） | 窄視口 `?capture=fourRarityHand` **卡在不可見層**；商店圖若用手機模擬器會空拍。e2e 只在 **1280** 測 capture → **測不到** |
| **R6-M2** | **P2** | 抽屜 open 高度 `min(174px, 42dvh+safe)` vs guide 硬編 `174px` | `713` vs `body:has(.hand-drawer.open) .guide-panel { bottom: calc(174px + …) }`（`792`） | 矮機 open 高度被 42dvh 壓低時，guide 可能仍抬 174px → 微錯位 |
| **R6-M3** | **P2** | 橫式 ≤700：有抽屜／釘底結束回合，**無** 50dvh 鎖 | 50dvh 僅 portrait（`796`） | 設計取捨；橫式仍可能「捲 board 找目標」— 非 R55 宣稱回歸 |
| **R6-M4** | **P2** | 任務／log／target 回頁內後，board 仍需捲動塞 controls 橫列 | controls static + 橫捲（`733–742`） | 不擋攻擊同屏主路徑；次要控制仍擠 |
| **R6-M5** | **P2** | Escape 關抽屜有；點 board 空白取消 targeting **不**關抽屜 | `3053–3059` vs `3027–3029` | 可接受；手牌開著點攻擊仍可能拇指熱區重疊 |

### 1.3 R56–R58 視覺材料 — 整合是否仍掛在真路徑

| 材料 | 掛載 | reduced-motion | low-perf | capture 凍結 | 判定 |
|---|---|---|---|---|---|
| 四階 rarity 框 | CSS `rarity-*`（`201–204`）+ `renderCard` class | reduce 區塊停常駐動畫（`634–645`） | sheen／foil／taunt 停（`624–628`） | pose 內 `animation:none`（`806–809`） | **PASS** |
| 傳說 `frame-sheen` | 每卡 DOM（`1828`）+ legendary CSS（`206`） | 停 | 停 | 峰值 position | **PASS** |
| 雙層 foil | `.card.foil::after` | 停 | 停 | 峰值 | **PASS** |
| 嘲諷 crest | taunt 時 DOM（`1831`） | 停 | 停 | 隨卡 | **PASS** |
| 英雄寶石 + critical | CSS badge + render toggle（`1726–1727`） | n/a（靜態） | n/a | `heroCritical` hp=7 | **PASS** |
| 英雄頭像框 | `.hero .avatar`（`135–142`） | n/a | n/a | e2e avatarFrame | **PASS** |
| 對手色場 | `body.dataset.opponent` + enemy battlefield tone | n/a | n/a | **`threeOpponents` 未切 tone** | **PARTIAL**（V3 已點） |
| combat-ghost | `cloneCardGhost` + body 掛載 | JS early return + CSS `display:none` | 縮時長 | capture 前 `clearTransientFx` | **PASS 主幹**；AI 雙呼叫見 R6-V1 |
| 開包海報幀 | pack `__capture.freezeReveal` | freeze `animation:none` | 既有降載 | e2e 三幀 | **PASS** |

### 1.4 視覺／演出整合縫（跨 R54–R58 仍開）

| ID | 級 | 問題 | 證據 |
|---|---|---|---|
| **R6-V1** | **P1** | **AI 互毆仍雙重 `animateAttackToward`** | AI step 先呼叫（`1662`／`1668`），`resolveAttack` 內再呼叫一次（`1269`）→ 雙 ghost／雙 hit 排程。R5-01 **未關**；ghost 解耦後是**看得見**的雙影，手機更痛 |
| **R6-V2** | **P1** | **`threeOpponents` 名實不符** | 只塞敵場三隻（`3281–3284`），不呼叫 `setOpponent`／不切 `data-opponent` → 拍不到藍／紫／橙三色場（V3 P1） |
| **R6-V3** | **P1** | 內容美術地板：`cards.js` 約 **45** 張 `image:null` vs 約 **41** 張有路徑 | 旗艦 capture 可避；**實戰手牌／AI 場**仍大量 emoji 卡心 — 與 R56–58 箔框同框時落差最大 |
| **R6-V4** | **P2** | ghost 無併發上限；斬殺 targetGhost + dying 雙影 | 同 R5-02／R5-03；`clearTransientFx` 僅 newGame／setup／capture |
| **R6-V5** | **P2** | e2e capture 深度：只深測 `legendTauntFoil` 凍結；其餘 pose **只驗名稱表** | `test-battle-e2e.js:328–366` |
| **R6-V6** | **P2** | battle／pack foil opacity、圓角微漂移 | V3 已列；非功能 |
| **R6-V7** | **P2** | 打臉無 hero hit-flash CSS（`.card.hit-flash` 不作用於 `.hero`） | 既有缺口；非 R58 引入 |

### 1.5 小結 (1)

| 子系統 | 判定 |
|---|---|
| 手機抽屜／50dvh／safe-area 主路徑 | **PASS** |
| 觸控誤套 form-factor | **PASS**（視口 media only） |
| R56–58 材質＋reduced＋low-perf＋capture 主幹 | **PASS** |
| 跨層整合殘留最高 | **P1：AI 雙 ghost、capture 手機手牌隱藏、threeOpponents 色場、null art 地板** |
| 新 P0 | **無** |

---

## (2) core 純度快檢

### 2.1 變更邊界

| 檢查 | 結果 |
|---|---|
| 最近改動 `core.js` 的 commit | **`843a423`（R52）**；R53–R58／封面 commit **皆未動** core |
| `git diff 843a423..HEAD -- templates/card-battle/core.js` | **空** |
| R56–R58 Codex 自稱「core 未改」 | 與 git **一致** |

### 2.2 邊界契約（檔頭 + 靜態掃描）

檔頭契約（`core.js:1–6`）：

- 只處理狀態轉換與規則判定  
- **不碰 DOM、時間或全域亂數**  
- 亂數一律由呼叫端注入 `rng`

| 違規類 API | 在 `core.js` 內 | 判定 |
|---|---|---|
| `document`／`window`／`querySelector`／`innerHTML`／`classList` | **無**（僅註解提到 Node 測試） | **PASS** |
| `setTimeout`／`requestAnimationFrame`／`Date.now` 驅動規則 | **無**（任務日鍵等為純函式參數） | **PASS** |
| `localStorage`／`fetch` | **無** | **PASS** |
| CSS／animation 字串寫入 | **無** | **PASS** |
| `Math.random` 當規則熵 | 需注入 `rng` 的 API 簽名維持（`playCard`／`resolveAttack`／`drawCard`…） | **PASS 契約** |

### 2.3 職責分層（抽樣）

| 層 | 負責 | 證據 |
|---|---|---|
| **core** | 出牌／攻擊／法術／亡語／靜默／任務里程碑／chronicle 狀態機 | 匯出面：`playCard`、`resolveAttack`、`resolveHeroAttack`、`castSpellEffect`、`triggerAbility`、migrate* …（檔尾 `return {…}`） |
| **battle.js** | DOM render、ghost、音效、AI UI 步進、抽屜、capture pose | `animateAttackToward`、`setHandDrawerOpen`、`__capture` |
| **cards.js** | 卡表／稀有度展示 meta（`idle`、`glow`） | 展示欄位不進 core 結算邏輯 |

**foil／tide 在 core** 出現於收藏計數、組牌拷貝旗標（`collectionSummary`、`buildBattleDeck` 路徑）— 屬**規則／經濟狀態**，不是視覺。**PASS**（純度不要求「字典裡不能有 foil 字」）。

### 2.4 小結 (2)

| 子項 | 判定 |
|---|---|
| DOM／時間／全域亂數隔離 | **PASS** |
| R53–R58 施工未滲入 core | **PASS** |
| 可 Node 單測共用 | **PASS**（既有 `test-core` 116 斷言路徑維持） |
| 建議 | **維持**：任何演出／手機／capture 票 **禁止** 改 core；規則票才開 core |

---

## (3) 缺口排序＋下一輪最划算 3 步

### 3.1 全場缺口排序（健檢後主軸）

| 順位 | ID | 級 | 缺口 | 成本感 | 為何現在划算／不划算 |
|---|---|---|---|---|---|
| **1** | R6-V1／R5-01 | **P1** | AI 雙重攻擊動畫 | **極低**（刪 AI 外層 3 行呼叫） | 看得見的雙影；手機＋低階機放大；e2e 可加 ghost 數斷言 |
| **2** | R6-M1 + R6-V2 | **P1** | capture：手機展開手牌 + `threeOpponents` 真切 tone | **低**（半日） | 關閉 V3 管線最後一格 + 避免手機空拍；不需新美術 |
| **3** | R6-V3 | **P1** | 高頻／傳說 `image:null` 補圖 | **中–高**（產線） | **實戰觀感地板**；材料輪邊際收益已低於內容 |
| 4 | R6-V4 | P2 | ghost 併發 cap／斬殺雙影 | 低 | 連擊／AI 步進才明顯 |
| 5 | R6-V5 | P2 | e2e 深測其餘 pose＋可選 390 capture | 低 | 防回歸；不直接加分給玩家 |
| 6 | R6-M2–M5 | P2 | guide 高度硬編、橫式 50dvh、次要列擠壓 | 低–中 | 打磨 |
| 7 | R6-V6–V7 | P2 | 雙端微漂移、hero hit-flash | 低 | 特寫海報需要再動 |
| — | 再加箔／第三層色散 | — | **刻意不排進主缺口** | — | V3 已定：材料回合收官 |

### 3.2 下一輪最划算 3 步（建議施工序）

> 目標：**最少 diff、最高可感知品質／正確性**；**不動 core**。

#### 步 1 — 刪 AI 外層 `animateAttackToward`（關閉 R5-01／R6-V1）

| 項目 | 內容 |
|---|---|
| 改哪 | `battle.js` AI `step`：`1662`／`1668`／（可選）`1673` 外層呼叫 |
| 留哪 | `resolveAttack` 內一次（`1269`）；打臉若走 `resolveHeroAttack` 需確認是否只留一處 |
| 驗收 | 單步 AI 互毆：`document.querySelectorAll(".combat-ghost").length` 在峰值 ≈ **2**（攻+受）而非 **4**；既有玩家路徑 e2e 不變 |
| 成本 | **約 15–30 分鐘** |
| 風險 | 極低；純刪冗餘呼叫 |

#### 步 2 — Capture 管線邊角補完（R6-M1 + R6-V2）

| 項目 | 內容 |
|---|---|
| `fourRarityHand` | `applyCapturePose` 內 `setHandDrawerOpen(true)`（桌機 display:contents 無害） |
| `threeOpponents` | 依 V2 鏡頭表：分次 `setOpponent`／寫 `dataset.opponent` 拍三色，**或**改名為 `enemyTripleField` 並另加 `opponentTones` pose — **二選一，禁止繼續名實漂移** |
| 守門 | e2e：`fourRarityHand` 後手牌可見（可選 390 視口）；`threeOpponents` 斷言 tone 或正名 |
| 成本 | **約 0.5 日** |
| 風險 | 低；不動規則 |

#### 步 3 — 內容美術地板（只砍高 ROI 子集，不開全庫）

| 項目 | 內容 |
|---|---|
| 優先序 | (a) 展示／AI 高登場傳說與史詩；(b) 新手起手與提示常用卡；(c) 其餘 common 長尾可後置 |
| 不做 | 再開一輪 CSS 箔；不為「全 45 張 null」一次清空而阻塞步 1–2 |
| 驗收 | 實戰隨機 10 局截圖：場上無圖卡比例下降；旗艦 pose 維持有圖 |
| 成本 | **依產線**（建議本輪先鎖 **8–12 張** 最高頻 ID，而非全量） |
| 風險 | 中（資產一致性／授權）；與程式解耦，可平行 |

### 3.3 明確「下一輪不要做」

| 不要 | 原因 |
|---|---|
| 第三層 foil／更重 frame-sheen | 邊際收益 &lt; 雙影與 null art |
| 動 `core.js` 做動畫或抽屜 | 破壞純度契約與 Node 測 |
| 用 touch 偵測重寫手機版面 | formfactor 已 PASS；純 media 是正確模型 |
| 像素級 visual regression 基建 | 現有 class／computed style 守門夠用 |

### 3.4 建議版本命名（給 Codex／施工）

| 建議 tag | 範圍 |
|---|---|
| **R60**（薄熱修） | 步 1 + 步 2（演出正確 + capture 邊角） |
| **R60**（內容） | 步 3 高頻 art 批次 |
| 勿混 | 不要把「再加特效」塞進 R60 |

---

## 結論

1. **手機抽屜主幹在 r58 仍健康**：收合 peek、展開橫滑、出牌收合、結束回合讓位、直式 50dvh、safe-area、視口-only 觸發均成立；R55 P0 未復燃。  
2. **R56–R58 視覺材料仍掛在真 render 路徑**，且 reduced／low-perf／capture 凍結鏈完整；整合縫在 **AI 雙動畫**、**手機 capture 手牌隱藏**、**threeOpponents 色場未產品化**、**null art 實戰地板**。  
3. **core 純度快檢 PASS**：長期零 DOM、R53–R58 零 diff；演出與 UI 全在 battle／pack／CSS。  
4. **下一輪最划算 3 步**：**(1) 刪 AI 雙 `animateAttackToward` → (2) capture 手機手牌＋三色場語意 → (3) 高頻 null art 小批量**。  
5. **本輪無 P0 必修**；可將 R60 定位為「整合縫薄熱修」而非材料大輪。

**總評：r58 可維持「可玩 + 可出圖」收官基線；R6 健檢建議把下一個 commit 花在正確性與管線邊角，而不是再疊特效。**

**本輪：只審不改。** 報告路徑：`docs/GROK_REVIEW_card_R6.md`。

---

## 證據索引

| 主題 | 位置 |
|---|---|
| HEAD / R58 | `694e231`／`059407c`；`card-battle-r58-v1` |
| 手牌抽屜 CSS | `templates/card-battle/index.html:337–338,692–795,796–804` |
| 抽屜 JS | `battle.js:164–175,562–565,926,3015–3018,3059` |
| 50dvh | `index.html:796–803` |
| R56–58 材質 | `index.html:201–246,617–645,806–809`；`battle.js:1803–1836` |
| capture pose | `battle.js:3241–3299` |
| AI 雙呼叫 | `battle.js:1662–1668` + `1269` |
| ghost | `battle.js:2200–2268,2325–2332` |
| core 契約 | `core.js:1–6`、檔尾 export；git 自 `843a423` 零 diff |
| null art | `cards.js`（約 45×`image:null`） |
| RWD 手機 flow | `scripts/test-rwd-matrix.js:165–192` |
| e2e capture／抽屜 | `scripts/test-battle-e2e.js:328–366,942+,1209–1226` |
| 前序 | `docs/GROK_REVIEW_card_{R5,mobile,formfactor,V3}.md` |
| Codex | `docs/CODEX_RESPONSE_card_{mobile,visual,visual2,visual3}.md` |

*本報告只審不改。結論對齊版本 **card-battle-r58-v1**／HEAD **694e231**（功能基線 R58 **059407c**）。*
