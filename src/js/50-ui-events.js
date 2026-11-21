
/* ====================== zdarzenia ====================== */
function setPage(p){S.page=p;S.dd=null;S.drawer=null;S._on=false;S.modal=null;render();try{window.scrollTo(0,0)}catch(e){}}
function actionFor(d,inn){
  if(extAction(d))return;
  if(d.dd){S.dd=S.dd===d.dd?null:d.dd;return refreshChrome()}
  if(d.sec){S.sec[d.sec]=!S.sec[d.sec];return renderLayer()}
  if(d.sb){const p=d.sb,ix=p.indexOf(':');return sbChoose(p.slice(0,ix),p.slice(ix+1))}
  if(d.open){const ix=d.open.indexOf(':');const k=d.open.slice(0,ix),id=d.open.slice(ix+1);if(S.page)S.page=null,render();return openD(k,id)}
  if(d.view){return go(d.view)}
  if(d.go){return go(d.go)}
  if(d.page){return setPage(d.page)}
  if(d.role){S.role=S.acct?acctRole(S.acct):d.role;S.view='inn';S.page=null;S.drawer=null;S.modal=null;S.dd=null;clearFilters();return render()}
  if(d.rmf){const p=d.rmf.split('.');(p[0]==='f'?S.f:S.fi)[p[1]]='';return after()}
  if(d.acctmode){S.acctMode=d.acctmode;return renderLayer(true)}
  if(d.addmode){S.addMode=d.addmode;return renderLayer(true)}
  if(d.gnode!=null&&GR){GR.select(d.gnode);return}
  if(d.contact&&inn){const p=d.contact,i=inn.contacts.indexOf(p),nm=PARTNERS.find(x=>x.id===p).name;if(i>=0){inn.contacts.splice(i,1);log(inn,'Cofnięto kontakt: '+nm)}else{inn.contacts.push(p);log(inn,'Oznaczono kontakt: '+nm);if(inn.status<3)inn.status=3}save();return after()}
  if(d.reset&&inn){inn.scores[d.reset]=analyze(inn).sug[d.reset];save();return after()}
  if(d.feed!=null){const f=FEED[+d.feed],x=extract(f.text);S.draft={title:x.title,type:x.type,stage:x.stage,tags:x.tags,institution:x.institution,instType:x.instType>=0?x.instType:undefined,city:x.city,description:f.text,problem:''};S.addMode='form';return renderLayer(true)}
  if(d.int){S.openInt=S.openInt===d.int?null:d.int;return renderLayer()}
  if(d.sendint){const x=S.items.find(i=>i.id===d.sendint);if(!x||myInterest(x))return;const m=($('int-msg').value||'').trim();x.interests.push({id:uid(),investor:S.inv.name,msg:m||'Zainteresowanie ofertą.',status:'oczekuje',t:now(),contact:{person:S.inv.person,email:S.inv.email,phone:S.inv.phone}});log(x,'Zapytanie inwestora: '+S.inv.name);S.openInt=null;save();toast('Zapytanie wysłane.');return after()}
  if(d.intact&&inn){const pr=d.intact.split(':'),q=inn.interests.find(x=>x.id===pr[1]);if(q){q.status=pr[0]==='ok'?'zaakceptowane':'odrzucone';log(inn,(pr[0]==='ok'?'Zaakceptowano':'Odrzucono')+' zapytanie: '+q.investor);if(pr[0]==='ok'&&inn.status<3)inn.status=3}save();return after()}
  const act=d.act;
  if(act==='home'){S.role=null;S.page=null;S.drawer=null;S.modal=null;S.dd=null;clearFilters();return render()}
  if(act==='addoffer'){S.modal='offer';S.dd=null;S.drawer=null;S._on=false;renderTop();return renderLayer(true)}
  if(act==='acct'){S.modal='acct';S.dd=null;S.drawer=null;S._on=false;renderTop();return renderLayer(true)}
  if(act==='logout')return logout();
  if(act==='back'){S.page=null;return render()}
  if(act==='add'){S.modal='add';S.draft=S.acct&&S.acct.kind<5?{institution:S.acct.name,instType:S.acct.kind,creators:S.acct.person,contact:S.acct.email,phone:S.acct.phone,city:S.acct.city}:null;S.addMode='form';S.dd=null;S.drawer=null;S._on=false;renderTop();return renderLayer(true)}
  if(act==='closem'){S.modal=null;return renderLayer(true)}
  if(act==='closed'){return closeD()}
  if(act==='clr'){clearFilters();return after()}
  if(act==='aiall'){aiAll();return}
  if(act==='ai'&&inn){toast('AI nadaje etykiety...');aiLabel(inn,true);return}
  if(act==='greset'&&GR){GR.reset();return}
  if(act==='scan'){const x=$('scan-txt').value;S.txt=x;if(x.trim().length<30){toast('Wklej dłuższy opis (co najmniej kilka zdań).');return}const e2=extract(x);S.draft={title:e2.title,type:e2.type,stage:e2.stage,tags:e2.tags,institution:e2.institution,instType:e2.instType>=0?e2.instType:undefined,city:e2.city,description:x,problem:''};S.addMode='form';return renderLayer(true)}
  if(act==='del'){S.delAsk=true;return renderLayer()}
  if(act==='delno'){S.delAsk=false;return renderLayer()}
  if(act==='delok'&&inn){if(S.items.length<2)return;S.items=S.items.filter(x=>x.id!==inn.id);S.sel=S.items[0].id;S.delAsk=false;save();S.drawer=null;S._on=false;toast('Usunięto innowację.');return render()}
  if(act==='route'&&inn){const a=analyze(inn);inn.status=Math.max(inn.status,2);log(inn,'Skierowano: '+a.rec.primary.title);save();toast('Status: Skierowana.');return after()}
  if(act==='card'){S.showCard=!S.showCard;return renderLayer()}
}
const SEL='[data-aud],[data-area],[data-cmp],[data-acctmode],[data-dd],[data-sec],[data-sb],[data-open],[data-view],[data-go],[data-page],[data-role],[data-rmf],[data-addmode],[data-gnode],[data-contact],[data-reset],[data-feed],[data-rid],[data-demo],[data-int],[data-sendint],[data-intact],[data-act]';
document.addEventListener('click',e=>{
  let ch=false;
  if(S.sbOpen&&!e.target.closest('#sb')){S.sbOpen=false;renderDrop()}
  if(S.dd&&!e.target.closest('.dd')){S.dd=null;ch=true}
  const t=e.target.closest(SEL);
  if(!t){if(ch)refreshChrome();return}
  if(t.tagName==='A')return;
  if(ch&&!t.dataset.dd)S.dd=null;
  if(t.disabled)return;
  actionFor(t.dataset,cur());
});
document.addEventListener('input',e=>{
  const t=e.target,d=t.dataset||{};
  if(t.id==='q'){S.q=t.value;S.sbOpen=true;S.sbIdx=-1;renderDrop();if($('res')){updateRes();renderSubEl()}return}
  if(d.slider){const el=$('v-'+d.slider);if(el)el.textContent=t.value}
  if(d.gmin){const el=$('gmin-v');if(el)el.textContent=t.value}
});
document.addEventListener('focusin',e=>{if(e.target.id==='q'&&!S.sbOpen){S.sbOpen=true;S.sbIdx=-1;renderDrop()}});
document.addEventListener('keydown',e=>{
  if(e.target.id==='q'){
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!S.sbOpen){S.sbOpen=true;renderDrop()}const n=S.sbN||1;S.sbIdx=e.key==='ArrowDown'?(S.sbIdx+1)%n:(S.sbIdx<=0?n-1:S.sbIdx-1);renderDrop();const el=$('sopt-'+S.sbIdx);if(el&&el.scrollIntoView)el.scrollIntoView({block:'nearest'})}
    else if(e.key==='Enter'){e.preventDefault();const el=S.sbIdx>=0?$('sopt-'+S.sbIdx):null;if(el&&el.dataset.sb){const p=el.dataset.sb,ix=p.indexOf(':');sbChoose(p.slice(0,ix),p.slice(ix+1))}else sbChoose('all','')}
    else if(e.key==='Escape'){S.sbOpen=false;renderDrop()}
    return;
  }
  if(e.key==='Escape'){
    if(S.dd){S.dd=null;refreshChrome()}
    else if(S.modal){S.modal=null;renderLayer(true)}
    else if(S.drawer)closeD();
  }
});
document.addEventListener('change',e=>{
  const t=e.target,d=t.dataset||{};
  if(d.srcf){if(d.srcf==='kind')S.srcKind=t.value;else S.srcCat=t.value;return render()}
  if(d.cat!=null){const box=t.closest('.chips');if(box&&box.querySelectorAll('input:checked').length>3){t.checked=false;toast('Maksymalnie 3 kategorie.')}return}
  if(d.flt){const p=d.flt.split('.');(p[0]==='f'?S.f:S.fi)[p[1]]=t.value;return after()}
  if(t.id==='fitfor'){S.sel=t.value;return after()}
  if(d.gmin){S.gmin=+t.value;if(GR)GR.rebuild();return}
  if(d.gtopics!=null){S.gtopics=t.checked;if(GR)GR.rebuild();return}
  if(d.statussel!=null){const x=cur();if(!x)return;x.status=+t.value;log(x,'Status: '+STATUS[x.status]);save();return after()}
  if(d.pub!=null){const x=cur();if(!x)return;x.public=t.checked;log(x,x.public?'Udostępniono inwestorom':'Wycofano z widoku inwestorów');save();return after()}
  if(d.pf){const P=S.inv,v=t.value;
    if(d.pf==='tag'||d.pf==='type'){const arr=d.pf==='tag'?P.tags:P.types,ix=arr.indexOf(v);if(t.checked&&ix<0)arr.push(v);if(!t.checked&&ix>=0)arr.splice(ix,1)}
    else if(d.pf==='smin')P.smin=+v;else if(d.pf==='smax')P.smax=+v;else if(d.pf==='min')P.min=+v;else if(d.pf==='dup')P.dup=t.checked;
    else if(['name','person','email','phone','city'].includes(d.pf))P[d.pf]=v.trim()||(d.pf==='name'?'Mój fundusz (demo)':'');
    if(P.smin>P.smax){const z=P.smin;P.smin=P.smax;P.smax=z}
    save();return render()}
  const k=d.slider;if(!k)return;const inn=cur();if(!inn)return;
  inn.scores[k]=+t.value;log(inn,'Zmieniono ocenę: '+CRIT.find(c=>c.k===k).name+' = '+t.value);save();after();const el=document.querySelector('[data-slider="'+k+'"]');if(el&&el.focus)el.focus();
});
document.addEventListener('submit',e=>{
  if(e.target.id!=='f')return;e.preventDefault();
  const g=id=>$(id).value;
  const cats=[...document.querySelectorAll('#cats input:checked')].map(x=>x.value);
  if(!cats.length||cats.length>3){toast('Wybierz od 1 do 3 kategorii.');return}
  if(!$('f-consent').checked){toast('Potrzebna jest zgoda twórców na przetwarzanie danych.');return}
  const it=+g('f-itype');
  addItem({title:g('f-title').trim(),type:g('f-type'),rodzaj:+g('f-rodzaj'),novelty:+g('f-novel'),origin:+g('f-origin'),cats,benefit:g('f-benefit').trim(),stage:+g('f-stage'),problem:g('f-problem').trim(),description:g('f-desc').trim(),tags:g('f-tags').split(',').map(x=>x.trim()).filter(Boolean),institution:g('f-inst').trim(),instType:it<0?ruleIssuer(g('f-inst')):it,city:g('f-city').trim(),creators:g('f-cr').trim(),contact:g('f-ct').trim(),phone:g('f-ph').trim(),scope:+g('f-scope'),infra:+g('f-infra'),team:+g('f-team'),ip:+g('f-ip'),hasDocs:$('f-docs').checked},S.draft&&S.draft.description?'Skaner źródeł':'Zgłoszenie ręczne');
});
render();
(function(){
  const el=$('intro');if(!el)return;
  const calm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  let done=false;
  function close(){if(done)return;done=true;el.classList.add('out');setTimeout(()=>el.remove(),320)}
  el.addEventListener('click',close);
  setTimeout(close,calm?700:2000);
})();

/* codzienny kanał z kolektora: po wdrożeniu na serwer strona dociąga feed/feed.json; w podglądzie bez serwera działa wbudowana migawka */
function loadFeed(){
  if(typeof fetch!=='function'||!/^https?:$/.test(location.protocol))return;
  fetch('feed/feed.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{
    if(!j||!Array.isArray(j.items))return;let n=0;
    j.items.forEach(r=>{if(!r||!r.id||!r.title||S.items.some(x=>x.id===r.id||(x.url&&x.url===r.url)))return;S.items.push(fromFeed(r));n++});
    if(n){save();render()}
  }).catch(()=>{});
}
loadFeed();try{setInterval(loadFeed,3600e3)}catch(e){}
