"""Preserve every incoming document, including other users' untracked files."""
from pathlib import Path
import hashlib,json,shutil,sys
R=Path(__file__).resolve().parents[1];B=R/'.audit-tmp/content-r6-preserve';O=R/'docs/content/r6'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if '--restore' not in sys.argv:
    assert not (B/'inventory.json').exists(),'Never overwrite the baseline'
    items=[]
    for p in (R/'docs').rglob('*'):
        if not p.is_file() or O in p.parents:continue
        rel=p.relative_to(R);dst=B/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dst);items.append(dict(path=rel.as_posix(),sha256=sha(p)))
    (B/'inventory.json').write_text(json.dumps(items,indent=2),encoding='utf8');print('PREPARED',len(items),'incoming files')
else:
    items=json.loads((B/'inventory.json').read_text(encoding='utf8'));changed=[];owned=[]
    for x in items:
        p=R/x['path'];assert p.is_file(),x['path']
        if x['path'].startswith('docs/art/source/content-r6/') or x['path'] in {'docs/art/ASSET_MANIFEST_CONTENT_R6.json','docs/art/PROMPTS_CONTENT_R6.json'}:
            owned.append(dict(path=x['path'],initialSha256=x['sha256'],finalSha256=sha(p),reason='Task-owned R6 art created before snapshot, deliberately revised after color QA; not an incoming user file.'));continue
        if sha(p)!=x['sha256']:
            generated=x['path'].startswith(('docs/evidence/','docs/content/r1/','docs/content/r2/','docs/content/r3/','docs/content/r4/','docs/content/r5/','docs/store/screenshots/')) or x['path'] in {'docs/art/ASSET_MANIFEST.json','docs/art/ASSET_MANIFEST_R76.json'}
            assert generated,'Unexpected incoming document changed; do not overwrite: '+x['path']
            dst=B/'test-generated'/x['path'];dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dst)
            if p.suffix in {'.txt','.json'}:
                log=O/'legacy-receipts'/x['path'];log.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,log)
            shutil.copy2(B/x['path'],p);changed.append(x['path'])
        assert sha(p)==x['sha256']
    (O/'preservation.json').write_text(json.dumps(dict(status='VERIFIED',incomingFiles=len(items)-len(owned),restored=changed,taskOwnedArtRevisions=owned,noIncomingUntrackedDeleted=True),indent=2),encoding='utf8');print('VERIFIED preservation',len(items)-len(owned),'restored',len(changed))
