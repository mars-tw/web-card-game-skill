"""Snapshot incoming docs before legacy tests; never delete incoming files."""
from pathlib import Path
import hashlib,json,shutil,sys
R=Path(__file__).resolve().parents[1]
B=R/'.audit-tmp/content-r5-preserve'
O=R/'docs/content/r5'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if '--restore' not in sys.argv:
    assert not (B/'inventory.json').exists(), 'Do not overwrite incoming inventory'
    items=[]
    for p in (R/'docs').rglob('*'):
        if not p.is_file() or O in p.parents or p.name=='OPTIM_PLAN_CONTENT_R5.md':continue
        rel=p.relative_to(R);dst=B/rel;dst.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(p,dst);items.append(dict(path=rel.as_posix(),sha256=sha(p)))
    (B/'inventory.json').write_text(json.dumps(items,indent=2),encoding='utf8')
    print('PREPARED incoming evidence',len(items))
else:
    changed=[];items=json.loads((B/'inventory.json').read_text(encoding='utf8'))
    for item in items:
        p=R/item['path'];assert p.is_file(),item['path']
        if sha(p)!=item['sha256']:
            legacy_store={f'docs/store/screenshots/{name}-{size}.png' for name in ('harbor','tide-chart','trial') for size in ('1290x2796','2064x2752')}
            generated=item['path'].startswith(('docs/evidence/','docs/content/r1/','docs/content/r2/','docs/content/r3/','docs/content/r4/','docs/store/screenshots/content-r')) or item['path'] in legacy_store|{'docs/art/ASSET_MANIFEST.json','docs/art/ASSET_MANIFEST_R76.json'}
            assert generated,'Unexpected incoming document changed; leave it untouched: '+item['path']
            archive=O/'legacy-receipts' if p.suffix in {'.json','.txt'} else R/'.audit-tmp/content-r5-generated'
            dst=archive/item['path'];dst.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(p,dst);shutil.copy2(B/item['path'],p);changed.append(item['path'])
        assert sha(p)==item['sha256']
    O.mkdir(parents=True,exist_ok=True)
    (O/'preservation.json').write_text(json.dumps(dict(status='VERIFIED',incomingFiles=len(items),restored=changed,noIncomingUntrackedDeleted=True),indent=2),encoding='utf8')
    print('VERIFIED incoming evidence',len(items),'restored',len(changed))
