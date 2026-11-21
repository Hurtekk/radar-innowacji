import argparse
import hashlib
import json
import os
import re
import sqlite3
import threading
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from connectors import CONNECTORS, clean
from net import AccessRequired, Client
import profiles
import geography
import local_ai
import pipeline
import assessment
import source_only
import profile_review

ROOT = Path(__file__).resolve().parent


def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


class Connection(sqlite3.Connection):
    def __exit__(self,*args):
        try:return super().__exit__(*args)
        finally:self.close()


def connect():
    db = sqlite3.connect(ROOT / 'radar.sqlite3', timeout=60, factory=Connection)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    db.execute('PRAGMA journal_mode=WAL')
    return db


def initialize():
    # Online backup includes WAL pages and precedes any schema/data writes.
    database=ROOT/'radar.sqlite3'
    if database.exists():
        with sqlite3.connect(database,factory=Connection) as old:
            names={r[0] for r in old.execute("SELECT name FROM schema_migrations")} if old.execute("SELECT 1 FROM sqlite_master WHERE name='schema_migrations'").fetchone() else set()
            if any(p.name not in names for p in (ROOT/'migrations').glob('*.sql')):
                backup=ROOT/('radar.backup-'+datetime.now().strftime('%Y%m%d-%H%M%S-%f')+'.sqlite3')
                with sqlite3.connect(backup,factory=Connection) as target:old.backup(target)
    with connect() as db:
        db.executescript((ROOT / 'schema.sql').read_text())
        db.execute('CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)')
        for path in sorted((ROOT / 'migrations').glob('*.sql')):
            if not db.execute('SELECT 1 FROM schema_migrations WHERE name=?', (path.name,)).fetchone():
                # Serialise initialization across the server and worker processes.
                db.execute('BEGIN IMMEDIATE')
                if not db.execute('SELECT 1 FROM schema_migrations WHERE name=?', (path.name,)).fetchone():
                    statement=''
                    for line in path.read_text().splitlines(keepends=True):
                        statement+=line
                        if sqlite3.complete_statement(statement):
                            db.execute(statement)
                            statement=''
                    if statement.strip():
                        raise ValueError('Niekompletna migracja '+path.name)
                    db.execute('INSERT INTO schema_migrations VALUES(?,?)', (path.name,now()))
                db.commit()
        profiles.seed(db)
        geography.backfill(db,ROOT)
        settings = json.loads((ROOT / 'settings.json').read_text())
        policy=settings.get('catalog_policy',{})
        if 'allow_missing_fields' in policy:
            db.execute("INSERT INTO runtime_settings VALUES('source_allow_missing',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",('1' if policy['allow_missing_fields'] else '0',))
        if policy.get('ai_interpretations') is False:
            db.execute("INSERT INTO runtime_settings VALUES('profile_interpretation','0') ON CONFLICT(key) DO UPDATE SET value='0'")
        for config in settings['sources']:
            connector = config.get('connector') if config.get('enabled') else None
            status = 'configured' if connector else config.get('status','disabled')
            if not connector:
                db.execute("UPDATE sources SET status=? WHERE id=? AND status!='success'",(status,config['id']))
            db.execute('INSERT INTO sources(id,name,url,connector,config,interval_hours,status) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,url=excluded.url,connector=excluded.connector,config=excluded.config,interval_hours=excluded.interval_hours',
                       (config['id'],config['name'],config['url'],connector,json.dumps(config,ensure_ascii=False),config.get('interval_hours',24),status))

    with connect() as db:
        profile_review.sync(db,ROOT/'data/profile-reviews.json')
    pipeline.reconcile(connect)


def upsert_entity(db, entity, source_url):
    name=clean(entity['name'])
    if not name:
        raise ValueError('Podmiot bez nazwy')
    key=entity.get('external_id') or 'name:'+name.casefold()
    found=db.execute('SELECT id FROM entities WHERE external_id=?',(key,)).fetchone()
    if not found:
        # A strong identifier can enrich a previously imported exact name.
        found=db.execute("SELECT id FROM entities WHERE external_id=?",('name:'+name.casefold(),)).fetchone()
    if found:
        entity_id=found['id']
    else:
        entity_id=db.execute('INSERT INTO entities(name,kind,external_id) VALUES(?,?,?)',(name,entity.get('kind','organization'),key)).lastrowid
    for scheme,value in entity.get('identifiers',{}).items():
        db.execute('INSERT INTO entity_identifiers VALUES(?,?,?) ON CONFLICT(scheme,value) DO NOTHING',(entity_id,scheme,str(value)))
    for contact in entity.get('contacts',[]):
        value=str(contact['value']).strip()
        if value:
            db.execute('INSERT INTO contacts(entity_id,kind,value,source_url,verified_at) VALUES(?,?,?,?,?) ON CONFLICT(entity_id,kind,value) DO UPDATE SET source_url=excluded.source_url,verified_at=excluded.verified_at',
                       (entity_id,contact['kind'],value,source_url,now()))
    return entity_id


def canonical(item):
    if item.get('canonical_key'):
        return item['canonical_key']
    url=item['url'].strip()
    if 'doi.org/' in url:
        return 'doi:'+url.split('doi.org/',1)[1].lower()
    # A shared spreadsheet URL identifies a dataset, not a single project.
    if any(extension in url.lower() for extension in ['.xlsx','.xls','.csv','.zip']):
        return None
    return 'url:'+url


def save_record(db, source_id, item):
    timestamp=now()
    title,description,url=clean(item['title']),clean(item.get('description')) or None,item['url']
    if not title or not url.startswith(('http://','https://')):
        raise ValueError('Rekord wymaga tytułu i poprawnego linku do źródła')
    old=db.execute('SELECT record_id FROM source_records WHERE source_id=? AND external_id=?',(source_id,item['id'])).fetchone()
    key=canonical(item)
    target=db.execute('SELECT id FROM records WHERE canonical_key=?',(key,)).fetchone() if key else None
    record_id=old['record_id'] if old else target['id'] if target else None
    if record_id:
        # A source without an abstract must not erase an existing sourced description.
        db.execute('UPDATE records SET title=?,description=COALESCE(?,description),url=?,updated_at=?,subtype=COALESCE(?,subtype),canonical_key=COALESCE(canonical_key,?) WHERE id=?',
                   (title,description,url,timestamp,item.get('subtype'),key,record_id))
    else:
        record_id=db.execute('INSERT INTO records(kind,title,description,url,first_seen,updated_at,search_text,subtype,canonical_key) VALUES(?,?,?,?,?,?,?,?,?)',
            (item['kind'],title,description,url,timestamp,timestamp,'',item.get('subtype'),key)).lastrowid
    db.execute('INSERT INTO source_records VALUES(?,?,?,?,?) ON CONFLICT(source_id,external_id) DO UPDATE SET fetched_at=excluded.fetched_at,raw_data=excluded.raw_data',
               (source_id,item['id'],record_id,timestamp,json.dumps(item.get('raw',item),ensure_ascii=False,default=str)))
    db.execute('DELETE FROM source_record_entities WHERE source_id=? AND external_id=?',(source_id,item['id']))
    roles={}
    for entity in item.get('entities',[]):
        if not clean(entity.get('name')):
            continue
        entity_id=upsert_entity(db,entity,url)
        role=entity.get('role','related')
        db.execute('INSERT OR IGNORE INTO source_record_entities VALUES(?,?,?,?)',(source_id,item['id'],entity_id,role))
        roles[role]=entity_id
    db.execute('DELETE FROM record_entities WHERE record_id=?',(record_id,))
    db.execute('INSERT OR IGNORE INTO record_entities SELECT sr.record_id,se.entity_id,se.role FROM source_record_entities se JOIN source_records sr USING(source_id,external_id) WHERE sr.record_id=?',(record_id,))
    db.execute('DELETE FROM source_record_tags WHERE source_id=? AND external_id=?',(source_id,item['id']))
    for tag in item.get('tags',[]):
        name=clean(tag)
        if not name:
            continue
        db.execute('INSERT OR IGNORE INTO tags(name) VALUES(?)',(name,))
        tag_id=db.execute('SELECT id FROM tags WHERE name=?',(name,)).fetchone()[0]
        db.execute('INSERT OR IGNORE INTO source_record_tags VALUES(?,?,?)',(source_id,item['id'],tag_id))
    db.execute('DELETE FROM record_tags WHERE record_id=?',(record_id,))
    db.execute('INSERT OR IGNORE INTO record_tags SELECT ?,st.tag_id FROM source_record_tags st JOIN source_records sr USING(source_id,external_id) WHERE sr.record_id=?',(record_id,record_id))
    if item['kind']=='investment':
        db.execute('INSERT INTO investments(record_id,investor_id,recipient_id,amount,currency) VALUES(?,?,?,?,?) ON CONFLICT(record_id) DO UPDATE SET investor_id=excluded.investor_id,recipient_id=excluded.recipient_id,amount=excluded.amount,currency=excluded.currency',
            (record_id,roles.get('investor'),roles.get('recipient') or roles.get('owner'),item.get('amount'),item.get('currency')))
    names=[r[0] for r in db.execute('SELECT e.name FROM record_entities re JOIN entities e ON e.id=re.entity_id WHERE re.record_id=?',(record_id,))]
    saved_description=db.execute('SELECT description FROM records WHERE id=?',(record_id,)).fetchone()[0]
    db.execute('UPDATE records SET search_text=? WHERE id=?',((' '.join([title,saved_description or '',*names])).casefold(),record_id))
    geography.sync_record(db,source_id,item,record_id,geography.load_index(ROOT))
    pipeline.enqueue(db,record_id)
    return record_id


def refresh_source(source_id, force=False, full=False, reset=False, limit=None):
    with connect() as db:
        if pipeline.presentation_mode(db):return
    started=now()
    with connect() as db:
        db.execute('BEGIN IMMEDIATE')
        source=db.execute('SELECT * FROM sources WHERE id=?',(source_id,)).fetchone()
        if not source or not source['connector']:
            return
        running=db.execute("SELECT 1 FROM refresh_runs WHERE source_id=? AND status='running' AND started_at>?",(source_id,(datetime.now(timezone.utc)-timedelta(hours=1)).isoformat())).fetchone()
        if running or (not force and source['next_refresh'] and source['next_refresh']>started):
            return
        db.execute("UPDATE refresh_runs SET status='failed',finished_at=?,error='Wygasła blokada importu' WHERE source_id=? AND status='running'",(started,source_id))
        run=db.execute("INSERT INTO refresh_runs(source_id,started_at,status) VALUES(?,?,'running')",(source_id,started)).lastrowid
        db.execute("UPDATE sources SET last_attempt=?,status='running' WHERE id=?",(started,source_id))
    try:
        config=json.loads(source['config'])
        batch_limit=0 if full else limit if limit is not None else config.get('batch_size',1000)
        batch=CONNECTORS[source['connector']](Client(ROOT/'data/cache'),config,{} if reset else json.loads(source['state']),batch_limit)
        if not batch.records and not batch.entities and batch.total != 0:
            raise ValueError('Źródło nie zwróciło rekordów do importu')
        with connect() as db:
            db.execute('BEGIN IMMEDIATE')
            if db.execute('SELECT status FROM refresh_runs WHERE id=?',(run,)).fetchone()[0]!='running':
                raise RuntimeError('Inny proces przejął import')
            index=geography.load_index(ROOT)
            accepted=[item for item in batch.records if geography.is_polish(source_id,item,index)]
            accepted_ids={str(item['id']) for item in accepted}
            for item in batch.records:
                if str(item['id']) in accepted_ids or db.execute('SELECT 1 FROM source_records WHERE source_id=? AND external_id=?',(source_id,item['id'])).fetchone():
                    save_record(db,source_id,item)
            for entity in batch.entities:
                eid=upsert_entity(db,entity,entity['source_url'])
                if source_id in geography.NATIONAL_ENTITIES or geography.explicit_country(entity.get('raw',{})):
                    db.execute('INSERT OR IGNORE INTO entity_countries VALUES(?,?)',(eid,'PL'))
                db.execute('INSERT INTO source_entities VALUES(?,?,?,?,?) ON CONFLICT(source_id,external_id) DO UPDATE SET entity_id=excluded.entity_id,raw_data=excluded.raw_data,fetched_at=excluded.fetched_at',
                    (source_id,str(entity['id']),eid,json.dumps(entity.get('raw',entity),ensure_ascii=False),now()))
                pipeline.touch_entity(db,eid)
            due=(datetime.now(timezone.utc)+timedelta(hours=source['interval_hours'])).isoformat()
            db.execute("UPDATE sources SET last_success=?,next_refresh=?,error=NULL,status='success',state=?,total_available=? WHERE id=?",(now(),due,json.dumps(batch.state),batch.total,source_id))
            db.execute("UPDATE refresh_runs SET finished_at=?,status='success',count=? WHERE id=?",(now(),len(accepted)+len(batch.entities),run))
        print(source_id,'OK',len(accepted),'polskich rekordów',len(batch.entities),'podmiotów',flush=True)
    except Exception as error:
        status='needs_access' if isinstance(error,AccessRequired) else 'failed'
        # Never store credentials or query strings from external exceptions.
        message=re.sub(r'https?://\S+','[adres źródła]',str(error))[:500]
        with connect() as db:
            retry=(datetime.now(timezone.utc)+timedelta(minutes=15 if status=='failed' else 1440)).isoformat()
            db.execute('UPDATE sources SET next_refresh=?,error=?,status=? WHERE id=?',(retry,message,status,source_id))
            db.execute('UPDATE refresh_runs SET finished_at=?,status=?,error=? WHERE id=?',(now(),status,message,run))
        print(source_id,status,message,flush=True)


def refresh(force=False, source_ids=None, full=False, reset=False, limit=None):
    with connect() as db:
        if pipeline.presentation_mode(db):return
        ids=[row['id'] for row in db.execute('SELECT id FROM sources WHERE connector IS NOT NULL') if not source_ids or row['id'] in source_ids]
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures=[pool.submit(refresh_source,sid,force,full,reset,limit) for sid in ids]
        for future in futures:
            future.result()


def record_details(db, row):
    return json.loads(row['published_payload'])


def filter_options(db):
    documents=[json.loads(row[0]) for row in db.execute('SELECT published_payload FROM ready_records')]
    dictionaries=profiles.dictionaries()
    result={'profile':{},'kinds':{},'buckets':{},'sources':{},'total':len(documents)}
    for document in documents:
        for field,target in [('kind','kinds')]:
            value=document.get(field)
            if value:result[target][value]=result[target].get(value,0)+1
        bucket=document.get('assessment',{}).get('bucket')
        if bucket:result['buckets'][bucket]=result['buckets'].get(bucket,0)+1
        for source in {s['id'] for s in document.get('sources',[])}:
            result['sources'][source]=result['sources'].get(source,0)+1
    for field,labels in dictionaries.items():
        counts={}
        for document in documents:
            value=document.get('profile',{}).get(field)
            for code in set(value if isinstance(value,list) else [value]):
                if code in labels:counts[code]=counts.get(code,0)+1
        result['profile'][field]={code:{'label':label,'count':counts[code]} for code,label in labels.items() if code in counts}
    return result


class Handler(BaseHTTPRequestHandler):
    def send_json(self,data,status=200):
        payload=json.dumps(data,ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store')
        self.send_header('Content-Length',str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        parsed=urllib.parse.urlparse(self.path)
        q=urllib.parse.parse_qs(parsed.query)
        try:
            self.get(parsed.path,q)
        except (ValueError,TypeError):
            self.send_json({'error':'Niepoprawne parametry zapytania'},400)

    def get(self,path,q):
        if path in ('/','/app.js','/style.css'):
            file=ROOT/'static'/({'/':'index.html','/app.js':'app.js','/style.css':'style.css'}[path])
            data=file.read_bytes()
            self.send_response(200)
            self.send_header('Content-Type',{'/':'text/html; charset=utf-8','/app.js':'text/javascript; charset=utf-8','/style.css':'text/css; charset=utf-8'}[path])
            self.send_header('Cache-Control','no-store')
            self.send_header('Content-Length',str(len(data)))
            self.end_headers();self.wfile.write(data)
            return
        with connect() as db:
            if path=='/api/ai/status':
                result={'mode':'source_only','available':False} if source_only.enabled(db) else {'mode':'presentation','available':False} if pipeline.presentation_mode(db) else local_ai.status()
            elif re.fullmatch(r'/api/records/\d+',path):
                row=db.execute('SELECT * FROM ready_records WHERE id=?',(int(path.rsplit('/',1)[1]),)).fetchone()
                if not row:self.send_json({'error':'Nie znaleziono'},404);return
                result=record_details(db,row)
            elif path=='/api/processing':
                result=pipeline.summary(db)
            elif path=='/api/options':
                result={**profiles.dictionaries(),'areas':assessment.AREAS,'buckets':assessment.BUCKETS,'audiences':assessment.AUDIENCES}
            elif path=='/api/filter-options':
                result=filter_options(db)
            elif path=='/api/sources':
                result=[]
                for row in db.execute('SELECT * FROM sources ORDER BY name'):
                    item=dict(row);config=json.loads(item.pop('config'));item['note']=config.get('note');item['enabled']=config.get('enabled',False)
                    item['count']=db.execute('SELECT count(*) FROM source_records WHERE source_id=? AND record_id IN (SELECT id FROM polish_records)',(row['id'],)).fetchone()[0]
                    item['published_count']=db.execute("SELECT count(*) FROM ready_records r WHERE EXISTS(SELECT 1 FROM json_each(r.published_payload,'$.sources') s WHERE json_extract(s.value,'$.id')=?)",(row['id'],)).fetchone()[0]
                    item['entity_count']=db.execute('SELECT count(*) FROM source_entities WHERE source_id=? AND entity_id IN (SELECT id FROM polish_entities)',(row['id'],)).fetchone()[0]
                    item['processing']=pipeline.summary(db,row['id'])
                    result.append(item)
            elif path in ('/api/records','/api/search','/api/innovations'):
                page=max(1,int(q.get('page',['1'])[0]));size=min(100,max(1,int(q.get('limit',['30'])[0])))
                clauses=['instr(r.search_text,?)>0'];params=[q.get('q',[''])[0].casefold()]
                if q.get('catalog',['all'])[0]=='radar':
                    clauses.append("json_extract(r.published_payload,'$.assessment.bucket')!='context'")
                for name in ('bucket',):
                    if q.get(name,[''])[0]:clauses.append("json_extract(r.published_payload,'$.assessment."+name+"')=?");params.append(q[name][0])
                for name in ('area','audience'):
                    if q.get(name,[''])[0]:
                        column='areas' if name=='area' else 'audience'
                        clauses.append("EXISTS(SELECT 1 FROM json_each(r.published_payload,'$.assessment."+column+"') x WHERE x.value=?)");params.append(q[name][0])
                if q.get('kind',[''])[0]:clauses.append('r.kind=?');params.append(q['kind'][0])
                if q.get('source',[''])[0]:clauses.append("EXISTS(SELECT 1 FROM json_each(r.published_payload,'$.sources') s WHERE json_extract(s.value,'$.id')=?)");params.append(q['source'][0])
                if q.get('entity',[''])[0]:clauses.append("EXISTS(SELECT 1 FROM json_each(r.published_payload,'$.entities') e WHERE json_extract(e.value,'$.id')=?)");params.append(int(q['entity'][0]))
                if q.get('description',[''])[0]=='yes':clauses.append('r.description IS NOT NULL')
                for field in ['development_stage','project_type','impact_scale','publisher_role']:
                    if q.get(field,[''])[0]:
                        clauses.append("json_extract(r.published_payload,'$.profile."+field+"')=?");params.append(q[field][0])
                for field,table,column in [('category','project_categories','category_code'),('education_level','project_education_levels','level_code')]:
                    if q.get(field,[''])[0]:
                        clauses.append("EXISTS(SELECT 1 FROM json_each(r.published_payload,'$.profile."+('categories' if field=='category' else 'education_levels')+"') v WHERE v.value=?)");params.append(q[field][0])
                where=' AND '.join(clauses)
                total=db.execute('SELECT count(*) FROM ready_records r WHERE '+where,params).fetchone()[0]
                order='r.id DESC'
                if pipeline.presentation_mode(db):
                    featured=db.execute("SELECT value FROM runtime_settings WHERE key='featured_records'").fetchone()
                    ids=[v for v in json.loads(featured[0]) if type(v) is int][:50] if featured else []
                    if ids:order='CASE r.id '+ ' '.join(f'WHEN {rid} THEN {rank}' for rank,rid in enumerate(ids))+' ELSE 999 END,r.id DESC'
                rows=db.execute('SELECT r.* FROM ready_records r WHERE '+where+' ORDER BY '+order+' LIMIT ? OFFSET ?',params+[size,(page-1)*size]).fetchall()
                items=[record_details(db,r) for r in rows]
                result=items if path=='/api/records' else {'items':items,'total':total,'page':page,'pages':(total+size-1)//size,'preparing':not db.execute('SELECT 1 FROM ready_records LIMIT 1').fetchone() and bool(db.execute('SELECT 1 FROM processing_jobs LIMIT 1').fetchone())}
            elif path=='/api/compare':
                ids=[int(x) for x in q.get('ids',[''])[0].split(',') if x]
                if not 2<=len(set(ids))<=3:raise ValueError('Porównanie wymaga 2–3 różnych rekordów')
                result=[]
                for rid in dict.fromkeys(ids):
                    row=db.execute('SELECT * FROM ready_records WHERE id=?',(rid,)).fetchone()
                    if not row:self.send_json({'error':'Nie znaleziono rekordu'},404);return
                    result.append(record_details(db,row))
            elif path=='/api/stats':
                result={'records':db.execute('SELECT count(*) FROM ready_records').fetchone()[0],
                        'entities':db.execute('SELECT count(*) FROM polish_entities').fetchone()[0],
                        'contacts':db.execute('SELECT count(*) FROM contacts WHERE entity_id IN (SELECT id FROM polish_entities)').fetchone()[0],
                        'kinds':dict(db.execute('SELECT kind,count(*) FROM ready_records GROUP BY kind')),
                        'last_success':db.execute('SELECT max(last_success) FROM sources').fetchone()[0],
                        'assessment_counts':dict(db.execute("SELECT json_extract(published_payload,'$.assessment.bucket'),count(*) FROM ready_records GROUP BY json_extract(published_payload,'$.assessment.bucket')"))}
            elif path=='/api/entities':
                result=[dict(r) for r in db.execute("SELECT e.*,count(DISTINCT r.id) AS record_count FROM polish_entities e LEFT JOIN (ready_records r JOIN json_each(r.published_payload,'$.entities') pe) ON json_extract(pe.value,'$.id')=e.id WHERE instr(lower(e.name),?)>0 GROUP BY e.id ORDER BY record_count DESC LIMIT 100",(q.get('q',[''])[0].lower(),))]
            elif path=='/api/runs':result=[dict(r) for r in db.execute('SELECT * FROM refresh_runs ORDER BY id DESC LIMIT 100')]
            elif path=='/api/connections':result=[dict(r) for r in db.execute("SELECT r.id AS record_id,json_extract(pe.value,'$.id') AS entity_id,json_extract(pe.value,'$.role') AS role FROM ready_records r,json_each(r.published_payload,'$.entities') pe LIMIT 1000")]
            else:self.send_json({'error':'Nie znaleziono'},404);return
        self.send_json(result)

    def do_PATCH(self):
        origin=self.headers.get('Origin')
        if origin and urllib.parse.urlparse(origin).netloc != self.headers.get('Host'):
            self.send_json({'error':'Niedozwolone pochodzenie żądania'},403);return
        match=re.fullmatch(r'/api/records/(\d+)/profile',urllib.parse.urlparse(self.path).path)
        if not match:
            self.send_json({'error':'Nie znaleziono'},404);return
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=65536:
                raise ValueError('Nieprawidłowy rozmiar profilu')
            payload=json.loads(self.rfile.read(length))
            with connect() as db:
                db.execute('BEGIN IMMEDIATE')
                interpretation=db.execute("SELECT value FROM runtime_settings WHERE key='profile_interpretation'").fetchone()
                if source_only.enabled(db) and not (interpretation and interpretation[0]=='1'):raise ValueError('Tryb wyłącznie źródłowy: zmiana pola wymaga potwierdzenia w źródle.')
                result=profiles.update(db,int(match[1]),payload,now())
                pipeline.publish_manual(db,int(match[1]),payload)
            self.send_json(result)
        except LookupError as error:
            self.send_json({'error':str(error)},404)
        except (ValueError,sqlite3.IntegrityError) as error:
            self.send_json({'error':str(error)},400)

    def do_POST(self):
        parsed=urllib.parse.urlparse(self.path)
        origin=self.headers.get('Origin')
        if origin and urllib.parse.urlparse(origin).netloc != self.headers.get('Host'):
            self.send_json({'error':'Niedozwolone pochodzenie żądania'},403);return
        if parsed.path!='/api/refresh':self.send_json({'error':'Nie znaleziono'},404);return
        with connect() as db:
            if pipeline.presentation_mode(db):
                self.send_json({'status':'presentation','message':'Gotowe dane do prezentacji. Odświeżanie jest wyłączone.'});return
        query=urllib.parse.parse_qs(parsed.query)
        ids=query.get('source')
        threading.Thread(target=refresh,kwargs={'force':True,'source_ids':ids},daemon=True).start()
        self.send_json({'status':'scheduled'},202)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('command',choices=['init','refresh','worker','serve','import-file'])
    parser.add_argument('--live',action='store_true',help='Włącz harmonogram i ocenę regułami źródłowymi bez Ollama')
    parser.add_argument('--force',action='store_true')
    parser.add_argument('--full',action='store_true',help='Pobierz cały zbiór w adapterach obsługujących pełny import')
    parser.add_argument('--reset',action='store_true',help='Rozpocznij nowy przebieg od pierwszej strony')
    parser.add_argument('--limit',type=int)
    parser.add_argument('--source',action='append')
    parser.add_argument('--file');parser.add_argument('--mapping')
    parser.add_argument('--port',type=int,default=8080)
    args=parser.parse_args();initialize()
    if args.live:
        with connect() as db:
            db.execute("INSERT INTO runtime_settings VALUES('processing_mode','live') ON CONFLICT(key) DO UPDATE SET value='live'")
            if not source_only.enabled(db):db.execute("INSERT INTO runtime_settings VALUES('analysis_engine','source_rules') ON CONFLICT(key) DO UPDATE SET value='source_rules'")
            db.execute("UPDATE sources SET next_refresh=NULL WHERE next_refresh='2099-01-01'")
            db.execute('DELETE FROM ai_model_backoff')
    if args.command=='refresh':
        refresh(args.force,args.source,args.full,args.reset,args.limit)
        pipeline.drain(connect,args.limit or 5)
    elif args.command=='worker':
        stop,thread=pipeline.start_worker(connect)
        try:
            while True:
                refresh(source_ids=args.source)
                time.sleep(60)
        finally:stop.set();thread.join(timeout=3)
    elif args.command=='serve':
        server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
        stop,thread=pipeline.start_worker(connect)
        print(f'Radar działa pod http://127.0.0.1:{args.port}. Ctrl+C zatrzymuje procesy.',flush=True)
        try:server.serve_forever()
        finally:server.server_close();stop.set();thread.join(timeout=3)
    elif args.command=='import-file':
        from file_import import import_file
        if not args.file or not args.mapping or not args.source:parser.error('Wymagane --source --file --mapping')
        import_file(args.source[0],Path(args.file),json.loads(Path(args.mapping).read_text()))
        pipeline.drain(connect,args.limit or 5)


if __name__=='__main__':main()
