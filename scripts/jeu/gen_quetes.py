# Génère src/data/jeu/quetes.ts : quêtes répétables (journalières / hebdomadaires) et quêtes d'alignement de Bonta
# (100 quêtes numérotées + apprentissages des 3 ordres), depuis les données publiques dofusdude/dofus3-main.
# Usage : gen_quetes.py <dossier_d3 (fr.json, quests.json, quest_categories.json)> <version> <fichier_sortie>
import json, re, sys
D, VER, OUT = sys.argv[1:4]
fr = json.load(open(f'{D}/fr.json'))['entries']
T = lambda i: re.sub(r'\s+', ' ', fr.get(str(i), '')).strip()
R = lambda f: [r['data'] for r in json.load(open(f))['references']['RefIds'] if 'id' in r['data']]
cats = {c['id']: T(c['nameId']) for c in R(f'{D}/quest_categories.json')}
qs = R(f'{D}/quests.json')

# Répétables : 1 = chaque jour, 2 = chaque semaine. On écarte l'Almanax (onglet dédié), les événements saisonniers,
# Temporis et ce qui est réservé à Brâkmar (on joue Bonta).
SKIP = {'Almanax', 'Île de Nowel', 'Archipel de Vulkania', 'Île de Pwâk', 'Événements', 'Temporis', 'Brâkmar', 'Alignement Brâkmar'}
rep = []
for q in qs:
    if q['repeatType'] not in (1, 2) or cats.get(q['categoryId']) in SKIP or not T(q['nameId']): continue
    if 'Ps=2' in (q.get('startCriterion') or ''): continue  # réservé aux Brâkmariens
    rep.append({'id': q['id'], 'n': T(q['nameId']), 'z': cats.get(q['categoryId'], '?'), 'l': q['levelMin'], 'f': 'j' if q['repeatType'] == 1 else 'h'})
rep.sort(key=lambda x: (x['z'], x['l'], x['n']))

# Alignement Bonta : quêtes numérotées (critère Pa=N) et apprentissages d'ordre (critère Pr=…).
bonta = [q for q in qs if q['categoryId'] == 9]
num = []
for q in bonta:
    m = re.search(r'(?:^|&)Pa=(\d+)', q.get('startCriterion') or '')
    if m and 'Pr=' not in q['startCriterion']: num.append({'id': q['id'], 'n': T(q['nameId']), 'l': q['levelMin'], 'a': int(m.group(1)) + 1})
num.sort(key=lambda x: x['a'])
byName = {T(q['nameId']): q for q in bonta}
ORDERS = [
  ('coeur', 'Ordre du Cœur Vaillant', 'Ménalt', ['Disciple de Ménalt', 'Écuyer', "Chevalier de l'Espoir", 'Champion Merveilleux', 'Héros Légendaire']),
  ('esprit', "Ordre de l'Esprit Salvateur", 'Jiva', ['Disciple de Jiva', 'Apprenti Éclairé', 'Adepte des Écrits', 'Maître des Parchemins', 'Gardien du Savoir']),
  ('oeil', "Ordre de l'Œil Attentif", 'Silvosse', ['Disciple de Silvosse', 'Espion Silencieux', 'Chasseur de Renégats', 'Assassin Suprême', 'Maître des Illusions']),
]
orders = []
for key, name, god, ranks in ORDERS:
    steps = []
    for r in ranks:
        q = byName.get('Apprentissage : ' + r)
        if q:
            m = re.search(r'Pa>(\d+)', q['startCriterion'] or '')
            steps.append({'id': q['id'], 'n': 'Apprentissage : ' + r, 'rank': r, 'l': q['levelMin'], 'a': int(m.group(1)) + 1 if m else 0})
    orders.append({'key': key, 'name': name, 'god': god, 'steps': steps})

with open(OUT, 'w') as f:
    f.write(f'// GÉNÉRÉ par scripts/jeu/gen_quetes.py depuis les données du jeu Dofus Unity {VER} (dépôt public dofusdude/dofus3-main). Ne pas éditer.\n')
    f.write("export interface RepQuest { id: number; n: string; z: string; l: number; f: 'j' | 'h' }\n")
    f.write('export interface AlignQuest { id: number; n: string; l: number; a: number }\n')
    f.write('export interface OrderStep { id: number; n: string; rank: string; l: number; a: number }\n')
    f.write("export interface BontaOrder { key: 'coeur' | 'esprit' | 'oeil'; name: string; god: string; steps: OrderStep[] }\n")
    f.write(f'export const QUESTS_VERSION = "{VER}";\n')
    f.write('/** Quêtes répétables : f = j (chaque jour) ou h (chaque semaine), z = zone, l = niveau minimum. */\n')
    f.write('export const repeatables: RepQuest[] = ' + json.dumps(rep, ensure_ascii=False) + ';\n')
    f.write("/** Quêtes d'alignement de Bonta, a = numéro (niveau d'alignement requis + 1). */\n")
    f.write('export const bontaQuests: AlignQuest[] = ' + json.dumps(num, ensure_ascii=False) + ';\n')
    f.write('/** Les 3 ordres de Bonta et leurs apprentissages successifs. */\n')
    f.write('export const bontaOrders: BontaOrder[] = ' + json.dumps(orders, ensure_ascii=False) + ';\n')
print(len(rep), 'répétables', len(num), 'quêtes Bonta', [len(o['steps']) for o in orders])
