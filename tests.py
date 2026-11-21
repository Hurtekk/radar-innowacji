import json
import io
import shutil
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import radar
import profiles
import geography
import local_ai
import pipeline
import assessment
import source_only
import catalog_sources
import profile_review
import threading
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from connectors import Batch, radon


class DatabaseTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.original=radar.ROOT
        radar.ROOT=Path(self.tmp.name)
        shutil.copy(self.original/'schema.sql',radar.ROOT/'schema.sql')
        shutil.copytree(self.original/'migrations',radar.ROOT/'migrations')
        configs={'sources':[{'id':i,'name':i,'url':'https://example.org','enabled':True,'connector':'test'} for i in ['a','b']]}
        (radar.ROOT/'settings.json').write_text(json.dumps(configs))
        radar.initialize()

    def tearDown(self):
        radar.ROOT=self.original
        self.tmp.cleanup()

    def item(self,**changes):
        result={'id':'one','kind':'project','title':'Robot','description':'Opis','raw':{'country':'PL'},'url':'https://example.org/project/1','entities':[{'name':'Firma A','role':'owner'}]}
        result.update(changes)
        return result

    def test_migrations_are_idempotent(self):
        radar.initialize()
        with radar.connect() as db:
            self.assertEqual(db.execute('select count(*) from schema_migrations').fetchone()[0],len(list((radar.ROOT/'migrations').glob('*.sql'))))
            self.assertFalse(db.execute('pragma foreign_key_check').fetchall())

    def test_updates_and_cross_source_relations(self):
        with radar.connect() as db:
            record_id=radar.save_record(db,'a',self.item())
            radar.save_record(db,'b',self.item(id='other',entities=[{'name':'Firma B','role':'partner'}]))
            radar.save_record(db,'a',self.item(title='Nowy robot',description=None,entities=[{'name':'Firma C','role':'owner'}]))
            self.assertEqual(db.execute('select count(*) from records').fetchone()[0],1)
            self.assertEqual(db.execute('select description from records').fetchone()[0],'Opis')
            names={r[0] for r in db.execute('select e.name from entities e join record_entities r on r.entity_id=e.id')}
            self.assertEqual(names,{'Firma B','Firma C'})
            self.assertTrue(db.execute("select 1 from records where search_text like '%firma b%'").fetchone())

    def test_failed_batch_rolls_back_and_retains_cursor(self):
        with patch.dict(radar.CONNECTORS,{'test':lambda *args:Batch([self.item()],state={'offset':1})}):
            radar.refresh_source('a',force=True)
        invalid=self.item(id='broken',url='bad-url')
        with patch.dict(radar.CONNECTORS,{'test':lambda *args:Batch([self.item(title='Changed'),invalid],state={'offset':2})}):
            radar.refresh_source('a',force=True)
        with radar.connect() as db:
            self.assertEqual(db.execute('select title from records').fetchone()[0],'Robot')
            s=db.execute("select state,status,last_success from sources where id='a'").fetchone()
            self.assertEqual(json.loads(s['state']),{'offset':1})
            self.assertEqual(s['status'],'failed')
            self.assertEqual(db.execute('SELECT count(*) FROM processing_jobs').fetchone()[0],1)
            self.assertEqual(db.execute('SELECT status FROM processing_jobs').fetchone()[0],'pending')
            self.assertTrue(s['last_success'])

    def test_scheduler_respects_next_refresh(self):
        with patch.dict(radar.CONNECTORS,{'test':lambda *args:Batch([self.item()])}):
            radar.refresh_source('a',force=True)
            radar.refresh_source('a')
        with radar.connect() as db:self.assertEqual(db.execute('select count(*) from refresh_runs').fetchone()[0],1)

    def test_profile_survives_import_and_limits_categories(self):
        with radar.connect() as db:
            rid=radar.save_record(db,'a',self.item())
            profiles.update(db,rid,{'development_stage':'prototype','project_type':'invention',
                'impact_scale':'regional','publisher_role':'innovator',
                'investor_benefits':'Licencja na technologię','innovator_benefits':'Kapitał na pilotaż',
                'categories':['technology','industry','environment'],
                'education_levels':['secondary','university']},radar.now())
            radar.save_record(db,'a',self.item(title='Nowy tytuł ze źródła'))
            self.assertEqual(profiles.read(db,rid)['development_stage'],'prototype')
            with self.assertRaises(ValueError):
                profiles.update(db,rid,{'categories':['technology','industry','environment','energy']},radar.now())
            with self.assertRaises(sqlite3.IntegrityError):
                db.execute('INSERT INTO project_categories VALUES(?,?)',(rid,'energy'))
            self.assertEqual(len(profiles.read(db,rid)['categories']),3)
            with self.assertRaises(ValueError):
                profiles.update(db,rid,{'impact_scale':'invented'},radar.now())
            profiles.update(db,rid,{'development_stage':None,'categories':['social']},radar.now())
            result=profiles.read(db,rid)
            self.assertIsNone(result['development_stage'])
            self.assertEqual(result['categories'],['social'])
            self.assertEqual(result['education_levels'],['secondary','university'])

    def test_polish_scope_requires_evidence(self):
        with radar.connect() as db:
            a=radar.save_record(db,'a',self.item())
            radar.save_record(db,'a',self.item(id='foreign',url='https://example.org/foreign',raw={'country':'DE'}))
            radar.save_record(db,'a',self.item(id='unknown',url='https://example.org/unknown',raw={}))
            self.assertEqual([r['id'] for r in db.execute('SELECT id FROM polish_records')],[a])
            self.assertTrue(geography.explicit_country({'institution':{'country_code':'PL'}}))
            self.assertFalse(geography.explicit_country({'language':'polski'}))
            self.assertFalse(geography.explicit_country({'url':'https://example.pl'}))

    def test_local_ai_validates_quotes_and_keeps_human_benefits(self):
        text='Prototyp robota jest przeznaczony do automatycznego sortowania odpadów na linii produkcyjnej. Opis projektu wskazuje możliwość testów u odbiorców.'
        with radar.connect() as db:
            rid=radar.save_record(db,'a',self.item(description=text))
            profiles.update(db,rid,{'investor_benefits':'Deklaracja autora'},radar.now())
        output={'profile':{'development_stage':'prototype','project_type':'product','impact_scale':None,'publisher_role':None,'categories':['technology'],'education_levels':[],'impact_description':None},
            'evidence':{field:('automatycznego sortowania odpadów' if field in ['development_stage','project_type','categories'] else '') for field in local_ai.PROFILE_FIELDS},
            'investor_benefits':[{'benefit':'Możliwość licencjonowania po potwierdzeniu praw.',
            'reasoning':'Wymaga weryfikacji modelu biznesowego.',
            'evidence_quote':'automatycznego sortowania odpadów'}],
            'innovator_benefits':[],'limitations':['Sprawdzić prawa do technologii i zainteresowanie klientów.']}
        output['evidence']['development_stage']='Prototyp robota jest przeznaczony'
        with patch.object(local_ai,'call',return_value={'message':{'content':json.dumps(output)}}) as call:
            result=local_ai.analyze(radar.connect,rid)
            self.assertFalse(result['stale'])
            self.assertEqual(result['label'],'Uzupełnienie AI — do weryfikacji')
            local_ai.analyze(radar.connect,rid)
            self.assertEqual(call.call_count,1)
        with radar.connect() as db:
            profile=profiles.read(db,rid)
            self.assertEqual(profile['investor_benefits'],'Deklaracja autora')
            self.assertEqual(profile['development_stage'],'prototype')
            self.assertEqual(profile['categories'],['technology'])
            self.assertIn('development_stage',profile['field_origins'])
            profiles.update(db,rid,{'development_stage':'prototype','project_type':'service'},radar.now())
            self.assertEqual(profiles.read(db,rid)['field_origins']['development_stage']['type'],'manual')
            self.assertEqual(profiles.read(db,rid)['field_origins']['project_type']['type'],'manual')
            radar.save_record(db,'a',self.item(description=text+' Nowe dane.'))
            self.assertTrue(local_ai.read(db,rid)['stale'])
            self.assertEqual(profiles.read(db,rid)['development_stage'],'prototype')
            self.assertEqual(profiles.read(db,rid)['project_type'],'service')
        output['investor_benefits'][0]['evidence_quote']='Nieistniejący fragment opisu'
        validated=local_ai.validate(output,{'title':'Robot','description':text})
        self.assertEqual(validated['investor_benefits'],[])

    def test_ai_uses_raw_sources_and_discards_unsupported_fields(self):
        text='Prototyp systemu monitoruje zużycie energii w budynkach i umożliwia pomiar efektów oszczędności.'
        with radar.connect() as db:
            rid=radar.save_record(db,'a',self.item(description=None,raw={'country':'PL','objective':text}))
            content=local_ai.material(db,rid)
        self.assertIn(text,content['sources'][0]['facts'])
        payload={'profile':{field:([] if field in ['categories','education_levels'] else None) for field in local_ai.PROFILE_FIELDS},
                 'evidence':{field:'' for field in local_ai.PROFILE_FIELDS},
                 'investor_benefits':[],'innovator_benefits':[],'limitations':['Brak danych wdrożeniowych.']}
        payload['profile']['impact_scale']='global'
        payload['evidence']['impact_scale']='Nieistniejąca deklaracja globalnego wdrożenia'
        payload['profile']['development_stage']='prototype'
        payload['evidence']['development_stage']='Prototyp systemu monitoruje zużycie energii'
        with patch.object(local_ai,'call',return_value={'message':{'content':json.dumps(payload)}}):
            local_ai.analyze(radar.connect,rid)
        with radar.connect() as db:
            profile=profiles.read(db,rid)
            self.assertEqual(profile['development_stage'],'prototype')
            self.assertIsNone(profile['impact_scale'])

    def empty_analysis(self):
        return {'profile':{field:([] if field in ['categories','education_levels'] else None) for field in local_ai.PROFILE_FIELDS},
                'evidence':{field:'' for field in local_ai.PROFILE_FIELDS},
                'investor_benefits':[],'innovator_benefits':[],'limitations':['Brak danych do klasyfikacji.']}

    def test_sparse_record_finishes_with_unknowns(self):
        with radar.connect() as db:rid=radar.save_record(db,'a',self.item())
        with patch.object(local_ai,'call',return_value={'message':{'content':json.dumps(self.empty_analysis())}}) as call:
            pipeline.process_one(radar.connect)
            self.assertEqual(call.call_count,1)
        with radar.connect() as db:
            self.assertEqual(db.execute('SELECT status FROM processing_jobs').fetchone()[0],'completed')
            self.assertIsNone(profiles.read(db,rid)['development_stage'])
            self.assertEqual(db.execute('SELECT count(*) FROM ready_records').fetchone()[0],1)

    def test_category_limit_also_applies_when_moving_relation(self):
        with radar.connect() as db:
            a=radar.save_record(db,'a',self.item())
            b=radar.save_record(db,'a',self.item(id='two',url='https://example.org/project/2'))
            profiles.update(db,a,{'categories':['technology','industry','energy']},radar.now())
            profiles.update(db,b,{'categories':['social']},radar.now())
            with self.assertRaises(sqlite3.IntegrityError):
                db.execute('UPDATE project_categories SET record_id=? WHERE record_id=?',(a,b))

    def test_separate_projects_in_same_spreadsheet(self):
        with radar.connect() as db:
            radar.save_record(db,'a',self.item(url='https://example.org/data.xlsx'))
            radar.save_record(db,'a',self.item(id='two',url='https://example.org/data.xlsx',title='Other project'))
            self.assertEqual(db.execute('select count(*) from records').fetchone()[0],2)

    def test_import_queue_cursor_atomicity_and_failure_restart(self):
        with patch.dict(radar.CONNECTORS,{'test':lambda *args:Batch([self.item()],state={'offset':1})}):
            radar.refresh_source('a',force=True)
        with radar.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM ready_records').fetchone()[0],0)
            self.assertEqual(db.execute('SELECT status FROM processing_jobs').fetchone()[0],'pending')
            self.assertEqual(json.loads(db.execute("SELECT state FROM sources WHERE id='a'").fetchone()[0]),{'offset':1})
        with patch.object(local_ai,'call',side_effect=local_ai.AIUnavailable('Ollama wyłączone')):
            pipeline.process_one(radar.connect)
        with radar.connect() as db:
            row=db.execute('SELECT * FROM processing_jobs').fetchone()
            self.assertEqual(row['status'],'failed');self.assertIsNone(row['claim_token'])
            self.assertEqual(db.execute('SELECT count(*) FROM source_records').fetchone()[0],1)
            db.execute("UPDATE processing_jobs SET retry_after='2000'")
            db.execute("UPDATE ai_model_backoff SET retry_after='2000'")
        radar.initialize()
        with patch.object(local_ai,'call',return_value={'message':{'content':json.dumps(self.empty_analysis())}}):
            pipeline.process_one(radar.connect)
        with radar.connect() as db:self.assertEqual(db.execute('SELECT count(*) FROM ready_records').fetchone()[0],1)

    def test_claim_exclusivity_expiry_and_superseded_answer(self):
        with radar.connect() as db:rid=radar.save_record(db,'a',self.item())
        first=pipeline.claim(radar.connect)
        self.assertIsNone(pipeline.claim(radar.connect))
        with radar.connect() as db:
            db.execute("UPDATE processing_jobs SET lease_until='2000'")
            db.execute("UPDATE inference_slots SET lease_until='2000'")
        second=pipeline.claim(radar.connect)
        self.assertNotEqual(first['claim_token'],second['claim_token'])
        response={'message':{'content':json.dumps(self.empty_analysis())}}
        with patch.object(local_ai,'call',return_value=response):
            with self.assertRaises(ValueError):local_ai.analyze(radar.connect,rid,claim=first)
        def changed(*args,**kwargs):
            # A concurrent writer succeeds while inference is running.
            with radar.connect() as db:radar.save_record(db,'a',self.item(description='Zmieniony opis w trakcie analizy'))
            return response
        with patch.object(local_ai,'call',side_effect=changed):
            with self.assertRaises(ValueError):local_ai.analyze(radar.connect,rid,claim=second)
        with radar.connect() as db:
            self.assertEqual(db.execute('SELECT status FROM processing_jobs').fetchone()[0],'pending')
            self.assertEqual(db.execute('SELECT count(*) FROM ai_analyses').fetchone()[0],0)
        self.assertIsNone(pipeline.claim(radar.connect))  # Superseding an input does not release active inference.
        pipeline.release(radar.connect,second['claim_token'])
        with patch.object(local_ai,'call',return_value=response):pipeline.process_one(radar.connect)
        with radar.connect() as db:self.assertEqual(db.execute('SELECT count(*) FROM ready_records').fetchone()[0],1)

    def test_refresh_cache_manual_empty_and_model_change(self):
        text='Prototyp systemu monitoruje zużycie energii w budynkach i umożliwia pomiar efektów oszczędności.'
        output=self.empty_analysis()
        output['profile'].update(development_stage='prototype',project_type='product',categories=['technology'])
        for field in ['development_stage','project_type','categories']:output['evidence'][field]='Prototyp systemu monitoruje zużycie energii'
        response={'message':{'content':json.dumps(output)}}
        with radar.connect() as db:rid=radar.save_record(db,'a',self.item(description=text))
        with patch.object(local_ai,'call',return_value=response) as call:
            pipeline.process_one(radar.connect)
            with radar.connect() as db:
                radar.save_record(db,'a',self.item(description=text))
                self.assertEqual(db.execute('SELECT status FROM processing_jobs').fetchone()[0],'completed')
                profiles.update(db,rid,{'development_stage':None,'categories':[]},radar.now())
                radar.save_record(db,'a',self.item(description=text+' Nowa informacja.'))
                self.assertEqual(profiles.read(db,rid)['project_type'],'product')
            pipeline.process_one(radar.connect)
            with radar.connect() as db:
                self.assertIsNone(profiles.read(db,rid)['development_stage'])
                self.assertEqual(profiles.read(db,rid)['categories'],[])
                self.assertEqual(profiles.read(db,rid)['project_type'],'product')
                radar.save_record(db,'a',self.item(description=text))
            pipeline.process_one(radar.connect)
            self.assertEqual(call.call_count,2)  # Original content is cached.
            with patch.object(local_ai,'model',return_value='another-local-model'):
                pipeline.reconcile(radar.connect)
                pipeline.process_one(radar.connect)
            self.assertEqual(call.call_count,3)
        with radar.connect() as db:self.assertEqual(db.execute('SELECT count(*) FROM records').fetchone()[0],1)

    def test_other_jobs_continue_and_invalid_json_retries(self):
        with radar.connect() as db:
            radar.save_record(db,'a',self.item())
            radar.save_record(db,'a',self.item(id='two',url='https://example.org/2'))
        with patch.object(local_ai,'call',side_effect=[{'message':{'content':'broken'}},{'message':{'content':json.dumps(self.empty_analysis())}}]):
            pipeline.drain(radar.connect)
        with radar.connect() as db:
            self.assertEqual(dict(db.execute('SELECT status,count(*) FROM processing_jobs GROUP BY status')),{'completed':1,'failed':1})

    def test_parallel_claims_allow_only_one_inference(self):
        with radar.connect() as db:
            for i in range(4):radar.save_record(db,'a',self.item(id=str(i),url='https://example.org/'+str(i)))
        barrier=threading.Barrier(4)
        def take():
            barrier.wait()
            return pipeline.claim(radar.connect)
        with ThreadPoolExecutor(max_workers=4) as pool:
            jobs=list(pool.map(lambda _:take(),range(4)))
        self.assertEqual(sum(job is not None for job in jobs),1)

    def test_file_import_uses_queue_and_rejects_foreign_records(self):
        from file_import import import_file
        path=radar.ROOT/'input.json'
        rows=[{'id':'polish','title':'Polski projekt','country':'PL','url':'https://example.org/pl'},
              {'id':'foreign','title':'German project','country':'DE','url':'https://example.org/de'}]
        path.write_text(json.dumps(rows))
        import_file('a',path,{})
        with radar.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM processing_jobs').fetchone()[0],1)
            self.assertEqual(db.execute('SELECT count(*) FROM records').fetchone()[0],1)
        with patch.object(local_ai,'call',return_value={'message':{'content':json.dumps(self.empty_analysis())}}) as call:
            pipeline.drain(radar.connect)
            import_file('a',path,{})
            pipeline.drain(radar.connect)
            self.assertEqual(call.call_count,1)
        with radar.connect() as db:self.assertEqual(db.execute('SELECT count(*) FROM ready_records').fetchone()[0],1)

    def test_http_filters_read_prepared_profile(self):
        output=self.empty_analysis()
        output['profile'].update(project_type='product',categories=['technology'],impact_scale='regional',development_stage='prototype')
        for field in ['project_type','categories','impact_scale','development_stage']:output['evidence'][field]='Prototyp systemu monitoruje zużycie energii'
        with radar.connect() as db:
            rid=radar.save_record(db,'a',self.item(description='Prototyp systemu monitoruje zużycie energii w budynkach.'))
        with patch.object(local_ai,'call',return_value={'message':{'content':json.dumps(output)}}):pipeline.process_one(radar.connect)
        # Exercise the real HTTP routing and SQL without a listening socket.
        handler=radar.Handler.__new__(radar.Handler)
        captured=[]
        handler.send_json=lambda result,*args:captured.append(result)
        handler.get('/api/search',{'category':['technology'],'project_type':['product'],'impact_scale':['regional'],'development_stage':['prototype']})
        self.assertEqual(captured[-1]['total'],1)
        self.assertEqual(captured[-1]['items'][0]['id'],rid)
        handler.get('/api/search',{'category':['social']})
        self.assertEqual(captured[-1]['total'],0)
        handler.get('/api/processing',{})
        self.assertEqual(captured[-1]['completed'],1)
        self.assertNotIn('Uzupełnij braki lokalnym AI',(self.original/'static/app.js').read_text())

    def test_stage_requires_achieved_relevant_evidence(self):
        irrelevant='W ramach projektu zostanie zacieśniona i sformalizowana wzajemna współpraca pomiędzy jednostkami OSP z obu stron granicy'
        planned='W ramach projektu zostanie opracowany prototyp robota ratowniczego.'
        for quote in [irrelevant,planned,'Brak prototypu rozwiązania.','The project will develop a prototype.','Prototyp jeszcze nie istnieje.','Celem projektu jest opracowanie prototypu.']:
            self.assertFalse(local_ai.supports_stage('prototype',quote))
            content={'title':'Projekt','description':quote}
            output=self.empty_analysis()
            output['profile']['development_stage']='prototype'
            output['evidence']['development_stage']=quote
            self.assertIsNone(local_ai.validate(output,content)['profile']['development_stage'])
        output=self.empty_analysis();output['profile']['development_stage']=irrelevant
        self.assertIsNone(local_ai.validate(output,{'title':'OSP','description':irrelevant})['profile']['development_stage'])
        self.assertTrue(local_ai.supports_stage('prototype','Zbudowano i przetestowano prototyp robota.'))
        self.assertTrue(local_ai.supports_stage('pilot','Zakończono pilotaż systemu w szpitalu.'))
        self.assertTrue(local_ai.supports_stage('deployment','System wdrożono i działa w zakładzie.'))

    def test_published_version_survives_refresh_failure_and_restart(self):
        first=self.empty_analysis();first['profile'].update(project_type='product',categories=['technology'])
        first['evidence'].update(project_type='System do sortowania odpadów',categories='System do sortowania odpadów')
        with radar.connect() as db:
            rid=radar.save_record(db,'a',self.item(title='Wersja pierwsza',description='System do sortowania odpadów usprawnia pracę zakładu.',entities=[{'name':'Pierwszy podmiot','role':'owner'}]))
        with patch.object(local_ai,'call',return_value={'message':{'content':json.dumps(first)}}):pipeline.process_one(radar.connect)
        def search(**query):
            handler=radar.Handler.__new__(radar.Handler);captured=[]
            handler.send_json=lambda data,*args:captured.append(data)
            handler.get('/api/search',{key:[value] for key,value in query.items()})
            return captured[0]
        with radar.connect() as db:
            old=json.loads(db.execute('SELECT published_payload FROM ready_records WHERE id=?',(rid,)).fetchone()[0])
            radar.save_record(db,'a',self.item(title='Wersja druga',description='System do wsparcia edukacji społecznej.',entities=[{'name':'Nowy podmiot','role':'partner'}]))
            self.assertEqual(db.execute('SELECT title FROM ready_records').fetchone()[0],'Wersja pierwsza')
        with patch.object(local_ai,'call',side_effect=local_ai.AIUnavailable('Model offline')):pipeline.process_one(radar.connect)
        radar.initialize()
        self.assertEqual(search(q='Wersja pierwsza',category='technology',project_type='product')['total'],1)
        self.assertEqual(search(q='Wersja druga')['total'],0)
        self.assertEqual(search(entity=str(old['entities'][0]['id']))['total'],1)
        with radar.connect() as db:
            changes={'impact_description':'Ręczna poprawka podczas aktualizacji.'}
            profiles.update(db,rid,changes,radar.now());pipeline.publish_manual(db,rid,changes)
            published=json.loads(db.execute('SELECT published_payload FROM ready_records').fetchone()[0])
            self.assertEqual(published['title'],'Wersja pierwsza')
            self.assertEqual(published['profile']['impact_description'],changes['impact_description'])
            db.execute("UPDATE processing_jobs SET retry_after='2000'")
            db.execute("UPDATE ai_model_backoff SET retry_after='2000'")
        second=self.empty_analysis();second['profile'].update(project_type='education',categories=['education'])
        second['evidence'].update(project_type='System do wsparcia edukacji społecznej',categories='System do wsparcia edukacji społecznej')
        with patch.object(local_ai,'call',return_value={'message':{'content':json.dumps(second)}}):pipeline.process_one(radar.connect)
        updated=search(q='Wersja druga',category='education',project_type='education')
        self.assertEqual(updated['total'],1)
        self.assertEqual(updated['items'][0]['entities'][0]['name'],'Nowy podmiot')
        self.assertEqual(updated['items'][0]['profile']['impact_description'],'Ręczna poprawka podczas aktualizacji.')
        self.assertEqual(search(q='Wersja pierwsza',category='technology')['total'],0)

    def test_legacy_completed_snapshot_is_preserved_and_invalid_stage_removed(self):
        quote='W ramach projektu zostanie zacieśniona współpraca jednostek OSP.'
        with radar.connect() as db:
            rid=radar.save_record(db,'a',self.item(description=quote))
            profiles.update(db,rid,{'development_stage':'prototype'},radar.now(),origin='ai')
            db.execute('INSERT INTO ai_profile_fields VALUES(?,?,?,?,?,?,?,?)',(rid,'development_stage','"prototype"','old','qwen3:4b','https://example.org/1',quote,radar.now()))
            db.execute("UPDATE processing_jobs SET status='completed',input_hash='old'")
        pipeline.reconcile(radar.connect)
        with radar.connect() as db:
            row=db.execute('SELECT published_payload FROM ready_records').fetchone()
            self.assertIsNotNone(row)
            self.assertIsNone(json.loads(row[0])['profile']['development_stage'])
            self.assertEqual(db.execute('SELECT status FROM processing_jobs').fetchone()[0],'pending')
        js=(self.original/'static/app.js').read_text()
        self.assertNotIn('showLocalAI',js)
        self.assertNotIn("node('details'",js)
        self.assertNotIn('originLabel',js)

    def compact_response(self,body,**values):
        result={key:([] if key in ('c','l') else None) for key in body['format']['properties'] if key!='e'}
        result.update(values)
        result['e']={key:(1 if value else 0) for key,value in result.items()}
        return {'message':{'content':json.dumps(result)},'done':True,'eval_count':100,'prompt_eval_count':500,
                'load_duration':1000000,'prompt_eval_duration':2000000,'eval_duration':3000000}

    def test_compact_wire_uses_ids_and_saves_metrics(self):
        text='Zbudowano prototyp robota sortującego odpady w zakładzie przemysłowym.'
        with radar.connect() as db:rid=radar.save_record(db,'a',self.item(description=text))
        def inference(path,body,**kwargs):
            self.assertFalse(body['think']);self.assertEqual(body['options']['num_predict'],640)
            self.assertEqual(body['options']['num_ctx'],4096)
            self.assertNotIn('evidence',body['format']['properties'])
            self.assertNotIn('publisher_role',body['format']['properties'])
            return self.compact_response(body,s='prototype',t='product',c=['technology'],b='Możliwość sprawdzenia zastosowań przemysłowych.')
        with patch.object(local_ai,'call',side_effect=inference) as call:
            pipeline.process_one(radar.connect)
            self.assertEqual(call.call_count,1)
        with radar.connect() as db:
            profile=profiles.read(db,rid)
            self.assertEqual(profile['development_stage'],'prototype')
            self.assertEqual(profile['field_origins']['development_stage']['evidence_quote'],text)
            self.assertEqual(profile['categories'],['technology'])
            metric=db.execute('SELECT * FROM ai_metrics').fetchone()
            self.assertEqual(metric['output_tokens'],100)
            self.assertEqual(metric['generation_seconds'],.003)
            self.assertEqual(metric['cached'],0)
            self.assertGreater(metric['output_chars'],0)

    def test_compact_bad_field_does_not_retry_entire_record(self):
        with radar.connect() as db:rid=radar.save_record(db,'a',self.item(description='Zbudowano prototyp systemu oszczędzającego energię w budynkach.'))
        def inference(path,body,**kwargs):
            result=self.compact_response(body,s='prototype',t='product',b='Korzyść bez dowodu.')
            raw=json.loads(result['message']['content']);raw['e']['b']=9999;raw['c']=['technology','industry','energy','environment']
            raw['e']['c']=1
            result['message']['content']=json.dumps(raw)
            return result
        with patch.object(local_ai,'call',side_effect=inference):pipeline.process_one(radar.connect)
        with radar.connect() as db:
            self.assertEqual(db.execute('SELECT status FROM processing_jobs').fetchone()[0],'completed')
            profile=profiles.read(db,rid)
            self.assertIsNone(profile['investor_benefits'])
            self.assertEqual(profile['project_type'],'product')
            self.assertEqual(len(profile['categories']),3)

    def test_old_compatible_result_is_reused_without_inference(self):
        with radar.connect() as db:rid=radar.save_record(db,'a',self.item(description='Zbudowano prototyp urządzenia do sortowania odpadów.'))
        with patch.object(local_ai,'call',return_value={'message':{'content':json.dumps(self.empty_analysis())}}):pipeline.process_one(radar.connect)
        with radar.connect() as db:
            content=local_ai.material(db,rid)
            digest=local_ai.hashlib.sha256((local_ai.PREVIOUS_PROMPT_VERSION+json.dumps(content,sort_keys=True,ensure_ascii=False)).encode()).hexdigest()
            db.execute('DELETE FROM ai_cache')
            db.execute('UPDATE ai_analyses SET input_hash=?',(digest,))
            db.execute("UPDATE processing_jobs SET status='pending'")
        with patch.object(local_ai,'call') as call:
            pipeline.process_one(radar.connect)
            call.assert_not_called()
        with radar.connect() as db:
            self.assertEqual(db.execute('SELECT status FROM processing_jobs').fetchone()[0],'completed')
            self.assertEqual(db.execute('SELECT cached FROM ai_metrics ORDER BY id DESC').fetchone()[0],1)

    def test_outage_cools_model_but_allows_cached_jobs(self):
        with radar.connect() as db:
            first=radar.save_record(db,'a',self.item())
            second=radar.save_record(db,'a',self.item(id='two',url='https://example.org/two'))
        with patch.object(local_ai,'call',side_effect=local_ai.AIUnavailable('Model offline')) as call:
            pipeline.process_one(radar.connect)
            self.assertFalse(pipeline.process_one(radar.connect))
            self.assertEqual(call.call_count,1)
        with radar.connect() as db:
            digest=db.execute('SELECT input_hash FROM processing_jobs WHERE record_id=?',(second,)).fetchone()[0]
            result=self.empty_analysis();result['source_url']='https://example.org/two'
            db.execute('INSERT INTO ai_cache VALUES(?,?,?,?)',(digest,local_ai.model(),json.dumps(result),radar.now()))
        with patch.object(local_ai,'call') as call:
            pipeline.process_one(radar.connect)
            call.assert_not_called()
        with radar.connect() as db:self.assertEqual(db.execute('SELECT count(*) FROM ready_records').fetchone()[0],1)

    def test_two_slots_are_bounded_across_workers(self):
        with radar.connect() as db:
            for i in range(4):radar.save_record(db,'a',self.item(id=str(i),url='https://example.org/'+str(i)))
        with patch.object(local_ai,'concurrency',return_value=2):
            first=pipeline.claim(radar.connect);second=pipeline.claim(radar.connect)
            self.assertIsNotNone(first);self.assertIsNotNone(second)
            self.assertIsNone(pipeline.claim(radar.connect))
            pipeline.release(radar.connect,first['claim_token'])
            self.assertIsNotNone(pipeline.claim(radar.connect))

    def test_manual_fields_are_omitted_from_model_request(self):
        with radar.connect() as db:
            rid=radar.save_record(db,'a',self.item())
            profiles.update(db,rid,{'categories':['social'],'investor_benefits':None},radar.now())
        def inference(path,body,**kwargs):
            self.assertNotIn('c',body['format']['properties'])
            self.assertNotIn('b',body['format']['properties'])
            return self.compact_response(body)
        with patch.object(local_ai,'call',side_effect=inference):pipeline.process_one(radar.connect)
        with radar.connect() as db:self.assertEqual(profiles.read(db,rid)['categories'],['social'])

    def test_complete_manual_profile_needs_no_model(self):
        with radar.connect() as db:
            rid=radar.save_record(db,'a',self.item())
            changes={field:([] if field in ('categories','education_levels') else None) for field in local_ai.WIRE_FIELDS.values()}
            profiles.update(db,rid,changes,radar.now())
        with patch.object(local_ai,'call') as call:
            pipeline.process_one(radar.connect)
            call.assert_not_called()
        with radar.connect() as db:self.assertEqual(db.execute('SELECT count(*) FROM ready_records').fetchone()[0],1)

    def test_fact_selection_deduplicates_and_keeps_other_sources(self):
        text='Zbudowano prototyp urządzenia monitorującego jakość powietrza w pomieszczeniach.'
        content={'title':'Monitor powietrza','description':text,'sources':[{'source':'a','facts':'objective: '+text},{'source':'b','facts':'Zakończono pilotaż urządzenia w trzech placówkach szkolnych.'}],'entities':[]}
        facts=local_ai.input_facts(content,budget=600)
        self.assertEqual(sum(f['text']==text for f in facts),1)
        self.assertTrue(any('Zakończono pilotaż' in f['text'] for f in facts))
        self.assertTrue(all(len(f['text'])<=220 for f in facts))
        self.assertLessEqual(sum(len(f['text']) for f in facts),600)

    def test_legacy_orphan_lock_is_recovered_immediately(self):
        with radar.connect() as db:
            radar.save_record(db,'a',self.item())
            db.execute("UPDATE inference_slots SET claim_token='orphan',lease_until='2099',owner_pid=NULL WHERE id=1")
        job=pipeline.claim(radar.connect)
        self.assertIsNotNone(job)
        self.assertNotEqual(job['claim_token'],'orphan')

    def test_dead_owner_job_returns_to_queue_on_restart(self):
        with radar.connect() as db:radar.save_record(db,'a',self.item())
        first=pipeline.claim(radar.connect)
        with patch.object(pipeline,'process_alive',return_value=False):
            second=pipeline.claim(radar.connect)
        self.assertIsNotNone(second)
        self.assertEqual(first['record_id'],second['record_id'])
        self.assertNotEqual(first['claim_token'],second['claim_token'])

    def test_streamed_response_reconstructs_json_and_reports_characters(self):
        packets=[{'message':{'content':'{"s":'}}, {'message':{'content':'null}'},'done':False}, {'done':True,'eval_count':10,'message':{'content':''}}]
        response=io.BytesIO(('\n'.join(json.dumps(p) for p in packets)+'\n').encode())
        reported=[]
        with patch.object(local_ai.urllib.request,'urlopen',return_value=response):
            result=local_ai.call('/api/chat',{'stream':True},on_progress=reported.append)
        self.assertEqual(result['message']['content'],'{"s":null}')
        self.assertEqual(result['eval_count'],10)
        self.assertEqual(reported[-1],10)
        with patch.object(local_ai.urllib.request,'urlopen',return_value=io.BytesIO(b'{"message":{"content":"partial"}}\n')):
            with self.assertRaises(local_ai.AIUnavailable):local_ai.call('/api/chat',{'stream':True})

    def test_active_progress_is_visible_during_inference(self):
        with radar.connect() as db:radar.save_record(db,'a',self.item())
        def inference(path,body,**kwargs):
            self.assertTrue(body['stream'])
            kwargs['on_progress'](48)
            with radar.connect() as db:
                status=pipeline.summary(db)
                self.assertEqual(status['state'],'running')
                self.assertEqual(status['processing'],1)
                self.assertEqual(status['active'][0]['phase'],'generating')
                self.assertEqual(status['active'][0]['output_chars'],48)
                self.assertEqual(status['active'][0]['title'],'Robot')
            return self.compact_response(body)
        with patch.object(local_ai,'call',side_effect=inference):pipeline.process_one(radar.connect)
        with radar.connect() as db:
            status=pipeline.summary(db)
            self.assertEqual(status['percent'],100)
            self.assertEqual(status['state'],'idle')
            self.assertEqual(status['active'],[])
            self.assertEqual(status['recent'][0]['title'],'Robot')

    def test_progress_distinguishes_missing_worker_and_model_cooldown(self):
        with radar.connect() as db:
            radar.save_record(db,'a',self.item())
            self.assertEqual(pipeline.summary(db)['state'],'worker_missing')
            db.execute('INSERT INTO worker_heartbeats VALUES(?,?)',(1,pipeline.timestamp()))
            self.assertEqual(pipeline.summary(db)['state'],'queued')
        with patch.object(local_ai,'call',side_effect=local_ai.AIUnavailable('Ollama offline')):pipeline.process_one(radar.connect)
        with radar.connect() as db:
            status=pipeline.summary(db)
            self.assertEqual(status['state'],'model_wait')
            self.assertIn('Ollama offline',status['state_message'])
            self.assertIsNotNone(status['next_retry'])

    def test_presentation_mode_keeps_ready_catalog_without_ai_or_refresh(self):
        with radar.connect() as db:rid=radar.save_record(db,'a',self.item())
        with patch.object(local_ai,'call',return_value={'message':{'content':json.dumps(self.empty_analysis())}}):pipeline.process_one(radar.connect)
        with radar.connect() as db:
            db.execute("INSERT INTO runtime_settings VALUES('processing_mode','presentation')")
            before=db.execute('SELECT payload FROM published_records').fetchone()[0]
        with patch.object(local_ai,'call') as call,patch.dict(radar.CONNECTORS,{'test':lambda *args:self.fail('Nie należy odświeżać danych podczas prezentacji')}):
            radar.initialize()
            radar.refresh(force=True)
            radar.refresh_source('a',force=True)
            self.assertIsNone(pipeline.claim(radar.connect))
            stop,threads=pipeline.start_worker(radar.connect)
            self.assertEqual(threads.threads,[])
            call.assert_not_called()
        with radar.connect() as db:
            state=pipeline.summary(db)
            self.assertEqual(state['mode'],'presentation')
            self.assertEqual(state['published'],1)
            self.assertEqual(db.execute('SELECT payload FROM published_records').fetchone()[0],before)
            self.assertEqual(db.execute('SELECT count(*) FROM refresh_runs').fetchone()[0],0)

    def test_faq_separates_source_material_from_candidate(self):
        with radar.connect() as db:
            publication=radar.save_record(db,'a',self.item(kind='publication'))
            procurement=radar.save_record(db,'a',self.item(id='order',url='https://example.org/order',subtype='procurement'))
            patent=radar.save_record(db,'a',self.item(id='patent',url='https://example.org/patent',kind='patent'))
            self.assertEqual(assessment.infer(db,publication)['bucket'],'context')
            self.assertEqual(assessment.infer(db,procurement)['bucket'],'context')
            self.assertEqual(assessment.infer(db,patent)['bucket'],'candidate')
            value=assessment.infer(db,patent);value['bucket']='verified'
            with self.assertRaises(ValueError):assessment.write(db,patent,value)
            value['bucket']='candidate';value['trl']=8
            with self.assertRaises(ValueError):assessment.write(db,patent,value)

    def test_source_import_rules_assessment_and_refresh_without_ollama(self):
        from connectors import reviewed_pages
        item=json.loads((self.original/'reviewed-solutions.json').read_text())[0]
        class Client:
            def text(self,url,**kwargs):return item['proof']
        config={'catalog_file':str(self.original/'reviewed-solutions.json')}
        batch=reviewed_pages(Client(),config,{},1)
        with radar.connect() as db:
            db.execute("INSERT INTO sources(id,name,url,connector,config,interval_hours) VALUES('reviewed_web','Dokumentacja','https://www.gov.pl','reviewed_pages',?,24)",(json.dumps(config),))
            db.execute("INSERT INTO runtime_settings VALUES('analysis_engine','source_rules')")
        with patch.dict(radar.CONNECTORS,{'reviewed_pages':lambda *args:batch}):radar.refresh_source('reviewed_web',force=True)
        with patch.object(local_ai,'call') as call:
            pipeline.process_one(radar.connect);call.assert_not_called()
        with radar.connect() as db:
            rid=db.execute("SELECT record_id FROM source_records WHERE source_id='reviewed_web'").fetchone()[0]
            old=json.loads(db.execute('SELECT published_payload FROM ready_records WHERE id=?',(rid,)).fetchone()[0])
            self.assertEqual(old['assessment']['bucket'],'verified')
            self.assertIsNone(old['assessment']['trl'])
            changed=dict(batch.records[0]);changed['raw']={**changed['raw'],'review_marker_present':False}
            radar.save_record(db,'reviewed_web',changed)
            self.assertEqual(json.loads(db.execute('SELECT published_payload FROM ready_records WHERE id=?',(rid,)).fetchone()[0])['assessment']['bucket'],'verified')
        with patch.object(local_ai,'call') as call:
            pipeline.process_one(radar.connect);call.assert_not_called()
        with radar.connect() as db:
            now=json.loads(db.execute('SELECT published_payload FROM ready_records WHERE id=?',(rid,)).fetchone()[0])
            self.assertEqual(now['assessment']['bucket'],'candidate')
            self.assertEqual(now['assessment']['evidence'],[])

    def test_faq_filters_and_comparison_api(self):
        with radar.connect() as db:
            ids=[]
            for i in range(3):
                rid=radar.save_record(db,'a',self.item(id=str(i),url='https://example.org/'+str(i)))
                value=assessment.infer(db,rid);value.update(bucket='candidate',areas=['education'],audience=['school'])
                assessment.write(db,rid,value);pipeline.publish(db,rid);ids.append(rid)
        handler=radar.Handler.__new__(radar.Handler);captured=[];handler.send_json=lambda data,*args:captured.append(data)
        handler.get('/api/innovations',{'area':['education'],'audience':['school']})
        self.assertEqual(captured[-1]['total'],3)
        handler.get('/api/innovations',{'bucket':['verified']})
        self.assertEqual(captured[-1]['total'],0)
        handler.get('/api/compare',{'ids':[','.join(map(str,ids))]})
        self.assertEqual(len(captured[-1]),3)
        self.assertTrue(all('assessment' in r for r in captured[-1]))
        with self.assertRaises(ValueError):handler.get('/api/compare',{'ids':[str(ids[0])]})

    def test_catalog_shows_unverified_and_context_by_default(self):
        with radar.connect() as db:
            for key,bucket in [('one','candidate'),('two','context')]:
                rid=radar.save_record(db,'a',self.item(id=key,url='https://example.org/'+key))
                value=assessment.infer(db,rid);value['bucket']=bucket
                assessment.write(db,rid,value);pipeline.publish(db,rid)
        handler=radar.Handler.__new__(radar.Handler);output=[];handler.send_json=lambda data,*args:output.append(data)
        for path in ['/api/innovations','/api/search']:
            handler.get(path,{})
            self.assertEqual(output[-1]['total'],2)
        handler.get('/api/innovations',{'catalog':['radar']})
        self.assertEqual(output[-1]['total'],1)
        handler.get('/api/innovations',{'bucket':['context']})
        self.assertEqual(output[-1]['total'],1)

    def test_source_only_requires_every_field_with_official_provenance(self):
        url='https://www.gov.pl/web/ncbr/test'
        facts={k:{'value':'Tekst ze źródła','excerpt':'Tekst ze źródła','source_url':url,'source_name':'NCBR','retrieved_at':radar.now(),'claim_type':'publisher_statement'} for k in source_only.REQUIRED}
        self.assertTrue(source_only.complete(facts))
        missing=dict(facts);missing.pop('implementation')
        self.assertFalse(source_only.complete(missing))
        missing=dict(facts);missing['benefits']={**missing['benefits'],'source_url':'https://example.org/ai'}
        self.assertFalse(source_only.complete(missing))
        with radar.connect() as db:
            rid=radar.save_record(db,'a',self.item())
            source_only.save(db,rid,facts)
            db.execute("INSERT INTO runtime_settings VALUES('source_only','1')")
            pipeline.publish(db,rid)
            result=json.loads(db.execute('SELECT payload FROM published_records').fetchone()[0])
            self.assertTrue(result['source_only'])
            self.assertEqual(result['assessment']['interpretations'],[])
            self.assertIsNone(result['assessment']['trl'])
            self.assertTrue(all(f['source_name']=='NCBR' for f in result['facts'].values()))
            invalid={**facts,'title':{**facts['title'],'excerpt':'Niepasujący cytat'}}
            with self.assertRaises(ValueError):source_only.save(db,rid,invalid)

    def test_ncbr_extractor_does_not_infer_deployment_from_plans(self):
        url='https://www.gov.pl/web/ncbr/test'
        template='<article><h2>Projekt</h2><h3>Nazwa Beneficjenta/Beneficjentów</h3><p>Uczelnia</p><h3>Jaki problem rozwiązuje nasz projekt?</h3><p>{}</p><h3>Kto korzysta/skorzysta z wyników projektu?</h3><p>Użytkownicy. Rozwiązanie pozwala ograniczyć nakład pracy.</p></article>'
        planned=source_only.extract_ncbr(template.format('W ramach projektu zostanie opracowany prototyp.'),url)
        self.assertNotIn('implementation',planned)
        achieved=source_only.extract_ncbr(template.format('W ramach projektu powstał prototyp urządzenia do monitorowania jakości wody.'),url)
        self.assertTrue(source_only.complete(achieved))
        self.assertEqual(achieved['implementation']['value'],'W ramach projektu powstał prototyp urządzenia do monitorowania jakości wody.')
        self.assertTrue(all(f['value']==f['excerpt'] for f in achieved.values()))

    def test_ncbr_recipients_are_not_an_implementation_stage(self):
        url='https://www.gov.pl/web/ncbr/test'
        template='<article><h2>Program uczelni</h2><h3>Nazwa Beneficjenta</h3><p>Uczelnia</p><h3>Jaki problem rozwiązuje nasz projekt?</h3><p>Projekt pozwolił na:</p><p>Rozbudowę narzędzi dydaktycznych.</p><h3>Kto korzysta/skorzysta z wyników projektu?</h3><p>Z wyników projektu korzystają studenci, kadra dydaktyczna i administracyjna, Uczelnia oraz pracodawcy. {}</p></article>'
        recipients=source_only.extract_ncbr(template.format(''),url)
        self.assertNotIn('implementation',recipients)
        self.assertNotIn('benefits',recipients)
        for statement in ['Celem projektu była budowa i przetestowanie demonstratora radaru krótkiego zasięgu.', 'Koncepcja projektu powstała w odpowiedzi na problem postępującej eutrofizacji wód.', 'Projekt powstał w odpowiedzi na pięć dostrzeżonych problemów w organizacji pracy.', 'Produkcja betonu zawierającego spoiwo powstałe na bazie glinokrzemianów ogranicza emisje.']:
            self.assertNotIn('implementation',source_only.extract_ncbr(template.format(statement),url))
        self.assertIn('Rozbudowę narzędzi dydaktycznych.',recipients['description']['value'])
        quote='Opracowany i wdrożony Zintegrowany Model Zarządzania pozwala na efektywne wykorzystanie kadry uczelni oraz jej zasobów finansowych.'
        facts=source_only.extract_ncbr(template.format(quote),url)
        self.assertEqual(facts['implementation']['value'],quote)
        self.assertEqual(facts['benefits']['value'],quote)


    def review_fixture(self):
        quote='W ramach projektu powstał prototyp robota do obsługi stanowisk produkcyjnych.'
        facts={'description':{'value':quote,'source_url':'https://www.gov.pl/web/ncbr/test'}}
        payload={'fields':{'development_stage':{'value':'prototype','basis':[{'field':'description','quote':quote}],'reason':'Opis potwierdza powstanie prototypu, bez dowodu wdrożenia.'}},
                 'missing':{f:'Brak wystarczającej podstawy w materiale źródłowym.' for f in profile_review.FIELDS-{'development_stage'}}}
        return facts,payload

    def test_source_catalog_accepts_missing_optional_fields_without_ai(self):
        url='https://imn.lukasiewicz.gov.pl/technologie/test/'
        facts=catalog_sources.facts({'title':'Technologia testowa','description':'Źródłowy opis opracowanego rozwiązania bez deklaracji wdrożenia.'},url,'IMN')
        with radar.connect() as db:
            rid=radar.save_record(db,'a',self.item())
            self.assertFalse(source_only.complete(facts))
            self.assertFalse(source_only.publishable(db,facts))
            db.execute("INSERT INTO runtime_settings VALUES('source_allow_missing','1')")
            source_only.save(db,rid,facts)
            source_only.publish(db,rid)
            result=source_only.document(db,rid)
            self.assertEqual(result['coverage']['missing_fields'],['entity','implementation','benefits','application'])
            self.assertIsNone(result['assessment']['implementation'])
            self.assertIsNone(result['assessment']['benefits'])
            self.assertIsNone(result['assessment']['trl'])
            self.assertEqual(result['assessment']['bucket'],'candidate')
            self.assertEqual(result['profile_review']['status'],'disabled')
            self.assertFalse(any(o['type']=='ai' for o in result['profile']['field_origins'].values()))
            self.assertEqual(result['sources'][0]['id'],'a')
            self.assertIn('źródłowy opis',result['search_text'])
            db.execute('DELETE FROM record_countries WHERE record_id=?',(rid,))
            with self.assertRaises(ValueError):source_only.document(db,rid)

    def test_interreg_requires_polish_connection_in_article_not_navigation(self):
        template='<html><nav>Polska</nav><h2 class="card-header-wrapper__title">Projekt</h2><div class="widget-text"><p>{}</p></div></html>'
        url='https://interreg.gov.pl/historie-sukcesow-programu-interreg-europa-srodkowa/test/'
        self.assertIsNone(catalog_sources.interreg_detail(template.format('Projekt realizują wyłącznie organizacje z Niemiec i Włoch.'),url))
        data=catalog_sources.interreg_detail(template.format('Polskę reprezentuje Gmina Lublin. Planowane jest opracowanie prototypu urządzenia.'),url)
        self.assertIn('polish_connection',data)
        self.assertNotIn('implementation',data)

    def test_cordis_objective_and_grant_do_not_become_achievements_or_equity(self):
        data=catalog_sources.cordis_facts({'title':'New sensor','objective':'We will develop a prototype sensor.','status':'SIGNED','ecMaxContribution':'100000'},'https://cordis.europa.eu/project/id/123',['Polski instytut'])
        self.assertEqual(data['objective']['value'],'We will develop a prototype sensor.')
        self.assertEqual(data['grant_value']['value'],'100000 EUR')
        self.assertNotIn('implementation',data)
        self.assertNotIn('benefits',data)

    def test_cordis_contact_forms_belong_to_current_project_and_polish_partner(self):
        url='https://cordis.europa.eu/project/id/999'
        with radar.connect() as db:
            db.execute("INSERT INTO sources(id,name,url) VALUES('cordis','CORDIS',?)",(url,))
            rid=radar.save_record(db,'cordis',self.item(id='999',url=url,entities=[
                {'name':'Polski Instytut','role':'participant','contacts':[
                    {'kind':'form','value':'https://ec.europa.eu/contact-form/project/1/999'},
                    {'kind':'form','value':'https://ec.europa.eu/contact-form/project/1/998'}]},
                {'name':'Foreign Partner','role':'participant','contacts':[
                    {'kind':'form','value':'https://ec.europa.eu/contact-form/project/2/999'}]}]))
            data=catalog_sources.cordis_facts({'title':'Projekt','objective':'Opis celów projektu.'},url,['Polski Instytut'])
            source_only.save(db,rid,data)
            db.execute("INSERT INTO runtime_settings VALUES('source_allow_missing','1')")
            result=source_only.document(db,rid)
            self.assertEqual(len(result['contacts']),1)
            self.assertEqual(result['contacts'][0]['name'],'Polski Instytut')
            self.assertTrue(result['contacts'][0]['value'].endswith('/999'))

    def test_review_rejects_hallucinated_quote_and_promised_stage(self):
        facts,payload=self.review_fixture()
        profile_review.validate(payload,facts)
        payload['fields']['development_stage']['basis'][0]['quote']='Nieistniejący w źródle cytat o prototypie.'
        with self.assertRaises(ValueError):profile_review.validate(payload,facts)
        for quote in ['Z wyników projektu korzystają studenci, kadra dydaktyczna i pracodawcy.',
                      'W ramach projektu zostanie opracowany prototyp robota.',
                      'Nie powstał prototyp urządzenia.',
                      'Wytyczne wdrożono w ramach pilotażowej platformy cyfrowej.']:
            stage='deployment' if 'pilotażowej' in quote else 'prototype'
            self.assertFalse(profile_review.supported_stage(stage,quote))

    def test_review_enforces_categories_and_potential_benefits(self):
        facts,payload=self.review_fixture()
        evidence=payload['fields']['development_stage']['basis']
        payload['missing'].pop('categories')
        payload['fields']['categories']={'value':['technology','industry','science','health'],'basis':evidence,'reason':'Cztery kategorie mają zostać odrzucone.'}
        with self.assertRaises(ValueError):profile_review.validate(payload,facts)
        payload['fields']['categories']['value']=['technology','industry']
        payload['missing'].pop('investor_benefits')
        payload['fields']['investor_benefits']={'value':'Gwarantowany zwrot z inwestycji.','basis':evidence,'reason':'Nieuprawniona obietnica ekonomiczna.'}
        with self.assertRaises(ValueError):profile_review.validate(payload,facts)

    def test_review_cache_staleness_and_manual_corrections(self):
        facts,payload=self.review_fixture()
        with radar.connect() as db:
            rid=radar.save_record(db,'a',self.item())
            self.assertTrue(profile_review.save(db,rid,payload,facts))
            stamp=db.execute('SELECT reviewed_at FROM profile_reviews').fetchone()[0]
            self.assertFalse(profile_review.save(db,rid,payload,facts))
            self.assertEqual(db.execute('SELECT reviewed_at FROM profile_reviews').fetchone()[0],stamp)
            profile=profiles.read(db,rid)
            self.assertEqual(profile_review.apply(db,rid,facts,profile)['status'],'reviewed')
            self.assertEqual(profile['development_stage'],'prototype')
            profiles.update(db,rid,{'development_stage':None,'categories':[]},radar.now())
            profile_review.apply(db,rid,facts,profile)
            self.assertIsNone(profile['development_stage'])
            self.assertEqual(profile['field_origins']['development_stage']['type'],'manual')
            changed={'description':{**facts['description'],'value':facts['description']['value']+' Nowe dane.'}}
            fresh=profiles.read(db,rid)
            self.assertEqual(profile_review.apply(db,rid,changed,fresh)['status'],'stale')
            self.assertIsNone(fresh['development_stage'])

    def test_review_publication_filters_and_refresh_preserve_manual_fields(self):
        source,payload=self.review_fixture()
        quote=source['description']['value']
        fact={'value':quote,'excerpt':quote,'source_url':'https://www.gov.pl/web/ncbr/test','source_name':'NCBR','retrieved_at':radar.now(),'claim_type':'publisher_statement'}
        facts={f:dict(fact) for f in source_only.REQUIRED}
        payload['fields']['categories']={'value':['technology','industry'],'basis':[{'field':'description','quote':quote}],'reason':'Robot opisany jako przeznaczony dla stanowisk produkcyjnych.'}
        del payload['missing']['categories']
        with radar.connect() as db:
            rid=radar.save_record(db,'a',self.item())
            source_only.save(db,rid,facts)
            db.execute("INSERT INTO runtime_settings VALUES('profile_interpretation','1')")
            profile_review.save(db,rid,payload,facts)
            source_only.publish(db,rid)
            result=json.loads(db.execute('SELECT payload FROM published_records WHERE record_id=?',(rid,)).fetchone()[0])
            self.assertEqual(result['profile_review']['status'],'reviewed')
            self.assertEqual(result['profile']['categories'],['technology','industry'])
            self.assertEqual(result['profile']['field_origins']['categories']['kind'],'interpretation')
            self.assertEqual(db.execute("SELECT count(*) FROM ready_records,json_each(published_payload,'$.profile.categories') WHERE json_each.value='technology'").fetchone()[0],1)
            profiles.update(db,rid,{'project_type':'service','categories':[]},radar.now())
            source_only.publish(db,rid)
            result=source_only.document(db,rid)
            self.assertEqual(result['profile']['project_type'],'service')
            self.assertEqual(result['profile']['categories'],[])
            facts['description']['value']+=' Zmiana źródła.'
            facts['description']['excerpt']=facts['description']['value']
            source_only.save(db,rid,facts)
            result=source_only.document(db,rid)
            self.assertEqual(result['profile_review']['status'],'stale')
            self.assertEqual(result['profile']['project_type'],'service')
            self.assertEqual(result['profile']['categories'],[])


class ConnectorTests(unittest.TestCase):
    def test_imn_copies_explicit_trl_and_public_contact_without_duplicate_icons(self):
        sections={'Opis':'Technologia wytwarzania paneli wentylacyjnych.', 'Zalety':'Ograniczenie zakłóceń elektromagnetycznych.',
                  'Zastosowanie':'Panele do ochrony infrastruktury.', 'Dane rozwiązania':'Dokonano demonstracji w warunkach operacyjnych (TRL 7)',
                  'Kontakt':catalog_sources.IMN}
        body='<html><h1>Panele EMC</h1>'+''.join('<div><div><h3>'+k+'</h3></div></div><div class="widget-text-editor"><p>'+v+'</p></div>' for k,v in sections.items())
        body+='<a href="tel:322380507%20%20"></a><a href="tel:322380507%20%20">+48 32 23 80 507</a><a href="mailto:komercjalizacja@example.org">Email</a></html>'
        result,contacts=catalog_sources.imn_detail(body,'https://imn.lukasiewicz.gov.pl/technologie/panele/')
        self.assertEqual(result['trl']['value'],'7')
        self.assertEqual(result['implementation']['value'],sections['Dane rozwiązania'])
        self.assertEqual(len(contacts),2)
        self.assertEqual(contacts[0],{'kind':'phone','value':'+48 32 23 80 507'})
        del sections['Dane rozwiązania']
        body='<html><h1>Panele EMC</h1>'+''.join('<div><div><h3>'+k+'</h3></div></div><div class="widget-text-editor"><p>'+v+'</p></div>' for k,v in sections.items())+'</html>'
        result,_=catalog_sources.imn_detail(body,'https://imn.lukasiewicz.gov.pl/technologie/panele/')
        self.assertNotIn('trl',result)

    def test_radon_initial_token_and_continuation(self):
        calls=[]
        class Client:
            def json(self,url,params):
                calls.append(params)
                key='one' if len(calls)==1 else 'two'
                return {'results':[{'investmentUuid':key,'investmentName':key,'investmentDescription':'<p>Opis</p>','investmentOutlays':100,'institutionName':'Uczelnia','institutionUuid':'x'}], 'pagination':{'maxCount':2,'token':'next' if len(calls)==1 else None}}
        batch=radon(Client(),{'endpoint':'investments'},{},0)
        self.assertNotIn('token',calls[0])
        self.assertEqual(calls[1]['token'],'next')
        self.assertEqual(len(batch.records),2)
        self.assertEqual(batch.records[0]['subtype'],'institutional_infrastructure')


if __name__=='__main__':unittest.main()
