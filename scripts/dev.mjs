import { spawn } from 'node:child_process';
import { once } from 'node:events';

/**
 * Tryb deweloperski bez serwera HTTP. Renderer jest serwowany z tego samego
 * schematu `app://` co w buildzie wydaniowym, wiec blokada sieci i CSP
 * obowiazuja takze w dev. Koszt: brak HMR, trzeba odswiezyc okno po przebudowie.
 * Zysk: nie ma trybu, w ktorym hartowanie z ADR 0008 jest wylaczone.
 */
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(args, options = {}) {
  const child = spawn(npmCommand, args, { stdio: 'inherit', shell: false, ...options });
  child.on('error', (error) => {
    process.stderr.write(`nie udalo sie uruchomic "npm ${args.join(' ')}": ${error.message}\n`);
    process.exitCode = 1;
  });
  return child;
}

const build = run(['run', 'build']);
const [code] = await once(build, 'exit');
if (code !== 0) {
  process.stderr.write('build nie przeszedl, nie uruchamiam aplikacji\n');
  process.exit(code ?? 1);
}

const electron = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['electron', '.'], {
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    electron.kill(signal);
  });
}

const [electronCode] = await once(electron, 'exit');
process.exit(electronCode ?? 0);
