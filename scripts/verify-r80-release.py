"""Read-only final local release proof; scan filenames only, no secret directory."""
from pathlib import Path
from PIL import Image
import subprocess,json,hashlib,re,shutil
R=Path(__file__).resolve().parents[1];O=R/'docs/evidence/r80-art'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
scan=subprocess.run(['rg','-l','-i','--hidden','--no-ignore','-g','!.git/**','-g','!node_modules/**','-e',r'sk-proj-[A-Za-z0-9_-]{20}','-e',r'sk-[a-z0-9]{40}','-e',r'gh[pousr]_[A-Za-z0-9]{36}','-e',r'AKIA[A-Z0-9]{16}','-e',r'-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----','.'],cwd=R,capture_output=True,text=True,encoding='utf-8')
secret=dict(status='VERIFIED'if scan.returncode==1 else'BLOCKED',hits=len(scan.stdout.splitlines()),files=scan.stdout.splitlines(),exitCode=scan.returncode,scope='Repository only, including hidden local artifacts; excludes .git/node_modules; filenames only. No credentials directory read.')
(O/'secret-scan.json').write_text(json.dumps(secret,indent=2)+'\n',encoding='utf-8');assert scan.returncode==1
runtime=[R/'index.html',R/'sw.js',R/'manifest.webmanifest',*R.glob('templates/**/*.js'),*R.glob('templates/**/*.html'),*R.glob('templates/**/*.css')]
old=[p.relative_to(R).as_posix()for p in [*runtime,R/'README.md',R/'package.json',R/'package-lock.json']if re.search(r'(?<![\d.])0\.12\.0(?![\d.])|card-battle-r79-v1|card_sw_auto_reload_r79_v1',p.read_text(encoding='utf-8'))];assert not old,old
syntax=[]
for p in [*R.glob('templates/**/*.js'),*R.glob('scripts/*.js')]:
 result=subprocess.run(['node','-c',str(p)],capture_output=True);syntax.append(dict(path=p.relative_to(R).as_posix(),pass_=result.returncode==0))
assert all(x['pass_']for x in syntax)
screens=[]
for p in sorted((R/'docs/store/screenshots').glob('*.png')):
 with Image.open(p)as im:size=im.size
 assert size in[(1290,2796),(2064,2752)];assert sha(p)==sha(R/'docs/art/compare/r80/after'/p.name)
 screens.append(dict(path=p.relative_to(R).as_posix(),size=list(size),sha256=sha(p)))
assert len(screens)==16
stages=json.loads((O/'validation-stages.json').read_text(encoding='utf-8'));assert len(stages)==6 and all(x['exitCode']==0 for x in stages)
for p in O.glob('*final.log'):shutil.copy2(p,p.with_suffix('.txt'))
M=json.loads((R/'docs/art/ASSET_MANIFEST_R80.json').read_text(encoding='utf-8'))
assert json.loads((R/'package.json').read_text(encoding='utf-8'))['version']=='0.13.0'
receipt=dict(status='VERIFIED',version='0.13.0',baseCommit='609f215',branch=subprocess.check_output(['git','branch','--show-current'],cwd=R,text=True).strip(),syntax=syntax,screenshots=screens,validationStages=stages,runtimeHashes={p.relative_to(R).as_posix():sha(p)for p in runtime},secretScan=secret,oldRevisionHits=old,artBytes=dict(netRuntimeIncrease=M['runtime_bytes'],sourceArchive=M['source_bytes']),qualification='Local headless Chromium and concurrent-machine timing; not native device, signed binary, Apple acceptance or independent Muse rescore.')
receipt['logs']=[dict(path=p.relative_to(R).as_posix(),bytes=p.stat().st_size,sha256=sha(p))for p in O.glob('*final.txt')]
(O/'verification.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print('R80 release VERIFIED: version, syntax,16 original-size screenshots,zero secrets')
