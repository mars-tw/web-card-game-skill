from pathlib import Path
import subprocess,json,os,time
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r6';env={**os.environ,'PYTHONIOENCODING':'utf-8','CARD_EVIDENCE_OUTPUT':str(O/'r67-visual-assets.json')}
commands=[('ci-performance-recheck',['npm.cmd' if os.name=='nt' else 'npm','run','test:r67:performance']),('e2e-recheck',['python','scripts/recheck-content-r6-e2e.py']),('final-effects',['node','scripts/test-content-r6-effects.js']),('static-recheck',['npm.cmd' if os.name=='nt' else 'npm','test'])]
results=[]
for name,cmd in commands:
    print('EXECUTED',name,flush=True);t=time.monotonic()
    with (O/(name+'.txt')).open('w',encoding='utf8') as out:q=subprocess.run(cmd,cwd=R,env=env,stdout=out,stderr=subprocess.STDOUT)
    results.append(dict(name=name,command=cmd,exitCode=q.returncode,seconds=round(time.monotonic()-t,2)))
    (O/'recheck-exits.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf8');print('VERIFIED' if q.returncode==0 else 'BLOCKED',name,q.returncode,flush=True)
raise SystemExit(1 if any(x['exitCode'] for x in results) else 0)
