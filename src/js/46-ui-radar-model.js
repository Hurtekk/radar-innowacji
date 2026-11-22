/* ====================== MODEL „RADAR INNOWACJI”: wyszukiwanie i ocena ISTNIEJĄCYCH innowacji ======================
   Nadpisuje wcześniejsze widoki: brak zgłaszania pomysłów, kont, inwestorów, zapytań i finansowania. */
const AREAS=['Technologiczna','Edukacyjna','Administracyjna'];
const AREA_D={Technologiczna:'Nowe lub ulepszone produkty, procesy, materiały, urządzenia i oprogramowanie.',Edukacyjna:'Nowe metody, programy, narzędzia i modele kształcenia.',Administracyjna:'Nowe sposoby działania instytucji publicznych i usług dla mieszkańców.'};
const AREA_C={Technologiczna:'#4f6bed',Edukacyjna:'#0f9d8c',Administracyjna:'#e0a02a'};
const TRL_B=['TRL 1–3 (badania)','TRL 4–6 (rozwój i testy)','TRL 7–9 (wdrożenie)'];
const trlBand=i=>{const t=trlOf(i);return t===0?'TRL nie dotyczy':t<=3?TRL_B[0]:t<=6?TRL_B[1]:TRL_B[2]};
const trlTxt=i=>i.trlNA?'TRL nie dotyczy':'TRL '+trlOf(i)+trlMark(i);
const typOf=i=>i.typ||'Inne';
const trlMark=i=>i.trlBasis==='source'?'':'*';
const origName=i=>ORIGINS[i.origin]||INST[i.instType]||'Inny podmiot';
const srcName=i=>i.registry==='NCBR'?'Rejestr NCBR':'Wykryte w sieci';
const domainOf=u=>String(u||'').replace(/^https?:\/\/(www\.)?/,'').split('/')[0];
const AUD=[
 {id:'all',name:'Wszyscy odbiorcy',d:'Ranking ogólny: średnia z pięciu kryteriów oceny.',w:null,areas:[],note:'Bez dopasowania do profilu.'},
 {id:'inw',name:'Inwestorzy i podmioty komercyjne',d:'Szukasz rozwiązań z potencjałem rynkowym, chronionych i bliskich wdrożenia.',w:{pot:.3,trl:.2,wiar:.2,wdroz:.15,nov:.15},areas:['Technologiczna'],ip:8,note:'Wyżej: duży potencjał zastosowania, wysokie TRL, ochrona własności.'},
 {id:'jst',name:'Instytucje publiczne i samorządy',d:'Szukasz rozwiązań sprawdzonych w praktyce, które da się powtórzyć w urzędzie lub gminie.',w:{wdroz:.35,pot:.25,wiar:.2,trl:.1,nov:.1},areas:['Administracyjna','Edukacyjna'],note:'Wyżej: rozwiązania już stosowane, wiarygodne i łatwe do przeniesienia.'},
 {id:'uni',name:'Uczelnie i jednostki badawcze',d:'Szukasz nowatorskich wyników badań i partnerów do dalszego rozwoju.',w:{nov:.35,trl:.2,wiar:.2,pot:.15,wdroz:.1},areas:['Technologiczna'],stg:6,note:'Wyżej: nowatorskie rozwiązania, także na wcześniejszym etapie (miejsce na partnera badawczego).'},
 {id:'szk',name:'Szkoły',d:'Szukasz metod, programów i pracowni, które inne szkoły już wypróbowały.',w:{wdroz:.3,pot:.25,wiar:.2,nov:.15,trl:.1},areas:['Edukacyjna'],note:'Wyżej: rozwiązania edukacyjne stosowane w praktyce, z wiarygodnym źródłem.'},
 {id:'sta',name:'Startupy i przedsiębiorstwa',d:'Szukasz technologii do licencjonowania, współpracy lub sprawdzenia konkurencji.',w:{nov:.3,trl:.25,pot:.2,wiar:.15,wdroz:.1},areas:['Technologiczna'],ip:5,note:'Wyżej: nowość, TRL 5+ i ochrona własności.'},
 {id:'wyn',name:'Indywidualni innowatorzy i wynalazcy',d:'Chcesz sprawdzić, czy podobne rozwiązanie już istnieje i kto je rozwija.',w:{nov:.2,wiar:.25,pot:.15,trl:.2,wdroz:.2},areas:[],sim:true,note:'Przy każdym wyniku widać podobieństwo do innych rozwiązań, aby szybko ocenić, czy pomysł jest już zajęty.'}
];
const audOf=()=>AUD.find(a=>a.id===S.aud)||AUD[0];
function profScore(i,a){
  const A=audOf();if(!A.w)return a.score;
  const sc=i.scores||a.sug;let v=0;Object.keys(A.w).forEach(k=>{v+=A.w[k]*(sc[k]||1)/5*100});
  if(A.areas.includes(area3Of(i)))v+=10;
  if(A.ip&&i.ip>0)v+=A.ip;
  if(A.stg&&i.stage<=2)v+=A.stg;
  return clamp(Math.round(v),0,100);
}
const bar5=v=>'<span class="bar5" aria-label="'+v+' z 5"><i style="width:'+(v*20)+'%"></i></span>';

/* ---------- anonimowa analityka (opcjonalna, za zgodą) ---------- */
const KEY_AN='radar-analityka-v1';
let AN=(function(){try{const x=JSON.parse(localStorage.getItem(KEY_AN));if(x)return x}catch(e){}return {on:false,n:0,q:{},f:{},aud:{},open:{}}})();
const ANV=new Set([].concat(AREAS,CATS,DZ,CITIES).flatMap(x=>norm(x).split(/[^a-z0-9]+/)).filter(w=>w.length>2));
function track(k,v){
  if(!AN.on||!v)return;
  let vals=[];
  if(k==='q'){const t=norm(v).split(/[^a-z0-9]+/).filter(w=>w.length>2);vals=t.map(w=>ANV.has(w)?w:'(inne)').slice(0,4)}
  else vals=[String(v).slice(0,40)];
  const m=AN[k]||(AN[k]={});vals.forEach(x=>{m[x]=(m[x]||0)+1});AN.n++;
  try{localStorage.setItem(KEY_AN,JSON.stringify(AN))}catch(e){}
}

/* ---------- dane: fakty potwierdzone a szacunki ---------- */
function budgetLabel(i){const b=budgetOf(i);return b?b.amount.toLocaleString('pl-PL',{maximumFractionDigits:2})+' '+b.currency:'brak danych'}
function factRows(i){
  const l=locOf(i)||{},checked=i.audit&&i.audit.reviewed&&i.audit.readable;
  return [
   ['Tytuł i instytucja',checked?'f':'s',checked?'porównano ze wskazanym źródłem podczas kontroli '+i.audit.checkedAt:'dane przypisane do źródła; sam link nie oznacza weryfikacji'],
   ['Opis','e','streszczenie autora / radaru; zakres dowodów podano poniżej'],
   ['Lokalizacja','s',l.prec==='miejscowość'?'miejscowość przypisana w danych; nie oznacza lokalizacji każdego wdrożenia':'lokalizacja przybliżona lub brak miejscowości'],
   ['Etap rozwoju','e',i.trlNA?'ocena etapu usługi z dowodów użycia':'ocena wynikająca z przypisanego TRL'],
   ['Wdrożenie w praktyce','e',i.wdr>0?'ocena autorów '+i.wdr+'/5; dowody i zakres opisano w uzasadnieniu':'brak dowodów użycia; sam TRL nie dowodzi wdrożenia'],
   ['TRL',i.trlBasis==='source'?'s':'e',i.trlNA?'nie dotyczy — decyzja klasyfikacyjna radaru, nie deklaracja beneficjenta':i.trlBasis==='source'?'liczba przypisana do źródła; sprawdź wskazany dokument':'szacunek radaru z opisu; nie jest oficjalną oceną beneficjenta'],
   ['Budżet',budgetOf(i)?'s':'u',budgetLabel(i)+(scopeOf(i)===null?'; brak podstaw do porównania z progami PLN lub brak zasięgu':'; w projektach NCBR służy jako przybliżenie zasięgu')],
   ['Obszar innowacji','e','klasyfikacja radaru według głównego zastosowania'],
   ['Ochrona własności',i.ip>0?'s':'u',i.ip>0?'deklaracja w przypisanym źródle; aktualnego statusu nie sprawdzono w rejestrze patentowym':'brak informacji nie oznacza braku ochrony'],
   ['Ocena w pięciu kryteriach','e','algorytm przelicza oceny autorów i dane źródłowe; nie potwierdza skuteczności']
  ];
}
const factPill=t=>t==='f'?'<span class="pill good">porównane ze źródłem</span>':t==='s'?'<span class="pill plain">dane przypisane do źródła</span>':t==='u'?'<span class="pill warn">brak danych</span>':'<span class="pill warn">ocena radaru</span>';
function factsTable(i){return '<div class="tablewrap"><table><thead><tr><th>Informacja</th><th>Status</th><th>Skąd</th></tr></thead><tbody>'+factRows(i).map(r=>'<tr><td>'+esc(r[0])+'</td><td>'+factPill(r[1])+'</td><td class="small muted">'+esc(r[2])+'</td></tr>').join('')+'</tbody></table></div>'}
function evidenceBlock(i){
  const a=i.audit,urls=[...new Set([i.url].concat(i.sourceUrls||[]))].filter(u=>/^https?:\/\//.test(u||''));
  const state=a?(a.readable?(a.reviewed?'Porównano wybrane twierdzenia i ocenę ze źródłem.':'Odczytano treść lub fragment źródła; nie potwierdzono osobno wszystkich twierdzeń.'):'Odczyt źródła nie powiódł się; treść pozostaje niezweryfikowana. Nie jest to dowód niedziałania strony.'):'Brak odnotowanej kontroli źródła.';
  const ev=(a&&a.evidence||[]).map(e=>'<li><q>'+esc(e.excerpt)+'</q><br><span class="small">Zakres: '+esc(e.scope)+' · sprawdzono '+esc(e.checkedAt)+'</span><br><a href="'+esc(e.url)+'" target="_blank" rel="noopener noreferrer">Dokument źródłowy</a></li>').join('');
  const notes=scoreNotes(i);
  return '<section class="panel stack"><h4>Dowody i zakres weryfikacji</h4><p class="small">'+esc(state)+(a?' Kontrola: '+esc(a.checkedAt)+'.':'')+'</p>'+(ev?'<ul class="why">'+ev+'</ul>':'<p class="small muted">Nie zapisano cytatu potwierdzającego tę ocenę. Uzasadnienie jest oceną autora, wymagającą sprawdzenia w źródle.</p>')+'<p class="small muted">'+esc(a&&a.scope||'Opis źródła nie jest niezależnym potwierdzeniem skuteczności ani aktualnej oferty.')+'</p>'+(notes.length?'<ul class="why">'+notes.map(n=>'<li>'+esc(n)+'</li>').join(''):'')+(urls.length>1?'<p class="small"><b>Połączone źródła tego samego projektu:</b> '+urls.map((u,k)=>'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">Źródło '+(k+1)+'</a>').join(' · ')+'</p>':'')+'</section>';
}
function criterionWhy(i,k,a){
  if(k==='wdroz')return i.wdrWhy||'Brak dowodu użycia; etap nie jest jego substytutem.';
  if(k==='trl')return (i.trlWhy||'Szacunek z etapu rozwoju.')+(i.trlNA?' Punkty dojrzałości wynikają z etapu usługi: '+STAGES[i.stage]+'.':'');
  if(k==='nov')return 'Najbliższy opis innego projektu w bazie radaru: '+(a.sims[0]?Math.round(a.sims[0].sim*100)+'% podobieństwa tekstu.':'brak.')+' Nie przeszukano automatycznie rynku ani baz patentowych. Różne źródła tego samego projektu są wyłączone z porównania.'+(i.noveltyBasis==='declared'?' Uwzględniono zapisaną deklarację beneficjenta.':'');
  if(k==='pot'){const s=scopeOf(i),tr=clamp(INFRA_VAL[i.infra]+(i.hasDocs?0:-1),1,5);return 'Budżet: '+budgetLabel(i)+'. Zasięg: '+(s===null?'brak danych — roboczo 3/5':s+'/5')+'. Łatwość przeniesienia: '+tr+'/5 ('+INFRA[i.infra]+', dokumentacja: '+(i.hasDocs?'jest przypisany opis':'brak')+'). Infrastruktura jest założeniem radaru, nie audytem kosztów.'}
  return 'Publiczny link: 3 pkt'+(i.registry?' + rejestr: 1 pkt':'')+(independentSource(i)?' + wskazane drugie źródło z innej domeny: 1 pkt':'')+'. To ocena pochodzenia danych, nie potwierdzenie wszystkich twierdzeń ani skuteczności.';
}

/* ---------- nagłówek, pasek widoku, strona główna ---------- */
function renderTop(){
  const el=$('hdr'),logo='<button class="logo" data-act="home" aria-label="Radar innowacji, strona główna">'+IC.logo+'<span><b>Radar</b> innowacji</span></button>';
  const menuP=[['szukam','Szukam rozwiązania'],['opis','Jak to działa'],['statystyki','Statystyki innowacji'],['metod','Metodologia oceny'],['zrodla','Źródła i aktualizacje'],['analityka','Anonimowa analityka'],['priv','Prywatność i RODO'],['integr','Integracje i eksport'],['rozwoj','Skalowanie i rozwój'],['dostepnosc','Deklaracja dostępności']].map(x=>'<button class="ddi" data-page="'+x[0]+'">'+x[1]+'</button>').join('');
  const menu=ddMenu('m','Menu',menuP);
  if(!S.role){el.innerHTML=logo+'<span></span><div class="hright"><button class="btn sm" data-page="szukam">Szukam rozwiązania</button><button class="btn ghost sm" data-page="opis">Jak to działa</button>'+menu+'</div>';renderDrop();return}
  const n=(S.cmp||[]).length;
  el.innerHTML=logo+searchBox('Szukaj innowacji, dziedziny, miasta lub instytucji')+'<div class="hright"><button class="btn sm" data-page="szukam">Szukam rozwiązania</button><button class="btn ghost sm" data-page="porownanie">Porównanie'+(n?' ('+n+')':'')+'</button><button class="btn ghost sm" data-page="statystyki">Statystyki</button><button class="btn ghost sm" data-page="zrodla">Źródła</button>'+menu+'</div>';
  renderDrop();
}
function renderSub(){
  const views=[['inn','Innowacje'],['mapinn','Mapa innowacji']];
  const seg='<div class="seg" role="group" aria-label="Widok">'+views.map(v=>'<button data-view="'+v[0]+'" aria-pressed="'+(S.view===v[0])+'">'+v[1]+'</button>').join('')+'</div>';
  const aud='';
  const defs=filterDefs(),act=defs.filter(d=>d[2]);
  const chips=act.map(d=>'<button class="pill" data-rmf="'+d[0]+'" aria-label="Usuń filtr '+esc(d[2])+'">'+esc(d[2])+' ×</button>').join('');
  const fp='<div class="fsel">'+defs.map(d=>selBox(d[0],d[1],d[2],d[3])).join('')+'</div><div class="row" style="margin-top:14px"><button class="btn ghost sm" data-act="clr">Wyczyść filtry</button></div>';
  const right='<span class="cnt" id="cnt"></span>'+chips+ddMenu('filters','Filtry'+(act.length?' ('+act.length+')':''),fp,{wide:true});
  return '<div class="sub">'+seg+aud+'<div class="subr">'+right+'</div></div>';
}
function renderHome(){
  const n=S.items.length,det=S.items.filter(i=>i.detected).length,last=S.items.reduce((m,i)=>i.discoveredAt&&i.discoveredAt>m?i.discoveredAt:m,'');
  const byA=a=>S.items.filter(i=>area3Of(i)===a).length;
  const audT=AUD.slice(1).map(a=>'<button class="role" data-aud="'+a.id+'"><h3>'+esc(a.name)+'</h3><p class="muted small">'+esc(a.d)+'</p><span class="go">Szukam jako ta grupa →</span></button>').join('');
  const areaT=AREAS.map(a=>'<button class="role" data-area="'+a+'"><span class="areadot" style="background:'+AREA_C[a]+'"></span><h3>Innowacja '+a.toLowerCase().replace(/a$/,'a')+'</h3><p class="muted small">'+AREA_D[a]+'</p><span class="go">'+byA(a)+' w radarze →</span></button>').join('');
  return '<section class="home"><h1>Poznaj <em>Radar Innowacji</em><br>Odkryj polskie rozwiązania</h1>'+
  homeData()+
  '<div class="row" style="justify-content:center;margin:26px 0 8px"><button class="btn" data-aud="all">Przeglądaj wszystkie '+n+' innowacji</button></div>'+
  '<h2 class="hs">Wybierz dziedzinę, która Cię interesuje</h2><div class="roles roles3">'+areaT+'</div></section>';
}

/* ---------- filtrowanie i wyniki ---------- */
function filterDefs(){
  if(S.view==='mapinv'){const it=allInvestors();return locDefs(it,S.fi,'fi').concat([['fi.dz','Dziedzina',S.fi.dz,optList(it.flatMap(p=>domainsOf(p.tags)))],['fi.city','Miasto',S.fi.city,optList(it.map(p=>p.city))],['fi.kind','Rodzaj',S.fi.kind,optList(it.map(p=>p.kind))]])}
  const items=vis();
  return [['f.area','Obszar innowacji',S.f.area,optList(items.map(area3Of))],['f.typ','Rodzaj innowacji',S.f.typ,TYP_ORDER.filter(t=>items.some(i=>typOf(i)===t))],['f.stage','Etap rozwoju',S.f.stage,optList(items.map(i=>STAGES[i.stage]))],['f.trlb','Poziom TRL',S.f.trlb,optList(items.map(trlBand))],['f.orig','Typ podmiotu',S.f.orig,optList(items.map(origName))],['f.cat','Dziedzina',S.f.cat,optList(items.flatMap(i=>i.cats||[]))],['f.src','Źródło danych',S.f.src,optList(items.map(srcName))],['f.rate','Ocena potencjału',S.f.rate,optList(items.map(i=>scoreWord(analyze(i).score)))]].concat(locDefs(items,S.f,'f'));
}
function hasFilters(){const o=S.view==='mapinv'?S.fi:S.f;return !!S.q||Object.keys(o).some(k=>o[k])}
function filterInn(items){
  const qt=stemq(S.q),f=S.f;
  return items.map(i=>{
    if(f.area&&area3Of(i)!==f.area)return null;if(f.typ&&typOf(i)!==f.typ)return null;if(f.stage&&STAGES[i.stage]!==f.stage)return null;if(f.trlb&&trlBand(i)!==f.trlb)return null;if(f.orig&&origName(i)!==f.orig)return null;if(f.cat&&!(i.cats||[]).includes(f.cat))return null;if(f.src&&srcName(i)!==f.src)return null;
    const a=analyze(i),l=a.lab;
    if(f.rate&&scoreWord(a.score)!==f.rate)return null;if(!locPass(i,f))return null;
    const r=searchRank(qt,[{text:i.title,w:3},{text:[area3Of(i),l.topic,l.dz,(i.tags||[]).join(' '),(i.cats||[]).join(' ')].join(' '),w:2},{text:[i.institution,l.city,i.problem,i.description,origName(i)].join(' '),w:1}]);
    return r?{i,a,l,r}:null}).filter(Boolean);
}
function countText(n,total){
  let t='<b>'+n+'</b> z '+total;
  if(hasFilters())t+=' · <button class="linkbtn" data-act="clr">wyczyść</button>';
  const A=audOf();if(A.w)t+=' · profil: <b>'+esc(A.name)+'</b>';
  return t;
}
function innCard(r){
  const i=r.i,a=r.a,l=r.l,ar=area3Of(i),A=audOf(),ps=r.ps==null?a.score:r.ps,on=(S.cmp||[]).includes(i.id);
  const s0=a.sims[0];
  return '<div class="cardw"><button class="card" data-open="inn:'+i.id+'"><div class="ctop"><div><span class="pill" style="background:'+AREA_C[ar]+'1a;color:'+AREA_C[ar]+'">'+ar+'</span>'+(i.detected?' <span class="pill plain" title="Znalezione automatycznie w publicznym źródle">Wykryte '+esc(i.discoveredAt)+'</span>':'')+'<h3 style="margin-top:8px">'+esc(i.title)+'</h3></div><div style="text-align:center">'+ring(ps,46,lvl(ps))+(A.w?'<div class="hint" style="margin-top:2px">dopasowanie</div>':'')+'</div></div>'+
  '<div class="meta">'+esc(i.institution)+' · '+esc(l.city)+'</div><p class="small cdesc">'+esc((i.description||i.problem||'').slice(0,140))+((i.description||'').length>140?'…':'')+'</p>'+
  '<div class="cfoot"><span class="pill plain">'+STAGES[i.stage]+'</span><span class="pill plain" title="'+esc(i.trlWhy||'')+'">'+trlTxt(i)+'</span><span class="pill '+lvl(a.score)+'">'+scoreWord(a.score)+'</span>'+(a.notes.length?'<span class="pill warn">Wynik z zastrzeżeniami</span>':'')+(A.sim&&s0?'<span class="pill '+(s0.sim>=.35?'warn':'plain')+'">podobny opis: '+Math.round(s0.sim*100)+'%</span>':'')+'</div>'+
  (i.url?'<div class="hint" style="margin-top:8px">Źródło: '+esc(domainOf(i.url))+'</div>':'')+'</button><button class="cmpb'+(on?' on':'')+'" data-cmp="'+i.id+'" aria-pressed="'+on+'">'+(on?'✓ W porównaniu':'+ Porównaj')+'</button></div>';
}
function resultsHTML(){
  const rows=filterInn(vis()).map(r=>Object.assign(r,{ps:profScore(r.i,r.a)}));
  rows.sort((x,y)=>S.q?(y.r-x.r||y.ps-x.ps):(y.ps-x.ps||y.a.score-x.a.score));
  const A=audOf();
  const note=A.w?'<div class="audnote"><b>'+esc(A.name)+'.</b> '+esc(A.note)+'</div>':'';
  return {html:note+(rows.length?'<div class="grid">'+rows.map(innCard).join('')+'</div>':empty('Żadna innowacja nie spełnia kryteriów.')),cnt:countText(rows.length,vis().length)};
}
function sbData(){
  const qt=stemq(S.q),items=vis();
  const cats=optList(items.flatMap(i=>i.cats||[]));
  const areaT=AREAS.map(a=>({id:a,label:'Obszar: '+a.toLowerCase(),n:items.filter(i=>area3Of(i)===a).length,key:a}));
  if(!qt.length)return {browse:true,topics:areaT.map(x=>({id:x.id,label:x.label,sub:x.n+' innow.'})),inns:[],invs:[]};
  const topics=areaT.filter(x=>searchRank(qt,[{text:x.key+' '+AREA_D[x.key],w:1}])).map(x=>({id:x.id,label:x.label,sub:x.n+' innow.'})).concat(cats.filter(c=>searchRank(qt,[{text:c[0],w:1}])).map(c=>({id:'cat:'+c[0],label:c[0],sub:c[1]+' innow.'})));
  const inns=filterInn(items).sort((a,b)=>b.r-a.r).slice(0,6).map(r=>({id:r.i.id,label:esc(r.i.title),sub:esc(r.l.city)}));
  return {browse:false,topics,inns,invs:[]};
}
function sbChoose(k,id){
  S.sbOpen=false;if(!S.role)S.role='inst';S.view=S.view==='mapinn'?'mapinn':'inn';
  if(k==='dz'){clearFilters();if(id.indexOf('cat:')===0)S.f.cat=id.slice(4);else S.f.area=id;track('f',id);go('inn');return}
  if(k==='inn'){clearFilters();go('inn');openD('inn',id);return}
  track('q',S.q);
  if(S.page){go('inn');return}
  renderDrop();updateRes();renderSubEl();
}

/* ---------- karta innowacji (panel boczny) ---------- */
function critTable(i,a){
  const sc=i.scores||a.sug,range=scoreRange(i,sc);
  const rows=CRIT.map(c=>{const v=sc[c.k]||1;return '<tr><td>'+metLink(c.k,c.name)+'</td><td>'+bar5(v)+' <span class="num">'+v+'/5</span></td><td class="num">'+(c.w*v/5).toFixed(0)+'</td><td class="small muted">'+esc(criterionWhy(i,c.k,a))+'</td></tr>'}).join('');
  return '<div class="tablewrap"><table><thead><tr><th>Kryterium</th><th>Ocena</th><th>Pkt (z 20)</th><th>Podstawa i ograniczenia</th></tr></thead><tbody>'+rows+'<tr><td><b>Ocena potencjału</b></td><td></td><td class="num"><b>'+totalScore(sc)+'</b></td><td class="small muted">suma punktów, skala 20–100 · '+metA('met-wynik','jak liczymy','mlink','metod')+'</td></tr></tbody></table></div>'+(range[0]!==range[1]?'<p class="hint">Wynik roboczy przy nieznanym zasięgu. Zakres wyniku dla zasięgu 1–5: '+range[0]+'–'+range[1]+'/100, przy pozostałych ocenach bez zmian. Nie jest to przedział statystyczny.</p>':'')+'<p class="small muted">Nazwy kryteriów prowadzą do zasad oceny. Wynik zależy od kompletności dowodów.</p>';
}

function cardTxt(i,a){
  const l=a.lab;
  return ['KARTA INNOWACJI',i.title,'Obszar: '+area3Of(i)+' | Dziedziny: '+(i.cats||[]).join(', '),'Instytucja: '+i.institution+' ('+l.city+')','Zastosowanie: '+(i.problem||'—'),'Etap rozwoju: '+STAGES[i.stage]+(i.stageOk||!i.estimated?'':' (szacunek)'),'Rodzaj: '+typOf(i),'Opis: '+(i.description||'—'),'TRL: '+(i.trlNA?'nie dotyczy':trlOf(i)+(i.trlBasis==='source'?' (ze źródła)':' (ocena z opisu)')),'Uzasadnienie TRL: '+(i.trlWhy||'—'),'Wdrożenie w praktyce: '+(i.wdr>0?i.wdr+'/5':'brak oceny'),'Uzasadnienie wdrożenia: '+(i.wdrWhy||'—'),'Ocena potencjału: '+a.score+'/100 ('+scoreWord(a.score)+')','Ograniczenia: '+scoreNotes(i).join(' '),'Kontrola źródła: '+(i.audit?i.audit.checkedAt+'; '+(i.audit.readable?'odczytano':'bez odczytu'):'brak'),'Źródła: '+[...new Set([i.url].concat(i.sourceUrls||[]))].join('; '),'Wykryto: '+(i.discoveredAt||'rejestr NCBR')].join('\n');
}
function drawerCard(i){
  const a=analyze(i),l=a.lab,ar=area3Of(i),A=audOf(),ps=profScore(i,a),on=(S.cmp||[]).includes(i.id);
  const grid=[['Obszar innowacji',ar],['Dziedziny',(i.cats||[]).join(', ')||'—'],['Typ podmiotu',origName(i)],['Etap rozwoju',STAGES[i.stage]],['Wdrożenie w praktyce',i.wdr>0?i.wdr+'/5':'brak oceny'],['Rodzaj innowacji',typOf(i)],['Poziom gotowości (TRL)',i.trlNA?'nie dotyczy':'TRL '+trlOf(i)+(i.trlBasis==='source'?' (ze źródła)':' (ocena z opisu)')],['Ochrona własności',IPL[i.ip]]].map(x=>'<div class="lab"><div class="k">'+x[0]+'</div><div class="v">'+esc(x[1])+'</div></div>').join('');
  const srcB='<div class="srcbox"><div><b>Źródło informacji</b><div class="small muted">'+esc(i.source||(i.registry==='NCBR'?'Rejestr NCBR (baza sukcesów beneficjentów)':'Źródło publiczne'))+(i.published?' · publikacja: '+esc(i.published):'')+' · '+(i.detected?'wykryto '+esc(i.discoveredAt):'import z rejestru')+'</div></div>'+(i.url?'<a class="btn sm" href="'+esc(i.url)+'" target="_blank" rel="noopener noreferrer">Otwórz źródło ↗</a>':'<span class="pill warn">brak linku</span>')+'</div>';
  const prof=A.w?'<p class="small"><b>Dopasowanie do profilu „'+esc(A.name)+'”: '+ps+'/100.</b> '+esc(A.note)+' Wagi: '+Object.keys(A.w).map(k=>CRIT.find(c=>c.k===k).name.replace(/ \(TRL\)/,'')+' '+Math.round(A.w[k]*100)+'%').join(', ')+'.'+(A.areas.length?' Premia za obszar: '+A.areas.join(', ').toLowerCase()+'.':'')+'</p>':'';
  const labs=[['Dziedzina',l.dz],['Temat',l.topic],['Miasto',l.city],['Typ instytucji',l.iss]].map(x=>'<div class="lab"><div class="k">'+x[0]+'</div><div class="v">'+esc(x[1])+'</div></div>').join('');
  const body='<div class="dbody"><div class="dsum">'+ring(ps,56,lvl(ps))+'<div class="grow"><div class="mini">'+(A.w?'Dopasowanie do profilu':'Ocena potencjału')+'</div><b>'+scoreWord(a.score)+'</b><div class="small muted">ocena ogólna '+a.score+'/100 · średnia z pięciu kryteriów</div></div></div>'+
   '<div class="labels" style="margin:4px 0 12px">'+grid+'</div>'+
   '<p><span class="pill plain">'+esc(lifecycleOf(i))+'</span></p><p><b>Opis.</b> '+esc(i.description||'—')+'</p><p><b>Zastosowanie.</b> '+esc(i.problem||'—')+'</p><p><b>Uzasadnienie TRL.</b> '+esc(i.trlWhy||'Brak uzasadnienia.')+'</p><p><b>Uzasadnienie wdrożenia'+(i.wdr>0?' ('+i.wdr+'/5)':'')+'.</b> '+esc(i.wdrWhy||'Brak oceny użycia, kryterium szacowane z etapu rozwoju.')+'</p>'+((i.contact||i.phone)?'<p><b>Kontakt.</b> '+[i.contact?'<a href="mailto:'+esc(i.contact)+'">'+esc(i.contact)+'</a>':'',i.phone?esc(i.phone):''].filter(Boolean).join(' · ')+(i.contactSrc?' <span class="small muted">(źródło: '+esc(i.contactSrc)+')</span>':'')+'</p>':'')+srcB+evidenceBlock(i)+
   '<h4 style="margin:16px 0 6px">Co jest faktem, a co szacunkiem</h4>'+factsTable(i)+
   '<h4 style="margin:16px 0 6px">Ocena w pięciu kryteriach</h4>'+critTable(i,a)+prof+
   '<div style="margin:12px 0">'+locBlock(i)+'</div>'+
   acc('podobne','Podobne rozwiązania w radarze','<span class="pill plain">'+a.sims.length+'</span>',simsTable(a))+
   acc('zaufanie','Wiarygodność i zgłaszanie błędów','<span class="pill plain">'+trustOf(i).lvl+'/3</span>',trustBlock(i))+
   acc('kontakt','Kontakt publiczny do źródła','',contactBlock(innContact(i,l),false))+
   acc('lab','Etykiety nadane automatycznie','<span class="pill '+(l.src==='AI'?'ai':'plain')+'">'+(l.src==='AI'?'AI':'reguły')+'</span>','<div class="labels">'+labs+'</div><p class="small muted" style="margin-top:8px">Etykiety wspiera model AI (gdy jest dostępny), a reguły słownikowe są rozwiązaniem zapasowym. Etykiety nie zmieniają faktów ze źródła.</p>')+
   acc('zrodla','Sprawdź w bazach patentowych i naukowych','<span class="pill plain">'+sourcesFor(i).length+'</span>',srcBlock(i))+
   acc('karta','Karta tekstowa do skopiowania','','<pre class="card-txt">'+esc(cardTxt(i,a))+'</pre>')+'</div>';
  const foot='<div class="dfoot"><button class="btn sm'+(on?'':' ghost')+'" data-cmp="'+i.id+'">'+(on?'✓ W porównaniu (usuń)':'+ Dodaj do porównania')+'</button>'+(i.url?'<a class="btn ghost sm" href="'+esc(i.url)+'" target="_blank" rel="noopener noreferrer">Źródło ↗</a>':'')+'</div>';
  return dHead('<span class="pill" style="background:'+AREA_C[ar]+'1a;color:'+AREA_C[ar]+'">'+ar+'</span><span class="pill plain">'+STAGES[i.stage]+'</span><span class="pill plain">'+esc(typOf(i))+'</span><span class="pill plain">'+trlTxt(i)+'</span>',i.title,esc(i.institution)+' · '+esc(l.city))+body+foot;
}
function renderDrawer(){
  const d=S.drawer;if(!d)return '';
  const inn=S.items.find(x=>x.id===d.id);if(!inn){S.drawer=null;return ''}
  return '<div class="scrim'+(S._on?' open':'')+'" data-act="closed"></div><aside class="drawer'+(S._on?' open':'')+'" role="dialog" aria-modal="true" aria-label="Karta innowacji">'+drawerCard(inn)+'</aside>';
}
function renderModal(){return ''}

/* ---------- porównanie ---------- */
function toggleCmp(id){
  const c=S.cmp=S.cmp||[],k=c.indexOf(id);
  if(k>=0)c.splice(k,1);else{if(c.length>=3){toast('Można porównać do trzech innowacji naraz.');return}c.push(id)}
  if(S.page){render();return}
  after();
}
PAGEX.porownanie=()=>{
  const items=(S.cmp||[]).map(id=>S.items.find(x=>x.id===id)).filter(Boolean);
  if(!items.length)return pg('Porównanie innowacji','<div class="panel"><p>Nie wybrano jeszcze żadnych innowacji. Na liście wyników użyj przycisku „+ Porównaj” przy karcie (do trzech naraz).</p><div class="row"><button class="btn" data-go="inn">Wróć do wyszukiwania</button></div></div>');
  const D=items.map(i=>({i,a:analyze(i)}));
  const best=(f)=>{const v=D.map(f);const m=Math.max.apply(null,v);return v.map(x=>x===m&&v.filter(y=>y===m).length<v.length)};
  const row=(label,f,fmt)=>{const b=best(f);return '<tr><th scope="row">'+label+'</th>'+D.map((d,k)=>'<td'+(b[k]?' class="best"':'')+'>'+fmt(d)+'</td>').join('')+'</tr>'};
  const txt=(label,f)=>'<tr><th scope="row">'+label+'</th>'+D.map(d=>'<td>'+f(d)+'</td>').join('')+'</tr>';
  const head='<tr><th></th>'+D.map(d=>'<th scope="col"><div style="font-weight:700">'+esc(d.i.title)+'</div><button class="linkbtn" data-cmp="'+d.i.id+'">usuń z porównania</button></th>').join('')+'</tr>';
  const body=txt('Obszar',d=>area3Of(d.i))+txt('Instytucja',d=>esc(d.i.institution))+txt('Miejsce',d=>esc(d.a.lab.city))+
   row('Etap rozwoju',d=>d.i.stage,d=>STAGES[d.i.stage]+((d.i.stageOk||!d.i.estimated)?'':' <span class="pill warn">szacunek</span>'))+
   txt('Rodzaj',d=>esc(typOf(d.i)))+row('TRL',d=>trlOf(d.i),d=>d.i.trlNA?'nie dotyczy':'TRL '+trlOf(d.i)+(d.i.trlBasis==='source'?' <span class="pill good">ze źródła</span>':' <span class="pill warn">ocena</span>'))+txt('Uzasadnienie TRL',d=>esc(d.i.trlWhy||'—'))+row('Wdrożenie w praktyce',d=>d.i.wdr>0?d.i.wdr:d.i.stage+1,d=>d.i.wdr>0?d.i.wdr+'/5':'szacunek z etapu')+txt('Uzasadnienie wdrożenia',d=>esc(d.i.wdrWhy||'—'))+
   CRIT.filter(c=>c.k!=='wdroz'&&c.k!=='trl').map(c=>row(c.name,d=>(d.i.scores||d.a.sug)[c.k]||1,d=>bar5((d.i.scores||d.a.sug)[c.k]||1)+' '+((d.i.scores||d.a.sug)[c.k]||1)+'/5')).join('')+
   row('Ocena potencjału',d=>d.a.score,d=>'<b>'+d.a.score+'/100</b> · '+scoreWord(d.a.score))+
   (audOf().w?row('Dopasowanie do profilu',d=>profScore(d.i,d.a),d=>'<b>'+profScore(d.i,d.a)+'/100</b>'):'')+
   txt('Ochrona własności',d=>esc(IPL[d.i.ip]))+
   txt('Najbliższe podobne rozwiązanie',d=>d.a.sims[0]?esc(d.a.sims[0].title)+' ('+Math.round(d.a.sims[0].sim*100)+'%)':'brak podobnych')+
   txt('Fakty ze źródła',d=>factRows(d.i).filter(r=>r[1]==='f').length+' z '+factRows(d.i).length)+
   txt('Źródło',d=>d.i.url?'<a href="'+esc(d.i.url)+'" target="_blank" rel="noopener noreferrer">'+esc(domainOf(d.i.url))+' ↗</a>':'brak linku')+
   txt('Szczegóły',d=>'<button class="btn ghost sm" data-open="inn:'+d.i.id+'">Otwórz kartę</button>');
  return back()+'<div class="page stack" style="max-width:1100px"><h2>Porównanie innowacji</h2><p class="muted">Najlepsza wartość w wierszu jest podświetlona. Wartości oznaczone jako szacunek nie pochodzą ze źródła.</p><div class="panel tablewrap"><table class="cmpt"><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div><div class="row"><button class="btn ghost sm" data-act="cmpclr">Wyczyść porównanie</button><button class="btn sm" data-go="inn">Dodaj kolejne</button></div></div>';
};

/* ---------- źródła i cykliczne aktualizacje ---------- */
const MON=[
 ['Google Scholar, bazy publikacji','Publikacje naukowe','Zapytania tematyczne. Brak oficjalnego API, więc wymagane są narzędzia zgodne z regulaminem.','planowane'],
 ['Strony uczelni, instytutów i jednostek B+R','Aktualności, komunikaty prasowe','Kolektor: wp-json, RSS, linki ze stron (z poszanowaniem robots.txt).','kolektor skonfigurowany'],
 ['Bazy patentowe (UPRP, EPO, Google Patents)','Patenty i zgłoszenia','Dziś odnośniki z kartą innowacji. Docelowo zapytania API po numerze zgłoszenia.','odnośniki, API planowane'],
 ['NCBR (baza sukcesów beneficjentów)','Projekty finansowane','Jednorazowy import rejestru (76 projektów).','aktywne'],
 ['PARP, NCN, Fundusze Europejskie, CORDIS','Projekty i granty','Rejestry projektów: Mapa Dotacji, Kohesio, CORDIS. Pojedyncze pozycje dodano ręcznie.','częściowo, import planowany'],
 ['Firmy, startupy, inkubatory, TTO, instytucje finansujące','Produkty i komercjalizacja','Strony i kanały RSS; wykrywanie ogłoszeń o wdrożeniach i patentach.','planowane'],
 ['Samorządy i szkoły (BIP, samorzad.gov.pl, mapadotacji.gov.pl)','Innowacje administracyjne i edukacyjne','Przegląd komunikatów i opisów projektów. Dziś część pozycji dodano ze źródeł publicznych.','częściowo'],
 ['Raporty i dokumenty (PDF)','Opracowania, katalogi dobrych praktyk','Analiza tekstu dokumentów przez AI, z zachowaniem linku do źródła.','kolektor (opcjonalny model AI)']
];
PAGEX.zrodla=()=>{
  const n=S.items.length,det=S.items.filter(i=>i.detected).length,last=S.items.reduce((m,i)=>i.discoveredAt&&i.discoveredAt>m?i.discoveredAt:m,'');
  const byA=AREAS.map(a=>'<tr><td>'+a+'</td><td class="num">'+S.items.filter(i=>area3Of(i)===a).length+'</td></tr>').join('');
  const st=s=>'<span class="pill '+(/^aktywne/.test(s)?'good':/planowane$/.test(s)?'plain':'')+'">'+s+'</span>';
  const mon='<div class="panel stack"><h3>Skąd radar bierze dane</h3><div class="tablewrap"><table><thead><tr><th>Źródło</th><th>Co zbiera</th><th>Sposób pobierania</th><th>Stan</th></tr></thead><tbody>'+MON.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td class="small muted">'+r[2]+'</td><td>'+st(r[3])+'</td></tr>').join('')+'</tbody></table></div></div>'+
   '<div class="panel stack"><h3>Cykliczna aktualizacja bazy</h3><p class="small">Kolektor uruchamia się codziennie (harmonogram GitHub Actions, 04:00 UTC). Dodaje nowe rozwiązania, odnotowuje zmiany statusu i datę ostatniego potwierdzenia, a przy zmianach źródła oznacza pozycję do ponownej weryfikacji. Aplikacja po wdrożeniu na serwer pobiera <code>feed/feed.json</code>.</p><div class="tiles"><div class="tile"><div class="muted small">Innowacji w radarze</div><div class="big num">'+n+'</div></div><div class="tile"><div class="muted small">Wykrytych automatycznie</div><div class="big num">'+det+'</div></div><div class="tile"><div class="muted small">Ostatnia aktualizacja</div><div class="big num" style="font-size:20px">'+esc(last||'—')+'</div></div></div><div class="tablewrap"><table><thead><tr><th>Obszar</th><th>Liczba</th></tr></thead><tbody>'+byA+'</tbody></table></div><p class="hint">W podglądzie bez serwera działa wbudowana migawka danych. Kolektor jest dostarczony osobno (pliki do hostingu).</p></div>';
  return back()+'<div class="page stack" style="max-width:1100px"><h2>Źródła i aktualizacje</h2>'+mon+'</div>'+renderSources().replace(back(),'').replace('<h2>Źródła danych</h2>','<h2 style="margin-top:24px">Katalog baz do weryfikacji</h2>');
};

/* ---------- anonimowa analityka (RODO) ---------- */
PAGEX.analityka=()=>{
  const top=m=>Object.keys(m||{}).sort((a,b)=>m[b]-m[a]).slice(0,8).map(k=>'<tr><td>'+esc(k)+'</td><td class="num">'+m[k]+'</td></tr>').join('')||'<tr><td colspan="2" class="muted">Brak danych</td></tr>';
  const tb=(t,m)=>'<div><h4 style="margin-bottom:6px">'+t+'</h4><div class="tablewrap"><table><tbody>'+top(m)+'</tbody></table></div></div>';
  return pg('Anonimowa analityka',
   panel('Opcjonalna i za zgodą','<p class="small">Analityka pokazuje zbiorczo, jakich dziedzin i obszarów szukają użytkownicy, aby radar lepiej odpowiadał na potrzeby. Jest domyślnie wyłączona.</p><label class="sw"><input type="checkbox" data-anon="1"'+(AN.on?' checked':'')+'><span class="swt"></span>Zgadzam się na zapisywanie anonimowych statystyk użycia</label>')+
   panel('Co zapisujemy, a czego nie','<ul class="why"><li><b>Zapisujemy:</b> liczniki wybranych obszarów i dziedzin, rodzaj profilu odbiorcy oraz słowa kluczowe wyłącznie ze słownika dziedzin i miast. Inne wpisane słowa są zliczane jako „(inne)”, bez treści.</li><li><b>Nie zapisujemy:</b> adresu IP, identyfikatora urządzenia ani użytkownika, ciasteczek, pełnych zapytań ani otwieranych tytułów.</li><li>W prototypie liczniki zostają wyłącznie w tej przeglądarce. W wersji wdrożeniowej są agregowane na serwerze z progiem minimalnej liczebności i przechowywane do 12 miesięcy.</li><li>Podstawa prawna: zgoda (art. 6 ust. 1 lit. a RODO), którą można wycofać w każdej chwili tutaj.</li></ul>')+
   '<div class="panel stack"><h3>Twoje liczniki ('+AN.n+' zdarzeń)</h3><div class="fsel">'+tb('Słowa kluczowe',AN.q)+tb('Wybrane obszary i dziedziny',AN.f)+tb('Profile odbiorców',AN.aud)+tb('Otwarte karty według obszaru',AN.open)+'</div><div class="row"><button class="btn ghost sm" data-act="anonclr">Usuń zapisane liczniki</button></div></div>');
};

/* ---------- strony opisowe ---------- */
function renderAbout(){
  return back()+'<div class="page stack"><h2>Jak to działa</h2>'+
  panel('Do czego służy radar','<p>Radar to narzędzie do automatycznego wyszukiwania, identyfikowania, analizowania i oceniania <b>istniejących</b> innowacji w Polsce. Skraca czas potrzebny na znalezienie rozwiązania i zmniejsza ryzyko powielania prac. Pomaga częściej wdrażać polskie rozwiązania.</p>')+
  panel('Pięć kroków','<ol class="why"><li><b>Zbieranie.</b> Kolektor i import odczytują publiczne źródła: rejestry projektów, strony uczelni, instytutów, samorządów, szkół, firm oraz bazy patentowe.</li><li><b>Wykrywanie.</b> Oddzielamy rozwiązania udostępnione od projektów w testach i planów. Samo finansowanie lub patent nie oznacza wdrożenia.</li><li><b>Klasyfikacja.</b> Pozycja trafia do obszaru: technologicznego, edukacyjnego lub administracyjnego, dostaje dziedziny, lokalizację i etap rozwoju.</li><li><b>Ocena.</b> Pięć kryteriów: wdrożenie w praktyce, TRL, innowacyjność, potencjał zastosowania i wiarygodność.</li><li><b>Prezentacja.</b> Karta ze źródłem, statusem, gotowością i oceną. Wyszukiwanie dopasowuje się do sześciu grup odbiorców.</li></ol>')+
  panel('Uczciwość danych','<ul class="why"><li>Każda karta ma link do źródła. Pozycje bez źródła są odrzucane i nie pojawiają się w radarze.</li><li>Radar rozróżnia <b>fakty potwierdzone ze źródła</b> od <b>szacunków</b> (np. TRL liczony z etapu wdrożenia). Szacunki są oznaczone gwiazdką lub etykietą.</li><li>AI wspiera klasyfikację, ale nie wymyśla faktów. Ocena wspiera człowieka i go nie zastępuje.</li></ul>')+
  panel('Cele','<ul class="why"><li>Krótszy czas znalezienia innowacji.</li><li>Mniej powielania badań i wdrożeń.</li><li>Więcej wdrożeń polskiej własności intelektualnej.</li></ul>')+'</div>';
}
PAGEX.integr=()=>pg('Integracje i eksport',
  panel('Docelowe integracje','<div class="tablewrap"><table><thead><tr><th>System</th><th>Dziś</th><th>Docelowo</th></tr></thead><tbody>'+[['NCBR – baza sukcesów','import 76 projektów','cykliczny import'],['UPRP, EPO, Google Patents','odnośniki w karcie','zapytania API po numerze zgłoszenia'],['Mapa Dotacji, Kohesio, CORDIS','pojedyncze pozycje','import rejestrów projektów'],['PARP, NCN','brak','import list projektów'],['Google Scholar, PBN','odnośniki w karcie','wyszukiwanie tematyczne'],['Strony uczelni, instytutów, samorządów','kolektor (wp-json, RSS)','większa liczba zweryfikowanych źródeł'],['Dokumenty PDF (raporty, katalogi)','brak','analiza tekstu przez AI']].map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td class="small muted">'+r[2]+'</td></tr>').join('')+'</tbody></table></div>')+
  panel('Eksport widocznych innowacji','<p class="small">Przeglądarka blokuje pobieranie plików w tym widoku, dlatego dane trafiają do pola poniżej i do schowka.</p><div class="row"><button class="btn sm" data-act="expcsv">Eksport CSV</button><button class="btn ghost sm" data-act="expjson">Eksport JSON</button></div><textarea id="exp-out" rows="6" readonly aria-label="Wynik eksportu" style="width:100%"></textarea>'));
PAGEX.priv=()=>pg('Prywatność i RODO',
  panel('Jakie dane przetwarzamy','<div class="tablewrap"><table><thead><tr><th>Dane</th><th>Cel</th><th>Podstawa</th></tr></thead><tbody><tr><td>Opisy innowacji, nazwy instytucji, miejscowości</td><td>Wyszukiwanie i ocena</td><td>Informacje publiczne ze wskazanych źródeł</td></tr><tr><td>Publiczne dane kontaktowe instytucji (e-mail, telefon)</td><td>Kontakt ze źródłem innowacji</td><td>Publikacja przez samą instytucję; podajemy źródło kontaktu</td></tr><tr><td>Anonimowe liczniki użycia</td><td>Poprawa wyszukiwania</td><td>Zgoda (opcjonalna)</td></tr></tbody></table></div>')+
  panel('Zasady','<ul class="why"><li>Brak kont i logowania. Radar nie zbiera danych osobowych użytkowników.</li><li>Dane osobowe twórców (imię i nazwisko, kontakt) pokazujemy tylko wtedy, gdy są opublikowane przez instytucję. Prośby o korektę lub usunięcie można zgłosić przy karcie (zgłoszenie problemu).</li><li>Analityka jest wyłączona domyślnie, anonimowa i bez ciasteczek (zob. „Anonimowa analityka”).</li><li>W prototypie ustawienia zostają w tej przeglądarce.</li></ul>'));
PAGEX.rozwoj=()=>pg('Skalowanie i rozwój',
  panel('Architektura docelowa','<div class="tablewrap"><table><tbody><tr><td><b>Zbieranie</b></td><td>Kolektory źródeł (cron, kolejki), robots.txt, limity zapytań</td></tr><tr><td><b>Przetwarzanie</b></td><td>Wykrywanie innowacji, klasyfikacja AI, deduplikacja, ocena</td></tr><tr><td><b>Dane</b></td><td>Baza z historią zmian statusu i datą ostatniego potwierdzenia</td></tr><tr><td><b>Usługi</b></td><td>API wyszukiwania i filtrowania, eksport, powiadomienia o nowych pozycjach</td></tr><tr><td><b>Prezentacja</b></td><td>Ta aplikacja przeglądarkowa</td></tr></tbody></table></div>')+
  panel('Plan rozwoju','<ol class="why"><li><b>Pilotaż (3 miesiące):</b> jeden region, kilkanaście zweryfikowanych źródeł, ręczna kontrola jakości.</li><li><b>Rozszerzenie (6 miesięcy):</b> rejestry PARP, NCN, CORDIS, bazy patentowe przez API, codzienne aktualizacje.</li><li><b>Skala krajowa:</b> wiele regionów, panel redakcyjny do potwierdzania pozycji, wskaźniki skuteczności.</li></ol>')+
  panel('Wskaźniki sukcesu','<ul class="why"><li>Czas od pytania do znalezienia właściwej innowacji.</li><li>Odsetek pozycji ze źródłem i potwierdzoną datą aktualizacji.</li><li>Liczba wdrożeń polskich rozwiązań po wyszukaniu w radarze (badanie ankietowe).</li></ul>')+
  panel('Test wydajności','<p class="small">Sprawdza w tej przeglądarce, jak szybko działa porównanie podobieństwa dla 1000 syntetycznych innowacji. Dane testowe nie są zapisywane.</p><div class="row"><button class="btn sm" data-act="perf">Uruchom test</button></div><p id="perf-out" class="small" role="status"></p>'));

/* ---------- zdarzenia nowego modelu ---------- */
function setAud(id,keepView){
  S.aud=id;track('aud',id);
  if(!S.role)S.role='inst';
  if(!keepView){S.view='inn';S.page=null;S.drawer=null;S.dd=null;clearFilters();render();try{window.scrollTo(0,0)}catch(e){}}
  else after();
}
const _extPrev=extAction;
extAction=function(d){
  if(d.aud!=null){setAud(d.aud);return true}
  if(d.area!=null){S.role='inst';S.page=null;S.view='inn';S.drawer=null;clearFilters();S.f.area=d.area;track('f',d.area);render();return true}
  if(d.cmp!=null){toggleCmp(d.cmp);return true}
  if(d.act==='cmpclr'){S.cmp=[];render();return true}
  if(d.act==='anonclr'){AN={on:AN.on,n:0,q:{},f:{},aud:{},open:{}};try{localStorage.setItem(KEY_AN,JSON.stringify(AN))}catch(e){}render();return true}
  return _extPrev(d);
};
const _openPrev=openD;
openD=function(k,id){const x=S.items.find(y=>y.id===id);if(x)track('open',area3Of(x));return _openPrev(k,id)};
document.addEventListener('change',e=>{
  const t=e.target,d=t.dataset||{};
  if(d.audsel!=null){setAud(t.value,true);return}
  if(d.anon!=null){AN.on=t.checked;try{localStorage.setItem(KEY_AN,JSON.stringify(AN))}catch(_){}toast(AN.on?'Analityka włączona.':'Analityka wyłączona.');render()}
});

/* ---------- statystyki: województwa i miasta, z podziałem na rodzaj innowacji ---------- */
const TYP_C={'Patent':'#4f6bed','Projekt B+R':'#7c8cf5','Prototyp':'#e0a02a','Infrastruktura badawcza':'#8e5bd6','Program edukacyjny':'#0f9d8c','Usługa publiczna':'#d6603c','Procedura i usługa zdrowotna':'#c43c6e'};
function statAgg(keyf){
  const m={};
  S.items.forEach(i=>{const k=keyf(i);if(!k)return;const r=m[k]||(m[k]={k,n:0,t:{}});r.n++;const t=typOf(i);r.t[t]=(r.t[t]||0)+1});
  return Object.values(m).sort((a,b)=>b.n-a.n||a.k.localeCompare(b.k,'pl'));
}
function stackBar(r,max){
  return '<div style="display:flex;height:16px;border-radius:5px;overflow:hidden;background:#eef1fa;width:'+Math.max(6,Math.round(r.n/max*100))+'%">'+TYP_ORDER.filter(t=>r.t[t]).map(t=>'<i title="'+esc(t)+': '+r.t[t]+'" style="width:'+(r.t[t]/r.n*100)+'%;background:'+TYP_C[t]+'"></i>').join('')+'</div>';
}
function statBlock(rows,label){
  const max=rows.length?rows[0].n:1;
  const used=TYP_ORDER.filter(t=>rows.some(r=>r.t[t]));
  const legend='<div class="row" style="flex-wrap:wrap;gap:10px 16px;margin:4px 0 10px">'+used.map(t=>'<span class="small"><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:'+TYP_C[t]+';margin-right:6px"></i>'+esc(t)+'</span>').join('')+'</div>';
  const bars=rows.map(r=>'<div style="display:grid;grid-template-columns:minmax(120px,190px) 1fr 38px;gap:10px;align-items:center;margin:6px 0"><div class="small"><b>'+esc(r.k)+'</b></div>'+stackBar(r,max)+'<div class="num"><b>'+r.n+'</b></div></div>').join('');
  const th=used.map(t=>'<th scope="col" class="num">'+esc(t)+'</th>').join('');
  const tbl='<div class="tablewrap"><table><thead><tr><th scope="col">'+label+'</th><th scope="col" class="num">Razem</th>'+th+'</tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(r.k)+'</td><td class="num"><b>'+r.n+'</b></td>'+used.map(t=>'<td class="num">'+(r.t[t]||'')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  return legend+bars+'<h4 style="margin:16px 0 6px">Tabela</h4>'+tbl;
}
PAGEX.statystyki=()=>{
  const total=S.items.length;
  const woj=statAgg(i=>{const l=locOf(i);return l&&l.woj||''});
  const withWoj=woj.reduce((a,r)=>a+r.n,0);
  const city=statAgg(i=>{const l=locOf(i);return l&&l.prec==='miejscowość'&&l.miejsc?l.miejsc:''});
  const withCity=city.reduce((a,r)=>a+r.n,0);
  const topW=woj[0],topC=city[0];
  const sum='<div class="row" style="flex-wrap:wrap;gap:12px">'+[['Innowacji w radarze',total],['Województwo z największą liczbą',topW?topW.k+' ('+topW.n+')':'—'],['Miasto z największą liczbą',topC?topC.k+' ('+topC.n+')':'—']].map(x=>'<div class="panel" style="flex:1;min-width:180px"><div class="small muted">'+x[0]+'</div><div style="font-size:22px;font-weight:800;margin-top:4px">'+esc(String(x[1]))+'</div></div>').join('')+'</div>';
  return pg('Statystyki innowacji',
   sum+
   panel('Województwa: liczba innowacji i ich rodzaj','<p class="small muted">Policzono '+withWoj+' z '+total+' innowacji z ustalonym województwem. Pozycje o niepewnej lokalizacji są liczone według województwa podanego w źródle.</p>'+statBlock(woj,'Województwo'))+
   panel('Miasta: liczba innowacji i ich rodzaj','<p class="small muted">Policzono tylko innowacje z miejscowością podaną w źródle ('+withCity+' z '+total+'). Pozostałe '+(total-withCity)+' znają tylko województwo, więc nie trafiły do rankingu miast.</p>'+statBlock(city.slice(0,5),'Miasto')+(city.length>5?'<p class="small muted">Pokazano 5 największych z '+city.length+' miast.</p>':''))
  );
};
