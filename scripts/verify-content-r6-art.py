from pathlib import Path
from PIL import Image
import colorsys,json,hashlib
R=Path(__file__).resolve().parents[1];m=json.loads((R/'docs/art/ASSET_MANIFEST_CONTENT_R6.json').read_text(encoding='utf8'));rows=[]
for entry in [m['source']]+m['files']:
    p=R/entry['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==entry['sha256'];im=Image.open(p).convert('RGBA');assert im.getchannel('A').getextrema()[0]==0
    sample=im.resize((128,128),Image.Resampling.BOX);pixels=sample.get_flattened_data() if hasattr(sample,'get_flattened_data') else sample.getdata();hsv=[colorsys.rgb_to_hsv(r/255,g/255,b/255) for r,g,b,a in pixels if a>32]
    v=sum(x[2] for x in hsv)/len(hsv);s=sum(x[1] for x in hsv)/len(hsv);black=sum(x[2]<.1 for x in hsv)/len(hsv);low=sum(x[1]<.12 for x in hsv)/len(hsv)
    rows.append(dict(path=entry['path'],brightness=v,saturation=s,nearBlack=black,lowSaturation=low,passGate=.30<=v<=.75 and s>=.32 and black<.35 and low<.20))
receipt=dict(status='VERIFIED' if all(x['passGate'] for x in rows) else 'BLOCKED',method='Same HSV algorithm and thresholds as existing R76: 128px BOX, alpha >32, V .30-.75, S >=.32, V<.1 <35%, S<.12 <20%. No display filters.',rows=rows)
(R/'docs/content/r6/art-gates.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf8');print(json.dumps(receipt));assert receipt['status']=='VERIFIED'
