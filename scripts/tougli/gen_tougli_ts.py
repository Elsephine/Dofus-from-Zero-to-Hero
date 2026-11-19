# Génère src/data/tougli/*.ts et public/dofus/*.webp depuis les extractions du classeur Tougli.
import json,re,sys,os,unicodedata
from PIL import Image
OUT=sys.argv[1]; REPO=sys.argv[2]
def slug(s):
    s=unicodedata.normalize('NFD',s.lower()); s=''.join(c for c in s if unicodedata.category(c)!='Mn')
    return re.sub(r'(^-|-$)','',re.sub(r'[^a-z0-9]+','-',s))
info=json.load(open(OUT+'/dofus.json')); res=json.load(open(OUT+'/resources.json'))['quests']
os.makedirs(REPO+'/public/dofus',exist_ok=True); os.makedirs(REPO+'/src/data/tougli',exist_ok=True)
ID={'Dofus Emeraude':'emeraude','Dofus Pourpre':'pourpre','Dofus Turquoise':'turquoise','Dofus Ivoire':'ivoire','Dofus Ebene':'ebene','Dofus Ocre':'ocre','Dofus Sylvestre':'sylvestre','Dom de pin':'dom-de-pin'}
NAME_FIX={'Dofus Emeraude':'Dofus Émeraude','Dofus Ebene':'Dofus Ébène','Dofus Nebuleux':'Dofus Nébuleux','Dofus des Glaçes':'Dofus des Glaces','Dom de pin':'Dom de Pin','Dofus Kaliptus':'Dofus Kaliptus'}
rows=[]
for d in info:
    sheet=d['sheet']; did=ID.get(sheet, slug(sheet))
    name=NAME_FIX.get(sheet,sheet)
    lines=[l for l in d['lines'] if slug(l) not in (slug(d['title']), slug(sheet)) and slug(l) not in slug(sheet)]
    effect=' '.join(re.sub(r'\s+',' ',l) for l in lines if len(l)>35)
    stats=[re.sub(r'\s+',' ',l) for l in lines if len(l)<=35]
    img=None
    if d['image']:
        im=Image.open(OUT+'/img/'+d['image']).convert('RGBA'); bb=im.getbbox()
        if bb: im=im.crop(bb)
        im.thumbnail((160,160)); img=did+'.webp'; im.save(REPO+'/public/dofus/'+img,'WEBP',quality=88)
    rows.append({'id':did,'name':name,'level':d['level'],'stats':stats,'effect':effect,'image':img})
with open(REPO+'/src/data/tougli/dofus-info.ts','w') as f:
    f.write("// GÉNÉRÉ par scripts/tougli/gen_tougli_ts.py depuis le classeur Tougli (onglets des Dofus). Ne pas éditer à la main.\n")
    f.write("// Nom, niveau recommandé, bonus et effet de chaque Dofus + image (public/dofus). Ordre = ordre du classeur.\n")
    f.write("export interface DofusInfo { id: string; name: string; level: string | null; stats: string[]; effect: string; image: string | null }\n")
    f.write("export const dofusInfo: DofusInfo[] = [\n"+''.join('  '+json.dumps(r,ensure_ascii=False)+',\n' for r in rows)+"];\n")
with open(REPO+'/src/data/tougli/resources.ts','w') as f:
    f.write("// GÉNÉRÉ par scripts/tougli/gen_tougli_ts.py depuis l'onglet « database » du classeur Tougli : ressources demandées par quête.\n")
    f.write("// Clé = nom de quête tel qu'écrit dans le classeur ; rapprochement avec nos quêtes par nom normalisé (voir model/resources.ts).\n")
    f.write("export const questResources: Record<string, [string, number][]> = {\n")
    for q,lst in res.items(): f.write('  '+json.dumps(q,ensure_ascii=False)+': '+json.dumps([[x['name'],x['qty']] for x in lst],ensure_ascii=False)+',\n')
    f.write("};\n")
print(len(rows),'dofus')
