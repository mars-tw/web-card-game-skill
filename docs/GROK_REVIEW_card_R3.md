# 《卡牌對戰》card-battle-r51-v1 — Grok 對抗式覆核 R3

| 欄位 | 內容 |
|---|---|
| 版本對齊 | **card-battle-r51-v1**（CONTENT_PLAN P0：10 差分新卡／4 新效果／silence／3 具名 AI／潮印＋ pity） |
| 審查目標 | 對抗性驗證上線內容是否**真的正確**，並找規格漂移、UI 脫節、方法學盲點 |
| 審查範圍 | `templates/card-battle/{cards.js,core.js,battle.js,index.html}`、`templates/card-pack/pack.js`、`scripts/{test-core.js,test-cards.js,test-balance-sim.js,test-battle-e2e.js}`、`docs/CONTENT_PLAN_card_R1.md` |
| 方法 | 讀真實路徑 + `node` 最小重現 + 既有單元測對照；**只審不改** |
| 約束 | 本文件只寫審查；**不改**遊戲程式碼／測試／資源 |
| 日期 | 2026-07-10 |

## 總覽

| 區塊 | 覆核結論 | 一句話 |
|---|---|---|
| (1) 新卡與效果 | **核心規則大多成立；規格／UI 有漂移** | `core` 行為與單元測一致；跨回合折扣、log 傷害、亡語召喚 log、AI 鏡霜選目標有缺口 |
| (2) 具名 AI | **牌組合法；偏置半生效；log 前綴半成品** | `validateDeck` 通過；`tauntBias` 真影響控制出牌；`faceBias` 對 aggro 近乎冗餘；log 仍夾「對手」 |
| (3) 開包經濟 | **潮印／pity 主路徑成立；韌性有洞** | `TIDE_CHANCE=0.03`、`#tide` 圖鑑相容；pity 不進匯出存檔；分解價未達「史詩級」設計 |
| (4) sim 平衡 | **可當回歸門禁，不可當支配定讞** | 240×2 場有配對，但啟發式 AI、池均值自參照、靜默卡未納入，偵測力有限 |

優先級：

| 級別 | 意義 |
|---|---|
| **P0** | 正確性／公平性缺陷，或玩家可感知的規則／文案矛盾 |
| **P1** | 明顯 bug、體驗落差、或擴充後會放大的架構債 |
| **P2** | 打磨／可維護性／測試覆蓋 |

---

## (1) 新卡與效果實作正確性

### 1.1 資料層（10 卡 + 2 靜默）

| id | 資料位置 | 與 P0 設計對齊 | 判定 |
|---|---|---|---|
| `saltShieldSquire` | `cards.js:196` | 1 費 0/3 嘲諷 | OK（中文名「鹽盾侍從」與規劃「霜鹽盾侍」差字，無規則影響） |
| `iceNeedle` | `cards.js:197` | `effect:"damage2"` + `baseDamage:1` + `tauntBonusDamage:1` | OK（核心） |
| `packHowler` | `cards.js:198` | 衝鋒 + 戰吼 `buffAdjacent1` | OK |
| `toxinViper` | `cards.js:199` | 劇毒 + 突襲、無衝鋒 | OK（嚴格劣勢於迅猛龍軸） |
| `graveScribe` | `cards.js:200` | 亡語 `drawCard1` | OK |
| `mirrorRime` | `cards.js:201` | `buffTarget` + `mirrorRime:true` | OK（文案寫「生命差」與實作一致） |
| `dualTalon` | `cards.js:202` | 連擊、無突襲 | OK |
| `voidTithe` | `cards.js:203` | `nextSpellMinus1` | **規格漂移**（見 1.5） |
| `captainGreywake` | `cards.js:204` | 嘲諷 + `aoeEnemy1` | OK |
| `ladyAshenBell` | `cards.js:205` | 吸血 + 亡語 `summonTwo1_1` | OK（核心） |
| `silenceOne` | `cards.js:206` | `polymorph` + `silenceOnly` + keywords `silence` | OK（法術標籤非戰場狀態） |
| `scoutInterrogator` | `cards.js:207` | 戰吼 `silenceIfDamaged` | OK |

`test-cards.js` 鎖住簽名與四個新代號；本輪 `node scripts/test-cards.js`：**PASS**。

---

### 1.2 `buffAdjacent1`：相鄰定義／空位／死亡塌縮

| 項目 | 檔案:行號 | 行為 | 結論 |
|---|---|---|---|
| 定義 | `core.js:927-930` | `indexOf(dyingCard)` 後取 `field[index±1]` | **相鄰 = 場上陣列左右鄰接**，不是「座位編號」 |
| 空位 | 場地為 densed array | 無空洞 slot；死亡會先從陣列移除 | 不存在「中間空位仍占鄰」 |
| 戰吼時點 | `core.js:1139-1142` | 先 `summonCard` 再 `applyAbility`，來源已在場 | 左右鄰正確 |
| 自身 | 只取 ±1 | 不 buff 自己 | OK |
| 單隻／邊位 | 重現 | 獨自身攻不變；邊位只 buff 一側 | OK |
| 死亡塌縮後的「當下鄰」 | 戰吼路徑安全 | 戰吼當下場上已是出牌後序列 | OK |

**潛在架構債（目前非 P0 卡路徑）：** 若未來把 `buffAdjacent1` 掛亡語，`cleanupSide` 會先把死者移出場再呼叫能力（`core.js:949-959`），`indexOf(dyingCard) === -1`，會錯誤 buff `field[0]`。

**最小重現（已用 node 驗證）：**

```text
場上 [L:1/1, mid:死+亡語buffAdjacent1, R:1/1]
cleanup → 場上 [L, R]，L.attack 變成 2，R 仍 1
```

現行 `packHowler` 是戰吼，**不踩此坑**。標 **P2** 架構註記。

**戰吼正常路徑單元測：** `test-core.js:578-590` PASS。

---

### 1.3 `aoeEnemy1` 與聖盾／亡語鏈

| 項目 | 檔案:行號 | 行為 | 結論 |
|---|---|---|---|
| 傷害 | `core.js:923-926` | 對敵方場上每隻 1 傷，再 `cleanupBoth` | OK |
| 聖盾 | `core.js:881-887` | 有盾 → 破盾、本次 0 傷 | OK |
| 亡語鏈 | cleanup 內 `hasKeyword(deathrattle)&&trigger` | 1 血亡語體死 → 召喚等 | OK |
| 迭代安全 | `[...foe.field]` 副本 | 不因場上變更跳過目標 | OK |

**最小重現：**

```text
敵場：聖盾 1/1、亡語 summonSkeleton 1/1、坦克 3/3
player 觸發 aoeEnemy1
→ 聖盾破、血仍 1；亡語體死並召骷髏 2/2；坦克 2/3
```

事件序列含 `shieldBreak` → `dying` → `deathrattle` → `minionSummoned`。與 Hearthstone 類「先結算傷害再清場／亡語」一致。

**單元測：** `test-core.js:592-598` 僅驗「死 1 血、留 1 血」，**未**鎖聖盾／連鎖；核心邏輯仍正確。

---

### 1.4 `summonTwo1_1` 滿場截斷

| 情境 | 行為 | 結論 |
|---|---|---|
| 空位 ≥ 2 | 兩隻「灰鈴侍從」1/1 | OK（`test-core.js:600-604`） |
| 空位 = 1 | 只召 1 隻，場長 = `MAX_FIELD` | OK（node 重現） |
| 空位 = 0 | 0 隻；兩次 `summonBlocked` | OK（`core.js:835-837` 連續兩次 `summonCard`） |

**UI 缺口（P1）：** `battle.js:2035-2038` `logDeathrattleSummon` 只認得「骷髏」「浴火鳳凰」，**不寫「灰鈴侍從」**。場上有 token、log 無亡語召喚句 → 玩家只靠動畫推斷。

---

### 1.5 `nextSpellMinus1` flag 生命週期

| 問題 | 實作 | 結論 |
|---|---|---|
| 設定 | `core.js:1055-1059`：敵英雄 −2；`side.nextSpellDiscount = Math.max(1, …)` | 固定為 **至少 1**，不會加到 2 |
| 消耗 | `core.js:1010-1017`：下一張**法術**扣費後清 0 | 隨從不消耗 |
| 跨回合 | `test-core.js:612-619` 明確 assert 跨回合仍在 | **會跨回合殘留** |
| 疊加 | 第二次 `voidTithe`：`Math.max(1, 既有)` | **不疊加成 −2**；若已有折扣，第二張虛空稅**自己吃掉 −1** 再寫回 1 |
| 與規劃文案 | CONTENT `voidTithe`「**本回合**你下一個法術費 −1」（`CONTENT_PLAN_card_R1.md:208`） | **規格漂移：實作非「本回合」** |
| 卡面文案 | `cards.js:203`「你的下一張法術少 1 費」 | 與實作一致（未寫本回合） |

**最小重現：**

```text
mana=10，手牌 void(3) + heal(2)
打 void → enemy.hp−2，nextSpellDiscount=1，mana=7
endPlayer → startEnemy → endEnemy
打 heal → mana 變成 9（扣 1 而非 2），discount 清除
```

再測雙 void：`v1` 後 discount=1；`v2` 費 2（吃折扣）後 discount 仍為 1，**永不 >1**。

| 級別 | 項 |
|---|---|
| **P0** | 規劃文件寫「本回合」，測試卻把「跨回合」當正確規格。產品需二選一定案並同步 CONTENT／卡面／測。 |
| **P1** | 連打兩張虛空稅無法疊 −2，且第二張會「自我吞折扣」——若設計意圖是 combo 加速，目前偏弱且無 log 解釋。 |

---

### 1.6 `mirrorRime` cap 與不複製聖盾

| 項目 | 檔案:行號 | 行為 | 結論 |
|---|---|---|---|
| 來源 | `core.js:865-867` | 友方**其他**存活嘲諷中，當前生命最高者 | OK |
| 增量 | `core.js:872-876` | `gain = clamp(0..3, source.health - target.health)` | **最多 +3**；不足 3 只補差額 |
| 聖盾 | 只改 health／maxHealth | 不讀、不寫 `shield` | **不複製聖盾** |
| 無嘲諷源 | amount=0 事件 | 法術仍可打出（已花費） | 弱「空放」風險 |

**單元測：** `test-core.js:621-631` PASS（1→4 生命、目標無盾、源仍有盾）。

卡面（`cards.js:201`）與實作一致；CONTENT 摘要「複製當前生命」較易誤解成「設成相同生命」，實作為「生命差 cap3」。**P2** 文件用語。

---

### 1.7 silence：規則、UI、log、亡語

#### 規則（核心清楚）

| 步驟 | 檔案:行號 | 行為 |
|---|---|---|
| 靜默本體 | `core.js:797-804` | `keywords=[]`；`delete trigger`；`shield=false`；清 `_frenzyDone`；**保留攻血 maxHealth** |
| 封口咒 | `core.js:1049-1051` | `silenceOnly` → `silenceMinion`，非變形 |
| 斥候 | `core.js:940-945` | 敵方「已受傷」中威脅最高者；健康體跳過 |
| 亡語閘門 | `core.js:956-958` | `hasKeyword(deathrattle) && minion.trigger` |

**靜默後再死亡會不會觸發亡語？→ 不會。**

雙重保險：關鍵字陣列已空 + `trigger` 已刪。

**最小重現：**

```text
敵方巫妖式 3/1（keywords deathrattle+taunt, trigger summonSkeleton）
silenceMinion → health 設 0 → cleanup
敵場長度 0，無骷髏
```

`KEYWORDS.silence` 描述（`cards.js:89`）與此一致。

**規則定義評級：** 程式契約清楚；**缺**「靜默後死亡不觸發亡語」的獨立單元測（現有測只驗靜默當下屬性）。建議補測，非 runtime bug。

#### UI／log 一致性

| 路徑 | 行為 | 判定 |
|---|---|---|
| 事件 `silence` | `battle.js:1931-1932` `flashKeyword2(…, "靜默")` | 有浮字 |
| 再 `render()` | 徽章來自 `card.keywords`（`battle.js:1693+`） | 徽章會消失（資料已清） |
| 玩家封口咒 log | `battle.js:2015`「被靜默」 | OK |
| AI 封口咒 log | `battle.js:2028` | OK |
| 斥候戰吼靜默 | 僅 battlecry／silence 浮字，**無名句 log** | **P2** |
| 傷害提示 `iceNeedle` | `effectiveSpellDamage` 對 `damage2` **固定回 2**（`battle.js:1012-1025`） | **P1：log／提示與真實 1／2 傷不一致** |

**iceNeedle 真實傷害（node）：** 無嘲諷 5→4（1 傷）；有嘲諷 5→3（2 傷）。核心 OK；UI 若走 `effectiveSpellDamage` 會說成 2 傷。

---

### 1.8 本節缺陷表

| # | 級別 | 摘要 | 位置 |
|---|---|---|---|
| E-R3-1 | **P0** | `nextSpellMinus1`：CONTENT「本回合」vs 實作／測「跨回合」 | CONTENT:208；`core.js:1055-1059`；`test-core.js:612-619` |
| E-R3-2 | **P1** | 灰鈴侍從亡語召喚無 log | `battle.js:2035-2038` |
| E-R3-3 | **P1** | 冰針 log／提示用 `damage2=2`，忽略 `baseDamage` | `battle.js:1012-1025`、`2017` |
| E-R3-4 | **P1** | 折扣不疊加；第二張虛空稅自吞 −1（未文件化） | `core.js:1010-1017`、`1058` |
| E-R3-5 | **P2** | `buffAdjacent1` 作亡語時 index 錯位 | `core.js:927-930` + `949-959` |
| E-R3-6 | **P2** | 無「靜默後亡語不觸」單元測 | `test-core.js` |
| E-R3-7 | **P2** | 斥候靜默缺明確 log 句 | `handleCoreResult` silence 分支 |

---

## (2) 具名 AI

### 2.1 固定牌組與 `validateDeck`

| 對手 | 定義 | 張數／複本 | `validateDeck`（假收藏 = 牌組自身計數） |
|---|---|---|---|
| `op_ser_halden` | `battle.js:41-54` | 20；傳說各 1；同名 ≤2 | **ok**（node + E2E） |
| `op_magister_vey` | `battle.js:55-68` | 20 | **ok** |
| `op_scarra` | `battle.js:69-82` | 20 | **ok** |

開局路徑：`buildOpponentDeck`（`battle.js:696-705`）非法就 `throw`——固定牌組壞了會硬失敗，合理。

與 CONTENT 構想差異（非 bug，屬設計收斂）：

- 哈爾登：**無治療術**，改 `mirrorRime`×2、`captainGreywake`、`highArchivist`。
- 維伊：**無隕石／閃電**，中費法術為冰針／餘燼／烈焰／虛空稅。
- 斯卡拉：**無迅猛龍／血月女王**，有 `packHowler`／`dualTalon`。

### 2.2 `tauntBias`／`faceBias` 是否真影響行為

| 偏置 | 讀取點 | 是否影響 | 說明 |
|---|---|---|---|
| `tauntBias` | `aiPlayPriority` `battle.js:1439-1444`、`1465` | **是（控制）** | control：嘲諷分 `18 + tauntBias*14`；aggro 僅 `tauntBias*6` |
| `tauntBias` | spellburst 分支 | **幾乎否** | 維伊不走 control 嘲諷加權 |
| `faceBias` | `chooseAiAttackTarget` `battle.js:1475-1480` | **條件嚴格** | 僅 `faceBias >= 0.75 && rng() < faceBias` 才強制傾向打臉；且 **先被 `kind === "aggro"` 短路** |
| `faceBias` | `chooseAiSpellPlay` 虛空稅 `battle.js:1424-1426` | **是（部分）** | 無後續法術時，`faceBias>=0.5` 仍打虛空稅 |

**逐對手：**

| 對手 | tauntBias | faceBias | 實測含義 |
|---|---|---|---|
| 哈爾登 | 0.9 | 0.18 | 控制出牌強烈偏好嘲諷；打臉偏置低，**有效** |
| 維伊 | 0.35 | 0.56 | 法強軸為主；`faceBias=0.56 < 0.75` → **攻擊目標路徑幾乎不吃 faceBias**；虛空稅決策吃 ≥0.5 |
| 斯卡拉 | 0.15 | 0.9 | `archetype:"aggro"` → `chooseAiAttackTarget` **永遠 `return null`（打臉）**，faceBias 在攻擊上**冗餘** |

結論：**偏置不是裝飾**，但 **faceBias 對 aggro 名存實亡**；維伊的 faceBias 幾乎只影響虛空稅，不像 CONTENT「更常打臉」。

### 2.3 log 前綴

| 機制 | 檔案:行號 | 實際字串 |
|---|---|---|
| 前綴 | `battle.js:1851-1856` | `who==="ai"` → `emoji + name + "：" + msg` |
| 開局 | `battle.js:427` | `對手：🛡️ 哈爾登隊長`（who=me，無雙重前綴） |
| 召喚 | `battle.js:1511` | msg=`對手召喚了 X` → 畫面上 **`🐺 斯卡拉狼首：對手召喚了 狼群嚎者。`** |
| 法術 | `logAiSpell` 多為「對手施放…」 | 同樣雙重「對手」 |

CONTENT 期望：「斯卡拉狼首 召喚了…」（`CONTENT_PLAN:259`）。現況是 **前綴有名字、句身仍寫對手** → **半成品，P1 體驗**。

### 2.4 下拉選單

`index.html:725-727` 三選項；`cardgame_opponent` localStorage；預設 `op_ser_halden`。E2E 覆蓋切換與 hard 重載。

### 2.5 本節缺陷表

| # | 級別 | 摘要 |
|---|---|---|
| A-R3-1 | **P1** | AI log「名字：對手…」雙重指稱 |
| A-R3-2 | **P1** | scarra 攻擊路徑不依賴 faceBias（aggro 短路） |
| A-R3-3 | **P1** | 哈爾登 AI `chooseBuffTarget` 偏好嘲諷本體 → 鏡霜常 0 收益（`battle.js:1354-1360` + `core.js:866` 排除自身） |
| A-R3-4 | **P2** | 維伊 faceBias 低於 0.75，攻擊人格與表定數字落差 |

---

## (3) 開包經濟：潮印與 pity

### 3.1 `TIDE_CHANCE` 與變體互斥

| 項目 | 位置 | 結論 |
|---|---|---|
| 機率 | `cards.js:24` `TIDE_CHANCE = 0.03` | 與規劃一致；`test-cards` 3.04%/10k 抽樣 PASS |
| 互斥 | `cards.js:386-387` 先 tide，再 `foil = !tide && …` | 同卡不會雙變體 |
| collectKey | `cards.js:392-393` tide 優先 `#tide` | `test-cards` 含 foil+tide → `#tide` |
| 戰鬥數值 | 僅旗標 | 無攻血差 |

### 3.2 pity（20 包 rare+）

| 項目 | 位置 | 結論 |
|---|---|---|
| 鍵／上限 | `pack.js:17-18` `card_pack_pity_v1`，`PITY_LIMIT=20` | OK |
| 讀寫 | `pack.js:371-381` | NaN→0；try/catch 失敗回 0 |
| 觸發 | `pack.js:423-431`：全包無 rare+ 且 `pityBefore >= 19` → 最後一張 `rollAtLeastRare`；有 rare+ 歸零否則 +1 | **第 20 包強制**（0-based 計數 0…19） |
| E2E | `test-battle-e2e.js:1108-1111` | miss 累積、forced 後歸零 |

**韌性：**

| 情境 | 行為 | 判定 |
|---|---|---|
| 清空 localStorage | pity 消失重計 | 可接受（對玩家略有利） |
| 跨分頁同 origin | 共享同一 key | 讀寫可見；**並行開包 last-write-wins** 可能少算 1 次 pity（P2 競態） |
| 匯出／匯入存檔 | `buildSaveBundle`（`pack.js:241-250`）**不含 pity** | **P1：換機／匯入後 pity 與收藏脫鉤** |
| 備份鍵 | 僅 import 前 bundle 備份，仍無 pity | 同上 |

### 3.3 `#tide` 與圖鑑／分解

| 路徑 | 位置 | 結論 |
|---|---|---|
| 圖鑑分槽 | `pack.js:521-523` normal／foil／tide | OK |
| 擁有計數 | `pack.js:836-839` 與 `core.js:collectionCount` 含 `#tide` | 組牌可用潮印張數 |
| `collectionSummary` | `core.js:457-484` unique 去重 base id；`tide` 獨立集合 | 里程碑 `tide_3` 可計 |
| 分解價 | `pack.js:559` `DISMANTLE_VALUE[card.rarity]` | **按底卡稀有度**，潮印 common 仍 2 金 |
| CONTENT | 方案 A「分解價 = epic 級」 | **未落地 → P1 經濟規格缺口** |
| `tide_3` 獎勵 | `core.js:76` `reward: 0` | 里程碑零金幣，僅展示 |

### 3.4 本節缺陷表

| # | 級別 | 摘要 |
|---|---|---|
| P-R3-1 | **P1** | pity 不進 export/import bundle |
| P-R3-2 | **P1** | 潮印分解未達「史詩級」設計 |
| P-R3-3 | **P2** | 跨分頁並行開包 pity 競態 |
| P-R3-4 | **P2** | `tide_3` reward=0，收集動機弱 |

---

## (4) sim 平衡複核（`scripts/test-balance-sim.js`）

### 4.1 方法學摘要

| 維度 | 實作 | 可信度 |
|---|---|---|
| 場數 | `SIM_SEEDS=240`，每卡配對 `240*2=480` 場（focus 先手 + 後手） | 樣本量優於規劃 200 |
| 牌組 | `randomDeck` 費用曲線 `CURVE` + 注入焦點卡 | 非 meta 構築 |
| AI | 腳本內啟發式 `playCards`／`attackWithBoard` | **≠** `battle.js` 具名 AI／DDA |
| 門檻 | 相對 **P0 十卡池均值** ±5%；雙份抬升 ≤6pp；toxin≤raptor+3pp；captain≤archivist+3pp | 有錨點，但均值自參照 |
| 靜默卡 | **不在** `P0_CARD_IDS` | 封口咒／斥候未測勝率 |

### 4.2 能否偵測「支配」？

| 能 | 不能／弱 |
|---|---|
| 注入卡相對「隨機曲線池」的穩態抬升 | 真實玩家／具名 AI 對局 |
| toxin vs raptor、captain vs archivist 點名劣勢 | 全池十卡若**集體偏強**，均值平移後仍全過 ±5% |
| 可重現 seed | 無信賴區間；p≈0.5 時 SE≈2.3pp，5pp 門檻約 2σ，臨界卡易抖 |
| 雙份 must-have 抬升 | 不測 silence 改變控制鏡節奏（CONTENT 平衡注意） |
| | `iceNeedle` 啟發式用 `spellDamage(damage2)=2`，高估解場分 |

**結論：** 適合作 **CI 回歸門禁**（防明顯炸表），**不足以**單獨證明「無嚴格支配」或 CONTENT「控制鏡不因靜默縮到 <6 回合」。標方法學 **P1 限制**（非必改程式，但報告決策時不可過度解讀）。

### 4.3 本節缺陷表

| # | 級別 | 摘要 |
|---|---|---|
| S-R3-1 | **P1** | 池均值自參照 → 集體偏移漏檢 |
| S-R3-2 | **P1** | AI／環境與正式對戰脫節 |
| S-R3-3 | **P2** | 靜默雙卡未納入 sim |
| S-R3-4 | **P2** | iceNeedle／mirrorRime 啟發式與真實規則微偏 |

---

## 交叉驗證執行紀錄

| 命令／動作 | 結果 |
|---|---|
| `node scripts/test-core.js` | **112 PASS / 0 FAIL**（含 P0 效果與 silence） |
| `node scripts/test-cards.js` | **全部 PASS**（潮印抽樣、四代號、簽名） |
| 自寫 node 重現 | 靜默後亡語否；aoe1 聖盾鏈；滿場 summon；折扣跨回合與不疊加；冰針 1/2 傷；三 AI 牌組 validate |

未在本輪重跑完整 Playwright E2E／balance-sim（耗時）；E2E 原始碼斷言與 pity／對手邏輯已靜態核對。

---

## 總結裁決

| 面向 | 裁決 |
|---|---|
| P0 機制可否上線 | **核心規則可上線**：新 trigger、silence、潮印、固定 AI 牌組主路徑正確 |
| 最大風險 | **規格漂移**（虛空稅本回合 vs 跨回合）＋ **UI／log 與真實規則不一致**（冰針傷害、灰鈴 log、AI「對手」雙重前綴） |
| 平衡 | sim **不能單獨背書**「無支配」；點名對照與單元簽名有一定防護 |
| 建議下一修補優先 | ① 定案 nextSpell 生命週期並改 CONTENT 或改碼 ② log／提示吃 `baseDamage` ③ 灰鈴亡語 log ④ pity 進存檔 ⑤ AI 鏡霜目標避開嘲諷源 |

---

## 附錄：快速對照表（效果 → 關鍵行）

| 代號 | 實作 | 測試 |
|---|---|---|
| `buffAdjacent1` | `core.js:927-930` | `test-core.js:578-590` |
| `aoeEnemy1` | `core.js:923-926` | `test-core.js:592-598` |
| `summonTwo1_1` | `core.js:935-937` | `test-core.js:600-604` |
| `nextSpellMinus1` | `core.js:1003-1018`、`1055-1059` | `test-core.js:607-619` |
| `mirrorRime` | `core.js:863-878`、`1046-1048` | `test-core.js:621-631` |
| `silenceOne` | `core.js:797-804`、`1049-1051` | `test-core.js:633-646` |
| `silenceIfDamaged` | `core.js:940-945` | `test-core.js:648-660` |
| AI 對手 | `battle.js:39-83`、`696-719` | `test-battle-e2e.js:382+` |
| pity / tide | `pack.js:371-431`；`cards.js:24,386-393` | `test-battle-e2e.js:1082-1111`；`test-cards.js` |
| balance sim | `scripts/test-balance-sim.js` | 本文件 §4 |

**— 報告結束（只審不改）—**
