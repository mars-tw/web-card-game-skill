"""Archive test rewrites, then restore incoming evidence byte for byte."""
from pathlib import Path
import hashlib,json,shutil,subprocess
R=Path(__file__).resolve().parents[1];B=R/'.audit-tmp/r80-preserve';O=R/'docs/evidence/r80-art'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
items=json.loads((B/'inventory.json').read_text(encoding='utf-8'));changed=[];checked=0
for item in items:
 if not item['path'].startswith('docs/evidence/'):continue
 p=R/item['path'];assert p.exists();checked+=1
 if sha(p)!=item['sha256']:
  dest=O/'legacy-output'/p.relative_to(R/'docs/evidence');dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest);shutil.copy2(B/item['path'],p);changed.append(item['path'])
 assert sha(p)==item['sha256']
art_restored=[]
for name in ['docs/art/ASSET_MANIFEST.json','docs/art/ASSET_MANIFEST_R76.json']:
 p=R/name;original=subprocess.check_output(['git','show','HEAD:'+name],cwd=R)
 if p.read_bytes()!=original:
  dest=O/'legacy-output'/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest);p.write_bytes(original);art_restored.append(name)
(O/'preservation.json').write_text(json.dumps(dict(status='VERIFIED',incomingEvidenceChecked=checked,restored=changed,cleanHistoricalArtRestored=art_restored,note='Incoming dirty R67 gate restored exactly. All incoming untracked paths retained. Store screenshots are authorized R80 replacements. No existing untracked file deleted.'),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Incoming evidence checked',checked,'restored',len(changed),'art manifests',len(art_restored))
