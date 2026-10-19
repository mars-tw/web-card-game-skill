const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');const {serve}=require('./capture-r73-mobile');const {attack}=require('./capture-r75-art');
(async()=>{const s=await serve(),b=await chromium.launch({headless:true});
try {const c=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),p=await c.newPage();
await p.goto(`http://127.0.0.1:${s.address().port}/index.html`);await p.waitForURL('**/harbor.html');await p.locator('#trialStart').click();
const f=await(await p.locator('#battle').elementHandle()).contentFrame();await f.locator('#trialBegin').click();
await attack(f,'trial-p1','trial-e1');await attack(f,'trial-p2','trial-e2');
// Predecode the actual spell image; no game state is changed for this capture.
await f.evaluate(async()=>{const i=new Image();i.src='../../assets/art/r76/wave.webp';await i.decode();});
const out=path.resolve(__dirname,'../docs/art/compare/r76/wave');fs.mkdirSync(out,{recursive:true});
await f.locator('#trialChart').click();await f.locator('#tideChartClose').click();
await p.screenshot({path:path.join(out,'01-before.png')});await f.locator('#tidebreakBtn').click();
await f.waitForTimeout(250);await p.screenshot({path:path.join(out,'02-impact.png')});
await f.waitForTimeout(1150);await p.screenshot({path:path.join(out,'03-after.png')});
fs.writeFileSync(path.join(out,'capture.json'),JSON.stringify({status:'VERIFIED',method:'official root; real trial attacks and cast; unedited screenshots',waveWidthRatio:await f.locator('.r76-wave-art').evaluate(i=>i.getBoundingClientRect().width/innerWidth),files:['01-before.png','02-impact.png','03-after.png']},null,2));await c.close();
}finally{await b.close();await new Promise(r=>s.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
