const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const Core=require('../templates/card-battle/core'),C=require('../templates/card-battle/tide-puzzles'),Session=require('../templates/card-battle/tide-session');
const crypto=require('node:crypto'),path=require('node:path');
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync('templates/card-battle/cards.js','utf8')+';this.pool=CARD_POOL;',ctx);
const pool=JSON.parse(JSON.stringify(ctx.pool)),rng=()=>.4;
const fresh=id=>C.setup({player:{side:'player'},enemy:{side:'enemy'}},id,pool);
let checks=0;function check(v,m){assert.ok(v,m);checks++;}
for(const d of C.PUZZLES){
 const g=fresh(d.id),uids={p:g.player.field.map(c=>c.uid),e:g.enemy.field.map(c=>c.uid),h:g.player.hand.map(c=>c.uid)};
 for(const step of d.solution){const [action,a,b]=step.split(':');let r;
  if(action==='attack')r=Core.resolveAttack(g,{attackerSide:'player',attackerUid:uids.p[a],defenderUid:uids.e[b]},rng);
  if(action==='face')r=Core.resolveHeroAttack(g,{attackerSide:'player',attackerUid:uids.p[a]},rng);
  if(action==='spell')r=Core.playCard(g,{side:'player',cardUid:uids.h[a],targetUid:uids.e[b]},rng);
  if(action==='flood'||action==='ebb')r=Core.tidebreak(g,{side:'player',mode:action},rng);
  check(r?.ok,d.id+' legal action '+step);
 }
 check(C.outcome(g)==='completed',d.id+' solved by actual Core rules');
 const again=fresh(d.id);check(Session.decode(Session.encode(again),pool)?.content.id===d.id,d.id+' session round trip');
 check(C.complete(C.complete(null,d.id),d.id).completed.length===1,d.id+' idempotent progress');
}
let g=fresh('shelter');Core.resolveAttack(g,{attackerSide:'player',attackerUid:g.player.field[0].uid,defenderUid:g.enemy.field[0].uid},rng);check(C.outcome(g)==='failed','unprotected archer actually dies');
g=fresh('spell');Core.tidebreak(g,{side:'player'},rng);check(C.outcome(g)==='failed','premature lethal with survivor fails objective');
g=fresh('forecast');const before=Session.encode(g);check(!Core.tidebreak(g,{side:'player',mode:'ebb'},rng).ok,'forecast disallows wrong tide');check(Session.encode(g)===before,'wrong tide costs nothing');
check(!C.reverse(g,3)&&!C.reverse(g,-1),'invalid round rejected');check(C.reverse(g,0),'one reversal');check(C.direction(g)==='ebb','reversal changes current tide');check(!C.reverse(g,1),'second reversal rejected');check(Core.tidebreak(g,{side:'player',mode:'ebb'},rng).ok,'reversed tide playable');
check(C.valid(Session.decode(Session.encode(g),pool)),'forecast and consumed reversal round trip');
g.turnCount=4;g.player.tide=6;check(!C.direction(g)&&Core.tidebreak(g,{side:'player',mode:'flood'},rng).ok,'round four restores free tide');
g=fresh('forecast');g.turnCount=2;check(!C.reverse(g,0),'past forecast cannot change');
g=fresh('moen');g.turn='enemy';Core.advanceTurn(g,{phase:'startEnemy'},rng);const r=Core.tidebreak(g,{side:'enemy',mode:'ebb'},rng);g.content.enemyEbbUsed=true;check(r.ok&&g.enemy.hp===7&&g.enemy.tide===0&&g.enemy.field[0].shield,'Moen real ebb heals shields and consumes tide');
g=fresh('forecast');g.forecast.directions=['bad'];check(!C.valid(g)&&Session.decode(Session.encode(g),pool)===null,'corrupt forecast checkpoint rejected');
check(C.progress('{bad').completed.length===0,'corrupt progress recovers');check(C.progress({completed:['alien','fallen','fallen']}).completed.join()==='fallen','only known completions retained');
const manifest=require('../docs/art/ASSET_MANIFEST_CONTENT_R1.json');check(manifest.tool==='image_gen.imagegen'&&manifest.new_originals===1,'actual image tool provenance');
for(const file of manifest.files)check(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'..',file.path))).digest('hex')===file.sha256,'art hash '+file.path);
console.log(`Content R1: ${checks} PASS; all six Core solutions and persistence verified`);
