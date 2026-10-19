"""One background browser/server workload at a time; never suppress a failure."""
from pathlib import Path
import subprocess,sys,json
R=Path(__file__).resolve().parents[1];O=R/'docs/evidence/r79-art'
stages=[('static-final',['npm.cmd','test']),('e2e-final',['npm.cmd','run','test:e2e']),('rwd-final',['npm.cmd','run','test:rwd']),('frames-final',['node','scripts/measure-r79-frames.js']),('performance-final',['node','scripts/test-r67-performance.js','--runs','3','--baseline','docs/evidence/R67/before/performance.json','--assert','--out','docs/evidence/r79-art/performance.json']),('capture-final',['node','scripts/capture-r79-art.js'])]
results=[]
for name,cmd in stages:
 print('START',name,flush=True)
 with (O/f'{name}.log').open('w',encoding='utf-8')as log:r=subprocess.run(cmd,cwd=R,stdout=log,stderr=subprocess.STDOUT)
 results.append(dict(stage=name,command=cmd,exitCode=r.returncode));(O/'validation-stages.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8')
 print('END',name,r.returncode,flush=True)
 if r.returncode:sys.exit(r.returncode)
