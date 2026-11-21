"""Hybrydowe wyszukiwanie rekordów: słowa kluczowe (SQLite FTS5, BM25) + wektory, fuzja RRF.

Indeks leży w tej samej bazie co rekordy (radar.sqlite3), więc po sklonowaniu repo
embeddingi już tam są. Rekordy nowe albo zmienione uzupełnia wątek w tle serwera
albo `python radar.py index`. Bez modelu (brak pakietu, brak sieci przy pierwszym
pobraniu) wszystko działa dalej na samych słowach kluczowych.

Model: wielojęzyczny (PL/EN/SK), 384 wymiary, ONNX bez torcha. Zmienne środowiskowe:
  RADAR_EMBED_MODEL       model fastembed (domyślnie paraphrase-multilingual-MiniLM-L12-v2)
  RADAR_SEARCH_MIN_SIM    minimalne podobieństwo cosinusowe wyniku semantycznego (0.30)
  RADAR_SEARCH_SIM_WINDOW wynik semantyczny musi być w tym oknie od najlepszego (0.20)
  RADAR_EMBED_BACKEND     'hash' = sztuczny embedder do testów offline
"""
import hashlib
import json
import os
import re
import sqlite3
import threading
import time
import unicodedata
from pathlib import Path

try:
    import numpy as np
except ImportError:  # bez numpy zostaje samo wyszukiwanie po słowach
    np = None

ROOT = Path(__file__).resolve().parent
MODEL = os.environ.get('RADAR_EMBED_MODEL', 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
BACKEND = os.environ.get('RADAR_EMBED_BACKEND', 'fastembed')
MIN_SIM = float(os.environ.get('RADAR_SEARCH_MIN_SIM', '0.30'))
SIM_WINDOW = float(os.environ.get('RADAR_SEARCH_SIM_WINDOW', '0.20'))
RRF_K = 60
KEYWORD_LIMIT = 300
SEMANTIC_LIMIT = 100
CHUNK_CHARS = 340
MAX_CHUNKS = 4
BATCH_RECORDS = 16

SCHEMA = (
    'CREATE TABLE IF NOT EXISTS search_docs(record_id INTEGER PRIMARY KEY, stamp TEXT NOT NULL, doc_hash TEXT NOT NULL, passage_hash TEXT NOT NULL, vec_hash TEXT)',
    "CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(title, body, tokenize='unicode61 remove_diacritics 0')",
    'CREATE TABLE IF NOT EXISTS search_chunks(record_id INTEGER NOT NULL, chunk INTEGER NOT NULL, model TEXT NOT NULL, vec BLOB NOT NULL, PRIMARY KEY(record_id, chunk))',
)
STOPWORDS = {'i', 'w', 'z', 'o', 'a', 'u', 'na', 'do', 'od', 'po', 'za', 'dla', 'oraz', 'lub', 'ze', 'we', 'the', 'of', 'and', 'for', 'to', 'in'}


# ---------------------------------------------------------------- tekst

_LETTERS = str.maketrans({'ł': 'l', 'ø': 'o', 'đ': 'd'})


def fold(text):
    """Małe litery bez ogonków (ą→a, ł→l), żeby 'zarzadzanie' znajdowało 'Zarządzanie'."""
    text = unicodedata.normalize('NFKD', (text or '').casefold().translate(_LETTERS))
    return ''.join(c for c in text if not unicodedata.combining(c))


def tokens(text):
    return re.findall(r'[^\W_]+', fold(text))


def stem(token):
    """Obcięcie końcówki fleksyjnej: robotyki/robotyka/robotyką → robotyk*."""
    n = len(token)
    return token[:-2] if n >= 7 else token[:-1] if n >= 4 else token


def match_query(query):
    found = tokens(query)
    terms = [t for t in found if t not in STOPWORDS and len(t) > 1] or found
    return ' OR '.join('"%s"*' % stem(t) for t in dict.fromkeys(terms))


def passages(title, description, extra=''):
    """Krótkie fragmenty (model widzi ~128 tokenów), każdy z tytułem dla kontekstu."""
    title = ' '.join((title or '').split())
    text = ' '.join((description or '').split())
    pieces = []
    for sentence in re.split(r'(?<=[.!?])\s+', text):
        sentence = sentence.strip()
        while len(sentence) > CHUNK_CHARS:
            cut = sentence.rfind(' ', 0, CHUNK_CHARS)
            cut = cut if cut > CHUNK_CHARS // 2 else CHUNK_CHARS
            pieces.append(sentence[:cut].strip())
            sentence = sentence[cut:].strip()
        if sentence:
            pieces.append(sentence)
    chunks, current = [], ''
    for piece in pieces:
        if current and len(current) + 1 + len(piece) > CHUNK_CHARS:
            chunks.append(current)
            current = piece
        else:
            current = (current + ' ' + piece).strip()
    if current:
        chunks.append(current)
    result = [(title + '. ' + chunk).strip() if title else chunk for chunk in chunks[:MAX_CHUNKS]]
    extra = ' '.join((extra or '').split())
    if extra:
        result.append(((title + '. ' if title else '') + extra)[:CHUNK_CHARS + len(title) + 2])
    return result or ([title] if title else [])


def digest(*parts):
    return hashlib.sha1(json.dumps(parts, ensure_ascii=False).encode('utf-8')).hexdigest()


def model_id():
    return 'hash-256' if BACKEND == 'hash' else MODEL


# ---------------------------------------------------------------- embedder

class HashEmbedder:
    """Deterministyczny embedder na hashowaniu słów i trigramów. Tylko do testów offline."""
    dimension = 256

    def embed(self, texts, query=False):
        out = np.zeros((len(texts), self.dimension), dtype=np.float32)
        for row, text in enumerate(texts):
            folded = fold(text)
            features = tokens(text) + [folded[i:i + 3] for i in range(max(0, len(folded) - 2))]
            for feature in features:
                h = int(hashlib.md5(feature.encode('utf-8')).hexdigest()[:8], 16)
                out[row, h % self.dimension] += 1.0 if (h >> 31) & 1 else -1.0
        return normalize(out)


class FastEmbedder:
    def __init__(self):
        from fastembed import TextEmbedding
        cache = ROOT / 'data' / 'models'
        cache.mkdir(parents=True, exist_ok=True)
        self.model = TextEmbedding(model_name=MODEL, cache_dir=str(cache))
        e5 = 'e5' in MODEL.lower()
        self.query_prefix, self.passage_prefix = ('query: ', 'passage: ') if e5 else ('', '')
        self.lock = threading.Lock()

    def embed(self, texts, query=False):
        prefix = self.query_prefix if query else self.passage_prefix
        parts = []
        for start in range(0, len(texts), 32):
            batch = [prefix + t for t in texts[start:start + 32]]
            with self.lock:  # krótka blokada, żeby zapytanie nie czekało na cały indeks
                parts.append(np.asarray(list(self.model.embed(batch, batch_size=len(batch))), dtype=np.float32))
        return normalize(np.vstack(parts)) if parts else np.zeros((0, 0), dtype=np.float32)


def normalize(matrix):
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return (matrix / norms).astype(np.float32)


_state = {'embedder': None, 'error': None, 'retry': 0.0, 'loading': False}
_load_lock = threading.Lock()


def loaded_embedder():
    """Zwraca embedder tylko jeśli już jest załadowany. Nie blokuje zapytania na pobieraniu modelu."""
    return _state['embedder']


def load_embedder(force=False):
    """Ładuje model (przy pierwszym uruchomieniu pobiera go z sieci do data/models)."""
    if np is None:
        _state['error'] = 'brak pakietu numpy'
        return None
    with _load_lock:
        if _state['embedder']:
            return _state['embedder']
        if not force and time.monotonic() < _state['retry']:
            return None
        _state['loading'] = True
        try:
            _state['embedder'] = HashEmbedder() if BACKEND == 'hash' else FastEmbedder()
            _state['error'] = None
        except Exception as error:  # brak fastembed, brak sieci, uszkodzony cache
            _state['error'] = '%s: %s' % (type(error).__name__, str(error)[:160])
            _state['retry'] = time.monotonic() + 300
            print('Model semantyczny niedostępny (%s). Wyszukiwanie działa po słowach kluczowych.' % _state['error'], flush=True)
        finally:
            _state['loading'] = False
        return _state['embedder']


# ---------------------------------------------------------------- indeks

def ensure(db):
    names = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE name IN ('search_fts','search_docs','search_chunks')")}
    if len(names) == 3:
        return True
    try:
        for statement in SCHEMA:
            db.execute(statement)
        db.commit()
        return True
    except sqlite3.OperationalError as error:
        print('Indeks wyszukiwania niedostępny (%s). Zostaje wyszukiwanie po podciągu.' % error, flush=True)
        return False


def build_document(row):
    payload = json.loads(row['payload'])
    extra = ' '.join([*(e.get('name', '') for e in payload.get('entities') or []), *(payload.get('tags') or [])])
    title, description = row['title'] or '', row['description'] or ''
    body = ' '.join(x for x in (row['search_text'], extra) if x)
    return title, description, extra, body


def _documents(db, ids=None):
    sql = 'SELECT r.id,r.title,r.description,r.search_text,p.payload FROM ready_records r JOIN published_records p ON p.record_id=r.id'
    if ids is not None:
        sql += ' WHERE r.id IN (%s)' % ','.join('?' * len(ids))
        return db.execute(sql, list(ids)).fetchall()
    return db.execute(sql).fetchall()


def sync_fts(db):
    """Tania synchronizacja indeksu słów kluczowych. Embeddingi uzupełnia embed_pending."""
    if not ensure(db):
        return 0
    stored = {r['record_id']: r for r in db.execute('SELECT * FROM search_docs')}
    live = {r['id']: r['stamp'] for r in db.execute('SELECT r.id,p.published_at AS stamp FROM ready_records r JOIN published_records p ON p.record_id=r.id')}
    gone = [i for i in stored if i not in live]
    for rid in gone:
        db.execute('DELETE FROM search_fts WHERE rowid=?', (rid,))
        db.execute('DELETE FROM search_docs WHERE record_id=?', (rid,))
        db.execute('DELETE FROM search_chunks WHERE record_id=?', (rid,))
    changed = [i for i, stamp in live.items() if i not in stored or stored[i]['stamp'] != stamp]
    for start in range(0, len(changed), 200):
        for row in _documents(db, changed[start:start + 200]):
            title, description, extra, body = build_document(row)
            doc_hash = digest(title, body)
            passage_hash = digest(passages(title, description, extra))
            old = stored.get(row['id'])
            if not old or old['doc_hash'] != doc_hash:
                db.execute('DELETE FROM search_fts WHERE rowid=?', (row['id'],))
                db.execute('INSERT INTO search_fts(rowid,title,body) VALUES(?,?,?)', (row['id'], fold(title), fold(body)))
            db.execute('INSERT INTO search_docs(record_id,stamp,doc_hash,passage_hash) VALUES(?,?,?,?) '
                       'ON CONFLICT(record_id) DO UPDATE SET stamp=excluded.stamp,doc_hash=excluded.doc_hash,passage_hash=excluded.passage_hash',
                       (row['id'], live[row['id']], doc_hash, passage_hash))
    db.commit()
    return len(changed) + len(gone)


def pending_ids(db):
    return [r[0] for r in db.execute('SELECT record_id FROM search_docs WHERE vec_hash IS NULL OR vec_hash != ? || \':\' || passage_hash', (model_id(),))]


def embed_pending(connect, embedder, progress=None):
    """Liczy embeddingi tylko dla rekordów, których tekst albo model się zmienił."""
    with connect() as db:
        if not ensure(db):
            return 0
        todo = pending_ids(db)
    done = 0
    for start in range(0, len(todo), BATCH_RECORDS):
        ids = todo[start:start + BATCH_RECORDS]
        with connect() as db:
            texts, owners = [], []
            for row in _documents(db, ids):
                title, description, extra, _ = build_document(row)
                for number, text in enumerate(passages(title, description, extra)):
                    texts.append(text)
                    owners.append((row['id'], number))
        vectors = embedder.embed(texts) if texts else []
        with connect() as db:
            for rid in ids:
                db.execute('DELETE FROM search_chunks WHERE record_id=?', (rid,))
            for (rid, number), vector in zip(owners, vectors):
                db.execute('INSERT INTO search_chunks VALUES(?,?,?,?)', (rid, number, model_id(), np.asarray(vector, dtype=np.float16).tobytes()))
            db.execute('UPDATE search_docs SET vec_hash=? || \':\' || passage_hash WHERE record_id IN (%s)' % ','.join('?' * len(ids)), [model_id(), *ids])
            db.commit()
        done += len(ids)
        if progress:
            progress(done, len(todo))
    return done


_matrix = {'key': None, 'ids': None, 'vecs': None}


def load_matrix(db):
    key = (db.execute('PRAGMA database_list').fetchone()[2], *db.execute('SELECT count(*),coalesce(max(rowid),0) FROM search_chunks WHERE model=?', (model_id(),)).fetchone())
    if _matrix['key'] == key:
        return _matrix['ids'], _matrix['vecs']
    rows = db.execute('SELECT record_id,vec FROM search_chunks WHERE model=?', (model_id(),)).fetchall()
    if rows:
        ids = np.fromiter((r[0] for r in rows), dtype=np.int64, count=len(rows))
        vecs = np.vstack([np.frombuffer(r[1], dtype=np.float16) for r in rows]).astype(np.float32)
    else:
        ids = vecs = None
    _matrix.update(key=key, ids=ids, vecs=vecs)
    return ids, vecs


def start_indexer(connect, interval=30):
    """Wątek w tle serwera: ładuje model, synchronizuje indeks, dolicza brakujące embeddingi."""
    stop = threading.Event()

    def run():
        while not stop.is_set():
            try:
                with connect() as db:
                    sync_fts(db)
                embedder = loaded_embedder() or load_embedder()
                if embedder:
                    count = embed_pending(connect, embedder)
                    if count:
                        print('Indeks semantyczny: policzono %d rekordów.' % count, flush=True)
            except Exception as error:
                print('Indeks wyszukiwania:', error, flush=True)
            stop.wait(interval)

    thread = threading.Thread(target=run, daemon=True, name='search-indexer')
    thread.start()
    return stop, thread


# ---------------------------------------------------------------- zapytanie

def keyword_ranking(db, query, allowed):
    if not ensure(db):
        return []
    expression = match_query(query)
    if not expression:
        return []
    try:
        rows = db.execute('SELECT rowid FROM search_fts WHERE search_fts MATCH ? ORDER BY bm25(search_fts, 4.0, 1.0) LIMIT 5000', (expression,)).fetchall()
    except sqlite3.OperationalError:
        return []
    return [r[0] for r in rows if r[0] in allowed]


def semantic_ranking(db, query, allowed):
    embedder = loaded_embedder()
    if np is None or not embedder:
        return [], None
    ids, vecs = load_matrix(db)
    if ids is None:
        return [], None
    scores = vecs @ embedder.embed([query], query=True)[0]
    best = {}
    for rid, score in zip(ids.tolist(), scores.tolist()):
        if rid in allowed and score > best.get(rid, -1.0):
            best[rid] = score
    ranked = sorted(best.items(), key=lambda item: (-item[1], -item[0]))
    if not ranked:
        return [], {}
    cut = max(MIN_SIM, ranked[0][1] - SIM_WINDOW)
    kept = [(rid, score) for rid, score in ranked[:SEMANTIC_LIMIT] if score >= cut]
    return [r for r, _ in kept], dict(kept)


def search(db, query, allowed, substring_ids=(), mode='hybrid'):
    """allowed: id rekordów po filtrach. substring_ids: dopasowania po podciągu (stare zachowanie)."""
    mode = mode if mode in ('hybrid', 'keyword', 'semantic') else 'hybrid'
    allowed = set(allowed)
    keyword, semantic, similarity = [], [], {}
    if mode in ('hybrid', 'keyword'):
        keyword = keyword_ranking(db, query, allowed)[:KEYWORD_LIMIT]
        seen = set(keyword)
        keyword += [i for i in sorted(substring_ids, reverse=True) if i in allowed and i not in seen]
    note = ''
    if mode in ('hybrid', 'semantic'):
        semantic, found = semantic_ranking(db, query, allowed)
        similarity = found or {}
        if found is None:
            note = _unavailable_note(db)
            if mode == 'semantic':
                keyword = keyword_ranking(db, query, allowed)[:KEYWORD_LIMIT]
                keyword += [i for i in sorted(substring_ids, reverse=True) if i in allowed and i not in set(keyword)]
    keyword_rank = {rid: n for n, rid in enumerate(keyword)}
    semantic_rank = {rid: n for n, rid in enumerate(semantic)}
    scored = []
    for rid in dict.fromkeys([*keyword, *semantic]):
        score = 0.0
        if rid in keyword_rank:
            score += 1.0 / (RRF_K + keyword_rank[rid] + 1)
        if rid in semantic_rank:
            score += 1.0 / (RRF_K + semantic_rank[rid] + 1)
        scored.append({'id': rid, 'score': round(score, 5), 'keyword': keyword_rank.get(rid), 'similarity': round(similarity[rid], 3) if rid in similarity and rid in semantic_rank else None})
    scored.sort(key=lambda hit: (-hit['score'], -hit['id']))
    return {'items': scored, 'info': {'mode': mode, 'semantic': mode != 'keyword' and not note, 'note': note}}


def _unavailable_note(db):
    if np is None or _state['error']:
        return 'Wyszukiwanie semantyczne niedostępne (%s). Wyniki tylko po słowach kluczowych.' % (_state['error'] or 'brak numpy')
    if not loaded_embedder():
        return 'Ładuję model semantyczny… Na razie wyniki tylko po słowach kluczowych.'
    return 'Indeks semantyczny jest jeszcze budowany. Na razie wyniki tylko po słowach kluczowych.'


def status(db):
    ensure(db)
    total = db.execute('SELECT count(*) FROM ready_records').fetchone()[0]
    ready = db.execute('SELECT count(*) FROM search_docs WHERE vec_hash = ? || \':\' || passage_hash', (model_id(),)).fetchone()[0]
    embedder = loaded_embedder()
    state = 'unavailable' if _state['error'] and not embedder else 'loading' if not embedder else 'ready' if ready >= total else 'indexing'
    return {'state': state, 'model': model_id(), 'records': total, 'embedded': ready, 'error': _state['error']}


def search_all(db, query, mode='hybrid'):
    """Wyszukiwanie po wszystkich opublikowanych rekordach (CLI i testy)."""
    allowed = {r[0] for r in db.execute('SELECT id FROM ready_records')}
    substring = [r[0] for r in db.execute('SELECT id FROM ready_records WHERE instr(search_text,?)>0', (query.strip().casefold(),))]
    return search(db, query.strip(), allowed, substring, mode)
