const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../templates/card-battle/tide-puzzles'),R=require('../templates/card-battle/content-r12'),Core=require('../templates/card-battle/core'),S=require('../templates/card-battle/tide-session');
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync('templates/card-battle/cards.js','utf8')+';this.pool=CARD_POOL',ctx);const pool=JSON.parse(JSON.stringify(ctx.pool));
let checks=0;function check(x,m){assert.ok(x,m);checks++;console.log('PASS',m);}
const setup=id=>C.setup({player:{side:'player'},enemy:{side:'enemy'}},id,pool);
for(const d of C.PUZZLES){const g=setup(d.id);for(const step of d.solution){const[a,b,c]=step.split(':');let result;
 if(a==='attack')result=Core.resolveAttack(g,{attackerSide:'player',attackerUid:'content-player-'+b,defenderUid:'content-enemy-'+c},()=>.5);
 if(a==='face')result=Core.resolveHeroAttack(g,{attackerSide:'player',attackerUid:'content-player-'+b,defenderSide:'enemy'},()=>.5);
 if(a==='spell')result=Core.playCard(g,{side:'player',cardUid:'content-hand-'+b,targetUid:'content-enemy-'+c},()=>.5);
 if(a==='flood'||a==='ebb')result=Core.tidebreak(g,{side:'player',mode:a},()=>.5);
 check(result?.ok,d.id+' legal '+step);R.record(g,result);if(g.enemy.hp>0&&g.player.hp>0)check(S.decode(S.encode(g),pool)?.content.r13Steps.length===g.content.r13Steps.length,d.id+' in-progress receipt round trip');
 }check(C.outcome(g)==='completed',d.id+' completes real rules');const lines=R.puzzleReceipt(g);check(!/弓手|傷害 \d[＋+]\d|貝盾|浪收割/.test(lines.join('')),d.id+' canonical name and source numbers');check((g.content.r13Steps||[]).length===d.solution.length,d.id+' actual ordered steps');
 check(C.progress(JSON.stringify(C.complete(null,d.id))).completed.includes(d.id),d.id+' completion progress round trip');
 if(d.id==='spell')check(lines.some(x=>x.includes('火焰箭 3＋漲潮 1')), 'spell source breakdown is 3 plus 1');
 if(d.id==='taunt')check(lines.some(x=>x.includes('漲潮 2＋迅捷狼 2')),'hero damage also names both real sources');
 if(d.id==='cross')check(lines.some(x=>x.includes('弓箭手')&&x.includes('已退場'))&&lines.some(x=>x.includes('獅鷲')&&x.includes('已退場')), 'cross result never calls a departed target alive');
}
for(const side of ['player','enemy']){const g=setup('moen'),k=g.player.field.find(x=>x.id==='knight'),enemy=g.enemy.field[0];enemy.shield=false;g.content.enemyEbbUsed=true;k.canAttack=true;enemy.canAttack=true;
 const result=Core.resolveAttack(g,side==='player'?{attackerSide:'player',attackerUid:k.uid,defenderUid:enemy.uid}:{attackerSide:'enemy',attackerUid:enemy.uid,defenderUid:k.uid},()=>.5);R.record(g,result);
 const hits=g.content.r12Events.filter(e=>e.type==='damage'&&e.uid===k.uid);check(k.health===1&&hits.reduce((s,e)=>s+e.amount,0)===3,side+' knight 4 minus actual 3 equals 1');check(hits.every(e=>e.attackerSide===side),side+' cost source distinguishes exchange from scripted counter');
 check(R.knightCostText(g).includes(side==='player'?'交換 3 − 反攻 0':'交換 0 − 反攻 3'),side+' rendered equation uses the real damage owner');
 const legacy={...g,content:{...g.content,r12Events:g.content.r12Events.map(({attackerSide,...e})=>e)}};check(R.knightCostText(legacy).includes('4 → 1 血（承傷來源未完整保留）'),side+' old checkpoints show the evidence gap instead of inventing zero costs');
}
const overkill=setup('moen'),own=overkill.player.field.find(x=>x.id==='knight'),foe=overkill.enemy.field[0];foe.shield=false;own.canAttack=true;foe.canAttack=true;
R.record(overkill,Core.resolveAttack(overkill,{attackerSide:'player',attackerUid:own.uid,defenderUid:foe.uid},()=>.5));
R.record(overkill,Core.resolveAttack(overkill,{attackerSide:'enemy',attackerUid:foe.uid,defenderUid:own.uid},()=>.5));
check(R.knightCostText(overkill).includes('＝6 傷；原 4 血，已退場'),'overkill is described as six damage, never a false 4-6=0 equation');
const unchanged=S.encode(overkill);R.knightCostText(overkill);check(S.encode(overkill)===unchanged,'cost rendering never changes the saved combat state');
check(fs.readFileSync('templates/card-battle/content-r13.css','utf8').includes('12px'),'forecast explicit inset');
check(require('../package').version==='0.25.0','R13 version');console.log('VERIFIED R13',checks,'checks');
