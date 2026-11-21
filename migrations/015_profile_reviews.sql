CREATE TABLE profile_reviews (
 record_id INTEGER PRIMARY KEY REFERENCES records(id) ON DELETE CASCADE,
 input_hash TEXT NOT NULL,
 prompt_version TEXT NOT NULL,
 analyst TEXT NOT NULL,
 payload TEXT NOT NULL,
 reviewed_at TEXT NOT NULL
);
