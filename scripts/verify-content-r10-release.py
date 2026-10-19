"""Read-only release verification; never reads credentials or changes original evidence."""
from pathlib import Path
from PIL import Image
import json,hashlib,subprocess,sys
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r10'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def source_sha(p):
 data=p.read_bytes()
 if p.suffix in ['.js','.css','.html','.json','.yml','.yaml','.py','.md','.webmanifest']:data=data.replace(b'\r\n',b'\n')
 return hashlib.sha256(data).hexdigest()
if '--syntax' in sys.argv:
 files=sorted(list((R/'scripts').glob('*.js'))+list((R/'templates/card-battle').glob('*.js'))+list((R/'templates/card-pack').glob('*.js')))
 for f in files:
  p=subprocess.run(['node','-c',str(f)],cwd=R,capture_output=True,text=True)
  assert p.returncode==0,(f,p.stderr)
 print('VERIFIED syntax',len(files),'JS files');raise SystemExit(0)
gates=json.loads((O/'checks/exits.json').read_text(encoding="utf8"));latest={g['name']:g for g in gates}
expected={'r10','unit','legacy-e2e','rwd','r6','r6-effects','r7','r8','r9','r9-puzzles','frames','ci-performance'}
assert expected<=latest.keys(),expected-latest.keys()
assert all(latest[n]['exit']==0 for n in expected),[n for n in expected if latest[n]['exit']]
for a in json.loads((R/'docs/art/ASSET_MANIFEST_CONTENT_R10.json').read_text(encoding='utf8'))['assets']:
 f=R/a['path'];im=Image.open(f);assert sha(f)==a['sha256'] and im.mode=='RGBA' and im.getextrema()[3][0]==0,a['path']
 if a.get('processing'):
  assert not im.getchannel('A').crop((0,0,im.width,15)).getbbox() and not im.getchannel('A').crop((0,im.height-15,im.width,im.height)).getbbox(),a['path']
for e in json.loads((O/'review-set-index.json').read_text(encoding='utf8'))['images']:
 assert sha(R/e['path'])==e['sha256']==sha(R/e['source']);assert Image.open(R/e['path']).size==(390,844)
assert len(list((O/'review-set').glob('*.png')))==15
for file,digest in json.loads((O/'source-hashes.json').read_text(encoding="utf8")).items():assert source_sha(R/file)==digest,file
assert json.loads((O/'secret-scan.json').read_text(encoding="utf8"))['matches']==0
assert json.loads((O/'acceptance.json').read_text(encoding="utf8"))['status']=='VERIFIED'
frames=json.loads((O/'frame-times.json').read_text(encoding="utf8"))
assert frames['status']=='VERIFIED' and all(r['median']<=18 and len(r['runs'])==3 for r in frames['result'])
assert all(v is True for k,v in json.loads((O/'ci-performance.json').read_text(encoding="utf8"))['assertions'].items() if k!='interactiveLimitMs')
assert json.loads((R/'package.json').read_text(encoding='utf8'))['version']=='0.23.0'
old=[]
for f in list((R/'templates').rglob('*.html'))+list((R/'templates').rglob('*.js'))+[R/'index.html',R/'sw.js',R/'package.json',R/'package-lock.json']:
 if 'card-battle-content-r9-v1' in f.read_text(encoding='utf8') or '"version": "0.22.0"' in f.read_text(encoding='utf8'):old.append(f.relative_to(R).as_posix())
assert not old,old
preserved=R/'.audit-tmp/r10/initial-visual-assets.json';assert sha(preserved)==sha(R/'docs/evidence/R67/gates/visual-assets.json'),'initial dirty evidence must be preserved'
result=dict(status='VERIFIED',version='0.23.0',cache='card-battle-content-r10-v1',gates=latest,review_images=15,source_hashes='source-hashes.json',secret_scan='secret-scan.json',scope='local commit only; no services, visible windows, publishing or credential access',blocked=['physical devices','human/parent-child playtest','exclusive clean-machine performance','independent Muse rescore'])
(O/'release-gates.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print('VERIFIED',len(expected),'gate groups; 15 original review images; art and source hashes; zero secrets; preserved entry evidence')
