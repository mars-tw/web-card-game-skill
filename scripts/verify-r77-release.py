"""Local-only release audit; never reads credential directories."""
from pathlib import Path
from PIL import Image
import subprocess,json,hashlib,re
R=Path(__file__).resolve().parents[1];O=R/'docs/evidence/r77-art'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
scan=subprocess.run(['rg','-l','-i','--hidden','-g','!.git/**','-g','!node_modules/**','-e',r'sk-proj-[A-Za-z0-9_-]{20}','-e',r'sk-[a-z0-9]{40}','.'],cwd=R,capture_output=True,text=True,encoding='utf-8')
secret=dict(status='VERIFIED'if scan.returncode==1 else'BLOCKED',hits=len(scan.stdout.splitlines()),files=scan.stdout.splitlines(),exitCode=scan.returncode,scope='This repository only, excluding .git/node_modules, filenames only; no credential folders read.')
(O/'secret-scan.json').write_text(json.dumps(secret,indent=2)+'\n',encoding='utf-8');assert scan.returncode==1
runtime=[R/'index.html',R/'manifest.webmanifest',R/'sw.js',*R.glob('templates/**/*.js'),*R.glob('templates/**/*.html'),*R.glob('templates/**/*.css')]
old=[p.relative_to(R).as_posix()for p in [*runtime,R/'README.md',R/'package.json',R/'package-lock.json']if re.search(r'(?<![\d.])0\.9\.0(?![\d.])|card-battle-r76-v1|card_sw_auto_reload_r76_v1|\?\?\?',p.read_text(encoding='utf-8'))];assert not old,old
syntax=[]
for p in [*R.glob('templates/**/*.js'),*R.glob('scripts/*.js')]:
 a=subprocess.run(['node','-c',str(p)],capture_output=True);syntax.append(dict(path=p.relative_to(R).as_posix(),pass_=a.returncode==0))
assert all(x['pass_']for x in syntax)
screens=[]
for p in sorted((R/'docs/store/screenshots').glob('*.png')):
 with Image.open(p)as im:size=im.size
 assert size in[(1290,2796),(2064,2752)]
 screens.append(dict(path=p.relative_to(R).as_posix(),size=list(size),sha256=sha(p)))
assert len(screens)==10
m=json.loads((R/'docs/art/ASSET_MANIFEST_R77.json').read_text(encoding='utf-8'))
receipt=dict(status='VERIFIED',version=json.loads((R/'package.json').read_text(encoding='utf-8'))['version'],baseCommit='9e216fd736668b828151e81ff346db71f8040296',syntax=syntax,screenshots=screens,runtimeHashes={p.relative_to(R).as_posix():sha(p)for p in runtime},oldRevisionHits=old,secretScan=secret,artBytes=dict(netAssetsIncrease=m['runtime_bytes'],sourceArchive=m['source_bytes']),qualification='Local/headless browser verification and concurrent-machine timings. Not a native device/signed binary/store/independent Muse rescore.')
receipt['logs']=[dict(path=p.relative_to(R).as_posix(),bytes=p.stat().st_size,sha256=sha(p))for p in O.glob('*.log')]
(O/'verification.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print('R77 release: version, syntax, ten native-size screenshots and zero secrets VERIFIED')
