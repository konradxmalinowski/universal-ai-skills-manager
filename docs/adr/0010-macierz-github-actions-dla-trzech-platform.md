# ADR 0010: Macierz GitHub Actions dla trzech platform od Etapu 1

Status: zaakceptowane
Data: 2026-10-20

## Kontekst

Wymaganie trzech platform jest twarde (ADR 0002), maszyna deweloperska to macOS, a aplikacja
używa modułu natywnego (ADR 0007) i intensywnie korzysta z zachowań systemu plików, które
różnią się między systemami: symlinki, uprawnienia, wielkość liter w nazwach, końce linii.

Lokalny build z macOS-a nie pokrywa Windowsa ani Linuksa. Krzyżowe budowanie Electrona na obce
platformy jest możliwe tylko częściowo i nie pozwala uruchomić testów na systemie docelowym.

## Rozważane opcje

**Budowanie lokalne plus ręczne testy na maszynach wirtualnych.** Wolne, niepowtarzalne,
i w praktyce oznacza, że Windows jest testowany raz przed wydaniem.

**CI tylko na jednym systemie, macierz wydania na trzech.** Tańsze w minutach, ale testy
wieloplatformowe (tryb materializacji, ACL, wielkość liter, końce linii) uruchamiałyby się
dopiero przy tagu, czyli po tym, jak kod jest już zmergowany.

**Pełna macierz na każdym PR.**

## Decyzja

Dwa workflow w GitHub Actions.

`ci.yml` na każdym PR i pushu, macierz: `ubuntu-latest`, `macos-14` (arm64), `macos-13` (x64),
`windows-latest`. Kroki: lint, typecheck, testy jednostkowe i kontraktowe, testy integracyjne,
E2E Playwright na zbudowanej aplikacji, build próbny, `gitleaks`, `npm audit`.

`release.yml` na tag `v*`: `dmg` i `zip` dla macOS arm64 i x64, `nsis` i wersja przenośna
dla Windows x64, `AppImage` i `deb` dla Linux x64, plus `SHA256SUMS`. Uprawnienia ograniczone
do `contents: write`, żadnych sekretów (ADR 0003).

Cztery wpisy macierzy, nie trzy, z jednego powodu: `better-sqlite3` to moduł natywny i macOS
arm64 oraz x64 to osobne cele. Jeden wpis dla macOS oznaczałby, że o problemie dowiadujemy się
przy pierwszym wydaniu.

Macierz działa od Etapu 1, nie od Etapu 9.

## Konsekwencje

Dłuższy czas przejścia PR i wyższe zużycie minut CI. Przy projekcie jednoosobowym to akceptowalne,
a alternatywą jest dowiedzenie się o awarii na Windowsie w momencie, w którym synchronizacja
jest już zbudowana na założeniach, które tam nie obowiązują.

Testy, których nie da się zasymulować podstawieniem środowiska, mają sens tylko w tej macierzy.
To ona jest jedynym miejscem, gdzie zdolność tworzenia symlinków na Windowsie, zachowanie ACL
i nieczułość NTFS na wielkość liter są sprawdzane realnie.
