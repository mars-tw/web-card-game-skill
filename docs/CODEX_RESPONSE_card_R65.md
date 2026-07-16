# card R65 全面優化回報

版本：`0.4.11`  
PWA revision / reload key：`card-battle-r65-v1` / `card_sw_auto_reload_r65_v1`

## 完成項目

- 動作流暢度：`resolveAttack` / 英雄攻擊改為 Promise impact pipeline，規則傷害、`handleCoreResult`、傷害字、死亡標記與 render 都延後到 active impact callback。impact 前只播放前搖/衝刺；揮空、嘲諷、突襲鎖臉等失敗路徑不會先扣血。
- 玩家適應：教學示範 `wolf` 改從現有手牌/牌庫搬移，必要時替換既有資源，不再新增第 21 張牌；補首次導引、略過、重抽與完成三步導引測試。
- 按鈕/無障礙：入口 tab/theme、手牌、場上卡、英雄、牌包加入語意、焦點與 Enter/Space 操作；控制守門覆蓋桌機、手機與橫向觸控。
- 選單/存檔：匯入先完整 decode/migrate/validate deck，再寫 backup + staging + readback commit；commit 途中失敗會 rollback 到匯入前狀態並明示失敗。
- 技能/音效：battle/pack 皆補 WebAudio 程序化音效與音量 slider；出牌、攻擊命中、受傷、死亡、勝敗、開包、UI 都走同一音量設定。
- 效能：render 改用 fragment/replaceChildren，任務 UI 加簽章避免無變化重建，隱藏任務抽屜不再每次 render 重建週任務/里程碑。
- 美術/人物：本輪不改卡圖；quality gates 與 e2e 仍驗 R61/R63 卡圖、傳說框、foil、角色立繪無回歸。

## 閘門結果

- `npm test`：通過。
- `npm run test:controls`：通過。
- `npm run test:rwd`：通過，30 組頁面/視口零違規。
- `npm run test:e2e`：通過，Stage 5 E2E + R65 controls 全綠。
- 效能 p95 三跑中位：desktop 1366x768 `8.8ms`；mobile 390x844 `12.6ms`。
- active 版本 grep：`0.4.10` / `R64` / `card-battle-r64-v1` / `card_sw_auto_reload_r64_v1` 零命中。
- 秘掃：`sk-proj-[A-Za-z0-9_-]{20}|sk-[a-z0-9]{40}`，排除 `.git` / `node_modules`，零命中。

## 證據

- `docs/evidence/R65/after_desktop_battle_accessible_combat_1366x768.png`
- `docs/evidence/R65/after_mobile_guide_no_extra_card_390x844.png`
- `docs/evidence/R65/after_landscape_pack_save_audio_844x390.png`
- `docs/evidence/R65/README.md`

## 備註

歷史報告與本輪 `docs/AUDIT_full.md` 保留原始審計/舊版本文字作為輸入證據；舊版號歸零檢查限定 active runtime、package 與 scripts。
