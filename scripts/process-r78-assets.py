"""Preserve native alpha; audit actual generated originals and compressed runtime art."""
from pathlib import Path
from PIL import Image,ImageDraw
import hashlib,json,colorsys
R=Path(__file__).resolve().parents[1];A=R/'docs/art';T=A/'thumbs/r78';T.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def metrics(im):
 im=im.convert('RGBA').resize((128,128),Image.Resampling.BOX)
 hsv=[colorsys.rgb_to_hsv(r/255,g/255,b/255) for r,g,b,a in im.getdata() if a>32]
 v=sum(x[2]for x in hsv)/len(hsv);s=sum(x[1]for x in hsv)/len(hsv);black=sum(x[2]<.1 for x in hsv)/len(hsv);low=sum(x[1]<.12 for x in hsv)/len(hsv)
 return dict(brightness=v,saturation=s,near_black_ratio=black,low_saturation_ratio=low,double_gate_pass=.30<=v<=.75 and s>=.32 and black<.35 and low<.20)
prompts=json.loads((A/'PROMPTS_R78.json').read_text(encoding='utf-8'));items=[]
contact=Image.new('RGB',(640,280),'#201c3d');draw=ImageDraw.Draw(contact)
for n,entry in enumerate(prompts['assets']):
 name=entry['id'];p=A/'source/r78'/f'{name}.png';im=Image.open(p)
 assert im.format=='PNG'
 item=dict(id=name,source=p.relative_to(R).as_posix(),source_sha256=sha(p),size=list(im.size),bytes=p.stat().st_size,source_metrics=metrics(im),runtime=[])
 if entry['transparent_requested']:
  assert im.mode=='RGBA';alpha=im.getchannel('A');hist=alpha.histogram()
  item['alpha']=dict(extrema=alpha.getextrema(),transparent_ratio=hist[0]/(im.width*im.height),corners=[alpha.getpixel(xy)for xy in [(0,0),(im.width-1,0),(0,im.height-1),(im.width-1,im.height-1)]],bounding_box=alpha.getbbox())
  assert alpha.getextrema()[0]==0 and alpha.getextrema()[1]>=250
  if name=='frame':assert alpha.getpixel((im.width//2,im.height//2))==0
  edge=Image.new('RGBA',(384,192),'white');small=im.convert('RGBA');small.thumbnail((180,180));edge.alpha_composite(small,(4,4));edge.paste('#201c3d',(192,0,384,192));edge.alpha_composite(small,(196,4));edge.convert('RGB').save(T/f'{name}-alpha.png')
 variants=[name,name+'-low']+(['avatar']if name=='navigator'else[])
 for variant in variants:
  runtime=R/'assets/art/r78'/f'{variant}.webp'
  if runtime.exists():
   with Image.open(runtime)as ri:item['runtime'].append(dict(path=runtime.relative_to(R).as_posix(),sha256=sha(runtime),bytes=runtime.stat().st_size,size=list(ri.size),format=ri.format,metrics=metrics(ri)))
 if name=='navigator':assert item['source_metrics']['double_gate_pass'] and item['runtime'][0]['metrics']['double_gate_pass']
 if entry.get('reference'):
  ref=R/entry['reference'];item['reference']=dict(path=entry['reference'],sha256=sha(ref))
 thumb=im.convert('RGBA');thumb.thumbnail((64,64));contact.paste(thumb,((n%5)*128+32,(n//5)*135+12),thumb);draw.text(((n%5)*128+4,(n//5)*135+88),name,fill='#f2f1fa')
 items.append(item)
contact.save(T/'contact-64.png')
m=dict(status='VERIFIED',tool='image_gen.imagegen',model_slug=None,model_note=prompts['model_note'],generated_master_count=len(items),assets=items,source_bytes=sum(i['bytes']for i in items),runtime_bytes=sum(v['bytes']for i in items for v in i['runtime']),license='AI-generated for this project; preserve existing licensing. No external stock assets.',postprocessing='Pillow resize/WebP compression and QA contact sheets only; native transparent alpha preserved. No programmatic substitute art.',limitations='Native alpha may stop at253/254; navigator is cropped thigh-up, bottom corners can be occupied. Sheet is continuity evidence, not animation poses. App icon is local proposal only.')
(A/'ASSET_MANIFEST_R78.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('R78 assets:',len(items),'masters;',m['runtime_bytes'],'runtime bytes; native alpha/frame/character double gate PASS')
