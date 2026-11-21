
/* ====================== panel szczegółów ====================== */
const scoreWord=s=>s>=65?'Wysoki potencjał':s>=45?'Średni potencjał':'Niski potencjał';
function critEdit(inn,a){
  return CRIT.map(c=>{const v=inn.scores[c.k];return '<div class="crit"><div class="row between"><b>'+c.name+'</b><span class="small muted">waga '+c.w+'%</span></div><div class="row" style="flex-wrap:nowrap"><input type="range" min="1" max="5" step="1" value="'+v+'" data-slider="'+c.k+'" aria-label="'+c.name+'"><b class="num" id="v-'+c.k+'" style="min-width:20px">'+v+'</b></div><div class="small muted">Sugestia: <b>'+a.sug[c.k]+'</b> ('+c.auto+')'+(v!==a.sug[c.k]?' <button class="linkbtn" data-reset="'+c.k+'">Przywróć</button>':'')+'</div></div>'}).join('')+'<p class="hint" style="margin-top:8px">Wynik to suma ocen 1–5 ważonych według wag. Sugestie liczy system, każdą ocenę możesz zmienić.</p>';
}
function critRead(inn){
  return CRIT.map(c=>{const v=inn.scores[c.k];return '<div class="crit"><div class="row between"><b>'+c.name+'</b><span class="small muted num">'+v+'/5 · waga '+c.w+'%</span></div><div class="bar"><i style="width:'+v*20+'%"></i></div></div>'}).join('');
}
function simsTable(a){
  const rows=a.sims.slice(0,4).map(s=>'<tr><td>'+esc(s.title)+'</td><td class="small muted">'+esc(s.src)+'</td><td class="num"><span class="pill '+(s.sim>=.35?'bad':s.sim>=.2?'warn':'plain')+'">'+Math.round(s.sim*100)+'%</span></td></tr>').join('');
  return '<p class="hint" style="margin-bottom:8px">Porównanie TF-IDF z innymi projektami w radarze (źródło: rejestr NCBR)</p><div class="tablewrap"><table><thead><tr><th>Tytuł</th><th>Źródło</th><th>Podobieństwo</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}
function recBlock(a,withRoute){
  const alerts=a.rec.alerts.map(x=>'<div class="alert '+(x.lvl==='info'?'info':'dup')+'" role="note" style="margin-bottom:8px">'+esc(x.txt)+'</div>').join('');
  const sec=a.rec.secondary.map(s=>'<div style="margin-top:10px"><b>Dodatkowo: '+esc(s.title)+'</b><div class="small muted">'+esc(s.why.join(' '))+'</div></div>').join('');
  return alerts+'<div class="rec"><div style="font-weight:800;font-size:17px">'+esc(a.rec.primary.title)+'</div><ul class="why">'+a.rec.primary.why.map(w=>'<li>'+esc(w)+'</li>').join('')+'</ul>'+sec+'</div>';
}
function partnersBlock(inn,a){
  return (a.matches.length?a.matches.map(x=>{const on=inn.contacts.includes(x.p.id);return '<div class="mrow"><div style="flex:1;min-width:220px"><div class="row"><b>'+esc(x.p.name)+'</b>'+strPill(x.sc)+trustPill(x.p)+'</div><div class="small muted">'+esc(x.p.d)+'</div><div class="small" style="margin-top:4px"><b>Ocena pary:</b> '+esc(pairTrust(inn,x.p,x.sc).txt)+'</div><div class="small" style="margin-top:4px">Dlaczego: '+esc(x.why.join('; '))+'</div></div><div style="min-width:210px">'+contactBlock(x.p,false)+'<button class="btn sm '+(on?'ghost':'')+'" style="margin-top:8px" data-contact="'+x.p.id+'">'+(on?'Kontakt oznaczony':'Oznacz kontakt')+'</button></div></div>'}).join(''):'<p class="muted">Brak dopasowań powyżej 30%. Uzupełnij tagi i typ innowacji.</p>')+'<p class="hint" style="margin-top:10px">Siła = 40% wspólne obszary, 20% typ, 20% etap, 20% ocena. <button class="linkbtn" data-go="mapinv">Zobacz inwestorów na mapie</button></p>';
}
function reqBlock(inn){
  return (inn.interests.length?inn.interests.map(q=>'<div class="mrow"><div style="flex:1;min-width:220px"><div class="row"><b>'+esc(q.investor)+'</b><span class="pill '+stClass(q.status)+'">'+q.status+'</span></div><div style="margin-top:4px">'+esc(q.msg)+'</div><div class="small muted">'+q.t+'</div></div><div style="min-width:210px">'+(q.contact?contactBlock(Object.assign({city:''},q.contact),false):'')+(q.status==='oczekuje'?'<div class="row" style="margin-top:8px"><button class="btn sm" data-intact="ok:'+q.id+'">Akceptuj</button><button class="btn ghost sm" data-intact="no:'+q.id+'">Odrzuć</button></div>':'')+'</div></div>').join(''):'<p class="muted">Na razie brak zapytań.</p>')+'<p class="hint" style="margin-top:10px">Inwestorzy widzą tytuł, opis, ocenę i rekomendację. Pełne dane twórców odblokowują się po Twojej akceptacji.</p>';
}
function cardText(inn,a){
  const l=a.lab;
  return ['KARTA INNOWACJI: '+inn.title,'Instytucja: '+inn.institution+' ('+l.iss+'), '+l.city,'Kontakt: '+(inn.creators||'-')+', '+(inn.contact||'-')+', '+(inn.phone||'-'),'Dziedzina: '+l.dz+' | Temat: '+l.topic+' | Wdrożenie: '+l.dep,'Typ: '+inn.type+' | Etap: '+STAGES[inn.stage]+' | Status: '+STATUS[inn.status],'Tagi: '+(inn.tags||[]).join(', '),'Problem: '+inn.problem,'Rozwiązanie: '+inn.description,'','OCENA: '+a.score+'/100 (kompletność '+a.comp+'%)'].concat(CRIT.map(c=>'- '+c.name+' ('+c.w+'%): '+inn.scores[c.k]+'/5')).concat(['','REKOMENDACJA: '+a.rec.primary.title].concat(a.rec.primary.why.map(w=>'- '+w))).concat(['','Najbliższe podobne: '+(a.sims[0]?a.sims[0].title+' ('+Math.round(a.sims[0].sim*100)+'%)':'brak'),'Dopasowania: '+a.matches.map(m=>m.p.name+' '+m.sc+'%').join('; ')]).join('\n');
}
const dHead=(pills,title,meta)=>'<div class="dhead"><div style="min-width:0"><div class="tags">'+pills+'</div><h2>'+esc(title)+'</h2><div class="meta">'+meta+'</div></div><button class="x" data-act="closed" aria-label="Zamknij panel">×</button></div>';
function drawerInst(inn){
  const a=analyze(inn),l=a.lab,pend=inn.interests.filter(x=>x.status==='oczekuje').length;
  const labels=[['Dziedzina',l.dz],['Temat',l.topic],['Miasto',l.city],['Kto wstawił',l.iss],['Możliwość wdrożenia',l.dep]].map(x=>'<div class="lab"><div class="k">'+x[0]+'</div><div class="v">'+esc(x[1])+'</div></div>').join('');
  const labelsH='<div class="labels">'+labels+'</div><div class="tags" style="margin-top:10px">'+(inn.tags||[]).map(t=>'<span class="pill plain">'+esc(t)+'</span>').join('')+'</div><div class="row" style="margin-top:12px"><button class="btn ghost sm" data-act="ai">Nadaj etykiety AI ponownie</button></div>';
  const ocena='<div class="row" style="margin-bottom:12px"><span class="pill '+lvl(a.score)+'">'+scoreWord(a.score)+'</span><span class="small muted">Kompletność opisu: '+a.comp+'%</span></div>'+critEdit(inn,a);
  const sciezka=recBlock(a)+'<div class="row" style="margin:12px 0 18px"><button class="btn" data-act="route">Skieruj zgodnie z rekomendacją</button><span class="hint">Ustawia status „Skierowana”.</span></div><h4 style="margin-bottom:6px">Podobne rozwiązania</h4>'+simsTable(a);
  const hist='<ul class="why">'+inn.log.slice(0,8).map(x=>'<li><span class="muted num">'+x.t+'</span> '+esc(x.x)+'</li>').join('')+'</ul><div class="row" style="margin-top:10px"><button class="btn ghost sm" data-act="card">'+(S.showCard?'Ukryj kartę tekstową':'Pokaż kartę tekstową')+'</button></div>'+(S.showCard?'<pre class="card-txt" style="margin-top:10px">'+esc(cardText(inn,a))+'</pre>':'');
  const body='<div class="dbody"><div class="dsum">'+ring(a.score,56,lvl(a.score))+'<div class="grow"><div class="mini">Ocena potencjału</div><b>'+scoreWord(a.score)+'</b><div class="small muted">kompletność opisu '+a.comp+'%</div></div><div><label class="mini" for="statussel" style="margin:0 0 4px">Status</label><select id="statussel" data-statussel="1">'+opts(STATUS,inn.status)+'</select></div></div>'+
   factsBlock(inn)+locBlock(inn)+'<div style="margin:10px 0">'+trustBlock(inn)+explainBlock(inn)+'</div><p><b>Problem.</b> '+esc(inn.problem)+'</p>'+
   '<h4 style="margin:16px 0 6px">Kontakt do twórców</h4>'+contactBlock(innContact(inn,l),false)+'<div style="height:14px"></div>'+
   acc('lab','Etykiety nadane automatycznie','<span class="pill '+(l.src==='AI'?'ai':'plain')+'">'+(l.src==='AI'?'AI':'reguły')+'</span>',labelsH)+
   acc('ocena','Ocena potencjału','<span class="pill '+lvl(a.score)+'">'+a.score+'/100</span>',ocena)+
   acc('sciezka','Rekomendacja i podobne rozwiązania','',sciezka)+
   acc('partn','Partnerzy i inwestorzy','<span class="pill plain">'+a.matches.length+'</span>',partnersBlock(inn,a))+
   acc('zap','Zapytania inwestorów',pend?'<span class="pill ask">'+pend+' nowe</span>':'<span class="pill plain">'+inn.interests.length+'</span>',reqBlock(inn))+
   acc('zrodla','Sprawdź w bazach źródłowych','<span class="pill plain">'+sourcesFor(inn).length+'</span>',srcBlock(inn))+
   acc('hist','Historia i karta tekstowa','',hist)+'</div>';
  const del=S.delAsk?'<span class="small">Usunąć trwale?</span><button class="btn sm" style="background:var(--rose)" data-act="delok">Usuń</button><button class="btn ghost sm" data-act="delno">Anuluj</button>':'<button class="btn ghost sm" data-act="del"'+(S.items.length<2?' disabled':'')+'>Usuń</button>';
  const foot='<div class="dfoot"><label class="sw"><input type="checkbox" data-pub="1"'+(inn.public?' checked':'')+'><span class="swt"></span>Widoczna dla inwestorów</label><div class="row">'+del+'</div></div>';
  return dHead('<span class="pill">'+esc(l.dz)+'</span><span class="pill plain">'+STAGES[inn.stage]+'</span><span class="pill plain">'+esc(l.dep)+'</span>'+(inn.public?'':'<span class="pill plain">ukryta</span>'),inn.title,esc(inn.institution)+' · '+esc(l.city))+body+foot;
}
function drawerOffer(inn){
  const a=analyze(inn),l=a.lab,m=matchScore(inn,meProf(),a.score),q=myInterest(inn),ok=q&&q.status==='zaakceptowane';
  const dup=a.sims[0]&&a.sims[0].sim>=.35;
  const invU=S.role==='inv'&&!!S.acct;const body='<div class="dbody"><div class="dsum">'+(invU?'<div style="text-align:center">'+ring(m.sc,56,fitCls(m.sc))+'</div><div class="grow"><div class="mini">Dopasowanie do Twojego profilu</div><b>'+strengthOf(m.sc)+' powiązanie</b><div class="small muted">'+esc(m.why.join('; '))+'</div></div>':'<div class="grow"><div class="mini">Ocena potencjału</div><b>'+scoreWord(a.score)+'</b></div>')+'<div style="text-align:center">'+ring(a.score,56,lvl(a.score))+'<div class="hint">ocena</div></div></div>'+
   (dup?'<div class="alert dup" style="margin-bottom:12px">Ryzyko dublowania: podobne rozwiązanie „'+esc(a.sims[0].title)+'” ('+esc(a.sims[0].src)+', '+Math.round(a.sims[0].sim*100)+'%).</div>':'')+
   factsBlock(inn)+locBlock(inn)+'<div style="margin:10px 0">'+trustBlock(inn)+explainBlock(inn)+'</div><p><b>Problem.</b> '+esc(inn.problem)+'</p><p class="small" style="margin-top:10px"><b>Rekomendowana ścieżka:</b> '+esc(a.rec.primary.title)+'</p>'+
   '<h4 style="margin:16px 0 6px">Kontakt do twórców</h4>'+contactBlock(innContact(inn,l),!ok&&!inn.contactPublic&&inn.registry!=='NCBR')+((ok||inn.contactPublic||inn.registry==='NCBR')?'':'<p class="hint" style="margin-top:6px">Pełne dane po akceptacji zapytania przez instytucję.</p>')+'<div style="height:14px"></div>'+
   acc('ocena','Szczegóły oceny','<span class="pill '+lvl(a.score)+'">'+a.score+'/100</span>',critRead(inn))+
   acc('podobne','Podobne rozwiązania','',simsTable(a))+'</div>';
  const form=S.openInt===inn.id?'<div style="width:100%"><label for="int-msg">Wiadomość do instytucji</label><textarea id="int-msg">Jesteśmy zainteresowani rozmową o dalszym rozwoju i wdrożeniu tego rozwiązania.</textarea><div class="row" style="margin-top:10px"><button class="btn" data-sendint="'+inn.id+'">Wyślij zapytanie</button><button class="btn ghost" data-int="'+inn.id+'">Anuluj</button></div><p class="hint" style="margin-top:6px">Instytucja zobaczy nazwę i dane kontaktowe Twojego profilu oraz wiadomość.</p></div>':
    (q?'<span class="pill '+stClass(q.status)+'">Zapytanie: '+q.status+'</span>':'<button class="btn" data-int="'+inn.id+'">Zgłoś zainteresowanie</button>');
  return dHead('<span class="pill">'+esc(l.dz)+'</span><span class="pill plain">'+esc(inn.type)+'</span><span class="pill plain">'+STAGES[inn.stage]+'</span>',inn.title,esc(inn.institution)+' · '+esc(l.iss)+' · '+esc(l.city))+body+'<div class="dfoot">'+(!S.acct?'<span class="small muted">Aby się skontaktować, zaloguj się (możesz użyć konta demo).</span><button class="btn sm" data-act="acct">Zaloguj się</button>':invU?form:'')+'</div>';
}
function drawerInv(p){
  const dzs=domainsOf(p.tags),a=null;
  const rows=vis().map(i=>{const an=analyze(i);return {i,sc:matchScore(i,{tags:p.tags,types:p.types,st:p.st},an.score).sc}}).filter(x=>x.sc>=30).sort((x,y)=>y.sc-x.sc);
  const list=rows.length?rows.map(x=>'<button class="ddi" data-open="inn:'+x.i.id+'"><span>'+esc(x.i.title)+'</span>'+strPill(x.sc)+'</button>').join(''):'<p class="muted">Brak innowacji dopasowanych powyżej 30%.</p>';
  const body='<div class="dbody"><div class="tags" style="margin-bottom:12px">'+pillsOf(p.cats)+'</div><div class="rec" style="margin-bottom:12px"><div class="mini">Korzyści dla innowatora</div><div>'+esc(p.benefit||'Brak opisu korzyści.')+'</div></div><p>'+esc(p.d)+'</p><p class="small" style="margin-top:10px"><b>Obszary:</b> '+esc(p.tags.join(', '))+'<br><b>Przyjmuje:</b> '+esc(p.types.join(', '))+' · etapy: '+STAGES[p.st[0]]+' do '+STAGES[p.st[1]]+'</p>'+locBlock(p)+'<div style="margin:10px 0">'+trustBlock(p)+'</div><h4 style="margin:16px 0 6px">Kontakt</h4>'+contactBlock(Object.assign({},p,{pub:p.contactPublic?p.contactSrc:'',person:p.person||(p.contactPublic?'Biuro / punkt informacyjny – '+p.name:'')}),!S.acct&&!p.contactPublic)+'<div style="height:14px"></div>'+acc('dop','Dopasowane innowacje','<span class="pill plain">'+rows.length+'</span>',list)+'</div>';
  const foot=p.id==='me'?'<div class="dfoot"><span class="small muted">To Twój profil inwestora.</span><button class="btn sm" data-page="profil">Edytuj profil</button></div>':'';
  return dHead('<span class="pill'+(p.id==='me'?' good':'')+'">'+(p.id==='me'?'Twój profil':esc(p.kind))+'</span>'+dzs.map(d=>'<span class="pill plain">'+esc(d)+'</span>').join(''),p.name,esc(p.city)+' · '+esc(p.person))+body+foot;
}
function renderDrawer(){
  const d=S.drawer;if(!d)return '';
  let inner='';
  if(d.k==='inn'){const inn=S.items.find(x=>x.id===d.id);if(!inn){S.drawer=null;return ''}inner=(S.acct&&S.role==='inst'&&inn.owner===S.acct.email)?drawerInst(inn):drawerOffer(inn)}
  else{const p=allInvestors().find(x=>x.id===d.id);if(!p){S.drawer=null;return ''}inner=drawerInv(p)}
  return '<div class="scrim'+(S._on?' open':'')+'" data-act="closed"></div><aside class="drawer'+(S._on?' open':'')+'" role="dialog" aria-modal="true" aria-label="Szczegóły">'+inner+'</aside>';
}
function openD(k,id){
  S.drawer={k,id};if(k==='inn'){S.sel=id}
  const inn=k==='inn'?S.items.find(x=>x.id===id):null;
  S.sec=(inn&&S.role==='inst'&&inn.interests.some(x=>x.status==='oczekuje'))?{zap:1}:{};
  S.openInt=null;S.delAsk=false;S.showCard=false;S.dd=null;S._on=false;
  renderLayer(true);renderTop();
  raf(()=>raf(()=>{S._on=true;const L=$('layer'),dr=L.querySelector('.drawer'),sc=L.querySelector('.scrim');if(dr)dr.classList.add('open');if(sc)sc.classList.add('open');const x=dr&&dr.querySelector('.x');if(x&&x.focus)x.focus()}));
}
function closeD(){
  if(!S.drawer)return;
  const L=$('layer'),dr=L.querySelector('.drawer'),sc=L.querySelector('.scrim');
  S._on=false;if(dr)dr.classList.remove('open');if(sc)sc.classList.remove('open');
  setTimeout(()=>{if(!S._on){S.drawer=null;renderLayer(true)}},260);
}

/* ====================== okno dodawania ====================== */
function renderModal(){
  if(!S.modal)return '';
  if(S.modal==='acct')return renderAcctModal();
  if(S.modal==='offer')return renderOfferModal();
  const modes=[['form','Formularz'],['paste','Wklej opis'],['scan','Wykryte automatycznie']];
  const seg='<div class="seg" role="group" aria-label="Sposób dodania" style="margin:14px 0 18px">'+modes.map(m=>'<button data-addmode="'+m[0]+'" aria-pressed="'+(S.addMode===m[0])+'">'+m[1]+'</button>').join('')+'</div>';
  let body='';
  if(S.addMode==='paste'){
    body='<div class="stack"><p class="muted">Wklej opis ze strony szkoły, BIP, streszczenie publikacji lub ogłoszenie. System wykryje typ, etap, tagi, miasto i instytucję, a Ty tylko potwierdzisz.</p><div><label for="scan-txt">Tekst</label><textarea id="scan-txt" placeholder="Wklej opis rozwiązania...">'+esc(S.txt)+'</textarea></div><div class="row"><button class="btn" data-act="scan">Wykryj innowację</button></div></div>';
  }else if(S.addMode==='scan'){
    const cand=S.items.filter(i=>(i.registry||i.detected)&&i.status<3).map(i=>({i,a:analyze(i)})).sort((x,y)=>y.a.score-x.a.score).slice(0,10);
    body='<div class="stack"><p class="muted small">Radar automatycznie przegląda rejestr NCBR i wskazuje zakończone projekty o najwyższym potencjale, które nie trafiły jeszcze do inwestora. Ocena wynika z pięciu kryteriów. Wykrywanie z innych baz (UPRP, PBN, Interreg) wymaga dostępu do ich interfejsów lub plików.</p>'+cand.map(x=>'<div class="mrow" style="display:block"><div class="row between"><div class="row"><span class="pill">'+esc(x.i.source)+'</span><span class="pill '+lvl(x.a.score)+'">potencjał '+x.a.score+'/100</span></div><button class="btn sm" data-open="inn:'+x.i.id+'">Otwórz</button></div><p style="margin:8px 0 0" class="small"><b>'+esc(x.i.title)+'</b><br>'+esc(x.i.institution)+' · '+esc(x.i.loc?x.i.loc.woj:'')+'</p></div>').join('')+'</div>';
  }else{
    const d=S.draft||{},v=k=>esc(d[k]==null?'':d[k]);
    body='<form id="f"><div class="form-grid">'+
    '<div class="full"><label for="f-title">Tytuł</label><input type="text" id="f-title" required value="'+v('title')+'"></div>'+
    '<div class="full"><label for="f-problem">Problem, który rozwiązuje</label><textarea id="f-problem" required>'+v('problem')+'</textarea></div>'+
    '<div class="full"><label for="f-desc">Opis rozwiązania i sposobu działania</label><textarea id="f-desc" required>'+v('description')+'</textarea></div>'+
    '<div><label for="f-rodzaj">Rodzaj</label><select id="f-rodzaj" required>'+optsReq(RODZAJE,d.rodzaj==null?-1:d.rodzaj,'Wybierz rodzaj')+'</select></div>'+
    '<div><label for="f-stage">Etap rozwoju</label><select id="f-stage" required>'+optsReq(STAGES,d.stage==null?-1:d.stage,'Wybierz etap')+'</select></div>'+
    '<div><label for="f-novel">Nowość</label><select id="f-novel" required>'+optsReq(NOVEL,d.novelty==null?-1:d.novelty,'Wybierz')+'</select></div>'+
    '<div><label for="f-scope">Skala wpływu</label><select id="f-scope" required>'+optsReq(SCOPE,d.scope==null?-1:d.scope,'Wybierz skalę')+'</select></div>'+
    '<div class="full"><label>Kategorie (od 1 do 3)</label>'+catChips(d.cats||catsFromTags(d.tags).slice(0,3))+'</div>'+
    '<div class="full"><label for="f-origin">Gdzie powstała innowacja?</label><select id="f-origin" required>'+optsReq(ORIGINS,d.origin==null?-1:d.origin,'Wybierz: szkoła, uczelnia, firma...')+'</select></div>'+
    '<div class="full"><label for="f-benefit">Korzyści dla inwestora</label><textarea id="f-benefit" required placeholder="Co zyska inwestor lub partner: zwrot, licencja, dostęp do rynku, efekt społeczny...">'+v('benefit')+'</textarea></div>'+
    '<div class="full"><label for="f-inst">Instytucja</label><input type="text" id="f-inst" required value="'+v('institution')+'"></div>'+
    '<div><label for="f-cr">Osoba kontaktowa</label><input type="text" id="f-cr" required value="'+v('creators')+'"></div>'+
    '<div><label for="f-ct">E-mail</label><input type="email" id="f-ct" required value="'+v('contact')+'"></div>'+
    '<div><label for="f-ph">Telefon</label><input type="tel" id="f-ph" required value="'+v('phone')+'"></div>'+
    '</div><h4 style="margin:16px 0 8px">Lokalizacja</h4><div class="form-grid">'+locFields('f',d)+'</div><details class="dt" style="margin-top:14px"><summary>Więcej szczegółów (opcjonalne, resztę uzupełni system)</summary><div class="dtb"><div class="form-grid">'+
    '<div><label for="f-type">Typ innowacji</label><select id="f-type"><option value="auto">Wykryj automatycznie</option>'+optsS(TYPES,d.type)+'</select></div>'+
    '<div class="full"><label for="f-tags">Tagi (po przecinku, puste = nadam automatycznie)</label><input type="text" id="f-tags" value="'+esc((d.tags||[]).join(', '))+'"></div>'+
    '<div><label for="f-itype">Rodzaj instytucji</label><select id="f-itype"><option value="-1">Wykryj automatycznie</option>'+opts(INST,d.instType==null?-2:d.instType)+'</select></div>'+
    '<div><label for="f-infra">Wymagana infrastruktura</label><select id="f-infra">'+opts(INFRA,d.infra==null?2:d.infra)+'</select></div>'+
    '<div><label for="f-team">Zespół</label><select id="f-team">'+opts(TEAM,d.team==null?1:d.team)+'</select></div>'+
    '<div><label for="f-ip">Ochrona własności</label><select id="f-ip">'+opts(IPL,d.ip||0)+'</select></div>'+
    '<div class="full"><label class="sw"><input type="checkbox" id="f-docs"'+(d.hasDocs?' checked':'')+'><span class="swt"></span>Istnieje dokumentacja umożliwiająca powtórzenie rozwiązania</label></div>'+
    '</div></div></details>'+
    '<div class="full" style="margin-top:12px"><label class="sw" style="align-items:flex-start"><input type="checkbox" id="f-consent" required><span class="swt" style="margin-top:2px"></span><span style="font-weight:600;font-size:13.5px">Twórcy wyrazili zgodę na przetwarzanie danych kontaktowych w celu łączenia z partnerami (RODO).</span></label></div>'+
    '<div class="row" style="margin-top:18px"><button class="btn" type="submit">Dodaj do radaru</button><button type="button" class="btn ghost" data-act="closem">Anuluj</button><span class="hint">AI nada etykiety: dziedzinę, temat, miasto i wystawcę.</span></div></form>';
  }
  return '<div class="scrim mscrim" data-act="closem"></div><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt"><div class="row between" style="flex-wrap:nowrap"><h2 id="mt">Dodaj innowację</h2><button class="x" data-act="closem" aria-label="Zamknij">×</button></div>'+seg+body+'</div>';
}
function renderLayer(reset){
  const L=$('layer');if(!L)return;
  const old=L.querySelector('.dbody'),st=old&&!reset?old.scrollTop:0;
  L.innerHTML=renderDrawer()+renderModal();
  const nb=L.querySelector('.dbody');if(nb&&st)nb.scrollTop=st;
}

/* ====================== render główny ====================== */
function renderSubEl(){const e=$('sub');if(!e)return;e.innerHTML=(S.role&&!S.page)?renderSub():'';if($('res')||true){const c=$('cnt');if(c&&$('res')){c.innerHTML=resultsHTML().cnt}}}
function refreshChrome(){renderTop();renderSubEl()}
function render(){
  stopGraph();renderTop();renderSubEl();
  const v=$('view');
  if(S.page){v.innerHTML=PAGEX[S.page]?PAGEX[S.page]():S.page==='zrodla'?renderSources():S.page==='profil'?renderProfile():S.page==='moje'?renderMine():S.page==='miary'?renderMetrics():renderAbout()}
  else if(!S.role)v.innerHTML=renderHome();
  else if(S.view==='mapinn'||S.view==='mapinv'){v.innerHTML=renderGeo(S.view==='mapinn'?'inn':'inv');initGeo()}
  else{v.innerHTML='<div id="res"></div>';updateRes();renderSubEl()}
  renderLayer();
}
function go(view,page){
  if(view)S.view=view;S.page=page||null;S.dd=null;S.sbOpen=false;S.drawer=null;S.modal=null;S._on=false;
  if(S.role==='inv'&&S.view==='invs')S.view='inn';
  render();try{window.scrollTo(0,0)}catch(e){}
}
function after(){ // po zmianie danych bez przebudowy całej strony
  if($('res'))updateRes();else if(GR)GR.rebuild();else if((S.view==='mapinn'||S.view==='mapinv')&&!S.page&&S.role)geoRefresh();
  refreshChrome();renderLayer();
}
function softRefresh(){
  AC.clear();if(S.modal||!S.role&&!S.page)return;
  const a=document.activeElement;
  if(a&&a.id==='q'){updateRes();renderSubEl();renderLayer();return}
  after();
}
function addItem(o,src){o.loc=readLoc('f');if(o.loc)o.city=o.loc.miejsc||o.city;
  const txt=[o.title,o.problem,o.description].join(' '),ex=extract(txt);
  if(o.type==='auto'||!o.type)o.type=ex.type;
  if(!(o.tags||[]).length)o.tags=ex.tags;
  if(o.instType<0&&!o.institution)o.instType=3;
  const inn=mk(Object.assign({},o,{source:src}));
  S.items.unshift(inn);const sims=buildSim(inn,S.items);inn.scores=suggest(inn,sims);
  inn.owner=S.acct?S.acct.email:'';inn.tags=[...new Set((inn.tags||[]).concat(tagsFromCats(inn.cats)))];S.sel=inn.id;save();S.modal=null;S.draft=null;S.showCard=false;clearFilters();S.view='inn';S.page=null;
  render();openD('inn',inn.id);
  toast('Dodano. AI nadaje etykiety...');aiLabel(inn,true);
}

function srcBlock(inn){
  const ph=searchPhrase(inn);
  return '<p class="small muted" style="margin-bottom:10px">Bazy pasujące do kategorii tej innowacji. Przycisk kopiuje hasło wyszukiwania i otwiera bazę w nowej karcie.</p><div class="row" style="margin-bottom:12px"><label for="phr" class="small" style="margin:0">Hasło:</label><input type="text" id="phr" readonly value="'+esc(ph)+'" style="max-width:340px"></div>'+
  sourcesFor(inn).map(x=>'<div class="mrow"><div style="flex:1;min-width:200px"><div class="row"><b>'+esc(x.name)+'</b><span class="pill plain">'+SRC_KINDS[x.kind]+'</span></div><div class="small muted">'+esc(x.use)+'</div></div><a class="btn ghost sm" href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer" data-copy="'+esc(ph)+'">Kopiuj i otwórz</a></div>').join('')+'<p class="hint" style="margin-top:8px"><button class="linkbtn" data-page="zrodla">Wszystkie źródła danych</button></p>';
}
document.addEventListener('click',e=>{const a=e.target.closest('[data-copy]');if(!a)return;try{navigator.clipboard&&navigator.clipboard.writeText(a.dataset.copy).then(()=>toast('Skopiowano hasło: '+a.dataset.copy),()=>{})}catch(_){}});
