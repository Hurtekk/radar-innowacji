const AC=new Map();
function save(){AC.clear();if(needsMigration&&!backupReady)return;try{localStorage.setItem(KEY,JSON.stringify(Object.assign({},savedState||{},{items:S.items,inv:S.inv,catalogRevision:DATA_REVISION})))}catch(e){}}
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cur=()=>S.items.find(x=>x.id===S.sel);
const vis=()=>S.items;
const log=(inn,x)=>inn.log.unshift({t:now(),x});
function analyze(inn){
  let c=AC.get(inn.id);if(c)return c;
  const sims=buildSim(inn,S.items);if(!inn.scores||inn.scoresRevision!==DATA_REVISION){inn.scores=suggest(inn,sims);inn.scoresRevision=DATA_REVISION;}
  const sug=suggest(inn,sims),score=totalScore(inn.scores),comp=completeness(inn);
  c={sims,sug,score,comp,notes:scoreNotes(inn),range:scoreRange(inn,inn.scores),rec:recommend(inn,score,sims,comp),matches:[],lab:labelsOf(inn)};
  AC.set(inn.id,c);return c;
}
const lvl=s=>s>=65?'good':s>=45?'warn':'bad';
const lvlCls=s=>s>=65?'s-hi':s>=45?'s-mid':'s-lo';
function allInvestors(){
  const me={id:'me',name:S.inv.name,kind:'Inwestor',city:S.inv.city,person:S.inv.person,email:S.inv.email,phone:S.inv.phone,tags:S.inv.tags,types:S.inv.types,st:[S.inv.smin,S.inv.smax],d:'Twój profil inwestora. Zmienisz go w zakładce „Mój profil”.'};
  return (S.acct&&S.acct.kind===5)?PARTNERS.concat([me]):PARTNERS.slice();
}
const meProf=()=>({tags:S.inv.tags,types:S.inv.types,st:[S.inv.smin,S.inv.smax]});
function myInterest(inn){return inn.interests.find(x=>x.investor===S.inv.name)}
const stClass=s=>s==='zaakceptowane'?'good':s==='odrzucone'?'bad':'ask';
const strPill=sc=>'<span class="pill '+(sc>=70?'good':sc>=50?'':'plain')+'">'+strengthOf(sc)+' · '+sc+'%</span>';

/* ---------- AI (capability sample), z awaryjnym trybem na regułach ---------- */
let SAMPLE;
async function getSample(){if(SAMPLE!==undefined)return SAMPLE;try{SAMPLE=(window.claude&&await window.claude.use('sample'))||null}catch(e){SAMPLE=null}return SAMPLE}
async function aiLabel(inn,loud){
  const s=await getSample();
  if(!s){if(loud)toast('AI jest niedostępne w tym widoku. Etykiety nadano regułami.');return false}
  const prompt='Jesteś klasyfikatorem innowacji w radarze innowacji dla województwa podkarpackiego. Na podstawie opisu zwróć WYŁĄCZNIE obiekt JSON o polach: '+
   '"dziedzina" (dokładnie jedna z: '+DZ.join(' | ')+'), "temat" (3 do 6 słów po polsku, konkretny temat innowacji), "miasto" (miasto wymienione w opisie lub pusty string), '+
   '"wystawca" (dokładnie jedna z: '+INST.join(' | ')+'), "tagi" (do 5 elementów wyłącznie z listy: '+ALLTAGS.join(', ')+').\n\n'+
   'Tytuł: '+inn.title+'\nInstytucja: '+inn.institution+'\nMiasto: '+(inn.city||'')+'\nProblem: '+inn.problem+'\nOpis: '+inn.description;
  try{
    const r=await s.json(prompt,{modelTier:'quick'});
    if(!r||typeof r!=='object')throw new Error('bad');
    const ai={};
    if(DZ.includes(r.dziedzina))ai.dz=r.dziedzina;
    if(typeof r.temat==='string'&&r.temat.length<90)ai.topic=r.temat.trim();
    if(typeof r.miasto==='string'&&r.miasto.length<40)ai.city=r.miasto.trim();
    if(INST.includes(r.wystawca))ai.issuer=r.wystawca;
    const tg=(Array.isArray(r.tagi)?r.tagi:[]).filter(t=>ALLTAGS.includes(t));
    inn.ai=ai;if(tg.length)inn.tags=[...new Set((inn.tags||[]).concat(tg))];
    log(inn,'Etykiety nadane przez AI: '+(ai.dz||'-'));save();softRefresh();if(loud)toast('AI nadało etykiety: '+(ai.dz||'brak dziedziny'));return true;
  }catch(e){
    if(e&&e.code==='not_granted')SAMPLE=null;
    if(loud)toast(e&&e.code==='rate_limited'?'Limit zapytań AI. Spróbuj za chwilę.':'Nie udało się użyć AI. Zostają etykiety z reguł.');return false;
  }
}
async function aiAll(){
  const todo=S.items.filter(i=>!i.ai).slice(0,8);
  if(!todo.length){toast('Wszystkie innowacje mają już etykiety AI.');return}
  toast('AI nadaje etykiety ('+todo.length+')...');
  for(const i of todo){const ok=await aiLabel(i,false);if(!ok){toast('Przerwano: AI niedostępne lub limit zapytań.');return}}
  toast('Gotowe: etykiety AI nadane.');
}
function toast(m){let b=document.getElementById('toast');if(!b){b=document.createElement('div');b.id='toast';b.setAttribute('role','status');document.body.appendChild(b)}b.textContent=m;clearTimeout(b._t);b._t=setTimeout(()=>{if(b.parentNode)b.remove()},4000)}

