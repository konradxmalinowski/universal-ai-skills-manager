-- Migracja 1: rejestr migracji i nic wiecej.
--
-- Indeks nie ma jeszcze modelu tresci - kanoniczny model elementu powstaje
-- w Etapie 2 (ADR 0023), a wraz z nim pierwsza tabela pelnotekstowa, na ktorej
-- opiera sie ADR 0007. Do tego czasu schemat w wersji 1 to sam rejestr: stan
-- "baza istnieje, migracje sa zapisane, tresci jeszcze nie ma".
--
-- Zadna tabela nie jest tu dodana po to, zeby test mial co sprawdzic. Jesli
-- w tym pliku kiedys pojawi sie tabela bez uzytkownika w kodzie produkcyjnym,
-- to jest blad, nie wygoda.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version    INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
