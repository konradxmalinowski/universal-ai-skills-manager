import { app, ipcMain, BrowserWindow } from 'electron';

import { SqliteIndexStore } from '../infra/db/index-store';
import { databaseFile, rendererRoot } from './bootstrap/paths';
import { handleAppScheme, registerAppScheme } from './bootstrap/protocol';
import { blockOutboundNetwork, denyAllPermissions, hardenWebContents } from './bootstrap/security';
import { createMainWindow } from './bootstrap/window';
import { registerDiagnosticsHandler } from './ipc/handlers/diagnostics';
import { IpcRegistry } from './ipc/registry';

registerAppScheme();
app.enableSandbox();

let indexStore: SqliteIndexStore | null = null;

function start(): void {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    const [existing] = BrowserWindow.getAllWindows();
    if (existing !== undefined) {
      if (existing.isMinimized()) existing.restore();
      existing.focus();
    }
  });

  hardenWebContents();

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    indexStore?.close();
    indexStore = null;
  });

  void app.whenReady().then(() => {
    handleAppScheme(rendererRoot());
    blockOutboundNetwork();
    denyAllPermissions();

    indexStore = SqliteIndexStore.open(databaseFile(app.getPath('userData')));

    const registry = new IpcRegistry(ipcMain);
    registerDiagnosticsHandler(registry, indexStore);
    registry.assertImplementedRegistered();

    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });
}

start();
