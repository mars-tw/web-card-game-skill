/* Explicit nonlethal QA fixture; only real cast/turn inputs mutate the three-frame series. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{serve}=require('./capture-r73-mobile');
const R=path.resolve(__dirname,'..'),out=path.join(R,'docs/art/compare/r80/before/wave');fs.mkdirSync(out,{recursive:true});
async function prepare(p){
 await p.addInitScript(()=>localStorage.setItem('cb_guide_done_v1','1'));
 await p.goto(global.r79base+'/templates/card-battle/index.html?trial=1&intro=0');await p.waitForFunction(()=>window.__test);await p.locator('#trialBegin').click();
 await setupFixture(p);
}
async function setupFixture(p){
 await p.evaluate(()=>{
  const t=window.__test;t.setup(['footman','footman','wolf','sparkSquire','emberpup'],['archer','archer']);
  const g=t.game();g.tideTrial=true;g.player.hand=[];g.enemy.hand=[];g.player.hp=g.player.maxHp=12;g.enemy.hp=g.enemy.maxHp=12;
  // One legitimate ready card, one summon-sick card. Standard card stats are unchanged.
  g.player.field[1].canAttack=false;g.player.field[1]._cantAttackThisTurn=true;
  g.enemy.field[0].health=1; // Previously wounded archer; lethal preview alongside a surviving one.
  t.setTide(6,0);window.__rerenderBattle();
 });
 await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));await p.waitForTimeout(1200);
}
async function state(p){return p.evaluate(()=>{const g=window.__test.game();return{playerHp:g.player.hp,enemyHp:g.enemy.hp,playerTide:g.player.tide,enemyTide:g.enemy.tide,turn:g.turnCount,over:g.over,player:g.player.field.map(m=>({uid:m.uid,id:m.id,health:m.health})),enemy:g.enemy.field.map(m=>({uid:m.uid,id:m.id,health:m.health})),wet:document.querySelector('.board').classList.contains('r76-wet')};});}
async function series(p,prefix,camera=p){
 const take=async name=>{const target=path.join(out,`${prefix}-${name}.png`);await camera.screenshot({path:target});return target;};
 const before=await state(p);await take('01-before');await p.locator('#tidebreakBtn').click();
 assert.deepEqual(await state(p),before,'no mutation before active impact');
 await p.waitForFunction(()=>document.querySelector('#tideWave').classList.contains('run'));
 await p.waitForTimeout(60);
 const motion=await p.evaluate(()=>({start:document.querySelector('.r76-wave-art').getBoundingClientRect().toJSON(),axis:document.querySelector('#tideWave').dataset.axis,static:document.querySelector('.r76-wave-art').getAnimations().length===0}));
 await p.waitForFunction(()=>window.__test.game().player.tide===0);
 motion.end=await p.locator('.r76-wave-art').evaluate(i=>i.getBoundingClientRect().toJSON());
 if(!motion.static)assert.ok(motion.axis==='x'?motion.end.x>motion.start.x+20:motion.end.y<motion.start.y-20,'wave front moves toward enemy');
 await p.waitForTimeout(80);
 const impact=await state(p),effect=await p.evaluate(()=>{const r=document.querySelector('.r76-wave-art').getBoundingClientRect();return{width:r.width/innerWidth,coverage:document.querySelector('#tideWave').dataset.axis==='x'?r.height/innerHeight:r.width/innerWidth,foam:[...document.querySelectorAll('.r77-impact-foam')].map(i=>({opacity:getComputedStyle(i).opacity,rect:i.getBoundingClientRect().toJSON()})),floating:document.querySelectorAll('.dmg-float').length,source:document.querySelector('.r79-tide-source').textContent};});
 await take('02-impact');assert.equal(impact.enemyHp,before.enemyHp-2);assert.equal(impact.enemyTide,1);assert.equal(impact.playerHp,before.playerHp);assert.equal(effect.floating,0);assert.ok(effect.source.includes('陣亡蓄潮 +1'));assert.ok(effect.coverage>=.7);
 await p.waitForFunction(()=>!document.querySelector('#tideWave').classList.contains('run'));
 const after=await state(p);assert.ok(after.wet&&!after.over);await take('03-after');
 assert.equal(after.enemy[0].uid,before.enemy[1].uid);assert.equal(after.enemy[0].health,before.enemy[1].health-1);
 assert.deepEqual(after.player,before.player);assert.equal(after.enemyTide,impact.enemyTide);assert.equal(after.enemyHp,impact.enemyHp);
 await p.locator('#endTurnBtn').click();await p.waitForFunction(t=>window.__test.game().turnCount>t&&window.__test.game().turn==='player',before.turn);
 const next=await state(p);assert.ok(next.wet,'wet deck remains after one entire turn');await take('04-next-turn');
 return{prefix,before,impact,after,next,effect,motion};
}
async function main(){const s=await serve();global.r79base=`http://127.0.0.1:${s.address().port}`;const b=await chromium.launch({headless:true});const results=[];
 try{for(const[w,h,scale]of[[390,844,1],[430,932,3],[1032,1376,2]]){const c=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:scale,hasTouch:true,isMobile:w<600,serviceWorkers:'block'}),p=await c.newPage();await prepare(p);results.push(await series(p,`${w*scale}x${h*scale}`));await c.close();}
 fs.writeFileSync(path.join(out,'continuity.json'),JSON.stringify({status:'VERIFIED',method:'Explicit reproducible nonlethal QA fixture. Standard cards, one previously wounded target; no mutation between before/impact/after/next turn except actual UI actions. Original unedited screenshots.',results},null,2));console.log('R79 directional nonlethal series VERIFIED');
 }finally{await b.close();await new Promise(r=>s.close(r));}}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={prepare,setupFixture,state,series};
