import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

/**
 * Tryb deweloperski bez serwera HTTP.
 *
 * Renderer jest serwowany z tego samego schematu `app://` co w buildzie
 * wydaniowym, wiec CSP, blokada sieci, sandbox i izolacja kontekstu obowiazuja
 * takze w dev. Nie ma trybu, w ktorym hartowanie z ADR 0008 jest wylaczone.
 *
 * Przeladowanie po zapisie zalatwia `scripts/dev-reload.cjs`, wstrzykiwany do
 * procesu glownego przez NODE_OPTIONS. Ten plik i obserwator leza w `scripts/`,
 * czyli poza `src/` i poza lista `files` w electron-builder.yml - do paczki nie
 * wchodza.
 */

const RESTART_EXIT_CODE = 86;
const BUILD_MARKERS = ['dist/main/index.js', 'dist/preload/bridge.js', 'dist/renderer/index.html'];
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const children = [];
let shuttingDown = false;

function run(command, args, label) {
  const child = spawn(command, args, { stdio: 'inherit', shell: false });
  child.on('error', (error) => {
    process.stderr.write(`[dev] ${label} nie wystartowal: ${error.message}\n`);
    shutdown(1);
  });
  children.push(child);
  return child;
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  process.exit(code);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    shutdown(0);
  });
}

// Migracje nie przechodza przez tsc, wiec kopiujemy je raz na starcie.
const copy = run(npmCommand, ['run', '--silent', 'build:main'], 'pierwszy build procesu glownego');
const [firstBuild] = await once(copy, 'exit');
if (firstBuild !== 0) {
  process.stderr.write('[dev] pierwszy build nie przeszedl - nie uruchamiam aplikacji\n');
  process.exit(firstBuild ?? 1);
}

run('npx', ['tsc', '-p', 'tsconfig.main.json', '--watch', '--preserveWatchOutput'], 'tsc');
run('node', ['scripts/build-preload.mjs', '--watch'], 'esbuild');
run(npxCommand, ['ng', 'build', '--watch', '--configuration', 'development'], 'ng build');

process.stdout.write('[dev] czekam na pierwsze wyjscie builda\n');
for (let attempt = 0; attempt < 600; attempt += 1) {
  if (BUILD_MARKERS.every((marker) => existsSync(marker))) break;
  await delay(250);
}
if (!BUILD_MARKERS.every((marker) => existsSync(marker))) {
  process.stderr.write(`[dev] brak wyjscia builda: ${BUILD_MARKERS.join(', ')}\n`);
  shutdown(1);
}

while (!shuttingDown) {
  const electron = spawn(npxCommand, ['electron', '.'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: '--require ./scripts/dev-reload.cjs' },
  });
  children.push(electron);

  const [code] = await once(electron, 'exit');
  if (code === RESTART_EXIT_CODE) {
    process.stdout.write('[dev] restart po zmianie w procesie glownym\n');
    continue;
  }
  shutdown(code ?? 0);
}
