"""Read back gate receipts, preserve original screenshots, and assemble the review set."""
from pathlib import Path
from PIL import Image
import hashlib,json,shutil,subprocess,re
root=Path(__file__).resolve().parents[1]
out=root/'docs/content/r12';review=out/'review-set';review.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
selected=[
 ('puzzle-fallen-completed','士兵陣亡補潮、浪潮斬殺的完整解題收據'),
 ('puzzle-shield-completed','破盾一次與真正潮傷收割的解題收據'),
 ('puzzle-shelter-completed','退潮聖盾保住弓手、狼退場'),
 ('puzzle-taunt-completed','嘲諷被清除後狼直取英雄的收據'),
 ('puzzle-spell-completed','火焰箭3＋浪潮1的實際傷害拆解'),
 ('puzzle-cross-completed','雙線交換後的傷害、存活及潮能收據'),
 ('forecast-flood-preview','同局第1回合按住半秒，預改第3回合、半環及敵方目標預算'),
 ('forecast-flood-applied','同局第3回合改為漲潮，仍能撤回'),
 ('forecast-flood-impact','同局到第3回合施放：英雄5→3、騎士4→3；收據不遮詳情'),
 ('moen-heal-impact','藍袍同源頭像、茉恩聖盾留守姿勢、360ms自己4→7與嘲諷／聖盾'),
 ('moen-broken','同局聖盾碎裂、騎士仍4血，茉恩持續不同受挫姿勢'),
 ('moen-opening','同局敵騎士2血，茉恩低姿反攻空檔；三行資訊與完整卡框'),
 ('moen-return-triggered-completed','治療觸發：不同插圖、實際回血、沒有反攻的結尾'),
 ('moen-return-prevented-completed','治療阻止：不同插圖、3傷代價、騎士存活1血的結尾')]
selected.insert(6,('puzzle-taunt-marked','正常遊玩進行中的嘲諷題；左側石牆標記、完整卡名／攻血，與聖盾區分'))
index=[]
for i,(name,reason) in enumerate(selected,1):
 source=out/('phone-'+name+'.png');target=review/(str(i).zfill(2)+'-'+name+'.png')
 with Image.open(source) as im:assert im.size==(390,844),(source,im.size)
 shutil.copyfile(source,target);assert sha(source)==sha(target)
 index.append(dict(order=i,path=target.relative_to(root).as_posix(),source=source.relative_to(root).as_posix(),width=390,height=844,sha256=sha(target),purpose=reason))
assert len(list(review.glob('*.png')))==15
(out/'review-set-index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2),encoding='utf-8')
inventory=[]
for p in sorted(out.rglob('*.png')):
 with Image.open(p) as im:inventory.append(dict(path=p.relative_to(root).as_posix(),width=im.width,height=im.height,sha256=sha(p)))
for size in [(1290,2796),(2064,2752)]:
 p=root/f'docs/store/screenshots/content-r12-moen-{size[0]}x{size[1]}.png'
 with Image.open(p) as im:assert im.size==size
 inventory.append(dict(path=p.relative_to(root).as_posix(),width=size[0],height=size[1],sha256=sha(p)))
(out/'screenshot-inventory.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2),encoding='utf-8')
before_after=root/'docs/evidence/content-r12';before_after.mkdir(parents=True,exist_ok=True)
for feature,old,new in [('puzzle','phone-puzzle-spell-playing.png','phone-puzzle-spell-playing.png'),('forecast','phone-forecast-flood-impact.png','phone-forecast-flood-impact.png'),('moen','phone-moen-return-prevented-before.png','phone-moen-opening.png')]:
 shutil.copyfile(root/'docs/content/r11'/old,before_after/(feature+'-before.png'))
 shutil.copyfile(out/new,before_after/(feature+'-after.png'))
initial=json.loads((root/'.audit-tmp/r12/initial-files.json').read_text(encoding='utf-8'))
changed=[s for s,h in initial.items() if not (root/s).is_file() or sha(root/s)!=h]
preservation=dict(status='VERIFIED' if not changed else 'BLOCKED',protected_files=len(initial),changed=changed,scope='All initially dirty and untracked files outside pre-existing .audit-tmp; no original audit scratch files were selected for writes.')
(out/'preservation.json').write_text(json.dumps(preservation,ensure_ascii=False,indent=2),encoding='utf-8')
results=json.loads((out/'checks/results.json').read_text(encoding='utf-8'));latest={r['name']:r for r in results}
required={'r12-e2e','r12-feedback','r12-offline','npm-test','npm-e2e','rwd','r10','r11','r11-cleanup','r6','r7','r8','r9','frames','ci-performance'}
for old,new in [('docs/content/r8/frame-times.json','frame-times.json'),('docs/evidence/R67/after/performance.json','ci-performance.json')]:
 p=root/'.audit-tmp/r12/legacy'/old
 if p.exists():shutil.copyfile(p,out/new)
files=[]
for base in ['templates/card-battle','templates/card-pack','scripts']:
 files+=list((root/base).glob('*.js'))
syntax=[]
for p in files:
 r=subprocess.run(['node','--check',str(p)],capture_output=True)
 syntax.append(dict(path=p.relative_to(root).as_posix(),exit_code=r.returncode))
assert all(x['exit_code']==0 for x in syntax)
(out/'syntax.json').write_text(json.dumps(dict(status='VERIFIED',files=len(syntax),checks=syntax),indent=2),encoding='utf-8')
paths=subprocess.check_output(['rg','--files','--hidden','-g','!.git/**','-g','!node_modules/**','-g','!.audit-tmp/**'],cwd=root).decode('utf-8').splitlines()
pattern=re.compile(rb'sk-proj-[A-Za-z0-9_-]{20}|sk-[a-z0-9]{40}')
hits=[s for s in paths if (root/s).is_file() and pattern.search((root/s).read_bytes())]
secrets=dict(status='VERIFIED' if not hits else 'BLOCKED',hits=len(hits),paths=hits,scope='Repository only; .git, node_modules and .audit-tmp excluded. Never read the secrets directory.')
(out/'secret-scan.json').write_text(json.dumps(secrets,indent=2),encoding='utf-8')
hashes={}
for base in ['templates/card-battle','assets/art/content-r12']:
 for p in (root/base).glob('*'):
  if p.is_file():hashes[p.relative_to(root).as_posix()]=sha(p)
for name in ['sw.js','package.json','package-lock.json','index.html','templates/index.html','templates/harbor.html','templates/card-pack/index.html','.github/workflows/ci.yml']:
 hashes[name]=sha(root/name)
for p in (root/'scripts').glob('*r12*'):
 if p.is_file():hashes[p.relative_to(root).as_posix()]=sha(p)
(out/'source-hashes.json').write_text(json.dumps(hashes,indent=2),encoding='utf-8')
missing=sorted(required-latest.keys());failed=[name for name in required&latest.keys() if latest[name]['exit_code']]
release=dict(status='VERIFIED' if not missing and not failed and not changed and not hits else 'BLOCKED',version='0.24.0',cache='card-battle-content-r12-v1',missing_gate_groups=missing,failed_latest_groups=failed,latest_results=latest,preservation=preservation,syntax_files=len(syntax),secret_hits=len(hits),review_screenshots=15,new_generated_art=2,derived_portraits=1,limitations=['Physical device and human playtests require devices and participants','Shared-machine performance only','Muse score above eight requires actual re-review'])
(out/'release-gates.json').write_text(json.dumps(release,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:release[k] for k in ['status','version','missing_gate_groups','failed_latest_groups','syntax_files','secret_hits','review_screenshots']},ensure_ascii=False))
assert release['status']=='VERIFIED'
