"""Record art provenance, and restore all pre-existing generated evidence after tests."""
from pathlib import Path
from PIL import Image
import hashlib,json,shutil,sys,subprocess
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r3';O.mkdir(exist_ok=True,parents=True)
files=[]
for name in ['docs/art/source/content-r3/shell-shield-atlas.png','assets/art/content-r3/shield-intact.webp','assets/art/content-r3/shield-broken.webp']:
    p=R/name;im=Image.open(p);files.append(dict(path=name,width=im.width,height=im.height,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),alphaRange=list(im.getchannel('A').getextrema())))
(R/'docs/art/ASSET_MANIFEST_CONTENT_R3.json').write_text(json.dumps(dict(round='CONTENT_R3',tool='image_gen.imagegen',model_slug=None,new_originals=1,runtime_crops=2,files=files,reference='assets/art/r75/icon-shield.webp',postprocess='Atlas tile crop, resize and WebP compression only. Original alpha retained.',license='Generated with OpenAI image tool under applicable service terms; project MIT.'),indent=2)+'\n',encoding='utf8')
if '--restore' in sys.argv:
    B=R/'.audit-tmp/content-r3-preserve';items=json.loads((B/'inventory.json').read_text(encoding='utf8'));changed=[]
    for item in items:
        p=R/item['path'];assert p.exists(),item['path']
        if hashlib.sha256(p.read_bytes()).hexdigest()!=item['sha256']:
            dst=R/'.audit-tmp/content-r3-generated'/item['path'];dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dst)
            if p.suffix in {'.json','.txt'}:
                receipt=O/'legacy-receipts'/item['path'];receipt.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,receipt)
            shutil.copy2(B/item['path'],p);changed.append(item['path'])
        assert hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256']
    # These verifier-generated manifests were clean on entry, unlike the protected R67 gate.
    for name in ['docs/art/ASSET_MANIFEST.json','docs/art/ASSET_MANIFEST_R76.json']:
        p=R/name;original=subprocess.check_output(['git','show','HEAD:'+name],cwd=R)
        if p.read_bytes()!=original:
            dst=O/'legacy-receipts'/name;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dst);p.write_bytes(original)
    (O/'preservation.json').write_text(json.dumps(dict(status='VERIFIED',incomingFiles=len(items),restored=changed,note='Incoming dirty R67 evidence preserved byte for byte. No pre-existing untracked files removed or edited. Legacy test output images archived locally under .audit-tmp/content-r3-generated; JSON/text receipts retained under legacy-receipts. All R3 original screenshots remain here.'),indent=2)+'\n',encoding='utf8');print('Preserved incoming files:',len(items),'restored:',len(changed))
print('Art manifest recorded:',len(files))
