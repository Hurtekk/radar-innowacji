/* Aktualizacja katalogu; stary zapis zostaje zachowany przed migracją. */
const CATALOG_FIELDS=['title','institution','instType','origin','city','loc','type','description','problem','benefit','typ','trl','trlNA','trlBasis','trlWhy','stage','stageOk','wdr','wdrWhy','scope','infra','hasDocs','novelty','noveltyBasis','area3','cats','tags','ip','source','url','registry','programme','value','period','area','endYear','detected','published','discoveredAt','budget','budgetSource','budgetCheckedAt','uncertainty','sourceUrls','aliases','projectId','audit','dataRevision','_v2'];
function migrateCatalog(items,catalog){
  const originals=Array.isArray(items)?items:[],byId=new Map(catalog.map(i=>[i.id,i])),out=[],seen=new Set();
  originals.forEach(old=>{
    if(!old||!old.id)return;
    const id=canonicalId(old.id),fresh=byId.get(id);
    if(seen.has(id)){
      const target=out.find(x=>x.id===id);target.mergedRecords=(target.mergedRecords||[]).concat([JSON.parse(JSON.stringify(old))]);return;
    }
    let item=Object.assign({},old,{id});
    if(fresh){CATALOG_FIELDS.forEach(k=>{if(k in fresh)item[k]=JSON.parse(JSON.stringify(fresh[k]));else delete item[k]});item.scores=null;item.scoresRevision=null;
      if(old.id!==id)item.mergedRecords=(item.mergedRecords||[]).concat([JSON.parse(JSON.stringify(old))]);
    }else {enrich(item);if(item.scoresRevision!==DATA_REVISION){item.scores=null;item.scoresRevision=null}}
    if(/^https?:\/\//.test(String(item.url||''))){out.push(item);seen.add(id)}
  });
  catalog.forEach(fresh=>{if(!seen.has(fresh.id)){out.push(JSON.parse(JSON.stringify(fresh)));seen.add(fresh.id)}});
  return out;
}
