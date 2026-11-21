CREATE TABLE ai_profile_fields (
 record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
 field TEXT NOT NULL,
 value_json TEXT NOT NULL,
 input_hash TEXT NOT NULL,
 model TEXT NOT NULL,
 source_url TEXT NOT NULL,
 evidence_quote TEXT NOT NULL,
 created_at TEXT NOT NULL,
 PRIMARY KEY(record_id,field)
);
CREATE TABLE ai_failures (
 record_id INTEGER PRIMARY KEY REFERENCES records(id) ON DELETE CASCADE,
 input_hash TEXT NOT NULL,
 model TEXT NOT NULL,
 error TEXT NOT NULL,
 retry_after TEXT NOT NULL
);
