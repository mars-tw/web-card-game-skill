"""Read-only source/runtime provenance, alpha, reference and color gates."""
from pathlib import Path
from PIL import Image
import json,hashlib
R=Path(__file__).resolve().parents[1];M=json.loads((R/'docs/art/ASSET_MANIFEST_R79.json').read_text(encoding='utf-8'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
assert M['generated_master_count']==9 and len(M['assets'])==9 and M['tool']=='image_gen.imagegen' and M['model_slug']is None
for a in M['assets']:
 p=R/a['source'];assert sha(p)==a['sha256']
 with Image.open(p)as im:
  assert list(im.size)==a['size'] and im.format=='PNG'
  if 'alpha'in a:assert im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0
  if a['id']=='frame':assert im.getchannel('A').getpixel((im.width//2,im.height//2))==0
 for x in a['references']:assert sha(R/x['path'])==x['sha256']
 for v in a['runtime']:
  p=R/v['path'];assert sha(p)==v['sha256']
  with Image.open(p)as im:assert im.format=='WEBP' and list(im.size)==v['size']
 if a['id']=='victory-navigator':assert a['metrics']['double_gate_pass'] and all(v['metrics']['double_gate_pass']for v in a['runtime'])
assert sha(R/'docs/art/character-sheets/navigator-r79.png')==sha(R/'docs/art/source/r79/navigator-sheet.png')
print('R79 assets:9 masters, all hashes/alpha/frame/reference/character double gates PASS')
