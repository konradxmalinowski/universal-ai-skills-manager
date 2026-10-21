import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import Database from 'better-sqlite3';
import { expect, test } from '@playwright/test';

import { createTempTree, removeTempTrees } from '../harness/isolation';
import { launchAppWithUserData } from './launch';

interface Report {
  database: { status: string; reason?: string };
  index: {
    outcome: string;
    reason?: string;
    message?: string;
    quarantinedAs?: string;
    restoredItems?: number;
    notRestored?: string[];
  };
}

async function readReport(page: import('@playwright/test').Page): Promise<Report> {
  return (await page.evaluate(async () => {
    const bridge = (globalThis as Record<string, unknown>)['uasm'] as {
      diagnostics: { report: () => Promise<unknown> };
    };
    return bridge.diagnostics.report();
  })) as Report;
}

test.afterAll(() => {
  removeTempTrees();
});

/**
 * ADR 0029 punkt 3: okno nie zalezy od indeksu. Odmowa startu to nie brak
 * okna, tylko okno pokazujace powod - a tego nie da sie spelnic, jesli okno
 * powstaje po otwarciu indeksu. Te testy sa jedynym miejscem, ktore sprawdza
 * te kolejnosc od zewnatrz: podstawiaja zepsuty indeks jeszcze przed startem
 * i wymagaja, zeby okno bylo.
 */
test('okno powstaje, gdy indeks jest uszkodzony, a indeks jest odbudowywany', async () => {
  const userDataDir = createTempTree('acme-index-');
  mkdirSync(userDataDir, { recursive: true });
  // Plik, ktory nie jest baza SQLite: przyczyna "corrupted", czyli odbudowa.
  writeFileSync(join(userDataDir, 'index.db'), 'to nie jest baza sqlite', 'utf8');

  const { app, page } = await launchAppWithUserData(userDataDir);
  try {
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();

    const report = await readReport(page);
    expect(report.index.outcome).toBe('rebuilt');
    expect(report.index.quarantinedAs).toBeDefined();
    expect(report.index.restoredItems).toBe(0);
    expect(report.index.notRestored?.join(' ')).toMatch(/log operacji/);
    expect(report.database.status).toBe('ok');
  } finally {
    await app.close();
  }
});

test('okno powstaje takze przy odmowie: indeks ze schematem z przyszlosci nie jest odbudowywany', async () => {
  const userDataDir = createTempTree('acme-index-');
  mkdirSync(userDataDir, { recursive: true });
  const dbPath = join(userDataDir, 'index.db');

  const seed = new Database(dbPath);
  seed.exec(
    'CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)',
  );
  seed
    .prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
    .run(99, new Date().toISOString());
  seed.close();

  const { app, page } = await launchAppWithUserData(userDataDir);
  try {
    // Okno jest, choc indeksu nie ma - to jest cala teza ADR 0029 punkt 3.
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();

    const report = await readReport(page);
    expect(report.index.outcome).toBe('refused');
    expect(report.index.reason).toBe('schema-from-future');
    expect(report.database.status).toBe('unavailable');

    // Asercja negatywna z ADR 0029: indeks z przyszlosci NIE jest odbudowywany,
    // bo odbudowa wyrzucilaby log operacji.
    const ledger = new Database(dbPath, { readonly: true });
    try {
      const rows = ledger
        .prepare('SELECT version FROM schema_migrations ORDER BY version')
        .all() as { version: number }[];
      expect(rows.map((row) => row.version)).toEqual([99]);
    } finally {
      ledger.close();
    }
  } finally {
    await app.close();
  }
});
