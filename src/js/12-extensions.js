
/* ---------- rozszerzenia: rodzaj, nowość, kategorie (max 3), środowisko powstania, korzyści ---------- */
const RODZAJE=['Wynalazek','Projekt społeczny','Projekt edukacyjny','Rozwiązanie organizacyjne','Usługa lub proces','Badanie naukowe'];
const NOVEL=['Nowość na świecie','Nowość w Polsce','Nowość w regionie','Ulepszenie istniejącego rozwiązania'];
const ORIGINS=['Szkoła podstawowa','Szkoła średnia','Uczelnia wyższa','Instytut badawczy','Firma','Samorząd lub instytucja publiczna','Organizacja pozarządowa','Osoba prywatna'];
const CATS=['Technologia','AI','Kosmos','Lotnictwo','Motoryzacja','Zdrowie','Edukacja','Energia i środowisko','Administracja','Bezpieczeństwo','Społeczne','Rolnictwo i żywność'];
const CAT2TAG={'Technologia':['ICT','czujniki','IoT'],'AI':['AI'],'Kosmos':['kosmos'],'Lotnictwo':['lotnictwo'],'Motoryzacja':['motoryzacja'],'Zdrowie':['zdrowie'],'Edukacja':['edukacja'],'Energia i środowisko':['energia','środowisko'],'Administracja':['administracja'],'Bezpieczeństwo':['bezpieczeństwo'],'Społeczne':['seniorzy','jakość życia'],'Rolnictwo i żywność':[]};
const catsFromTags=tags=>CATS.filter(c=>(CAT2TAG[c]||[]).some(t=>(tags||[]).includes(t)));
const tagsFromCats=cats=>[...new Set((cats||[]).flatMap(c=>CAT2TAG[c]||[]))].filter(t=>ALLTAGS.includes(t));
const BEN_BY_KIND={'Finansowanie':'Dofinansowanie rozwoju i wdrożenia projektu.','Inwestor':'Kapitał na rozwój, mentoring i dostęp do sieci kontaktów.','Odbiorca':'Pilotaż w realnych warunkach i potencjalny pierwszy klient.','Partner':'Wsparcie merytoryczne, dostęp do ekspertów i infrastruktury.','Wsparcie':'Akceleracja, prototypowanie i dostęp do laboratoriów.'};
const DEMOX=[
 {t:'Wizyjna kontrola',r:0,n:1,o:2,c:['AI','Lotnictwo','Technologia'],b:'Licencja na gotową technologię kontroli jakości. Szybsze wejście na rynek dzięki działającemu prototypowi i zgłoszeniu patentowemu.'},
 {t:'Dziennik umiejętności',r:2,n:2,o:0,c:['Edukacja'],b:'Sprawdzony model do wdrożenia w kolejnych szkołach bez kosztów sprzętu. Możliwość licencjonowania materiałów i szkoleń dla nauczycieli.'},
 {t:'Zgłaszanie awarii',r:4,n:2,o:5,c:['Administracja','Technologia'],b:'Gotowy system do skopiowania w innych gminach. Niski koszt wdrożenia i widoczne efekty dla mieszkańców.'},
 {t:'Aplikacja do wymiany',r:4,n:3,o:1,c:['Edukacja','Technologia'],b:'Wczesny etap: szansa na udział w rozwoju produktu od początku i współpracę z młodym zespołem.'},
 {t:'Kooperatywa',r:3,n:2,o:5,c:['Energia i środowisko','Edukacja'],b:'Model obniżający koszty energii szkół. Potencjał skalowania na kolejne powiaty i finansowania z programów środowiskowych.'},
 {t:'Rehabilitacja',r:0,n:1,o:3,c:['Zdrowie','AI','Technologia'],b:'Rynek e-zdrowia i rehabilitacji domowej. Prototyp testowany z pacjentami i zgłoszenie patentowe ułatwiają komercjalizację.'},
 {t:'Sąsiedzka opieka',r:1,n:2,o:5,c:['Społeczne','Zdrowie'],b:'Mierzalny efekt społeczny w gminach wiejskich. Możliwość finansowania z programów społecznych i replikacji.'}
];
function enrich(inn){
  if(!inn._v2){inn._v2=true;inn.scores=null}
  if(inn.trl>0)inn.stage=stageFromTrl(inn.trl);
  if(inn.scores&&inn.scores.wdroz==null)inn.scores=null;
  if(inn.cats===undefined)inn.cats=[];
  ['rodzaj','novelty','origin'].forEach(k=>{if(inn[k]==null)inn[k]=-1});
  if(inn.benefit==null)inn.benefit='';if(inn.owner==null)inn.owner='';
  const d=DEMOX.find(x=>String(inn.title||'').indexOf(x.t)===0);
  if(d&&inn.rodzaj<0&&!inn.cats.length&&!inn.benefit)Object.assign(inn,{rodzaj:d.r,novelty:d.n,origin:d.o,cats:d.c.slice(),benefit:d.b});
  if(!inn.cats.length)inn.cats=catsFromTags(inn.tags).slice(0,3);
  return inn;
}
PARTNERS.forEach(p=>{if(!p.benefit)p.benefit=BEN_BY_KIND[p.kind]||'';if(!p.cats)p.cats=catsFromTags(p.tags).slice(0,3)});
const KEY_OFF='radar-oferty-v1';
function loadOffers(){try{return JSON.parse(localStorage.getItem(KEY_OFF))||[]}catch(e){return []}}
function saveOffers(){try{localStorage.setItem(KEY_OFF,JSON.stringify(PARTNERS.filter(p=>p.owner)))}catch(e){}}
loadOffers().forEach(o=>{if(!PARTNERS.some(p=>p.id===o.id))PARTNERS.push(o)});

/* ---------- katalog źródeł danych (kategoryzacja orientacyjna wg kategorii radaru) ---------- */
const SRC_KINDS=['Patenty','Publikacje naukowe','Biblioteki cyfrowe','Projekty z funduszy UE'];
const ALLCATS=CATS.slice();
const TECHCATS=['Technologia','AI','Kosmos','Lotnictwo','Motoryzacja','Zdrowie','Energia i środowisko','Bezpieczeństwo','Rolnictwo i żywność'];
const DATASRC=[
 {id:'uprp',kind:0,name:'E-wyszukiwarka UPRP',owner:'Urząd Patentowy RP',url:'https://ewyszukiwarka.pue.uprp.gov.pl/search/simple-search',cats:TECHCATS,what:'Zgłoszenia i ochrona patentowa w Polsce.',use:'Sprawdzenie nowości: czy podobny wynalazek jest już zgłoszony lub chroniony w kraju.'},
 {id:'epo',kind:0,name:'Rejestr patentowy EPO (Register Viewer)',owner:'Europejski Urząd Patentowy',url:'https://register.epo.org/regviewer',cats:TECHCATS,what:'Status postępowań patentowych w Europejskim Urzędzie Patentowym.',use:'Sprawdzenie nowości w skali europejskiej i statusu patentu konkurencyjnego rozwiązania.'},
 {id:'pbn',kind:1,name:'Polska Bibliografia Naukowa (PBN)',owner:'Ministerstwo Nauki',url:'https://pbn.nauka.gov.pl/core/#/home',cats:ALLCATS,what:'Publikacje, autorzy i instytucje polskiej nauki ze wszystkich dziedzin.',use:'Znalezienie zespołów badawczych i publikacji, na których opiera się innowacja, oraz potencjalnych partnerów naukowych.'},
 {id:'ppm',kind:1,name:'Polska Platforma Medyczna (PPM)',owner:'Uczelnie medyczne',url:'https://ppm.edu.pl/index.seam',cats:['Zdrowie'],what:'Publikacje medyczne i z nauk o zdrowiu.',use:'Weryfikacja stanu wiedzy dla innowacji w ochronie zdrowia i rehabilitacji.'},
 {id:'pan',kind:2,name:'Czasopisma PAN (dLibra)',owner:'Polska Akademia Nauk',url:'https://www.czasopisma.pan.pl/dlibra',cats:['Technologia','Energia i środowisko','Zdrowie','Rolnictwo i żywność','Społeczne','Kosmos'],what:'Biblioteka cyfrowa czasopism naukowych PAN.',use:'Przegląd literatury i wyszukanie autorów zbliżonych tematów.'},
 {id:'baztech',kind:2,name:'BazTech (czasopisma techniczne)',owner:'Biblioteka Politechniki Poznańskiej',url:'http://baztol.library.put.poznan.pl/baztol_czytelnik/baztol',cats:['Technologia','Motoryzacja','Lotnictwo','Energia i środowisko','Bezpieczeństwo','AI'],what:'Bibliograficzna baza polskich czasopism technicznych.',use:'Wyszukanie publikacji inżynierskich dla innowacji technologicznych i przemysłowych.'},
 {id:'interreg',kind:3,name:'Interreg: lista projektów',owner:'Programy Interreg zarządzane przez Polskę',url:'https://interreg.gov.pl/lista-projektow/',cats:['Energia i środowisko','Administracja','Społeczne','Edukacja','Zdrowie','Technologia','Bezpieczeństwo','Rolnictwo i żywność'],what:'Projekty współpracy transgranicznej (m.in. Polska-Słowacja, Polska-Ukraina, Południowy Bałtyk). Lista do pobrania jako plik XLSX.',use:'Znalezienie podobnych wdrożeń, partnerów zagranicznych i wzorów finansowania.'},
 {id:'ncbr',kind:3,name:'NCBR: wyszukiwarka sukcesów beneficjentów',owner:'Narodowe Centrum Badań i Rozwoju',url:'https://www.gov.pl/web/ncbr/wyszukiwarka-sukcesow-beneficjentow',cats:['Technologia','AI','Zdrowie','Energia i środowisko','Edukacja','Lotnictwo','Motoryzacja','Kosmos','Bezpieczeństwo','Rolnictwo i żywność'],what:'Zrealizowane projekty B+R z opisem beneficjenta, programu, wartości i słowami kluczowymi.',use:'Sprawdzenie, czy podobny projekt był już finansowany, oraz dobór programu dofinansowania.'}
];
function searchPhrase(inn){
  const w=String(inn.title||'').split(/\s+/).map(x=>x.replace(/[^\p{L}\p{N}-]/gu,'')).filter(x=>x.length>3&&!STOP.has(norm(x)));
  return w.slice(0,5).join(' ');
}
function sourcesFor(inn){
  const cs=inn.cats||[],hit=DATASRC.filter(s=>s.cats.some(c=>cs.includes(c)));
  return hit.length?hit:DATASRC;
}
