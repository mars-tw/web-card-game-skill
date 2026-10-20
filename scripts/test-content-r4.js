const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const C=require('../templates/card-battle/tide-puzzles'),Core=require('../templates/card-battle/core'),S=require('../templates/card-battle/tide-session');
const v={};vm.createContext(v);vm.runInContext(fs.readFileSync('templates/card-battle/cards.js','utf8')+';this.pool=CARD_POOL',v);const pool=JSON.parse(JSON.stringify(v.pool));
let checks=0;function check(v,m){assert.ok(v,m);checks++;console.log('PASS',m);}
const fresh=id=>C.setup({player:{side:'player'},enemy:{side:'enemy'}},id,pool);
check(!C.failure(fresh('shelter')).includes('陣亡'),'unfinished exchange does not falsely claim archer died');
check(C.failure(fresh('spell')).includes('還沒完成施法'),'unused spell is diagnosed as a missing action');
check(C.failure(fresh('cross')).includes('尚未完成'),'unplayed cross board is diagnosed as incomplete');
for(const d of C.PUZZLES.slice(1))check(!/先|再|最後|接著/.test(d.hint),d.id+' context does not reveal ordered solution');
check(!C.unlocked(null),'verification locked before six completions');let p=null;for(const d of C.PUZZLES)p=C.complete(p,d.id);check(C.unlocked(p),'verification unlocks after all six');
let g=fresh('undertow');check(g.player.field[0].health===4&&C.outcome(g)===null,'new verification starts with a different four-health target');
Core.resolveAttack(g,{attackerSide:'player',attackerUid:g.player.field[0].uid,defenderUid:g.enemy.field[0].uid},()=>.4);check(C.outcome(g)==='failed','unprotected knight cannot satisfy four-health objective');check(C.failureCard(g)==='knight'&&C.failure(g).includes('缺少'),'specific error names missing protection');
g=fresh('undertow');Core.tidebreak(g,{side:'player',mode:'ebb'},()=>.4);Core.resolveAttack(g,{attackerSide:'player',attackerUid:g.player.field[0].uid,defenderUid:g.enemy.field[0].uid},()=>.4);check(C.outcome(g)==='completed'&&g.player.field[0].health===4,'same ebb rule preserves new target');
check(S.decode(S.encode(fresh('undertow')),pool).content.id==='undertow','verification checkpoint round trip');p=C.complete(p,'undertow');p=C.complete(p,'forecast');p=C.complete(p,'moen');check(C.progress(JSON.stringify(p)).completed.length===9,'all nine completions survive progress round trip');
g=fresh('forecast');g.turnCount=4;for(const mode of ['flood','ebb']){g.player.tide=6;check(Core.tidebreak(g,{side:'player',mode},()=>.4).ok,'fourth turn '+mode+' remains playable');}
const m=require('../docs/art/ASSET_MANIFEST_CONTENT_R4.json');for(const f of m.files)check(require('node:crypto').createHash('sha256').update(fs.readFileSync(f.path)).digest('hex')===f.sha256,'actual source hash '+f.path);
if(!process.argv.includes('--logic')){ check(require('../docs/art/PROMPTS_CONTENT_R4.json').style_prefix===require('../docs/art/PROMPTS_CONTENT_R3.json').style_prefix,'new art uses exact existing style prefix'); }
console.log('Content R4 rules:',checks,'PASS');
