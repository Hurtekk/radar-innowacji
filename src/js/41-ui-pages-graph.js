
/* ====================== nagłówek, pasek widoku, strona główna ====================== */
function renderTop(){
  const el=$('hdr'),logo='<button class="logo" data-act="home" aria-label="Radar innowacyjny ZBIEG, strona główna">'+IC.logo+'<span><b>Radar</b> innowacyjny ZBIEG</span></button>';
  const acctP=S.acct?'<div class="ddi" style="cursor:default"><span><b>'+esc(S.acct.name)+'</b><br><small>'+esc(S.acct.kind===5?'Inwestor':kindName(S.acct.kind))+' · '+esc(S.acct.email)+'</small></span></div><div class="ddsep"></div><button class="ddi" data-act="logout">Wyloguj</button>':'';
  const acctB=S.acct?ddMenu('acct',esc(S.acct.name.length>18?S.acct.name.slice(0,17)+'…':S.acct.name),acctP):'<button class="btn ghost sm" data-act="acct">Zaloguj</button>';
  if(!S.role){el.innerHTML=logo+'<span></span><div class="hright"><button class="btn ghost sm" data-page="opis">Jak to działa</button>'+acctB+'</div>';return}
  const inst=S.role==='inst';
  const roleP=['inst','inv'].map(r=>'<button class="ddi" role="menuitemradio" aria-checked="'+(S.role===r)+'" data-role="'+r+'">'+(r==='inst'?'Instytucja':'Inwestor')+'<small>'+(r==='inst'?'zgłaszam innowacje':'szukam innowacji')+'</small></button>').join('');
  const menuP=(!S.acct?'':inst?'<button class="ddi" data-page="miary">Mierniki skuteczności</button>':'<button class="ddi" data-page="profil">Mój profil inwestora</button><button class="ddi" data-page="moje">Moje zapytania</button>')+'<button class="ddi" data-page="zrodla">Źródła danych</button><button class="ddi" data-page="metod">Metodologia oceny</button><button class="ddi" data-page="integr">Integracje, import, eksport</button><button class="ddi" data-page="priv">Prywatność i dane</button><button class="ddi" data-page="rozwoj">Skalowanie i rozwój</button><button class="ddi" data-page="moder">Moderacja zgłoszeń</button><button class="ddi" data-page="opis">Jak to działa</button><div class="ddsep"></div><button class="ddi" data-act="home">Strona główna</button>';
  el.innerHTML=logo+searchBox('Szukaj innowacji, tematu, miasta lub inwestora')+'<div class="hright">'+(!S.acct?'':inst?'<button class="btn sm" data-act="add">+ Dodaj</button>':'<button class="btn sm" data-act="addoffer">+ Dodaj ofertę</button>')+''+ddMenu('menu','Menu',menuP,{cls:'btn ghost sm'})+(S.acct?acctB:'<button class="btn sm" data-act="acct">Zaloguj się</button>')+'</div>';
  renderDrop();
}
function renderSub(){
  const inst=S.role==='inst',pend=(inst&&S.acct)?pendCount():0;
  const views=inst?[['inn','Innowacje'],['invs','Inwestorzy'],['mapinn','Mapa innowacji'],['mapinv','Mapa inwestorów']]:[['inn','Oferty'],['mapinn','Mapa innowacji'],['mapinv','Mapa inwestorów']];
  const seg='<div class="seg" role="group" aria-label="Widok">'+views.map(v=>'<button data-view="'+v[0]+'" aria-pressed="'+(S.view===v[0])+'">'+v[1]+(v[0]==='inn'&&pend?'<span class="pill ask">'+pend+'</span>':'')+'</button>').join('')+'</div>';
  let right='';
  if(false){
    const setP='<div class="stack" style="gap:14px"><div><label for="gmin">Pokaż powiązania od siły: <b class="num" id="gmin-v">'+S.gmin+'</b>%</label><input type="range" id="gmin" data-gmin="1" min="30" max="90" step="5" value="'+S.gmin+'"></div><label class="sw"><input type="checkbox" data-gtopics="1"'+(S.gtopics?' checked':'')+'><span class="swt"></span>Pokaż tematy (dziedziny)</label><button class="btn ghost sm" data-act="greset">Przelicz układ</button></div>';
    const legP='<div class="legend"><span><i class="ldot" style="background:#f59e0b"></i>instytucja</span><span><i class="ldot" style="background:#4f6bed"></i>innowacja</span><span><i class="ldot" style="background:#0f9d8c"></i>inwestor</span><span><i class="ldot" style="background:#d946ef"></i>Twój profil</span><span><i class="ldot" style="background:#94a3b8"></i>temat</span><span><i class="lln" style="border-color:#0f9d8c"></i>silne, od 70%</span><span><i class="lln" style="border-color:#4f6bed;border-top-width:2px"></i>średnie, 50–69%</span><span><i class="lln" style="border-color:#94a3b8;border-top-width:2px;border-top-style:dashed"></i>słabe, 30–49%</span></div>';
    right=ddMenu('legend','Legenda',legP)+ddMenu('mapset','Ustawienia',setP,{wide:true});
  }
  else{
    const defs=filterDefs(),act=defs.filter(d=>d[2]);
    const chips=act.map(d=>'<button class="pill" data-rmf="'+d[0]+'" aria-label="Usuń filtr '+esc(d[2])+'">'+esc(d[2])+' ×</button>').join('');
    const fit=S.view==='invs'?'<div style="margin-bottom:14px"><label for="fitfor">Siła powiązania z innowacją</label><select id="fitfor" data-fitfor="1">'+S.items.map(i=>'<option value="'+i.id+'"'+(i.id===S.sel?' selected':'')+'>'+esc(i.title)+'</option>').join('')+'</select></div>':'';
    const fp=fit+'<div class="fsel">'+defs.map(d=>selBox(d[0],d[1],d[2],d[3])).join('')+'</div><div class="row" style="margin-top:14px">'+(S.view==='inn'&&inst?'<button class="btn ghost sm" data-act="aiall">Nadaj etykiety AI wszystkim</button>':'')+'<button class="linkbtn" data-act="clr">Wyczyść wszystko</button></div><p class="hint" style="margin-top:10px">Dziedzina, miasto i wystawca są nadawane automatycznie (AI lub reguły). Możliwość wdrożenia wynika z oceny.</p>';
    right='<span class="cnt" id="cnt"></span>'+chips+ddMenu('filters','Filtry'+(act.length?' ('+act.length+')':''),fp,{wide:true});
  }
  return '<div class="sub">'+seg+'<div class="subr">'+right+'</div></div>';
}
function renderHome(){
  const strong=graphPairs().filter(x=>x.sc>=70).length;
  return '<section class="home"><span class="kick">'+IC.radar+' Radar innowacyjny ZBIEG · Podkarpacie</span><h1>Ukryte innowacje, <em>połączone z tymi, którzy je wdrożą</em></h1><p class="lead">Pomysły ze szkół, uczelni i samorządów zwykle zostają tam, gdzie powstały. Radar pomaga je odnaleźć, ocenić i skierować do właściwych ludzi.</p>'+searchBox('Szukaj tematu, np. lotnictwo, szkoła, energia')+
  '<div class="roles">'+(S.acct?'<button class="role" data-role="'+acctRole(S.acct)+'"><span class="ic">'+IC.radar+'</span><h3>Przejdź do mojego panelu</h3><p class="muted small">Zalogowano jako '+esc(S.acct.name)+'.</p><span class="go">Wchodzę →</span></button>':'<button class="role" data-role="inst"><span class="ic">'+IC.radar+'</span><h3>Przeglądaj jako gość</h3><p class="muted small">Innowacje, inwestorzy i mapy bez logowania. Kontakty są ukryte.</p><span class="go">Wchodzę →</span></button><button class="role t" data-act="acct"><span class="ic">'+IC.coin+'</span><h3>Zaloguj się lub załóż konto</h3><p class="muted small">Zgłaszaj innowacje lub oferty. Do wypróbowania jest konto demo szkoły i funduszu.</p><span class="go">Logowanie →</span></button>')+'</div>'+
  '<p class="small muted" style="margin-top:22px">'+(S.acct?'Zalogowano jako <b>'+esc(S.acct.name)+'</b>.':'Masz instytucję, szkołę lub fundusz? <button class="linkbtn" data-act="acct">Załóż konto lub zaloguj się</button>')+'</p><div class="flow"><span><b>1</b>Zgłoś</span><span><b>2</b>Oceń</span><span><b>3</b>Połącz</span></div>'+
  '<p class="stats">'+S.items.length+' innowacji · '+(PARTNERS.length)+' inwestorów i partnerów · '+strong+' silnych powiązań</p></section>';
}

/* ====================== strony ====================== */
const back=()=>'<button class="back" data-act="back">← Wróć</button>';
function renderProfile(){
  const P=S.inv;
  const chk=(kind,arr,val)=>'<label class="chipc"><input type="checkbox" data-pf="'+kind+'" value="'+esc(val)+'"'+(arr.includes(val)?' checked':'')+'>'+esc(val)+'</label>';
  return back()+'<div class="page"><h2>Mój profil inwestora</h2><p class="muted" style="margin-bottom:18px">Profil ustawia kolejność ofert i siłę powiązań na mapie. Instytucja zobaczy nazwę, kontakt i wiadomość.</p><div class="panel stack">'+
  '<div class="form-grid"><div class="full"><label for="pf-name">Nazwa profilu</label><input type="text" id="pf-name" data-pf="name" value="'+esc(P.name)+'"></div>'+
  '<div><label for="pf-person">Osoba kontaktowa</label><input type="text" id="pf-person" data-pf="person" value="'+esc(P.person)+'"></div><div><label for="pf-city">Miasto</label><input type="text" id="pf-city" data-pf="city" value="'+esc(P.city)+'"></div>'+
  '<div><label for="pf-email">E-mail</label><input type="email" id="pf-email" data-pf="email" value="'+esc(P.email)+'"></div><div><label for="pf-phone">Telefon</label><input type="tel" id="pf-phone" data-pf="phone" value="'+esc(P.phone)+'"></div></div>'+
  '<div><label>Obszary zainteresowań</label><div class="chips">'+ALLTAGS.map(t=>chk('tag',P.tags,t)).join('')+'</div></div>'+
  '<div><label>Typy innowacji</label><div class="chips">'+TYPES.map(t=>chk('type',P.types,t)).join('')+'</div></div>'+
  '<div class="form-grid"><div><label for="pf-smin">Etap od</label><select id="pf-smin" data-pf="smin">'+opts(STAGES,P.smin)+'</select></div><div><label for="pf-smax">Etap do</label><select id="pf-smax" data-pf="smax">'+opts(STAGES,P.smax)+'</select></div></div>'+
  '<div><label for="pf-min">Minimalna ocena potencjału: <b class="num">'+P.min+'</b>/100</label><input type="range" id="pf-min" data-pf="min" min="0" max="90" step="5" value="'+P.min+'"></div>'+
  '<label class="sw"><input type="checkbox" data-pf="dup"'+(P.dup?' checked':'')+'><span class="swt"></span>Ukryj oferty z wysokim ryzykiem dublowania prac</label>'+
  '<div class="row"><button class="btn" data-go="inn">Zobacz oferty</button></div></div></div>';
}
function renderMine(){
  const rows=[];S.items.forEach(i=>i.interests.forEach(q=>{if(q.investor===S.inv.name)rows.push({i,q})}));
  return back()+'<div class="page"><h2>Moje zapytania</h2><div class="stack">'+(rows.length?rows.map(r=>{const l=analyze(r.i).lab;return '<div class="panel"><div class="row between"><b>'+esc(r.i.title)+'</b><span class="pill '+stClass(r.q.status)+'">'+r.q.status+'</span></div><div class="small muted">'+esc(r.i.institution)+' · wysłano '+r.q.t+'</div><p class="small" style="margin-top:8px">Twoja wiadomość: '+esc(r.q.msg)+'</p><div style="margin-top:10px"><h4 style="margin-bottom:6px">Kontakt do twórców</h4>'+contactBlock(innContact(r.i,l),r.q.status!=='zaakceptowane')+'</div>'+(r.q.status==='odrzucone'?'<p class="small muted" style="margin-top:8px">Instytucja odrzuciła zapytanie.</p>':r.q.status==='oczekuje'?'<p class="small muted" style="margin-top:8px">Czekasz na decyzję instytucji. Pełne dane odblokują się po akceptacji.</p>':'')+'<div style="margin-top:10px"><button class="btn ghost sm" data-open="inn:'+r.i.id+'">Szczegóły oferty</button></div></div>'}).join(''):'<div class="empty"><b>Brak zapytań</b>Przejdź do ofert i zgłoś zainteresowanie.</div>')+'</div><p class="hint" style="margin-top:14px">W demo możesz przełączyć się na stronę instytucji, zaakceptować zapytanie i wrócić tutaj.</p></div>';
}
function renderMetrics(){
  const items=S.items,n=items.length,data=items.map(i=>({i,a:analyze(i)}));
  const avg=n?Math.round(data.reduce((s,d)=>s+d.a.score,0)/n):0;
  const dup=data.filter(d=>d.a.sims[0]&&d.a.sims[0].sim>=.35).length;
  const routed=items.filter(i=>i.status>=2).length,contact=items.filter(i=>i.status>=3).length;
  const bar=(label,c,tot)=>'<div class="hbar"><div>'+label+'</div><div class="bar"><i style="width:'+(tot?Math.round(100*c/tot):0)+'%"></i></div><div class="num">'+c+'</div></div>';
  const paths={};data.forEach(d=>{const t=d.a.rec.primary.title.split(':')[0];paths[t]=(paths[t]||0)+1});
  return back()+'<div class="page stack"><h2>Mierniki skuteczności</h2><div class="tiles">'+
   [['Innowacje w radarze',n],['Średnia ocena',avg+'/100'],['Skierowane dalej',routed+' z '+n],['W kontakcie lub wdrożone',contact+' z '+n],['Wykryte ryzyko dublowania',dup]].map(t=>'<div class="tile"><div class="muted small">'+t[0]+'</div><div class="big num">'+t[1]+'</div></div>').join('')+'</div>'+
  '<div class="panel"><h3 style="margin-bottom:8px">Lejek: co dzieje się z innowacją po wykryciu</h3>'+STATUS.map((s,k)=>bar(s,items.filter(i=>i.status>=k).length,n)).join('')+'</div>'+
  '<div class="panel"><h3 style="margin-bottom:8px">Rekomendowane ścieżki</h3>'+Object.keys(paths).map(k=>bar(esc(k),paths[k],n)).join('')+'</div>'+
  '<div class="panel"><h3 style="margin-bottom:8px">Innowacje według dziedziny (etykiety automatyczne)</h3>'+optList(data.map(d=>d.a.lab.dz)).map(x=>bar(esc(x[0]),x[1],n)).join('')+'</div>'+
  '<div class="panel"><details class="dt" style="border:0"><summary>Proponowane wskaźniki sukcesu w pilotażu</summary><div class="dtb tablewrap"><table><thead><tr><th>Wskaźnik</th><th>Jak mierzyć</th><th>Cel na 6 miesięcy</th></tr></thead><tbody>'+
   '<tr><td>Czas od wykrycia do oceny</td><td>Różnica dat statusów 1 i 2</td><td>do 7 dni</td></tr><tr><td>Odsetek ocenionych innowacji</td><td>Ocenione / wykryte</td><td>co najmniej 80%</td></tr><tr><td>Skierowania zakończone kontaktem</td><td>Status „W kontakcie” / „Skierowana”</td><td>co najmniej 30%</td></tr><tr><td>Uniknięte dublowanie prac</td><td>Zgłoszenia z podobieństwem ≥35% rozwiązane współpracą</td><td>każdy taki przypadek</td></tr><tr><td>Silne powiązania innowacja-inwestor</td><td>Liczba par o sile ≥70% na mapie</td><td>co najmniej 1 na innowację</td></tr><tr><td>Replikacje w innych instytucjach</td><td>Liczba wdrożeń poza instytucją źródłową</td><td>co najmniej 3</td></tr></tbody></table></div></details></div></div>';
}
function renderAbout(){
  const sec=(t,b)=>'<div class="panel"><details class="dt" style="border:0"><summary>'+t+'</summary><div class="dtb">'+b+'</div></details></div>';
  return back()+'<div class="page stack"><h2>Jak to działa</h2>'+
  '<div class="panel stack"><h3>Problem</h3><p>Dobre pomysły powstają w szkołach, na uczelniach i w urzędach, ale zostają w miejscu powstania. Nie ma prostego sposobu, żeby je systematycznie wyłapać, porównać i skierować do ludzi, którzy mogą je wdrożyć, rozwinąć albo sfinansować.</p></div>'+
  '<div class="panel stack"><h3>Proces w siedmiu krokach</h3><ol class="why"><li><b>Wykrycie.</b> Formularz, wklejenie opisu albo sygnał ze skanera źródeł.</li><li><b>Etykiety automatyczne.</b> AI nadaje dziedzinę, temat, miasto i wystawcę. Bez AI działają reguły słownikowe.</li><li><b>Ocena.</b> Pięć jawnych kryteriów z wagami. System sugeruje, człowiek zatwierdza.</li><li><b>Rekomendacja ścieżki</b> z uzasadnieniem.</li><li><b>Podobne rozwiązania</b> ograniczają dublowanie prac.</li><li><b>Mapa powiązań.</b> Silne i słabe połączenia innowacji z inwestorami i tematami.</li><li><b>Zapytania i kontakt.</b> Inwestor pyta, instytucja akceptuje, dane kontaktowe się odblokowują.</li></ol></div>'+
  sec('Dwie strony aplikacji','<ul class="why"><li><b>Instytucja</b> zgłasza innowacje, zatwierdza ocenę, decyduje o widoczności i odpowiada na zapytania.</li><li><b>Inwestor</b> ustawia profil, przegląda oferty według dopasowania, widzi ocenę i ryzyko dublowania, wysyła zapytanie.</li><li>Każda innowacja i każdy inwestor ma dane kontaktowe. Dane twórców są maskowane do akceptacji zapytania.</li></ul>')+
  sec('Kryteria oceny','<div class="tablewrap"><table><thead><tr><th>Kryterium</th><th>Waga</th><th>Skąd sugestia</th></tr></thead><tbody>'+CRIT.map(c=>'<tr><td>'+c.name+'</td><td class="num">'+c.w+'%</td><td>'+c.auto+'</td></tr>').join('')+'</tbody></table></div>')+
  sec('Założenia i ograniczenia prototypu','<ul class="why"><li>Prototyp działa w przeglądarce. Dane zapisują się lokalnie i nie trafiają na serwer.</li><li>Projekty pochodzą z rejestru NCBR (pobranie jednorazowe), a inwestorzy i oferty wynikają z programów i uczestników tych projektów. Strona nie łączy się na żywo z UPRP, EPO, PBN ani Interreg, a dane kontaktowe osób nie są publikowane.</li><li>Etykiety AI wymagają zgody na użycie Claude’a. Gdy AI jest niedostępne, działają reguły słownikowe, które mogą się mylić.</li><li>Podobieństwo liczy TF-IDF na skróconych rdzeniach słów i nie rozumie synonimów.</li><li>Siła powiązań to jawna formuła, nie model uczący się.</li></ul>')+
  sec('Droga do wdrożenia','<ul class="why"><li><b>Skalowanie:</b> wspólna baza z podziałem na instytucje i role.</li><li><b>Integracje:</b> API UPRP/EPO, PBN, rejestry projektów, logowanie instytucjonalne.</li><li><b>Dane i bezpieczeństwo:</b> zgoda twórców, minimalizacja danych, dostęp wg ról, rejestr zmian.</li><li><b>Rozwój:</b> kalibracja wag na historii decyzji, embeddingi zamiast TF-IDF, kalendarz naborów.</li></ul>')+'</div>';
}

/* ====================== mapa powiązań ====================== */
let GR=null;
function stopGraph(){if(GR){cancelAnimationFrame&&cancelAnimationFrame(GR.raf);GR.dead=true;GR=null}}
function graphPairs(){
  const items=vis(),invs=allInvestors(),pairs=[];
  items.forEach(i=>{const a=analyze(i);invs.forEach(p=>{const m=matchScore(i,{tags:p.tags,types:p.types,st:p.st},a.score);pairs.push({i,p,sc:m.sc,why:m.why})})});
  return pairs;
}
function buildGraphData(prev){
  const nodes=[],edges=[],byId={};
  const add=n=>{const o=prev&&prev[n.id];n.x=o?o.x:(Math.random()-.5)*300;n.y=o?o.y:(Math.random()-.5)*300;n.vx=0;n.vy=0;byId[n.id]=n;nodes.push(n);return n};
  const items=vis(),invs=allInvestors();
  [...new Set(items.map(i=>i.institution))].forEach(o=>add({id:'o:'+o,type:'org',label:o,r:12}));
  items.forEach(i=>{add({id:'i:'+i.id,type:'inn',label:i.title,r:8,ref:i});edges.push({a:'o:'+i.institution,b:'i:'+i.id,kind:'own',w:100})});
  invs.forEach(p=>add({id:'p:'+p.id,type:p.id==='me'?'me':'inv',label:p.name,r:p.id==='me'?11:8,ref:p}));
  if(S.gtopics){
    const used=new Set();items.forEach(i=>used.add(analyze(i).lab.dz));invs.forEach(p=>domainsOf(p.tags).forEach(d=>used.add(d)));
    used.forEach(d=>add({id:'t:'+d,type:'topic',label:d,r:6}));
    items.forEach(i=>edges.push({a:'i:'+i.id,b:'t:'+analyze(i).lab.dz,kind:'topic',w:100}));
    invs.forEach(p=>domainsOf(p.tags).forEach(d=>edges.push({a:'p:'+p.id,b:'t:'+d,kind:'topic',w:100})));
  }
  graphPairs().forEach(x=>{if(x.sc>=S.gmin)edges.push({a:'i:'+x.i.id,b:'p:'+x.p.id,kind:'match',w:x.sc,why:x.why})});
  edges.forEach(e=>{e.A=byId[e.a];e.B=byId[e.b]});
  return {nodes,edges,byId};
}
function renderMapView(){
  const pairs=graphPairs().sort((a,b)=>b.sc-a.sc),top=pairs.slice(0,6);
  const gaps=vis().map(i=>({i,best:pairs.filter(x=>x.i.id===i.id)[0]})).filter(x=>x.best&&x.best.sc<70).sort((a,b)=>a.best.sc-b.best.sc).slice(0,5);
  const rowP=x=>'<tr><td>'+esc(x.i.title)+'</td><td>'+esc(x.p.name)+'</td><td>'+strPill(x.sc)+'</td></tr>';
  return '<div class="mapcard"><canvas id="gcv" role="img" aria-label="Mapa powiązań innowacji i inwestorów"></canvas><div class="mapside" id="gside"></div><div class="gtip">Przeciągaj kropki, przewijaj aby przybliżyć, kliknij kropkę aby zobaczyć szczegóły</div></div>'+
  '<div style="margin-top:16px" class="stack"><div class="panel"><details class="dt" style="border:0"><summary>Najsilniejsze powiązania</summary><div class="dtb tablewrap"><table><thead><tr><th>Innowacja</th><th>Inwestor</th><th>Siła</th></tr></thead><tbody>'+top.map(rowP).join('')+'</tbody></table></div></details></div>'+
  '<div class="panel"><details class="dt" style="border:0"><summary>Luki: innowacje bez silnego partnera</summary><div class="dtb"><p class="hint" style="margin-bottom:10px">Najlepsze dostępne dopasowanie jest poniżej 70%. Warto poszukać nowych inwestorów lub doprecyzować opis.</p>'+(gaps.length?'<div class="tablewrap"><table><thead><tr><th>Innowacja</th><th>Najlepszy inwestor</th><th>Siła</th></tr></thead><tbody>'+gaps.map(g=>'<tr><td>'+esc(g.i.title)+'</td><td>'+esc(g.best.p.name)+'</td><td>'+strPill(g.best.sc)+'</td></tr>').join('')+'</tbody></table></div>':'<p class="muted">Każda innowacja ma co najmniej jedno silne powiązanie.</p>')+'</div></details></div></div>';
}
function graphSide(n){
  if(!n)return '';
  const links=GR.data.edges.filter(e=>e.kind==='match'&&(e.A===n||e.B===n)).sort((a,b)=>b.w-a.w);
  const other=e=>e.A===n?e.B:e.A;
  const list=links.length?'<h4 style="margin:12px 0 4px">Powiązania</h4>'+links.slice(0,5).map(e=>'<button class="ddi" style="padding:6px 8px" data-gnode="'+esc(other(e).id)+'"><span>'+esc(other(e).label)+'</span>'+strPill(e.w)+'</button>').join(''):'';
  const x='<button class="x" style="float:right;width:30px;height:30px;font-size:18px" data-gnode="" aria-label="Zamknij">×</button>';
  if(n.type==='inn'){const i=n.ref,l=analyze(i).lab,a=analyze(i);
    return x+'<span class="pill">'+esc(l.dz)+'</span><h3 style="margin:8px 0 4px">'+esc(i.title)+'</h3><p class="small muted">'+esc(i.institution)+' · '+esc(l.city)+' · ocena '+a.score+'/100</p>'+list+'<div style="margin-top:14px"><button class="btn sm" data-open="inn:'+i.id+'">Szczegóły i kontakt</button></div>';}
  if(n.type==='inv'||n.type==='me'){const p=n.ref;
    return x+'<span class="pill">'+esc(p.kind)+'</span><h3 style="margin:8px 0 4px">'+esc(p.name)+'</h3><p class="small muted">'+esc(p.city)+' · '+esc(p.person)+'</p>'+list+'<div style="margin-top:14px"><button class="btn sm" data-open="inv:'+p.id+'">Szczegóły i kontakt</button></div>';}
  if(n.type==='org'){const inns=vis().filter(i=>i.institution===n.label);
    return x+'<h3 style="margin:8px 0 4px">'+esc(n.label)+'</h3><p class="small muted">Zgłasza '+inns.length+' innowacj'+(inns.length===1?'ę':'e')+'.</p>'+inns.map(i=>'<button class="ddi" style="padding:6px 8px" data-gnode="i:'+i.id+'">'+esc(i.title)+'</button>').join('');}
  const rel=GR.data.edges.filter(e=>e.kind==='topic'&&(e.A===n||e.B===n)).map(other);
  return x+'<span class="pill plain">temat</span><h3 style="margin:8px 0 4px">'+esc(n.label)+'</h3><p class="small muted">Łączy '+rel.length+' kropek.</p><div style="max-height:200px;overflow:auto">'+rel.map(r=>'<button class="ddi" style="padding:6px 8px" data-gnode="'+esc(r.id)+'">'+esc(r.label)+'</button>').join('')+'</div>';
}
function initGraph(){
  const cv=$('gcv');if(!cv||!cv.getContext)return;
  const ctx=cv.getContext('2d'),dpr=window.devicePixelRatio||1;
  const G=GR={cv,ctx,raf:0,dead:false,k:1,tx:0,ty:0,w:0,h:0,alpha:1,hover:null,sel:null,drag:null,pan:null,moved:false,data:null};
  G.data=buildGraphData();
  const defSel=S.role==='inv'?'p:me':null;
  G.sel=G.data.byId[S.gsel]?S.gsel:(G.data.byId[defSel]?defSel:null);
  function resize(){const r=cv.getBoundingClientRect();G.w=r.width;G.h=r.height;cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr);G.tx=G.w/2;G.ty=G.h/2}
  resize();
  const side=()=>{const s=$('gside');if(s)s.innerHTML=graphSide(G.sel?G.data.byId[G.sel]:null)};
  G.side=side;side();
  G.rebuild=()=>{const prev={};G.data.nodes.forEach(n=>prev[n.id]={x:n.x,y:n.y});G.data=buildGraphData(prev);if(!G.data.byId[G.sel])G.sel=null;G.alpha=.8;side()};
  G.reset=()=>{G.data.nodes.forEach(n=>{n.x=(Math.random()-.5)*300;n.y=(Math.random()-.5)*300;n.vx=n.vy=0});G.alpha=1;G.k=1;G.tx=G.w/2;G.ty=G.h/2};
  G.select=id=>{G.sel=id||null;S.gsel=G.sel;side()};
  const neigh=id=>{const s=new Set([id]);G.data.edges.forEach(e=>{if(e.a===id)s.add(e.b);if(e.b===id)s.add(e.a)});return s};
  const COL={org:'#f59e0b',inn:'#4f6bed',inv:'#0f9d8c',me:'#d946ef',topic:'#94a3b8'};
  function tick(){
    const N=G.data.nodes,E=G.data.edges,a=G.alpha;
    for(let i=0;i<N.length;i++){const p=N[i];for(let j=i+1;j<N.length;j++){const q=N[j];const dx=p.x-q.x,dy=p.y-q.y,d2=dx*dx+dy*dy+.01;if(d2>360000)continue;const d=Math.sqrt(d2),f=7000/d2*a,fx=dx/d*f,fy=dy/d*f;p.vx+=fx;p.vy+=fy;q.vx-=fx;q.vy-=fy}}
    for(const e of E){const p=e.A,q=e.B;if(!p||!q)continue;const dx=q.x-p.x,dy=q.y-p.y,d=Math.sqrt(dx*dx+dy*dy)||1;const L=e.kind==='own'?60:e.kind==='topic'?150:360-2.3*e.w;const k=e.kind==='match'?.003+e.w/100*.02:.02;const f=(d-L)*k*a,fx=dx/d*f,fy=dy/d*f;p.vx+=fx;p.vy+=fy;q.vx-=fx;q.vy-=fy}
    for(const p of N){p.vx-=p.x*.0016*a;p.vy-=p.y*.0016*a;if(p.fx!=null){p.x=p.fx;p.y=p.fy;p.vx=p.vy=0}else{p.vx*=.8;p.vy*=.8;p.x+=p.vx;p.y+=p.vy}}
    G.alpha=Math.max(.0,G.alpha*.988);
  }
  function draw(){
    const c=ctx,N=G.data.nodes,E=G.data.edges;
    c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,G.w,G.h);
    c.save();c.translate(G.tx,G.ty);c.scale(G.k,G.k);
    const focus=G.hover||G.sel,nb=focus?neigh(focus):null;
    for(const e of E){
      if(!e.A||!e.B)continue;
      const on=!focus||(e.a===focus||e.b===focus);
      c.beginPath();c.moveTo(e.A.x,e.A.y);c.lineTo(e.B.x,e.B.y);c.setLineDash([]);
      let col,lw;
      if(e.kind==='match'){if(e.w>=70){col='15,157,140';lw=3.2}else if(e.w>=50){col='79,107,237';lw=2.2}else{col='148,163,184';lw=1.3;c.setLineDash([5/G.k,4/G.k])}c.strokeStyle='rgba('+col+','+(on?(e.w>=70?.9:e.w>=50?.75:.6):.07)+')'}
      else{lw=1;c.strokeStyle='rgba(148,163,184,'+(on?(e.kind==='own'?.5:.28):.07)+')'}
      c.lineWidth=lw/G.k;c.stroke();
    }
    c.setLineDash([]);
    for(const n of N){
      const on=!nb||nb.has(n.id),hot=n.id===G.hover||n.id===G.sel;
      c.globalAlpha=on?1:.2;
      c.beginPath();c.arc(n.x,n.y,n.r*(hot?1.25:1),0,6.2832);c.fillStyle=COL[n.type];
      if(hot){c.shadowColor=COL[n.type];c.shadowBlur=14}
      c.fill();c.shadowBlur=0;
      c.lineWidth=2/G.k;c.strokeStyle='#fff';c.stroke();
      if(n.type==='me'){c.lineWidth=2/G.k;c.strokeStyle='#d946ef';c.beginPath();c.arc(n.x,n.y,n.r+4,0,6.2832);c.stroke()}
      c.globalAlpha=1;
    }
    c.font='600 '+(12/G.k)+'px Manrope, system-ui, sans-serif';c.textAlign='center';
    for(const n of N){
      const on=!nb||nb.has(n.id),hot=n.id===G.hover||n.id===G.sel;
      if(!focus&&!(n.type==='inn'||n.type==='me'||n.type==='org')&&G.k<1.5)continue;
      if(focus&&!on)continue;
      let t=n.label;if(!hot&&t.length>24)t=t.slice(0,23)+'…';
      c.fillStyle=hot?'#1b2440':(on?'rgba(27,36,64,.78)':'rgba(27,36,64,.16)');
      c.fillText(t,n.x,n.y+n.r+14/G.k);
    }
    c.restore();
  }
  function loop(){if(G.dead)return;if(G.alpha>.01||G.drag)tick();draw();G.raf=raf(loop)}
  loop();
  const pos=e=>{const r=cv.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}};
  const toG=p=>({x:(p.x-G.tx)/G.k,y:(p.y-G.ty)/G.k});
  const hit=p=>{const g=toG(p);let b=null;for(const n of G.data.nodes){const d=Math.hypot(n.x-g.x,n.y-g.y);if(d<=n.r+5/G.k)b=n}return b};
  cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);const p=pos(e),n=hit(p);G.moved=false;G.start=p;if(n){G.drag=n;const g=toG(p);n.fx=g.x;n.fy=g.y;G.alpha=Math.max(G.alpha,.35)}else G.pan={x:p.x-G.tx,y:p.y-G.ty}});
  cv.addEventListener('pointermove',e=>{const p=pos(e);if(G.start&&Math.hypot(p.x-G.start.x,p.y-G.start.y)>3)G.moved=true;
    if(G.drag){const g=toG(p);G.drag.fx=g.x;G.drag.fy=g.y}else if(G.pan){G.tx=p.x-G.pan.x;G.ty=p.y-G.pan.y}else{const n=hit(p);G.hover=n?n.id:null;cv.style.cursor=n?'pointer':'grab'}});
  cv.addEventListener('pointerup',e=>{if(G.drag){const n=G.drag;n.fx=n.fy=null;if(!G.moved)G.select(n.id);G.drag=null}else if(G.pan){if(!G.moved)G.select(null);G.pan=null}G.start=null});
  cv.addEventListener('pointerleave',()=>{G.hover=null});
  cv.addEventListener('wheel',e=>{e.preventDefault();const p=pos(e),g=toG(p),k=clamp(G.k*Math.exp(-e.deltaY*.0012),.4,2.6);G.k=k;G.tx=p.x-g.x*k;G.ty=p.y-g.y*k},{passive:false});
  window.addEventListener('resize',()=>{if(!G.dead)resize()});
}

function renderSources(){
  const k=S.srcKind||'',c=S.srcCat||'';
  const list=DATASRC.filter(x=>(k===''||String(x.kind)===k)&&(c===''||x.cats.includes(c)));
  const card=x=>'<div class="card" style="cursor:default"><div class="ctop"><div><span class="pill">'+SRC_KINDS[x.kind]+'</span><h3 style="margin-top:8px">'+esc(x.name)+'</h3></div></div><div class="meta">'+esc(x.owner)+'</div><p class="small">'+esc(x.what)+'</p><p class="small"><b>Jak używa jej radar:</b> '+esc(x.use)+'</p><div class="tags">'+x.cats.map(t=>'<span class="pill plain">'+esc(t)+'</span>').join('')+'</div><div class="cfoot"><a class="btn sm" href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">Otwórz bazę</a><span class="t">'+(x.id==='ncbr'?'dane w radarze: rzeczywiste (NCBR)':'brak danych w radarze (tylko odnośnik)')+'</span></div></div>';
  return back()+'<div class="page" style="max-width:1100px"><h2>Źródła danych</h2><p class="muted" style="margin-bottom:16px">Bazy, z których radar korzysta przy ocenie nowości, szukaniu podobnych rozwiązań i partnerów. Są pogrupowane według rodzaju oraz tych samych kategorii, które mają innowacje (przypisanie jest orientacyjne).</p>'+
  '<div class="panel" style="margin-bottom:16px"><div class="fsel"><div><label for="src-k">Rodzaj źródła</label><select id="src-k" data-srcf="kind"><option value="">Wszystkie</option>'+SRC_KINDS.map((n,i)=>'<option value="'+i+'"'+(k===String(i)?' selected':'')+'>'+n+'</option>').join('')+'</select></div><div><label for="src-c">Kategoria</label><select id="src-c" data-srcf="cat"><option value="">Wszystkie</option>'+CATS.map(n=>'<option'+(c===n?' selected':'')+'>'+esc(n)+'</option>').join('')+'</select></div></div></div>'+
  (list.length?'<div class="grid">'+list.map(card).join('')+'</div>':'<div class="empty"><b>Brak źródeł</b>Żadna z baz nie jest przypisana do tej kategorii.</div>')+
  '<div class="alert info" style="margin-top:16px"><b>Jak to działa teraz.</b> Prototyp nie pobiera danych na żywo z tych baz. Porównanie „podobne rozwiązania” obejmuje projekty z radaru, a przy każdej innowacji dostajesz gotowe hasło do wpisania w odpowiedniej bazie. W wersji produkcyjnej: import listy projektów Interreg (plik XLSX), integracje z bazami patentowymi i naukowymi tam, gdzie udostępniają interfejs.</div></div>';
}
