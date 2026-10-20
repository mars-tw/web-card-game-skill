"""Delete only tracked, superseded review media with no validation references."""
from pathlib import Path
import subprocess,json,re,hashlib,sys
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r13'
media={'.png','.webp','.jpg','.jpeg','.gif','.mp4','.webm','.mov'}
tracked=subprocess.check_output(['git','ls-files','-z'],cwd=R).decode('utf-8').split('\0')
protected=json.loads((O/'protected-files.json').read_text(encoding='utf-8'))
read=set()
for p in (R/'.audit-tmp/r13/media-reads').glob('*.jsonl'):
 for line in p.read_text(encoding='utf-8').splitlines():read.add(json.loads(line))
scripts=[(p.relative_to(R).as_posix(),p.read_text(encoding='utf-8'))for p in (R/'scripts').rglob('*')if p.suffix in ['.js','.py']and 'r13'not in p.as_posix()]
manifest='\n'.join(p.read_text(encoding='utf-8')for p in (R/'docs/art').glob('*.json'))
plan=[];kept=[]
for rel in tracked:
 p=R/rel
 if not p.is_file()or p.suffix.lower()not in media or not (rel.startswith('docs/evidence/')or re.match(r'docs/content/r\d+/',rel)):continue
 if rel.startswith('docs/content/r13/')or rel in protected:continue
 reason=None
 if rel in read:reason='本輪完整驗證實際讀取'
 elif rel in manifest:reason='現有素材來源 manifest 引用'
 else:
  for script,text in scripts:
   # Exact filename, including generated phone names, protects validation inputs.
   if rel in text or p.name in text or (p.stem.startswith('phone-')and p.stem[6:]in text):reason='驗證或歷史重建腳本引用：'+script;break
   folders=re.findall(r'docs/(?:evidence|content)/[A-Za-z0-9_/-]+',text)
   if any(rel.startswith(folder.rstrip('/')+'/')for folder in folders)and re.search(r'Image\.open|\.rglob\(|\.glob\(|readFileSync\([^)]*(?:path|join|O|OUT)',text):reason='動態驗證路徑保守保留：'+script;break
 if reason:kept.append(dict(path=rel,reason=reason));continue
 plan.append(dict(path=rel,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
receipt=dict(status='PREPARED',count=len(plan),bytes=sum(x['bytes']for x in plan),deleted=plan,retained=kept,untracked_policy='All pre-existing untracked files and audit folders excluded; only git ls-files candidates.')
(O/'cleanup.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in receipt.items()if k not in ['deleted','retained']}),flush=True)
if '--apply'in sys.argv:
 for row in plan:
  p=(R/row['path']).resolve();assert p.is_relative_to(R.resolve())and (p.is_relative_to((R/'docs/evidence').resolve())or p.is_relative_to((R/'docs/content').resolve()))
  assert hashlib.sha256(p.read_bytes()).hexdigest()==row['sha256'];p.unlink()
 receipt['status']='EXECUTED';receipt['all_absent']=all(not (R/x['path']).exists()for x in plan)
 (O/'cleanup.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8')
