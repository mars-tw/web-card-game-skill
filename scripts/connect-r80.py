"""Apply bounded presentation changes; battle rules and impact timing unchanged."""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
p=R/'templates/card-battle/battle.js';s=p.read_text(encoding='utf-8')
def change(a,b):
 global s
 assert a in s,a[:100]
 s=s.replace(a,b,1)
change('  let game;','''  let game;
  // Presentation only: never insert empty slots or accessory metadata into Core state.
  const r80Views = new WeakMap();
  function r80View() {
    if (!r80Views.has(game)) r80Views.set(game, {player:[],enemy:[],variants:new Map(),counts:new Map()});
    return r80Views.get(game);
  }
  function r80Variant(card) {
    if (!game || !card.uid || !['footman','archer'].includes(card.id)) return 0;
    const view=r80View();
    if (!view.variants.has(card.uid)) {
      const count=view.counts.get(card.id)||0;view.variants.set(card.uid,count%2);view.counts.set(card.id,count+1);
    }
    return view.variants.get(card.uid);
  }
  function r80Slots(field,side) {
    const view=r80View(), slots=view[side], live=new Set(field.map(c=>c.uid));
    for (let n=0;n<slots.length;n++) {
      const slot=slots[n];if(!slot)continue;
      if(!live.has(slot.uid) && slot.fallenTurn===undefined)slot.fallenTurn=game.turnCount||1;
      if(slot.fallenTurn!==undefined && (game.turnCount||1)>slot.fallenTurn+1)slots[n]=null;
    }
    for(const card of field) {
      r80Variant(card);
      if(slots.some(slot=>slot?.uid===card.uid))continue;
      let free=slots.findIndex(slot=>slot===null);
      if(free<0 && slots.length>=7)free=slots.findIndex(slot=>!live.has(slot?.uid));
      const value={uid:card.uid,id:card.id};if(free<0)slots.push(value);else slots[free]=value;
    }
    // Only trailing expired slots collapse; a live survivor never changes its original slot.
    while(slots.length && slots.at(-1)===null)slots.pop();
    return slots.map((slot,index)=>({slot,index,card:field.find(c=>c.uid===slot?.uid)}));
  }
  function r80WetMark(el,side) {
    const board=document.querySelector('.board');
    if(!board?.classList.contains('r76-wet') || (board.dataset.wetSide==='enemy'?'player':'enemy')!==side)return;
    const mark=document.createElement('img');mark.className='r80-watermark';mark.src='../../assets/art/r79/foam.webp?v=r79-foam';mark.alt='';el.appendChild(mark);
  }''')
change('    if (field.length === 0) {','    const slots=r80Slots(field,side);\n    if (field.length === 0 && !slots.some(({slot})=>slot)) {')
change('    field.forEach((card, index) => {\n      const c = renderCard(card);','''    slots.forEach(({slot,index,card}) => {
      if(!card) {
        const ghost=document.createElement('div');ghost.className='r80-empty-slot';ghost.dataset.slot=String(index);
        if(slot){ghost.dataset.fallenUid=slot.uid;ghost.setAttribute('aria-label','退場空位');}
        else ghost.setAttribute('aria-hidden','true');
        r80WetMark(ghost,side);frag.appendChild(ghost);return;
      }
      const c = renderCard(card);c.dataset.slot=String(index);
      r80WetMark(c,side);''')
change('field.slice(0,index).some(previous => previous.id === card.id)','field.filter(previous => previous.id === card.id).length>1 && r80Variant(card)===1')
change('    const artSource = ({ footman:',"    const variant=r80Variant(card);el.dataset.artVariant=String(variant);\n    const variantName=variant===1?({footman:'footman-band',archer:'archer-hood'})[card.id]:null;\n    const artSource = (variantName ? `../../assets/art/r80/${variantName}.webp` : null) || ({ footman:")
change('    const artLowSource = ({ emberpup:',"    const artLowSource = (variantName ? `../../assets/art/r80/${variantName}-low.webp` : null) || ({ emberpup:")
change('      img.src = ({ footman:',"      const variantName=r80Variant(card)===1?({footman:'footman-band',archer:'archer-hood'})[card.id]:null;\n      img.src = (variantName?`../../assets/art/r80/${variantName}.webp`:null) || ({ footman:")
change("'兩次交換留下潮能；這次的勝利來自你選擇的浪潮。'","'滿潮施放，浪峰命中敵陣。這次的航程由你掌舵。'")
change('    el.classList.add("show");\n    clearTimeout(turnBannerTimer);','''    const source=document.querySelector('.r75-tide-channel').getBoundingClientRect();
    el.style.top=`${source.top+source.height/2}px`;
    el.classList.add("show");
    clearTimeout(turnBannerTimer);''')
s=s.replace('../../assets/art/r79/wave.webp?v=r79-wave','../../assets/art/r80/wave.webp')
change("    const origin=document.getElementById(side==='enemy'?'enemyField':'playerField').getBoundingClientRect();","    const origin=document.getElementById(side==='enemy'?'enemyField':'r75BoardPips').getBoundingClientRect();")
change("    // Real painted foam is placed over each target, including lethal targets that leave at impact.",'''    // A source-anchored path remains visible while the crest advances; allies are below its clip.
    const playerRect=document.getElementById('playerField').getBoundingClientRect();
    const source=document.querySelector('.r75-tide-channel').getBoundingClientRect();
    const height=Math.max(140,rect.height*1.35);
    wave.style.setProperty('--wave-height',`${height}px`);
    wave.style.setProperty('--r79-wave-top',`${rect.top+rect.height*.5-height*.5}px`);
    wave.style.setProperty('--r79-travel',horizontal?'0px':`${origin.top+origin.height*.5-(rect.top+rect.height*.5)}px`);
    wave.style.setProperty('--r80-clip-bottom',side==='player'&&!horizontal?`${Math.max(0,innerHeight-source.bottom-2)}px`:'0px');
    wave.dataset.source='waterline';wave.dataset.caster=side;
    const trail=document.createElement('div');trail.className='r80-current-path';
    if(!horizontal)Object.assign(trail.style,{left:`${origin.left+origin.width*.5-24}px`,top:`${rect.bottom-8}px`,width:'48px',height:`${Math.max(20,source.top-rect.bottom+16)}px`});
    else Object.assign(trail.style,{left:`${origin.left}px`,top:`${rect.top+rect.height*.5-18}px`,width:`${Math.max(24,rect.left-origin.left)}px`,height:'36px'});
    wave.appendChild(trail);
    // Real painted foam is placed over each target, including lethal targets that leave at impact.''')
change("    document.body.dataset.r76Wave = 'true';","    document.body.dataset.r76Wave = 'true';document.body.dataset.r80Caster=side;")
change("if(game===waveGame)delete document.body.dataset.r76Wave;","if(game===waveGame){delete document.body.dataset.r76Wave;delete document.body.dataset.r80Caster;}")
change("game.player.tidebreaksUsed>0 ? '裂潮已退，濕甲板保留到下一回合。'","game.player.tidebreaksUsed>0 ? '裂潮只耗潮能，不耗法力；敵陣水痕留到下一回合。'")
change("'滿潮了！按裂潮，或到觀潮台確認漲潮。'","'滿潮了！按裂潮，只耗潮能、不耗法力。'")
change('滿六格後可施放。`;','滿六格後可施放。裂潮只耗潮能，不耗法力。`;')
change("    document.querySelectorAll('.r75-preview-number').forEach(el => el.remove());","    document.querySelectorAll('.r80-preview-damage').forEach(el=>el.remove());\n    document.querySelectorAll('.r75-preview-number').forEach(el => el.remove());")
change("      const unit=e.field.find(m=>m.uid===el.dataset.uid);",'''      const unit=e.field.find(m=>m.uid===el.dataset.uid);
      if(tideMode==='flood') {
        const damage=document.createElement('span');damage.className='r80-preview-damage';
        damage.textContent=unit?(unit.shield?'擋下':'−1'):'−2';
        damage.setAttribute('aria-label',unit?(unit.shield?'聖盾擋下傷害':'將受1點傷害'):'英雄將受2點傷害');el.appendChild(damage);
      }''')
change("  function closeTideChart() {\n    document.getElementById('tideChartPanel').hidden = true;","  function closeTideChart() {\n    document.getElementById('tideChartPanel').hidden = true;\n    document.querySelectorAll('.r80-preview-damage').forEach(el=>el.remove());")
p.write_text(s,encoding='utf-8')
# Release revision in live pages only; historical reports and source receipts retain their revisions.
live=[R/'index.html',R/'sw.js',R/'manifest.webmanifest',R/'offline.html',R/'README.md',*R.glob('templates/**/*.html'),*R.glob('templates/**/*.js'),*R.glob('templates/**/*.css')]
for p in live:
 t=p.read_text(encoding='utf-8').replace('card-battle-r79-v1','card-battle-r80-v1').replace('card_sw_auto_reload_r79_v1','card_sw_auto_reload_r80_v1')
 if p.name=='README.md':t=t.replace('0.12.0','0.13.0')
 if p.as_posix().endswith('card-battle/index.html'):t=t.replace('<link rel="stylesheet" href="../r79-art.css?v=card-battle-r80-v1">','<link rel="stylesheet" href="../r79-art.css?v=card-battle-r80-v1">\n<link rel="stylesheet" href="../r80-art.css?v=card-battle-r80-v1">')
 p.write_text(t,encoding='utf-8')
for name in ['package.json','package-lock.json']:
 p=R/name;t=p.read_text(encoding='utf-8').replace('"version": "0.12.0"','"version": "0.13.0"');p.write_text(t,encoding='utf-8')
p=R/'sw.js';t=p.read_text(encoding='utf-8').replace('const PRECACHE', 'const PRECACHE')
t=t.replace('  "templates/r79-art.css', '  "templates/r80-art.css?v=card-battle-r80-v1",\n  "assets/art/r80/footman-band-low.webp",\n  "assets/art/r80/archer-hood-low.webp",\n  "assets/art/r80/wave.webp",\n  "templates/r79-art.css',1);p.write_text(t,encoding='utf-8')
# Exact current revision tests follow the bumped release; no behavioral assertion changes.
for p in [R/'scripts/test-r74-review.js',R/'scripts/test-quality-gates.js']:
 t=p.read_text(encoding='utf-8').replace('card-battle-r79-v1','card-battle-r80-v1').replace('0.12.0','0.13.0');p.write_text(t,encoding='utf-8')
print('R80 connected, version0.13.0, no Core rule mutations')
