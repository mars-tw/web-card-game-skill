"""Run the exact public CI suites with private review media and Git absent."""
from pathlib import Path
import subprocess,os,json,re,shutil,time
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r13/checks';O.mkdir(parents=True,exist_ok=True)
D=R/'.audit-tmp/r13'/('clean-'+str(time.time_ns()));D.mkdir(parents=True)
tracked=subprocess.check_output(['git','ls-files','-z'],cwd=R).decode('utf-8').split('\0')
extra=['templates/card-battle/content-r13.css','scripts/test-content-r13.js','scripts/test-content-r13-e2e.js','scripts/r13-evidence-guard.js']+[p.relative_to(R).as_posix()for p in (R/'assets/art/content-r13').glob('*')]
extra += [p.relative_to(R).as_posix()for p in (R/'scripts').glob('*r13*')if p.is_file()]
extra += [p.relative_to(R).as_posix()for p in (R/'scripts/r13-python-guard').glob('*.py')]
extra += [p.relative_to(R).as_posix()for p in (R/'docs/art').glob('*CONTENT_R13*')]
extra += [p.relative_to(R).as_posix()for p in (R/'docs/art/source/content-r13').glob('*.png')]
program='\n'.join(p.read_text(encoding='utf-8')for p in [R/'sw.js',*R.glob('templates/**/*.js'),*R.glob('templates/**/*.css'),*R.glob('templates/**/*.html'),R/'index.html'])
media={'.png','.webp','.jpg','.jpeg','.gif','.svg','.avif','.bmp','.tif','.tiff','.ico','.pdf','.mp4','.m4v','.mov','.mkv','.webm','.ogg','.mp3','.wav','.flac','.aac','.woff','.woff2','.ttf','.otf'}
kept=[];omitted=[]
for name in sorted(set(tracked+extra)):
 if not name:continue
 p=R/name
 if not p.is_file():continue
 if name.startswith(('docs/evidence/','docs/content/')):
  if p.suffix.lower()in media:omitted.append(name)
  continue
 if p.suffix.lower()in media:
  allowed=name.startswith(('docs/art/masters/','docs/art/source/'))or name in program
  if not allowed:omitted.append(name);continue
  kept.append(name)
 target=D/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,target)
assert not (D/'.git').exists()
assert not (D/'docs/evidence').exists()and not (D/'docs/content').exists()
assert not any(p.suffix.lower()in media for p in (D/'docs/content').rglob('*'))
env=dict(os.environ,PYTHONIOENCODING='utf-8',GIT_CEILING_DIRECTORIES=str(D.parent));env.pop('NODE_OPTIONS',None);env.pop('PYTHONPATH',None)
git_probe=subprocess.run(['git','rev-parse','--show-toplevel'],cwd=D,env=env,capture_output=True,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt'else 0)
assert git_probe.returncode!=0,'clean copy must not discover the parent repository'
results=[]
prefix=subprocess.check_output(['cmd','/d','/c','npm prefix']if os.name=='nt'else['npm','prefix'],cwd=D,env=env).decode().strip()
assert Path(prefix).resolve()==D.resolve(),'npm install target must stay in the isolated copy'
for name,command in [('install','npm ci'),('logic','npm test'),('e2e','npm run test:ci:e2e'),('rwd','npm run test:rwd')]:
 start=time.time();print('EXECUTED clean '+command,flush=True)
 with (O/('clean-ci-'+name+'.log')).open('wb')as f:
  run=subprocess.run(['cmd','/d','/c',command]if os.name=='nt'else['sh','-c',command],cwd=D,env=env,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt'else 0)
 results.append(dict(command=command,exit_code=run.returncode,seconds=round(time.time()-start,2)))
 (O/'clean-ci.json').write_text(json.dumps(dict(status='VERIFIED'if all(x['exit_code']==0 for x in results)and len(results)==5 else 'BLOCKED',copy=str(D),git_present=False,parent_git_discovery=False,evidence_inputs_absent=True,kept_media=kept,omitted_media=omitted,results=results),indent=2),encoding='utf-8')
 print(results[-1],flush=True)
 if run.returncode:raise SystemExit(run.returncode)
start=time.time()
syntax=[*D.glob('templates/card-battle/*.js'),*D.glob('templates/card-pack/*.js'),*D.glob('scripts/*.js')]
for p in syntax:subprocess.run(['node','-c',str(p)],cwd=D,env=env,check=True,capture_output=True,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt'else 0)
results.append(dict(command='CI node -c for templates/card-battle/*.js templates/card-pack/*.js scripts/*.js',exit_code=0,files=len(syntax),seconds=round(time.time()-start,2)))
(O/'clean-ci.json').write_text(json.dumps(dict(status='VERIFIED',copy=str(D),git_present=False,parent_git_discovery=False,evidence_inputs_absent=True,kept_media=kept,omitted_media=omitted,results=results),indent=2),encoding='utf-8')
print('VERIFIED clean CI including syntax',flush=True)
