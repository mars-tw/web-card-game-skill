"""Hash-bound URLs share decoded/preloaded images and service-worker cache entries."""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1];j=json.loads((ROOT/'docs/art/ASSET_MANIFEST_R76.json').read_text(encoding='utf-8'))
versions={v['path']:v['sha256'][:8] for a in j['assets'] for v in a['runtime'] if v['path'].endswith('.webp')}
versions.update({v['path']:v['sha256'][:8] for v in j['derived_runtime']})
old=json.loads((ROOT/'docs/art/ASSET_MANIFEST.json').read_text(encoding='utf-8'))
versions.update({v['path']:v['sha256'][:8] for a in old['assets'] if a['id'] in ['footman','archer'] for v in a['runtime'] if v['path'].endswith('.webp')})
files=[ROOT/'sw.js',*ROOT.glob('templates/**/*.html'),*ROOT.glob('templates/**/*.css'),*ROOT.glob('templates/**/*.js')]
for p in files:
 s=p.read_text(encoding='utf-8');original=s
 for name,version in versions.items():
  s=re.sub(re.escape(name)+r'(?:\?v=[a-f0-9]{8})?',name+'?v='+version,s)
 if s!=original:p.write_text(s,encoding='utf-8')
p=ROOT/'templates/card-battle/index.html';s=p.read_text(encoding='utf-8')
low='assets/art/r76/battlefield-low.webp';high='assets/art/r76/battlefield.webp'
lowurl='../../'+low+'?v='+versions[low];highurl='../../'+high+'?v='+versions[high]
lines='<link rel="preload" as="image" href="'+lowurl+'" imagesrcset="'+lowurl+' 1x, '+highurl+' 2x" fetchpriority="high">\n'
lines+='<link rel="preload" as="image" href="../../assets/battlefields/white-tide-citadel-high.webp?v=f57dd495" fetchpriority="high">\n'
for id in ['emberpup','wolf','sparkSquire','alleySkirmisher','frontScout','firebolt','footman','archer']:
 low='assets/art/r76/'+id+'-low.webp';high='assets/art/'+('r75' if id in ['footman','archer'] else 'r76')+'/'+id+'.webp'
 lowurl='../../'+low+'?v='+versions[low];highurl='../../'+high+'?v='+versions[high]
 lines+='<link rel="preload" as="image" href="'+lowurl+'" imagesrcset="'+lowurl+' 1x, '+highurl+' 2x" fetchpriority="high">\n'
name='assets/art/r76/frame.webp';lines+='<link rel="preload" as="image" href="../../'+name+'?v='+versions[name]+'" fetchpriority="high">\n'
if '<!-- R76 first-deck preloads -->' not in s:s=s.replace('<link id="r67BattlefieldPreload"','<!-- R76 first-deck preloads -->\n'+lines+'<link id="r67BattlefieldPreload"')
else:s=re.sub(r'<!-- R76 first-deck preloads -->.*?(?=<link id="r67BattlefieldPreload")','<!-- R76 first-deck preloads -->\n'+lines,s,flags=re.S)
p.write_text(s,encoding='utf-8')
# Add the responsive derivative URLs to the same official offline cache.
p=ROOT/'sw.js';s=p.read_text(encoding='utf-8')
for v in j['derived_runtime']:
 url=v['path']+'?v='+v['sha256'][:8]
 if '"'+url+'"' not in s:s=s.replace('const CORE_ASSETS = [','const CORE_ASSETS = [\n  "'+url+'",')
p.write_text(s,encoding='utf-8')
