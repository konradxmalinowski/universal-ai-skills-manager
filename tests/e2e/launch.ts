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
    // Bez tego Playwright sam dokłada `--no-sandbox` do argumentow Electrona,
    // czyli test hartowania jechalby z wylaczonym sandboxem systemowym
    // i milczalby o tym. Na Linuksie wymaga to pomocnika chrome-sandbox
    // z bitem setuid - jest na to krok w ci.yml.
    chromiumSandbox: true,
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

const RELEASE_DIR = 'release';

/**
 * Nazwa binarki na Linuksie jest przypieta w `electron-builder.yml`
 * (`linux.executableName`). Zgadywanie "pierwszy plik bez kropki" skonczylo sie
 * tym, ze test uruchomil `chrome-sandbox`, bo sortuje sie wczesniej niz
 * aplikacja - i padl na komunikacie o sandboxie, ktory nie mial nic do rzeczy.
 */
const LINUX_EXECUTABLE = 'universal-ai-skills-manager';
const WINDOWS_EXECUTABLE = 'Universal AI Skills Manager.exe';
const HELPER_BINARIES = new Set(['chrome-sandbox', 'chrome_crashpad_handler', 'crashpad_handler']);

function findInReleaseDir(dir: string): string | null {
  if (process.platform === 'darwin') {
    const bundle = readdirSync(dir).find((name) => name.endsWith('.app'));
    if (bundle === undefined) return null;
    const macOsDir = join(dir, bundle, 'Contents', 'MacOS');
    if (!existsSync(macOsDir)) return null;
    const binary = readdirSync(macOsDir).find((name) => !HELPER_BINARIES.has(name));
    return binary === undefined ? null : join(macOsDir, binary);
  }

  if (process.platform === 'win32') {
    const exact = join(dir, WINDOWS_EXECUTABLE);
    if (existsSync(exact)) return exact;
    const exe = readdirSync(dir).find(
      (name) => name.endsWith('.exe') && !HELPER_BINARIES.has(name),
    );
    return exe === undefined ? null : join(dir, exe);
  }

  const exact = join(dir, LINUX_EXECUTABLE);
  return existsSync(exact) ? exact : null;
}

/**
 * Sciezka do binarki z `electron-builder --dir`.
 *
 * Zwraca `null` tylko wtedy, gdy paczki w ogole nie ma - wtedy testy przeciw
 * zapakowanej aplikacji sa pominiete jawnie. Jesli katalog `release/` istnieje,
 * ale binarki w nim nie ma, leci blad. Rozroznienie jest celowe: cicho
 * pominiety test przeciw paczce dawalby zielona macierz, ktora nic nie
 * sprawdzila.
 */
export function packagedExecutable(): string | null {
  if (!existsSync(RELEASE_DIR)) return null;

  const candidates = readdirSync(RELEASE_DIR, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory(),
  );
  if (candidates.length === 0) return null;

  for (const entry of candidates) {
    const found = findInReleaseDir(join(RELEASE_DIR, entry.name));
    if (found !== null) return found;
  }

  const expected =
    process.platform === 'darwin'
      ? 'pakiet *.app z binarka w Contents/MacOS'
      : process.platform === 'win32'
        ? WINDOWS_EXECUTABLE
        : LINUX_EXECUTABLE;

  throw new Error(
    `katalog ${RELEASE_DIR}/ istnieje, ale nie ma w nim binarki aplikacji dla ${process.platform}. ` +
      `Szukalem: ${expected}. Jesli nazwa zmienila sie w electron-builder.yml, popraw ja takze ` +
      'w tests/e2e/launch.ts.',
  );
}

export function launchPackagedApp(executablePath: string): Promise<LaunchedApp> {
  return launch([], executablePath);
}
