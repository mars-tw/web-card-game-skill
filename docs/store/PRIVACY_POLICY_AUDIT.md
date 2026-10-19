# 隱私與資料安全核對

2026-10-15。來源靜態稽核與本機 Chromium 請求紀錄 VERIFIED；最終原生包及商店當前狀態 BLOCKED（本輪禁止操作商店／修改 native-kit）。

## 實際資料行為

本輪正式審查路徑的所有請求都留在同一個本機站台，沒有外部網域請求。`review-path.json` 保存 errors／external 結果。原始碼未發現分析、廣告、遠端追蹤、WebSocket、sendBeacon 或使用者資料 POST。這是受查來源及測試路徑證據，不代表已動態解包測過最終 IPA／AAB。

| 網路／儲存 | 用途與資料 |
|---|---|
| 同源 HTML、JS、CSS、卡圖、場景、圖示、manifest | 遊戲素材載入；網頁版首次連線需下載。原生應內包素材。沒有把收藏或對局當請求 payload |
| 同源 `sw.js` fetch／registration.update | 網頁版檢查版本及離線快取，不是遙測。Service Worker 只攔截同 origin GET |
| 根入口的 og:image／canonical／og:url | 同產品公開分享 metadata；不是遊戲執行的自動第三方追蹤請求 |
| localStorage | 既有收藏、牌組、戰績、目標、章節、星級、航程、文字／音效／難度；新增 `card_tide_session_v1` 對局檢查點與 `card_tide_trial_v1` 試航完成。資料不傳開發者 |
| sessionStorage／Cache API | 更新重載守衛與素材快取；同裝置使用 |
| Web Audio | 本機合成音效，不錄音，不請求麥克風。BGM_URL=null |
| 匯出／匯入 | 玩家主動複製自己的存檔；本輪無帳號、付費、廣告、遠端排行或聊天 |

已移除遊戲頁跨產品外連。港口隱私視窗可離線讀取並返回，沒有外連、評分或購買。本作不是工作單指定的兒童教育類；仍未加入任何第三方分析或廣告 SDK。

## iOS 原生清單（唯讀）

讀取 `game-store-publisher/native-kit/apps/web-card-game-skill/ios/App/App/PrivacyInfo.xcprivacy`：

- `NSPrivacyTracking=false`。
- `NSPrivacyCollectedDataTypes=[]`。
- `NSPrivacyAccessedAPICategoryUserDefaults`，reason `CA92.1`。

同 app 的 dependencies 為 Capacitor core／iOS／Android 8.5.2、App 8.1.2、Preferences 8.0.1；所見未含分析／廣告套件。UserDefaults 宣告與只把設定留在 app 的設計一致；需要以新簽章包確認最終合併 manifest 與實際 API 使用，不能只靠這份 XML 宣稱原生隱私驗收完成。官方參照：[Apple required reason API](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api)。

原生 metadata：nativeVersion=1.0.0，build=1，web-payload source_head=d690b88ea23333d53d9126c51127ded6b24b4927，與本輪 0.7.0 來源不一致。capacitor.config 沒有 remote server URL，Android release debugging=false；AndroidManifest 未宣告相機、位置或麥克風。未修改這些檔案。

## Google 資料安全

唯讀檢視本機 `game-store-publisher/output/google-card-data-safety-saved.png`：畫面是「裂潮卡牌」，預覽顯示不會收集資料、不與第三方分享；彈窗明示「變更已儲存」，需到發布總覽送審。這是歷史本機截圖，不是本輪讀回 Google Play 當前狀態。其 no collection／no sharing 與受查程式一致；不能據此宣稱已發布或新包已核對。

既有 `output/store-pages/web-card-game-skill/privacy.html` 說明本機收藏、無帳號／廣告／分析／真實金錢購買；本輪新增本機潮汐試航及檢查點，正式政策頁下次更新應補充這兩項。玩家主動寄客服信的資料不由遊戲自動送出。官方說明：[Google Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)。

## 缺件

BLOCKED：新 IPA／AAB 的 SDK 與隱私清單合併檢查、實機網路觀察、原生背景／終止恢復、最新版商店宣告證據，以及正式政策頁更新。這些都沒有用寫草稿或舊截圖冒稱完成。
