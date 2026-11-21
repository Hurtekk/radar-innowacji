let profileOptions = {};
let catalogFacets = null;
let editingRecord = null;
const $ = id => document.getElementById(id);
const types = {project:'Projekt',investment:'Inwestycja',publication:'Publikacja',patent:'Patent',innovation:'Innowacja / zasób'};
let presentationMode = false;
const statuses = {success:'Import działa',failed:'Błąd pobrania',needs_access:'Wymagany dostęp lub konfiguracja',requires_export:'Wymagany eksport',requires_credentials:'Wymagany klucz API',requires_configuration:'Wymagana konfiguracja',configured:'Gotowe do importu',running:'Import trwa',disabled:'Wyłączone'};
let page=1, totalPages=1, entity=null, view='records', requestNumber=0;
function node(tag,text,className){const n=document.createElement(tag);if(text)n.textContent=text;if(className)n.className=className;return n;}
function link(text,url){const a=node('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
async function api(path,options){const r=await fetch(path,options);if(!r.ok){const error=await r.json().catch(()=>({}));throw new Error(error.error||('HTTP '+r.status));}return r.json();}
function fail(error){$('message').textContent='Nie udało się pobrać danych. '+error.message;}
async function loadStats(){const s=await api('/api/stats');$('stats').replaceChildren();for(const [count,label] of [[s.records,'rekordów'],[s.entities,'podmiotów'],[s.contacts,'kontaktów']]){const n=node('span');n.append(node('strong',String(count)),document.createTextNode(label));$('stats').append(n);}}
async function loadRecords(){const serial=++requestNumber;const q=new URLSearchParams({q:$('query').value,kind:$('kind').value,source:$('source').value,bucket:$('verification').value,catalog:'all',page,description:$('has-description').checked?'yes':''});for(const select of document.querySelectorAll('#profile-filters select'))if(select.value)q.set(select.name,select.value);if(entity)q.set('entity',entity.id);const data=await api('/api/search?'+q);if(serial!==requestNumber)return;totalPages=data.pages;$('cards').replaceChildren();for(const r of data.items){const c=node('article',null,'card');c.append(node('small',types[r.kind]||r.kind),node('h2',r.title),node('p',r.description||'Brak danych'));c.append(node('span',verificationLabel(r), 'badge'),profileBadges(r.profile));const f=node('footer');f.append(link('Źródło',r.url));const b=node('button','Szczegóły i kontakty');b.onclick=()=>detail(r);f.append(b);c.append(f);$('cards').append(c);}if(!data.items.length)$('cards').append(node('p',data.preparing?'Przygotowujemy pierwsze rekordy. Gotowe dane pojawią się tutaj automatycznie.':'Brak wyników. Zmień filtry.','empty'));$('page').textContent=page+' / '+Math.max(1,totalPages)+' · '+data.total+' wyników';$('previous').disabled=page<=1;$('next').disabled=page>=totalPages;}
function filterEntity(e){entity=e;page=1;$('detail').close();setView('records');$('entity-filter').hidden=false;$('entity-filter').replaceChildren(document.createTextNode('Powiązane z '+e.name+' '));const clear=node('button','Usuń filtr');clear.onclick=()=>{entity=null;$('entity-filter').hidden=true;loadRecords().catch(fail)};$('entity-filter').append(clear);loadRecords().catch(fail);}
function detail(r){const body=$('detail-body');body.replaceChildren(node('small',types[r.kind]),node('h2',r.title),node('p',r.description||'Brak danych'));showAssessment(body,r);if(r.subtype==='institutional_infrastructure')body.append(node('p','Inwestycja infrastrukturalna instytucji naukowej. Dane nie wskazują automatycznie inwestora venture capital.'));const tags=node('div',null,'tags');for(const t of r.tags)tags.append(node('span',t,'tag'));body.append(tags);if(r.entities.length){body.append(node('h3','Powiązane podmioty'));const relations=node('div',null,'relations');for(const e of r.entities){const b=node('button',e.name+' · '+e.role);b.onclick=()=>filterEntity(e);relations.append(b);}body.append(relations);}if(r.contacts.length){body.append(node('h3','Publiczne kontakty'));for(const c of r.contacts){const p=node('p',c.name+' · ');const url=c.kind==='email'?'mailto:'+c.value:c.kind==='phone'?'tel:'+c.value:c.value;if(url.startsWith('https://')||url.startsWith('http://')||url.startsWith('mailto:')||url.startsWith('tel:'))p.append(link(c.value,url));else p.append(document.createTextNode(c.value));p.append(document.createTextNode(' · '),link('Potwierdzenie',c.source_url));body.append(p);}}body.append(link('Otwórz oryginalny rekord',r.url),node('h3','Pochodzenie danych'));for(const s of r.sources)body.append(node('p',s.name+' · pobrano '+new Date(s.fetched_at).toLocaleString('pl-PL')+' · ID '+s.external_id));$('detail').showModal();}
async function loadSources(){const sources=await api('/api/sources');const selected=$('source').value;$('source').replaceChildren(new Option('Wszystkie źródła',''));$('source-list').replaceChildren();for(const s of sources){const visibleCount = catalogFacets?.sources?.[s.id] ?? s.published_count ?? 0;if(visibleCount)$('source').append(new Option(s.name+' ('+visibleCount+')',s.id));const c=node('article',null,'source');c.append(node('h2',s.name),node('span',statuses[s.status]||s.status,'badge '+s.status));c.append(node('p',s.count+' rekordów · '+s.entity_count+' podmiotów · znany rozmiar zbioru '+(s.total_available??'nieustalony')));c.append(node('p','Ostatni sukces '+(s.last_success?new Date(s.last_success).toLocaleString('pl-PL'):'jeszcze brak')+' · odświeżanie co '+s.interval_hours+' h'));if(s.processing&&!presentationMode)c.append(node('p',`Gotowe: ${s.processing.published} · oczekujące ${s.processing.pending} · przetwarzane ${s.processing.processing} · ukończone ${s.processing.completed} · błędne ${s.processing.failed}`));if(s.error||s.note)c.append(node('p',s.error||s.note));c.append(link('Otwórz źródło',s.url));if(s.enabled&&!presentationMode){const b=node('button','Pobierz kolejną partię');b.onclick=()=>refresh(s.id);c.append(document.createTextNode(' '),b);}$('source-list').append(c);}$('source').value=selected;}
async function loadEntities(){const data=await api('/api/entities?q='+encodeURIComponent($('entity-query').value));$('entity-cards').replaceChildren();for(const e of data){const c=node('article',null,'card');c.append(node('h2',e.name),node('p',e.record_count+' powiązanych rekordów'));const b=node('button','Zobacz projekty i branże');b.onclick=()=>filterEntity(e);c.append(b);$('entity-cards').append(c);}}
async function refresh(source){$('refresh').disabled=true;try{await api('/api/refresh'+(source?'?source='+encodeURIComponent(source):''),{method:'POST'});$('message').textContent=presentationMode?'Gotowe dane do prezentacji. Odświeżanie jest wyłączone.':'Import uruchomiony. Postęp zobaczysz w zakładce Źródła i import.';}catch(e){fail(e)}finally{$('refresh').disabled=false;}}
function setView(name){view=name;for(const id of ['records','entities','sources'])$(id).hidden=id!==name;for(const b of document.querySelectorAll('nav button'))b.classList.toggle('active',b.dataset.view===name);if(name==='entities')loadEntities().catch(fail);if(name==='sources')loadSources().catch(fail);}
for(const b of document.querySelectorAll('nav button'))b.onclick=()=>setView(b.dataset.view);
let debounce;for(const id of ['query','kind','source','has-description','verification'])$(id).addEventListener(id==='query'?'input':'change',()=>{clearTimeout(debounce);debounce=setTimeout(()=>{page=1;loadRecords().catch(fail)},200)});
$('entity-query').oninput=()=>{clearTimeout(debounce);debounce=setTimeout(()=>loadEntities().catch(fail),200)};
$('previous').onclick=()=>{page--;loadRecords().catch(fail)};$('next').onclick=()=>{page++;loadRecords().catch(fail)};$('refresh').onclick=()=>refresh();$('close-detail').onclick=()=>$('detail').close();




const profileLabels = {
  development_stage: 'Etap rozwoju',
  project_type: 'Rodzaj projektu',
  impact_scale: 'Skala wpływu',
  publisher_role: 'Kto publikuje',
  impact_description: 'Opis wpływu i jego mierniki',
  investor_benefits: 'Korzyści dla inwestora',
  innovator_benefits: 'Korzyści dla innowatora'
};

function profileBadges(profile) {
  const container = node('div', null, 'tags');
  if (!profile) return container;
  if (profile.development_stage) {
    container.append(node('span', profileOptions.development_stage[profile.development_stage], 'tag'));
  }
  for (const category of profile.categories) {
    container.append(node('span', profileOptions.categories[category], 'tag'));
  }
  return container;
}

function showProfile(body, record) {
  const profile = record.profile;
  if (!profile) return;
  body.append(node('h3', 'Profil projektu'));
  if (record.source_only) {
    const fields = node('dl', null, 'profile-values');
    for (const [field, label] of Object.entries({...profileLabels, categories:'Kategorie', education_levels:'Środowisko projektu'})) {
      const raw = profile[field];
      const text = Array.isArray(raw) ? raw.map(code => profileOptions[field]?.[code]).filter(Boolean).join(', ') : profileOptions[field]?.[raw] || raw;
      const origin = profile.field_origins?.[field];
      const interpreted = origin?.kind === 'interpretation';
      const value = node('dd', text || record.profile_review?.missing?.[field] || 'Nie ustalono — za mało danych w opisie źródłowym.');
      if (text && interpreted) value.append(node('small', ' · Interpretacja opisu'));
      if (text && origin?.source_url) value.append(document.createTextNode(' '), link(interpreted ? 'Podstawa w źródle' : 'Dowód w źródle', origin.source_url));
      if (text && origin?.excerpt) value.append(node('p', origin.excerpt));
      if (text && interpreted) value.title = origin.reason + ' Podstawa: ' + origin.evidence_quote;
      fields.append(node('dt', label), value);
    }
    body.append(fields);
    if (record.profile_review?.notice) body.append(node('p', record.profile_review.notice));
    if (record.profile_review?.status === 'stale') body.append(node('p', 'Opis źródłowy zmienił się. Poprzednie interpretacje wymagają ponownej analizy.'));
    if (record.profile_review?.status === 'reviewed') {
      const edit = node('button', 'Edytuj profil');
      edit.onclick = () => editProfile(record);
      body.append(edit);
    }
    return;
  }
  const fields = node('dl', null, 'profile-values');
  for (const field of ['development_stage', 'project_type', 'impact_scale', 'publisher_role']) {
    const value = profile[field];
    fields.append(node('dt', profileLabels[field]), node('dd', profileOptions[field]?.[value] || 'Brak danych'));
  }
  for (const [field, label] of [['categories', 'Kategorie'], ['education_levels', 'Środowisko projektu']]) {
    const values = (profile[field] || []).map(code => profileOptions[field]?.[code]).filter(Boolean);
    fields.append(node('dt', label), node('dd', values.join(', ') || 'Brak danych'));
  }
  for (const field of ['impact_description', 'investor_benefits', 'innovator_benefits']) {
    const potential = field.endsWith('_benefits') && profile.field_origins?.[field]?.type === 'ai';
    fields.append(node('dt', (potential ? 'Potencjalne ' : '') + profileLabels[field].toLocaleLowerCase('pl-PL')), node('dd', profile[field] || 'Brak danych'));
  }
  body.append(fields);
  const edit = node('button', 'Edytuj profil');
  edit.onclick = () => editProfile(record);
  body.append(edit);
}

function createSelect(field, options, value, emptyLabel) {
  const select = node('select');
  select.name = field;
  select.append(new Option(emptyLabel, ''));
  for (const [code, label] of Object.entries(options)) select.append(new Option(label, code));
  select.value = value || '';
  return select;
}

async function loadFilterOptions() {
  // Older running servers also expose search, so changes work without a restart.
  try { return await api('/api/filter-options'); } catch (error) {
    const facets = {profile:{}, kinds:{}, buckets:{}, sources:{}};
    let current = 1, pages = 1;
    do {
      const data = await api('/api/search?catalog=all&limit=100&page=' + current);
      pages = data.pages;
      const increment = (values, key) => { if (key) values[key] = (values[key] || 0) + 1; };
      for (const record of data.items) {
        increment(facets.kinds, record.kind);
        increment(facets.buckets, record.assessment?.bucket);
        for (const id of new Set((record.sources || []).map(source => source.id))) increment(facets.sources, id);
        for (const [field, raw] of Object.entries(record.profile || {})) {
          if (!['development_stage','project_type','impact_scale','publisher_role','categories','education_levels'].includes(field)) continue;
          const values = facets.profile[field] ||= {};
          for (const code of new Set(Array.isArray(raw) ? raw : raw ? [raw] : [])) {
            values[code] ||= {count:0};
            values[code].count++;
          }
        }
      }
      current++;
    } while (current <= pages);
    return facets;
  }
}

async function initializeProfiles() {
  const [options, facets] = await Promise.all([api('/api/options'), loadFilterOptions()]);
  profileOptions = options;
  catalogFacets = facets;
  $('profile-filters').replaceChildren();
  for (const [id, values] of [['kind', facets.kinds], ['verification', facets.buckets]]) {
    const select = $(id);
    for (const option of [...select.options]) if (option.value && !values[option.value]) option.remove();
    select.value = '';
    select.hidden = Object.keys(values).length < 2;
  }
  const filters = {
    development_stage: 'Wszystkie etapy',
    project_type: 'Wszystkie rodzaje',
    impact_scale: 'Każda skala wpływu',
    category: 'Wszystkie kategorie',
    education_level: 'Każdy etap edukacji',
    publisher_role: 'Każdy publikujący'
  };
  for (const [field, label] of Object.entries(filters)) {
    const key = {category: 'categories', education_level: 'education_levels'}[field] || field;
    const available = facets.profile[key] || {};
    if (!Object.keys(available).length || (field === 'publisher_role' && Object.keys(available).length < 2)) continue;
    const labels = Object.fromEntries(Object.entries(available).map(([code, item]) => [code, (profileOptions[key]?.[code] || item.label || code) + ' (' + item.count + ')']));
    const select = createSelect(field, labels, null, label);
    select.setAttribute('aria-label', label);
    select.onchange = () => { page = 1; loadRecords().catch(fail); };
    $('profile-filters').append(select);
  }
}

function createCheckboxes(field, label, options, selected) {
  const fieldset = node('fieldset');
  fieldset.append(node('legend', label));
  for (const [code, text] of Object.entries(options)) {
    const wrapper = node('label', null, 'checkbox-option');
    const input = node('input');
    input.type = 'checkbox';
    input.name = field;
    input.value = code;
    input.checked = selected.includes(code);
    wrapper.append(input, document.createTextNode(text));
    fieldset.append(wrapper);
  }
  if (field === 'categories') {
    fieldset.onchange = () => {
      const boxes = [...fieldset.querySelectorAll('input')];
      const count = boxes.filter(box => box.checked).length;
      for (const box of boxes) box.disabled = !box.checked && count >= 3;
    };
    fieldset.dispatchEvent(new Event('change'));
  }
  return fieldset;
}

function editProfile(record) {
  editingRecord = record;
  const profile = record.profile;
  const fields = $('profile-fields');
  fields.replaceChildren();
  $('profile-error').textContent = '';
  for (const field of ['development_stage', 'project_type', 'impact_scale', 'publisher_role']) {
    const label = node('label', profileLabels[field], 'form-field');
    label.append(createSelect(field, profileOptions[field], profile[field], 'Nieustalone'));
    fields.append(label);
  }
  fields.append(createCheckboxes('categories', 'Kategorie — maksymalnie 3', profileOptions.categories, profile.categories));
  fields.append(createCheckboxes('education_levels', 'Etap edukacji / środowisko projektu', profileOptions.education_levels, profile.education_levels));
  for (const field of ['impact_description', 'investor_benefits', 'innovator_benefits']) {
    const label = node('label', profileLabels[field], 'form-field');
    const input = node('textarea');
    input.name = field;
    input.maxLength = 10000;
    input.rows = 4;
    input.value = profile[field] || '';
    label.append(input);
    fields.append(label);
  }
  $('detail').close();
  $('profile-dialog').showModal();
}

$('cancel-profile').onclick = () => $('profile-dialog').close();
$('profile-form').onsubmit = async event => {
  event.preventDefault();
  const data = new FormData(event.target);
  const payload = {};
  for (const field of ['development_stage', 'project_type', 'impact_scale', 'publisher_role', 'impact_description', 'investor_benefits', 'innovator_benefits']) {
    payload[field] = data.get(field) || null;
  }
  payload.categories = data.getAll('categories');
  payload.education_levels = data.getAll('education_levels');
  $('save-profile').disabled = true;
  try {
    editingRecord.profile = await api('/api/records/' + editingRecord.id + '/profile', {
      method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)
    });
    $('profile-dialog').close();
    detail(editingRecord);
    await loadRecords();
  } catch (error) {
    $('profile-error').textContent = error.message;
  } finally {
    $('save-profile').disabled = false;
  }
};

let processingRequest = false;
async function loadProcessing() {
  if (processingRequest) return;
  processingRequest = true;
  try {
  const p = await api('/api/processing');
  presentationMode = p.mode === 'presentation';
  $('processing-panel').hidden = presentationMode;
  $('refresh').hidden = presentationMode;
  if (presentationMode) return p;
  $('processing-status').textContent = `Dostępne w katalogu: ${p.published}. Aktualizacja: oczekujące ${p.pending} · przetwarzane ${p.processing} · ukończone ${p.completed} · błędne ${p.failed}`;
  if (p.performance?.measured) $('processing-status').textContent += ` · średnio ${p.performance.average_seconds} s na analizę (ostatnie ${p.performance.measured})`;
  const total = p.total ?? (p.pending + p.processing + p.completed + p.failed);
  const percent = p.percent ?? (total ? 100 * p.completed / total : 100);
  $('processing-bar').value = percent;
  $('processing-status').textContent += ` · ${p.completed}/${total} (${percent.toFixed(1)}%)`;
  $('processing-active').replaceChildren();
  const phases = {preparing:'Przygotowanie danych',cache:'Odczyt gotowej analizy',model:'Oczekiwanie na pierwszą odpowiedź modelu',generating:'Generowanie odpowiedzi',saving:'Sprawdzanie i zapis wyniku'};
  for (const task of p.active || []) {
    const line = node('div', null, 'processing-task');
    line.append(node('strong', task.title), node('p', `${phases[task.phase] || 'Przetwarzanie'} · ${task.elapsed_seconds} s · ${task.output_chars} wygenerowanych znaków`));
    $('processing-active').append(line);
  }
  if (!p.active?.length) {
    let message = p.state_message || 'Oczekiwanie na informacje z procesu przetwarzania.';
    if (p.next_retry) message += ' Ponowienie: ' + new Date(p.next_retry).toLocaleTimeString('pl-PL') + '.';
    $('processing-active').append(node('p', message));
  }
  if (p.recent?.length) {
    const latest = p.recent[0];
    $('processing-active').append(node('small', `Ostatnio ukończono: ${latest.title} · ${latest.cached ? 'zapisany wynik' : latest.wall_seconds.toFixed(1) + ' s'}`));
  }
  $('processing-errors').replaceChildren();
  for (const e of p.errors) $('processing-errors').append(node('p', `${e.title}: ${e.error} Ponowienie po ${new Date(e.retry_after).toLocaleTimeString('pl-PL')}.`));
  return p;
  } finally { processingRequest = false; }
}

async function boot() {
  await initializeProfiles();
  await loadProcessing();
  await Promise.all([loadStats(), loadSources(), loadRecords()]);
  if (presentationMode) return;
  setInterval(() => loadProcessing().catch(fail), 2000);
  setInterval(async () => {
    try {
      await loadStats();
      if (view === 'sources') await loadSources();
      if (view === 'records') await loadRecords();
    } catch (error) { fail(error); }
  }, 10000);
}
boot().catch(fail);

function verificationLabel(record) {
  if (record.source_only) return record.sources?.[0]?.name || 'Opis ze źródła publicznego';
  return {verified:'Dokumentacja dostępności / zastosowania',candidate:'Kandydat — wymaga weryfikacji',context:'Materiał źródłowy — nie potwierdza innowacji'}[record.assessment?.bucket] || 'Nie oceniono';
}
function showAssessment(body, record) {
  if (record.source_only) {
    if (record.facts?.objective) body.append(node('p', 'Opis przedstawia cele projektu zapisane w CORDIS. Nie stanowi potwierdzenia ich realizacji ani wdrożenia.'));
    body.append(node('h3', 'Informacje ze źródła'));
    const fields = node('dl', null, 'profile-values');
    for (const [field, label] of [['entity', record.sources?.some(s => s.id === 'cordis') ? 'Polscy uczestnicy projektu' : record.sources?.some(s => s.id === 'lukasiewicz_imn') ? 'Podmiot udostępniający technologię' : 'Beneficjent / podmiot wskazany w źródle'], ['implementation', 'Stan realizacji opisany w źródle'], ['benefits', 'Korzyści opisane przez beneficjenta'], ['application', 'Zastosowanie i odbiorcy'], ['implementation_period', 'Okres realizacji projektu'], ['project_value', 'Wartość projektu'], ['grant_value', 'Dofinansowanie — nie inwestycja kapitałowa'], ['programme', 'Program finansowania'], ['trl', 'TRL podany przez źródło'], ['ip_status', 'Informacja o własności intelektualnej ze źródła'], ['polish_connection', 'Polski związek projektu — fragment źródła'], ['start_date', 'Data rozpoczęcia projektu'], ['end_date', 'Data zakończenia projektu według źródła'], ['source_status', 'Status administracyjny w źródle']]) {
      const fact = record.facts?.[field];
      if (!fact?.value) {
        if (['entity','implementation','benefits','application'].includes(field)) fields.append(node('dt', label), node('dd', 'Brak danych'));
        continue;
      }
      const value = node('dd', fact.value);
      value.append(document.createTextNode(' '), link(fact.source_name, fact.source_url));
      fields.append(node('dt', label), value);
    }
    body.append(fields);
    if (record.assessment?.limitations) body.append(node('p', record.assessment.limitations));
    return;
  }
  const a=record.assessment;
  body.append(node('p', verificationLabel(record)));
  if (!a) return;
  const fields=node('dl',null,'profile-values');
  for (const [label,value] of [['Nowość — ocena',a.novelty],['Dostępność i wdrożenie',a.implementation],['Możliwe zastosowania — ocena',a.potential],['Dokumentacja',a.confidence],['TRL',a.trl ? String(a.trl) : 'Brak potwierdzonego poziomu'],['Ograniczenia',a.limitations]]) fields.append(node('dt',label),node('dd',value || 'Brak danych'));
  body.append(fields);
  for (const e of a.evidence || []) body.append(link('Podstawa oceny',e.url));
}
