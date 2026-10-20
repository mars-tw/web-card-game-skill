/* Event receipts and read-only projections for the R12 review repairs. */
(function(root,factory){const api=factory();if(root)root.CardContentR12=api;if(typeof module!=='undefined')module.exports=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const C=typeof module!=='undefined'?require('./tide-puzzles'):globalThis.CardTideContent;
  const art='../../assets/art/content-r13/';
  const short=n=>({'鋼鐵騎士':'騎士','弓箭手':'弓箭手','見習士兵':'士兵','符文守衛':'守衛','迅捷狼':'狼','獅鷲騎士':'獅鷲'})[n]||n;
  function record(g,result){
    if(!g.content||!result?.ok)return;
    const allowed=['damage','heroDamage','shieldBreak','shieldGain','dying','tideGain','tideEbb','tidebreak','spellCast'];
    const raw=result.events||[],attack=raw.find(e=>e.type==='attack'),spell=raw.find(e=>e.type==='spellCast'),flood=raw.some(e=>e.type==='tidebreak');
    const step=(g.content.r13Steps||[]).length+1;
    const source=e=>flood?'漲潮':spell?'火焰箭':attack?(e.uid===attack.defenderUid?short(result.attacker?.name||'隨從'):short(result.defender?.name||'隨從')):e.type==='heroDamage'&&result.attacker?result.attacker.name:'效果';
    const action=flood?'施放漲潮':spell?'施放火焰箭':attack?`${attack.attackerSide==='enemy'?'敵方':'我方'}${short(result.attacker?.name||'隨從')}攻擊${attack.attackerSide==='enemy'?'我方':'敵方'}${short(result.defender?.name||'隨從')}`:raw.some(e=>e.type==='tideEbb')?'施放退潮':raw.some(e=>e.type==='heroDamage')?'隨從直擊敵方英雄':null;
    if(action)g.content.r13Steps=[...(g.content.r13Steps||[]),action].slice(-12);
    const events=(result.events||[]).filter(e=>allowed.includes(e.type)).map(e=>({...Object.fromEntries(['type','uid','side','defenderSide','amount','tide','reason'].filter(k=>e[k]!==undefined).map(k=>[k,e[k]])),source:source(e),step,attackerSide:attack?.attackerSide}));
    g.content.r12Events=[...(g.content.r12Events||[]),...events].slice(-96);
  }
  function forecast(g,i,held=false){
    const f=g.forecast,original=f.original?.[i]||f.directions[i],current=f.directions[i],mode=held?(current==='ebb'?'flood':'ebb'):current;
    const label=m=>m==='ebb'?'退潮護航':'漲潮破陣';
    const title=`${held?'正在改':f.reversed&&mode!==original?'已改成':'查看'}：第 ${i+1} 回合　${held||mode!==original?((held?current:original)==='ebb'?'退潮':'漲潮')+' → ':''}${label(mode)}`;
    const targets=mode==='flood'?[`敵方英雄 ${g.enemy.hp}→${Math.max(0,g.enemy.hp-2)}`,...g.enemy.field.map(c=>`敵方${short(c.name)} ${c.health}→${c.shield?c.health:Math.max(0,c.health-1)}${c.shield?'（破聖盾）':''}`)]:[g.player.hp>=g.player.maxHp?'英雄已滿血，不回復':`我方英雄 ${g.player.hp}→${Math.min(g.player.maxHp,g.player.hp+3)}`,'我方隨從各得聖盾'];
    return{title,mode,targets,round:i+1};
  }
  function forecastView(g,i,held){
    const m=forecast(g,i,held),compare=document.getElementById('forecastCompare'),box=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('span');
    title.textContent=m.title;detail.textContent=(m.mode==='ebb'?'退潮時':'漲潮時')+'（依目前盤面推算）：'+m.targets.join('；');box.dataset.forecastRound=String(m.round);box.dataset.direction=m.mode;box.append(title,detail);compare.replaceChildren(box);
    const heading=document.getElementById('forecastTitle'),direction=document.createElement('span'),label=m.mode==='flood'?'漲潮破陣':'退潮護航';direction.className='r13-direction';direction.textContent=label;heading.replaceChildren(document.createTextNode(m.title.slice(0,-label.length)),direction);
    document.querySelectorAll('#forecastRounds button').forEach(b=>b.classList.toggle('r12-selected',Number(b.dataset.round)===i));
    document.getElementById('forecastLink')?.remove();
    const link=document.createElement('span');link.id='forecastLink';link.setAttribute('aria-hidden','true');link.textContent='↑ 依此回合推算盤面';compare.prepend(link);
    document.querySelectorAll('.r13-projection').forEach(e=>e.remove());if(m.mode==='flood'){for(const [target,text]of [[document.getElementById('enemyHp'),'預測 −2'],...g.enemy.field.map(c=>[document.querySelector(`#enemyField [data-uid="${c.uid}"]`),c.shield?'預測破盾':'預測 −1'])]){if(!target)continue;const el=document.createElement('b');el.className='r13-projection';el.textContent=text;if(target.id==='enemyHp'){const r=(target.closest('.hp-badge')||target).getBoundingClientRect();document.body.append(el);Object.assign(el.style,{position:'fixed',left:Math.max(8,Math.min(innerWidth-78,r.right-60))+'px',top:r.bottom+5+'px',bottom:'auto'});}else target.append(el);}}
    let cue=document.getElementById('forecastHoldCue');if(!cue){cue=document.createElement('span');cue.id='forecastHoldCue';document.getElementById('forecastCancelZone').after(cue);}cue.textContent=held?'按住中…放開套用／移出取消':'';
    const button=document.getElementById('tidebreakBtn').getBoundingClientRect();document.body.style.setProperty('--r12-ring-x',`${button.x+button.width/2-30}px`);document.body.style.setProperty('--r12-ring-y',`${button.y+button.height/2-30}px`);
    document.getElementById('forecastRoute')?.remove();requestAnimationFrame(()=>{
      const panel=document.getElementById('forecastPanel');if(panel.hidden)return;
      const card=panel.querySelector('.r12-selected')?.getBoundingClientRect(),channel=document.querySelector('.r75-tide-channel')?.getBoundingClientRect();if(!card||!channel?.height)return;
      const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),line=document.createElementNS(ns,'path');svg.id='forecastRoute';svg.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);svg.setAttribute('aria-hidden','true');
      const edge=i===0?4:innerWidth-4,endX=i===0?channel.left+16:channel.right-16,endY=channel.top+channel.height/2;
      line.setAttribute('d',`M ${card.left+card.width/2} ${card.top-2} V ${card.top-7} H ${edge} V ${endY} H ${endX} m ${i===0?-7:7} -5 L ${endX} ${endY} l ${i===0?-7:7} 5`);line.setAttribute('stroke','#e9bd74');line.setAttribute('stroke-width','2');line.setAttribute('fill','none');svg.append(line);panel.append(svg);
    });
  }
  function puzzleReceipt(g){
    const d=C.get(g.content?.id);if(!d||!C.isPuzzle(d.id))return [];
    const ev=g.content.r12Events||[],lines=[],gains=ev.filter(e=>e.type==='tideGain'&&e.side==='player'&&e.reason==='fallen').reduce((s,e)=>s+e.amount,0);
    if(!ev.length)lines.push(`本步尚未行動：敵陣 ${g.enemy.field.length} 隻；潮能 ${g.player.tide}/6`);
    for(const [i,id]of d.enemy.entries()){
      const uid='content-enemy-'+i,now=g.enemy.field.find(c=>c.uid===uid),hits=ev.filter(e=>e.type==='damage'&&e.uid===uid).map(e=>e.amount),broken=ev.some(e=>e.type==='shieldBreak'&&e.uid===uid);
      if(hits.length||broken||!now)lines.push(`敵方${short(now?.name||({archer:'弓箭手',guardian:'守衛',wolf:'狼',footman:'士兵',knight:'騎士',griffin:'獅鷲'})[id]||id)}：${broken?'聖盾擋一次；':''}${hits.length?'傷害 '+ev.filter(e=>e.type==='damage'&&e.uid===uid).map(e=>(e.source||'傷害')+' '+e.amount).join('＋')+'；':''}${now?'剩 '+now.health+' 血':'已退場'}`);
    }
    if(g.enemy.hp!==d.enemyHp){const hits=ev.filter(e=>e.type==='heroDamage'&&e.defenderSide==='enemy').map(e=>(e.source||'傷害')+' '+e.amount);lines.push(`敵方英雄 ${d.enemyHp} → ${Math.max(0,g.enemy.hp)} 血${hits.length?'（'+hits.join('＋')+'）':''}`);}
    const cast=ev.some(e=>e.type==='tidebreak'||e.type==='tideEbb');
    if(gains||cast)lines.push(`潮能 ${d.tide}${gains?' → '+Math.min(6,d.tide+gains):''}${cast?' → '+g.player.tide:''}/6${gains?'（陣亡補 '+gains+' 格）':''}`);
    if(d.survivor){const survivor=g.player.field.find(c=>c.id===d.survivor);lines.push(`我方${d.survivor==='archer'?'弓箭手':'騎士'}${survivor?'存活・'+survivor.health+' 血':'已陣亡・存活目標未達成'}`);}
    if(!lines.length)lines.push(`本步尚未行動：敵陣 ${g.enemy.field.length} 隻；潮能 ${g.player.tide}/6`);
    return lines;
  }
  function failure(g){
    const d=C.get(g.content.id),missing=[];
    if(d.survivor&&!g.player.field.some(c=>c.id===d.survivor&&c.health>=(d.minSurvivorHp||1)))missing.push(d.survivor==='archer'?'弓箭手未存活':'騎士未達保留血量');
    if(g.enemy.field.length)missing.push(`敵陣仍有 ${g.enemy.field.length} 隻`);
    if(d.id!=='shelter'&&!d.clearField&&g.enemy.hp>0)missing.push(`敵方英雄仍有 ${g.enemy.hp} 血`);
    const by=id=>g.enemy.field.find(c=>c.id===id),own=id=>g.player.field.find(c=>c.id===id);
    const why={
      fallen:own('footman')?`士兵仍在場，潮能 ${g.player.tide}/6；這次沒有取得陣亡潮能。`:'士兵已換來潮能，還需要讓浪潮收尾。',
      shield:by('guardian')?.shield?'守衛聖盾尚在，仍能抵擋下一筆傷害。':by('guardian')?'聖盾已破，但守衛還活著；先剝盾才能讓浪漲潮收尾。':'敵陣已清空，英雄目標尚未完成。',
      shelter:own('archer')?'弓箭手仍在場，但迅捷狼尚未退場。':'弓箭手沒有受到聖盾保護，交換後陣亡。',
      taunt:by('footman')?'嘲諷士兵仍在，英雄攻擊路線未開。':'嘲諷已退場；仍須保留狼的攻擊次數，才能直取英雄。',
      spell:g.player.hand.some(c=>c.id==='firebolt')?((g.content.r12Events||[]).some(e=>e.type==='tidebreak')?'火焰箭仍在手中；先掀浪只打掉騎士 1 血，沒有壓到收割線。':'火焰箭尚未施放，騎士尚未進入浪漲潮收尾線。'):`火焰箭已施放；騎士${by('knight')?'仍有 '+by('knight').health+' 血':'已退場'}，需核對浪潮的收尾時機。`,
      cross:`弓箭手${by('archer')?'剩 '+by('archer').health+' 血':'已退場'}、獅鷲${by('griffin')?'剩 '+by('griffin').health+' 血':'已退場'}；交換要讓兩線都進入 1 傷收割線。`,
      undertow:own('knight')?'騎士目前 '+own('knight').health+' 血；目標是退潮保護後至少留下 4 血。':'騎士已退場，未達保留目標。'
    }[d.id];
    return '本次未達成：'+missing.join('；')+'。錯在關鍵目標尚未達成：'+why;
  }
  function knightCostText(g){
    const knight=g.player.field.find(x=>x.id==='knight');
    const events=Array.isArray(g.content?.r12Events)?g.content.r12Events:[];
    const hits=events.filter(e=>e?.type==='damage'&&e.uid==='content-player-1');
    const known=e=>Number.isFinite(e.amount)&&e.amount>=0&&['player','enemy'].includes(e.attackerSide);
    const exchange=hits.filter(e=>known(e)&&e.attackerSide==='player').reduce((s,e)=>s+e.amount,0);
    const counter=hits.filter(e=>known(e)&&e.attackerSide==='enemy').reduce((s,e)=>s+e.amount,0);
    const complete=hits.every(known)&&(knight?4-exchange-counter===knight.health:4-exchange-counter<=0);
    if(!complete)return `我方鋼鐵騎士：4 → ${knight?knight.health+' 血':'退場'}（承傷來源未完整保留）。`;
    if(!knight&&4-exchange-counter<0)return `我方鋼鐵騎士：交換 ${exchange}＋反攻 ${counter}＝${exchange+counter} 傷；原 4 血，已退場。`;
    return `我方鋼鐵騎士：4 − 交換 ${exchange} − 反攻 ${counter} ＝ ${knight?.health??0} 血。`;
  }
  function moenResult(g){
    const c=g.content,k=g.player.field.find(x=>x.id==='knight'),triggered=c.returnResolved&&c.returnHeal,countered=c.counterOccurred||c.counterDamage>0;
    const title=!c.returning?'首戰・拆開護航防線':!c.returnResolved?'搶先通關・回潮未判定':triggered?'讓治療發生・撐過防線':'阻止治療・承受反攻';
    const image=c.returning&&c.returnResolved?art+'ending-'+(triggered?'triggered':'prevented')+'.webp':'../../assets/art/content-r10/moen-defeated.webp';
    const ending=!c.returning?'茉恩收起天秤，你拆開了聖盾防線。':!c.returnResolved?'你搶在回潮判定之前擊敗了茉恩。':triggered?(countered?'你讓回潮觸發，承受反攻後仍突破了防線。':'敵騎士先退場，沒有反攻；你撐過回潮，完成突破。'):countered?(k?'你截斷治療，讓騎士承受反攻後仍留在場上。':'你截斷治療，並在反攻後以其餘隨從突破防線。'):'敵潮未達門檻；你在反攻之前突破了防線。';
    const metrics=c.returning&&c.returnResolved?[['判定敵潮能',`${c.returnTide}/6・門檻2`],['茉恩治療',triggered?(c.returnHealAmount?`＋${c.returnHealAmount} 血`:'已滿血，未回復'):'治療被阻止'],['反攻承傷',countered?(c.counterDamage?`${c.counterDamage} 傷`:'聖盾抵擋'):'未發生反攻'],['我方騎士',k?`存活・${k.health} 血`:'已退場']]:[];
    return{title,image,ending,metrics};
  }
  function result(g,win){
    document.getElementById('r12ResultReceipt')?.remove();const sheet=document.querySelector('#contentResult .content-sheet'),el=document.createElement('section');el.id='r12ResultReceipt';
    if(g.content.id==='moen'&&win){
      const m=moenResult(g),c=g.content;el.dataset.branch=c.returnHeal?'triggered':'prevented';
      const badge=document.createElement('h3');badge.textContent=m.title;el.append(badge);
      const grid=document.createElement('div');grid.className='r12-result-metrics';
      for(const [key,value]of m.metrics){const cell=document.createElement('div'),label=document.createElement('span'),n=document.createElement('strong');label.textContent=key;n.textContent=value;cell.append(label,n);grid.append(cell);}el.append(grid);
      const image=document.querySelector('#contentResult .content-result-art');image.src=m.image;image.alt=m.title;image.hidden=false;
      const text=document.getElementById('contentResultText'),warning=text.textContent.includes('進度未能儲存')?' 進度未能儲存，請檢查裝置空間。':'';
      const receipt=c.returnHeal?(c.returnHealAmount?`茉恩追加回復 ${c.returnHealAmount} 血。`:'茉恩已滿血，未回復。'):c.counterOccurred||c.counterDamage>0?`治療被阻止；承受騎士反攻 ${c.counterDamage} 傷。`:'治療被阻止，沒有反攻。';
      text.textContent=c.returning&&c.returnResolved?CardContentR11.closingLine(g)+receipt+m.ending+warning:text.textContent+m.ending;
      if(c.returning&&c.returnResolved){const p=document.createElement('p');p.className='r13-knight-cost';p.textContent=knightCostText(g);el.append(p);const board=document.createElement('p');board.textContent=`最終盤面：茉恩 ${Math.max(0,g.enemy.hp)} 血；敵騎士${g.enemy.field.some(x=>x.id==='knight')?'留場':'退場'}；我方${g.player.field.map(x=>x.name+' '+x.health+'血').join('、')}。`;el.append(board);}
    }
    else if(C.isPuzzle(g.content.id)){const title=document.createElement('h3');title.textContent=win?'本局解題收據':'本局未完成的目標';el.append(title);for(const text of puzzleReceipt(g)){const p=document.createElement('p');p.textContent=text;el.append(p);}if(!win)document.getElementById('contentResultText').textContent=failure(g);}
    sheet.querySelector('#contentResultName').after(el);
    if(C.isPuzzle(g.content.id)){document.getElementById('contentResult').dataset.puzzle=g.content.id;const steps=document.createElement('ol');steps.className='r13-steps';for(const action of g.content.r13Steps||[]){const li=document.createElement('li');li.textContent=action;steps.append(li);}el.prepend(steps);const d=C.get(g.content.id),recap=document.getElementById('contentRecap');for(const fig of recap.querySelectorAll('figure')){const id=fig.querySelector('img').alt,card=[...g.player.field,...g.enemy.field].find(x=>x.name===id),idx=[...recap.children].indexOf(fig),cardId=C.RECAP[d.id].cards[idx][0],side=d.enemy.includes(cardId)?'enemy':'player';fig.dataset.side=side;const name=fig.querySelector('strong'),unit=g[side].field.find(x=>x.id===cardId);name.textContent=(side==='enemy'?'敵方・':'我方・')+id;fig.querySelector('figcaption').replaceChildren(name,document.createTextNode(cardId==='firebolt'?'火焰箭 3 傷・已施放':unit?'最終存活 '+unit.health+' 血':'最終已退場'));}
      document.getElementById('r13ViewBoard')?.remove();const view=document.createElement('button');view.id='r13ViewBoard';view.textContent='查看最終盤面';view.onclick=()=>{document.getElementById('contentResult').hidden=true;document.getElementById('r13BackResult').hidden=false;};sheet.querySelector('footer').prepend(view);let back=document.getElementById('r13BackResult');if(!back){back=document.createElement('button');back.id='r13BackResult';back.textContent='返回解題收據';back.onclick=()=>{document.getElementById('contentResult').hidden=false;back.hidden=true;};document.body.append(back);}back.hidden=true;}
  }
  function live(g){
    if(!g.over)document.getElementById('r13BackResult')?.setAttribute('hidden','');
    document.getElementById('r12StepReceipt')?.remove();document.getElementById('r12SpellRules')?.remove();
    if(g.over||!g.content||!C.isPuzzle(g.content.id))return;
    if(g.content.r12Events?.length){const el=document.createElement('div');el.id='r12StepReceipt';el.textContent='本步結果：'+puzzleReceipt(g).slice(0,2).join('；');document.querySelector('.r75-tide-channel').append(el);}
    if(g.content.id==='spell'&&g.player.hand.length){const el=document.createElement('aside');el.id='r12SpellRules';el.innerHTML='<strong>手牌規則</strong><span>火焰箭：只選敵方隨從，造成 3 傷。</span><span>敵陣與英雄都必須清空；本題不可結束回合。</span>';document.querySelector('.board').append(el);}
  }
  return{record,forecast,forecastView,puzzleReceipt,failure,knightCostText,moenResult,result,live};
});
