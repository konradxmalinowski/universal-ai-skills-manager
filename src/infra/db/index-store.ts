import { accessSync, constants, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

import type DatabaseConstructor from 'better-sqlite3';
import type { Database } from 'better-sqlite3';

import type { DatabaseProbe } from '../../core/model/diagnostics';
import type { IndexFailureReason } from '../../core/model/index-health';
import type { IndexStore } from '../../core/ports/index-store';
import { redactHomePath } from '../logging/redact';

export const SCHEMA_VERSION = 1;

function defaultSchemaFile(): string {
  return join(__dirname, 'schema', '001-init.sql');
}

export interface IndexStoreOptions {
  readonly home?: string;
  readonly schemaFile?: string;
}

export class IndexStoreOpenError extends Error {
  constructor(
    readonly reason: IndexFailureReason,
    message: string,
    override readonly cause: unknown,
  ) {
    super(message);
    this.name = 'IndexStoreOpenError';
  }
}

interface VersionRow {
  readonly version: number | null;
}

interface TextRow {
  readonly value: string;
}

interface CountRow {
  readonly total: number;
}

/**
 * Sterownik jest wczytywany leniwie, nie importem na gorze modulu.
 *
 * Powod jest konkretny: ADR 0029 wymaga, zeby okno powstawalo niezaleznie od
 * indeksu, a import statyczny modulu natywnego, ktory sie nie laduje, wywala
 * proces zanim jakikolwiek kod zdazy cokolwiek pokazac. Leniwe wczytanie
 * zamienia awarie procesu w rozpoznana przyczyne.
 */
function loadDriver(): typeof DatabaseConstructor {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('better-sqlite3') as typeof DatabaseConstructor;
  } catch (error: unknown) {
    throw new IndexStoreOpenError(
      'native-module',
      'sterownik better-sqlite3 nie daje sie wczytac',
      error,
    );
  }
}

function sqliteErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return '';
}

function classifyOpenError(error: unknown): IndexFailureReason {
  const code = sqliteErrorCode(error);
  if (code === 'SQLITE_NOTADB' || code.startsWith('SQLITE_CORRUPT')) return 'corrupted';
  if (code === 'SQLITE_CANTOPEN' || code === 'EACCES' || code === 'EPERM' || code === 'ENOSPC') {
    return 'not-writable';
  }
  return 'corrupted';
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
 * Indeks metadanych na `better-sqlite3` (ADR 0007).
 *
 * Schemat jest zakladany przy otwarciu, nie przy pierwszym zapytaniu, bo
 * aplikacja nie ma dzialac z baza w nieznanym stanie schematu, a metoda
 * nazwana `probe` nie ma prawa mutowac schematu.
 *
 * Otwarcie nie podejmuje decyzji, co zrobic z awaria - rozpoznaje przyczyne
 * i oddaje ja w typowanym bledzie. Polityka reakcji jest w bootstrapie
 * procesu glownego (ADR 0029).
 */
export class SqliteIndexStore implements IndexStore {
  private constructor(
    private readonly db: Database,
    private readonly locationLabel: string,
  ) {}

  static open(dbPath: string, options: IndexStoreOptions = {}): SqliteIndexStore {
    const label = redactHomePath(dbPath, options.home ?? homedir());
    const driver = loadDriver();

    try {
      mkdirSync(dirname(dbPath), { recursive: true });
      accessSync(dirname(dbPath), constants.W_OK);
    } catch (error: unknown) {
      throw new IndexStoreOpenError(
        'not-writable',
        `katalog indeksu ${label} nie jest zapisywalny`,
        error,
      );
    }

    let db: Database;
    try {
      db = new driver(dbPath);
    } catch (error: unknown) {
      throw new IndexStoreOpenError(
        classifyOpenError(error),
        `nie udalo sie otworzyc indeksu ${label}`,
        error,
      );
    }

    try {
      db.pragma('journal_mode = WAL');
      SqliteIndexStore.assertSchemaIsUsable(db);
      SqliteIndexStore.migrate(db, options.schemaFile ?? defaultSchemaFile());
    } catch (error: unknown) {
      db.close();
      if (error instanceof IndexStoreOpenError) throw error;
      throw new IndexStoreOpenError(
        classifyOpenError(error),
        `migracja indeksu ${label} nie przeszla`,
        error,
      );
    }

    return new SqliteIndexStore(db, label);
  }

  /**
   * Dwa przypadki, ktorych migracja nie powinna nawet probowac tknac.
   *
   * Schemat z przyszlosci: indeks zapisany przez nowsza wersje aplikacji
   * zawiera stan, ktorego ta wersja nie rozumie, w tym log operacji, ktorego
   * z plikow odtworzyc sie nie da (ADR 0014). Odbudowa wyrzucilaby go po
   * cichu, czyli usunelaby dane pod pozorem naprawy.
   *
   * Nieznany schemat: w bazie sa tabele, ale nie ma rejestru migracji, wiec
   * nie wiemy, co to jest ani czym to nadpisujemy.
   */
  private static assertSchemaIsUsable(db: Database): void {
    const tables = db
      .prepare("SELECT count(*) AS total FROM sqlite_master WHERE type = 'table'")
      .get() as CountRow | undefined;
    const ledger = db
      .prepare(
        "SELECT count(*) AS total FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'",
      )
      .get() as CountRow | undefined;

    const hasTables = (tables?.total ?? 0) > 0;
    const hasLedger = (ledger?.total ?? 0) > 0;

    if (hasTables && !hasLedger) {
      throw new IndexStoreOpenError(
        'unknown-schema',
        'baza ma tabele, ale nie ma rejestru migracji - nie wiadomo, co to za schemat',
        null,
      );
    }

    if (!hasLedger) return;

    const applied = db.prepare('SELECT max(version) AS version FROM schema_migrations').get() as
      VersionRow | undefined;
    const version = applied?.version ?? 0;

    if (version > SCHEMA_VERSION) {
      throw new IndexStoreOpenError(
        'schema-from-future',
        `indeks jest w wersji schematu ${version}, a ta wersja aplikacji zna ${SCHEMA_VERSION}`,
        null,
      );
    }
  }

  /**
   * Idempotentna z konstrukcji: wersja wchodzi do rejestru tylko wtedy, gdy
   * jej tam nie ma, a cala operacja idzie w jednej transakcji.
   */
  private static migrate(db: Database, schemaFile: string): void {
    const sql = readFileSync(schemaFile, 'utf8');

    db.transaction(() => {
      db.exec(sql);
      const applied = db.prepare('SELECT max(version) AS version FROM schema_migrations').get() as
        VersionRow | undefined;

      if ((applied?.version ?? 0) < SCHEMA_VERSION) {
        db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
          SCHEMA_VERSION,
          new Date().toISOString(),
        );
      }
    })();
  }

  /** Odczyt stanu, bez zapisu. */
  probe(): DatabaseProbe {
    try {
      const sqliteVersion = this.db.prepare('SELECT sqlite_version() AS value').get() as
        TextRow | undefined;
      const journalMode = this.db.prepare('PRAGMA journal_mode').get() as
        { readonly journal_mode?: string } | undefined;
      const schemaVersion = this.db
        .prepare('SELECT max(version) AS version FROM schema_migrations')
        .get() as VersionRow | undefined;
      const fts5 = this.db
        .prepare(
          "SELECT count(*) AS total FROM pragma_compile_options WHERE compile_options = 'ENABLE_FTS5'",
        )
        .get() as CountRow | undefined;

      return {
        status: 'ok',
        engine: 'better-sqlite3',
        engineVersion: readPackagedVersion(),
        sqliteVersion: sqliteVersion?.value ?? 'unknown',
        fts5Available: (fts5?.total ?? 0) > 0,
        journalMode: journalMode?.journal_mode ?? 'unknown',
        schemaVersion: schemaVersion?.version ?? 0,
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
