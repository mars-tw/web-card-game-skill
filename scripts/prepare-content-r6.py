from pathlib import Path
from PIL import Image
import json, hashlib, shutil

R=Path(__file__).resolve().parents[1]
# Only new runtime/source paths; no previous art is overwritten.
source=R/'docs/art/source/content-r6/moen-poses.png'
out=R/'assets/art/content-r6';out.mkdir(parents=True,exist_ok=True)
src=R/'docs/art/source/content-r6';src.mkdir(parents=True,exist_ok=True)
if source.resolve()!=(src/'moen-poses.png').resolve():shutil.copyfile(source,src/'moen-poses.png')
im=Image.open(source).convert('RGBA');assert im.size==(1536,1024) and im.getextrema()[3][0]==0
files=[]
for i in range(3):
    tile=im.crop((i*512,0,(i+1)*512,1024));tile.thumbnail((384,768))
    target=out/f'moen-{i}.webp';tile.save(target,quality=90,method=6)
    files.append(dict(path=target.relative_to(R).as_posix(),sha256=hashlib.sha256(target.read_bytes()).hexdigest(),width=tile.width,height=tile.height,alphaMin=tile.getextrema()[3][0]))
(R/'docs/art/ASSET_MANIFEST_CONTENT_R6.json').write_text(json.dumps(dict(round='CONTENT_R6',status='VERIFIED',tool='image_gen.imagegen',model_slug=None,newOriginals=1,newRuntimeCrops=3,source=dict(path='docs/art/source/content-r6/moen-poses.png',sha256=hashlib.sha256(source.read_bytes()).hexdigest()),files=files,processing='Equal-panel crop, resize, WebP compression; alpha preserved. No repainted art.'),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
