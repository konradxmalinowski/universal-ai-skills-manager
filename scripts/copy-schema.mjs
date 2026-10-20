import { cp, mkdir } from 'node:fs/promises';

const from = 'src/infra/db/schema';
const to = 'dist/infra/db/schema';

await mkdir(to, { recursive: true });
await cp(from, to, { recursive: true });
process.stdout.write(`skopiowano migracje: ${from} -> ${to}\n`);
