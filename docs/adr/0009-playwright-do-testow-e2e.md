# ADR 0009: Playwright do testów E2E Electrona

Status: zaakceptowane
Data: 2026-10-20

## Kontekst

Wymagania mówią: testy obejmują rzeczywiste zachowanie, nie istnienie komponentów, oraz
najważniejsze przepływy muszą rzeczywiście działać. Kreator importu, Sync Center, podgląd diffa
i cofanie operacji to przepływy wieloekranowe z operacjami na dysku, więc testy jednostkowe
i integracyjne ich nie pokrywają.

## Rozważane opcje

**Spectron.** Historyczne narzędzie do E2E Electrona, nieutrzymywane. Odrzucone.

**WebdriverIO z serwisem Electrona.** Działa, ale wnosi własny ekosystem konfiguracji
i sterowników.

**Playwright z `_electron`.** Oficjalne wsparcie dla Electrona, uruchamia zbudowaną aplikację
i daje dostęp do obiektów obu procesów, więc test może zajrzeć w stan main, nie tylko w DOM.
Działa na trzech systemach na runnerach GitHub Actions.

## Decyzja

Playwright.

Decydujący argument jest specyficzny dla tego produktu: test E2E musi sprawdzać nie tylko to,
co widać w interfejsie, ale i to, co stało się na dysku. Playwright pozwala w jednym teście
przygotować syntetyczne drzewo, przejść kreator importu przez interfejs, a potem sprawdzić
asercją, że pliki źródłowe nie zostały zmodyfikowane ani raz. To jest dokładnie kryterium
akceptacji Etapu 3 z wymagań.

## Konsekwencje

Testy E2E uruchamiają zbudowaną aplikację, więc wymagają wcześniejszego kroku budowania w CI.
Na Linuksie potrzebny `xvfb`.

E2E są najdroższe w utrzymaniu z wszystkich poziomów, więc ich zakres jest ograniczony do
przepływów, które naprawdę muszą działać: import, plan i wykonanie synchronizacji, podgląd
diffa, cofnięcie operacji, oraz stany błędu i puste. Walidacja pól, mapowania formatów
i heurystyki idą do testów jednostkowych i kontraktowych, gdzie są tańsze i dokładniejsze.
