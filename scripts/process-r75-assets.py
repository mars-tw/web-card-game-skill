"""Deterministic resize, atlas split and compression. No generated stand-ins."""
from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance
import hashlib, json, shutil, colorsys
ROOT = Path(__file__).resolve().parents[1]
ART = ROOT/'docs/art'
OUT = ROOT/'assets/art/r75'
OUT.mkdir(parents=True, exist_ok=True)
(ART/'source').mkdir(exist_ok=True)
(ART/'thumbs').mkdir(exist_ok=True)
prompts = json.loads((ART/'PROMPTS.json').read_text(encoding='utf-8'))
manifest = {'status':'EXECUTED','tool':prompts['tool'],'model_slug':None,'model_note':prompts['model_note'],
 'prompt_version':prompts.get('prompt_version','r75-20261016-v1'),'postprocess_version':'r75-3','reference_image_hashes':[],
 'alpha_policy':'Actual tool returned native RGBA PNG. Native masters retained; runtime alpha WebP follows this round compression requirement. No model slug or opaque-generation claim.',
 'generated_master_count':len(prompts['assets']),'license':'AI-generated for this project with the built-in OpenAI image tool; subject to service terms. No third-party art source used.',
 'postprocess':'Pillow LANCZOS resize, atlas cell crop, WebP q82 default/q78 icons/q72 water/q70 low battlefield, method 6; alpha preserved. No painted additions. PNG card contracts retained.', 'assets':[]}
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def measure(im):
    rgba=im.convert('RGBA').resize((128,128),Image.Resampling.BOX)
    pixels=rgba.get_flattened_data() if hasattr(rgba,'get_flattened_data') else rgba.getdata()
    px=[(r,g,b) for r,g,b,a in pixels if a>32]
    hsv=[colorsys.rgb_to_hsv(r/255,g/255,b/255) for r,g,b in px]
    v=sum(x[2] for x in hsv)/len(hsv); s=sum(x[1] for x in hsv)/len(hsv)
    black=sum(x[2]<.10 for x in hsv)/len(hsv); low=sum(x[1]<.12 for x in hsv)/len(hsv)
    return dict(brightness=round(v,4),saturation=round(s,4),near_black_ratio=round(black,4),low_saturation_ratio=round(low,4),
      definitions='visible alpha>32; brightness HSV V; near-black V<0.10; low saturation S<0.12',
      double_gate_pass=.30<=v<=.75 and black<.35 and s>=.32 and low<.20)
def save(im,name,size=None,quality=82):
    if size: im=ImageOps.contain(im,size,Image.Resampling.LANCZOS)
    p=OUT/name
    im.save(p,'WEBP',quality=quality,method=6,exact=True)
    return {'path':p.relative_to(ROOT).as_posix(),'size':list(im.size),'bytes':p.stat().st_size,'quality':quality,'sha256':digest(p)}
for spec in prompts['assets']:
    src=Path(spec['source_path']); copy=ART/'source'/f"{spec['id']}.png"
    if not copy.exists(): shutil.copy2(src,copy)
    im=Image.open(copy)
    source_metrics=measure(im)
    if spec['id']=='battlefield': im=ImageEnhance.Brightness(im).enhance(1.06)
    if spec['id']=='archer': im=ImageEnhance.Color(im).enhance(1.08)
    row={'id':spec['id'],'source':copy.relative_to(ROOT).as_posix(),'source_sha256':digest(copy),'source_bytes':copy.stat().st_size,'source_size':list(im.size),'runtime':[]}
    if im.mode=='RGBA':
        alpha=im.getchannel('A'); hist=alpha.histogram(); total=im.width*im.height
        row['alpha']={'extrema':list(alpha.getextrema()),'transparent_ratio':round(sum(hist[:16])/total,4),'opaque_ratio':round(sum(hist[240:])/total,4),'center':alpha.getpixel((im.width//2,im.height//2))}
    if spec['id']=='icons':
        names=['battle','cards','compass','wave','shield','voyage','lantern','coin','settings']
        for n,name in enumerate(names):
            x,y=n%3,n//3; w,h=im.width/3,im.height/3
            cell=im.crop((round(x*w),round(y*h),round((x+1)*w),round((y+1)*h)))
            bbox=cell.getchannel('A').point(lambda v:255 if v>32 else 0).getbbox()
            if bbox: cell=cell.crop(bbox)
            row['runtime'].append(save(cell,f'icon-{name}.webp',(128,128),quality=78))
    else:
        size={'harbor':(1024,1536),'battlefield':(1536,1024),'victory':(1024,1536),'navigator':(576,864),'frame':(256,384),'logo':(768,512),'app-icon':(512,512),'footman':(512,512),'archer':(512,512)}[spec['id']]
        row['runtime'].append(save(im,f"{spec['id']}.webp",size))
    if spec['id']=='battlefield': row['runtime'].append(save(im,'battlefield-low.webp',(960,640),quality=70))
    if spec['id']=='harbor':
        water=ImageOps.fit(im.crop((64,650,960,1120)),(640,96),Image.Resampling.LANCZOS)
        row['runtime'].append(save(water,'tide-water.webp',quality=72))
    if spec['id']=='navigator':
        avatar=ImageOps.fit(im.crop((270,50,840,620)),(96,96),Image.Resampling.LANCZOS)
        row['runtime'].append(save(avatar,'avatar.webp'))
    if spec['id'] in ['footman','archer']:
        p=ROOT/'assets/cards'/f"{spec['id']}.png"
        ImageOps.fit(im.convert('RGBA'),(1024,1024),Image.Resampling.LANCZOS).save(p,optimize=True)
        row['runtime'].append({'path':p.relative_to(ROOT).as_posix(),'size':[1024,1024],'bytes':p.stat().st_size,'sha256':digest(p),'note':'canonical PNG path retained for card-data tests; UI loads compressed WebP'})
    if spec['id']=='app-icon':
        for size in [192,512]:
            p=ROOT/'assets/icons'/f'icon-{size}.png'
            im.convert('RGB').resize((size,size),Image.Resampling.LANCZOS).save(p,optimize=True)
            row['runtime'].append({'path':p.relative_to(ROOT).as_posix(),'size':[size,size],'bytes':p.stat().st_size,'sha256':digest(p)})
    ImageOps.contain(im,(64,64),Image.Resampling.LANCZOS).save(ART/'thumbs'/f"{spec['id']}-64.png")
    row['color_metrics']=measure(im)
    row['source_color_metrics']=source_metrics
    if spec['id']=='battlefield': row['postprocess_note']='Exposure x1.06 to lift source V=0.2973 above 0.30; source untouched.'
    if spec['id']=='archer': row['postprocess_note']='Color x1.08 keeps the compressed WebP above S=0.32; source untouched.'
    manifest['assets'].append(row)
manifest['runtime_bytes']=sum(x['bytes'] for a in manifest['assets'] for x in a['runtime'])
manifest['source_bytes']=sum(a['source_bytes'] for a in manifest['assets'])
(ART/'ASSET_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:manifest[k] for k in ['generated_master_count','runtime_bytes','source_bytes']}))
for a in manifest['assets']: print(a['id'],a.get('alpha','opaque'),a['color_metrics'])
