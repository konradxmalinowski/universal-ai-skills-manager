import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join, relative, resolve } from 'node:path';

/**
 * Harness izolacji testow, przeniesiony z generatora (ARCHITECTURE 12.2).
 * Trzy rzeczy, ktore ma robic:
 *
 * 1. Odmowic startu, jesli katalog bazowy testow lezy w zywej konfiguracji
 *    wlasciciela albo jest katalogiem domowym.
 * 2. Policzyc odcisk kontrolny plikow wlasciciela przed i po przebiegu
 *    i porownac je na koncu (kanarek).
 * 3. Dac kazdemu testowi wlasne drzewo tymczasowe.
 *
 * Koszt tego mechanizmu jest zerowy, a stawka w tym projekcie jest wyzsza niz
 * w generatorze: aplikacja ma prawo zapisu do katalogow konfiguracyjnych.
 */

export const OWNER_CONFIG_ROOTS = ['.claude', '.codex', '.agents'] as const;

const OWNER_FILES = [
  '.claude.json',
  '.claude/settings.json',
  '.claude/settings.local.json',
  '.claude/CLAUDE.md',
  '.codex/config.toml',
  '.codex/hooks.json',
  '.codex/AGENTS.md',
] as const;

const OWNER_DIRS = [
  '.claude',
  '.claude/agents',
  '.claude/skills',
  '.claude/commands',
  '.codex',
  '.codex/agents',
  '.codex/skills',
  '.agents',
] as const;

export function isInside(child: string, parent: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  return rel !== '' && !rel.startsWith('..') && !rel.includes(`..`);
}

export function assertTestBaseIsSafe(base: string, home: string = homedir()): void {
  const resolvedBase = resolve(base);
  const resolvedHome = resolve(home);

  if (resolvedBase === resolvedHome) {
    throw new Error('katalog bazowy testow nie moze byc katalogiem domowym');
  }

  for (const root of OWNER_CONFIG_ROOTS) {
    const live = join(resolvedHome, root);
    if (resolvedBase === live || isInside(resolvedBase, live)) {
      throw new Error(
        `katalog bazowy testow ${resolvedBase} lezy w zywej konfiguracji ~/${root} - przerywam`,
      );
    }
  }
}

function hashFile(path: string): string | null {
  try {
    return createHash('sha256').update(readFileSync(path)).digest('hex');
  } catch {
    return null;
  }
}

function hashDirEntries(path: string): string | null {
  try {
    const entries = readdirSync(path, { withFileTypes: true })
      .map((entry) => {
        const kind = entry.isDirectory() ? 'd' : entry.isSymbolicLink() ? 'l' : 'f';
        let size = '';
        if (kind === 'f') {
          try {
            size = String(statSync(join(path, entry.name)).size);
          } catch {
            size = '?';
          }
        }
        return `${kind}:${entry.name}:${size}`;
      })
      .sort();
    return createHash('sha256').update(entries.join('\n')).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Odcisk kontrolny: tresc kilku plikow wlasciciela plus lista wpisow w jego
 * katalogach konfiguracyjnych. Odczyt, nigdy zapis.
 *
 * Ograniczenie, swiadome: lista wpisow jest jednopoziomowa, wiec zmiana
 * zagniezdzona glebiej w ~/.claude/skills/<skill>/ nie zostanie zauwazona.
 * Pelne przejscie drzewa kosztowaloby przy kazdym przebiegu testow wiecej, niz
 * jest warte, bo zapis do konfiguracji wlasciciela i tak nie ma w tym etapie
 * zadnej sciezki w kodzie.
 */
export function ownerFingerprint(home: string = homedir()): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const file of OWNER_FILES) {
    out[`file:${file}`] = hashFile(join(home, file));
  }
  for (const dir of OWNER_DIRS) {
    out[`dir:${dir}`] = hashDirEntries(join(home, dir));
  }
  return out;
}

export function diffFingerprints(
  before: Record<string, string | null>,
  after: Record<string, string | null>,
): string[] {
  const changed: string[] = [];
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (before[key] !== after[key]) changed.push(key);
  }
  return changed.sort();
}

export function resolveTestBase(): string {
  const override = process.env['UASM_TEST_TMPDIR'];
  if (override !== undefined && override !== '') return resolve(override);
  return resolve(join(process.cwd(), 'tests', '.tmp'));
}

export function ensureTestBase(base: string = resolveTestBase()): string {
  assertTestBaseIsSafe(base);
  if (!existsSync(base)) mkdirSync(base, { recursive: true });
  return base;
}

const createdTrees: string[] = [];

/** Kazdy test dostaje wlasne drzewo. Nazwy syntetyczne, konwencja acme-* (ADR 0004). */
export function createTempTree(prefix = 'acme-case-'): string {
  const base = ensureTestBase();
  const dir = mkdtempSync(join(base, prefix));
  createdTrees.push(dir);
  return dir;
}

export function removeTempTrees(): void {
  const base = resolveTestBase();
  while (createdTrees.length > 0) {
    const dir = createdTrees.pop();
    if (dir === undefined) continue;
    if (!isInside(dir, base)) continue;
    rmSync(dir, { recursive: true, force: true });
  }
}
