const C=require('../templates/card-battle/tide-puzzles');
async function idle(p){await p.waitForFunction(()=>window.__test&&!window.__test.game().pendingSpell&&document.querySelector('#contentRetry')?.disabled===false||!document.querySelector('#contentResult').hidden);await p.waitForTimeout(1400);}
async function select(p,id){
 if(!await p.locator('#contentPanel').isVisible())await p.locator((await p.locator('#contentResult').isVisible())?'#contentResultMenu':'#contentMenu').click();
 await p.locator(`[data-content-tab="${C.PUZZLES.some(x=>x.id===id)?'puzzles':id}"]`).click();
 if(C.PUZZLES.some(x=>x.id===id))await p.locator(`[data-puzzle="${id}"]`).click();
 await p.locator('#contentStart').click();
}
async function attack(p,a,b){await p.locator(`#playerField [data-uid="content-player-${a}"]`).click();await p.locator(`#enemyField [data-uid="content-enemy-${b}"]`).click();await idle(p);}
async function face(p,a){await p.locator(`#playerField [data-uid="content-player-${a}"]`).click();await p.locator('#enemyHero').click();await idle(p);}
async function cast(p,mode){if(await p.locator('#moreActionsBtn').isVisible())await p.locator('#moreActionsBtn').click();await p.locator('#tideChartBtn').click();await p.locator(mode==='ebb'?'#chooseEbb':'#chooseFlood').click();await p.locator('#tideChartCast').click();await idle(p);}
async function spell(p,a,b){
 if(await p.locator('#handDrawerToggle').isVisible()&&!await p.locator('#playerHand').isVisible())await p.locator('#handDrawerToggle').click();
 const hand=p.locator(`#playerHand [data-uid="content-hand-${a}"]`);if(!await hand.isVisible()&&await p.locator('#handDrawerToggle').isVisible())await p.locator('#handDrawerToggle').click();
 await hand.click();if(await p.locator('#handConfirmBtn').isVisible())await p.locator('#handConfirmBtn').click();
 await p.locator(`#enemyField [data-uid="content-enemy-${b}"]`).click();await p.locator('#enemyField .target-action-popover .confirm').click();await idle(p);
}
async function nextTurn(p){const n=await p.evaluate(()=>window.__test.game().turnCount);await p.locator('#endTurnBtn').click();await p.waitForFunction(n=>window.__test.game().turnCount>n&&window.__test.game().turn==='player',n);await idle(p);}
async function playPuzzle(p,d){for(const step of d.solution){const [a,b,c]=step.split(':');if(a==='attack')await attack(p,b,c);if(a==='face')await face(p,b);if(a==='spell')await spell(p,b,c);if(a==='flood'||a==='ebb')await cast(p,a);}}

module.exports={idle,select,attack,face,cast,spell,nextTurn,playPuzzle};
