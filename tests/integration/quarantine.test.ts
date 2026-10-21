import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { QuarantineError, quarantineIndex } from '../../src/infra/db/quarantine';
import { createTempTree, removeTempTrees } from '../harness/isolation';

afterAll(() => {
  removeTempTrees();
});

/**
 * Kwarantanna jest tym, czym w ADR 0028 jest kopia przed zapisem: jedyna
 * rzecza, ktora pozwala powiedziec "naprawilismy" zamiast "zastapilismy".
 * Dlatego sprawdzamy nie tylko to, ze plik znika ze starego miejsca, ale tez
 * ze istnieje w nowym - i ze porazka nie zostawia polowicznego stanu.
 */
describe('kwarantanna indeksu (ADR 0029 punkt 2)', () => {
  it('przenosi baze razem z plikami -wal i -shm', () => {
    const tree = createTempTree('acme-quar-');
    const dbPath = join(tree, 'index.db');
    writeFileSync(dbPath, 'tresc indeksu', 'utf8');
    writeFileSync(`${dbPath}-wal`, 'dziennik', 'utf8');
    writeFileSync(`${dbPath}-shm`, 'pamiec wspoldzielona', 'utf8');

    const result = quarantineIndex(dbPath, join(tree, 'quarantine'), '2026-10-21T00-00-00');

    expect(existsSync(dbPath)).toBe(false);
    expect(existsSync(`${dbPath}-wal`)).toBe(false);
    expect(existsSync(`${dbPath}-shm`)).toBe(false);
    expect(result.movedFiles).toEqual([
      'index-2026-10-21T00-00-00.sqlite',
      'index-2026-10-21T00-00-00.sqlite-wal',
      'index-2026-10-21T00-00-00.sqlite-shm',
    ]);

    // Tresc jest nienaruszona: to kopia, nie usuniecie pod inna nazwa.
    expect(readFileSync(join(result.directory, 'index-2026-10-21T00-00-00.sqlite'), 'utf8')).toBe(
      'tresc indeksu',
    );
  });

  it('radzi sobie, gdy plikow -wal i -shm nie ma', () => {
    const tree = createTempTree('acme-quar-');
    const dbPath = join(tree, 'index.db');
    writeFileSync(dbPath, 'tresc', 'utf8');

    const result = quarantineIndex(dbPath, join(tree, 'quarantine'), 'stamp');
    expect(result.movedFiles).toEqual(['index-stamp.sqlite']);
  });

  it('zaweza uprawnienia na POSIX, bez udawania chmod na Windowsie (ADR 0018)', () => {
    if (process.platform === 'win32') return;

    const tree = createTempTree('acme-quar-');
    const dbPath = join(tree, 'index.db');
    writeFileSync(dbPath, 'tresc', 'utf8');

    const result = quarantineIndex(dbPath, join(tree, 'quarantine'), 'stamp');

    expect(statSync(result.directory).mode & 0o777).toBe(0o700);
    expect(statSync(join(result.directory, 'index-stamp.sqlite')).mode & 0o777).toBe(0o600);
  });

  it('rzuca, gdy nie ma czego przeniesc - wolajacy ma wtedy wstrzymac odbudowe', () => {
    const tree = createTempTree('acme-quar-');

    expect(() =>
      quarantineIndex(join(tree, 'nie-ma-pliku.db'), join(tree, 'quarantine'), 'stamp'),
    ).toThrow(QuarantineError);
  });

  it('nie usuwa nic z kwarantanny przy kolejnym przebiegu', () => {
    const tree = createTempTree('acme-quar-');
    const root = join(tree, 'quarantine');

    writeFileSync(join(tree, 'index.db'), 'pierwszy', 'utf8');
    quarantineIndex(join(tree, 'index.db'), root, 'pierwszy');

    writeFileSync(join(tree, 'index.db'), 'drugi', 'utf8');
    quarantineIndex(join(tree, 'index.db'), root, 'drugi');

    // Oba pliki sa na miejscu: plik z kwarantanny nie jest nigdy usuwany
    // automatycznie, uzytkownik usuwa go sam z Diagnostics.
    expect(readdirSync(root).sort()).toEqual(['index-drugi.sqlite', 'index-pierwszy.sqlite']);
    expect(readFileSync(join(root, 'index-pierwszy.sqlite'), 'utf8')).toBe('pierwszy');
  });
});
