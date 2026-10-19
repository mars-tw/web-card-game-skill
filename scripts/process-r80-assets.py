"""Compress generated art without synthesizing pixels; preserve source alpha."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib,colorsys
R=Path(__file__).resolve().parents[1]; A=R/'docs/art'; T=A/'thumbs/r80';T.mkdir(parents=True,exist_ok=True)
P=json.loads((A/'PROMPTS_R80.json').read_text(encoding='utf-8'))
sizes={'footman-band':(512,512),'archer-hood':(512,512),'wave':(1200,800),'logo':(1000,667),'victory-navigator':(700,1050)}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def metrics(im):
 hsv=[colorsys.rgb_to_hsv(r/255,g/255,b/255)for r,g,b,a in im.convert('RGBA').resize((128,128),Image.Resampling.BOX).getdata()if a>32]
 v=sum(x[2]for x in hsv)/len(hsv);s=sum(x[1]for x in hsv)/len(hsv);black=sum(x[2]<.1 for x in hsv)/len(hsv);low=sum(x[1]<.12 for x in hsv)/len(hsv)
 return dict(brightness=v,saturation=s,near_black_ratio=black,low_saturation_ratio=low,double_gate_pass=.3<=v<=.75 and s>=.32 and black<.35 and low<.2)
contact=Image.new('RGB',(768,180),'#201c3d');draw=ImageDraw.Draw(contact);items=[]
for n,e in enumerate(P['assets']):
 name=e['id'];p=A/'source/r80'/f'{name}.png';im=Image.open(p)
 item=dict(id=name,source=p.relative_to(R).as_posix(),sha256=sha(p),size=list(im.size),bytes=p.stat().st_size,metrics=metrics(im),references=[dict(path=x,sha256=sha(R/x))for x in e['references']],runtime=[])
 if e['transparent_requested']:
  assert im.mode=='RGBA';alpha=im.getchannel('A');hist=alpha.histogram();item['alpha']=dict(extrema=alpha.getextrema(),transparent_ratio=hist[0]/(im.width*im.height),bbox=alpha.getbbox(),corners=[alpha.getpixel(q)for q in[(0,0),(im.width-1,0),(0,im.height-1),(im.width-1,im.height-1)]])
  assert alpha.getextrema()[0]==0 and hist[0]>100
  edge=Image.new('RGBA',(384,192),'white');sm=im.copy();sm.thumbnail((180,180));edge.alpha_composite(sm,(4,4));edge.paste('#201c3d',(192,0,384,192));edge.alpha_composite(sm,(196,4));edge.convert('RGB').save(T/f'{name}-alpha.png')
 if name in sizes:
  versions=[(name,sizes[name])]+([(name+'-low',(160,160))]if name in['footman-band','archer-hood']else[])
  for variant,size in versions:
   ri=im.copy();ri.thumbnail(size,Image.Resampling.LANCZOS);dest=R/'assets/art/r80'/f'{variant}.webp';ri.save(dest,quality=84,method=6)
   item['runtime'].append(dict(path=dest.relative_to(R).as_posix(),bytes=dest.stat().st_size,sha256=sha(dest),size=list(ri.size),metrics=metrics(ri)))
 if name in['footman-band','archer-hood']:
  assert item['metrics']['double_gate_pass'] and all(v['metrics']['double_gate_pass']for v in item['runtime'])
  canonical=A/'canonical/r80'/f'{name}.png';canonical.parent.mkdir(parents=True,exist_ok=True)
  im.resize((1024,1024),Image.Resampling.LANCZOS).save(canonical)
  item['canonical']=dict(path=canonical.relative_to(R).as_posix(),size=[1024,1024],bytes=canonical.stat().st_size,sha256=sha(canonical))
 thumb=im.convert('RGBA');thumb.thumbnail((64,64));contact.paste(thumb,(n*128+32,8),thumb);draw.text((n*128+2,84),name,fill='#f2f1fa');items.append(item)
contact.save(T/'contact-64.png')
M=dict(status='VERIFIED',tool=P['tool'],model_slug=None,model_note=P['model_note'],generated_master_count=len(items),source_bytes=sum(i['bytes']for i in items),runtime_bytes=sum(v['bytes']for i in items for v in i['runtime']),assets=items,postprocessing='Pillow resize/WebP compression/QA sheets only. Native alpha preserved. No programmatic replacement art.',license='AI-generated for this project; previous licenses retained.',limitations='Sheet and accessory variants are static, not limb animation. 64px local self-review, no independent blind test. Pale foam intentionally low saturation; character double gates required; VFX diagnostic only.')
(A/'ASSET_MANIFEST_R80.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
main=json.loads((A/'PROMPTS.json').read_text(encoding='utf-8'));main.update(current_round='R80',current_prompt_file='docs/art/PROMPTS_R80.json',current_manifest='docs/art/ASSET_MANIFEST_R80.json');(A/'PROMPTS.json').write_text(json.dumps(main,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('R80 masters',len(items),'runtime bytes',M['runtime_bytes'])
