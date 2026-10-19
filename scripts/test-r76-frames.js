const fs=require('node:fs');const path=require('node:path');
const {chromium}=require('playwright');const {serve}=require('./capture-r73-mobile');
(async()=>{
 const server=await serve(),browser=await chromium.launch({headless:true});const results=[];
 try {
  for(const [width,height] of [[1366,768],[390,844]]){
   const runs=[];
   for(let run=1;run<=3;run++){
    const c=await browser.newContext({viewport:{width,height},hasTouch:width<600,isMobile:width<600,serviceWorkers:'block'});
    const p=await c.newPage();await p.goto(`http://127.0.0.1:${server.address().port}/templates/card-battle/index.html?trial=1`);
    await p.locator('#trialBegin').click();
    await p.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));await document.fonts.ready;});
    const p95=await p.evaluate(()=>new Promise(resolve=>{const values=[];let last;
     function frame(now){if(last)values.push(now-last);last=now;if(values.length<185)requestAnimationFrame(frame);else{const sorted=values.slice(5).sort((a,b)=>a-b);resolve(sorted[Math.floor(sorted.length*.95)]);}}requestAnimationFrame(frame);
    }));
    runs.push(p95);await c.close();
   }
   const median=[...runs].sort((a,b)=>a-b)[1];results.push({width,height,runsP95Ms:runs,medianP95Ms:median,within18ms:median<=18});
  }
  const report={status:results.every(x=>x.within18ms)?'EXECUTED':'BLOCKED',qualification:'Concurrent-machine headless Chromium rAF intervals, not GPU duration or physical-device release validation.',results};
  fs.writeFileSync(path.resolve(__dirname,'../docs/evidence/r76-art/frame-times.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  if(results.some(x=>!x.within18ms))process.exitCode=1;
 } finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
