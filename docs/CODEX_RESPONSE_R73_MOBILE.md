# 裂潮卡牌 R73 手機優化報告

日期：2026-10-15。版本：`0.6.0`／PWA `card-battle-r73-v1`。基準：`8329eed`。只處理本 repo；全程背景／headless，僅本機 commit。

## 本輪成果

| 計畫 | 狀態 | 可玩結果與證據 |
|---|---|---|
| M1 安全出牌 | VERIFIED | 手機點牌先預覽完整費用、效果、關鍵字；確認才走原出牌規則。法力不足不可確認；重複事件只結算一次；法術保留原目標確認。`after/preview-390x844.png`、`after/preview-844x390.png`、`mobile-test.json` |
| M2 拖曳與取消 | VERIFIED | 垂直上拖至己方場地顯示合法落點，放開後先預覽；橫滑保留看牌，pointercancel／多指中斷零消耗。改轉向、切到背景或離開預覽也會取消。Chrome DevTools 觸控協定實跑，詳見 `e2e.log`。此為卡牌 UI 拖曳，不是人物動畫。 |
| C1 五站歸航 | VERIFIED | 白潮→荒野→殘響→霜牙→長暮，難度由簡單進入普通。新增霜牙／長暮兩套 AI 牌組、潮汐親和、關卡劇情與打法提示；前站首勝才開下一站，敗場不推進，重挑不重複解鎖。`after/frost-battle-*.png`、`after/staged-result-*.png`、純規則測試與正式 AI 回合測試 |
| C2 牌組與進度 | VERIFIED | 20 張荒野突襲起始試用；通過第 1／3 站解鎖白潮列陣／殘響詠潮。列出完整卡表與玩法，可改用原收藏牌組；不覆寫收藏及原牌組。航程進度加入完整存檔與回滾流程；舊存檔缺航程欄位時保留目前進度。`after/unlocked-deck-*.png`、匯出／匯入及重載 E2E |
| C3 控制與引導 | VERIFIED | 確認／取消、航程關閉／切站／開戰固定且 ≥44px，手機直橫向皆可用。橫向更多選單改三欄；航程結算改雙欄，所有 CTA 不截斷。新局收起舊手牌抽屜；教學補上手機確認步驟。`controls.log`、`rwd.log`、新控制中心 hit-test |

卡池仍為既有 92 張；本輪增加可挑戰的對手組合與試用／解鎖路線，未新增單卡或改動卡牌數值。自由對戰沿用三位原對手與原收藏構築流程。

## 驗證

最終結果與量測彙整於 `docs/evidence/r73-mobile/verification.json`。所有新測試已接入 `npm test`／`npm run test:e2e`，CI 原指令不變。

| 指令 | 結果與範圍 |
|---|---|
| `npm test` | VERIFIED：既有 cards、core 154/154、quality、balance、R67 visual 全綠；新增 voyage 48/48。`npm-test.log` |
| `npm run test:e2e` | VERIFIED：既有對戰、控制、R67 browser、R72 與新增 R73 手機流程全綠。新增項目與全量輸出以 `e2e.log`、`verification.json` 為準。 |
| `npm run test:controls` | VERIFIED：230 項控制斷言通過；保留原有斷言，另加手機／鍵盤選牌確認步驟。`controls.log` |
| `npm run test:rwd` | VERIFIED：11 視口 × 3 頁面＝33/33 零違規，含 390×844、844×390、1366×600、1280×640。`rwd.log` |
| `npm run test:r73` | VERIFIED：航程規則 48/48、手機 E2E 127/127；最終補上霜牙／長暮正式 AI 回合與每站全部結算 CTA。`r73.log`。完整 E2E 前一跑新增手機部分為 123/123，後補 4 項以此指令驗證。 |
| 效能腳本三跑 | EXECUTED：既有 `test-r67-performance.js --runs 3 --baseline docs/evidence/R67/before/performance.json --assert --out docs/evidence/r73-mobile/performance.json`。數字與原始閾值結果見 `performance.json`；**並發載量測，僅供參考**。 |
| 版本／秘密掃描 | VERIFIED：非歷史檔案舊 `0.5.0`／R72 revision 零命中；指定秘密 regex 排除 `.git`／`node_modules` 零命中。`version-scan.json`、`secret-scan.json` |

效能實測：Fast 3G＋4× CPU 下可互動三跑中位 **4706.9 ms**、戰場視覺就緒 **1358.1 ms**，既有桌機 frame 取樣 p95 **16.7 ms**。以上全部為**並發載量測，僅供參考**；原腳本數值斷言通過不等於出貨效能閘通過。`performance.json` 的 `working tree (R67)` 是舊腳本標籤，實際量測為本輪工作樹；`verification.json` 保存當次來源 SHA-256。首次量測被隱藏圖未指定來源卡住，修正後重跑；初次失敗保留於 `performance-initial-failure.log`。

新增測試以確定性手牌、血線準備局面；選牌、拖曳、攻擊命中、結算、切站、正式 AI 回合及存檔走正式流程。`staged-result-*` 為明確標示的合成致死局面，不是自然完整勝局證明；新對手尚無真人勝率資料。

原有 E2E 的版本預期同步至 R73；手機原先「點牌立即出牌」改成「預覽→確認」，增加確認前不出牌斷言，沒有刪測試或放寬斷言。效能 HTTP 測試伺服器補正外部 CSS MIME；兩個隱藏預覽圖初始化為既有有效卡圖，維持原「所有圖片載入」斷言。

## 證據與八大面向

- 根目錄：`docs/evidence/r73-mobile/`。before／after 均含 390×844、844×390、1366×600；`battle-*`、`hand-*` 可直接對照；另有預覽、航程、解鎖、霜牙及結算截圖。
- 美術、人物：VERIFIED，沿用正式卡圖與既有對手立繪；`asset-manifest.json` 記錄本輪零新圖、模型 slug 為 null。未將程序化方塊當新素材。
- 按鈕、選單、技能：VERIFIED，對應 M1／M2／C3；原裂潮規則、傷害命中時序測試仍保留。
- 地圖模型、角色外觀：本輪不改原畫與場景檔；沿用 R67 素材 gate，沒有新增 3D 模型。
- 動作流暢度：未製作逐幀／骨架人物動作；舊卡片位移、閃光與 UI 拖曳不能視為合格人物姿勢動畫，列入缺件。
- R67 測試會覆寫其歷史證據；本輪輸出封存在 `legacy-gates/`，原 `docs/evidence/R67/` 已還原至進場內容。封存 JSON 中的原 R67 截圖路徑，對應此資料夾內同名 PNG。

## 未完成、風險與缺件

1. **BLOCKED：出貨效能閘。** 本機有其他線路並發，無乾淨機況三跑，也沒有獨立手機 p95；不得以本輪數字宣稱通過出貨效能。
2. **BLOCKED：獨立 ChatGPT 對話覆核。** DevSpace `chatgpt_list_workers` 實際回傳 MCP `-32603 Internal error`，未派出工作；未切替代模型、未開瀏覽器繞過。此報告只代表本線路實作與本機自動驗證。
3. **PREPARED：真人手機 QA 與新對手長局平衡。** 目前為 headless Chromium 觸控模擬；尚未在實體 iPhone／Android、Safari 或瀏覽器列伸縮環境驗證，也沒有新對手的真人勝率／留存資料。
4. **BLOCKED：新人物姿勢與聲音素材。** 缺逐幀／骨架、hurt／death 素材及可授權背景音樂；未新增角色動作／音樂，`BGM_URL` 維持 null。原有合成音效不變。
5. **VERIFIED：範圍與保留。** 未 push、部署、操作商店或對外發訊息。原有 `docs/audit_openclose/`、`docs/playtest/`、`scripts/audit-oc-r1.js` 保留且不納入 commit。

## 繁中文案（mode 2）

| 原句 | 原因 | 改成什麼 |
|---|---|---|
| 「點手牌中發亮的『迅捷狼』。」 | 手機已增加確認步驟，須避免新手以為點下就召喚。 | 「點手牌中發亮的『迅捷狼』；手機預覽後再按『確認出牌』。」 |
| README「挑戰三位具名 AI 對手」 | 航程新增兩位對手組合，需明確區分入口。 | 「在自由對戰挑戰三位具名 AI，或沿五站航程對抗五位對手。」 |

新增文案直接說明操作、解鎖條件與試用範圍；未加入不實素材、卡牌數量或效能宣稱。
