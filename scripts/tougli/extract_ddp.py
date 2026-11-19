import openpyxl,re,json,sys,zipfile,hashlib,collections
X=sys.argv[1]
ICON={'127258':'combat-solo','347913':'combat-groupe','4ba65d':'combat-vague-solo','4f280c':'combat-vague-groupe',
'f0626e':'combat-tactique-solo','21316a':'donjon','938ed9':'horaires-stricts','07464b':'caracteristiques',
'd5f08e':'bashing-mob','f0665e':'dimension','560668':'besoin-sort','5ff872':'faconneur',
'd7b5bf':'paysan','d2c5ed':'anomalie','b170ba':'mineur','2ab412':'songe',
'd7f6c5':'forgeron','0d0bee':'alchimiste','c5562a':'sculpteur'}
z=zipfile.ZipFile(X)
d=z.read('xl/drawings/drawing24.xml').decode()
rels=dict(re.findall(r'Id="(rId\d+)"[^>]*Target="([^"]*)"',z.read('xl/drawings/_rels/drawing24.xml.rels').decode()))
icons=collections.defaultdict(list); unknown=collections.Counter()
for a in re.findall(r'<xdr:(?:oneCellAnchor|twoCellAnchor)[^>]*>(.*?)</xdr:(?:oneCellAnchor|twoCellAnchor)>',d,re.S):
    m=re.search(r'<xdr:from><xdr:col>(\d+)</xdr:col>.*?<xdr:row>(\d+)</xdr:row>',a,re.S); e=re.search(r'r:embed="(rId\d+)"',a)
    if not(m and e): continue
    r,c=int(m.group(2))+1,int(m.group(1))+1
    if not 17<=c<=36: continue
    h=hashlib.md5(z.read('xl/'+rels[e.group(1)].replace('../',''))).hexdigest()[:6]
    if h in ICON: icons[r].append((c,ICON[h]))
    else: unknown[h]+=1
ws=openpyxl.load_workbook(X)['Dom de pin']
out=[]
for r in range(30,170):
    v=ws.cell(r,7).value
    if not(isinstance(v,str) and 'HYPERLINK' in v.upper()): continue
    m=re.findall(r'"([^"]*)"',v)
    texts={c:ws.cell(r,c).value for c in range(17,40) if ws.cell(r,c).value not in (None,'')}
    objs=[]; used=set()
    for c,t in sorted(icons[r]):
        txt=texts.get(c+1); used.add(c+1)
        o={'type':t}
        if isinstance(txt,str):
            mm=re.fullmatch(r'x(\d+)',txt.strip())
            if mm: o['count']=int(mm.group(1))
            else: o['label']=txt.strip()
        objs.append(o)
    notes=[str(t).strip() for c,t in sorted(texts.items()) if c not in used]
    out.append({'row':r,'name':m[-1],'url':m[0],'objectives':objs,'notes':notes})
hint=ws.cell(110,8).value
json.dump({'quests':out,'unknownIcons':unknown},sys.stdout,ensure_ascii=False,indent=0)
