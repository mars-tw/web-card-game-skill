"""Read-only R78 artwork contract gate, suitable for npm test."""
from pathlib import Path
from PIL import Image
import json,hashlib,re
R=Path(__file__).resolve().parents[1];m=json.loads((R/'docs/art/ASSET_MANIFEST_R78.json').read_text(encoding='utf-8'))
assert m['generated_master_count']==9 and len(m['assets'])==9 and m['tool']=='image_gen.imagegen' and m['model_slug'] is None
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for a in m['assets']:
 p=R/a['source'];assert sha(p)==a['source_sha256']
 with Image.open(p)as im:
  assert im.format=='PNG' and list(im.size)==a['size']
  if 'alpha'in a:assert im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0 and im.getchannel('A').getextrema()[1]>=250
  if a['id']=='frame':assert im.getchannel('A').getpixel((im.width//2,im.height//2))==0
 for v in a['runtime']:
  p=R/v['path'];assert sha(p)==v['sha256']
  with Image.open(p)as im:assert im.format==v['format'] and list(im.size)==v['size']
 if a['id']=='navigator':assert a['source_metrics']['double_gate_pass'] and all(v['metrics']['double_gate_pass']for v in a['runtime'])
 if 'reference'in a:assert sha(R/a['reference']['path'])==a['reference']['sha256']
assert sha(R/'docs/art/character-sheets/navigator-r78.png')==sha(R/'docs/art/source/r78/navigator-sheet.png')
sw=(R/'sw.js').read_text(encoding='utf-8');block=sw.split('const CORE_ASSETS = [',1)[1].split('].map',1)[0]
requests=re.findall(r'^\s*"([^"\n]+)"',block,re.M);assert len(requests)==len(set(requests)), 'duplicate SW install request'
print('R78 assets: 9 originals, source/runtime hashes, native alpha, open frame, reference sheet and character double gates PASS')
