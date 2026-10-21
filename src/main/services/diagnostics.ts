import type { DiagnosticsReport, RuntimeInfo } from '../../core/model/diagnostics';
import type { IndexStartupInfo } from '../../core/model/index-health';
import type { Clock } from '../../core/ports/clock';
import type { IndexStore } from '../../core/ports/index-store';

export interface DiagnosticsDeps {
  readonly runtime: RuntimeInfo;
  /**
   * `null`, jesli aplikacja wystartowala bez indeksu (ADR 0029). Okno istnieje
   * niezaleznie od indeksu, wiec raport musi umiec opisac ten stan, a nie
   * zalozyc, ze indeks jest.
   */
  readonly indexStore: IndexStore | null;
  readonly index: IndexStartupInfo;
  readonly clock: Clock;
  readonly appIcon: 'placeholder' | 'provided';
  readonly stage: string;
}

export function buildDiagnosticsReport(deps: DiagnosticsDeps): DiagnosticsReport {
  return {
    generatedAt: deps.clock.now().toISOString(),
    runtime: deps.runtime,
    database:
      deps.indexStore === null
        ? { status: 'unavailable', reason: deps.index.message ?? 'indeks nie zostal otwarty' }
        : deps.indexStore.probe(),
    index: deps.index,
    appIcon: deps.appIcon,
    stage: deps.stage,
  };
}
