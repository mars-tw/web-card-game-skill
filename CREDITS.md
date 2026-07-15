# 素材與第三方致謝

本文件記錄《裂潮卡牌》開源版本所使用的視覺素材、字型／圖示來源與開發期第三方軟體。若新增或替換素材，請同步更新本文件。

## 視覺素材

| 範圍 | 來源與說明 |
|---|---|
| `assets/cards/*.png` | 卡牌立繪與法術圖皆為本專案以生成式 AI 製作；提示詞與清單集中在 [`art-config.json`](art-config.json)，生成流程見 [`references/art-generation.md`](references/art-generation.md)。R61 六張具名角色立繪使用 OpenAI `image_gen` 產出並統一風格。 |
| `assets/backgrounds/*.png` | 本專案的 AI 生成主題背景；提示詞記錄於 `art-config.json`。 |
| `assets/cover.png` | 本專案宣傳封面。repo 歷史未保存可核實的第三方素材來源或獨立授權檔，故不主張來自任何外部素材庫。 |
| `assets/icons/icon-192.png`、`icon-512.png` | 本專案製作的 PWA 圖示；未使用外部 icon 套件。 |
| `docs/screenshots/*.png` | 從本專案線上遊戲實機畫面擷取，僅用於文件說明。 |

AI 生成素材可能仍受生成服務條款、商標、肖像及各地法律限制；使用者應自行確認其用途與所在地規範。專案不含已知的第三方遊戲 IP 圖像、商用圖庫素材或外部卡面素材。

## 字型與圖示

- 專案不下載或散佈第三方字型；CSS 使用 `Segoe UI`、`Microsoft JhengHei`、`system-ui` 等作業系統字型 fallback。
- 介面圖示主要使用 Unicode emoji、文字符號與 CSS 幾何圖形，實際字形由使用者的平台字型提供。
- 未偵測到 Font Awesome、Material Icons、Lucide 或其他第三方 icon library。

## 第三方開發工具

- [Playwright](https://github.com/microsoft/playwright)（Apache-2.0）：僅作為開發依賴，用於 E2E 與響應式版面測試，不隨遊戲執行期載入。
- GitHub Actions 官方 actions 與 GitHub Pages：用於 CI、瀏覽器測試與靜態網站部署。

原始碼授權詳見 [`LICENSE`](LICENSE)。第三方工具仍依各自授權條款提供。
