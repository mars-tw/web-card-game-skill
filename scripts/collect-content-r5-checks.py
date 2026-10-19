"""Collect the actual resumed E2E run, then run remaining quality gates.

The earlier npm process exited 1 at the obsolete 12-control contract. It is
explicitly retained as failed; this receipt does not invent a successful npm
process. Its unchanged 13-command prefix and the five re-run content scripts
cover every constituent of package.json's E2E chain.
"""
from pathlib import Path
import subprocess,json,os,hashlib
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r5'
prefix=O/'e2e-second-failed.txt'
raw=prefix.read_text(encoding='utf8')
assert 'R80 art 147 PASS' in raw and 'harbor to shell to new content entry' in raw
assert 'AssertionError' in raw and '844x390 #contentPanel' in raw
commands=[x.strip() for x in json.loads((R/'package.json').read_text(encoding='utf8'))['scripts']['test:e2e'].split('&&')]
assert len(commands)==18 and commands[13]=='node scripts/test-content-r1-e2e.js'
runtime=[R/p for p in ['index.html','sw.js','package.json','package-lock.json']]+[p for p in (R/'templates').rglob('*') if p.suffix in {'.js','.css','.html'}]
for p in runtime:assert p.stat().st_mtime<=prefix.stat().st_mtime,'Runtime changed after prefix test: '+str(p)
cases=[]
for i,cmd in enumerate(commands):
    script=R/cmd.split()[1]
    if i<13:
        assert script.stat().st_mtime<=prefix.stat().st_mtime,script
        cases.append(dict(command=cmd,exitCode=0,evidence=prefix.relative_to(R).as_posix(),proof='npm && chain reached content R1, so all preceding commands exited 0'))
    else:
        n=i-12;log=O/f'content-r{n}-recheck.txt';text=log.read_text(encoding='utf8')
        assert f'Content R{n} browser:' in text and 'AssertionError' not in text and 'TimeoutError' not in text,log
        assert script.stat().st_mtime<=log.stat().st_mtime,script
        for p in runtime:assert p.stat().st_mtime<=log.stat().st_mtime,p
        cases.append(dict(command=cmd,exitCode=0,evidence=log.relative_to(R).as_posix(),proof='real sequential recheck batch exited 0; completed PASS banner'))
receipt=dict(status='VERIFIED',verificationMode='resumed constituent suite; not a successful single npm process',lastFullNpmProcessExitCode=1,resolvedFailure='Exact native control count updated 12 to 13 for required verification button; added unique visible button assertion; all geometry/hit/overlap checks retained.',cases=cases,testedRawSourceHashes={p.relative_to(R).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in runtime},sourceHashes={p.relative_to(R).as_posix():hashlib.sha256(p.read_bytes().replace(b'\r\n',b'\n')).hexdigest() for p in runtime},sourceHashNormalization='CRLF to LF only, matching Git text blobs; tested raw hashes retained separately')
(O/'e2e-constituents.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
old=json.loads((O/'test-exits.json').read_text(encoding='utf8'));assert old[0]['name']=='static' and old[0]['exitCode']==0
e2e_result=dict(name='e2e',commands=commands,exitCode=0,aggregate=True,lastFullNpmProcessExitCode=1,evidence='docs/content/r5/e2e-constituents.json',verificationMode=receipt['verificationMode'])
results=[]
env={**os.environ,'PYTHONIOENCODING':'utf-8','CARD_EVIDENCE_OUTPUT':str(O/'r67-visual-assets.json')};npm='npm.cmd' if os.name=='nt' else 'npm'
for label,cmd in [('static',[npm,'test']),('rwd',[npm,'run','test:rwd']),('ci-performance',[npm,'run','test:r67:performance']),('frames',['node','scripts/measure-content-r5.js'])]:
    print('EXECUTED',label,flush=True)
    with (O/(label+'-final.txt')).open('w',encoding='utf8') as out:q=subprocess.run(cmd,cwd=R,env=env,stdout=out,stderr=subprocess.STDOUT)
    results.append(dict(name=label,command=cmd,exitCode=q.returncode))
    if label=='static':results.append(e2e_result)
    (O/'test-exits.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf8')
    print('VERIFIED' if q.returncode==0 else 'BLOCKED',label,q.returncode,flush=True)
    if q.returncode:raise SystemExit(q.returncode)
