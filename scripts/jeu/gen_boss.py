# Génère src/data/jeu/boss.ts : boss de chaque donjon (id du monstre, nom, gfxId pour l'image) depuis dofusdude/dofus3-main.
# Les images viennent de DofusDB (https://api.dofusdb.fr/img/monsters/<gfxId>.png), chargées par le navigateur.
# Usage : gen_boss.py <dossier_d3 (fr.json, dungeons.json, monsters.json)> <fichier_sortie>
import json, re, sys
D, OUT = sys.argv[1:3]
fr = json.load(open(f'{D}/fr.json'))['entries']
T = lambda i: re.sub(r'\s+', ' ', fr.get(str(i), '')).strip()
R = lambda f: {r['data']['id']: r['data'] for r in json.load(open(f))['references']['RefIds'] if 'id' in r['data']}
mon = R(f'{D}/monsters.json'); dj = R(f'{D}/dungeons.json')
byDungeon, byName = {}, {}
for d in dj.values():
    bs = []
    for b in d['bosses']['Array']:
        m = mon.get(b)
        if not m: continue
        n = T(m['nameId']); bs.append({'id': b, 'n': n, 'g': m['gfxId']})
        byName.setdefault(n, [b, m['gfxId']])
    if bs: byDungeon[d['id']] = bs
with open(OUT, 'w') as f:
    f.write('// GÉNÉRÉ par scripts/jeu/gen_boss.py (données dofusdude). Boss de chaque donjon : id du monstre, nom, gfxId (image).\n')
    f.write('export const dungeonBosses: Record<number, { id: number; n: string; g: number }[]> = ' + json.dumps(byDungeon, ensure_ascii=False) + ';\n')
    f.write('/** nom du boss -> [id du monstre, gfxId] */\n')
    f.write('export const bossByName: Record<string, [number, number]> = ' + json.dumps(byName, ensure_ascii=False) + ';\n')
print(len(byDungeon), 'donjons', len(byName), 'boss')
