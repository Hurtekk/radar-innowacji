/* ====================== przejrzystość oceny, import/eksport, prywatność, skalowanie ====================== */
function explainBlock(inn){
  const a=analyze(inn),sc=inn.scores||a.scores;if(!sc)return '';
  const inputs=[['Etap rozwoju',STAGES[inn.stage]],['Wdrożenie w praktyce',inn.wdr>0?inn.wdr+'/5 (ocena na podstawie źródła)':'brak oceny, szacunek z etapu rozwoju'],['Zasięg problemu',scopeOf(inn)===null?'brak danych':scopeOf(inn)+'/5'],['Wymagana infrastruktura',INFRA[inn.infra]],['Dokumentacja',inn.hasDocs?'tak':'nie'],['Zespół',TEAM[inn.team]],['Ochrona własności',IPL[inn.ip]]];
  const pts=CRIT.map(c=>({c,v:sc[c.k]||1,p:c.w*(sc[c.k]||1)/5}));
  const rows=pts.map(x=>'<tr><td>'+metLink(x.c.k,x.c.name)+'</td><td class="num">'+x.v+'/5</td><td class="num">'+x.c.w+'%</td><td class="num">'+x.p.toFixed(1)+'</td><td class="small muted">'+esc(criterionWhy(inn,x.c.k,a))+'</td></tr>').join('');
  const up=pts.filter(x=>x.v<5).sort((p,q)=>q.c.w-p.c.w).slice(0,2).map(x=>'<li>'+x.c.name+': każdy punkt więcej w skali 1–5 dodaje '+(x.c.w/5).toFixed(0)+' pkt do oceny.</li>').join('');
  const src='Algorytm przelicza oceny autorów i dane przypisane do źródeł. Etap wynika z TRL lub dowodów użycia usługi. Budżet jest tylko przybliżeniem zasięgu; braki danych i ograniczenia wskazano na karcie.';
  const body='<p class="small">'+src+'</p><div class="tablewrap"><table><thead><tr><th>Kryterium</th><th>Wartość</th><th>Waga</th><th>Punkty</th><th>Skąd wartość</th></tr></thead><tbody>'+rows+'<tr><td><b>Suma</b></td><td></td><td class="num">100%</td><td class="num"><b>'+totalScore(sc)+'</b></td><td class="small muted">suma wag × wartość / 5</td></tr></tbody></table></div>'+
   '<p class="small" style="margin-top:10px"><b>Dane wejściowe:</b> '+inputs.map(x=>esc(x[0])+': '+esc(x[1])).join(' · ')+'</p>'+
   '<p class="small"><b>Progi:</b> od 65 wysoki potencjał, 45–64 średni, poniżej 45 niski. <b>Co poprawiłoby wynik:</b></p><ul class="why">'+up+'</ul>'+
   '<p class="small"><b>Rekomendowana ścieżka</b> zależy od kompletności opisu (próg 60%), oceny (próg 45), etapu, typu innowacji, ochrony własności i podobieństwa do innych rozwiązań (ostrzeżenie od 35%). Reguły są jawne i opisane na stronie „Metodologia oceny”.</p>';
  return acc('jak','Jak to policzono','<span class="pill plain">'+totalScore(sc)+'/100</span>',body);
}

const PAGEX={};
const pg=(t,b)=>back()+'<div class="page stack"><h2>'+t+'</h2>'+b+'</div>';
const panel=(t,b)=>'<div class="panel stack"><h3>'+t+'</h3>'+b+'</div>';
PAGEX.metod=()=>pg('Metodologia oceny',
 panel('Pięć kryteriów i ich wagi','<div class="tablewrap"><table><thead><tr><th>Kryterium</th><th>Waga</th><th>Skala 1–5</th></tr></thead><tbody>'+CRIT.map(c=>'<tr><td><b>'+c.name+'</b><div class="small muted">wartość automatycznie '+c.auto+'</div></td><td class="num">'+c.w+'%</td><td class="small">'+c.r.join('<br>')+'</td></tr>').join('')+'</tbody></table></div><p class="small">Ocena = suma (waga × wartość / 5), w skali 0–100. Każdą wartość można poprawić ręcznie w karcie innowacji.</p>')+
 panel('Dopasowanie innowacji do inwestora','<p>Siła powiązania = 40% wspólne obszary tematyczne + 20% zgodność typu innowacji + 20% zgodność etapu + 20% ocena potencjału. Progi: od 70% silne, 50–69% średnie, 30–49% słabe.</p>')+
 panel('Rekomendacja ścieżki','<ol class="why"><li>Podobieństwo tekstu od 35%: porównać rozwiązania i sprawdzić możliwość współpracy.</li><li>Koncepcja lub prototyp: test prototypu. Testy lub brak dowodów użycia: pilotaż.</li><li>Rozwiązanie używane: technologia z oceną od 55 może przygotować komercjalizację; inne typy — transfer. Pozostałe technologie wymagają potwierdzenia efektów. Braki danych oznaczają wstępną rekomendację.</li></ol><p class="small">To reguły, nie model uczący się. Każda rekomendacja w karcie ma uzasadnienie.</p>')+
 panel('Podobieństwo i ryzyko dublowania','<p>Porównanie TF-IDF tytułów i opisów na skróconych rdzeniach słów. Od 20% pokazujemy informację, od 35% ostrzeżenie o możliwym dublowaniu. Metoda nie rozumie synonimów, dlatego przy każdej innowacji są odnośniki do baz patentowych i naukowych.</p>')+
 panel('Poziomy zaufania','<ol start="0" class="why">'+TRUSTN.map(t=>'<li>'+t+'</li>').join('')+'</ol><p class="small">Sprawdzenia wiarygodności: tożsamość podmiotu, zgodność z zewnętrznymi źródłami, dowody, poziom, jakość treści i ochrona przed nadużyciami.</p>')+
 panel('Ograniczenia','<ul class="why"><li>Część danych wejściowych dla projektów z NCBR jest oszacowana, co oznaczono w „Jak to policzono”.</li><li>Ocena wspiera decyzję człowieka i jej nie zastępuje.</li></ul>'));

/* --- CSV --- */
function csvParse(t){
  const del=(t.split('\n')[0].match(/;/g)||[]).length>(t.split('\n')[0].match(/,/g)||[]).length?';':',';
  const rows=[];let r=[],f='',q=false;
  for(let i=0;i<t.length;i++){const c=t[i];
    if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
    else if(c==='"')q=true;else if(c===del){r.push(f);f=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;r.push(f);f='';if(r.some(x=>x.trim()))rows.push(r);r=[]}else f+=c}
  r.push(f);if(r.some(x=>x.trim()))rows.push(r);return rows;
}
const csvQ=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
const CSV_HEAD=['tytul','opis','problem','instytucja','miejscowosc','wojewodztwo','powiat','gmina','etap','typ','kategorie','link'];
function exportRows(){return vis().map(i=>{const l=locOf(i)||{};return [i.title,i.description,i.problem,i.institution,l.miejsc||i.city,l.woj,l.powiat,l.gmina,STAGES[i.stage],i.type,(i.cats||[]).join('|'),i.url||''].map(csvQ).join(';')})}
function importCsv(text){
  if(!S.acct){S.modal='acct';S.acctMode='login';renderLayer(true);return toast('Import wymaga logowania.')}
  const rows=csvParse(text);if(rows.length<2)return toast('Plik jest pusty lub ma niepoprawny format.');
  const h=rows[0].map(x=>norm(x.trim()));const col=n=>h.indexOf(n);
  let ok=0,bad=0;
  rows.slice(1).forEach(r=>{
    const g=n=>{const i=col(n);return i>=0?(r[i]||'').trim():''};
    const title=g('tytul');if(title.length<5||!g('wojewodztwo')&&!PLACES[g('miejscowosc')]){bad++;return}
    const si=STAGES.findIndex(s=>norm(s)===norm(g('etap')));const st=si>=0?si:Math.min(4,Math.max(0,parseInt(g('etap'))||1));
    const cats=g('kategorie').split('|').map(x=>x.trim()).filter(x=>CATS.includes(x)).slice(0,3);
    const loc=mkLoc(g('miejscowosc'),g('wojewodztwo')||(PLACES[g('miejscowosc')]||[])[0],title);if(!loc){bad++;return}
    if(g('powiat'))loc.powiat=g('powiat');if(g('gmina'))loc.gmina=g('gmina');
    const o=enrich(mk({title,description:g('opis'),problem:g('problem'),institution:g('instytucja')||S.acct.name,instType:S.acct.kind<5?S.acct.kind:3,city:loc.miejsc,loc,stage:st,type:TYPES.includes(g('typ'))?g('typ'):'technologiczna',cats,url:g('link'),contact:S.acct.email,phone:S.acct.phone,creators:S.acct.person,owner:S.acct.email,source:'Import CSV',hasDocs:!!g('link')}));
    if(!o.cats.length)o.cats=catsFromTags(extract(title+' '+o.description).tags).slice(0,3);
    o.tags=tagsFromCats(o.cats);o.scores=suggest(o,buildSim(o,S.items));S.items.unshift(o);ok++;
  });
  save();AC.clear();TCACHE.clear();render();toast('Zaimportowano: '+ok+(bad?', pominięto błędnych wierszy: '+bad:'')+'.');
}
document.addEventListener('change',e=>{
  if(e.target.id!=='imp-file')return;const f=e.target.files&&e.target.files[0];if(!f)return;
  const r=new FileReader();r.onload=()=>{S.page='integr';importCsv(String(r.result))};r.readAsText(f,'utf-8');
});
PAGEX.integr=()=>pg('Integracje, import i eksport',
 panel('Stan integracji ze źródłami','<div class="tablewrap"><table><thead><tr><th>System</th><th>Dziś w aplikacji</th><th>Docelowo</th></tr></thead><tbody>'+
 [['NCBR – baza sukcesów','dane rzeczywiste (jednorazowy import 76 projektów)','cykliczny import i odnośniki do stron projektów'],['Interreg – lista projektów','odnośnik do źródła','import pliku XLSX (obsługa CSV jest już dostępna)'],['UPRP, EPO','odnośniki do wyszukiwarek','sprawdzanie numerów zgłoszeń przez interfejsy lub zapytania ręczne'],['PBN, PPM, BazTech, dLibra','odnośniki do baz','weryfikacja autorstwa i stanu wiedzy'],['KRS, REGON, POL-on','odnośniki w sprawdzeniu tożsamości','automatyczna weryfikacja podmiotu'],['Logowanie instytucji (SSO)','konto lokalne w przeglądarce','logowanie przez konto organizacji']].map(x=>'<tr><td><b>'+x[0]+'</b></td><td>'+x[1]+'</td><td>'+x[2]+'</td></tr>').join('')+'</tbody></table></div>')+
 panel('Import z pliku CSV','<p class="small">Kolumny (średnik lub przecinek): <code>'+CSV_HEAD.join(', ')+'</code>. Kategorie oddziel znakiem |. Wymagane: tytuł oraz województwo lub znana miejscowość. Import dostępny po zalogowaniu.</p><div class="row"><input type="file" id="imp-file" accept=".csv,text/csv"><button class="btn ghost sm" data-act="tplcsv">Pokaż szablon</button></div>')+
 panel('Eksport','<p class="small">Eksport widocznych innowacji. Przeglądarka blokuje pobieranie plików w tym widoku, dlatego dane trafiają do pola poniżej i do schowka.</p><div class="row"><button class="btn sm" data-act="expcsv">Eksport CSV</button><button class="btn ghost sm" data-act="expjson">Eksport JSON</button></div><textarea id="exp-out" readonly rows="8" style="width:100%;margin-top:8px;font-family:monospace;font-size:12px" placeholder="Tu pojawią się dane do skopiowania"></textarea>'));
PAGEX.priv=()=>pg('Prywatność i ochrona danych',
 panel('Jakie dane przetwarzamy','<div class="tablewrap"><table><thead><tr><th>Dane</th><th>Cel</th><th>Kto widzi</th></tr></thead><tbody><tr><td>Opis innowacji, lokalizacja</td><td>Wyszukiwanie, ocena, mapa</td><td>Wszyscy, także goście</td></tr><tr><td>E-mail, telefon, osoba kontaktowa</td><td>Kontakt po akceptacji zapytania</td><td>Ukryte do akceptacji</td></tr><tr><td>Dane konta</td><td>Logowanie</td><td>Tylko właściciel</td></tr><tr><td>Zgłoszenia nieprawidłowości</td><td>Moderacja</td><td>Moderator</td></tr></tbody></table></div>')+
 panel('Zasady','<ul class="why"><li>Minimalizacja: bez danych kontaktowych uczniów w widoku publicznym. Dla osób niepełnoletnich kontakt podaje opiekun lub szkoła.</li><li>Zgoda na przetwarzanie danych w celu łączenia z partnerami jest wymagana przy rejestracji.</li><li>Hasła są haszowane (SHA-256 z solą). W tym prototypie dzieje się to w przeglądarce, więc nie zastępuje to logowania po stronie serwera.</li><li>Docelowo: uwierzytelnianie serwerowe, szyfrowanie danych, dwuskładnikowe logowanie, dziennik audytu i role.</li><li>Dane z rejestru NCBR są publiczne. Dane osobowe z rejestru nie są publikowane.</li></ul>')+
 panel('Twoje prawa','<p class="small">W prototypie dane zapisują się tylko w tej przeglądarce.</p><div class="row"><button class="btn ghost sm" data-act="privcopy">Pokaż moje dane (JSON)</button>'+(S.delAsk2?'<span class="small">Usunąć konto, swoje innowacje i zgłoszenia z tej przeglądarki?</span><button class="btn sm" style="background:var(--rose)" data-act="privdelok">Usuń</button><button class="btn ghost sm" data-act="privdelno">Anuluj</button>':'<button class="btn ghost sm" data-act="privdel">Usuń moje dane</button>')+'</div><textarea id="exp-out" readonly rows="8" style="width:100%;margin-top:8px;font-family:monospace;font-size:12px" placeholder="Tu pojawią się Twoje dane"></textarea>'));
PAGEX.rozwoj=()=>pg('Skalowanie i rozwój po hackathonie',
 panel('Architektura docelowa','<div class="tablewrap"><table><tbody><tr><td><b>Warstwa prezentacji</b></td><td>Ta aplikacja przeglądarkowa, wersje dla organizacji i dla gości</td></tr><tr><td><b>Usługi</b></td><td>Interfejs API, wyszukiwanie, ocena i rekomendacje, weryfikacja, powiadomienia</td></tr><tr><td><b>Dane</b></td><td>Wspólna baza z podziałem na organizacje (multi-tenant), indeks wyszukiwania, dziennik audytu</td></tr><tr><td><b>Integracje</b></td><td>Importy z NCBR, Interreg, UPRP, EPO, PBN, rejestry KRS, REGON i POL-on</td></tr></tbody></table></div>')+
 panel('Role w organizacji','<ul class="why"><li><b>Przeglądający:</b> widzi innowacje i oferty.</li><li><b>Redaktor:</b> dodaje i edytuje zgłoszenia swojej organizacji.</li><li><b>Moderator:</b> rozpatruje zgłoszenia nieprawidłowości.</li><li><b>Administrator:</b> zaprasza osoby, zmienia wagi kryteriów dla organizacji.</li></ul>')+
 panel('Plan rozwoju','<ol class="why"><li><b>Pilotaż (3 miesiące):</b> jeden region, 10 organizacji, import danych z kilku baz. Cel: 100 zgłoszeń i 80% ocenionych.</li><li><b>Wspólna baza (6 miesięcy):</b> logowanie serwerowe, role, moderacja, integracje.</li><li><b>Skala krajowa:</b> wiele regionów, wskaźniki skuteczności, otwarte dane o innowacjach.</li></ol><p class="small">Wskaźniki sukcesu są na stronie „Mierniki skuteczności”.</p>')+
 panel('Test wydajności','<p class="small">Sprawdza w tej przeglądarce, jak szybko działa porównanie podobieństwa i dopasowanie dla 1000 syntetycznych innowacji. Dane testowe nie są zapisywane.</p><div class="row"><button class="btn sm" data-act="perf">Uruchom test</button></div><p id="perf-out" class="small" role="status" style="margin-top:8px"></p>'));
PAGEX.moder=()=>{
  if(!S.acct)return pg('Moderacja zgłoszeń','<div class="panel"><p>Kolejka moderacji jest dostępna po zalogowaniu. <button class="linkbtn" data-act="acct">Zaloguj się</button> (możesz użyć konta demo).</p></div>');
  const all=[];Object.keys(REPS).forEach(id=>REPS[id].forEach((r,ix)=>all.push({id,ix,r})));
  const nm=id=>{const x=S.items.find(y=>y.id===id)||allInvestors().find(y=>y.id===id);return x?(x.title||x.name):id};
  return pg('Moderacja zgłoszeń',panel('Kolejka ('+all.length+')',all.length?all.map(x=>'<div class="mrow"><div style="flex:1"><b>'+esc(nm(x.id))+'</b><div class="small muted">'+esc(x.r.t)+' · '+esc(x.r.r)+'</div></div><button class="btn ghost sm" data-act="modok" data-rid="'+x.id+'" data-ix="'+x.ix+'">Rozpatrzone</button></div>').join(''):'<p class="muted">Brak zgłoszeń. Zgłoś nieprawidłowość w sekcji „Wiarygodność i weryfikacja” dowolnej karty, a trafi tutaj.</p>')+'<p class="hint">Trzy zgłoszenia obniżają poziom zaufania pozycji o jeden stopień do czasu rozpatrzenia.</p>');
};
function extAction2(d){
  const a=d.act;if(!a)return false;
  const out=t=>{const e=$('exp-out');if(e){e.value=t;e.focus();e.select()}try{navigator.clipboard&&navigator.clipboard.writeText(t).then(()=>toast('Skopiowano do schowka.'),()=>{})}catch(_){}};
  if(a==='expcsv'){out(CSV_HEAD.join(';')+'\n'+exportRows().join('\n'));return true}
  if(a==='expjson'){out(JSON.stringify(vis().map(i=>({id:i.id,tytul:i.title,instytucja:i.institution,lokalizacja:locOf(i),etap:STAGES[i.stage],kategorie:i.cats,zrodlo:i.url||null,ocena:totalScore(i.scores||analyze(i).sug)})),null,1));return true}
  if(a==='tplcsv'){out(CSV_HEAD.join(';')+'\n'+['Przykładowy tytuł innowacji','Krótki opis rozwiązania','Problem, który rozwiązuje','Nazwa szkoły','Krosno','podkarpackie','','','Prototyp','technologiczna','Technologia|Edukacja',''].map(csvQ).join(';'));return true}
  if(a==='privcopy'){const mine=S.acct?S.items.filter(i=>i.owner===S.acct.email):[];out(JSON.stringify({konto:S.acct?{nazwa:S.acct.name,email:S.acct.email,miasto:S.acct.city}:null,innowacje:mine,zgloszenia:REPS},null,1));return true}
  if(a==='privdel'){S.delAsk2=true;render();return true}
  if(a==='privdelno'){S.delAsk2=false;render();return true}
  if(a==='privdelok'){
    S.delAsk2=false;
    if(!S.acct){toast('Nie ma danych konta do usunięcia.');render();return true}
    if(S.acct.demo){toast('Konta demo nie można usunąć. Zostały wyczyszczone tylko zgłoszenia.');REPS={};saveReps();render();return true}
    const em=S.acct.email;saveAcc(loadAcc().filter(x=>x.email!==em));S.items=S.items.filter(i=>i.owner!==em);for(let i=PARTNERS.length-1;i>=0;i--)if(PARTNERS[i].owner===em)PARTNERS.splice(i,1);saveOffers();REPS={};saveReps();save();logout();toast('Dane zostały usunięte z tej przeglądarki.');return true;
  }
  if(a==='modok'){const l=REPS[d.rid];if(l){l.splice(+d.ix,1);if(!l.length)delete REPS[d.rid];saveReps();TCACHE.clear();render()}return true}
  if(a==='perf'){
    const t0=performance.now(),N=1000,syn=[];
    for(let i=0;i<N;i++){const base=S.items[i%S.items.length];syn.push(Object.assign({},base,{id:'s'+i,title:base.title+' '+i,tags:base.tags.slice()}))}
    const t1=performance.now();const sims=buildSim(syn[0],syn);const t2=performance.now();
    let n=0;syn.forEach(x=>{const sc=totalScore(suggest(x,[]));PARTNERS.forEach(p=>{if(matchScore(x,{tags:p.tags,types:p.types,st:p.st},sc).sc>=30)n++})});const t3=performance.now();
    const o=$('perf-out');if(o)o.textContent='1000 rekordów: porównanie podobieństwa jednej innowacji ze wszystkimi trwało '+Math.round(t2-t1)+' ms, ocena i dopasowanie wszystkich do '+PARTNERS.length+' inwestorów trwały '+Math.round(t3-t2)+' ms ('+n+' dopasowań od 30%). Pomiar w tej przeglądarce.';
    return true;
  }
  return false;
}
