CREATE TABLE inference_slots (
 id INTEGER PRIMARY KEY CHECK(id IN (1,2)),
 claim_token TEXT,
 lease_until TEXT
);
INSERT INTO inference_slots SELECT * FROM inference_lease;
INSERT OR IGNORE INTO inference_slots(id) VALUES(2);
CREATE TABLE ai_model_backoff (
 model TEXT PRIMARY KEY,
 retry_after TEXT NOT NULL,
 error TEXT NOT NULL
);
CREATE TABLE ai_metrics (
 id INTEGER PRIMARY KEY,
 record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
 model TEXT NOT NULL,
 input_hash TEXT NOT NULL,
 cached INTEGER NOT NULL,
 wall_seconds REAL NOT NULL,
 prompt_tokens INTEGER,
 output_tokens INTEGER,
 load_seconds REAL,
 prompt_seconds REAL,
 generation_seconds REAL,
 input_chars INTEGER NOT NULL,
 output_chars INTEGER NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX ai_metrics_recent ON ai_metrics(created_at);
