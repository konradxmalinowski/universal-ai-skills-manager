# ADR 0004: Publiczne repozytorium i higiena danych testowych

Status: zaakceptowane (decyzja właściciela produktu, 2026-10-20)
Data: 2026-10-20

## Kontekst

Repozytorium będzie publiczne na GitHubie. Jednocześnie aplikacja jest projektowana przeciw
realnej konfiguracji właściciela (`~/.claude`, `~/.codex`), a część logiki jest przenoszona
z istniejącego generatora, który zawiera: ścieżki absolutne do katalogu domowego autora, nazwy realnych
agentów i skilli, odniesienia do infrastruktury pracodawcy właściciela oraz nazwy zmiennych
środowiskowych trzymających sekrety infrastruktury.

Wymagania źródłowe mówią wprost: nie używać prawdziwych tokenów ani prywatnej konfiguracji
użytkownika w testach.

## Rozważane opcje

**Repozytorium prywatne.** Znosi problem, ale właściciel zdecydował o publicznym.

**Publiczne z anonimizacją przy pierwszym pushu.** Ryzykowne, bo historia gitowa pamięta
wszystko, a anonimizacja po fakcie wymaga przepisania historii.

**Publiczne z higieną od pierwszego pliku.** Nic realnego nigdy nie wchodzi do repozytorium,
więc nie ma czego anonimizować.

## Decyzja

Publiczne repozytorium z higieną od pierwszego commita. Trzy reguły:

1. **Żaden fixture nie pochodzi z prawdziwej konfiguracji.** Wszystkie drzewa testowe są pisane
   od zera jako syntetyczne, z nazwami w stylu `acme-*` i treściami bez znaczenia. Dotyczy to
   także fixture'ów "przykładowych" i zrzutów do zgłoszeń błędów.
2. **Kod przenoszony z generatora przechodzi czyszczenie.** Zero ścieżek absolutnych do katalogu domowego autora,
   zero nazw realnych agentów i skilli, zero odniesień do pracodawcy, zero nazw zmiennych
   z sekretami. Przenoszony jest algorytm, nie jego osadzenie w konkretnej konfiguracji.
3. **Skan sekretów jako bramka w CI.** `gitleaks` na każdym PR. Narzędzie nie zastępuje
   dyscypliny, ale łapie pomyłkę.

## Konsekwencje

Korpus fixture'ów trzeba napisać, a nie skopiować, co jest realną pracą w Etapie 3. W zamian
fixture'y są czytelne dla kogoś z zewnątrz i nie zmieniają się, kiedy właściciel zmienia swoją
konfigurację. To ostatnie jest zaletą, nie kosztem: testy na realnym drzewie byłyby kruche
i nie dałoby się ich uruchomić na CI.

Zgłaszanie błędów z realnej konfiguracji wymaga od użytkowników redakcji. Diagnostics powinien
umieć wyeksportować raport z wyredagowanymi ścieżkami i nazwami, żeby nie zmuszać ich do robienia
tego ręcznie. To jest w backlogu po MVP.
