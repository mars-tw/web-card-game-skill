const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),R=require('../templates/card-battle/content-r11'),C=require('../templates/card-battle/tide-puzzles'),S=require('../templates/card-battle/tide-session'),vm=require('node:vm');
let checks=0;function check(x,m){assert.ok(x,m);checks++;console.log('PASS',m);}
const box={};vm.createContext(box);vm.runInContext(fs.readFileSync('templates/card-battle/cards.js','utf8')+';this.pool=CARD_POOL',box);const pool=JSON.parse(JSON.stringify(box.pool));
check(new Set(C.PUZZLES.map(d=>R.questions[d.id])).size===6,'six unique topic-specific decision questions');
check(/火焰箭.*3 傷/.test(R.questions.spell)&&!/交換/.test(R.questions.spell),'firebolt question names the spell, never exchange template');
for(const d of C.PUZZLES){const g=C.setup({player:{side:'player'},enemy:{side:'enemy'}},d.id,pool);check(S.decode(S.encode(g),pool),'puzzle save round trip '+d.id);check(C.isPuzzle(d.id),'all six end-turn restrictions '+d.id);}
const g=C.setup({player:{side:'player'},enemy:{side:'enemy'}},'moen',pool);check(R.moenModel(g).rule.includes('自己 3 血'),'healing subject is explicitly Moen herself');g.content.enemyEbbUsed=true;g.content.returning=true;g.enemy.tide=1;
check(R.moenModel(g).upcoming.includes('我方見習士兵 3 傷'),'live counterattack honors the first surviving taunt');g.player.field=g.player.field.filter(x=>x.id!=='footman');
check(R.moenModel(g).rule.includes('再補 1 格')&&R.moenModel(g).upcoming.includes('我方騎士 3 傷'),'live threshold and counterattack target');
g.enemy.tide=2;check(R.moenModel(g).rule.includes('已達門檻'),'live threshold reacts before judgment');
g.content.returnResolved=true;g.content.returnTide=1;g.content.returnHeal=false;g.content.counterDamage=3;g.player.field.find(x=>x.id==='knight').health=1;check(R.recap(g).includes('承受騎士反攻 3 傷')&&R.recap(g).includes('剩 1 血'),'prevented branch recap uses actual combat health');const preventedLine=R.closingLine(g);
g.content.counterDamage=0;check(R.recap(g).includes('反攻 0 傷'),'shielded counterattack never claims three damage');
g.content.returnTide=2;g.content.returnHeal=true;g.content.returnHealAmount=2;g.enemy.field=[];check(R.recap(g).includes('追加回復 2 血')&&R.moenModel(g).upcoming.includes('沒有反攻'),'triggered branch recap and no stale enemy target');check(R.closingLine(g)!==preventedLine,'Moen has two distinct branch closing lines');check(S.decode(S.encode(g),pool).content.returnHealAmount===2,'actual branch receipt persists');
if(!process.argv.includes('--logic')){ const m=JSON.parse(fs.readFileSync('docs/art/ASSET_MANIFEST_CONTENT_R11.json'));for(const a of m.assets)check(crypto.createHash('sha256').update(fs.readFileSync(a.path)).digest('hex')===a.sha256&&a.tool==='image_gen.imagegen','painted floor provenance '+a.path); }
check(fs.readFileSync('sw.js','utf8').includes('content-r11/moen.webp'),'offline precache includes new backgrounds');console.log('VERIFIED R11',checks,'checks');
