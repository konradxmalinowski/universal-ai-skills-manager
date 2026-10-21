# ADR 0029: Uszkodzony indeks jest odbudowywany, a odmowa startu ma widoczne okno

Status: zaakceptowane
Data: 2026-10-21
Uzupełnia: ADR 0014 (odtwarzalność indeksu przestaje być obietnicą i staje się ścieżką kodu),
ADR 0028 (odbudowa indeksu jest operacją destrukcyjną, więc obowiązuje warunek kopii)
Źródło: zgłoszenie wykonawcy po przeniesieniu migracji schematu z `probe()` do `open()`

## Kontekst

Migracja schematu przeniosła się z `probe()` do `open()`. Poprawka jest słuszna i nie jest
przedmiotem tego ADR: metoda nazwana "probe" nie ma prawa mutować schematu.

Konsekwencją było to, że `open()` rzuca `IndexStoreMigrationError`, a proces główny wypisuje
błąd na stderr i kończy się kodem 1. Wariant twardy był dobrym odruchem, bo cicha kontynuacja
na uszkodzonym indeksie jest najgorszą z opcji. Zderza się jednak z dwiema rzeczami, które sam
zapisałem:

- **`ARCHITECTURE` 13.1: każdy stan operacji na plikach ma swój widok.** Użytkownik aplikacji
  z graficznym interfejsem dostaje wyjście z kodem 1 i nie widzi nic. Stderr jest dla kogoś,
  kto uruchomił aplikację z terminala, czyli dla mniejszości, która nie jest adresatem produktu.
- **ADR 0014: baza jest odtwarzalna z plików.** Jeśli to prawda, naturalną reakcją na uszkodzony
  indeks jest jego odbudowa, nie odmowa startu. Odmowa z powodu czegoś, co potrafimy odbudować,
  jest nadmierna i zamienia zaletę architektury w niewykorzystaną obietnicę.

## Rozważane opcje

**Zawsze odmawiać startu.** Stan obecny. Bezpieczny, ale karze użytkownika za problem,
który aplikacja umie naprawić sama, i to w sposób dla niego niewidoczny.

**Zawsze odbudowywać.** Odrzucone, i to jest sedno tego ADR. Odbudowa jest bezpieczna tylko
wtedy, gdy wszystko, co indeks trzyma, da się odtworzyć z plików. ADR 0014 wymienia jeden wyjątek
i on tu decyduje: **logu operacji nie da się odtworzyć z plików.** Indeks zapisany przez nowszą
wersję aplikacji zawiera stan, którego starsza wersja nie rozumie, a odbudowa po cichu by go
wyrzuciła. To byłoby usunięcie danych pod pozorem naprawy.

**Zawsze pytać użytkownika.** Odrzucone jako domyślne: w większości przypadków jest jedna
rozsądna odpowiedź, a pytanie o nią przy starcie przerzuca na użytkownika decyzję, do której
nie ma danych.

**Triaż przyczyny, różna reakcja na różne przyczyny.**

## Decyzja

### 1. Nie ma jednego trybu awarii, bo nie ma jednej przyczyny

`open()` rozpoznaje przyczynę i zwraca ją w typowanym błędzie. Polityka reakcji nie siedzi
w `infra/`, tylko w bootstrapie procesu głównego, bo to decyzja produktowa, a nie szczegół
dostępu do bazy.

| Przyczyna | Reakcja | Dlaczego tak |
|---|---|---|
| Indeks uszkodzony, schemat nieznany, migracja nie przechodzi na danych | **Odbudowa** z plików, po kwarantannie starego pliku | Dokładnie ten przypadek, pod który ADR 0014 projektował odtwarzalność |
| Schemat z przyszłości (indeks zapisany przez nowszą wersję aplikacji) | **Odmowa** z widocznym komunikatem i propozycją aktualizacji aplikacji | Odbudowa wyrzuciłaby log operacji, czyli jedyną rzecz, której z plików odtworzyć się nie da (ADR 0014) |
| Katalog `userData` niezapisywalny, brak miejsca, brak uprawnień | **Odmowa** z widocznym komunikatem i wskazaniem ścieżki | Odbudowa wymaga zapisu, więc jest niemożliwa z tej samej przyczyny |
| Moduł natywny się nie ładuje | **Odmowa** z widocznym komunikatem | To nie jest problem danych i odbudowa go nie dotyczy |

Cicha kontynuacja nie jest reakcją na żadną z tych przyczyn. Ten element pierwotnej decyzji
zostaje bez zmian.

### 2. Odbudowa przechodzi przez kwarantannę, nie przez usunięcie

Odbudowa indeksu nadpisuje plik, który może zawierać dane, więc jest operacją destrukcyjną
i obowiązuje ją warunek z ADR 0028: **jeśli nie da się zrobić kopii, operacja nie jest
wykonywana.** Konkretnie:

1. Stary plik jest przenoszony do `userData/quarantine/index-<timestamp>.sqlite`, razem
   z plikami `-wal` i `-shm`, z uprawnieniami według ADR 0018.
2. Dopiero potem powstaje nowy indeks i startuje odbudowa z `library/`.
3. Jeśli kwarantanna się nie uda (brak miejsca, brak uprawnień), odbudowa **nie startuje**
   i aplikacja przechodzi na ścieżkę odmowy. Nie ma wariantu "usuń i spróbuj".
4. Plik w kwarantannie nie jest nigdy usuwany automatycznie. Diagnostics go pokazuje
   i stamtąd użytkownik może go usunąć sam.

Kwarantanna jest tu tym, czym w ADR 0028 jest kopia przed zapisem: jedyną rzeczą, która pozwala
powiedzieć "naprawiliśmy" zamiast "zastąpiliśmy".

### 3. Okno nie zależy od indeksu

Wymóg z 13.1 da się spełnić tylko wtedy, gdy aplikacja potrafi pokazać okno, nie mając indeksu.
Dlatego kolejność startu się odwraca: **okno powstaje przed otwarciem indeksu**, a wynik otwarcia
jest do niego wpuszczany jako stan. Odmowa startu to nie brak okna, tylko okno pokazujące powód
i to, co użytkownik może zrobić, plus ścieżkę do kwarantanny i do dokumentacji odzyskiwania.

Kod wyjścia 1 i komunikat na stderr zostają, bo CI, testy E2E i uruchomienie z terminala są
realnymi odbiorcami. Przestają jednak być jedynym kanałem. Okno jest kanałem podstawowym,
stderr dodatkowym.

Odbudowa też jest widoczna: użytkownik dostaje informację, że indeks był uszkodzony i został
odbudowany, ile elementów wczytano i czego nie dało się odzyskać (wpisy logu operacji). Nie jest
to ani błąd, ani cichy sukces. To stan, który ma swój widok, zgodnie z 13.1.

## Konsekwencje

Bootstrap procesu głównego zmienia kolejność: okno, potem indeks. To dotyczy kodu z Etapu 1
i jest zmianą w jego strukturze startu, nie dopiskiem.

`IndexStore` dostaje obowiązek rozpoznania przyczyny, czyli odróżnienia uszkodzenia od schematu
z przyszłości i od braku dostępu. Wersja schematu w rejestrze migracji wystarcza do rozpoznania
trzeciego przypadku: numer wyższy od znanego aplikacji oznacza indeks z przyszłości.

Odbudowa indeksu staje się funkcją produktu, nie tylko ścieżką awaryjną. Jest też dostępna
ręcznie z Diagnostics, bo skoro istnieje i jest przetestowana, ukrywanie jej przed użytkownikiem,
który podejrzewa rozjechany indeks, nie ma uzasadnienia.

Kryterium akceptacji Etapu 2 rozszerza się z "usunięcie pliku i restart odtwarza indeks" na cztery
przyczyny i dwie reakcje, w tym asercję negatywną: indeks ze schematem z przyszłości **nie jest**
odbudowywany.

Zapis uczciwy na koniec: w Etapie 0 napisałem w ADR 0014, że utrata indeksu kosztuje czas
przebudowy, a nie dane, nie pisząc, kto i kiedy tę przebudowę uruchamia. Obietnica bez ścieżki
kodu jest obietnicą warunkową, a warunku nie zapisałem. To ta sama luka, co w ADR 0028, gdzie
obietnica odtworzenia plików nie miała zapisanego warunku wykonalności kopii.
