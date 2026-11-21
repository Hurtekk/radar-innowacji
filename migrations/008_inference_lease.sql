CREATE TABLE inference_lease (
 id INTEGER PRIMARY KEY CHECK(id=1),
 claim_token TEXT,
 lease_until TEXT
);
INSERT INTO inference_lease(id) VALUES(1);
