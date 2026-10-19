const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const C=require('../templates/card-battle/tide-puzzles'),Core=require('../templates/card-battle/core'),R=require('../templates/card-battle/content-r6'),S=require('../templates/card-battle/tide-session');
const v={};vm.createContext(v);vm.runInContext(fs.readFileSync('templates/card-battle/cards.js','utf8')+';this.pool=CARD_POOL',v);const pool=JSON.parse(JSON.stringify(v.pool));let checks=0;
function check(v,m){assert.ok(v,m);checks++;console.log('PASS',m);}
for(const [index,expected]of [[1,'ebb'],[2,'flood']]){
 const g=C.setup({player:{side:'player'},enemy:{side:'enemy'}},'forecast',pool);
 check(C.reverse(g,index)&&g.forecast.directions[index]===expected,'real single reversal '+index);
 const copy=R.tideCopy(C.direction({...g,turnCount:index+1}));
 check(copy.effect.startsWith(expected==='ebb'?'退潮時':'漲潮時')&&copy.effect.includes(expected==='ebb'?'聖盾':'英雄受 2'),'direction and actual rule explanation agree');
 const restored=S.decode(S.encode(g),pool);check(restored.forecast.original[index]!==restored.forecast.directions[index]&&restored.forecast.reversed,'changed round survives session encoding');
 check(!C.reverse(g,0),'second reversal cannot alter state');
}
for(const d of C.PUZZLES){const g=C.setup({player:{side:'player'},enemy:{side:'enemy'}},d.id,pool);const before=S.encode(g);for(const a of g.player.field)for(const t of g.enemy.field){const p=R.exchange(Core,g,a.uid,t.uid);check(S.encode(g)===before,d.id+' preview remains read-only');if(!p)continue;const actual=S.decode(before,pool);Core.resolveAttack(actual,{attackerSide:'player',attackerUid:a.uid,defenderUid:t.uid},()=>.5);check(p.units.every(u=>(actual[u.side].field.find(x=>x.uid===u.uid)?.health||0)===u.after),d.id+' projected UID health equals impact result');}}
console.log('Content R7 rules:',checks,'PASS');
