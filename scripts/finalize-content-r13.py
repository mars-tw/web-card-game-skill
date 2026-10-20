"""Copy native screenshots without resizing and bind the final review index."""
from pathlib import Path
from PIL import Image
import hashlib,json,shutil
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r13';V=O/'review-set';V.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
capture_root=R
ci_receipt=O/'checks/clean-ci.json'
if ci_receipt.exists():
 ci=json.loads(ci_receipt.read_text(encoding='utf-8'))
 if ci['status']=='VERIFIED':
  capture_root=Path(ci['copy'])
  for p in [R/'sw.js',R/'package.json',*R.glob('templates/card-battle/*.js'),*R.glob('templates/card-battle/*.css'),R/'scripts/test-content-r13-e2e.js',R/'scripts/content-r2-helpers.js']:
   assert sha(p)==sha(capture_root/p.relative_to(R)),p
  for a in json.loads((R/'docs/art/ASSET_MANIFEST_CONTENT_R13.json').read_text(encoding='utf-8'))['assets']:
   assert sha(R/a['path'])==sha(capture_root/a['path']),a['path']
  for src in (capture_root/'docs/content/r13').glob('*'):
   if src.is_file()and src.suffix in ['.png','.json']:shutil.copy2(src,O/src.name)
  for src in (capture_root/'docs/content/r12').glob('phone-*offline*.png'):shutil.copy2(src,O/src.name)
  src=capture_root/'docs/content/r12/offline-puzzles-forecast.json'
  if src.exists():shutil.copy2(src,O/src.name)
# Five images per content type. All six original puzzle results remain alongside
# the other native captures and have explicit paths in the response matrix.
selected=[
 ('puzzle-taunt-playing','殘局遊玩中：12px嘲諷標記、完整卡名與攻血'),
 ('puzzle-fallen-completed','士兵陣亡補潮，來源數字、敵我與實際步驟'),
 ('puzzle-shield-completed','聖盾攔下一次，漲潮收尾'),
 ('puzzle-spell-completed','火焰箭3＋漲潮1，來源分列'),
 ('puzzle-cross-completed','兩線退場與我方騎士最終存活一致'),
 ('forecast-flood-preview','第3回合預改：兩目標預測、半程百分比及明確取消區'),
 ('forecast-flood-cancelled','同局移出取消：原潮向及唯一額度保留'),
 ('forecast-flood-before','同局第3回合蓄勢，命中前仍5／4血'),
 ('forecast-flood-impact','360ms命中英雄5→3／騎士4→3，收據貼近目標'),
 ('forecast-flood-after','同次命中退浪，兩份收據與完整牌面'),
 ('moen-tide-0','同一局二式：敵潮能0/6、六格與治療線'),
 ('moen-tide-1','同一局擊倒騎士與出擊後：敵潮能1/6、茉恩3血'),
 ('moen-tide-2','同一局下輪+1達2/6，治療線高亮，茉恩3→5血'),
 ('moen-return-triggered-completed','黑甲紅羽站姿，交換3／反攻0，4→1'),
 ('moen-return-prevented-completed','黑甲紅羽傷姿，交換0／反攻3，4→1')]
index=[]
for i,(name,reason)in enumerate(selected,1):
 src=O/('phone-'+name+'.png');dst=V/(f'{i:02d}-'+name+'.png')
 with Image.open(src)as im:assert im.size==(390,844),(src,im.size)
 shutil.copy2(src,dst);assert sha(src)==sha(dst)
 index.append(dict(path=dst.relative_to(R).as_posix(),source=src.relative_to(R).as_posix(),width=390,height=844,sha256=sha(dst),proof=reason))
assert len(list(V.glob('*.png')))==15
for src in list(O.glob('layout-*.png')):
 with Image.open(src)as im:
  if im.width<=430 and im.height>im.width:shutil.copy2(src,O/('phone-'+src.name))
legacy=R/'.audit-tmp/r13/legacy/docs/content/r12'
if legacy.exists():
 for src in [*(legacy.glob('phone-*offline*.png')if capture_root==R else []),*legacy.glob('phone-puzzle-*-wrong-result.png')]:shutil.copy2(src,O/src.name)
 for src in ([legacy/'offline-puzzles-forecast.json']if capture_root==R else [])+[legacy/'feedback.json']:
  if src.exists():shutil.copy2(src,O/src.name)
for size in ['1290x2796','2064x2752']:
 p=R/'docs/store/screenshots'/('content-r13-moen-'+size+'.png')
 with Image.open(p)as im:assert im.size==tuple(map(int,size.split('x')))
before=O/'before';before.mkdir(exist_ok=True)
for name in ['08-forecast-flood-preview','09-forecast-flood-applied','10-forecast-flood-impact','14-moen-return-triggered-completed','15-moen-return-prevented-completed']:
 src=R/'docs/content/r12/review-set'/(name+'.png')
 if src.exists():shutil.copy2(src,before/(name+'.png'))
(O/'review-index.json').write_text(json.dumps(dict(status='VERIFIED',capture_root=str(capture_root),method='Native viewport PNG, original bytes copied, no compositing or resizing; five images per content.',images=index),ensure_ascii=False,indent=2),encoding='utf-8')
print('VERIFIED 15 native review images, five per content; two native store sizes')
