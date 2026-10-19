"""Verify review copies and restore only test-generated historical documents."""
from pathlib import Path
import hashlib,json,shutil,subprocess,re
from PIL import Image
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r9';B=R/'.audit-tmp/content-r9-baseline'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
restored=json.loads((O/'preservation.json').read_text(encoding='utf8')).get('restoredTestOutputs',[]) if (O/'preservation.json').exists() else []
items=json.loads((B/'inventory.json').read_text(encoding='utf8'))
for x in items:
 p=R/x['path'];assert p.is_file(),x['path']
 if sha(p)!=x['sha256']:
  assert x['path'].startswith(('docs/evidence/','docs/content/r')) or x['path'] in {'docs/art/ASSET_MANIFEST.json','docs/art/ASSET_MANIFEST_R76.json'},'Unexpected original document change: '+x['path']
  receipt=O/'test-generated'/x['path'];receipt.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,receipt)
  shutil.copy2(B/x['path'],p)
  if x['path'] not in restored:restored.append(x['path'])
 assert sha(p)==x['sha256'],x['path']
(O/'preservation.json').write_text(json.dumps({'status':'VERIFIED','incomingTextFiles':len(items),'restoredTestOutputs':restored,'guard':'scripts/r9-evidence-guard.js','incomingUntrackedDeleted':False},indent=2),encoding='utf8')
frames=O/'legacy-receipts/docs/content/r8/frame-times.json'
if frames.exists():shutil.copy2(frames,O/'frame-times.json')
review=[
 ('puzzle-spell-playing','殘局：真實火焰箭手牌四邊完整；目標、限制、潮能分層'),
 ('puzzle-shield-playing','殘局：聖盾阻擋條件，首屏不洩漏完整解法'),
 ('puzzle-shelter-playing','殘局：保住弓手的勝利限制'),
 ('exchange-preview','殘局：確認前各卡真實血量預測與潮能'),
 ('exchange-live-result','殘局：實際確認後弓手1血、獅鷲4血；按裂潮提示完整'),
 ('forecast-fixed-held','預報：按住預覽，固定面板與完整戰場'),
 ('forecast-unready-title','預報：潮能未滿標題、單人對戰獨立一行'),
 ('forecast-reversed-flood-before','預報：真正抵達被反轉的第三回合，尚未扣血'),
 ('forecast-reversed-flood-impact','預報：接續上一格，英雄5→3與騎士4→3傷害收據'),
 ('forecast-second-ebb-shields','預報：真正抵達反轉的第二回合，兩名友軍各聖盾×1'),
 ('moen-r9-before','茉恩：治療前；1.5倍立繪不壓卡、單行敵名與退潮守約'),
 ('moen-r9-impact','茉恩：連續命中，英雄治療4→7與騎士聖盾×1分開'),
 ('moen-r9-broken','茉恩：破盾後標籤消失、騎士仍4血，立繪不壓卡'),
 ('moen-return-wolf-spent','茉恩：狼已行動，提示明示下回合補刀'),
 ('moen-return-wolf-ready','茉恩：接續14同一場，追加治療3→5後狼恢復可行動，提示時機一致'),
]
dest=O/'review-set';dest.mkdir(exist_ok=True);index=[]
for n,(name,proof) in enumerate(review,1):
 src=O/f'phone-{name}.png';target=dest/f'{n:02d}-{name}.png';assert Image.open(src).size==(390,844),src
 shutil.copy2(src,target);assert sha(src)==sha(target)
 index.append({'file':target.relative_to(R).as_posix(),'source':src.relative_to(R).as_posix(),'sha256':sha(src),'size':[390,844],'proof':proof})
assert len(list(dest.glob('*.png')))==15,'review-set must contain exactly 15 originals'
(O/'review-set-index.json').write_text(json.dumps({'status':'VERIFIED','distribution':{'puzzles':5,'forecast':5,'moen':5},'images':index,'limit':'Not every supplementary proof fits 15 images; complete unselected proof inventory is separate.'},ensure_ascii=False,indent=2),encoding='utf8')
screens=[]
for p in sorted(O.glob('phone-*.png')):
 assert Image.open(p).size==(390,844),p
 screens.append({'path':p.relative_to(R).as_posix(),'size':[390,844],'sha256':sha(p)})
(O/'screenshot-inventory.json').write_text(json.dumps({'status':'VERIFIED','images':screens},indent=2),encoding='utf8')
store=[]
for p in sorted((R/'docs/store/screenshots').glob('content-r9-*.png')):
 size=Image.open(p).size;assert size in {(1290,2796),(2064,2752)},(p,size)
 store.append({'path':p.relative_to(R).as_posix(),'size':size,'sha256':sha(p)})
assert len(store)>=2
(O/'store-screenshots.json').write_text(json.dumps({'status':'VERIFIED','images':store,'method':'Native viewport and DPR browser captures, not rescaled composites.'},indent=2),encoding='utf8')
compare=R/'docs/evidence/content-r9';pairs=[]
for name,old,new in [('puzzle','exchange-confirmed','exchange-live-result'),('forecast','forecast-held','forecast-fixed-held'),('moen','moen-impact','moen-r9-impact')]:
 for state,src in [('before',R/f'docs/content/r8/phone-{old}.png'),('after',O/f'phone-{new}.png')]:
  target=compare/state/f'{name}.png';target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,target)
  pairs.append({'name':name,'state':state,'path':target.relative_to(R).as_posix(),'source':src.relative_to(R).as_posix(),'sha256':sha(src),'historical':state=='before'})
(compare/'provenance.json').write_text(json.dumps({'status':'VERIFIED','images':pairs,'before':'Historical R8 original copies, not a newly executed baseline.'},indent=2),encoding='utf8')
patterns=[re.compile(rb'sk-proj-[A-Za-z0-9_-]{20}'),re.compile(rb'sk-[a-z0-9]{40}',re.I)]
paths=set(subprocess.check_output(['git','ls-files'],cwd=R).decode('utf8').splitlines())
for folder in ['docs/content/r9','assets/animations/content-r9']:
 paths.update(p.relative_to(R).as_posix() for p in (R/folder).rglob('*') if p.is_file())
paths.update(['templates/card-battle/content-r9.js','templates/card-battle/content-r9.css','docs/art/PROMPTS_CONTENT_R9.json','docs/art/ASSET_MANIFEST_CONTENT_R9.json'])
paths.update(p.relative_to(R).as_posix() for p in (R/'scripts').glob('*r9*') if p.is_file())
hits=[];scanned=0
for rel in sorted(paths):
 p=R/rel
 if not p.is_file() or p.suffix.lower() in {'.png','.webp','.jpg','.gif','.woff','.woff2','.mp4','.zip'}:continue
 data=p.read_bytes();scanned+=1
 if any(pattern.search(data) for pattern in patterns):hits.append(rel)
(O/'secret-scan.json').write_text(json.dumps({'status':'VERIFIED' if not hits else 'BLOCKED','filesScanned':scanned,'hits':hits,'scope':'Tracked repository text plus owned R9 runtime, evidence and manifests; no secret directory accessed.'},indent=2),encoding='utf8');assert not hits,'Secret pattern detected; values never printed'
print('VERIFIED',len(items),'preserved documents;',len(screens),'phone originals;',len(store),'store images; 15 review copies; secret scan zero')
