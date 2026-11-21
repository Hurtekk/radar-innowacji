/* ====================== METODOLOGIA OCENY: jedna sekcja kryteriów z zasadami przyznawania punktów ======================
   Nadpisuje wcześniejsze PAGEX.metod. Nazwy i wagi kryteriów pochodzą z CRIT (10-logic.js), a reguły punktacji
   w METOD odpowiadają funkcji suggest() w tym samym pliku (przy zmianie wzorów zmień oba miejsca).
   Poziom „Wdrożenie w praktyce” nie jest wyliczany: jest zapisany w data/records/assessments.json (pola wdr i wb).
   Odnośniki mają postać <a data-jump="id" data-jump-page="metod">: działają na stronie i z karty innowacji. */

const METOD_INTRO='Każde kryterium dostaje liczbę od 1 do 5. Wynik końcowy to suma po pięciu kryteriach: każde „oczko” skali daje 4 punkty, więc najgorsza możliwa ocena to 20, a najlepsza 100. Progi: od 65 potencjał wysoki, 45–64 średni, poniżej 45 niski. Poniżej opisujemy, skąd bierze się każda z pięciu liczb. Wszystko liczy algorytm, bez ręcznego „na oko”. Dlatego ocena jest <b>wskazówką do porównań</b>, a nie wyrokiem o jakości projektu.';

/* klucz = CRIT[].k
   formula = jedno zdanie reguły, groups = tabele „punkty -> warunek”, note = uwaga pod tabelami,
   how = pełny opis wyliczenia (zwijany), ex = przykład, lim = ograniczenia, see = zobacz też */
const METOD={
 wdroz:{
  formula:'Punkty = poziom rzeczywistego użycia potwierdzony w źródle (1–5). Ocena jest niezależna od TRL: TRL mierzy dojrzałość technologii, a to kryterium mierzy, czy ktoś już z niej korzysta.',
  groups:[{cap:'Poziom użycia',rows:[
    ['1','Brak dowodów użycia: wyniki badań, prototyp lub opis produktu; źródło nie wspomina o użytkownikach spoza zespołu projektu'],
    ['2','Próby u użytkownika lub w terenie: testy, demonstracja, badanie kliniczne, instalacja próbna lub pilotaż w warunkach rzeczywistych'],
    ['3','Działa u jednego odbiorcy: wdrożenie w jednej firmie lub instytucji albo zrealizowany program z uczestnikami'],
    ['4','Kilku odbiorców lub oferta rynkowa: wdrożenie u co najmniej dwóch odbiorców albo produkt w sprzedaży lub w otwartym dostępie'],
    ['5','Duża skala: dziesiątki klientów lub partnerów albo tysiące użytkowników']]}],
  note:'Liczy się tylko to, co potwierdza źródło. Gotowość do sprzedaży, zgłoszony patent czy nagroda na targach nie podnoszą oceny.',
  what:'Czy rozwiązanie jest już używane poza zespołem, który je opracował, i przez ilu odbiorców.',
  how:'Autorzy radaru czytają stronę źródłową i szukają dowodów użycia: nazw wdrożeń, klientów, liczby użytkowników, informacji o sprzedaży, badaniach klinicznych albo pilotażach. Na tej podstawie przypisują poziom od 1 do 5 i zapisują krótkie uzasadnienie widoczne na karcie innowacji. To ocena autorów, a nie dana ze źródła, i algorytm jej nie zmienia. Programy edukacyjne i usługi publiczne oceniamy tą samą skalą: zrealizowany program lub działająca usługa w jednej instytucji to poziom 3, a kurs dostępny otwarcie albo wdrożony w kilku szkołach to poziom 4. Dla pozycji bez takiej oceny (np. dodanej ręcznie) kryterium szacujemy z etapu rozwoju, co jest mniej wiarygodne.',
  ex:'Dwa projekty mają TRL 7. Pierwszy wdrożono w dwóch firmach, więc dostaje 4 z 5. Drugi to prototyp bez opisu użycia i dostaje 1 z 5. TRL jest taki sam, a różnicę widać dopiero w tym kryterium.',
  lim:'Brak informacji w źródle nie dowodzi, że rozwiązanie nie jest używane, tylko że nie potrafimy tego potwierdzić. Poziomy 4–5 wymagają konkretów (nazwy, liczby, sprzedaż), więc słabiej opisane rozwiązania mogą być niedoszacowane.',
  see:['kryt-trl','met-etapy','met-fakty','met-profile']},
 trl:{
  formula:'Punkty = TRL ÷ 2, zaokrąglone do całości.',
  groups:[{cap:'Poziom TRL (1–9)',rows:[['1','TRL 1–2'],['2','TRL 3–4'],['3','TRL 5–6'],['4','TRL 7–8'],['5','TRL 9']]}],
  note:'Gdy skala TRL nie dotyczy (programy edukacyjne, część usług), punkty bierzemy z etapu rozwoju.',
  what:'Dojrzałość technologii w skali TRL od 1 do 9.',
  how:'Jeśli źródło podaje TRL, używamy go. W przeciwnym razie TRL ocenia radar na podstawie tego, co strona potwierdza (prototyp, testy, wdrożenie u klienta), zawsze na ostrożnym poziomie, a uzasadnienie widać na karcie. Skalę 1–9 przeliczamy na 1–5 przez dzielenie przez dwa i zaokrąglenie: TRL 4 daje 2, TRL 6 daje 3, TRL 7 daje 4, TRL 9 daje 5. Gdy skala TRL nie dotyczy (programy edukacyjne, część usług), kryterium liczymy z etapu rozwoju.',
  ex:'Strona opisuje działający prototyp urządzenia, ale nie podaje klientów ani certyfikatów. Przyjmujemy TRL 7, czyli 4 z 5, a na karcie piszemy, czego źródło nie potwierdza.',
  lim:'TRL oceniony przez radar jest oznaczony gwiazdką i nie jest oficjalną oceną beneficjenta ani NCBR. TRL mówi tylko o gotowości technologii, a nie o tym, czy ktoś ją stosuje: o użyciu mówi osobne kryterium „Wdrożenie w praktyce”.',
  see:['kryt-wdroz','met-etapy','met-fakty','met-profile']},
 nov:{
  formula:'Punkty = 5 − 9 × najwyższe podobieństwo do innego opisu, zaokrąglone do całości (1–5).',
  groups:[{cap:'Podobieństwo najbliższego opisu (0–1)',rows:[['5','do 0,05: nie znaleziono podobnych'],['4','0,06–0,16'],['3','0,17–0,27'],['2','0,28–0,38'],['1','od 0,39: istnieje niemal to samo rozwiązanie']]}],
  note:'Gdy beneficjent sam wskazał stopień nowości, wynik to średnia z tą wartością: nowość na świecie 5, w Polsce 4, w regionie 3, ulepszenie istniejącego rozwiązania 2.',
  what:'Czy istnieją już podobne rozwiązania, czy projekt jest od nich wyraźnie inny.',
  how:'Algorytm porównuje tekst opisu (tytuł, problem, opis, tagi) z innymi pozycjami w radarze i z krótką listą rozwiązań referencyjnych. Słowa są sprowadzane do rdzeni (pierwszych pięciu liter), rzadkie słowa ważą więcej niż pospolite, a podobieństwo liczymy jako kąt między wektorami (miara kosinusowa, od 0 do 1). Ocena to 5 minus dziewięciokrotność najwyższego podobieństwa, zaokrąglona do całości i ograniczona do przedziału 1–5. Jeśli beneficjent sam wskazał stopień nowości (np. projekt międzynarodowy), uśredniamy obie wartości.',
  ex:'Najbliższy opis w bazie ma podobieństwo 0,2: 5 − 1,8 = 3,2, czyli 3. Przy podobieństwie 0,45 wynik to 1, bo istnieje niemal to samo rozwiązanie.',
  lim:'To jest podobieństwo słów, a nie sprawdzenie prawa patentowego. Kryterium porównuje projekt tylko z tym, co jest w radarze i na liście referencyjnej, więc „5” oznacza „nie znaleziono podobnych w przeszukanych źródłach”, a nie „na świecie nie ma nic podobnego”.',
  see:['met-profile','met-ai']},
 pot:{
  formula:'Punkty = średnia z zasięgu problemu i łatwości przeniesienia, zaokrąglona do całości.',
  groups:[{cap:'Zasięg (projekty NCBR: szacowany z budżetu)',rows:[['2','budżet poniżej 1 mln zł'],['3','od 1 mln zł'],['4','od 3 mln zł'],['5','od 10 mln zł']]},
          {cap:'Łatwość przeniesienia (wymagana infrastruktura)',rows:[['5','brak wymagań (np. programy edukacyjne)'],['4','niska'],['3','średnia (przyjęta dla projektów NCBR)'],['2','wysoka']]}],
  note:'Brak dokumentacji obniża łatwość przeniesienia o 1 punkt (minimum 1).',
  what:'Jak szeroko rozwiązanie można zastosować i jak łatwo je przenieść do innego miejsca.',
  how:'Bierzemy średnią z dwóch liczb: zasięgu problemu i łatwości przeniesienia. Zasięg dla projektów NCBR szacujemy z wielkości budżetu (od 1 mln zł, od 3 mln zł, od 10 mln zł dają coraz większy zasięg), bo źródło nie podaje liczby użytkowników. Łatwość przeniesienia zależy od wymaganej infrastruktury (rozwiązanie bez specjalnej infrastruktury dostaje 5, z rozbudowaną 2) i od tego, czy opis jest udokumentowany (brak dokumentacji obniża wynik o 1). Programy edukacyjne nie wymagają infrastruktury, więc dostają wyższą wartość.',
  ex:'Projekt za 3,2 mln zł (zasięg 4) ze standardową infrastrukturą (3): średnia 3,5, czyli 4 po zaokrągleniu.',
  lim:'Budżet jest tylko przybliżeniem zasięgu: tani projekt może mieć szeroki zasięg, a drogi wąski. Dlatego na karcie pokazujemy zawsze, z czego ocena wynika, a przy kontakcie z beneficjentem warto to doprecyzować.',
  see:['met-fakty','met-profile']},
 wiar:{
  formula:'Punkty = 3 + 1 + 1, najwyżej 5. Bez linku do źródła pozycja nie trafia do radaru.',
  groups:[{cap:'Za co przyznajemy punkty',rows:[['3','źródło publiczne z linkiem (podstawa)'],['+1','wpis w rejestrze publicznym (np. baza sukcesów NCBR)'],['+1','niezależne potwierdzenie z drugiego źródła']]}],
  what:'Na ile można zaufać, że opis jest prawdziwy i można go sprawdzić.',
  how:'Każda pozycja w radarze musi mieć link do źródła. Bez niego nie trafia na stronę. Podstawa to 3 punkty za źródło publiczne z linkiem, plus 1 punkt za wpis w rejestrze publicznym (np. baza sukcesów NCBR), plus 1 za niezależne potwierdzenie z drugiego źródła. Maksimum to 5.',
  ex:'Projekt z bazy NCBR: 3 + 1 = 4. Projekt wykryty na stronie uczelni, bez rejestru: 3. Projekt z rejestru i niezależnym potwierdzeniem: 5.',
  lim:'Kryterium mierzy pewność co do <b>istnienia i opisu</b> projektu, a nie jego jakości. Nawet 4 z 5 nie oznacza, że rozwiązanie działa tak dobrze, jak opisuje to beneficjent.',
  see:['met-fakty','met-profile']}
};

/* sekcje inne niż kryteria: id -> nazwa w odnośnikach i spisie */
const MET_SECT=[
 ['met-definicja','Definicja innowacji'],
 ['met-kryteria','Kryteria oceny'],
 ['met-wynik','Jak powstaje wynik'],
 ['met-etapy','Etap rozwoju i TRL'],
 ['met-profile','Profile odbiorców'],
 ['met-fakty','Fakty a szacunki'],
 ['met-ai','Rola AI']
];
const metKid=k=>'kryt-'+k;
function metLabel(id){
  const c=CRIT.find(x=>metKid(x.k)===id);if(c)return 'Kryterium: '+c.name;
  const s=MET_SECT.find(x=>x[0]===id);return s?s[1]:id;
}
/* odnośnik w obrębie strony Metodologia; z page=… przenosi też z innych widoków (np. z karty innowacji) */
function metA(id,label,cls,page){
  return '<a href="#'+id+'" class="'+(cls||'mlink')+'" data-jump="'+id+'"'+(page?' data-jump-page="'+page+'"':'')+'>'+label+'</a>';
}
/* odnośnik do kryterium spoza strony metodologii (karta innowacji, rozbicie oceny) */
function metLink(k,label){return metA(metKid(k),label,'mlink','metod')}

const metPanel=(id,title,body)=>'<section class="panel stack met-sec" id="'+id+'" aria-labelledby="'+id+'-h"><h3 id="'+id+'-h">'+title+'</h3>'+body+
  '<div class="met-foot">'+metA('met-top','↑ Spis treści','mlink up')+'</div></section>';

/* tabela „punkty -> warunek” */
function metTable(g){
  return '<table class="ptbl"><caption>'+g.cap+'</caption><thead><tr><th scope="col">Punkty</th><th scope="col">Kiedy</th></tr></thead><tbody>'+
   g.rows.map(r=>'<tr><td><span class="pt">'+r[0]+'</span></td><td>'+r[1]+'</td></tr>').join('')+'</tbody></table>';
}

function metCrit(c,i){
  const m=METOD[c.k];
  return '<article class="crit-card" id="'+metKid(c.k)+'" aria-labelledby="'+metKid(c.k)+'-h">'+
   '<header class="crit-head"><h4 id="'+metKid(c.k)+'-h"><span class="met-n">'+(i+1)+'</span>'+c.name+'</h4><span class="met-w">waga '+c.w+'%</span></header>'+
   '<p class="met-lead">'+m.what+'</p>'+
   '<p class="small muted crit-src"><b>Skąd dane:</b> '+c.auto+'</p>'+
   '<div class="crit-grid">'+
    '<div class="crit-pts"><p class="crit-rule">'+m.formula+'</p><div class="tablewrap">'+m.groups.map(metTable).join('')+'</div>'+(m.note?'<p class="small muted">'+m.note+'</p>':'')+'</div>'+
    '<div class="crit-side"><div class="crit-note ex"><span class="l">Przykład</span>'+m.ex+'</div><div class="crit-note lim"><span class="l">Ograniczenia</span>'+m.lim+'</div></div>'+
   '</div>'+
   '<details class="crit-more"><summary>Jak to dokładnie liczymy</summary><p class="small">'+m.how+'</p></details>'+
   '<div class="met-see"><span class="small muted">Zobacz też:</span> '+m.see.map(id=>metA(id,metLabel(id),'chip')).join('')+'</div>'+
  '</article>';
}

/* jedna sekcja ze wszystkimi kryteriami: wzór ogólny, progi, pięć kart z tabelami punktów */
function metCriteria(){
  const how='<div class="met-how" id="met-wynik"><h4 id="met-wynik-h" tabindex="-1">Jak powstaje wynik</h4>'+
   '<div class="met-stats"><div class="met-stat"><b>5 × 20%</b><span>pięć kryteriów o równej wadze</span></div>'+
   '<div class="met-stat"><b>1–5</b><span>wartość kryterium; jedno „oczko” to 4 punkty</span></div>'+
   '<div class="met-stat"><b>20–100</b><span>wynik końcowy, suma punktów z kryteriów</span></div></div>'+
   '<p class="crit-rule">Ocena = suma po kryteriach: waga × wartość ÷ 5</p>'+
   '<div class="met-thr"><span class="thr lo"><b>poniżej 45</b> niski potencjał</span><span class="thr mid"><b>45–64</b> średni potencjał</span><span class="thr hi"><b>od 65</b> wysoki potencjał</span></div>'+
   '<p class="small">'+METOD_INTRO+'</p></div>';
  const nav='<nav class="met-others" aria-label="Kryteria oceny"><span class="small muted">Przejdź do kryterium:</span>'+CRIT.map((c,i)=>metA(metKid(c.k),(i+1)+'. '+c.name,'chip')).join('')+'</nav>';
  return metPanel('met-kryteria','Kryteria oceny',how+nav+CRIT.map(metCrit).join(''));
}

PAGEX.metod=()=>{
  const toc='<nav class="panel stack met-toc" id="met-top" aria-labelledby="met-top-h"><h3 id="met-top-h">Spis treści</h3>'+
   '<div class="met-others">'+MET_SECT.map(s=>metA(s[0],s[1],'chip')).join('')+'</div></nav>';
  return pg('Metodologia oceny',
   toc+
   metPanel('met-definicja','Definicja innowacji','<p class="small">Za innowację uznajemy nowy lub ulepszony produkt, proces albo rozwiązanie organizacyjne, które istotnie różni się od wcześniejszych rozwiązań jednostki i zostało udostępnione użytkownikom lub wdrożone (Podręcznik Oslo, 2018). Trzy obszary: technologiczny, edukacyjny i administracyjny.</p>')+
   metCriteria()+
   metPanel('met-etapy','Etap rozwoju i TRL','<p class="small">Etap rozwoju opisuje dojrzałość technologii i wynika z TRL. To nie jest ocena użycia: o tym, czy rozwiązanie jest stosowane, mówi osobne kryterium „Wdrożenie w praktyce”.</p><div class="tablewrap"><table><thead><tr><th>Etap rozwoju</th><th>TRL (szacunek, gdy źródło go nie podaje)</th></tr></thead><tbody>'+STAGES.map((s,k)=>'<tr><td>'+s+'</td><td class="num">TRL '+TRL_FROM_STAGE[k]+'</td></tr>').join('')+'</tbody></table></div><p class="small">Jeśli źródło podaje TRL, używamy go i oznaczamy jako potwierdzony. Jeśli go nie podaje, TRL jest oceną radaru, oznaczoną gwiazdką, a przy każdej karcie jest jej uzasadnienie: co źródło potwierdza, czego nie potwierdza i jaki to poziom dojrzałości. Dla programów edukacyjnych i usług publicznych skala TRL (dotycząca technologii) nie ma zastosowania, więc pokazujemy „nie dotyczy”, a dojrzałość opisuje etap wdrożenia.</p>')+
   metPanel('met-profile','Profile odbiorców','<div class="tablewrap"><table><thead><tr><th>Profil</th><th>Co jest ważniejsze</th></tr></thead><tbody>'+AUD.slice(1).map(a=>'<tr><td>'+esc(a.name)+'</td><td class="small">'+esc(a.note)+'<br><span class="muted">Wagi: '+Object.keys(a.w).map(k=>CRIT.find(c=>c.k===k).name.replace(/ \(TRL\)/,'')+' '+Math.round(a.w[k]*100)+'%').join(', ')+'</span></td></tr>').join('')+'</tbody></table></div><p class="small">Dopasowanie do profilu zmienia tylko kolejność wyników. Dodaje też premię za preferowany obszar (+10) i ochronę własności lub wcześniejszy etap tam, gdzie ma to sens dla profilu.</p>')+
   metPanel('met-fakty','Fakty a szacunki','<p class="small">Przy każdej karcie tabela pokazuje, które informacje są potwierdzone w źródle (tytuł, instytucja, miejscowość, etap opisany w źródle, patent), a które są szacunkiem (TRL z etapu, klasyfikacja obszaru, ocena). Ocena jest zawsze wyliczeniem algorytmicznym.</p>')+
   metPanel('met-ai','Rola AI','<ul class="why"><li>Gdy jest dostępny, model AI nadaje etykiety (dziedzina, temat, miasto, typ instytucji). Reguły słownikowe są rozwiązaniem zapasowym.</li><li>Kolektor może opcjonalnie użyć modelu do streszczenia i klasyfikacji znalezionych tekstów, zawsze z zachowaniem linku do źródła.</li><li>AI nie dopisuje danych kontaktowych, patentów ani wyników, których nie ma w źródle.</li></ul>'));
};

/* skok do sekcji: natychmiastowy (płynne przewijanie bywa wyłączone lub niedostępne), z krótkim podświetleniem
   celu; fokus na nagłówku, żeby czytnik ekranu i klawiatura zaczęły od właściwego miejsca */
function metScroll(id){
  const el=document.getElementById(id);if(!el)return;
  try{el.scrollIntoView({block:'start'})}catch(e){el.scrollIntoView()}
  const h=el.matches('h3,h4')?el:el.querySelector('h3,h4');
  if(h){h.setAttribute('tabindex','-1');try{h.focus({preventScroll:true})}catch(e){}}
  el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1600);
}
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-jump]');if(!a)return;
  e.preventDefault();
  const pgId=a.dataset.jumpPage;
  if(pgId&&S.page!==pgId)setPage(pgId);
  metScroll(a.dataset.jump);
});
