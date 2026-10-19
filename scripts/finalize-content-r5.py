"""Copy only original phone captures into the 15-image review set."""
from pathlib import Path
from PIL import Image
import hashlib,json,shutil
R=Path(__file__).resolve().parents[1];O=R/'docs/content/r5';D=O/'review-set';D.mkdir(parents=True,exist_ok=True)
selection=[
 ('puzzles','study-verification-unlocked','六道 6/6、複驗 0/1 與獨立入口'),
 ('puzzles','puzzle-cross-playing','兩線同退：目標與盤面，尚未操作'),
 ('puzzles','puzzle-cross-exchange-1','同一局：士兵交換後蓄滿潮'),
 ('puzzles','puzzle-cross-exchange-2','同一局：騎士交換後，兩敵同剩一血'),
 ('puzzles','puzzle-shield-failed','沒有行動的失敗：銅框與缺少步驟'),
 ('forecast','study-forecast','預報入口只給目標'),
 ('forecast','forecast-fourth-choices','第四回合敵狼、己騎士、雙潮向同屏'),
 ('forecast','forecast-fourth-collapsed','同一局收合後仍可選退潮'),
 ('forecast','forecast-wrong-direction','方向不符：真實鎖定與零消耗說明'),
 ('forecast','forecast-fourth-battle','同一局第四回合戰場，無面板遮擋'),
 ('moen','moen-offline-entry','真斷網後進場，離線狀態列可見'),
 ('moen','moen-wave-2-impact','同一局浪牆命中後取得盾、英雄七血'),
 ('moen','moen-wave-3-cleared','同一局退浪後開始反攻'),
 ('moen','moen-shield-before','同一騎士四血，貝盾完整'),
 ('moen','moen-shield-after','同一騎士四血，破盾碎片跨卡框'),
]
items=[]
for n,(content,name,proof) in enumerate(selection,1):
    src=O/f'phone-{name}.png';dest=D/f'{n:02d}-{content}-{name}.png'
    assert Image.open(src).size==(390,844),src
    shutil.copy2(src,dest)
    assert src.read_bytes()==dest.read_bytes()
    playing=not name.startswith('study-') and not name.endswith('-failed')
    items.append(dict(content=content,playing=playing,path=dest.relative_to(R).as_posix(),source=src.relative_to(R).as_posix(),proof=proof,sha256=hashlib.sha256(src.read_bytes()).hexdigest()))
assert len(list(D.glob('*.png')))==15
for content in ['puzzles','forecast','moen']:assert sum(x['content']==content and x['playing'] for x in items)>=3
(O/'review-set-index.json').write_text(json.dumps(dict(status='VERIFIED',originalSize=[390,844],perContent=5,images=items),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('VERIFIED 15 original PNG copies, 5 per content')
