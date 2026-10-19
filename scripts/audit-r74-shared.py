"""唯讀比對同帳號遊戲；所有報告只寫在目前 repo。"""
from pathlib import Path
import subprocess, hashlib, json, re

ROOT = Path(__file__).resolve().parents[1]
GAMES = ROOT.parent
REPOS = {
    'Crackveil Vanguard': 'rift-survivors', '暴風啟示錄': 'storm-apocalypse',
    '灰燼護航': 'doomsday-shooter', '無盡塔防': 'tower-defense',
    '陽光農場': 'pixel-idle-farm-skill', '村莊攻防': 'village-siege',
    '七期：斷鏈行動': 'seven-district-reckoning', 'Rift Forge 3D': 'rift-forge-3d',
    '島嶼交通學院': 'taiwan-island-drive', '小小列車長': 'taiwan-train-math',
    '夜行列車': '夜行列車_重製企劃_20261002', '島嶼飛行學校': 'island-flight-school',
    '島嶼鐵道學校': 'taiwan-train-school',
}
EXT = {'.html','.js','.css','.json','.png','.webp','.jpg','.svg','.woff','.woff2','.ttf','.mp3','.ogg','.wav','.gd','.ts','.tsx','.godot'}
def files(root):
    if (root / '.git').exists():
        raw = subprocess.check_output(['git','-C',str(root),'ls-files','-z'])
        candidates = [root / p.decode('utf-8') for p in raw.split(b'\0') if p]
    else:
        candidates = list(root.glob('*'))  # 未受版控重製企劃只看根目錄，不把 preview 當正式遊戲。
    return [p for p in candidates if p.is_file() and p.suffix.lower() in EXT
            and not any(x in {'docs','node_modules','.git','Library','Temp','build','dist','output','references','scripts','.github'} for x in p.relative_to(root).parts)
            and p.stat().st_size <= 8_000_000]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
own = files(ROOT) + [ROOT / x for x in ['templates/harbor.html','templates/card-battle/r74-tide.css','templates/card-battle/tide-session.js','templates/card-battle/pose-player.js']]
own = list(dict.fromkeys(own))
by_hash = {}
for p in own: by_hash.setdefault(sha(p), []).append(str(p.relative_to(ROOT)).replace('\\','/'))
duplicates, inventory, snippets = [], [], []
own_text = {p: p.read_text(encoding='utf-8',errors='replace') for p in own if p.suffix in {'.html','.css','.js'}}
tokens = ['theme-picker','cardpack_collection_v2','card_tide_session_v1','card-battle-r74-v1','Audio unlocks on first gesture','shouldAutoReloadForSwUpdate','localStorage','requestAnimationFrame','playTone','SKILL.md','art-config.json']
for app, folder in REPOS.items():
    root = GAMES / folder
    candidates = files(root) if root.exists() else []
    inventory.append({'app':app,'path':str(root),'filesChecked':len(candidates),'scope':'tracked runtime/assets' if (root/'.git').exists() else 'root files only; redesign preview is not production'})
    for p in candidates:
        digest = sha(p)
        if digest in by_hash:
            for own_file in by_hash[digest]: duplicates.append({'file':own_file,'otherApp':app,'otherFile':str(p.relative_to(root)).replace('\\','/'),'sha256':digest})
        if p.suffix in {'.html','.js','.css'}:
            t=p.read_text(encoding='utf-8',errors='replace')
            for token in tokens:
                if token in t:
                    for op,ot in own_text.items():
                        if token in ot: snippets.append({'file':str(op.relative_to(ROOT)).replace('\\','/'),'otherApp':app,'otherFile':str(p.relative_to(root)).replace('\\','/'),'token':token,'classification':'standard browser API' if token in {'localStorage','requestAnimationFrame'} else 'shared identifier/function; manual review required'})
data={'status':'EXECUTED','method':'SHA-256 exact files + named UI/audio/storage identifiers; no claim of exhaustive semantic equivalence','ownFiles':len(own),'inventory':inventory,'duplicates':duplicates,'sharedIdentifiers':snippets}
out=ROOT/'docs/evidence/r74-store';out.mkdir(parents=True,exist_ok=True)
(out/'shared-assets.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
rows=['# 共用檔案機械比對結果','', '| 本作檔案 | 對方遊戲／檔案 | SHA-256 |','|---|---|---|']
for d in duplicates: rows.append(f"| {d['file']} | {d['otherApp']}／{d['otherFile']} | `{d['sha256']}` |")
if not duplicates: rows.append('| 無整檔相同命中 | 不代表沒有共用邏輯或模板來源 | — |')
(out/'shared-exact-files.md').write_text('\n'.join(rows)+'\n',encoding='utf-8')
print(json.dumps({'ownFiles':len(own),'duplicates':len(duplicates),'identifierMatches':len(snippets),'inventory':inventory},ensure_ascii=False,indent=2))
