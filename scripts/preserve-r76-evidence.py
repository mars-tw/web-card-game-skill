"""Restore incoming historical evidence, keeping this round's outputs separate."""
from pathlib import Path
import json,hashlib,shutil
ROOT=Path(__file__).resolve().parents[1];BACKUP=ROOT/'.audit-tmp/r76-preserve';OUT=ROOT/'docs/evidence/r76-art';items=json.loads((BACKUP/'inventory.json').read_text(encoding='utf-8'));changed=[]
for item in items:
 p=ROOT/item['path'];assert p.exists(),item['path']
 if hashlib.sha256(p.read_bytes()).hexdigest()!=item['sha256']:
  archived=OUT/'legacy-output'/p.relative_to(ROOT/'docs/evidence');archived.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,archived)
  shutil.copy2(BACKUP/item['path'],p);changed.append(item['path'])
 assert hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256']
(OUT/'preservation.json').write_text(json.dumps(dict(status='VERIFIED',incomingFilesChecked=len(items),restored=changed,note='All incoming bytes retained, including pre-existing dirty files. New legacy-test outputs archived. No untracked files deleted.'),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Incoming evidence verified:',len(items),'restored:',len(changed))
