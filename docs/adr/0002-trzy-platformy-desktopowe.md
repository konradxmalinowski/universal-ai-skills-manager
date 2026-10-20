# ADR 0002: Windows, macOS i Linux jako wymaganie twarde

Status: zaakceptowane (decyzja właściciela produktu, 2026-10-20)
Data: 2026-10-20

## Kontekst

Wymagania źródłowe mówią o lokalnej aplikacji desktopowej, nie precyzując platform. Właściciel
rozstrzygnął: trzy platformy, wymaganie twarde, nie "docelowo".

Maszyna deweloperska to macOS. Oba obsługiwane narzędzia AI działają na wszystkich trzech
systemach, więc użytkownicy aplikacji też będą na wszystkich trzech.

## Rozważane opcje

**Tylko macOS w MVP, pozostałe później.** Najtańsze w MVP, bo build lokalny wystarcza
i cztery z pięciu problemów wieloplatformowych znikają. Koszt odroczony jest jednak wysoki
i skumulowany: tryb materializacji, ACL, wielkość liter i końce linii wchodzą w architekturę,
a nie w warstwę kosmetyczną. Dodanie Windowsa po Etapie 5 oznaczałoby przeróbkę warstwy
systemu plików po tym, jak zbudowano na niej synchronizację.

**Trzy platformy od początku.** Droższe od pierwszego dnia (macierz CI, cztery cele budowania,
testy na trzech systemach), ale problemy pojawiają się wtedy, kiedy jeszcze są tanie
do rozwiązania.

## Decyzja

Trzy platformy od Etapu 1. Windows, macOS (arm64 i x64) i Linux x64.

## Konsekwencje

Cztery wpisy w macierzy CI od pierwszego dnia, nie trzy (macOS arm64 i x64 osobno z powodu
modułu natywnego, ADR 0007).

Pięć problemów wieloplatformowych wchodzi do architektury jako jawne warstwy i zdolności,
nie jako późniejsze poprawki: tryb materializacji (ADR 0015), wykrywanie lokalizacji
(ADR 0022), uprawnienia plików (ADR 0018), wielkość liter w nazwach (ADR 0017), końce linii
(ADR 0016).

Testy, których nie da się zasymulować podstawieniem środowiska (linki, uprawnienia, wielkość
liter, końce linii), muszą działać w CI na trzech systemach. To jedyny sposób, żeby wiedzieć,
że aplikacja działa na Windowsie, skoro nikt jej tam nie uruchamia na bieżąco.
