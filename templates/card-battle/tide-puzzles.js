/* Hand-authored offline tactics. Shared by the real battle and Node tests. */
(function(root,factory){const api=factory();if(root)root.CardTideContent=api;if(typeof module!=='undefined')module.exports=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const KEY='card_tide_content_r1';
  const PUZZLES=[
    {id:'fallen',name:'一兵換滿潮',goal:'點士兵查看交換預覽；本回合擊敗英雄。',hint:'士兵倒下會補滿第六格。接著點「裂潮」，選漲潮收尾。',tide:5,enemyHp:2,player:['footman'],enemy:['archer'],solution:['attack:0:0','flood'],lesson:'士兵倒下補滿最後一格，浪潮接著收尾。'},
    {id:'shield',name:'先剝聖盾',goal:'本回合清空敵陣並擊敗英雄。',hint:'符文守衛已受傷，只剩 1 血但有聖盾。先用士兵剝盾，再讓浪峰命中。',tide:6,enemyHp:2,player:['footman'],enemy:['guardian'],wounded:[1],solution:['attack:0:0','flood'],lesson:'聖盾會吃掉整次潮傷；低攻交換要放在浪潮之前。'},
    {id:'shelter',name:'退浪留弓',goal:'本回合消滅迅捷狼，弓箭手必須存活。',hint:'先到觀潮台選退潮，給弓箭手聖盾，再攻擊迅捷狼。',tide:6,enemyHp:30,player:['archer'],enemy:['wolf'],survivor:'archer',solution:['ebb','attack:0:0'],lesson:'同樣一次交換，退潮的聖盾讓你的輸出留下來。'},
    {id:'taunt',name:'浪後的缺口',goal:'本回合清空敵陣並擊敗英雄。',hint:'敵士兵只剩 1 血。漲潮清掉嘲諷後，迅捷狼才有直取英雄的路。',tide:6,enemyHp:4,player:['wolf'],enemy:['footman'],wounded:[1],solution:['flood','face:0'],lesson:'浪潮清場不只換血，也會改變合法攻擊目標。'},
    {id:'spell',name:'留一滴給海',goal:'本回合清空敵陣並擊敗英雄。',hint:'火焰箭只打隨從。先把 4 血騎士打到 1 血，再以漲潮一起收尾。',tide:6,enemyHp:2,player:['saltShieldSquire'],enemy:['knight'],hand:['firebolt'],solution:['spell:0:0','flood'],lesson:'先讓單體法術留下浪潮的收割線，一次潮術才有雙重成果。'},
    {id:'cross',name:'兩線同退',goal:'本回合清空敵陣、擊敗英雄，己方騎士存活。',hint:'士兵換弓箭手蓄滿潮；騎士換獅鷲，兩名敵人便都剩 1 血。最後漲潮。',tide:5,enemyHp:2,player:['footman','knight'],enemy:['archer','griffin'],survivor:'knight',solution:['attack:0:0','attack:1:1','flood'],lesson:'交換對象決定整片敵陣能否同時進入潮傷範圍。'},
  ];
  const SPECIAL=[
    {id:'forecast',name:'潮汐預報',goal:'善用唯一一次反轉，保住能反攻的隨從並擊敗英雄。',hint:'三回合的潮向先公開；整局只能改一次。滿六格後，仍要親手施放。',tide:6,enemyHp:5,player:['archer','knight'],enemy:['knight'],lesson:'你改了未來的潮向，也保住下一回合能出擊的隨從。'},
    {id:'moen',name:'茉恩的退潮考驗',goal:'看過茉恩的退潮後擊敗她。先結束整備回合。',hint:'茉恩會退潮留守一回合，騎士下輪才出擊。先用士兵剝盾，弓箭手削血，再讓己方騎士收尾；漲潮與迅捷狼接著反攻。',tide:5,enemyHp:4,player:['footman','knight','archer','wolf'],enemy:['knight'],lesson:'茉恩把滿潮留給護航；你拆開護盾，守住了反攻的人。'},
  ];
  // Scenarios describe the board, never the solution. Only lesson one is guided.
  const contexts={fallen:'士兵倒下會補上第六格潮能。',shield:'守衛只有一血，聖盾仍完整。',shelter:'弓箭手與狼都能在一次交換中倒下。',taunt:'一血士兵擋在英雄前方。',spell:'敵騎士四血，手中只有一張火焰箭。',cross:'兩名敵軍血量不同，只差一格滿潮。',forecast:'三回合潮向公開；整局只能改一次。',moen:'茉恩先護住騎士，留守一輪後出擊。'};
  for(const d of [...PUZZLES,...SPECIAL])d.hint=contexts[d.id];
  SPECIAL[1].goal='觀察退潮留守的空檔，擊敗茉恩。';
  const CHECKS=[{id:'undertow',name:'複驗：護住騎士',goal:'清空敵陣，己方騎士至少保留 4 血。',hint:'同樣的退潮規則，這次要守住騎士。',tide:6,enemyHp:30,player:['knight'],enemy:['wolf'],survivor:'knight',minSurvivorHp:4,clearField:true,solution:['ebb','attack:0:0'],lesson:'你把退潮用在新的目標上：騎士四血留場，迅捷狼退場。'}];
  const get=id=>[...PUZZLES,...SPECIAL,...CHECKS].find(x=>x.id===id);
  const isPuzzle=id=>[...PUZZLES,...CHECKS].some(d=>d.id===id);
  const unlocked=p=>PUZZLES.every(d=>progress(p).completed.includes(d.id));
  function progress(raw){try{const v=typeof raw==='string'?JSON.parse(raw):raw;return{version:2,completed:[...new Set((Array.isArray(v?.completed)?v.completed:[]).filter(id=>get(id)))].slice(0,9),forecastUses:Math.max(0,Math.min(1000000,Math.floor(Number(v?.forecastUses)||0))),harborBossCleared:v?.harborBossCleared===true};}catch{return{version:2,completed:[],forecastUses:0,harborBossCleared:false};}}
  function complete(raw,id){const p=progress(raw);if(get(id)&&!p.completed.includes(id))p.completed.push(id);return p;}
  function counts(raw){const p=progress(raw);return{puzzles:PUZZLES.filter(d=>p.completed.includes(d.id)).length,verification:CHECKS.filter(d=>p.completed.includes(d.id)).length};}
  function setup(game,id,pool){
    const d=get(id);if(!d)throw new Error('Unknown tide lesson');
    const make=(cardId,uid)=>{const c=JSON.parse(JSON.stringify(pool.find(x=>x.id===cardId)));if(!c)throw new Error('Missing card '+cardId);return Object.assign(c,{uid,maxHealth:c.health,canAttack:true,shield:(c.keywords||[]).includes('divineshield')});};
    game.content={id,version:1,enemyEbbUsed:false};delete game.tideTrial;
    game.difficulty='normal';game.turn='player';game.turnCount=1;game.over=false;game.selected=null;game.pendingSpell=null;game.pendingBattlecry=null;
    for(const side of ['player','enemy']){
      const s=game[side];Object.assign(s,{hp:side==='player'?20:d.enemyHp,maxHp:side==='player'?20:id==='moen'?7:d.enemyHp,mana:4,manaMax:4,tide:side==='player'?d.tide:id==='moen'?5:0,fatigue:0,tidebreaksUsed:0,hand:[],field:d[side].map((c,i)=>make(c,`content-${side}-${i}`)),deck:Array.from({length:12},(_,i)=>make('saltShieldSquire',`content-${side}-deck-${i}`))});
      s.tideRates={turn:1,fallen:1,spell:0};
    }
    game.player.hand=(d.hand||[]).map((c,i)=>make(c,`content-hand-${i}`));
    d.wounded?.forEach((hp,i)=>game.enemy.field[i].health=hp);
    if(id==='undertow')game.player.field[0].health=4;
    if(id==='moen')game.player.field.forEach(c=>c.canAttack=false);
    if(id==='spell')game.player.field.forEach(c=>c.canAttack=false);
    if(id==='forecast')game.forecast={directions:['flood','flood','ebb'],original:['flood','flood','ebb'],reversed:false};else delete game.forecast;
    game.player.opp=game.enemy;game.enemy.opp=game.player;game.mulliganUsed=true;
    return game;
  }
  function direction(g){return g?.forecast?.directions[g.turnCount-1]||null;}
  function reverse(g,index){if(!g?.forecast||g.forecast.reversed||g.over||g.turn!=='player'||!Number.isInteger(index)||index<g.turnCount-1||index>2)return false;g.forecast.directions[index]=g.forecast.directions[index]==='ebb'?'flood':'ebb';g.forecast.reversed=true;return true;}
  function outcome(g){
    if(!g?.content)return null;const d=get(g.content.id);if(!d)return 'failed';
    if(g.player.hp<=0)return 'failed';
    const survivor=!d.survivor||g.player.field.some(c=>c.id===d.survivor&&c.health>=(d.minSurvivorHp||1));
    if(d.survivor&&!survivor)return 'failed';
    if((d.id==='shelter'||d.clearField)&&!g.enemy.field.length&&survivor)return 'completed';
    if(g.enemy.hp<=0)return survivor&&(!isPuzzle(d.id)||!g.enemy.field.length)&&(d.id!=='moen'||g.content.enemyEbbUsed)?'completed':'failed';
    if(isPuzzle(d.id)&&(g.turn!=='player'||g.turnCount>1))return 'failed';
    return null;
  }
  function valid(g){
    const forecastValid=f=>!!f&&Array.isArray(f.directions)&&f.directions.length===3&&f.directions.every(x=>x==='flood'||x==='ebb')&&typeof f.reversed==='boolean'&&(!f.original||Array.isArray(f.original)&&f.original.length===3&&f.original.every(x=>x==='flood'||x==='ebb'));
    if(!g.content)return !g.forecast||g.forecast.scope==='free'&&forecastValid(g.forecast);
    if(g.content.version!==1||!get(g.content.id)||typeof g.content.enemyEbbUsed!=='boolean')return false;
    if(g.content.harborBoss!==undefined&&typeof g.content.harborBoss!=='boolean')return false;
    for(const key of ['returning','returnHeal','returnResolved'])if(g.content[key]!==undefined&&typeof g.content[key]!=='boolean')return false;
    if(g.content.returnTide!==undefined&&(!Number.isInteger(g.content.returnTide)||g.content.returnTide<0||g.content.returnTide>6))return false;
    if(g.content.id!=='forecast')return !g.forecast;
    return forecastValid(g.forecast);
  }
  const RECAP={
    fallen:{line:'你用士兵換弓箭手，陣亡補上第六格潮能，再以漲潮收尾。',cards:[['footman','陣亡 → 潮 6/6'],['archer','留下 1 血 → 漲潮收尾']]},
    shield:{line:'你先讓士兵剝掉聖盾，再以漲潮收尾，清掉一血守衛。',cards:[['footman','先攻擊剝盾'],['guardian','聖盾消失 → 漲潮收尾']]},
    shelter:{line:'你先退潮給弓箭手聖盾，再交換迅捷狼，弓箭手留在場上。',cards:[['archer','退潮聖盾 → 存活'],['wolf','交換後退場']]},
    taunt:{line:'你先用漲潮清掉嘲諷士兵，迅捷狼才能直取英雄。',cards:[['footman','嘲諷被浪清除'],['wolf','缺口打開 → 直攻英雄']]},
    spell:{line:'你用火焰箭把四血騎士壓到一血，再用漲潮同時收場與斬殺。',cards:[['firebolt','法術先打 3 點'],['knight','4 → 1 → 漲潮收尾']]},
    cross:{line:'你讓士兵換弓箭手、騎士換獅鷲，兩線同到一血，漲潮收場且騎士存活。',cards:[['footman','換弓箭手 → 滿潮'],['archer','剩 1 血'],['knight','換獅鷲 → 存活'],['griffin','剩 1 血']]}
  };
  RECAP.undertow={line:CHECKS[0].lesson,cards:[['knight','四血留場'],['wolf','交換後退場']]};
  function failureCard(g){return({fallen:'footman',shield:'guardian',shelter:'archer',taunt:'wolf',spell:'knight',cross:'footman',undertow:'knight'})[g.content?.id];}
  function failure(g){
    const id=g.content?.id,field=g.enemy.field;
    if(id==='fallen')return g.player.tide<6?'錯在先結束回合：士兵還沒打弓箭手，潮能只有 '+g.player.tide+'/6。先交換，再掀浪。':'錯在還沒掀浪就結束回合：潮能已滿，還要用漲潮擊敗英雄。';
    if(id==='shield')return field.some(c=>c.shield)?'錯在沒有先剝盾：守衛仍有聖盾，敵陣沒有清空。先點士兵剝盾，再掀浪。':'錯在還沒收尾就結束回合：先剝盾，再以漲潮清空敵陣並擊敗英雄。';
    if(id==='shelter')return g.player.field.some(c=>c.id==='archer')?'錯在還沒完成交換就結束回合：迅捷狼仍在場。缺少退潮保護後的攻擊。':'錯在先攻擊：弓箭手沒有聖盾，交換後陣亡。先退潮給盾，再打迅捷狼。';
    if(id==='taunt')return field.length?'錯在還沒清掉嘲諷就結束回合：先漲潮，再讓迅捷狼打英雄。':'錯在還沒打英雄就結束回合：缺口已打開，還要點迅捷狼直攻英雄。';
    if(id==='spell')return g.player.tidebreaksUsed?'錯在先掀浪：騎士還有 '+(field[0]?.health||0)+' 血。先用火焰箭打到 1 血，再漲潮。':g.player.hand.some(c=>c.id==='firebolt')?'錯在還沒完成施法就結束回合：缺少火焰箭壓低騎士血量，再由漲潮收尾。':'錯在還沒掀浪就結束回合：法術已壓低血量，缺少漲潮收尾。';
    if(id==='cross'){
      if(field.length===2&&field.every(c=>c.health===1))return '錯在還沒收尾：兩線已交換，缺少漲潮清空敵陣並擊敗英雄。';
      if(!g.player.field.some(c=>c.id==='footman')&&field.some(c=>c.id==='archer'&&c.health===1)&&field.some(c=>c.id==='griffin'&&c.health>1))return '錯在兩線交換尚未完成：士兵已換弓箭手，缺少騎士換獅鷲，再以漲潮收尾。';
      return g.player.field.some(c=>c.id==='footman')?'錯在兩線交換尚未完成：缺少士兵換弓箭手，並確認獅鷲進入一血收割線，再用漲潮收尾。':'錯在交換對象：士兵要打弓箭手，騎士要打獅鷲。讓兩邊都剩 1 血，再漲潮收尾。';
    }
    if(id==='undertow')return g.player.field.some(c=>c.id==='knight'&&c.health>=4)?'錯在尚未清空敵陣：缺少退潮保護後的交換。':'錯在騎士未受保護就交換：缺少退潮聖盾，無法保留 4 血。';
    if(id==='forecast')return '反攻未能完成。觀察三回合潮向：反轉的時機決定哪一回合能退潮保護隨從。';
    return '這次未達成目標。'+get(id).hint;
  }
  return{KEY,PUZZLES,SPECIAL,CHECKS,RECAP,get,isPuzzle,unlocked,progress,complete,counts,setup,direction,reverse,outcome,valid,failure,failureCard};
});
