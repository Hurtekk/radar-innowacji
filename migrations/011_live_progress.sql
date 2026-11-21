ALTER TABLE inference_slots ADD COLUMN owner_pid INTEGER;
CREATE TABLE job_progress (
 record_id INTEGER PRIMARY KEY REFERENCES records(id) ON DELETE CASCADE,
 claim_token TEXT NOT NULL,
 phase TEXT NOT NULL,
 started_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 output_chars INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE worker_heartbeats (
 pid INTEGER PRIMARY KEY,
 last_seen TEXT NOT NULL
);
