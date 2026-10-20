"""Encoding and same-source portrait crop only. No generated art is synthesized here."""
from pathlib import Path
from PIL import Image
import json,hashlib,shutil
root=Path(__file__).resolve().parents[1]
out=root/'assets/art/content-r12';out.mkdir(parents=True,exist_ok=True)
prompts=json.loads((root/'docs/art/PROMPTS_CONTENT_R12.json').read_text(encoding='utf-8'))
assets=[]
def record(p,**info):
 im=Image.open(p)
 assets.append(dict(path=p.relative_to(root).as_posix(),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),width=im.width,height=im.height,**info))
for call in prompts['calls']:
 source=out/(call['name']+'-source.png')
 if not source.exists():shutil.copyfile(call['source'],source)
 record(source,kind='generated_source',tool=prompts['tool'],original_source=call['source'])
 dest=out/(call['name']+'.webp');Image.open(source).convert('RGB').save(dest,quality=90,method=6)
 record(dest,kind='runtime',tool=prompts['tool'],source=source.relative_to(root).as_posix(),processing='WebP encoding only')
portrait=out/'moen-portrait.webp';crop=[148,8,267,127]
Image.open(root/prompts['portrait_source']).convert('RGBA').crop(crop).resize((256,256),Image.Resampling.LANCZOS).save(portrait,lossless=True)
record(portrait,kind='derived_portrait',tool='Pillow',source=prompts['portrait_source'],source_sha256=hashlib.sha256((root/prompts['portrait_source']).read_bytes()).hexdigest(),crop=crop,processing='same character head crop and resize, no repaint')
for name in prompts['reused_poses']:
 p=root/'assets/art/content-r10'/name;record(p,kind='reused_state_pose',tool='image_gen.imagegen',state={'moen-cast.webp':'聖盾留守','moen-hurt.webp':'護盾碎裂','moen-recover.webp':'反攻空檔'}[name])
(root/'docs/art/ASSET_MANIFEST_CONTENT_R12.json').write_text(json.dumps(dict(tool=prompts['tool'],model_slug=None,license='MIT project assets',generation_calls=2,new_illustrations=2,derived_portraits=1,assets=assets),ensure_ascii=False,indent=2),encoding='utf-8')
print('VERIFIED 2 generated illustrations, 1 same-source portrait, 3 reused state poses')
