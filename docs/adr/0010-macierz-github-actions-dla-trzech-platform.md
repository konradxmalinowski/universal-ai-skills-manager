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

`ci.yml` na każdym PR i pushu, cztery cele: `linux-x64` (`ubuntu-latest`), `macos-arm64`
(`macos-15`), `macos-x64` (`macos-15-intel`), `windows-x64` (`windows-latest`). Kroki: lint,
typecheck, testy jednostkowe i kontraktowe, testy integracyjne, E2E Playwright na zbudowanej
aplikacji, build próbny, `gitleaks`, `npm audit`.

Etykiety obrazów są przypięte do celów, nie do architektury decyzji. Pierwotna wersja tego ADR
wymieniała `macos-14` i `macos-13`; `macos-13` został wycofany, a `macos-14` oznaczony jako
przestarzały, więc `ci.yml` używa `macos-15` i `macos-15-intel`. Cele są te same, zmieniły się
nazwy obrazów. Taka podmiana nie wymaga nowego ADR, ale wymaga poprawienia tego, bo dokument,
który wymienia nieistniejące runnery, kłamie o tym, co stoi w `.github/workflows/ci.yml`.

`release.yml` na tag `v*`: `dmg` i `zip` dla macOS arm64 i x64, `nsis` i wersja przenośna
dla Windows x64, `AppImage` i `deb` dla Linux x64, plus `SHA256SUMS`. Uprawnienia ograniczone
do `contents: write`, żadnych sekretów (ADR 0003).

Cztery cele, nie trzy, z jednego powodu: `better-sqlite3` to moduł natywny i macOS arm64 oraz
x64 to osobne cele. Jeden wpis dla macOS oznaczałby, że o problemie dowiadujemy się przy
pierwszym wydaniu. Pierwszy realny przebieg macierzy to potwierdził z drugiej strony: oba cele
macOS przeszły, a Windows nie dotarł nawet do testów, więc moduł natywny ma tam nadal status
niezweryfikowany (ROADMAP, ryzyko R2).

Macierz działa od Etapu 1, nie od Etapu 9.

## Konsekwencje

Dłuższy czas przejścia PR i wyższe zużycie minut CI. Przy projekcie jednoosobowym to akceptowalne,
a alternatywą jest dowiedzenie się o awarii na Windowsie w momencie, w którym synchronizacja
jest już zbudowana na założeniach, które tam nie obowiązują.

Testy, których nie da się zasymulować podstawieniem środowiska, mają sens tylko w tej macierzy.
To ona jest jedynym miejscem, gdzie zdolność tworzenia symlinków na Windowsie, zachowanie ACL
i nieczułość NTFS na wielkość liter są sprawdzane realnie.
