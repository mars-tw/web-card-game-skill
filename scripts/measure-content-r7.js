const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const{chromium}=require('playwright'),{serve}=require('./capture-r73-mobile');
(async()=>{const s=await serve(),b=await chromium.launch({headless:true}),result=[];
try{for(const[width,height]of[[1366,768],[390,844]]){const runs=[];for(let run=0;run<3;run++){
 const c=await b.newContext({viewport:{width,height},hasTouch:width<600,isMobile:width<600,serviceWorkers:'block'}),p=await c.newPage();await p.addInitScript(()=>localStorage.setItem('cb_guide_done_v1','1'));
 await p.goto(`http://127.0.0.1:${s.address().port}/templates/card-battle/index.html?content=1`);await p.locator('#contentPanel').waitFor({state:'visible'});await p.locator('[data-content-tab="moen"]').click();await p.locator('#contentStart').click();await p.waitForTimeout(500);await p.locator('#endTurnBtn').click();
 const m=await p.evaluate(()=>new Promise(resolve=>{const dt=[];let last;function tick(t){if(last!==undefined)dt.push(t-last);last=t;if(dt.length<240)requestAnimationFrame(tick);else{dt.sort((a,b)=>a-b);resolve({p95:dt[Math.floor(dt.length*.95)],samples:dt.length,max:dt.at(-1)});}}requestAnimationFrame(tick);}));runs.push(m);await c.close();
 }result.push({width,height,runs,median:runs.map(r=>r.p95).sort((a,b)=>a-b)[1]});}
 const receipt={status:result.every(r=>r.median<=18)?'VERIFIED':'BLOCKED',concurrentMachine:true,method:'Three runs, 240 rAF intervals each, public Moen encounter during actual scripted ebb; not native device or GPU execution time.',result};fs.writeFileSync(path.resolve(__dirname,'../docs/content/r7/frame-times.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));assert.ok(result.every(r=>r.median<=18),'median frame p95 <=18ms');
}finally{await b.close();await new Promise(r=>s.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
