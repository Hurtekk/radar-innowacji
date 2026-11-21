CREATE TABLE project_profiles (
 record_id INTEGER PRIMARY KEY REFERENCES records(id) ON DELETE CASCADE,
 development_stage TEXT CHECK(development_stage IN ('idea','research','proof_of_concept','prototype','pilot','ready','scaled')),
 project_type TEXT CHECK(project_type IN ('invention','product','service','process','social','education','research','infrastructure','other')),
 impact_scale TEXT CHECK(impact_scale IN ('institution','local','regional','national','international','global')),
 impact_description TEXT,
 investor_benefits TEXT,
 innovator_benefits TEXT,
 publisher_role TEXT CHECK(publisher_role IN ('innovator','investor','institution','sponsor','public_data')),
 updated_at TEXT NOT NULL
);
CREATE TABLE categories (code TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE project_categories (
 record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
 category_code TEXT NOT NULL REFERENCES categories(code),
 PRIMARY KEY(record_id,category_code)
);
CREATE TRIGGER project_categories_max_three_insert
BEFORE INSERT ON project_categories
WHEN NOT EXISTS (SELECT 1 FROM project_categories WHERE record_id=NEW.record_id AND category_code=NEW.category_code)
 AND (SELECT count(*) FROM project_categories WHERE record_id=NEW.record_id)>=3
BEGIN
 SELECT RAISE(ABORT,'Projekt może mieć maksymalnie 3 kategorie');
END;
CREATE TRIGGER project_categories_max_three_update
BEFORE UPDATE OF record_id ON project_categories
WHEN NEW.record_id != OLD.record_id
 AND (SELECT count(*) FROM project_categories WHERE record_id=NEW.record_id)>=3
BEGIN
 SELECT RAISE(ABORT,'Projekt może mieć maksymalnie 3 kategorie');
END;
CREATE TABLE education_levels (code TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE project_education_levels (
 record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
 level_code TEXT NOT NULL REFERENCES education_levels(code),
 PRIMARY KEY(record_id,level_code)
);
CREATE INDEX category_records ON project_categories(category_code,record_id);
CREATE INDEX education_records ON project_education_levels(level_code,record_id);
CREATE INDEX profile_stage ON project_profiles(development_stage);
CREATE INDEX profile_type ON project_profiles(project_type);
CREATE INDEX profile_impact ON project_profiles(impact_scale);
