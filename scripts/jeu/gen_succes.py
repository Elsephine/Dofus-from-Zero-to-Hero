# Génère src/data/jeu/succes.ts (tous les succès hors Temporis, avec catégories et objectifs)
# et src/data/jeu/clefs.ts (clé de chaque donjon + recette) depuis les données publiques dofusdude/dofus3-main.
# Usage : gen_succes.py <dossier_d3> <dossier_items> <version> <dossier_sortie>
import json, re, sys
D, I, VER, OUT = sys.argv[1:5]
fr = json.load(open(f'{D}/fr.json'))['entries']
T = lambda i: re.sub(r'\s+', ' ', fr.get(str(i), '')).strip()
R = lambda f: {r['data']['id']: r['data'] for r in json.load(open(f))['references']['RefIds'] if 'id' in r['data']}
cats = R(f'{D}/achievement_categories.json'); ach = R(f'{D}/achievements.json'); obj = R(f'{D}/achievement_objectives.json')
ch = R(f'{D}/challenges.json')
SKIP = {103}  # Temporis : serveurs saisonniers
def top(c):
    while cats[c]['parentId']: c = cats[c]['parentId']
    return c
catlist = []
for c in sorted(cats.values(), key=lambda c: (cats[top(c['id'])]['order'], c['parentId'] != 0, c['order'])):
    if top(c['id']) in SKIP or not T(c['nameId']): continue
    catlist.append({'id': c['id'], 'name': T(c['nameId']), 'parent': c['parentId']})
okcats = {c['id'] for c in catlist}
def clean(s):
    s = re.sub(r'\[challenge,(\d+)\]', lambda m: f"« {T(ch[int(m.group(1))]['nameId'])} »" if int(m.group(1)) in ch else 'un challenge', s)
    return re.sub(r'<[^>]+>', '', s)
out = []
for c in catlist:
    for aid in cats[c['id']]['achievementIds']['Array']:
        a = ach.get(aid)
        if not a or not T(a['nameId']): continue
        objs = [clean(T(obj[o]['nameId'])) for o in a['objectiveIds']['Array'] if o in obj]
        objs = [o for o in objs if o]
        out.append({'id': aid, 'n': T(a['nameId']), 'd': clean(T(a['descriptionId'])), 'p': a['points'], 'c': c['id'], 'l': a['level'], **({'o': objs} if len(objs) > 1 else {})})
with open(f'{OUT}/succes.ts', 'w') as f:
    f.write(f"// GÉNÉRÉ par scripts/jeu/gen_succes.py depuis les données du jeu Dofus Unity {VER} (dépôt public dofusdude/dofus3-main). Ne pas éditer.\n")
    f.write("// Tous les succès (hors Temporis) : n nom, d description, p points, c catégorie, l niveau, o objectifs (si plusieurs).\n")
    f.write("export interface AchCat { id: number; name: string; parent: number }\n")
    f.write("export interface Ach { id: number; n: string; d: string; p: number; c: number; l: number; o?: string[] }\n")
    f.write("export const achCats: AchCat[] = " + json.dumps(catlist, ensure_ascii=False) + ";\n")
    f.write("export const achievements: Ach[] = [\n" + ''.join(json.dumps(x, ensure_ascii=False) + ',\n' for x in out) + "];\n")
print(len(catlist), 'catégories', len(out), 'succès', sum(x['p'] for x in out), 'points')

# Clés de donjon
items = R(f'{I}/items.json'); rec = {r['data']['resultId']: r['data'] for r in json.load(open(f'{I}/recipes.json'))['references']['RefIds']}
dj = R(f'{D}/dungeons.json')
keys = {}
for d in dj.values():
    for ro in d['requiredObjects']['Array']:
        it = items.get(ro['id'])
        if not it: continue
        nm = T(it['nameId'])
        if not nm.lower().startswith('clef') and not nm.lower().startswith('clé'): continue
        r = rec.get(ro['id'])
        recipe = [[T(items[i]['nameId']), q] for i, q in zip(r['ingredientIds']['Array'], r['quantities']['Array']) if i in items] if r else []
        keys[d['id']] = {'name': nm, 'recipe': recipe}
with open(f'{OUT}/clefs.ts', 'w') as f:
    f.write(f"// GÉNÉRÉ par scripts/jeu/gen_succes.py (Dofus Unity {VER}, données dofusdude). Clé de chaque donjon (id du donjon) et sa recette.\n")
    f.write("export const dungeonKeys: Record<number, { name: string; recipe: [string, number][] }> = " + json.dumps(keys, ensure_ascii=False) + ";\n")
print(len(keys), 'clés', sum(1 for k in keys.values() if k['recipe']), 'avec recette')
