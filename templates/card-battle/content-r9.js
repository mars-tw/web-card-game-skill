/* Offline presentation and public rules; never mutates combat through rendering. */
(function(root,factory){const api=factory();if(root)root.CardContentR9=api;if(typeof module!=='undefined')module.exports=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const R11=typeof module!=='undefined'?require('./content-r11'):globalThis.CardContentR11;
  const limits={fallen:'本回合擊敗英雄',shield:'清空敵陣並擊敗英雄',shelter:'消滅狼；弓箭手存活',taunt:'清空敵陣並擊敗英雄',spell:'清空敵陣並擊敗英雄',cross:'清空敵陣；英雄歸零；騎士存活',undertow:'清空敵陣；騎士至少4血'};
  function puzzleStatus(g){
    const id=g.content?.id,enemy=g.enemy.field,by=id=>enemy.find(c=>c.id===id);
    if(id==='cross'&&!g.player.field.some(c=>c.id==='footman'))return `士兵退場；弓箭手${by('archer')?.health??0}血、獅鷲${by('griffin')?.health??0}血。`;
    if(id==='spell'&&!g.player.hand.length)return `火焰箭已命中；敵騎士${by('knight')?.health??0}血。`;
    if(id==='shield')return enemy[0]?.shield?R11.questions.shield:'聖盾已破；守衛生命未扣。';
    if(id==='taunt')return enemy.length?R11.questions.taunt:'敵陣已空；英雄尚有'+g.enemy.hp+'血。';
    if(id==='fallen')return g.player.field.length?R11.questions.fallen:'士兵退場；弓箭手'+(enemy[0]?.health??0)+'血。';
    if(id==='shelter')return g.player.field[0]?.shield?'弓箭手聖盾×1；可擋一次傷害。':R11.questions.shelter;
    return R11.questions[id]||'觀察目前盤面。';
  }
  const returnCanHeal=g=>(g.enemy.tide||0)>=2;
  // R8 checkpoints used returnHeal alone; a completed old heal must not replay.
  const returnCompleted=g=>g.content?.returnResolved===true||g.content?.returnHeal===true;
  function wolfInstruction(g){const wolf=g.player.field.find(c=>c.id==='wolf');return !wolf?'迅捷狼已退場，請依目前盤面安排反攻。':wolf.canAttack?'迅捷狼可出擊，保留補刀。':'下回合保留迅捷狼補刀。';}
  const solutions={fallen:'士兵打弓箭手，陣亡補滿潮能後施放漲潮。',shield:'士兵先打守衛破盾，再施放漲潮。',shelter:'先退潮給弓箭手聖盾，再攻擊迅捷狼。',taunt:'先漲潮清掉嘲諷士兵，再用狼攻擊英雄。',spell:'火焰箭打騎士，再漲潮收尾。',cross:'士兵打弓箭手、騎士打獅鷲，最後漲潮。',undertow:'先退潮給騎士聖盾，再攻擊迅捷狼。'};
  const receipts=new WeakMap();let receiptId=0;
  function capture(g){return ['player','enemy'].flatMap(side=>[{key:side,side,hp:g[side].hp},...g[side].field.map(c=>({key:c.uid,side,hp:c.health}))]);}
  function record(g,before){
    const after=capture(g),entries=[];
    for(const a of before){const b=after.find(x=>x.key===a.key),hp=b?.hp??0;if(hp<a.hp)entries.push({...a,after:hp,amount:a.hp-hp});}
    const r={entries,until:performance.now()+2800,id:++receiptId};receipts.set(g,r);
    setTimeout(()=>{if(receipts.get(g)===r){receipts.delete(g);document.querySelectorAll(`.r9-receipt[data-receipt-id="${r.id}"]`).forEach(e=>e.remove());}},2800);
  }
  function render(g){
    document.querySelectorAll('.r9-receipt,.r9-shield-count').forEach(e=>e.remove());
    if(!(g.content||g.forecast)||g.over)return;
    for(const c of [...g.player.field,...g.enemy.field])if(c.shield){const el=document.querySelector(`.battlefield [data-uid="${c.uid}"]`);if(el&&!el.querySelector('.r7-shield-owner')){const b=document.createElement('b');b.className='r9-shield-count';b.textContent='聖盾 ×1';el.appendChild(b);}}
    const r=receipts.get(g);if(r&&performance.now()<r.until)for(const e of r.entries){
      const hero=e.key===e.side,current=hero?g[e.side].hp:g[e.side].field.find(c=>c.uid===e.key)?.health;
      if(current!==e.after)continue;
      const el=document.querySelector(hero?`#${e.side}Hp`:`.battlefield [data-uid="${e.key}"]`);if(!el)continue;
      const target=hero?'英雄':g[e.side].field.find(c=>c.uid===e.key)?.id==='knight'?'騎士':'隨從';
      const b=document.createElement('b');b.className='r9-receipt';b.dataset.owner=e.key;b.dataset.receiptId=String(r.id);b.textContent=`${e.side==='enemy'?'敵方':'我方'}${target} −${e.amount} 傷害 · ${e.hp} → ${e.after}`;
      b.dataset.hero=String(hero);
      const rect=el.getBoundingClientRect();Object.assign(b.style,{position:'fixed',left:`${Math.max(8,Math.min(document.documentElement.clientWidth-155,rect.left+rect.width/2-70))}px`,top:`${rect.bottom+5}px`,zIndex:'270'});document.body.appendChild(b);
      const size=b.getBoundingClientRect(),overlap=(x,y,a)=>Math.max(0,Math.min(x+size.width,a.right)-Math.max(x,a.left))*Math.max(0,Math.min(y+size.height,a.bottom)-Math.max(y,a.top));
      const obstacles=[...document.querySelectorAll('.battlefield .card,.battlefield .card-info-btn,.hero-row,.hp-badge,#contentBar,.r9-receipt')].filter(x=>x!==b&&x.getClientRects().length&&!(hero&&x.classList.contains('hero-row')&&x.contains(el))).map(x=>x.getBoundingClientRect());
      const channel=document.querySelector('.r75-tide-channel').getBoundingClientRect(),dock=document.getElementById('commandDock').getBoundingClientRect();let best=null;
      const anchor=Math.max(8,Math.min(innerWidth-size.width-8,rect.left+rect.width/2-size.width/2));
      const badge=hero?(el.closest('.hp-badge')||el).getBoundingClientRect():rect;
      for(const y of [...(hero?[rect.top-1,rect.bottom-4]:[]),rect.bottom+5,rect.top-size.height-5,...(hero?[]:[channel.top+4,channel.bottom-size.height-4,dock.top-size.height-6])])for(const x of [...(hero?[badge.left-size.width-6,rect.left-size.width-6]:[]),anchor,8,innerWidth-size.width-8]){if(x<0||y<0||x+size.width>innerWidth||y+size.height>innerHeight)continue;const distance=Math.max(0,rect.left-x-size.width,x-rect.right)+Math.max(0,rect.top-y-size.height,y-rect.bottom),score=obstacles.reduce((s,a)=>s+overlap(x,y,a),0)*10000+distance;if(!best||score<best.score)best={x,y,score};}
      if(best)Object.assign(b.style,{left:best.x+'px',top:best.y+'px'});
    }
  }
  function installPoses(player){
    for(const id of ['footman','knight']){
      const frame=(pose,ms)=>({src:`../../assets/animations/content-r9/${id}-${pose}.webp`,ms});
      player.register(id,{attack:{anticipation:[frame('anticipation',180)],impact:[frame('impact',180)],recovery:[frame('recovery',180)]},hurt:{frames:[frame('hurt',240)]},death:{frames:[frame('hurt',160),frame('death',400)]}});
    }
  }
  return {limits,puzzleStatus,returnCanHeal,returnCompleted,wolfInstruction,solutions,capture,record,render,installPoses};
});
