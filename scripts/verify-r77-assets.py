"""Verify published-art contracts without mutating source or historic manifests."""
from pathlib import Path
from PIL import Image
import json,hashlib
ROOT=Path(__file__).resolve().parents[1];m=json.loads((ROOT/'docs/art/ASSET_MANIFEST_R77.json').read_text(encoding='utf-8'))
assert m['tool']=='image_gen.imagegen' and m['model_slug'] is None
assert m['generated_master_count']==10 and len(m['assets'])==10
for a in m['assets']:
 p=ROOT/a['source'];assert hashlib.sha256(p.read_bytes()).hexdigest()==a['source_sha256']
 with Image.open(p) as im:
  assert im.format=='PNG' and list(im.size)==a['size']
  if 'alpha' in a:
   extrema=im.getchannel('A').getextrema()
   assert im.mode=='RGBA' and extrema[0]==0 and extrema[1]>=250  # Native outputs may stop at253/254; do not invent opaque pixels.
   assert a['alpha']['transparent_ratio']>.1
  if a['id']=='frame':assert im.getchannel('A').getpixel((im.width//2,im.height//2))==0
 for v in a['runtime']:
  p=ROOT/v['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==v['sha256']
  with Image.open(p) as im:assert im.format==v['format'] and list(im.size)==v['size']
 if a['id']=='victory-navigator':
  assert a['source_metrics']['double_gate_pass'] and a['runtime'][0]['metrics']['double_gate_pass']
 if 'reference'in a:assert hashlib.sha256((ROOT/a['reference']['path']).read_bytes()).hexdigest()==a['reference']['sha256']
print('R77 assets: 10 PNG masters, native alpha, transparent frame, runtime/reference hashes and protagonist double gates PASS')
