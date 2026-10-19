"""Verify exact mobile PNGs, create 15 byte-identical review copies, scan project secrets."""
from pathlib import Path
from PIL import Image
import hashlib,json,shutil,re,subprocess,os
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r8';V=O/'review-set';V.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
selection=[
('01-puzzle-fallen','phone-puzzle-fallen-playing.png'),('02-puzzle-spell','phone-puzzle-spell-playing.png'),('03-exchange-preview','phone-exchange-preview.png'),('04-exchange-cancelled','phone-exchange-cancelled.png'),('05-exchange-confirmed','phone-exchange-confirmed.png'),
('06-forecast-held','phone-forecast-held.png'),('07-forecast-applied-ebb','phone-forecast-flood-to-ebb-applied.png'),('08-forecast-flood-result','phone-forecast-flood-after.png'),('09-forecast-ebb-result','phone-forecast-ebb-after.png'),('10-forecast-cast-reason','phone-forecast-fourth.png'),
('11-moen-before','phone-moen-preparing.png'),('12-moen-impact','phone-moen-impact.png'),('13-moen-shield-broken','phone-moen-shield-after.png'),('14-moen-return-before','phone-moen-return-heal-before.png'),('15-moen-return-impact','phone-moen-return-heal-impact.png')]
index=[]
for name,src in selection:
 p=O/src;assert Image.open(p).size==(390,844),src
 dst=V/(name+'.png');shutil.copy2(p,dst);assert sha(p)==sha(dst)
 index.append({'path':dst.relative_to(R).as_posix(),'source':p.relative_to(R).as_posix(),'sha256':sha(p),'size':[390,844]})
assert len(list(V.glob('*.png')))==15
E=R/'docs/evidence/content-r8';pairs=[]
for name,file in [('exchange','phone-exchange-preview.png'),('forecast','phone-forecast-flood-to-ebb-applied.png'),('moen','phone-moen-impact.png')]:
 for phase,source in [('before',R/'docs/content/r7'/file),('after',O/file)]:
  dest=E/phase/(name+'.png');dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,dest)
  pairs.append({'phase':phase,'path':dest.relative_to(R).as_posix(),'source':source.relative_to(R).as_posix(),'sha256':sha(source),'historical':phase=='before'})
(E/'provenance.json').write_text(json.dumps(pairs,indent=2),encoding='utf8')
for scene in ['moen','forecast']:
 for size in [(1290,2796),(2064,2752)]:
  p=R/f'docs/store/screenshots/content-r8-{scene}-{size[0]}x{size[1]}.png';assert Image.open(p).size==size
(O/'review-set-index.json').write_text(json.dumps({'status':'VERIFIED','images':index,'distribution':[5,5,5],'rawScreenshots':len(list(O.glob('phone-*.png')))},ensure_ascii=False,indent=2),encoding='utf8')
patterns=[re.compile(rb'sk-proj-[A-Za-z0-9_-]{20,}'),re.compile(rb'sk-[a-z0-9]{40}'),re.compile(rb'AKIA[0-9A-Z]{16}'),re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')]
hits=[];scanned=0
for base,dirs,files in os.walk(R):
 dirs[:]=[d for d in dirs if d not in {'.git','node_modules','.audit-tmp'}]
 for name in files:
  p=Path(base)/name
  if p.suffix.lower() not in {'.js','.json','.html','.css','.md','.py','.txt','.log','.yml','.yaml','.webmanifest','.ps1'}:continue
  data=p.read_bytes();scanned+=1
  if any(rx.search(data) for rx in patterns):hits.append(p.relative_to(R).as_posix())
(O/'secret-scan.json').write_text(json.dumps({'status':'VERIFIED' if not hits else 'BLOCKED','files':scanned,'hits':hits,'scope':'Only project files; excludes .git, node_modules, .audit-tmp; no external secret directories accessed.'},indent=2),encoding='utf8');assert not hits,hits
for p in O.glob('phone-*.png'):assert Image.open(p).size==(390,844),p.name
latest={x['name']:x for x in json.loads((O/'checks/exits.json').read_text(encoding='utf8'))}
required={'r8','r8-effects','landscape','puzzle-readability','forecast-effects','timing','unit','legacy-e2e','rwd','r6','r6-effects','r7','r8-offline','frames'}
assert required<=set(latest) and all(latest[k]['exit']==0 for k in required),'Required final test gates are not all green'
sources=['package.json','package-lock.json','sw.js','templates/card-battle/battle.js','templates/card-battle/content-r6.js','templates/card-battle/content-r8.css','templates/card-battle/tide-puzzles.js','templates/card-battle/index.html','scripts/test-content-r8.js','scripts/test-content-r8-e2e.js','scripts/test-content-r8-offline.js','scripts/capture-content-r8-effects.js','scripts/capture-content-r8-landscape.js','scripts/capture-content-r8-puzzles.js','scripts/capture-content-r8-forecast.js','scripts/test-content-r8-timing.js','scripts/test-content-r2-e2e.js','scripts/test-content-r3-e2e.js','scripts/test-content-r4-e2e.js','scripts/test-content-r7-e2e.js']
(O/'release-gates.json').write_text(json.dumps({'status':'VERIFIED','version':'0.21.0','cacheVersion':'card-battle-content-r8-v1','latestTests':latest,'sourceHashes':{p:sha(R/p) for p in sources},'reviewIndexSha256':sha(O/'review-set-index.json'),'secretMatches':0},indent=2),encoding='utf8')
print('VERIFIED: 15 raw review copies, four native store images, secret matches 0, fourteen final test gates')
