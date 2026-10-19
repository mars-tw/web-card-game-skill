from pathlib import Path
from PIL import Image
import json,hashlib,colorsys
ROOT=Path(__file__).resolve().parents[1];manifest=json.loads((ROOT/'docs/art/ASSET_MANIFEST_R76.json').read_text(encoding='utf-8'));checks=[]
characters={'emberpup','wolf','sparkSquire','alleySkirmisher','frontScout','victory-navigator'}
for a in manifest['assets']:
 p=ROOT/a['source'];assert hashlib.sha256(p.read_bytes()).hexdigest()==a['source_sha256']
 with Image.open(p) as im:assert im.format=='PNG'
 for v in a['runtime']:
  p=ROOT/v['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==v['sha256']
  with Image.open(p) as im:assert list(im.size)==v['size'] and im.format==('WEBP' if p.suffix=='.webp' else 'PNG')
 if a['id'] in characters:
  assert a['source_metrics']['double_gate_pass'],a['id']+' source'
  im=Image.open(ROOT/a['runtime'][0]['path']).convert('RGBA').resize((128,128),Image.Resampling.BOX)
  pixels=im.get_flattened_data() if hasattr(im,'get_flattened_data') else im.getdata()
  hsv=[colorsys.rgb_to_hsv(r/255,g/255,b/255) for r,g,b,alpha in pixels if alpha>32]
  v=sum(x[2] for x in hsv)/len(hsv);s=sum(x[1] for x in hsv)/len(hsv)
  assert .30<=v<=.75 and s>=.32 and sum(x[2]<.1 for x in hsv)/len(hsv)<.35 and sum(x[1]<.12 for x in hsv)/len(hsv)<.20,a['id']+' compressed'
 if 'alpha' in a:
  assert a['alpha']['transparent_ratio']>.15
  with Image.open(ROOT/a['runtime'][0]['path']) as im:assert im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0
 if a['id']=='frame':assert a['alpha']['center']==0
 checks.append({'id':a['id'],'status':'VERIFIED'})
assert manifest['generated_master_count']==13 and len(checks)==13
for v in manifest['derived_runtime']:
 assert hashlib.sha256((ROOT/v['source']).read_bytes()).hexdigest()==v['source_sha256']
 assert hashlib.sha256((ROOT/v['path']).read_bytes()).hexdigest()==v['sha256']
 with Image.open(ROOT/v['path']) as im:assert im.format=='WEBP' and list(im.size)==v['size']
 assert v['color_metrics']['double_gate_pass'],v['id']+' responsive runtime color gate'
manifest['status']='VERIFIED';manifest['quality_note']='Character source/runtime double gates pass. Pearl frame and ivory title are not characters; their unfiltered low-saturation results are retained. Static front-facing paintings, not walk/hurt/death assets.'
(ROOT/'docs/art/ASSET_MANIFEST_R76.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT/'docs/evidence/r76-art/asset-gates.json').write_text(json.dumps({'status':'VERIFIED','checks':checks,'model_slug':None,'tool':manifest['tool'],'thumbnail':'docs/art/thumbs/r76/contact-64.png','scope':'hashes, magic bytes, dimensions, native alpha, actual compressed character color gates; 64px is author visual review, not a blind panel'},indent=2)+'\n',encoding='utf-8')
print('R76: 13 masters; source/runtime hashes, alpha, dimensions and character double gates PASS')
