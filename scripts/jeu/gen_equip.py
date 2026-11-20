"""Équipements pour le constructeur de stuffs : [id, nom, niveau, groupe, iconId] (données dofusdude/dofus3-main)."""
import json, re, sys
D = sys.argv[1] if len(sys.argv) > 1 else '/tmp/d3b'; FR = sys.argv[2] if len(sys.argv) > 2 else '/tmp/d3/fr.json'
fr = json.load(open(FR))['entries']; T = lambda i: re.sub(r'\s+', ' ', fr.get(str(i), '')).strip()
G = {1: 'amu', 9: 'ann', 16: 'cha', 17: 'cap', 10: 'cei', 11: 'bot', 82: 'bou', 18: 'fam', 121: 'fam', 331: 'fam', 332: 'fam', 333: 'fam', 23: 'dof', 151: 'dof', 217: 'dof'}
for t in (2, 3, 4, 5, 6, 7, 8, 19, 21, 22, 114, 271): G[t] = 'arm'
out = []
for r in json.load(open(f'{D}/items.json'))['references']['RefIds']:
    d = r['data']
    if 'id' not in d or d.get('typeId') not in G: continue
    n = T(d['nameId'])
    if not n or n.startswith('#') or n.startswith('['): continue
    out.append([d['id'], n, d.get('level', 1), G[d['typeId']], d.get('iconId', 0)])
out.sort(key=lambda x: (x[3], -x[2], x[1]))
open('src/data/jeu/equip.json', 'w', encoding='utf-8').write(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
print(len(out), 'équipements')
