"""Preserve incoming bytes, then capture the unchanged R79 runtime for R80."""
from pathlib import Path
import hashlib,json,shutil,subprocess
R=Path(__file__).resolve().parents[1]; B=R/'.audit-tmp/r80-preserve'
assert not (B/'inventory.json').exists()
B.mkdir(parents=True,exist_ok=True); items=[]
for folder in ['docs/evidence','docs/store/screenshots']:
 for p in (R/folder).rglob('*'):
  if not p.is_file(): continue
  rel=p.relative_to(R).as_posix(); dest=B/rel; dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
  items.append(dict(path=rel,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
(B/'inventory.json').write_text(json.dumps(items,indent=2),encoding='utf-8')
(B/'git-status.txt').write_bytes(subprocess.check_output(['git','status','--short'],cwd=R))
for folder in ['docs/art/compare/r80/before','docs/art/compare/r80/wave','docs/evidence/r80-art']:(R/folder).mkdir(parents=True,exist_ok=True)
wave=(R/'scripts/capture-r79-wave.js').read_text(encoding='utf-8').replace('compare/r79/wave','compare/r80/before/wave')
(R/'scripts/capture-r80-baseline-wave.js').write_text(wave,encoding='utf-8')
src=(R/'scripts/capture-r79-art.js').read_text(encoding='utf-8').replace("require('./capture-r79-wave')","require('./capture-r80-baseline-wave')").replace('compare/r79/after','compare/r80/before').replace('docs/store/screenshots','docs/art/compare/r80/before/store').replace('compare/r79/wave','compare/r80/before/wave').replace('docs/evidence/r79-art','docs/evidence/r80-art')
(R/'docs/art/compare/r80/before/store').mkdir(parents=True,exist_ok=True)
(R/'scripts/capture-r80-baseline.js').write_text(src,encoding='utf-8')
print('Preserved incoming evidence/store files:',len(items))
