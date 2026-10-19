"""Continue the original && chain from its failed content R1 constituent."""
from pathlib import Path
import subprocess,json,os,time
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r6';env={**os.environ,'PYTHONIOENCODING':'utf-8','CARD_EVIDENCE_OUTPUT':str(O/'r67-visual-assets.json')}
all_commands=json.loads((R/'package.json').read_text(encoding='utf8'))['scripts']['test:e2e'].split(' && ')
start=all_commands.index('node scripts/test-content-r1-e2e.js')
results=[dict(command=x,status='VERIFIED',exitCode=0,evidence='e2e-final.txt; original && chain reached content R1, so this preceding constituent exited 0') for x in all_commands[:start]]
for cmd in all_commands[start:]:
    name=cmd.split('/')[-1].replace('.js','');print('EXECUTED',name,flush=True);t=time.monotonic()
    with (O/(name+'-recheck.txt')).open('w',encoding='utf8') as out:q=subprocess.run(cmd.split(),cwd=R,env=env,stdout=out,stderr=subprocess.STDOUT)
    results.append(dict(command=cmd,status='VERIFIED' if q.returncode==0 else 'BLOCKED',exitCode=q.returncode,evidence=name+'-recheck.txt',seconds=round(time.monotonic()-t,2)))
    (O/'e2e-constituents.json').write_text(json.dumps(dict(status='VERIFIED' if len(results)==len(all_commands) and all(x['exitCode']==0 for x in results) else 'EXECUTED',initialChain='e2e-final.txt',cause='Landscape preview cancel button intercepted enemy card; fixed by independent bottom action row. Assertions unchanged.',constituents=results),indent=2)+'\n',encoding='utf8')
    print('VERIFIED' if q.returncode==0 else 'BLOCKED',name,q.returncode,flush=True)
    if q.returncode:raise SystemExit(q.returncode)
