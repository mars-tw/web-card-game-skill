"""Archive current legacy outputs, then restore every incoming evidence byte."""
from pathlib import Path
import hashlib,json,shutil
R=Path(__file__).resolve().parents[1];B=R/'.audit-tmp/r79-preserve';O=R/'docs/evidence/r79-art'
items=json.loads((B/'inventory.json').read_text(encoding='utf-8'));changed=[];checked=0
for item in items:
 if not item['path'].startswith('docs/evidence/'):continue
 p=R/item['path'];assert p.exists();checked+=1
 if hashlib.sha256(p.read_bytes()).hexdigest()!=item['sha256']:
  dst=O/'legacy-output'/p.relative_to(R/'docs/evidence');dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dst);shutil.copy2(B/item['path'],p);changed.append(item['path'])
 assert hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256']
(O/'preservation.json').write_text(json.dumps(dict(status='VERIFIED',incomingEvidenceChecked=checked,restored=changed,note='Every incoming evidence byte, including dirty R67 gate, preserved. Store screenshots intentionally replaced. Existing untracked files never deleted.'),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Incoming evidence preserved:',checked,'restored:',len(changed))
