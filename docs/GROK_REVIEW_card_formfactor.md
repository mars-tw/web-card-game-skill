# 《卡牌對戰》手機優化輪 — form-factor 偵測監工快掃

| 欄位 | 內容 |
|---|---|
| 版本對齊 | **card-battle-r58-v1**（`templates/card-battle/index.html` boot script） |
| 審查角色 | **監工・form-factor 誤傷快掃**（只審不改） |
| 審題 | 近期手機優化（手牌抽屜／戰場合計 50dvh）是否有「**偵測到觸控就套手機版面、不看視口**」→ 平板／觸控筆電誤套跑版 |
| 主要證據檔 | `templates/card-battle/index.html`、`templates/card-battle/battle.js`、`scripts/test-rwd-matrix.js` |
| 方法 | 靜態路徑追蹤：layout 觸發條件、JS class／matchMedia／UA／touch 旗標、測試模擬 vs 產品邏輯；**未改任何程式碼** |
| 日期 | 2026-07-13 |

---

## 總判定

| 項目 | 結論 |
|---|---|
| **本審題（觸控→手機版面）** | **PASS** |
| 判定依據 | 手牌抽屜固定底欄、結束回合釘底、戰場 `25dvh×2`（合計 50dvh）皆掛在 **純 CSS `@media` 視口條件**；產品碼**沒有**「有 touch 就加 mobile class／強制版面」路徑 |
| 用戶準則對照 | 「**純 CSS media query 就 PASS**」→ 本輪**成立** |

**一句話**：平板與觸控筆電**不會**因為「有觸控」就被套手機版面；是否進入手機版面只看 **CSS 視口寬度（與直式時的 orientation）**。

---

## 1. 偵測／套版邏輯（實際在做什麼）

### 1.1 產品 runtime：無 form-factor 觸控偵測

於 `templates/card-battle` 搜尋並對照：

| 常見誤傷寫法 | 產品是否存在 | 說明 |
|---|---|---|
| `navigator.maxTouchPoints` | **否** | 無 |
| `ontouchstart` / `DocumentTouch` 當 device flag | **否** | 僅事件監聽用 `touchstart`（詳情鈕防冒泡，見 §1.3） |
| `matchMedia('(pointer: coarse)')` / `(hover: none)` **驅動版面** | **否** | 無以此切 layout |
| `userAgent` 判 mobile 後 `classList.add('mobile')` | **否** | 無 |
| JS 依 `innerWidth` 強制切 mobile DOM 結構 | **否** | 無；抽屜 open 狀態與版面結構解耦 |

`battle.js` 唯一與 media 相關的 `matchMedia` 是 **`prefers-reduced-motion`**（動效），**不**改 form-factor 版面：

```160:162:templates/card-battle/battle.js
    try { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch { return false; }
```

### 1.2 手機版面：純 CSS 視口 media query

| 能力 | 條件 | 檔案:約略行號 | 行為摘要 |
|---|---|---|---|
| 手牌抽屜（固定底欄、peek、橫向捲、toggle 顯示） | `@media (max-width: 700px)` | `index.html` ~692–795 | `.hand-drawer` 改 `position:fixed`；`.hand-drawer-toggle` 顯示；收合高度 `--mobile-hand-peek` |
| 結束回合釘右下 | 同上 | ~757–759 | `#endTurnBtn { position: fixed; … bottom: calc(5px + env(safe-area-inset-bottom)) }` |
| 戰場合計約 50dvh | `@media (max-width: 700px) and (orientation: portrait)` | ~796–804 | 每個 `.battlefield`：`flex/min/max-height: 25dvh` → **雙方場合計 50dvh** |
| 桌面預設（寬 > 700） | 無 media，基底樣式 | ~337–338 | `.hand-drawer { display: contents; }`、`.hand-drawer-toggle { display: none; }` → 無「抽屜殼」、手牌走桌面 flex 流 |

**判斷條件（產品）可濃縮為：**

```
手機手牌／釘底 UI  :=  viewport width ≤ 700px
手機戰場 50dvh     :=  viewport width ≤ 700px  AND  orientation: portrait
```

**不是：**

```
手機版面 :=  hasTouch || maxTouchPoints > 0 || UA mobile
```

### 1.3 JS 與抽屜：只管 open 狀態，不管「是不是手機」

| API | 行為 | 是否讀視口／觸控 |
|---|---|---|
| `setHandDrawerOpen(open)` | `drawer.classList.toggle("open")` + `aria-expanded` + 文案 | **否** |
| 出牌後 `setHandDrawerOpen(false)`、導引展開／收合 | 同上 | **否** |
| `#handDrawerToggle` 點擊 | 切 open（由 HTML／綁定；樣式僅在 ≤700px 可見） | **否** |

桌面寬視口下 toggle `display:none`，即使誤加 `.open` 也因 `display:contents` 殼層不形成固定底欄，**不會**把桌面打成手機固定抽屜。

`touchstart` 出現在詳情鈕防冒泡（`pointerdown` / `mousedown` / `touchstart`），屬**事件隔離**，不寫 layout class。

### 1.4 與 form-factor 無關的 CSS 觸控／hover（不構成「觸控套版」）

| 規則 | 用途 | 是否改板型骨架 |
|---|---|---|
| `@media (hover:hover) { .card-info-btn opacity… }` | 有精確 hover 才淡化詳情鈕 | **否**（僅 opacity） |
| `max-width:700px` 內 `touch-action: manipulation` / `pan-x` | 減少雙擊縮放、允許手牌橫滑 | **否**（互動，非偵測套版） |
| `card-pack` 的 `@media (hover:none) { .dismantle-btn opacity:1 }` | 無 hover 時按鈕常駐 | **否**（開包小控件，非 battle 手牌／戰場骨架） |

### 1.5 測試層 `hasTouch`／`isMobile`（勿與產品邏輯混淆）

`scripts/test-rwd-matrix.js` 在 Playwright context 對 mobile／landscape 設 `hasTouch` / `isMobile`：

```138:142:scripts/test-rwd-matrix.js
        const isTouch = vp.kind === "mobile" || vp.kind === "mobile-short" || vp.kind === "landscape";
        const ctx = await browser.newContext({
          viewport: { width: vp.w, height: vp.h },
          hasTouch: isTouch,
          isMobile: isTouch,
```

這是**測試模擬裝置能力**，產品 CSS **不讀**這些旗標。  
守門對「手牌抽屜／50dvh」只在 `vp.kind === "mobile" | "mobile-short"` 且 `card-battle` 頁跑（寬 390／360／320），與產品 `max-width:700` 一致地**以視口寬為準**。

矩陣含 **tablet 820×1180、768×1024**（`kind: "tablet"`）：寬皆 **> 700**，預期**不**套手機抽屜／50dvh；測試也**未**對 tablet 強制驗 mobile flow（符合本審題「不誤套」）。

---

## 2. 判斷條件一覽（可複核）

| ID | 條件 | 結果 |
|---|---|---|
| C1 | `width ≤ 700px` | 手牌抽屜殼、peek 底欄、手機卡 82×116、釘底結束回合、部分面板改 static 等 |
| C2 | `width ≤ 700px` **且** `orientation: portrait` | 雙方 `.battlefield` 各鎖 `25dvh`（合計 50dvh） |
| C3 | `width ≥ 701px` | 桌面／平板寬版流：`hand-drawer` = `display:contents`，無固定手牌抽屜；矮高另走 `max-height`+`min-width:701px` 壓縮階層 |
| C4 | 觸控能力（任意） | **不參與** C1–C3 |

---

## 3. 誤傷情境矩陣（針對本 bug 類型）

| 裝置／情境 | 典型視口 | 會否套「手機手牌抽屜」 | 會否套「戰場 50dvh」 | 本 bug？ |
|---|---|---|---|---|
| 手機直式 | 390×844 | 是（寬 ≤700） | 是（直式） | 預期行為 |
| 手機橫式（寬邊當 width） | 844×390 | **否**（844>700） | **否** | **非**本 bug；屬「寬橫式走桌面＋矮高壓縮」策略 |
| iPad／安卓平板直式 | 768×1024、820×1180 | **否** | **否** | **不誤傷**（審題關切點） |
| 觸控筆電全螢幕 | 1366×768、1920×1080… | **否** | **否** | **不誤傷** |
| 觸控筆電把瀏覽器縮到 ≤700 寬 | ≤700×任意 | **是** | 僅直式時 | **非**觸控誤傷；純視口 media 的正常結果 |
| 平板分割畫面／側掛視窗寬 ≤700 | ≤700 | **是** | 視 orientation | **非**觸控誤傷；窄視口刻意手機化 |
| 僅有觸控、視口仍寬（Surface 筆電等） | ≥701 | **否** | **否** | **通過**——正是本審要防的假陽性 |

**結論**：不存在「偵測到觸控就套手機版面」假陽性；平板與觸控筆電在**正常寬視口**下維持桌面／寬版流。

---

## 4. 修法

| 狀態 | 建議 |
|---|---|
| **本 bug** | **無需修**。維持純 CSS `max-width`（+ portrait 的 50dvh）即可。 |
| 防回歸（可選 P2） | 文件／註解寫明：「form-factor 只看 viewport，禁止 touch／UA 切 layout」。RWD 可選加一案：`hasTouch:true` + viewport **1024×768** 斷言 `.hand-drawer` 計算樣式仍為 `display:contents`（證明觸控≠手機版）。 |
| 非本審題、可另開的產品討論 | (a) 700px 門檻是否覆蓋「小平板直式想要抽屜」；(b) 手機橫式 844 寬不走手機流是否可接受。皆屬產品策略，**不是**觸控誤套 bug。 |

**若未來有人改成 JS 偵測，應拒絕的寫法（反例）：**

```js
// 反例：觸控筆電／平板必誤傷
if (navigator.maxTouchPoints > 0) document.body.classList.add("mobile-layout");
```

**應維持／若需 JS 強化時的寫法：**

```css
/* 現況：正確 */
@media (max-width: 700px) { /* 手牌抽屜 */ }
@media (max-width: 700px) and (orientation: portrait) { /* 戰場 25dvh×2 */ }
```

```js
// 若必須 JS：仍應對齊視口，勿用 touch 單獨決策
const mobileLayout = window.matchMedia("(max-width: 700px)").matches;
```

---

## 5. 證據索引（關鍵片段）

| 主題 | 位置 |
|---|---|
| 桌面抽屜 neutral | `templates/card-battle/index.html`：`.hand-drawer { display: contents }`、`.hand-drawer-toggle { display: none }` |
| 手機抽屜／peek | 同檔 `@media (max-width: 700px)` 內 `.hand-drawer` / `.open` / `.hand` |
| 戰場 50dvh | 同檔 `@media (max-width: 700px) and (orientation: portrait)` → `.battlefield` `25dvh` |
| open 狀態 API | `templates/card-battle/battle.js`：`setHandDrawerOpen` |
| 無 touch form-factor 旗標 | 全 `templates/card-battle`：無 `maxTouchPoints`／`(pointer: coarse)` layout 分支 |
| 測試 hasTouch 僅 Playwright | `scripts/test-rwd-matrix.js` ~138–142；tablet 視口 kind 不跑 mobile flow |

---

## 6. 清單（本輪）

| ID | 級 | 項目 | 狀態 |
|---|---|---|---|
| FF-1 | — | 「偵測觸控即套手機版面、不看視口」 | **不成立（PASS）** |
| FF-2 | — | 平板／觸控筆電寬視口誤套手牌抽屜 | **不成立** |
| FF-3 | — | 同上誤套戰場 50dvh | **不成立** |
| FF-4 | P2（可選） | 防回歸：寬視口 + hasTouch 斷言桌面 `display:contents` | 建議，非必須 |
| FF-5 | 資訊 | 700px 門檻與手機橫式不進 mobile 流 | 策略選擇，非本 bug |

---

## 7. 結語

本輪手機優化（手牌抽屜 + 直式戰場合計 50dvh）的 form-factor 切換是 **純 CSS 視口 media query**，符合監工準則 **PASS**。  
**平板與觸控筆電不會因「有觸控」被誤套手機版面**；僅在視口寬 ≤700px（戰場再加直式）時進入該版面。  
**只審不改**；無需為本 bug 開修工。
