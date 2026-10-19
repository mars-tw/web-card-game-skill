# 共用素材與模板痕跡稽核

2026-10-15，狀態 EXECUTED／VERIFIED（限下列範圍）。只讀其他遊戲，沒有改其他 repo 或 native-kit。

機械證據：`docs/evidence/r74-store/shared-assets.json`、`shared-exact-files.md`；重跑 `python scripts/audit-r74-shared.py`。139 個本作 runtime／素材檔與 13 款作品的受版控 runtime／素材比 SHA-256，沒有整檔相同命中。文件、建置輸出、node_modules 與開發腳本不在整檔比對；夜行列車只看重製企劃根檔。其他線路並發修改，結果代表本輪讀取快照。

| 本作檔案／項目 | 與哪款相同或相似 | 處理方式與結論 |
|---|---|---|
| `assets/cards/*`、`assets/battlefields/*`、`assets/factions/*`、`assets/icons/*`、`assets/backgrounds/*` | 本輪 SHA-256 未與受查作品整檔重複 | 保留正式卡圖、場景、潮汐圖示；未把零命中寫成權利已核清或全球原創 |
| `templates/card-battle/core.js`、`battle.js`、`templates/card-pack/pack.js` | 未有整檔重複；未發現受查自訂潮汐／收藏識別字在其他 runtime 相同 | 保留本作規則，新增漲退潮與正式短局。199 筆共同識別字命中均是 localStorage／requestAnimationFrame，屬標準瀏覽器 API，不等於整個程式沒有共用來源 |
| `index.html`、`templates/index.html` | 同屬網頁遊戲 shell／PWA 發行方式；不是 SHA 相同 | 根入口改成專屬港口；主導配色改海綠、領航 CTA 與潮向說明。未用改名掩飾原目錄結構 |
| `templates/card-battle/index.html`、`templates/card-pack/index.html` 的 `.series-footer` | 指向無盡塔防／陽光農場／灰燼護航的同系列宣傳 | 已移除外部遊戲連結與系列口號，改成本作領航識別；沒有其他產品的跳轉依賴 |
| `templates/harbor.html`、`r74-tide.css` | 本輪新增，航海圓規刻度、海綠面板、直角輪廓 | 使用 CSS 介面排版與既有正式場景，不是新人物或美術替代品；無生成圖片／模型 slug |
| 字型組合 | 無盡塔防含 Microsoft JhengHei／system-ui；陽光農場也含 Segoe UI／Microsoft JhengHei；灰燼護航使用系統字體 | 系統第三方標準字型保留；本作標題採 serif、領航字距、潮汐色票形成識別。不新增外部字型下載，不宣稱字型獨家 |
| 音效 `playTone`／Web Audio | 機械識別字掃描未命中其他同名自訂函式；各遊戲仍可能都使用合成音 | 保留本作潮浪三段音效；音量／靜音文字改繁中。未做全曲音訊相似度比對；BGM_URL 仍為 null，沒有假稱配樂完成 |
| `offline.html`、`sw.js` | PWA 離線／快取是標準 API；不代表模板無風險 | 離線頁改裂潮港口識別且有返回按鈕；修正 query 頁面回退與 Promise 短路，真離線完成試航 |
| `SKILL.md`、`art-config.json`、`templates/` 結構 | 無盡塔防、陽光農場等也有 skill／美術設定工作流 | 是歷史共用製作架構，照實保留揭露；不把移除檔名當重大改變。未證明商店產物排除哪些開發檔，換包時必查 |
| native-kit 的 Capacitor shell | 多款網頁遊戲採共通 Capacitor 包裝 | 標準第三方框架，保留並揭露；版本與打包不是遊戲差異。native-kit 唯讀，本輪未重包 |

通用殘留檢查：玩家頁面未留 Lorem ipsum／TODO／Sample／敬請期待；`archLoremaster` 是大博學者的合法卡牌識別字，保留。舊英文音效提示已改「音效／靜音」，STEP 改「第 1／3 步」。AI、PWA、FPS 與品牌 TIDEREND 是技術／專有名稱；效能設定保留使用者功能，數字診斷只屬設定資訊，未新增開發者除錯面板。既有自動測試掛鉤不作為審查路徑或截圖來源。

限制：未做所有程式 AST 同源分析、聲學指紋或最終 IPA／AAB 解包比對。因此不能用本表證明 4.2.6 已解決。原生素材權利、開發者內容提供者身分仍需發行者核實。
