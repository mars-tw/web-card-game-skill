/* Read-only rules previews and source-anchored character poses. No network. */
(function(root,factory){const api=factory();if(root)root.CardContentR6=api;if(typeof module!=='undefined')module.exports=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function exchange(Core,g,attackerUid,defenderUid){
    const copy=JSON.parse(JSON.stringify(g,(k,v)=>k==='opp'?undefined:v));
    copy.player.opp=copy.enemy;copy.enemy.opp=copy.player;
    const result=Core.resolveAttack(copy,{attackerSide:'player',attackerUid,defenderUid},()=>.5);
    if(!result.ok)return null;
    const units=[];
    for(const side of ['player','enemy'])g[side].field.forEach((c,index)=>{const after=copy[side].field.find(m=>m.uid===c.uid);units.push({uid:c.uid,side,index,name:c.name,before:c.health,after:after?.health||0,shield:!!after?.shield,stays:!!after,slot:c._r80Slot??index});});
    return{units,tideBefore:g.player.tide,tideAfter:copy.player.tide,enemyTideBefore:g.enemy.tide,enemyTideAfter:copy.enemy.tide};
  }
  function tideCopy(mode){return mode==='ebb'?{name:'退潮護航',effect:'退潮時：滿六格後施放，己方隨從獲聖盾擋一次傷害，英雄最多回復 3 血。',icon:'../../assets/art/r75/icon-shield.webp'}:{name:'漲潮破陣',effect:'漲潮時：滿六格後施放，敵軍各受 1 傷、英雄受 2 傷；一血無盾者退場。',icon:'../../assets/art/r79/icon-wave.webp?v=r79-icon'};}
  let previewTarget=null,previewGame=null,moenGame=null,pose=0,phase='preparing',healing=null;const breaking=new Map();
  const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
  function renderExchange(Core,g,callbacks){
    document.querySelectorAll('.r6-hp-preview,.r6-exchange-path,#exchangePreview').forEach(e=>e.remove());
    document.querySelectorAll('[data-exchange-preview]').forEach(e=>{delete e.dataset.exchangePreview;delete e.dataset.exchangeRole;e.onpointerenter=null;});
    if(!g.content||g.over||!g.selected||g.turn!=='player'||callbacks.busy)return;
    if(previewGame!==g){previewGame=g;previewTarget=null;}
    const a=g.player.field.find(c=>c.uid===g.selected);if(!a)return;
    const legal=g.enemy.field.filter(c=>!g.enemy.field.some(m=>(m.keywords||[]).includes('taunt'))||(c.keywords||[]).includes('taunt'));
    const target=legal.find(c=>c.uid===previewTarget)||legal[0];if(!target)return;
    const p=exchange(Core,g,a.uid,target.uid);if(!p)return;
    const board=document.querySelector('.board'),br=board.getBoundingClientRect();
    for(const u of p.units){const el=document.querySelector(`.battlefield [data-uid="${u.uid}"]`);if(!el)continue;
      const badge=node('span','r6-hp-preview',`血 ${u.before} → ${u.after}${u.stays?'':' 退場'}`);el.appendChild(badge);el.dataset.exchangePreview=u.stays?'stays':'leaves';el.dataset.exchangeRole=u.uid===a.uid?'source':u.uid===target.uid?'target':'other';
    }
    const from=document.querySelector(`#playerField [data-uid="${a.uid}"]`).getBoundingClientRect(),to=document.querySelector(`#enemyField [data-uid="${target.uid}"]`).getBoundingClientRect();
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('r6-exchange-path');svg.setAttribute('viewBox',`0 0 ${br.width} ${br.height}`);svg.setAttribute('aria-hidden','true');
    const line=document.createElementNS(ns,'path'),x1=from.x+from.width/2-br.x,y1=from.y-br.y-4,x2=to.x+to.width/2-br.x,y2=to.bottom-br.y+24;
    line.setAttribute('d',`M${x1} ${y1} L${x2} ${y2} m-7 9 l7 -9 l7 9 M${x1-7} ${y1-9} l7 9 l7 -9`);svg.appendChild(line);board.appendChild(svg);
    const box=node('aside','r6-exchange-preview');box.id='exchangePreview';box.setAttribute('aria-live','polite');
    const upper=Math.max(...[...document.querySelectorAll('#enemyField .card')].map(e=>e.getBoundingClientRect().bottom))+24,lower=Math.min(...[...document.querySelectorAll('#playerField .card')].map(e=>e.getBoundingClientRect().top))-8;
    if(innerHeight>650)box.style.top=`${(upper+lower)/2-br.top}px`;
    box.append(node('strong','',`${a.name} ⇄ ${target.name}`),node('span','',`原位交戰 · 退場留空位 · 我方潮 ${p.tideBefore} → ${p.tideAfter}/6${p.tideAfter===6?' · 裂潮就緒':''}`));
    const buttons=node('div');for(const label of ['確認交換','取消']){const b=node('button','',label);b.type='button';b.onclick=e=>{e.stopPropagation();label==='取消'?callbacks.cancel():callbacks.confirm(a,target);};buttons.appendChild(b);}box.appendChild(buttons);board.appendChild(box);
    for(const c of legal){const el=document.querySelector(`#enemyField [data-uid="${c.uid}"]`);el.onpointerenter=()=>{if(previewTarget!==c.uid){previewTarget=c.uid;renderExchange(Core,g,callbacks);}};}
  }
  const plain={fallen:'士兵換弓手後陣亡，補滿第六格。',shield:'先打掉聖盾，浪潮才打得到守衛。',shelter:'弓手先取得聖盾，交換狼後才會存活。',taunt:'一血士兵有嘲諷；清掉他才能打英雄。',spell:'火焰箭先打騎士3傷，浪潮再收掉1血。',cross:'士兵打弓手、騎士打獅鷲，讓兩敵都剩1血。'};
  const signals={fallen:['陣亡 +1 → 滿潮','交換收割'],shield:['聖盾擋一次','聖盾 · 1 血'],shelter:['長弓留場','射線 · 互相致命'],taunt:['嘲諷封路','嘲諷 · 1 血'],spell:['火焰箭 · 3 傷','法術收割線 · 4 血'],cross:['雙線交換 · 潮 5/6','兩線血量 2／4']};
  function renderSignals(g){
    document.querySelectorAll('.r6-board-signal,.r6-board-route').forEach(e=>e.remove());
    document.getElementById('puzzleHeroNote')?.remove();
    const original=signals[g.content?.id];if(!original||g.over)return;const s=original.slice(),enemy=g.enemy.field[0];
    if(g.content.id==='fallen'){s[0]=`陣亡補潮 · 潮 ${g.player.tide}/6`;s[1]=`敵弓手 ${enemy?.health??0} 血`;}
    if(g.content.id==='shield'&&enemy)s[1]=`${enemy.shield?'聖盾完整':'聖盾已破'} · ${enemy.health} 血`;
    if(g.content.id==='taunt')s[0]=g.enemy.field.some(c=>(c.keywords||[]).includes('taunt'))?'嘲諷封路':'嘲諷已清';
    if(g.content.id==='spell')s[0]=g.player.hand.some(c=>c.id==='firebolt')?'火焰箭 · 3 傷':'火焰箭已施放';
    if(g.content.id==='cross'){s[0]=`雙線交換 · 潮 ${g.player.tide}/6`;s[1]=`敵陣剩 ${g.enemy.field.length} 隻`;}
    // Playing boards identify themselves through mechanisms; names stay in the picker.
    document.body.dataset.r6Puzzle='true';document.getElementById('contentBarTitle').textContent='潮汐殘局';
    const goal=document.getElementById('contentBarGoal'),lock=node('span','','不可結束回合');lock.id='endTurnLockReason';lock.setAttribute('role','status');goal.replaceChildren(document.createTextNode(CardContentR9.limits[g.content.id]+'。'),lock,document.createTextNode('。'+CardContentR10.tideLabel(g.player.tide)+'。'));
    if(g.content.id==='shelter'){document.getElementById('enemyHp').textContent='不計血量';document.getElementById('enemyHero').appendChild(Object.assign(node('span','r7-hero-note','本題不計'),{id:'puzzleHeroNote'}));}
    if(g.content.id==='taunt')s[1]='開局已受傷 · 1 血';
    document.querySelector('#enemyField .card')?.appendChild(node('span','r6-board-signal',g.content.id==='spell'?'敵騎士 '+(enemy?.health??0)+' 血':s[1]));
    const channel=document.querySelector('.r75-tide-channel'),label=node('span','r6-board-signal',s[0]);label.appendChild(node('small','r8-plain',CardContentR9.puzzleStatus(g)));if(g.player.tide===6)label.appendChild(node('b','r9-next','按「裂潮」查看兩種潮向。'));channel?.appendChild(label);
    if(g.content.id==='spell'&&g.player.hand.length){const e=node('div','r6-board-signal r6-hand-signal');e.append(node('img'));e.firstChild.src='../../assets/art/r76/firebolt.webp';e.firstChild.alt='手中火焰箭';e.append(node('span','','手牌火焰箭 · 法力 4/4'));document.querySelector('.r75-tide-channel').appendChild(e);}
    if(g.content.id==='shelter'&&!g.selected&&g.player.field.length&&g.enemy.field.length){
      const b=document.querySelector('.board').getBoundingClientRect(),a=document.querySelector('#playerField .card').getBoundingClientRect(),t=document.querySelector('#enemyField .card').getBoundingClientRect(),ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('r6-board-route');svg.setAttribute('viewBox',`0 0 ${b.width} ${b.height}`);svg.setAttribute('aria-label','弓手與狼的交換射線，雙方各造成兩點');
      const line=document.createElementNS(ns,'path');line.setAttribute('d',`M${a.x+a.width/2-b.x} ${a.top-b.top-5} L${t.x+t.width/2-b.x} ${t.bottom-b.top+8} m-6 8 l6 -8 l6 8`);svg.appendChild(line);document.querySelector('.board').appendChild(svg);
    }
  }
  function setPose(g,next,nextPhase){if(g.content?.id!=='moen')return;moenGame=g;pose=next;phase=nextPhase;const s=document.getElementById('moenStage');if(s){s.dataset.pose=String(next);s.dataset.phase=nextPhase;s.querySelector('img').src=CardContentR10.moenArt(g,next);}}
  function renderMoen(g){
    let stage=document.getElementById('moenStage');const active=g.content?.id==='moen'&&!g.over;
    if(!active){stage?.remove();document.getElementById('moenBond')?.remove();return;}
    if(moenGame!==g){moenGame=g;pose=0;phase='preparing';}
    if(!stage){stage=node('aside','r6-moen-stage');stage.id='moenStage';stage.innerHTML='<img alt="敵方茉恩的實際施法姿勢"><span id="moenPressure"></span><b class="r7-moen-side">敵方 · 茉恩</b>';document.querySelector('.board').appendChild(stage);}
    stage.hidden=false;stage.dataset.pose=String(pose);stage.dataset.phase=phase;stage.firstChild.src=CardContentR10.moenArt(g,pose);
    const knight=g.enemy.field.find(c=>c.id==='knight');
    document.getElementById('moenAllyShield')?.remove();
    // Ownership is conveyed on each card by distinct wall and shield art.
    document.querySelector('.r7-moen-heal')?.remove();
    if(healing?.game===g&&performance.now()<healing.until)document.getElementById('enemyHero').appendChild(node('b','r7-moen-heal',`+${healing.amount} 治療 · ${healing.before} → ${healing.after}`));
    document.getElementById('moenPressure').textContent=!g.content.enemyEbbUsed?'茉恩 · 整備':knight?.shield?'茉恩 · 聖盾留守':knight?'茉恩 · 反攻空檔':'茉恩 · 防線已開';
    for(const el of document.querySelectorAll('#enemyField .card')){
      const c=g.enemy.field.find(c=>c.uid===el.dataset.uid);if(c?.id!=='knight')continue;
      const state=c.shield?'intact':c._r3ShieldBroken?(performance.now()<(breaking.get(c.uid)||0)?'breaking':'broken'):null;if(!state)continue;el.dataset.shellState=state;
      el.querySelectorAll('.r3-shell-badge,.r6-shield-label,.r7-shield-owner').forEach(e=>e.remove());
      const img=node('img','r3-shell-badge r4-shell-art');img.src=state==='intact'?'../../assets/art/content-r4/shield-cover.webp':'../../assets/art/content-r4/shield-fracture.webp';img.alt=state==='intact'?'騎士聖盾':'聖盾已破';el.appendChild(img);
      if(state==='broken')el.appendChild(node('span','r6-shield-label','聖盾已破'));
      if(state==='intact')el.appendChild(node('span','r7-shield-owner','聖盾 ×1'));
    }
    const place=()=>{
      if(g!==moenGame||!stage.isConnected)return;
      const b=document.querySelector('.board').getBoundingClientRect();stage.style.top=`${Math.max(40,document.querySelector('.r75-tide-channel').getBoundingClientRect().top-b.top+10)}px`;
      let bond=document.getElementById('moenBond');if(!bond){bond=node('div','r6-moen-bond');bond.id='moenBond';document.querySelector('.board').appendChild(bond);}
      bond.style.left='120px';bond.style.top=`${parseFloat(stage.style.top)+25}px`;bond.style.width='calc(100% - 132px)';bond.dataset.active=String(!!knight?.shield||phase==='impact');bond.textContent=knight?.shield?'茉恩護盾 → 騎士':!g.content.enemyEbbUsed?'為騎士授盾；英雄回復 3 血':g.content.returning?(g.content.returnResolved?`判定敵潮 ${g.content.returnTide}/2 · ${g.content.returnHeal?'追加回復 2 血':'已阻止治療'}${knight?'；騎士反攻':''}`:`敵潮 ${g.enemy.tide}/2 · 騎士陣亡 +1 潮`):knight?'騎士下輪反攻':'茉恩防線已開';
      CardContentR11.updateMoen(g);
    };place();requestAnimationFrame(place);
  }
  function entrance(g){
    const old=document.getElementById('moenEntrance');old?.remove();if(g.content?.id!=='moen')return;
    const e=node('aside','r6-moen-entrance');e.id='moenEntrance';e.innerHTML='<img src="../../assets/art/content-r6/moen-0.webp" alt="潮間仲裁者茉恩登場"><p>茉恩<br><strong>「潮退之時，我的人會留下。」</strong></p>';document.body.appendChild(e);setTimeout(()=>e.remove(),1800);
  }
  function shieldBreak(g,uid){
    if(g.content?.id!=='moen')return;const card=document.querySelector(`#enemyField [data-uid="${uid}"]`);if(!card)return;
    breaking.set(uid,performance.now()+500);card.dataset.shellState='breaking';card.querySelectorAll('.shield-ring,.r8-shield-icon,.r7-shield-owner').forEach(e=>e.remove());const badge=card.querySelector('.r3-shell-badge');if(badge)badge.src='../../assets/art/content-r4/shield-fracture.webp';
    if(!card.querySelector('.r6-shield-label'))card.appendChild(node('span','r6-shield-label','聖盾已破'));
    const pressure=document.getElementById('moenPressure'),bond=document.getElementById('moenBond');if(pressure)pressure.textContent='茉恩 · 護盾碎裂';if(bond){bond.dataset.active='false';bond.textContent='聖盾抵擋，騎士生命未減';}
    setTimeout(()=>{if(moenGame===g)renderMoen(g);},500);
  }
  function heal(g,amount,before,after){if(g.content?.id!=='moen'||amount<=0)return;healing={game:g,amount,before,after,until:performance.now()+1800};setTimeout(()=>{if(moenGame===g)document.querySelector('.r7-moen-heal')?.remove();},1800);}
  return{exchange,tideCopy,renderExchange,renderSignals,renderMoen,setPose,entrance,shieldBreak,heal};
});
