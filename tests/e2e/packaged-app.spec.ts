import { expect, test } from '@playwright/test';

import { removeTempTrees } from '../harness/isolation';
import { launchPackagedApp, packagedExecutable } from './launch';

interface Report {
  database: {
    status: string;
    sqliteVersion?: string;
    fts5Available?: boolean;
    writeReadRoundTrip?: boolean;
    reason?: string;
  };
  runtime: { packaged: boolean; platform: string; arch: string };
}

const executable = packagedExecutable();

test.afterAll(() => {
  removeTempTrees();
});

/**
 * Ten plik sprawdza to, czego nie sprawdzi uruchomienie z `dist/`: czy modul
 * natywny laduje sie z `app.asar.unpacked` w faktycznie zapakowanej aplikacji.
 * Wymaga wczesniejszego `npm run package`; bez paczki test jest pominiety
 * jawnie, a nie zaliczony po cichu.
 */
test.describe('zapakowana aplikacja', () => {
  test.skip(executable === null, 'brak paczki probnej - uruchom najpierw `npm run package`');

  /**
   * Limit testu nieco wyzszy niz limit samego startu z tests/e2e/launch.ts,
   * zeby porazka wskazywala na start, a nie na test.
   *
   * Limit testu jest wyzszy niz limit samego startu z tests/e2e/launch.ts,
   * zeby porazka wskazywala na start, a nie na test.
   *
   * Swiadomie limit czasu, a nie `retries`: wolniejszy start to opoznienie,
   * nie inny wynik. Powtarzanie testu ukrywaloby prawdziwa porazke, a tego
   * tutaj nie chcemy - ten test jest jedynym dowodem, ze modul natywny laduje
   * sie z app.asar.unpacked.
   */
  test.setTimeout(180_000);

  test('startuje z paczki i better-sqlite3 odpowiada z app.asar.unpacked', async () => {
    const { app, page } = await launchPackagedApp(executable as string);

    try {
      await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();

      const report = (await page.evaluate(async () => {
        const bridge = (globalThis as Record<string, unknown>)['uasm'] as {
          diagnostics: { report: () => Promise<unknown> };
        };
        return bridge.diagnostics.report();
      })) as Report;

      expect(report.runtime.packaged).toBe(true);
      expect(report.database.reason).toBeUndefined();
      expect(report.database.status).toBe('ok');
      expect(report.database.sqliteVersion).toMatch(/^\d+\.\d+\.\d+$/);
      expect(report.database.writeReadRoundTrip).toBe(true);
      expect(report.database.fts5Available).toBe(true);
    } finally {
      await app.close();
    }
  });

  test('renderer w paczce nadal nie ma dostepu do Node', async () => {
    const { app, page } = await launchPackagedApp(executable as string);

    try {
      const probe = await page.evaluate(() => ({
        require: typeof (globalThis as Record<string, unknown>)['require'],
        process: typeof (globalThis as Record<string, unknown>)['process'],
      }));
      expect(probe).toEqual({ require: 'undefined', process: 'undefined' });
    } finally {
      await app.close();
    }
  });
});
