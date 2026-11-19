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

# Quêtes de chaque Dofus (onglets du classeur), sauf Dom de Pin qui a sa liste corrigée à la main (dom-de-pin.ts).
qs=json.load(open(OUT+'/quests.json'))
def fix(u): return 'https://www.dofuspourlesnoobs.com/'+u.split('dofuspourlesnoobs.com/')[-1] if u else u
with open(REPO+'/src/data/tougli/quests.ts','w') as f:
    f.write("// GÉNÉRÉ par scripts/tougli/gen_tougli_ts.py (extract_all_quests.py) depuis les onglets Dofus du classeur Tougli. Ne pas éditer à la main.\n")
    f.write("// Ordre conseillé par Tougli, liens Dofus pour les Noobs tels qu'écrits dans le classeur, icônes de la ligne (type + xN ou libellé),\n")
    f.write("// hint = lignes de texte placées au-dessus d'une quête, group = quêtes à faire ensemble.\n")
    f.write("// choices = « Choix avant de commencer » (alignement, ordre, métier) ; variant = la quête dépend de ce choix.\n")
    f.write("import type { DomDePinObjective } from '../dom-de-pin';\n")
    f.write("export interface SheetLink { name: string; url?: string }\n")
    f.write("export interface SheetVariant { selector: string; cases: { match: string; item: SheetLink | null }[]; else: SheetLink | null }\n")
    f.write("export interface SheetItem { name: string; url?: string; objectives: DomDePinObjective[]; notes?: string[]; hint?: string; group?: string; variant?: SheetVariant }\n")
    f.write("export interface SheetSection { title: string; items: SheetItem[] }\n")
    f.write("export interface SheetChoice { label: string; options: string[]; default: string | null }\n")
    f.write("export const sheetQuests: Record<string, { choices: Record<string, SheetChoice>; sections: SheetSection[] }> = {\n")
    for sheet,data in qs['sheets'].items():
        did=ID.get(sheet, slug(sheet))
        if did=='dom-de-pin': continue
        for sec in data['sections']:
            sec['title']=re.sub(r'\s+',' ',sec['title'])
            for it in sec['items']:
                if it.get('url'): it['url']=fix(it['url'])
                v=it.get('variant')
                if v:
                    for c in v['cases']:
                        if c['item'] and c['item'].get('url'): c['item']['url']=fix(c['item']['url'])
                    if v['else'] and v['else'].get('url'): v['else']['url']=fix(v['else']['url'])
        f.write(f"  {json.dumps(did)}: {{\n    choices: {json.dumps(data['selectors'],ensure_ascii=False)},\n    sections: [\n")
        for sec in data['sections']: f.write("      "+json.dumps(sec,ensure_ascii=False)+",\n")
        f.write("    ],\n  },\n")
    f.write("};\n")
