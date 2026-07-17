# R67 style board、色票與 imagegen prompts

## 視覺命題

《裂潮卡牌》的戰場不是插畫主角，而是海潮侵蝕世界留下的五種「桌面儀式空間」。最大膽的單一識別是：每張桌布的邊緣地貌都朝中央無紋理石板／潮面收束，讓五個陣營看似在同一張被潮水磨蝕的戰桌上留下不同痕跡。中央約 60% 保持暗、霧化、低局部對比；敘事細節只花在外圍。

這避開一般「高細節全幅奇幻桌布」的模板感，也直接服務卡牌、手牌與文字的可讀性。

## 色票

- 深潮玄武岩 `#07131B`：共同暗基底。
- 白潮銀藍 `#A9D6E5`：白潮守軍。
- 星儀紫金 `#8B5CF6` / `#D8B46A`：奧術結社。
- 雷脊琥珀 `#D97706` / `#264653`：荒野獸群。
- 長夜靛霜 `#312E81` / `#9FBBD0`：凜冬暗影。
- 潮間錫灰 `#8093A1`：潮間中立。

## 字體與版面

- 顯示：既有 `Segoe UI`／`Microsoft JhengHei` 粗體，短標籤維持凝練。
- 內文：既有 system stack；不新增網路字型與首屏阻塞。
- 工具數字：system-ui tabular numbers。
- 版面：卡框左上或右下嵌入 18–22px 徽記；選單以 28–32px 徽記＋陣營正式名稱，徽記只是識別，不取代文字。

## 共用戰場 prompt 骨架

Use case: stylized-concept  
Asset type: wide game battlefield wallpaper for Tiderend Cards / 裂潮卡牌  
Style/medium: painterly dark-fantasy environment concept art, sea-weathered materials, cinematic but restrained  
Composition/framing: 3:2 wide establishing view; the central 60% is a quiet, dark, low-detail playable tabletop zone with nearly uniform mid-dark value; all architecture, foliage, lights, silhouettes and story detail stay in the outer 20% edges; safe under cover crops at 1366×768, 390×844 and 844×390  
Lighting/mood: edge lighting and atmospheric depth; no bright bloom behind the center  
Constraints: no characters, creatures, cards, readable text, letters, numbers, logos, watermark, UI, frame or central focal object; central zone must remain low-noise and low-contrast for overlaid cards and white text

### 五個場景

1. `white-tide-citadel`：storm-worn white-stone sea citadel terrace, shield-shaped breakwaters and cold blue dawn spray only at the outer edges, disciplined silver-blue banners without symbols.
2. `astral-conclave`：subterranean tidal observatory, violet-gold astrolabe architecture and sealed abstract lenses around the perimeter, central slate floor calm and unmarked.
3. `thunderwild-pass`：rugged storm pass with dark pines, amber lightning caught behind distant edge ridges, claw-scarred stones only at the margins, center a quiet rain-dark clearing.
4. `longnight-necropolis`：indigo frost necropolis under a restrained eclipse, broken bells and cold mist at edge tombs, no bones or figures, center a smooth dark frozen causeway.
5. `tidebreak-confluence`：neutral tidal confluence where salt, ink, amber and frost channels meet only along the perimeter, center a balanced dark pewter basin with soft concentric tide sheen, no faction dominates.

## 共用徽記 prompt 骨架

Use case: stylized-concept  
Asset type: faction crest game UI icon, intended to remain recognizable at 64×64  
Style/medium: bold painted heraldic metal-and-enamel crest, opaque solid subject, simple vector-friendly silhouette, at most three large internal shapes  
Composition/framing: one centered emblem, front-facing, generous padding, no detached particles or hairline details  
Scene/backdrop: perfectly flat solid `#00ff00` chroma-key background for local background removal  
Constraints: background is exactly one uniform color with no shadows, gradient, texture, reflection, floor plane or lighting variation; no cast shadow; do not use `#00ff00` in the emblem; no text, letters, numbers, logo, watermark or mockup

### 五枚徽記

1. `wardens`：a broad silver breakwater shield crossed by one white-blue rising wave, squared defensive silhouette.
2. `conclave`：a violet split astrolabe enclosing one gold prism-star, circular scholarly silhouette.
3. `wild`：an amber three-claw thunder mark inside a charcoal mountain fang, angular forward silhouette; no green.
4. `wintershadow`：an indigo eclipsed bell with one silver frost notch, teardrop silhouette; no smoke.
5. `neutral`：a pewter balance seal made from two opposing tide curls around one central drop, round symmetric silhouette.

## 後製固定參數

- 戰場：center crop 3:2；high `1536×1024`、med `1152×768`、low `768×512`；Lanczos；中央 60% 套 Gaussian blur radius 2.2 後以 35% feather blend，亮度壓至上限 108/255，WebP quality 82/78/74、method 6。
- 徽記：內建 imagegen 色鍵 master → `remove_chroma_key.py --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill`；再依 alpha bbox 置中到 256×256、12% padding、Lanczos；必要時只允許 `--edge-contract 1` 一次。
- 禁止手繪補圖或以其他模型混用；所有 runtime 皆可追溯至一張 C2PA master。
