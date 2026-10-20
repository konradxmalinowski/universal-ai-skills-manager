import { describe, expect, it } from 'vitest';

import type { DatabaseProbe, RuntimeInfo } from '../../src/core/model/diagnostics';
import type { IndexStore } from '../../src/core/ports/index-store';
import { buildDiagnosticsReport } from '../../src/main/services/diagnostics';
import { redactHomePath } from '../../src/infra/logging/redact';

const runtime: RuntimeInfo = {
  platform: 'darwin',
  arch: 'arm64',
  appVersion: '0.1.0',
  electronVersion: '44.0.0',
  chromeVersion: '140.0.0.0',
  nodeVersion: '24.0.0',
  packaged: false,
};

function storeReturning(probe: DatabaseProbe): IndexStore {
  return {
    probe: () => probe,
    close: () => undefined,
  };
}

describe('raport diagnostyczny', () => {
  it('bierze czas z wstrzyknietego zegara', () => {
    const report = buildDiagnosticsReport({
      runtime,
      indexStore: storeReturning({ status: 'failed', reason: 'brak', locationLabel: '~/x' }),
      clock: { now: () => new Date('2026-01-02T03:04:05.000Z') },
      appIcon: 'placeholder',
      stage: 'etap-1-szkielet',
    });
    expect(report.generatedAt).toBe('2026-01-02T03:04:05.000Z');
  });

  it('nie ukrywa, ze ikona jest placeholderem', () => {
    const report = buildDiagnosticsReport({
      runtime,
      indexStore: storeReturning({ status: 'failed', reason: 'brak', locationLabel: '~/x' }),
      clock: { now: () => new Date(0) },
      appIcon: 'placeholder',
      stage: 'etap-1-szkielet',
    });
    expect(report.appIcon).toBe('placeholder');
  });

  it('przepuszcza nieudana probe bazy jako jawny status, nie jako brak danych', () => {
    const report = buildDiagnosticsReport({
      runtime,
      indexStore: storeReturning({
        status: 'failed',
        reason: 'NODE_MODULE_VERSION mismatch',
        locationLabel: '~/Library/x/index.db',
      }),
      clock: { now: () => new Date(0) },
      appIcon: 'placeholder',
      stage: 'etap-1-szkielet',
    });
    expect(report.database.status).toBe('failed');
  });
});

describe('redakcja sciezek', () => {
  it('zamienia katalog domowy na ~', () => {
    expect(redactHomePath('/home/acme/.local/app/index.db', '/home/acme')).toBe(
      '~/.local/app/index.db',
    );
  });

  it('zostawia sciezke poza katalogiem domowym bez zmian', () => {
    expect(redactHomePath('/opt/acme/index.db', '/home/acme')).toBe('/opt/acme/index.db');
  });

  it('radzi sobie ze separatorem Windowsa', () => {
    expect(redactHomePath('C:\\Users\\acme\\AppData\\index.db', 'C:\\Users\\acme')).toBe(
      '~\\AppData\\index.db',
    );
  });

  it('nie wycina nazwy konta z podobnego prefiksu', () => {
    expect(redactHomePath('/home/acme', '/home/acme')).toBe('~');
  });
});
