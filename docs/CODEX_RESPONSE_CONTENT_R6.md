# 裂潮卡牌｜新內容第 6 輪

版本 **0.19.0**，PWA **card-battle-content-r6-v1**。狀態：**VERIFIED（本機功能、截圖、素材與測試；E2E 修復後分段驗證）**。外部缺件仍列 BLOCKED。只在本 repo `main` 本機執行，未推送、部署、商店操作、發訊息或委派。沒有讀取秘密目錄。原有未提交文件保留並以 SHA-256 對照。

## 三項內容與入口

1. **六道潮汐殘局**：港口同名入口、五站同名按鈕、研習第一分頁。選友軍後，卡下列目前／預覽血量、退場者、我方潮能及交換箭頭；可按確認交換或直接點目標，取消不改盤面。六題正常遊玩隱藏題名，用陣亡蓄潮、聖盾、弓手與狼、嘲諷、火焰箭、雙線交換辨認。法術題加入真實待命鹽盾侍從，仍須以法術壓血、漲潮收尾。失敗可立即重試，六題完成計數與複驗分開保留。
2. **潮汐預報**：港口／研習第二分頁為固定短局，五站保留一般預報對戰。只問「要反轉哪一回合？」；按住先看該回合直接後果，放開套用、移出或 pointercancel 取消。前三回合公開、一局反轉一次。觀潮台可用方向為主要選項，另一方向收小；方向不符時確認鈕呈灰色、虛線框與「目前不可用」，原因就在上方，不消耗潮能或反轉。第四回合兩方向恢復可用。
3. **茉恩的退潮考驗**：港口／五站／研習第三分頁。大立繪與一句台詞登場，結束整備後，三張不同姿勢依整備、抬手、舉手命中切換，退浪後回復整備。護航線連到騎士，中央常駐橫幅移除。浪花只接觸卡腳，卡名與攻血可讀；盾留在卡角，裂開後顯示小型「聖盾已破」。延誤仍會真正失去見習士兵，依序拆盾、削血、反攻可完成。這是手工腳本，沒有冒稱通用 AI。

## Muse 五項驗收與原尺寸截圖

所有 `phone-*.png` 在 `docs/content/r6/`，為無頭 Chromium 真實 DOM 操作的 **390×844、DPR 1 原尺寸 PNG**，沒有注入戰局、拼接或縮放。卡牌正式名稱以實際資料「鋼鐵騎士」為準，與審查文字的「鋼鎧騎士」指同一張 3 攻 4 血卡。

| 驗收項目 | 實作與對照證據 |
|---|---|
| 1．交換下手前可預判 | `phone-exchange-before.png` → `phone-exchange-preview.png` → `phone-exchange-cancelled.png` → `phone-exchange-confirmed.png`。兩名友軍均顯示目前／預覽血量；逐 UID 比對取消前後生命、盾、位置、潮能完全相同。確認後士兵退場、敵弓手 1 血、我方潮 6，與預覽一致。實際卡位留空，預覽不搬動根節點。詳 `acceptance.json` 的 exchangeProofs。 |
| 2．預報狀態一致、單一焦點 | `phone-forecast-wrong-direction.png` 的確認鈕明確不可用，原因同屏；`phone-forecast-allowed-direction.png` 切回合法方向恢復。錯誤操作前後潮能／反轉完全一致。`phone-forecast-before.png` → `phone-forecast-held.png` → `phone-forecast-applied.png` 補上按住與放開的形成過程；移出取消也有自動斷言。`phone-forecast-fourth.png` 為實際第四回合。 |
| 3．茉恩主體與保護關係 | `phone-moen-entrance.png` 大立繪登場；`phone-moen-preparing.png` → `phone-moen-impact.png` → `phone-moen-guarding.png` 為同尺寸整備／舉手命中／留守。人物、同一騎士及護航線同屏，無中央橫幅；命中時卡名與 3 攻 4 血完整可讀。 |
| 4．盾裂保留卡框 | `phone-moen-shield-before.png` → `phone-moen-shield-impact.png` → `phone-moen-shield-after.png`。同 UID、同一張鋼鐵騎士，均 3 攻 4 血；碎盾縮在卡角，四邊卡框、頭像與卡名可見。精選以留守圖兼破盾前，避免近重複圖片占額度。 |
| 5．六道無題名盤面 | `phone-puzzle-fallen-playing.png`、`phone-puzzle-shield-playing.png`、`phone-puzzle-shelter-playing.png`、`phone-puzzle-taunt-playing.png`、`phone-puzzle-spell-playing.png`、`phone-puzzle-cross-playing.png`。正常遊玩即不顯示題名，均有真實敵我單位、機制訊號及目標；六題都實際操作到完成並重載確認。人工盲辨尚待 Muse 執行，沒有自稱已取得人類判讀結果。 |

精選集固定 **15 張**：`docs/content/r6/review-set/01-…15-*.png`，六題 6 張、預報 4 張、茉恩 5 張。07–09 為反轉三格；11–13 為施法三格，13–15 為破盾三格。第 13 張同時證明留守與破盾前，兼顧六題必備圖與動態連續證據。`review-set-index.json` 記錄原圖來源與 SHA-256，精選為原始 PNG 位元組副本。

審查曾標未見證據的補件：拖延前後為 `phone-moen-delay-before.png`／`phone-moen-delay-after.png`，真離線遊玩／完成／離線重載為 `phone-moen-offline-playing.png`／`phone-moen-offline-completed.png`／`phone-moen-offline-reloaded.png`。這些完整因果補件另存本輪原圖，15 張精選以五項驗收為優先，沒有宣稱精選已涵蓋所有測試畫面。

新增商店截圖：`docs/store/screenshots/content-r6-moen-1290x2796.png`、`content-r6-moen-2064x2752.png`，是對應視口與 DPR 實玩截圖，未刪舊圖。

## 測試與量測

- 單元與素材：npm test；本輪純預覽 25 項，涵蓋六題真實盤面、預覽不變更來源、投影等於 Core 實際結果及三張不同姿勢雜湊。
- 瀏覽器：本輪已實玩完成三項內容、六題失敗重試、重載／匯出入、錯誤方向與移出取消、拖延失去士兵、真斷網完成與重載。最終檢查數讀 `docs/content/r6/acceptance.json`。
- 完整 `npm run test:e2e` 首次在 R1 橫向手機案例失敗：交換預覽的取消鈕擋到敵卡。短橫向改為下方獨立操作列，保留原斷言；已通過的前 13 支不重跑，失敗的 R1 與其後 R2–R5 逐支重測，18 支全數通過，見 `e2e-constituents.json`。原始失敗紀錄保留在 `e2e-final.txt`，沒有冒稱原鏈首次就全綠。
- `npm test`（含本輪 25 項規則與新人物 source/runtime 色彩 gate）及 RWD 11 視口 × 3 頁、共 33 組合全過。原始／修復後退出碼在 `test-exits.json`、`recheck-exits.json` 與 `latest-exits.json`。本輪瀏覽器 84 項，另有 6 項最終破盾演出檢查。
- `frame-times.json` 是共用機器並發載下桌機／手機各三跑、240 個 rAF 間隔的 p95 中位；僅供參考，不代表實體裝置、GPU 執行時間或乾淨機況出貨效能。
- 定稿施法量測：桌機 **16.8ms**、手機 **16.8ms**，均 ≤18ms。曾有桌機 33.3ms 波動，原始失敗收據保留；縮小茉恩浪牆繪製範圍並移除全幅遮罩後，最終三跑全部符合。此為 VFX 範圍優化，沒有改傷害時點或關閉效果。
- CI 慢網路 gate 最終也通過：Fast 3G／4× CPU 三跑背景就緒中位 **2968.1ms ≤3000ms**，互動 **7673ms**，既有 frame p95 **16.7ms**。先前超標紀錄保留；隱藏內容樣式改為非阻塞、降低預載優先序。曾嘗試的戰場圖預載使結果更差，已撤回，未放寬斷言。最終以 `confirmation-gates.json`、`performance-confirm.txt`、`frames-confirm.txt`、`effects-confirm.txt` 為準。
- 原圖／runtime 雜湊、原生 alpha、截圖尺寸、版本、語法與秘密掃描在 `verification.json`；既有文件恢復與保留在 `preservation.json`。
- `docs/evidence/content-r6/` 另存三組前後對照與手機橫向／iPad 圖。before 為 R5 歷史原圖的逐位元組副本，沒有冒稱本輪重拍，來源與雜湊見 provenance.json。

## 美術、文案與限制

新增 **1 張定稿生成圖集、3 張執行期姿勢裁圖**，實際工具 `image_gen.imagegen`，模型識別未提供。共 3 次工具呼叫：生成、整備格補光、透明背景修整；只採用最後定稿，未採用稿留在本機稽核暫存。原圖 `docs/art/source/content-r6/moen-poses.png`；提示詞、裁切及來源雜湊見 `PROMPTS_CONTENT_R6.json`／`ASSET_MANIFEST_CONTENT_R6.json`。同既有 R76 HSV 演算法，原圖與三張壓縮 runtime 全通過亮度／飽和度／近黑／低飽和雙閘門，見 `art-gates.json`；沒有以 CSS 濾鏡冒充原圖通過。美術補充 `ART_DIRECTION_CONTENT_R6.md`。盾與浪花沿用既有生成畫作。

文案 mode 2 摘要：「觀察未來三回合，決定哪一回合需要反轉」過於抽象，改為「要反轉哪一回合？按住預覽，放開套用」；「確認施放」在錯誤方向仍像可按，改為「目前不可用 · 方向不符」；常駐大幅「茉恩的退潮考驗／機制說明」移為短狀態「茉恩 · 聖盾留守」，完整規則保留目標入口；README 舊「本輪沒有新增畫作」已依實際新增來源更新。

**Apple 4.3 風險：高。** 六題戰術、單次預報反轉與茉恩護航增加本作互動識別，但整體仍是常見卡框／攻血對戰形式，尚無新版全陣容盲測或 Apple 審查結果。沒有新增廣告、付費、外部連結、SDK、帳號或線上依賴，MIT 與離線能力維持。

**BLOCKED**：實體手機／iPad 觸控與效能需實體裝置；真人／親子試玩需受測者；乾淨機況效能需獨占測試時段；Muse 8 分以上需審查員實際複審。隨從攻擊／受傷／死亡正式姿勢幀仍缺，保留可替換 CardPosePlayer，本輪不冒稱完整人物動畫。茉恩只補三個施法姿勢及回復，不宣稱完整骨架、走路或完整受傷／死亡動畫。
