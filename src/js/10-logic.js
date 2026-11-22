//<LOGIC
const STAGES=['Koncepcja','Prototyp','Testy','Pilotaż','Stosowana w praktyce'];
const TYPES=['technologiczna','organizacyjna','edukacyjna','społeczna','procesowa'];
const INST=['Szkoła','Uczelnia','Samorząd (JST)','Inna instytucja publiczna','Instytut badawczy'];
const SCOPE=['Jedna jednostka','Kilka jednostek','Gmina / powiat','Województwo','Cały kraj'];
const INFRA=['Brak','Niska','Średnia','Wysoka'];
const INFRA_VAL=[5,4,3,2];
const TEAM=['Jedna osoba','Zespół','Zespół z partnerem'];
const IPL=['Brak / nie dotyczy','Zgłoszenie lub ochrona w toku','Patent / prawo ochronne'];
const STATUS=['Zidentyfikowana','Oceniona','Skierowana','W kontakcie','Wdrożona / przekazana'];
const DZ=['Edukacja','Zdrowie i opieka','Lotnictwo i kosmos','Motoryzacja i transport','ICT i dane','Energia i środowisko','Administracja i usługi publiczne','Rozwój społeczny'];
const TAG2DZ={'lotnictwo':'Lotnictwo i kosmos','kosmos':'Lotnictwo i kosmos','motoryzacja':'Motoryzacja i transport','ICT':'ICT i dane','AI':'ICT i dane','IoT':'ICT i dane','czujniki':'ICT i dane','zdrowie':'Zdrowie i opieka','edukacja':'Edukacja','energia':'Energia i środowisko','środowisko':'Energia i środowisko','powietrze':'Energia i środowisko','administracja':'Administracja i usługi publiczne','bezpieczeństwo':'Administracja i usługi publiczne','jakość życia':'Rozwój społeczny','seniorzy':'Rozwój społeczny'};
const TAGW={ICT:.3,AI:.3,IoT:.3,czujniki:.3};
const CITIES=['Rzeszów','Krosno','Przemyśl','Sanok','Mielec','Stalowa Wola','Jasło','Tarnobrzeg','Dębica','Łańcut','Ustrzyki Dolne','Leżajsk','Kolbuszowa','Kraków','Lublin','Warszawa'];
const CRIT=[
 {k:'wdroz',name:'Wdrożenie w praktyce',w:20,r:['1: brak dowodów użycia','3: działa u jednego odbiorcy','5: dziesiątki klientów lub tysiące użytkowników'],auto:'z dowodów użycia w źródle (wdrożenia, klienci, sprzedaż, uczestnicy); ocena autorów, uzasadnienie na karcie'},
 {k:'trl',name:'Poziom gotowości technologicznej (TRL)',w:20,r:['1: TRL 1–2','3: TRL 5','5: TRL 9'],auto:'z podanego TRL albo szacunek z etapu rozwoju'},
 {k:'nov',name:'Innowacyjność',w:20,r:['1: duże podobieństwo tekstu','3: umiarkowane podobieństwo tekstu','5: niskie podobieństwo w bazie radaru'],auto:'z podobieństwa do innych rozwiązań w bazie'},
 {k:'pot',name:'Potencjał zastosowania',w:20,r:['1: wąskie, kosztowne zastosowanie','3: wymaga dostosowania','5: szeroki zasięg, łatwe do przeniesienia'],auto:'z zasięgu problemu oraz wymagań infrastrukturalnych i dokumentacji'},
 {k:'wiar',name:'Wiarygodność',w:20,r:['3: źródło publiczne (link obowiązkowy)','4: wpis w rejestrze publicznym','5: rejestr i niezależne potwierdzenie'],auto:'z rodzaju źródła (rejestr, strona instytucji) i potwierdzeń; pozycje bez źródła nie trafiają do radaru'}
];
const TRL_FROM_STAGE=[3,4,5,7,9];
function trlOf(i){return i.trlNA?0:i.trl>0?i.trl:(TRL_FROM_STAGE[i.stage]||3)}
const DATA_REVISION='audit-2026-11-22-v1';
const STAGE_TRL_LABELS=['TRL 1–3','TRL 4','TRL 5–6','TRL 7–8','TRL 9'];
function stageFromTrl(trl){return trl<=3?0:trl===4?1:trl<=6?2:trl<=8?3:4}
function canonicalId(id){return REWRITE[id]&&REWRITE[id].canonicalId||id}
function projectKey(i){return i.projectId||canonicalId(i.id)}
function lifecycleOf(i){return i.wdr>=3?'Rozwiązanie udostępnione':i.wdr===2?'Projekt w testach':'Projekt rozwojowy / plan'}
function area3Of(i){
  if(i.area3)return i.area3;
  const t=norm((i.title||'')+' '+(i.description||'')),c=i.cats||[];
  if(i.typ==='Program edukacyjny'||i.rodzaj===2||/gra edukacyj|pomoc.{0,25}dydakt|kurs\b|kursu\b|kursy\b|program.{0,25}ksztalc|szkoleni.{0,35}(vr|wirtual)/.test(t))return 'Edukacyjna';
  if(c.includes('Administracja')||i.instType===2||i.rodzaj===3)return 'Administracyjna';
  return 'Technologiczna';
}
// Currency amounts are never compared across currencies without a documented conversion.
function budgetOf(i){
  if(i.budget&&Number.isFinite(i.budget.amount)&&i.budget.amount>0)return i.budget;
  const text=String(i.value||'').trim(),m=text.match(/^(\d[\d\s\u00a0.,]*?)\s*(zł|PLN|EUR|USD)(?=\s|$|[(/])/i);
  if(!m)return null;
  let number=m[1].replace(/[\s\u00a0]/g,'');
  if(number.includes(','))number=number.replace(/\./g,'').replace(',','.');
  else if((number.match(/\./g)||[]).length>1||/^\d{1,3}(\.\d{3})+$/.test(number))number=number.replace(/\./g,'');
  const amount=Number(number);return Number.isFinite(amount)&&amount>0?{amount,currency:/zł|PLN/i.test(m[2])?'PLN':m[2].toUpperCase(),basis:'source',url:i.budgetSource||i.url}:null;
}
function scopeOf(i){
  const b=budgetOf(i);
  if(i.registry==='NCBR'){
    const v=b&&b.currency==='PLN'?b.amount:b&&b.amountPLN>0&&b.conversionSource?b.amountPLN:null;
    return v===null?null:v>=1e7?5:v>=3e6?4:v>=1e6?3:2;
  }
  return Number.isInteger(i.scope)&&i.scope>=0&&i.scope<=4?i.scope+1:null;
}
function independentSource(i){
  const u=typeof i.confirmedBy==='string'?i.confirmedBy:i.confirmedBy&&i.confirmedBy.url;
  try{const a=new URL(u),b=new URL(i.url);return /^https?:$/.test(a.protocol)&&a.hostname.replace(/^www\./,'')!==b.hostname.replace(/^www\./,'')?u:null}catch(e){return null}
}
function scoreNotes(i){
  const notes=[],b=budgetOf(i);
  if(scopeOf(i)===null)notes.push(b?'Budżet '+b.currency+' nie jest porównywany z progami PLN bez udokumentowanego kursu.':'Brak danych o zasięgu; do wyniku roboczego przyjęto neutralne 3/5 za zasięg.');
  if(i.uncertainty)notes.push(i.uncertainty);
  if(i.audit&&!i.audit.readable)notes.push('Nie udało się odczytać źródła podczas kontroli '+i.audit.checkedAt+'. Nie oznacza to, że strona nie działa; twierdzenia wymagają sprawdzenia.');
  if(!(i.wdr>0))notes.push('Brak oceny rzeczywistego użycia; sam etap ani TRL nie dowodzi wdrożenia.');
  return notes;
}
function scoreRange(i,sc){
  if(scopeOf(i)!==null)return [totalScore(sc),totalScore(sc)];
  const tr=clamp(INFRA_VAL[i.infra]+(i.hasDocs?0:-1),1,5);
  return [1,5].map(v=>totalScore(Object.assign({},sc,{pot:clamp(Math.round((v+tr)/2),1,5)})));
}
const STOP=new Set('oraz jest sie dla przy jako nie ale lub aby tym ten ta to na do w z i o od po przez ktory ktora ktore ktorych moze moga sa byc jego jej ich tez juz bardzo wiec czy'.split(' '));
function norm(s){return String(s||'').toLowerCase().replace(/ł/g,'l').normalize('NFD').replace(/[̀-ͯ]/g,'')}
function toks(s){return norm(s).split(/[^a-z0-9]+/).filter(w=>w.length>2&&!STOP.has(w)).map(w=>w.slice(0,5))}
function docText(x){return [x.title,x.title,x.problem,x.description,(x.tags||[]).join(' ')].join(' ')}

const REF=[];
function buildSim(inn,all){
  const docs=REF.map(r=>({id:r.id,src:r.src,title:r.title,ref:true,t:toks(docText(r))}))
    .concat(all.filter(x=>x.id!==inn.id&&projectKey(x)!==projectKey(inn)).map(x=>({id:x.id,src:'Baza radaru ('+x.institution+')',title:x.title,ref:false,t:toks(docText(x))})));
  const me=toks(docText(inn));
  const N=docs.length+1, df={};
  [me].concat(docs.map(d=>d.t)).forEach(t=>new Set(t).forEach(w=>df[w]=(df[w]||0)+1));
  const vec=t=>{const v={};t.forEach(w=>v[w]=(v[w]||0)+1);Object.keys(v).forEach(w=>v[w]*=Math.log((N+1)/(df[w]+1))+1);return v};
  const cos=(a,b)=>{let d=0,na=0,nb=0;for(const w in a){na+=a[w]*a[w];if(b[w])d+=a[w]*b[w]}for(const w in b)nb+=b[w]*b[w];return na&&nb?d/Math.sqrt(na*nb):0};
  const v0=vec(me);
  return docs.map(d=>({id:d.id,src:d.src,title:d.title,ref:d.ref,sim:cos(v0,vec(d.t))})).sort((a,b)=>b.sim-a.sim);
}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function maxSim(sims){return sims.length?sims[0].sim:0}
function suggest(inn,sims){
  const s=maxSim(sims),nv=clamp(Math.round(5-s*9),1,5),tr=clamp(INFRA_VAL[inn.infra]+(inn.hasDocs?0:-1),1,5),scope=scopeOf(inn);
  const declared=inn.novelty>=0&&(!inn.registry||inn.noveltyBasis==='declared');
  return {wdroz:inn.wdr>0?clamp(inn.wdr,1,5):1,trl:inn.trlNA?clamp(inn.stage+1,1,5):clamp(Math.round(trlOf(inn)/2),1,5),nov:declared?clamp(Math.round((nv+[5,4,3,2][inn.novelty])/2),1,5):nv,
    pot:clamp(Math.round(((scope===null?3:scope)+tr)/2),1,5),wiar:clamp(3+(inn.registry?1:0)+(independentSource(inn)?1:0),1,5)};
}
function totalScore(sc){return Math.round(CRIT.reduce((a,c)=>a+c.w*(sc[c.k]||1)/5,0))}
function completeness(inn){
  const checks=[inn.title&&inn.title.length>5,(inn.description||'').length>=60,(inn.problem||'').length>=25,!!inn.creators,(inn.tags||[]).length>=2,!!inn.institution,!!inn.contact&&!!inn.phone,inn.hasDocs,inn.ip>0||inn.stage>=2];
  return Math.round(100*checks.filter(Boolean).length/checks.length);
}
function recommend(inn,score,sims,comp){
  const tech=inn.type==='technologiczna', top=sims[0], res={primary:null,secondary:[],alerts:[]};
  if(top&&top.sim>=0.35)res.alerts.push({lvl:'warn',txt:'Możliwe dublowanie prac: „'+top.title+'” ('+top.src+', podobieństwo '+Math.round(top.sim*100)+'%). Przed dalszymi inwestycjami warto skontaktować się z autorami i rozważyć wspólny rozwój.'});
  else if(top&&top.sim>=0.2)res.alerts.push({lvl:'info',txt:'Znaleziono częściowo podobne rozwiązanie: „'+top.title+'” ('+top.src+', '+Math.round(top.sim*100)+'%). Sprawdź, czym Twoje podejście się różni.'});
  const why=[];
  if(comp<60){
    why.push('Kompletność opisu to '+comp+'%, a ocena potencjału wymaga co najmniej 60%.');
    why.push('Brakujące informacje (opis, kontakt, tagi, dokumentacja) ograniczają wiarygodność oceny.');
    res.primary={key:'dane',title:'Uzupełnić dane i obserwować',why};
  }else if(score<45){
    why.push('Ocena '+score+'/100 jest poniżej progu 45.');
    if(inn.stage<=1)why.push('Rozwiązanie jest na etapie pomysłu, więc brakuje dowodów skuteczności.');
    res.primary={key:'obserwuj',title:'Obserwować i doprecyzować pomysł',why};
    res.secondary.push({title:'Konsultacja z mentorem PCI',why:['Mentor pomoże sprawdzić potrzebę i zaplanować pierwszy test.']});
  }else if(inn.stage<=1){
    why.push('Etap „'+STAGES[inn.stage]+'” wymaga potwierdzenia pomysłu w praktyce.');
    why.push('Ocena '+score+'/100 uzasadnia inwestycję w prototyp.');
    res.primary={key:'rozwoj',title:'Rozwinąć: prototypowanie i mentoring',why};
    res.secondary.push({title:'Finansowanie pierwszego testu',why:['Mały grant lub budżet obywatelski wystarczą na prototyp.']});
  }else if(tech&&inn.stage>=2&&score>=55){
    why.push('Innowacja technologiczna na etapie „'+STAGES[inn.stage]+'” z oceną '+score+'/100.');
    if(inn.ip>0)why.push('Ochrona własności jest w toku lub uzyskana, co ułatwia licencjonowanie.');
    else why.push('Brak ochrony własności. Zalecana konsultacja w biurze transferu technologii przed publikacją.');
    res.primary={key:'komerc',title:'Komercjalizacja: licencja, spin-off lub akceleracja',why};
    res.secondary.push({title:'Finansowanie B+R i wdrożenia',why:['Programy typu NCBR wspierają dojrzewanie technologii od prototypu do wdrożenia.']});
  }else if(inn.stage>=3&&(!tech||INFRA_VAL[inn.infra]>=4)){
    why.push('Rozwiązanie działa w praktyce (etap „'+STAGES[inn.stage]+'”) i ma niskie wymagania infrastrukturalne.');
    why.push('Typ „'+inn.type+'” zwykle przenosi się przez replikację wzorca, nie licencję.');
    res.primary={key:'transfer',title:'Transfer i replikacja w innych instytucjach',why};
    res.secondary.push({title:'Wymiana dobrych praktyk i finansowanie',why:['Programy typu Interreg wspierają upowszechnianie sprawdzonych rozwiązań.']});
  }else{
    why.push('Ocena '+score+'/100 przy etapie „'+STAGES[inn.stage]+'” wskazuje na potrzebę dalszego rozwoju.');
    res.primary={key:'rozwoj',title:'Rozwinąć: pilotaż i finansowanie',why};
    res.secondary.push({title:'Poszukać partnera wdrożeniowego',why:['Partner z branży przyspieszy przejście od prototypu do wdrożenia.']});
  }
  if(top&&top.sim>=0.35)res.secondary.unshift({title:'Współpraca zamiast dublowania',why:['Podobne rozwiązanie już istnieje, więc wspólny rozwój obniży koszt i ryzyko.']});
  return res;
}
/* baza inwestorów (uzupełniana z rejestru) */
const PARTNERS=[];
/* siła powiązania innowacja - inwestor: 40% wspólne obszary, 20% typ, 20% etap, 20% ocena potencjału */
function matchScore(inn,prof,score){
  const tags=inn.tags||[],ov=tags.filter(t=>prof.tags.includes(t));
  const tagS=prof.tags.length?Math.min(1,ov.length/Math.min(3,Math.max(1,tags.length))):.5;
  const typeS=prof.types.length?(prof.types.includes(inn.type)?1:0):.5;
  const stS=inn.stage>=prof.st[0]&&inn.stage<=prof.st[1]?1:0;
  const sc=Math.round(100*(.4*tagS+.2*typeS+.2*stS+.2*score/100));
  const why=[];
  if(ov.length)why.push('wspólne obszary: '+ov.join(', '));
  if(typeS===1&&prof.types.length)why.push('przyjmuje innowacje typu „'+inn.type+'”');
  if(stS)why.push('etap „'+STAGES[inn.stage]+'” mieści się w zakresie');
  why.push('ocena potencjału '+score+'/100');
  return {sc,why,ov};
}
const strengthOf=s=>s>=70?'silne':s>=50?'średnie':s>=30?'słabe':'brak';
function matchesFor(inn,score){
  return PARTNERS.map(p=>Object.assign({p},matchScore(inn,{tags:p.tags,types:p.types,st:p.st},score))).filter(m=>m.sc>=30).sort((a,b)=>b.sc-a.sc).slice(0,5);
}
const VOCAB={
 'lotnictwo':['lotni','turbin','silnik lot','samolot'],'motoryzacja':['motoryz','pojazd','samochod'],'kosmos':['kosmi','satelit'],
 'ICT':['aplikac','oprogram','platform','internet','cyfrow','elektronicz'],'AI':['uczenie maszyn','sztuczn','algorytm','analiz obraz','wizj','rozpoznaw'],
 'czujniki':['czujnik','sensor','pomiar'],'IoT':['iot','internet rzeczy'],'zdrowie':['zdrow','rehabilit','pacjent','medyc'],
 'edukacja':['szkol','uczni','nauczyc','lekcj','dydakt','edukac'],'energia':['energi','fotowolt','pv '],'środowisko':['srodowisk','odpad','klimat','ekolog'],
 'powietrze':['powietrz','pyl','co2','smog'],'seniorzy':['senior','starsz','osob starszych'],'administracja':['urzad','gmin','mieszkan','wniosek','bip'],
 'jakość życia':['jakosc zycia','spolecz','mieszkan','wspolnot'],'bezpieczeństwo':['bezpiecz','awari']
};
const ALLTAGS=Object.keys(VOCAB);
function ruleDomain(tags){const c={};(tags||[]).forEach(t=>{const d=TAG2DZ[t];if(d)c[d]=(c[d]||0)+(TAGW[t]||1)});const k=Object.keys(c).sort((a,b)=>c[b]-c[a]);return k[0]||'Rozwój społeczny'}
function domainsOf(tags){return [...new Set((tags||[]).map(t=>TAG2DZ[t]).filter(Boolean))]}
function ruleCity(text){const n=norm(text);for(const c of CITIES){const re=new RegExp('\\b'+norm(c).split(' ').map(w=>w.slice(0,Math.max(4,w.length-2))).join('\\s+'));if(re.test(n))return c}return ''}
function ruleIssuer(name){const n=norm(name);return /szkol|liceum|technikum|przedszkol/.test(n)?0:/uczeln|uniwersytet|politechn|akadem|wydzial/.test(n)?1:/gmin|urzad|starost|miast|powiat/.test(n)?2:/instytut|laborator/.test(n)?4:3}
function ruleTopic(inn){return String(inn.title||'').replace(/\s+/g,' ').split(' ').slice(0,6).join(' ').toLowerCase()}
function deployOf(sc){const r=((sc.transfer||1)+(sc.dojr||1))/2;return r>=4?'Gotowe do wdrożenia':r>=2.5?'Wymaga pilotażu':'Wymaga rozwoju'}
/* etykiety filtrów: nadane przez AI (jeśli dostępne), w przeciwnym razie przez reguły słownikowe */
function labelsOf(inn){
  const ai=inn.ai||{};
  const txt=[inn.institution,inn.title,inn.description].join(' ');
  return {
    dz:DZ.includes(ai.dz)?ai.dz:ruleDomain(inn.tags),
    city:(inn.city||'').trim()||(ai.city||'').trim()||ruleCity(txt)||'Nieokreślone',
    iss:inn.instType>=0?INST[inn.instType]:(INST.includes(ai.issuer)?ai.issuer:INST[ruleIssuer(inn.institution)]),
    topic:(ai.topic||'').trim()||ruleTopic(inn),
    dep:deployOf(inn.scores||{}),
    src:(ai.dz||ai.topic)?'AI':'Reguły'
  };
}
function stemq(q){return norm(q).split(/[^a-z0-9]+/).filter(w=>w.length>=2).map(w=>w.slice(0,5))}
function hay(s){return norm(s).split(/[^a-z0-9]+/).filter(Boolean).map(w=>w.slice(0,5))}
function searchRank(qt,fields){
  if(!qt.length)return 1;
  let tot=0;
  for(const q of qt){let best=0;for(const f of fields){if(f.w>best&&hay(f.text).some(t=>t.startsWith(q)))best=f.w}if(!best)return 0;tot+=best}
  return tot;
}
function maskEmail(e){if(!e)return '—';const p=String(e).split('@');return (p[0]||'').slice(0,1)+'•••@'+(p[1]||'')}
function maskPhone(p){if(!p)return '—';const s=String(p);return s.slice(0,Math.max(0,s.length-5)).replace(/\d/g,'•')+s.slice(-5)}
function extract(text){
  const n=norm(text), out={};
  const sc={technologiczna:0,organizacyjna:0,edukacyjna:0,społeczna:0,procesowa:0};
  const kw={technologiczna:['czujn','algor','urzadz','aplik','senso','oprog','uklad','modul','kamer','prototyp'],organizacyjna:['organiz','struktur','wspolprac','koopera','model','zarzad'],edukacyjna:['uczn','nauczy','szkol','lekcj','ocen','dydakt','edukac'],społeczna:['senior','mieszkan','wspolnot','wolontar','spolecz','integrac'],procesowa:['proces','wniosek','procedur','zgloszen','elektroniczn','rejestr','obieg']};
  for(const t in kw)kw[t].forEach(k=>{sc[t]+=n.split(k).length-1});
  out.type=Object.keys(sc).sort((a,b)=>sc[b]-sc[a])[0]; if(!sc[out.type])out.type='technologiczna';
  out.stage=/wdrozon|funkcjonuje|dziala od|od \d+ lat/.test(n)?4:/pilota|testow/.test(n)?3:/prototyp/.test(n)?2:/koncepcj|wstepn/.test(n)?1:/pomysl|planuj/.test(n)?0:1;
  out.tags=Object.keys(VOCAB).filter(t=>VOCAB[t].some(k=>n.includes(k))).slice(0,6);
  const m=String(text).match(/(?:Szkoł[aąy]|Liceum|Technikum|Politechnik[aiąę]|Uniwersytet|Uczelni[aąi]|Urząd|Gmin[aąy]|Starostwo|Miasto)(?:\s+(?:nr\s*\d+|im\.|[A-ZŁŚŻŹĆ][\p{L}-]+)){0,3}/u);
  out.institution=m?m[0].trim():'';
  out.instType=out.institution?ruleIssuer(out.institution):-1;
  out.city=ruleCity(text);
  out.title=String(text).split(/[.\n]/)[0].trim().slice(0,110);
  return out;
}
//</LOGIC