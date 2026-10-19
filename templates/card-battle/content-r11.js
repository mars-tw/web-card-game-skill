/* R11 presentation models. Combat state is read here, never changed by rendering. */
(function(root,factory){const api=factory();if(root)root.CardContentR11=api;if(typeof module!=='undefined')module.exports=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const questions={fallen:'這一席士兵，能換來什麼機會？',shield:'守衛的聖盾還在，哪種傷害值得先用？',shelter:'弓箭手必須留下，你會怎麼護住他？',taunt:'英雄近在眼前，誰擋住了攻擊路線？',spell:'火焰箭有 3 傷，怎樣與浪潮配合？',cross:'兩線敵軍，如何分配這次交換？',undertow:'換成騎士留場，你還能守住 4 血嗎？'};
  const heroNames=new WeakMap();
  function moenModel(g){
    const c=g.content,k=g.enemy.field.find(x=>x.id==='knight'),target=g.player.field.find(x=>(x.keywords||[]).includes('taunt'))||g.player.field[0],tide=c.returnResolved?c.returnTide:g.enemy.tide;
    const hp=target?.health??g.player.hp,name=target?(target.id==='knight'?'騎士':target.name):'英雄';
    const upcoming=k?`反攻預告：敵騎士 → 我方${name} ${k.attack} 傷${target?.shield?'（聖盾擋下）':`（${hp} → ${Math.max(0,hp-k.attack)} 血）`}`:'敵騎士已退場，沒有反攻。';
    const rule=!c.enemyEbbUsed?'茉恩為騎士授盾，並回復自己 3 血。':!c.returning?'首戰：不追加治療。':c.returnResolved?(c.returnHeal?`已觸發：茉恩回復 ${c.returnHealAmount??'未記錄'} 血。`:'已阻止：茉恩沒有追加治療。'):tide>=2?'已達門檻：反攻前將回復 2 血。':`再補 ${2-tide} 格將觸發治療。`;
    return{tide:tide||0,threshold:2,rule,upcoming};
  }
  function updateMoen(g){
    if(g.content?.id!=='moen'||g.over)return;
    const bond=document.getElementById('moenBond');if(!bond)return;
    let meter=document.getElementById('moenTideMeter');if(!meter){meter=document.createElement('section');meter.id='moenTideMeter';meter.innerHTML='<strong></strong><progress max="2"></progress><span class="r11-moen-rule"></span><span class="r11-moen-counter"></span>';bond.after(meter);}
    const m=moenModel(g);meter.querySelector('strong').textContent=`敵潮 ${m.tide}／2 格門檻`;
    const progress=meter.querySelector('progress');progress.value=Math.min(2,m.tide);progress.setAttribute('aria-label',`追加治療門檻，目前敵潮${m.tide}格，門檻2格`);
    meter.querySelector('.r11-moen-rule').textContent=m.rule;meter.querySelector('.r11-moen-counter').textContent=m.upcoming;
    bond.hidden=g.content.enemyEbbUsed&&!g.enemy.field.some(x=>x.id==='knight'&&x.shield)&&!document.querySelector('#enemyField [data-shell-state=breaking]');
    if(innerHeight>650){
      const board=document.querySelector('.board').getBoundingClientRect(),channel=document.querySelector('.r75-tide-channel').getBoundingClientRect();
      meter.style.top=`${channel.top-board.top+20}px`;
      bond.style.setProperty('top',`${channel.bottom-board.top-bond.getBoundingClientRect().height-4}px`,'important');bond.style.setProperty('bottom','auto','important');
    }else{meter.style.removeProperty('top');bond.style.removeProperty('top');bond.style.removeProperty('bottom');}
  }
  function render(g){
    const active=!!(g.content||g.forecast)&&!g.over;
    document.body.dataset.contentStage=active?(g.content?.id==='moen'?'moen':g.forecast?'forecast':'puzzles'):'';
    const name=document.querySelector('#enemyHero .name');if(active&&name){
      if(!heroNames.has(g))heroNames.set(g,name.textContent);const full=heroNames.get(g);
      name.textContent=innerWidth<600&&innerHeight<=650?(g.content?.id==='moen'?'茉恩':g.content?'守備':'對手'):full;name.setAttribute('aria-label',full);name.title=full;
    }
    let note=document.getElementById('endTurnLockReason');const locked=active&&!!questions[g.content?.id];
    if(locked){if(!note){note=document.createElement('span');note.id='endTurnLockReason';note.setAttribute('role','status');document.getElementById('contentBarGoal').append(document.createTextNode('。'),note);}note.textContent='不可結束回合';}else note?.remove();
    document.getElementById('endTurnBtn').classList.toggle('r11-locked',locked);
    if(locked)document.getElementById('endTurnBtn').setAttribute('aria-describedby','endTurnLockReason');else document.getElementById('endTurnBtn').removeAttribute('aria-describedby');
    if(g.content?.id==='moen'&&!g.over)updateMoen(g);else document.getElementById('moenTideMeter')?.remove();
  }
  function positionForecast(){
    const panel=document.getElementById('forecastPanel');if(!panel||panel.hidden)return;
    const channel=document.querySelector('.r75-tide-channel')?.getBoundingClientRect(),sheet=panel.querySelector('.content-sheet').getBoundingClientRect();
    const y=channel?.height?channel.top+(channel.height-30)/2:sheet.top-38;
    document.body.style.setProperty('--r11-cancel-y',`${Math.max(8,y)}px`);
  }
  function poseLayer(card,art){
    let bg=card.querySelector('.r11-card-backdrop');if(!bg){bg=document.createElement('img');bg.className='r11-card-backdrop';bg.alt='';bg.src=art.src;const set=art.getAttribute('srcset');if(set)bg.setAttribute('srcset',set);art.after(bg);}
    card.classList.add('r11-pose-active');return()=>{bg.remove();card.classList.remove('r11-pose-active');};
  }
  function recap(g){
    if(g.content?.id!=='moen')return '';
    const c=g.content,k=g.player.field.find(x=>x.id==='knight');
    return !c.returning?'首戰守約：拆開聖盾，守住反攻。':c.returnResolved?(c.returnHeal?`回潮已觸發：判定敵潮 ${c.returnTide}/2，茉恩追加回復 ${c.returnHealAmount??'未記錄'} 血。敵騎士已先退場；我方騎士剩 ${k?.health??0} 血。`:`治療已阻止：判定敵潮 ${c.returnTide}/2，茉恩追加回復 0 血。承受騎士反攻 ${c.counterDamage??'未記錄'} 傷；我方騎士剩 ${k?.health??0} 血。`):'反攻前搶先通關，追加治療尚未判定。';
  }
  const closingLine=g=>!g.content.returning?'茉恩垂下天秤：「這次，潮向由你決定。」':!g.content.returnResolved?'茉恩收起天秤：「你搶在回潮之前，看見了出口。」':g.content.returnHeal?'茉恩收起天秤：「你讓潮水回來，仍闖過了防線。」':'茉恩垂下天秤：「你截住了回潮，也付出了代價。」';
  return{questions,moenModel,updateMoen,render,positionForecast,poseLayer,recap,closingLine};
});
