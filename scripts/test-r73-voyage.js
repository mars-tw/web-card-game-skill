const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const V = require('../templates/card-battle/voyage');
const Core = require('../templates/card-battle/core');
const { CARD_POOL } = require('../templates/card-battle/cards');
let count = 0;
function check(value, label) { assert.ok(value, label); count++; console.log('  ✓ ' + label); }
for (const deck of [...V.DECKS, ...Object.values(V.OPPONENTS)]) {
  const ids = deck.cards || deck.deckIds;
  const owned = Object.fromEntries(ids.map(id => [id, 2]));
  check(Core.validateDeck(ids, owned, CARD_POOL).ok, deck.id + ' 合法 20 張牌組');
  check(new Set(ids).size >= 10, deck.id + ' 至少十種戰術卡');
  check(ids.every(id => { const card = CARD_POOL.find(c => c.id === id); return card?.image && fs.existsSync(path.resolve(__dirname, '../templates/card-battle', card.image)); }), deck.id + ' 全數使用已存在正式卡圖');
}
check(V.migrate(null).cleared.length === 0, '無進度從第一站開始');
check(V.migrate({ cleared: ['dusk', 'trail'] }).cleared.length === 0, '損毀與越級進度不解鎖');
check(!V.canStart({}, 'dusk') && !V.canStart({}, 'unknown'), '拒絕越級與未知站別');
check(!V.chooseDeck({}, 'wardens').ok && !V.chooseDeck({}, 'conclave').ok, '未過關不能選鎖定牌組');
check(V.chooseDeck({}, 'collection').ok && V.migrate({ deck: 'collection' }).deck === 'collection', '收藏模式可選並持久化');
check(V.migrate({ deck: 'conclave' }).deck === 'wild', '損毀存檔不能偷解鎖牌組');
let state = V.migrate(null);
for (const [i, stage] of V.STAGES.entries()) {
  check(V.canStart(state, stage.id), stage.id + ' 前站通過可達');
  check(!V.settle(state, stage.id, false).first && V.settle(state, stage.id, false).state.cleared.length === i, stage.id + ' 敗場不推進');
  const result = V.settle(state, stage.id, true);
  check(result.first && result.state.cleared.length === i + 1, stage.id + ' 首勝推進');
  state = result.state;
  check(!V.settle(state, stage.id, true).first, stage.id + ' 重挑無重複解鎖');
  check(V.migrate(JSON.parse(JSON.stringify(state))).cleared.length === i + 1, stage.id + ' 讀回進度保留');
}
check(V.DECKS.every(d => V.chooseDeck(state, d.id).ok), '五站完成全部牌組可用');
check(V.migrate({ cleared: V.STAGES.map(s => s.id).concat('unknown'), deck: 'bad' }).cleared.length === 5, '未來未知站別不污染進度');
console.log(`R73 voyage: ${count} PASS, 0 FAIL`);
