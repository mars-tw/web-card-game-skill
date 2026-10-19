"""Protect incoming tracked and untracked evidence from legacy test writers."""
from pathlib import Path
import hashlib,json,shutil,sys
R=Path(__file__).resolve().parents[1]
B=R/'.audit-tmp/content-r4-preserve'
O=R/'docs/content/r4'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if '--restore' not in sys.argv:
    assert not (B/'inventory.json').exists(), 'Do not overwrite incoming inventory'
    items=[]
    for p in (R/'docs').rglob('*'):
        if not p.is_file() or O in p.parents or p.name=='OPTIM_PLAN_CONTENT_R4.md':continue
        rel=p.relative_to(R)
        dst=B/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dst)
        items.append(dict(path=rel.as_posix(),sha256=sha(p)))
    (B/'inventory.json').write_text(json.dumps(items,indent=2),encoding='utf8')
    print('PREPARED incoming evidence',len(items))
else:
    changed=[];items=json.loads((B/'inventory.json').read_text(encoding='utf8'))
    for item in items:
        p=R/item['path'];assert p.is_file(),item['path']
        if sha(p)!=item['sha256']:
            archive=O/'legacy-receipts' if p.suffix in {'.json','.txt'} else R/'.audit-tmp/content-r4-generated'
            dst=archive/item['path'];dst.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(p,dst);shutil.copy2(B/item['path'],p);changed.append(item['path'])
        assert sha(p)==item['sha256']
    (O/'preservation.json').write_text(json.dumps(dict(status='VERIFIED',incomingFiles=len(items),restored=changed,noIncomingUntrackedDeleted=True),indent=2),encoding='utf8')
    print('VERIFIED incoming evidence',len(items),'restored',len(changed))
