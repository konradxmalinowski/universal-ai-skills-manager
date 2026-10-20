import { readFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

import Database from 'better-sqlite3';

import type { DatabaseProbe } from '../../core/model/diagnostics';
import type { IndexStore } from '../../core/ports/index-store';
import { redactHomePath } from '../logging/redact';

const SCHEMA_VERSION = 1;

/**
 * Sciezka migracji jest wyliczana w funkcji, nie w stalej modulu, zeby modul
 * dal sie zaimportowac takze poza CommonJS (testy jednostkowe jada w ESM,
 * gdzie `__dirname` nie istnieje) i zeby test mogl podac wlasna sciezke.
 */
function defaultSchemaFile(): string {
  return join(__dirname, 'schema', '001-init.sql');
}

export interface IndexStoreOptions {
  readonly home?: string;
  readonly schemaFile?: string;
}

interface VersionRow {
  readonly version: string;
}

interface CountRow {
  readonly total: number;
}

function readPackagedVersion(): string {
  try {
    const pkg = readFileSync(
      join(__dirname, '..', '..', '..', 'node_modules', 'better-sqlite3', 'package.json'),
      'utf8',
    );
    const parsed: unknown = JSON.parse(pkg);
    if (typeof parsed === 'object' && parsed !== null && 'version' in parsed) {
      const value = (parsed as { version?: unknown }).version;
      if (typeof value === 'string') return value;
    }
  } catch {
    // Wersja biblioteki to informacja diagnostyczna, nie warunek dzialania.
  }
  return 'unknown';
}

/**
 * Indeks metadanych na `better-sqlite3` (ADR 0007). W Etapie 1 ta klasa robi
 * dokladnie jedna rzecz: dowodzi, ze modul natywny laduje sie w zbudowanej
 * aplikacji, ze SQLite odpowiada i ze FTS5 jest skompilowane w dostarczonym
 * binarium. To jest ryzyko R2 i rozstrzyga sie teraz, nie przed wydaniem.
 */
export class SqliteIndexStore implements IndexStore {
  private readonly db: Database.Database;

  private constructor(
    db: Database.Database,
    private readonly locationLabel: string,
    private readonly schemaFile: string,
  ) {
    this.db = db;
  }

  static open(dbPath: string, options: IndexStoreOptions = {}): SqliteIndexStore {
    mkdirSync(dirname(dbPath), { recursive: true });
    const db = new Database(dbPath);
    return new SqliteIndexStore(
      db,
      redactHomePath(dbPath, options.home ?? homedir()),
      options.schemaFile ?? defaultSchemaFile(),
    );
  }

  probe(): DatabaseProbe {
    try {
      const journalMode = this.db.pragma('journal_mode = WAL', { simple: true });
      this.db.exec(readFileSync(this.schemaFile, 'utf8'));
      this.db
        .prepare('INSERT OR REPLACE INTO schema_migrations (version, applied_at) VALUES (?, ?)')
        .run(SCHEMA_VERSION, new Date().toISOString());

      const checkedAt = new Date().toISOString();
      this.db
        .prepare('INSERT OR REPLACE INTO startup_probe (id, checked_at) VALUES (1, ?)')
        .run(checkedAt);
      const readBack = this.db
        .prepare('SELECT checked_at AS version FROM startup_probe WHERE id = 1')
        .get() as VersionRow | undefined;

      this.db.exec(
        "DELETE FROM startup_probe_fts; INSERT INTO startup_probe_fts (body) VALUES ('acme probe row');",
      );
      const matched = this.db
        .prepare(
          "SELECT count(*) AS total FROM startup_probe_fts WHERE startup_probe_fts MATCH 'acme'",
        )
        .get() as CountRow | undefined;

      const sqliteVersion = this.db.prepare('SELECT sqlite_version() AS version').get() as
        VersionRow | undefined;

      return {
        status: 'ok',
        engine: 'better-sqlite3',
        engineVersion: readPackagedVersion(),
        sqliteVersion: sqliteVersion?.version ?? 'unknown',
        fts5Available: (matched?.total ?? 0) === 1,
        writeReadRoundTrip: readBack?.version === checkedAt,
        journalMode: typeof journalMode === 'string' ? journalMode : 'unknown',
        schemaVersion: SCHEMA_VERSION,
        locationLabel: this.locationLabel,
      };
    } catch (error: unknown) {
      return {
        status: 'failed',
        reason: error instanceof Error ? error.message : String(error),
        locationLabel: this.locationLabel,
      };
    }
  }

  close(): void {
    this.db.close();
  }
}
