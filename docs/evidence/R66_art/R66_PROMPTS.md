# card R66 — Wave 1 prompts 與批次校準

- `model_slug`: `gpt-image-2`
- `prompt_version`: `wave1-card-r66-v1.1`
- 安全區修訂版：`wave1-card-r66-safearea-edit-v1.0`
- 生成介面：Codex 內建 `image_gen`
- 輸出：1024×1024 RGBA 真 PNG（生成源檔先保留 C2PA，再轉製執行期 PNG）

## 共用骨架

> Square 1024×1024 opaque full-bleed collectible card illustration for Tiderend / 裂潮卡牌. Use the assigned faction visual language and palette. Keep the complete focal subject and every important limb, weapon, wing, spell shape, and silhouette inside the central 78% safe area, with generous quiet margin for the card UI crop. Strong single focal hierarchy, readable at thumbnail size, painterly dark-fantasy finish consistent with the Wave 0 gold references. Artwork only: no text, letters, numbers, logo, watermark, card border, frame, rarity gem, UI, caption, or baked-in typography.

陣營校準：

- 守望者（wardens）：白金、冷藍、海堡／聖所、紀律與防禦。
- 密議會（conclave）：紫藍、金色奧術、學院／觀測站、抽象符印。
- 荒野（wild）：苔綠、青綠、琥珀、月夜森林與獸性動勢。
- 冬影（wintershadow）：靛紫、冷霜、節制的緋紅、墓園／長夜。

## 個別場景

個別場景摘要以 `art-config.json` 為執行期單一清單；產圖時在上述骨架後加入以下主體：

| ID | 陣營 | 場景摘要 |
|---|---|---|
| mooncat | wild | 大型暗色月貓行於月夜荒野山脊，帶琥珀飾物與銀色毛光。 |
| groveHerbalist | wardens | 披甲守望藥師在海堡邊研磨霜地草藥。 |
| holyGlimmer | wardens | 守望騎士跪持白金聖光，背景為冷藍聖所。 |
| duskwrightBat | wintershadow | 暮工蝙蝠穿過紫色墓園霧與節制緋紅暗影。 |
| linebreaker | wild | 毛皮披掛的荒野破陣者持長槍衝過碎盾，完整人物收在安全區。 |
| thunderClap | conclave | 藍紫雷霆擊中密議會圓形儀式場中央，無角色。 |
| arcaneVeil | wardens | 守望盾手在海堡由白藍潮汐護幕完整包覆。 |
| abyssWalker | wintershadow | 深淵行者自靛色虛霧走出，帶節制緋紅裂隙。 |
| stormGriffin | wild | 荒野風暴獅鷲在炭黑雷雲與琥珀閃電間轉向。 |
| duskWitch | wintershadow | 黃昏女巫在冷月下編織紫色暗影魔法。 |
| starfall | conclave | 金藍星雨落入黑暗奧術觀測站、無角色。 |
| forbiddenHex | conclave | 白色小羊懸在紫色密議會變形晶體中，只用不可讀抽象符號。 |
| battleDrummer | wardens | 守望戰鼓手在藍白城垛敲擊大型戰鼓。 |
| sanctuaryWarden | wardens | 聖所守衛持發光塔盾，白金神殿與冷藍光。 |
| tidebinderHex | conclave | 白色小羊受困於藍色潮汐光環，只用抽象符印。 |
| bastionColossus | wardens | 巨型石造堡壘魔像守護海岸要塞。 |
| thunderRoc | wild | 巨型雷鵬在中央安全區內掠過雷雲，琥珀青綠閃電。 |
| soulfrostRaven | wintershadow | 靈霜渡鴉在中央安全區內穿越靛霜與緋紅魂絲。 |
| runicScrivener | conclave | 奧術抄寫員在浮空石板書寫不可讀抽象符紋。 |
| watchtowerBowman | wardens | 完整入鏡的瞭望塔弓手在月夜海堡瞄準。 |
| tacticalRequisition | conclave | 戴手套的手從紫色傳送環徵調兩本封口空白典冊，無可讀文字。 |
| toxinViper | wild | 翡翠毒蛇盤繞發光濕地草藥，綠青自然色。 |
| graveScribe | conclave | 骷髏密議會墓誌抄寫員伴隨紫色魂火記錄不可讀抽象符號。 |
| silenceOne | conclave | 無面密議會虛無法師在節制紫色消除光環內施行沉默。 |
| scoutInterrogator | wardens | 風霜守望斥候在寒冷海岸據點檢視受損頭盔。 |

## 每四張陣營辨識 QA

| 批次 | 卡片 | 結果 |
|---|---|---|
| 1 | mooncat、groveHerbalist、thunderClap、duskwrightBat | 通過；荒野／守望／密議會／冬影四陣營皆可辨。 |
| 2 | linebreaker、arcaneVeil、abyssWalker、starfall | 通過；荒野／守望／冬影／密議會四陣營差異清楚。 |
| 3 | holyGlimmer、stormGriffin、duskWitch、forbiddenHex | 通過；守望／荒野／冬影／密議會四陣營與縮圖層級清楚。 |
| 4 | battleDrummer、tidebinderHex、thunderRoc、soulfrostRaven | 通過；四陣營可辨，雷鵬與渡鴉另做安全區修訂。 |
| 5 | sanctuaryWarden、runicScrivener、toxinViper、graveScribe | 通過；抄寫員／書吏無可讀偽文字。 |
| 6 | bastionColossus、watchtowerBowman、tacticalRequisition、silenceOne | 通過；弓手另做安全區修訂，軍需圖無可讀文字。 |
| 7 | scoutInterrogator | 尾批單張通過；守望海堡語言清楚。 |

安全區複檢後對 `linebreaker`、`duskwrightBat`、`thunderRoc`、`watchtowerBowman`、`soulfrostRaven` 執行縮景／補景修訂；未採用版本保存在 `pre_edit/`，另保留一張邊緣接觸的蝙蝠初稿於 `rejected/`。
