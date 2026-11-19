# Extrait, pour chaque onglet Dofus du classeur Tougli : sections, quêtes (lien DPLN), groupes, indices, icônes (type + nombre/libellé).
import openpyxl,re,json,sys,zipfile,hashlib,collections
X=sys.argv[1]
z=zipfile.ZipFile(X)
wbx=z.read('xl/workbook.xml').decode(); rel=z.read('xl/_rels/workbook.xml.rels').decode()
sheet_file={n:re.search(r'Id="%s"[^>]*Target="([^"]+)"'%rid,rel).group(1) for n,rid in re.findall(r'<sheet [^>]*?name="([^"]+)" sheetId="\d+" r:id="(rId\d+)"',wbx)}
LABEL2ID={'combat solo':'combat-solo','combat groupe':'combat-groupe','combat a vague solo':'combat-vague-solo','combat à vague solo':'combat-vague-solo',
'combat a vague groupe':'combat-vague-groupe','combat à vague groupe':'combat-vague-groupe','combat tactique solo':'combat-tactique-solo','donjon':'donjon',
'horaires strictes':'horaires-stricts','horaires stricts':'horaires-stricts','caracteristiques':'caracteristiques','caractéristiques':'caracteristiques',
'bashing mob':'bashing-mob','bash monstre':'bashing-mob','dimension':'dimension',"besoin d'un sort":'besoin-sort','façonneur':'faconneur','faconneur':'faconneur',
'paysan':'paysan','anomalie':'anomalie','mineur':'mineur','songe':'songe','forgeron':'forgeron','alchimiste':'alchimiste','sculpteur':'sculpteur','dalles':'dalles',
'bucheron':'bucheron','bûcheron':'bucheron','pecheur':'pecheur','pêcheur':'pecheur','chasseur':'chasseur','bijoutier':'bijoutier','cordonnier':'cordonnier','tailleur':'tailleur',
'archimonstre':'archimonstre','combat solo à vague':'combat-vague-solo','combat vague solo':'combat-vague-solo','combat a vague en groupe':'combat-vague-groupe',
'combat solo tactique':'combat-tactique-solo','bashing':'bashing-mob','bashing monstres':'bashing-mob','dimensions':'dimension','songes':'songe','donjons':'donjon',
'caractéristique':'caracteristiques','stats requises':'caracteristiques','necessite un sort':'besoin-sort','necessite un succés':'succes','conditon de temps':'horaires-stricts',
'aide de personnes':'aide-personnes','kamas':'kamas','ressources':'ressources','chasse au tresor':'chasse-tresor','parangon':'parangon','capture':'capture','combat':'combat','pvp':'pvp','koliseum':'koliseum','percepteur':'percepteur','succes':'succes','succès':'succes'}
def anchors(sheet):
    sf='xl/'+sheet_file[sheet]; p=sf.replace('worksheets/','worksheets/_rels/')+'.rels'
    if p not in z.namelist(): return []
    m=re.search(r'Target="\.\./drawings/(drawing\d+\.xml)"',z.read(p).decode())
    if not m: return []
    d=z.read('xl/drawings/'+m.group(1)).decode(); drels=dict(re.findall(r'Id="(rId\d+)"[^>]*Target="([^"]*)"',z.read('xl/drawings/_rels/'+m.group(1)+'.rels').decode()))
    out=[]
    for a in re.findall(r'<xdr:(?:oneCellAnchor|twoCellAnchor)[^>]*>(.*?)</xdr:(?:oneCellAnchor|twoCellAnchor)>',d,re.S):
        f=re.search(r'<xdr:from><xdr:col>(\d+)</xdr:col>.*?<xdr:row>(\d+)</xdr:row>',a,re.S); e=re.search(r'r:embed="(rId\d+)"',a)
        if f and e: out.append((int(f.group(2))+1,int(f.group(1))+1,hashlib.md5(z.read('xl/'+drels[e.group(1)].replace('../',''))).hexdigest()[:8]))
    return out
DUMMY='__xludf.DUMMYFUNCTION'
def cell_link(ws,ref):
    ref=ref.strip()
    if not re.fullmatch(r'\$?[A-Z]+\$?\d+',ref): return None
    v=ws[ref.replace('$','')].value
    if isinstance(v,str) and 'HYPERLINK' in v.upper():
        m=re.findall(r'"([^"]*)"',v); return {'name':m[-1].strip(),'url':m[0]}
    if isinstance(v,str) and v.strip() and v.strip().lower()!='toignore' and not v.startswith('='): return {'name':v.strip()}
    return None
def cached(v):
    if isinstance(v,str) and DUMMY in v:
        m=re.search(r',"((?:[^"]|"")*)"\)\s*$',v)
        return m.group(1).replace('""','"') if m else None
    return v
def split_args(t):
    out=[]; depth=0; cur=''; q=False
    for ch in t:
        if ch=='"': q=not q
        if not q and ch=='(': depth+=1
        if not q and ch==')': depth-=1
        if not q and ch==',' and depth==0: out.append(cur); cur=''; continue
        cur+=ch
    out.append(cur); return [x.strip() for x in out]
def parse_if(ws,expr,cases):
    expr=expr.strip()
    m=re.match(r'IF\((.*)\)$',expr,re.S)
    if not m: return None if expr in ('""','') else cell_link(ws,expr)
    args=split_args(m.group(1))
    cm=re.match(r'REGEXMATCH\(\$?([A-Z]+)\$?(\d+),(.*)\)$',args[0],re.S)
    if not cm: return None
    match=''.join(re.findall(r'"([^"]*)"',cm.group(3)))
    then=args[1]
    if then.startswith('IF('):
        sub=[]; e=parse_if(ws,then,sub)
        for c in sub: cases.append({**c,'match':match+' & '+c['match'],'selector':cm.group(1)+cm.group(2)+'+'+c['selector']})
    else:
        cases.append({'selector':cm.group(1)+cm.group(2),'match':match,'item':cell_link(ws,then)})
    return parse_if(ws,args[2],cases) if len(args)>2 else None
def parse_variant(ws,v):
    body=re.search(r'DUMMYFUNCTION\("(.*)"\),"(.*)"\)\s*$',v,re.S)
    if not body: return None
    expr=body.group(1).replace('""','"'); cached=body.group(2).replace('""','"')
    cases=[]; other=parse_if(ws,expr,cases)
    sels=sorted({c['selector'] for c in cases})
    return {'selector':sels[0] if len(sels)==1 else '|'.join(sels),'cases':[{'match':c['match'],'item':c['item']} for c in cases],'else':other,'cached':cached}
def selectors(ws):
    out={}
    for dv in ws.data_validations.dataValidation:
        f=str(dv.formula1 or '')
        if dv.type!='list' or ',' not in f or 'TRUE' in f.upper(): continue
        for ref in str(dv.sqref).split():
            c=ws[ref.split(':')[0]]; lab=ws.cell(c.row-1,c.column).value
            out[c.coordinate]={'label':str(lab).strip().rstrip(' :') if isinstance(lab,str) and DUMMY not in lab else 'Choix','options':[o.strip() for o in f.strip('"').split(',')],'default':str(c.value).strip() if c.value else None}
    return out
wb=openpyxl.load_workbook(X)
SKIP={'ACCUEIL','database'}
# 1) légendes -> hash d'icône -> type
H2T={}; unknown_labels=set()
per=[]
for name in wb.sheetnames:
    if name in SKIP: continue
    ws=wb[name]; an=anchors(name); per.append((name,ws,an))
    leg=None
    for r in range(1,40):
        if str(ws.cell(r,3).value).strip()=='Légende': leg=r
    if not leg: continue
    end=leg+1
    for r in range(leg+1,leg+8):
        if isinstance(ws.cell(r,3).value,str) and ws.cell(r,3).value.strip(): break
        end=r
    for r in range(leg+1,end+1):
        for c in range(4,40):
            v=ws.cell(r,c).value
            if isinstance(v,str) and v.strip():
                lab=v.strip()
                if 'HYPERLINK' in lab.upper() or len(lab)>30: continue
                cand=[(cc,h) for rr,cc,h in an if rr==r and c-4<=cc<c]
                if not cand: continue
                t=LABEL2ID.get(lab.lower())
                if not t: t='autre:'+lab; unknown_labels.add(lab)
                H2T.setdefault(max(cand)[1],t)
# 2) quêtes
res={}; unk=collections.Counter()
for name,ws,an in per:
    leg=max([r for r in range(1,40) if str(ws.cell(r,3).value).strip()=='Légende'] or [0])
    start=leg+1
    while start<ws.max_row and not (isinstance(ws.cell(start,3).value,str) and ws.cell(start,3).value.strip()): start+=1
    icons=collections.defaultdict(list)
    for r,c,h in an:
        if c<36: icons[r].append((c,h))
    sections=[]; cur=None; pending_hint=[]; group=None; gidx=0; base=None
    def links_col(r):
        for c in range(3,14):
            v=ws.cell(r,c).value
            if isinstance(v,str) and 'HYPERLINK' in v.upper(): return c
            if isinstance(v,str) and DUMMY in v and cached(v) is not None:
                pv=parse_variant(ws,v)
                if pv and (any(x['item'] and x['item'].get('url') for x in pv['cases']) or (pv['else'] and pv['else'].get('url'))): return c
        return None
    sels=selectors(ws)
    for r in range(start,ws.max_row+1):
        cv=ws.cell(r,3).value
        if isinstance(cv,str) and cv.strip():
            cur={'title':cv.strip(),'items':[]}; sections.append(cur); pending_hint=[]; group=None; continue
        if cur is None: continue
        lc=links_col(r)
        boolc=next((c for c in range(3,14) if isinstance(ws.cell(r,c).value,bool)),None)
        texts={c:cached(ws.cell(r,c).value) for c in range(3,36) if cached(ws.cell(r,c).value) not in (None,'') and not isinstance(ws.cell(r,c).value,bool)}
        if lc is None and boolc is None:
            t=' '.join(str(v).strip() for c,v in sorted(texts.items()) if str(v).strip())
            if not t: continue
            if re.search(r'(même zone|en même temps|ensemble)',t,re.I): gidx+=1; group=f'g{gidx}'; pending_hint.append(t); continue
            pending_hint.append(t); continue
        namec=lc if lc else (boolc+1)
        v=ws.cell(r,namec).value
        variant=None
        if lc and DUMMY in v:
            variant=parse_variant(ws,v)
            if not variant or not variant['cases']: continue
            d=next((c['item'] for c in variant['cases'] if c['item'] and c['item']['name']==variant['cached']),None) or (variant['else'] if variant['else'] and variant['else']['name']==variant['cached'] else None)
            nm=variant['cached'] if variant['cached'] and variant['cached'].lower()!='toignore' else next((c['item']['name'] for c in variant['cases'] if c['item']),''); url=(d or {}).get('url')
            if not nm: nm='(variante)'
        elif lc:
            m=re.findall(r'"([^"]*)"',v); url=m[0]; nm=m[-1]
        else:
            url=None; nm=str(v).strip() if v else ''
            if not nm: continue
        if base is None or namec<base: base=namec
        if group and namec<=base: group=None
        objs=[]; used={namec}
        for c,h in sorted(icons[r]):
            if c<=namec: continue
            t=H2T.get(h)
            if not t: unk[h]+=1; continue
            txt=texts.get(c+1); o={'type':t}
            if txt is not None:
                used.add(c+1); s=str(txt).strip(); mm=re.fullmatch(r'x\s*(\d+)',s)
                if mm: o['count']=int(mm.group(1))
                else: o['label']=s
            objs.append(o)
        notes=[str(t).strip() for c,t in sorted(texts.items()) if c not in used and c>namec and str(t).strip()]
        it={'name':nm.strip(),'objectives':objs}
        if url: it['url']=url
        if notes: it['notes']=notes
        if pending_hint: it['hint']=' — '.join(pending_hint); pending_hint=[]
        if group: it['group']=group
        if variant: it['variant']={'selector':variant['selector'],'cases':variant['cases'],'else':variant['else']}
        cur['items'].append(it)
    res[name]={'sections':[s for s in sections if s['items']],'selectors':sels}
json.dump({'sheets':res,'iconTypes':H2T},open(sys.argv[2],'w'),ensure_ascii=False,indent=0)
print('icônes connues',len(H2T),'| libellés inconnus',unknown_labels,'| icônes non reconnues',sum(unk.values()),len(unk))
for n,s in res.items(): print(f"{n}: {sum(len(x['items']) for x in s['sections'])} quêtes, choix {[(k,v['label'],len(v['options'])) for k,v in s['selectors'].items()]}, variantes {sum(1 for x in s['sections'] for i in x['items'] if 'variant' in i)}")
