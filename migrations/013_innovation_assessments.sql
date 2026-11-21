CREATE TABLE innovation_assessments (
 record_id INTEGER PRIMARY KEY REFERENCES records(id) ON DELETE CASCADE,
 bucket TEXT NOT NULL CHECK(bucket IN ('verified','candidate','context')),
 areas TEXT NOT NULL CHECK(json_valid(areas)),
 audience TEXT NOT NULL CHECK(json_valid(audience)),
 trl INTEGER CHECK(trl BETWEEN 1 AND 9),
 payload TEXT NOT NULL CHECK(json_valid(payload)),
 input_hash TEXT NOT NULL,
 reviewed_at TEXT NOT NULL
);
CREATE INDEX assessment_bucket ON innovation_assessments(bucket);
