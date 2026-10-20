import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';

import { createTempTree } from '../harness/isolation';

export interface LaunchedApp {
  readonly app: ElectronApplication;
  readonly page: Page;
  readonly userDataDir: string;
}

/**
 * Katalog danych jest przekierowany wbudowanym przelacznikiem Electrona
 * `--user-data-dir`, a nie wlasna zmienna srodowiskowa. Dzieki temu w kodzie
 * aplikacji nie ma ani jednej linii istniejacej tylko dla testow, a przebieg
 * nie dotyka profilu uzytkownika.
 */
async function launch(args: string[], executablePath?: string): Promise<LaunchedApp> {
  const userDataDir = createTempTree('acme-userdata-');

  const app = await electron.launch({
    args: [...args, `--user-data-dir=${userDataDir}`],
    cwd: process.cwd(),
    ...(executablePath === undefined ? {} : { executablePath }),
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' },
  });

  const page = await app.firstWindow();
  await page.waitForSelector('[data-testid="app-shell"]');

  return { app, page, userDataDir };
}

/** Uruchamia zbudowana aplikacje z `dist/` (pole `main` w package.json). */
export function launchApp(): Promise<LaunchedApp> {
  return launch(['.']);
}

/**
 * Sciezka do binarki z `electron-builder --dir`, jesli paczka probna istnieje.
 * Nazwy katalogow i plikow zalezia od platformy i konfiguracji, wiec szukamy,
 * zamiast zgadywac.
 */
export function packagedExecutable(): string | null {
  const releaseDir = 'release';
  if (!existsSync(releaseDir)) return null;

  for (const entry of readdirSync(releaseDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(releaseDir, entry.name);

    if (process.platform === 'darwin') {
      const bundle = readdirSync(dir).find((name) => name.endsWith('.app'));
      if (bundle === undefined) continue;
      const macOsDir = join(dir, bundle, 'Contents', 'MacOS');
      if (!existsSync(macOsDir)) continue;
      const binary = readdirSync(macOsDir)[0];
      if (binary !== undefined) return join(macOsDir, binary);
      continue;
    }

    if (process.platform === 'win32') {
      const exe = readdirSync(dir).find((name) => name.endsWith('.exe'));
      if (exe !== undefined) return join(dir, exe);
      continue;
    }

    const candidates = readdirSync(dir, { withFileTypes: true })
      .filter((file) => file.isFile() && !file.name.includes('.'))
      .map((file) => file.name);
    const binary = candidates[0];
    if (binary !== undefined) return join(dir, binary);
  }

  return null;
}

export function launchPackagedApp(executablePath: string): Promise<LaunchedApp> {
  return launch([], executablePath);
}
