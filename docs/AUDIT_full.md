# Card Battle 全面稽核報告

- 稽核日期：2026-07-16
- 稽核角色：遊戲 QA／製作人
- 稽核版本：package.json 0.4.10
- 稽核範圍：templates/card-battle、templates/card-pack、相關 docs、單元／品質／平衡模擬與瀏覽器測試命令
- 分級定義：P0＝無法遊玩、嚴重資料破壞或必須阻擋發布；P1＝核心體驗、正確性、可達性或發布信心顯著受損；P2＝品質、一致性、深度或易用性問題

## 執行摘要

本次共記錄 **P0 0 項、P1 15 項、P2 9 項**。核心規則測試與平衡模擬全部通過，沒有由既有測試揭露的立即阻斷級規則錯誤，因此不列 P0。但發布信心仍不足：兩組 Playwright 命令都因本機缺少指定 Chromium 執行檔而在案例開始前失敗，線上站又受目前瀏覽器安全政策阻擋，故本輪不能宣稱線上版本或真實跨視口流程通過。

最高風險集中在：攻擊傷害早於命中幀、新手教學污染牌組狀態、核心卡牌操作無鍵盤路徑、存檔匯入非原子且儲存失敗被靜默吞掉，以及卡包頁觸控尺寸與多層捲動資訊架構。

### 實際執行結果

| 項目 | 結果 | 實際證據 |
|---|---|---|
| 讀取主要檔案 | 完成 | 已查閱兩個 template 的 HTML／JS／CSS、卡牌資料、核心規則與測試腳本 |
| 讀取 docs | 完成 | 已查閱 README、資料模型、介面／RWD／控制／美術稽核與近期回覆文件 |
| npm test | 通過 | 結束碼 0；卡牌、核心規則、品質閘門、平衡模擬均通過；核心規則 PASS 131 / FAIL 0 |
| npm run test:e2e | 未進入案例 | 結束碼 1；Playwright 找不到 chromium_headless_shell-1228 執行檔 |
| npm run test:rwd | 未進入案例 | 結束碼 1；同一個 Playwright Chromium 缺件 |
| 線上 https://mars-tw.github.io/web-card-game-skill/ | 未能實測 | 目前瀏覽器安全政策拒絕開啟該網域；未以其他工具繞過政策 |

> 判讀限制：本報告中標為「實測通過」的只有 npm test 覆蓋範圍。E2E、RWD 與線上站不因歷史文件曾有成功紀錄而視為本輪通過。

## Top 5 修正優先序

1. **讓傷害只在 active impact／hitbox 幀結算。** 目前先扣血、後播放命中，違反動畫鐵律，也會讓閃避／護盾／死亡的視覺因果錯位。
2. **重做新手教學的示範卡注入。** 不可改變正常 20 張牌的對局狀態；補教學＋換牌＋跳過的狀態測試。
3. **補齊鍵盤與輔助科技操作路徑。** 手牌、場上卡、英雄、初始牌包與主題選項都需語意、焦點及 Enter／Space 操作。
4. **把匯入與所有存檔寫入改成可驗證、可回復。** 先驗證完整 payload，再以 staging／commit 或回滾策略一次套用；儲存失敗須明示。
5. **重整卡包頁的手機／平板資訊架構。** 以單一頁面捲動或明確分頁取代多個內嵌捲動區，觸控控制至少 44×44 CSS px，並補寬版觸控裝置測試。

---

## 1. 可玩性

### P0

本面向未發現可由現有證據支持的 P0。

#### PLAY-P1-01｜無有效存檔牌組時，系統產生隨機且可能含未擁有卡的牌組

- **影響**：首玩或牌組失效後沒有穩定入門牌組；結果不一致，也削弱收藏、開包與構築的價值，玩家可能用到收藏冊沒有的卡。
- **證據**：templates/card-battle/battle.js:922-944 先洗牌已擁有卡，不足 20 張時從完整卡池隨機補滿；battle.js:876-891 使用隨機抽樣。
- **建議修法**：提供版本化、固定且經平衡驗證的 starter deck；不足卡以明確租借卡標記補齊，或進戰前引導完成合法牌組，不要默默混入未擁有卡。

#### PLAY-P1-02｜「簡單」Halden 的替代傳說不一定更簡單

- **影響**：難度標籤與實際對局不一致；新手可能遇到比標準英雄卡更具場面壓力的替代卡。
- **證據**：templates/card-battle/battle.js:41-55 將 easy replacement 指向 highArchivist，battle.js:829-835 套用。cards.js:187 的 High Archivist 為 6 費 3/8、嘲諷且戰吼全體 2 傷；cards.js:232 的 Halden 為 6 費 4/8、嘲諷／護盾牆。本次 npm test 的 M4 模擬為 Halden 對 Archivist 勝率 45.00%，替代側在對稱模擬反而占優。
- **建議修法**：用新手實戰勝率、場面反轉幅度、理解成本三項門檻驗證難度替換；改成低數值、單一關鍵字教學卡，並將 easy／normal 勝率列固定回歸。

#### PLAY-P2-01｜六組完全同構卡與無陣營限制，壓縮構築辨識度

- **影響**：92 張卡看似有量，部分選擇卻只換名稱／美術；牌組合法性沒有陣營約束，容易變成全池挑最高效率，而非有取捨的原型構築。
- **證據**：機械簽章比對得到 92 張卡僅 86 組唯一簽章；同構組為 heal/holyGlimmer、shieldUp/arcaneVeil、frost/thunderClap、polymorph/tidebinderHex、bannerGuard/sanctuaryWarden、arcaneApprentice/tidecallerAdept，見 cards.js:145-150、:158、:163-165、:184-185、:192、:209。core.js:658-676 只檢查張數、持有數、同名與傳說上限，沒有陣營規則。
- **建議修法**：若同構卡是跨陣營基礎件，應讓陣營限制產生意義；否則讓費用、身材、目標或次級效果形成取捨。先定義各陣營核心玩法，再以使用率／替換率驗證卡位。

#### PLAY-P2-02｜AI 缺少序列推演，且整回合批次演出

- **影響**：AI 能完成回合，但主要依單步威脅分數選目標，缺少交換、致死與資源序列推演；多張出牌只在回合末統一渲染，玩家難理解 AI 做了什麼。
- **證據**：templates/card-battle/battle.js:1682-1698 為局部目標分數；battle.js:1707-1751 在同步迴圈連續出牌／攻擊，到末尾才呈現完整狀態。
- **建議修法**：加入一回合內的致死檢查、有效交換、法力曲線與保留解牌評分；每個 AI action 用可中斷佇列逐步播放，跳過動畫時才批次快轉。

### 已驗證優點

- npm test 的卡牌、核心、品質與平衡測試全數通過，核心規則 131/131。
- 卡池共 92 張、四種稀有度；整體卡池模擬平均勝率 47.33%，近期 P0 卡偏移均在 ±4.63 個百分點內。
- 六位傳說英雄模擬勝率約 44.17%～51.46%，未看到單一卡直接壟斷的數值證據。

---

## 2. 畫質

### P0

本面向未發現可由現有證據支持的 P0。

#### VIS-P1-01｜仍有 25/92 張卡只有 emoji fallback

- **影響**：正式立繪覆蓋率 72.8%（67/92）；戰場、收藏與開包仍混用正式立繪與 emoji。缺圖分布為普通 5/25、稀有 11/24、史詩 9/23、傳說 0/20。
- **證據**：image: null 位於 templates/card-battle/cards.js:155-172、:183-186、:206-213、:221-229；戰鬥 fallback 在 battle.js:1943-1963，卡包 fallback 在 templates/card-pack/pack.js:714-729。67 個已引用圖檔全數存在，這 25 張是明確 fallback，不是路徑失效。
- **建議修法**：依實際使用率／新手牌組曝光率排序補完；完成前使用統一剪影或派系圖，不讓 emoji 混在正式品質層。新增資產覆蓋率閘門，至少阻止回退。

#### VIS-P1-02｜傷害在命中動畫之前結算，違反命中幀規則

- **影響**：血量、傷害字與死亡可先發生，攻擊者之後才抵達命中位置；視覺因果顛倒，也無法可靠擴充閃避、格擋或 active hitbox。
- **證據**：一般攻擊在 templates/card-battle/battle.js:1364-1373 呼叫位移動畫後立刻同步 Core.resolveAttack；英雄攻擊在 battle.js:1100-1104 同樣立即結算。battle.js:2378-2405 的 impact 延遲為 90/150ms、lunge 為 190/360ms，但 battle.js:2166-2169 已直接觸發傷害浮字／受傷反應。scripts/test-battle-e2e.mjs:423-448 還把 80ms 先出傷害、再過 160ms 出 hit flash 寫成預期。
- **可重現步驟**：進戰後令任一可攻擊手下攻擊敵方單位；以慢速或逐幀觀察，血量／傷害提示先更新，hit flash 後出現。
- **建議修法**：拆成 anticipation → active impact → recovery；由 impact callback 或 active hitbox 唯一觸發規則結算與傷害事件，再播放 hurt／death。測試須斷言 impact 前血量不變、impact 幀才改變。

#### VIS-P1-03｜卡牌關鍵文字在桌機與短視口過小

- **影響**：卡名 11px、效果字 9px；卡包收藏格名稱甚至 8px。高資訊密度建立在不舒適閱讀的字級上，手機縮卡後更嚴重。
- **證據**：templates/card-battle/index.html:357-360 定義卡名 11px、效果 9px；:740-769 在短視口將卡縮至 88×124、再到 78×108；templates/card-pack/index.html:265-276 收藏格名稱為 8px。
- **建議修法**：正文以 12～14px 為最低基準；放不下時改關鍵字徽章＋可達詳情層，不要繼續縮字。對 200% 縮放及手機文字放大做視覺回歸。

#### VIS-P2-01｜兩個卡圖不符合 1024×1024 PNG 規格

- **影響**：生成／裁切／壓縮流程不一致，可能造成卡框裁切差異、MIME 判讀與後續批次處理問題。
- **證據**：templates/card-battle/assets/cards/mage.png 為 864×1152；lich.png 副檔名為 PNG，但檔頭是 JPEG。其餘 65 張為 1024×1024。規格見 docs/references/art-generation.md:13-15、:74-85。
- **建議修法**：重新輸出真正的 1024×1024 PNG，資產檢查加入尺寸、實際 MIME 與副檔名一致性。

### 已驗證優點

- 所有傳說卡與 AI 牌組卡已有正式立繪；67 個資產引用均存在。
- 稀有度框、foil 與卡包揭示已有視覺分層，既有桌機／手機證據圖的戰場分區清楚。
- hurt／death 事件管線已存在，可改成正確的 impact-frame 動畫佇列，不需用整張圖晃動假裝完成動畫。

---

## 3. 玩家適應性

### P0

本面向未發現可由現有證據支持的 P0。

#### ADAPT-P1-01｜新手教學注入額外卡，污染 20 張牌狀態並與換牌互相破壞

- **影響**：首局教學不是純提示，而是修改正常對局資料；玩家可能以 21 張總資源開局，或換牌後教學仍要求打出已不在手上的狼。首局是正常獎勵對局，跳過教學也不會修復狀態。
- **證據**：新局先在 templates/card-battle/battle.js:549-552 驗證手牌＋牌庫為 20；教學在 battle.js:626-641 用 hand.unshift 加入額外 wolf，未從牌庫移除。換牌在 battle.js:684-700 將整手洗回並依原手牌數重抽；教學步驟在 battle.js:161-164，而 battle.js:665-679、:987 對任何成功出牌都可推進。既有換牌 E2E 先關掉教學，沒有覆蓋兩者組合。
- **可重現步驟**：清除教學完成旗標 → 開新局 → 教學牌注入後換牌或跳過 → 比對 hand + deck 張數及指定牌是否仍在手上。
- **建議修法**：採固定教學牌組；示範卡必須從牌庫移至手牌而非額外建立。每步以特定 action／card ID 驗證，不接受任意出牌；新增首玩、換牌、跳過、重整四條回歸。

#### ADAPT-P1-02｜核心卡牌與英雄沒有完整鍵盤路徑，README 宣稱不符

- **影響**：只用鍵盤或輔助科技的玩家無法完成核心對戰／開包；焦點可能只到「詳」按鈕，不能選牌、攻擊者／目標或初始牌包。
- **證據**：戰鬥互動在 templates/card-battle/battle.js:1852-1865、:1906-1925 主要綁 onclick；battle.js:1932-1941 建立 div.card，沒有互動 role、tabindex 或 keydown。卡包首頁 pack 是 templates/card-pack/index.html:624-631 的 div，pack.js:1549 只綁 click。README.md:48 卻宣稱滑鼠、觸控、鍵盤焦點、Enter／Space 翻牌與 Esc 關閉。
- **建議修法**：能用原生 button 就不用可點擊 div；卡牌提供可理解名稱、選取狀態與 Enter／Space，攻擊採「選攻擊者→公告合法目標→選目標」焦點流程。將純鍵盤完成一局與開包納入 gate。

#### ADAPT-P2-01｜彈窗缺完整 focus trap，主題色票非鍵盤可選

- **影響**：詳情／設定開啟後焦點仍可能走到背景；主題選擇只有視覺色塊，鍵盤與讀屏使用者難理解目前值。
- **證據**：戰鬥彈窗有焦點回復，但未使背景 inert，也沒有完整循環 trap；主題選項在 templates/card-battle/index.html:148-154，以 div 呈現並於 :181-190 綁 click；≤390px 時色票在 :135-138 僅約 22px。
- **建議修法**：使用原生 dialog 或實作 aria-modal、initial focus、Tab 循環、Esc、焦點回復與背景 inert；主題改為具名稱的 radio group。

### 已驗證優點

- templates/card-battle/cards.js:92-112 有 20 個繁中關鍵字定義，可作單一資料來源。
- 戰鬥已有 AI 思考提示、卡牌詳情與教學框架，缺口主要在狀態隔離與輸入可達性。
- CSS 已包含 reduced-motion 分支（templates/card-battle/index.html:717-729）。

---

## 4. BUG 與可靠性

### P0

本面向未發現可由現有證據支持的 P0。存檔問題列 P1，因尚未取得必然且無法復原的正式環境資料毀損證據。

#### BUG-P1-01｜存檔碼匯入逐 key 覆寫，失敗時可能只更新一半

- **影響**：quota、隱私模式或單一 localStorage.setItem 中途失敗時，stats、collection、deck、goals、quests 會處於不同版本；UI 卻宣稱未覆蓋。
- **證據**：templates/card-pack/pack.js:392-405 先寫 backup，再依序寫五個正式 key，沒有 transaction／rollback；pack.js:1603-1606 捕捉所有例外後顯示「存檔碼無效，未覆蓋現有存檔」。
- **可重現步驟**：在匯入第二或第三個 setItem 人為拋 quota error → 重載 → 比對五個 key，可見前段已換新、後段仍舊；訊息仍稱未覆蓋。
- **建議修法**：完整 parse、schema、版本與牌組合法性驗證後，先寫單一 staging payload 並讀回驗證，再 commit 一個版本化主 key；若維持多 key，失敗必須從 backup 回滾並確認成功。錯誤訊息要區分格式與儲存失敗。

#### BUG-P1-02｜多處儲存例外被空 catch 吞掉，玩家不知進度遺失

- **影響**：storage 被封鎖、容量額滿或寫入失敗時，開包、牌組與設定看似成功，重整後回退。
- **證據**：templates/card-pack/pack.js:76-90、:469-498 的 storage 寫入以空 catch 處理；同類 pattern 分散在其他狀態寫入處。
- **可重現步驟**：封鎖網站儲存或令 localStorage.setItem 丟錯 → 開包／調整牌組 → 畫面無明顯失敗 → 重整後變更消失。
- **建議修法**：集中成 storage adapter，寫後讀回；失敗顯示持續 banner、暫停消耗型動作並提供匯出臨時存檔。對 quota、blocked、corrupt payload 各加測試。

#### BUG-P1-03｜本輪 E2E／RWD 無法執行，CI 也未覆蓋 README 所稱完整閘門

- **影響**：本輪無法排除 console error、AI 卡死、手機切版與觸控回歸；部署 gate 又比本機 npm test 少，品質成功訊號可能是假陽性。
- **證據**：本輪 npm run test:e2e、npm run test:rwd 均因缺 Playwright chromium_headless_shell-1228，在案例前以結束碼 1 終止。package.json:6-14 定義完整 test/e2e/rwd；README.md:89-98 要求安裝 Playwright。CI 的 .github/workflows/ci.yml:29-35 只跑 cards/core/syntax，沒有 quality/balance；:45-52 跑 battle-e2e 與 rwd，沒有 controls；deploy 依賴此不完整 gate。CONTRIBUTING.md:24-31 卻描述 CI 會跑同樣完整閘門。
- **建議修法**：鎖 Playwright 版本並在 job 安裝對應瀏覽器、驗證 executable；CI 直接跑 npm test、npm run test:e2e、npm run test:rwd，避免手寫子集合漂移；全部通過才部署。

#### BUG-P2-01｜「清除紀錄」立即永久執行，無確認或復原

- **影響**：一次誤觸即可清除戰績／歷史，在手機密集介面風險更高。
- **證據**：templates/card-pack/pack.js:1749-1760 直接清除 history；pack.js:1608-1609 handler 無確認。
- **建議修法**：加入含範圍說明的確認，或 soft-delete 並提供短時間復原；危險操作與一般設定分離。

### 已驗證優點

- 既有核心與資料層測試沒有失敗，卡牌引用與主要規則一致性閘門有效。
- 匯入前已有 backup key 概念，補回滾與還原介面即可形成可靠管線。

---

## 5. 說明與一致性

### P0

本面向未發現可由現有證據支持的 P0。

#### INFO-P1-01｜收藏／構築缺效果詳情，README 誤稱篩選器較完整

- **影響**：玩家離開戰鬥後難比較關鍵字、完整效果與同費替代卡；構築器只有搜尋／費用／稀有度，無法按陣營或關鍵字整理。
- **證據**：收藏格在 templates/card-pack/pack.js:742-795 只顯示圖、名稱、數量與拆解；牌組候選在 pack.js:1287-1301 主要是名稱、費用、稀有度、持有量與加入，沒有詳情入口。構築篩選器在 pack.js:41-44、:1576-1581 與 templates/card-pack/index.html:683-705，只有 search/cost/rarity；README.md:29 卻宣稱另有陣營、關鍵字篩選。
- **建議修法**：收藏與構築共用可達的 card detail modal，列效果、關鍵字解釋、陣營、持有／可放張數；補 faction／keyword filter，或立刻修正文檔。

#### INFO-P1-02｜資料模型仍寫 74 張與錯誤保底規則

- **影響**：製作、QA 與玩家依文件驗證會得到錯誤預期；「五張全普通時最後一張升稀有」與實作的 20 包 pity 是不同經濟模型。
- **證據**：docs/references/data-model.md:37 寫 74 張；:53 描述全普通包升最後一張；:64-68 收藏統計仍以 74 張且缺 tide；:186 寫九個視口。實際測試為 92 張，templates/card-pack/pack.js:570-596 是 20 包保底，RWD 腳本定義 10 個視口。
- **建議修法**：從卡牌資料與測試設定自動生成 pool、陣營、稀有度與 viewport 表；經濟規則設單一版本化規格來源。

#### INFO-P2-01｜舊 form-factor 稽核與卡牌檔頭已過期

- **影響**：維護者可能照過時結論再次改壞已修好的 coarse-pointer 行為，或誤以為卡池仍為 74 張。
- **證據**：docs/GROK_REVIEW_card_formfactor.md:22、:28-38、:173-193 指稱沒有 coarse-pointer layout、觸控平板不會進 mobile；但 templates/card-battle/index.html:47-58、:779 已有 pointer coarse 規則。templates/card-battle/cards.js:5-9 檔頭仍稱 74 張。
- **建議修法**：歷史稽核加 superseded 標頭與替代文件連結；卡牌檔頭改由測試產生即時統計，或移除易漂移手寫數字。

### 已驗證優點

- 20 個關鍵字皆有繁中名稱與說明，戰鬥內已有 tooltip／詳情資料基礎。
- README 已列本機啟動與測試命令；主要問題是內容漂移，而非完全沒有說明。

---

## 6. 選單與資訊架構

### P0

本面向未發現可由現有證據支持的 P0。

#### MENU-P1-01｜卡包頁固定高度＋多個內嵌捲動區，手機形成捲動迷宮

- **影響**：玩家在卡包、牌組、收藏、任務之間容易卡在錯誤 scroll container；手機固定畫面切成五個比例列，內容可達不等於容易找到。近期硬化改善溢出，但未解決資訊架構。
- **證據**：templates/card-pack/index.html:65 將 body 設為 overflow:hidden；:90-105 的 grid areas 各自 overflow-y:auto；手機規則 :402-409 仍把固定高度主區切成五個 fractional rows。templates/card-battle/scripts/test-rwd-matrix.mjs:82-98 將位於可見 scroll host 的內容判為 SCROLLABLE_OK，多重捲動本身不會讓測試失敗。
- **可重現步驟**：390×844 開卡包頁 → 在卡包揭示、牌組清單、收藏與任務面板間連續滑動 → 頁面本身不捲動，手勢落點決定是哪個小面板移動。
- **建議修法**：手機採單一內容捲動，頂部用明確分頁／分段導覽；卡包揭示進獨立流程，收藏／構築／任務各有單一主區。桌機才保留 dashboard，且限制一個主要 scroll owner。

#### MENU-P2-01｜設定分散三處，沒有一致設定中心

- **影響**：主題、動畫／對戰設定、文字／PWA／存檔難發現，玩家無法預測設定位置。
- **證據**：殼層主題在 templates/card-battle/index.html:148-154；戰鬥設定在 battle.js:948-988；文字、PWA、存檔控制在 templates/card-pack/index.html:593-621 的紀錄區附近。
- **建議修法**：建立所有主分頁可進入的設定中心，按顯示／動態／音效／資料與安裝分類；情境捷徑寫入同一狀態來源。

#### MENU-P2-02｜殼層分頁與主題控制缺完整選單語意

- **影響**：視覺是「戰鬥／卡包」分頁，輔助科技只讀到一般按鈕，不知道目前選中哪頁；主題色票也缺名稱與選取狀態。
- **證據**：templates/card-battle/index.html:143-154 有兩個切頁按鈕與色票；:175-179 只切 active class，沒有 tablist/tab、aria-selected、aria-controls。
- **建議修法**：同頁面板用 tablist/tab/tabpanel 與方向鍵；若是導覽則改帶 aria-current 的連結。主題用 radio group。

### 已驗證優點

- 主殼有戰鬥與卡包兩個入口；戰鬥內 templates/card-battle/battle.js:3182-3204、卡包內 templates/card-pack/pack.js:1506-1511 皆有互相返回路徑，未找到明確死路。
- 收藏、牌組編輯、設定／紀錄、每日任務等主功能均存在，缺口在分組與可發現性。

---

## 7. 全平台 UX

### P0

本面向未發現可由現有證據支持的 P0。

#### RWD-P1-01｜卡包頁多個觸控控制低於 44×44 CSS px

- **影響**：手機與平板容易誤觸，尤其篩選 chip、加入／移除牌組與主題色票；也與近期文件宣稱重要控制至少 44px 不一致。
- **證據**：templates/card-pack/index.html:258-261 的 chip 最小高度 32px；手機 :402-429 降至 26px；≤390／短視口 :490-526 進一步至 24px。牌組 add/remove 在 :306-316 只有 min-width:42px，沒有 44px 最小高度。docs/CODEX_RESPONSE_card_R64_controls.md:23-28 宣稱主要控制達 44px，但 controls 測試只覆蓋 battle。
- **可重現步驟**：390×844 開卡包／牌組頁 → 量測篩選 chip 與 +/- 的 bounding box → 高度可低至 24～26px。
- **建議修法**：互動 hit area 統一至少 44×44px；視覺 chip 可較小，但以不重疊 padding／偽元素擴大點擊區。把 pack 全部互動控制加入尺寸 gate。

#### RWD-P1-02｜測試矩陣未覆蓋寬版觸控／混合輸入平板

- **影響**：產品已針對 pointer: coarse 改 layout，但 820px 平板測試實際不是 touch context；最容易出錯的「桌機寬度＋觸控」沒有驗證。
- **證據**：產品 coarse 規則在 templates/card-battle/index.html:47-58、:779。RWD 腳本 scripts/test-rwd-matrix.mjs:24-35 有 820px tablet，但 :144-149 只將 mobile/mobile-short/landscape 設 touch。controls 腳本 scripts/test-controls.mjs:12-19 只有 390×844 與 844×390 觸控。
- **建議修法**：新增 820×1180 touch、1180×820 touch、1024px hybrid；驗證 coarse media、hover 非必要、主操作可達、hand drawer／命令 dock 不互擋。

#### RWD-P2-01｜RWD gate 偏幾何檢查，且跳過教學與多數卡包流程

- **影響**：沒有 viewport overflow 不代表流程可用；測試可能放過內嵌捲動、文字過小、教學遮擋、卡包揭示與牌組編輯互斥等 UX 問題。
- **證據**：scripts/test-rwd-matrix.mjs:151-159 先關教學；:171-199 的互動集中 battle touch；pack 沒有完整開包、篩選、構築、詳情、任務、匯入流程；:82-98 允許 SCROLLABLE_OK。
- **建議修法**：每視口加入任務式測試：首次教學一回合、開包翻完、篩選後加／移牌、查看詳情、領任務、匯出／取消匯入。除 overflow，也檢查字級、tap target、焦點、scroll owner、遮擋與 console error。

### 已驗證優點

- 現有桌機、390×844 手機與卡包證據圖顯示：戰鬥盤能填滿主要視區，手機命令 dock 與手牌抽屜已建立，近期硬化確實改善核心控制可達性。
- 戰鬥 CSS 已考慮窄螢幕、短視口、橫向與 coarse pointer；卡包有手機篩選 chip 的內部捲動處理。
- 因本輪 Playwright 瀏覽器缺件，以上只能列為程式／既有證據確認，不能標為本輪跨裝置實測通過。

---

## 製作人結論

目前版本的核心規則與基本平衡基線穩定，近期 RWD、控制與立繪補強也有實質成果；它已具可玩產品骨架，不是半成品原型。然而，以正式公開版標準判定，仍不建議在未處理 Top 5 且未恢復完整瀏覽器 gate 前，把版本標成「全面驗收完成」。

建議發布條件：15 項 P1 至少完成風險接受或修正，其中傷害命中幀、教學狀態、鍵盤核心路徑、存檔原子性四項列硬性阻擋；再於乾淨環境讓 npm test、npm run test:e2e、npm run test:rwd 全數結束碼 0，並對線上部署站跑一次桌機／手機 smoke test。

**最終統計：P0 = 0、P1 = 15、P2 = 9。**
