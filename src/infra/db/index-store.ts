import { mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

import Database from 'better-sqlite3';

import type { DatabaseProbe } from '../../core/model/diagnostics';
import type { IndexStore } from '../../core/ports/index-store';
import { redactHomePath } from '../logging/redact';

export const SCHEMA_VERSION = 1;

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

export class IndexStoreMigrationError extends Error {
  constructor(
    message: string,
    override readonly cause: unknown,
  ) {
    super(message);
    this.name = 'IndexStoreMigrationError';
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
 * Schemat jest zakladany przy otwarciu, nie przy pierwszym zapytaniu. Dwa
 * powody. Pierwszy: naturalna kolejnosc dla indeksu to otworz, zmigruj,
 * obsluguj - aplikacja nie ma dzialac z baza w nieznanym stanie schematu.
 * Drugi: metoda nazwana `probe` nie ma prawa mutowac schematu, a wczesniej to
 * robila.
 *
 * Skutek uboczny, swiadomy i uzyteczny: po zwyklym starcie aplikacji stan
 * schematu jest widoczny na dysku, wiec da sie go sprawdzic z zewnatrz, bez
 * zagladania aplikacji do srodka.
 */
export class SqliteIndexStore implements IndexStore {
  private constructor(
    private readonly db: Database.Database,
    private readonly locationLabel: string,
  ) {}

  /**
   * Otwiera baze i doprowadza schemat do biezacej wersji.
   *
   * Rzuca `IndexStoreMigrationError`, jesli migracja nie przejdzie. Cicha
   * porazka na tej sciezce oznaczalaby aplikacje dzialajaca z uszkodzonym
   * indeksem, a indeks jest w sciezce krytycznej produktu.
   */
  static open(dbPath: string, options: IndexStoreOptions = {}): SqliteIndexStore {
    const label = redactHomePath(dbPath, options.home ?? homedir());
    let db: Database.Database;

    try {
      mkdirSync(dirname(dbPath), { recursive: true });
      db = new Database(dbPath);
    } catch (error: unknown) {
      throw new IndexStoreMigrationError(`nie udalo sie otworzyc indeksu ${label}`, error);
    }

    try {
      db.pragma('journal_mode = WAL');
      SqliteIndexStore.migrate(db, options.schemaFile ?? defaultSchemaFile());
    } catch (error: unknown) {
      db.close();
      throw new IndexStoreMigrationError(`migracja indeksu ${label} nie przeszla`, error);
    }

    return new SqliteIndexStore(db, label);
  }

  /**
   * Migracja jest idempotentna z konstrukcji: wersja wchodzi do rejestru tylko
   * wtedy, gdy jej tam nie ma, a cala operacja idzie w jednej transakcji.
   * Powtorne otwarcie tej samej bazy nie zmienia ani schematu, ani rejestru.
   */
  private static migrate(db: Database.Database, schemaFile: string): void {
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

  /**
   * Odczyt stanu, bez zapisu. Wszystko, co tu jest, da sie policzyc
   * zapytaniem czytajacym - dlatego raport diagnostyczny nie zmienia niczego
   * w bazie, nawet gdy ktos wywola go dwadziescia razy.
   */
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
