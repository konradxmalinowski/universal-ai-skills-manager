import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  assertTestBaseIsSafe,
  createTempTree,
  diffFingerprints,
  isInside,
  OWNER_CONFIG_ROOTS,
  ownerFingerprint,
  removeTempTrees,
} from '../harness/isolation';

const FAKE_HOME = mkdtempSync(join(tmpdir(), 'acme-home-'));

afterAll(() => {
  removeTempTrees();
  rmSync(FAKE_HOME, { recursive: true, force: true });
});

describe('harness odmawia startu na konfiguracji wlasciciela', () => {
  for (const root of OWNER_CONFIG_ROOTS) {
    it(`odmawia, gdy katalog bazowy to ~/${root}`, () => {
      expect(() => assertTestBaseIsSafe(join(FAKE_HOME, root), FAKE_HOME)).toThrow(
        /zywej konfiguracji/,
      );
    });

    it(`odmawia, gdy katalog bazowy lezy w ~/${root}`, () => {
      expect(() =>
        assertTestBaseIsSafe(join(FAKE_HOME, root, 'skills', 'acme-demo'), FAKE_HOME),
      ).toThrow(/zywej konfiguracji/);
    });
  }

  it('odmawia, gdy katalog bazowy to katalog domowy', () => {
    expect(() => assertTestBaseIsSafe(FAKE_HOME, FAKE_HOME)).toThrow(/katalogiem domowym/);
  });

  it('przepuszcza katalog poza konfiguracja wlasciciela', () => {
    expect(() =>
      assertTestBaseIsSafe(join(FAKE_HOME, 'projects', 'tests'), FAKE_HOME),
    ).not.toThrow();
  });
});

describe('kanarek i drzewa tymczasowe', () => {
  it('odcisk kontrolny jest stabilny miedzy odczytami', () => {
    expect(diffFingerprints(ownerFingerprint(), ownerFingerprint())).toEqual([]);
  });

  it('wykrywa zmiane w odcisku', () => {
    expect(
      diffFingerprints({ 'file:.codex/config.toml': 'a' }, { 'file:.codex/config.toml': 'b' }),
    ).toEqual(['file:.codex/config.toml']);
  });

  it('kazde drzewo tymczasowe jest osobne i lezy w katalogu bazowym testow', () => {
    const first = createTempTree();
    const second = createTempTree();
    expect(first).not.toBe(second);
    expect(isInside(first, join(process.cwd(), 'tests', '.tmp'))).toBe(true);
  });
});
