"""Testy wyszukiwania hybrydowego. Uruchom: python -m unittest tests_search -v
Używają sztucznego embeddera (RADAR_EMBED_BACKEND=hash), więc nie pobierają modelu."""
import json
import os
import sqlite3
import tempfile
import unittest
from pathlib import Path

os.environ['RADAR_EMBED_BACKEND'] = 'hash'
import search_index as si  # noqa: E402

si.BACKEND = 'hash'

DOCS = [
    (1, 'project', 'Robot chirurgiczny do operacji', 'Ramię robotyki medycznej wspiera chirurga podczas operacji laparoskopowych.', ['Instytut Robotyki']),
    (2, 'project', 'Zarządzanie kryzysowe bez granic', 'Ochrona przeciwpowodziowa rzek i zarządzanie kryzysowe na pograniczu.', []),
    (3, 'patent', 'Sposób otrzymywania biopoliolu', 'Metoda syntezy poliolu z surowców odnawialnych o niskiej emisji.', []),
    (4, 'project', 'Oczyszczanie wody deszczowej', 'Instalacja zatrzymuje wodę opadową i zmniejsza skutki suszy w mieście.', ['Wodociągi Miejskie']),
]


class Connection(sqlite3.Connection):
    def __exit__(self, *args):
        try:
            return super().__exit__(*args)
        finally:
            self.close()


class Counting:
    def __init__(self, inner):
        self.inner, self.calls = inner, 0

    def embed(self, texts, query=False):
        self.calls += len(texts)
        return self.inner.embed(texts, query)


class SearchIndexTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / 'db.sqlite3'
        with self.connect() as db:
            db.execute('CREATE TABLE ready_records(id INTEGER PRIMARY KEY,kind TEXT,title TEXT,description TEXT,search_text TEXT,published_payload TEXT)')
            db.execute('CREATE TABLE published_records(record_id INTEGER PRIMARY KEY,payload TEXT,published_at TEXT)')
            for rid, kind, title, description, entities in DOCS:
                self.put(db, rid, kind, title, description, entities)
        si._state.update(embedder=None, error=None, retry=0.0)
        si._matrix.update(key=None, ids=None, vecs=None)
        self.embedder = Counting(si.HashEmbedder())
        si._state['embedder'] = self.embedder

    def tearDown(self):
        si._state.update(embedder=None)
        self.tmp.cleanup()

    def connect(self):
        db = sqlite3.connect(self.path, factory=Connection)
        db.row_factory = sqlite3.Row
        return db

    def put(self, db, rid, kind, title, description, entities, stamp='1'):
        payload = json.dumps({'entities': [{'id': i, 'name': n} for i, n in enumerate(entities)], 'tags': []}, ensure_ascii=False)
        text = (title + ' ' + description).casefold()
        db.execute('INSERT OR REPLACE INTO ready_records VALUES(?,?,?,?,?,?)', (rid, kind, title, description, text, payload))
        db.execute('INSERT OR REPLACE INTO published_records VALUES(?,?,?)', (rid, payload, stamp))
        db.commit()

    def index(self):
        with self.connect() as db:
            si.sync_fts(db)
        si.embed_pending(self.connect, self.embedder)

    def find(self, query, mode='hybrid'):
        with self.connect() as db:
            return si.search_all(db, query, mode)

    # --- tekst
    def test_fold_removes_polish_diacritics(self):
        self.assertEqual(si.fold('Zażółć GĘŚLĄ jaźń Łódź'), 'zazolc gesla jazn lodz')

    def test_match_query_stems_and_drops_stopwords(self):
        self.assertEqual(si.match_query('robotyki w medycynie'), '"roboty"* OR "medycyn"*')
        self.assertEqual(si.match_query('w'), '"w"*')  # samo słowo stopu nie znika

    def test_match_query_is_safe_for_fts_syntax(self):
        self.assertEqual(si.match_query('"; DROP -- NEAR(*'), '"dro"* OR "nea"*')

    def test_passages_prefix_title_and_limit_chunks(self):
        text = ' '.join('Zdanie numer %d jest dosyć długie i zawiera kilka słów.' % n for n in range(60))
        parts = si.passages('Tytuł', text, '')
        self.assertLessEqual(len(parts), si.MAX_CHUNKS)
        self.assertTrue(all(p.startswith('Tytuł. ') for p in parts))
        self.assertTrue(all(len(p) <= si.CHUNK_CHARS + 20 for p in parts))
        self.assertEqual(si.passages('', ''), [])

    # --- słowa kluczowe
    def test_keyword_matches_without_diacritics_and_inflection(self):
        self.index()
        self.assertEqual(self.find('zarzadzanie kryzysowe', 'keyword')['items'][0]['id'], 2)
        self.assertEqual(self.find('robotyka', 'keyword')['items'][0]['id'], 1)  # robotyki w opisie
        self.assertEqual(self.find('Instytut Robotyki', 'keyword')['items'][0]['id'], 1)  # nazwa podmiotu

    def test_substring_keeps_old_behaviour(self):
        self.index()
        # 'poliol' jest w środku słowa 'biopoliolu': FTS prefiks go nie widzi, podciąg tak
        self.assertIn(3, [h['id'] for h in self.find('poliol', 'keyword')['items']])

    def test_filters_limit_results(self):
        self.index()
        with self.connect() as db:
            result = si.search(db, 'zarządzanie', {1, 3}, [], 'keyword')
        self.assertEqual(result['items'], [])

    # --- semantyka i hybryda
    def test_embeddings_are_stored_and_reused(self):
        self.index()
        first = self.embedder.calls
        self.assertGreater(first, 0)
        self.index()
        self.assertEqual(self.embedder.calls, first)  # nic się nie zmieniło, nic nie liczymy

    def test_changed_record_is_reembedded_only(self):
        self.index()
        before = self.embedder.calls
        with self.connect() as db:
            self.put(db, 3, 'patent', 'Sposób otrzymywania biopoliolu', 'Zupełnie nowy opis o fotowoltaice.', [], stamp='2')
        self.index()
        self.assertGreater(self.embedder.calls, before)
        self.assertLess(self.embedder.calls - before, 3)
        self.assertEqual(self.find('fotowoltaika', 'keyword')['items'][0]['id'], 3)

    def test_removed_record_leaves_index(self):
        self.index()
        with self.connect() as db:
            db.execute('DELETE FROM ready_records WHERE id=2')
            db.execute('DELETE FROM published_records WHERE record_id=2')
            db.commit()
        self.index()
        with self.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM search_chunks WHERE record_id=2').fetchone()[0], 0)
            self.assertEqual(db.execute('SELECT count(*) FROM search_docs WHERE record_id=2').fetchone()[0], 0)
        self.assertNotIn(2, [h['id'] for h in self.find('kryzysowe')['items']])

    def test_model_change_triggers_reembedding(self):
        self.index()
        with self.connect() as db:
            self.assertEqual(si.pending_ids(db), [])
        old = si.BACKEND
        try:
            si.BACKEND = 'other'
            si.MODEL = 'inny/model'
            with self.connect() as db:
                self.assertEqual(len(si.pending_ids(db)), len(DOCS))
        finally:
            si.BACKEND = old
            si.MODEL = os.environ.get('RADAR_EMBED_MODEL', 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')

    def test_semantic_ranks_by_similarity_and_reports_it(self):
        self.index()
        hits = self.find('chirurg operacje robotyka medyczna', 'semantic')['items']
        self.assertEqual(hits[0]['id'], 1)
        self.assertIsNotNone(hits[0]['similarity'])
        self.assertIsNone(hits[0]['keyword'])

    def test_hybrid_puts_documents_found_by_both_first(self):
        self.index()
        result = self.find('robot chirurgiczny operacje')
        top = result['items'][0]
        self.assertEqual(top['id'], 1)
        self.assertIsNotNone(top['keyword'])
        self.assertTrue(result['info']['semantic'])

    def test_hybrid_without_model_falls_back_to_keywords(self):
        self.index()
        si._state['embedder'] = None
        si._state['error'] = 'ConnectionError: brak sieci'
        result = self.find('woda susza')
        self.assertIn('niedostępne', result['info']['note'])
        self.assertFalse(result['info']['semantic'])
        self.assertTrue(result['items'])
        self.assertTrue(all(h['similarity'] is None for h in result['items']))

    def test_status(self):
        with self.connect() as db:
            si.sync_fts(db)
            self.assertEqual(si.status(db)['state'], 'indexing')
        si.embed_pending(self.connect, self.embedder)
        with self.connect() as db:
            status = si.status(db)
        self.assertEqual((status['state'], status['embedded'], status['records']), ('ready', 4, 4))


if __name__ == '__main__':
    unittest.main()
