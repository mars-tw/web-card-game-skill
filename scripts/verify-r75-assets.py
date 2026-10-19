from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
import json,hashlib,colorsys
ROOT=Path(__file__).resolve().parents[1]
art=ROOT/'docs/art';manifest=json.loads((art/'ASSET_MANIFEST.json').read_text(encoding='utf-8'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
checks=[]
for a in manifest['assets']:
 assert sha(ROOT/a['source'])==a['source_sha256'],a['id']+' source hash'
 with Image.open(ROOT/a['source']) as master: assert master.format=='PNG',a['id']+' master magic bytes'
 for r in a['runtime']:
  p=ROOT/r['path'];assert sha(p)==r['sha256'],str(p)
  with Image.open(p) as im:
   assert list(im.size)==r['size']
   assert im.format==('WEBP' if p.suffix=='.webp' else 'PNG'),str(p)+' magic bytes'
 if a['id'] in ['navigator','footman','archer']:
  assert a['color_metrics']['double_gate_pass'],a['id']+' double gate'
  im=Image.open(ROOT/a['runtime'][0]['path']).convert('RGBA').resize((128,128),Image.Resampling.BOX)
  data=im.get_flattened_data() if hasattr(im,'get_flattened_data') else im.getdata()
  hsv=[colorsys.rgb_to_hsv(r/255,g/255,b/255) for r,g,b,alpha in data if alpha>32]
  v=sum(x[2] for x in hsv)/len(hsv);s=sum(x[1] for x in hsv)/len(hsv)
  black=sum(x[2]<.1 for x in hsv)/len(hsv);low=sum(x[1]<.12 for x in hsv)/len(hsv)
  a['compressed_character_metrics']={'brightness':v,'saturation':s,'near_black_ratio':black,'low_saturation_ratio':low}
  assert .3<=v<=.75 and s>=.32 and black<.35 and low<.2,a['id']+' compressed double gate'
 if a['id'] in ['navigator','frame','logo','icons']:
  assert a['alpha']['transparent_ratio']>.15 and a['alpha']['opaque_ratio']>.1,a['id']+' alpha'
 if a['id']=='frame':assert a['alpha']['center']==0,'transparent art window'
 checks.append({'id':a['id'],'source_and_runtime_hashes':'VERIFIED','color_metrics':a['color_metrics']})
for name in ['footman','archer']:
 with Image.open(ROOT/f'assets/cards/{name}.png') as im:assert im.size==(1024,1024) and im.mode=='RGBA' and im.format=='PNG'
sheet=Image.new('RGB',(640,160),'#201c3d');draw=ImageDraw.Draw(sheet)
for i,a in enumerate(manifest['assets']):
 im=Image.open(art/'thumbs'/f"{a['id']}-64.png").convert('RGBA');sheet.paste(im,(i*64,8),im);draw.text((i*64+2,90),a['id'][:8],fill='#f2f1fa')
sheet.save(art/'thumbs/contact-64.png')
manifest['status']='VERIFIED';manifest['quality_note']='Character double gates pass. White pearl logotype intentionally fails character saturation thresholds and is not a character. Background source exposure correction recorded.'
(art/'ASSET_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
out=ROOT/'docs/evidence/r75-art';out.mkdir(exist_ok=True)
(out/'asset-gates.json').write_text(json.dumps({'status':'VERIFIED','generated_master_count':10,'checks':checks,'thumbnail_review':'docs/art/thumbs/contact-64.png','note':'Front-facing card portraits only; side/back and animated poses are missing, not passed.'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('R75 assets: 10 masters, alpha/card format/source hashes and character double gates PASS')
