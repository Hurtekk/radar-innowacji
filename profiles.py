STAGES = {'idea':'Pomysł','research':'Badania','proof_of_concept':'Potwierdzona koncepcja (PoC)',
          'prototype':'Prototyp','pilot':'Pilotaż','ready':'Gotowe rozwiązanie','deployment':'Wdrożenie','scaled':'Wdrożenie i skalowanie'}
TYPES = {'invention':'Wynalazek','product':'Produkt','service':'Usługa','process':'Usprawnienie procesu',
         'social':'Projekt społeczny','education':'Projekt edukacyjny','research':'Projekt badawczy',
         'infrastructure':'Infrastruktura','other':'Inny'}
SCALES = {'institution':'Szkoła / organizacja','local':'Lokalna','regional':'Regionalna',
          'national':'Krajowa','international':'Międzynarodowa','global':'Globalna'}
ROLES = {'innovator':'Innowator','investor':'Inwestor','institution':'Instytucja','sponsor':'Sponsor','public_data':'Import ze źródła publicznego'}
CATEGORIES = {'science':'Nauka i badania','technology':'Technologia','social':'Społeczeństwo','education':'Edukacja','health':'Zdrowie',
              'environment':'Środowisko','energy':'Energetyka','industry':'Przemysł','transport':'Transport',
              'agriculture':'Rolnictwo i żywność','culture':'Kultura','finance':'Finanse','public_services':'Usługi publiczne'}
EDUCATION = {'primary':'Szkoła podstawowa','secondary':'Szkoła ponadpodstawowa',
             'university':'Uczelnia / studenci','research':'Instytut / naukowcy',
             'professional':'Środowisko zawodowe','open':'Bez ograniczeń etapu edukacji'}
ENUMS = {'development_stage':STAGES,'project_type':TYPES,'impact_scale':SCALES,'publisher_role':ROLES}
TEXT_FIELDS = ('impact_description','investor_benefits','innovator_benefits')
FIELDS = (*ENUMS,*TEXT_FIELDS)


def dictionaries():
    return {**ENUMS,'categories':CATEGORIES,'education_levels':EDUCATION}


def seed(db):
    db.executemany('INSERT INTO categories VALUES(?,?) ON CONFLICT(code) DO UPDATE SET name=excluded.name',CATEGORIES.items())
    db.executemany('INSERT INTO education_levels VALUES(?,?) ON CONFLICT(code) DO UPDATE SET name=excluded.name',EDUCATION.items())


def read(db,record_id):
    row=db.execute('SELECT * FROM project_profiles WHERE record_id=?',(record_id,)).fetchone()
    result=dict(row) if row else {key:None for key in (*FIELDS,'updated_at')}
    result.pop('record_id',None)
    result['categories']=[r[0] for r in db.execute('SELECT category_code FROM project_categories WHERE record_id=? ORDER BY category_code',(record_id,))]
    result['field_origins']={row['field']:{'type':'ai','model':row['model'],'source_url':row['source_url'],'evidence_quote':row['evidence_quote'],'created_at':row['created_at']} for row in db.execute('SELECT * FROM ai_profile_fields WHERE record_id=?',(record_id,))}
    for origin in db.execute('SELECT field,origin FROM profile_origins WHERE record_id=?',(record_id,)):
        if origin['origin']!='ai':
            result['field_origins'][origin['field']]={'type':origin['origin']}
    result['education_levels']=[r[0] for r in db.execute('SELECT level_code FROM project_education_levels WHERE record_id=? ORDER BY level_code',(record_id,))]
    return result


def update(db,record_id,payload,timestamp,origin="manual"):
    if not isinstance(payload,dict):
        raise ValueError('Wymagany obiekt JSON')
    unknown=set(payload)-set(FIELDS)-{'categories','education_levels'}
    if unknown:
        raise ValueError('Nieznane pola profilu')
    if not db.execute('SELECT 1 FROM records WHERE id=?',(record_id,)).fetchone():
        raise LookupError('Nie znaleziono rekordu')
    values=read(db,record_id)
    values.update(payload)
    for field,options in ENUMS.items():
        if values[field] is not None and (not isinstance(values[field],str) or values[field] not in options):
            raise ValueError('Nieprawidłowa wartość pola '+field)
    for field in TEXT_FIELDS:
        value=values[field]
        if value is not None and (not isinstance(value,str) or len(value)>10000):
            raise ValueError('Pole '+field+' musi być tekstem do 10 000 znaków')
        values[field]=value.strip() or None if isinstance(value,str) else None
    for field,options in [('categories',CATEGORIES),('education_levels',EDUCATION)]:
        items=values[field]
        if not isinstance(items,list) or any(not isinstance(i,str) or i not in options for i in items):
            raise ValueError('Nieprawidłowa lista '+field)
        if len(items)!=len(set(items)):
            raise ValueError('Lista '+field+' zawiera powtórzenia')
    if len(values['categories'])>3:
        raise ValueError('Projekt może mieć maksymalnie 3 kategorie')
    # The caller owns one transaction for the profile and both relationship tables.
    columns=','.join(FIELDS)
    assignments=','.join(f'{key}=excluded.{key}' for key in FIELDS)
    db.execute(f'INSERT INTO project_profiles(record_id,{columns},updated_at) VALUES({",".join("?" for _ in range(len(FIELDS)+2))}) ON CONFLICT(record_id) DO UPDATE SET {assignments},updated_at=excluded.updated_at',
               (record_id,*(values[key] for key in FIELDS),timestamp))
    db.execute('DELETE FROM project_categories WHERE record_id=?',(record_id,))
    db.executemany('INSERT INTO project_categories VALUES(?,?)',[(record_id,c) for c in values['categories']])
    db.execute('DELETE FROM project_education_levels WHERE record_id=?',(record_id,))
    db.executemany('INSERT INTO project_education_levels VALUES(?,?)',[(record_id,c) for c in values['education_levels']])
    # Explicit saves protect even empty values and confirmations of AI suggestions.
    if origin=='manual':
        db.executemany('DELETE FROM ai_profile_fields WHERE record_id=? AND field=?',[(record_id,field) for field in payload])
    db.executemany('INSERT INTO profile_origins VALUES(?,?,?,?) ON CONFLICT(record_id,field) DO UPDATE SET origin=excluded.origin,updated_at=excluded.updated_at',
                   [(record_id,field,origin,timestamp) for field in payload])
    return read(db,record_id)
