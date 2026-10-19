"""Read back R5 release evidence, syntax, preservation and secret scan."""
from pathlib import Path
from PIL import Image
import hashlib,json,re,subprocess
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r5'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
canonical_sha=lambda p:hashlib.sha256(p.read_bytes().replace(b'\r\n',b'\n')).hexdigest()
version=json.loads((R/'package.json').read_text(encoding='utf8'))['version'];assert version=='0.18.0'
runtime=[R/p for p in ['index.html','sw.js','README.md','package.json','package-lock.json']]+[p for p in (R/'templates').rglob('*') if p.suffix in {'.js','.css','.html'}]
assert not [p for p in runtime if re.search(r'0\.17\.0|card-battle-content-r4-v1|card_sw_auto_reload_content_r4_v1',p.read_text(encoding='utf8'))]
syntax=[]
for p in sorted(list((R/'templates').rglob('*.js'))+list((R/'scripts').glob('*.js'))):
    q=subprocess.run(['node','--check',str(p)],cwd=R,capture_output=True,text=True);assert q.returncode==0,q.stderr;syntax.append(p.relative_to(R).as_posix())
pattern=re.compile(r'sk-proj-[A-Za-z0-9_-]{20}|sk-[a-z0-9]{40}|ghp_[A-Za-z0-9]{36}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')
hits=[];count=0
for p in R.rglob('*'):
    if not p.is_file() or any(x in {'.git','node_modules'} for x in p.relative_to(R).parts) or p.suffix.lower() not in {'.js','.json','.html','.css','.md','.txt','.py','.ps1','.yml','.yaml','.webmanifest'}:continue
    count+=1;raw=p.read_bytes();enc='utf-16' if raw.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8-sig'
    if pattern.search(raw.decode(enc,errors='ignore')):hits.append(p.relative_to(R).as_posix())
assert not hits,'Secret pattern file paths: '+repr(hits)
screens=[]
for p in sorted(O.glob('phone-*.png')):
    im=Image.open(p);assert im.size==(390,844),(p,im.size);screens.append(dict(path=p.relative_to(R).as_posix(),size=list(im.size),sha256=sha(p)))
for d in ['fallen','shield','shelter','taunt','spell','cross']:
    for state in ['playing','failed','retry','completed']:assert (O/f'phone-puzzle-{d}-{state}.png').exists()
index=json.loads((O/'review-set-index.json').read_text(encoding='utf8'));assert len(index['images'])==15
for content in ['puzzles','forecast','moen']:
    assert len([x for x in index['images'] if x['content']==content])==5
    assert sum(x['content']==content and x['playing'] for x in index['images'])>=3
for x in index['images']:assert sha(R/x['path'])==x['sha256']==sha(R/x['source'])
for w,h in [(1290,2796),(2064,2752)]:
    p=R/f'docs/store/screenshots/content-r5-forecast-{w}x{h}.png';assert Image.open(p).size==(w,h);screens.append(dict(path=p.relative_to(R).as_posix(),size=[w,h],sha256=sha(p)))
accept=json.loads((O/'acceptance.json').read_text(encoding='utf8'));assert accept['status']=='VERIFIED' and not accept['errors'];assert accept['shieldHP']==[4,4]
art=json.loads((R/'docs/art/ASSET_MANIFEST_CONTENT_R5.json').read_text(encoding='utf8'));assert art['newOriginals']==0 and art['newRuntimeCrops']==0
for item in art['files']:assert sha(R/item['path'])==item['sha256']
assert (O/'phone-moen-offline-entry.png').read_bytes()!=(O/'phone-moen-offline-completed.png').read_bytes()
tests=json.loads((O/'test-exits.json').read_text(encoding='utf8'));assert len(tests)==5 and all(x['exitCode']==0 for x in tests)
e2e=json.loads((O/'e2e-constituents.json').read_text(encoding='utf8'));assert len(e2e['cases'])==18 and all(x['exitCode']==0 for x in e2e['cases'])
assert e2e['lastFullNpmProcessExitCode']==1 and 'not a successful single npm process' in e2e['verificationMode']
for p,value in e2e['sourceHashes'].items():
    assert canonical_sha(R/p)==value,p
    assert sha(R/p) in {value,e2e['testedRawSourceHashes'][p]},p
for p in runtime:
    blob=subprocess.check_output(['git','show',':'+p.relative_to(R).as_posix()],cwd=R)
    assert hashlib.sha256(blob).hexdigest()==canonical_sha(p),'Staged runtime differs: '+str(p)
preserve=json.loads((O/'preservation.json').read_text(encoding='utf8'));assert preserve['status']=='VERIFIED'
for x in json.loads((R/'.audit-tmp/content-r5-preserve/inventory.json').read_text(encoding='utf8')):assert sha(R/x['path'])==x['sha256'],x['path']
receipt=dict(status='VERIFIED',version=version,syntaxFiles=len(syntax),secretScan=dict(files=count,hits=0,excluded=['.git','node_modules'],matchingValuesPrinted=False),oldRuntimeVersionHits=0,browserChecks=accept['checks'],e2eVerificationMode=e2e['verificationMode'],e2eConstituents=18,lastFullNpmE2EProcessExitCode=1,screenshots=screens,reviewSet=index,newArtOriginals=0,runtimeArtCrops=0,reusedArtManifest='docs/art/ASSET_MANIFEST_CONTENT_R4.json',reviewSha256=sha(R/'docs/content/CONTENT_REVIEW_R4_MUSE.md'),sourceHashes={p.relative_to(R).as_posix():canonical_sha(p) for p in runtime},sourceHashNormalization=e2e['sourceHashNormalization'],testedRawSourceHashes=e2e['testedRawSourceHashes'],qualification='Headless local verification only; actual real-device, human playtest and independent Muse score remain BLOCKED. All 18 E2E constituents passed across the unchanged prefix and five content reruns; the earlier full npm process is retained as exit 1.')
(O/'verification.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({k:v for k,v in receipt.items() if k not in {'sourceHashes','testedRawSourceHashes','screenshots','reviewSet'}},ensure_ascii=False))
