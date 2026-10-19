/* Bounded, headless public forecast flow for layout diagnostics. */
const {chromium}=require('playwright'),{serve}=require('./capture-r73-mobile');
const {select,cast,attack,nextTurn}=require('./content-r2-helpers');
const fs=require('node:fs'),path=require('node:path');
(async()=>{const s=await serve(),b=await chromium.launch({headless:true});try{
 const width=Number(process.argv[2]||844),height=Number(process.argv[3]||390);
 const c=await b.newContext({viewport:{width,height},hasTouch:true,isMobile:width<600,serviceWorkers:'block'}),p=await c.newPage();
 await p.addInitScript(()=>localStorage.setItem('cb_guide_done_v1','1'));await p.goto(`http://127.0.0.1:${s.address().port}/templates/card-battle/index.html?content=1`);
 await select(p,'forecast');await p.locator('[data-round="1"]').click();await p.locator('#forecastClose').click();await cast(p,'flood');await attack(p,0,0);await attack(p,1,0);await nextTurn(p);await nextTurn(p);await nextTurn(p);await p.locator('#moreActionsBtn').click();await p.locator('#tideChartBtn').click();
 const rects=await p.evaluate(()=>Object.fromEntries(['.board','#enemyField','#playerField','#enemyField .card','#playerField .card','#tideChartPanel','#tideChartPanel .tide-chart-sheet'].map(sel=>{const e=document.querySelector(sel),s=getComputedStyle(e);return[sel,{rect:e.getBoundingClientRect().toJSON(),width:s.width,minWidth:s.minWidth,margin:s.margin,position:s.position,grid:s.gridTemplateColumns}];})));
 const O=path.resolve(__dirname,'../docs/content/r4');await p.screenshot({path:path.join(O,`inspect-forecast-${width}x${height}.png`)});fs.writeFileSync(path.join(O,`inspect-forecast-${width}x${height}.json`),JSON.stringify(rects,null,2));console.log(JSON.stringify(rects,null,2));await c.close();
 }finally{await b.close();await new Promise(r=>s.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
