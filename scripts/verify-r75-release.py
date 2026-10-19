"""Local release receipt; scans only this repository, never credential folders."""
from pathlib import Path
from PIL import Image
import subprocess,json,hashlib,re
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/evidence/r75-art'
BASE_COMMIT='676d00efbae738ddc5733c8f0f8f702d202e7692'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
scan=subprocess.run(['rg','-l','-i','--hidden','-g','!.git/**','-g','!node_modules/**','-e',r'sk-proj-[A-Za-z0-9_-]{20}','-e',r'sk-[a-z0-9]{40}','.'],cwd=ROOT,capture_output=True,text=True,encoding='utf-8')
secret={'status':'VERIFIED' if scan.returncode==1 else 'BLOCKED','hits':len(scan.stdout.splitlines()),'files':scan.stdout.splitlines(),'exitCode':scan.returncode,'scope':'current repo excluding .git/node_modules; filenames only; no secret values'}
(OUT/'secret-scan.json').write_text(json.dumps(secret,indent=2)+'\n',encoding='utf-8')
assert scan.returncode==1,'secret scan must finish with zero hits'
runtime=[ROOT/'index.html',ROOT/'manifest.webmanifest',ROOT/'sw.js',*ROOT.glob('templates/**/*.js'),*ROOT.glob('templates/**/*.html'),*ROOT.glob('templates/**/*.css')]
old=[]
for p in [*runtime,ROOT/'README.md',ROOT/'package.json',ROOT/'package-lock.json']:
 if re.search(r'(?<![\d.])0\.7\.0(?![\d.])|card-battle-r74-v1|card_sw_auto_reload_r74_v1|\?\?\?',p.read_text(encoding='utf-8')):old.append(p.relative_to(ROOT).as_posix())
assert not old,'old release identifiers or damaged text: '+repr(old)
syntax=[]
for p in [*ROOT.glob('templates/**/*.js'),*ROOT.glob('scripts/*.js')]:
 result=subprocess.run(['node','-c',str(p)],capture_output=True);syntax.append({'path':p.relative_to(ROOT).as_posix(),'pass':result.returncode==0})
assert all(x['pass'] for x in syntax),'JS syntax failure'
screens=[]
for p in sorted((ROOT/'docs/store/screenshots').glob('*.png')):
 with Image.open(p) as im:size=im.size
 assert size in [(1290,2796),(2064,2752)],str(p)
 screens.append({'path':p.relative_to(ROOT).as_posix(),'size':list(size),'sha256':digest(p),'bytes':p.stat().st_size})
assert len(screens)==10,'five actual screens in two required sizes'
manifest=json.loads((ROOT/'docs/art/ASSET_MANIFEST.json').read_text(encoding='utf-8'))
old_bytes=0
for name in ['assets/cards/footman.png','assets/cards/archer.png','assets/icons/icon-192.png','assets/icons/icon-512.png']:
 old_bytes+=int(subprocess.check_output(['git','cat-file','-s',BASE_COMMIT+':'+name],cwd=ROOT,text=True))
receipt={'status':'VERIFIED','version':json.loads((ROOT/'package.json').read_text(encoding='utf-8'))['version'],'baseCommit':BASE_COMMIT,
 'runtimeHashes':{p.relative_to(ROOT).as_posix():digest(p) for p in runtime},'screenshots':screens,'syntax':syntax,'oldRevisionHits':old,'secretScan':secret,
 'artBytes':{'newOrReplacedRuntime':manifest['runtime_bytes'],'replacedOldRuntime':old_bytes,'netRuntimeArtIncrease':manifest['runtime_bytes']-old_bytes,'sourceArchive':manifest['source_bytes']},
 'performanceQualification':'Concurrent-machine headless evidence only; no clean-machine/physical phone release verification.',
 'scope':'local main branch only; no push/deploy/store/account messages; incoming evidence restoration recorded separately'}
(OUT/'verification.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f"R75 verification: {len(runtime)} runtime files, {len(syntax)} JS, 10 screenshots, zero secret/old version hits; runtime art delta {receipt['artBytes']['netRuntimeArtIncrease']} bytes")
