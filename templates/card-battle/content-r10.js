/* Readable public outcomes and replaceable art; no rule writes during rendering. */
(function(root,factory){const api=factory();if(root)root.CardContentR10=api;if(typeof module!=='undefined')module.exports=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const art='../../assets/art/content-r10/';
  const tideLabel=n=>n>=6?'潮能已滿 6/6':`潮能 ${n}/6（差 ${6-n} 格）`;
  const healLabel=p=>p.hp>=p.maxHp?'英雄已滿血，不回復':`英雄回復 ${Math.min(3,p.maxHp-p.hp)} 點`;
  const undo=new WeakMap(),reactions=new WeakMap();let activeGame=null;
  const combatStamp=g=>JSON.stringify(['player','enemy'].map(s=>[g[s].hp,g[s].mana,g[s].tide,g[s].hand.map(c=>c.uid),g[s].field.map(c=>[c.uid,c.health,c.shield,c.canAttack])]));
  function remember(g,index){undo.set(g,{index,round:g.turnCount,stamp:combatStamp(g)});}
  function canUndo(g){const u=undo.get(g);return !!u&&g.forecast?.reversed&&u.round===g.turnCount&&g.turn==='player'&&!g.over&&u.stamp===combatStamp(g);}
  function revert(g){if(!canUndo(g))return false;const u=undo.get(g);g.forecast.directions[u.index]=g.forecast.original[u.index];g.forecast.reversed=false;undo.delete(g);return true;}
  function seal(g){undo.delete(g);}
  function react(g,defeated=false){
    if(g.content?.id!=='moen')return;
    const r={pose:defeated?'defeated':'hurt',until:performance.now()+(defeated?1500:800)};reactions.set(g,r);
    const e=document.querySelector('#moenStage img');if(e)e.src=art+'moen-'+r.pose+'.webp';
    if(!defeated){
      setTimeout(()=>{if(activeGame===g&&reactions.get(g)===r){r.pose='recover';r.until=performance.now()+350;const e=document.querySelector('#moenStage img');if(e)e.src=art+'moen-recover.webp';}},400);
      setTimeout(()=>{if(activeGame===g&&reactions.get(g)===r){r.until=0;const stage=document.getElementById('moenStage');if(stage)stage.querySelector('img').src=moenArt(g,Number(stage.dataset.pose)||0);}},760);
    }
  }
  function moenArt(g,pose){const r=reactions.get(g);return art+'moen-'+(r&&performance.now()<r.until?r.pose:pose===0?'ready':'cast')+'.webp';}
  function render(g){
    activeGame=g;
    const channel=document.querySelector('.r75-tide-channel');document.getElementById('contentAnchor')?.remove();
    if(!(g.content||g.forecast)||g.over||!channel)return;
    const type=g.content?.id==='moen'?'moen':g.forecast?'forecast':'puzzles',img=document.createElement('img');img.id='contentAnchor';img.src=art+'anchor-'+type+'.webp';img.alt={moen:'茉恩守約貝印',forecast:'三潮羅盤',puzzles:'六道解潮結'}[type];channel.appendChild(img);
  }
  function installPoses(player){for(const id of ['knight','footman']){const frame=(pose,ms)=>({src:`../../assets/animations/content-r10/${id}-${pose}.webp`,ms});player.register(id,{attack:{anticipation:[frame('anticipation',180)],impact:[frame('impact',180)],recovery:[frame('recovery',180)]},hurt:{frames:[frame('hurt',240)]},death:{frames:[frame('hurt',160),frame('death',400)]}});}}
  return{art,tideLabel,healLabel,remember,canUndo,revert,seal,react,moenArt,render,installPoses};
});
