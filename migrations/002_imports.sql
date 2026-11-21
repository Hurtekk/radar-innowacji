ALTER TABLE sources ADD COLUMN state TEXT NOT NULL DEFAULT '{}';
ALTER TABLE sources ADD COLUMN status TEXT NOT NULL DEFAULT 'configured';
ALTER TABLE sources ADD COLUMN total_available INTEGER;
ALTER TABLE records ADD COLUMN subtype TEXT;
ALTER TABLE records ADD COLUMN canonical_key TEXT;
CREATE UNIQUE INDEX records_canonical_key ON records(canonical_key) WHERE canonical_key IS NOT NULL;
CREATE TABLE entity_identifiers (
 entity_id INTEGER NOT NULL REFERENCES entities(id), scheme TEXT NOT NULL, value TEXT NOT NULL,
 PRIMARY KEY(scheme,value)
);
CREATE TABLE source_entities (
 source_id TEXT NOT NULL REFERENCES sources(id), external_id TEXT NOT NULL,
 entity_id INTEGER NOT NULL REFERENCES entities(id), raw_data TEXT NOT NULL, fetched_at TEXT NOT NULL,
 PRIMARY KEY(source_id, external_id)
);
CREATE TABLE entity_tags (
 entity_id INTEGER NOT NULL REFERENCES entities(id), tag_id INTEGER NOT NULL REFERENCES tags(id),
 PRIMARY KEY(entity_id,tag_id)
);
CREATE TABLE source_record_entities (
 source_id TEXT NOT NULL, external_id TEXT NOT NULL, entity_id INTEGER NOT NULL REFERENCES entities(id),
 role TEXT NOT NULL, PRIMARY KEY(source_id,external_id,entity_id,role),
 FOREIGN KEY(source_id,external_id) REFERENCES source_records(source_id,external_id)
);
CREATE TABLE source_record_tags (
 source_id TEXT NOT NULL, external_id TEXT NOT NULL, tag_id INTEGER NOT NULL REFERENCES tags(id),
 PRIMARY KEY(source_id,external_id,tag_id),
 FOREIGN KEY(source_id,external_id) REFERENCES source_records(source_id,external_id)
);
CREATE INDEX contact_entity ON contacts(entity_id);
