# ADR 0015: Tryb materializacji jako jawna zdolność adaptera, widoczna w interfejsie

Status: zaakceptowane
Data: 2026-10-20

## Kontekst

Potwierdzone empirycznie: Codex czyta symlinkowane katalogi skilli. Istniejący generator
wykorzystuje to i linkuje skille, zamiast je kopiować, co daje zero duplikacji treści i zero
dryfu między źródłem a celem.

Symlink na Windowsie wymaga trybu dewelopera albo uprawnień administratora. Junction działa
bez uprawnień, ale tylko dla katalogów. Dla plików na Windowsie bez uprawnień zostaje kopia.

Różnica nie jest techniczna, jest widoczna dla użytkownika: przy symlinku i junction edycja
w bibliotece jest natychmiast widoczna w narzędziu, przy kopii nie jest i wymaga ponownej
synchronizacji.

## Rozważane opcje

**Zawsze kopiować.** Jednolite na trzech systemach, przewidywalne, ale traci największą zaletę
podejścia linkowego: brak dryfu. Użytkownik musiałby synchronizować po każdej edycji.

**Zawsze linkować, odmawiać na Windowsie bez uprawnień.** Wymusza na użytkowniku Windowsa
włączenie trybu dewelopera, żeby w ogóle użyć produktu. Nie do przyjęcia.

**Degradacja: symlink, junction, kopia, z trybem ukrytym w implementacji.** Działa, ale
użytkownik nie wie, czy jego edycja propaguje się sama. To jest pytanie, które zada natychmiast.

**Degradacja z trybem jawnym w modelu i w interfejsie.**

## Decyzja

Tryb materializacji jest zdolnością deklarowaną przez adapter (`materialization` w kontrakcie,
ADR 0013) i stanem widocznym per element (`syncState`). Degradacja:

| System | Element | Tryb |
|---|---|---|
| macOS, Linux | katalog, plik | symlink |
| Windows z uprawnieniem | katalog, plik | symlink |
| Windows bez uprawnienia | katalog | junction |
| Windows bez uprawnienia | plik | kopia |
| Dowolny, gdy link się nie uda | oba | kopia, z podaniem przyczyny |

Zdolność jest wykrywana, nie zgadywana: próba utworzenia symlinku w katalogu tymczasowym przy
pierwszym uruchomieniu, z zapamiętaniem wyniku i możliwością ponownego sprawdzenia
z Diagnostics. Nie wnioskujemy z wersji systemu.

Interfejs pokazuje aktywny tryb przy każdym zsynchronizowanym elemencie, razem z informacją,
co to znaczy: "zmiany propagują się automatycznie" albo "wymaga ponownej synchronizacji".

## Konsekwencje

Model synchronizacji ma dwa zachowania, nie jedno. Wykrywanie dryfu dotyczy tylko elementów
w trybie kopii; elementy linkowane nie mogą dryfować. To upraszcza synchronizację tam, gdzie
linki działają, i wymaga pełnej ścieżki tam, gdzie nie działają.

Testy trybu materializacji mają sens wyłącznie na realnych systemach, więc należą do macierzy
CI (ADR 0010). Windows bez uprawnień administratora to domyślny stan runnera, czyli dokładnie
ten przypadek, który chcemy pokrywać.

Import musi liczyć się z symlinkami w drzewie źródłowym jako z normą, nie anomalią: skoro
generator i Codex ich używają, drzewo skilli użytkownika Codeksa jest ich pełne. Dotyczy to
także rozwiązywania aliasów (dwa katalogi, których `SKILL.md` to ten sam plik) i odmowy wyjścia
poza root przy skanowaniu (ADR 0008).
