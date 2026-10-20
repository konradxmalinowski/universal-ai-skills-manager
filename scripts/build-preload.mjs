import { build, context } from 'esbuild';

/**
 * Preload jest budowany jako jeden plik, bo musi byc. Sandboxowany preload
 * (ADR 0008 wymaga `sandbox: true`) nie moze robic `require` na wlasnych
 * plikach wzglednych - dostepne jest tylko `electron` i waska lista wbudowanych
 * modulow. Wyjscie z `tsc` z wieloma plikami padloby tu w czasie dzialania,
 * a nie przy kompilacji.
 */
const options = {
  entryPoints: ['src/preload/bridge.ts'],
  outfile: 'dist/preload/bridge.js',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  sourcemap: true,
  external: ['electron'],
  logLevel: 'info',
};

if (process.argv.includes('--watch')) {
  const ctx = await context(options);
  await ctx.watch();
  process.stdout.write('[preload] obserwuje zmiany\n');
} else {
  await build(options);
}
