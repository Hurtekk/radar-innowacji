CREATE TABLE ai_analyses (
 record_id INTEGER PRIMARY KEY REFERENCES records(id) ON DELETE CASCADE,
 model TEXT NOT NULL,
 input_hash TEXT NOT NULL,
 payload TEXT NOT NULL,
 created_at TEXT NOT NULL
);
