import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { ESLint } from 'eslint';

/**
 * Dowod, ze reguly granic warstw faktycznie blokuja. Skrypt wstawia celowo
 * zakazany import, uruchamia lint, sprawdza, ze padl na oczekiwanej regule,
 * i usuwa plik. Na koniec jedna proba kontrolna: czysty plik w tym samym
 * katalogu musi przejsc, zeby test nie "przechodzil" przez to, ze lint pada
 * zawsze i na wszystko.
 */

const PROBE = '__boundary-probe.ts';

const cases = [
  {
    label: 'core/ importuje electron',
    file: `src/core/${PROBE}`,
    code: "import { app } from 'electron';\n\nexport const probe = app;\n",
    expect: 'no-restricted-imports',
  },
  {
    label: 'core/ importuje node:fs',
    file: `src/core/${PROBE}`,
    code: "import { readFileSync } from 'node:fs';\n\nexport const probe = readFileSync;\n",
    expect: 'no-restricted-imports',
  },
  {
    label: 'core/ importuje better-sqlite3',
    file: `src/core/${PROBE}`,
    code: "import Database from 'better-sqlite3';\n\nexport const probe = Database;\n",
    expect: 'no-restricted-imports',
  },
  {
    label: 'core/ importuje Angulara',
    file: `src/core/${PROBE}`,
    code: "import { Component } from '@angular/core';\n\nexport const probe = Component;\n",
    expect: 'no-restricted-imports',
  },
  {
    label: 'core/ importuje z infra/',
    file: `src/core/${PROBE}`,
    code: "import { SqliteIndexStore } from '../infra/db/index-store';\n\nexport const probe = SqliteIndexStore;\n",
    expect: 'import-x/no-restricted-paths',
  },
  {
    label: 'adapters/ importuje node:fs',
    file: `src/adapters/${PROBE}`,
    code: "import { readFileSync } from 'node:fs';\n\nexport const probe = readFileSync;\n",
    expect: 'no-restricted-imports',
  },
  {
    label: 'adapters/ importuje node:child_process',
    file: `src/adapters/${PROBE}`,
    code: "import { spawnSync } from 'node:child_process';\n\nexport const probe = spawnSync;\n",
    expect: 'no-restricted-imports',
  },
  {
    label: 'renderer importuje z main/',
    file: `src/renderer/${PROBE}`,
    code: "import { IpcRegistry } from '../main/ipc/registry';\n\nexport const probe = IpcRegistry;\n",
    expect: 'import-x/no-restricted-paths',
  },
];

const control = {
  label: 'proba kontrolna: czysty plik w core/ przechodzi',
  file: `src/core/${PROBE}`,
  code: 'export const probe = 1;\n',
};

const eslint = new ESLint({ cwd: process.cwd() });
const failures = [];

// Katalogi warstw moga byc jeszcze puste (git nie sledzi pustych katalogow),
// a proba granicy musi dac sie zapisac takze w swiezym klonie.
async function writeProbe(file, code) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, code, 'utf8');
}

async function lint(file) {
  const results = await eslint.lintFiles([file]);
  return results.flatMap((result) => result.messages.map((message) => message.ruleId ?? 'parse'));
}

for (const testCase of cases) {
  await writeProbe(testCase.file, testCase.code);
  try {
    const rules = await lint(testCase.file);
    if (rules.includes(testCase.expect)) {
      process.stdout.write(`PASS  ${testCase.label} -> ${testCase.expect}\n`);
    } else {
      failures.push(
        `${testCase.label}: oczekiwano ${testCase.expect}, dostano [${rules.join(', ')}]`,
      );
      process.stdout.write(`FAIL  ${testCase.label} -> [${rules.join(', ')}]\n`);
    }
  } finally {
    await rm(testCase.file, { force: true });
  }
}

await writeProbe(control.file, control.code);
try {
  const rules = await lint(control.file);
  if (rules.length === 0) {
    process.stdout.write(`PASS  ${control.label}\n`);
  } else {
    failures.push(`${control.label}: lint zglosil [${rules.join(', ')}]`);
    process.stdout.write(`FAIL  ${control.label} -> [${rules.join(', ')}]\n`);
  }
} finally {
  await rm(control.file, { force: true });
}

if (failures.length > 0) {
  process.stderr.write(`\nreguly granic nie dzialaja:\n- ${failures.join('\n- ')}\n`);
  process.exit(1);
}

process.stdout.write(
  `\nwszystkie ${cases.length + 1} proby granic zachowaly sie zgodnie z oczekiwaniem\n`,
);
