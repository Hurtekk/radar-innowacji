import json
from pathlib import Path

# These collections cover Polish institutions or projects funded in Poland.
NATIONAL_RECORDS = {'pbn','ncbr','fe','radon_investments','radon_patents','lukasiewicz_imn'}
NATIONAL_ENTITIES = {'radon_inst','bdl'}
POLAND = {'pl','pol','poland','polska'}


def polish_country(value):
    return isinstance(value,str) and value.strip().casefold() in POLAND


def explicit_country(raw):
    if isinstance(raw,dict):
        for key,value in raw.items():
            if any(word in key.casefold() for word in ('country','kraj','państwo')) and (polish_country(value) or (isinstance(value,list) and any(polish_country(v) for v in value))):
                return True
            if isinstance(value,(dict,list)) and explicit_country(value):
                return True
    elif isinstance(raw,list):
        return any(explicit_country(item) for item in raw)
    return False


def load_index(root):
    path=Path(root)/'polish-cordis-projects.json'
    return json.loads(path.read_text()) if path.exists() else {'projects':[],'organizations':[]}


def is_polish(source_id,item,index):
    return (source_id in NATIONAL_RECORDS or explicit_country(item.get('raw',{}))
            or (source_id=='cordis' and str(item['id']) in index['projects']))


def sync_record(db,source_id,item,record_id,index):
    raw=item.get('raw',{})
    included=is_polish(source_id,item,index)
    db.execute('DELETE FROM record_countries WHERE record_id=? AND source_id=?',(record_id,source_id))
    if included:
        db.execute('INSERT OR IGNORE INTO record_countries VALUES(?,?,?)',(record_id,'PL',source_id))
    for row in db.execute('SELECT e.id,e.external_id FROM entities e JOIN record_entities re ON re.entity_id=e.id WHERE re.record_id=?',(record_id,)):
        national=source_id in NATIONAL_RECORDS or row['external_id'] in index['organizations']
        if national:
            db.execute('INSERT OR IGNORE INTO entity_countries VALUES(?,?)',(row['id'],'PL'))
    return included


def backfill(db,root):
    index=load_index(root)
    for row in db.execute('SELECT * FROM source_records').fetchall():
        raw=json.loads(row['raw_data'])
        sync_record(db,row['source_id'],{'id':row['external_id'],'raw':raw},row['record_id'],index)
    for row in db.execute('SELECT * FROM source_entities').fetchall():
        raw=json.loads(row['raw_data'])
        if row['source_id'] in NATIONAL_ENTITIES or explicit_country(raw):
            db.execute('INSERT OR IGNORE INTO entity_countries VALUES(?,?)',(row['entity_id'],'PL'))
