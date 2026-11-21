CREATE TABLE published_records (
 record_id INTEGER PRIMARY KEY REFERENCES records(id) ON DELETE CASCADE,
 payload TEXT NOT NULL CHECK(json_valid(payload)),
 published_at TEXT NOT NULL
);
DROP VIEW ready_records;
CREATE VIEW ready_records AS
 SELECT r.id,
 json_extract(p.payload,'$.kind') AS kind,
 json_extract(p.payload,'$.title') AS title,
 json_extract(p.payload,'$.description') AS description,
 json_extract(p.payload,'$.url') AS url,
 json_extract(p.payload,'$.first_seen') AS first_seen,
 json_extract(p.payload,'$.updated_at') AS updated_at,
 json_extract(p.payload,'$.search_text') AS search_text,
 json_extract(p.payload,'$.subtype') AS subtype,
 json_extract(p.payload,'$.canonical_key') AS canonical_key,
 p.payload AS published_payload
 FROM published_records p JOIN polish_records r ON r.id=p.record_id;
