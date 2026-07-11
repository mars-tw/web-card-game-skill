# 《卡牌對戰》card-battle-r54-v1 — 手機端體驗監工審查

| 欄位 | 內容 |
|---|---|
| 版本對齊 | **card-battle-r54-v1** |
| 審查角色 | **手機端體驗監工**（玩家視角，只審不改） |
| 審查範圍 | 出牌／選目標觸控、直式空間與可讀性、R53–54 動畫效能與 `reduced-motion`、開包翻卡觸控 |
| 主要證據檔 | `templates/card-battle/{battle.js,index.html}`、`templates/card-pack/{pack.js,index.html}`、`templates/index.html`（shell）、`scripts/test-rwd-matrix.js` |
| 方法 | 靜態路徑追蹤（事件綁定、layout media、動畫／perf 守衛）+ 九視口守門覆蓋面對照；**未改任何程式碼** |
| 日期 | 2026-07-11 |

## 總覽（手機玩家一句話）

| # | 審題 | 結論 | 一句話 |
|---|---|---|---|
| (1) | 出牌／選目標觸控 | **點擊兩段式可玩，無拖曳；誤觸面仍大** | 全靠 `onclick` 點手牌／點隨從／點目標；詳情鈕有防冒泡，但卡面與捲動手牌仍易誤觸 |
| (2) | 直式空間／可讀性 | **底部固定層過重，戰場常被擠成「捲動戰場」** | `max-width:700px` 鎖死 controls+hand+quest+log+target ≈ **390px** 底欄；矮機幾乎看不到雙方場同時在屏 |
| (3) | 動畫效能／reduced-motion | **有 auto-low 與 CSS reduce，JS 仍建重 ghost** | `prefers-reduced-motion` 未貫穿 `animateAttackToward`／`spawnSparks`；AI 路徑雙倍 ghost 在手機更痛 |
| (4) | 開包翻卡 | **自動時序翻開，非觸控翻牌** | 點包一次後完全被動等待；無 tap-to-reveal／skip；揭卡尺寸未為手機縮 |

**既有守門**：`scripts/test-rwd-matrix.js` 九視口（含 390×844、360×640、844×390）只驗「可點元素在視口或可捲容器內／頁級不捲／水平不溢」。**不驗** 觸控目標尺寸、safe-area、攻擊雙點是否同屏、`reduced-motion` 行為、開包互動節奏。

優先級定義：

| 級別 | 意義 |
|---|---|
| **P0** | 核心對戰在主流直式手機上明顯受阻（空間／安全區／無法同屏完成攻擊迴圈） |
| **P1** | 明顯誤觸、可讀性、效能與 a11y 落差；會在實戰放大 |
| **P2** | 打磨、邊緣裝置、一致性與測試覆蓋缺口 |

---

## (1) 出牌／選目標的觸控流程

### 1.1 實際模型：純點擊兩段式，無拖曳

| 動作 | 實作 | 檔案:行號 |
|---|---|---|
| 出牌 | `hand` 每卡 `el.onclick = () => playFromHand(card.uid)` | `battle.js:1721-1726`、`899-924` |
| 選己方攻擊者 | `selectMyMinion`：再點同一 uid 取消；`canAttack` 才可選 | `battle.js:1757-1761`、`1011-1019` |
| 攻敵隨從 | `clickEnemyMinion`：需 `game.selected` 或 `pendingSpell` | `battle.js:1767`、`951-967` |
| 攻敵英雄 | `enemyHero.onclick = clickEnemyHero` | `battle.js:1729-1732`、`985-1008` |
| 法術指定 | `pendingSpell.need` → 友方／敵方隨從 | `battle.js:910-913`、`969-982` |
| 取消選取 | 點空戰場、`board` 空白處 `cancelTargeting` | `battle.js:1744-1746`、`2967-2972`、`1022-1028` |
| 狀態文案 | `#targetStatus`（`aria-live`） | `battle.js:1031-1051`；`index.html:732` |

**沒有** `pointermove` 拖曳出牌、沒有「拖到目標放開」、沒有拖曳取消門檻。教學文案也明確是「先點…再點…」（`battle.js:152-156`）。

**玩家體感**：對手機這是合理預設（單手點擊比精準拖曳穩），但玩家若預期 Hearthstone 式拖放會感到「只能點」。這本身不構成 bug；問題在**同屏能否完成第二下**（見 §2）與**誤觸面**。

### 1.2 誤觸與衝突面

| 風險 | 證據 | 嚴重度 |
|---|---|---|
| **詳情鈕 vs 出牌／選牌** | `.card-info-btn` 手機 **36×36**，位於卡右上；`pointerdown/mousedown/touchstart` 僅 `stopPropagation`，`onclick` 再 `preventDefault` + 開詳情 | `index.html:224-229`、`637`；`battle.js:1808-1826` | 防冒泡**有做**；但 92px 寬卡上 36px 鈕 ≈ **39% 寬度** 的右上熱區，單手拇指易點到「詳」而非出牌 → **P1** |
| **手牌垂直捲動後誤點** | 手牌 `overflow-y: auto` + 純 `onclick`，**無** pointer 位移門檻、無 `touch-action` | `index.html:629-635`；`battle.js:1725` | 捲完放手若落在卡上會出牌／選牌 → **P1** |
| **`:hover` 抬升殘留** | `.card:hover { transform: translateY(-8px) scale(1.05) }` 無 `@media (hover:hover)` 限制 | `index.html:177` | 觸控裝置「黏住抬升」、z-index 蓋住鄰卡 → **P2** |
| **全域缺 `touch-action: manipulation`** | 僅詳情鈕有；手牌／戰場卡／結束回合等無 | `index.html:228` vs 其餘 button/card | 部分瀏覽器雙擊縮放／點擊延遲風險 → **P1** |
| **取消目標無專用大鈕** | 靠點空白；手機固定底欄後「可點空白」面積變小 | `battle.js:2969-2971` | 新手卡在 targeting 狀態 → **P2**（`targetStatus` 有提示可緩解） |
| **戰場卡互相擠壓** | 手機 `battlefield` `flex-wrap` + `gap:5px`，多從時熱區重疊感上升 | `index.html:134-140`、`626` | 選錯目標 → **P2**（wrap 本身正確，避免裁切） |

### 1.3 流程優點（應保留）

- 兩段選取有 `selected`／`targetable`／`blocked` 視覺與 `targetStatus` 文案（`index.html:180-182`；`battle.js:1031-1044`）。
- 再點同一攻擊者取消（`1018`）；同牌 pending 取消走 core（`904-905`）。
- 詳情與出牌路徑分離有做事件隔離（`1814-1826`）— 方向正確，尺寸仍偏大。

### 1.4 本節清單

| ID | 級 | 問題 | 檔案:行號 |
|---|---|---|---|
| M-T1 | **P1** | 手牌／戰場僅 `onclick`，捲動手牌無滑動門檻 → 誤出牌 | `battle.js:1725`；`index.html:629-635` |
| M-T2 | **P1** | 詳情鈕 36×36 佔卡面過大，易誤開詳情 | `index.html:224-229,637`；`battle.js:1808-1826` |
| M-T3 | **P1** | 卡牌與主按鈕缺 `touch-action: manipulation` | `index.html:158-166,309-317`（對照 `228` 僅 info 有） |
| M-T4 | **P2** | `:hover` 抬升未限 `hover:hover`，觸控黏滯 | `index.html:177` |
| M-T5 | **P2** | 無明確「取消選取」觸控控件 | `battle.js:1022-1028,2969-2971` |
| M-T6 | **P2** | 無拖曳備援（非 bug；文件化期望即可） | 全檔無 drag 處理 |

---

## (2) 手機直式：手牌／戰場／對手區空間與可讀性

### 2.1 底部固定層「稅」

`@media (max-width: 700px)` 將關鍵互動層全部 `position: fixed` 釘在底部：

| 層 | CSS 變數／高度 | 檔案:行號 |
|---|---|---|
| controls | `--mobile-controls-h: 62px` | `index.html:613,637-643` |
| hand | `--mobile-hand-h: 150px` | `614,629-635` |
| quest-panel | `--mobile-quest-h: 110px` | `615,677-681` |
| log | `--mobile-log-h: 38px` | `616,670-675` |
| target-status | `--mobile-target-h: 30px` | `617,665-669` |
| board 底 padding | 上列總和 **+ 20px** | `620` |

**合計底欄預留 ≈ 62+150+110+38+30+20 = 410px**（不含 header）。

對照 `test-rwd-matrix` 手機視口：

| 視口 | 約略剩餘給 header+敵我英雄+雙戰場 |
|---|---|
| 390×844 | ~844−410−header ≈ **400px 級**（尚可，雙方場仍緊） |
| 360×640 | ~640−410−header ≈ **200px 級**（**嚴重**） |

再疊 **shell 頂欄**（`templates/index.html:122-123` `min-height:56px`）：iframe 內戰場所剩更少。

### 2.2 戰場行為

| 設定 | 手機行為 | 檔案:行號 |
|---|---|---|
| `.battlefield` | `flex:0 0 auto`；`min-height: calc(var(--card-h)+10px)`；**取消**桌機 `max-height` 內捲，改整 board 外捲 | `626` vs `134-138` |
| 卡尺寸 | 固定 `--card-w:92px; --card-h:132px`（**不**隨 `max-height` 再縮） | `611-612` |
| 手牌 | 固定 150px 高、wrap + 內捲 | `629-635` |

**玩家體感（P0）**：在 360×640 與「shell+矮機」上，**幾乎無法同時看見己方隨從與敵方隨從**。攻擊是「點 A 再點 B」模型，第二下常要先捲動 board；捲動中拇指又靠近固定手牌區，挫敗感高。RWD 矩陣仍可能 PASS（元素在可捲 board 內），但**對戰手感不合格**。

### 2.3 可讀性

| 元素 | 手機字級 | 檔案:行號 | 判定 |
|---|---|---|---|
| `.card .cardname` | `calc(11px * var(--text-scale))` | `346` | 勉強 |
| `.card .cardtext` | `calc(9px * …)` → small 約 **8.3px** | `347`、`289` | **P1** 技能敘述在 92px 寬卡上難讀；依賴「詳」 |
| cost／atk／hp 徽章 | 視覺尚可 | `217-223,258-262` | OK |
| 手牌單卡高度 132 vs 區高 150 | 僅約一列；多手牌第二列要內捲 | `612,630` | 滿手 7–10 張時 **P1** 找牌成本高 |
| 任務列固定 110px | 無論是否有可領任務都佔位 | `615,677-681` | **P1** 擠壓戰場（應可折疊／縮高） |
| controls-scroll 塞難度／對手／DDA／效能／字級… | 62px 高內多鈕 wrap 內捲 | `637-660` | **P1** 誤觸與「結束回合」搶位（`#endTurnBtn` 有 `min-width:112` 略緩解） |
| **無 `env(safe-area-inset-*)`** | fixed `bottom:0` controls | `637-643`；全模板無 safe-area | **P0** 瀏海／Home Indicator 機型會擋結束回合與手牌底緣 |
| body `100dvh` + shell iframe | `index.html:79`；shell stage `103-107` | iframe 內 dvh 語意不一，可能底部裁切 → **P1** |

### 2.4 本節清單

| ID | 級 | 問題 | 檔案:行號 |
|---|---|---|---|
| M-L1 | **P0** | 直式底欄固定層合計 ~410px，矮機無法同屏完成「選攻擊者→點目標」 | `index.html:610-681` |
| M-L2 | **P0** | 無 safe-area，固定底欄與 Home Indicator／底部手勢衝突 | `index.html:637-643`（全檔無 `safe-area-inset`） |
| M-L3 | **P1** | 任務列固定 110px 過重，應可收合 | `index.html:615,677-681` |
| M-L4 | **P1** | 卡面敘述 ~9px 不可讀，實戰逼用詳情 | `index.html:254-255,346-347` |
| M-L5 | **P1** | 手牌區固定一列半高度，滿手需雙向找牌 | `index.html:629-635` |
| M-L6 | **P1** | 控制列塞滿次要開關，與結束回合搶觸控帶 | `index.html:637-663,735-760+` |
| M-L7 | **P1** | shell 頂 tab 再吃高度，矩陣「單頁」測不到組合視口 | `templates/index.html:122-133`；`test-rwd-matrix.js:36-39` |
| M-L8 | **P2** | 手機卡尺寸不隨高度再縮（對照桌機 `max-height` 階層） | `index.html:566-612` |

---

## (3) R53–54 動畫：手機效能與 reduced-motion

### 3.1 已有的正向機制

| 機制 | 行為 | 檔案:行號 |
|---|---|---|
| 效能模式 auto/high/low | FPS&lt;45 → low；≥52 回 high | `battle.js:293-306,320-333` |
| `data-perf="low"` CSS | 縮短 lunge／spawn；藏 hit-spark；縮短 float | `index.html:545-555` |
| JS `isLowPerf()` | 縮短攻擊／死亡時長、減少火花、小傷害不跳字、跳過 confetti／stars／shake | `battle.js:2197-2199,2236,2256,2293,2312,2926` |
| `prefers-reduced-motion` CSS | 全域 animation≈0、藏 confetti／spark | `index.html:556-564` |
| pack reduce | `legendFlash`／`burstConfetti` early return | `pack.js:25-27,551-552,1361-1362` |
| combat-ghost | 解耦 render，避免撲擊被 `innerHTML` 抹掉（R4/R5） | `battle.js:2163-2187` |

### 3.2 手機上的缺口

| 缺口 | 說明 | 檔案:行號 | 級 |
|---|---|---|---|
| **reduce 未擋住 ghost clone** | `animateAttackToward`／`markDying` 不讀 `prefersReducedMotion()`；仍 `cloneNode(true)` 含 `<img>` 進 `document.body` | `2190-2230`、`2282-2288`、`2163-2181` | **P1** |
| **reduce 未擋 sparks／多數 float** | `spawnSparks`、`floatDamage`、`flashKeyword2` 只看 low-perf 或完全不看 reduce；CSS 可藏 `.hit-spark` 但仍建 DOM | `2255-2266`、`2234-2244`、`2272-2278`；CSS `563` | **P1** |
| **AI 雙倍 `animateAttackToward`** | AI 先呼叫一次，`resolveAttack` 內再呼叫 → 每擊 4 個 card-ghost 級負載 | `1644-1651` + `1250-1251` | **P1**（手機連段 620ms 內更易掉 FPS） |
| **無限動畫常駐** | `legend-idle`、`foilShine`、`shieldPulse`、`pulseTarget`；low 只拉長 duration 未停 | `index.html:171-175,201-207,236-239,181`；`545-547` | **P1** 多傳說／閃卡場上 GPU 壓力 |
| **backdrop-filter** | hero-row／controls 等 blur | `index.html:121,149,281,324` | **P2** 中低階 Android |
| **終局 confetti 46 片** | 有 low/reduce 守衛 | `2311-2328` | OK |
| **lethal-slow filter** | 只跳過 reduce，**不**跳過 low-perf | `2298-2306` | **P2** |
| **pack 無 low-perf 系統** | 僅 reduce；中階機開包仍全特效 | `pack.js` 無 `isLowPerf` | **P1** |
| **reduce CSS 用 0.001ms 而非 animation:none** | 仍觸發 animation 管線一幀；對 pack `opacity:0`→flip-in 通常仍可到最終關鍵幀 | `index.html:556-562`；pack `414-418`、`149-152` | **P2** 實務多半可見，但非最佳 a11y 寫法 |

### 3.3 本節清單

| ID | 級 | 問題 | 檔案:行號 |
|---|---|---|---|
| M-A1 | **P1** | `prefers-reduced-motion` 未短路 combat-ghost／攻擊鏈 DOM 工作 | `battle.js:158-160` vs `2190-2288` |
| M-A2 | **P1** | AI 攻擊雙呼叫 ghost，手機掉幀放大器 | `battle.js:1644-1651,1250-1251` |
| M-A3 | **P1** | 場上無限 foil／legend／shield 動畫，low 未關閉 | `index.html:171-207,236-239,545-547` |
| M-A4 | **P1** | 開包側無效能降級，只認 reduce | `pack.js:25-27,531-537,1361-1375` |
| M-A5 | **P2** | `lethal-slow` 忽略 low-perf | `battle.js:2301-2305` |
| M-A6 | **P2** | reduce 用極短 duration 而非停用 | `index.html:556-564`；`card-pack/index.html:414-418` |

---

## (4) 開包翻卡觸控體驗

### 4.1 實際流程（被動影院，非觸控翻牌）

```
點 #pack
  → openPack（pointerEvents=none、opening 動畫 600ms）
  → revealCards：5 張一次 append，opacity:0
  → 每張 setTimeout 加 flip-in / rare-pull / legend-pull（間隔 340ms，末張 520ms）
  → 全開後再 +500ms 顯示 actions
```

| 步驟 | 檔案:行號 |
|---|---|
| 綁定 `pack.onclick = openPack` | `pack.js:1394` |
| 扣幣／抽卡／禁點 | `460-487` |
| 時序揭卡 | `507-547` |
| 動畫 class | `531-537`；CSS `151-160,409` |
| 重置再來 | `1378-1387` |

**沒有**：點卡翻下一張、長壓跳過、swipe 翻牌、進度點、點空白加速。

### 4.2 手機問題

| 問題 | 證據 | 級 |
|---|---|---|
| **非觸控主導節奏** | 純 timer；玩家無法「我準備好了再翻」 | `pack.js:526-538` | **P1** |
| **無法 skip** | 整段約 0.6 + (0.34×4+0.52) + 0.5 ≈ **3s+**；多包連續更累 | 同上 | **P1** |
| **揭卡尺寸未手機化** | `--card-w/h: 132×186` 全斷點共用；`max-width:700` 只縮 **禮盒** 不縮揭卡 | `card-pack/index.html:48,145,355-363` | **P1** 360 寬約 2 張／列，五張變兩排，open 區被 grid 擠 |
| **傳說特效疊加** | 高稀有：confetti 28 + legend-flash + 多 animation | `pack.js:537,551-557,1361-1375`；CSS `152-153` | **P1** 無 low-perf |
| **防連點** | opening 期間 `pointerEvents=none` | `pack.js:480` | 優點 |
| **分解鈕觸控** | `.dismantle-btn` `min-height:20px`；`hover:none` 常駐顯示 | `index.html:235-239` | **P1** 低於 ~44px 建議 |
| **reduce** | CSS 極短動畫 + JS 跳過 flash/confetti；卡仍依 timer 出現 | `414-418`；`551-552` | 可接受，但無「立即全開」捷徑 → **P2** |
| **deck／collection 觸控** | 加牌列、模板鈕在直式改單欄有顧及 | `355-375` | 大致 OK |

### 4.3 本節清單

| ID | 級 | 問題 | 檔案:行號 |
|---|---|---|---|
| M-P1 | **P1** | 開包為自動時序翻卡，非 tap-to-flip | `pack.js:460-547` |
| M-P2 | **P1** | 無跳過／加速揭卡 | `pack.js:526-547` |
| M-P3 | **P1** | 揭卡 132×186 未隨手機縮放 | `card-pack/index.html:48,145,355-363` |
| M-P4 | **P1** | 分解鈕 20px 高，觸控過緊 | `card-pack/index.html:235-239` |
| M-P5 | **P1** | 開包特效無 low-perf 降級 | `pack.js:531-537,1361-1375` |
| M-P6 | **P2** | reduce 使用者仍被迫等完整 timer | `pack.js:526-547` |

---

## P0–P2 總表（實作導向）

### P0（建議下一輪先做）

| ID | 問題 | 檔案:行號 | 建議方向（只審不改，僅備註） |
|---|---|---|---|
| **M-L1** | 直式底欄過重，攻擊兩段式難同屏 | `card-battle/index.html:610-681` | 任務／log 改抽屜或可摺；縮 hand／controls；或攻擊時暫時收起非必要層 |
| **M-L2** | 無 safe-area，擋結束回合與手牌 | `card-battle/index.html:637-643`（及固定 bottom 各層） | `padding-bottom: env(safe-area-inset-bottom)` 等 |

### P1

| ID | 問題 | 檔案:行號 |
|---|---|---|
| **M-T1** | 手牌捲動誤出牌 | `battle.js:1725`；`index.html:629-635` |
| **M-T2** | 詳情鈕過大誤觸 | `index.html:224-229,637`；`battle.js:1808-1826` |
| **M-T3** | 缺 `touch-action: manipulation` | `index.html` 卡／主按鈕 |
| **M-L3** | 任務列固定 110px | `index.html:615,677-681` |
| **M-L4** | 卡面 9px 敘述難讀 | `index.html:346-347` |
| **M-L5** | 滿手牌找牌成本 | `index.html:629-635` |
| **M-L6** | 控制列次要項過多 | `index.html:637-663` |
| **M-L7** | shell+battle 組合高度未進矩陣 | `templates/index.html:122-133`；`test-rwd-matrix.js:36-39` |
| **M-A1** | reduce 仍建 combat-ghost 鏈 | `battle.js:2190-2288` |
| **M-A2** | AI 雙 ghost | `battle.js:1644-1651,1250-1251` |
| **M-A3** | 常駐無限卡面動畫 | `index.html:171-207` |
| **M-A4** | pack 無 low-perf | `pack.js` 特效路徑 |
| **M-P1** | 非 tap 翻卡 | `pack.js:507-538` |
| **M-P2** | 無 skip | `pack.js:526-547` |
| **M-P3** | 揭卡未手機縮 | `card-pack/index.html:48,145` |
| **M-P4** | 分解鈕觸控過小 | `card-pack/index.html:235-239` |
| **M-P5** | 開包特效過重 | `pack.js:537,1361-1375` |

### P2

| ID | 問題 | 檔案:行號 |
|---|---|---|
| **M-T4** | hover 黏滯抬升 | `index.html:177` |
| **M-T5** | 無取消選取大鈕 | `battle.js:2969-2971` |
| **M-T6** | 無拖曳（期望落差） | — |
| **M-L8** | 手機卡不隨高度縮 | `index.html:610-612` vs `566-608` |
| **M-A5** | lethal-slow 略過 low | `battle.js:2301-2305` |
| **M-A6** | reduce 極短 duration 寫法 | `index.html:556-564`；pack CSS `414-418` |
| **M-P6** | reduce 仍等 timer | `pack.js:526-547` |

---

## 與 test-rwd-matrix 的關係

| 守門有驗 | 守門**沒**驗（本報告關切） |
|---|---|
| 可互動元素在視口或可捲容器 | 44px 觸控目標 |
| 頁級 scrollY≈0、overflowX≈0 | safe-area |
| hasTouch 上下文 | 出牌誤觸、兩段攻擊同屏 |
| shell／battle／pack 分頁 | shell **嵌** battle 的組合高度 |
| — | `prefers-reduced-motion` 行為 |
| — | 開包 skip／tap-to-flip |
| — | FPS／ghost 數量 |

因此：**矩陣綠燈 ≠ 手機對戰手感過關**。M-L1／M-L2 即使矩陣 PASS 仍應以 P0 追。

---

## 建議驗收（給下一輪實作／QA，非本輪修改）

1. **實機／模擬**：iPhone 安全區機型 + Android 360×640，完成「選隨從 → 攻敵隨從」**零捲動或僅小幅捲動**。
2. **觸控**：連續快速點手牌／捲動手牌 20 次，誤出牌率；點卡右上「詳」與出牌分離率。
3. **a11y**：系統「減少動態效果」開啟時，不應再大量 clone 卡 DOM；開包可立即看齊 5 張或一鍵跳過。
4. **效能**：AI 連攻時 `.combat-ghost` 峰值（DevTools）；低階機 low-perf 自動切入後場上無限動畫應明顯減少。
5. **開包**：tap 禮盒後可選擇自動或逐張點翻；揭卡在 360 寬單列可讀。

---

## 結論

card-battle-r54-v1 在桌機與「元素不裁切」層級已有 RWD 與 combat-ghost 基礎，**手機主路徑是可點完一場的**，但距離「手機優先卡牌手感」仍有兩道硬傷：

1. **直式空間**：固定底欄 + 任務列把戰場擠成捲軸，與兩段式點擊攻擊模型衝突（**P0**）。  
2. **安全區與觸控細節**：fixed 底欄無 safe-area；誤觸、reduce 不完整、開包純觀影式 timer（**P0/P1**）。

本報告只審不改；修復順序建議：**M-L1 → M-L2 → M-T1/T2 → M-A1/A2 → M-P1/P2**。
