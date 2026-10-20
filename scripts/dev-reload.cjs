'use strict';

/**
 * Przeladowanie na zywo dla trybu deweloperskiego.
 *
 * Ten plik NIE jest czescia aplikacji. Nie ma go w `src/`, nie ma go na liscie
 * `files` w `electron-builder.yml`, wiec nie wchodzi do paczki. Jest
 * wstrzykiwany do procesu glownego przez `NODE_OPTIONS=--require`, ktore
 * Electron honoruje wylacznie w buildzie niezapakowanym - w wydaniu ta droga
 * jest niedostepna z definicji, nie przez przelacznik w kodzie.
 *
 * Dlaczego tak, a nie serwerem deweloperskim: serwer na http://localhost
 * wymagalby rozluznienia CSP i otwarcia origin sieciowego, czyli dokladnie
 * dwoch rzeczy, ktore ta aplikacja blokuje (ADR 0008). Renderer jedzie
 * w dev z tego samego schematu `app://` co w wydaniu, wiec model
 * bezpieczenstwa jest identyczny. Cena: przeladowanie strony zamiast HMR,
 * czyli utrata stanu komponentu po zapisie.
 */

const fs = require('node:fs');
const path = require('node:path');

// NODE_OPTIONS dziedzicza procesy potomne Electrona (GPU, renderer, utility),
// a tam `require('electron')` nie ma `app`. Obserwator ma sens tylko w mainie.
if (process.type !== 'browser') return;

const RESTART_EXIT_CODE = 86;
const DEBOUNCE_MS = 120;

const RELOAD_DIRS = ['dist/renderer'];
const RESTART_DIRS = ['dist/main', 'dist/preload', 'dist/core', 'dist/infra', 'dist/shared'];

function log(message) {
  process.stdout.write(`[dev] ${message}\n`);
}

function whenElectronReady(callback) {
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    const electron = require('electron');
    if (electron && electron.app) {
      clearInterval(timer);
      callback(electron);
      return;
    }
    if (attempts > 400) {
      clearInterval(timer);
      log('nie udalo sie dosiegnac modulu electron - przeladowanie wylaczone');
    }
  }, 5);
}

function watchTree(dir, onChange) {
  const absolute = path.resolve(dir);
  if (!fs.existsSync(absolute)) return null;
  try {
    return fs.watch(absolute, { recursive: true }, (_event, filename) => {
      if (typeof filename === 'string' && filename.endsWith('.map')) return;
      onChange(filename ?? dir);
    });
  } catch (error) {
    log(`nie moge obserwowac ${dir}: ${error.message}`);
    return null;
  }
}

function debounce(fn) {
  let timer = null;
  let firstChangeAt = 0;
  return (payload) => {
    if (timer === null) firstChangeAt = Date.now();
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(payload, firstChangeAt);
    }, DEBOUNCE_MS);
  };
}

whenElectronReady((electron) => {
  const { app, BrowserWindow } = electron;

  void app.whenReady().then(() => {
    const watchers = [];

    const reload = debounce((filename, changedAt) => {
      const windows = BrowserWindow.getAllWindows();
      for (const window of windows) window.webContents.reloadIgnoringCache();
      log(
        `przeladowano ${windows.length} okno/okien po zmianie ${filename} ` +
          `(${Date.now() - changedAt} ms od wykrycia zmiany)`,
      );
    });

    const restart = debounce((filename) => {
      log(`zmiana w procesie glownym (${filename}) - restartuje aplikacje`);
      for (const watcher of watchers) watcher.close();
      app.exit(RESTART_EXIT_CODE);
    });

    for (const dir of RELOAD_DIRS) {
      const watcher = watchTree(dir, reload);
      if (watcher !== null) watchers.push(watcher);
    }
    for (const dir of RESTART_DIRS) {
      const watcher = watchTree(dir, restart);
      if (watcher !== null) watchers.push(watcher);
    }

    app.on('before-quit', () => {
      for (const watcher of watchers) watcher.close();
    });

    log(
      `przeladowanie na zywo aktywne: ${watchers.length} obserwowanych katalogow, ` +
        'schemat app:// bez zmian, bez serwera HTTP',
    );
  });
});
