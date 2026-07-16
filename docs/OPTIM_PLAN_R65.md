# 裂潮卡牌 R65 全面優化計畫

- 輪次代號：card R65
- 依據：`game-optimization-round` 固定派工技能、`AGENTS.md`、`docs/AUDIT_full.md`
- 版本目標：由 0.4.10 bump 至 R65 出貨版本

## 八大面向驗收清單

1. 美術：本輪不重做卡圖；驗證既有卡圖與 UI 證據不回歸，缺圖不宣稱完成。
2. 按鈕：補齊手牌、場上卡、英雄、牌包與主題選項的鍵盤／輔助科技路徑，保留 44px 觸控守門。
3. 選單：匯入／存檔流程改為可驗證與可回復；失敗明示，不讓玩家誤以為已保存。
4. 人物：不更動人物資產；以現有卡圖／縮圖守門確認不回退。
5. 地圖模型：卡牌遊戲無 3D 地圖模型；驗證戰場／卡包背景主題素材不回退。
6. 技能：既有 WebAudio SFX 補上音量設定，覆蓋出牌、攻擊命中、受傷、勝敗、開包與 UI 操作。
7. 角色樣子：不新增角色；跑品質閘門與既有圖像證據，若素材缺件則列明。
8. 動作流暢度：攻擊改成 anticipation → active impact → recovery，傷害、浮字、死亡標記與 render 只在 impact 幀後發生。

## Top5 對應實作

1. 傷害命中幀結算
   - 重排 `templates/card-battle/battle.js` 的攻擊流程。
   - `animateAttackToward` 提供 impact callback／Promise；`Core.resolveAttack`、`floatDamage`、`markDying`、`render` 僅在 active impact 後執行。
   - 揮空、閃避、護盾、死亡都保留完整攻擊動畫與正確視覺因果。
   - 更新 E2E：impact 前血量與傷害浮字不變，impact 後才更新。

2. 新手教學示範卡注入
   - 教學示範卡不可增加正常 20 張牌資源。
   - 改成從牌庫移至手牌或使用固定教學牌組狀態，並保證換牌／跳過後 hand + deck 維持 20。
   - 補首玩、換牌、跳過、教學指定卡出牌的狀態測試。

3. 鍵盤與輔助科技路徑
   - 戰鬥卡牌、己方／敵方英雄、場上卡補 `role`、`tabindex`、狀態 aria 與 Enter／Space 操作。
   - 卡包首頁 pack、主題選項與篩選 chip 保持可聚焦、可用鍵盤操作。
   - 擴充控制守門：純鍵盤可選手牌、選攻擊者、選目標、進入卡包與切換主題。

4. 匯入與存檔寫入可驗證可回復
   - 新增集中 storage helper：寫入後讀回驗證；失敗丟出明確錯誤。
   - 匯入先完整 decode／schema／合法性驗證，再 staging 寫入並讀回，最後 commit 多 key；失敗時從 backup 回滾並回報。
   - 空 catch 改為可見 toast／狀態訊息，避免靜默遺失進度。
   - 補匯入成功、格式錯誤、commit 中途失敗回滾測試。

5. 技能音效與音量
   - 既有程序化 WebAudio 保留，新增共享音量設定 key 與 slider/select。
   - SFX 種類覆蓋出牌、攻擊命中、受傷、勝利、失敗、開包、翻卡、稀有、UI。
   - 音量設定持久化，靜音與音量狀態同步到 battle／pack。

## 固定閘門

- `npm test`
- `npm run test:e2e`
- `npm run test:rwd`
- `npm run test:controls`
- 效能 p95 三跑中位，桌機與手機視口，目標 ≤18ms
- 秘密掃描：排除 `.git`、`node_modules`，零命中
- 版本 bump 並確認舊版號在出貨檔歸零
- before/after 與三視口截圖寫入 `docs/evidence/R65/`
- 產出 `docs/CODEX_RESPONSE_card_R65.md`
- 本地 commit，繁中訊息，不 push
