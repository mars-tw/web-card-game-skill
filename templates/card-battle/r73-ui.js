/* 手機手牌是 UI 拖曳，並非人物動畫。所有消耗仍由既有 playFromHand 結算。 */
window.CardMobile = (() => {
  let bridge, queued = null, drag = null, suppressUntil = 0, returnFocus = null;
  const $ = id => document.getElementById(id);
  const touch = () => window.__controlMode === 'touch';
  function cancel(restore = true) {
    const uid = queued;
    queued = null;
    if ($('handPreview')) $('handPreview').hidden = true;
    document.querySelectorAll('#playerHand .hand-queued').forEach(el => el.classList.remove('hand-queued'));
    if (restore && uid) document.querySelector(`#playerHand [data-uid="${CSS.escape(uid)}"]`)?.focus({ preventScroll: true });
  }
  function select(uid) {
    const g = bridge.game();
    if (!g || g.turn !== 'player' || g.over || bridge.busy()) return;
    const card = g.player.hand.find(c => c.uid === uid);
    if (!card) return;
    cancel(false);
    queued = uid;
    const node = document.querySelector(`#playerHand [data-uid="${CSS.escape(uid)}"]`);
    node?.classList.add('hand-queued');
    $('handPreviewName').textContent = `${card.name} · ${bridge.cost(card)} 費`;
    $('handPreviewText').textContent = [card.text, ...(card.keywords || []).map(k => `${KEYWORDS[k]?.label}：${KEYWORDS[k]?.desc}`)].filter(Boolean).join(' ');
    $('handPreviewArt').src = card.image;
    const cost = bridge.cost(card);
    $('handConfirmBtn').disabled = cost > g.player.mana || (card.type === 'minion' && g.player.field.length >= 7);
    $('handPreviewHint').textContent = cost > g.player.mana ? `法力不足，還差 ${cost - g.player.mana} 點。` : $('handConfirmBtn').disabled ? '戰場已滿，先騰出空位。' : '確認才出牌；指定法術仍需選目標。';
    $('handPreview').hidden = false;
    $('handCancelBtn').focus({ preventScroll: true });
  }
  function clearDrag() {
    drag = null;
    $('handDragHint').hidden = true;
    $('playerField').classList.remove('hand-drop-ready');
  }
  function inField(x, y) {
    const r = $('playerField').getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }
  function bind(el, card) {
    const action = () => {
      if (performance.now() < suppressUntil) return;
      if (touch()) select(card.uid); else bridge.play(card.uid);
    };
    el.onclick = action;
    el.onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === el) { e.preventDefault(); action(); } };
    if (queued === card.uid) el.classList.add('hand-queued');
    el.addEventListener('pointerdown', e => {
      if (!touch() || e.pointerType !== 'touch' || e.target.closest('button')) return;
      if (!e.isPrimary) { clearDrag(); suppressUntil = performance.now() + 700; return; }
      drag = { id: e.pointerId, uid: card.uid, x: e.clientX, y: e.clientY, moved: false, active: false, el };
    });
  }
  function load() {
    let raw;
    try { raw = JSON.parse(localStorage.getItem(CardVoyage.KEY)); } catch {}
    return CardVoyage.migrate(raw);
  }
  let stageIndex = 0;
  function drawVoyage() {
    const state = load();
    const stage = CardVoyage.STAGES[stageIndex];
    $('voyageProgress').textContent = `已通過 ${state.cleared.length} / 5 站 · 試用牌不加入收藏`;
    $('voyageStageName').textContent = `${stageIndex + 1}. ${stage.name}`;
    $('voyageStory').textContent = stage.story;
    $('voyageTip').textContent = `打法：${stage.tip}`;
    $('voyageReward').textContent = `首次通過：${stage.reward}`;
    $('voyageStageArt').src = (bridge.opponent(stage.opponent) || {}).heroCardId ? `../../assets/cards/${bridge.opponent(stage.opponent).heroCardId}.png` : '';
    $('voyagePrev').disabled = stageIndex === 0;
    $('voyageNext').disabled = stageIndex === CardVoyage.STAGES.length - 1;
    $('voyageStart').disabled = !CardVoyage.canStart(state, stage.id);
    $('voyageStart').textContent = !CardVoyage.canStart(state, stage.id) ? '先通過前一站' : state.cleared.includes(stage.id) ? '重挑這一站' : '開始挑戰';
    const select = $('voyageDeck');
    select.replaceChildren();
    [...CardVoyage.DECKS, { id: 'collection', name: '我的收藏牌組', unlock: 0 }].forEach(deck => {
      const opt = document.createElement('option');
      opt.value = deck.id;
      opt.disabled = deck.unlock > state.cleared.length;
      opt.textContent = deck.name + (opt.disabled ? `（通過 ${deck.unlock} 站解鎖）` : '');
      select.appendChild(opt);
    });
    select.value = state.deck;
    const deck = CardVoyage.DECKS.find(d => d.id === state.deck);
    $('voyageDeckTip').textContent = deck ? deck.tip : '使用已儲存的收藏牌組；不足時沿用原本的補牌規則。';
    $('voyageDeckCards').textContent = deck ? deck.cards.filter((id, i, ids) => ids.indexOf(id) === i).map(id => `${getCardById(id).name} ×${deck.cards.filter(c => c === id).length}`).join('、') : '可從「卡包／牌組」編輯收藏牌組。';
  }
  function closeVoyage() {
    $('voyagePanel').hidden = true;
    returnFocus?.focus({ preventScroll: true });
  }
  function openVoyage() {
    cancel(false);
    returnFocus = document.activeElement?.closest('#dockMorePanel') ? $('moreActionsBtn') : document.activeElement;
    bridge.closeMenus();
    stageIndex = Math.min(load().cleared.length, 4);
    drawVoyage();
    $('voyagePanel').hidden = false;
    $('voyageClose').focus();
  }
  function init(api) {
    bridge = api;
    $('handConfirmBtn').onclick = () => {
      const uid = queued;
      cancel(false); // 清空後才結算，快速連點也只執行一次。
      if (uid) bridge.play(uid);
    };
    $('handCancelBtn').onclick = () => cancel();
    $('voyageBtn').onclick = openVoyage;
    $('voyageClose').onclick = closeVoyage;
    $('voyagePrev').onclick = () => { stageIndex--; drawVoyage(); };
    $('voyageNext').onclick = () => { stageIndex++; drawVoyage(); };
    $('voyageDeck').onchange = () => {
      const result = CardVoyage.chooseDeck(load(), $('voyageDeck').value);
      if (result.ok) bridge.save(CardVoyage.KEY, JSON.stringify(result.state), '航程牌組儲存');
      drawVoyage();
    };
    $('voyageStart').onclick = () => {
      const stage = CardVoyage.STAGES[stageIndex];
      if (!CardVoyage.canStart(load(), stage.id)) return;
      closeVoyage();
      bridge.start(stage.id);
    };
    $('voyageFree').onclick = () => { closeVoyage(); bridge.start(); };
    document.addEventListener('pointerdown', e => {
      if (drag && e.pointerType === 'touch' && !e.isPrimary) { clearDrag(); suppressUntil = performance.now() + 700; }
      if (queued && !e.target.closest('#handPreview') && (!e.target.closest('#playerHand .card') || e.target.closest('.card-info-btn'))) cancel(false);
    }, true);
    document.addEventListener('pointermove', e => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.hypot(dx, dy) > 12) drag.moved = true;
      if (dy < -16 && Math.abs(dy) > Math.abs(dx) * 1.2) {
        drag.active = true;
        cancel(false);
        drag.el.setPointerCapture(e.pointerId);
      }
      if (!drag.active) return;
      e.preventDefault();
      $('handDragHint').hidden = false;
      const valid = inField(e.clientX, e.clientY);
      $('handDragHint').textContent = valid ? '放開預覽，再確認出牌' : '拖到己方戰場；放回手牌取消';
      $('playerField').classList.toggle('hand-drop-ready', valid);
    }, { passive: false });
    document.addEventListener('pointerup', e => {
      if (!drag || drag.id !== e.pointerId) return;
      const current = drag;
      if (current.moved) suppressUntil = performance.now() + 500;
      clearDrag();
      if (current.active && inField(e.clientX, e.clientY)) select(current.uid);
    });
    document.addEventListener('pointercancel', () => { clearDrag(); suppressUntil = performance.now() + 500; });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && (!$('voyagePanel').hidden || queued)) { e.preventDefault(); e.stopImmediatePropagation(); closeVoyage(); cancel(); }
      if (e.key === 'Tab' && !$('voyagePanel').hidden) {
        const items = [...$('voyagePanel').querySelectorAll('button:not(:disabled),select')];
        const next = (items.indexOf(document.activeElement) + (e.shiftKey ? -1 : 1) + items.length) % items.length;
        e.preventDefault(); items[next].focus();
      }
    }, true);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { clearDrag(); cancel(false); } });
    window.addEventListener('resize', () => { clearDrag(); cancel(false); });
  }
  function result(win) {
    const g = bridge.game();
    const box = $('voyageResult');
    box.replaceChildren();
    if (!g.voyageStage) return;
    const stage = CardVoyage.STAGES.find(s => s.id === g.voyageStage);
    const settled = CardVoyage.settle(load(), stage.id, win);
    const saved = !settled.first || bridge.save(CardVoyage.KEY, JSON.stringify(settled.state), '航程進度儲存');
    const line = document.createElement('p');
    line.textContent = !saved ? '進度未存妥，請先匯出備份再重試。' : settled.first ? stage.reward : win ? '本次重挑完成，可回航程換牌組。' : '這一站還沒通過，換套牌組再試一次。';
    box.appendChild(line);
    const btn = document.createElement('button');
    btn.id = 'voyageContinue';
    btn.textContent = win ? '航程／下一站' : '航程／重試';
    btn.onclick = openVoyage;
    box.appendChild(btn);
  }
  return { init, bind, cancel, result, load, openVoyage };
})();
