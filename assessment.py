"""Evidence-led assessment. Availability, novelty and estimated reuse are separate."""
import json
import re
from datetime import datetime,timezone
import local_ai
import profiles

AREAS={'technology':'Technologia','education':'Edukacja','administration':'Administracja'}
BUCKETS={'verified':'Udostępnione / wdrożone rozwiązania','candidate':'Kandydaci do weryfikacji','context':'Materiały źródłowe'}
AUDIENCES={'business':'Firmy i inwestorzy','public':'Administracja i samorządy','research':'Uczelnie i instytuty','school':'Szkoły i edukatorzy','innovator':'Innowatorzy'}

def infer(db,rid):
    r=db.execute('SELECT * FROM records WHERE id=?',(rid,)).fetchone()
    p=profiles.read(db,rid);text=(r['title']+' '+(r['description'] or '')).casefold()
    cats=set(p['categories']);areas=[]
    if cats & {'technology','industry','health','energy','transport','agriculture','science'}:areas.append('technology')
    if 'education' in cats:areas.append('education')
    if 'public_services' in cats or re.search(r'e-usług|administrac|samorząd|urzęd|urząd|governance',text):areas.append('administration')
    if not areas and re.search(r'robot|czujnik|technolog|software|sensor|materiał',text):areas=['technology']
    candidate=r['kind']=='patent' or (r['subtype']=='research_grant' and bool(areas)) or bool(re.search(r'innowac|nowatorsk|now.{0,16}(technolog|metod|rozwiązan)|significantly improved',text))
    if r['kind']=='publication' or r['subtype'] in ('procurement','institutional_infrastructure'):candidate=False
    audience=list(dict.fromkeys((['school'] if 'education' in areas else [])+(['public'] if 'administration' in areas else [])+(['research','business','innovator'] if 'technology' in areas else [])))
    for source in db.execute("SELECT raw_data FROM source_records WHERE record_id=? AND source_id='reviewed_web'",(rid,)):
        data=json.loads(source[0])
        if data.get('review_marker_present'):
            return reviewed(data)
        value=reviewed(data);value.update(bucket='candidate',implementation='Nie odnaleziono ponownie wskazanego fragmentu źródła. Ocena dostępności wymaga ponownej weryfikacji.',confidence='Źródło zmienione — wymaga przeglądu',evidence=[])
        return value
    return {'bucket':'candidate' if candidate else 'context','areas':areas,'audience':audience,'trl':None,
      'problem':p['impact_description'] or r['title'],
      'novelty':'Źródło nie zawiera wystarczającego porównania z rozwiązaniami dotychczasowymi.',
      'implementation':'Brak zweryfikowanego dowodu dostępności lub wdrożenia tego rozwiązania.',
      'potential':'Możliwość wykorzystania wymaga oceny parametrów, warunków dostępu i zgodności z potrzebami odbiorcy.',
      'confidence':'Nieoceniona — wymaga weryfikacji źródeł',
      'limitations':'Patent, dotacja, publikacja i zakup wyposażenia nie potwierdzają samodzielnie wdrożonej innowacji.',
      'evidence':[],'interpretations':['Nowość i potencjał nie zostały potwierdzone.'],'ip_status':'Nie sprawdzono praw do wykorzystania rozwiązania.'}

def reviewed(data):
    evidence=[{'url':data['url'],'excerpt':data['proof'],'kind':'publisher_source'}]
    if data.get('additional_url'):evidence.append({'url':data['additional_url'],'excerpt':'','kind':'implementation_registry'})
    if data.get('polish_url'):evidence.append({'url':data['polish_url'],'excerpt':'','kind':'polish_connection'})
    return {'bucket':'verified','areas':[data['area']],'audience':data['audience'],'trl':None,
      'problem':data['description'],'novelty':data['novelty'],'implementation':data['implementation'],
      'potential':data['potential'],'confidence':data['confidence'],'evidence':evidence,
      'limitations':'Potwierdzono dostępność lub opis zastosowania. Nie przeprowadzono audytu technicznego, prawnego ani niezależnej oceny skuteczności.',
      'interpretations':['Ocena nowości i potencjału zastosowania jest interpretacją, nie certyfikatem zgodności z Oslo Manual.'],
      'ip_status':'Polski podmiot lub partner; prawa do wykorzystania i licencje wymagają osobnego sprawdzenia.'}


def write(db,rid,value):
    if any(a not in AUDIENCES for a in value['audience']):raise ValueError('Nieprawidłowy odbiorca')
    if value.get('trl') is not None and not value.get('trl_evidence'):raise ValueError('TRL wymaga osobnego dowodu')
    if value.get('trl') is not None and (type(value['trl']) is not int or not 1<=value['trl']<=9):raise ValueError('TRL wymaga wartości 1–9 lub null')
    if value['bucket']=='verified' and not value.get('evidence'):raise ValueError('Wdrożenie wymaga źródła')
    if any(a not in AREAS for a in value['areas']):raise ValueError('Nieprawidłowy obszar')
    digest=local_ai.fingerprint(local_ai.material(db,rid));stamp=datetime.now(timezone.utc).isoformat()
    db.execute('INSERT INTO innovation_assessments VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(record_id) DO UPDATE SET bucket=excluded.bucket,areas=excluded.areas,audience=excluded.audience,trl=excluded.trl,payload=excluded.payload,input_hash=excluded.input_hash,reviewed_at=excluded.reviewed_at',
      (rid,value['bucket'],json.dumps(value['areas']),json.dumps(value['audience']),value.get('trl'),json.dumps(value,ensure_ascii=False),digest,stamp))

def read(db,rid):
    row=db.execute('SELECT * FROM innovation_assessments WHERE record_id=?',(rid,)).fetchone()
    if not row:return infer(db,rid)
    value=json.loads(row['payload']);value['reviewed_at']=row['reviewed_at']
    value['novelty_status']='analyst_interpretation' if value['bucket']=='verified' else 'not_verified'
    value['implementation_status']='documented_available' if value['bucket']=='verified' else 'not_verified'
    value['assessment_origin']='source_review' if value['bucket']=='verified' else 'source_rules'
    value['trl_note']='Brak poziomu TRL w źródle; nie przeliczano go z etapu wdrożenia. Dla usług i metod nietechnicznych skala może nie mieć zastosowania.'
    return value

def ensure(db,rid):
    previous=db.execute('SELECT input_hash FROM innovation_assessments WHERE record_id=?',(rid,)).fetchone()
    if not previous or previous[0]!=local_ai.fingerprint(local_ai.material(db,rid)):write(db,rid,infer(db,rid))

def process(connect,job):
    import pipeline
    with connect() as db:
        db.execute('BEGIN IMMEDIATE')
        if not db.execute("SELECT 1 FROM processing_jobs WHERE record_id=? AND claim_token=? AND status='processing'",(job['record_id'],job['claim_token'])).fetchone():return
        ensure(db,job['record_id']);pipeline.publish(db,job['record_id'])
        db.execute("UPDATE processing_jobs SET status='completed',claim_token=NULL,lease_until=NULL,error=NULL,retry_after=NULL,updated_at=? WHERE record_id=?",(datetime.now(timezone.utc).isoformat(),job['record_id']))
