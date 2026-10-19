"""Repository-only release receipt. Never reads credential directories."""
from pathlib import Path
from PIL import Image
import subprocess,json,hashlib,re,sys
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/evidence/r76-art'
BASE_COMMIT='a3c0a014bf8c4bd7cab513b8eaa8998f915421c9'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
scan=subprocess.run(['rg','-l','-i','--hidden','-g','!.git/**','-g','!node_modules/**','-e',r'sk-proj-[A-Za-z0-9_-]{20}','-e',r'sk-[a-z0-9]{40}','.'],cwd=ROOT,capture_output=True,text=True,encoding='utf-8')
secret=dict(status='VERIFIED' if scan.returncode==1 else 'BLOCKED',hits=len(scan.stdout.splitlines()),files=scan.stdout.splitlines(),exitCode=scan.returncode,scope='Only this repo excluding .git/node_modules; filenames only; never credential directories')
evidence_logs=sorted(OUT.glob('*.log'))
log_scan=subprocess.run(['rg','-l','-i','-e',r'sk-proj-[A-Za-z0-9_-]{20}','-e',r'sk-[a-z0-9]{40}','--',*[str(p) for p in evidence_logs]],cwd=ROOT,capture_output=True,text=True,encoding='utf-8')
secret.update(evidenceLogsChecked=len(evidence_logs),evidenceLogScanExitCode=log_scan.returncode)
assert log_scan.returncode==1,'evidence log secret scan must return zero hits'
(OUT/'secret-scan.json').write_text(json.dumps(secret,indent=2)+'\n',encoding='utf-8');assert scan.returncode==1,'secret scan did not return zero hits'
runtime=[ROOT/'index.html',ROOT/'manifest.webmanifest',ROOT/'sw.js',*ROOT.glob('templates/**/*.js'),*ROOT.glob('templates/**/*.html'),*ROOT.glob('templates/**/*.css')]
old=[p.relative_to(ROOT).as_posix() for p in [*runtime,ROOT/'README.md',ROOT/'package.json',ROOT/'package-lock.json'] if re.search(r'(?<![\d.])0\.8\.0(?![\d.])|card-battle-r75-v1|card_sw_auto_reload_r75_v1|\?\?\?',p.read_text(encoding='utf-8'))];assert not old,old
syntax=[]
for p in [*ROOT.glob('templates/**/*.js'),*ROOT.glob('scripts/*.js')]:
 result=subprocess.run(['node','-c',str(p)],capture_output=True);syntax.append(dict(path=p.relative_to(ROOT).as_posix(),pass_=result.returncode==0))
assert all(v['pass_'] for v in syntax)
screens=[]
for p in sorted((ROOT/'docs/store/screenshots').glob('*.png')):
 with Image.open(p) as im:size=im.size
 assert size in [(1290,2796),(2064,2752)],str(p)
 screens.append(dict(path=p.relative_to(ROOT).as_posix(),size=list(size),sha256=sha(p)))
assert len(screens)==10
manifest=json.loads((ROOT/'docs/art/ASSET_MANIFEST_R76.json').read_text(encoding='utf-8'))
replaced=['assets/cards/'+n+'.png' for n in ['emberpup','wolf','sparkSquire','alleySkirmisher','frontScout','firebolt']]+['assets/icons/icon-192.png','assets/icons/icon-512.png']
old_bytes=sum(int(subprocess.check_output(['git','cat-file','-s',BASE_COMMIT+':'+p],cwd=ROOT,text=True)) for p in replaced)
tree=subprocess.check_output(['git','ls-tree','-r','-l',BASE_COMMIT,'assets'],cwd=ROOT,text=True,encoding='utf-8')
assets_before=sum(int(x) for x in re.findall(r'^\d+ blob [a-f0-9]+\s+(\d+)\t',tree,re.M));assets_after=sum(p.stat().st_size for p in (ROOT/'assets').rglob('*') if p.is_file())
receipt=dict(status='VERIFIED',version=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))['version'],baseCommit=BASE_COMMIT,runtimeHashes={p.relative_to(ROOT).as_posix():sha(p) for p in runtime},syntax=syntax,screenshots=screens,oldRevisionHits=old,secretScan=secret,artBytes=dict(newOrReplacedRuntime=manifest['runtime_bytes'],replacedOldRuntime=old_bytes,netRuntimeArtIncrease=manifest['runtime_bytes']-old_bytes,sourceArchive=manifest['source_bytes']),qualification='Headless browser captures and concurrent-machine timing. No physical device, clean-machine release audit, signed binary, store upload, or independent Muse rescore.')
receipt['evidenceLogs']=[dict(path=p.relative_to(ROOT).as_posix(),bytes=p.stat().st_size,sha256=sha(p)) for p in evidence_logs]
receipt['artBytes'].update(allAssetsDirectoryBefore=assets_before,allAssetsDirectoryAfter=assets_after,allAssetsDirectoryNetIncrease=assets_after-assets_before)
(OUT/'verification.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print('R76 release: syntax, version, screenshots, zero secrets VERIFIED; art delta',manifest['runtime_bytes']-old_bytes,'bytes')
