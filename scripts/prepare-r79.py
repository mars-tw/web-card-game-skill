"""Preserve incoming evidence and prepare an isolated, headless R79 baseline."""
from pathlib import Path
import hashlib,json,shutil
R=Path(__file__).resolve().parents[1]
B=R/'.audit-tmp/r79-preserve'
assert not (B/'inventory.json').exists(), 'Never overwrite the incoming inventory'
B.mkdir(parents=True,exist_ok=True)
items=[]
for folder in ['docs/evidence','docs/store/screenshots']:
 for p in (R/folder).rglob('*'):
  if not p.is_file():continue
  rel=p.relative_to(R).as_posix();dst=B/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dst)
  items.append(dict(path=rel,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
(B/'inventory.json').write_text(json.dumps(items,indent=2),encoding='utf-8')
out=R/'docs/art/compare/r79/before';out.mkdir(parents=True,exist_ok=True)
for p in (R/'docs/store/screenshots').glob('*.png'):shutil.copy2(p,out/p.name)
source=(R/'scripts/capture-r78-art.js').read_text(encoding='utf-8').replace('compare/r78','compare/r79').replace('evidence/r78-art','evidence/r79-art')
(R/'scripts/capture-r79-baseline.js').write_text(source,encoding='utf-8')
(R/'docs/evidence/r79-art').mkdir(parents=True,exist_ok=True)
print('Incoming evidence backed up:',len(items))
