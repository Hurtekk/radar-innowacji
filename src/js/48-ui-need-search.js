/* ====================== SZUKAM ROZWIĄZANIA: dopasowanie potrzeby do istniejących, gotowych innowacji ======================
   Działa lokalnie w przeglądarce: wpisany tekst potrzeby nie jest nigdzie wysyłany ani zapisywany. */
const nst=w=>w.length>5?w.slice(0,5):w;
const NSTOP=new Set('oraz albo ktory ktora ktore jest sa dla pod nad przy przez jak jako czy sie nie tak ale tez lub chce chcemy szukamy szuka szukam potrzebujemy potrzebuje potrzeba rozwiazanie rozwiazania rozwiazan innowacje innowacja nowe nowy nowa naszej naszego nasza nasze naszych firma firmy zaklad zaklady jednostka instytucja organizacja mamy mamy bez przed po ze na do od w z o u i a to ma maja moze mozna bardzo wiecej mniej'.split(' ').map(nst));
const ntoks=s=>norm(s).split(/[^a-z0-9]+/).filter(w=>w.length>=2).map(nst);
const CONCEPTS=[
 {n:'emisje i oczyszczanie spalin',k:['emis','spali','nox','tlenk','azot','denox','co2','smog','filtr','oczys'],x:['katal','regen','plazm','elekt','spali','oczys','tlenk','nox','azot','denox','emis','filtr']},
 {n:'szkło, powłoki i materiały',k:['szkl','szyb','powlo','ceram','kompo','mater','ekran','nanot'],x:['powlo','nanok','mater','antyb','kompo','szkl','ekran','nanot','krzem','lakie','ceram']},
 {n:'piece i procesy wysokotemperaturowe',k:['piec','piece','tempe','ogniw','topie','hutni','hutn','wypal'],x:['tempe','cieplo','ciepl','termi','piec','kotl','katal','regen','spali','energ']},
 {n:'energia i oszczędność energii',k:['energ','prad','cieplo','ciepl','oszcz','zuzyc','fotow','wodor','magaz','bater'],x:['energ','magaz','bater','ogniw','wodor','elekt','litow','fotow','cieplo','ciepl','akumu','lohc']},
 {n:'automatyzacja, roboty i pomiary',k:['auto','robot','sterow','czujn','senso','pomia','monit','linia','produk','iot','kontr'],x:['robot','auto','czujn','senso','pomia','monit','swiat','optyc','linia','steru','kontr','dron']},
 {n:'odpady, recykling i gospodarka obiegu',k:['odpad','recyk','smiec','obieg','regen','pojem'],x:['odpad','recyk','regen','pojem','smiet','obieg','czujn']},
 {n:'zdrowie i medycyna',k:['zdrow','medyc','pacje','szpit','telem','diagn','lecze','niewy','serca','kliny'],x:['medyc','pacje','szpit','telem','diagn','lecze','zdrow','serca','nosa','klini','bada']},
 {n:'rolnictwo i żywność',k:['rolni','zywno','upraw','hodow','ryb','pasza','owoce','spozy','jagod','lody'],x:['rolni','zywno','upraw','hodow','ryb','owoc','jagod','lody','ksyli','soso']},
 {n:'cyberbezpieczeństwo i IT',k:['cyber','it','oprog','system','chmur','dane','algor','ai','ucz','sztuc','bezpi'],x:['cyber','zagro','oprog','algor','chmur','siec','5g','dane','ai','ucze','pytho']},
 {n:'edukacja i szkoły',k:['szkol','szkoł','ucze','uczni','nauc','nauk','eduka','student','kompe','kszta','robot','progr'],x:['szkol','ucze','nauc','eduka','stude','kompe','kszta','progr','steam','pracow','robot','pytho','uczel']},
 {n:'administracja i usługi publiczne',k:['urzad','gmina','gmin','miast','mieszk','e-usl','usług','kolej','kolejk','rezer','parko','samor','starost','admin'],x:['urzad','gmina','miast','mieszk','rezer','kolej','parko','sms','powia','komun','uslug','kryzy','5g']},
 {n:'transport i mobilność',k:['trans','kolej','pojaz','dron','mobil','wozek','przej','ruch','jazda'],x:['trans','kolej','pojaz','dron','mobil','wozek','przej','rogat','okret','statk']},
 {n:'bezpieczeństwo i obronność',k:['bezpi','obron','wojsk','dron','ochro','laser','kryzy'],x:['dron','wojsk','laser','obron','pance','ochro','kryzy','bezpi','sensor','bomb']}
];
const NEED_EX=[
 'Huta szkła szuka rozwiązań ograniczających emisje tlenków azotu ze spalin pieca szklarskiego',
 'Zakład produkcyjny chce obniżyć zużycie energii i magazynować energię z odnawialnych źródeł',
 'Urząd gminy chce skrócić kolejki w urzędzie i szybciej informować mieszkańców',
 'Szkoła techniczna potrzebuje pracowni robotyki i programowania dla uczniów',
 'Szpital szuka telemedycyny dla pacjentów z niewydolnością serca',
 'Firma meblarska potrzebuje lakierów, które nie wymagają wysokiej temperatury'
];
const NEED_DEF={q:'',ready:false,woj:'',area:''};
if(!S.need)S.need=Object.assign({},NEED_DEF);
const readyOf=i=>i.trlNA?i.stage>=3:trlOf(i)>=7;
const readyScore=i=>i.trlNA?Math.min(100,(i.stage+1)*20):Math.round(trlOf(i)/9*100);
const contactScore=i=>(i.contact&&i.phone)?100:(i.contact||i.phone)?70:0;
let NIDX=null;
function needIndex(){
  if(NIDX&&NIDX.n===S.items.length)return NIDX;
  const docs=S.items.map(i=>{const tt=new Set(ntoks(i.title)),bb=new Set(ntoks([i.description,i.problem,(i.cats||[]).join(' '),(i.tags||[]).join(' '),i.institution,i.area||''].join(' ')));return {i,tt,bb}});
  const df={};docs.forEach(d=>{new Set([...d.tt,...d.bb]).forEach(w=>df[w]=(df[w]||0)+1)});
  NIDX={n:S.items.length,docs,df,N:docs.length};return NIDX;
}
function needSearch(q,opt){
  const X=needIndex(),qt=[...new Set(ntoks(q).filter(w=>!NSTOP.has(w)&&w.length>=3||w==='ai'))];
  if(!qt.length)return {rows:[],qt,cons:[]};
  const idf=w=>Math.log(1+X.N/(1+(X.df[w]||0)));
  const cons=CONCEPTS.filter(c=>qt.some(w=>c.k.some(k=>nst(norm(k))===w)));
  const norm0=qt.reduce((a,w)=>a+idf(w)*1.5,0)||1;
  const rows=X.docs.map(d=>{
    let s=0;const hit=[],chit=[];
    qt.forEach(w=>{const t=d.tt.has(w),b=d.bb.has(w);if(t||b){s+=idf(w)*(t?1.5:1);hit.push(w)}});
    cons.forEach(c=>{const ms=[...new Set(c.x.map(x=>nst(norm(x))))].filter(x=>(d.tt.has(x)||d.bb.has(x))&&!hit.includes(x));if(ms.length){s+=0.5*Math.min(ms.length,3)*(c.x.length?Math.log(1+X.N/(1+ms.reduce((a,m)=>a+(X.df[m]||0),0)/ms.length)):0);chit.push(c.n)}});
    return {i:d.i,s,hit,chit:[...new Set(chit)]}}).filter(r=>r.s>0);
  rows.forEach(r=>{r.rel=Math.round(100*(1-Math.exp(-r.s/ (norm0*0.9))));r.rd=readyScore(r.i);r.rank=r.rel*0.7+r.rd*0.2+contactScore(r.i)*0.1});
  let out=rows.filter(r=>r.rel>=18);
  if(opt.ready)out=out.filter(r=>readyOf(r.i));
  if(opt.woj)out=out.filter(r=>((locOf(r.i)||{}).woj||'')===opt.woj);
  if(opt.area)out=out.filter(r=>area3Of(r.i)===opt.area);
  out.sort((a,b)=>b.rank-a.rank);
  return {rows:out,qt,cons,all:rows.filter(r=>r.rel>=18).length};
}
const WHY_W=w=>w;
function pathOf(i){
  if(i.trlNA)return i.stage===4?'Źródło opisuje stosowanie usługi. Potwierdź aktualną dostępność i warunki przeniesienia.':i.stage===3?'Źródło opisuje pilotaż. Potwierdź jego wyniki i możliwość dalszych testów.':'Źródło opisuje plan lub rozwój usługi. Potwierdź postępy z podmiotem lub źródłem.';
  const t=trlOf(i);
  return t>=7?'Opis wskazuje na demonstrację lub eksploatację technologii. Potwierdź zakres walidacji, dostępność i warunki współpracy.':t>=4?'Rozwój i testy. Rozważ wspólny pilotaż lub projekt B+R z autorem.':'Wczesny etap badań. Rozważ współpracę badawczą i obserwuj postępy.';
}
function needCard(r,q){
  const i=r.i,l=locOf(i)||{},rd=readyOf(i);
  const why=(r.hit.length?'<span class="small">słowa z potrzeby: <b>'+r.hit.map(esc).join(', ')+'</b></span> ':'')+(r.chit.length?'<span class="small">powiązanie tematyczne: <b>'+r.chit.map(esc).join('; ')+'</b></span>':'');
  const mail=i.contact?'mailto:'+encodeURIComponent(i.contact).replace('%40','@')+'?subject='+encodeURIComponent('Zapytanie o wdrożenie: '+i.title)+'&body='+encodeURIComponent('Dzień dzień dobry,\n\nszukamy rozwiązania: '+q.slice(0,400)+'\n\nZainteresowała nas innowacja „'+i.title+'” (źródło: '+(i.url||'Radar innowacji')+'). Prosimy o informację o możliwości wdrożenia lub współpracy.\n\nPozdrawiam').replace(/dzień dzień/,'dzień'):'';
  return '<article class="card needc"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:12px"><div><h3 style="margin:0 0 4px">'+esc(i.title)+'</h3><div class="meta">'+esc(i.institution)+' · '+esc(l.miejsc||l.city||'')+(l.woj?', '+esc(l.woj):'')+'</div></div><div style="text-align:center;min-width:74px"><div style="font-size:26px;font-weight:800;color:#4f6bed">'+r.rel+'%</div><div class="small muted">dopasowanie</div></div></div>'+
   '<div class="row" style="flex-wrap:wrap;gap:6px;margin:8px 0"><span class="pill '+(rd?'good':'warn')+'">'+(rd?'Pilotaż lub stosowanie':'Badania / rozwój')+'</span><span class="pill plain">'+esc(typOf(i))+'</span><span class="pill plain">'+trlTxt(i)+'</span><span class="pill plain">'+esc(area3Of(i))+'</span></div>'+
   '<p class="small" style="margin:6px 0">'+esc((i.description||'').slice(0,260))+((i.description||'').length>260?'…':'')+'</p>'+
   '<p class="small" style="margin:6px 0"><b>Dlaczego pasuje.</b> '+why+'</p>'+
   '<p class="small" style="margin:6px 0"><b>Gotowość.</b> '+esc((i.trlWhy||'').slice(0,300))+'</p>'+
   '<p class="small" style="margin:6px 0"><b>Co dalej.</b> '+esc(pathOf(i))+'</p>'+
   '<div class="row" style="flex-wrap:wrap;gap:8px;margin-top:10px">'+(i.contact?'<a class="btn sm" href="'+mail+'">Napisz: '+esc(i.contact)+'</a>':'')+(i.phone?'<a class="btn ghost sm" href="tel:'+esc(i.phone.replace(/\s/g,''))+'">'+esc(i.phone)+'</a>':'')+'<button class="btn ghost sm" data-needopen="'+esc(i.id)+'">Karta innowacji</button>'+(i.url?'<a class="btn ghost sm" href="'+esc(i.url)+'" target="_blank" rel="noopener">Źródło ↗</a>':'')+'</div>'+(i.contactSrc?'<div class="small muted" style="margin-top:6px">Źródło kontaktu: '+esc(i.contactSrc)+'</div>':'')+'</article>';
}
function needResHTML(){
  const N=S.need;if(!N.q.trim())return '<div class="panel muted small">Wpisz, czego potrzebuje Twoja organizacja, lub wybierz przykład powyżej. Radar przeszuka bazę istniejących innowacji i pokaże te, które pasują do potrzeby, wraz z poziomem gotowości i kontaktem.</div>';
  const R=needSearch(N.q,N);
  if(!R.qt.length)return '<div class="panel small">Opisz potrzebę trochę dokładniej (branża, problem, oczekiwany efekt), aby radar mógł znaleźć dopasowania.</div>';
  const head='<div class="panel" style="display:flex;gap:18px;flex-wrap:wrap"><div><div class="small muted">Znalezione rozwiązania</div><div style="font-size:26px;font-weight:800">'+R.rows.length+'</div></div><div><div class="small muted">Pilotaż lub stosowanie</div><div style="font-size:26px;font-weight:800">'+R.rows.filter(r=>readyOf(r.i)).length+'</div></div><div><div class="small muted">Rozpoznane pojęcia</div><div class="small" style="margin-top:6px">'+(R.cons.length?R.cons.map(c=>esc(c.n)).join('; '):'—')+'</div></div></div>';
  if(!R.rows.length)return head+'<div class="panel small"><b>Nie znaleziono innowacji spełniających tę potrzebę.</b> '+(N.ready&&R.all?'Jest '+R.all+' pasujących pozycji, ale nie są na etapie pilotażu lub stosowania. Odznacz „Tylko pilotaż lub stosowanie”, aby je zobaczyć.':'Spróbuj opisać problem inaczej albo zdjąć filtry.')+' Radar nie pokazuje pozycji, które nie mają oparcia w bazie.</div>';
  return head+'<div class="stack" style="gap:12px">'+R.rows.slice(0,12).map(r=>needCard(r,N.q)).join('')+'</div>'+(R.rows.length>12?'<p class="small muted">Pokazano 12 najlepszych z '+R.rows.length+'.</p>':'');
}
PAGEX.szukam=()=>{
  const N=S.need,woj=optList(S.items.map(i=>(locOf(i)||{}).woj||'').filter(Boolean));
  return pg('Szukam rozwiązania',
   '<div class="panel stack"><p class="small" style="margin:0">Opisz, czego oczekuje Twoja organizacja. Radar dopasuje istniejące innowacje z bazy, pokaże ocenę dojrzałości (TRL) i kontakt do podmiotu lub źródła. Tekst jest przetwarzany tylko w Twojej przeglądarce.</p>'+
   '<textarea id="need-q" rows="3" style="width:100%" placeholder="np. Huta szkła szuka rozwiązań ograniczających emisje tlenków azotu ze spalin pieca">'+esc(N.q)+'</textarea>'+
   '<div class="row" style="flex-wrap:wrap;gap:6px">'+NEED_EX.map((x,k)=>'<button class="pill" data-needex="'+k+'">'+esc(x.split(/ (szuka|chce|potrzebuje)/)[0])+'</button>').join('')+'</div>'+
   '<div class="row" style="flex-wrap:wrap;gap:14px;align-items:flex-end"><label class="small"><input type="checkbox" id="need-ready"'+(N.ready?' checked':'')+'> Tylko pilotaż lub stosowanie (TRL 7–9 lub rozwiązanie stosowane)</label>'+
   '<div><label for="need-woj" class="small muted">Województwo</label><select id="need-woj"><option value="">Cała Polska</option>'+woj.map(x=>'<option value="'+esc(x[0])+'"'+(x[0]===N.woj?' selected':'')+'>'+esc(x[0])+'</option>').join('')+'</select></div>'+
   '<div><label for="need-area" class="small muted">Obszar</label><select id="need-area"><option value="">Wszystkie</option>'+AREAS.map(a=>'<option value="'+a+'"'+(a===N.area?' selected':'')+'>'+a+'</option>').join('')+'</select></div>'+
   '<button class="btn" id="need-go">Szukaj rozwiązań</button></div></div>'+
   '<div id="need-res" aria-live="polite">'+needResHTML()+'</div>'+
   panel('Jak działa dopasowanie','<ul class="why"><li><b>Słowa i pojęcia.</b> Radar rozpoznaje słowa z potrzeby oraz pojęcia branżowe (np. „emisje” obejmują spaliny, tlenki azotu i katalizatory) i szuka ich w opisach, zastosowaniach i tytułach innowacji.</li><li><b>Ranking.</b> Wynik to 70% dopasowania tematycznego, 20% gotowości do wdrożenia (TRL) i 10% dostępności kontaktu. Rzadsze słowa liczą się bardziej.</li><li><b>Uczciwość.</b> Jeśli nic nie pasuje, radar to mówi. Procent dopasowania jest wskaźnikiem względnym, a nie prawdopodobieństwem sukcesu.</li><li><b>Produkcja.</b> W wersji produkcyjnej ten sam interfejs może korzystać z modelu językowego i osadzeń semantycznych, a baza jest zasilana kolektorem.</li></ul>'));
};
function needRead(){const g=id=>document.getElementById(id);S.need={q:(g('need-q')||{}).value||S.need.q,ready:g('need-ready')?g('need-ready').checked:S.need.ready,woj:g('need-woj')?g('need-woj').value:S.need.woj,area:g('need-area')?g('need-area').value:S.need.area}}
function needRun(){needRead();const r=document.getElementById('need-res');if(r)r.innerHTML=needResHTML();try{track&&track('need',needSearch(S.need.q,S.need).cons.map(c=>c.n).join(','))}catch(e){}}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-needex],[data-needopen],#need-go,[data-needhome]');if(!t)return;
  if(t.dataset.needex!=null){S.need.q=NEED_EX[+t.dataset.needex];const q=document.getElementById('need-q');if(q)q.value=S.need.q;needRun();return}
  if(t.id==='need-go'){needRun();return}
  if(t.dataset.needhome!=null){const v=(document.getElementById('home-need')||{}).value||'';S.need.q=v;setPage('szukam');if(v)needRun();return}
  if(t.dataset.needopen){openD('inn',t.dataset.needopen)}
});
document.addEventListener('change',e=>{if(e.target&&/^need-(ready|woj|area)$/.test(e.target.id))needRun()});

/* ---------- strona główna: pole potrzeby i dane w liczbach ---------- */
function homeNeed(){
  return '<div class="panel stack needhero" style="text-align:left;margin:18px 0"><h2 style="margin:0">Powiedz, czego potrzebujesz. Radar znajdzie pasujące projekty i rozwiązania.</h2><p class="small muted" style="margin:0">Opisz potrzebę własnymi słowami (np. branża, problem, oczekiwany efekt). Radar dopasuje istniejące polskie innowacje, pokaże opisany etap oraz kontakt do podmiotu lub źródła.</p>'+
   '<textarea id="home-need" rows="2" style="width:100%" placeholder="np. Huta szkła szuka rozwiązań ograniczających emisje tlenków azotu ze spalin pieca"></textarea>'+
   '<div class="row" style="flex-wrap:wrap;gap:6px">'+NEED_EX.slice(0,4).map((x,k)=>'<button class="pill" data-needex="'+k+'" data-page="szukam">'+esc(x.split(/ (szuka|chce|potrzebuje)/)[0])+'</button>').join('')+'</div>'+
   '<div class="row"><button class="btn" data-needhome="1">Znajdź rozwiązania</button></div></div>';
}
function homeData(){
  const it=S.items,n=it.length,ready=it.filter(readyOf).length,both=it.filter(i=>i.contact&&i.phone).length,anyc=it.filter(i=>i.contact||i.phone).length;
  const woj=new Set(it.map(i=>(locOf(i)||{}).woj).filter(Boolean)).size,cities=new Set(it.map(i=>{const l=locOf(i)||{};return l.prec==='miejscowość'?l.miejsc:''}).filter(Boolean)).size;
  const tech=it.filter(i=>!i.trlNA),avg=tech.length?(tech.reduce((a,i)=>a+trlOf(i),0)/tech.length):0;
  const srcs=new Set(it.map(i=>{try{return new URL(i.url).hostname}catch(e){return i.source||''}}).filter(Boolean)).size;
  const typs=TYP_ORDER.map(t=>[t,it.filter(i=>typOf(i)===t).length]).filter(x=>x[1]);
  const T=(v,l,s)=>'<div class="panel" style="text-align:center;margin:0"><div style="font-size:30px;font-weight:800;color:#4f6bed">'+v+'</div><div class="small"><b>'+l+'</b></div>'+(s?'<div class="small muted">'+s+'</div>':'')+'</div>';
  return '<h2 class="hs">Radar w liczbach</h2><div class="tiles5">'+
   T(n,'projektów i rozwiązań','każdy z linkiem do źródła')+T(ready,'na etapie pilotażu lub stosowania',Math.round(ready/Math.max(1,n)*100)+'% bazy (TRL 7–9 lub stosowane)')+T(anyc,'z kontaktem do podmiotu lub źródła',both+' z e-mailem i telefonem')+T(woj,'województw',cities+' miast i wsi')+T(avg?avg.toFixed(1):'–','średni TRL','technologie, ocena z uzasadnieniem')+T(srcs,'źródeł publicznych','rejestry, uczelnie, samorządy')+'</div>';
}
function trlHist(){
  const c={};let na=0;S.items.forEach(i=>{if(i.trlNA)na++;else{const t=trlOf(i);c[t]=(c[t]||0)+1}});
  const mx=Math.max(1,na,...Object.values(c));
  const row=(l,v,col)=>'<div style="display:grid;grid-template-columns:90px 1fr 34px;gap:10px;align-items:center;margin:5px 0"><div class="small"><b>'+l+'</b></div><div style="height:16px;border-radius:5px;background:#eef1fa"><div style="height:100%;border-radius:5px;width:'+Math.round(v/mx*100)+'%;background:'+col+'"></div></div><div class="num"><b>'+v+'</b></div></div>';
  let h='';for(let t=1;t<=9;t++)h+=row('TRL '+t,c[t]||0,t>=7?'#0f9d8c':t>=4?'#e0a02a':'#7c8cf5');
  return h+row('nie dotyczy',na,'#b6bdd3')+'<p class="small muted">Zielone: TRL 7–9 (pilotaż lub stosowanie). Żółte: TRL 4–6 (rozwój i testy). Fioletowe: TRL 1–3 (badania).</p>';
}
