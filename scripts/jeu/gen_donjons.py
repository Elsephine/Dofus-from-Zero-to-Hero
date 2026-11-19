# Génère src/data/jeu/donjons.ts depuis les données du jeu (Dofus Unity) publiées par dofusdude/dofus3-main
# (fichiers dungeons.json, achievements.json, challenges.json, fr.json d'une release). Usage : gen_donjons.py <dossier> <version> <sortie.ts>
import json,re,sys
D,VER,OUT=sys.argv[1],sys.argv[2],sys.argv[3]
fr=json.load(open(f'{D}/fr.json'))['entries']
def refs(f): return {r['data']['id']: r['data'] for r in json.load(open(f'{D}/{f}'))['references']['RefIds']}
ach=refs('achievements.json'); dj=refs('dungeons.json'); ch=refs('challenges.json')
T=lambda i: re.sub(r'\s+',' ',fr.get(str(i),'')).strip()
def chal(m):
    c=ch.get(int(m.group(1)))
    return f"« {T(c['nameId'])} »" if c else 'un challenge'
out=[]
for d in sorted(dj.values(), key=lambda x:((x['optimalPlayerLevel'] or x['minLevel']), T(x['nameId']))):
    name=T(d['nameId'])
    if not name: continue
    al=[]
    first=ach.get(d['achievements']['Array'][0]) if d['achievements']['Array'] else None
    bm=re.search(r"Vaincre (?:le |la |les |l'|l’)?(.+?) dans son donjon", T(first['descriptionId'])) if first else None
    boss=bm.group(1) if bm else 'Le boss'
    for aid in d['achievements']['Array']:
        a=ach.get(aid)
        if not a: continue
        desc=re.sub(r'\[challenge,(\d+)\]', chal, T(a['descriptionId']))
        m=re.search(r'\[challenge,(\d+)\]', T(a['descriptionId']))
        tip=T(ch[int(m.group(1))]['descriptionId']) if m and int(m.group(1)) in ch else ''
        tip=re.sub(r'<[^>]+>','',tip).replace('{1}','N').replace('{0}',boss)
        al.append({'id':aid,'name':T(a['nameId']),'desc':desc,'tip':tip,'pts':a['points']})
    out.append({'id':d['id'],'name':name,'lvl':d['optimalPlayerLevel'] or d['minLevel'],'ach':al})
with open(OUT,'w') as f:
    f.write(f"// GÉNÉRÉ par scripts/jeu/gen_donjons.py depuis les données du jeu Dofus Unity {VER} (dépôt public dofusdude/dofus3-main). Ne pas éditer.\n")
    f.write("// Donjons (niveau conseillé) et leurs succès : nom, description (challenge à réussir), explication du challenge, points.\n")
    f.write("export interface DungeonAch { id: number; name: string; desc: string; tip: string; pts: number }\n")
    f.write("export interface Dungeon { id: number; name: string; lvl: number; ach: DungeonAch[] }\n")
    f.write(f"export const GAME_VERSION = {json.dumps(VER)};\n")
    f.write("export const dungeons: Dungeon[] = [\n"+''.join('  '+json.dumps(x,ensure_ascii=False)+',\n' for x in out)+"];\n")
print(len(out),'donjons',sum(len(x['ach']) for x in out),'succès')
