"""Deterministic atlas slicing only; never paints or synthesizes artwork."""
from pathlib import Path
from PIL import Image
import json,hashlib,shutil
R=Path(__file__).resolve().parents[1]
out=R/'assets/art/content-r10';out.mkdir(parents=True,exist_ok=True)
poses=R/'assets/animations/content-r10';poses.mkdir(parents=True,exist_ok=True)
p=json.loads((R/'docs/art/PROMPTS_CONTENT_R10.json').read_text(encoding='utf8'))
assets=[]
def record(file,**info):
 im=Image.open(file);assets.append(dict(path=file.relative_to(R).as_posix(),sha256=hashlib.sha256(file.read_bytes()).hexdigest(),width=im.width,height=im.height,alpha=im.mode=='RGBA' and im.getextrema()[3][0]==0,**info))
for c in p['calls']:
 dest=out/(c['name']+'.png')
 if not dest.exists():shutil.copyfile(c['source'],dest)
 record(dest,tool=p['tool'],kind='generated_source')
def cut(source,box,dest):
 im=Image.open(out/source).convert('RGBA').crop(box)
 # Keep full cell and add transparent breathing room; no inpainting or artwork edits.
 padded=Image.new('RGBA',(im.width+32,im.height+32));padded.paste(im,(16,16))
 padded.save(dest,lossless=True);record(dest,source='assets/art/content-r10/'+source,crop=box,processing='atlas crop plus transparent 16px padding')
a=Image.open(out/'actors-atlas.png');w,h=a.size
for i,name in enumerate(['ready','cast','hurt','recover','defeated']):
 edges=[0,395,850,1200,1602,w]
 cut('actors-atlas.png',(edges[i],0,edges[i+1],round(h/2) if i<4 else 440),out/('moen-'+name+'.webp'))
a=Image.open(out/'knight-atlas.png');w,h=a.size
for i,name in enumerate(['anticipation','impact','recovery','hurt','death','break']):
 x=i%3;y=i//3;split=round(h*.53125);edges=[0,512,1032,w] if y else [0,512,1024,w];cut('knight-atlas.png',(edges[x],0 if y==0 else split,edges[x+1],split if y==0 else h),poses/('knight-'+name+'.webp'))
a=Image.open(out/'footman-atlas.png');w,h=a.size
for i,name in enumerate(['anticipation','impact','recovery','hurt','death']):
 x=i%3;y=i//3;cut('footman-atlas.png',(round(x*w/3),0 if y==0 else 507,round((x+1)*w/3),507 if y==0 else h),poses/('footman-'+name+'.webp'))
a=Image.open(out/'anchors-atlas.png');w,h=a.size
for i,name in enumerate(['puzzles','forecast','moen']):
 cut('anchors-atlas.png',(round(i*w/3),0,round((i+1)*w/3),h),out/('anchor-'+name+'.webp'))
(R/'docs/art/ASSET_MANIFEST_CONTENT_R10.json').write_text(json.dumps(dict(tool=p['tool'],model_slug=None,license='MIT project assets',generation_calls=len(p['calls']),runtime_assets=19,assets=assets),ensure_ascii=False,indent=2),encoding='utf8')
print('VERIFIED',len(assets),'assets;',len(p['calls']),'generation calls, 19 runtime slices')
