/* migawka kanału wykrytych innowacji (źródło: collector/feed/feed.json; kolektor odświeża ten plik codziennie) */

function fromFeed(r){
  const cats=_catsFor(r.area||'',r.title,r.institution),loc=mkLoc(r.city,r.woj,r.id);
  const it=enrich(mk({id:r.id,type:r.type||'technologiczna',instType:r.instType==null?3:r.instType,institution:r.institution,city:loc.miejsc||r.city||'',loc,creators:'',contact:'',phone:'',title:r.title,problem:r.problem||'',description:r.summary||'',tags:[],stage:r.stage==null?1:r.stage,scope:Number.isInteger(r.scope)?r.scope:null,budget:r.budget||null,infra:1,team:1,ip:r.ip||0,hasDocs:false,status:0,contacts:[],log:[{t:now(),x:'Wykryte automatycznie ('+r.discoveredAt+') – źródło: '+r.source}],rodzaj:r.kind==='patent'||r.kind==='wynalazek'?0:r.kind==='infrastruktura'?4:-1,novelty:-1,origin:r.origin==null?-1:r.origin,cats,benefit:r.benefit||'',owner:'',public:true,interests:[],source:r.source,url:r.url,detected:true,discoveredAt:r.discoveredAt,published:r.published||'',area:r.area||'',estimated:true,_v2:!!r.v2,stageOk:!!r.v2,area3:r.area3||'',trl:r.trl||0,trlBasis:r.trlBasis||''}));
  it.tags=tagsFromCats(cats);
  if(!applyRewrite(it))return null;
  const k=Object.keys(INST_CONTACTS).find(k=>(it.institution||'').indexOf(k)===0);
  if(k){const c=INST_CONTACTS[k];it.contact=c.email||'';it.phone=c.phone||'';it.contactSrc=c.src;it.contactPublic=true;}
  return it;
}

const DETECTED_ITEMS=DETECTED_FEED.map(fromFeed).filter(Boolean).filter(x=>x.contact||x.phone).filter(x=>/^https?:\/\//.test(x.url||''));
