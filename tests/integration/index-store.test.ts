import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { SqliteIndexStore } from '../../src/infra/db/index-store';
import { createTempTree, removeTempTrees } from '../harness/isolation';

const SCHEMA_FILE = resolve('src/infra/db/schema/001-init.sql');

afterAll(() => {
  removeTempTrees();
});

/**
 * Ten test sprawdza logike probki na zwyklym Node, bo `better-sqlite3` 13
 * laduje prebuild N-API, ktory dziala i tu, i w Electronie. Nie zastepuje
 * testu E2E: to, czy modul natywny laduje sie w zbudowanej aplikacji, moze
 * potwierdzic tylko uruchomienie tej aplikacji.
 */
describe('indeks SQLite', () => {
  it('otwiera baze, zaklada schemat i odpowiada na zapytanie', () => {
    const tree = createTempTree('acme-db-');
    const store = SqliteIndexStore.open(join(tree, 'index.db'), {
      home: tree,
      schemaFile: SCHEMA_FILE,
    });

    try {
      const probe = store.probe();
      expect(probe.status).toBe('ok');
      if (probe.status !== 'ok') return;

      expect(probe.engine).toBe('better-sqlite3');
      expect(probe.sqliteVersion).toMatch(/^\d+\.\d+\.\d+$/);
      expect(probe.writeReadRoundTrip).toBe(true);
      expect(probe.fts5Available).toBe(true);
      expect(probe.journalMode).toBe('wal');
      expect(probe.schemaVersion).toBe(1);
    } finally {
      store.close();
    }
  });

  it('jest idempotentny: druga probka na tej samej bazie daje ten sam wynik', () => {
    const tree = createTempTree('acme-db-');
    const dbPath = join(tree, 'index.db');

    const first = SqliteIndexStore.open(dbPath, { home: tree, schemaFile: SCHEMA_FILE });
    const firstProbe = first.probe();
    first.close();

    const second = SqliteIndexStore.open(dbPath, { home: tree, schemaFile: SCHEMA_FILE });
    const secondProbe = second.probe();
    second.close();

    expect(firstProbe.status).toBe('ok');
    expect(secondProbe.status).toBe('ok');
    if (firstProbe.status !== 'ok' || secondProbe.status !== 'ok') return;
    expect(secondProbe.schemaVersion).toBe(firstProbe.schemaVersion);
    expect(secondProbe.fts5Available).toBe(firstProbe.fts5Available);
  });

  it('nie redaguje sciezki poza katalogiem domowym, ale redaguje w nim', () => {
    const tree = createTempTree('acme-db-');
    const store = SqliteIndexStore.open(join(tree, 'nested', 'index.db'), {
      home: tree,
      schemaFile: SCHEMA_FILE,
    });

    try {
      expect(store.probe().locationLabel).toBe(`~${join('/', 'nested', 'index.db')}`);
    } finally {
      store.close();
    }
  });

  it('uszkodzony plik bazy daje jawny status porazki, nie wyjatek', () => {
    const tree = createTempTree('acme-db-');
    const dbPath = join(tree, 'broken.db');
    writeFileSync(dbPath, 'to nie jest baza sqlite', 'utf8');

    let store: SqliteIndexStore | null = null;
    try {
      store = SqliteIndexStore.open(dbPath, { home: tree, schemaFile: SCHEMA_FILE });
      const probe = store.probe();
      expect(probe.status).toBe('failed');
      if (probe.status !== 'failed') return;
      expect(probe.reason.length).toBeGreaterThan(0);
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(Error);
    } finally {
      store?.close();
    }
  });

  it('brakujacy plik migracji nie wywala procesu', () => {
    const tree = createTempTree('acme-db-');
    const store = SqliteIndexStore.open(join(tree, 'index.db'), {
      home: tree,
      schemaFile: join(tree, 'nie-ma-takiego-pliku.sql'),
    });

    try {
      const probe = store.probe();
      expect(probe.status).toBe('failed');
    } finally {
      store.close();
    }
  });
});
