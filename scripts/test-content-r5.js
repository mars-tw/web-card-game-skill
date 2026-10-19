const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const C=require('../templates/card-battle/tide-puzzles'),Core=require('../templates/card-battle/core'),S=require('../templates/card-battle/tide-session');
const v={};vm.createContext(v);vm.runInContext(fs.readFileSync('templates/card-battle/cards.js','utf8')+';this.pool=CARD_POOL',v);const pool=JSON.parse(JSON.stringify(v.pool));
let checks=0;function check(value,message){assert.ok(value,message);checks++;console.log('PASS',message);}
const fresh=id=>C.setup({player:{side:'player'},enemy:{side:'enemy'}},id,pool);
check(C.counts(null).puzzles===0&&C.counts(null).verification===0,'empty progress has separate counters');
const all={completed:[...C.PUZZLES.map(d=>d.id),'undertow','forecast','moen','fallen','unknown']};
check(C.counts(all).puzzles===6&&C.counts(all).verification===1,'all lessons, duplicate and corrupt ids cannot produce 7/6');
check(C.counts({completed:['undertow','forecast','moen']}).puzzles===0,'special lessons never inflate six puzzles');
for(let n=0;n<=6;n++)check(C.unlocked({completed:C.PUZZLES.slice(0,n).map(d=>d.id)})===(n===6),'verification requires all six, completed '+n);
for(const d of C.PUZZLES){const g=fresh(d.id);check(S.decode(S.encode(g),pool)?.content.id===d.id,d.id+' real checkpoint valid');if(d.id!=='fallen')check(!/先|再|接著|最後/.test(d.goal+' '+d.hint),d.id+' playing objective does not give ordered answer');g.turn='enemy';check(C.outcome(g)==='failed',d.id+' passing without action fails');check(!/已施放|已陣亡|交換後陣亡/.test(C.failure(g)),d.id+' idle failure invents no action');}
let g=fresh('spell');Core.playCard(g,{side:'player',cardUid:g.player.hand[0].uid,targetUid:g.enemy.field[0].uid},()=>.4);
// Use a real post-cast board to distinguish the missing tide from missing spell.
check(!g.player.hand.length&&g.enemy.field[0].health===1,'spell really resolves before diagnosis');
check(C.failure(g).includes('缺少漲潮')&&!C.failure(g).includes('還沒完成施法'),'diagnosis respects spell that was already cast');
check(!C.failure(fresh('undertow')).includes('未受保護就交換'),'idle verification does not claim exchange happened');
g=fresh('cross');Core.resolveAttack(g,{attackerSide:'player',attackerUid:'content-player-0',defenderUid:'content-enemy-0'},()=>.4);check(C.failure(g).includes('缺少騎士')&&!C.failure(g).includes('錯在交換對象'),'correct first exchange diagnosed as missing second exchange');Core.resolveAttack(g,{attackerSide:'player',attackerUid:'content-player-1',defenderUid:'content-enemy-1'},()=>.4);check(C.failure(g).includes('缺少漲潮'),'correct two exchanges diagnosed as missing tide');
check(!/先點|再|接著/.test(C.get('forecast').goal),'forecast entrance only states objective');
g=fresh('forecast');g.turnCount=2;const f=JSON.stringify(g.forecast);check(!C.reverse(g,0)&&JSON.stringify(g.forecast)===f,'wrong timing consumes nothing');check(C.reverse(g,1)&&S.decode(S.encode(g),pool).forecast.reversed,'legal reversal survives save');
console.log('Content R5 rules:',checks,'PASS');
