"""Publish only extracted statements, with field-level source references."""
import json
import re
from datetime import datetime,timezone
from urllib.parse import urlsplit
from lxml import html

REQUIRED=('title','description','entity','implementation','benefits','application')

def allowed(url):
    parsed=urlsplit(url);host=(parsed.hostname or '').lower()
    if parsed.scheme!='https':return False
    return ((host in ('www.gov.pl','gov.pl') and parsed.path.startswith('/web/ncbr/')) or
            host=='interreg.gov.pl' or host.endswith('.interreg.gov.pl') or
            host in ('ewyszukiwarka.pue.uprp.gov.pl','register.epo.org','pbn.nauka.gov.pl','ppm.edu.pl','www.czasopisma.pan.pl','czasopisma.pan.pl','baztol.library.put.poznan.pl',
                     'imn.lukasiewicz.gov.pl','www.parp.gov.pl','cordis.europa.eu'))

def normalize(text):return ' '.join(text.split())

def extract_ncbr(document,url):
    if not allowed(url):raise ValueError('Źródło poza dozwolonym katalogiem')
    doc=html.fromstring(document)
    body=doc.xpath('//article') or doc.xpath('//main') or [doc]
    sections={};current=None
    for node in body[0].iter():
        tag=node.tag if isinstance(node.tag,str) else ''
        if tag in ('h2','h3'):
            current=normalize(node.text_content());sections.setdefault(current,[])
        elif tag in ('p','li') and current:
            if any(parent.tag in ('p','li') for parent in node.iterancestors()):continue
            text=normalize(node.text_content())
            if text:sections[current].append(text)
    def section(pattern):
        for heading,paragraphs in sections.items():
            if re.search(pattern,heading,re.I):return paragraphs
        return []
    h=doc.xpath('//h2');title=normalize(h[0].text_content()) if h else ''
    title_values=section('^Tytuł projektu$');title=title_values[0] if title_values else title
    entity=section('Nazwa Beneficjenta')
    problem=section('Jaki problem')
    effect=section('Zobacz efekt')
    users=section('Kto korzysta')
    # Copy a statement of the achieved state; never map it to TRL or infer
    # deployment from the end date, funding amount or the word "innovation".
    achieved=[]
    sentences=[s for paragraph in effect+problem+users for s in re.split(r'(?<=[.!?])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ0-9])',paragraph)]
    for sentence in sentences:
        if len(sentence)<60 or sentence.endswith(':') or re.search(r'link do filmu|film zrealizowan|nasza rada|szkoły letnie|szkół letnich|konferencj|czasopism|artykuł|\b(?:koncepcja|projekt)\b.{0,30}\bpowstał[ao]?\b|\bcelem\b',sentence,re.I):continue
        if re.search(r'\bpowstał(?:a|o|y)?\b|\bopracowano\b|\bprzetestowan[oyae]\b|zakończył.{0,20}przetestowaniem|poddano ocenie|wprowadzon.{0,20}rynek|jest używan|są używan|implementowano|wdrożon',sentence,re.I) and not re.search(r'planowan|planuj|zostan\w*|będ\w*|celem jest|może|mogą|zamierz',sentence,re.I):
            achieved.append(sentence)
    # Benefits must be described in the article itself. Preserve whether the
    # author describes an effect or merely an expected application.
    benefit_sentences=[s for p in problem+users for s in re.split(r'(?<=[.!?])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ])',p)]
    benefits=[s for s in benefit_sentences if len(s)>40 and not s.endswith(':') and re.search(r'korzyść|korzyści|pozwal|umożliw|popraw|zwiększ|zmniejsz|ogranicz|ułatw|efektyw|bezpieczeń|oszczęd',s,re.I)]
    values={'title':title,'description':' '.join(problem) if problem else '', 'entity':entity[0] if entity else '',
            'implementation':achieved[0] if achieved else '', 'benefits':benefits[0] if benefits else '',
            'application':users[0] if users else ''}
    for field,pattern in [('implementation_period','Okres realizacji'),('project_value','Wartość projektu'),('grant_value','Wartość dofinansowania'),('programme','Nazwa programu')]:
        paragraphs=section(pattern)
        if paragraphs:values[field]=' '.join(paragraphs)
    return {key:{'value':value,'source_url':url,'source_name':'NCBR — Sukcesy beneficjentów','excerpt':value,
                 'retrieved_at':datetime.now(timezone.utc).isoformat(),'claim_type':'publisher_statement'} for key,value in values.items() if value}

def complete(facts):return all(k in facts and facts[k].get('value') and facts[k].get('excerpt') and allowed(facts[k].get('source_url','')) for k in REQUIRED)

def publishable(db,facts):
    setting=db.execute("SELECT value FROM runtime_settings WHERE key='source_allow_missing'").fetchone()
    keys=('title',) if setting and setting[0]=='1' else REQUIRED
    return all(k in facts and facts[k].get('value') and facts[k].get('excerpt') and allowed(facts[k].get('source_url','')) for k in keys)

def save(db,rid,facts):
    for key,f in facts.items():
        if f['value']!=f['excerpt']:raise ValueError('Pole musi być literalną treścią źródła')
        if not allowed(f['source_url']):raise ValueError('Źródło poza katalogiem zadania')
        db.execute('INSERT INTO source_facts VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(record_id,field) DO UPDATE SET value=excluded.value,source_url=excluded.source_url,source_name=excluded.source_name,excerpt=excluded.excerpt,retrieved_at=excluded.retrieved_at,claim_type=excluded.claim_type',(rid,key,f['value'],f['source_url'],f['source_name'],f['excerpt'],f['retrieved_at'],f['claim_type']))

def read_facts(db,rid):
    return {r['field']:{k:r[k] for k in ('value','source_url','source_name','excerpt','retrieved_at','claim_type')} for r in db.execute('SELECT * FROM source_facts WHERE record_id=?',(rid,))}


def can_publish_record(db,rid):
    return bool(db.execute('SELECT 1 FROM polish_records WHERE id=?',(rid,)).fetchone()) and publishable(db,read_facts(db,rid))


def document(db,rid):
    facts=read_facts(db,rid)
    if not publishable(db,facts):raise ValueError('Rekord nie ma tytułu z dozwolonego źródła')
    record=db.execute('SELECT * FROM polish_records WHERE id=?',(rid,)).fetchone()
    if not record:raise ValueError('Brak potwierdzonego polskiego związku rekordu')
    row=dict(record)
    import profiles
    profile={k:None for k in profiles.FIELDS};profile.update(categories=[],education_levels=[],field_origins={},updated_at=None)
    for field in facts:profile['field_origins'][field]={'type':'source',**facts[field]}
    # Dictionary mapping is allowed only for an explicit achieved-state quote.
    # Keep the quote so the enum never replaces its documentary basis.
    implementation=facts.get('implementation',{}).get('value','')
    for code,pattern in [('pilot',r'pilotaż'),('prototype',r'prototyp'),('deployment',r'wdrożon|wprowadzon.{0,20}rynek')]:
        if re.search(pattern,implementation,re.I):
            profile['development_stage']=code
            profile['field_origins']['development_stage']={'type':'source','mapping':'explicit_stage_term',**facts['implementation']}
            break
    for f in facts.values():
        f['license']='CC BY-SA 4.0' if '/web/ncbr/' in f['source_url'] else None
        f['attribution']=f['source_name']
    review={'status':'disabled','missing':{}}
    setting=db.execute("SELECT value FROM runtime_settings WHERE key='profile_interpretation'").fetchone()
    if setting and setting[0]=='1':
        import profile_review
        review=profile_review.apply(db,rid,facts,profile)
    profile['publisher_role']='public_data'
    profile['field_origins']['publisher_role']={'type':'source','source_url':facts['title']['source_url']}
    if setting and setting[0]=='1':
        profile_review.apply_manual(db,rid,profile)
    sources=[{'id':s['source_id'],'name':s['name'],'external_id':s['external_id'],'fetched_at':s['fetched_at']} for s in db.execute('SELECT sr.*,s.name FROM source_records sr JOIN sources s ON s.id=sr.source_id WHERE record_id=? ORDER BY sr.source_id,sr.external_id',(rid,))]
    contacts=[dict(r) for r in db.execute('SELECT DISTINCT c.kind,c.value,c.source_url,e.name FROM contacts c JOIN record_entities re ON re.entity_id=c.entity_id JOIN entities e ON e.id=c.entity_id WHERE re.record_id=?',(rid,))]
    cordis_ids={s['external_id'] for s in sources if s['id']=='cordis'}
    if cordis_ids:
        polish_names=set(facts.get('entity',{}).get('value','').split('; '))
        contacts=[c for c in contacts if c['name'] in polish_names and
                  ('/contact-form/project/' not in c['value'] or c['value'].rstrip('/').rsplit('/',1)[-1] in cordis_ids)]
    missing=[field for field in REQUIRED if not facts.get(field,{}).get('value')]
    potential='\n'.join(facts.get(f,{}).get('value','') for f in ('benefits','application')).strip() or None
    row.update(title=facts['title']['value'],description=facts.get('description',{}).get('value'),url=facts['title']['source_url'],profile=profile,
        search_text=' '.join(f['value'] for f in facts.values()).casefold(),
        coverage={'missing_fields':missing,'complete':not missing},
        facts=facts,source_only=True,profile_review=review,entities=[dict(r) for r in db.execute('SELECT e.id,e.name,re.role FROM record_entities re JOIN entities e ON e.id=re.entity_id WHERE re.record_id=?',(rid,))],tags=[],
        contacts=contacts,
        sources=sources,
        assessment={'bucket':'verified' if implementation else 'candidate','areas':[],'audience':[],
        'trl':int(facts['trl']['value']) if facts.get('trl',{}).get('value','') in [str(n) for n in range(1,10)] else None,
        'novelty':None,'implementation':implementation or None,
        'potential':potential,'benefits':facts.get('benefits',{}).get('value'),'confidence':None,'interpretations':[],
        'assessment_origin':'source','novelty_status':'not_evaluated','implementation_status':'as_reported_in_source' if implementation else 'not_documented',
        'limitations':'Treść opublikowana przez wskazane źródło; nie jest niezależnym audytem skuteczności. Brakujące pola nie są uzupełniane przez AI.',
        'evidence':[{'field':key,'url':value['source_url'],**value} for key,value in facts.items()]})
    return row


def enabled(db):
    row=db.execute("SELECT value FROM runtime_settings WHERE key='source_only'").fetchone()
    return bool(row and row[0]=='1')


def publish(db,rid):
    data=document(db,rid)
    db.execute('INSERT INTO published_records VALUES(?,?,?) ON CONFLICT(record_id) DO UPDATE SET payload=excluded.payload,published_at=excluded.published_at',
      (rid,json.dumps(data,ensure_ascii=False),datetime.now(timezone.utc).isoformat()))


def process(connect,job):
    with connect() as db:
        db.execute('BEGIN IMMEDIATE')
        if not db.execute("SELECT 1 FROM processing_jobs WHERE record_id=? AND claim_token=? AND status='processing'",(job['record_id'],job['claim_token'])).fetchone():return
        facts={}
        for source in db.execute('SELECT raw_data FROM source_records WHERE record_id=? ORDER BY fetched_at DESC,source_id,external_id',(job['record_id'],)):
            for key,fact in json.loads(source[0]).get('source_facts',{}).items():facts.setdefault(key,fact)
        db.execute('DELETE FROM source_facts WHERE record_id=?',(job['record_id'],))
        save(db,job['record_id'],facts)
        if publishable(db,facts):publish(db,job['record_id'])
        else:db.execute('DELETE FROM published_records WHERE record_id=?',(job['record_id'],))
        db.execute("UPDATE processing_jobs SET status='completed',claim_token=NULL,lease_until=NULL,error=NULL,retry_after=NULL,updated_at=? WHERE record_id=?",(datetime.now(timezone.utc).isoformat(),job['record_id']))
