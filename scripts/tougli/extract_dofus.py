import openpyxl,re,json,sys,zipfile,hashlib,os
X=sys.argv[1]; OUT=sys.argv[2]; os.makedirs(OUT+'/img',exist_ok=True)
z=zipfile.ZipFile(X)
wbx=z.read('xl/workbook.xml').decode(); rel=z.read('xl/_rels/workbook.xml.rels').decode()
sheet_file={n:re.search(r'Id="%s"[^>]*Target="([^"]+)"'%rid,rel).group(1) for n,rid in re.findall(r'<sheet [^>]*?name="([^"]+)" sheetId="\d+" r:id="(rId\d+)"',wbx)}
wb=openpyxl.load_workbook(X,data_only=True)
res=[]
for name in wb.sheetnames:
    if name in ('ACCUEIL','database'): continue
    ws=wb[name]
    # bloc d'en-tête : lignes 2-6, colonnes F..AL (texte)
    head=[]
    for r in range(2,7):
        for c in range(6,38):
            v=ws.cell(r,c).value
            if isinstance(v,str) and v.strip() and 'Multiplicateur' not in v: head.append((r,c,v.strip()))
    title=next((v for r,c,v in head if c==6 and r==2),name)
    lines=[v for r,c,v in head if not(c==6 and r==2)]
    mult_col=None; resources=[]
    for r in range(6,200):
        q=ws.cell(r,40).value; n=ws.cell(r,44).value
        if q is None and n is None:
            if resources: break
            continue
        if isinstance(n,str) and isinstance(q,(int,float)): resources.append({'name':n.strip(),'qty':q})
    level=None
    for r in range(8,16):
        for c in range(1,40):
            v=ws.cell(r,c).value
            if isinstance(v,str) and 'Niveau recommandé' in v: level=v.split(':')[-1].strip()
    # image en haut à gauche
    sf='xl/'+sheet_file[name]; srels=z.read(sf.replace('worksheets/','worksheets/_rels/')+'.rels').decode()
    dr=re.search(r'Target="\.\./drawings/(drawing\d+\.xml)"',srels); img=None
    if dr:
        d=z.read('xl/drawings/'+dr.group(1)).decode(); drels=dict(re.findall(r'Id="(rId\d+)"[^>]*Target="([^"]*)"',z.read('xl/drawings/_rels/'+dr.group(1)+'.rels').decode()))
        best=None
        for a in re.findall(r'<xdr:(?:oneCellAnchor|twoCellAnchor)[^>]*>(.*?)</xdr:(?:oneCellAnchor|twoCellAnchor)>',d,re.S):
            m=re.search(r'<xdr:from><xdr:col>(\d+)</xdr:col>.*?<xdr:row>(\d+)</xdr:row>',a,re.S); e=re.search(r'r:embed="(rId\d+)"',a); ext=re.search(r'<xdr:ext cx="(\d+)" cy="(\d+)"',a)
            if m and e and int(m.group(2))<=8 and int(m.group(1))<=40:
                size=int(ext.group(1))*int(ext.group(2)) if ext else 0
                if not best or size>best[0]: best=(size,drels[e.group(1)],int(m.group(1)),int(m.group(2)))
        if best:
            data=z.read('xl/'+best[1].replace('../','')); ext_=best[1].rsplit('.',1)[-1]
            slug=re.sub(r'[^a-z0-9]+','-',name.lower().encode('ascii','ignore').decode()).strip('-')
            img=f'{slug}.{ext_}'; open(f'{OUT}/img/{img}','wb').write(data)
            img_info=(best[2],best[3],best[0])
    res.append({'sheet':name,'title':title,'lines':lines,'level':level,'resources':resources,'image':img})
json.dump(res,open(OUT+'/dofus.json','w'),ensure_ascii=False,indent=1)
for d in res: print(d['sheet'],'|',d['title'],'|',d['level'],'|',len(d['resources']),'res |',d['image'],'|',' / '.join(l[:40] for l in d['lines']))
