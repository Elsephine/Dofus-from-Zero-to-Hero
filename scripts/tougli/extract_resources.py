import openpyxl,json,sys,re
wb=openpyxl.load_workbook(sys.argv[1]); ws=wb['database']
items={}
for r in range(9,ws.max_row+1):
    v=ws.cell(r,4).value
    if isinstance(v,str) and v.strip(): items[f'D{r}']=v.strip()
quests={}; bad=[]
r=9
while r<=ws.max_row:
    q=ws.cell(r,14).value
    if isinstance(q,str) and q.strip():
        res=[]
        for c in range(15,49):
            ref=ws.cell(r,c).value; qty=ws.cell(r+1,c).value
            if ref in (None,''): continue
            name=items.get(str(ref).strip())
            if not name or not isinstance(qty,(int,float)): bad.append((q,ref,qty)); continue
            res.append({'name':name,'qty':qty})
        quests.setdefault(q.strip(),[]).extend(res)
        r+=2
    else: r+=1
json.dump({'quests':quests},open(sys.argv[2],'w'),ensure_ascii=False,indent=0)
print(len(items),'objets,',len(quests),'quêtes avec ressources; anomalies',len(bad), bad[:5])
