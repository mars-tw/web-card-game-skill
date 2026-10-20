"""Mandatory complete local gates; one server/browser at a time, hidden windows."""
import os,subprocess,json,time,sys
from pathlib import Path
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r13/checks';O.mkdir(parents=True,exist_ok=True)
env=dict(os.environ,NODE_OPTIONS='--require=./scripts/r13-evidence-guard.js',PYTHONIOENCODING='utf-8',PYTHONUTF8='1',PYTHONPATH=str(R/'scripts/r13-python-guard'))
commands=[('unit','npm test'),('local-rules','npm run verify:local:rules'),('e2e','npm run test:e2e'),('rwd','npm run test:rwd'),('r6','npm run test:content:r6'),('r7','npm run test:content:r7'),('r8','npm run test:content:r8'),('r9','npm run test:content:r9'),('r10','npm run test:content:r10'),('r11','npm run test:content:r11'),('r11-cleanup','node scripts/test-content-r11-cleanup.js'),('r12','npm run test:content:r12'),('r13','node scripts/test-content-r13-e2e.js'),('frames','node scripts/measure-content-r8.js'),('performance','npm run test:r67:performance'),('integrity','python scripts/verify-content-r13.py')]
commands.sort(key=lambda row:0 if row[0]=='r13' else 1)
results=json.loads((O/'results.json').read_text()) if (O/'results.json').exists() else []
only=set(filter(None,os.environ.get('R13_ONLY','').split(',')))
for name,cmd in commands:
 if only and name not in only:continue
 print('EXECUTED '+name,flush=True);start=time.time()
 log=O/(name+'.log')
 if log.exists():log.rename(O/(name+'-'+str(time.time_ns())+'.log'))
 with log.open('wb')as f:
  args=['cmd','/d','/c',cmd] if os.name=='nt' else ['sh','-c',cmd]
  run=subprocess.run(args,cwd=R,env=env,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
 row=dict(name=name,command=cmd,exit_code=run.returncode,seconds=round(time.time()-start,2),status='VERIFIED' if run.returncode==0 else 'BLOCKED');results.append(row)
 (O/'results.json').write_text(json.dumps(results,indent=2),encoding='utf-8');print(json.dumps(row),flush=True)
 if run.returncode:sys.exit(run.returncode)
