"""Restore exact incoming historical evidence after legacy tests write it."""
from pathlib import Path
import json,hashlib,shutil,sys
ROOT=Path(__file__).resolve().parents[1]
backup=ROOT/'.audit-tmp/r75-preserve'
if '--snapshot' in sys.argv:
 assert not (backup/'inventory.json').exists(),'An incoming snapshot already exists; do not overwrite it.'
 backup.mkdir(parents=True,exist_ok=True);items=[]
 for p in (ROOT/'docs/evidence').rglob('*'):
  if p.is_file() and 'r75-art' not in p.parts:
   dest=backup/p.relative_to(ROOT/'docs/evidence');dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
   items.append({'path':p.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 (backup/'inventory.json').write_text(json.dumps(items),encoding='utf-8')
 print('Incoming snapshot created:',len(items));raise SystemExit(0)
items=json.loads((backup/'inventory.json').read_text(encoding='utf-8'))
out=ROOT/'docs/evidence/r75-art';changes=[]
for item in items:
 p=ROOT/item['path'];src=backup/p.relative_to(ROOT/'docs/evidence')
 if hashlib.sha256(p.read_bytes()).hexdigest()!=item['sha256']:
  dest=out/'legacy-output'/p.relative_to(ROOT/'docs/evidence');dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
  shutil.copy2(src,p);changes.append(item['path'])
 assert hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256'],item['path']
(out/'preservation.json').write_text(json.dumps({'status':'VERIFIED','incomingFilesChecked':len(items),'restored':changes,'note':'Incoming bytes restored including pre-existing dirty R67 visual-assets.json; new outputs archived. No pre-existing untracked files removed.'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Historical incoming evidence verified:',len(items),'restored:',len(changes))
