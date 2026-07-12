# 《卡牌對戰》card-battle-r58-v1 — Grok 視覺品質審核 V3（收官審）

| 欄位 | 內容 |
|---|---|
| 版本對齊 | **card-battle-r58-v1**（commit **`059407c`**：展示盤 URL 一鍵佈景／開包海報幀鎖定／英雄頭像框商品化） |
| 前序 | `docs/GROK_REVIEW_card_V1.md`（r56）、`docs/GROK_REVIEW_card_V2.md`（r57） |
| 對照宣稱 | `docs/CODEX_RESPONSE_card_visual3.md`（r58 完成清單） |
| 審查角色 | **視覺品質監工 · 收官審**（只審不改） |
| 審查範圍 | `templates/card-battle/{index.html,battle.js}`、`templates/card-pack/{index.html,pack.js}`、`scripts/{test-quality-gates.js,test-battle-e2e.js}`、版本字串（shell／sw／index） |
| 方法 | 讀 **R58 diff**（`54bf0ad..059407c`）＋現源 CSS／API／守門；對照 V2 §2 三切口是否落地；**不執行遊戲、不修改任何程式碼** |
| 約束 | 本文件只寫審查結論與證據；**不改**實作 |
| 日期 | 2026-07-13 |

## 總覽

| # | 審題 | 結論 | 一句話 |
|---|---|---|---|
| (1) | R58 落地覆核 | **V2 三切口皆真上線；無 P0 空殼** | 命名 pose／URL 佈景、海報 freeze、頭像框＋列底、r58 版本與雙層守門齊備 |
| (2) | 收官評估：視覺 1–10 ＋剩餘最大缺口 | **總分 8.2／10**；最大缺口見 §2 | 材料＋截圖管線已過「可穩定出商店圖」門檻；往 9 分要換賽道（內容美術／鏡頭語意完整） |

優先級（收官後殘差）：

| 級別 | 意義 |
|---|---|
| **P0** | 無：R58 宣稱項均有 CSS＋JS 掛載＋gate／e2e 證據 |
| **P1** | 展示盤語意半成品（`threeOpponents` 名實不符）；大量 `image:null` 卡在實戰／非旗艦構圖仍露餡 |
| **P2** | 雙端微漂移、史詩靜幀、多傳說外光、pose 行為覆蓋不全、截圖手冊缺文件化 |

**總判定：R58 是對 V2 視覺監工「材料已夠 → 變現為可重現商品鏡頭」的正確閉環，可視為 r56→r58 視覺三輪的收官。**  
以「可玩戰場」約 **A-（8.0）**；以「商店／社群宣傳截圖」約 **A-（8.3）**——V2 時兩者落差來自「管線未產品化」；R58 後落差已收斂，剩餘差距改由**內容美術覆蓋率**與**次級鏡頭語意**主導，而非「再加一層箔」。

---

## (1) R58 落地覆核（讀 diff）

對照 `CODEX_RESPONSE_card_visual3.md` 與 V2 §2 三步，逐項驗真。  
Commit：`059407c`（+448／−53，13 files）；**`core.js` 未改**。

### 1.1 V2 步 1 — 可重現展示盤（battle 命名 pose ＋ `?capture=`）

| 宣稱 | 證據 | 判定 |
|---|---|---|
| 四個命名 pose | `battle.js:3241` `CAPTURE_POSES = ["legendTauntFoil","heroCritical","fourRarityHand","threeOpponents"]` | **PASS** — 與 V2 建議名表對齊 |
| `window.__capture.pose(name)` | `3295` `Object.freeze({ poses, pose, clear })`；亦掛 `__test.pose` | **PASS** |
| URL 一鍵載入 | `3298-3299` `?capture=` → `applyCapturePose` | **PASS** |
| 固定牌／血量／foil，不靠抓幀 | `3269-3285` 種子牌表；`titan`+`foil`、hp=7、四階手牌等 | **PASS** 功能層 |
| 材質峰值鎖定 | CSS `body.capture-pose`（`index.html:806-809`）：全域 `animation:none`；sheen `background-position:58%`；foil 雙層位＋`opacity:.84`；legend-idle 固定外光 | **PASS** — 靜幀可讀，不依賴 3.2s 循環 |
| 清 FX／導引 | `clearTransientFx()`、`stopGuide(false)` | **PASS** — 截圖乾淨 |

**各 pose 內容驗真：**

| Pose | 種子 | 預期視覺 | 判定 |
|---|---|---|---|
| `legendTauntFoil` | 我方 `titan`+foil；敵方 `frostboundTyrant` | 傳說+嘲諷 crest（`titan` 含 `taunt`）+ foil 峰值；敵場有圖傳說 | **PASS** |
| `heroCritical` | 玩家 hp=7；`dragon` foil vs golem+knight | `hp<=max(8,ceil(maxHp*0.25))` → critical 寶石（`1726`） | **PASS** |
| `fourRarityHand` | wolf／knight／golem／dragon foil | 四階稀有度一手並排 | **PASS**（場上清空，屬手牌特寫構圖） |
| `threeOpponents` | 敵場 3 隨從 + 我方 dawnArchbishop | 名為「三對手」，實為「敵場三隻」 | **PARTIAL** — 見 §1.1.1 |

#### 1.1.1 `threeOpponents` 語意殘差（非空殼，是名實漂移）

V2 §2 原文意圖是 **「三對手色場」**（藍／紫／橙 `data-opponent` tone 可辨）。  
現況：`applyCapturePose` **未呼叫** `setOpponent`、**未切換** `document.body.dataset.opponent`；僅在預設對手 tone 下塞三隻敵方牌。

| 項目 | 現況 |
|---|---|
| 功能 | 可重現、可凍結、有卡可拍 | 
| 對 V2 鏡頭表 | **未覆蓋**「三對手色場各一」 |
| 嚴重度 | **P1 語意**（不是回歸、不是空 class） |

**品質評語：**  
展示盤主幹已產品化：URL／API／freeze 三位一體，R57 材質終於可「一次定案、可回歸」。  
`legendTauntFoil`／`heroCritical`／`fourRarityHand` 直接對應 V2 鏡頭表；`threeOpponents` 是**唯一半成品命名**。

### 1.2 V2 步 2 — 英雄頭像框／列底二次商品化

| 宣稱 | 證據 | 判定 |
|---|---|---|
| 頭像徑向底＋雙圈描邊＋inset | `.hero .avatar`（`135-141`）：radial、`border:2px`、外圈 `0 0 0 2px`、inset 高光／暗角、陣營色暈 | **PASS** |
| 敵方隨 `--opponent-tone` | `#enemyHero .avatar`（`142`） | **PASS** — 與戰場色調同一變數 |
| hero-row 多層列底 | `121-131`：斜向高光＋accent 徑向＋panel；inset 高光／暗角；accent 混邊 | **PASS** — 不再是半透明系統列扁片 |
| 手機／矮視口壓縮 | `662` 34px、`681` 28px、`700` 36px | **PASS** |
| 與資源寶石同語系 | 同為 radial＋inset＋描邊立體 | **PASS**（工藝家族一致；形狀仍圓框 vs 異形 badge） |

**品質評語：**  
V2 點名的「新露餡點：裸 emoji 32px」已關。宣傳「英雄＋雙場」構圖下，頭像不再把整列拖回原型。  
**殘差（P2）：** 內容仍是 emoji 字元（本輪未要求換圖）；名稱文字仍無框；非 capture 時頭像無獨立 idle／稀有度光（合理）。

### 1.3 V2 步 3 — 開包海報幀可鎖定

| 宣稱 | 證據 | 判定 |
|---|---|---|
| 三幀：`suspense`／`legendPeak`／`foilPeak` | `pack.js:1800` `REVEAL_FRAMES` | **PASS** |
| `window.__capture.freezeReveal` | `1829`；亦掛 `__deckTest` | **PASS** |
| `?capture=` URL | `1832-1833` | **PASS** |
| 清 timer、停動畫、固定峰值 | `stopRevealTimers` 多次；CSS `body.reveal-freeze`（pack `461-469`） | **PASS** |
| 懸念：不翻開 | `name !== "suspense"` 才 `revealOne` | **PASS** — 黑影+`?` 靜幀 |
| 傳說峰值：beam 可讀 | `[data-reveal-freeze="legendPeak"] .beam { opacity:.86 }` ＋傳說外光加碼 | **PASS**（e2e 驗 opacity > .7） |
| foil 峰值 | foil 位＋`opacity:.88`；foil 卡外光 cyan／紫 | **PASS** |
| freeze 時禁 confetti／flash | `pack.js:538` `!reveal-freeze` 才 burst | **PASS** — 避免截圖花點 |

**品質評語：**  
開包社群主圖管線從「賭時序」變成「命名凍結」。三幀覆蓋懸念／傳說爆發／虹彩收藏，與 R56–R57 材料投資對齊。  
**殘差（P2）：** 無獨立 `tidePeak`；`foilPeak` 用多卡 foil 群像而非單卡特寫構圖（仍可裁切）。

### 1.4 版本、守門、不回歸

| 項目 | 證據 | 判定 |
|---|---|---|
| CACHE／SW → r58 | battle／pack／shell／`sw.js` → `card-battle-r58-v1`；`card_sw_auto_reload_r58_v1` | **PASS** |
| resource `?v=` | cards／core／battle／pack 皆 r58 | **PASS** |
| quality gate 升格 | `checkR58CapturePipeline`：保留 R57 材質鎖＋pose／freeze／avatar | **PASS** |
| e2e 1280 | battle：avatarFrame＋`legendTauntFoil` 凍結；pack：三幀 freeze | **PASS** 行為層 |
| R57 材質未回退 | frame-sheen mask、雙層 foil、寶石 critical 仍在 gate | **PASS** |
| core 不動 | diff 無 `core.js` | **PASS** |

**e2e 覆蓋深度備註：** battle 只**深測** `legendTauntFoil` 的凍結行為；其餘三 pose 僅驗名稱表存在。不構成功能空殼，但屬 P2 守門缺口。

### 1.5 與 Codex r58 宣稱對照總表

| 宣稱 | 覆核 |
|---|---|
| battle 四 pose ＋ `?capture=`／`__capture.pose` | **成立** |
| pack 三海報幀 ＋ freeze ＋ URL | **成立** |
| 英雄頭像框＋hero-row 列底 | **成立** |
| capture／sheen／foil 受 reduced-motion／low-perf 覆蓋 | **成立**（capture 直接 `animation:none`；常態 reduced 區塊仍在） |
| quality + e2e + rwd 宣稱 | 本審**讀碼驗路徑**；Codex 報 PASS 作旁證，未重跑瀏覽器 |
| core 未改；版本全 r58 | **成立** |

### 1.6 V2 → R58 狀態遷移

| V2 項 | V2 判定 | V3 判定 |
|---|---|---|
| 可重現展示盤 | P1 未做 | **PASS（主幹）**；`threeOpponents` **PARTIAL** |
| 英雄頭像框 | P1 露餡 | **PASS** |
| 開包海報幀鎖定 | P1 未做 | **PASS** |
| R57 材料（掃光／寶石／foil） | PASS | **PASS（未回退）** |
| 無圖傳說／大量 null art | 降權避開 | **仍為實戰／非旗艦最大露餡** |
| 雙端 foil 微漂移 | P2 | **P2 仍在** |
| 多傳說 idle 外光 | P2 | **P2 仍在** |

### 1.7 小結 (1)

| V2 缺口 | R58 結果 |
|---|---|
| 展示盤 pose API | **關閉**（可 URL／可回歸） |
| 英雄頭像平面 | **關閉** |
| 開包峰值靠運氣 | **關閉** |
| 三對手色場鏡頭 | **未真正關閉**（命名佔位） |
| 再加箔的誘惑 | **正確拒絕** — 本輪投資在管線 |

**無 P0 回歸訊號。** R58 施工範圍與 V2 處方一致，且有靜態 gate + e2e 雙鎖，可認定「修正落地」。

---

## (2) 收官評估：視覺 1–10 ＋剩餘最大缺口

### 2.1 評分（1–10）

評分基準沿用監工三輪定義：

- **可玩戰場**：決策清晰、稀有度可讀、HUD 不拖垮卡面、RWD 不破版  
- **宣傳截圖**：單幀靜止仍好看、主體商品級、可重現、不靠長動效  

| 維度 | 分數 | 說明 |
|---|---:|---|
| 稀有度材質階梯（四階） | **8.0** | 銀→藍→紫→金可讀；史詩 conic 仍弱於傳說 mask 箔 |
| 閃卡／傳說特寫 | **8.2** | 雙層色散＋框環 sheen；靜幀可鎖定峰值 |
| 英雄列／HUD 完成度 | **8.0** | 寶石＋頭像框＋列底齊；名稱列仍偏文字 UI |
| 開包行銷語言 | **8.5** | 懸念／金柱／虹彩皆可 freeze；傳播管線最完整 |
| 截圖可交付性（R58 主升） | **8.5** | `?capture=` 一鍵；V2 最大瓶頸已消 |
| 內容美術覆蓋（實戰露餡） | **6.5** | 旗艦有圖可拍；庫內大量 `image:null` 仍 emoji 區 |
| 雙端一致性／polish | **7.5** | 主語系對齊；opacity／圓角微漂移仍在 |
| **綜合（宣傳就緒加權）** | **8.2** | 材料 8.0 × 管線 8.5 的收斂值 |
| **綜合（純可玩）** | **8.0** | 與 V2 A- 同級，頭像＋列底微升 |

**一句話定級：**  
**8.2／10 — 已達「獨立 HTML 卡牌小品的商店／社群可出圖」標準；未達「全卡美術庫＋AAA 全息材質」的 9 分帶。**

### 2.2 剩餘最大缺口（收官後主軸轉移）

R58 之後，**CSS 材質回合與截圖管線回合可視為結束**。報酬曲線已翻轉：

| 順位 | 剩餘缺口 | 為何現在是最大 | 類型 | 建議態度 |
|---|---|---|---|---|
| **#1** | **內容美術覆蓋率（`image:null` 長尾）** | 旗艦構圖可全用有圖卡；實戰、收藏、部分 AI 牌組仍大量 emoji 卡心。玩家實際遊玩截圖 ≠ 展示盤 pose，**產品觀感的地板**被 null art 拉開 | 內容產線 | **下一輪主戰場**；優先傳說／高登場率 |
| **#2** | **`threeOpponents` 名實不符（三色場未產品化）** | 色場 CSS 與 `data-opponent` 已存在，缺的是 capture 內 `setOpponent` 或三 pose 分拆；一鍵商店圖目前**拍不到**「藍／紫／橙各一」 | 管線補完（小） | **半日級修補**即可關閉 V2 鏡頭表最後一格 |
| **#3** | **次級 polish（非再加箔）** | battle／pack foil opacity 0.78 vs 0.82、圓角 10 vs 12；多傳說 idle 外光漂白；史詩靜幀「紋」仍弱 | polish | 僅在特寫海報需要時動；**勿再開材料大輪** |

刻意**不再**列為主缺口：

| 項目 | 原因 |
|---|---|
| 第三層色散／更厚 foil | R57 已過門檻；邊際收益低於美術覆蓋 |
| 再寫一輪 frame-sheen | 雙端已對齊 mask 掃光 |
| log／粒子加重 | 與正確降權衝突 |
| 像素級 visual regression | 目前 class／computed style 守門夠用 |

### 2.3 收官驗收清單（R58 後「合格」訊號）

| 鏡頭 | 如何一鍵 | 應看見 | 仍不合格訊號 |
|---|---|---|---|
| 傳說＋嘲諷＋閃 | `?capture=legendTauntFoil` | 金環峰值、嘲諷 crest、虹彩、動畫 none | 只有黃暈、foil 單白膜、動畫仍在跑 |
| 英雄危急 | `?capture=heroCritical` | HP critical 寶石＋頭像框＋列底 | 扁 pill、裸 emoji 頭像 |
| 四階手牌 | `?capture=fourRarityHand` | 銀／藍／紫／金並排可辨 | 史詩糊邊、缺 foil 旗艦 |
| 開包懸念 | pack `?capture=suspense` | 黑影 `?` + 稀有色暈靜止 | 灰塊、或必須錄影 |
| 傳說開包峰 | `?capture=legendPeak` | beam 可讀＋金外光 | beam opacity 0、仍在 flip |
| foil 開包峰 | `?capture=foilPeak` | 雙層色散靜幀 | 動畫掃動中、無虹彩 |

### 2.4 給後續輪次的一句策略

> **停在「CSS 材料＋capture 管線」；下一刀切內容美術與鏡頭語意補完，而不是再疊特效層。**

若只能做一件事：**補高頻／傳說 null 的 art**（拉高實戰地板）。  
若只能做一件小事：**把 `threeOpponents` 做成真·三對手 tone 切換**（關閉 V2 表最後一格）。

---

## 附錄 A：R58 證據索引（精選）

| 主題 | 路徑 |
|---|---|
| Commit | `059407c` |
| 前序 commit | R57 `54bf0ad` |
| CACHE 版本 | battle／pack／shell／sw → `card-battle-r58-v1` |
| battle CAPTURE_POSES | `templates/card-battle/battle.js:3241-3299` |
| battle capture CSS | `templates/card-battle/index.html:806-809` |
| 頭像／hero-row | `templates/card-battle/index.html:121-142`、RWD `662/681/700` |
| pack REVEAL_FRAMES | `templates/card-pack/pack.js:1800-1833` |
| pack freeze CSS | `templates/card-pack/index.html:461-469` |
| freeze 禁 confetti | `pack.js:538` |
| quality gate | `scripts/test-quality-gates.js:502-523` |
| e2e battle capture | `scripts/test-battle-e2e.js:327-366` |
| e2e pack frames | `scripts/test-battle-e2e.js:1209-1226` |
| 宣稱對照 | `docs/CODEX_RESPONSE_card_visual3.md` |
| 前序審 | `docs/GROK_REVIEW_card_V1.md`、`V2.md` |

## 附錄 B：三輪視覺監工遷移總表

| 輪次 | 版本 | 主命題 | 結果 |
|---|---|---|---|
| V1 | r56 | 材質有沒有真上線 | **有**；battle 傳說／英雄／foil 偏弱 |
| V2 | r57 | 三切口材料補完 | **掃光／寶石／色散關閉**；管線未做 |
| **V3** | **r58** | **管線變現＋英雄列完成** | **展示盤／海報幀／頭像關閉**；收官 **8.2／10** |

| 缺口類型 | V1 | V2 | V3（收官） |
|---|---|---|---|
| 材料（箔／寶石／色散） | P1 | **關閉** | 維持 PASS |
| 截圖管線 | 建議 | **P1 主軸** | **關閉** |
| 英雄列 | 資源平面 | 頭像露餡 | **關閉** |
| 內容 null art | 降權 | 降權 | **升為 #1 剩餘缺口** |
| 三對手色場 | 鏡頭表文字 | 建議 pose | **名在實缺（P1 語意）** |

---

## 結論

R58 把 V2 開出的三張處方——**可重現展示盤、英雄頭像框、開包海報幀鎖定**——連同 r58 版本鎖與雙層守門 **真實落地**，且未回退 R57 材料、未動 `core.js`。  

視覺監工三輪（r56 材料 → r57 補材 → r58 變現）可簽核 **收官**：**綜合 8.2／10**。  

剩餘最大缺口已轉移到 **(1) 長尾無圖卡的內容美術地板** 與 **(2) `threeOpponents` 色場鏡頭未做完**；兩者都不是「再加一層 CSS 箔」能解決的問題。

**本輪：只審不改。** 報告路徑：`docs/GROK_REVIEW_card_V3.md`。
