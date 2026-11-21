import json,re,shutil
b=json.load(open('bodies.json'));nw=json.load(open('new.json'))
recs=[]
for f in ['c13','c14']:
    d=json.load(open(f+'.json'))
    for k,v in d.items():
        full=[x for x in b if x.startswith(k)]
        assert len(full)==1,(k,full)
        recs.append((full[0],v))
P='/tmp/p/'
for f in ['seg_real.js','seg_rewrite.js']:
    shutil.copy(P+f,P+f+'.w2')
s=open(P+'seg_real.js').read()
exist=set(re.findall(r'^([a-z0-9\-]+)\|',s[s.find('NCBR_ROWS=`'):],re.M))
def fld(t,a,bs):
    m=re.search(re.escape(a)+r'\s+(.*?)\s+(?:'+'|'.join(map(re.escape,bs))+')',t)
    return m.group(1).strip() if m else ''
rows=[];rw={}
i=s.find('NCBR_ROWS=`')+11;j=s.find('`',i)
n=len(s[i:j].split('\n'))
for slug,v in recs:
    if slug in exist: print('dup',slug);continue
    t=b[slug]
    ben=fld(t,'Nazwa Beneficjenta/Beneficjentów',['Nazwa programu']) or fld(t,'Nazwa Beneficjenta',['Nazwa programu'])
    prog=fld(t,'Nazwa programu',['Konkurs','Wartość projektu','Okres realizacji'])
    area=fld(t,'Słowa Kluczowe',['Zobacz','Jaki','Okres'])
    m=re.search(r'Okres realizacji projektu\s+od\s+([\d\.]+)\s*r?\.?\s+do\s+([\d\.]+)',t)
    per=(m.group(1).rstrip('.')+'–'+m.group(2).rstrip('.')) if m else ''
    m=re.search(r'Wartość projektu\s+([\d\s,]+)\s*PLN',t); val=m.group(1).strip()+' zł' if m else 'nie podano w opisie'
    m2=re.search(r'Wartość dofinansowania\s+([\d\s,]+)\s*PLN',t)
    if m and m2: val=m.group(1).strip()+' zł (dofinansowanie '+m2.group(1).strip()+' zł)'
    title=nw[slug]
    row='|'.join([slug,title,ben,prog,v.get('woj',''),area,val,per,v.get('city',''),''])
    assert '\n' not in row
    rows.append(row); n+=1
    rw['n%02d'%n]=dict(typ=v['typ'],trl=v['trl'],tb=v['tb'],opis=v['opis'],zast=v['zast'])
    print('n%02d'%n,slug[:50],'|',ben[:30],'|',per,'|',area[:30])
s=s[:j]+'\n'+'\n'.join(rows)+s[j:]
open(P+'seg_real.js','w').write(s)
r=open(P+'seg_rewrite.js').read()
k=r.find('};\nconst TYP_ORDER')
add=''.join(',"%s": %s'%(i,json.dumps(x,ensure_ascii=False)) for i,x in rw.items())
r=r[:k]+add+r[k:]
open(P+'seg_rewrite.js','w').write(r)
print(len(rows))
