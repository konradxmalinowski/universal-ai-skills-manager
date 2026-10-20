import js from '@eslint/js';
import importX from 'eslint-plugin-import-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Granice warstw sa tu regula lintu, nie dobra wola (ROADMAP sekcja 1).
 * Dwa mechanizmy, bo pilnuja dwoch roznych rzeczy:
 *
 * - `no-restricted-imports` per katalog pilnuje pakietow: `core/` nie widzi
 *   Electrona, systemu plikow, sterownika bazy ani Angulara.
 * - `import-x/no-restricted-paths` pilnuje kierunku zaleznosci miedzy
 *   katalogami, niezaleznie od tego, jak zapisano sciezke importu.
 *
 * Dowod, ze reguly faktycznie blokuja, jest w `scripts/verify-boundaries.mjs`
 * i w zadaniu `boundaries` w CI. Regula bez takiego dowodu nie jest regula.
 */

const FS_MODULES = ['fs', 'node:fs', 'fs/promises', 'node:fs/promises'];
const PROCESS_MODULES = ['child_process', 'node:child_process'];

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'release/**',
      'coverage/**',
      '.angular/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'tests/fixtures/**',
      'docs/**',
    ],
  },

  js.configs.recommended,

  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    files: ['**/*.{ts,mjs,js}'],
    plugins: { 'import-x': importX },
    settings: {
      'import-x/resolver-next': [
        importX.createNodeResolver({ extensions: ['.ts', '.js', '.mjs', '.json'] }),
      ],
    },
    rules: {
      'no-console': ['error', { allow: ['error', 'warn'] }],
      eqeqeq: ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            { target: './src/core', from: './src/main' },
            { target: './src/core', from: './src/infra' },
            { target: './src/core', from: './src/adapters' },
            { target: './src/core', from: './src/renderer' },
            { target: './src/core', from: './src/preload' },
            { target: './src/adapters', from: './src/main' },
            { target: './src/adapters', from: './src/infra' },
            { target: './src/adapters', from: './src/renderer' },
            { target: './src/renderer', from: './src/main' },
            { target: './src/renderer', from: './src/infra' },
            { target: './src/renderer', from: './src/adapters' },
            { target: './src/renderer', from: './src/preload' },
          ],
        },
      ],
    },
  },

  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'electron', message: 'core/ nie zna Electrona (ROADMAP sekcja 1).' },
            {
              name: 'better-sqlite3',
              message: 'core/ nie zna sterownika bazy - uzyj portu IndexStore.',
            },
            ...FS_MODULES.map((name) => ({
              name,
              message: 'core/ nie dotyka systemu plikow - uzyj portu FileGateway.',
            })),
            ...PROCESS_MODULES.map((name) => ({
              name,
              message: 'core/ nie uruchamia procesow (ADR 0008).',
            })),
          ],
          patterns: [
            { group: ['electron/*'], message: 'core/ nie zna Electrona.' },
            { group: ['@angular/*'], message: 'core/ nie zna Angulara (ROADMAP sekcja 1).' },
          ],
        },
      ],
    },
  },

  {
    files: ['src/adapters/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'electron', message: 'adapters/ nie zna Electrona.' },
            ...FS_MODULES.map((name) => ({
              name,
              message: 'adapters/ nie dotyka systemu plikow bezposrednio - uzyj WriteGate.',
            })),
            ...PROCESS_MODULES.map((name) => ({
              name,
              message:
                'adapters/ nie uruchamia procesow: importowana tresc jest niezaufana (ADR 0008).',
            })),
          ],
          patterns: [{ group: ['electron/*'], message: 'adapters/ nie zna Electrona.' }],
        },
      ],
    },
  },

  {
    files: ['src/renderer/**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'electron', message: 'renderer nie zna Electrona (ADR 0008).' },
            ...FS_MODULES.map((name) => ({
              name,
              message: 'renderer nie ma dostepu do systemu plikow (ADR 0008).',
            })),
            ...PROCESS_MODULES.map((name) => ({
              name,
              message: 'renderer nie uruchamia procesow (ADR 0008).',
            })),
          ],
          patterns: [{ group: ['electron/*'], message: 'renderer nie zna Electrona (ADR 0008).' }],
        },
      ],
    },
  },

  {
    files: ['src/main/**/*.ts', 'src/preload/**/*.ts', 'src/infra/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  {
    files: ['scripts/**/*.mjs', '*.config.mjs'],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'module',
    },
    rules: {
      'no-console': 'off',
    },
  },

  // Skrypty deweloperskie w CommonJS. Jeden z nich jest wstrzykiwany do
  // procesu glownego Electrona przez NODE_OPTIONS, wiec musi byc CJS.
  {
    files: ['scripts/**/*.cjs'],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'commonjs',
    },
    rules: {
      'no-console': 'off',
    },
  },

  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
