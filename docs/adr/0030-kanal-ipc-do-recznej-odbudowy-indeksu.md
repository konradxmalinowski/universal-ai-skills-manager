# ADR 0030: Kanał IPC do ręcznej odbudowy indeksu

Status: zaakceptowane
Data: 2026-10-21
Rozszerza: ADR 0008 (zamknięta lista kanałów zyskuje dwa wpisy), ADR 0029 (sekcja Konsekwencje
obiecywała odbudowę dostępną ręcznie, nie mówiąc, którędy)
Źródło: zgłoszenie wykonawcy, który odmówił dopisania kanału po cichu

## Kontekst

ADR 0029 w sekcji Konsekwencje napisał, że odbudowa indeksu jest dostępna ręcznie z Diagnostics.
Nie powiedział, którędy. Lista kanałów IPC jest jawna i zamknięta (ADR 0008), więc dopisanie
kanału jest zmianą granicy zaufania, a nie szczegółem wykonawczym. Wykonawca zgłosił to zamiast
dopisać i miał rację.

Pytanie nie brzmi tylko "czy wygodnie mieć przycisk". Automatyczna ścieżka z ADR 0029 obsługuje
już przypadek uszkodzenia, więc ręczna odbudowa musi mieć własne uzasadnienie, inaczej jest
uprawnieniem bez powodu.

## Uzasadnienie: to jedyne wyjście z jednego konkretnego stanu

Triaż z ADR 0029 ma cztery przyczyny i jedną z nich jest **schemat z przyszłości**, czyli indeks
zapisany przez nowszą wersję aplikacji. Automatyczna odbudowa jest tam zakazana, bo wyrzuciłaby
log operacji, czyli jedyną rzecz nieodtwarzalną z plików (ADR 0014). Decyzja jest słuszna, ale
zostawia użytkownika, który świadomie cofnął wersję, bez żadnego wyjścia poza ponowną instalacją
nowszej wersji albo ręcznym grzebaniem w katalogu danych.

Ręczna odbudowa jest dokładnie tym wyjściem: użytkownik bierze na siebie to, czego aplikacja nie
chce zrobić za niego. Różnica nie polega na innym kodzie, tylko na tym, kto podejmuje decyzję
i czy wie, co traci.

To samo dotyczy drugiego przypadku: użytkownika, który podejrzewa rozjechany indeks, choć
aplikacja go nie odrzuciła. Mechanizm istnieje, jest przetestowany i jest tańszy niż diagnozowanie
rozjazdu, więc ukrywanie go nie ma uzasadnienia.

## Decyzja

### 1. Kanał wchodzi, w Etapie 2

Nie wcześniej, bo odbudowa czerpie z `library/`, której warstwa powstaje w Etapie 2, a w Etapie 1
dałaby pusty indeks. Do tego czasu obowiązuje procedura ręczna z dokumentacji odzyskiwania
(odstawienie pliku na bok), opisana w kryterium akceptacji Etapu 10.

### 2. Dwa kanały, nie jeden: plan i zastosowanie

```ts
'diagnostics:rebuild-index-plan'   // () => RebuildPlan
'diagnostics:rebuild-index-apply'  // (planId, confirmation) => RebuildReport
```

`RebuildPlan` zawiera: nazwę pliku, pod którą trafi obecny indeks do kwarantanny, liczbę elementów
znalezionych w `library/` do odtworzenia, jawną listę tego, czego odbudowa **nie** odzyska (wpisy
logu operacji), oraz `recoverability` samego kroku kwarantanny.

Dwa kroki, a nie jeden, z tego samego powodu co wszędzie indziej w tym produkcie: ręczna odbudowa
jest operacją destrukcyjną na istniejącym pliku, więc podlega warunkowi kopii z ADR 0028 dokładnie
tak samo jak odbudowa automatyczna. Jeśli kwarantanna jest niemożliwa, plan jest `blocked`
i `apply` odmawia. Nie ma trybu "zrób to teraz", bo nigdzie w tej aplikacji go nie ma.

### 3. Dlaczego najmocniejsze uprawnienie na liście jest bezpieczne

Kanał, który na żądanie renderera odstawia i odtwarza bazę, jest najmocniejszym wpisem na całej
liście IPC i zasługuje na osobne uzasadnienie, a nie na dopisanie do tabeli.

**Nie przyjmuje ścieżki.** Nie ma parametru, którym można by go przekierować. Main sam wylicza
`userData` i sam zna nazwę pliku indeksu. To ta sama reguła, która w ADR 0008 zlikwidowała
path traversal przez IPC: nie ma kanału, który przyjąłby ścieżkę, więc nie ma czego sprawdzać.
Skompromitowany renderer nie wymierzy tego kanału w `~/.claude` ani nigdzie indziej.

**Zasięg to jeden plik, z definicji odtwarzalny.** ADR 0014 mówi, że indeks jest odtwarzalny
z plików. Jedyny wyjątek, log operacji, jest powodem, dla którego ten kanał idzie przez
kwarantannę, a nie przez usunięcie. Najgorszy skutek wywołania to indeks w kwarantannie plus
odbudowa, czyli stan, z którego da się wrócić, a nie utrata danych.

**Wymaga dwóch wywołań i jawnego zatwierdzenia.** Jedno wywołanie niczego nie robi. Zatwierdzenie
odnosi się do konkretnego planu, więc plan przeterminowany (stan dysku zmienił się od sondy)
jest odrzucany, a nie wykonywany na nieaktualnych danych.

**Jest jednobieżny.** Odbudowa nie startuje, gdy trwa jakakolwiek inna operacja zapisu, i żadna
operacja zapisu nie startuje w trakcie odbudowy. Bez tego dwa równoległe wywołania mogłyby
odstawić indeks w trakcie synchronizacji, która właśnie na nim pracuje.

**Jest widoczny.** Każde użycie wchodzi do logu operacji jako wpis z powodem i wynikiem, więc
odbudowa wywołana bez wiedzy użytkownika nie jest niewidoczna po fakcie.

## Konsekwencje

Lista kanałów z ARCHITECTURE 7.2 rośnie o dwa wpisy, oba oznaczone jako Etap 2. Zamknięta lista
pozostaje zamknięta: to jest jej zmiana, a nie wyjątek od niej, i dlatego ma własny ADR.

Diagnostics przestaje być wyłącznie widokiem czytającym. To pierwszy widok, z którego da się
coś zmienić, więc zasada "każdy stan operacji na plikach ma swój widok" (13.1) obejmuje teraz
także jego: plan, zablokowany, trwa, powodzenie, błąd.

Przypadek "schemat z przyszłości" przestaje być ślepą uliczką, a ADR 0029 zyskuje wyjście, którego
sam nie dawał. To jest realna poprawka tamtej decyzji, nie dodatek do niej.

Koszt: dwa kanały, ich schematy, testy kontraktowe i obsługa w Diagnostics. Alternatywa, czyli
jeden kanał bez planu, byłaby tańsza o jeden schemat i niespójna z każdą inną operacją niszczącą
w tej aplikacji, więc ta oszczędność kosztowałaby więcej, niż daje.
