"""Local-only release receipts: provenance, preservation, syntax and secret scan."""
from pathlib import Path
import json,hashlib,re,subprocess,os
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r13'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
protected=json.loads((O/'protected-files.json').read_text(encoding='utf-8'))
changed=[p for p,h in protected.items()if not (R/p).is_file()or sha(R/p)!=h]
assert not changed,changed
store_rows=subprocess.check_output(['git','ls-tree','-r','HEAD','--','docs/store/screenshots'],cwd=R).decode('utf-8').splitlines()
for row in store_rows:
 meta,name=row.split('\t',1);blob=meta.split()[2]
 assert (R/name).is_file(),name
 actual=subprocess.check_output(['git','hash-object',str(R/name)],cwd=R).decode().strip();assert actual==blob,name
m=json.loads((R/'docs/art/ASSET_MANIFEST_CONTENT_R13.json').read_text(encoding='utf-8'))
assert m['tool']=='image_gen.imagegen'and m['generation_calls']==m['new_illustrations']==2
for a in m['assets']:assert sha(R/a['path'])==a['sha256'],a['path']
tracked=[R/x for x in subprocess.check_output(['git','ls-files','-z'],cwd=R).decode().split('\0')if x]
syntax=sorted(set([p for p in tracked if p.suffix=='.js'and p.exists()]+list((R/'scripts').glob('*r13*.js'))))
for p in syntax:subprocess.run(['node','-c',str(p)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt'else 0)
hits=[]
for p in set(tracked+list(O.rglob('*.md'))+list((R/'scripts').glob('*r13*'))):
 if not p.is_file()or p.suffix.lower()not in ['.js','.css','.html','.json','.md','.py','.yml','.yaml','.txt']:continue
 if re.search(r'sk-proj-[A-Za-z0-9_-]{20}|sk-[a-z0-9]{40}',p.read_text(encoding='utf-8',errors='replace'),re.I):hits.append(p.relative_to(R).as_posix())
assert not hits,hits
assert json.loads((R/'package.json').read_text(encoding='utf-8'))['version']=='0.25.0'
assert 'card-battle-content-r13-v1'in (R/'sw.js').read_text()
cleanup=json.loads((O/'cleanup.json').read_text(encoding='utf-8'));assert cleanup['all_absent']and all(not (R/x['path']).exists()for x in cleanup['deleted'])
receipt=dict(status='VERIFIED',protected_count=len(protected),protected_changed=changed,preserved_store_count=len(store_rows),syntax_count=len(syntax),secret_hits=0,art_count=2,cleanup_count=cleanup['count'],cleanup_bytes=cleanup['bytes'])
(O/'release-integrity.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8');print(json.dumps(receipt))
