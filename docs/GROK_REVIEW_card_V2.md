# 《卡牌對戰》card-battle-r57-v1 — Grok 視覺品質審核 V2

| 欄位 | 內容 |
|---|---|
| 版本對齊 | **card-battle-r57-v1**（commit **`54bf0ad`**：battle 傳說掃光統一／英雄資源立體寶石+低血警示／雙層虹彩色散／凜冬暗影紋理） |
| 前序 | `docs/GROK_REVIEW_card_V1.md`（r56 審） |
| 對照宣稱 | `docs/CODEX_RESPONSE_card_visual2.md`（r57 完成清單） |
| 審查角色 | **視覺品質監工**（只審不改） |
| 審查範圍 | `templates/card-battle/{index.html,battle.js}`、`templates/card-pack/{index.html,pack.js}`、`scripts/{test-quality-gates.js,test-battle-e2e.js}` |
| 方法 | 讀 **R57 diff** + 現源 CSS／DOM 掛載路徑；對照 V1 §3 三步是否落地；**不執行遊戲、不修改任何程式碼** |
| 約束 | 本文件只寫審查結論與證據；**不改**實作 |
| 日期 | 2026-07-13 |

## 總覽

| # | 審題 | 結論 | 一句話 |
|---|---|---|---|
| (1) | R57 修正落地覆核 | **四主軸皆真上線；V1 前三步材料缺口已關** | 掃光 DOM+mask、英雄寶石+critical、雙層 foil、凜冬紋理、狀態 outline 均有路徑與守門 |
| (2) | 下一批宣傳截圖 3 提升點 | **見 §2** | 材料夠了；瓶頸轉到「可重現鏡頭、英雄列二次商品化、開包海報幀鎖定」 |

優先級（本輪視覺／產品觀感）：

| 級別 | 意義 |
|---|---|
| **P0** | 無：R57 宣稱項未見空殼 class 或「CSS 有、DOM 沒掛」 |
| **P1** | 宣傳截圖流程與構圖完成度（材料已齊，素材管線未產品化） |
| **P2** | 雙端微漂移、史詩靜幀紋理、無圖傳說 emoji 區、多傳說外光漂白 |

**總判定：R57 是對 V1 視覺監工「最低成本三切口」的正確閉環。**  
以「可玩戰場」標準約 **A-**；以「商店／社群宣傳截圖」標準約 **B+**——差距已從「材質沒做好」轉為「**同一套材質如何穩定拍出商品級單幀**」與「**英雄列除資源外的次級露餡**」。

---

## (1) R57 修正落地覆核（讀 diff）

對照 `CODEX_RESPONSE_card_visual2.md` 與 V1 §3 三步，逐項驗真。

### 1.1 V1 步 1 — battle 傳說 `.frame-sheen` 回灌 + rare／epic 靜幀可讀

| 宣稱 | 證據 | 判定 |
|---|---|---|
| battle 掛 `.frame-sheen` | `battle.js:1828` `<div class="frame-sheen" aria-hidden="true"></div>` | **PASS** |
| mask 邊框掃光（不污染卡心） | battle `index.html:194-195`：`mask-composite:exclude` + `legendFrameSweep 3.2s` | **PASS** — 與 pack `163-164` 同構 |
| 停用舊 `legendaryFoil` 邊框整層掃 | diff 刪 `animation:legendaryFoil`；legend-idle 只留 `legendIdle` 外光呼吸（`197`） | **PASS** — 職責分離正確 |
| rare／epic → 3px + 高對比切面 | `191-192`：`border-width:3px`；rare 藍停點更密、epic conic 段寬略調（8deg 階） | **PASS** — 直接回應 V1「2px 紫紋易糊」 |
| reduced-motion／low-perf 停掃光 | `615-616`、`632-634` 瞄準 `.frame-sheen`（不再誤關整張 legend 卡） | **PASS** — 優於 r56 的「整卡停動畫」粗閘 |

**品質評語：**  
戰鬥端傳說從「邊框 background-position 掃」升級為 **真·框環 mask 掃光**，與開包端對齊。靜止幀靠金漸層停點 + `opacity:1` 的 sheen 層仍可讀；不依賴 3.2s 循環也能看出金環（動畫停時 sheen 仍在）。  
**殘差（非回歸）：** 仍是「邊框箔」而非卡心全息；多張 `legend-idle` 同場 50px 外光漂白仍在（P2，本輪未宣稱處理）。

### 1.2 V1 步 2 — 英雄 HP／法力寶石語言 + 低血

| 宣稱 | 證據 | 判定 |
|---|---|---|
| 徑向寶石 + inset 高光 + 描邊暗角 | `133-147`：radial 停點、`box-shadow` inset、`::before` 頂部高光帶、異形 `border-radius` | **PASS** |
| 與卡內 atk／hp 同一工藝語系 | 對比 `307-311` 卡內章：同為 radial + inset 立體 | **PASS** — 不再是實心 pill |
| HP ≤ 25%（至少 8）危急光 | CSS `.hp-badge.critical`（`148`）；JS `hp <= max(8, ceil(maxHp*0.25))`（`battle.js:1726-1727`）敵我皆掛 | **PASS** |
| 手機 min-height 28px | 矮視口／窄視口覆寫 `652`、`691` | **PASS**（RWD 意圖清楚；本輪未重跑 rwd 矩陣，以 Codex 回報與既有守門為旁證） |

**品質評語：**  
V1 點名的「宣傳構圖原型洩漏」主因（扁平 pill）已消。英雄資源在英雄列構圖中可與卡面並存而不掉段。  
**殘差：** badge 內仍用 emoji（❤️／💧）+ 純文字；工藝夠用，但**頭像仍是裸 emoji 32px**（`131`）— 見 §2 下一步。

### 1.3 V1 步 3（材料半）— 閃卡雙層多停點色散

| 宣稱 | 證據 | 判定 |
|---|---|---|
| 雙層 linear-gradient 青／白／紅／紫 + 黃／綠／藍 | battle `232-236`；pack `204-206` | **PASS** |
| 雙層獨立 `background-size` + 錯位 `foilShine` | `596` keyframes 雙 position 軌 | **PASS** — 靜幀亦可能呈現多色帶 |
| reduced-motion 停 foil 動畫 | battle `632-634`；pack `452` | **PASS** |
| quality gate 鎖色 | `test-quality-gates.js:508-515` 驗 cyan／紅／綠停點 | **PASS** 守門層 |
| e2e 驗 ≥2 layer + opacity | `test-battle-e2e.js:344-347` | **PASS** 行為層 |

**品質評語：**  
從「單色白斜掃塑膠膜」進到「可辨虹彩」— 特寫截圖質感明顯升級。  
**殘差：** battle opacity **0.78**／pack **0.82**、圓角 10 vs 12 — 雙端微漂移（P2）；V1 同條的「**可重現展示盤**」半句 **未做**（見 §2.1）。

### 1.4 P2 順手 — 凜冬暗影紋理 + 狀態光與稀有度解耦

| 宣稱 | 證據 | 判定 |
|---|---|---|
| wintershadow `.art` 冰晶紋 | battle `296`；pack `189`：底光 ellipse + 斜向細紋 + 冷色斜切 | **PASS** — 四陣營 art 規則齊 |
| can-attack／playable → outline + 內圈，保留身份光 | `203`、`205`：outline 綠／金；can-attack 的 `box-shadow` **重建** `--glow-size` 身份光 + inset 綠環 | **PASS** — 不再用整段綠 `box-shadow` 蓋掉稀有度 |
| log／粒子不加重 | diff 無 log 高度或粒子密度上修 | **PASS** — 符合 V1 降權策略 |
| `core.js` 未改 | commit 檔案清單無 `core.js` | **PASS** |

### 1.5 版本與守門一致性

| 項目 | 證據 | 判定 |
|---|---|---|
| CACHE / SW key → r57 | battle／pack／shell／sw 字串 `card-battle-r57-v1`、`card_sw_auto_reload_r57_v1` | **PASS** |
| e2e SW guard 對齊 r57 | `test-battle-e2e.js:306` | **PASS** |
| 靜態 + 瀏覽器雙層視覺 gate | quality-gates `checkR57VisualMaterials`；e2e 1280 視口 frame／foil／gem／critical／reduced | **PASS** 設計 |

### 1.6 與 Codex r57 宣稱對照總表

| 宣稱 | 覆核 |
|---|---|
| battle 傳說 frame-sheen 與 pack 統一 3px mask 掃光 | **成立** |
| rare／epic 3px 高對比靜幀可讀 | **成立**（史詩「紋」仍弱於「光」，但優於 r56） |
| 英雄 HP／法力徑向寶石 + 低血 critical | **成立**（CSS + render 雙端） |
| foil 雙層多停點色散 | **成立**（雙端） |
| reduced-motion／low-perf 覆蓋 sheen + foil | **成立** |
| 凜冬 art 冰晶紋 | **成立** |
| 狀態 outline 保留稀有度光 | **成立** |
| core 不動 | **成立** |

### 1.7 小結 (1)

| V1 缺口 | R57 結果 |
|---|---|
| battle ↔ pack 傳說箔漂移 | **關閉** |
| 英雄資源平面 | **關閉** |
| foil 單色塑膠膜 | **關閉**（虹彩到位） |
| wintershadow 缺紋 | **關閉** |
| 狀態光蓋身份光 | **明顯緩解** |
| 展示盤／截圖流程 | **未動** → 下一批主軸 |

**無 P0 回歸訊號。** R57 施工範圍與 V1 處方一致，且有 quality + e2e 雙鎖，可認定「修正落地」。

---

## (2) 宣傳截圖標準：下一批 3 個最划算提升點

「宣傳截圖標準」維持 V1 定義：單幀靜止仍好看、稀有度可讀、無水平溢出、主體商品級、不靠長動效才成立。

R57 之後材料階梯已夠拍；**報酬最高的切口改為「可重現構圖 + 次級 HUD 完成度 + 開包海報幀」**。

| 順位 | 下一步 | 為何划算 | 預估成本 | 預期收益 |
|---|---|---|---|---|
| **1** | **產品化「可重現展示盤」**（固定 4–6 個 capture pose） | V1 §3.2 鏡頭表仍只是文字驗收；R57 材質再好，手抓幀仍不穩。建議以現有 `__test.setup`／e2e 路徑做成命名狀態（例：`pose.legendTauntFoil`、`pose.suspenseRow`、`pose.threeOpponents`、`pose.heroCritical`、`pose.fourRarityHand`） | 小（腳本／`__test` API 或一份截圖手冊 + 種子牌組，**不必新美術**） | **最高／穩** — 社群與商店圖「一次定案、可回歸」；讓 R57 材質真正變現 |
| **2** | **英雄列二次商品化：頭像框／列底與資源徽章同語系** | HP／法力已是寶石；同框的 `.hero .avatar` 仍是裸 32px emoji（`131`），hero-row 半透明面板相對卡面仍偏「系統列」。宣傳「英雄 + 雙場」構圖下，**新的最大露餡點已從 pill 轉移到頭像** | 小（純 CSS：頭像徑向底、細描邊、可選陣營色暈；不動規則） | **高** — 全畫面完成度再拉一檔，與 R57 徽章投資對齊 |
| **3** | **開包「海報幀」可鎖定**（懸念滿光 + 翻開峰值可停） | `.suspense`／`legend-pull`／`.beam`／`tide-wave` 已是現成行銷語言（pack `165-177`），但峰值靠時序運氣。加 capture class 或 `__test.freezeReveal('suspense'|'legendPeak'|'foilPeak')` 凍結動畫於可讀虹彩／金環／光柱峰值 | 小～中（CSS `animation-play-state` + 固定 `background-position`／opacity；可掛在既有 pack e2e） | **高** — 開包是社群傳播主圖；材料已在，缺的是**可交付的靜幀** |

### 2.1 刻意不排進前三（仍有效）

| 項目 | 原因 |
|---|---|
| 再加厚 foil 停點／第三層色散 | R57 已過「塑膠膜」門檻；邊際收益低於展示盤 |
| 重畫／補齊無圖傳說（血月女王、天穹裁決者等 `image:null`） | 宣傳應優先選**已有 art** 的旗艦（dragon／titan／frostboundTyrant…）；補圖是內容產線，非 CSS 一日切口 |
| 史詩 conic 再雕琢 | 3px 已改善；特寫優先傳說+閃卡 |
| 多傳說 idle 外光上限 | 實戰少見、截圖可避開同場 3+ 傳說 |
| log／粒子加重 | 與正確降權衝突；截圖靠卡面與 FX 殘幀即可 |
| battle／pack foil opacity 微對齊 | 純 polish，不擋上架圖 |

### 2.2 截圖驗收建議（給下一輪，非本輪改碼）

延續 V1 §3.2，R57 後更新「合格訊號」：

| 鏡頭 | 應看見（R57 後） | 仍不合格訊號 |
|---|---|---|
| 四階並排 | 銀／藍／紫／金；rare／epic 3px 切面可辨 | 史詩仍糊成實心紫邊、傳說靜止無金環 |
| 傳說場上特寫 | **框環** sheen 金箔 + legend-idle 外光；可選嘲諷 crest | 只有黃光暈、無 mask 環、或綠狀態光蓋掉金 |
| 英雄列 + 雙場 | HP／法力寶石 + **頭像不顯系統 emoji 裸奔**；可選 critical 低血 | 資源扁 pill（R57 已否決）／頭像無框 |
| 閃卡特寫 | 雙層虹彩色帶可辨（靜幀） | 單色白膜、或 opacity 過低看不見 |
| 開包懸念 | 黑影 + `?` + 稀有色暈；可凍結 | 灰塊無 glow、或只能動態錄影才好看 |
| 三對手色場 | 藍／紫／橙可辨且卡面主體 | 色罩過重 |
| 凜冬構圖 | wintershadow art 冷紋與敵場 tone 協調 | 與 wardens 藍底無法區分 |

### 2.3 建議實作順序（給 Codex／施工方）

1. **展示盤 pose API／手冊**（先讓現有 R57 可穩定出圖）  
2. **英雄頭像框**（補齊英雄列最後一塊平面）  
3. **開包 freeze 幀**（社群主視覺管線）

每步完成後應用 §2.2 做視覺回歸；e2e 可只驗 class 存在與 `animationName === 'none'`（freeze 時），不必截圖像素比對。

---

## 附錄 A：R57 證據索引（精選）

| 主題 | 路徑 |
|---|---|
| Commit | `54bf0ad` |
| CACHE 版本 | battle `index.html:9` → `card-battle-r57-v1` |
| frame-sheen CSS | battle `194-195`；pack `163-164` |
| frame-sheen DOM | `battle.js:1828`；pack `pack.js:624` |
| legendFrameSweep | battle `582` |
| 英雄寶石／critical | battle `133-148`；`battle.js:1724-1727` |
| foil 雙層色散 | battle `232-236`；pack `204-206` |
| wintershadow art | battle `296`；pack `189` |
| 狀態 outline | battle `203`、`205` |
| reduced／low-perf | battle `606-634`；pack reduced 區塊 |
| quality gate | `scripts/test-quality-gates.js:502-516` |
| e2e visual | `scripts/test-battle-e2e.js:309-400` |
| 宣稱對照 | `docs/CODEX_RESPONSE_card_visual2.md` |
| 前序審 | `docs/GROK_REVIEW_card_V1.md` |

## 附錄 B：V1 → V2 狀態遷移

| V1 項 | V1 判定 | V2 判定 |
|---|---|---|
| 四階色相階梯 | PASS | **PASS**（加強） |
| 金箔產品級（battle） | 弱／雙端 FAIL | **PASS 功能對齊**（仍非 AAA 全息） |
| 紫紋小尺寸 | 中 | **中偏良**（3px） |
| 英雄資源工藝 | P1 平面 | **PASS 寶石** |
| foil 色散 | P1 塑膠膜 | **PASS 雙層虹彩** |
| wintershadow | P2 缺口 | **PASS** |
| 狀態 vs 稀有度光 | P2 | **緩解（outline）** |
| 展示盤／海報幀 | 建議未做 | **仍為下一輪 P1 主軸** |
| 英雄頭像完成度 | 未點名 | **新 P1 露餡點** |

---

## 結論

R57 把 V1 開出的三張處方（battle 掃光、英雄寶石、虹彩 foil）連同順手的凜冬紋理與狀態解耦 **真實落地**，且有靜態 gate + e2e 雙鎖，視覺監工可簽核「材料回合結束」。  

下一輪若仍以宣傳截圖為準，**不要再加一層箔**，而應：(1) **把鏡頭做成可重現 pose**，(2) **補英雄頭像框完成英雄列**，(3) **讓開包懸念／翻開峰值可凍結出圖**——這三步才能把 R57 的 CSS 投資變成穩定的商店與社群素材。

**本輪：只審不改。** 報告路徑：`docs/GROK_REVIEW_card_V2.md`。
