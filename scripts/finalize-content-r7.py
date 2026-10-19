"""Copy exact PNG bytes into the bounded Muse set and verify local deliverables."""
from pathlib import Path
from PIL import Image
import json,hashlib,shutil,re,subprocess,sys
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r7';V=O/'review-set';V.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if (O/'review-set-index.json').exists():
    previous=json.loads((O/'review-set-index.json').read_text(encoding='utf8'))
    for item in previous['images']:
        p=R/item['path'];assert p.resolve().parent==V.resolve() and sha(p)==item['sha256'],'Existing review copy changed: '+item['path']
if '--reselect' in sys.argv:
    # Only remove this run's own byte-verified selection, never incoming files.
    previous=json.loads((O/'review-set-index.json').read_text(encoding='utf8'))
    for item in previous['images']:
        p=R/item['path'];assert p.resolve().parent==V.resolve() and sha(p)==item['sha256'];p.unlink()
selection=[
('01-puzzle-shelter','phone-puzzle-shelter-playing.png'),
('02-puzzle-taunt','phone-puzzle-taunt-playing.png'),
('03-cross-exchange','phone-exchange-preview.png'),
('04-cross-cancelled','phone-exchange-cancelled.png'),
('05-cross-confirmed','phone-exchange-confirmed.png'),
('06-forecast-held','phone-forecast-held.png'),
('07-forecast-flood-to-ebb','phone-forecast-flood-to-ebb-applied.png'),
('08-forecast-ebb-to-flood','phone-forecast-ebb-to-flood-applied.png'),
('09-forecast-closed-playing','phone-forecast-closed-playing.png'),
('10-forecast-fourth','phone-forecast-fourth.png'),
('11-moen-healing-impact','phone-moen-impact.png'),
('12-moen-shield-guarding','phone-moen-guarding.png'),
('13-moen-shield-broken','phone-moen-shield-after.png'),
('14-moen-delay-before','phone-moen-delay-before.png'),
('15-moen-delay-after','phone-moen-delay-after.png')]
index=[]
for name,source in selection:
    src=O/source;assert Image.open(src).size==(390,844),source
    dst=V/(name+'.png');shutil.copyfile(src,dst);assert sha(dst)==sha(src)
    index.append(dict(path=dst.relative_to(R).as_posix(),source=src.relative_to(R).as_posix(),sha256=sha(dst),width=390,height=844))
assert len(list(V.glob('*.png')))==15
(O/'review-set-index.json').write_text(json.dumps(dict(status='VERIFIED',method='Native 390x844 DPR1 PNG byte copies, no collage or resizing.',allocation=dict(puzzles=5,forecast=5,moen=5),reason='Equal allocation: reviewed puzzle details and all three exchange states; dual reversal and fourth-round proof; enemy healing/shield and real delay casualty. All six original boards and supplemental proofs remain in the parent folder.',images=index),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
if '--prepare' in sys.argv:
    print('VERIFIED 15 original-size review PNG copies');raise SystemExit(0)
# Prior-round before images are explicitly historical, never passed off as current captures.
E=R/'docs/evidence/content-r7';E.mkdir(parents=True,exist_ok=True);provenance=[]
for kind,old,new in [('exchange','phone-exchange-preview.png','phone-exchange-preview.png'),('forecast','phone-forecast-applied.png','phone-forecast-flood-to-ebb-applied.png'),('moen','phone-moen-guarding.png','phone-moen-guarding.png')]:
    for phase,src in [('before',R/'docs/content/r6'/old),('after',O/new)]:
        dst=E/(kind+'-'+phase+'.png');shutil.copyfile(src,dst);provenance.append(dict(path=dst.relative_to(R).as_posix(),source=src.relative_to(R).as_posix(),sha256=sha(dst),historical=phase=='before'))
for source in ['layout-moen-844x390-1.png','layout-moen-1032x1376-1.png','layout-moen-1376x1032-1.png']:
    src=O/source;dst=E/source;shutil.copyfile(src,dst);provenance.append(dict(path=dst.relative_to(R).as_posix(),source=src.relative_to(R).as_posix(),sha256=sha(dst),historical=False))
(E/'provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
for name,size in [('content-r7-moen-1290x2796.png',(1290,2796)),('content-r7-moen-2064x2752.png',(2064,2752))]:assert Image.open(R/'docs/store/screenshots'/name).size==size
phone=[]
for p in O.glob('phone-*.png'):
    assert Image.open(p).size==(390,844),p.name
    phone.append(dict(path=p.relative_to(R).as_posix(),sha256=sha(p)))
pattern=re.compile(r'sk-proj-[A-Za-z0-9_-]{20}|sk-[a-z0-9]{40}');hits=[];count=0
for p in R.rglob('*'):
    rel=p.relative_to(R)
    if any(x in {'.git','node_modules','.audit-tmp'} for x in rel.parts) or not p.is_file() or p.suffix.lower() not in {'.md','.js','.json','.html','.css','.py','.txt','.yml','.yaml','.toml','.webmanifest'}:continue
    content=p.read_text(encoding='utf8',errors='replace');count+=1
    if pattern.search(content):hits.append(rel.as_posix())
assert not hits,hits
runtime=['index.html','sw.js','templates/index.html','templates/harbor.html','templates/card-battle/index.html','templates/card-pack/index.html','templates/card-pack/pack.js']
assert json.loads((R/'package.json').read_text(encoding='utf8'))['version']=='0.20.0'
assert all('card-battle-content-r6-v1' not in (R/p).read_text(encoding='utf8') for p in runtime)
syntax=[]
for rel in ['sw.js','templates/card-battle/battle.js','templates/card-battle/content-r6.js','templates/card-battle/tide-puzzles.js','templates/card-pack/pack.js','scripts/test-content-r7.js','scripts/test-content-r7-e2e.js','scripts/test-content-r7-offline.js','scripts/measure-content-r7.js']:
    q=subprocess.run(['node','--check',str(R/rel)],capture_output=True,text=True);assert q.returncode==0,(rel,q.stderr);syntax.append(rel)
accept=json.loads((O/'acceptance.json').read_text(encoding='utf8'));assert accept['status']=='VERIFIED'
assert json.loads((O/'offline-addendum.json').read_text(encoding='utf8'))['status']=='VERIFIED'
tests=json.loads((O/'test-exits.json').read_text(encoding='utf8'));latest={t['name']:t for t in tests};assert all(t['exitCode']==0 for t in latest.values()),tests
frames=json.loads((O/'frame-times.json').read_text(encoding='utf8'));assert frames['status']=='VERIFIED'
assets=['assets/art/content-r6/moen-0.webp','assets/art/content-r6/moen-1.webp','assets/art/content-r6/moen-2.webp','assets/art/content-r4/shield-cover.webp','assets/art/content-r4/shield-fracture.webp','assets/art/r75/icon-shield.webp','assets/art/r79/icon-wave.webp']
A=dict(status='VERIFIED',round='CONTENT_R7',newOriginals=0,newRuntimeCrops=0,tool=None,reason='Only reviewed text, ownership labels and layout fixes; reuses existing generated art without repainting.',reused=[dict(path=p,sha256=sha(R/p)) for p in assets])
(R/'docs/art/ASSET_MANIFEST_CONTENT_R7.json').write_text(json.dumps(A,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(O/'verification.json').write_text(json.dumps(dict(status='VERIFIED',version='0.20.0',pwa='card-battle-content-r7-v1',reviewImages=15,phoneScreenshots=len(phone),phoneFiles=phone,secretScan=dict(status='VERIFIED',files=count,hits=hits,scope='Repo text files excluding .git/node_modules/.audit-tmp. No secret-directory access.'),syntax=syntax,acceptanceChecks=accept['checks'],newOriginals=0,newRuntimeCrops=0,externalStatus='BLOCKED: physical devices, human playtest, exclusive performance window, actual Muse score require external conditions.'),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('VERIFIED 15 native review PNGs;',len(phone),'phone PNGs; secrets',len(hits),'; version 0.20.0')
