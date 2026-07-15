# card R64 控制可達性硬化回報

## 結論

R64 已在 R63 本地 commit `3ef5599` 之上完成。R62 的手機 Command Dock、桌機戰場填滿與齒輪設定方向保留，R63 卡圖未改動；本輪只硬化控制定位、裝置模式、矮視口縮放、modal 關閉與自動化守門。

版本已更新為 `0.4.9`，PWA revision／reload key 為 `card-battle-r64-v1`／`card_sw_auto_reload_r64_v1`。

## 驗收對照

- A. 主控制常駐：桌機主行動列改為視口底部 fixed HUD，board 預留完整底部高度；1920×1080、1440×780、1366×600、1280×640 均不需頁面捲動。觸控 Dock 保留重抽、結束回合、手牌把手與更多。
- B. 抽屜避讓／小高度：觸控手牌抽屜的 bottom 永遠等於 Dock 高度，展開不遮主行動；844×390 會縮小卡牌與戰場密度，隱藏非戰鬥必要的 log／任務／footer，但保留雙方戰場、英雄、提示與主控制。
- C. 就地操作：目標確認／取消與提示燈泡命中區均至少 44px；矮視口確認列移到目標卡上緣，橫向抽屜展開時玩家英雄列仍在可點層。
- D. 裝置判斷：以 primary pointer 的 `(pointer: coarse)` 作主指標，產生 `data-control-mode="touch|desktop"`。非觸控桌機隱藏手機專屬手牌把手／更多鈕，改直接呈現桌機次要行動；測試不再用單純窄寬假裝觸控。
- E. modal 關閉：卡牌詳情 header、任務／編年史 header 與關鍵字關閉鈕改 sticky；設定齒輪保持在面板外且可再次點擊關閉。battle 與 pack 的 modal close 命中區至少 44px。

開包頁另補 1366×600／1280×640 收藏篩選的 panel 內捲與排序 chips 換行，維持 30 組 RWD 零違規。

## R64 守門

新增 `scripts/test-controls-reachability.js`，並串入 `npm run test:e2e`；可另以 `npm run test:controls` 單跑。

守門直接從 shell 進對戰，在下列六視口驗證：

- 非觸控桌機：1920×1080、1440×780、1366×600、1280×640。
- 觸控：390×844、844×390。

每顆關鍵控制都檢查：完整矩形及中心在 iframe 視口內、`elementFromPoint()` 命中自身／子元素、寬高至少 44px、控制彼此不重疊。另覆蓋抽屜展開避讓、更多面板、設定關閉、目標確認／取消、卡牌詳情／關鍵字／任務／編年史 sticky close、導引按鈕、零頁捲與零 console/page error；桌機另斷言手機專屬控制為 `display:none`。

`scripts/test-rwd-matrix.js` 維持 10 視口／3 頁共 30 組，桌機矩陣改納入 1440×780、1366×600、1280×640，並把觸控 shell iframe 與 844×390 納入子頁稽核。

## 截圖證據

- `docs/evidence/R64_controls/desktop_battle_controls_1366x600.png`
- `docs/evidence/R64_controls/desktop_battle_settings_1280x640.png`
- `docs/evidence/R64_controls/mobile_hand_drawer_controls_390x844.png`

## 驗證

- `npm run test:controls`：通過，6/6 視口全部關鍵控制可達。
- `npm run test:rwd`：通過，30/30 頁面×視口零違規、頁捲 0、水平溢出 0。
- `npm test`：通過；卡牌、core、品質守門與 balance sim 全綠。
- `npm run test:e2e`：通過；既有 Stage 5 E2E 與 R64 控制守門全綠。
- 秘密掃描：排除 `.git`／`node_modules` 後零命中。
