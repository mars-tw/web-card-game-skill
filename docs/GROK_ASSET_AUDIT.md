# GROK 素材品質監工：卡牌美術審核

| 項目 | 內容 |
|---|---|
| 文件 | `docs/GROK_ASSET_AUDIT.md` |
| 審核日 | 2026-07-14 |
| 版本錨點 | `card-battle-r61-v1`（對座六影角色卡立繪已入庫） |
| 範圍 | 卡圖覆蓋、`image:null` 佔位、角色卡立繪、卡框管線、P0–P2 重繪／補圖清單與規格 |
| 原則 | **只審不改**（不改 `cards.js`、不生圖、不動 CSS） |
| 資料源 | `templates/card-battle/cards.js`、`art-config.json`、`assets/cards/`、`assets/frames/`、`battle.js` AI 牌組、既有 V3／R6 視覺收官結論 |

---

## 0. 一句結論

**是：`image:null` 佔位是目前產品觀感的最大短板。**  
CSS 稀有度框／foil／嘲諷 crest 與 `art-fallback` 已達可宣傳旗艦幀水準；但卡池 **92 張中 51 張（約 55%）無卡圖**，且 **6 張角色傳說全數 null**。玩家實戰／開包角色保底／三位 AI 固定牌組，會反覆把「金框＋emoji 圓座」並排放在有圖旗艦旁——材料愈好，內容洞愈刺眼。

**卡框本身不是最大短板。** 執行期卡框由 CSS 畫（稀有度邊框、`frame-sheen`、foil、陣營 art 漸層）；`assets/frames/` 僅 `.gitkeep`，與 `art-generation.md`「卡圖不要畫框」契約一致。角色卡缺的是**立繪本體**，不是另一套 PNG 框圖。

---

## 1. 覆蓋率盤點（事實表）

### 1.1 總量

| 指標 | 數量 | 備註 |
|---|---:|---|
| 卡池 `CARD_POOL` | **92** | r61（含 6 角色） |
| 有 `image` 路徑 | **41** | 44.6% |
| `image: null` | **51** | 55.4% |
| `assets/cards/*.png` | **41** | 與有路徑卡 **1:1 對齊**，無斷檔、無孤兒檔 |
| `art-config.json` 條目 | **41** | 與有圖卡對齊；**51 張 null 全無 prompt** |
| 角色卡 `heroTag` | **6** | **6／6 皆 null** |
| 缺圖檔但有路徑 | **0** | 無 404 路徑風險（在根目錄 server 前提下） |
| `assets/frames/` | **空** | 僅 `.gitkeep`；執行期不依賴 |

### 1.2 依稀有度：null 密度

| 稀有度 | null | 總數 | null 率 | 觀感風險 |
|---|---:|---:|---:|---|
| common | 14 | 25 | 56% | 手牌長尾；開包高頻 |
| rare | 14 | 24 | 58% | 中段構築常見 |
| epic | 12 | 23 | 52% | 紫框＋emoji 落差大 |
| legendary | **11** | 20 | **55%** | **金框／foil／idle 同框時落差最大** |

傳說 null 清單（11）：

| id | 名稱 | 備註 |
|---|---|---|
| `bloodmoonQueen` | 血月女王 | 非角色傳說 |
| `skyJudicator` | 天穹裁決者 | 非角色傳說 |
| `highArchivist` | 至高典藏師 | 非角色；Halden easy 替換卡 |
| `captainGreywake` | 灰潮船長 | **Halden AI 牌組** |
| `ladyAshenBell` | 灰鐘女士 | 非角色傳說 |
| `heroSerHalden` | 哈爾登隊長 | **角色＋AI 本體** |
| `heroMagisterVey` | 維伊魔導師 | **角色＋AI 本體** |
| `heroScarra` | 斯卡拉狼首 | **角色＋AI 本體** |
| `heroIsoldLongdusk` | 伊索德·長暮 | 角色 |
| `heroRuneFrostfang` | 霜牙百夫長·魯恩 | 角色 |
| `heroMoenTidearbiter` | 潮間仲裁者·茉恩 | 角色 |

### 1.3 依類型

| 類型 | null | 總數 |
|---|---:|---:|
| MINION | 39 | 70 |
| SPELL | 12 | 22 |

隨從缺圖影響場上可讀性；法術缺圖影響手牌／開包，但法術可用「效果構圖」較快補。

### 1.4 有圖樣本品質（抽樣，非全庫像素審）

對既有旗艦抽樣（`dragon`、`countessLongNight`、`oathbannerHerald`）：

| 面向 | 判定 |
|---|---|
| 風格一致性 | **PASS 主幹**：painterly TCG、單主體置中、暗底戲劇光、無文字／無框 |
| 構圖與 `object-fit: cover` | **PASS**：正方 1024 取向，主體多在中上半，適小卡裁切 |
| 陣營可讀色調 | **大致 OK**：荒野焰紅、凜冬紫霧、白潮金白各有辨識 |
| 已知風險（非本輪重點） | AI 生成常見：臉部微不穩、盔甲紋樣過密在 78–124px 寬卡面會糊；屬 P2 精修 |

**既有 41 張整體達「可商用小品旗艦」門檻；問題在覆蓋率與角色包零立繪，不是旗艦要整批重畫。**

---

## 2. 核心問題裁定

### 2.1 `image:null` 是否最大短板？

| 候選短板 | 是否最大 | 理由 |
|---|---|---|
| **`image:null` 內容覆蓋** | **是（P0 級產品地板）** | 55% 卡池無圖；角色 6 全 null；AI 固定牌組大量 null；與金／紫框同框時對比最刺 |
| CSS 卡框／foil 材質 | 否 | V3／R6 已收官；邊際收益低於補圖 |
| `art-fallback` 品質 | 否（緩解、非根因） | R6 已有陣營漸層＋徽印＋glyph 圓座；比裸 emoji 好，仍非立繪 |
| `assets/frames/` 空目錄 | 否 | 設計即 CSS 框；空目錄不是 bug |
| 既有 41 張風格不齊 | 次要 | 旗艦可接受；全面重繪 ROI 低於先補 null |

與歷史審查對齊：

- `GROK_REVIEW_card_V3.md`：剩餘缺口 #1＝內容美術覆蓋  
- `GROK_REVIEW_card_R6.md`：R6-V3＝約 45 null vs 41 有圖  
- 本輪更新：**null 升至 51**（+6 角色），缺口**擴大**而非縮小  
- `CODEX_RESPONSE_hero_cards.md` 明示：角色卡圖依規格 `image: null`，**未擴張美術範圍**

### 2.2 為何角色 null 比一般 null 更痛

1. **產品臉**：開包 pity 35 包保底角色；金柱＋角色標籤下開出 emoji  
2. **AI 鏡像**：normal／hard 固定帶 `heroSerHalden`／`heroMagisterVey`／`heroScarra`  
3. **傳說框同框**：`rarity-legendary` + `frame-sheen` + 可選 foil，框愈華麗，卡心空洞愈明顯  
4. **敘事身分**：設計文案／flavor 已完整，視覺仍是通用 glyph

### 2.3 卡框需求（立繪 × 框）

| 層 | 現況 | 角色卡需求 |
|---|---|---|
| **執行期卡框** | CSS：四階稀有度邊框、傳說 `frame-sheen`、foil `::after`、嘲諷 crest、陣營 `--faction-*` | **沿用**；角色**不需**獨立 PNG 框即可上線 |
| **卡心立繪** | `img` + `object-fit: cover`；null → `art-fallback` + emoji glyph | **必須補** 6 張角色立繪 |
| **陣營色** | `faction-wardens/conclave/wild/wintershadow/neutral` | 立繪色盤應與陣營 accent 呼應，避免 CSS 框與圖打架 |
| **靜態框素材** | `assets/frames/` 空 | **P2 可選**：商店海報／Key art 合成用；非戰鬥必要 |

**規格鐵律（與 `art-config` / `art-generation.md` 一致）：**

- 立繪輸出：**1024×1024 PNG**，路徑 `assets/cards/<id>.png`  
- Prompt 後綴：`no text, no card frame, no border, square composition`  
- 卡框**只由 CSS**負責；美術**禁止**畫金色卡邊、費用珠、攻擊／血量數字  

---

## 3. 實戰曝光：AI 牌組 null 密度

三位對手固定 20 卡（normal／hard 帶角色卡）中，null 曝露如下（unique 計）：

### 3.1 哈爾登 `op_ser_halden`（control）

| 狀態 | 卡 |
|---|---|
| 有圖 | `footman`, `knight`, `guardian`, `oathbannerHerald`, `shieldUp` |
| **null** | `saltShieldSquire`, `bulwarkMonk`, `bannerGuard`, `captainGreywake`, **`heroSerHalden`**, `mirrorRime` |

控制場常堆嘲諷牆 → **多隻 null 肉盾並排**，白潮主場觀感偏「漸層＋emoji」。

### 3.2 維伊 `op_magister_vey`（spellburst）

| 狀態 | 卡 |
|---|---|
| 有圖 | `arcaneApprentice`, `frostChanneler`, `mage`, `arcaneWeaver`, `firebolt`, `flameBurst` |
| **null** | `tidecallerAdept`, **`heroMagisterVey`**, `iceNeedle`, `emberVolley`, `voidTithe` |

結社核心隨從多已有圖；缺在**角色本體**與幾張高頻法術／法強小體。

### 3.3 斯卡拉 `op_scarra`（aggro）— **最差**

| 狀態 | 卡 |
|---|---|
| 有圖 | `wolf`, `firebolt`（幾乎僅此） |
| **null** | `emberpup`, `alleySkirmisher`, `sparkSquire`, `frontScout`, `packHowler`, `dualTalon`, **`heroScarra`**, `dawnRider`, `emberVolley` |

快攻曲線幾乎整列 emoji → **實戰觀感地板由此對手拉最低**。

---

## 4. 通用出圖規格（全卡適用）

| 項目 | 規格 |
|---|---|
| 尺寸 | **1024×1024**（`art-config.size`） |
| 格式 | PNG；sRGB |
| 構圖 | 單主體置中；重要臉／胸甲落在**中上 40–70% 高度**（小卡 `object-fit: cover` 不易切頭） |
| 安全邊 | 四周留 **~8%** 暗邊，避免被圓角＋內陰影硬裁 |
| 背景 | 暗氛圍、低雜訊；可微帶陣營色，**勿**搶主體 |
| 禁止 | 文字、卡框、邊框、UI 徽章、浮水印、多主體群像（除非設計明確） |
| 風格後綴 | `Fantasy trading-card art, painterly digital illustration, dramatic lighting, single subject centered, dark atmospheric background, no text, no card frame, no border, square composition.` |
| 接線 | `cards.js`：`image: "../../assets/cards/<id>.png"`；`art-config.json` 加 `prompt` 後可 `gen-art.ps1 -Only <id>` |
| 驗收 | 在 `--card-w: 78–124px` 縮圖仍可辨主體；詳情 modal 大圖臉可讀；無框無字 |

### 4.1 法術卡附加

- 主體為**效果／符號**，加 `no creature`（或明確「無人物」）  
- 避免複雜可讀符文文字（生成器常吐偽字）

### 4.2 隨從／角色附加

- 可讀剪影：縮到 80px 寬仍知「盾／法杖／狼／月」  
- 關鍵字气质：嘲諷偏正面穩姿；衝鋒偏動態前傾；吸血可暗紅霧；聖盾可金白邊光（**光效可畫在立繪內**，勿畫 UI 環）

---

## 5. 六張角色卡立繪規格（完整）

> 共用輸出：`assets/cards/hero*.png`，`image` 接線同上。  
> 稀有度：一律 **legendary** → 實戰必帶金框；立繪需撐得起 `frame-sheen`。  
> 建議優先級：**P0 全 6 張**（勿只做三位 AI 而擱置凜冬／中立）。

### 5.0 角色立繪共同標準（高於一般隨從）

| 項目 | 規格 |
|---|---|
| 構圖 | **半身～3/4 身**英雄特寫（非全身遠景小人）；臉可辨、道具可讀 |
| 身分錨 | 每張至少 1 個**不可互換**視覺符號（見下表） |
| 光照 | 單主光＋輪廓光；暗底；可微粒子 |
| 臉 |  generational 風險最高區：優先可重抽到「穩定五官」；避免過度對稱塑料感 |
| 與 AI 頭像 | 戰鬥 HUD 對手頭像仍是 emoji；立繪**不強制**當 avatar，但色盤／符號應與角色 emoji 敘事一致 |
| 禁止 | 卡框、費用、攻血字、其他英雄同框、現代物件 |

### 5.1 `heroSerHalden` — 哈爾登隊長

| 欄位 | 規格 |
|---|---|
| 檔名 | `assets/cards/heroSerHalden.png` |
| 陣營 | 白潮守軍 `wardens`（藍金、城牆、聖徽） |
| 軸 | control；嘲諷＋列盾 |
| 姿態 | 正面微側；**塔盾橫擋**於身前（列盾敘事）；疲憊但堅定的中年指揮官 |
| 服裝 | 戰損鋼鐵半甲＋白潮披巾；盾面可有潮紋／城門浮雕，**無文字** |
| 光色 | 冷藍月光＋盾緣暖金高光 |
| 身分錨 | 橫置巨盾（非手持小圓盾） |
| 參考鄰卡 | `oathbannerHerald`、`guardian`、`dawnArchbishop`（白潮金白，但哈爾登更「門栓夜哨」粗礪） |
| Prompt 草案 | `battle-scarred human captain holding a wide tower shield horizontally across his chest, white-tide tabard, battered steel armor, night rampart behind, determined eyes, blue-gold cold light, single subject centered` |

### 5.2 `heroMagisterVey` — 維伊魔導師

| 欄位 | 規格 |
|---|---|
| 檔名 | `assets/cards/heroMagisterVey.png` |
| 陣營 | 奧術結社 `conclave`（紫金、符文、典藏） |
| 軸 | control 法術；法強＋殘響 |
| 姿態 | 半身施法；一手托浮游魔典／殘響鈴光，一手拖出**回聲二重影**（暗示 residual echo，非第二人物） |
| 服裝 | 結社長袍、金線星圖繡；冷靜考官氣質，不高聲張揚 |
| 光色 | 紫藍秘能核心光＋金邊 |
| 身分錨 | 殘響雙重光環／回聲輪，而非單純大火球 |
| 參考鄰卡 | `archLoremaster`、`arcaneWeaver`、`mage` |
| Prompt 草案 | `calm magister in ornate purple-gold arcane robes, floating spellbook, soft echo afterimages of hand sigils, scholarly examiner vibe, violet and gold light, dark archive hall, single subject centered` |

### 5.3 `heroScarra` — 斯卡拉狼首

| 欄位 | 規格 |
|---|---|
| 檔名 | `assets/cards/heroScarra.png` |
| 陣營 | 荒野獸群 `wild`（琥珀、獸牙、獵徑） |
| 軸 | aggro；衝鋒＋血跡 |
| 姿態 | **前衝動態**；狼人／獸化領袖或披狼首披風的獵人（二選一須全套一致）；第一口血的動勢 |
| 服裝 | 毛皮、骨飾、非王城甲；野性但不卡通 |
| 光色 | 琥珀月＋血跡暗紅點綴（可微量，勿血腥過度） |
| 身分錨 | 狼首披肩或狼耳剪影＋前衝爪／刃 |
| 參考鄰卡 | `frostfangDire`、`wolf`、`ragingBrute` |
| Prompt 草案 | `feral wolf-chieftain mid-charge, wolf-pelt mantle, amber eyes, wilderness ridge at night, ember and blood-trail accents, aggressive pose, single subject centered` |

### 5.4 `heroIsoldLongdusk` — 伊索德·長暮

| 欄位 | 規格 |
|---|---|
| 檔名 | `assets/cards/heroIsoldLongdusk.png` |
| 陣營 | 凜冬暗影 `wintershadow`（靛紫、月、長夜） |
| 軸 | control；吸血＋寒噤 |
| 姿態 | 優雅側身；抬手捻**彎月寒霧**；神情安撫而非狂笑反派 |
| 服裝 | 長暮紫黑禮袍、銀月冠飾；可呼應 `countessLongNight` 但更「送夢者」溫冷 |
| 光色 | 冷月銀＋暗紫霧；吸血用極淡緋絲即可 |
| 身分錨 | 彎月＋凍結時刻的靜止感（寒噤） |
| 參考鄰卡 | `countessLongNight`、`glaciarchWarden` |
| Prompt 草案 | `elegant pale woman of the long dusk, indigo-violet gown, silver crescent diadem, frost mist freezing a gesture mid-air, serene and melancholy, cold moonlight, single subject centered` |

### 5.5 `heroRuneFrostfang` — 霜牙百夫長·魯恩

| 欄位 | 規格 |
|---|---|
| 檔名 | `assets/cards/heroRuneFrostfang.png` |
| 陣營 | 凜冬暗影 `wintershadow` |
| 軸 | control；嘲諷＋裂甲 |
| 姿態 | 正面持**霜紋巨盾／斧**；軍紀百夫長，非暴君本體 |
| 服裝 | 藍冰半甲、霜牙紋章；比 `frostboundTyrant` 更「士官」而非「王」 |
| 光色 | 冰青＋裂甲碎金火花（暗示破聖盾） |
| 身分錨 | 盾面霜牙＋正在碎裂的金色聖光薄膜（裂甲敘事） |
| 參考鄰卡 | `frostboundTyrant`、`glaciarchWarden`、`frostReaver` |
| Prompt 草案 | `frost-armored centurion with glacial tower shield engraved with frostfang rune, golden divine-shield film cracking under ice edge, disciplined jailer-warden, blue ice light, single subject centered` |

### 5.6 `heroMoenTidearbiter` — 潮間仲裁者·茉恩

| 欄位 | 規格 |
|---|---|
| 檔名 | `assets/cards/heroMoenTidearbiter.png` |
| 陣營 | 潮間中立 `neutral`（灰藍、天秤、多陣營微標） |
| 軸 | neutral；戰吼調印 |
| 姿態 | 半身；手持**天秤或潮印印章**；背包／腰帶可掛四陣營微物（鹽、墨、齒、霜鈴）但保持簡潔 |
| 服裝 | 旅行仲裁袍，非四旗制服；中性灰藍銀 |
| 光色 | 柔和灰藍＋四色極淡點綴（白潮藍、結社紫、荒野橙、凜冬青） |
| 身分錨 | 天秤／潮印；「不選旗幟」的中立感 |
| 參考鄰卡 | 無直接同色旗艦；避免畫成白潮聖騎士或結社法師 |
| Prompt 草案 | `neutral tide arbiter woman with balanced scales and a glowing attunement seal, travel cloak, belt charms of salt ink fang and frost-bell, slate-blue silver palette, diplomatic calm, dark moody background, single subject centered` |

---

## 6. P0–P2 重繪／補圖清單

> 「重繪」在本報告＝**補齊 null 或必要時重產**；既有 41 張預設**不進 P0 重畫**。  
> 數量為建議產線批次，可依人力切 sprint。

### 6.1 P0 — 立刻影響產品臉與實戰地板（建議 21 張）

**完成定義：** 檔案入 `assets/cards/` + `art-config` prompt + `cards.js` `image` 路徑；開包／戰鬥／圖鑑可見實圖。

#### A. 角色立繪（6）— 最高優先

| # | id | 名稱 | 原因 |
|---|---|---|---|
| 1 | `heroSerHalden` | 哈爾登隊長 | 預設對手＋角色 pity 臉 |
| 2 | `heroMagisterVey` | 維伊魔導師 | 同上 |
| 3 | `heroScarra` | 斯卡拉狼首 | 同上；且牌組幾乎全 null |
| 4 | `heroIsoldLongdusk` | 伊索德·長暮 | 角色包完整交付 |
| 5 | `heroRuneFrostfang` | 霜牙百夫長·魯恩 | 同上 |
| 6 | `heroMoenTidearbiter` | 潮間仲裁者·茉恩 | 中立門面；圖鑑篩選「角色」 |

#### B. 其餘 null 傳說（5）— 金框同框落差

| # | id | 名稱 |
|---|---|---|
| 7 | `bloodmoonQueen` | 血月女王 |
| 8 | `skyJudicator` | 天穹裁決者 |
| 9 | `highArchivist` | 至高典藏師 |
| 10 | `captainGreywake` | 灰潮船長（Halden 牌組） |
| 11 | `ladyAshenBell` | 灰鐘女士 |

#### C. AI 高曝光 null（10）— 關閉實戰「emoji 牆」

| # | id | 名稱 | 主要曝光 |
|---|---|---|---|
| 12 | `saltShieldSquire` | 鹽盾侍從 | Halden ×2 |
| 13 | `bulwarkMonk` | 壁壘武僧 | Halden ×2 |
| 14 | `bannerGuard` | 戰旗守衛 | Halden ×2 |
| 15 | `mirrorRime` | 鏡霜 | Halden ×2（法術） |
| 16 | `tidecallerAdept` | 喚潮學徒 | Vey ×2 |
| 17 | `iceNeedle` | 冰針 | Vey ×2 |
| 18 | `emberVolley` | 餘燼齊射 | Vey／Scarra |
| 19 | `voidTithe` | 虛空什一稅 | Vey ×2 |
| 20 | `emberpup` | 餘燼幼犬 | Scarra ×2 |
| 21 | `dualTalon` | 雙爪獵手 | Scarra 終局隨從 |

> Scarra 其餘 null（`alleySkirmisher` 等）進 P1，避免 P0 膨脹；但若只做一批 **強烈建議把 6.2 的 Scarra 曲線一併做完**。

**P0 建議 prompt 補錄（非角色、精簡）：**

| id | prompt 草案 |
|---|---|
| `bloodmoonQueen` | `crimson moon queen in gothic regal armor, blood-red lifesteal aura, night citadel, menacing elegance` |
| `skyJudicator` | `colossal sky judicator angelic titan with scales of light and storm, rush-taunt divine presence` |
| `highArchivist` | `elder high archivist behind floating tomes, taunt scholar, golden-blue archive light, calm authority` |
| `captainGreywake` | `grizzled sea captain with grey-tide coat and anchor emblem, taunt stance on frosty pier` |
| `ladyAshenBell` | `lady of ashen bells in mourning silk, spectral bell spirits, lifesteal dusk palette` |
| `saltShieldSquire` | `young squire with oversized salt-crusted shield, humble taunt pose, cold coastal keep` |
| `bulwarkMonk` | `stocky monastery monk with tower shield, thick stance, white-tide cloth` |
| `bannerGuard` | `banner guard planting war flag, defensive rare soldier, blue-white tabard` |
| `mirrorRime` | `fractured ice mirror reflecting a shield silhouette, no creature, blue rime magic` |
| `tidecallerAdept` | `young tidecaller adept with swirling water sigils, spellpower apprentice` |
| `iceNeedle` | `sharp ice needle projectile of frost magic, no creature` |
| `emberVolley` | `volley of ember sparks and small fire arrows, no creature` |
| `voidTithe` | `dark void tithe coin dissolving into purple void, no creature` |
| `emberpup` | `small ember-maned pup charging, cute but fierce, charge vibe` |
| `dualTalon` | `dual-bladed hunter mid-strike, windfury motion blur on twin talons` |

---

### 6.2 P1 — 實戰長尾與開包中頻（建議 18 張）

優先：**Scarra 曲線補完** + 其餘 epic null + 高辨識 rare。

| # | id | 名稱 | 稀有 | 理由 |
|---|---|---|---|---|
| 1 | `alleySkirmisher` | 巷戰斥候 | C | Scarra |
| 2 | `sparkSquire` | 火花侍從 | C | Scarra |
| 3 | `frontScout` | 前線斥候 | C | Scarra |
| 4 | `packHowler` | 狼群嚎者 | R | Scarra |
| 5 | `dawnRider` | 晨鋒騎手 | R | Scarra |
| 6 | `abyssWalker` | 深淵行者 | E | 史詩肉盾 |
| 7 | `stormGriffin` | 暴風獅鷲 | E | 史詩飛兵 |
| 8 | `duskWitch` | 暮光女巫 | E | 史詩 |
| 9 | `bastionColossus` | 棱堡巨像 | E | 史詩牆 |
| 10 | `starfall` | 星界崩落 | E | 法術 |
| 11 | `forbiddenHex` | 禁咒變形 | E | 法術 |
| 12 | `tidebinderHex` | 縛潮咒印 | E | 法術 |
| 13 | `tacticalRequisition` | 戰術徵調 | E | 法術 |
| 14 | `silenceOne` | 封口咒 | E | 法術 |
| 15 | `thunderRoc` | 雷翼巨鵬 | R | 連擊飛兵 |
| 16 | `toxinViper` | 毒涎蝰 | R | 劇毒工具 |
| 17 | `graveScribe` | 墓碑抄寫員 | R | 亡語抽牌 |
| 18 | `scoutInterrogator` | 斥候訊問 | R | 靜默戰吼 |

P1 完成後：epic null 清零；Scarra 牌組可接近「全有圖」。

---

### 6.3 P2 — 普通／稀有長尾與可選精修（其餘 ~12＋可選）

剩餘 null（P0+P1 後約 12 張 common／rare 長尾），建議按開包權重慢慢補：

| id | 名稱 | 稀有 |
|---|---|---|
| `mooncat` | 月光貓 | C |
| `groveHerbalist` | 林地藥師 | C |
| `holyGlimmer` | 聖光閃耀 | C |
| `duskwrightBat` | 暮影蝠 | R |
| `linebreaker` | 破陣槍兵 | R |
| `thunderClap` | 雷霆震擊 | R |
| `arcaneVeil` | 秘能護幕 | R |
| `battleDrummer` | 戰鼓手 | R |
| `sanctuaryWarden` | 聖所看守 | R |
| `soulfrostRaven` | 魂霜渡鴉 | R |
| `runicScrivener` | 符文抄寫員 | C |
| `watchtowerBowman` | 望塔弓手 | C |

**P2 可選（非 null）：**

| 項目 | 說明 |
|---|---|
| 既有旗艦臉部精修 | 僅在宣傳大圖露餡時重產單張 |
| `assets/frames/` 海報框 | 商店 KV／社群裁切用外框 PNG（common→legend 四階）；**不進戰鬥 DOM** |
| 角色 **Avatar 小圖** 64–128 | 若未來 HUD 要換掉對手 emoji；非本輪必須 |
| 法術／隨從統一色溫 LUT | 全庫調色，ROI 低於補 null |

---

## 7. 卡框專項（需求 vs 非需求）

| 需求 | 優先 | 說明 |
|---|---|---|
| 維持 CSS 四階框 + 傳說 sheen + foil | **已完成** | 勿為角色再加第三層箔 |
| 角色卡 **不**需要獨立框圖即可上線 | — | 立繪 + 既有 legendary CSS 即可 |
| 陣營 fallback 與有圖並存 | 已完成 | null 未補前仍靠 `art-fallback` |
| 可選：`assets/frames/rarity-*.png` | P2 | 僅合成海報；執行期可忽略 |
| 禁止：在立繪內畫卡框 | — | 與產線契約衝突，且會雙框 |

**角色卡「框」的正確期待：**  
玩家感知的「角色傳說框」＝ **金框 CSS + 高辨識立繪**；不是再做一條 frame 資產管線。

---

## 8. 產線建議（審核附帶，不施工）

| 步驟 | 動作 |
|---|---|
| 1 | 在 `art-config.json` 的 `cards` 依 P0 列表加 `id` + `prompt` |
| 2 | `.\scripts\gen-art.ps1 -Only heroSerHalden,heroMagisterVey,...`（或 OpenAI 腳本） |
| 3 | 人工抽檢：小卡可讀、無字無框、臉可接受 |
| 4 | `cards.js` 將對應 `image: null` 改為 `../../assets/cards/<id>.png` |
| 5 | 回歸：開包 pity 角色、三位 AI 開局手牌／場、圖鑑角色篩選 |
| 6 | 勿同時開「再一輪箔材質」——與 V3 收官策略一致 |

**工作量粗估（僅美術產線，不含程式）：**

| 批次 | 張數 | 感測 |
|---|---:|---|
| P0 | 21 | 1 個集中 sprint（角色 6 宜同風統一抽） |
| P1 | 18 | 次 sprint |
| P2 長尾 | ~12 | 可穿插 |

---

## 9. 驗收清單（補圖後給實作方）

- [ ] 6 角色：`image` 非 null，檔案存在，開包金柱下為立繪  
- [ ] 11 傳說：無 `image:null`（或明示豁免清單）  
- [ ] Halden／Vey／Scarra 固定牌組 null 張數顯著下降（P0 後 Scarra 仍可能殘 P1）  
- [ ] 任意卡縮圖 78px 寬可辨主體  
- [ ] 無卡面文字／無內嵌卡框  
- [ ] `art-config` 與 `cards.js` id 同步  
- [ ] 未改 core 規則、未為角色單獨提高 foil 率  

---

## 10. 總評

| 維度 | 分數 | 說明 |
|---|---:|---|
| 旗艦有圖品質 | **7.5–8.0** | 41 張可撐宣傳 capture |
| 卡框／材質系統 | **8.0+** | CSS 收官，非本輪瓶頸 |
| null fallback | **6.5** | 陣營紋理及格，仍非內容 |
| **全庫覆蓋率** | **4.5** | 55% null |
| **角色包美術完成度** | **1.0** | 機制 100%，立繪 0% |
| **實戰觀感地板** | **4.0** | Scarra 場尤低 |
| **綜合（素材健康度）** | **5.0** | 材料強、內容洞大 |

**給製作決策的一句話：**  
下一輪最高 ROI 不是再打磨框，而是 **P0：6 角色立繪 + 5 傳說 + AI 高曝光 10 張**；做完後產品從「機制完整的 emoji 角色包」變成「可開包炫耀的對座六影」。

---

## 附錄 A — 全庫 null 一覽（51）

| rarity | type | cost | id | name |
|---|---|---:|---|---|
| common | minion | 1 | mooncat | 月光貓 |
| common | minion | 2 | frontScout | 前線斥候 |
| common | minion | 3 | groveHerbalist | 林地藥師 |
| common | spell | 2 | holyGlimmer | 聖光閃耀 |
| rare | minion | 2 | duskwrightBat | 暮影蝠 |
| rare | minion | 3 | linebreaker | 破陣槍兵 |
| rare | minion | 4 | bannerGuard | 戰旗守衛 |
| rare | spell | 3 | thunderClap | 雷霆震擊 |
| rare | spell | 1 | arcaneVeil | 秘能護幕 |
| epic | minion | 5 | abyssWalker | 深淵行者 |
| epic | minion | 6 | stormGriffin | 暴風獅鷲 |
| epic | minion | 5 | duskWitch | 暮光女巫 |
| epic | spell | 5 | starfall | 星界崩落 |
| epic | spell | 5 | forbiddenHex | 禁咒變形 |
| legendary | minion | 7 | bloodmoonQueen | 血月女王 |
| legendary | minion | 9 | skyJudicator | 天穹裁決者 |
| common | minion | 1 | sparkSquire | 火花侍從 |
| common | minion | 2 | alleySkirmisher | 巷戰斥候 |
| common | spell | 1 | emberVolley | 餘燼齊射 |
| common | minion | 3 | bulwarkMonk | 壁壘武僧 |
| rare | minion | 3 | dawnRider | 晨鋒騎手 |
| rare | minion | 2 | battleDrummer | 戰鼓手 |
| rare | minion | 4 | sanctuaryWarden | 聖所看守 |
| epic | spell | 4 | tidebinderHex | 縛潮咒印 |
| epic | minion | 6 | bastionColossus | 棱堡巨像 |
| legendary | minion | 6 | highArchivist | 至高典藏師 |
| common | minion | 1 | emberpup | 餘燼幼犬 |
| rare | minion | 4 | thunderRoc | 雷翼巨鵬 |
| rare | minion | 3 | soulfrostRaven | 魂霜渡鴉 |
| common | minion | 2 | runicScrivener | 符文抄寫員 |
| common | minion | 2 | tidecallerAdept | 喚潮學徒 |
| common | minion | 2 | watchtowerBowman | 望塔弓手 |
| epic | spell | 3 | tacticalRequisition | 戰術徵調 |
| common | minion | 1 | saltShieldSquire | 鹽盾侍從 |
| common | spell | 1 | iceNeedle | 冰針 |
| rare | minion | 3 | packHowler | 狼群嚎者 |
| rare | minion | 3 | toxinViper | 毒涎蝰 |
| rare | minion | 3 | graveScribe | 墓碑抄寫員 |
| epic | spell | 2 | mirrorRime | 鏡霜 |
| epic | minion | 4 | dualTalon | 雙爪獵手 |
| epic | spell | 3 | voidTithe | 虛空什一稅 |
| legendary | minion | 6 | captainGreywake | 灰潮船長 |
| legendary | minion | 5 | ladyAshenBell | 灰鐘女士 |
| epic | spell | 2 | silenceOne | 封口咒 |
| rare | minion | 3 | scoutInterrogator | 斥候訊問 |
| legendary | minion | 6 | heroSerHalden | 哈爾登隊長 |
| legendary | minion | 5 | heroMagisterVey | 維伊魔導師 |
| legendary | minion | 4 | heroScarra | 斯卡拉狼首 |
| legendary | minion | 6 | heroIsoldLongdusk | 伊索德·長暮 |
| legendary | minion | 5 | heroRuneFrostfang | 霜牙百夫長·魯恩 |
| legendary | minion | 4 | heroMoenTidearbiter | 潮間仲裁者·茉恩 |

## 附錄 B — 有圖完整清單（41）

`footman`, `archer`, `wolf`, `cleric`, `knight`, `mage`, `raptor`, `guardian`, `golem`, `griffin`, `lich`, `paladin`, `dragon`, `phoenix`, `titan`, `archmage`, `firebolt`, `heal`, `shieldUp`, `manaSurge`, `frost`, `lightning`, `polymorph`, `meteor`, `frenzyCub`, `frostBiter`, `arcaneApprentice`, `novicePage`, `ragingBrute`, `frostChanneler`, `arcaneInfusion`, `frostReaver`, `arcaneWeaver`, `flameBurst`, `archLoremaster`, `frostboundTyrant`, `frostfangDire`, `oathbannerHerald`, `dawnArchbishop`, `glaciarchWarden`, `countessLongNight`

---

*本報告為 Grok 素材監工審核產出；未修改任何遊戲資源或程式。*
