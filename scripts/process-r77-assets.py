"""R77 audit only: native-alpha preservation, explicit resize/compression and evidence."""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
import hashlib,json,colorsys
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'docs/art';SRC=ART/'source/r77';OUT=ROOT/'assets/art/r77';THUMB=ART/'thumbs/r77'
THUMB.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def metrics(im):
 im=im.convert('RGBA').resize((128,128),Image.Resampling.BOX)
 hsv=[colorsys.rgb_to_hsv(r/255,g/255,b/255) for r,g,b,a in im.getdata() if a>32]
 v=sum(x[2] for x in hsv)/len(hsv);s=sum(x[1] for x in hsv)/len(hsv);black=sum(x[2]<.1 for x in hsv)/len(hsv);low=sum(x[1]<.12 for x in hsv)/len(hsv)
 return dict(brightness=v,saturation=s,near_black_ratio=black,low_saturation_ratio=low,double_gate_pass=.30<=v<=.75 and s>=.32 and black<.35 and low<.20)
prefix="Tiderend Cards 'Moonrift Sea Treasury', painterly collectible fantasy, indigo #201C3D and #10152D, pearl-white #F2F1FA, restrained coral-copper #DA8A6D glints, top-left moonlight, dark indigo crisp silhouette."
specs=[
 ('wave','spell-wall','A tremendous horizontal rolling tidal wall, slightly elevated three-quarter tabletop perspective, broad low crest across full width. Moon-shell wave shapes, individual foam droplets, indigo body, pearl edges, transparent negative space. No horizon, background, text or frame.'),
 ('foam','impact-object','One isolated seafoam impact burst: low arc of dense pearl foam and readable water droplets spraying upward/outward from a navy curling wave. Clear center, asymmetrical crescent, real transparent alpha, no environment/text.'),
 ('puddle','wet-decal','One wide shallow irregular crescent puddle left after a wave recedes. Elevated three-quarter tabletop perspective; foreshortened oval, broken ripple rings, thin pearl foam edge, moon reflection, copper flecks, transparent islands, no wood or horizon.'),
 ('battlefield','main-background','One uninterrupted ship-deck card-table floor, elevated three-quarter overhead view. Entire middle/lower85% same continuous violet-brown plank plane, inlaid copper compass and shell-wave engraving. Low railing only in top12%, quiet empty play area. No horizontal ocean band, split decks, cards or UI.'),
 ('victory-navigator','protagonist-lighting-edit','Keep exact referenced identity, short dark purple hair, friendly face, coral scarf, indigo embroidered coat, raised wave flag and compass jewelry. Change only to night top-left moonlight, no sunset ambient glow. Preserve readable face and true native alpha.'),
 ('night-harbor','victory-background','Returning ship at midnight harbor, spired towers, arch bridges, far crescent wave behind sea gate, pearl surf along lower edge, tiny copper dock lamps. Dark center for existing navigator/UI, illuminated sides. No sunset, people or lettering.'),
 ('frame','ui-border','One thin portrait2:3 bronze-and-pearl card frame. Forged copper rails, shell/wave etching, silver moon crest, small faceted corners. Border under8% width,88% empty transparent center. Straight-on, no perspective, no text or background.'),
 ('icon-wave','skill-icon','One diagonal pearl wave across clipped-corner copper compass token, indigo enamel. Bold silhouette readable at64px, fine material highlights. Real transparent outside, no text, numbers or turquoise neon.'),
 ('logo','title-lighting-edit','Preserve exact Traditional Chinese 裂潮卡牌 and English TIDEREND, original arrangement/crescent-wave mark/sharp letterforms. Refine pearl and copper material edges; reduce cyan to indigo/pearl. True transparent background, no extra words.'),
 ('app-icon','app-icon-proposal','Square full bleed: one diagonal copper-framed collectible card split by a powerful white crescent wave from lower-left to upper-right. Bold card-plus-ocean silhouette at64px, indigo background, shell etching. No words, characters or fake screenshot. Important imagery central78%.')]
refs={'victory-navigator':'docs/art/source/r76/victory-navigator.png','logo':'docs/art/source/r76/logo.png'}
manifest=dict(round='R77',status='EXECUTED',tool='image_gen.imagegen',model_slug=None,model_note='Actual built-in tool did not expose a verifiable model slug. No inferred gpt-image model claim.',assets=[],alpha_policy='Native RGBA returned by actual tool. Original PNG preserved; derived alpha masks and alpha-preserving WebP. No invented opaque-master or background-removal claim.')
prompts=dict(tool=manifest['tool'],model_slug=None,style_prefix=prefix,assets=[])
for id,kind,request in specs:
 p=SRC/(id+'.png');im=Image.open(p);assert im.format=='PNG'
 runtimes=[OUT/(id+'.webp')]
 if id=='battlefield':runtimes.append(OUT/'battlefield-low.webp')
 if id=='app-icon':runtimes.append(OUT/'app-icon-proposal.png')
 row=dict(id=id,kind=kind,source=p.relative_to(ROOT).as_posix(),source_sha256=sha(p),source_bytes=p.stat().st_size,size=list(im.size),mode=im.mode,source_metrics=metrics(im),runtime=[])
 for q in runtimes:
  rt=Image.open(q);row['runtime'].append(dict(path=q.relative_to(ROOT).as_posix(),sha256=sha(q),bytes=q.stat().st_size,size=list(rt.size),format=rt.format,metrics=metrics(rt)))
 if im.mode=='RGBA':
  alpha=im.getchannel('A');h=alpha.histogram();corners=[alpha.getpixel(x) for x in [(0,0),(im.width-1,0),(0,im.height-1),(im.width-1,im.height-1)]]
  row['alpha']=dict(corners=corners,transparent_ratio=sum(h[:16])/(im.width*im.height),occupancy=sum(h[32:])/(im.width*im.height),bbox=alpha.getbbox(),center=alpha.getpixel((im.width//2,im.height//2)),native=True)
  alpha.save(THUMB/(id+'-mask.png'))
 if id in refs:row['reference']=dict(path=refs[id],sha256=sha(ROOT/refs[id]))
 if id=='frame':assert row['alpha']['center']==0
 if id=='victory-navigator':assert row['source_metrics']['double_gate_pass'] and row['runtime'][0]['metrics']['double_gate_pass']
 ImageOps.contain(im,(64,64),Image.Resampling.LANCZOS).save(THUMB/(id+'-64.png'))
 prompts['assets'].append(dict(id=id,use=kind,prompt=prefix+' '+request,reference=row.get('reference'),transparent_background=im.mode=='RGBA',note='Normalized production prompt retaining supplied constraints; actual source and native alpha recorded.'))
 manifest['assets'].append(row)
sheet=Image.new('RGB',(5*120,2*106),'#201c3d');d=ImageDraw.Draw(sheet)
for i,row in enumerate(manifest['assets']):
 im=Image.open(THUMB/(row['id']+'-64.png')).convert('RGBA');x=(i%5)*120+28;y=(i//5)*106+8;sheet.paste(im,(x,y),im);d.text(((i%5)*120+5,y+68),row['id'],fill='white')
sheet.save(THUMB/'contact-64.png')
alpha_rows=[a for a in manifest['assets'] if 'alpha'in a];fringe=Image.new('RGB',(640,len(alpha_rows)*140));d=ImageDraw.Draw(fringe)
for i,a in enumerate(alpha_rows):
 for n,bg in enumerate(['#ffffff','#201c3d']):
  d.rectangle((n*320,i*140,n*320+320,i*140+140),fill=bg);im=ImageOps.contain(Image.open(ROOT/a['source']).convert('RGBA'),(280,115));fringe.paste(im,(n*320+(320-im.width)//2,i*140+8),im)
fringe.save(THUMB/'alpha-fringe-review.png')
manifest.update(generated_master_count=len(specs),source_bytes=sum(x['source_bytes'] for x in manifest['assets']),runtime_bytes=sum(v['bytes'] for x in manifest['assets'] for v in x['runtime']),status='VERIFIED',thumbnail='docs/art/thumbs/r77/contact-64.png')
(ART/'ASSET_MANIFEST_R77.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ART/'PROMPTS_R77.json').write_text(json.dumps(prompts,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for name,entry in [('PROMPTS.json','PROMPTS_R77.json'),('ASSET_MANIFEST.json','ASSET_MANIFEST_R77.json')]:
 p=ART/name;data=json.loads(p.read_text(encoding='utf-8'));data.setdefault('rounds',{})['R77']=entry;p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('R77:',len(specs),'masters; native alpha, format, source/runtime hashes; protagonist double gates PASS; runtime bytes',manifest['runtime_bytes'])
