# card R65 開包收藏篩選 RWD 修正

## 範圍

本輪只修 `templates/card-pack/index.html` 的 collection 收藏冊篩選面板，避免 1366x600 這類矮桌機視口把篩選 chip 推出 fold；R64 控制可達性成果未改動。

## 修正

- 在 `max-height:760px` 的矮視口下，collection 篩選面板改為更緊湊的 padding、gap、chip 尺寸與標籤欄寬。
- 非手機寬度的矮視口中，filter board 改成兩欄三列，讓「軸線／陣營／關鍵／稀有／狀態／排序」不再垂直堆滿整個面板。
- 所有 filter chip row 維持單行 `overflow-x:auto`，關鍵字約 20 個 chip 不換行；排序列也不再換行。取捨是寬度不足時使用橫向捲動，換取穩定高度。
- 保留 `max-height:136px; overflow-y:auto` 作為字體或瀏覽器渲染差異的保險。`scripts/test-rwd-matrix.js` 會將完整可見 scrollHost 內的超出元素視為 `SCROLLABLE_OK`，但目前 1366x600 初始布局已不需要依賴狀態列掉到視口外再由內捲兜底。

## 版本

- package：`0.4.10`
- PWA revision／reload key：`card-battle-r65-v1`／`card_sw_auto_reload_r65_v1`
