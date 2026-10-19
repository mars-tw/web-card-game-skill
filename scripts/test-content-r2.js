const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../templates/card-battle/tide-puzzles'),S=require('../templates/card-battle/tide-session'),Core=require('../templates/card-battle/core');
const v={};vm.createContext(v);vm.runInContext(fs.readFileSync('templates/card-battle/cards.js','utf8')+';this.pool=CARD_POOL',v);const pool=JSON.parse(JSON.stringify(v.pool));
let checks=0;function check(value,label){assert.ok(value,label);checks++;console.log('PASS',label);}
const fresh=id=>C.setup({player:{side:'player'},enemy:{side:'enemy'}},id,pool);
check(C.progress({completed:{bad:true}}).completed.length===0,'non-array progress cannot crash startup');
const old=C.progress({version:1,completed:['fallen','moen']});check(old.completed.length===2&&old.forecastUses===0&&!old.harborBossCleared,'R1 progress migration preserves completions');
const done={...C.complete(old,'shield'),forecastUses:3,harborBossCleared:true};check(JSON.stringify(C.progress(JSON.stringify(done)))===JSON.stringify(done),'R2 progress exact round trip');
check(C.progress({forecastUses:-99}).forecastUses===0&&C.progress({forecastUses:1e99}).forecastUses===1000000,'usage counter bounded');
const art=[];for(const d of C.PUZZLES){check(C.RECAP[d.id].line.length>20&&C.RECAP[d.id].cards.every(([id])=>pool.some(c=>c.id===id)),d.id+' concrete recap uses real card art');art.push(JSON.stringify(C.RECAP[d.id].cards));}check(new Set(art).size===6,'six distinct result compositions');
let g=fresh('forecast');g.forecast.original=g.forecast.directions.slice();check(C.reverse(g,1)&&g.forecast.directions[1]==='ebb'&&g.forecast.directions[0]==='flood','tutorial changes a future turn, current unchanged');
let decoded=S.decode(S.encode(g),pool);check(decoded.forecast.reversed&&decoded.forecast.original[1]==='flood'&&!C.reverse(decoded,2),'resume preserves comparison and consumes only reversal');
g.turnCount=2;const before=S.encode(g);check(!C.reverse(g,0)&&before===S.encode(g),'past turn cannot change state');
g=fresh('forecast');delete g.content;g.forecast.scope='free';check(S.decode(S.encode(g),pool)?.forecast.scope==='free','regular free battle forecast checkpoint accepted');delete g.forecast.scope;check(!S.decode(S.encode(g),pool),'unspecified forecast on non-content checkpoint rejected');
g=fresh('forecast');g.turnCount=4;for(const mode of ['ebb','flood']){const copy=JSON.parse(S.encode(g)).game;copy.player.opp=copy.enemy;copy.enemy.opp=copy.player;copy.player.tide=6;check(Core.tidebreak(copy,{side:'player',mode},()=>.4).ok,'fourth turn actual '+mode+' cast legal');}
g=fresh('forecast');const wrong=S.encode(g);check(!Core.tidebreak(g,{side:'player',mode:'ebb'},()=>.4).ok&&S.encode(g)===wrong,'wrong forecast direction costs no resources');
g.forecast.original=['bad'];check(!S.decode(S.encode(g),pool),'invalid tutorial original rejected');
g=fresh('moen');g.content.harborBoss=true;check(S.decode(S.encode(g),pool)?.content.harborBoss,'boss entry survives checkpoint');
console.log('Content R2 rules:',checks,'PASS');
