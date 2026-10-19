"""Compression/size variants and source evidence only; preserve generated alpha."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib,colorsys
R=Path(__file__).resolve().parents[1];A=R/'docs/art';T=A/'thumbs/r79';T.mkdir(parents=True,exist_ok=True)
P=json.loads((A/'PROMPTS_R79.json').read_text(encoding='utf-8'))
sizes={'wave':(1400,934),'foam':(540,360),'victory-navigator':(700,1050),'battlefield':(1400,934),'frame':(400,600),'icon-wave':(128,128),'logo':(1000,667),'app-icon':(512,512)}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def metrics(im):
 hsv=[colorsys.rgb_to_hsv(r/255,g/255,b/255)for r,g,b,a in im.convert('RGBA').resize((128,128),Image.Resampling.BOX).getdata()if a>32]
 v=sum(x[2]for x in hsv)/len(hsv);s=sum(x[1]for x in hsv)/len(hsv);black=sum(x[2]<.1 for x in hsv)/len(hsv);low=sum(x[1]<.12 for x in hsv)/len(hsv)
 return dict(brightness=v,saturation=s,near_black_ratio=black,low_saturation_ratio=low,double_gate_pass=.3<=v<=.75 and s>=.32 and black<.35 and low<.2)
contact=Image.new('RGB',(640,270),'#201c3d');draw=ImageDraw.Draw(contact);items=[]
for n,e in enumerate(P['assets']):
 name=e['id'];p=A/'source/r79'/f'{name}.png';im=Image.open(p)
 item=dict(id=name,source=p.relative_to(R).as_posix(),sha256=sha(p),size=list(im.size),bytes=p.stat().st_size,metrics=metrics(im),references=[dict(path=x,sha256=sha(R/x))for x in e['references']],runtime=[])
 if e['transparent_requested']:
  assert im.mode=='RGBA';alpha=im.getchannel('A');hist=alpha.histogram()
  item['alpha']=dict(extrema=alpha.getextrema(),transparent_ratio=hist[0]/(im.width*im.height),center=alpha.getpixel((im.width//2,im.height//2)),bbox=alpha.getbbox())
  assert alpha.getextrema()[0]==0 and hist[0]>100
  if name=='frame':assert item['alpha']['center']==0
  edge=Image.new('RGBA',(384,192),'white');sm=im.copy();sm.thumbnail((180,180));edge.alpha_composite(sm,(4,4));edge.paste('#201c3d',(192,0,384,192));edge.alpha_composite(sm,(196,4));edge.convert('RGB').save(T/f'{name}-alpha.png')
 if name in sizes:
  versions=[(name,sizes[name])]+([(name+'-low',(700,467))]if name=='battlefield'else[(name+'-low',(160,240))]if name=='frame'else[])
  for variant,size in versions:
   ri=im.copy();ri.thumbnail(size,Image.Resampling.LANCZOS);dest=R/'assets/art/r79'/f'{variant}.webp';ri.save(dest,quality=68 if variant=='battlefield-low' else 85,method=6)
   item['runtime'].append(dict(path=dest.relative_to(R).as_posix(),bytes=dest.stat().st_size,sha256=sha(dest),size=list(ri.size),metrics=metrics(ri)))
 if name=='victory-navigator':assert item['metrics']['double_gate_pass'] and all(v['metrics']['double_gate_pass']for v in item['runtime'])
 thumb=im.convert('RGBA');thumb.thumbnail((64,64));contact.paste(thumb,((n%5)*128+32,(n//5)*130+8),thumb);draw.text(((n%5)*128+3,(n//5)*130+84),name,fill='#f2f1fa');items.append(item)
contact.save(T/'contact-64.png')
M=dict(status='VERIFIED',tool=P['tool'],model_slug=None,model_note=P['model_note'],generated_master_count=len(items),source_bytes=sum(i['bytes']for i in items),runtime_bytes=sum(v['bytes']for i in items for v in i['runtime']),assets=items,postprocessing='Pillow dimensions/WebP compression and QA sheets only. Native alpha preserved; no programmatic substitute art.',license='AI-generated for this project; all previous licenses retained.',limitations='Sheet is continuity reference, not animation; App icon local proposal only; native alpha max253/254 and soft halos retained and inspected. 64px self-review, no external blind test.')
(A/'ASSET_MANIFEST_R79.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
main=json.loads((A/'PROMPTS.json').read_text(encoding='utf-8'));main['current_round']='R79';main['current_prompt_file']='docs/art/PROMPTS_R79.json';main['current_manifest']='docs/art/ASSET_MANIFEST_R79.json';(A/'PROMPTS.json').write_text(json.dumps(main,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('R79 assets',len(items),'runtime bytes',M['runtime_bytes'],'character double gate',next(x['metrics']for x in items if x['id']=='victory-navigator'))
