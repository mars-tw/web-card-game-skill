"""Sequential full regression: never run more than one browser/server at a time."""
from pathlib import Path
import subprocess,json,os,time
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r6';O.mkdir(parents=True,exist_ok=True)
env={**os.environ,'PYTHONIOENCODING':'utf-8','CARD_EVIDENCE_OUTPUT':str(O/'r67-visual-assets.json')}
npm='npm.cmd' if os.name=='nt' else 'npm'
commands=[('static',[npm,'test']),('e2e',[npm,'run','test:e2e']),('rwd',[npm,'run','test:rwd']),('ci-performance',[npm,'run','test:r67:performance']),('frames',['node','scripts/measure-content-r6.js']),('r6',['node','scripts/test-content-r6-e2e.js'])]
results=[]
for label,cmd in commands:
    print('EXECUTED',label,flush=True);start=time.monotonic()
    with (O/(label+'-final.txt')).open('w',encoding='utf8') as out:q=subprocess.run(cmd,cwd=R,env=env,stdout=out,stderr=subprocess.STDOUT)
    results.append(dict(name=label,command=cmd,exitCode=q.returncode,seconds=round(time.monotonic()-start,2)))
    (O/'test-exits.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf8');print('VERIFIED' if q.returncode==0 else 'BLOCKED',label,q.returncode,flush=True)
raise SystemExit(1 if any(x['exitCode'] for x in results) else 0)
