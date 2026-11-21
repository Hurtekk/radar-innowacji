"""Durable import processing; inference always runs outside write transactions."""
import json
import os
import time
import sqlite3
import threading
import uuid
from datetime import datetime, timedelta, timezone

import local_ai
import profiles
import assessment
import source_only


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def presentation_mode(db):
    row=db.execute("SELECT value FROM runtime_settings WHERE key='processing_mode'").fetchone()
    return bool(row and row[0]=='presentation')


def document(db, record_id):
    mode=db.execute("SELECT value FROM runtime_settings WHERE key='source_only'").fetchone()
    if mode and mode[0]=='1':return source_only.document(db,record_id)
    row=db.execute('SELECT * FROM polish_records WHERE id=?',(record_id,)).fetchone()
    if not row:raise LookupError('Nie znaleziono polskiego rekordu')
    item=dict(row)
    assessment.ensure(db,record_id)
    item['assessment']=assessment.read(db,record_id)
    item['profile']=profiles.read(db,record_id)
    item['sources']=[dict(r) for r in db.execute('SELECT s.id,s.name,sr.external_id,sr.fetched_at FROM source_records sr JOIN sources s ON s.id=sr.source_id WHERE sr.record_id=? ORDER BY s.id,sr.external_id',(record_id,))]
    item['entities']=[dict(r) for r in db.execute('SELECT e.id,e.name,re.role FROM record_entities re JOIN entities e ON e.id=re.entity_id WHERE re.record_id=? ORDER BY e.id,re.role',(record_id,))]
    item['tags']=[r[0] for r in db.execute('SELECT t.name FROM tags t JOIN record_tags rt ON rt.tag_id=t.id WHERE rt.record_id=? ORDER BY t.name',(record_id,))]
    item['contacts']=[dict(r) for r in db.execute('SELECT DISTINCT c.kind,c.value,c.source_url,e.name FROM contacts c JOIN record_entities re ON re.entity_id=c.entity_id JOIN entities e ON e.id=c.entity_id WHERE re.record_id=? ORDER BY e.name,c.kind,c.value',(record_id,))]
    return item


def publish(db,record_id):
    item=document(db,record_id)
    db.execute('INSERT INTO published_records VALUES(?,?,?) ON CONFLICT(record_id) DO UPDATE SET payload=excluded.payload,published_at=excluded.published_at',
               (record_id,json.dumps(item,ensure_ascii=False),timestamp()))


def publish_manual(db,record_id,changes):
    row=db.execute('SELECT payload FROM published_records WHERE record_id=?',(record_id,)).fetchone()
    if not row:return
    item=json.loads(row['payload']);current=profiles.read(db,record_id)
    for field in changes:
        item['profile'][field]=current[field]
        item['profile']['field_origins'][field]=current['field_origins'][field]
    item['profile']['updated_at']=current['updated_at']
    db.execute('UPDATE published_records SET payload=?,published_at=? WHERE record_id=?',(json.dumps(item,ensure_ascii=False),timestamp(),record_id))


def enqueue(db, record_id):
    if presentation_mode(db):return
    if not db.execute('SELECT 1 FROM polish_records WHERE id=?',(record_id,)).fetchone():
        db.execute('DELETE FROM processing_jobs WHERE record_id=?',(record_id,))
        db.execute('DELETE FROM published_records WHERE record_id=?',(record_id,))
        return
    digest=local_ai.fingerprint(local_ai.material(db,record_id))
    engine=db.execute("SELECT value FROM runtime_settings WHERE key='analysis_engine'").fetchone()
    selected=engine[0] if engine and engine[0] in ('source_rules','source_only') else local_ai.model()
    previous=db.execute('SELECT * FROM processing_jobs WHERE record_id=?',(record_id,)).fetchone()
    if previous and previous['input_hash']==digest and previous['model']==selected:
        if previous['status']=='failed' and (previous['error'] or '').startswith(('Dane zmieniły się','Zadanie zostało przejęte')):
            db.execute("UPDATE processing_jobs SET status='pending',error=NULL,retry_after=NULL WHERE record_id=?",(record_id,))
        return
    # This write shares the source-record/cursor transaction. Superseding a job
    # invalidates its claim, so an older response can never publish newer data.
    db.execute("INSERT INTO processing_jobs(record_id,input_hash,model,status,updated_at) VALUES(?,?,?,'pending',?) ON CONFLICT(record_id) DO UPDATE SET input_hash=excluded.input_hash,model=excluded.model,status='pending',attempts=0,retry_after=NULL,lease_until=NULL,claim_token=NULL,error=NULL,updated_at=excluded.updated_at",
               (record_id,digest,selected,timestamp()))


def sanitize_published_stage(db,record_id):
    profile=profiles.read(db,record_id)
    origin=profile['field_origins'].get('development_stage',{})
    stage=profile['development_stage']
    if stage and origin.get('type')=='ai' and not local_ai.supports_stage(stage,origin.get('evidence_quote','')):
        profiles.update(db,record_id,{'development_stage':None},timestamp(),origin='ai')
        db.execute("DELETE FROM ai_profile_fields WHERE record_id=? AND field='development_stage'",(record_id,))


def reconcile(connect):
    with connect() as db:
        if presentation_mode(db):return
        db.execute('BEGIN IMMEDIATE')
        # Preserve legacy human edits. Missing legacy origin is ambiguous, so
        # existing non-AI values are conservatively protected as manual.
        for row in db.execute('SELECT id FROM polish_records').fetchall():
            rid=row['id']; profile=profiles.read(db,rid)
            for field in [*profiles.FIELDS,'categories','education_levels']:
                if profile[field] and field not in profile['field_origins']:
                    db.execute('INSERT OR IGNORE INTO profile_origins VALUES(?,?,?,?)',(rid,field,'manual',timestamp()))
            # Snapshot already processed records before a prompt/model upgrade.
            if db.execute("SELECT 1 FROM processing_jobs WHERE record_id=? AND status='completed'",(rid,)).fetchone() and not db.execute('SELECT 1 FROM published_records WHERE record_id=?',(rid,)).fetchone():
                sanitize_published_stage(db,rid)
                publish(db,rid)
            enqueue(db,rid)
        db.execute('DELETE FROM processing_jobs WHERE record_id NOT IN (SELECT id FROM polish_records)')
        db.execute('DELETE FROM published_records WHERE record_id NOT IN (SELECT id FROM polish_records)')


def touch_entity(db, entity_id):
    for row in db.execute('SELECT record_id FROM record_entities WHERE entity_id=?',(entity_id,)).fetchall():
        enqueue(db,row['record_id'])


def process_alive(pid):
    if pid==os.getpid():return True
    try:os.kill(pid,0)
    except ProcessLookupError:return False
    except PermissionError:return True
    return True


def recover_slots(db):
    for slot in db.execute('SELECT * FROM inference_slots WHERE claim_token IS NOT NULL').fetchall():
        linked=db.execute("SELECT 1 FROM processing_jobs WHERE claim_token=? AND status='processing'",(slot['claim_token'],)).fetchone()
        abandoned=(slot['owner_pid'] is None and not linked) or (slot['owner_pid'] is not None and not process_alive(slot['owner_pid']))
        if not abandoned:continue
        db.execute("UPDATE processing_jobs SET status='pending',claim_token=NULL,lease_until=NULL,error=NULL,retry_after=NULL WHERE claim_token=? AND status='processing'",(slot['claim_token'],))
        db.execute('DELETE FROM job_progress WHERE claim_token=?',(slot['claim_token'],))
        db.execute('UPDATE inference_slots SET claim_token=NULL,lease_until=NULL,owner_pid=NULL WHERE id=?',(slot['id'],))


def progress(connect,job,phase,output_chars=0):
    if not job:return
    current=timestamp()
    with connect() as db:
        if not db.execute("SELECT 1 FROM processing_jobs WHERE record_id=? AND claim_token=? AND status='processing'",(job['record_id'],job['claim_token'])).fetchone():return
        db.execute('INSERT INTO job_progress VALUES(?,?,?,?,?,?) ON CONFLICT(record_id) DO UPDATE SET claim_token=excluded.claim_token,phase=excluded.phase,updated_at=excluded.updated_at,output_chars=excluded.output_chars',
                   (job['record_id'],job['claim_token'],phase,current,current,output_chars))


def claim(connect):
    current=timestamp()
    with connect() as db:
        db.execute('BEGIN IMMEDIATE')
        if presentation_mode(db):return None
        recover_slots(db)
        # Claims across processes are bounded by the configured slot count.
        slot=db.execute('SELECT id FROM inference_slots WHERE id<=? AND (lease_until IS NULL OR lease_until<=?) ORDER BY id LIMIT 1',(local_ai.concurrency(),current)).fetchone()
        if not slot:return None
        row=db.execute("SELECT j.* FROM processing_jobs j LEFT JOIN ai_cache c ON c.input_hash=j.input_hash AND c.model=j.model LEFT JOIN ai_model_backoff b ON b.model=j.model WHERE (j.status='pending' OR (j.status='failed' AND j.retry_after<=?) OR (j.status='processing' AND j.lease_until<=?)) AND (c.input_hash IS NOT NULL OR b.retry_after IS NULL OR b.retry_after<=?) ORDER BY c.input_hash IS NULL,CASE j.status WHEN 'pending' THEN 0 ELSE 1 END,j.updated_at,j.record_id LIMIT 1",(current,current,current)).fetchone()
        if not row:return None
        token=uuid.uuid4().hex
        until=(datetime.now(timezone.utc)+timedelta(seconds=180)).isoformat()
        db.execute('UPDATE inference_slots SET claim_token=?,lease_until=?,owner_pid=? WHERE id=?',(token,until,os.getpid(),slot['id']))
        db.execute("UPDATE processing_jobs SET status='processing',claim_token=?,lease_until=?,attempts=attempts+1,updated_at=? WHERE record_id=?",
                   (token,until,current,row['record_id']))
        db.execute('INSERT INTO job_progress VALUES(?,?,?,?,?,0) ON CONFLICT(record_id) DO UPDATE SET claim_token=excluded.claim_token,phase=excluded.phase,started_at=excluded.started_at,updated_at=excluded.updated_at,output_chars=0',(row['record_id'],token,'preparing',current,current))
        result=dict(row);result.update(claim_token=token,attempts=row['attempts']+1)
        return result


def release(connect,token):
    with connect() as db:
        db.execute('UPDATE inference_slots SET claim_token=NULL,lease_until=NULL,owner_pid=NULL WHERE claim_token=?',(token,))


def process_one(connect):
    job=claim(connect)
    if not job:return False
    try:
        with connect() as db:engine=db.execute("SELECT value FROM runtime_settings WHERE key='analysis_engine'").fetchone()
        if engine and engine[0]=='source_only':source_only.process(connect,job)
        elif engine and engine[0]=='source_rules':assessment.process(connect,job)
        else:local_ai.analyze(connect,job['record_id'],claim=job)
    except local_ai.Superseded:
        with connect() as db:
            current=db.execute('SELECT claim_token FROM processing_jobs WHERE record_id=?',(job['record_id'],)).fetchone()
            if current and current['claim_token']==job['claim_token']:
                enqueue(db,job['record_id'])
        return True
    except Exception as error:
        # Every failure releases its lease. Retry a bad record without blocking
        # other records; source data is retained regardless of model health.
        message=str(error)[:300] or type(error).__name__
        delay=min(300,15*2**min(job['attempts']-1,5))
        with connect() as db:
            if isinstance(error,local_ai.AIUnavailable):
                db.execute('INSERT INTO ai_model_backoff VALUES(?,?,?) ON CONFLICT(model) DO UPDATE SET retry_after=excluded.retry_after,error=excluded.error',(job['model'],(datetime.now(timezone.utc)+timedelta(seconds=30)).isoformat(),message))
            db.execute("UPDATE processing_jobs SET status='failed',error=?,retry_after=?,lease_until=NULL,claim_token=NULL,updated_at=? WHERE record_id=? AND claim_token=?",
                       (message,(datetime.now(timezone.utc)+timedelta(seconds=delay)).isoformat(),timestamp(),job['record_id'],job['claim_token']))
        print('Przetwarzanie',job['record_id'],message,flush=True)
        return 'failed'
    finally:
        release(connect,job['claim_token'])
    return True


def drain(connect,limit=5):
    for _ in range(limit):
        if not process_one(connect):break


def worker(connect,stop):
    last_heartbeat=0
    while not stop.is_set():
        try:
            if time.monotonic()-last_heartbeat>=5:
                with connect() as db:db.execute('INSERT INTO worker_heartbeats VALUES(?,?) ON CONFLICT(pid) DO UPDATE SET last_seen=excluded.last_seen',(os.getpid(),timestamp()))
                last_heartbeat=time.monotonic()
            outcome=process_one(connect)
            if not outcome:stop.wait(1)
            elif outcome=='failed':stop.wait(.1)
        except sqlite3.Error as error:
            print('Kolejka:',str(error),flush=True)
            stop.wait(2)


class WorkerThreads:
    def __init__(self,threads):self.threads=threads
    def join(self,timeout=None):
        for thread in self.threads:thread.join(timeout=timeout)


def start_worker(connect):
    stop=threading.Event()
    with connect() as db:
        if presentation_mode(db):return stop,WorkerThreads([])
    threads=[threading.Thread(target=worker,args=(connect,stop),daemon=True,name=f'import-ai-{i}') for i in range(local_ai.concurrency())]
    for thread in threads:thread.start()
    return stop,WorkerThreads(threads)


def summary(db,source_id=None):
    if presentation_mode(db):
        total=db.execute("SELECT count(*) FROM ready_records r WHERE EXISTS(SELECT 1 FROM json_each(r.published_payload,'$.sources') s WHERE json_extract(s.value,'$.id')=?)",(source_id,)).fetchone()[0] if source_id else db.execute('SELECT count(*) FROM ready_records').fetchone()[0]
        return {'mode':'presentation','pending':0,'processing':0,'completed':total,'failed':0,'published':total,'total':total,'percent':100,'active':[],'recent':[],'errors':[],'model_errors':[],'performance':{},'state':'presentation','state_message':'Gotowe dane do prezentacji. Automatyczne przetwarzanie jest wyłączone.','next_retry':None}
    where=''; params=()
    if source_id:
        where=' WHERE EXISTS(SELECT 1 FROM source_records sr WHERE sr.record_id=j.record_id AND sr.source_id=?)';params=(source_id,)
    result={state:0 for state in ('pending','processing','completed','failed')}
    result.update(dict(db.execute('SELECT status,count(*) FROM processing_jobs j'+where+' GROUP BY status',params)))
    if source_id:
        result['published']=db.execute("SELECT count(*) FROM published_records p WHERE EXISTS(SELECT 1 FROM json_each(p.payload,'$.sources') s WHERE json_extract(s.value,'$.id')=?)",(source_id,)).fetchone()[0]
    else:
        result['published']=db.execute('SELECT count(*) FROM ready_records').fetchone()[0]
    result['model_errors']=[dict(r) for r in db.execute('SELECT model,error,retry_after FROM ai_model_backoff WHERE retry_after>?',(timestamp(),))]
    result['performance']=dict(db.execute('SELECT count(*) AS measured,round(avg(wall_seconds),2) AS average_seconds,round(avg(output_tokens),1) AS average_output_tokens FROM (SELECT wall_seconds,output_tokens FROM ai_metrics WHERE cached=0 AND output_tokens IS NOT NULL ORDER BY id DESC LIMIT 20)').fetchone())
    current=datetime.now(timezone.utc)
    active_sql="SELECT j.record_id,r.title,j.updated_at AS claimed_at,p.phase,p.started_at,p.updated_at AS progress_at,p.output_chars FROM processing_jobs j JOIN records r ON r.id=j.record_id LEFT JOIN job_progress p ON p.record_id=j.record_id AND p.claim_token=j.claim_token"
    active_where=(where+' AND' if where else ' WHERE')+" j.status='processing'"
    result['active']=[dict(row) for row in db.execute(active_sql+active_where+' ORDER BY j.updated_at',params)]
    for item in result['active']:
        item['phase']=item['phase'] or 'preparing'
        item['output_chars']=item['output_chars'] or 0
        item['elapsed_seconds']=max(0,int((current-datetime.fromisoformat(item['started_at'] or item['claimed_at'])).total_seconds()))
    result['total']=sum(result[state] for state in ('pending','processing','completed','failed'))
    result['percent']=round(100*result['completed']/result['total'],1) if result['total'] else 100
    heartbeat=db.execute('SELECT max(last_seen) FROM worker_heartbeats').fetchone()[0]
    running=bool(heartbeat and (current-datetime.fromisoformat(heartbeat)).total_seconds()<15)
    slots=db.execute('SELECT min(lease_until) FROM inference_slots WHERE claim_token IS NOT NULL AND lease_until>?',(timestamp(),)).fetchone()[0]
    retry=db.execute("SELECT min(retry_after) FROM processing_jobs WHERE status='failed'").fetchone()[0]
    if result['active']:result['state']='running';result['state_message']='Trwa przygotowanie rekordów.'
    elif result['model_errors']:result['state']='model_wait';result['state_message']=result['model_errors'][0]['error']
    elif slots:result['state']='slot_wait';result['state_message']='Oczekiwanie na zwolnienie modelu po poprzednim zadaniu.'
    elif result['pending'] and not running:result['state']='worker_missing';result['state_message']='Brak potwierdzenia pracy procesu przetwarzania. Uruchom ponownie aplikację przez python3 start.py.'
    elif result['pending']:result['state']='queued';result['state_message']='Pobieranie kolejnego zadania z kolejki.'
    elif result['failed']:result['state']='retry_wait';result['state_message']='Oczekiwanie na ponowienie błędnych zadań.'
    else:result['state']='idle';result['state_message']='Wszystkie rekordy zostały przetworzone.'
    result['next_retry']=slots if result['state']=='slot_wait' else result['model_errors'][0]['retry_after'] if result['state']=='model_wait' else retry
    result['recent']=[dict(r) for r in db.execute('SELECT m.record_id,r.title,m.wall_seconds,m.output_tokens,m.cached,m.created_at FROM ai_metrics m JOIN records r ON r.id=m.record_id ORDER BY m.id DESC LIMIT 3')]
    result['errors']=[dict(row) for row in db.execute('SELECT j.record_id,r.title,j.error,j.retry_after FROM processing_jobs j JOIN records r ON r.id=j.record_id'+(where+' AND' if where else ' WHERE')+" j.status='failed' ORDER BY j.updated_at DESC LIMIT 3",params)]
    return result
