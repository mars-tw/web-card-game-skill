"""Local release receipts; never print matched secret values."""
from pathlib import Path
from PIL import Image
import hashlib,json,re,subprocess
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r2'
version=json.loads((R/'package.json').read_text(encoding='utf8'))['version'];assert version=='0.15.0'
runtime=[R/x for x in ['index.html','sw.js','README.md','package.json','package-lock.json']]+list((R/'templates').rglob('*.html'))+list((R/'templates').rglob('*.js'))+list((R/'templates').rglob('*.css'))
old=[p.relative_to(R).as_posix() for p in runtime if re.search(r'0\.14\.0|card-battle-content-r1-v1|card_sw_auto_reload_content_r1_v1',p.read_text(encoding='utf8'))];assert not old,old
syntax=[]
for p in sorted(list((R/'templates').rglob('*.js'))+list((R/'scripts').glob('*.js'))):
    q=subprocess.run(['node','--check',str(p)],capture_output=True,text=True,cwd=R);assert not q.returncode,q.stderr;syntax.append(p.relative_to(R).as_posix())
pat=re.compile(r'sk-proj-[A-Za-z0-9_-]{20}|sk-[a-z0-9]{40}|ghp_[A-Za-z0-9]{36}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----');hits=[];scanned=0
for p in R.rglob('*'):
    if not p.is_file() or any(x in {'.git','node_modules'} for x in p.relative_to(R).parts) or p.suffix.lower() not in {'.js','.json','.html','.css','.md','.txt','.py','.ps1','.yml','.yaml','.webmanifest'}:continue
    scanned+=1;raw=p.read_bytes();encoding='utf-16' if raw.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8-sig'
    if pat.search(raw.decode(encoding,errors='ignore')):hits.append(p.relative_to(R).as_posix())
assert not hits,'Secret-pattern matches in file paths: '+repr(hits)
manifest=json.loads((R/'docs/art/ASSET_MANIFEST_CONTENT_R2.json').read_text(encoding='utf8'))
assert manifest['tool']=='image_gen.imagegen' and manifest['new_originals']==1
for item in manifest['files']:assert hashlib.sha256((R/item['path']).read_bytes()).hexdigest()==item['sha256']
screens=[]
for p in sorted(O.glob('phone-*.png')):
    im=Image.open(p);assert im.size==(390,844),(p,im.size);screens.append(dict(path=p.relative_to(R).as_posix(),width=im.width,height=im.height,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
assert len(screens)>=35
for w,h in [(1290,2796),(2064,2752)]:
    p=R/f'docs/store/screenshots/content-r2-moen-{w}x{h}.png';im=Image.open(p);assert im.format=='PNG' and im.size==(w,h);screens.append(dict(path=p.relative_to(R).as_posix(),width=w,height=h,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
accept=json.loads((O/'acceptance.json').read_text(encoding='utf8'));assert accept['status']=='VERIFIED' and not accept['errors']
receipt=dict(status='VERIFIED',version=version,pwa='card-battle-content-r2-v1',syntaxFiles=len(syntax),secretScan=dict(files=scanned,hits=0,excluded=['.git','node_modules'],matchingValuesPrinted=False),oldRuntimeVersionHits=old,screenshots=screens,newOriginals=1,browserChecks=accept['checks'],sourceHashes={p.relative_to(R).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in runtime},qualification='Headless Chromium at actual CSS/DPR sizes; not a real device, user study or Apple review.')
(O/'verification.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({k:v for k,v in receipt.items() if k not in {'screenshots','sourceHashes'}},ensure_ascii=False))
