/* ====================== METODOLOGIA OCENY: jedna sekcja kryteriów z zasadami przyznawania punktów ======================
   Nadpisuje wcześniejsze PAGEX.metod. Nazwy i wagi kryteriów pochodzą z CRIT (10-logic.js), a reguły punktacji
   w METOD odpowiadają funkcji suggest() w tym samym pliku (przy zmianie wzorów zmień oba miejsca).
   Poziom „Wdrożenie w praktyce” nie jest wyliczany: jest zapisany w data/records/assessments.json (pola wdr i wb).
   Odnośniki mają postać <a data-jump="id" data-jump-page="metod">: działają na stronie i z karty innowacji. */

const METOD_INTRO='Każde z pięciu kryteriów otrzymuje ocenę 1–5 i wagę 20%. Jedno oczko to 4 punkty; suma wynosi 20–100. Progi: poniżej 45 niski, 45–64 średni, od 65 wysoki potencjał. Autorzy oceniają dowody użycia i dojrzałości, a algorytm przelicza dane oraz podobieństwo tekstów. Brak danych nie jest dowodem słabego rozwiązania. Wynik roboczy i zakres wrażliwości na nieznany zasięg są pokazane na karcie. Ranking jest wskazówką do porównań, nie niezależną walidacją jakości.';
const METOD={
 wdroz:{
  formula:'Ocena autorów wynika z rzeczywistego użycia opisanego w źródle, niezależnie od TRL. Sam patent, nagroda, gotowość do sprzedaży ani plan wdrożenia nie dowodzą użycia.',
  groups:[{cap:'Poziom użycia',rows:[['1','Brak potwierdzonego użycia poza zespołem; także sama zapowiedź wdrożenia'],['2','Testy u użytkownika, demonstracja w terenie, badanie kliniczne lub instalacja próbna'],['3','Działanie u jednego odbiorcy lub zrealizowany program z uczestnikami'],['4','Co najmniej dwóch odbiorców, produkt w sprzedaży albo otwarty dostęp'],['5','Dziesiątki klientów/partnerów albo tysiące użytkowników lub uczestników']]}],
  note:'Liczba urządzeń, pobrań lub użytkowników całej firmy nie jest automatycznie liczbą użytkowników konkretnego produktu. Transfer praw/licencja nie dowodzi użycia u odbiorcy. W razie braku oceny użycia nie zastępujemy jej etapem: roboczo 1/5 z informacją o braku dowodów.',
  what:'Czy i w jakiej skali rozwiązanie jest używane poza zespołem projektu.',
  how:'Poziom wdr i uzasadnienie są oceną autorów opartą na wskazanym źródle. Algorytm odczytuje ten poziom; nie ustala użytkowników z budżetu. Na karcie zapisano zakres dowodu, a dla zweryfikowanych przypadków także krótki fragment i datę kontroli. Stosujemy najwyższy próg, którego warunki są potwierdzone.',
  ex:'Otwarty kurs bez liczby uczestników: 4/5. Kurs z ponad 1600 uczestnikami: 5/5. 4000 śrub u odbiorcy nie oznacza 4000 klientów.',
  lim:'Brak potwierdzenia nie dowodzi braku użycia. Historyczna zapowiedź uruchomienia nie dowodzi wykonania. Wynik odnosi się do zakresu i daty źródła.',see:['kryt-trl','met-etapy','met-fakty']},
 trl:{
  formula:'Dla technologii: punkty = TRL ÷ 2, zaokrąglone do całości i ograniczone do 1–5. Dla usług i programów, dla których TRL nie ma zastosowania: punkty = etap + 1.',
  groups:[{cap:'Poziom gotowości',rows:[['1','TRL 1–2'],['2','TRL 3–4'],['3','TRL 5–6'],['4','TRL 7–8'],['5','TRL 9']]}],
  note:'TRL podany w konkretnym dokumencie jest daną przypisaną do źródła. W innym przypadku jest szacunkiem radaru z gwiazdką. „Nie dotyczy” jest decyzją klasyfikacyjną radaru, nie potwierdzeniem beneficjenta.',
  what:'Dojrzałość określonej technologii lub etap wdrożenia usługi.',
  how:'TRL szacujemy z udokumentowanych badań, prototypu, demonstracji lub eksploatacji. Sam opis produktu, patent i wielkość budżetu nie dowodzą walidacji w warunkach rzeczywistych. Ocena musi wskazywać, czy dotyczy komponentu, całego systemu czy konkretnej funkcji. Dla TRL nie dotyczy etap Koncepcja/Prototyp/Testy/Pilotaż/Stosowana w praktyce daje odpowiednio 1/2/3/4/5 punktów.',
  ex:'Demonstrator działający w użytkowanym budynku uzasadnia rozważenie TRL 7; sama dokumentacja nie dowodzi działania demonstratora. Rutynowo używana usługa nie może mieć etapu Prototyp tylko dlatego, że finansowano ją w danym programie.',
  lim:'Szacunek nie jest certyfikacją ani oficjalną oceną beneficjenta. Nie potwierdza skuteczności klinicznej ani liczby klientów.',see:['kryt-wdroz','met-etapy','met-fakty']},
 nov:{
  formula:'Punkty podobieństwa = 5 − 9 × najwyższe podobieństwo tekstu innego projektu, zaokrąglone do całości i ograniczone do 1–5.',
  groups:[{cap:'Interpretacja wyniku',rows:[['1','Duże podobieństwo tekstów w bazie, nie dowód identyczności technologii'],['3','Umiarkowane podobieństwo do najbliższego opisu'],['5','Niskie podobieństwo do opisów innych projektów w radarze']]}],
  note:'Jawna deklaracja beneficjenta może zostać uśredniona z wynikiem tekstowym: świat 5, Polska 4, region 3, ulepszenie 2. Program międzynarodowy ani waluta EUR nie są taką deklaracją. Dwa źródła tego samego projektu nie obniżają sobie oceny.',
  what:'Odrębność opisu w katalogu radaru, nie pełna ocena nowości rynkowej.',
  how:'Porównujemy tytuł, opis, problem i tagi za pomocą ważonych rdzeni słów i podobieństwa kosinusowego. Aktualnie lista zewnętrznych opisów referencyjnych jest pusta: obliczenie obejmuje tylko inne projekty w radarze. Rekordy o wspólnym identyfikatorze projektu pomijamy. Gdy brak innych opisów, wynik 5 oznacza wyłącznie brak porównania. Deklaracje nowości NCBR muszą mieć jawne oznaczenie pochodzenia.',
  ex:'Podobieństwo 0,2: 5 − 1,8 = 3,2, po zaokrągleniu 3. Podobieństwo 0,45 daje 1; wymaga sprawdzenia różnic, nie uprawnia do wniosku o skopiowaniu rozwiązania.',
  lim:'Nie przeszukujemy automatycznie rynku, UPRP ani EPO. Ocena zależy od zawartości katalogu i sposobu opisania rozwiązania.',see:['met-fakty','met-ai']},
 pot:{
  formula:'Punkty = zaokrąglona średnia z zasięgu i łatwości przeniesienia. Dla nieznanego zasięgu roboczo przyjmujemy neutralne 3/5, a obok wyniku pokazujemy zakres dla zasięgu 1–5.',
  groups:[{cap:'Zasięg projektu NCBR — wyłącznie kwota w PLN',rows:[['2','Znany budżet poniżej 1 mln zł'],['3','Od 1 mln zł do poniżej 3 mln zł'],['4','Od 3 mln zł do poniżej 10 mln zł'],['5','Od 10 mln zł']]},{cap:'Łatwość przeniesienia — założenie o infrastrukturze',rows:[['5','Brak dodatkowych wymagań'],['4','Niska'],['3','Średnia'],['2','Wysoka']]}],
  note:'Brak kwoty nie oznacza budżetu poniżej 1 mln. EUR i inne waluty nie są porównywane z progami PLN bez kwoty przeliczonej i wskazanego źródła kursu. Brak przypisanego opisu źródłowego obniża łatwość przeniesienia o 1 (minimum 1). Opis nie jest kompletną dokumentacją wykonawczą.',
  what:'Przybliżony zasięg i możliwość przeniesienia rozwiązania.',
  how:'Dla NCBR używamy budżetu w PLN jako przybliżenia zasięgu. Kwotę, walutę, wynik zasięgu i założenie infrastrukturalne pokazujemy w uzasadnieniu. Przy braku danych neutralna wartość nie jest ustaleniem faktycznym: zakres wyniku pokazuje, jak zmieniłaby się suma przy zasięgu 1–5. Poza NCBR korzystamy z jawnie określonego zasięgu, a jeśli go nie ma, stosujemy tę samą regułę brakujących danych. Nie przeliczamy walut po wymyślonym lub niewskazanym kursie.',
  ex:'Budżet 3,2 mln PLN daje zasięg 4, średnia infrastruktura daje 3; średnia 3,5 po zaokrągleniu daje 4. Niepodana kwota daje roboczo zasięg 3 oraz informację o niepewności.',
  lim:'Budżet jest niedoskonałym przybliżeniem. Wymagania infrastruktury, zwłaszcza przyjmowane domyślnie, wymagają rozmowy z beneficjentem. Zakres wrażliwości nie jest statystycznym przedziałem ufności.',see:['met-fakty','met-profile']},
 wiar:{
  formula:'3 punkty za publiczny link, +1 za rejestr, +1 za wskazane potwierdzenie w drugiej domenie; maksimum 5.',
  groups:[{cap:'Pochodzenie danych',rows:[['3','Podany publiczny link'],['+1','Projekt przypisany do rejestru publicznego, np. NCBR'],['+1','Wskazany dokument potwierdzający w drugiej domenie']]}],
  what:'Identyfikowalność i pochodzenie informacji, nie skuteczność rozwiązania.',
  how:'Sama flaga „potwierdzone” nie zwiększa oceny: wymagany jest poprawny adres HTTP(S) drugiego źródła w innej domenie. Różna domena jest koniecznym warunkiem technicznym, ale autor musi jeszcze ocenić niezależność i zakres potwierdzenia. Wynik kontroli odczytu oraz datę pokazujemy osobno. Obecność linku nie oznacza weryfikacji każdego twierdzenia.',
  ex:'Rejestr NCBR i jeden link: 4/5. Artykuł prasowy bez rejestru: 3/5. Dwa adresy NCBR tego samego projektu nadal dają 4/5.',
  lim:'Źródło beneficjenta może zawierać deklaracje i plany. Wysoka punktacja pochodzenia nie zastępuje badania skuteczności, aktualnego statusu patentu ani potwierdzenia sprzedaży.',see:['met-fakty']}
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
   metPanel('met-definicja','Definicja innowacji','<p class="small">Za innowację uznajemy nowy lub ulepszony produkt, proces albo rozwiązanie organizacyjne, które istotnie różni się od wcześniejszych rozwiązań jednostki i zostało udostępnione użytkownikom lub wdrożone (Podręcznik Oslo, 2018). Trzy obszary: technologiczny, edukacyjny i administracyjny. Katalog obejmuje również projekty rozwojowe i plany, oznaczone osobno na kartach. Nie są one automatycznie uznawane za wdrożone innowacje.</p>')+
   metCriteria()+
   metPanel('met-etapy','Etap rozwoju i TRL','<p class="small">Dla technologii etap wynika z zakresu TRL zgodnie z tabelą. Nie przeliczamy go ponownie według wcześniejszej skali. Dla programów i usług bez TRL etap wynika z dowodów użycia: plan — Koncepcja, test terenowy — Pilotaż, zrealizowany program lub działająca usługa — Stosowana w praktyce. Wdrożenie w praktyce osobno mierzy skalę użycia.</p><div class="tablewrap"><table><thead><tr><th>Etap rozwoju</th><th>Zakres TRL dla technologii</th></tr></thead><tbody>'+STAGES.map((s,k)=>'<tr><td>'+s+'</td><td class="num">'+STAGE_TRL_LABELS[k]+'</td></tr>').join('')+'</tbody></table></div><p class="small">Jeśli źródło podaje TRL, używamy go i oznaczamy jako potwierdzony. Jeśli go nie podaje, TRL jest oceną radaru, oznaczoną gwiazdką, a przy każdej karcie jest jej uzasadnienie: co źródło potwierdza, czego nie potwierdza i jaki to poziom dojrzałości. Dla programów edukacyjnych i usług publicznych skala TRL (dotycząca technologii) nie ma zastosowania, więc pokazujemy „nie dotyczy”, a dojrzałość opisuje etap wdrożenia.</p>')+
   metPanel('met-profile','Profile odbiorców','<div class="tablewrap"><table><thead><tr><th>Profil</th><th>Co jest ważniejsze</th></tr></thead><tbody>'+AUD.slice(1).map(a=>'<tr><td>'+esc(a.name)+'</td><td class="small">'+esc(a.note)+'<br><span class="muted">Wagi: '+Object.keys(a.w).map(k=>CRIT.find(c=>c.k===k).name.replace(/ \(TRL\)/,'')+' '+Math.round(a.w[k]*100)+'%').join(', ')+'</span></td></tr>').join('')+'</tbody></table></div><p class="small">Dopasowanie do profilu zmienia tylko kolejność wyników. Dodaje też premię za preferowany obszar (+10) i ochronę własności lub wcześniejszy etap tam, gdzie ma to sens dla profilu.</p>')+
   metPanel('met-fakty','Fakty a szacunki','<p class="small">Rozdzielamy dane przypisane do źródła, twierdzenia porównane z dokumentem, oceny autorów i braki danych. Sam link nie potwierdza całego opisu. Streszczenie, klasyfikacja obszaru, decyzja TRL nie dotyczy oraz szacowany TRL są ocenami radaru. Przy ważnych twierdzeniach zapisujemy fragment źródła, zakres i datę kontroli. Oddzielamy plany od zrealizowanych działań, licencję od wdrożenia oraz cały produkt od komponentu lub pojedynczej funkcji. Kontrola odczytu nie jest niezależną walidacją skuteczności.</p>')+
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
