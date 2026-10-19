"""Keep incoming files intact when legacy tests regenerate their evidence."""
from pathlib import Path
import hashlib,json,shutil,sys
R=Path(__file__).resolve().parents[1];B=R/'.audit-tmp/content-r7-preserve';O=R/'docs/content/r7'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if '--restore' not in sys.argv:
    assert not (B/'inventory.json').exists(),'Baseline already exists'
    items=[]
    for p in (R/'docs').rglob('*'):
        if not p.is_file() or O in p.parents or p.name=='OPTIM_PLAN_CONTENT_R7.md':continue
        rel=p.relative_to(R);dst=B/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dst);items.append(dict(path=rel.as_posix(),sha256=sha(p)))
    (B/'inventory.json').write_text(json.dumps(items,indent=2),encoding='utf8');print('PREPARED',len(items),'incoming documents')
else:
    items=json.loads((B/'inventory.json').read_text(encoding='utf8'));changed=[]
    for x in items:
        p=R/x['path'];assert p.is_file(),x['path']
        if sha(p)!=x['sha256']:
            assert x['path'].startswith(('docs/evidence/','docs/content/r','docs/store/screenshots/')) or x['path'] in {'docs/art/ASSET_MANIFEST.json','docs/art/ASSET_MANIFEST_R76.json'},'Unexpected document changed: '+x['path']
            dst=B/'test-generated'/x['path'];dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dst)
            if p.suffix in {'.txt','.json'}:
                receipt=O/'legacy-receipts'/x['path'];receipt.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,receipt)
            shutil.copy2(B/x['path'],p);changed.append(x['path'])
        assert sha(p)==x['sha256']
    O.mkdir(parents=True,exist_ok=True);(O/'preservation.json').write_text(json.dumps(dict(status='VERIFIED',incomingFiles=len(items),restored=changed,noIncomingUntrackedDeleted=True),indent=2),encoding='utf8');print('VERIFIED',len(items),'preserved;',len(changed),'test outputs restored')
