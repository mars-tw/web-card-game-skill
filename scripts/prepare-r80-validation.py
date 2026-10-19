from pathlib import Path
R=Path(__file__).resolve().parents[1]
for p in [R/'templates/harbor.html',R/'templates/card-battle/battle.js',R/'sw.js']:
 s=p.read_text(encoding='utf-8').replace('assets/art/r79/logo.webp?v=r79-logo','assets/art/r80/logo.webp').replace('assets/art/r79/victory-navigator.webp?v=3f81a50e','assets/art/r80/victory-navigator.webp');p.write_text(s,encoding='utf-8')
p=R/'scripts/test-battle-e2e.js';s=p.read_text(encoding='utf-8').replace('card-battle-r79-v1','card-battle-r80-v1');p.write_text(s,encoding='utf-8')
p=R/'scripts/test-r76-art.js';s=p.read_text(encoding='utf-8').replace('/assets/art/r79/victory-navigator.webp','/assets/art/r80/victory-navigator.webp');p.write_text(s,encoding='utf-8')
p=R/'scripts/measure-r80-frames.js';p.write_text((R/'scripts/measure-r79-frames.js').read_text(encoding='utf-8').replace('evidence/r79-art','evidence/r80-art'),encoding='utf-8')
s=(R/'scripts/capture-r79-wave.js').read_text(encoding='utf-8').replace('compare/r79/wave','compare/r80/wave')
s=s.replace('playerHp:g.player.hp,','playerMana:g.player.mana,playerManaMax:g.player.manaMax,playerHp:g.player.hp,')
s=s.replace('wet:document.querySelector',"slots:[...document.querySelectorAll('.battlefield [data-slot]')].map(i=>({uid:i.dataset.uid||i.dataset.fallenUid,slot:i.dataset.slot,x:i.getBoundingClientRect().x,y:i.getBoundingClientRect().y})),wet:document.querySelector")
s=s.replace("await p.waitForTimeout(80);","await p.waitForTimeout(100);")
s=s.replace('assert.deepEqual(after.player,before.player);',"assert.deepEqual(after.player,before.player);assert.equal(after.playerMana,before.playerMana);assert.equal(impact.playerMana,before.playerMana);\n const survivor=after.enemy[0].uid;assert.equal(after.slots.find(s=>s.uid===survivor).slot,before.slots.find(s=>s.uid===survivor).slot);assert.ok(Math.abs(after.slots.find(s=>s.uid===survivor).x-before.slots.find(s=>s.uid===survivor).x)<1,'survivor keeps x position');")
(R/'scripts/capture-r80-wave.js').write_text(s,encoding='utf-8')
s=(R/'scripts/capture-r79-art.js').read_text(encoding='utf-8').replace("require('./capture-r79-wave')","require('./capture-r80-wave')").replace('compare/r79/after','compare/r80/after').replace('compare/r79/wave','compare/r80/wave').replace('evidence/r79-art','evidence/r80-art').replace('R79 captured','R80 captured')
s=s.replace("if(scale>1){const style", "if(scale>1){const style")
(R/'scripts/capture-r80-art.js').write_text(s,encoding='utf-8')
print('R80 screenshot and frame measurement scripts ready')
