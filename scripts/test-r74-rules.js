const assert = require('node:assert/strict');
const Core = require('../templates/card-battle/core');
const Session = require('../templates/card-battle/tide-session');
const Pose = require('../templates/card-battle/pose-player');
const { CARD_POOL } = require('../templates/card-battle/cards');
let count = 0;
function check(v, label) { assert.ok(v, label); count++; console.log('✓ ' + label); }
function state() {
  const side = key => ({ side: key, hp: 8, maxHp: 12, mana: 0, manaMax: 0, fatigue: 0, tide: 6, hand: [], deck: [], field: [] });
  const g = { difficulty: 'normal', turnCount: 1, turn: 'player', player: side('player'), enemy: side('enemy'), over: false };
  g.player.opp = g.enemy; g.enemy.opp = g.player;
  const card = (id, uid) => ({ ...CARD_POOL.find(c => c.id === id), uid, maxHealth: 2, canAttack: true });
  g.player.field = [card('footman','p')]; g.enemy.field = [card('archer','e')];
  return g;
}
for (const mode of ['ebb', 'flood']) {
  const g = state(), r = Core.tidebreak(g, { side: 'player', mode }, () => .5);
  check(r.ok && g.player.tide === 0 && g.player.tidebreaksUsed === 1, mode + ' 滿潮只消耗一次');
  check(!Core.tidebreak(g, { side: 'player', mode }, () => .5).ok, mode + ' 拒絕重複施放');
  if (mode === 'ebb') {
    check(g.player.hp === 11 && g.player.field[0].shield && g.enemy.hp === 8 && g.enemy.field[0].health === 2, '退潮護航只回復己方並給聖盾');
    const a = Core.resolveAttack(g, { attackerSide: 'player', attackerUid: 'p', defenderUid: 'e' }, () => .5);
    check(a.ok && g.player.field[0].health === 2 && !g.player.field[0].shield && g.enemy.field[0].health === 1, '聖盾真正在下一次交換擋傷，攻擊仍對敵方造成傷害');
  } else check(g.enemy.hp === 6 && g.enemy.field[0].health === 1 && g.player.hp === 8, '漲潮保留原本全體傷害');
}
for (const change of [g => g.player.tide=5, g => g.turn='enemy', g => g.over=true, g => g.pendingBattlecry={uid:'p'}]) {
  const g = state(); change(g); const before = Session.encode(g);
  check(!Core.tidebreak(g,{side:'player',mode:'ebb'},()=>.5).ok && Session.encode(g) === before, '非法狀態拒絕退潮，零消耗');
}
{
  const g = state(); const before = Session.encode(g);
  check(!Core.tidebreak(g,{mode:'other'},()=>.5).ok && Session.encode(g) === before, '未知潮向拒絕且零變更');
  g.player.hp=12; g.player.field[0].shield=true;
  const r=Core.tidebreak(g,{mode:'ebb'},()=>.5);
  check(r.ok && g.player.hp===12 && !r.events.some(e=>e.type==='shieldGain'), '滿血不溢補、既有聖盾不疊加');
}
{
  const g = state(), restored=Session.decode(Session.encode(g),CARD_POOL);
  check(restored && restored.player.opp===restored.enemy && restored.enemy.opp===restored.player, '循環對手參照可序列化及恢復');
  for (const mutate of [g=>g.over=true,g=>g.turn='enemy',g=>g.pendingSpell={uid:'p'},g=>g.player.hp=0,g=>g.player.field[0].id='missing',g=>g.player.field[0].cost=null,g=>g.enemy.field[0].uid='p']) {
    const bad=state();mutate(bad);check(!Session.decode(Session.encode(bad),CARD_POOL),'損壞／非安全檢查點拒絕還原');
  }
  check(!Session.decode('{bad',CARD_POOL) && !Session.decode('x'.repeat(250001),CARD_POOL), '無效與超大存檔安全退回');
  g.player.field.push({id:'token',type:'minion',name:'骷髏',cost:0,attack:2,health:2,uid:'token-p',image:'https://example.invalid/tracker.png'});
  const tokenSave=Session.decode(Session.encode(g),CARD_POOL);
  check(tokenSave?.player.field[1].id==='token' && tokenSave.player.field[1].image===null,'合法衍生物可恢復，檢查點不採用外部圖片來源');
}
check(Pose.plan(null,'attack').status==='BLOCKED','缺動作素材明確阻擋，不用單圖假動作');
check(Pose.plan({attack:{anticipation:[],impact:[],recovery:[]}},'attack').status==='BLOCKED','缺任一三段姿勢不可播放攻擊');
check(Pose.plan({walk:{frames:[{src:'../../assets/animations/a.webp',ms:100}]}},'walk').status==='BLOCKED','單幀不能當行走');
check(Pose.plan({attack:{anticipation:[{src:'https://example.invalid/a.webp',ms:100}],impact:[],recovery:[]}},'attack').status==='BLOCKED','不可把遠端或未備妥素材當可播放');
const frame=src=>({src:'../../assets/animations/'+src,ms:16});
const asset={attack:{anticipation:[frame('prepare.webp')],impact:[frame('hit.webp')],recovery:[frame('recover.webp')]}};
const plan=Pose.plan(asset,'attack');
check(plan.status==='PREPARED' && plan.frames.filter(f=>f.hit).length===1 && plan.frames.findIndex(f=>f.hit)===1,'逐幀合同只在 impact 觸發一次命中');
const played=[];
Pose.play(asset,'attack',src=>played.push(src),()=>played.push('impact')).then(result=>{
  check(result.status==='EXECUTED' && played[2]==='impact' && played.length===4,'播放器以幀回呼替換視覺，命中在準備之後、恢復之前');
  console.log(`R74 rules: ${count} PASS, 0 FAIL`);
}).catch(e=>{console.error(e);process.exitCode=1;});
