"""Sequential headless checks; one test-owned server/browser at a time."""
from pathlib import Path
import subprocess,os,json,time,sys
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r8/checks';O.mkdir(parents=True,exist_ok=True)
env=dict(os.environ,NODE_OPTIONS='--require=./scripts/r8-evidence-guard.js',PYTHONIOENCODING='utf-8')
commands=[('r8',['node','scripts/test-content-r8-e2e.js']),('r8-effects',['node','scripts/capture-content-r8-effects.js']),('landscape',['node','scripts/capture-content-r8-landscape.js']),('puzzle-readability',['node','scripts/capture-content-r8-puzzles.js']),('forecast-effects',['node','scripts/capture-content-r8-forecast.js']),('timing',['node','scripts/test-content-r8-timing.js']),('unit',['npm.cmd','test']),('legacy-e2e',['npm.cmd','run','test:e2e']),('rwd',['npm.cmd','run','test:rwd']),('r6',['npm.cmd','run','test:content:r6']),('r6-effects',['node','scripts/test-content-r6-effects.js']),('r7',['npm.cmd','run','test:content:r7']),('r8-offline',['node','scripts/test-content-r8-offline.js']),('frames',['node','scripts/measure-content-r8.js'])]
receipts=json.loads((O/'exits.json').read_text(encoding='utf8')) if (O/'exits.json').exists() else []
selected=set(sys.argv[1].split(',')) if len(sys.argv)>1 else {name for name,cmd in commands}
for name,cmd in commands:
 if name not in selected:continue
 start=time.time();attempt=sum(x['name']==name for x in receipts)+1;log=O/(name+('' if attempt==1 else '-attempt'+str(attempt))+'.log')
 with log.open('w',encoding='utf8') as f:p=subprocess.run(cmd,cwd=R,env=env,stdout=f,stderr=subprocess.STDOUT)
 receipts.append(dict(name=name,command=cmd,exit=p.returncode,seconds=round(time.time()-start,1),log=log.relative_to(R).as_posix()))
 (O/'exits.json').write_text(json.dumps(receipts,indent=2),encoding='utf8');print(name,p.returncode,flush=True)
 if p.returncode and '--fail-fast' in sys.argv:break
latest={r['name']:r for r in receipts};ok=all(r['exit']==0 for r in latest.values());print('VERIFIED' if ok else 'BLOCKED: inspect failed gates',flush=True)
raise SystemExit(0 if ok else 1)
