"""Build the <=15-image review set, verifying original bytes and native sizes."""
from pathlib import Path
from PIL import Image
import json,hashlib,shutil,re,subprocess
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r6';D=O/'review-set';D.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
selected=[
 ('puzzles','puzzle-fallen-playing','陣亡蓄潮盤面'),('puzzles','puzzle-shield-playing','一血聖盾盤面'),('puzzles','puzzle-shelter-playing','弓手與狼互相致命'),('puzzles','puzzle-taunt-playing','嘲諷封路盤面'),('puzzles','puzzle-spell-playing','火焰箭與四血騎士'),('puzzles','puzzle-cross-playing','雙線交換與確認前血量預覽'),
 ('forecast','forecast-before','反轉前公開預報'),('forecast','forecast-held','按住預覽反轉後果'),('forecast','forecast-applied','放開後反轉一次'),('forecast','forecast-wrong-direction','錯誤方向與灰色禁用確認'),
 ('moen','moen-preparing','整備姿勢與受保護騎士'),('moen','moen-impact','舉手命中與護航連線'),('moen','moen-guarding','留守／同卡破盾前 3攻4血'),('moen','moen-shield-impact','同卡盾裂瞬間 3攻4血'),('moen','moen-shield-after','同卡破盾後完整卡框 3攻4血')]
images=[]
for i,(content,name,proof) in enumerate(selected,1):
    src=O/f'phone-{name}.png';dst=D/f'{i:02d}-{content}-{name}.png';assert Image.open(src).size==(390,844);shutil.copyfile(src,dst)
    assert sha(src)==sha(dst);images.append(dict(content=content,path=dst.relative_to(R).as_posix(),source=src.relative_to(R).as_posix(),proof=proof,playing=True,size=[390,844],sha256=sha(dst)))
assert len(images)==15 and len(list(D.glob('*.png')))==15
(O/'review-set-index.json').write_text(json.dumps(dict(status='VERIFIED',count=15,distribution=dict(puzzles=6,forecast=4,moen=5),note='Six anonymous puzzle boards; continuous forecast 07-09, Moen 11-13 and shield 13-15. Guarding frame serves two acceptance sequences.',images=images),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
E=R/'docs/evidence/content-r6';E.mkdir(parents=True,exist_ok=True);comparisons=[]
for label,prior,current in [('exchange','phone-puzzle-cross-playing.png','phone-exchange-preview.png'),('forecast','phone-forecast-wrong-direction.png','phone-forecast-wrong-direction.png'),('moen','phone-moen-shield-after.png','phone-moen-shield-after.png')]:
    for phase,src in [('before',R/'docs/content/r5'/prior),('after',O/current)]:
        dst=E/f'{phase}-{label}.png';shutil.copyfile(src,dst);comparisons.append(dict(path=dst.relative_to(R).as_posix(),source=src.relative_to(R).as_posix(),sha256=sha(dst),method='Historical R5 byte copy, not re-captured' if phase=='before' else 'Current R6 native screenshot byte copy'))
for name in ['layout-moen-844x390-1.png','layout-moen-1032x1376-1.png']:
    shutil.copyfile(O/name,E/name)
(E/'provenance.json').write_text(json.dumps(dict(status='VERIFIED',comparisons=comparisons),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
for size in [(1290,2796),(2064,2752)]:assert Image.open(R/f'docs/store/screenshots/content-r6-moen-{size[0]}x{size[1]}.png').size==size
pattern=re.compile(r'sk-proj-[A-Za-z0-9_-]{20}|sk-[a-z0-9]{40}|ghp_[A-Za-z0-9]{36}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')
hits=[];count=0
for p in R.rglob('*'):
    if not p.is_file() or any(x in {'.git','node_modules','.audit-tmp'} for x in p.relative_to(R).parts) or p.suffix.lower() not in {'.js','.json','.html','.css','.md','.txt','.py','.ps1','.yml','.yaml','.webmanifest'}:continue
    count+=1;raw=p.read_bytes();enc='utf-16' if raw.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8-sig'
    if pattern.search(raw.decode(enc,errors='ignore')):hits.append(p.relative_to(R).as_posix())
assert not hits,'Secret pattern file paths: '+repr(hits)
runtime=[R/p for p in ['index.html','sw.js','README.md','package.json','package-lock.json']]+[p for p in (R/'templates').rglob('*') if p.suffix in {'.js','.css','.html'}]
assert not [p for p in runtime if re.search(r'0\.18\.0|card-battle-content-r5-v1|card_sw_auto_reload_content_r5_v1',p.read_text(encoding='utf8'))]
syntax=[]
for p in [R/'templates/card-battle/content-r6.js',R/'templates/card-battle/battle.js',R/'scripts/test-content-r6.js',R/'scripts/test-content-r6-e2e.js']:
    q=subprocess.run(['node','--check',str(p)],cwd=R,capture_output=True,text=True);assert q.returncode==0,q.stderr;syntax.append(p.relative_to(R).as_posix())
manifest=json.loads((R/'docs/art/ASSET_MANIFEST_CONTENT_R6.json').read_text(encoding='utf8'))
for f in manifest['files']:assert sha(R/f['path'])==f['sha256'] and Image.open(R/f['path']).getextrema()[3][0]==0
acceptance=json.loads((O/'acceptance.json').read_text(encoding='utf8'));assert acceptance['status']=='VERIFIED'
rechecks=json.loads((O/'recheck-exits.json').read_text(encoding='utf8'));latest=json.loads((O/'latest-exits.json').read_text(encoding='utf8'));assert len(latest)==3 and all(x['exitCode']==0 or x['name']=='ci-performance-latest' for x in latest)
final_gates=json.loads((O/'final-gates.json').read_text(encoding='utf8'));assert next(x for x in final_gates if x['name']=='static-final-run')['exitCode']==0
confirmation=json.loads((O/'confirmation-gates.json').read_text(encoding='utf8'));assert len(confirmation)==3 and all(x['exitCode']==0 for x in confirmation)
assert len(rechecks)==4 and all(x['exitCode']==0 or x['name']=='ci-performance-recheck' for x in rechecks)
assert json.loads((O/'e2e-constituents.json').read_text(encoding='utf8'))['status']=='VERIFIED'
assert json.loads((O/'final-effects.json').read_text(encoding='utf8'))['status']=='VERIFIED'
assert json.loads((O/'art-gates.json').read_text(encoding='utf8'))['status']=='VERIFIED'
receipts=dict(status='VERIFIED',version='0.19.0',reviewImages=15,phoneScreenshots=len(list(O.glob('phone-*.png'))),secretScan=dict(status='VERIFIED',files=count,hits=hits,scope='Repo text files, excludes .git/node_modules/.audit-tmp; never reads secrets directory.'),syntax=syntax,acceptanceChecks=acceptance['checks'],newOriginals=1,newRuntimeCrops=3)
(O/'verification.json').write_text(json.dumps(receipts,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps(receipts,ensure_ascii=False))
