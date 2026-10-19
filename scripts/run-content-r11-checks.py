"""One headless browser/server at a time; stdout and exit codes retained."""
import os,subprocess,json,time
from pathlib import Path
root=Path(__file__).resolve().parent.parent
out=root/'docs/content/r11/checks';out.mkdir(parents=True,exist_ok=True)
env=dict(os.environ,NODE_OPTIONS='--require=./scripts/r11-evidence-guard.js',PYTHONIOENCODING='utf-8',PYTHONUTF8='1')
commands=[
 ('r11-e2e',['node','scripts/test-content-r11-e2e.js']),
 ('cleanup',['node','scripts/test-content-r11-cleanup.js']),
 ('npm-test',['cmd','/d','/c','npm test']),
 ('npm-e2e',['cmd','/d','/c','npm run test:e2e']),
 ('rwd',['cmd','/d','/c','npm run test:rwd']),
 ('r6',['cmd','/d','/c','npm run test:content:r6']),
 ('r6-effects',['node','scripts/test-content-r6-effects.js']),
 ('r7',['cmd','/d','/c','npm run test:content:r7']),
 ('r8',['cmd','/d','/c','npm run test:content:r8']),
 ('r9',['cmd','/d','/c','npm run test:content:r9']),
 ('r9-six-puzzles',['node','scripts/capture-content-r9-puzzles.js']),
 ('r10',['cmd','/d','/c','npm run test:content:r10']),
 ('frames',['node','scripts/measure-content-r8.js']),
 ('ci-performance',['cmd','/d','/c','npm run test:r67:performance']),
]
results=json.loads((out/'results.json').read_text(encoding='utf-8')) if (out/'results.json').exists() else []
start_at=os.environ.get('R11_START_AT','')
only=set(filter(None,os.environ.get('R11_ONLY','').split(',')))
for name,args in commands:
 if only and name not in only:continue
 if start_at and name!=start_at:continue
 start_at=''
 print('EXECUTED '+name,flush=True);start=time.time()
 if name=='r11-e2e' and (out.parent/'failure.txt').exists():(out.parent/'failure.txt').rename(out.parent/('failure-'+str(int(time.time()))+'.txt'))
 dest=out/(name+'.log')
 if dest.exists():dest.rename(out/(name+'-'+str(int(time.time()))+'.log'))
 with dest.open('wb') as log:r=subprocess.run(args,cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
 results.append(dict(name=name,command=args,exit_code=r.returncode,seconds=round(time.time()-start,2),status='VERIFIED' if r.returncode==0 else 'BLOCKED'))
 (out/'results.json').write_text(json.dumps(results,indent=2),encoding='utf-8');print(results[-1],flush=True)
 if r.returncode:raise SystemExit(r.returncode)
print('VERIFIED all R11 check groups',flush=True)
