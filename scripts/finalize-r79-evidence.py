"""Bind final wave receipts to final screenshots; preserve the earlier milestone receipt."""
from pathlib import Path
import json,shutil,hashlib
R=Path(__file__).resolve().parents[1];W=R/'docs/art/compare/r79/wave';O=R/'docs/evidence/r79-art'
p=W/'continuity.json';archive=O/'first-wave-continuity.json'
if p.exists()and not archive.exists():shutil.copy2(p,archive)
capture=json.loads((R/'docs/art/compare/r79/after/capture.json').read_text(encoding='utf-8'))
assert capture['status']=='VERIFIED' and len(capture['receipts'])==6
p.write_text(json.dumps(dict(status='VERIFIED',method=capture['method'],source='docs/art/compare/r79/after/capture.json',results=capture['receipts']),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
files=[]
for p in sorted((R/'docs/store/screenshots').glob('*.png')):files.append(dict(path=p.relative_to(R).as_posix(),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),review='Opened final original-size file; local self-review, not independent Muse score'))
assert len(files)==16
(O/'store-review.json').write_text(json.dumps(dict(status='VERIFIED',files=files,notes='See docs/art/STORE_QA_R79.md. Both sizes inspected; three-frame series is explicit nonlethal QA, natural harbor/trial-selection/victory are separate.'),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Final wave receipts and16 reviewed screenshot hashes bound')
