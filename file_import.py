import csv
import hashlib
import json
from datetime import datetime,timedelta,timezone
from connectors import clean,record
import geography
import pipeline


def import_file(source_id,path,mapping):
    from radar import connect,save_record,upsert_entity,now,ROOT
    if path.suffix.lower()=='.json':
        rows=json.loads(path.read_text(encoding='utf-8-sig'))
        for key in mapping.get('items_path','').split('.'):
            if key:rows=rows[key]
    elif path.suffix.lower()=='.xlsx':
        import openpyxl
        book=openpyxl.load_workbook(path,read_only=True,data_only=True)
        iterator=book.active.iter_rows(values_only=True)
        headers=next(iterator);rows=[dict(zip(headers,r)) for r in iterator];book.close()
    else:
        with path.open(encoding='utf-8-sig',newline='') as file:rows=list(csv.DictReader(file,delimiter=mapping.get('delimiter',',')))
    with connect() as db:
        if not db.execute('SELECT 1 FROM sources WHERE id=?',(source_id,)).fetchone():raise ValueError('Nieznane źródło')
        started=now();run=db.execute("INSERT INTO refresh_runs(source_id,started_at,status) VALUES(?,?,'running')",(source_id,started)).lastrowid
        count=0
        for row in rows:
            title=clean(row.get(mapping.get('title','title')))
            if not title:continue
            url=clean(row.get(mapping.get('url','url'))) or mapping.get('source_url','')
            if not url.startswith(('http://','https://')):raise ValueError('W mapowaniu ustaw kolumnę url lub source_url z publicznym adresem pochodzenia')
            key=str(row.get(mapping.get('id','id')) or hashlib.sha256((title+url).encode()).hexdigest())
            if mapping.get('entity'):
                eid=upsert_entity(db,{'name':title},url)
                db.execute('INSERT INTO source_entities VALUES(?,?,?,?,?) ON CONFLICT(source_id,external_id) DO UPDATE SET entity_id=excluded.entity_id,raw_data=excluded.raw_data,fetched_at=excluded.fetched_at',(source_id,key,eid,json.dumps(row,ensure_ascii=False,default=str),now()))
                if source_id in geography.NATIONAL_ENTITIES or geography.explicit_country(row):
                    db.execute('INSERT OR IGNORE INTO entity_countries VALUES(?,?)',(eid,'PL'))
                pipeline.touch_entity(db,eid)
            else:
                item=record(key,title,row.get(mapping.get('description','description')),url,mapping.get('kind','project'),raw=row)
                if mapping.get('organization') and row.get(mapping['organization']):item['entities']=[{'name':row[mapping['organization']],'role':mapping.get('role','related')}]
                if not geography.is_polish(source_id,item,geography.load_index(ROOT)) and not db.execute('SELECT 1 FROM source_records WHERE source_id=? AND external_id=?',(source_id,key)).fetchone():
                    continue
                save_record(db,source_id,item)
            count+=1
        db.execute("UPDATE refresh_runs SET status='success',finished_at=?,count=? WHERE id=?",(now(),count,run))
        db.execute("UPDATE sources SET last_success=?,status='success',error=NULL WHERE id=?",(now(),source_id))
    print(source_id,count,'zaimportowanych rekordów')
