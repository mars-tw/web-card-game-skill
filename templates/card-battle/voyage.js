/* R73 航程規則：純資料與純函式，瀏覽器／Node 共用；試用卡不寫入收藏。 */
(function (root, factory) {
  const api = factory();
  if (root) root.CardVoyage = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const KEY = 'card_voyage_v1';
  const twice = ids => ids.flatMap(id => [id, id]);
  const DECKS = [
    { id: 'wild', name: '荒野突襲', unlock: 0, tip: '衝鋒搶血，亡語補場。留下火焰箭處理嘲諷。', cards: twice(['emberpup', 'wolf', 'alleySkirmisher', 'sparkSquire', 'frontScout', 'packHowler', 'dawnRider', 'firebolt', 'emberVolley', 'battleDrummer']) },
    { id: 'wardens', name: '白潮列陣', unlock: 1, tip: '嘲諷守住英雄，聖盾換掉大敵；累積潮能再反攻。', cards: twice(['footman', 'saltShieldSquire', 'cleric', 'bulwarkMonk', 'knight', 'guardian', 'bannerGuard', 'oathbannerHerald', 'mirrorRime', 'shieldUp']) },
    { id: 'conclave', name: '殘響詠潮', unlock: 3, tip: '先鋪法強與殘響，再用低費法術連打；不要一口氣交光解牌。', cards: twice(['arcaneApprentice', 'tidecallerAdept', 'frostChanneler', 'arcaneWeaver', 'runicScrivener', 'firebolt', 'iceNeedle', 'emberVolley', 'flameBurst', 'voidTithe']) },
  ];
  const OPPONENTS = {
    op_rune: { id: 'op_rune', name: '霜牙追獵者', emoji: '❄️', archetype: 'control', heroCardId: 'heroRuneFrostfang', easyReplacementId: 'frost', tauntBias: .5, faceBias: .45,
      deckIds: [...twice(['frostBiter', 'frostfangDire', 'frostReaver', 'glaciarchWarden', 'iceNeedle', 'mirrorRime', 'footman', 'wolf', 'frostChanneler']), 'heroRuneFrostfang', 'frostboundTyrant'],
      tideRates: { label: '霜潮', desc: '每回合 +1、隨從陣亡 +1', turn: 1, fallen: 1, spell: 0 } },
    op_isold: { id: 'op_isold', name: '伊索德長暮', emoji: '🌘', archetype: 'control', heroCardId: 'heroIsoldLongdusk', easyReplacementId: 'cleric', tauntBias: .65, faceBias: .35,
      deckIds: [...twice(['graveScribe', 'duskwrightBat', 'duskWitch', 'abyssWalker', 'lich', 'footman', 'voidTithe', 'heal', 'firebolt']), 'heroIsoldLongdusk', 'bloodmoonQueen'],
      tideRates: { label: '暮潮', desc: '隨從陣亡 +2', turn: 1, fallen: 2, spell: 0 } },
  };
  const STAGES = [
    { id: 'gate', name: '白潮試煉', opponent: 'op_ser_halden', difficulty: 'easy', scene: 'white-tide-citadel', story: '白潮的城門只開一半。哈爾登要你先證明能帶隊穿過浪頭。', tip: '用小隨從換掉嘲諷，再讓衝鋒隨從搶下節奏。', reward: '解鎖試用牌組「白潮列陣」' },
    { id: 'trail', name: '荒野追逐', opponent: 'op_scarra', difficulty: 'easy', scene: 'thunderwild-pass', story: '城外的狼嚎催你上路。斯卡拉盯著你的血線，等你露出空隙。', tip: '保留嘲諷擋衝鋒，別讓對手連續打到英雄。', reward: '解鎖第三站與新的戰術挑戰' },
    { id: 'echo', name: '殘響書頁', opponent: 'op_magister_vey', difficulty: 'normal', scene: 'astral-conclave', story: '維伊在塔頂攤開濕透的法典。每翻一頁，潮聲便多一次回音。', tip: '優先處理法強隨從；對手施法也會充潮，留意潮能。', reward: '解鎖試用牌組「殘響詠潮」' },
    { id: 'frost', name: '霜牙隘口', opponent: 'op_rune', difficulty: 'normal', scene: 'thunderwild-pass', story: '霜牙守在結冰的獵徑。被寒噤拖慢的一步，可能讓整隊失去先機。', tip: '寒噤會封住下一次攻擊。用法術解場，保留第二波攻勢。', reward: '解鎖長夜終站' },
    { id: 'dusk', name: '長暮歸航', opponent: 'op_isold', difficulty: 'normal', scene: 'longnight-necropolis', story: '伊索德站在無燈的碼頭。歸航前，你得先讓亡語的低聲呢喃停下。', tip: '亡語會補出新隨從；留住裂潮，等殘血與衍生物一同出現。', reward: '完成五站航程，可自由重挑任一站' },
  ];
  function migrate(raw) {
    const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const cleared = [];
    for (const stage of STAGES) {
      if (!Array.isArray(source.cleared) || !source.cleared.includes(stage.id)) break;
      cleared.push(stage.id);
    }
    const deck = DECKS.find(d => d.id === source.deck && d.unlock <= cleared.length);
    return { version: 1, cleared, deck: source.deck === 'collection' ? 'collection' : deck ? deck.id : 'wild' };
  }
  function canStart(raw, id) {
    const index = STAGES.findIndex(s => s.id === id);
    return index >= 0 && index <= migrate(raw).cleared.length;
  }
  function chooseDeck(raw, id) {
    const state = migrate(raw);
    if (id === 'collection') return { ok: true, state: { ...state, deck: 'collection' } };
    const deck = DECKS.find(d => d.id === id && d.unlock <= state.cleared.length);
    return { ok: !!deck, state: deck ? { ...state, deck: id } : state };
  }
  function settle(raw, id, win) {
    const state = migrate(raw);
    if (!win || !canStart(state, id) || state.cleared.includes(id)) return { state, first: false };
    return { state: migrate({ ...state, cleared: [...state.cleared, id] }), first: true };
  }
  return { KEY, DECKS, OPPONENTS, STAGES, migrate, canStart, chooseDeck, settle };
});
