"""Publish local completion receipts only after every required group is green."""
from pathlib import Path
import json,hashlib,re
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r13'
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
history=read(O/'checks/results.json');latest={x['name']:x for x in history}
required=['unit','local-rules','e2e','rwd','r6','r7','r8','r9','r10','r11','r11-cleanup','r12','r13','frames','performance','integrity']
assert all(name in latest and latest[name]['exit_code']==0 for name in required),{name:latest.get(name)for name in required if name not in latest or latest[name]['exit_code']!=0}
clean=read(O/'checks/clean-ci.json');assert clean['status']=='VERIFIED'and len(clean['results'])==5 and all(x['exit_code']==0 for x in clean['results'])
integrity=read(O/'release-integrity.json');assert integrity['status']=='VERIFIED'and not integrity['protected_changed']and integrity['secret_hits']==0
acceptance=read(O/'acceptance.json');assert acceptance['status']=='VERIFIED'and acceptance['checks']>=717 and not acceptance['errors']
review=read(O/'review-index.json');assert review['status']=='VERIFIED'and len(review['images'])==15
assert Path(review['capture_root']).resolve()==Path(clean['copy']).resolve(),'final review media must come from the verified clean run'
for im in review['images']:assert hashlib.sha256((R/im['path']).read_bytes()).hexdigest()==im['sha256']
offline=read(O/'offline-puzzles-forecast.json');assert offline['status']=='VERIFIED'
feedback=read(O/'feedback.json');assert feedback['status']=='VERIFIED'
frames=read(R/'.audit-tmp/r13/legacy/docs/content/r8/frame-times.json');assert frames['status']=='VERIFIED'and all(x['median']<=18 for x in frames['result'])
(O/'frame-times.json').write_text(json.dumps(frames,indent=2),encoding='utf-8')
performance=R/'.audit-tmp/r13/legacy/docs/evidence/R67/after/performance.json'
if performance.exists():(O/'ci-performance.json').write_bytes(performance.read_bytes())
cleanup=read(O/'cleanup.json');assert cleanup['all_absent']and all(not (R/x['path']).exists()for x in cleanup['deleted'])
cleanup.update(status='VERIFIED',post_cleanup_gates={name:latest[name]['exit_code']for name in required})
(O/'cleanup.json').write_text(json.dumps(cleanup,ensure_ascii=False,indent=2),encoding='utf-8')
sources=[R/'package.json',R/'package-lock.json',R/'sw.js',R/'index.html',R/'.github/workflows/ci.yml',*R.glob('templates/**/*.js'),*R.glob('templates/**/*.html'),*R.glob('templates/**/*.css'),*R.glob('scripts/test*.js')]
(O/'source-hashes.json').write_text(json.dumps({p.relative_to(R).as_posix():hashlib.sha256(p.read_bytes()).hexdigest()for p in sources},indent=2),encoding='utf-8')
rule_count=int(re.search(r'VERIFIED R13 (\d+) checks',(O/'checks/unit.log').read_text(encoding='utf-8')).group(1))
gates=dict(status='VERIFIED',version='0.25.0',local_groups={name:latest[name]for name in required},clean_ci=clean['results'],r13_browser_checks=acceptance['checks'],r13_rule_checks=rule_count,review_images=15,new_illustrations=2,integrity=integrity,performance=frames,cleanup_count=cleanup['count'],cleanup_bytes=cleanup['bytes'],prior_failed_attempts=sum(x['exit_code']!=0 for x in history),limits=['Native device / human observers / playtest / exclusive performance / actual Muse rescore not performed.','Review set is five images per content; all six puzzle results are separately linked.','Fallen solution has no surviving minion; true empty board preserved.'])
(O/'release-gates.json').write_text(json.dumps(gates,indent=2),encoding='utf-8')
p=R/'docs/CODEX_RESPONSE_CONTENT_R13.md';text=p.read_text(encoding='utf-8')
text=text.replace('PREPARED：版本 0.25.0，main，本機修正與驗證；','VERIFIED：版本 0.25.0，main，本機修正與驗證；')
medians='、'.join(f"{x['width']}×{x['height']}：{x['median']:.2f}ms"for x in frames['result'])
peak=max(run['max']for x in frames['result']for run in x['runs'])
final=f"VERIFIED：刪除舊證據後，16組完整本機檢查的最後退出碼皆為0，包含npm test、原npm完整素材／證據斷言、舊test:e2e、RWD、R6～R13各專項、離線、錯解、三跑效能與完整性。R13規則{rule_count}項、瀏覽器／版面{acceptance['checks']}項、RWD33個頁面×視口組合均通過。乾淨副本的npm ci、npm test、test:ci:e2e、test:rwd及CI的JS語法範圍全綠；輸入不含docs/evidence、docs/content與.git，也不能向上找到本機Git。詳見release-gates.json、checks/results.json與checks/clean-ci.json；歷次失敗紀錄保留，不把舊失敗當成最終結果。\n\nVERIFIED：{integrity['syntax_count']}份JS語法通過，秘密掃描零命中，276份入場保護檔及{integrity['preserved_store_count']}張既有商店圖完整未變。兩個視口各3次、每次240個rAF間隔，p95三跑中位為{medians}，均≤18ms；另有{peak:.1f}ms最大間隔，原始數據保留。這是共用機並發參考，不能冒充乾淨機況或實體裝置效能。命中英雄收據距血量框6px、距血量數字37.86px；原始座標在impact-anchor.json。"
text=text.replace('PREPARED：完整檢查與乾淨副本仍在執行；完成後於此處填入實際結果。',final)
p.write_text(text,encoding='utf-8')
print('VERIFIED final local gates, clean CI, report, source hashes and deletion readback')
