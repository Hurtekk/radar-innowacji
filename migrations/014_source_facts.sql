CREATE TABLE source_facts (
 record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
 field TEXT NOT NULL,
 value TEXT NOT NULL,
 source_url TEXT NOT NULL,
 source_name TEXT NOT NULL,
 excerpt TEXT NOT NULL,
 retrieved_at TEXT NOT NULL,
 claim_type TEXT NOT NULL DEFAULT 'publisher_statement',
 PRIMARY KEY(record_id,field)
);
