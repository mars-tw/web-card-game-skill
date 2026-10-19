"""本輪確定性收尾：只掃目前 repo，不讀任何憑證目錄。"""
from pathlib import Path
import subprocess, json, hashlib, re
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/evidence/r74-store'
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
scan=subprocess.run(['rg','-l','-i','--hidden','-g','!.git/**','-g','!node_modules/**','-e',r'sk-proj-[A-Za-z0-9_-]{20}','-e',r'sk-[a-z0-9]{40}','.'],cwd=ROOT,capture_output=True,text=True,encoding='utf-8')
secret={'status':'VERIFIED' if scan.returncode==1 else 'BLOCKED','hits':len(scan.stdout.splitlines()),'files':scan.stdout.splitlines(),'scope':'entire current repo excluding .git and node_modules; filenames only, no values','exitCode':scan.returncode}
(OUT/'secret-scan.json').write_text(json.dumps(secret,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
assert scan.returncode==1, 'secret scan must have zero hits and a valid rg execution'
runtime=[ROOT/'index.html',ROOT/'offline.html',ROOT/'manifest.webmanifest',ROOT/'sw.js',*ROOT.glob('templates/**/*.js'),*ROOT.glob('templates/**/*.html'),*ROOT.glob('templates/**/*.css')]
old=[]
for p in [*runtime,ROOT/'README.md',ROOT/'package.json']:
 if re.search(r'(?<![\d.])0\.6\.0(?![\d.])|card-battle-r73-v1|card_sw_auto_reload_r73_v1|\?{3}',p.read_text(encoding='utf-8')):old.append(str(p.relative_to(ROOT)))
assert not old, 'old runtime revision or damaged text remains: '+repr(old)
syntax=[]
for p in [*ROOT.glob('templates/**/*.js'),*ROOT.glob('scripts/*.js')]:
 r=subprocess.run(['node','-c',str(p)],capture_output=True)
 syntax.append({'file':str(p.relative_to(ROOT)).replace('\\','/'),'pass':r.returncode==0})
assert all(x['pass'] for x in syntax), 'JavaScript syntax error'
screens=[]
for p in sorted((ROOT/'docs/store/screenshots').glob('*.png')):
 with Image.open(p) as im:size=im.size
 assert size in {(1290,2796),(2064,2752)}, 'incorrect store image size'
 screens.append({'file':str(p.relative_to(ROOT)).replace('\\','/'),'width':size[0],'height':size[1],'sha256':digest(p),'bytes':p.stat().st_size})
assert len(screens)==8, 'four actual screens in each required size'
native=ROOT.parent/'game-store-publisher/native-kit/apps/web-card-game-skill'
native_readonly=[]
for rel in ['native-status.json','capacitor.config.json','package.json','web-payload.json','bundle-manifest.json','ios/App/App/PrivacyInfo.xcprivacy','android/app/src/main/AndroidManifest.xml']:
 p=native/rel;native_readonly.append({'source':str(p),'sha256':digest(p),'scope':'read only; not the new release artifact'})
evidence={'status':'VERIFIED','version':json.loads((ROOT/'package.json').read_text(encoding='utf-8'))['version'],'baseCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'runtimeHashes':{str(p.relative_to(ROOT)).replace('\\','/'):digest(p) for p in runtime},'screenshots':screens,'syntax':syntax,'oldRevisionHits':old,'secretScan':secret,'nativeReferences':native_readonly,'performanceQualification':'並發載量測，僅供參考；沒有獨立手機或乾淨機況出貨效能驗證'}
(OUT/'verification.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'R74 release verification: {len(runtime)} runtime files; {len(syntax)} syntax checks; {len(screens)} screenshots; zero secret/old revision hits')
