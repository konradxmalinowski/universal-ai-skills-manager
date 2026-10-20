# Universal AI Skills Manager

Aplikacja desktopowa do zarzadzania skillami, agentami, komendami, instrukcjami
i regulami roznych narzedzi AI z jednego miejsca. Dane zostaja na komputerze
uzytkownika, bez backendu i bez kont.

**Stan: Etap 1 (szkielet).** Dziala okno, most IPC, indeks SQLite i pelny
lancuch budowania na cztery cele. Nie ma jeszcze zadnej funkcji produktu:
biblioteki, importu, eksportu ani synchronizacji. Plan etapow jest
w `docs/ROADMAP.md`, architektura w `docs/ARCHITECTURE.md`, decyzje
w `docs/adr/`.

## Wymagania

- Node.js 24 (linia LTS; wersja w `.nvmrc`)
- Nic poza tym. `better-sqlite3` 13 dostarcza w paczce npm prebuildy N-API dla
  wszystkich szesciu par system-architektura, ktore nas interesuja, a N-API jest
  stabilne miedzy Node i Electronem, wiec przy instalacji nie kompiluje sie nic.
  Toolchain C++ (Xcode Command Line Tools, MSVC Build Tools, `build-essential`)
  jest potrzebny tylko wtedy, gdy dla jakiejs pary prebuildu zabraknie i trzeba
  siegnac po `npm run rebuild:native`.

## Uruchomienie

```
npm install
npm run dev        # build i uruchomienie aplikacji
```

`npm run dev` nie stawia serwera deweloperskiego. Renderer jest serwowany
z tego samego schematu `app://` co w wydaniu, wiec CSP i blokada sieci
obowiazuja takze w trakcie pracy - nie ma trybu, w ktorym hartowanie
z ADR 0008 jest wylaczone. Koszt: po zmianie w rendererze trzeba przebudowac
i odswiezyc okno.

## Polecenia

| Polecenie                 | Co robi                                                               |
| ------------------------- | --------------------------------------------------------------------- |
| `npm run build`           | proces glowny (tsc), preload (esbuild), renderer (Angular)            |
| `npm run dev`             | build plus uruchomienie Electrona                                     |
| `npm run lint`            | ESLint z regulami granic warstw plus Prettier                         |
| `npm run typecheck`       | `tsc --noEmit` dla main, preload i testow                             |
| `npm test`                | testy jednostkowe, kontraktowe i integracyjne (Vitest)                |
| `npm run test:boundaries` | dowod, ze reguly granic warstw faktycznie blokuja                     |
| `npm run test:e2e`        | testy E2E przeciw zbudowanej aplikacji (Playwright)                   |
| `npm run package`         | paczka probna bez instalatorow (`electron-builder --dir`)             |
| `npm run rebuild:native`  | ratunek, gdy dla jakiejs platformy brakuje prebuildu modulu natywnego |
| `npm run package:dist`    | instalatory dla biezacej platformy                                    |

`npm run test:e2e` wymaga wczesniejszego `npm run build`: testy uruchamiaja
zbudowana aplikacje z `dist/`, nie zrodla. Dwa testy idace przeciw faktycznie
zapakowanej aplikacji wymagaja dodatkowo `npm run package` i bez paczki sa
pominiete jawnie, a nie zaliczone po cichu.

## Granice warstw

Reguly z `docs/ROADMAP.md` sekcja 1 sa wymuszone lintem, nie dobra wola:

- `src/core/` nie importuje `electron`, `node:fs`, `better-sqlite3` ani Angulara,
- `src/adapters/` nie importuje `node:fs` ani `node:child_process`,
- `src/renderer/` nie importuje niczego z `main/`, `infra/` ani `adapters/`.

`npm run test:boundaries` wstawia celowo zakazany import, sprawdza, ze lint pada
na oczekiwanej regule, i usuwa plik. Jest tam tez proba kontrolna: czysty plik
w tym samym katalogu musi przejsc, zeby test nie zaliczal sie przez to, ze lint
pada zawsze.

Jedno ograniczenie wprost: regula sciezkowa nie rozroznia importu typow od
importu wartosci, wiec `renderer` ma zamknieta droge do `main/`, `infra/`
i `adapters/` w calosci, a do `core/` i `shared/` droge otwarta. Reguly z
ARCHITECTURE "renderer importuje z core tylko typy" lint w tej formie nie
wyraza.

## Testy i izolacja

Harness testowy (`tests/harness/isolation.ts`) jest przeniesiony z generatora
konfiguracji (ARCHITECTURE 12.2):

- odmawia startu, jesli katalog bazowy testow lezy w `~/.claude`, `~/.codex`
  albo `~/.agents`, albo jest katalogiem domowym,
- liczy odcisk kontrolny plikow konfiguracyjnych wlasciciela przed i po calym
  przebiegu i porownuje je na koncu,
- daje kazdemu testowi wlasne drzewo tymczasowe pod `tests/.tmp`
  (`UASM_TEST_TMPDIR` nadpisuje lokalizacje).

Testy E2E przekierowuja katalog danych aplikacji na drzewo tymczasowe
wbudowanym przelacznikiem Electrona `--user-data-dir`. W kodzie aplikacji nie ma
ani jednej linii istniejacej tylko dla testow: zmienna srodowiskowa
przekierowujaca zapis bylaby dokladnie takim wejsciem, ktore kiedys posluzy
do czegos innego.

Fixture'y sa wylacznie syntetyczne, konwencja `acme-*` (ADR 0004). Nic
z prawdziwej konfiguracji nie wchodzi do repozytorium.

## Zaleznosci i powody

Kryterium akceptacji Etapu 1 punkt 5: kazda pozycja w `package.json` ma powod.

### Runtime (ida do paczki)

| Pakiet           | Powod                                                                              |
| ---------------- | ---------------------------------------------------------------------------------- |
| `better-sqlite3` | indeks metadanych, FTS5, synchroniczne API pasujace do procesu glownego (ADR 0007) |

### Budowanie i testy (nie ida do paczki)

| Pakiet                                                          | Powod                                                                                                                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `electron`                                                      | runtime aplikacji (ADR 0001)                                                                                                                                             |
| `electron-builder`                                              | cztery cele wydania, asar, instalatory (ADR 0002, ADR 0010)                                                                                                              |
| `@angular/core`, `@angular/common`, `@angular/platform-browser` | framework renderera (ADR 0001); kod wchodzi do bundla, wiec zaleznosc jest wylacznie budowania                                                                           |
| `@angular/compiler`, `@angular/compiler-cli`                    | kompilacja szablonow i `strictTemplates`                                                                                                                                 |
| `@angular/build`, `@angular/cli`                                | builder renderera                                                                                                                                                        |
| `rxjs`, `tslib`                                                 | wymagane peer dependencies Angulara                                                                                                                                      |
| `typescript`                                                    | caly kod, `strict` wlaczone                                                                                                                                              |
| `@types/node`, `@types/better-sqlite3`                          | typy dla procesu glownego; `better-sqlite3` nie dostarcza wlasnych                                                                                                       |
| `esbuild`                                                       | bundlowanie preloada do jednego pliku; sandboxowany preload nie moze robic `require` na plikach wzglednych, wiec wyjscie wieloplikowe z `tsc` padloby w czasie dzialania |
| `eslint`, `@eslint/js`, `typescript-eslint`                     | lint z informacja o typach                                                                                                                                               |
| `eslint-plugin-import-x`                                        | `no-restricted-paths`, czyli kierunek zaleznosci miedzy katalogami                                                                                                       |
| `globals`                                                       | zestawy globali dla flat configa ESLinta                                                                                                                                 |
| `prettier`                                                      | formatowanie, jedno zrodlo prawdy o stylu                                                                                                                                |
| `vitest`                                                        | testy jednostkowe, kontraktowe i integracyjne (ARCHITECTURE 12.1)                                                                                                        |
| `@playwright/test`                                              | E2E przeciw Electronowi (ADR 0009)                                                                                                                                       |

Pole `overrides` przypina `vitest` w drzewie `@angular/build`. Angular
deklaruje `vitest` jako opcjonalny peer w zakresie `^3.1.1`, a jego builder
testowy nie jest tu uzywany; wersja 3 ma otwarte zgloszenia bezpieczenstwa,
ktorych poprawka jest dopiero w 5.

Znane ostrzezenia `npm audit`: osiem pozycji o wadze moderate w drzewie
`electron-builder` (`sprintf-js` przez `roarr` i `global-agent`). Nie ma dla
nich poprawki poza cofnieciem `electron-builder` do starszej wersji, nie
dotycza kodu wchodzacego do aplikacji i nie sa w sciezce wykonania u uzytkownika.
Bramka w CI blokuje na poziomie `high` dla zaleznosci produkcyjnych.

## Wydania sa niepodpisane

Swiadoma decyzja na czas MVP (ADR 0003). Z tego wynikaja ostrzezenia systemu
przy pierwszym uruchomieniu:

**macOS.** Gatekeeper zablokuje aplikacje z niezidentyfikowanego dewelopera.
Obejscie: Finder, prawy przycisk na aplikacji, Otworz, potem Otworz
w okienku potwierdzenia. Alternatywnie Ustawienia systemowe, Prywatnosc
i bezpieczenstwo, Otworz mimo to.

**Windows.** SmartScreen pokaze ostrzezenie "Windows chronil Twoj komputer".
Obejscie: Wiecej informacji, Uruchom mimo to.

**Linux.** AppImage wymaga nadania prawa wykonywania
(`chmod +x`), paczka `deb` instaluje sie normalnie.

Bez podpisu jedyna weryfikacja pobranego pliku to suma kontrolna: kazde wydanie
ma plik `SHA256SUMS`. Autoaktualizacja jest wylaczona.
