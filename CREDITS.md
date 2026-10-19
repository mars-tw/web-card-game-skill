# 素材與第三方致謝

本文件記錄《裂潮卡牌》開源版本所使用的視覺素材、字型／圖示來源與開發期第三方軟體。若新增或替換素材，請同步更新本文件。

## 視覺素材

R75（2026-10-16）新增 10 張生成原圖：夜港、甲板戰場、破曉歸航、領航員、見習士兵、弓箭手、浪紋銅框、九枚航海圖示圖集、繁中字標與 App 圖示提案。實際工具是 OpenAI 內建 `image_gen.imagegen`；工具沒有提供模型 slug，故不將本輪寫成已核實 `gpt-image-2`。原圖及來源 SHA-256 在 `docs/art/source/`、`docs/art/ASSET_MANIFEST.json`；完整共用風格與提示詞在 `docs/art/PROMPTS.json`。未使用第三方遊戲 IP、圖庫或字型套件。

執行期素材在 `assets/art/r75/`，由 `scripts/process-r75-assets.py` 做尺寸、圖集裁切與 WebP 壓縮；透明底依生成工具實際 alpha 保留，卡框中央 alpha=0。戰場曝光乘 1.06、弓手色彩乘 1.08；原圖不變。`assets/cards/footman.png`、`archer.png` 的 R75 圖取代舊圖，保留 1024×1024 RGBA PNG 資料契約，畫面優先讀 WebP。`assets/icons/icon-192.png`、`icon-512.png` 由新 App 圖示提案製作並接入 PWA，沒有上傳原生商店。以下舊生成模型、原提示詞與授權記錄繼續保留作歷史來源。

| 範圍 | 來源與說明 |
|---|---|
| `assets/cards/*.png` | 卡牌立繪與法術圖皆為本專案以生成式 AI 製作；提示詞與清單集中在 [`art-config.json`](art-config.json)，生成流程見 [`references/art-generation.md`](references/art-generation.md)。R61 六張具名角色立繪使用 OpenAI `image_gen` 產出並統一風格；R66 再以 OpenAI `gpt-image-2` 完成 25 張長尾卡圖，經人工陣營辨識、安全區與偽文字檢查後轉製為 1024×1024 RGBA PNG，稽核紀錄與雜湊見 [`docs/evidence/R66_art/manifest.json`](docs/evidence/R66_art/manifest.json)。`mage.png` 與 `lich.png` 的 R66 變更僅為尺寸／格式修復，未重新生成內容。 |
| `assets/backgrounds/*.png` | 本專案的 AI 生成主題背景；提示詞記錄於 `art-config.json`。 |
| `assets/battlefields/*.webp` | R67 Wave 2 五戰場由 OpenAI 內建 `imagegen`（`gpt-image-2`）逐張生成；未使用外部搜尋圖或第三方素材。原始 C2PA master、提示詞、確定性 high／med／low 後製參數、逐檔 SHA-256 與量化 gate 見 [`docs/evidence/R67/`](docs/evidence/R67/)。 |
| `assets/factions/*.png` | R67 Wave 2 五陣營徽記由 OpenAI 內建 `imagegen`（`gpt-image-2`）以色鍵底生成，再使用 imagegen skill 隨附的 `remove_chroma_key.py` 轉為 alpha PNG；C2PA master、alpha 參數、64px 辨識與綠邊 gate 見 [`docs/evidence/R67/`](docs/evidence/R67/)。 |
| `assets/cover.png` | 本專案宣傳封面。repo 歷史未保存可核實的第三方素材來源或獨立授權檔，故不主張來自任何外部素材庫。 |
| `assets/icons/icon-192.png`、`icon-512.png` | 本專案製作的 PWA 圖示；未使用外部 icon 套件。 |
| `docs/screenshots/*.png` | 從本專案線上遊戲實機畫面擷取，僅用於文件說明。 |

R72 未新增任何圖片或音訊檔：對戰頭像與 VS 開場重用 R61 三位具名對手立繪（`heroSerHalden.png`、`heroMagisterVey.png`、`heroScarra.png`），卡包外觀、潮能計、潮浪特效皆為 CSS 程序化繪製，裂潮音效為 WebAudio 即時合成。背景音樂已建好載入架構（`battle.js` 的 `BGM_URL`），但本機 AI 派工器 `music` 任務兩次因 GPU 佇列逾時失敗（task `93dee227-6555-4583-b687-462698bd9e5e`、`d8df7b17-3e15-45d3-bde3-1dc1b52798a7`），目前沒有 BGM 檔；日後補檔時需在此記錄模型與提示詞。

AI 生成素材可能仍受生成服務條款、商標、肖像及各地法律限制；使用者應自行確認其用途與所在地規範。專案不含已知的第三方遊戲 IP 圖像、商用圖庫素材或外部卡面素材。

## 字型與圖示

- 專案不下載或散佈第三方字型；CSS 使用 `Segoe UI`、`Microsoft JhengHei`、`system-ui` 等作業系統字型 fallback。
- 介面圖示主要使用 Unicode emoji、文字符號與 CSS 幾何圖形，實際字形由使用者的平台字型提供。
- R75 主要導覽、潮向、首頁徽章、提示與設定改用生成的九枚航海琺瑯圖示。部分次級選單及關鍵字仍沿用 Unicode／emoji，未聲稱全作全部替換。
- 未偵測到 Font Awesome、Material Icons、Lucide 或其他第三方 icon library。

## 第三方開發工具

- [Playwright](https://github.com/microsoft/playwright)（Apache-2.0）：僅作為開發依賴，用於 E2E 與響應式版面測試，不隨遊戲執行期載入。
- GitHub Actions 官方 actions 與 GitHub Pages：用於 CI、瀏覽器測試與靜態網站部署。

原始碼授權詳見 [`LICENSE`](LICENSE)。第三方工具仍依各自授權條款提供。

## R76 美術第二輪（2026-10-16）

13 張新生成原圖：浪牆、餘燼幼犬、迅捷狼、火花侍從、巷戰斥候、前線斥候、火焰箭、舉旗領航員、潮溝戰場、薄貝紋卡框、四枚圖示圖集、繁中字標、App 圖示提案。實際工具為 `image_gen.imagegen`，工具未暴露可核實模型 slug，因此記為 null，沒有推定模型型號。

原圖存於 `docs/art/source/r76/`；完整同風格提示詞在 `docs/art/PROMPTS_R76.json`，來源與執行期尺寸、SHA-256、alpha、色彩及授權在 `docs/art/ASSET_MANIFEST_R76.json`。後製僅尺寸、原生透明保留、圖集裁切與 WebP 壓縮，沒有程序畫圖冒充原畫。執行期為 `assets/art/r76/`，六張卡仍保留 1024×1024 RGBA canonical PNG；PWA 圖示同步。

沿用 R75 領航員作勝利姿勢的身份參考；原角色、卡圖、場景、字標及授權不刪除。R75 PWA 圖示原始位元組另保存在 `assets/art/r75/pwa-icon-192.png`、`pwa-icon-512.png`，由原 manifest 精確引用；新圖示取代公開 PWA 路徑。沒有使用外部素材庫或第三方遊戲 IP。所有生成素材依適用 OpenAI 服務條款使用。

## R77 美術第三輪（2026-10-16）

10 張生成原圖：浪牆、敵卡泡沫、水窪、連續甲板、夜海舉旗領航員、夜海歸航港口、月貝銅框、裂潮技能圖示、材質精修字標、App 圖示提案。實際工具 `image_gen.imagegen`；工具未提供可核實模型 slug，記為 null。領航員與字標以上一輪自有原圖為編修參考，保留原身份與名稱。

原圖 `docs/art/source/r77/`，規格化生成提示詞 `docs/art/PROMPTS_R77.json`，逐檔來源／尺寸／格式／原生 alpha／SHA-256／色彩 `docs/art/ASSET_MANIFEST_R77.json`。原圖保留不變；後製為尺寸、alpha 保留、WebP 壓縮與 alpha mask。執行期 `assets/art/r77/`；App 提案另有 PNG。舊 PWA 圖示不覆寫，既有卡圖與授權全部保留。沒有使用外部素材庫、第三方遊戲 IP 或新字型。生成素材依適用 OpenAI 服務條款使用。

## R78 美術第四輪（工作單 2026-10-17，執行至 2026-10-18）

9 張新生成原圖：推進浪牆、透視漲潮浪層、領航員三視圖與表情設定表、持牌領航員、月貝甲板、細貝銅卡框、裂潮圖示、裂潮卡牌字標、App 圖示提案。實際工具 `image_gen.imagegen`；工具沒有公開可核實模型 slug，記為 null，不推定型號。領航員以 R77 自有舉旗圖作身份參考，先生成三視圖，再依設定表生成主選單立繪。

原圖 `docs/art/source/r78/`，三視圖 `docs/art/character-sheets/navigator-r78.png`，提示詞 `docs/art/PROMPTS_R78.json`，逐檔尺寸、來源及參考雜湊、原生 alpha、色彩與執行期雜湊 `docs/art/ASSET_MANIFEST_R78.json`。後製只有縮放、WebP 壓縮與 QA 對照，不畫程序替代圖、不烘假透明。App 圖示為本機提案，未送商店。所有舊來源、授權與既有 PWA 圖示保留。沒有引入外部素材庫、第三方角色 IP 或新字型。生成素材依適用 OpenAI 服務條款使用。

## R79 美術第五輪（2026-10-18）

新增 9 張生成原圖：單一浪牆、接觸泡沫、領航員三視圖／表情、舉旗領航員、同場甲板、珍珠銅卡框、裂潮圖示、繁中字標、App 圖示本機提案。實際工具為 image_gen.imagegen；未提供可確認模型 slug，故不推定 gpt-image 型號。用於本專案，非外部圖庫素材；保留以上所有舊素材來源與授權。

原圖 docs/art/source/r79/；設定表 docs/art/character-sheets/navigator-r79.png；提示詞 docs/art/PROMPTS_R79.json；來源／參考／執行期雜湊及原生透明檢測 docs/art/ASSET_MANIFEST_R79.json。執行期 assets/art/r79/，僅尺寸調整與 WebP 壓縮；人物設定表不是動畫幀。

## R80 美術第六輪（2026-10-18）

新增6張生成原圖：士兵／弓手正側背與配件設定表、紅頭帶見習士兵、白兜帽弓箭手、短尾單鉤浪牆、同母形字標、同母形旗紋的舉旗領航員。實際工具 `image_gen.imagegen`，未回傳可核實模型slug，manifest記null，不推定型號。既有背景、貝銅UI框、圖示與App提案沿用，所有舊素材與授權保留。沒有新字型、外部圖庫或第三方角色。

原圖 `docs/art/source/r80/`；設定表 `docs/art/character-sheets/soldier-archer-r80.png`；提示詞／工具回傳路徑 `PROMPTS_R80.json`、`GENERATION_RECEIPTS_R80.json`；來源與參考雜湊、原生alpha、角色亮度／飽和雙閘及執行期WebP `ASSET_MANIFEST_R80.json`。後製僅尺寸、WebP與QA拼圖；保留原生透明。配件差分、設定表與勝利圖是靜態美術，不當作人物attack／hurt／death動畫幀。生成素材依適用OpenAI服務條款使用，未上傳商店。

兩張配件差分另存1024×1024真PNG規格版於 `docs/art/canonical/r80/`，只作歸檔；遊戲使用已壓縮的WebP。生成原圖1254×1254保留不覆寫。

## 新內容第一輪（2026-10-18）

新增一張「潮汐研習航圖」插畫：甲板上的銅製三潮儀與六張海藏牌。實際工具 `image_gen.imagegen`；未提供可核實模型 slug，記為 null。原圖 `docs/art/source/content-r1/tide-study.png`，執行期 `assets/art/content-r1/tide-study.webp`，後製僅縮放及 WebP 壓縮。完整提示詞／工具回傳路徑在 `docs/art/PROMPTS_CONTENT_R1.json`，尺寸、SHA-256 與來源在 `docs/art/ASSET_MANIFEST_CONTENT_R1.json`。延續 ART_DIRECTION 與 R80 同一 style_prefix；茉恩與其餘卡圖沿用既有素材及授權。這是靜態插畫，不是人物動畫。生成素材依適用 OpenAI 服務條款使用；專案維持 MIT。

## 新內容第二輪（2026-10-19）

新增一張茉恩月光甲板首領插畫，實際工具 `image_gen.imagegen`，模型 slug 未公開，記 null。角色身份參考既有 `heroMoenTidearbiter.png`，共用 `PROMPTS_CONTENT_R1.json` 的完整風格前綴。原圖 `docs/art/source/content-r2/moen-harbor.png`，執行期 `assets/art/content-r2/moen-harbor.webp`；後製只有尺寸與 WebP 壓縮。提示詞／工具輸出在 `PROMPTS_CONTENT_R2.json`，來源雜湊與尺寸在 `ASSET_MANIFEST_CONTENT_R2.json`。六題交換結算沿用既有真卡圖，沒有把靜態插畫當人物動畫。依適用 OpenAI 服務條款使用；專案維持 MIT。

## 新內容第三輪（2026-10-19）

採用一張雙狀態貝盾圖集，裁出完整／裂開兩張執行期 WebP，實際工具 `image_gen.imagegen`，模型 slug 未公開，記 null。參考既有 `assets/art/r75/icon-shield.webp`，保留同一風格前綴與原生透明像素。原圖 `docs/art/source/content-r3/shell-shield-atlas.png`；提示詞、額外未採用產圖紀錄及來源雜湊在 `docs/art/PROMPTS_CONTENT_R3.json`／`ASSET_MANIFEST_CONTENT_R3.json`。後製僅圖集裁切、尺寸及壓縮。茉恩中段沿用第二輪畫作；貝盾是規則狀態及技能回饋，沒有宣稱人物逐幀動畫。依適用 OpenAI 服務條款使用；專案維持 MIT，未發布。

## 新內容 R4 美術

2026-10-19：大面積完整貝盾／貫穿裂紋與脫落碎片。實際產圖工具 `image_gen.imagegen`，模型識別未提供；1 張透明原圖裁為 2 張 WebP，僅裁切、縮放與壓縮。提示詞 `docs/art/PROMPTS_CONTENT_R4.json`，來源及 SHA-256 `docs/art/ASSET_MANIFEST_CONTENT_R4.json`。依 OpenAI 適用服務條款生成，隨本 MIT 專案提供。

## 新內容 R6 美術

2026-10-19：茉恩整備、抬手與舉手命中三個不同姿勢。實際工具 `image_gen.imagegen`，模型識別未提供；1 張透明原圖裁為 3 張 WebP。只裁切、縮放、壓縮，保留 alpha。提示詞 `docs/art/PROMPTS_CONTENT_R6.json`、來源與 SHA-256 `docs/art/ASSET_MANIFEST_CONTENT_R6.json`。盾沿用 R4 生成圖，縮回騎士卡角。依 OpenAI 適用服務條款生成，隨本 MIT 專案提供。

## 新內容 R8 美術

2026-10-19：嘲諷石牆與珍珠聖盾兩個不同剪影，由 `image_gen.imagegen` 一次生成透明圖集，裁切與縮放為兩張 WebP。保留透明原圖，沒有繪製替代占位圖；模型識別未提供。完整提示詞與 SHA-256 見 `docs/art/PROMPTS_CONTENT_R8.json`、`docs/art/ASSET_MANIFEST_CONTENT_R8.json`。依適用 OpenAI 服務條款生成，隨本 MIT 專案提供。


## 新內容 R9（2026-10-19）

- 士兵／騎士關鍵姿勢：由本輪 `image_gen.imagegen` 產生一張透明圖集，分格為 10 張無損 WebP。沿用月裂海藏風格、既有士兵與騎士參考圖；不加入第三方 SDK 或素材。
- 原圖、提示詞、alpha 與 SHA256：`assets/animations/content-r9/`、`docs/art/PROMPTS_CONTENT_R9.json`、`docs/art/ASSET_MANIFEST_CONTENT_R9.json`。
- 隨本專案 MIT 交付；沒有新增授權或商標背書聲稱。模型 slug 未提供。

## 新內容 R10（2026-10-19）

- 實際工具 `image_gen.imagegen`；5 次呼叫（4 張圖集與 1 次透明背景比對），沒有可核實模型 slug。
- 接入 19 張無損 WebP：茉恩整備／施法／兩階段受擊／敗退 5 張、騎士蓄勢／命中／恢復／受擊／跪地／破盾 6 張、士兵完整武器的蓄勢／命中／恢復／受傷／跪地 5 張，以及六道解潮結／三潮羅盤／守約貝印 3 張。
- 以既有茉恩與騎士作身份參考，沿用月裂海藏風格前綴；原圖與比較圖保留。只切圖集與加透明安全邊距，完整手指、天秤與劍尖納入裁切；不以單圖變形冒充姿勢。
- `docs/art/PROMPTS_CONTENT_R10.json` 與 `ASSET_MANIFEST_CONTENT_R10.json` 記錄來源、實際工具、alpha、裁切與 SHA-256。依適用服務條款生成，隨本 MIT 專案提供；沒有第三方 SDK、付費功能或授權背書。
