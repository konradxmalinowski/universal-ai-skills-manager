# ADR 0006: Ponowne użycie generatora jako zalążka adapterów i korpusu regresyjnego

Status: zaakceptowane (decyzja właściciela produktu, 2026-10-20)
Data: 2026-10-20

## Kontekst

Istnieje działający generator `~/.claude/tools/sync-ai-config.js`: 1051 linii kodu, 1328 linii
testów, 123 przechodzące testy. Odtwarza konfigurację Codeksa z `~/.claude`, w jednym kierunku,
bez modelu pośredniego, bez obsługi Windowsa i bez bazy danych.

Właściciel zdecydował: ponowne użycie jako zalążek adapterów i korpus regresyjny, z modelem
kanonicznym pisanym od zera.

## Rozważane opcje

**Rozbudować generator do aplikacji.** Najtańsze na papierze, ale generator ma wbudowane
założenia, które aplikacja musi odrzucić: jeden kierunek, dwa narzędzia na stałe, Claude jako
źródło prawdy, ścieżki wyliczane z `os.homedir()` w całym pliku, brak modelu pośredniego.
Rozbudowa oznaczałaby przepisanie wszystkiego poza parserami, przy ciągłym ryzyku, że stare
założenie przecieknie do nowego kodu.

**Napisać wszystko od zera.** Wyrzucenie 123 testów i sprawdzonych rozwiązań konkretnych
problemów, z których część zajęła dużo czasu (segmentacja `config.toml`, model własności plików,
folding skalarów YAML, przepisywanie trybu pliku po `rename`).

**Przenieść wybrane komponenty, model napisać od zera.**

## Decyzja

Przenosimy komponenty, piszemy od zera to, co w generatorze nie istnieje albo istnieje
w nieprzenoszalnej formie.

**Nadaje się do przeniesienia:**

| Komponent | Dlaczego |
|---|---|
| Parser frontmattera YAML (podzbiór) | Obsługuje to, co faktycznie występuje: folding skalarów, cudzysłowy pojedyncze i podwójne wielolinijkowe, bloki `|` i `>`, skalary plain z kontynuacją. Błąd z nazwą pliku zamiast cichego fallbacku |
| Serializacja TOML (`tomlInline`, `tomlMultiline`) | Escapowanie wielolinijkowych stringów z poprawną obsługą zakończeń cudzysłowem i znaków kontrolnych |
| Segmentacja `config.toml` | Komentarz nad nagłówkiem należy do sekcji poniżej, nagłówek z komentarzem w tej samej linii, tablice tabel. Podstawa `SegmentTomlEditor` (ADR 0011) |
| Reguła "skillem jest katalog z SKILL.md" | Potwierdzona: poprawnie odrzuca 9 katalogów referencyjnych bez listy wykluczeń |
| Dedup aliasów po `realpath` | Rozwiązuje realną kolizję: Codex kluczuje po `name`, Claude po katalogu |
| `descriptionFromMarkdown` | Heurystyka opisu dla płaskich plików, z pomijaniem akapitów będących wskaźnikiem do innego pliku |
| Model własności plików (markery) | "Nie usuwaj tego, czego nie rozpoznajesz jako swoje" plus wymóg, by marker był kluczem we frontmatterze, a nie dowolnym wystąpieniem w treści |
| Backup z MANIFEST, zapis tmp plus rename z przepisaniem trybu, sufiks przy kolizji nazwy backupu | Każdy z tych szczegółów naprawia konkretny, zaobserwowany błąd |
| Harness testowy z podstawianym HOME i kanarkiem na plikach właściciela | Zero kosztu, wysoka wartość |

**Trzeba napisać od zera:**

Model kanoniczny (generator go nie ma). Kierunek import z Codeksa (generator tylko zapisuje
do Codeksa). Warstwa wykrywania lokalizacji dla trzech systemów. Cała obsługa Windowsa.
Baza, indeks, wyszukiwanie. Historia operacyjna i rollback (generator ma tylko backup katalogu).
Klasyfikacja sekretów (generator jej nie potrzebuje, bo nie przenosi treści sekretów).
Diff i merge. Profile. Interfejs. Hooki jako element biblioteki.

## Konsekwencje

Każdy przenoszony fragment przechodzi czyszczenie według ADR 0004: ścieżki, nazwy realnych
agentów, odniesienia do pracodawcy, nazwy zmiennych z sekretami.

Przenoszone są algorytmy, nie pliki. W generatorze parser frontmattera i serializacja TOML
siedzą w jednym pliku razem z logiką mapowania Claude na Codeksa. W aplikacji parser jest
w `adapters/shared`, a mapowanie w `adapters/claude-code` i `adapters/codex` osobno.

Przenoszone są też klasy testów, nie same asercje. Asercje generatora mówią o generatorze.
Klasy (atomowość, idempotencja, nienaruszalność obcych sekcji, zachowanie przy EACCES w połowie
zapisu, CRLF równa się LF, walidacja wyniku niezależnym parserem) mówią o problemie i zostają.
