-- Migracja 1: minimalny szkielet indeksu.
-- Etap 1 nie definiuje modelu kanonicznego (to Etap 2, ADR 0023). Tu jest
-- tylko tyle schematu, ile potrzeba, zeby potwierdzic, ze modul natywny dziala
-- i ze FTS5 jest skompilowane w dostarczonym binarium (ryzyko R2, ADR 0007).

CREATE TABLE IF NOT EXISTS schema_migrations (
  version     INTEGER PRIMARY KEY,
  applied_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS startup_probe (
  id          INTEGER PRIMARY KEY,
  checked_at  TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS startup_probe_fts USING fts5(body);
