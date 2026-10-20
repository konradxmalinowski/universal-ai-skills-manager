import { app, session, type Session } from 'electron';

import { APP_SCHEME } from './paths';

const ALLOWED_PROTOCOLS = new Set([`${APP_SCHEME}:`, 'devtools:', 'blob:', 'data:']);

function protocolOf(url: string): string {
  try {
    return new URL(url).protocol;
  } catch {
    return '';
  }
}

/**
 * Zakaz sieci jako wlasnosc, nie obietnica (ADR 0008). Aplikacja nie ma zadnego
 * powodu wychodzic na siec w MVP: nie ma backendu, nie ma autoaktualizacji,
 * a tresc, ktora wyswietla, jest niezaufana. Blokada stoi na `webRequest`,
 * wiec obejmuje tez zadania, ktorych CSP by nie zatrzymalo.
 */
export function blockOutboundNetwork(target: Session = session.defaultSession): void {
  target.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    callback({ cancel: !ALLOWED_PROTOCOLS.has(protocolOf(details.url)) });
  });
}

export function denyAllPermissions(target: Session = session.defaultSession): void {
  target.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });
  target.setPermissionCheckHandler(() => false);
}

/** Nawigacja poza schemat aplikacji i otwieranie okien sa zablokowane. */
export function hardenWebContents(): void {
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-navigate', (event, url) => {
      if (protocolOf(url) !== `${APP_SCHEME}:`) event.preventDefault();
    });

    contents.setWindowOpenHandler(() => ({ action: 'deny' }));

    contents.on('will-attach-webview', (event) => {
      event.preventDefault();
    });
  });
}
