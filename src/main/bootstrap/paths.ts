import { join, resolve } from 'node:path';

export const APP_SCHEME = 'app';
export const APP_HOST = 'bundle';
export const APP_ENTRY_URL = `${APP_SCHEME}://${APP_HOST}/index.html`;

/** Katalog zbudowanego renderera: `dist/renderer`, obok `dist/main`. */
export function rendererRoot(): string {
  return resolve(join(__dirname, '..', '..', 'renderer'));
}

export function preloadScript(): string {
  return resolve(join(__dirname, '..', '..', 'preload', 'bridge.js'));
}

export function databaseFile(userDataDir: string): string {
  return join(userDataDir, 'index.db');
}
