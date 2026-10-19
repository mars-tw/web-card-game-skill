"""Versioned asset wiring; historical originals and licensing remain intact."""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
assert json.loads((R/'package.json').read_text(encoding='utf-8'))['version']=='0.11.0','Historical one-time migration; refuse to reapply to an R79 workspace'
runtime=[R/'index.html',R/'sw.js',R/'manifest.webmanifest',R/'README.md',*R.glob('templates/**/*.js'),*R.glob('templates/**/*.html'),*R.glob('templates/**/*.css')]
for p in runtime:
 s=p.read_text(encoding='utf-8').replace('card-battle-r78-v1','card-battle-r79-v1').replace('card_sw_auto_reload_r78_v1','card_sw_auto_reload_r79_v1')
 for name in ['frame','frame-low','icon-wave','logo']:
  s=s.replace(f'assets/art/r78/{name}.webp',f'assets/art/r79/{name}.webp')
 s=s.replace('assets/art/r77/victory-navigator.webp','assets/art/r79/victory-navigator.webp')
 s=s.replace('?v=r78-frame','?v=r79-frame').replace('?v=r78-icon','?v=r79-icon').replace('?v=r78-logo','?v=r79-logo')
 if p.name=='README.md':s=s.replace('`0.11.0`','`0.12.0`')
 if p.name=='harbor.html':s=s.replace('</head>','<link rel="stylesheet" href="r79-art.css?v=card-battle-r79-v1">\n</head>')
 p.write_text(s,encoding='utf-8')
for name in ['package.json','package-lock.json']:
 p=R/name;d=json.loads(p.read_text(encoding='utf-8'));d['version']='0.12.0'
 if name=='package-lock.json':d['packages']['']['version']='0.12.0'
 p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=R/'scripts/test-battle-e2e.js';s=p.read_text(encoding='utf-8').replace('card-battle-r78-v1','card-battle-r79-v1').replace('card_sw_auto_reload_r78_v1','card_sw_auto_reload_r79_v1');p.write_text(s,encoding='utf-8')
# Migrate the same leave/replay hit tests to their relocated real menu. Do not drop assertions.
for name in ['test-r74-review.js','test-r75-art.js']:
 p=R/'scripts'/name;s=p.read_text(encoding='utf-8')
 old="for(const id of ['chooseFlood','chooseEbb','tideChartClose','tideTrialReplay','tideHarbor'])"
 new="for(const id of ['chooseFlood','chooseEbb','tideChartClose'])"
 assert old in s;s=s.replace(old,new)
 if name=='test-r74-review.js':
  s=s.replace("await f.locator('#trialChart').click();await f.locator('#tideHarbor').click();","await f.locator('#moreActionsBtn').click();\n      for(const id of ['tideTrialReplay','tideHarbor'])check(await hit(f,'#'+id),'更多選單 '+id+' 真實命中');\n      await f.locator('#tideHarbor').click();")
  s=s.replace("await restored.locator('#tideChartBtn').click();await restored.locator('#tideHarbor').click();","await restored.locator('#tideHarbor').click();")
 else:
  marker="if(width===1032){"
  assert marker in s;s=s.replace(marker,"await f.locator('#moreActionsBtn').click();\n      for(const id of ['tideTrialReplay','tideHarbor'])check(await hit(f,'#'+id),`${width} more ${id} ≥44px, hit-tested`);\n      await f.locator('#moreActionsBtn').click();\n      "+marker)
 p.write_text(s,encoding='utf-8')
print('Version0.12.0 / R79 assets wired; existing numeric and geometry assertions preserved')
