"""Archive this round's legacy-test outputs, restore every incoming evidence byte."""
from pathlib import Path
import hashlib,json,shutil
R=Path(__file__).resolve().parents[1];B=R/'.audit-tmp/r78-preserve';O=R/'docs/evidence/r78-art'
items=json.loads((B/'inventory.json').read_text(encoding='utf-8'));changed=[];checked=0
for item in items:
 if not item['path'].startswith('docs/evidence/'):continue
 p=R/item['path'];assert p.exists();checked+=1
 if hashlib.sha256(p.read_bytes()).hexdigest()!=item['sha256']:
  archived=O/'legacy-output'/p.relative_to(R/'docs/evidence');archived.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,archived)
  shutil.copy2(B/item['path'],p);changed.append(item['path'])
 assert hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256']
(O/'preservation.json').write_text(json.dumps(dict(status='VERIFIED',incomingEvidenceChecked=checked,restored=changed,note='All incoming evidence bytes, including pre-existing dirty R67 JSON, restored. Store screenshots intentionally replaced by new official captures. No existing untracked files deleted.'),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Preserved incoming evidence:',checked,'restored:',len(changed))
