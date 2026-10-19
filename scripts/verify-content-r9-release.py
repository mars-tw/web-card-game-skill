"""Local R9 release contract: actual command exits, native images and source hashes."""
from pathlib import Path
from PIL import Image
import ast,datetime,hashlib,json,re,subprocess
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r9'
read=lambda p:json.loads((R/p).read_text(encoding='utf8'))
sha=lambda p:hashlib.sha256((R/p).read_bytes()).hexdigest()
tree=ast.parse((R/'scripts/run-content-r9-checks.py').read_text(encoding='utf8'))
commands=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='commands' for t in n.targets))
latest={x['name']:x for x in read('docs/content/r9/checks/exits.json')}
assert len(commands)==19
for name,cmd in commands:
 assert name in latest and latest[name]['exit']==0,(name,latest.get(name))
 assert (R/latest[name]['log']).is_file(),name
package=read('package.json');lock=read('package-lock.json')
assert package['version']==lock['version']==lock['packages']['']['version']=='0.22.0'
assert len(package['scripts']['test:e2e'].split(' && '))==18
unit=(R/latest['unit']['log']).read_text(encoding='utf8')
assert int(re.search(r'Content R9 rules:\s*(\d+) PASS',unit).group(1))>=48
assert read('docs/content/r9/acceptance.json')['checks']>=148
assert read('docs/content/r9/r9-acceptance.json')['checks']>=99
assert read('docs/content/r9/return-tide.json')['checks']>=13
index=read('docs/content/r9/review-set-index.json')
assert index['distribution']=={'puzzles':5,'forecast':5,'moen':5}
assert len(index['images'])==len(list((O/'review-set').glob('*.png')))==15
for x in index['images']:
 assert sha(x['file'])==sha(x['source'])==x['sha256'],x['file']
 assert Image.open(R/x['file']).size==(390,844)
inventory=read('docs/content/r9/screenshot-inventory.json')
for x in inventory['images']:
 assert sha(x['path'])==x['sha256'] and Image.open(R/x['path']).size==(390,844)
store=read('docs/content/r9/store-screenshots.json');assert len(store['images'])==4
for x in store['images']:
 assert sha(x['path'])==x['sha256'] and Image.open(R/x['path']).size in {(1290,2796),(2064,2752)}
art=read('docs/art/ASSET_MANIFEST_CONTENT_R9.json');assert art['tool']=='image_gen.imagegen' and len(art['assets'])==11
sw=(R/'sw.js').read_text(encoding='utf8')
for x in art['assets']:
 assert sha(x['path'])==x['sha256']
 im=Image.open(R/x['path']);assert im.mode=='RGBA' and im.getextrema()[3][0]==0 and im.getextrema()[3][1]>0
 if x['path'].endswith('.webp'):assert x['path'] in sw
frames=read('docs/content/r9/frame-times.json')
assert frames['status']=='VERIFIED' and frames['concurrentMachine'] and all(x['median']<=18 for x in frames['result'])
assert read('docs/content/r9/secret-scan.json')['hits']==[]
preservation=read('docs/content/r9/preservation.json');assert preservation['status']=='VERIFIED' and preservation['incomingUntrackedDeleted'] is False
assert subprocess.check_output(['git','branch','--show-current'],cwd=R).decode().strip()=='main'
sources=['CREDITS.md','index.html','package.json','package-lock.json','sw.js','templates/index.html','templates/harbor.html','templates/card-battle/index.html','templates/card-pack/index.html','templates/card-battle/battle.js','templates/card-battle/content-r6.js','templates/card-battle/tide-puzzles.js','templates/card-battle/tide-session.js','templates/card-battle/pose-player.js','templates/card-battle/content-r9.js','templates/card-battle/content-r9.css','scripts/test-battle-e2e.js','scripts/test-content-r1-e2e.js','scripts/test-content-r9.js','scripts/test-content-r9-e2e.js','scripts/test-content-r9-acceptance.js','scripts/test-content-r9-return.js','scripts/capture-content-r9-puzzles.js','scripts/run-content-r9-checks.py','scripts/r9-evidence-guard.js','scripts/finalize-content-r9.py']
for p in sources:
 if p.startswith('templates/') or p in {'index.html','sw.js','package.json','package-lock.json'}:
  data=(R/p).read_text(encoding='utf8');assert 'card-battle-content-r8-v1' not in data and '0.21.0' not in data,p
receipt={'status':'VERIFIED','generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'version':'0.22.0','cacheVersion':'card-battle-content-r9-v1','localOnly':True,'requiredCommandGroups':19,'latestTests':{name:latest[name] for name,_ in commands},'sourceHashes':{p:sha(p) for p in sources},'reviewIndexSha256':sha('docs/content/r9/review-set-index.json'),'phoneOriginals':len(inventory['images']),'storeImages':4,'runtimePoseFrames':10,'retainedSourceAtlases':1,'secretMatches':0,'frameP95ConcurrentReference':frames['result'],'blocked':['physical devices','human playtests','exclusive-machine performance','Muse actual rescore','remaining full character pose sets','atlas sword-tip edge refinement']}
(O/'release-gates.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf8')
print('VERIFIED 19 command groups, 15 review originals, 4 store images, 10 pose frames, current source hashes and secret scan zero')
