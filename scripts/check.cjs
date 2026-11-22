const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=require('node:path').resolve(__dirname,'..');
const src=fs.readFileSync(root+'/dist/script.js','utf8').split('/* ====================== UI: stan, pomocnicze')[0];
const values=new Map(),ctx=vm.createContext({URL,console,localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)}});vm.runInContext(src,ctx);
const run=s=>vm.runInContext(s,ctx);run('let S={items:REAL_ITEMS.concat(DETECTED_ITEMS)};');const rows=run('S.items');
assert.equal(rows.length,198);assert(!rows.some(x=>x.id==='n96'));
for(const i of rows){if(i.trl>0)assert.equal(i.stage,run(`stageFromTrl(${i.trl})`),i.id);assert(i.trlWhy&&i.trlWhy!=='na',i.id);assert.equal(i.novelty,-1);}
assert.equal(run("REAL_ITEMS.find(i=>i.id==='n90').stage"),4);
assert.equal(run("REAL_ITEMS.find(i=>i.id==='n90').origin"),3);
assert.equal(run("budgetOf(REAL_ITEMS.find(i=>i.id==='n90')).amount"),11000000);
assert.equal(run("scopeOf(REAL_ITEMS.find(i=>i.id==='n90'))"),5);
assert.equal(run("area3Of(REAL_ITEMS.find(i=>i.id==='n109'))"),'Technologiczna');
assert.equal(run("area3Of({title:'Sterownik nawadniania szkółek roślin',description:'',origin:2,cats:[]})"),'Technologiczna');
assert.equal(run("area3Of({title:'Antybakteryjna warstwa',description:'Materiał dla szpitali i szkół',cats:[]})"),'Technologiczna');
assert.equal(run("scopeOf({registry:'NCBR',value:'1 000 000 EUR'})"),null);
assert.equal(run("scopeOf({registry:'NCBR',value:'nie podano w opisie'})"),null);
assert.equal(run("scopeOf({registry:'NCBR',value:'1 000 000 PLN'})"),3);
assert.equal(run("scopeOf({registry:'NCBR',value:'999 999,00 zł'})"),2);
assert.equal(run("independentSource({url:'https://www.gov.pl/a',confirmedBy:true})"),null);
assert.equal(run("independentSource({url:'https://www.gov.pl/a',confirmedBy:'https://gov.pl/b'})"),null);
assert.equal(run("independentSource({url:'https://www.gov.pl/a',confirmedBy:'https://example.org/doc'})"),'https://example.org/doc');
assert.equal(run("REAL_ITEMS.find(i=>i.id==='n153').wdr"),4);
assert.equal(run("REAL_ITEMS.find(i=>i.id==='n08').wdr"),5);
assert.equal(run("REAL_ITEMS.find(i=>i.id==='n144').trl"),7);
assert.equal(run("DETECTED_ITEMS.find(i=>i.id==='w-rzeszow-parking').wdr"),1);
run("const damaged=Object.assign({},REAL_ITEMS.find(i=>i.id==='n90'),{stage:1,_v2:true,notes:'Zachowaj',status:3,contact:'własny@example.org',scores:{wdroz:1}});const migrated=migrateCatalog([damaged,{id:'n96',url:'https://www.gov.pl/web/ncbr/safedam',notes:'stary wpis'}],REAL_ITEMS.concat(DETECTED_ITEMS));");
assert.equal(run("migrated.find(i=>i.id==='n90').stage"),4);assert.equal(run("migrated.find(i=>i.id==='n90').notes"),'Zachowaj');assert.equal(run("migrated.find(i=>i.id==='n90').status"),3);assert.equal(run("migrated.find(i=>i.id==='n90').contact"),'własny@example.org');assert.equal(run("migrated.find(i=>i.id==='n56').mergedRecords[0].notes"),'stary wpis');
assert.equal(run("JSON.stringify(migrateCatalog(migrated,REAL_ITEMS.concat(DETECTED_ITEMS)))===JSON.stringify(migrated)"),true);
run('S.items.forEach(analyze)');assert.equal(run('S.items.every(i=>Number.isFinite(analyze(i).score)&&analyze(i).score>=20&&analyze(i).score<=100)'),true);
console.log('PASS: etapy, 198 pozycji, migracja i notatki, deduplikacja, kwoty/waluty, klasyfikacja, źródła, oceny i pełne przeliczenie katalogu.');

// Exercise the actual persisted-state startup twice, including its backup.
const start=fs.readFileSync(root+'/src/js/40-ui-state-filters.js','utf8').split('const $=')[0];
const oldRaw=JSON.stringify({items:[{id:'n90',url:'https://www.gov.pl/web/ncbr/jednolity-system-antyplagiatowy',stage:1,notes:'Moje notatki',status:3},{id:'n96',url:'https://www.gov.pl/web/ncbr/safedam',notes:'Drugi adres'}],inv:{name:'Mój zachowany profil'},customSetting:17});
const storage=new Map([['radar-innowacji-v9',oldRaw]]);
function boot(){const c=vm.createContext({URL,console,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}});vm.runInContext(src,c);vm.runInContext('function F0(){return {}};function FI0(){return {}};',c);vm.runInContext(start,c);return c;}
const boot1=boot(),backupKey='radar-innowacji-v9-backup-before-audit-2026-11-22-v1';
assert.equal(storage.get(backupKey),oldRaw);assert.equal(vm.runInContext("S.items.find(i=>i.id==='n90').stage",boot1),4);
assert.equal(vm.runInContext("S.items.find(i=>i.id==='n90').notes",boot1),'Moje notatki');
assert.equal(vm.runInContext("S.inv.name",boot1),'Mój zachowany profil');assert.equal(JSON.parse(storage.get('radar-innowacji-v9')).customSetting,17);
const boot2=boot();assert.equal(storage.get(backupKey),oldRaw);assert.equal(vm.runInContext('S.items.length',boot2),198);
assert.equal(vm.runInContext("S.items.find(i=>i.id==='n56').mergedRecords[0].notes",boot2),'Drugi adres');
console.log('PASS: pełny start aplikacji ze starym zapisem, kopia zapasowa, zachowany profil i ponowny start.');

const rendering=vm.createContext({URL,console,document:{addEventListener(){}},localStorage:{getItem:()=>null},setTimeout(){}});
vm.runInContext(src,rendering);vm.runInContext('let S={items:REAL_ITEMS.concat(DETECTED_ITEMS),aud:"all"};const PAGEX={};const pg=(title,body)=>title+body;function extAction(){};function openD(){};',rendering);
vm.runInContext(fs.readFileSync(root+'/src/js/46-ui-radar-model.js','utf8'),rendering);
vm.runInContext(fs.readFileSync(root+'/src/js/47-ui-methodology.js','utf8'),rendering);
const met=vm.runInContext('PAGEX.metod()',rendering);assert(!met.includes('TRL TRL'));assert(met.includes('brak kwoty')||met.includes('Brak kwoty'));assert(!met.includes('istnieje niemal to samo'));
const jsa=vm.runInContext("REAL_ITEMS.find(i=>i.id==='n90')",rendering);rendering.subject=jsa;
assert(vm.runInContext('factsTable(subject)',rendering).includes('decyzja klasyfikacyjna radaru'));
assert(vm.runInContext('evidenceBlock(subject)',rendering).includes('kilkaset tysięcy'));
assert(vm.runInContext('critTable(subject,analyze(subject))',rendering).includes('11'));
console.log('PASS: treść metodologii, tabela ocen i dowody na karcie.');

vm.runInContext('save()',boot1);assert.equal(JSON.parse(storage.get('radar-innowacji-v9')).customSetting,17);
const blocked=new Map([['radar-innowacji-v9',oldRaw]]);
const quota=vm.createContext({URL,console,localStorage:{getItem:k=>blocked.get(k)||null,setItem:(k,v)=>{if(k.includes('-backup-before-'))throw Error('quota');blocked.set(k,v)}}});
vm.runInContext(src,quota);vm.runInContext('function F0(){return {}};function FI0(){return {}};',quota);vm.runInContext(start,quota);vm.runInContext('save()',quota);
assert.equal(blocked.get('radar-innowacji-v9'),oldRaw);
console.log('PASS: oryginalny zapis pozostaje nienaruszony, gdy nie można zapisać kopii zapasowej.');

// Provenance colors must not imply that every computed assessment is a warning.
const factStatus=(id,label)=>vm.runInContext(`factRows(REAL_ITEMS.concat(DETECTED_ITEMS).find(i=>i.id===${JSON.stringify(id)})).find(r=>r[0]===${JSON.stringify(label)})[1]`,rendering);
assert.equal(factStatus('n90','Budżet'),'f');
assert.equal(factStatus('n90','TRL'),'n');
assert.equal(factStatus('n90','Ocena w pięciu kryteriach'),'e');
assert(vm.runInContext("factPill('f')",rendering).includes('pill good'));
assert(vm.runInContext("factPill('s')",rendering).includes('pill good'));
assert(vm.runInContext("factPill('e')",rendering).includes('pill assessed'));
assert(vm.runInContext("factPill('u')",rendering).includes('pill plain'));
assert(!vm.runInContext("factsTable(subject)",rendering).includes('pill warn'));
assert.equal(vm.runInContext("budgetConfirmed({value:'11 000 000 PLN',audit:{readable:true,sourceBudget:'12 000 000 PLN'}})",rendering),false);
assert.equal(vm.runInContext("budgetConfirmed({value:'11 000 000 PLN',audit:{readable:true}})",rendering),false);
assert.equal(vm.runInContext("budgetConfirmed({value:'11 000 000 EUR',audit:{sourceBudget:'11 000 000 PLN'}})",rendering),false);
assert(vm.runInContext("dataStatusPill({}, {notes:['Brak budżetu']})",rendering).includes('pill plain'));
assert(vm.runInContext("dataStatusPill({uncertainty:'Nie potwierdzono uruchomienia'}, {notes:[]})",rendering).includes('pill warn'));
console.log('PASS: potwierdzone budżety zielone, oceny oznaczone osobno, braki neutralne; brak fałszywych potwierdzeń.');

// Recommendations follow maturity and actual use; textual similarity is only a review signal.
const next=(extra={},score=70,sims=[],comp=85)=>{ctx.nextInput=Object.assign({type:'technologiczna',stage:4,trl:9,wdr:4,ip:0},extra);ctx.nextScore=score;ctx.nextSims=sims;ctx.nextComp=comp;return run('recommend(nextInput,nextScore,nextSims,nextComp)')};
assert.equal(next({stage:0,wdr:1}).primary.key,'rozwoj');
assert(next({stage:1,wdr:1}).primary.title.includes('prototyp'));
assert(next({stage:2,wdr:1}).primary.title.includes('pilotaż'));
assert(next({stage:4,wdr:1}).primary.title.includes('pilotaż'));
assert.equal(next().primary.key,'komerc');
assert.equal(next({},54).primary.key,'rozwoj');
assert.equal(next({},55).primary.key,'komerc');
assert.equal(next({type:'edukacyjna',trlNA:true}).primary.key,'transfer');
assert.equal(next({stage:null}).primary.key,'dane');
assert.equal(next({},70,[{id:'other',title:'Inny projekt',sim:.35}]).primary.key,'wspolpraca');
assert.equal(next({},70,[{id:'other',title:'Inny projekt',sim:.349}]).primary.key,'komerc');
assert.equal(next({},70,[],30).primary.key,'komerc');
assert(next({},70,[],30).alerts.some(x=>x.txt.includes('wstępna')));
assert(next().basis.some(x=>x.includes('Brak potwierdzonych danych')));
assert(next({ip:1}).basis.some(x=>x.includes('w toku')));
assert(next({ip:2}).basis.some(x=>x.includes('Zadeklarowana ochrona')));
for(const i of rows){const a=run(`analyze(S.items.find(x=>x.id===${JSON.stringify(i.id)}))`);assert.equal(a.rec.primary.steps.length,3,i.id);assert.equal(a.rec.basis.length,4,i.id);}
vm.runInContext(fs.readFileSync(root+'/src/js/42-ui-drawer-modal.js','utf8'),rendering);
assert(vm.runInContext('recBlock(analyze(subject))',rendering).includes('Co zrobić teraz'));
assert(vm.runInContext('cardText(subject,analyze(subject))',rendering).includes('CO ZROBIĆ TERAZ:'));
rendering.nextUnsafe=next({},70,[{title:'<img src=x onerror=alert(1)>',sim:.5}]);
assert(!vm.runInContext('recBlock({rec:nextUnsafe})',rendering).includes('<img'));
console.log('PASS: wszystkie ścieżki rekomendacji, progi podobieństwa i oceny, brak danych IP, 198 planów działania, eksport i bezpieczne wyświetlanie.');

assert(vm.runInContext('cardTxt(subject,analyze(subject))',rendering).includes('CO ZROBIĆ TERAZ:'));
// Published catalog cards must all display individually authored recommendations.
for(const i of rows){const a=run(`analyze(S.items.find(x=>x.id===${JSON.stringify(i.id)}))`);assert(a.rec.authored,`Brak indywidualnej rekomendacji: ${i.id}`);}
assert.equal(new Set(rows.map(i=>run(`analyze(S.items.find(x=>x.id===${JSON.stringify(i.id)})).rec.primary.title`))).size,rows.length);
console.log('PASS: 198 indywidualnych rekomendacji z unikalnymi tytułami dla aktualnego katalogu.');
