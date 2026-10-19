"""Deterministic size/compression/atlas processing; no painted substitutes."""
from pathlib import Path
from PIL import Image,ImageOps,ImageEnhance,ImageDraw
import json,shutil,hashlib,colorsys
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'docs/art';OUT=ROOT/'assets/art/r76';SRC=ART/'source/r76';THUMB=ART/'thumbs/r76'
for d in [OUT,SRC,THUMB]:d.mkdir(parents=True,exist_ok=True)
prompts=json.loads((ART/'PROMPTS_R76.json').read_text(encoding='utf-8'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def metrics(im):
 im=im.convert('RGBA').resize((128,128),Image.Resampling.BOX)
 px=im.get_flattened_data() if hasattr(im,'get_flattened_data') else im.getdata()
 hsv=[colorsys.rgb_to_hsv(r/255,g/255,b/255) for r,g,b,a in px if a>32]
 v=sum(x[2] for x in hsv)/len(hsv);s=sum(x[1] for x in hsv)/len(hsv);b=sum(x[2]<.1 for x in hsv)/len(hsv);l=sum(x[1]<.12 for x in hsv)/len(hsv)
 return dict(brightness=v,saturation=s,near_black_ratio=b,low_saturation_ratio=l,double_gate_pass=.30<=v<=.75 and s>=.32 and b<.35 and l<.20)
manifest=dict(release='R76',version='0.9.0',status='EXECUTED',tool=prompts['tool'],model_slug=None,model_note=prompts['model_note'],style_prefix=prompts['style_prefix'],license='Generated for this project with OpenAI built-in ImageGen; subject to applicable service terms. Existing third-party licenses remain in CREDITS.md.',postprocess='Pillow LANCZOS resizing, native alpha retained, atlas cell crop, WebP q82 default; 384px cards q76, 1x 256px cards q55; 960px low battlefield q45; 384px waterline q55. No synthetic painting. Native PNGs unmodified.',assets=[])
cards=['emberpup','wolf','sparkSquire','alleySkirmisher','frontScout','firebolt']
for spec in prompts['assets']:
 id=spec['id'];src=SRC/(id+'.png')
 if not src.exists():shutil.copy2(spec['path'],src)
 im=Image.open(src).convert('RGBA');row=dict(id=id,source=src.relative_to(ROOT).as_posix(),source_sha256=sha(src),source_bytes=src.stat().st_size,source_size=list(im.size),source_metrics=metrics(im),runtime=[])
 def save(image,name,size=None,q=82):
  image=ImageOps.contain(image,size,Image.Resampling.LANCZOS) if size else image
  p=OUT/name;image.save(p,'WEBP',quality=q,method=6,exact=True)
  actual=Image.open(p).convert('RGBA');row['runtime'].append(dict(path=p.relative_to(ROOT).as_posix(),size=list(actual.size),bytes=p.stat().st_size,sha256=sha(p),color_metrics=metrics(actual)))
  return actual
 if id=='icons':
  for n,name in enumerate(['battle','cards','wave','compass']):
   w,h=im.width/2,im.height/2;x,y=n%2,n//2;cell=im.crop((round(x*w),round(y*h),round((x+1)*w),round((y+1)*h)))
   bbox=cell.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox();cell=cell.crop(bbox)
   save(cell,'icon-'+name+'.webp',(128,128))
 elif id=='battlefield':
  save(im,id+'.webp',(1536,1024));save(im,'battlefield-low.webp',(960,640),45)
  save(ImageOps.fit(im.crop((0,int(im.height*.37),im.width,int(im.height*.66))),(384,96),Image.Resampling.LANCZOS),'waterline.webp',q=55)
 elif id=='logo':
  bbox=im.getchannel('A').point(lambda a:255 if a>24 else 0).getbbox();save(im.crop(bbox),id+'.webp',(850,360))
 else:
  sizes={'wave':(1152,768),'victory-navigator':(576,864),'frame':(256,384),'app-icon':(512,512)}
  save(im,id+'.webp',sizes.get(id,(384,384)),q=76 if id in cards else 82)
 if id in cards:
  p=ROOT/'assets/cards'/f'{id}.png';ImageOps.fit(im,(1024,1024),Image.Resampling.LANCZOS).save(p,optimize=True)
  row['runtime'].append(dict(path=p.relative_to(ROOT).as_posix(),size=[1024,1024],bytes=p.stat().st_size,sha256=sha(p),note='Canonical PNG contract; WebP is displayed by runtime.'))
 if id=='app-icon':
  for size in [192,512]:
   p=ROOT/'assets/icons'/f'icon-{size}.png';im.convert('RGB').resize((size,size),Image.Resampling.LANCZOS).save(p,optimize=True)
   row['runtime'].append(dict(path=p.relative_to(ROOT).as_posix(),size=[size,size],bytes=p.stat().st_size,sha256=sha(p)))
 if spec.get('transparent'):
  a=im.getchannel('A');hist=a.histogram();row['alpha']=dict(extrema=list(a.getextrema()),transparent_ratio=sum(hist[:16])/(im.width*im.height),center=a.getpixel((im.width//2,im.height//2)),native=True)
 ImageOps.contain(im,(64,64)).save(THUMB/f'{id}-64.png');manifest['assets'].append(row)
manifest['derived_runtime']=[]
for id in cards+['footman','archer']:
 source=SRC/(id+'.png') if id in cards else ART/'source'/(id+'.png')
 im=Image.open(source).convert('RGBA')
 if id=='archer':im=ImageEnhance.Color(im).enhance(1.08)
 p=OUT/(id+'-low.webp');ImageOps.fit(im,(256,256),Image.Resampling.LANCZOS).save(p,'WEBP',quality=55,method=6)
 manifest['derived_runtime'].append(dict(id=id+'-low',source=source.relative_to(ROOT).as_posix(),source_sha256=sha(source),path=p.relative_to(ROOT).as_posix(),size=[256,256],bytes=p.stat().st_size,sha256=sha(p),color_metrics=metrics(Image.open(p)),note='Responsive 1x derivative; same painting, not another generated asset. Archer preserves R75 saturation x1.08.'))
manifest['generated_master_count']=len(manifest['assets']);manifest['source_bytes']=sum(a['source_bytes'] for a in manifest['assets']);manifest['runtime_bytes']=sum(v['bytes'] for a in manifest['assets'] for v in a['runtime'])+sum(v['bytes'] for v in manifest['derived_runtime'])
(ART/'ASSET_MANIFEST_R76.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
sheet=Image.new('RGB',(7*112,2*112),'#201c3d');d=ImageDraw.Draw(sheet)
for i,a in enumerate(manifest['assets']):
 im=Image.open(THUMB/f"{a['id']}-64.png").convert('RGBA');x,y=(i%7)*112,(i//7)*112;sheet.paste(im,(x+24,y+4),im);d.text((x+2,y+78),a['id'][:17],fill='#f2f1fa')
sheet.save(THUMB/'contact-64.png')
for a in manifest['assets']:
 print(a['id'],a['runtime'][0].get('color_metrics'),a.get('alpha',''))
print('Generated masters',len(manifest['assets']),'runtime bytes',manifest['runtime_bytes'])
