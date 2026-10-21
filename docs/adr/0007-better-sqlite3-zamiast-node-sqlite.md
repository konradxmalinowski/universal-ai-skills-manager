# ADR 0007: `better-sqlite3` zamiast `node:sqlite`

Status: zaakceptowane
Data: 2026-10-20

## Kontekst

Aplikacja potrzebuje indeksu metadanych z wyszukiwaniem pełnotekstowym, filtrowaniem, stanem
synchronizacji per cel i logiem operacji. Wszystkie zapytania wykonuje proces główny Electrona,
jeden użytkownik, bez współbieżności zapisu.

Node 24 ma wbudowany `node:sqlite`, oznaczony jako eksperymentalny.

## Rozważane opcje

**`node:sqlite` (wbudowany).** Zero zależności, zero modułów natywnych do przebudowy, więc
macierz CI upraszcza się do trzech wpisów. Przeciw: status eksperymentalny, czyli API może
się zmienić między wersjami Node, a Electron przypina własną wersję Node, na którą nie mamy
wpływu. Wsparcie FTS5 zależy od tego, jak skompilowano SQLite w konkretnym buildzie.

**`better-sqlite3`.** Synchroniczne API, które pasuje do procesu głównego bez owijania
w obietnice. FTS5 dostępne. Biblioteka dojrzała i szeroko używana w aplikacjach Electronowych.
Przeciw: moduł natywny, więc wymaga prebuildu albo kompilacji dla każdej pary ABI Electrona
i platformy, w tym osobno macOS arm64 i x64.

**Bez bazy, tylko pliki plus indeks w pamięci.** Wystarczy przy małej bibliotece, przestaje
wystarczać przy wyszukiwaniu pełnotekstowym po treści setek elementów i przy logu operacji,
który ma przeżyć restart.

## Decyzja

`better-sqlite3`.

Powód: baza jest w ścieżce krytycznej produktu (wyszukiwanie, stan synchronizacji, historia),
a status eksperymentalny w ścieżce krytycznej to ryzyko, które ujawniłoby się przy aktualizacji
Electrona, czyli w najmniej wygodnym momencie.

## Konsekwencje

Koszt, który trzeba zapłacić jawnie: przebudowa modułu natywnego dla każdej pary system plus
architektura. Macierz CI ma cztery wpisy, nie trzy, bo macOS arm64 i x64 to osobne cele
(ADR 0010). Prebuildy pobiera `prebuild-install`; gdy dla danej pary nie istnieją, potrzebny
jest `electron-rebuild` i pełny toolchain na runnerze (Xcode Command Line Tools, MSVC Build
Tools, `build-essential`). To ryzyko R2 w roadmapie.

Dlatego macierz czterech celów działa od Etapu 1, a nie od Etapu 9. Wykrycie problemu z modułem
natywnym na trzy dni przed wydaniem byłoby najdroższym możliwym momentem.

Stan po przebiegu `39525840100` na commicie `e34367a`: decyzja jest potwierdzona na wszystkich
czterech celach w jednym zielonym przebiegu. Prebuild wystarczył wszędzie, nic nie trzeba było
przebudowywać, co pozwoliło usunąć `@electron/rebuild` z zależności. Moduł natywny ładuje się
i wykonuje zapytania przy zwykłym starcie zapakowanej aplikacji, a migracja jest w paczce
idempotentna.

Jedno zastrzeżenie zostaje: **FTS5 w zapakowanej aplikacji jest na razie dowodzone przez
inferencję.** Binding dostarczony w paczce jest bajt w bajt tym samym plikiem, który ładuje proces
testu (porównanie SHA-256), a FTS5 działa w tym procesie. To mocna inferencja, ale nie dowód
bezpośredni. Domknie go Etap 2, pierwszą prawdziwą tabelą pełnotekstową biblioteki i zapytaniem
FTS wykonanym wewnątrz paczki. Powód, dla którego nie domykamy tego teraz: wymagałoby to tabeli
w schemacie produkcyjnym, której jedynym użytkownikiem byłaby asercja (ARCHITECTURE sekcja 12.6).
Szczegóły w ROADMAP, ryzyko R2.

Mitygacja na wypadek, gdyby koszt okazał się nie do uniesienia: baza siedzi za portem
`IndexStore`, więc wymiana na implementację bez modułu natywnego jest możliwa. Koszt wymiany:
utrata FTS5, czyli wyszukiwanie pełnotekstowe trzeba by zrobić samemu albo zaakceptować wolniejsze.
Zasada: baza jest odtwarzalna z plików (ARCHITECTURE sekcja 9), więc wymiana nie oznacza migracji
danych.
