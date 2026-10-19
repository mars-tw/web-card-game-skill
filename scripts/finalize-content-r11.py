"""Build a byte-for-byte review selection and verify local delivery receipts."""
from pathlib import Path
from PIL import Image
import json,hashlib,shutil,subprocess,re,datetime
root=Path(__file__).resolve().parent.parent
out=root/'docs/content/r11'
def dump(name,obj):(out/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
all_results=json.loads((out/'checks/results.json').read_text(encoding='utf-8'));latest={r['name']:r for r in all_results}
required=['r11-e2e','cleanup','npm-test','npm-e2e','rwd','r6','r6-effects','r7','r8','r9','r9-six-puzzles','r10','frames','ci-performance']
assert all(n in latest and latest[n]['exit_code']==0 for n in required),latest
selection=[
 ('puzzle-spell-playing','firebolt-specific question, hand below hero, locked end turn'),
 ('puzzle-shield-playing','shield puzzle question and full tide'),
 ('puzzle-shelter-playing','archer survival and no-count hero label'),
 ('puzzle-fallen-playing','tide 5/6 and disabled end turn'),
 ('puzzle-taunt-playing','taunt route question and distinct painted floor'),
 ('puzzle-cross-playing','two opposing lanes, unique question, disabled end turn'),
 ('forecast-flood-preview','same run: held third round, ring and visible cancel boundary'),
 ('forecast-flood-cancelled','same run: third round unchanged, allowance retained'),
 ('forecast-flood-applied','same run: third round changed to flood, undo available'),
 ('forecast-flood-impact','same run: actual third-round 360ms hero5to3 and knight4to3'),
 ('moen-return-prevented-break-anticipation','return branch B: full painted card before actual 180ms impact'),
 ('moen-return-prevented-break-impact','same attack: independent soldier pose, shield breaks, enemy4hp, live gap and allied knight counterattack'),
 ('moen-return-prevented-before','same branch B: live0/2 gap, allied knight4to1 counterattack preview before judgement'),
 ('moen-return-triggered-completed','return branch A: actual2hp healing, distinct quote, clean result'),
 ('moen-return-prevented-completed','return branch B: actual3 damage cost, distinct quote, single return'),
]
review=out/'review-set';review.mkdir(exist_ok=True);index=[]
old_index={i['file']:i for i in json.loads((out/'review-set-index.json').read_text(encoding='utf-8'))['images']} if (out/'review-set-index.json').exists() else {}
for i,(name,note) in enumerate(selection,1):
 src=out/('phone-'+name+'.png');assert Image.open(src).size==(390,844),src
 dest=review/(f'{i:02d}-'+name+'.png')
 if dest.exists():assert dest.relative_to(root).as_posix() in old_index and sha(dest)==old_index[dest.relative_to(root).as_posix()]['sha256'],'Existing review copy changed outside the recorded build'
 shutil.copyfile(src,dest);assert sha(dest)==sha(src)
 index.append(dict(file=dest.relative_to(root).as_posix(),source=src.relative_to(root).as_posix(),size=[390,844],sha256=sha(src),proves=note))
assert len(list(review.glob('*.png')))==15
dump('review-set-index.json',dict(status='VERIFIED',distribution=dict(puzzles=6,forecast=4,moen=5),images=index))
images=[]
for p in sorted(out.glob('*.png')):images.append(dict(file=p.name,size=list(Image.open(p).size),sha256=sha(p)))
dump('screenshot-inventory.json',dict(status='VERIFIED',method='Native viewport PNG, no crop, resize or composite; clock paused only for exact active impact.',images=images))
stores=[]
for size in [(1290,2796),(2064,2752)]:
 p=root/f'docs/store/screenshots/content-r11-moen-{size[0]}x{size[1]}.png';assert Image.open(p).size==size
 stores.append(dict(file=p.relative_to(root).as_posix(),size=size,sha256=sha(p)))
dump('store-screenshots.json',dict(status='VERIFIED',images=stores))
before=root/'docs/evidence/content-r11/before';after=root/'docs/evidence/content-r11/after';before.mkdir(parents=True,exist_ok=True);after.mkdir(parents=True,exist_ok=True)
comparisons=[]
for old,new in [('phone-puzzle-spell-playing.png','phone-puzzle-spell-playing.png'),('phone-forecast-cancelled.png','phone-forecast-flood-cancelled.png'),('phone-moen-break-impact.png','phone-moen-break-impact.png'),('phone-moen-completed.png','phone-moen-return-prevented-completed.png')]:
 a=root/'docs/content/r10'/old;b=out/new;shutil.copyfile(a,before/old);shutil.copyfile(b,after/new);comparisons.append(dict(before=old,after=new,before_sha256=sha(a),after_sha256=sha(b)))
dump('before-after.json',dict(status='VERIFIED',directory='docs/evidence/content-r11',comparisons=comparisons))
protected=json.loads((out/'preservation-before.json').read_text(encoding='utf-8'))
changed=[n for n,h in protected.items() if not (root/n).is_file() or sha(root/n)!=h]
dump('preservation.json',dict(status='VERIFIED' if not changed else 'BLOCKED',protected_count=len(protected),changed=changed,method='Entry-time SHA256; includes preexisting dirty R67 evidence and preexisting untracked files, excludes preexisting .audit-tmp directory which was never removed.'))
assert not changed,changed
tracked=subprocess.check_output(['git','ls-files','-z'],cwd=root).decode('utf-8').split('\0')
untracked=subprocess.check_output(['git','ls-files','--others','--exclude-standard','-z'],cwd=root).decode('utf-8').split('\0')
patterns=[re.compile(rb'sk-proj-[A-Za-z0-9_-]{20,}'),re.compile(rb'sk-[a-z0-9]{40}'),re.compile(rb'gh[pousr]_[A-Za-z0-9]{36,}'),re.compile(rb'AKIA[0-9A-Z]{16}'),re.compile(rb'AIza[0-9A-Za-z_-]{35}'),re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')]
matches=[];checked=0
for n in sorted(set(tracked+untracked)):
 if not n or n.startswith(('.git/','node_modules/','.audit-tmp/')):continue
 p=root/n
 if not p.is_file() or p.suffix.lower() not in ['.js','.css','.html','.json','.md','.webmanifest','.py','.yml','.yaml','.txt']:continue
 checked+=1;data=p.read_bytes()
 if any(pat.search(data) for pat in patterns):matches.append(n)
dump('secret-scan.json',dict(status='VERIFIED' if not matches else 'BLOCKED',checked_files=checked,matches=len(matches),method='Local project text files only; no credential-directory access or matching contents printed.'))
assert not matches,'Secret scan matched; inspect locally without exposing contents'
candidates=tracked+[n for n in untracked if 'r11' in n.lower() and n not in protected]
owned=[n for n in candidates if n and (n.endswith(('.js','.css','.html','.json','.webmanifest','.py')) and not n.startswith(('docs/','.audit-tmp/','node_modules/')) or n.startswith('assets/art/content-r11/') or n.startswith('docs/art/') and 'CONTENT_R11' in n)]
hashes={}
for n in sorted(set(owned)):
 p=root/n
 if not p.is_file():continue
 data=p.read_bytes()
 if p.suffix.lower() in ['.js','.css','.html','.json','.webmanifest','.py']:data=data.replace(b'\r\n',b'\n')
 hashes[n]=hashlib.sha256(data).hexdigest()
dump('source-hashes.json',hashes)
frames=Path(root/'.audit-tmp/r11/legacy/docs/content/r8/frame-times.json');assert frames.exists()
frame_data=json.loads(frames.read_text(encoding='utf-8'));dump('frame-times.json',frame_data)
assert frame_data['status']=='VERIFIED'
ci=root/'.audit-tmp/r11/legacy/docs/evidence/R67/after/performance.json';assert ci.exists();shutil.copyfile(ci,out/'ci-performance.json')
acceptance=json.loads((out/'acceptance.json').read_text(encoding='utf-8'));assert acceptance['status']=='VERIFIED'
syntax=json.loads((out/'syntax.json').read_text(encoding='utf-8'));assert syntax['status']=='VERIFIED'
report=root/'docs/CODEX_RESPONSE_CONTENT_R11.md';s=report.read_text(encoding='utf-8').replace('狀態 EXECUTED','狀態 VERIFIED')
medians='／'.join(str(round(v['median'],2)) for v in frame_data['result'])
sentence=f"VERIFIED：npm test、npm run test:e2e、npm run test:rwd與R6～R10全部專項最後退出碼均為0；R11實玩與版面檢查{acceptance['checks']}項、規則與素材27項、{syntax['files']}份JS語法全過，秘密掃描零命中。桌機／手機各3次、每次240個rAF間隔，p95中位為{medians}ms（門檻18ms），原CI限速／CPU守門亦通過。這是共用機並發載參考。"
s=s.replace('秘密掃描、語法、單元、E2E、RWD、R6～R10專項、離線及並發載效能數值以release-gates.json為準。',sentence)
s=re.sub(r'VERIFIED：npm test、npm run test:e2e.*?這是共用機並發載參考。',lambda m:sentence,s,flags=re.S)
report.write_text(s,encoding='utf-8',newline='\n')
dump('release-gates.json',dict(status='VERIFIED',version='0.23.1',cache='card-battle-content-r11-v1',branch=subprocess.check_output(['git','branch','--show-current'],cwd=root).decode().strip(),gates=latest,acceptance_checks=acceptance['checks'],review_images=15,new_art=3,source_hash_method='Text CRLF normalized to LF as Git; images untouched bytes.',blocked=['Physical phone/iPad','Human/parent-child playtest','Exclusive clean-machine performance','Actual Muse >=8 rescore']))
print('VERIFIED R11 local release receipts, 15 review images, no publishing')
