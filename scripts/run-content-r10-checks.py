"""Sequential headless gates; no second test browser or server runs concurrently."""
from pathlib import Path
import os,subprocess,json,time,sys
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r10/checks';O.mkdir(parents=True,exist_ok=True)
env=dict(os.environ,NODE_OPTIONS='--require=./scripts/r10-evidence-guard.js',PYTHONIOENCODING='utf-8')
commands=[('r10',['npm.cmd','run','test:content:r10']),('unit',['npm.cmd','test']),('legacy-e2e',['npm.cmd','run','test:e2e']),('rwd',['npm.cmd','run','test:rwd']),('r6',['npm.cmd','run','test:content:r6']),('r6-effects',['node','scripts/test-content-r6-effects.js']),('r7',['npm.cmd','run','test:content:r7']),('r8',['npm.cmd','run','test:content:r8']),('r9',['npm.cmd','run','test:content:r9']),('r9-puzzles',['node','scripts/capture-content-r9-puzzles.js']),('frames',['node','scripts/measure-content-r8.js']),('ci-performance',['npm.cmd','run','test:r67:performance'])]
receipts=json.loads((O/'exits.json').read_text(encoding='utf8')) if (O/'exits.json').exists() else []
selected=set(sys.argv[1].split(',')) if len(sys.argv)>1 else {n for n,c in commands}
for name,cmd in commands:
 if name not in selected:continue
 start=time.time();attempt=1+sum(x['name']==name for x in receipts);log=O/(name+'-'+str(attempt)+'.log');print('EXECUTED',name,flush=True)
 with log.open('w',encoding='utf8') as f:p=subprocess.run(cmd,cwd=R,env=env,stdout=f,stderr=subprocess.STDOUT)
 receipts.append(dict(name=name,command=cmd,exit=p.returncode,seconds=round(time.time()-start,1),log=log.relative_to(R).as_posix()));(O/'exits.json').write_text(json.dumps(receipts,indent=2),encoding='utf8');print(name,p.returncode,flush=True)
 if p.returncode:raise SystemExit(p.returncode)
print('VERIFIED selected gates',flush=True)
