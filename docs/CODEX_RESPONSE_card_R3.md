# Codex Response - card-battle R3

版本：card-battle-r54-v1  
結論：必修項已採納並修正；非必修項依風險分批處理。未執行 git commit / git push。

## 必修決議

- `nextSpellMinus1` 採產品定案：本回合有效，回合結束即失效。`voidTithe` 卡面與 log 已補「本回合」。測試鎖定同回合折扣與跨回合失效。
- `buffAdjacent1` 亡語架構債已修：`cleanupSide` 在移除死者前捕捉左右鄰居物件，亡語結算時只 buff 仍在場且存活的原相鄰友軍；`indexOf === -1` 路徑有防禦事件，不再誤 buff `field[0]`。
- 靜默規則定案：靜默移除關鍵字、聖盾與 trigger，包含亡語；已補卡面、關鍵字說明與死亡後不觸發亡語測試。
- `DECK_SIZE = 20` 未改；未新增嚴格優勢/劣勢卡。

## R3 逐條回應

| 編號 | 處理 | 回應 |
|---|---|---|
| E-R3-1 | 採納，已修 | `nextSpellMinus1` 改為回合結束清除。新增 `spellDiscountExpired` 事件；`test-core.js` 覆蓋本回合有效與跨回合失效。 |
| E-R3-2 | 採納，已修 | `logDeathrattleSummon` 補通用亡語召喚 log，`summonTwo1_1` 產生的灰鈴侍從不再靜默無 log。 |
| E-R3-3 | 採納，已修 | `battle.js` 的傷害估算與 log 改讀卡牌 `baseDamage` / `tauntBonusDamage`；冰針對非嘲諷顯示 1 傷，對嘲諷顯示 2 傷。AI 目標估算同步。 |
| E-R3-4 | 記錄，暫不改 | 第二張 `voidTithe` 吃前一張折扣後再建立新折扣，符合「下一張法術」語意；不做疊加，避免形成爆發儲值。 |
| E-R3-5 | 採納，已修 | 亡語 `buffAdjacent1` 使用死亡前鄰居物件，不依賴塌縮後 index；補回歸測試。 |
| E-R3-6 | 採納，已修 | 靜默後死亡不觸發亡語已成規則測試。 |
| E-R3-7 | 延後 | 斥候戰吼已有 battlecry 與 silence 浮字；獨立名句 log 屬 UI polish，非本輪正確性風險。 |
| A-R3-1 | 延後 | AI log 語氣一致性不影響規則或測試守門；保留為後續文字清理。 |
| A-R3-2 | 記錄，暫不改 | Scarra 的 `faceBias` 在現行 E2E 與 sim 下穩定；本輪不改 AI personality，避免平衡變因混入規則修。 |
| A-R3-3 | 記錄，暫不改 | 控制 AI buff 嘲諷偏好屬策略調校；目前不影響合法性或 crash。 |
| A-R3-4 | 記錄，暫不改 | `faceBias` 閾值調整需另跑 AI 方法學驗證，本輪不混入。 |
| P-R3-1 | 延後 | pity export/import 韌性是存檔完整性增強，非本輪核心對戰阻斷；現有 E2E 已覆蓋 pity 累積與強制 rare+。 |
| P-R3-2 | 延後 | 潮鑄分解值目前沿用稀有度經濟模型；若要差異化需重新定經濟表。 |
| P-R3-3 | 延後 | 多分頁 pity 競態屬低頻本地儲存競態，留待存檔層統一處理。 |
| P-R3-4 | 記錄，暫不改 | `tide_3` reward=0 是刻意控制總增發，避免超過里程碑經濟上限。 |
| S-R3-1 | 記錄 | sim 仍定位為 CI 守門，不宣稱精準 meta 預測；本輪使用它驗證新卡未超出 ±5pp。 |
| S-R3-2 | 記錄 | sim AI 與 runtime AI 不完全同構，結論只作相對風險掃描。 |
| S-R3-3 | 延後 | 靜默進 sim 方法學可另開，避免本輪同時改模型與被測規則。 |
| S-R3-4 | 部分採納 | 已修 runtime/UI 傷害估算讀卡牌資料；sim 方法學備註保留。 |

## 平衡結果

`node scripts/test-balance-sim.js` 已由 `npm test` 跑過：

- Seeds per card: 240；paired games per card: 480。
- Pool mean: 47.33%。
- `voidTithe`: 42.71%，delta -4.63pp；one-copy 46.04%，must-have -3.33pp。
- 結論：仍在 ±5pp 內，不調數值。

## 版本同步

- Runtime cache: `sw.js` `CACHE_VERSION = "card-battle-r54-v1"`。
- Shell / battle / pack HTML 與 script query 都使用 `card-battle-r54-v1`。
- SW auto reload key 同步為 `card_sw_auto_reload_r54_v1`。
- `package.json` / `package-lock.json` 版本同步到 `0.4.5`。
- runtime/test grep：`index.html templates sw.js package.json package-lock.json scripts` 無 `r51` 命中。

## 守門結果

- `npm test`：PASS。
- `node scripts/test-battle-e2e.js`：PASS，連跑 2 次。
- `node scripts/test-rwd-matrix.js`：PASS，27 個頁面/視口全數零違規。
- 文案品質守門：繁中無 mojibake。
