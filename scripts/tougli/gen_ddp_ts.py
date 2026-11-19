import json,re,sys,unicodedata
d=json.load(open(sys.argv[1])); src=open(sys.argv[2]).read()
def slug(s):
    s=unicodedata.normalize('NFD',s.lower()); s=''.join(c for c in s if unicodedata.category(c)!='Mn')
    return re.sub(r'(^-|-$)','',re.sub(r'[^a-z0-9]+','-',s))
def key(s): return slug(s).replace('-','')
names=[b.replace("\\'","'") for a,b in re.findall(r"""\bq\((['"])(.*?)(?<!\\)\1""",src)]
alias={key('La complote de P.O.M.S'):key('La complote des P.O.M.S')}
bykey={key(n):n for n in names}
lines=[]; miss=[]
for q in d['quests']:
    k=alias.get(key(q['name']),key(q['name']))
    if k not in bykey: miss.append(q['name']); continue
    o={'url':'https://www.dofuspourlesnoobs.com/'+q['url'].split('dofuspourlesnoobs.com/')[-1],'objectives':q['objectives']}
    if q['notes']: o['notes']=q['notes']
    lines.append(f"  {json.dumps('ddp-'+slug(bykey[k]))}: {json.dumps(o,ensure_ascii=False)},")
assert not miss, miss
print("""// GÉNÉRÉ par scripts/gen_ddp_ts.py depuis le classeur « Tougli Hupper - All Dofus » (v1.3.1, onglet « Dom de pin »),
// envoyé par Meriem le 19/11/2026. Source autorisée par elle pour le Dom de Pin uniquement. Ne pas éditer à la main.
// - url : lien Dofus pour les Noobs tel qu'écrit dans le classeur (lu, jamais déduit) ; à revérifier sur DPLN.
// - objectives : icônes de la ligne (identifiées via la légende de l'onglet) + texte à côté (xN = nombre, sinon libellé tel quel).
import type { DomDePinObjective } from './dom-de-pin';
export const domDePinTougli: Record<string, { url: string; objectives: DomDePinObjective[]; notes?: string[] }> = {""")
print('\n'.join(lines)); print('};')
print(f"// {len(lines)} quêtes", file=sys.stderr)
