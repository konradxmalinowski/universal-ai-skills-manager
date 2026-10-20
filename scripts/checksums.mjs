import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

/**
 * Sumy kontrolne liczone w Node, nie przez `shasum`/`certutil`, bo format
 * wyjscia tych narzedzi rozni sie miedzy systemami, a plik SHA256SUMS ma byc
 * identyczny niezaleznie od runnera. Bez podpisu wydania to jedyna weryfikacja,
 * jaka ma uzytkownik (ADR 0003, ARCHITECTURE 14.3).
 */
const SHIPPABLE = /\.(dmg|zip|exe|AppImage|deb|rpm|snap|tar\.gz)$/i;
const dir = process.argv[2] ?? 'release';
const output = process.argv[3] ?? join(dir, 'SHA256SUMS');

async function sha256(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

const entries = await readdir(dir);
const lines = [];

for (const entry of entries.sort()) {
  const path = join(dir, entry);
  const info = await stat(path);
  if (!info.isFile() || !SHIPPABLE.test(entry)) continue;
  lines.push(`${await sha256(path)}  ${basename(entry)}`);
}

if (lines.length === 0) {
  process.stderr.write(`brak artefaktow do zahaszowania w ${dir}\n`);
  process.exit(1);
}

await writeFile(output, `${lines.join('\n')}\n`, 'utf8');
process.stdout.write(`${output}:\n${lines.join('\n')}\n`);
