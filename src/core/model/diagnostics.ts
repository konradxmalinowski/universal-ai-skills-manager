export interface DatabaseProbeOk {
  readonly status: 'ok';
  readonly engine: string;
  readonly engineVersion: string;
  readonly sqliteVersion: string;
  readonly fts5Available: boolean;
  readonly journalMode: string;
  readonly schemaVersion: number;
  readonly locationLabel: string;
}

export interface DatabaseProbeFailed {
  readonly status: 'failed';
  readonly reason: string;
  readonly locationLabel: string;
}

export type DatabaseProbe = DatabaseProbeOk | DatabaseProbeFailed;

export interface RuntimeInfo {
  readonly platform: string;
  readonly arch: string;
  readonly appVersion: string;
  readonly electronVersion: string;
  readonly chromeVersion: string;
  readonly nodeVersion: string;
  readonly packaged: boolean;
}

export interface DiagnosticsReport {
  readonly generatedAt: string;
  readonly runtime: RuntimeInfo;
  readonly database: DatabaseProbe;
  /**
   * Ikona aplikacji jest nierozstrzygnieta (ARCHITECTURE 13.3). Raport mowi
   * o tym wprost, zamiast przemilczec placeholder.
   */
  readonly appIcon: 'placeholder' | 'provided';
  readonly stage: string;
}
