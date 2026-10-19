"""Verify release bytes, original screenshot sizes and zero secret-pattern hits."""
from pathlib import Path
from PIL import Image
import hashlib,json,re,subprocess
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r3'
version=json.loads((R/'package.json').read_text(encoding='utf8'))['version'];assert version=='0.16.0'
runtime=[R/p for p in ['index.html','sw.js','README.md','package.json','package-lock.json']]+[p for p in (R/'templates').rglob('*') if p.suffix in {'.js','.css','.html'}]
assert not [str(p.relative_to(R)) for p in runtime if re.search(r'0\.15\.0|card-battle-content-r2-v1|card_sw_auto_reload_content_r2_v1',p.read_text(encoding='utf8'))]
syntax=[]
for p in sorted([p for p in (R/'templates').rglob('*.js')]+list((R/'scripts').glob('*.js'))):
    q=subprocess.run(['node','--check',str(p)],cwd=R,capture_output=True,text=True);assert q.returncode==0,q.stderr;syntax.append(p.relative_to(R).as_posix())
pattern=re.compile(r'sk-proj-[A-Za-z0-9_-]{20}|sk-[a-z0-9]{40}|ghp_[A-Za-z0-9]{36}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')
hits=[];count=0
for p in R.rglob('*'):
    if not p.is_file() or any(x in {'.git','node_modules'} for x in p.relative_to(R).parts) or p.suffix.lower() not in {'.js','.json','.html','.css','.md','.txt','.py','.ps1','.yml','.yaml','.webmanifest'}:continue
    count+=1;raw=p.read_bytes();encoding='utf-16' if raw.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8-sig'
    if pattern.search(raw.decode(encoding,errors='ignore')):hits.append(p.relative_to(R).as_posix())
assert not hits,'Secret-pattern hits in file paths: '+repr(hits)
manifest=json.loads((R/'docs/art/ASSET_MANIFEST_CONTENT_R3.json').read_text(encoding='utf8'))
for item in manifest['files']:assert hashlib.sha256((R/item['path']).read_bytes()).hexdigest()==item['sha256']
screens=[]
for p in sorted(O.glob('phone-*.png')):
    im=Image.open(p);assert im.size==(390,844),(p,im.size);screens.append(dict(path=p.relative_to(R).as_posix(),size=list(im.size),sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
for d in ['fallen','shield','shelter','taunt','spell','cross']:
    for state in ['playing','failed','retry','completed']:assert (O/f'phone-puzzle-{d}-{state}.png').exists()
for w,h in [(1290,2796),(2064,2752)]:
    p=R/f'docs/store/screenshots/content-r3-moen-{w}x{h}.png';im=Image.open(p);assert im.size==(w,h);screens.append(dict(path=p.relative_to(R).as_posix(),size=list(im.size),sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
accept=json.loads((O/'acceptance.json').read_text(encoding='utf8'));assert accept['status']=='VERIFIED' and not accept['errors']
tests=json.loads((O/'test-exits.json').read_text(encoding='utf8'));assert len(tests)==5 and all(x['exitCode']==0 for x in tests)
final=json.loads((O/'final-validation.json').read_text(encoding='utf8'));assert final['staticExit']==0 and final['contentExit']==0
preserve=json.loads((O/'preservation.json').read_text(encoding='utf8'));assert preserve['status']=='VERIFIED'
for item in json.loads((R/'.audit-tmp/content-r3-preserve/inventory.json').read_text(encoding='utf8')):assert hashlib.sha256((R/item['path']).read_bytes()).hexdigest()==item['sha256'],item['path']
receipt=dict(status='VERIFIED',version=version,syntaxFiles=len(syntax),secretScan=dict(files=count,hits=0,excluded=['.git','node_modules'],matchingValuesPrinted=False),oldRuntimeVersionHits=0,browserChecks=accept['checks'],screenshots=screens,newArtOriginals=1,runtimeArtCrops=2,reviewSha256=hashlib.sha256((R/'docs/content/CONTENT_REVIEW_R2_MUSE.md').read_bytes()).hexdigest(),sourceHashes={p.relative_to(R).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in runtime},qualification='Actual headless Chromium original viewport captures. No real-device, human-playtest or independent Muse rescore claim.')
(O/'verification.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({k:v for k,v in receipt.items() if k not in {'sourceHashes','screenshots'}},ensure_ascii=False))
