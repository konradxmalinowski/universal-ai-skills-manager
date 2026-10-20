import { rm } from 'node:fs/promises';

const targets = [
  'dist',
  'release',
  'coverage',
  '.angular/cache',
  'playwright-report',
  'test-results',
];

await Promise.all(targets.map((target) => rm(target, { recursive: true, force: true })));
process.stdout.write(`usunieto: ${targets.join(', ')}\n`);
