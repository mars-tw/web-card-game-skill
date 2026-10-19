"""Local release receipt; never prints matching secret values."""
from pathlib import Path
import hashlib,json,re,subprocess
from PIL import Image
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r1';O.mkdir(parents=True,exist_ok=True)
version=json.loads((R/'package.json').read_text(encoding='utf-8'))['version'];assert version=='0.14.0'
runtime=[R/'index.html',R/'sw.js',R/'README.md',R/'package.json',R/'package-lock.json']+list((R/'templates').rglob('*.html'))+list((R/'templates').rglob('*.js'))
old=[p.relative_to(R).as_posix()for p in runtime if re.search(r'0\.13\.0|card-battle-r80-v1|card_sw_auto_reload_r80_v1',p.read_text(encoding='utf-8'))];assert not old,old
syntax=[]
for p in sorted(list((R/'templates').rglob('*.js'))+list((R/'scripts').glob('*.js'))):
    q=subprocess.run(['node','--check',str(p)],cwd=R,capture_output=True,text=True);assert q.returncode==0,q.stderr;syntax.append(p.relative_to(R).as_posix())
pat=re.compile(r'sk-proj-[A-Za-z0-9_-]{20}|sk-[a-z0-9]{40}');hits=[];scanned=0
for p in R.rglob('*'):
    if not p.is_file() or any(x in {'.git','node_modules'}for x in p.relative_to(R).parts) or p.suffix.lower() not in {'.js','.json','.html','.css','.md','.txt','.py','.yml','.yaml','.ps1','.webmanifest'}:continue
    scanned+=1
    raw=p.read_bytes();encoding='utf-16'if raw.startswith((b'\xff\xfe',b'\xfe\xff'))else'utf-8-sig'
    if pat.search(raw.decode(encoding,errors='ignore')):hits.append(p.relative_to(R).as_posix())
assert not hits,'Secret-pattern matches in file paths: '+repr(hits)
screens=[]
for name in ['study','forecast','moen']:
    for w,h in [(1290,2796),(2064,2752)]:
        p=R/f'docs/store/screenshots/content-r1-{name}-{w}x{h}.png';im=Image.open(p);assert im.format=='PNG' and im.size==(w,h)
        screens.append(dict(path=p.relative_to(R).as_posix(),width=w,height=h,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
manifest=json.loads((R/'docs/art/ASSET_MANIFEST_CONTENT_R1.json').read_text(encoding='utf-8'))
for item in manifest['files']:assert hashlib.sha256((R/item['path']).read_bytes()).hexdigest()==item['sha256']
hashed=runtime+[R/'templates/card-battle/content-r1.css',R/'assets/art/content-r1/tide-study.webp']
receipt=dict(status='VERIFIED',version=version,pwa='card-battle-content-r1-v1',syntaxFiles=len(syntax),secretScan=dict(files=scanned,hits=0,excluded=['.git','node_modules'],matchingValuesPrinted=False),oldRuntimeVersionHits=old,screenshots=screens,newOriginals=manifest['new_originals'],runtimeArtBytes=manifest['files'][1]['bytes'],runtimeHashes={p.relative_to(R).as_posix():hashlib.sha256(p.read_bytes()).hexdigest()for p in hashed},qualification='Headless local Chromium and local artifacts; no native-device or Apple acceptance claim.')
(O/'verification.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in receipt.items()if k not in {'screenshots','runtimeHashes'}},ensure_ascii=False))
