/* ====================== dane rzeczywiste: baza sukcesów NCBR (stan pobrania: 2026-11) ====================== */
const NCBR_URL='https://www.gov.pl/web/ncbr/';
const _num=s=>{const m=String(s).match(/^([\d\s]+),?(\d{0,2})/);return m?parseFloat(m[1].replace(/\s/g,'')+'.'+(m[2]||'0')):0};
function _catsFor(area,title,benef){
  const a=norm(area+' '+title+' '+benef),c=[];
  const add=x=>{if(!c.includes(x))c.push(x)};
  if(/pedagog|edukac|uczni|nauczyc|kurs|uczelni|szkol|akademi|studen/.test(a)&&!/^[^|]*inzynieria/.test(norm(area)))add('Edukacja');
  if(/medyc|covid|szpital|zdrow|pacjent|chorob|niewydolnosc|rany|osluchow|niepłodnosci|niepłodn|bioimpl|protez/.test(a))add('Zdrowie');
  if(/lotni|silnik lot|bomb lotni|lotow/.test(a))add('Lotnictwo');
  if(/pojazd|automotive|motoryz|wagon|skrzyni|samochod|transport/.test(a))add('Motoryzacja');
  if(/energi|recykl|srodowisk|ekolog|ogniw|paliw|odpad|morz|woda|wodn|spalin|powodz|co2|oleje|olejow/.test(a))add('Energia i środowisko');
  if(/obron|bezpieczen|straz|rakiet|dron|radar|laser|cyber|pocisk|bomb/.test(a))add('Bezpieczeństwo');
  if(/rolnic|lesnictw|ryb|owoc|pszenz|hodowl|zgrabiar/.test(a))add('Rolnictwo i żywność');
  if(/komputer|informatyk|elektronik|elektrotech|oprogram|aplikac|cloud|python|javascript|ict|vr |wirtualn|sensor|czujnik|swiatlowod|robot|druk|rgb|dzwiek|spektrometr|cyber/.test(a))add('Technologia');
  if(/ uis? |sztuczn|algorytm|uczenie maszyn|klasyfikacj/.test(a))add('AI');
  if(!c.length)add('Technologia');
  return c.slice(0,3);
}
const _fin=s=>{const m=String(s).match(/^\d{2}\.\d{2}\.(\d{4})–(\d{2}\.\d{2}\.(\d{4}))/);return m?+m[3]:(String(s).match(/(\d{4})\s*$/)||[])[1]|0};
function applyRewrite(o){
  const w=REWRITE[o.id];if(!w)return null;
  o.description=w.opis;o.problem=w.zast;o.benefit=w.zast;o.typ=w.typ;o.trlWhy=w.tb;o.wdr=w.wdr;o.wdrWhy=w.wb;
  if(w.trl>0){o.trl=w.trl;if(o.trlBasis!=='source')o.trlBasis='assessed';o.trlNA=false;o.stage=w.trl<=3?0:w.trl<=5?1:w.trl===6?2:w.trl<=8?3:4}else{o.trl=0;o.trlNA=true;o.trlBasis='na'}
  return o;
}
function realData(){
  return NCBR_PROJECTS.map(r=>{
    const {slug,title,beneficiary:ben,programme:prog,woj,area,value:val,period:per,city}=r;
    const first=ben.split(/ \(| oraz |, /)[0].trim();
    const edu=/Pedagogika|Edukacja|edukacja/.test(area);
    const company=/Sp\. z o\.o\.|S\.A\.|Piotr|Lech|Roman|Marek/.test(first)&&!/Uniwersytet|Politechnika|Instytut|Akademia|Szkoła/.test(first);
    const inst=/Szpital|Centrum Medyczne|Centralny Szpital|Uniwersyteckie Centrum Kliniczne|Wojskowy Instytut Medyczny/.test(first)?3:/Instytut|PAN|Łukasiewicz|Sieć Badawcza/.test(first)?4:/Uniwersytet|Politechnika|Akademia|Szkoła Wyższa|Szkoła Wyższa|Państwowa Wyższa|Podkarpacka Szkoła|Collegium|Wyższa Szkoła|Wydział|AGH|Karkonoska|Wojskowa|Państwowa Akademia|WAT/.test(first)?1:3;
    const origin=company?4:inst===1?2:inst===4?3:/Szpital|Centrum Medyczne|Centralny|Uniwersyteckie/.test(first)?5:2;
    const cats=_catsFor(area,title,ben);
    const v=_num(val),intl=/EUR|międzynarod|Eurostars|M-ERA|V4/.test(val+prog);
    const stage=edu?4:/POIR|Inteligentny Rozwój|Wsparcie szpitali|szpitali/.test(prog)?3:2;
    const consortium=/ oraz | i |,/.test(ben)&&ben.split(',').length>1;
    const end=_fin(per);
    const loc=mkLoc(city,woj,slug);
    const rodzaj=edu?2:/szpital|COVID|procedur|opieki/.test(norm(title))?3:/Program TANGO|Programy krajowe|Badań Stosowanych|Badania stosowane|V4|M-ERA|międzynarod/.test(prog)?5:0;
    const prgShort=prog;
    const o={id:r.id,type:edu?'edukacyjna':/szpital|COVID|opieki/.test(norm(title))?'procesowa':'technologiczna',instType:inst,institution:first,city:(loc&&loc.miejsc)||city||'',creators:'',contact:'',phone:'',title,
      problem:'Obszar badawczy wg rejestru NCBR: '+area+'. Źródło nie opisuje problemu własnymi słowami, więc dalszy opis dołącz po kontakcie z beneficjentem.',
      description:'Projekt zakończony, finansowany przez NCBR w programie „'+prgShort+'”. Beneficjent: '+ben+'. Dziedzina: '+area+'. Budżet: '+val+'. Okres realizacji: '+per+'.',
      tags:[],stage,scope:v>=1e7?4:v>=3e6?3:v>=1e6?2:1,infra:edu?0:2,team:consortium?2:1,ip:0,hasDocs:true,status:0,contacts:[],log:[{t:now(),x:'Zaimportowano z rejestru NCBR (baza sukcesów beneficjentów)'}],scores:null,ai:null,
      rodzaj,novelty:intl?0:-1,origin,cats,benefit:'Gotowy, sfinansowany ze środków publicznych wynik projektu. Okazja do komercjalizacji, wdrożenia lub kontynuacji badań z beneficjentem.',owner:'',public:true,interests:[],
      source:'Baza sukcesów NCBR',url:NCBR_URL+slug,registry:'NCBR',programme:prgShort,value:val,period:per,endYear:end,area,loc,estimated:true};
    o.tags=tagsFromCats(cats);
    return applyRewrite(o);
  }).filter(Boolean).filter(o=>/^https?:\/\//.test(o.url||''));
}

/* ====================== inwestorzy i oferty wyłącznie z rejestru (programy NCBR i podmioty wymienione w projektach) ====================== */
function realInvestors(items){
  const out=[];
  NCBR_PROGS.forEach(([prog,desc],i)=>{
    const rel=items.filter(x=>x.programme===prog||(prog==='Programy krajowe'&&/Programy krajowe|Badań Stosowanych|Badania stosowane|Programy strategiczne|obronności|obronność/.test(x.programme)));
    if(!rel.length)return;
    const cs={};rel.forEach(x=>x.cats.forEach(c=>cs[c]=(cs[c]||0)+1));
    const cats=Object.keys(cs).sort((a,b)=>cs[b]-cs[a]).slice(0,3);
    const sts=rel.map(x=>x.stage);
    const loc=mkLoc('Warszawa','');
    out.push({id:'f'+(i+1),name:'NCBR – '+desc,kind:'Finansowanie',city:'Warszawa',person:'Narodowe Centrum Badań i Rozwoju',email:'',phone:'',tags:tagsFromCats(cats),types:TYPES.slice(),st:[Math.min(...sts),Math.max(...sts)],
      d:'Instytucja finansująca: Narodowe Centrum Badań i Rozwoju (agencja wykonawcza, Warszawa). W rejestrze sukcesów program ma '+rel.length+' projektów widocznych w radarze. Aktualne nabory i warunki sprawdź na stronie NCBR.',
      benefit:'Dofinansowanie badań i wdrożeń ze środków publicznych. Wzorzec z radaru: projekty tego programu zakończyły się dofinansowaniem na poziomie '+(function(){const r=rel.map(x=>{const m=String(x.value).match(/\(dofinansowanie ([\d\s]+),?/);const t=String(x.value).match(/^([\d\s]+),?/);return m&&t?parseFloat(m[1].replace(/\s/g,''))/parseFloat(t[1].replace(/\s/g,'')):null}).filter(v=>v>0).sort((a,b)=>a-b);return r.length?Math.round(r[Math.floor(r.length/2)]*100)+'% kosztów (mediana)':'wg rejestru'})()+'.',
      cats,loc,url:NCBR_URL,registry:'NCBR',inferred:false,evidence:rel.slice(0,3).map(x=>x.url),projectIds:rel.map(x=>x.id)});
  });
  OTHER_INV.forEach(o=>{
    const pr=items.find(x=>x.url.indexOf(o.prj)>=0);
    const cats=pr?pr.cats:['Technologia'];
    const loc=mkLoc(o.city,'');
    out.push({id:o.id,name:o.name,kind:o.kind,city:o.city,person:'Dane kontaktowe: brak w rejestrze',email:'',phone:'',tags:tagsFromCats(cats),types:TYPES.slice(),st:[2,4],d:o.d,
      benefit:o.kind==='Partner'?'Partner przemysłowy: możliwość wdrożenia i współpracy w konsorcjum. Gotowość do nowych projektów wynika z udziału w projekcie z rejestru i nie jest potwierdzona.':'Odbiorca i partner wdrożeniowy: możliwość pilotażu w realnych warunkach. Gotowość do nowych projektów wynika z udziału w projekcie z rejestru i nie jest potwierdzona.',
      cats,loc,url:pr?pr.url:NCBR_URL,registry:'NCBR',inferred:true,evidence:pr?[pr.url]:[],projectIds:pr?[pr.id]:[]});
  });
  return out;
}
const REAL_ITEMS=realData();
realInvestors(REAL_ITEMS).forEach(p=>PARTNERS.push(p));

/* publiczne dane kontaktowe firm (strony firm, komunikaty, katalogi) – tylko to, co jest jawne; źródło zapisane przy rekordzie */
REAL_ITEMS.forEach(o=>{const k=Object.keys(PUBLIC_CONTACTS).find(k=>(o.institution||'').indexOf(k)===0);
 if(k){const c=PUBLIC_CONTACTS[k];o.contact=c.email;o.phone=c.phone;o.contactSrc=c.src;o.contactPublic=true;}});

/* ogólne (instytucjonalne) dane kontaktowe z publicznych stron i komunikatów; bez adresów osób prywatnych */
REAL_ITEMS.forEach(o=>{if(o.contact||o.phone)return;const k=Object.keys(INST_CONTACTS).find(k=>(o.institution||'').indexOf(k)===0);
 if(k){const c=INST_CONTACTS[k];o.contact=c.email||'';o.phone=c.phone||'';o.contactSrc=c.src;o.contactPublic=true;}});
REAL_ITEMS.forEach(o=>{if(o.contact||o.phone)return;const c=INST_CONTACTS['Narodowe Centrum Badań i Rozwoju'];o.contact=c.email;o.phone=c.phone;o.contactSrc='Punkt Informacyjny NCBR (rejestr, w którym opublikowano projekt): '+c.src;o.contactPublic=true;});
for(let k=REAL_ITEMS.length-1;k>=0;k--)if(!REAL_ITEMS[k].contact&&!REAL_ITEMS[k].phone)REAL_ITEMS.splice(k,1);
PARTNERS.forEach(p=>{if(/^f\d/.test(p.id)){const c=INST_CONTACTS['Narodowe Centrum Badań i Rozwoju'];p.email=c.email;p.phone=c.phone;p.contactSrc=c.src;p.contactPublic=true;}
 const f=Object.keys(PUBLIC_CONTACTS).find(k=>(p.name||'').indexOf(k)===0);if(f&&!p.email){p.email=PUBLIC_CONTACTS[f].email;p.phone=PUBLIC_CONTACTS[f].phone;p.contactSrc=PUBLIC_CONTACTS[f].src;p.contactPublic=true;}});

