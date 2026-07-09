# Codex 對 Grok R1 的工程回應

日期：2026-07-09  
本輪版本：card-battle-r49-v1  
範圍：修正正確性 P0、可安全落地的 P1、小幅平衡與文件同步。不做 git commit / push。

## 本輪處理摘要

- 採納 C-P0-1：對戰牌庫統一為 `Core.DECK_SIZE`，fallback 與 easy AI 不再產生 24 張牌。fallback 補牌也遵守同名 2 張、傳說 1 張。
- 採納 C-P0-2：`core.js` 引入遞增疲勞。第 n 次空抽對該方英雄造成 n 點傷害，送出 `fatigue` 事件，由 battle UI 顯示並在既有結算流程判定勝負。
- 部分採納 C-P0-3：本輪先不做互動式 `pendingBattlecry`。`damageAny1` 保持自動命中生命最低敵方隨從，卡文與 core 測試同步鎖定此契約。
- 採納 B-P0-1 的明確嚴格優勢組：調整 `emberVolley`、`arcaneVeil`、`frontScout`、`thunderRoc`，並加資料測試防回歸。
- 採納低風險 AI P1：風怒斬殺估算計入第二擊；easy/random AI 可合理使用 `polymorph` / `giveShield`。
- 採納文件同步：`cards.js` 註解改指向 core，`references/data-model.md` 對齊目前 stats version、74 張卡、編年史、里程碑與週任務。
- 版本同步：PWA cache / 三頁 script query / inline cache version / SW reload key / tests / package version 已同步到 r49。

## P0 / P1 正確性

| ID | 結論 | 技術理由與處理 |
|---|---|---|
| C-P0-1 | 採納 | `battle.js:buildDeck` 改用 `Core.DECK_SIZE`，easy AI 同步為 20 張。新增開局斷言：雙方 `hand + deck === Core.DECK_SIZE`。E2E 覆蓋 saved / fallback / easy AI / hard AI。 |
| C-P0-2 | 採納 | `drawCardInternal` 空庫不再靜默，改為遞增疲勞並推送 `fatigue` 事件。`drawCard1`、`draw2`、回合抽牌共用同一路徑。core 測遞增與空庫分勝負。 |
| C-P0-3 | 部分採納 | 互動式戰吼會牽動 `pendingSpell` 平行狀態、點擊模型、AI 出牌與取消流程。本輪熱修先把卡文改為「自動對生命最低的敵方隨從」，並加 core 測試鎖定自動目標。互動式指定留到下一輪完整設計。 |
| C-P1-1 | 採納 | AI 斬殺估算改用 `heroAttackPotential()`，風怒且尚未用第一擊時以兩次英雄攻擊計算。 |
| C-P1-2 | 採納 | random/easy AI 分支補上 `polymorph` 與 `giveShield` 的合理目標選擇。 |
| C-P1-3 | 部分採納 | 問題成立，但目前卡池沒有需目標亡語。先維持現況，後續若新增需目標亡語，應先資料化 trigger 需求或加 gate 禁止。 |
| C-P1-4 | 部分採納 | 結算時序議題成立，但改為死亡佇列會影響亡語巢狀行為與既有測試。本輪不重寫核心時序。 |
| C-P1-5 | 採納 | 對戰組牌與 Mulligan 洗牌改走 `rng()` 包裝，不再在這兩條 gameplay 路徑直接用 `Math.random()`。動畫粒子與測試 UID 仍是非規則隨機，不影響重播規則。 |
| C-P1-6 | 部分採納 | `makeUid` 在極端 rng 退化下仍可能碰撞。這是有效風險，但需導入 `uidSeq` 或狀態遷移策略；本輪未改，以免擴大 core 狀態面。 |
| C-P1-7 | 採納 | fallback 補牌現在檢查同名上限與傳說上限；隨機補牌若 guard 未補滿，會從全卡池合法補足。 |
| C-P1-8 | 部分採納 | 戰吼傷害來源語意有效，但目前無戰吼劇毒卡，吸血已用現有來源處理。保留後續 effect 資料化時一起修。 |

## P2 正確性

| ID | 結論 | 技術理由與處理 |
|---|---|---|
| C-P2-1 | 部分採納 | combo 目前是 UI/任務型訊號，不是規則關鍵字。本輪不移除，避免破壞既有提示與測試。 |
| C-P2-2 | 部分採納 | `polymorph` runtime flag 清理屬狀態整潔議題，非本輪 P0。後續可與 UID / cloneState 一起做。 |
| C-P2-3 | 部分採納 | `mana2` 超過上限目前是設計行為。本輪不改平衡規則。 |
| C-P2-4 | 部分採納 | 同時致死規則需產品定義。現有結算仍維持敵方先歸零則玩家勝。 |
| C-P2-5 | 採納 | `references/data-model.md` 已同步 stats version、卡池數、里程碑、週任務與編年史。 |

## 效能

| ID | 結論 | 技術理由與處理 |
|---|---|---|
| P-P1-1 | 部分採納 | DOM diff 或 AI 批次 render 會改動大量 UI 結構。本輪以正確性為主，未處理。 |
| P-P1-2 | 部分採納 | 搜尋 debounce 有價值，但屬 pack UI 體驗優化。本輪不擴大範圍。 |
| P-P2-1 | 部分採納 | `cloneState` 對未來 AI 搜索有用，但目前 AI 不搜樹。本輪不導入新 API。 |
| P-P2-2 | 部分採納 | 收藏列表 dirty update / virtual list 暫不處理，目前 74 張規模守門可接受。 |
| P-P2-3 | 部分採納 | `getCardById` Map 化可做，但 74 張線性查找不是本輪瓶頸。 |
| P-P2-4 | 部分採納 | perf monitor 節流可後續做，本輪不碰跨頁效能監控。 |

## 架構

| ID | 結論 | 技術理由與處理 |
|---|---|---|
| A-P0-1 | 部分採納 | effect 資料化方向正確，但會同時改 core、AI、卡牌資料、測試掛鉤。本輪不做大重構。 |
| A-P1-1 | 採納 | `cards.js` 註解已改為 core 規則來源與 74 張卡池現況。 |
| A-P1-2 | 部分採納 | `CARD_TYPE` / `cloneCard` 雙重真相存在，但拆共享 module 會影響 browser script 載入順序。延後。 |
| A-P1-3 | 部分採納 | 陣營目前是敘事 / UI / 編年史資料。本輪不新增規則 hook。 |
| A-P1-4 | 部分採納 | AI / hint / template score 共用化合理，但屬中型重構。本輪只修明確 AI bug。 |
| A-P1-5 | 部分採納 | 測試掛鉤仍保留相容層。真正規則已委派 core，直接改掛鉤 API 可能破壞 E2E。 |
| A-P2-1 | 部分採納 | 既有 `test-cards` 已擋未知 keyword 與缺 trigger。本輪未新增 trigger needsTarget schema。 |
| A-P2-2 | 部分採納 | token 資料表化可做，但目前 token 只有少數固定規則，非本輪熱修。 |
| A-P2-3 | 部分採納 | meta progression 從 core 拆出可維護性較好，但會大幅改匯出 API。延後。 |

## 平衡 / AI

| ID | 結論 | 技術理由與處理 |
|---|---|---|
| B-P0-1 | 採納 | 消除本輪點名嚴格優勢：`emberVolley` 1→2 費；`arcaneVeil` 2→1 費；`frontScout` 2/1→2/2；`thunderRoc` 3/4→2/4。新增 `test-cards` 回歸檢查。 |
| B-P0-2 | 部分採納 | AI 收藏公平是產品難度設計，不適合混入 P0 熱修。本輪先保證 AI 牌庫張數與構築上限公平。 |
| B-P1-1 | 部分採納 | 疲勞已落地，控制鏡必定收束。再生數值另案觀察。 |
| B-P1-2 | 部分採納 | 快攻工具過剩屬整體 meta 調整。本輪只修明確嚴格優勢配對。 |
| B-P1-3 | 部分採納 | 法強軸上限偏低需要新增或改造法術套件，本輪不新增效果。 |
| B-P1-4 | 部分採納 | 1-ply 出牌搜索需要 clone state 支援。延後到 cloneState / effect 資料化後處理。 |
| B-P1-5 | 部分採納 | 變形與 AOE 重複問題成立，但本輪只處理 P0 點名的嚴格優勢。 |
| B-P1-6 | 部分採納 | `runicScrivener` 軸線議題成立，但會影響 archetype 判定與歷史統計解讀。本輪不改。 |
| B-P2-1 | 部分採納 | hard 數值難度是否過陡要等疲勞與牌庫公平上線後重測。 |
| B-P2-2 | 部分採納 | DDA 牌庫調整需產品策略，本輪不碰。 |
| B-P2-3 | 部分採納 | 開包權重與重複卡體感需較大平衡輪。本輪只消除明確支配關係。 |
| B-P2-4 | 部分採納 | 教學擴充有價值，但不屬本輪正確性修補。 |

## 測試缺口回應

| 場景 | 結論 |
|---|---|
| 開局 `deck + hand = DECK_SIZE` | 已補 E2E：saved、fallback、easy AI、hard AI。battle runtime 也有開局斷言。 |
| 空庫 draw 疲勞 | 已補 core：`drawCard1`、`draw2`、回合抽牌遞增疲勞。 |
| 雙方空庫必分勝負 | 已補 core：雙方空庫輪抽會由疲勞分出勝負。 |
| 戰吼 `damageAny1` 目標 | 已補 core：目前規格是自動命中生命最低敵方隨從，忽略外部 `targetUid`。 |
| 風怒 AI 斬殺 | 已修估算。現有 E2E AI 回合連跑三次未卡死。後續可加更窄的 deterministic AI lethal 測試。 |
| 嚴格優勢靜態分析 | 已補 `test-cards` 針對 Grok 點名配對的回歸檢查。 |

## 驗證結果

- `npm test`：通過。
- `node scripts/test-battle-e2e.js`：連跑 3 次通過。
- `node scripts/test-rwd-matrix.js`：通過。

版本檢查：目前 app / tests 的舊版 cache version 與舊 SW reload key 已移除；原始 Grok 報告仍保留被審版本文字作為歷史輸入。

## 與 Grok 不同之處

- Grok 建議互動式 `pendingBattlecry`。本輪選擇先文案一致，理由是 UI pending 模型與 AI 出牌牽動較大，熱修風險高。
- Grok 把 effect 資料化列為架構 P0。本輪認同方向，但不把它混入 r49 正確性修補。
- Grok 提到 AI 收藏公平。本輪只修「張數與構築契約公平」，不改難度產品策略。
- Grok 點到 data-model 漂移，本輪一併修文件，降低後續貢獻者誤判。
