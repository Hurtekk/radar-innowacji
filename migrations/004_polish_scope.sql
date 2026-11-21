CREATE TABLE record_countries (
 record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
 country_code TEXT NOT NULL,
 source_id TEXT NOT NULL REFERENCES sources(id),
 PRIMARY KEY(record_id,country_code,source_id)
);
CREATE TABLE entity_countries (
 entity_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
 country_code TEXT NOT NULL,
 PRIMARY KEY(entity_id,country_code)
);
CREATE VIEW polish_records AS
 SELECT r.* FROM records r WHERE EXISTS (
  SELECT 1 FROM record_countries c WHERE c.record_id=r.id AND c.country_code='PL'
 );
CREATE VIEW polish_entities AS
 SELECT e.* FROM entities e WHERE EXISTS (
  SELECT 1 FROM entity_countries c WHERE c.entity_id=e.id AND c.country_code='PL'
 );
