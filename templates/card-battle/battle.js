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

  const MAX_MANA = 10;
  const START_HP = 30;

  // ===== 難度設定 =====
  // playerHp/enemyHp：雙方起始血量；playerDraw/enemyDraw：起手抽牌數
  // aiSmart：AI 聰明度（0=隨便打臉, 1=會換威脅, 2=會算殺/留嘲諷/用劇毒換大物）
  const DIFFICULTY = {
    easy:   { label: "簡單", playerHp: 35, enemyHp: 25, playerDraw: 4, enemyDraw: 3, aiSmart: 0 },
    normal: { label: "普通", playerHp: 30, enemyHp: 30, playerDraw: 3, enemyDraw: 4, aiSmart: 1 },
    hard:   { label: "困難", playerHp: 26, enemyHp: 34, playerDraw: 3, enemyDraw: 5, aiSmart: 2 },
  };
  function currentDifficulty() {
    // CP0-16：首次玩（無設定）預設「簡單」對新手友善；老玩家沿用已選難度
    let d = "easy";
    try { d = localStorage.getItem("cardgame_difficulty") || "easy"; } catch {}
    return DIFFICULTY[d] ? d : "easy";
  }
  const HAND_LIMIT = 8;

  // ---- 法術效果（spell.effect）----
  const SPELL_EFFECTS = {
    damage3:    { needsTarget: "enemyMinion", apply: (g, t) => dealDamageToMinion(g, t, 3) },
    damage8:    { needsTarget: "enemyMinion", apply: (g, t) => dealDamageToMinion(g, t, 8) },
    heal5:      { needsTarget: null, apply: (g) => { healHero(g.player, 5); log("你施放治療術，恢復 5 點生命。", "me"); } },
    aoe1:       { needsTarget: null, apply: (g) => { aoe(g, g.enemy, 1); log("冰霜新星橫掃敵方！", "me"); } },
    aoe2:       { needsTarget: null, apply: (g) => { aoe(g, g.enemy, 2); log("閃電風暴橫掃敵方！", "me"); } },
    mana2:      { needsTarget: null, apply: (g) => { g.player.mana += 2; log("法力湧動：本回合 +2 法力。", "me"); } },
    giveShield: { needsTarget: "friendlyMinion", apply: (g, t) => { addShield(t); log(`${t.name} 獲得聖盾。`, "me"); } },
    polymorph:  { needsTarget: "enemyMinion", apply: (g, t) => polymorph(g, t) },
  };

  // ---- 技能效果（戰吼/亡語 trigger）----
  const ABILITY_EFFECTS = {
    healHero2:      (g, side) => { healHero(side, 2); flashKeyword(side === g.player ? "playerHero" : "enemyHero", "戰吼：+2 生命"); },
    damageAny1:     (g, side, target) => { if (target) dealDamageToMinion(g, target, 1); },
    aoeEnemy2:      (g, side) => { const foe = side === g.player ? g.enemy : g.player; aoe(g, foe, 2); },
    summonSkeleton: (g, side) => { const sk = makeToken("骷髏", 2, 2, "☠️"); summon(side, sk); log("亡語：召喚了骷髏(2/2)。", side === g.player ? "me" : "ai"); },
    rebirth:        (g, side, _t, dyingCard) => { const ph = makeToken("浴火鳳凰", 5, 1, "🔥"); summon(side, ph); log("亡語：鳳凰浴火重生！", side === g.player ? "me" : "ai"); },
  };

  let game;

  // ===== 初始化 =====
  function newGame() {
    const diffKey = currentDifficulty();
    const D = DIFFICULTY[diffKey];
    game = {
      difficulty: diffKey, aiSmart: D.aiSmart,
      turn: "player",
      player: { side: "player", hp: D.playerHp, maxHp: D.playerHp, mana: 1, manaMax: 1, deck: buildDeck(true), hand: [], field: [] },
      enemy:  { side: "enemy",  hp: D.enemyHp, maxHp: D.enemyHp, mana: 0, manaMax: 0, deck: buildDeck(false), hand: [], field: [] },
      selected: null,
      pendingSpell: null,
      over: false,
    };
    game.player.opp = game.enemy; game.enemy.opp = game.player;
    for (let i = 0; i < D.playerDraw; i++) drawCard(game.player);
    for (let i = 0; i < D.enemyDraw; i++) drawCard(game.enemy);
    document.getElementById("overlay").classList.remove("show");
    document.getElementById("log").innerHTML = "";
    log(`⚔️ 對戰開始！（難度：${D.label}）善用技能取勝。`, "me");
    render();
  }

  // 玩家牌庫：優先用「開卡包收藏」的卡（接通收藏→對戰，CP0-1）。
  // 讀 localStorage 的 cardpack_collection_v2（{collectKey: count}），
  // 把擁有的卡（含重複份數、閃卡）組進牌庫；不足 24 張才用 rollCardByRarity 保底補。
  function loadOwnedCards() {
    let coll = {};
    try { coll = JSON.parse(localStorage.getItem("cardpack_collection_v2")) || {}; } catch {}
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
  // useCollection=true：玩家用開包收藏；false：AI 用隨機卡池
  function buildDeck(useCollection) {
    const deck = [];
    if (useCollection) {
      const owned = loadOwnedCards();
      for (let i = owned.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [owned[i], owned[j]] = [owned[j], owned[i]]; }
      for (const c of owned) { if (deck.length >= 24) break; deck.push(c); }
    }
    while (deck.length < 24) deck.push(rollCardByRarity()); // 不足或 AI：隨機補
    return deck;
  }

  function makeToken(name, atk, hp, emoji) {
    return { id: "token", name, type: CARD_TYPE.MINION, rarity: "common",
      cost: 0, attack: atk, health: hp, maxHealth: hp, emoji, image: null, keywords: [], foil: false };
  }

  function drawCard(side) {
    if (side.deck.length === 0) return;
    if (side.hand.length >= HAND_LIMIT) { side.deck.pop(); return; }
    const card = side.deck.pop();
    card.uid = "c" + Math.random().toString(36).slice(2, 9);
    card.maxHealth = card.health;
    side.hand.push(card);
  }

  // ===== 玩家出牌 =====
  function playFromHand(uid) {
    if (game.turn !== "player" || game.over) return;
    const idx = game.player.hand.findIndex((c) => c.uid === uid);
    if (idx === -1) return;
    const card = game.player.hand[idx];
    if (card.cost > game.player.mana) { flash("法力不足！"); return; }

    if (card.type === CARD_TYPE.SPELL) {
      const eff = SPELL_EFFECTS[card.effect];
      if (eff && eff.needsTarget) {
        const pool = eff.needsTarget === "enemyMinion" ? game.enemy.field
                   : eff.needsTarget === "friendlyMinion" ? game.player.field : [];
        if (pool.length === 0) { flash("沒有可指定的目標。"); return; }
        game.pendingSpell = { uid, idx, need: eff.needsTarget };
        render();
        flash(eff.needsTarget === "friendlyMinion" ? "選擇一個友方隨從" : "選擇一個敵方隨從");
        return;
      }
      game.player.mana -= card.cost;
      game.player.hand.splice(idx, 1);
      if (eff) eff.apply(game);
      render(); checkWin(); return;
    }

    // 隨從上場
    game.player.mana -= card.cost;
    game.player.hand.splice(idx, 1);
    const hasCharge = (card.keywords || []).includes("charge");
    card.canAttack = hasCharge;       // 衝鋒：當回合可攻擊
    card.justPlayed = true;
    if ((card.keywords || []).includes("divineshield")) card.shield = true;
    summon(game.player, card, true);
    log(`你召喚了 ${card.name}。`, "me");

    // 戰吼
    if ((card.keywords || []).includes("battlecry") && card.trigger) {
      const ab = ABILITY_EFFECTS[card.trigger];
      if (ab) {
        if (card.trigger === "damageAny1" && game.enemy.field.length > 0) {
          // 需要目標的戰吼：自動打敵方血量最低的隨從（簡化指定）
          const t = [...game.enemy.field].sort((a, b) => a.health - b.health)[0];
          flashKeyword2(card.uid, "戰吼");
          ab(game, game.player, t);
        } else {
          flashKeyword2(card.uid, "戰吼");
          ab(game, game.player);
        }
      }
    }
    render(); checkWin();
  }

  // ===== 攻擊：嘲諷限制 =====
  function hasTaunt(field) { return field.some((m) => (m.keywords || []).includes("taunt")); }
  function isLegalTarget(defenderSide, target) {
    if (!hasTaunt(defenderSide.field)) return true;
    return (target.keywords || []).includes("taunt");
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
    const { idx } = game.pendingSpell;
    const card = game.player.hand[idx];
    game.player.mana -= card.cost;
    game.player.hand.splice(idx, 1);
    flashCard(card.uid, "");
    SPELL_EFFECTS[card.effect].apply(game, target);
    game.pendingSpell = null;
    render(); checkWin();
  }

  function clickEnemyHero() {
    if (game.turn !== "player" || game.over) return;
    if (game.pendingSpell) { flash("此法術需指定隨從。"); return; }
    if (game.selected) {
      if (hasTaunt(game.enemy.field)) { flash("敵方有嘲諷，不能直接攻擊英雄！"); return; }
      const attacker = game.player.field.find((m) => m.uid === game.selected);
      if (attacker) {
        animateAttackToward(attacker.uid, "enemyHero");
        game.enemy.hp -= attacker.attack;
        floatDamage("enemyHero", attacker.attack);
        // 連擊：第一次打臉保留攻擊權，再打一次才收回
        if ((attacker.keywords || []).includes("windfury") && !attacker._windUsed) attacker._windUsed = true;
        else { attacker.canAttack = false; attacker._windUsed = false; }
        log(`${attacker.name} 攻擊敵方英雄，造成 ${attacker.attack} 點傷害！`, "me");
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

  // ===== 戰鬥結算（含聖盾、劇毒、連擊）=====
  function resolveAttack(attackerSide, attacker, defender) {
    animateAttackToward(attacker.uid, defender.uid);
    // 攻擊者打防禦者（帶 attacker 以判斷劇毒）
    applyDamage(game, defender, attacker.attack, attacker);
    // 反擊（防禦者的劇毒對攻擊者也生效）
    if (defender.attack > 0) applyDamage(game, attacker, defender.attack, defender);
    // 連擊：第一次攻擊後不收回攻擊權，改為標記已用一次；用滿兩次才結束
    const hasWindfury = (attacker.keywords || []).includes("windfury");
    if (hasWindfury && !attacker._windUsed) {
      attacker._windUsed = true;   // 還能再攻擊一次
    } else {
      attacker.canAttack = false;
      attacker._windUsed = false;
    }
    log(`${attacker.name} 與 ${defender.name} 交戰！`, attackerSide.side === "player" ? "me" : "ai");
    cleanupField(game.player); cleanupField(game.enemy);
  }

  // 對隨從造成傷害（含聖盾、劇毒、跳字；亡語在 cleanup 觸發）
  // source：造成傷害的隨從（用來判斷劇毒），可省略（法術傷害）
  function applyDamage(g, minion, amount, source) {
    if (minion.shield) {
      minion.shield = false;
      flashCard(minion.uid, "shield-break");
      flashKeyword2(minion.uid, "聖盾破裂");
      return;
    }
    minion.health -= amount;
    flashCard(minion.uid, "damaged");
    floatDamage(minion.uid, amount);
    // 劇毒：傷害來源帶劇毒且確實造成傷害 → 目標直接致命
    if (source && (source.keywords || []).includes("poison") && amount > 0 && minion.health > 0) {
      minion.health = 0;
      flashKeyword2(minion.uid, "劇毒！");
      flashCard(minion.uid, "poisoned");
    }
  }
  function dealDamageToMinion(g, minion, amount) { applyDamage(g, minion, amount); cleanupField(g.player); cleanupField(g.enemy); }
  function aoe(g, side, amount) { [...side.field].forEach((m) => applyDamage(g, m, amount)); cleanupField(g.player); cleanupField(g.enemy); }
  function healHero(side, amount) { side.hp = Math.min(side.maxHp || START_HP, side.hp + amount); }
  function addShield(m) { m.shield = true; flashCard(m.uid, "shield-gain"); }

  function polymorph(g, minion) {
    minion.name = "綿羊"; minion.attack = 1; minion.health = 1; minion.maxHealth = 1;
    minion.emoji = "🐑"; minion.image = null; minion.keywords = []; minion.shield = false;
    flashKeyword2(minion.uid, "變形！");
  }

  function summon(side, card, animate) {
    if (card.maxHealth == null) card.maxHealth = card.health;
    if (!card.uid) card.uid = "c" + Math.random().toString(36).slice(2, 9);
    side.field.push(card);
  }

  // 清掉死亡隨從，並觸發亡語
  function cleanupField(side) {
    const survivors = [];
    for (const m of side.field) {
      if (m.health <= 0) {
        markDying(m.uid);
        if ((m.keywords || []).includes("deathrattle") && m.trigger && ABILITY_EFFECTS[m.trigger]) {
          // 鳳凰重生：先移除自己再重生 token
          flashKeyword2(m.uid, "亡語");
          ABILITY_EFFECTS[m.trigger](game, side, null, m);
        }
      } else survivors.push(m);
    }
    side.field = survivors;
  }

  // 回復：回合結束時，帶 regenerate 的隨從補滿生命
  function regenerateField(side) {
    side.field.forEach((m) => {
      if ((m.keywords || []).includes("regenerate") && m.health < m.maxHealth) {
        m.health = m.maxHealth;
        flashKeyword2(m.uid, "回復");
        flashCard(m.uid, "regen");
      }
    });
  }

  // ===== AI 回合 =====
  function endTurn() {
    if (game.turn !== "player" || game.over) return;
    game.selected = null; game.pendingSpell = null;
    regenerateField(game.player);     // 玩家回合結束：玩家隨從回復
    game.turn = "enemy";
    render();
    setTimeout(aiTurn, 700);
  }

  function aiTurn() {
    if (game.over) return;
    const ai = game.enemy;
    ai.manaMax = Math.min(MAX_MANA, ai.manaMax + 1);
    ai.mana = ai.manaMax;
    drawCard(ai);

    // 出牌（貪心：先出貴的隨從；法術看場面）
    let acted = true;
    while (acted) {
      acted = false;
      const affordable = ai.hand.filter((c) => c.cost <= ai.mana).sort((a, b) => b.cost - a.cost);
      for (const card of affordable) {
        const idx = ai.hand.indexOf(card);
        if (card.type === CARD_TYPE.MINION) {
          ai.mana -= card.cost; ai.hand.splice(idx, 1);
          card.canAttack = (card.keywords || []).includes("charge");
          if ((card.keywords || []).includes("divineshield")) card.shield = true;
          summon(ai, card, true);
          log(`對手召喚了 ${card.name}。`, "ai");
          if ((card.keywords || []).includes("battlecry") && card.trigger && ABILITY_EFFECTS[card.trigger]) {
            flashKeyword2(card.uid, "戰吼");
            const t = card.trigger === "damageAny1" && game.player.field.length
                    ? [...game.player.field].sort((a, b) => a.health - b.health)[0] : null;
            ABILITY_EFFECTS[card.trigger](game, ai, t);
          }
          acted = true; break;
        } else {
          const eff = SPELL_EFFECTS[card.effect];
          let used = false;
          if (card.effect === "heal5" && ai.hp <= 22) { ai.mana -= card.cost; ai.hand.splice(idx, 1); healHero(ai, 5); log("對手施放治療術。", "ai"); used = true; }
          else if ((card.effect === "aoe1" || card.effect === "aoe2") && game.player.field.length >= 2) { ai.mana -= card.cost; ai.hand.splice(idx, 1); aoe(game, game.player, card.effect === "aoe2" ? 2 : 1); log("對手施放範圍法術！", "ai"); used = true; }
          else if ((card.effect === "damage3" || card.effect === "damage8") && game.player.field.length) { ai.mana -= card.cost; ai.hand.splice(idx, 1); const t = [...game.player.field].sort((a,b)=>b.attack-a.attack)[0]; dealDamageToMinion(game, t, card.effect === "damage8" ? 8 : 3); log("對手對你的隨從施放傷害法術。", "ai"); used = true; }
          else if (card.effect === "mana2") { ai.mana -= card.cost; ai.hand.splice(idx, 1); ai.mana += 2; used = true; }
          if (used) { cleanupField(game.player); cleanupField(game.enemy); acted = true; break; }
        }
      }
    }
    render();

    // 攻擊（考慮玩家嘲諷）
    setTimeout(() => {
      const attackers = ai.field.filter((m) => m.canAttack !== false);
      ai.field.forEach((m) => { if (m.canAttack === undefined) m.canAttack = true; });
      const queue = ai.field.filter((m) => m.canAttack);
      let i = 0;
      const step = () => {
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
          if (smart >= 1) {
            const thr = smart >= 2 ? 3 : 4;
            const candidates = game.player.field.filter((m) => m.attack >= thr);
            if (smart >= 2 && (atk.keywords || []).includes("poison")) {
              // 困難：劇毒隨從優先去換掉血最厚的大物
              threat = [...game.player.field].sort((a, b) => b.health - a.health)[0] || null;
            } else {
              threat = candidates.sort((a, b) => b.attack - a.attack)[0] || null;
            }
          }
          if (threat) { animateAttackToward(atk.uid, threat.uid); resolveAttack(ai, atk, threat); }
          else {
            animateAttackToward(atk.uid, "playerHero");
            game.player.hp -= atk.attack; floatDamage("playerHero", atk.attack);
            // 連擊：第一次打臉後保留攻擊權，再打一次才收回
            if ((atk.keywords || []).includes("windfury") && !atk._windUsed) atk._windUsed = true;
            else { atk.canAttack = false; atk._windUsed = false; }
            log(`對手的 ${atk.name} 攻擊你的英雄，造成 ${atk.attack} 點傷害！`, "ai");
          }
        }
        render(); checkWin();
        setTimeout(step, 620);
      };
      step();
    }, 600);
  }

  function endAiTurn() {
    if (game.over) return;
    regenerateField(game.enemy);     // AI 回合結束：AI 隨從回復
    game.turn = "player";
    game.player.manaMax = Math.min(MAX_MANA, game.player.manaMax + 1);
    game.player.mana = game.player.manaMax;
    drawCard(game.player);
    game.player.field.forEach((m) => { m.canAttack = true; m._windUsed = false; }); // 重置連擊
    log("輪到你了。", "me");
    render();
  }

  function checkWin() {
    if (game.over) return;
    if (game.enemy.hp <= 0) { game.over = true; showOverlay("🏆 勝利！", true); }
    else if (game.player.hp <= 0) { game.over = true; showOverlay("💀 落敗…", false); }
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
    enemyHero.classList.toggle("targetable", !!game.selected && game.turn === "player" && !hasTaunt(game.enemy.field));
    enemyHero.onclick = clickEnemyHero;

    document.getElementById("endTurnBtn").disabled = game.turn !== "player" || game.over;
  }

  function renderField(elId, field, side) {
    const el = document.getElementById(elId);
    el.innerHTML = "";
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
        c.onclick = () => selectMyMinion(card.uid);
      } else {
        const spellTargetable = game.pendingSpell && game.pendingSpell.need === "enemyMinion";
        const attackTargetable = game.selected && isLegalTarget(game.enemy, card);
        if (spellTargetable || attackTargetable) c.classList.add("targetable");
        if (game.selected && enemyHasTaunt && !(card.keywords || []).includes("taunt")) c.classList.add("blocked");
        c.onclick = () => clickEnemyMinion(card.uid);
      }
      el.appendChild(c);
    });
  }

  // 單張卡片 DOM（含技能徽章、聖盾、星級、閃卡）
  function renderCard(card) {
    const r = RARITY[card.rarity] || RARITY.common;
    const el = document.createElement("div");
    el.className = "card spawn" + (card.type === CARD_TYPE.SPELL ? " spell-card" : "") + (card.foil ? " foil" : "");
    el.dataset.uid = card.uid;
    el.style.setProperty("--rarity", r.color);
    el.style.setProperty("--glow", r.glow);

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
  function flash(msg) { log("⚠️ " + msg, "me"); }

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
      a.style.setProperty("--lx", dx * 0.5 + "px");
      a.style.setProperty("--ly", dy * 0.5 + "px");
      a.classList.add("lunge-to");
      setTimeout(() => { a.classList.remove("lunge-to"); a.style.removeProperty("--lx"); a.style.removeProperty("--ly"); }, 360);
      setTimeout(() => { t.classList.add("hit-shake"); screenShake(); setTimeout(() => t.classList.remove("hit-shake"), 320); }, 150);
    } else {
      a.classList.add("attacking"); setTimeout(() => a.classList.remove("attacking"), 300);
    }
  }

  function floatDamage(uidOrId, amount) {
    const el = elFor(uidOrId); if (!el) return;
    const r = el.getBoundingClientRect();
    const d = document.createElement("div");
    d.className = "dmg-float"; d.textContent = "-" + amount;
    d.style.left = (r.left + r.width / 2) + "px";
    d.style.top = (r.top + 8) + "px";
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 800);
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

  // 戰績 + 金幣經濟（CP0-2）：閉合「打贏→賺金→開包→變強」迴圈
  function loadStats() {
    try { return JSON.parse(localStorage.getItem("card_stats_v1")) || { wins: 0, losses: 0, streak: 0, bestStreak: 0, coins: 0 }; }
    catch { return { wins: 0, losses: 0, streak: 0, bestStreak: 0, coins: 0 }; }
  }
  function saveStats(s) { try { localStorage.setItem("card_stats_v1", JSON.stringify(s)); } catch {} }

  function showOverlay(title, win) {
    const ov = document.getElementById("overlay");
    document.getElementById("overlayTitle").textContent = title;
    ov.classList.toggle("win", win); ov.classList.toggle("lose", !win);

    // 更新戰績與金幣
    const s = loadStats();
    if (win) {
      s.wins++; s.streak++; if (s.streak > s.bestStreak) s.bestStreak = s.streak;
      const coinReward = 50 + s.streak * 10; // 連勝越多賺越多
      s.coins += coinReward;
      var rewardLine = `💰 +${coinReward} 金幣（共 ${s.coins}）`;
    } else {
      s.losses++; s.streak = 0;
      s.coins += 20; // 落敗安慰金
      var rewardLine = `💰 +20 金幣（共 ${s.coins}）`;
    }
    saveStats(s);
    // 顯示戰績
    const stats = document.getElementById("resultStats");
    if (stats) {
      stats.innerHTML = `
        <div class="streak">${win && s.streak >= 2 ? `🔥 ${s.streak} 連勝！` : ""}</div>
        <div>戰績：${s.wins} 勝 ${s.losses} 敗 · 最高連勝 ${s.bestStreak}</div>
        <div class="coin">${rewardLine}</div>
        <div class="hint">💡 用金幣去「開卡包」抽更強的卡，組成你的牌組！</div>`;
    }
    if (win) burstStars();
    setTimeout(() => ov.classList.add("show"), 500);
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
  newGame();

  // 提供給入口頁主題切換用（重繪卡面）
  window.__rerenderBattle = render;
  // 提供給難度選擇器：換難度後重開一局
  window.__newGame = newGame;
  window.__difficulties = DIFFICULTY;

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
  };
  function prepMinion(c) { c.uid = "t" + Math.random().toString(36).slice(2, 8); c.maxHealth = c.health; if ((c.keywords || []).includes("divineshield")) c.shield = true; c.canAttack = true; return c; }
})();
