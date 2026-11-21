PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS sources (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL,
 connector TEXT, config TEXT NOT NULL DEFAULT '{}',
 interval_hours INTEGER NOT NULL DEFAULT 24 CHECK(interval_hours > 0),
 last_attempt TEXT, last_success TEXT, next_refresh TEXT, error TEXT
);
CREATE TABLE IF NOT EXISTS entities (
 id INTEGER PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'organization',
 external_id TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS records (
 id INTEGER PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('innovation','investment','publication','project','patent')),
 title TEXT NOT NULL CHECK(length(trim(title)) > 0), description TEXT,
 url TEXT NOT NULL CHECK(url LIKE 'https://%' OR url LIKE 'http://%'),
 first_seen TEXT NOT NULL, updated_at TEXT NOT NULL,
 search_text TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS source_records (
 source_id TEXT NOT NULL REFERENCES sources(id), external_id TEXT NOT NULL,
 record_id INTEGER NOT NULL REFERENCES records(id), fetched_at TEXT NOT NULL,
 raw_data TEXT NOT NULL, PRIMARY KEY(source_id, external_id)
);
CREATE TABLE IF NOT EXISTS record_entities (
 record_id INTEGER NOT NULL REFERENCES records(id), entity_id INTEGER NOT NULL REFERENCES entities(id),
 role TEXT NOT NULL, PRIMARY KEY(record_id,entity_id,role)
);
CREATE TABLE IF NOT EXISTS contacts (
 id INTEGER PRIMARY KEY, entity_id INTEGER NOT NULL REFERENCES entities(id),
 kind TEXT NOT NULL, value TEXT NOT NULL, source_url TEXT NOT NULL,
 verified_at TEXT NOT NULL, UNIQUE(entity_id,kind,value)
);
CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS record_tags (
 record_id INTEGER NOT NULL REFERENCES records(id), tag_id INTEGER NOT NULL REFERENCES tags(id),
 PRIMARY KEY(record_id,tag_id)
);
CREATE TABLE IF NOT EXISTS investments (
 record_id INTEGER PRIMARY KEY REFERENCES records(id),
 investor_id INTEGER REFERENCES entities(id), recipient_id INTEGER REFERENCES entities(id),
 innovation_id INTEGER REFERENCES records(id), amount TEXT, currency TEXT, invested_on TEXT
);
CREATE TABLE IF NOT EXISTS refresh_runs (
 id INTEGER PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(id),
 started_at TEXT NOT NULL, finished_at TEXT, status TEXT NOT NULL,
 count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE INDEX IF NOT EXISTS source_record_target ON source_records(record_id);
CREATE INDEX IF NOT EXISTS entity_records ON record_entities(entity_id);
