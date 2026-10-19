from pathlib import Path
R=Path(__file__).resolve().parents[1]
p=R/'templates/card-battle/index.html';s=p.read_text(encoding='utf-8')
old='<div class="tide-chart-footer r75-secondary"><button id="tideTrialReplay" type="button">重玩潮汐試航</button><button id="tideHarbor" type="button">儲存返回港口</button></div>'
assert s.count(old)==1;s=s.replace(old,'');p.write_text(s,encoding='utf-8')
p=R/'templates/card-battle/battle.js';s=p.read_text(encoding='utf-8')
s=s.replace('../../assets/art/r77/foam.webp?v=cbff159e','../../assets/art/r79/foam.webp?v=r79-foam')
s=s.replace('top:`${r.top-16}px`,width:`${r.width+24}px`,height:`${r.height+24}px`','top:`${r.top+r.height*.4}px`,width:`${r.width+24}px`,height:`${r.height*.65}px`')
p.write_text(s,encoding='utf-8')
print('R79 chart exit actions moved; non-circular contact foam connected')
