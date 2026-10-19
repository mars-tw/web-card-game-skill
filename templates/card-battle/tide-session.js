/* 本機對局檢查點。沒有計時器、網路或遠端資料。 */
(function (root, factory) {
  const api = factory();
  if (root) root.CardTideSession = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const KEY = 'card_tide_session_v1', DONE = 'card_tide_trial_v1';
  const contentRules = typeof CardTideContent !== 'undefined' ? CardTideContent : typeof require === 'function' ? require('./tide-puzzles') : null;
  function encode(game) {
    return JSON.stringify({ version: 1, game }, (key, value) => key === 'opp' ? undefined : value);
  }
  function decode(raw, pool) {
    try {
      if (!raw || raw.length > 250000) return null;
      const data = JSON.parse(raw), g = data.game;
      if (data.version !== 1 || !g || g.over || g.turn !== 'player' || g.pendingSpell || g.pendingBattlecry) return null;
      if (!['easy', 'normal', 'hard'].includes(g.difficulty) || !Number.isInteger(g.turnCount) || g.turnCount < 1) return null;
      const known = new Map(pool.map(c => [c.id,c])), uids = new Set();
      for (const key of ['player', 'enemy']) {
        const s = g[key];
        if (!s || s.side !== key || !Number.isFinite(s.hp) || !Number.isFinite(s.maxHp) || s.hp <= 0 || s.hp > s.maxHp || s.maxHp > 100) return null;
        for (const n of ['mana', 'manaMax', 'tide', 'fatigue']) if (!Number.isFinite(s[n]) || s[n] < 0 || s[n] > 1000) return null;
        for (const field of ['hand', 'deck', 'field']) {
          if (!Array.isArray(s[field]) || s[field].length > (field === 'field' ? 7 : 60)) return null;
          for (const c of s[field]) {
            if ((!known.has(c.id) && !(c.id==='token' && c.type==='minion' && c.cost===0)) || !Number.isFinite(c.cost)) return null;
            if (field !== 'deck' && typeof c.uid !== 'string') return null;
            if (c.uid != null && (typeof c.uid !== 'string' || uids.has(c.uid))) return null;
            if (c.type === 'minion' && (!Number.isFinite(c.attack) || !Number.isFinite(c.health))) return null;
            c.image = known.get(c.id)?.image || null; // 不從損壞檢查點載入外部圖片。
            if (c.uid != null) uids.add(c.uid);
          }
        }
      }
      if (contentRules ? !contentRules.valid(g) : g.content || g.forecast) return null;
      g.selected = null;
      g.player.opp = g.enemy; g.enemy.opp = g.player;
      return g;
    } catch { return null; }
  }
  return { KEY, DONE, encode, decode };
});
