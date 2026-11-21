import json,re,sys
b=json.load(open('bodies.json'));keys=json.load(open('keys.json'))
def fld(t,a,bs,n=110):
    m=re.search(a+r'\s*(.*?)\s*(?:'+'|'.join(bs)+')',t);return m.group(1)[:n] if m else ''
def show(i0,i1):
    for k in keys[i0:i1]:
        t=b[k]
        if k.startswith(('zglos','wyszukiwarka')):continue
        j=t.find('Jaki problem');body=t[j+25:j+520] if j>0 else t[250:700]
        sents=re.split(r'(?<=[.!?]) ',t[j:] if j>0 else t)
        ev=[s for s in sents if re.search(r'wdroż|prototyp|patent|klient|sprzeda|TRL|pilota|komercjal|certyfik|zakupi|rynek',s,re.I)][:3]
        ev=' // '.join(e[:170] for e in ev)
        reg=re.search(r'Region: województwo (\w+(?:-\w+)?)',t)
        print(f"## {keys.index(k)} {k[:60]}\nB:{fld(t,'Nazwa Beneficjenta/Beneficjentów',['Nazwa programu'],80)} | P:{fld(t,'Okres realizacji projektu',['Poznaj','Zobacz','Jaki','Opis','Region'],34)} | W:{reg.group(1) if reg else ''}\n{body}\nEV: {ev}\n")
show(int(sys.argv[1]),int(sys.argv[2]))
