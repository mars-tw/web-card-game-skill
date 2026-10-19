/* Concurrent-machine rAF intervals, not GPU execution or native-device proof. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const{chromium}=require('playwright'),{serve}=require('./capture-r73-mobile');
(async()=>{const s=await serve(),b=await chromium.launch({headless:true});const result=[];
try{for(const[width,height]of[[1366,768],[390,844]]){const runs=[];for(let run=0;run<3;run++){
 const c=await b.newContext({viewport:{width,height},serviceWorkers:'block'}),p=await c.newPage();await p.addInitScript(()=>localStorage.setItem('cb_guide_done_v1','1'));
 await p.goto(`http://127.0.0.1:${s.address().port}/templates/card-battle/index.html?intro=0`);await p.waitForFunction(()=>window.__test);await p.evaluate(()=>{window.__test.setup(['wolf','sparkSquire'],['archer','footman']);window.__test.setTide(6,0);});await p.waitForTimeout(1000);
 await p.locator('#tidebreakBtn').click();const m=await p.evaluate(()=>new Promise(resolve=>{const dt=[];let last;function tick(t){if(last!==undefined)dt.push(t-last);last=t;if(dt.length<240)requestAnimationFrame(tick);else{dt.sort((a,b)=>a-b);resolve({p95:dt[Math.floor(dt.length*.95)],samples:dt.length,max:dt.at(-1)});}}requestAnimationFrame(tick);}));runs.push(m);await c.close();
 }const median=runs.map(r=>r.p95).sort((a,b)=>a-b)[1];result.push({width,height,runs,median});console.log(width,height,median);}
 const receipt={status:result.every(r=>r.median<=18)?'VERIFIED':'BLOCKED',concurrentMachine:true,method:'3 runs per viewport; 240 rAF intervals per run including nonlethal cast; interval only, not GPU time or native device',result};fs.writeFileSync(path.resolve(__dirname,'../docs/evidence/r79-art/frame-times.json'),JSON.stringify(receipt,null,2));assert.ok(result.every(r=>r.median<=18),'median frame interval p95 <=18ms');
}finally{await b.close();await new Promise(r=>s.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
