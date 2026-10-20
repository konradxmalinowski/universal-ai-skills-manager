import type { DiagnosticsReport, RuntimeInfo } from '../../core/model/diagnostics';
import type { Clock } from '../../core/ports/clock';
import type { IndexStore } from '../../core/ports/index-store';

export interface DiagnosticsDeps {
  readonly runtime: RuntimeInfo;
  readonly indexStore: IndexStore;
  readonly clock: Clock;
  readonly appIcon: 'placeholder' | 'provided';
  readonly stage: string;
}

export function buildDiagnosticsReport(deps: DiagnosticsDeps): DiagnosticsReport {
  return {
    generatedAt: deps.clock.now().toISOString(),
    runtime: deps.runtime,
    database: deps.indexStore.probe(),
    appIcon: deps.appIcon,
    stage: deps.stage,
  };
}
