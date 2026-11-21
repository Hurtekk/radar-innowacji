CREATE TABLE processing_jobs (
 record_id INTEGER PRIMARY KEY REFERENCES records(id) ON DELETE CASCADE,
 input_hash TEXT NOT NULL,
 model TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('pending','processing','completed','failed')),
 attempts INTEGER NOT NULL DEFAULT 0,
 retry_after TEXT,
 lease_until TEXT,
 claim_token TEXT,
 error TEXT,
 updated_at TEXT NOT NULL
);
CREATE INDEX processing_due ON processing_jobs(status,retry_after,lease_until);
CREATE TABLE profile_origins (
 record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
 field TEXT NOT NULL,
 origin TEXT NOT NULL CHECK(origin IN ('source','manual','ai')),
 updated_at TEXT NOT NULL,
 PRIMARY KEY(record_id,field)
);
CREATE VIEW ready_records AS
 SELECT r.* FROM polish_records r JOIN processing_jobs j ON j.record_id=r.id
 WHERE j.status='completed';
CREATE TABLE ai_cache (
 input_hash TEXT NOT NULL,
 model TEXT NOT NULL,
 payload TEXT NOT NULL,
 created_at TEXT NOT NULL,
 PRIMARY KEY(input_hash,model)
);
INSERT OR IGNORE INTO ai_cache SELECT input_hash,model,payload,created_at FROM ai_analyses;
CREATE TABLE project_profiles_new (
 record_id INTEGER PRIMARY KEY REFERENCES records(id) ON DELETE CASCADE,
 development_stage TEXT CHECK(development_stage IN ('idea','research','proof_of_concept','prototype','pilot','ready','deployment','scaled')),
 project_type TEXT CHECK(project_type IN ('invention','product','service','process','social','education','research','infrastructure','other')),
 impact_scale TEXT CHECK(impact_scale IN ('institution','local','regional','national','international','global')),
 impact_description TEXT, investor_benefits TEXT, innovator_benefits TEXT,
 publisher_role TEXT CHECK(publisher_role IN ('innovator','investor','institution','sponsor','public_data')),
 updated_at TEXT NOT NULL
);
INSERT INTO project_profiles_new SELECT * FROM project_profiles;
DROP TABLE project_profiles;
ALTER TABLE project_profiles_new RENAME TO project_profiles;
CREATE INDEX profile_stage ON project_profiles(development_stage);
CREATE INDEX profile_type ON project_profiles(project_type);
CREATE INDEX profile_impact ON project_profiles(impact_scale);
