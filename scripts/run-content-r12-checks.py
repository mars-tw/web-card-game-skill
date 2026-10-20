"""Sequential, hidden gates with preserved history and concrete exit-code evidence."""
import os,subprocess,json,time
from pathlib import Path
root=Path(__file__).resolve().parents[1]
out=root/'docs/content/r12/checks';out.mkdir(parents=True,exist_ok=True)
env=dict(os.environ,NODE_OPTIONS='--require=./scripts/r12-evidence-guard.js',PYTHONIOENCODING='utf-8',PYTHONUTF8='1',PYTHONPATH=str(root/'scripts/r12-python-guard'))
commands=[('r12-e2e',['node','scripts/test-content-r12-e2e.js']),('r12-feedback',['node','scripts/test-content-r12-feedback.js']),('r12-offline',['node','scripts/test-content-r12-offline.js']),('npm-test',['cmd','/d','/c','npm test']),('npm-e2e',['cmd','/d','/c','npm run test:e2e']),('rwd',['cmd','/d','/c','npm run test:rwd']),('r10',['cmd','/d','/c','npm run test:content:r10']),('r11',['cmd','/d','/c','npm run test:content:r11']),('r11-cleanup',['node','scripts/test-content-r11-cleanup.js']),('r6',['cmd','/d','/c','npm run test:content:r6']),('r7',['cmd','/d','/c','npm run test:content:r7']),('r8',['cmd','/d','/c','npm run test:content:r8']),('r9',['cmd','/d','/c','npm run test:content:r9']),('frames',['node','scripts/measure-content-r8.js']),('ci-performance',['cmd','/d','/c','npm run test:r67:performance'])]
results=json.loads((out/'results.json').read_text(encoding='utf-8')) if (out/'results.json').exists() else []
only=set(filter(None,os.environ.get('R12_ONLY','').split(',')))
for name,args in commands:
 if only and name not in only:continue
 print('EXECUTED '+name,flush=True);start=time.time();dest=out/(name+'.log')
 if dest.exists():dest.rename(out/(name+'-'+str(time.time_ns())+'.log'))
 with dest.open('wb') as log:r=subprocess.run(args,cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
 results.append(dict(name=name,command=args,exit_code=r.returncode,seconds=round(time.time()-start,2),status='VERIFIED' if r.returncode==0 else 'BLOCKED'))
 (out/'results.json').write_text(json.dumps(results,indent=2),encoding='utf-8');print(results[-1],flush=True)
 if r.returncode:raise SystemExit(r.returncode)
print('VERIFIED all selected R12 gate groups',flush=True)
