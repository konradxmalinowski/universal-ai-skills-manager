import { app } from 'electron';

import type { DiagnosticsReport, RuntimeInfo } from '../../../core/model/diagnostics';
import { systemClock } from '../../../core/ports/clock';
import type { IndexStore } from '../../../core/ports/index-store';
import { buildDiagnosticsReport } from '../../services/diagnostics';
import type { IpcRegistry } from '../registry';

const STAGE = 'etap-1-szkielet';

function runtimeInfo(): RuntimeInfo {
  return {
    platform: process.platform,
    arch: process.arch,
    appVersion: app.getVersion(),
    electronVersion: process.versions['electron'] ?? 'unknown',
    chromeVersion: process.versions['chrome'] ?? 'unknown',
    nodeVersion: process.versions['node'] ?? 'unknown',
    packaged: app.isPackaged,
  };
}

export function registerDiagnosticsHandler(registry: IpcRegistry, indexStore: IndexStore): void {
  registry.register('diagnostics:report', (): DiagnosticsReport => {
    return buildDiagnosticsReport({
      runtime: runtimeInfo(),
      indexStore,
      clock: systemClock,
      appIcon: 'placeholder',
      stage: STAGE,
    });
  });
}
