/* ====================== UI: stan, pomocnicze ====================== */
let S={aud:'all',cmp:[],acct:null,acctMode:'reg',role:null,view:'inn',page:null,drawer:null,modal:null,dd:null,sec:{},_on:false,sbOpen:false,sbIdx:-1,sbN:0,q:'',
  f:F0(),fi:FI0(),sel:null,draft:null,addMode:'form',txt:'',showCard:false,openInt:null,
  gmin:55,gtopics:true,gsel:null,
  inv:{name:'Mój profil inwestora',person:'',email:'',phone:'',city:'',tags:[],types:[],smin:0,smax:4,min:45,dup:false}};
try{const r=localStorage.getItem(KEY);if(r){const p=JSON.parse(r);if(p&&p.items&&p.items.length)S.items=p.items;if(p&&p.inv)S.inv=Object.assign(S.inv,p.inv)}}catch(e){}
if(!S.items||!S.items.length)S.items=demoData();
const hasSrc=i=>/^https?:\/\//.test(String(i&&i.url||''));
S.items=S.items.filter(hasSrc);
DETECTED_ITEMS.forEach(d=>{if(!S.items.some(x=>x.id===d.id||(x.url&&x.url===d.url)))S.items.push(JSON.parse(JSON.stringify(d)))});
S.items.forEach(enrich);
S.sel=S.items[0].id;
const $=id=>document.getElementById(id);
const raf=(typeof requestAnimationFrame==='function')?requestAnimationFrame:(f=>setTimeout(f,16));
const opts=(arr,sel)=>arr.map((a,i)=>'<option value="'+i+'"'+(i===sel?' selected':'')+'>'+esc(a)+'</option>').join('');
const optsS=(arr,sel)=>arr.map(a=>'<option'+(a===sel?' selected':'')+'>'+esc(a)+'</option>').join('');
function optList(vals){const m={};vals.forEach(v=>m[v]=(m[v]||0)+1);return Object.keys(m).sort((a,b)=>a.localeCompare(b,'pl')).map(v=>[v,m[v]])}
const IC={
  search:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  logo:'<svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b7cfa"/><stop offset="1" stop-color="#14b8a6"/></linearGradient></defs><circle cx="16" cy="16" r="14" fill="none" stroke="url(#lg)" stroke-width="2.2"/><circle cx="16" cy="16" r="8" fill="none" stroke="url(#lg)" stroke-width="1.6" opacity=".6"/><circle cx="16" cy="16" r="2.2" fill="url(#lg)"/><g class="sweep"><path d="M16 16 L16 2 A14 14 0 0 1 28 9 Z" fill="#4f6bed" opacity=".22"/></g><circle cx="22" cy="10" r="2.2" fill="#0f9d8c"/></svg>',
  radar:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12l6-6"/></svg>',
  coin:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>'
};
function ring(v,size,cls){
  const c=2*Math.PI*16,col=cls==='good'?'#0f9d8c':cls==='warn'?'#e0a02a':cls==='bad'?'#d9485f':'#4f6bed';
  return '<span class="ring" style="width:'+size+'px;height:'+size+'px"><svg width="'+size+'" height="'+size+'" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" fill="none" stroke="#e8ecf7" stroke-width="4"/><circle cx="20" cy="20" r="16" fill="none" stroke="'+col+'" stroke-width="4" stroke-linecap="round" stroke-dasharray="'+(Math.max(0,Math.min(100,v))/100*c).toFixed(1)+' '+c.toFixed(1)+'" transform="rotate(-90 20 20)"/></svg><b class="num">'+v+'</b></span>';
}
const fitCls=sc=>sc>=70?'good':sc>=50?'':'warn';
function ddMenu(id,label,panel,o){o=o||{};const open=S.dd===id;
  return '<div class="dd"><button class="'+(o.cls||'btn ghost sm')+'" data-dd="'+id+'" aria-haspopup="true" aria-expanded="'+open+'">'+label+'<span class="chev"></span></button>'+(open?'<div class="ddp'+(o.wide?' wide':'')+'">'+panel+'</div>':'')+'</div>';
}
function acc(id,title,badge,html){
  const open=!!S.sec[id];
  return '<div class="acc"><button class="acch" data-sec="'+id+'" aria-expanded="'+open+'"><span>'+title+'</span><span>'+(badge||'')+'<span class="chev"></span></span></button>'+(open?'<div class="accb">'+html+'</div>':'')+'</div>';
}
function contactBlock(c,masked){
  const r=(k,v)=>v?'<dt>'+k+'</dt><dd>'+esc(v)+'</dd>':'';
  const em=c.email?(masked?maskEmail(c.email):c.email):'',ph=c.phone?(masked?maskPhone(c.phone):c.phone):'';
  return '<dl class="contact">'+r('Osoba / jednostka',c.person)+r('E-mail',em)+r('Telefon',ph)+r('Miasto',c.city)+(c.web?'<dt>Strona projektu</dt><dd>'+esc(c.web)+'</dd>':'')+(c.pub?'<dt>Źródło kontaktu</dt><dd>'+esc(c.pub)+'</dd>':'')+'</dl>';
}
function innContact(i,l){return {person:i.creators||(i.registry==='NCBR'?'Zespół projektu – '+i.institution:''),email:i.contact,phone:i.phone,city:l.city,web:(i.registry==='NCBR'&&i.url)?i.url.replace(/^https?:\/\//,''):'',pub:i.contactPublic?i.contactSrc:''}}
const pendCount=()=>S.items.reduce((n,i)=>n+i.interests.filter(x=>x.status==='oczekuje').length,0);
function clearFilters(){S.q='';S.f=F0();S.fi=FI0()}

/* ====================== wyszukiwarka i filtry ====================== */
function searchBox(ph,big){
  return '<div class="sb" id="sb"><span class="sicon">'+IC.search+'</span><input id="q" type="text" role="combobox" aria-expanded="false" aria-controls="sdrop" aria-autocomplete="list" autocomplete="off" aria-label="'+esc(ph)+'" placeholder="'+esc(ph)+'" value="'+esc(S.q)+'"><div class="sdrop" id="sdrop" role="listbox" hidden></div></div>';
}
function filterDefs(){
  if(S.view==='invs'||S.view==='mapinv'){
    const items=allInvestors();
    return locDefs(items,S.fi,'fi').concat([['fi.dz','Dziedzina',S.fi.dz,optList(items.flatMap(p=>domainsOf(p.tags)))],['fi.city','Miasto',S.fi.city,optList(items.map(p=>p.city))],['fi.kind','Rodzaj',S.fi.kind,optList(items.map(p=>p.kind))]]);
  }
  const items=vis(),L=items.map(i=>analyze(i).lab);
  return [['f.dz','Dziedzina',S.f.dz,optList(L.map(l=>l.dz))],['f.city','Miasto',S.f.city,optList(L.map(l=>l.city))],['f.dep','Możliwość wdrożenia',S.f.dep,optList(L.map(l=>l.dep))],['f.iss','Kto wstawił',S.f.iss,optList(L.map(l=>l.iss))],['f.stage','Etap rozwoju',S.f.stage,optList(items.map(i=>STAGES[i.stage]))],['f.cat','Kategoria',S.f.cat,optList(items.flatMap(i=>i.cats||[]))],['f.rodzaj','Rodzaj',S.f.rodzaj,optList(items.map(i=>RODZAJE[i.rodzaj]).filter(Boolean))],['f.origin','Powstała w',S.f.origin,optList(items.map(i=>ORIGINS[i.origin]).filter(Boolean))]].concat(locDefs(items,S.f,'f')).concat(S.acct&&S.role==='inst'?[['f.mine','Zgłoszenia',S.f.mine,[['Tylko moje',items.filter(i=>i.owner===S.acct.email).length]]]]:[]);
}
function selBox(key,label,cur,list){return '<div><label for="flt-'+key+'">'+label+'</label><select id="flt-'+key+'" data-flt="'+key+'"><option value="">Wszystkie</option>'+list.map(x=>'<option value="'+esc(x[0])+'"'+(x[0]===cur?' selected':'')+'>'+esc(x[0])+' ('+x[1]+')</option>').join('')+'</select></div>'}
function hasFilters(){const o=(S.view==='invs'||S.view==='mapinv')?S.fi:S.f;return !!S.q||Object.keys(o).some(k=>o[k])}
function filterInn(items){
  const qt=stemq(S.q),f=S.f;
  return items.map(i=>{const a=analyze(i),l=a.lab;
    if(f.dz&&l.dz!==f.dz)return null;if(f.city&&l.city!==f.city)return null;if(f.dep&&l.dep!==f.dep)return null;if(f.iss&&l.iss!==f.iss)return null;if(f.stage&&STAGES[i.stage]!==f.stage)return null;if(f.cat&&!(i.cats||[]).includes(f.cat))return null;if(f.rodzaj&&RODZAJE[i.rodzaj]!==f.rodzaj)return null;if(f.origin&&ORIGINS[i.origin]!==f.origin)return null;if(!locPass(i,f))return null;if(f.mine&&(!S.acct||i.owner!==S.acct.email))return null;
    const r=searchRank(qt,[{text:i.title,w:3},{text:l.topic+' '+l.dz+' '+(i.tags||[]).join(' ')+' '+(i.cats||[]).join(' '),w:2},{text:[RODZAJE[i.rodzaj],ORIGINS[i.origin],i.benefit,i.institution,l.city,l.iss,l.dep,i.problem,i.description,i.creators].join(' '),w:1}]);
    return r?{i,a,l,r}:null}).filter(Boolean);
}
function filterInv(list){
  const qt=stemq(S.q),f=S.fi;
  return list.map(p=>{const dzs=domainsOf(p.tags);
    if(f.dz&&!dzs.includes(f.dz))return null;if(f.city&&p.city!==f.city)return null;if(f.kind&&p.kind!==f.kind)return null;if(!locPass(p,f))return null;
    const r=searchRank(qt,[{text:p.name,w:3},{text:p.tags.join(' ')+' '+dzs.join(' ')+' '+p.kind+' '+(p.cats||[]).join(' '),w:2},{text:[p.benefit,p.d,p.city,p.person,p.types.join(' ')].join(' '),w:1}]);
    return r?{p,dzs,r}:null}).filter(Boolean);
}
function filterInvRaw(){const s=S.fi;S.fi=FI0();const r=filterInv(allInvestors());S.fi=s;return r}
function filterInnRaw(){const s=S.f;S.f=F0();const r=filterInn(vis());S.f=s;return r}
function countText(n,total){
  let t='<b>'+n+'</b> z '+total;
  if(hasFilters())t+=' · <button class="linkbtn" data-act="clr">wyczyść</button>';
  if(S.q){
    if(S.view==='inn'&&S.role==='inst'){const m=filterInvRaw().length;if(m)t+=' · <button class="linkbtn" data-view="invs">'+m+' w inwestorach</button>'}
    if(S.view==='invs'){const m=filterInnRaw().length;if(m)t+=' · <button class="linkbtn" data-view="inn">'+m+' w innowacjach</button>'}
  }
  return t;
}
const empty=txt=>'<div class="empty"><b>Brak wyników</b>'+txt+' <button class="linkbtn" data-act="clr">Wyczyść wyszukiwanie i filtry</button></div>';
function innCard(r){
  const i=r.i,a=r.a,l=r.l,pend=i.interests.filter(x=>x.status==='oczekuje').length;
  return '<button class="card" data-open="inn:'+i.id+'"><div class="ctop"><div><span class="pill">'+esc(l.dz)+'</span>'+(i.detected?' <span class="pill plain" title="Znalezione automatycznie w publicznym źródle, jeszcze niezweryfikowane">Wykryte '+esc(i.discoveredAt)+'</span>':'')+'<h3 style="margin-top:8px">'+esc(i.title)+'</h3></div>'+ring(a.score,46,lvl(a.score))+'</div><div class="meta">'+esc(i.institution)+' · '+esc(l.city)+'</div><div class="cfoot"><span class="pill plain">'+STAGES[i.stage]+'</span>'+(RODZAJE[i.rodzaj]?'<span class="pill plain">'+esc(RODZAJE[i.rodzaj])+'</span>':'')+(i.cats||[]).map(c=>'<span class="pill plain">'+esc(c)+'</span>').join('')+(pend?'<span class="pill ask">'+pend+' zapytanie</span>':'')+(i.public?'':'<span class="pill plain">ukryta</span>')+(S.acct&&i.owner===S.acct.email?'<span class="pill good">Twoja</span>':'')+'</div></button>';
}
function offerCard(r){
  const i=r.i,a=r.a,l=r.l,q=myInterest(i);
  return '<button class="card" data-open="inn:'+i.id+'"><div class="ctop"><div><span class="pill">'+esc(l.dz)+'</span><h3 style="margin-top:8px">'+esc(i.title)+'</h3></div><div style="text-align:center">'+ring(r.m.sc,46,fitCls(r.m.sc))+'<div class="hint" style="margin-top:2px">dopasowanie</div></div></div><div class="meta">'+esc(i.institution)+' · '+esc(l.city)+'</div><div class="cfoot"><span class="pill plain">'+STAGES[i.stage]+'</span><span class="pill plain">ocena '+a.score+'/100</span>'+(r.dup?'<span class="pill warn">ryzyko dublowania</span>':'')+(q?'<span class="pill '+stClass(q.status)+'">zapytanie: '+q.status+'</span>':'')+'</div></button>';
}
function investorCard(r){
  const p=r.p,m=r.m;
  return '<button class="card" data-open="inv:'+p.id+'"><div class="ctop"><div><span class="pill'+(p.id==='me'?' good':'')+'">'+(p.id==='me'?'Twój profil':esc(p.kind))+'</span><h3 style="margin-top:8px">'+esc(p.name)+'</h3></div>'+(m?'<div style="text-align:center">'+ring(m.sc,46,fitCls(m.sc))+'<div class="hint" style="margin-top:2px">dopasowanie</div></div>':'')+'</div><div class="meta">'+esc(p.city)+' · '+esc(p.person)+'</div><div class="cfoot">'+((p.cats&&p.cats.length)?p.cats:r.dzs.slice(0,3)).map(d=>'<span class="pill plain">'+esc(d)+'</span>').join('')+(S.acct&&p.owner===S.acct.email?'<span class="pill good">Twoja oferta</span>':'')+'</div></button>';
}
function resultsHTML(){
  if(S.view==='invs'){
    const base=S.items.find(x=>x.id===S.sel)||S.items[0],a=analyze(base);
    const rows=filterInv(allInvestors()).map(r=>Object.assign(r,{m:matchScore(base,{tags:r.p.tags,types:r.p.types,st:r.p.st},a.score)}));
    rows.sort((x,y)=>S.q?y.r-x.r||y.m.sc-x.m.sc:y.m.sc-x.m.sc);
    return {html:rows.length?'<div class="grid">'+rows.map(investorCard).join('')+'</div>':empty('Żaden inwestor nie spełnia kryteriów.'),cnt:countText(rows.length,allInvestors().length)};
  }
  if(S.role==='inv'){
    const P=meProf(),rows=filterInn(vis()).map(r=>Object.assign(r,{m:matchScore(r.i,P,r.a.score),dup:!!(r.a.sims[0]&&r.a.sims[0].sim>=.35)})).filter(r=>r.a.score>=S.inv.min&&!(S.inv.dup&&r.dup));
    rows.sort((x,y)=>S.q?y.r-x.r||y.m.sc-x.m.sc:y.m.sc-x.m.sc);
    return {html:rows.length?'<div class="grid">'+rows.map(offerCard).join('')+'</div>':empty('Żadna oferta nie spełnia kryteriów (sprawdź też minimalną ocenę w profilu).'),cnt:countText(rows.length,vis().length)};
  }
  const rows=filterInn(vis());if(S.q)rows.sort((x,y)=>y.r-x.r);
  return {html:rows.length?'<div class="grid">'+rows.map(innCard).join('')+'</div>':empty('Żadna innowacja nie spełnia kryteriów.'),cnt:countText(rows.length,vis().length)};
}
function updateRes(){const r=$('res'),c=$('cnt');if(!r)return;const x=resultsHTML();r.innerHTML=x.html;if(c)c.innerHTML=x.cnt}

/* podpowiedzi w menu rozwijanym wyszukiwarki */
function sbData(){
  const qt=stemq(S.q);
  if(!qt.length)return {browse:true,topics:optList(vis().map(i=>analyze(i).lab.dz)).map(x=>({id:x[0],label:x[0],sub:x[1]+' innow.'})),inns:[],invs:[]};
  const topics=DZ.map(d=>({id:d,label:d,n:vis().filter(i=>analyze(i).lab.dz===d).length})).filter(x=>searchRank(qt,[{text:x.label,w:1}])).map(x=>({id:x.id,label:x.label,sub:x.n+' innow.'}));
  const inns=filterInnRaw().sort((a,b)=>b.r-a.r).slice(0,5).map(r=>({id:r.i.id,label:esc(r.i.title),sub:esc(r.l.city)}));
  const invs=filterInvRaw().sort((a,b)=>b.r-a.r).slice(0,4).map(r=>({id:r.p.id,label:esc(r.p.name),sub:esc(r.p.kind)}));
  return {browse:false,topics,inns,invs};
}
function renderDrop(){
  const dd=$('sdrop'),inp=$('q');if(!dd||!inp)return;
  if(!S.sbOpen){dd.hidden=true;inp.setAttribute('aria-expanded','false');return}
  const d=sbData();let i=0,h='';
  const opt=(k,id,label,sub,cls)=>{const ix=i++;return '<button class="sopt'+(cls?' '+cls:'')+'" role="option" id="sopt-'+ix+'" data-sb="'+k+':'+esc(id)+'" aria-selected="'+(ix===S.sbIdx)+'"><span>'+label+'</span><small>'+(sub||'')+'</small></button>'};
  if(d.topics.length)h+='<div class="grp">'+(d.browse?'Przeglądaj według dziedziny':'Dziedziny')+'</div>'+d.topics.map(t=>opt('dz',t.id,esc(t.label),t.sub)).join('');
  if(d.inns.length)h+='<div class="grp">Innowacje</div>'+d.inns.map(t=>opt('inn',t.id,t.label,t.sub)).join('');
  if(d.invs.length)h+='<div class="grp">Inwestorzy</div>'+d.invs.map(t=>opt('inv',t.id,t.label,t.sub)).join('');
  if(!d.browse&&!d.topics.length&&!d.inns.length&&!d.invs.length)h+='<div class="grp">Brak podpowiedzi</div><p class="small muted" style="padding:4px 12px 10px">Spróbuj innego słowa, np. nazwy dziedziny lub miasta.</p>';
  if(!d.browse)h+=opt('all','','Pokaż wszystkie wyniki','Enter','all');
  S.sbN=i;dd.innerHTML=h;dd.hidden=false;inp.setAttribute('aria-expanded','true');
}
function sbChoose(k,id){
  S.sbOpen=false;if(!S.role){S.role='inst'}
  if(S.view==='invs'&&S.role==='inv')S.view='inn';
  if(k==='dz'){clearFilters();S.f.dz=id;go('inn');return}
  if(k==='inn'){clearFilters();go('inn');openD('inn',id);return}
  if(k==='inv'){clearFilters();if(S.role==='inst')go('invs');else go('inn');openD('inv',id);return}
  if(S.page||S.view==='mapinn'||S.view==='mapinv'){go('inn');return}
  renderDrop();updateRes();
}

const catChips=sel=>'<div class="chips" id="cats">'+CATS.map(c=>'<label class="chipc"><input type="checkbox" data-cat value="'+esc(c)+'"'+((sel||[]).includes(c)?' checked':'')+'>'+esc(c)+'</label>').join('')+'</div>';
const optsReq=(arr,sel,ph)=>'<option value="">'+ph+'</option>'+arr.map((a,i)=>'<option value="'+i+'"'+(i===sel?' selected':'')+'>'+esc(a)+'</option>').join('');
const pillsOf=a=>(a||[]).map(c=>'<span class="pill">'+esc(c)+'</span>').join(' ');
function factsBlock(inn){
  const f=[['Rodzaj',RODZAJE[inn.rodzaj]||'Nie podano'],['Etap rozwoju',STAGES[inn.stage]],['Nowość',NOVEL[inn.novelty]||'Nie podano'],['Skala wpływu',SCOPE[inn.scope]||'Nie podano'],['Powstała w',ORIGINS[inn.origin]||'Nie podano']].map(x=>'<div class="lab"><div class="k">'+x[0]+'</div><div class="v">'+esc(x[1])+'</div></div>').join('');
  return '<div class="labels" style="margin:4px 0 12px">'+f+'</div><div class="tags" style="margin-bottom:12px">'+pillsOf(inn.cats)+'</div><div class="rec" style="margin-bottom:12px"><div class="mini">Korzyści dla inwestora</div><div>'+esc(inn.benefit||'Instytucja nie opisała jeszcze korzyści.')+'</div></div>';
}
