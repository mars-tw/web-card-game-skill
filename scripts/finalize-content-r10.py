"""Copies original screenshots, records hashes, scans secrets without printing matches."""
from pathlib import Path
from PIL import Image
import json,hashlib,re,shutil,subprocess
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r10';E=R/'docs/evidence/content-r10';E.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def source_sha(p):
 data=p.read_bytes()
 if p.suffix in ['.js','.css','.html','.json','.yml','.yaml','.py','.md','.webmanifest']:data=data.replace(b'\r\n',b'\n')
 return hashlib.sha256(data).hexdigest()
selection=[('puzzle-spell-playing','手牌回到英雄列下方，無截斷殘字'),('puzzle-shield-playing','聖盾正字、滿潮、盾與費用分開'),('puzzle-shelter-playing','不計血量、長弓射線，R8回歸'),('puzzle-fallen-playing','陣亡補潮首屏，未開提示'),('puzzle-taunt-playing','嘲諷目標差異首屏'),('puzzle-cross-playing','雙線交換首屏，未開提示'),('forecast-preview','按住預覽，同高面板，R8回歸'),('forecast-cancelled','真正觸控移出取消，原潮向與額度不變'),('forecast-applied','滿血不回復的原因、已套用與撤回，頂欄同回合'),('forecast-flood-impact','面板已關，反轉回合實際命中；英雄列、底欄、卡名攻血及兩收據，R8回歸'),('forecast-ebb-shields','兩友軍聖盾數可數、費用可讀，R8回歸'),('moen-preparation','完整首屏句子、英雄列與整備姿勢，R8回歸'),('moen-heal-impact','真實治療命中、獨立施法姿勢、騎士聖盾'),('moen-break-impact','真正破盾命中、騎士獨立姿勢、仍4血'),('moen-completed','茉恩敗退與角色收尾')]
review=O/'review-set';review.mkdir(parents=True,exist_ok=True);index=[]
for i,(name,reason) in enumerate(selection,1):
 src=O/('phone-'+name+'.png');assert Image.open(src).size==(390,844),src
 dest=review/(f'{i:02d}-'+name+'.png');shutil.copyfile(src,dest);assert sha(src)==sha(dest)
 index.append(dict(path=dest.relative_to(R).as_posix(),source=src.relative_to(R).as_posix(),size=[390,844],sha256=sha(dest),proves=reason))
assert len(list(review.glob('*.png')))==15
(O/'review-set-index.json').write_text(json.dumps(dict(status='VERIFIED',selection='6 puzzles / 5 forecast / 4 Moen; every image original viewport bytes',images=index),ensure_ascii=False,indent=2),encoding='utf8')
inventory=[]
for file in sorted(O.glob('*.png')):
 im=Image.open(file);inventory.append(dict(path=file.relative_to(R).as_posix(),size=list(im.size),sha256=sha(file)))
(O/'screenshot-inventory.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2),encoding='utf8')
store=[]
for file in sorted((R/'docs/store/screenshots').glob('content-r10-*.png')):
 size=Image.open(file).size;assert size in [(1290,2796),(2064,2752)];store.append(dict(path=file.relative_to(R).as_posix(),size=list(size),sha256=sha(file)))
assert len(store)>=2
(O/'store-screenshots.json').write_text(json.dumps(store,indent=2),encoding='utf8')
for before,after,name in [('docs/content/r9/phone-puzzle-spell-playing.png','phone-puzzle-spell-playing.png','hand'),('docs/content/r9/phone-forecast-reversed-flood-impact.png','phone-forecast-flood-impact.png','impact'),('docs/content/r9/phone-moen-r9-before.png','phone-moen-preparation.png','moen')]:
 shutil.copyfile(R/before,E/(name+'-before-r9.png'));shutil.copyfile(O/after,E/(name+'-after-r10.png'))
for w,h in [(390,844),(844,390),(1032,1376)]:
 src=O/'phone-moen-preparation.png' if w==390 else O/f'layout-moen-{w}x{h}-1.png';shutil.copyfile(src,E/f'moen-{w}x{h}.png')
hits=[];pattern=re.compile(rb'sk-proj-[A-Za-z0-9_-]{20}|sk-[a-z0-9]{40}');scanned=0
for file in R.rglob('*'):
 if not file.is_file() or any(x in file.parts for x in ['.git','node_modules','.audit-tmp']) or file.suffix.lower() not in ['.js','.ts','.json','.html','.css','.md','.txt','.log','.py','.yml','.yaml','.webmanifest']:continue
 try:s=file.read_bytes()
 except OSError:continue
 scanned+=1
 if pattern.search(s.replace(b'\x00',b'')):hits.append(file.relative_to(R).as_posix())
(O/'secret-scan.json').write_text(json.dumps(dict(status='VERIFIED' if not hits else 'BLOCKED',matches=len(hits),paths=hits,scannedFiles=scanned,method='ASCII key-pattern byte scan, including UTF8/UTF16/ANSI text; excludes .git/node_modules and local-only .audit-tmp; no .secrets access, matching contents never printed'),indent=2),encoding='utf8');assert not hits,hits
sources={f:source_sha(R/f) for f in subprocess.check_output(['git','ls-files'],cwd=R,text=True).splitlines() if f.startswith('templates/') or f in ['sw.js','package.json','package-lock.json']}
for f in ['templates/card-battle/content-r10.js','templates/card-battle/content-r10.css','scripts/test-content-r10.js','scripts/test-content-r10-e2e.js','scripts/r10-evidence-guard.js','scripts/test-battle-e2e.js','.github/workflows/ci.yml','docs/art/ASSET_MANIFEST_CONTENT_R10.json']:sources[f]=source_sha(R/f)
(O/'source-hashes.json').write_text(json.dumps(sources,indent=2),encoding='utf8')
(O/'source-hash-method.json').write_text(json.dumps(dict(algorithm='SHA-256 of Git-normalized LF text, binary files unchanged',repositoryContract='.gitattributes text=auto eol=lf',images='Screenshot and art hashes always use original raw bytes'),indent=2),encoding='utf8')
print('VERIFIED',len(inventory),'raw screenshots;',len(index),'review screenshots;',len(store),'store; secret scan zero')
