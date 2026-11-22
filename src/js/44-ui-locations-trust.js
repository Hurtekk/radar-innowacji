/* ====================== filtry lokalizacji i zaufania ====================== */
function F0(){return {dz:'',city:'',dep:'',iss:'',stage:'',cat:'',rodzaj:'',origin:'',woj:'',powiat:'',gmina:'',mtyp:'',trust:'',mine:''}}
function FI0(){return {dz:'',city:'',kind:'',woj:'',powiat:'',gmina:'',mtyp:'',trust:''}}
const LW=x=>(locOf(x)||{}).woj||'',LP=x=>(locOf(x)||{}).powiat||'',LG=x=>(locOf(x)||{}).gmina||'',LT=x=>(locOf(x)||{}).mtyp||'';
const TRUSTN=['Zgłoszone','Dane kontaktowe potwierdzone','Zweryfikowane w rejestrze','Potwierdzone przez niezależną osobę'];
function locDefs(list,P,pre){
  return [[pre+'.woj','Województwo',P.woj,optList(list.map(LW).filter(Boolean))],[pre+'.mtyp','Miasto / wieś',P.mtyp,optList(list.map(LT).filter(Boolean))],[pre+'.trust','Poziom zaufania',P.trust,optList(list.map(x=>TRUSTN[trustOf(x).lvl]))]];
}
function locPass(x,f){
  if(f.woj&&LW(x)!==f.woj)return false;if(f.powiat&&LP(x)!==f.powiat)return false;if(f.gmina&&LG(x)!==f.gmina)return false;if(f.mtyp&&LT(x)!==f.mtyp)return false;
  if(f.trust&&TRUSTN[trustOf(x).lvl]!==f.trust)return false;return true;
}

/* ====================== formularze: lokalizacja ====================== */
function locFields(p,d){
  d=d||{};const l=d.loc||{};
  return '<div><label for="'+p+'-woj">Województwo</label><select id="'+p+'-woj" required><option value="">Wybierz</option>'+WOJ.map(w=>'<option'+((l.woj||'')===w?' selected':'')+'>'+w+'</option>').join('')+'</select></div>'+
   '<div><label for="'+p+'-city">Miejscowość (miasto lub wieś)</label><input type="text" id="'+p+'-city" list="'+p+'-pl" value="'+esc(d.city||l.miejsc||'')+'" required><datalist id="'+p+'-pl">'+Object.keys(PLACES).map(k=>'<option value="'+esc(k)+'">').join('')+'</datalist></div>'+
   '<div><label for="'+p+'-pow">Powiat</label><input type="text" id="'+p+'-pow" value="'+esc(l.powiat||'')+'" placeholder="np. jasielski"></div>'+
   '<div><label for="'+p+'-gm">Gmina</label><input type="text" id="'+p+'-gm" value="'+esc(l.gmina||'')+'"></div>'+
   '<div><label for="'+p+'-mt">Miasto czy wieś</label><select id="'+p+'-mt"><option value="">Nie wiem</option>'+MTYP.map(m=>'<option'+((l.mtyp||'')===m?' selected':'')+'>'+m+'</option>').join('')+'</select></div>';
}
function readLoc(p){
  const g=id=>{const e=document.getElementById(p+'-'+id);return e?e.value.trim():''};
  const city=g('city'),woj=g('woj');
  const pl=PLACES[city];
  const base=mkLoc(city,woj||(pl?pl[0]:''),city+Math.random());
  if(!base)return null;
  if(g('pow'))base.powiat=g('pow');if(g('gm'))base.gmina=g('gm');if(g('mt'))base.mtyp=g('mt');
  return base;
}

/* ====================== zaufanie i weryfikacja (6 punktów) ====================== */
function loadReps(){try{return JSON.parse(localStorage.getItem('radar-zgloszenia-v1'))||{}}catch(e){return {}}}
let REPS=loadReps();
function saveReps(){try{localStorage.setItem('radar-zgloszenia-v1',JSON.stringify(REPS))}catch(e){}}
const FREEMAIL=/@(gmail|wp|o2|interia|onet|outlook|hotmail|yahoo|op|poczta|tlen|icloud)\./i;
const isInn=x=>x&&x.title!==undefined&&x.stage!==undefined;
const TCACHE=new Map();
function trustOf(x){
  const key=x.id+'|'+((REPS[x.id]||[]).length)+'|'+(x.title||x.name);
  if(TCACHE.has(key))return TCACHE.get(key);
  const inn=isInn(x),reps=(REPS[x.id]||[]).length,email=inn?x.contact:x.email,l=locOf(x),name=inn?x.institution:x.name;
  const instMail=!!email&&/@/.test(email)&&!FREEMAIL.test(email);
  let lvl=x.registry?2:(instMail||x.detected)?1:0;if(independentSource(x))lvl=3;if(reps>=3)lvl=Math.max(0,lvl-1);
  const C=[];
  C.push({n:1,t:'Tożsamość podmiotu',s:x.registry||instMail?'ok':'warn',x:x.registry?(inn?'Beneficjent „'+name+'” jest wskazany w rejestrze NCBR. Dla pewności sprawdź go w KRS, REGON lub POL-on.':'Podmiot występuje w rejestrze NCBR ('+(x.inferred?'jako uczestnik projektu':'jako instytucja finansująca')+').'):instMail?'Adres e-mail w domenie instytucjonalnej ('+esc(email.split('@')[1])+'). Do pełnej weryfikacji sprawdź podmiot w rejestrach.':'Brak potwierdzenia: prywatna skrzynka lub brak e-maila. Sprawdź podmiot w KRS, REGON lub POL-on.',links:[['KRS','https://wyszukiwarka-krs.ms.gov.pl/'],['REGON','https://wyszukiwarkaregon.stat.gov.pl/'],['POL-on','https://polon.nauka.gov.pl/']]});
  C.push({n:2,t:'Twierdzenia a źródła zewnętrzne',s:x.registry?'ok':(inn&&x.ip>0)?'warn':'na',x:x.registry?'Tytuł, program, budżet i okres pochodzą ze strony projektu w rejestrze NCBR (link w punkcie 3). Autorstwo i patenty sprawdź w bazach poniżej.':(inn&&x.ip>0)?'Zgłoszono ochronę własności. Sprawdź numer zgłoszenia lub patentu w bazie UPRP lub EPO oraz autorstwo w PBN.':'Brak twierdzeń do sprawdzenia w zewnętrznych bazach.',links:[['UPRP','https://ewyszukiwarka.pue.uprp.gov.pl/search/simple-search'],['EPO','https://register.epo.org/regviewer'],['PBN','https://pbn.nauka.gov.pl/core/#/home']]});
  C.push({n:3,t:'Dowody dołączone do ogłoszenia',s:x.url?'ok':'no',x:x.url?'Link pozwala sprawdzić opis; jego obecność nie potwierdza wszystkich twierdzeń ani skuteczności rozwiązania. Wynik kontroli źródła pokazano na karcie.':(inn&&x.hasDocs)?'Zadeklarowano dokumentację, ale nie dołączono linku ani pliku.':'Brak dowodów. Dodaj link, plik lub wskaż osobę, która może potwierdzić.',links:x.url?[['Strona źródłowa',x.url]]:[]});
  const iss=[];
  if(inn&&x.stage===4&&!x.url)iss.push('Etap „Wdrożona” bez dowodu.');
  if(inn&&x.estimated)iss.push('TRL, etap i poziom użycia są ocenami radaru na podstawie opisanych dowodów. '+scoreNotes(x).join(' '));
  if(inn){try{const a=analyze(x),s=a.sims&&a.sims[0];if(s&&!s.ref&&s.sim>=.5)iss.push('Możliwy duplikat: „'+s.title+'” ('+Math.round(s.sim*100)+'%).')}catch(e){}}
  if(!l)iss.push('Brak lokalizacji: ogłoszenie nie pojawi się na mapie.');else if(l.prec==='województwo')iss.push('Lokalizacja przybliżona: znane tylko województwo.');
  if(!inn&&x.inferred)iss.push('Oferta wywnioskowana z rejestru. Podmiot nie złożył jej sam.');
  if(!(x.cats||[]).length)iss.push('Brak kategorii.');
  C.push({n:4,t:'Poziom zaufania',s:lvl>=2?'ok':lvl===1?'warn':'no',x:TRUSTN[lvl]+(reps>=3?' (obniżony po zgłoszeniach)':'')+'. Poziom 3 wymaga potwierdzenia przez niezależną osobę, np. nauczyciela, opiekuna lub partnera.'});
  C.push({n:5,t:'Kontrola jakości treści',s:iss.length?'warn':'ok',x:iss.length?iss.join(' '):'Nie wykryto niespójności ani duplikatów.'});
  C.push({n:6,t:'Ochrona przed nadużyciami',s:reps?'warn':'ok',x:'Dane kontaktowe pochodzą z publicznych źródeł. Błędy i prośby o korektę można zgłaszać przyciskiem poniżej. Zgłoszeń: '+reps+'.'});
  const r={lvl,checks:C,reps,issues:iss};
  TCACHE.set(key,r);return r;
}
function trustPill(x){const t=trustOf(x);return '<span class="pill '+(t.lvl>=2?'good':t.lvl===1?'':'plain')+'" title="Poziom zaufania">'+t.lvl+'/3 '+TRUSTN[t.lvl]+'</span>'}
const TCOL=['#94a3b8','#f59e0b','#0f9d8c','#16a34a'];
function locBlock(x){
  const l=locOf(x);
  if(!l)return '<div class="alert" style="margin:10px 0">Brak lokalizacji. Dodaj województwo i miejscowość, aby ogłoszenie trafiło na mapę.</div>';
  const row=(k,v)=>'<div class="lab"><div class="k">'+k+'</div><div class="v">'+esc(v||'—')+'</div></div>';
  return '<div class="labels" style="margin:10px 0">'+row('Województwo',l.woj)+row('Miasto / wieś',l.mtyp?l.mtyp+(l.miejsc?': '+l.miejsc:''):l.miejsc)+'</div>'+(l.prec==='województwo'?'<p class="hint">Znane jest tylko województwo, więc punkt na mapie jest przybliżony (obrys przerywany).</p>':'<p class="hint">Punkt na mapie wskazuje miejscowość siedziby podmiotu wynikającą z rejestru lub formularza.</p>');
}
function trustBlock(x){
  const t=trustOf(x),mk={ok:'✓',warn:'!',no:'✗',na:'–'},cl={ok:'good',warn:'warn',no:'bad',na:'plain'};
  const steps=TRUSTN.map((n,i)=>'<span class="pill '+(i<=t.lvl?(i>=2?'good':''):'plain')+'" style="'+(i<=t.lvl?'':'opacity:.55')+'">'+i+'. '+n+'</span>').join(' ');
  const list=t.checks.map(c=>'<div class="mrow" style="display:block"><div class="row"><span class="pill '+cl[c.s]+'">'+mk[c.s]+'</span><b>'+c.n+'. '+c.t+'</b></div><p class="small" style="margin:6px 0 0">'+c.x+'</p>'+((c.links||[]).length?'<div class="row" style="margin-top:6px">'+c.links.map(k=>'<a class="btn ghost sm" href="'+esc(k[1])+'" target="_blank" rel="noopener">'+esc(k[0])+' ↗</a>').join('')+'</div>':'')+'</div>').join('');
  const open=S.repFor===x.id;
  const rep=open?'<div class="stack" style="margin-top:10px"><label for="rep-r">Powód zgłoszenia</label><select id="rep-r"><option>Nieprawdziwe dane</option><option>Niezgodne z rejestrem</option><option>Duplikat</option><option>Spam lub nadużycie</option><option>Inny problem</option></select><div class="row"><button class="btn sm" data-act="repsend" data-rid="'+x.id+'">Wyślij zgłoszenie</button><button class="btn ghost sm" data-act="rep" data-rid="'+x.id+'">Anuluj</button></div></div>':'<div class="row" style="margin-top:10px"><button class="btn ghost sm" data-act="rep" data-rid="'+x.id+'">Zgłoś nieprawidłowość</button></div>';
  const hist=(REPS[x.id]||[]).length?'<p class="hint" style="margin-top:8px">Historia zgłoszeń: '+REPS[x.id].map(r=>esc(r.t+' – '+r.r)).join('; ')+'</p>':'';
  return acc('zaufanie','Wiarygodność i weryfikacja',trustPill(x),'<div class="row" style="margin-bottom:10px">'+steps+'</div>'+list+rep+hist);
}
function pairTrust(inn,p,sc){
  const a=trustOf(inn).lvl,b=trustOf(p).lvl,m=Math.min(a,b);
  return {lvl:m,txt:m>=2&&sc>=50?'Para wiarygodna: oba podmioty są w rejestrze publicznym.':m>=2?'Oba podmioty w rejestrze, ale dopasowanie tematyczne jest słabe.':'Zweryfikuj podmiot o niższym poziomie zaufania (innowacja: '+a+'/3, inwestor: '+b+'/3) przed kontaktem.'};
}
function extAction(d){
  const a=d.act;
  if(d.demo!=null){const x=DEMO_ACCS[+d.demo];const e=$('l-email'),p=$('l-pw');if(e&&p){e.value=x.email;p.value=DEMO_PW}return true}
  if(!S.acct&&(d.contact||d.int||d.sendint||d.intact||['add','addoffer','aiall','del','delok'].includes(a))){S.modal='acct';S.acctMode='login';S.dd=null;S.drawer=null;S._on=false;renderTop();renderLayer(true);toast('Ta funkcja wymaga logowania. Użyj konta demo lub załóż konto.');return true}
  if(a==='rep'){S.repFor=S.repFor===d.rid?null:d.rid;renderLayer();return true}
  if(a==='repsend'){
    const r=($('rep-r')||{}).value||'Inny problem';
    (REPS[d.rid]=REPS[d.rid]||[]).push({t:now(),r});saveReps();TCACHE.clear();
    const inn=S.items.find(x=>x.id===d.rid);if(inn)log(inn,'Zgłoszono nieprawidłowość: '+r);
    S.repFor=null;AC.clear();renderLayer();toast('Dziękujemy. Zgłoszenie zapisano i trafi do moderacji.');return true;
  }
  return extAction2(d);
}

/* ====================== mapy Polski ====================== */
const KX=68.4,KY=111.2;
const PJ=(lat,lon)=>[(lon-19.1)*KX,(52.0-lat)*KY];
const PL_OUT=[[53.92,14.22],[54.03,14.45],[54.03,14.75],[54.08,15.0],[54.17,15.3],[54.18,15.57],[54.30,16.0],[54.43,16.39],[54.58,16.86],[54.76,17.55],[54.83,18.0],[54.83,18.33],[54.78,18.42],[54.60,18.80],[54.53,18.55],[54.38,18.68],[54.34,19.05],[54.40,19.45],[54.37,19.65],[54.40,19.85],[54.42,20.3],[54.36,20.75],[54.33,21.4],[54.35,22.0],[54.37,22.8],[54.20,22.85],[54.24,23.2],[54.05,23.5],[53.9,23.55],[53.6,23.9],[53.2,23.95],[52.7,23.85],[52.4,23.9],[52.08,23.6],[51.5,23.6],[51.17,23.83],[50.8,24.0],[50.55,24.1],[50.4,23.95],[50.35,23.7],[50.05,23.5],[49.8,22.95],[49.55,22.7],[49.1,22.85],[49.08,22.56],[49.3,22.0],[49.43,21.7],[49.4,21.0],[49.4,20.5],[49.2,20.0],[49.4,19.5],[49.55,19.15],[49.5,18.85],[49.7,18.7],[49.85,18.55],[50.0,18.2],[50.15,18.05],[50.3,17.7],[50.25,17.3],[50.2,16.85],[50.38,16.3],[50.6,16.3],[50.8,15.9],[50.9,15.35],[50.99,15.0],[50.87,14.82],[51.05,14.82],[51.4,14.73],[51.7,14.72],[52.05,14.7],[52.35,14.55],[52.6,14.65],[52.85,14.35],[53.0,14.38],[53.3,14.2],[53.55,14.2],[53.75,14.12],[53.88,14.15]];
const SEEDS={'dolnośląskie':[[51.15,16.0],[50.6,16.8]],'kujawsko-pomorskie':[[53.1,18.5]],'lubelskie':[[51.2,22.8],[51.7,22.8],[50.9,23.2]],'lubuskie':[[52.1,15.3]],'łódzkie':[[51.6,19.4]],'małopolskie':[[49.9,20.2]],'mazowieckie':[[52.65,20.2],[52.2,21.4],[51.6,21.1]],'opolskie':[[50.6,17.9]],'podkarpackie':[[50.0,22.2],[49.6,22.2]],'podlaskie':[[53.2,22.9]],'pomorskie':[[54.2,18.1],[53.9,17.4]],'śląskie':[[50.3,19.0],[50.8,19.1]],'świętokrzyskie':[[50.8,20.8]],'warmińsko-mazurskie':[[53.8,20.8]],'wielkopolskie':[[52.3,17.3],[52.0,18.2]],'zachodniopomorskie':[[53.4,15.6],[53.6,14.9]]};
let GEOBASE=null;
function clipHalf(poly,s,t,diff){
  /* zostaw punkty bliższe s niż t */
  const mx=(s[0]+t[0])/2,my=(s[1]+t[1])/2,nx=t[0]-s[0],ny=t[1]-s[1];
  const f=p=>(p[0]-mx)*nx+(p[1]-my)*ny; /* <=0 : po stronie s */
  const out=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],fa=f(a.p),fb=f(b.p),ina=fa<=0,inb=fb<=0;
    if(ina&&inb)out.push({p:a.p,fl:a.fl});
    else if(ina&&!inb){const u=fa/(fa-fb),I=[a.p[0]+(b.p[0]-a.p[0])*u,a.p[1]+(b.p[1]-a.p[1])*u];out.push({p:a.p,fl:a.fl});out.push({p:I,fl:diff?2:0})}
    else if(!ina&&inb){const u=fa/(fa-fb),I=[a.p[0]+(b.p[0]-a.p[0])*u,a.p[1]+(b.p[1]-a.p[1])*u];out.push({p:I,fl:a.fl})}
  }
  return out;
}
const WCOL=['#f7f4ec','#efeee4','#f9f6ef','#ecebe0'];
function buildGeoBase(){
  if(GEOBASE)return GEOBASE;
  {const W=Object.keys(GEOPOLY),all=W.map(w=>GEOPOLY[w]).join('');
   const fills=W.map((w,i)=>'<path d="'+GEOPOLY[w]+'" fill="'+WCOL[i%4]+'" data-gw="'+w+'" class="gwoj" stroke="#c3ccdf" stroke-width="1" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>').join('');
   GEOBASE='<path d="'+all+'" fill="#7d8db0" fill-opacity=".35" stroke="#9bb3d3" stroke-width="16" stroke-linejoin="round" opacity=".35" vector-effect="non-scaling-stroke" transform="translate(0 3)"/><path d="'+all+'" fill="none" stroke="#3d4a6b" stroke-width="4.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>'+fills+'<path d="'+all+'" fill="none" stroke="#34416a" stroke-width="0" />';
   return GEOBASE}
  const out=PL_OUT.map(c=>PJ(c[0],c[1]));
  const seeds=[];Object.keys(SEEDS).forEach((w,wi)=>SEEDS[w].forEach(c=>seeds.push({w,wi,p:PJ(c[0],c[1])})));
  let fills='',lines='';
  seeds.forEach((s,si)=>{
    let poly=out.map(p=>({p,fl:1}));
    seeds.forEach((t,ti)=>{if(ti!==si&&poly.length)poly=clipHalf(poly,s.p,t.p,t.w!==s.w)});
    if(poly.length<3)return;
    const d='M'+poly.map(v=>v.p[0].toFixed(1)+' '+v.p[1].toFixed(1)).join('L')+'Z';
    fills+='<path d="'+d+'" fill="'+WCOL[s.wi%4]+'" data-gw="'+s.w+'" class="gwoj"/>';
    for(let i=0;i<poly.length;i++){if(poly[i].fl===2){const a=poly[i].p,b=poly[(i+1)%poly.length].p;lines+='M'+a[0].toFixed(1)+' '+a[1].toFixed(1)+'L'+b[0].toFixed(1)+' '+b[1].toFixed(1)}}
  });
  const od='M'+out.map(p=>p[0].toFixed(1)+' '+p[1].toFixed(1)).join('L')+'Z';
  GEOBASE='<path d="'+od+'" fill="none" stroke="#9cc0e0" stroke-width="14" stroke-linejoin="round" opacity=".45" vector-effect="non-scaling-stroke"/><path d="'+od+'" fill="none" stroke="#b9d4ec" stroke-width="30" stroke-linejoin="round" opacity=".3" vector-effect="non-scaling-stroke"/><g>'+fills+'</g><path d="'+lines+'" fill="none" stroke="#cdc6b4" stroke-width="1" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/><path d="'+od+'" fill="none" stroke="#8a9bb0" stroke-width="1.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>';
  return GEOBASE;
}
const GEO={kind:'inn',z:1,tx:0,ty:0,W:900,H:560,s0:.8,sel:null,drag:null,list:[],cl:{}};
const geoItems=kind=>kind==='inn'?filterInn(vis()).map(r=>r.i):filterInv(allInvestors()).map(r=>r.p);
const geoK=()=>GEO.s0*GEO.z;
function renderGeo(kind){
  GEO.kind=kind;GEO.sel=null;
  const lab=kind==='inn'?'innowacji':'inwestorów i ofert';
  return '<div class="geo" id="geo"><div class="geomap" id="geomap"><svg id="gsvg" role="img" aria-label="Interaktywna mapa Polski: '+lab+'" xmlns="http://www.w3.org/2000/svg"><g id="gbase"></g><g id="gm"></g></svg>'+
   '<div class="geoctl"><button data-gz="in" aria-label="Przybliż">+</button><button data-gz="out" aria-label="Oddal">−</button><button data-gz="reset" aria-label="Cała Polska" style="font-size:13px">⌂</button></div>'+
   '<div class="geonote">Przeciągnij mapę, aby ją przesunąć, przewiń, aby przybliżyć, i kliknij województwo, aby filtrować.</div></div>'+
   '<div class="geoside" id="geoside"></div></div>';
}
function initGeo(){
  const el=$('geo'),svg=$('gsvg');if(!el||!svg)return;
  const r=$('geomap').getBoundingClientRect();GEO.W=Math.max(320,r.width||900);GEO.H=Math.max(380,r.height||560);
  svg.setAttribute('viewBox','0 0 '+GEO.W+' '+GEO.H);
  GEO.s0=Math.min(GEO.W/760,GEO.H/690);GEO.z=1;GEO.tx=GEO.W/2;GEO.ty=GEO.H/2-10*GEO.s0;
  $('gbase').innerHTML=buildGeoBase();
  geoBind(el,svg);geoDraw();geoPanel();
}
function geoTransform(){const k=geoK();const g=$('gbase');if(g)g.setAttribute('transform','translate('+GEO.tx.toFixed(1)+','+GEO.ty.toFixed(1)+') scale('+k.toFixed(4)+')')}
function geoClamp(){const k=geoK(),w=GEO.W,h=GEO.H,m=100;
  GEO.tx=Math.max(m-345*k,Math.min(w-m+345*k,GEO.tx));GEO.ty=Math.max(m-335*k,Math.min(h-m+315*k,GEO.ty))}
function geoZoomAt(f,px,py){
  const z0=GEO.z,z1=Math.max(1,Math.min(16,z0*f));if(z1===z0)return;
  const k0=geoK(),wx=(px-GEO.tx)/k0,wy=(py-GEO.ty)/k0;GEO.z=z1;const k1=geoK();GEO.tx=px-wx*k1;GEO.ty=py-wy*k1;geoClamp();geoDraw();
}
const BIGC=[['Warszawa',52.23,21.01,1],['Kraków',50.06,19.94,1],['Gdańsk',54.35,18.65,1],['Wrocław',51.11,17.04,1],['Poznań',52.41,16.93,1],['Łódź',51.76,19.46,1],['Szczecin',53.43,14.55,1],['Lublin',51.25,22.57,1],['Katowice',50.26,19.02,1],['Rzeszów',50.04,22.0,1],['Białystok',53.13,23.16,1],['Bydgoszcz',53.12,18.01,1],['Olsztyn',53.78,20.49,1],['Opole',50.67,17.93,1],['Kielce',50.87,20.63,1],['Zielona Góra',51.94,15.51,1],['Gorzów Wlkp.',52.74,15.24,1],['Toruń',53.01,18.6,1],
['Wałbrzych',50.78,16.28,2],['Legnica',51.21,16.16,2],['Jelenia Góra',50.90,15.73,3],['Włocławek',52.65,19.07,2],['Grudziądz',53.48,18.75,3],['Zamość',50.72,23.25,2],['Chełm',51.14,23.47,3],['Biała Podlaska',52.03,23.12,3],['Piotrków Tryb.',51.40,19.70,2],['Pabianice',51.66,19.35,3],['Tomaszów Maz.',51.53,20.01,3],['Tarnów',50.01,20.99,2],['Nowy Sącz',49.62,20.70,2],['Oświęcim',50.04,19.22,3],['Radom',51.40,21.15,2],['Płock',52.55,19.70,2],['Siedlce',52.17,22.29,3],['Kędzierzyn-Koźle',50.35,18.22,3],['Nysa',50.47,17.33,3],['Przemyśl',49.78,22.77,2],['Krosno',49.69,21.77,3],['Mielec',50.29,21.42,3],['Suwałki',54.10,22.93,2],['Łomża',53.18,22.07,3],['Gdynia',54.52,18.53,2],['Słupsk',54.46,17.03,2],['Częstochowa',50.81,19.12,2],['Bielsko-Biała',49.82,19.06,2],['Gliwice',50.29,18.67,3],['Rybnik',50.10,18.55,3],['Ostrowiec Św.',50.93,21.39,3],['Elbląg',54.16,19.40,2],['Ełk',53.83,22.36,3],['Kalisz',51.76,18.09,2],['Konin',52.22,18.25,3],['Leszno',51.84,16.58,3],['Koszalin',54.19,16.17,2]];
function geoDraw(){
  geoTransform();
  const k=geoK();{const F0_=GEO.kind==='inn'?S.f:S.fi;document.querySelectorAll('.gwoj').forEach(e=>{e.style.fill=F0_.woj&&e.dataset.gw===F0_.woj?'#dfe8ff':''})}
  /* miasta jako tło orientacyjne */
  let cityH='';const list=geoItems(GEO.kind);GEO.list=list;GEO.cl={};
  const pts=[];let none=0,approx=0;
  list.forEach(x=>{const l=locOf(x);if(!l){none++;return}if(l.prec==='województwo')approx++;const w=PJ(l.lat,l.lon);pts.push({x,l,px:GEO.tx+w[0]*k,py:GEO.ty+w[1]*k})});
  GEO.none=none;GEO.approx=approx;GEO.n=pts.length;

  {const ic={};pts.forEach(p=>{if(p.l.prec==='miejscowość'&&p.l.miejsc){const e=ic[p.l.miejsc]||(ic[p.l.miejsc]={n:0,lat:p.l.lat,lon:p.l.lon});e.n++}});
   const shown=new Set();let ch='';
   const put=(name,lat,lon,n,tier)=>{const w=PJ(lat,lon),x=GEO.tx+w[0]*k,y=GEO.ty+w[1]*k;if(x<-360||x>GEO.W+360||y<-360||y>GEO.H+360)return;
    ch+='<circle cx="'+x.toFixed(0)+'" cy="'+y.toFixed(0)+'" r="'+(n?3:2.4)+'" fill="'+(n?'#2f3b5c':'#7b869c')+'"/><text x="'+x.toFixed(0)+'" y="'+(y+(n?-8:-6)).toFixed(0)+'" text-anchor="middle" font-size="'+(n?12:10.5)+'" font-weight="'+(n?700:500)+'" fill="'+(n?'#1f2a4a':'#6b768d')+'" style="pointer-events:none;paint-order:stroke;stroke:#f9f6ef;stroke-width:3.5px;stroke-linejoin:round">'+esc(name)+(n?' ('+n+')':'')+'</text>'};
   Object.keys(ic).forEach(c=>{shown.add(c)});
   BIGC.forEach(c=>{if(shown.has(c[0])||(c[3]>1&&GEO.z<(c[3]===2?1.5:2.6)))return;put(c[0],c[1],c[2],0,c[3])});
   cityH=ch}
  GEO.visList=pts.filter(p=>p.px>0&&p.px<GEO.W&&p.py>0&&p.py<GEO.H).map(p=>p.x);
  const vis_=pts.filter(p=>p.px>-360&&p.px<GEO.W+360&&p.py>-360&&p.py<GEO.H+360);
  const spread=GEO.z>=5;
  let items=[];
  if(spread){
    const grp={};vis_.forEach(p=>{const kk=Math.round(p.px/6)+':'+Math.round(p.py/6);(grp[kk]=grp[kk]||[]).push(p)});
    Object.values(grp).forEach(g=>g.forEach((p,i)=>{if(g.length>1){const a=i/g.length*Math.PI*2-Math.PI/2,rr=20+g.length*2.2;p.px+=Math.cos(a)*rr;p.py+=Math.sin(a)*rr}items.push({one:p})}));
  }else{
    const cell=72,cs={};
    vis_.forEach(p=>{const kk=Math.floor((p.px-GEO.tx)/cell)+':'+Math.floor((p.py-GEO.ty)/cell);(cs[kk]=cs[kk]||[]).push(p)});
    Object.keys(cs).forEach(kk=>{const g=cs[kk];if(g.length===1)items.push({one:g[0]});else{const cx=g.reduce((s,p)=>s+p.px,0)/g.length,cy=g.reduce((s,p)=>s+p.py,0)/g.length;items.push({cl:g,cx,cy,key:kk})}});
  }
  const col=GEO.kind==='inn'?'#4f6bed':'#0f9d8c';
  let h=cityH;
  /* etykiety województw */
  const cnt={};pts.forEach(p=>cnt[p.l.woj]=(cnt[p.l.woj]||0)+1);
  const F=GEO.kind==='inn'?S.f:S.fi;
  Object.keys(WOJC).forEach(w=>{const c=PJ(WOJC[w][0],WOJC[w][1]),x=GEO.tx+c[0]*k,y=GEO.ty+c[1]*k;if(x<-60||x>GEO.W+60||y<-20||y>GEO.H+20)return;h+='<text x="'+x.toFixed(0)+'" y="'+(y+30).toFixed(0)+'" text-anchor="middle" font-size="11" font-weight="'+(F.woj===w?800:600)+'" fill="'+(F.woj===w?'#3a54d8':'#8a94ad')+'" style="pointer-events:none;paint-order:stroke;stroke:#fff;stroke-width:3px">'+w+(cnt[w]?' ('+cnt[w]+')':'')+'</text>'});
  const LB=[];const cityOf=p=>(p.l.prec==='miejscowość'&&p.l.miejsc)?p.l.miejsc:'';
  const lbl=(g,x,y,r)=>{const c={};g.forEach(p=>{const n=cityOf(p);if(n)c[n]=(c[n]||0)+1});const ks=Object.keys(c).sort((a,b)=>c[b]-c[a]);if(!ks.length)return;LB.push('<text x="'+x.toFixed(0)+'" y="'+(y+r+13).toFixed(0)+'" text-anchor="middle" font-size="12" font-weight="700" fill="#1f2a4a" style="pointer-events:none;paint-order:stroke;stroke:#fff;stroke-width:4px;stroke-linejoin:round">'+esc(ks[0])+(ks.length>1?' +'+(ks.length-1):'')+'</text>')};
  items.forEach(it=>{
    if(it.one){
      const p=it.one,x=p.x,t=trustOf(x),sel=GEO.sel&&GEO.sel.id===x.id;
      GEO.cl['o:'+x.id]=[x];lbl([p],p.px,p.py,13);
      h+='<g class="gmk" data-gi="'+esc(x.id)+'" transform="translate('+p.px.toFixed(1)+','+p.py.toFixed(1)+')" tabindex="0" role="button" aria-label="'+esc(x.title||x.name)+'">'+
       (p.l.prec==='województwo'?'<circle r="18" fill="none" stroke="'+col+'" stroke-width="1.6" stroke-dasharray="3 3"/>':'')+
       (sel?'<circle r="21" fill="none" stroke="#111827" stroke-width="2"/>':'')+
       (GEO.kind==='inn'?'<circle r="13" fill="'+typCol(x)+'" stroke="#fff" stroke-width="2.4"/>':'<rect x="-13" y="-13" width="26" height="26" rx="8" fill="'+col+'" stroke="#fff" stroke-width="2.4"/><text y="3.5" text-anchor="middle" font-size="10" font-weight="800" fill="#fff" style="pointer-events:none">zł</text>')+
       '<circle cx="10" cy="-10" r="4.6" fill="'+TCOL[t.lvl]+'" stroke="#fff" stroke-width="1.6"/></g>';
    }else{
      const n=it.cl.length,r=15+Math.min(14,Math.sqrt(n)*3.4);let ccol=col;if(GEO.kind==='inn'){const cc={};it.cl.forEach(p=>{const k=typCol(p.x);cc[k]=(cc[k]||0)+1});ccol=Object.keys(cc).sort((a,b)=>cc[b]-cc[a])[0]}
      GEO.cl['c:'+it.key]=it.cl.map(p=>p.x);lbl(it.cl,it.cx,it.cy,r);
      h+='<g class="gmk" data-gc="'+it.key+'" transform="translate('+it.cx.toFixed(1)+','+it.cy.toFixed(1)+')" tabindex="0" role="button" aria-label="Grupa: '+n+'"><circle r="'+r.toFixed(1)+'" fill="'+ccol+'" fill-opacity=".92" stroke="#fff" stroke-width="3"/><text y="4.5" text-anchor="middle" font-size="13" font-weight="800" fill="#fff" style="pointer-events:none">'+n+'</text></g>';
    }
  });
  $('gm').removeAttribute('transform');GEO.dtx=GEO.tx;GEO.dty=GEO.ty;
  $('gm').innerHTML=h+LB.join('');
  const c=$('cnt');if(c)c.textContent=pts.length+(GEO.kind==='inn'?' innowacji':' inwestorów')+' na mapie';
  if(GEO.kind==='inn'&&!GEO.sel){const key=(GEO.visList||[]).map(x=>x.id).join(',');if(key!==GEO.lk){GEO.lk=key;geoPanel()}}
}
const TYPC={'Patent':'#e0a02a','Projekt B+R':'#4f6bed','Prototyp':'#8b5cf6','Infrastruktura badawcza':'#0ea5e9','Program edukacyjny':'#0f9d8c','Usługa publiczna':'#ef6c4d','Procedura i usługa zdrowotna':'#d6336c'};
const typCol=x=>TYPC[typOf(x)]||'#4f6bed';
function geoListHtml(){
  const L=GEO.visList||[];
  return '<div class="row between" style="flex-wrap:nowrap;margin-bottom:8px"><b>'+L.length+' innowacji w widoku mapy</b></div><div class="legend" style="display:flex;flex-wrap:wrap;gap:4px 12px;margin-bottom:10px;font-size:12px">'+TYP_ORDER.map(t=>'<span><i class="ldot" style="background:'+TYPC[t]+'"></i>'+esc(t)+'</span>').join('')+'</div><div class="gl">'+
   (L.length?L.slice(0,60).map(x=>{const l=locOf(x)||{};return '<button class="gli" data-gsel="'+esc(x.id)+'"><span class="gt">'+esc(x.title)+'</span><span class="gs">'+esc(x.institution)+'</span><span class="gs">'+esc(l.miejsc||'')+(l.woj?(l.miejsc?', ':'')+esc(l.woj):'')+'</span><span class="gp"><i style="background:'+typCol(x)+'1f;color:'+typCol(x)+'">'+esc(typOf(x))+'</i></span></button>'}).join(''):'<p class="muted small">Przesuń lub oddal mapę, aby zobaczyć innowacje.</p>')+'</div>';
}
function geoRefresh(){if(!$('gm'))return;geoDraw();geoPanel();refreshChrome()}
function geoCard(x){
  const inn=isInn(x),l=locOf(x)||{},id=x.id;
  const row=(k,v)=>v?'<div class="small"><span class="muted">'+k+':</span> '+esc(v)+'</div>':'';
  return '<div class="stack" style="gap:8px"><div class="row between" style="flex-wrap:nowrap"><span class="pill'+(inn?'':' good')+'">'+(inn?'Innowacja':esc(x.kind))+'</span><button class="x" data-gsel="" aria-label="Zamknij">×</button></div><h3 style="margin:0;font-size:16px">'+esc(x.title||x.name)+'</h3>'+
   (inn?row('Instytucja',x.institution)+row('Program',x.programme)+row('Okres',x.period)+row('Etap',STAGES[x.stage]):row('Opis',x.benefit))+
   '<div style="border-top:1px solid var(--line);padding-top:8px">'+row('Województwo',l.woj)+row('Miasto / wieś',l.mtyp?l.mtyp+(l.miejsc?' ('+l.miejsc+')':''):l.miejsc)+(l.prec==='województwo'?'<div class="hint">Pozycja przybliżona: znane tylko województwo.</div>':'')+'</div>'+
   '<div>'+trustPill(x)+'</div><button class="btn sm" data-open="'+(inn?'inn':'inv')+':'+esc(id)+'">Szczegóły i weryfikacja</button></div>';
}
function geoPanelLight(){
  const sd=$('geoside');if(!sd||GEO.sel)return;
}
function geoPanel(){
  const sd=$('geoside');if(!sd)return;
  const s=GEO.sel;
  if(s&&s.list){
    sd.innerHTML='<div class="row between" style="flex-wrap:nowrap"><b>Grupa: '+s.list.length+'</b><button class="x" data-gsel="" aria-label="Zamknij">×</button></div><div class="stack" style="gap:6px;margin-top:8px">'+s.list.slice(0,40).map(x=>'<button class="ddi" data-gsel="'+esc(x.id)+'"><span>'+esc(x.title||x.name)+'</span>'+trustPill(x)+'</button>').join('')+(s.list.length>40?'<p class="hint">Pokazano 40 z '+s.list.length+'. Przybliż mapę.</p>':'')+'</div>';sd.style.display='';return;
  }
  if(s&&s.id){const x=GEO.list.find(y=>y.id===s.id)||(GEO.kind==='inn'?S.items:allInvestors()).find(y=>y.id===s.id);if(x){sd.innerHTML=geoCard(x);sd.style.display='';return}}
  if(GEO.kind==='inn'){sd.innerHTML=geoListHtml();sd.style.display='';return}
  const F=GEO.kind==='inn'?S.f:S.fi;
  const cnt={};GEO.list.forEach(x=>{const w=LW(x);if(w)cnt[w]=(cnt[w]||0)+1});
  const top=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]);
  const max=top.length?cnt[top[0]]:1;
  const tl=[0,1,2,3].map(i=>'<span><i class="ldot" style="background:'+TCOL[i]+'"></i>'+i+' '+TRUSTN[i]+'</span>').join('');
  sd.innerHTML='<div class="stack" style="gap:10px"><b>'+(GEO.kind==='inn'?'Mapa innowacji':'Mapa inwestorów i ofert')+'</b><div class="small muted">'+GEO.n+' na mapie'+(GEO.approx?' · w tym '+GEO.approx+' z pozycją przybliżoną':'')+(GEO.none?' · '+GEO.none+' bez lokalizacji':'')+'</div>'+
   '<div class="stack" style="gap:4px">'+top.map(w=>'<button class="ddi" data-gw2="'+w+'" style="'+(F.woj===w?'background:var(--accent-soft)':'')+'"><span>'+w+'</span><span class="pill plain">'+cnt[w]+'</span></button>').join('')+'</div>'+
   '<div class="legend" style="margin-top:2px"><span>'+(GEO.kind==='inn'?'<i class="ldot" style="background:#4f6bed"></i>innowacja':'<i class="ldot" style="background:#0f9d8c;border-radius:4px"></i>inwestor lub oferta')+'</span><span><i class="ldot" style="border:1.6px dashed #64748b;background:none"></i>pozycja przybliżona (województwo)</span>'+tl+'</div></div>';
  sd.style.display='';
}
function geoSelect(sel){GEO.sel=sel;geoDraw();geoPanel()}
function geoWoj(w){const F=GEO.kind==='inn'?S.f:S.fi;F.woj=F.woj===w?'':w;geoDraw();geoPanel();refreshChrome()}
function geoBind(el,svg){
  svg.onwheel=e=>{e.preventDefault();const r=svg.getBoundingClientRect();geoZoomAt(e.deltaY<0?1.25:.8,e.clientX-r.left,e.clientY-r.top)};
  svg.onpointerdown=e=>{
    const r=svg.getBoundingClientRect();
    GEO.drag={x:e.clientX,y:e.clientY,tx:GEO.tx,ty:GEO.ty,moved:0,t:e.target,id:e.pointerId};
    try{svg.setPointerCapture(e.pointerId)}catch(_){}
  };
  svg.onpointermove=e=>{const d=GEO.drag;if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;d.moved=Math.max(d.moved,Math.abs(dx)+Math.abs(dy));if(d.moved>4){GEO.tx=d.tx+dx;GEO.ty=d.ty+dy;geoClamp();if(!d.raf){d.raf=1;raf(()=>{if(GEO.drag)GEO.drag.raf=0;geoTransform();const gm=$('gm');if(gm)gm.setAttribute('transform','translate('+(GEO.tx-GEO.dtx).toFixed(1)+' '+(GEO.ty-GEO.dty).toFixed(1)+')')})}}};
  svg.onpointerup=e=>{
    const d=GEO.drag;GEO.drag=null;if(!d)return;
    try{svg.releasePointerCapture(d.id)}catch(_){}
    if(d.moved>4){geoDraw();return}
    const t=d.t&&d.t.closest?d.t.closest('.gmk,.gwoj'):null;if(!t)return;
    if(t.dataset.gi){return geoSelect({id:t.dataset.gi})}
    if(t.dataset.gc){const list=GEO.cl['c:'+t.dataset.gc]||[];const r=svg.getBoundingClientRect();
      const tr=t.getAttribute('transform').match(/translate\(([-\d.]+),([-\d.]+)\)/);
      if(GEO.z<5&&tr){GEO.sel=null;geoZoomAt(2.2,+tr[1],+tr[2]);geoPanel()}else geoSelect({list});return}
    if(t.dataset.gw)geoWoj(t.dataset.gw);
  };
  el.onclick=e=>{
    const b=e.target.closest('[data-gz]');
    if(b){const z=b.dataset.gz;if(z==='reset'){const w=GEO.W,h=GEO.H;GEO.z=1;GEO.tx=w/2;GEO.ty=h/2-10*GEO.s0;geoDraw()}else geoZoomAt(z==='in'?1.6:.62,GEO.W/2,GEO.H/2);return}
    const g=e.target.closest('[data-gsel]');
    if(g){const id=g.dataset.gsel;if(!id){GEO.sel=null;geoDraw();geoPanel()}else{GEO.sel={id};geoDraw();geoPanel()}return}
    const w=e.target.closest('[data-gw2]');if(w)geoWoj(w.dataset.gw2);
  };
  el.onmouseover=e=>{const b=e.target.closest&&e.target.closest('.gli');document.querySelectorAll('.gmk.hl').forEach(g=>g.classList.remove('hl'));if(b){const g=document.querySelector('.gmk[data-gi="'+b.dataset.gsel+'"]');if(g)g.classList.add('hl')}};
  el.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.classList&&e.target.classList.contains('gmk')){e.preventDefault();const t=e.target;if(t.dataset.gi)geoSelect({id:t.dataset.gi})}};
}
window.addEventListener('resize',()=>{if($('geo')&&(S.view==='mapinn'||S.view==='mapinv')&&!S.page){const z=GEO.z;initGeo();}});
