/* =========================================================================
 * battle.js — 回合制卡牌對戰引擎 v2（關鍵字技能 + 強化動畫 + AI）
 *
 * 關鍵字技能規則：
 *   taunt        嘲諷  — 場上有嘲諷時，攻擊方只能打嘲諷隨從（不能打臉/打其他）
 *   charge       衝鋒  — 召喚當回合即可攻擊
 *   battlecry    戰吼  — 出場時觸發 trigger 效果一次
 *   deathrattle  亡語  — 死亡時觸發 trigger 效果一次
 *   divineshield 聖盾  — 第一次受到傷害時改為破盾、不扣血
 *
 * 動畫：攻擊撞擊+震動+受擊閃紅、傷害跳字、召喚飛入、死亡碎裂、
 *       聖盾破裂、技能觸發提示、勝負結算。
 * ========================================================================= */

(() => {
  "use strict";

  const Core = window.CardCore;
  if (!Core) throw new Error("CardCore 未載入");
  const MAX_FIELD = Core.MAX_FIELD; // 場上隨從上限（雙方皆同；手機版戰場列一行放得下的上限）
  const QUEST_KEY = "card_quests_v1";

  // ===== 難度設定 =====
  // playerHp/enemyHp：雙方起始血量；playerDraw/enemyDraw：起手抽牌數
  // aiSmart：AI 聰明度（0=隨便打臉, 1=會換威脅, 2=會算殺/留嘲諷/用劇毒換大物）
  const DIFFICULTY = {
    easy:   { label: "簡單", playerHp: 35, enemyHp: 25, playerDraw: 4, enemyDraw: 3, aiSmart: 0 },
    normal: { label: "普通", playerHp: 30, enemyHp: 30, playerDraw: 3, enemyDraw: 4, aiSmart: 1 },
    hard:   { label: "困難", playerHp: 26, enemyHp: 34, playerDraw: 3, enemyDraw: 5, aiSmart: 2 },
  };
  const DIFFICULTY_REWARDS = {
    easy: { win: 50, loss: 15 },
    normal: { win: 65, loss: 20 },
    hard: { win: 85, loss: 30 },
  };
  function difficultyReward(win) {
    const key = (game && game.difficulty) || currentDifficulty();
    const table = DIFFICULTY_REWARDS[key] || DIFFICULTY_REWARDS.easy;
    const diff = DIFFICULTY[key] || DIFFICULTY.easy;
    return { key, label: diff.label, amount: win ? table.win : table.loss };
  }
  function currentDifficulty() {
    // CP0-16：首次玩（無設定）預設「簡單」對新手友善；老玩家沿用已選難度
    let d = "easy";
    try { d = localStorage.getItem("cardgame_difficulty") || "easy"; } catch {}
    return DIFFICULTY[d] ? d : "easy";
  }
  // ---- 法術效果（spell.effect）----
  // 保留舊名稱給測試掛鉤；實際規則委派給 core.js。
  const SPELL_EFFECTS = Object.fromEntries(Object.entries(Core.SPELL_EFFECTS).map(([effect, spec]) => [
    effect,
    {
      needsTarget: spec.needsTarget,
      apply: (g, target) => {
        const result = Core.castSpellEffect(g, { side: "player", effect, targetUid: target && target.uid }, rng);
        handleCoreResult(result);
        logSpellEffect(result.card || { effect }, target, "player");
      },
    },
  ]));

  // ---- 技能效果（戰吼/亡語 trigger）----
  // 保留舊名稱給測試掛鉤；實際規則委派給 core.js。
  const ABILITY_EFFECTS = {
    healHero2:      (g, side, target, source) => triggerAbilityUi(g, side, "healHero2", target, source),
    damageAny1:     (g, side, target, source) => triggerAbilityUi(g, side, "damageAny1", target, source),
    aoeEnemy2:      (g, side, target, source) => triggerAbilityUi(g, side, "aoeEnemy2", target, source),
    summonSkeleton: (g, side, target, source) => triggerAbilityUi(g, side, "summonSkeleton", target, source),
    rebirth:        (g, side, target, source) => triggerAbilityUi(g, side, "rebirth", target, source),
  };

  let game;

  // ===== 初始化 =====
  function newGame() {
    const diffKey = currentDifficulty();
    const D = DIFFICULTY[diffKey];
    const playerDeck = buildDeck(true);
    const enemyDeck = buildDeck(false);
    const playerDeckSource = playerDeck._deckSource || "fallback";
    const playerDeckIds = playerDeck.map((card) => card.id);
    delete playerDeck._deckSource;
    game = {
      difficulty: diffKey, aiSmart: D.aiSmart,
      playerDeckSource,
      playerDeckIds,
      turn: "player",
      player: { side: "player", hp: D.playerHp, maxHp: D.playerHp, mana: 1, manaMax: 1, deck: playerDeck, hand: [], field: [] },
      enemy:  { side: "enemy",  hp: D.enemyHp, maxHp: D.enemyHp, mana: 0, manaMax: 0, deck: enemyDeck, hand: [], field: [] },
      selected: null,
      pendingSpell: null,
      over: false,
    };
    game.player.opp = game.enemy; game.enemy.opp = game.player;
    game.comboCount = 0;
    game.mulliganUsed = false; // CP2-6 起手可重抽一次
    for (let i = 0; i < D.playerDraw; i++) drawCard(game.player);
    for (let i = 0; i < D.enemyDraw; i++) drawCard(game.enemy);
    document.getElementById("overlay").classList.remove("show");
    document.getElementById("log").innerHTML = "";
    log(`⚔️ 對戰開始！（難度：${D.label}）善用技能取勝。`, "me");
    render();
    offerMulligan(D.playerDraw); // 提供起手重抽
  }

  // CP2-6 起手 Mulligan：開局可把起手牌洗回牌庫重抽一次，降低運氣權重
  function offerMulligan(drawCount) {
    const btn = document.getElementById("mulliganBtn");
    if (!btn) return;
    btn.style.display = "inline-block";
    btn.textContent = "🔄 重抽起手牌";
    btn.onclick = () => {
      if (game.mulliganUsed || game.turn !== "player") return;
      game.mulliganUsed = true;
      // 起手牌洗回牌庫再重抽
      game.player.deck.push(...game.player.hand);
      game.player.hand = [];
      for (let i = game.player.deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [game.player.deck[i], game.player.deck[j]] = [game.player.deck[j], game.player.deck[i]]; }
      for (let i = 0; i < drawCount; i++) drawCard(game.player);
      btn.style.display = "none";
      log("🔄 重抽起手牌！", "me");
      render();
    };
  }

  // 玩家牌庫：優先用「開卡包收藏」的卡（接通收藏→對戰，CP0-1）。
  // 讀 localStorage 的 cardpack_collection_v2（{collectKey: count}），
  // 把擁有的卡（含重複份數、閃卡）組進牌庫；不足 24 張才用 rollCardByRarity 保底補。
  function loadCollection() {
    try { return JSON.parse(localStorage.getItem("cardpack_collection_v2")) || {}; }
    catch { return {}; }
  }
  function loadOwnedCards() {
    const coll = loadCollection();
    const owned = [];
    for (const [key, count] of Object.entries(coll)) {
      const foil = key.endsWith("#foil");
      const id = foil ? key.slice(0, -5) : key;
      const base = getCardById(id);
      if (!base) continue;
      for (let i = 0; i < count; i++) { const c = cloneCard(base); c.foil = foil; owned.push(c); }
    }
    return owned;
  }
  function loadSavedBattleDeck() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem("card_deck_v1")); } catch {}
    const saved = Core.migrateDeck(raw);
    const collection = loadCollection();
    const validation = Core.validateDeck(saved.cards, collection, CARD_POOL);
    if (!validation.ok) return null;
    const deck = Core.buildBattleDeck(saved.cards, CARD_POOL, rng, collection);
    if (deck.length !== Core.DECK_SIZE) return null;
    deck._deckSource = "saved";
    return deck;
  }
  // useCollection=true：玩家用開包收藏；false：AI 用隨機卡池
  function buildDeck(useCollection) {
    if (useCollection) {
      const savedDeck = loadSavedBattleDeck();
      if (savedDeck && savedDeck.length === Core.DECK_SIZE) return savedDeck;
    }
    const deck = [];
    if (useCollection) {
      const owned = loadOwnedCards();
      for (let i = owned.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [owned[i], owned[j]] = [owned[j], owned[i]]; }
      for (const c of owned) { if (deck.length >= 24) break; deck.push(c); }
    }
    while (deck.length < 24) deck.push(rollCardByRarity()); // 不足或 AI：隨機補
    if (useCollection) deck._deckSource = "fallback";
    return deck;
  }

  function drawCard(side) {
    const result = Core.drawCard(game, { side: side.side }, rng);
    handleCoreResult(result);
    return result.card;
  }

  // ===== 玩家出牌 =====
  function playFromHand(uid) {
    if (game.turn !== "player" || game.over) return;
    const result = Core.playCard(game, { side: "player", cardUid: uid }, rng);
    handleCoreResult(result);
    if (!result.ok) {
      if (result.reason === "pendingCancelledSame") { render(); return; }
      showCoreFailure(result);
      render();
      return;
    }
    const pending = result.events.find((e) => e.type === "spellPending");
    if (pending) {
      flash(pending.need === "friendlyMinion" ? "選擇一個友方隨從" : "選擇一個敵方隨從");
      render();
      return;
    }
    if (result.card && result.card.type === CARD_TYPE.MINION) {
      log(`你召喚了 ${result.card.name}。`, "me");
    } else if (result.card && result.card.type === CARD_TYPE.SPELL) {
      logSpellEffect(result.card, result.target, "player");
    }
    render(); checkWin();
  }

  // ===== 攻擊：嘲諷限制 =====
  function hasTaunt(field) { return Core.hasTaunt(field); }
  function isLegalTarget(defenderSide, target) {
    return Core.isLegalTarget(defenderSide, target);
  }
  function isRushHeroLocked(minion) {
    return !!(minion && minion.justPlayed && (minion.keywords || []).includes("rush") && !(minion.keywords || []).includes("charge"));
  }
  function canAttackHeroNow(minion) {
    return !!(minion && minion.canAttack && !isRushHeroLocked(minion));
  }

  function goPack() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "switchTab", target: "pack" }, "*");
    } else {
      window.location.href = "../card-pack/index.html";
    }
  }

  function clickEnemyMinion(uid) {
    if (game.turn !== "player" || game.over) return;
    const target = game.enemy.field.find((m) => m.uid === uid);
    if (!target) return;

    if (game.pendingSpell) {
      if (game.pendingSpell.need !== "enemyMinion") { flash("此法術需指定友方隨從。"); return; }
      resolvePendingSpell(target); return;
    }
    if (game.selected) {
      if (!isLegalTarget(game.enemy, target)) { flash("必須先攻擊嘲諷隨從！"); return; }
      const attacker = game.player.field.find((m) => m.uid === game.selected);
      if (attacker) resolveAttack(game.player, attacker, target);
      game.selected = null;
      render(); checkWin();
    }
  }

  function clickFriendlyMinionAsTarget(target) {
    if (game.pendingSpell && game.pendingSpell.need === "friendlyMinion") { resolvePendingSpell(target); return true; }
    return false;
  }

  function resolvePendingSpell(target) {
    const result = Core.resolveTarget(game, { side: "player", targetUid: target && target.uid }, rng);
    handleCoreResult(result);
    if (!result.ok) showCoreFailure(result);
    else if (result.card) logSpellEffect(result.card, result.target, "player");
    render(); checkWin();
  }

  function clickEnemyHero() {
    if (game.turn !== "player" || game.over) return;
    if (game.pendingSpell) { flash("此法術需指定隨從。"); return; }
    if (game.selected) {
      if (hasTaunt(game.enemy.field)) { flash("敵方有嘲諷，不能直接攻擊英雄！"); return; }
      const attacker = game.player.field.find((m) => m.uid === game.selected);
      if (attacker) {
        if (isRushHeroLocked(attacker)) {
          flash("突襲隨從登場當回合只能攻擊隨從！");
          game.selected = null;
          render();
          return;
        }
        animateAttackToward(attacker.uid, "enemyHero");
        const result = Core.resolveHeroAttack(game, { attackerSide: "player", attackerUid: attacker.uid, defenderSide: "enemy" }, rng);
        handleCoreResult(result);
        if (result.ok) log(`${attacker.name} 攻擊敵方英雄，造成 ${attacker.attack} 點傷害！`, "me");
        else showCoreFailure(result);
      }
      game.selected = null;
      render(); checkWin();
    }
  }

  function selectMyMinion(uid) {
    if (game.turn !== "player" || game.over) return;
    const m = game.player.field.find((x) => x.uid === uid);
    if (!m) return;
    if (game.pendingSpell && clickFriendlyMinionAsTarget(m)) return;
    if (!m.canAttack) { flash("這個隨從本回合無法攻擊。"); return; }
    game.selected = game.selected === uid ? null : uid;
    render();
  }

  function cancelTargeting(message) {
    if (!game) return;
    const hadTargeting = !!(game.selected || game.pendingSpell);
    game.selected = null;
    game.pendingSpell = null;
    if (message && hadTargeting) flash(message);
    if (hadTargeting) render();
  }

  function targetStatusText() {
    if (!game) return "載入中。";
    if (game.over) return "對戰已結束。";
    if (game.turn !== "player") return "對手行動中。";
    if (game.pendingSpell) {
      return game.pendingSpell.need === "friendlyMinion" ? "請選擇友方隨從" : "請選擇敵方隨從";
    }
    if (game.selected) {
      const attacker = game.player.field.find((m) => m.uid === game.selected);
      if (hasTaunt(game.enemy.field)) return "請選擇有嘲諷的敵方隨從";
      if (isRushHeroLocked(attacker)) return "請選擇敵方隨從（突襲本回合不能攻擊英雄）";
      return "請選擇敵方隨從或敵方英雄";
    }
    return "輪到你行動。";
  }

  function updateTargetStatus() {
    const el = document.getElementById("targetStatus");
    if (!el) return;
    el.textContent = targetStatusText();
    el.classList.toggle("active", !!(game && (game.selected || game.pendingSpell || game.turn !== "player")));
  }

  // ===== 戰鬥結算（含聖盾、劇毒、連擊）=====
  function resolveAttack(attackerSide, attacker, defender) {
    animateAttackToward(attacker.uid, defender.uid);
    const result = Core.resolveAttack(game, {
      attackerSide: attackerSide.side,
      attackerUid: attacker.uid,
      defenderUid: defender.uid,
    }, rng);
    handleCoreResult(result);
    if (result.ok) log(`${attacker.name} 與 ${defender.name} 交戰！`, attackerSide.side === "player" ? "me" : "ai");
    else showCoreFailure(result);
  }

  // 對隨從造成傷害（含聖盾、劇毒、跳字；亡語在 cleanup 觸發）
  // source：造成傷害的隨從（用來判斷劇毒），可省略（法術傷害）
  function applyDamage(g, minion, amount, source) {
    const result = Core.applyDamage(g, { targetUid: minion && minion.uid, sourceUid: source && source.uid, amount }, rng);
    handleCoreResult(result);
  }
  function dealDamageToMinion(g, minion, amount) {
    const result = Core.dealDamageToMinion(g, { targetUid: minion && minion.uid, amount }, rng);
    handleCoreResult(result);
  }
  function aoe(g, side, amount) {
    const result = Core.aoe(g, { side: side.side, amount }, rng);
    handleCoreResult(result);
  }
  function healHero(side, amount) {
    Core.healHero(side, amount, []);
  }
  function addShield(m) {
    Core.addShield(m, []);
    flashCard(m.uid, "shield-gain");
  }

  function polymorph(g, minion) {
    Core.polymorph(minion, []);
    flashKeyword2(minion.uid, "變形！");
  }

  function summon(side, card, animate) {
    const result = Core.summon(game, { side: side.side, card, reason: animate ? "play" : "effect" }, rng);
    handleCoreResult(result);
    return result.ok;
  }

  // 清掉死亡隨從，並觸發亡語。
  // 順序刻意是「先移除全部死者、再觸發亡語」：亡語召喚的 token 才不會被垂死隨從
  // 佔住的場位擋掉（summon 有 MAX_FIELD 上限），也不依賴迭代中改動陣列的隱性行為。
  function cleanupField(side) {
    const result = Core.cleanupField(game, { side: side.side }, rng);
    handleCoreResult(result);
  }

  // 回復：回合結束時，帶 regenerate 的隨從補滿生命
  function regenerateField(side) {
    const result = Core.regenerateField(game, { side: side.side });
    handleCoreResult(result);
  }

  // ===== AI 回合 =====
  function endTurn() {
    if (game.turn !== "player" || game.over) return;
    const result = Core.advanceTurn(game, { phase: "endPlayer" }, rng);
    handleCoreResult(result);
    render();
    const gRef = game;
    setTimeout(() => { if (game === gRef) aiTurn(); }, 700); // 幽靈計時器防護
  }

  function aiTurn() {
    if (game.over) return;
    const ai = game.enemy;
    handleCoreResult(Core.advanceTurn(game, { phase: "startEnemy" }, rng));

    // 出牌（貪心：先出貴的隨從；法術看場面）
    let acted = true;
    while (acted) {
      acted = false;
      const affordable = ai.hand.filter((c) => c.cost <= ai.mana).sort((a, b) => b.cost - a.cost);
      for (const card of affordable) {
        if (card.type === CARD_TYPE.MINION) {
          if (ai.field.length >= MAX_FIELD) continue; // 場滿：跳過隨從，讓 AI 還有機會出法術
          const result = Core.playCard(game, { side: "enemy", cardUid: card.uid, burnMulligan: false, trackCombo: false }, rng);
          if (!result.ok) continue;
          handleCoreResult(result);
          log(`對手召喚了 ${card.name}。`, "ai");
          acted = true; break;
        } else {
          let used = false;
          let targetUid = null;
          if (card.effect === "heal5" && ai.hp <= 22) { used = true; }
          else if ((card.effect === "aoe1" || card.effect === "aoe2") && game.player.field.length >= 2) { used = true; }
          else if ((card.effect === "damage3" || card.effect === "damage8") && game.player.field.length) {
            const t = [...game.player.field].sort((a,b)=>b.attack-a.attack)[0];
            targetUid = t && t.uid;
            used = true;
          }
          else if (card.effect === "mana2") { used = true; }
          if (used) {
            const result = Core.playCard(game, { side: "enemy", cardUid: card.uid, targetUid, burnMulligan: false, trackCombo: false }, rng);
            if (!result.ok) continue;
            handleCoreResult(result);
            logAiSpell(card.effect);
            acted = true; break;
          }
        }
      }
    }
    render();

    // 攻擊（考慮玩家嘲諷）
    const gRef = game; // 幽靈計時器防護：newGame() 後舊局的排程回呼直接失效
    setTimeout(() => {
      if (game !== gRef || game.over) return;
      const queue = ai.field.filter((m) => m.canAttack);
      // CP2-5 致命斬殺檢查：玩家無嘲諷且 AI 總攻擊 ≥ 玩家血量 → 全壓臉直接結束遊戲
      const playerHasTaunt = game.player.field.some((m) => (m.keywords || []).includes("taunt"));
      const totalAtk = queue.filter(canAttackHeroNow).reduce((s, m) => s + m.attack, 0);
      const lethal = !playerHasTaunt && totalAtk >= game.player.hp && game.player.hp > 0 && (game.aiSmart || 0) >= 1;
      let i = 0;
      const step = () => {
        if (game !== gRef) return; // 舊局的攻擊鏈在 newGame() 後直接中止
        if (game.over || i >= queue.length) { endAiTurn(); return; }
        const atk = queue[i++];
        if (!ai.field.includes(atk) || !atk.canAttack) { step(); return; }
        const playerTaunts = game.player.field.filter((m) => (m.keywords || []).includes("taunt"));
        if (playerTaunts.length) {
          const t = playerTaunts.sort((a, b) => a.health - b.health)[0];
          animateAttackToward(atk.uid, t.uid);
          resolveAttack(ai, atk, t);
        } else {
          // AI 聰明度：簡單只打臉；普通威脅≥4 換；困難威脅≥3 換且優先用劇毒換大物
          const smart = game.aiSmart || 0;
          let threat = null;
          if (smart >= 1 && !lethal) { // 斬殺局面跳過換牌，全壓臉
            const thr = smart >= 2 ? 3 : 4;
            const candidates = game.player.field.filter((m) => m.attack >= thr);
            if (smart >= 2 && (atk.keywords || []).includes("poison")) {
              // 困難：劇毒隨從優先去換掉血最厚的大物
              threat = [...game.player.field].sort((a, b) => b.health - a.health)[0] || null;
            } else {
              threat = candidates.sort((a, b) => b.attack - a.attack)[0] || null;
            }
          }
          if (!threat && isRushHeroLocked(atk) && game.player.field.length) {
            threat = [...game.player.field].sort((a, b) => a.health - b.health)[0] || null;
          }
          if (threat) { animateAttackToward(atk.uid, threat.uid); resolveAttack(ai, atk, threat); }
          else if (canAttackHeroNow(atk)) {
            animateAttackToward(atk.uid, "playerHero");
            const result = Core.resolveHeroAttack(game, { attackerSide: "enemy", attackerUid: atk.uid, defenderSide: "player" }, rng);
            handleCoreResult(result);
            if (result.ok) log(`對手的 ${atk.name} 攻擊你的英雄，造成 ${atk.attack} 點傷害！`, "ai");
            else showCoreFailure(result);
          } else {
            step(); return;
          }
        }
        // 連擊（windfury）：第一擊後 canAttack 仍為 true，把它排回佇列吃第二擊
        // （第二擊結束後 resolveAttack/打臉分支會把 canAttack 設回 false，不會無限迴圈）
        if (ai.field.includes(atk) && atk.canAttack && atk._windUsed) queue.push(atk);
        render(); checkWin();
        setTimeout(step, 620);
      };
      step();
    }, 600);
  }

  function endAiTurn() {
    if (game.over) return;
    handleCoreResult(Core.advanceTurn(game, { phase: "endEnemy" }, rng));
    log("輪到你了。", "me");
    render();
  }

  function checkWin() {
    settleIfGameEnded();
  }

  function settleIfGameEnded() {
    if (!game || game.over) return false;
    if (game.enemy.hp > 0 && game.player.hp > 0) return false;
    game.over = true;
    game.selected = null;
    game.pendingSpell = null;
    showOverlay(game.enemy.hp <= 0 ? "🏆 勝利！" : "💀 落敗…", game.enemy.hp <= 0);
    return true;
  }

  // ===== 渲染 =====
  function render() {
    set("playerHp", Math.max(0, game.player.hp));
    set("enemyHp", Math.max(0, game.enemy.hp));
    set("playerMana", game.player.mana);
    set("playerManaMax", game.player.manaMax);

    renderField("playerField", game.player.field, "player");
    renderField("enemyField", game.enemy.field, "enemy");

    const hand = document.getElementById("playerHand");
    hand.innerHTML = "";
    game.player.hand.forEach((card) => {
      const el = renderCard(card);
      if (card.cost <= game.player.mana && game.turn === "player") el.classList.add("playable");
      else el.classList.add("disabled");
      el.onclick = () => playFromHand(card.uid);
      hand.appendChild(el);
    });

    const enemyHero = document.getElementById("enemyHero");
    const selectedMinion = game.selected ? game.player.field.find((m) => m.uid === game.selected) : null;
    enemyHero.classList.toggle("targetable", !!selectedMinion && game.turn === "player" && !hasTaunt(game.enemy.field) && !isRushHeroLocked(selectedMinion));
    enemyHero.onclick = clickEnemyHero;
    updateTargetStatus();

    document.getElementById("endTurnBtn").disabled = game.turn !== "player" || game.over;
    renderQuests();
  }

  function renderField(elId, field, side) {
    const el = document.getElementById(elId);
    el.innerHTML = "";
    el.onclick = (event) => {
      if (event.target === el || event.target.classList.contains("empty-hint")) cancelTargeting("已取消選取。");
    };
    if (field.length === 0) {
      const hint = document.createElement("div");
      hint.className = "empty-hint";
      hint.textContent = side === "enemy" ? "（敵方戰場）" : "（你的隨從）";
      el.appendChild(hint);
      return;
    }
    const enemyHasTaunt = hasTaunt(game.enemy.field);
    field.forEach((card) => {
      const c = renderCard(card);
      if (side === "player") {
        if (card.canAttack && game.turn === "player") c.classList.add("can-attack");
        if (game.selected === card.uid) c.classList.add("selected");
        if (game.pendingSpell && game.pendingSpell.need === "friendlyMinion") c.classList.add("targetable");
        c.onclick = (event) => { event.stopPropagation(); selectMyMinion(card.uid); };
      } else {
        const spellTargetable = game.pendingSpell && game.pendingSpell.need === "enemyMinion";
        const attackTargetable = game.selected && isLegalTarget(game.enemy, card);
        if (spellTargetable || attackTargetable) c.classList.add("targetable");
        if (game.selected && enemyHasTaunt && !(card.keywords || []).includes("taunt")) c.classList.add("blocked");
        c.onclick = (event) => { event.stopPropagation(); clickEnemyMinion(card.uid); };
      }
      el.appendChild(c);
    });
  }

  // 單張卡片 DOM（含技能徽章、聖盾、星級、閃卡）
  function renderCard(card) {
    const r = RARITY[card.rarity] || RARITY.common;
    const el = document.createElement("div");
    el.className = "card spawn rarity-" + card.rarity + (card.type === CARD_TYPE.SPELL ? " spell-card" : "") + (card.foil ? " foil" : "") + (r.idle ? " legend-idle" : "");
    el.dataset.uid = card.uid;
    el.style.setProperty("--rarity", r.color);
    el.style.setProperty("--glow", r.glow);
    el.style.setProperty("--glow-size", (r.glowSize || 0) + "px");

    const art = card.image
      ? `<img src="${card.image}" alt="${card.name}" onerror="this.replaceWith(document.createTextNode('${card.emoji}'))">`
      : card.emoji;

    // 技能徽章
    const kwBadges = (card.keywords || []).map((k) => {
      const kw = (typeof KEYWORDS !== "undefined") ? KEYWORDS[k] : null;
      return kw ? `<span class="kw" title="${kw.label}：${kw.desc}">${kw.icon}</span>` : "";
    }).join("");

    const stars = "★".repeat(r.stars);

    el.innerHTML = `
      <div class="cost">${card.cost}</div>
      ${card.shield ? '<div class="shield-ring"></div>' : ""}
      <div class="stars">${stars}</div>
      <div class="art">${art}</div>
      <div class="kwrow">${kwBadges}</div>
      <div class="cardname">${card.name}${card.foil ? " ✦" : ""}</div>
      <div class="cardtext">${card.text || ""}</div>
      <div class="stats">
        <div class="atk">${card.attack ?? ""}</div>
        <div class="hp ${card.health < card.maxHealth ? "hurt" : ""}">${card.health ?? ""}</div>
      </div>`;
    return el;
  }

  // ===== 動畫 / 工具 =====
  function set(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }
  function log(msg, who) {
    const box = document.getElementById("log");
    const line = document.createElement("div");
    line.className = who || ""; line.textContent = msg;
    box.appendChild(line); box.scrollTop = box.scrollHeight;
    while (box.children.length > 8) box.removeChild(box.firstChild);
  }
  function flash(msg) {
    log("⚠️ " + msg, "me");
    showToast(msg);
  }
  function showToast(msg) {
    let stack = document.getElementById("toastStack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "toastStack";
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }
    const d = document.createElement("div");
    d.className = "toast-float";
    d.textContent = msg;
    stack.appendChild(d);
    setTimeout(() => {
      d.remove();
      if (stack && stack.children.length === 0) stack.remove();
    }, 1400);
  }
  function rng() { return Math.random(); }

  function hideMulliganButton() {
    const mb = document.getElementById("mulliganBtn");
    if (mb) mb.style.display = "none";
  }

  function handleCoreResult(result) {
    if (!result || !Array.isArray(result.events)) return;
    for (const event of result.events) {
      if (event.type === "pendingCancelled") {
        flash("已取消指定。");
      } else if (event.type === "mulliganBurned") {
        hideMulliganButton();
      } else if (event.type === "combo") {
        showCombo(event.uid, event.count);
      } else if (event.type === "shieldBreak") {
        flashCard(event.uid, "shield-break");
        flashKeyword2(event.uid, "聖盾破裂");
      } else if (event.type === "damage") {
        flashCard(event.uid, "damaged");
        floatDamage(event.uid, event.amount);
      } else if (event.type === "poison") {
        flashKeyword2(event.uid, "劇毒！");
        flashCard(event.uid, "poisoned");
      } else if (event.type === "lifesteal") {
        flashKeyword2(event.uid, "吸血");
      } else if (event.type === "rushReady") {
        flashKeyword2(event.uid, "突襲");
      } else if (event.type === "shieldGain") {
        flashCard(event.uid, "shield-gain");
      } else if (event.type === "polymorph") {
        flashKeyword2(event.uid, "變形！");
      } else if (event.type === "dying") {
        markDying(event.uid);
      } else if (event.type === "deathrattle") {
        flashKeyword2(event.uid, "亡語");
      } else if (event.type === "battlecry") {
        flashKeyword2(event.uid, "戰吼");
      } else if (event.type === "heroDamage") {
        floatDamage(event.defenderSide === "enemy" ? "enemyHero" : "playerHero", event.amount);
      } else if (event.type === "heroHeal") {
        if (event.amount > 0) flashKeyword(event.side === "player" ? "playerHero" : "enemyHero", `+${event.amount} 生命`);
      } else if (event.type === "regen") {
        flashKeyword2(event.uid, "回復");
        flashCard(event.uid, "regen");
      } else if (event.type === "minionSummoned" && event.reason === "deathrattle") {
        logDeathrattleSummon(event);
      }
      trackQuestFromCoreEvent(event);
    }
    settleIfGameEnded();
  }

  function showCombo(uid, count) {
    if (count < 3) return;
    const el = elFor(uid);
    const r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0 };
    flashCombo(r.left + r.width / 2, r.top, count);
  }

  function showCoreFailure(result) {
    if (!result || !result.reason || result.reason === "cardNotFound") return;
    if (result.reason === "insufficientMana") flash("法力不足！");
    else if (result.reason === "fieldFull") flash("場上隨從已滿（最多 " + MAX_FIELD + " 隻）。");
    else if (result.reason === "noTarget" || result.reason === "targetNotFound") flash("沒有可指定的目標。");
    else if (result.reason === "illegalTarget") flash("必須先攻擊嘲諷隨從！");
    else if (result.reason === "tauntBlocksHero") flash("敵方有嘲諷，不能直接攻擊英雄！");
    else if (result.reason === "rushBlocksHero") flash("突襲隨從登場當回合只能攻擊隨從！");
    else if (result.reason === "cannotAttack") flash("這個隨從本回合不能攻擊。");
  }

  function fallbackSpellName(effect) {
    const names = {
      heal5: "治療術",
      aoe1: "冰霜新星",
      aoe2: "閃電風暴",
      mana2: "法力湧動",
      giveShield: "聖盾術",
      polymorph: "變形術",
      damage3: "火焰箭",
      damage8: "隕石術",
    };
    return names[effect] || "法術";
  }

  function logSpellEffect(cardOrEffect, target, sideKey) {
    if (sideKey !== "player") return;
    const card = typeof cardOrEffect === "string" ? { effect: cardOrEffect } : (cardOrEffect || {});
    const effect = card.effect;
    const name = card.name || fallbackSpellName(effect);
    if (effect === "heal5") log(`你施放${name}，恢復 5 點生命。`, "me");
    else if (effect === "aoe1" || effect === "aoe2") log(`${name}橫掃敵方！`, "me");
    else if (effect === "mana2") log(`${name}：本回合 +2 法力。`, "me");
    else if (effect === "giveShield" && target) log(`${name}：${target.name} 獲得聖盾。`, "me");
    else if (effect === "polymorph") log(`${name}：敵方隨從被變成綿羊。`, "me");
    else if ((effect === "damage3" || effect === "damage8") && target) log(`${name}擊中了 ${target.name}。`, "me");
  }

  function logAiSpell(effect) {
    if (effect === "heal5") log("對手施放治療術。", "ai");
    else if (effect === "aoe1" || effect === "aoe2") log("對手施放範圍法術！", "ai");
    else if (effect === "damage3" || effect === "damage8") log("對手對你的隨從施放傷害法術。", "ai");
  }

  function logDeathrattleSummon(event) {
    if (event.name === "骷髏") log("亡語：召喚了骷髏(2/2)。", event.side === "player" ? "me" : "ai");
    else if (event.name === "浴火鳳凰") log("亡語：鳳凰浴火重生！", event.side === "player" ? "me" : "ai");
  }

  function triggerAbilityUi(g, side, trigger, target, source) {
    const result = Core.triggerAbility(g, {
      side: side.side,
      trigger,
      targetUid: target && target.uid,
      sourceUid: source && source.uid,
    }, rng);
    handleCoreResult(result);
  }

  function elFor(uidOrId) {
    return document.querySelector(`.card[data-uid="${uidOrId}"]`) || document.getElementById(uidOrId);
  }

  // 攻擊者朝目標衝刺（用 transform 位移做撞擊）
  function animateAttackToward(attackerUid, targetUidOrId) {
    const a = elFor(attackerUid), t = elFor(targetUidOrId);
    if (!a) return;
    if (t) {
      const ar = a.getBoundingClientRect(), tr = t.getBoundingClientRect();
      const dx = (tr.left + tr.width / 2) - (ar.left + ar.width / 2);
      const dy = (tr.top + tr.height / 2) - (ar.top + ar.height / 2);
      // 位移走全程（CP1-12，原 0.5 只走一半沒撞擊感）
      a.style.setProperty("--lx", dx * 0.85 + "px");
      a.style.setProperty("--ly", dy * 0.85 + "px");
      a.classList.add("lunge-to");
      setTimeout(() => { a.classList.remove("lunge-to"); a.style.removeProperty("--lx"); a.style.removeProperty("--ly"); }, 360);
      // 命中：受擊震動 + 閃白 + 火花粒子 + 螢幕震
      setTimeout(() => {
        t.classList.add("hit-shake", "hit-flash"); screenShake();
        spawnSparks(tr.left + tr.width / 2, tr.top + tr.height / 2);
        setTimeout(() => t.classList.remove("hit-shake", "hit-flash"), 320);
      }, 150);
    } else {
      a.classList.add("attacking"); setTimeout(() => a.classList.remove("attacking"), 300);
    }
  }

  // 傷害數字分級（CP1-12）：≤2 小白、3~5 中金、≥6 大紅金
  function floatDamage(uidOrId, amount) {
    const el = elFor(uidOrId); if (!el) return;
    const r = el.getBoundingClientRect();
    const d = document.createElement("div");
    const tier = amount >= 6 ? "dmg-big" : amount >= 3 ? "dmg-mid" : "dmg-sm";
    d.className = "dmg-float " + tier; d.textContent = "-" + amount;
    d.style.left = (r.left + r.width / 2) + "px";
    d.style.top = (r.top + 8) + "px";
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 850);
  }
  // CP2-8 連擊回饋文字
  function flashCombo(x, y, n) {
    const d = document.createElement("div");
    d.className = "combo-float"; d.textContent = `🔥 ${n} 連擊!`;
    d.style.left = x + "px"; d.style.top = (y - 10) + "px";
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 900);
  }
  // 命中火花粒子（CP1-12）
  function spawnSparks(x, y) {
    for (let i = 0; i < 6; i++) {
      const s = document.createElement("div");
      s.className = "hit-spark";
      const a = (Math.PI * 2 * i) / 6 + Math.random() * 0.5, dist = 20 + Math.random() * 25;
      s.style.left = x + "px"; s.style.top = y + "px";
      s.style.setProperty("--sx", Math.cos(a) * dist + "px");
      s.style.setProperty("--sy", Math.sin(a) * dist + "px");
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 450);
    }
  }

  function flashCard(uid, cls) {
    const el = elFor(uid); if (el && cls) { el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 400); }
  }
  function flashKeyword2(uid, label) {
    const el = elFor(uid); if (!el) return;
    const r = el.getBoundingClientRect();
    const b = document.createElement("div");
    b.className = "kw-pop"; b.textContent = label;
    b.style.left = (r.left + r.width / 2) + "px"; b.style.top = (r.top - 6) + "px";
    document.body.appendChild(b); setTimeout(() => b.remove(), 900);
  }
  function flashKeyword(id, label) { flashKeyword2(id, label); }

  function markDying(uid) { const el = elFor(uid); if (el) el.classList.add("dying"); }
  function screenShake() {
    const board = document.querySelector(".board");
    if (!board) return;
    board.classList.add("shake-screen"); setTimeout(() => board.classList.remove("shake-screen"), 260);
  }

  // 戰績 + 金幣經濟（CP0-2）：閉合「打贏→賺金→開包→變強」迴圈。
  // 存檔遷移集中在 core.js，battle.js 與 pack.js 共用同一個 versioned shape。
  function loadStats() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem("card_stats_v1")); } catch {}
    return Core.migrateStats(raw);
  }
  function saveStats(s) { try { localStorage.setItem("card_stats_v1", JSON.stringify(Core.migrateStats(s))); } catch {} }

  function todaySeed() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  function loadQuests() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(QUEST_KEY)); } catch {}
    return Core.migrateQuests(raw, todaySeed());
  }

  function saveQuests(questState) {
    try { localStorage.setItem(QUEST_KEY, JSON.stringify(Core.migrateQuests(questState, todaySeed()))); } catch {}
  }

  function progressQuest(event) {
    const before = loadQuests();
    const next = Core.applyQuestProgress(before, event);
    saveQuests(next);
    renderQuests(next);
    next.quests.forEach((quest) => {
      const prev = before.quests.find((item) => item.id === quest.id);
      if (prev && prev.progress < prev.target && quest.progress >= quest.target && !quest.claimed) {
        showToast(`任務完成：${quest.title}`);
      }
    });
    return next;
  }

  function trackQuestFromCoreEvent(event) {
    if (!event) return;
    if (event.type === "spellCast" && event.side === "player") {
      progressQuest({ type: "playSpell", amount: 1 });
    } else if (event.type === "minionSummoned" && event.side === "player" && event.reason === "play") {
      progressQuest({ type: "summonMinion", amount: 1 });
    } else if (event.type === "heroDamage" && event.attackerSide === "player" && event.defenderSide === "enemy") {
      progressQuest({ type: "heroDamage", amount: event.amount || 1 });
    }
  }

  function claimQuestUi(questId) {
    const result = Core.claimQuest(loadQuests(), questId);
    if (!result.ok) return result;
    saveQuests(result.state);
    const stats = loadStats();
    stats.coins += result.reward;
    saveStats(stats);
    renderQuests(result.state);
    flash(`每日任務完成：+${result.reward} 金幣`);
    return result;
  }

  function hasClaimableQuests(questState) {
    const state = questState || loadQuests();
    return state.quests.some((quest) => quest.progress >= quest.target && !quest.claimed);
  }

  function updateQuestCtas(questState) {
    const ready = hasClaimableQuests(questState);
    const claimAllBtn = document.getElementById("questClaimAllBtn");
    if (claimAllBtn) {
      claimAllBtn.disabled = !ready;
      claimAllBtn.title = ready ? "領取所有已完成任務" : "目前沒有可領取的任務";
    }
    const overlayQuestBtn = document.getElementById("overlayQuestBtn");
    if (overlayQuestBtn) {
      overlayQuestBtn.disabled = !ready;
      overlayQuestBtn.classList.toggle("ready", ready);
      overlayQuestBtn.title = ready ? "領取已完成任務" : "目前沒有可領取的任務";
    }
  }

  function claimAllQuestsUi() {
    let state = loadQuests();
    let reward = 0;
    let count = 0;
    for (const quest of state.quests) {
      if (quest.progress < quest.target || quest.claimed) continue;
      const result = Core.claimQuest(state, quest.id);
      if (!result.ok) continue;
      state = result.state;
      reward += result.reward;
      count++;
    }
    if (count === 0) {
      renderQuests(state);
      flash("目前沒有可領取的任務。");
      return { ok: false, reward: 0, count: 0, state };
    }
    saveQuests(state);
    const stats = loadStats();
    stats.coins += reward;
    saveStats(stats);
    renderQuests(state);
    flash(`已領取 ${count} 個任務：+${reward} 金幣`);
    return { ok: true, reward, count, state };
  }

  function renderQuests(questState) {
    const panel = document.getElementById("questPanel");
    const list = document.getElementById("questList");
    const label = document.getElementById("questDateLabel");
    if (!panel || !list) return;
    const state = questState || loadQuests();
    if (label) label.textContent = state.dateSeed;
    list.innerHTML = "";
    state.quests.forEach((quest) => {
      const done = quest.progress >= quest.target;
      const row = document.createElement("div");
      row.className = "quest-item" + (done ? " done" : "") + (quest.claimed ? " claimed" : "");
      row.innerHTML = `
        <div>
          <div class="quest-title" title="${quest.title}">${quest.title}</div>
          <div class="quest-progress">${Math.min(quest.progress, quest.target)} / ${quest.target} · ${quest.reward} 金幣</div>
        </div>
        <button class="quest-claim" data-quest-id="${quest.id}">${quest.claimed ? "已領" : "領取"}</button>`;
      const btn = row.querySelector("button");
      btn.disabled = !done || quest.claimed;
      btn.onclick = () => claimQuestUi(quest.id);
      list.appendChild(row);
    });
    updateQuestCtas(state);
  }

  function showOverlay(title, win) {
    const ov = document.getElementById("overlay");
    document.getElementById("overlayTitle").textContent = title;
    ov.classList.toggle("win", win); ov.classList.toggle("lose", !win);

    // 更新戰績與金幣
    const s = loadStats();
    const reward = difficultyReward(win);
    let rewardLine;
    if (win) {
      s.wins++; s.streak++; if (s.streak > s.bestStreak) s.bestStreak = s.streak;
      s.coins += reward.amount;
      rewardLine = `💰 +${reward.amount} 金幣（共 ${s.coins}）`;
    } else {
      s.losses++; s.streak = 0;
      s.coins += reward.amount;
      rewardLine = `💰 +${reward.amount} 金幣（共 ${s.coins}）`;
    }
    saveStats(s);
    if (win) {
      progressQuest({ type: "win", amount: 1 });
      if (game.playerDeckSource === "saved") progressQuest({ type: "deckWin", amount: 1 });
    }
    // 顯示戰績
    const stats = document.getElementById("resultStats");
    if (stats) {
      stats.innerHTML = `
        <div class="streak">${win && s.streak >= 2 ? `🔥 ${s.streak} 連勝！` : ""}</div>
        <div>戰績：${s.wins} 勝 ${s.losses} 敗 · 最高連勝 ${s.bestStreak}</div>
        <div class="coin">${rewardLine}</div>
        <div>難度獎勵：${reward.label}${win ? "勝場" : "敗場"} +${reward.amount} 金幣</div>
        <div class="hint">💡 用金幣去「開卡包」抽更強的卡，組成你的牌組！</div>`;
    }
    updateQuestCtas();
    if (win) burstStars();
    const gRef = game;
    setTimeout(() => { if (game === gRef) ov.classList.add("show"); }, 500);
  }
  function burstStars() {
    for (let i = 0; i < 30; i++) {
      const c = document.createElement("div");
      c.textContent = ["✨", "⭐", "💫", "🌟", "🎉"][i % 5];
      c.style.cssText = `position:fixed;left:50%;top:45%;font-size:26px;pointer-events:none;z-index:200;transition:all 1.3s ease-out;`;
      document.body.appendChild(c);
      requestAnimationFrame(() => {
        const ang = (Math.PI * 2 * i) / 30, dist = 30 + Math.random() * 20;
        c.style.left = 50 + Math.cos(ang) * dist + "%";
        c.style.top = 45 + Math.sin(ang) * dist + "%";
        c.style.opacity = "0";
      });
      setTimeout(() => c.remove(), 1400);
    }
  }

  // ===== 綁定 & 啟動 =====
  document.getElementById("endTurnBtn").onclick = endTurn;
  document.getElementById("restartBtn").onclick = newGame;
  document.getElementById("overlayPackBtn").onclick = goPack;
  document.getElementById("overlayQuestBtn").onclick = claimAllQuestsUi;
  const claimAllBtn = document.getElementById("questClaimAllBtn");
  if (claimAllBtn) claimAllBtn.onclick = claimAllQuestsUi;
  const boardEl = document.querySelector(".board");
  if (boardEl) {
    boardEl.addEventListener("click", (event) => {
      if (event.target.closest(".card, .hero, button, select, label, .quest-panel, .controls, .hand")) return;
      cancelTargeting("已取消選取。");
    });
  }
  // 對戰中重開（牌庫會重新讀最新收藏——開完新卡包回來按這顆就能用到新卡）
  const ngBtn = document.getElementById("newGameBtn");
  if (ngBtn) ngBtn.onclick = newGame;
  newGame();

  // 提供給入口頁主題切換用（重繪卡面）
  window.__rerenderBattle = render;
  // 提供給難度選擇器：換難度後重開一局
  window.__newGame = newGame;
  window.__difficulties = DIFFICULTY;
  window.addEventListener("storage", (e) => {
    if (e.key === QUEST_KEY) renderQuests();
  });

  // 測試掛鉤：讓自動化測試能建立確定性場景並驗證技能（不影響正常遊玩）
  window.__test = {
    game: () => game,
    setup(playerField, enemyField) {
      game.player.field = (playerField || []).map((id) => prepMinion(getCardById(id)));
      game.enemy.field = (enemyField || []).map((id) => prepMinion(getCardById(id)));
      game.player.mana = game.player.manaMax = 10;
      render();
    },
    hasTaunt: (who) => hasTaunt((who === "enemy" ? game.enemy : game.player).field),
    isLegalTarget: (uid) => { const t = game.enemy.field.find((m) => m.uid === uid); return t ? isLegalTarget(game.enemy, t) : null; },
    playSpellOn(effect, targetUid) {
      const target = [...game.enemy.field, ...game.player.field].find((m) => m.uid === targetUid);
      SPELL_EFFECTS[effect].apply(game, target); render();
    },
    triggerBattlecry(card) { const ab = ABILITY_EFFECTS[card.trigger]; if (ab) ab(game, game.player, game.enemy.field[0]); cleanupField(game.enemy); render(); },
    killMinion(uid, side) { const s = side === "enemy" ? game.enemy : game.player; const m = s.field.find((x) => x.uid === uid); if (m) { m.health = 0; cleanupField(s); render(); } },
    // 我方某隨從攻擊敵方某隨從（測劇毒/連擊互毆）
    attackMinion(attackerUid, defenderUid) {
      const a = game.player.field.find((m) => m.uid === attackerUid);
      const d = game.enemy.field.find((m) => m.uid === defenderUid);
      if (a && d) resolveAttack(game.player, a, d);
      render();
    },
    // 觸發玩家回合結束的回復（不進 AI 回合）
    regenTest() { regenerateField(game.player); render(); },
    difficulty: () => ({ key: game.difficulty, aiSmart: game.aiSmart, playerHp: game.player.hp, enemyHp: game.enemy.hp }),
    // ===== E2E 掛鉤（scripts/test-battle-e2e.js 用）=====
    endTurn: () => endTurn(),
    playFromHand: (uid) => playFromHand(uid),
    stats: () => loadStats(),
    quests: () => loadQuests(),
    setQuests: (questState) => { saveQuests(questState); renderQuests(); return loadQuests(); },
    progressQuest: (event) => progressQuest(event),
    claimQuest: (questId) => claimQuestUi(questId),
    claimAllQuests: () => claimAllQuestsUi(),
    rewardTable: () => JSON.parse(JSON.stringify(DIFFICULTY_REWARDS)),
    deckInfo: () => ({ source: game.playerDeckSource, ids: [...(game.playerDeckIds || [])], liveIds: [...game.player.hand, ...game.player.deck].map((c) => c.id) }),
    // 直接塞一張指定卡進手牌（回傳 uid），測「法力不足點擊」「場滿」等指定劇本
    giveCard(cardId) {
      const c = Object.assign({}, getCardById(cardId));
      c.uid = "e2e" + Math.random().toString(36).slice(2, 8);
      c.maxHealth = c.health;
      game.player.hand.push(c); render();
      return c.uid;
    },
    maxField: MAX_FIELD,
  };
  function prepMinion(c) { c.uid = "t" + Math.random().toString(36).slice(2, 8); c.maxHealth = c.health; if ((c.keywords || []).includes("divineshield")) c.shield = true; c.canAttack = true; return c; }
})();
