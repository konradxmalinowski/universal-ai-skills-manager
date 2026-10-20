# ADR 0023: Model kanoniczny jako semantyka plus snapshot źródła

Status: zaakceptowane
Data: 2026-10-20

## Kontekst

Wymagania: kanoniczny model konfiguracji niezależny od narzędzia, konwersja możliwie bezstratna,
oraz "Zachować oryginalne dane źródłowe, jeżeli mogą być potrzebne do odzyskania informacji
utraconych przy normalizacji".

Rzeczywistość potwierdzona odczytem obu drzew:

- Agent u Claude'a ma pięć kluczy: `name`, `description`, `model`, `color`, `memory` (wszystkie
  24 pliki mają dokładnie ten zestaw). Agent w Codeksie ma `name`, `description`,
  `developer_instructions`, opcjonalnie `model_reasoning_effort`, plus wpis rejestracyjny.
  Części wspólnej jest mniej niż połowa.
- `color` i `memory` nie mają odpowiednika w Codeksie. `model_reasoning_effort` nie ma
  odpowiednika u Claude'a jako osobne pole.
- Płaski skill bez frontmattera jest u Claude'a poprawny (13 takich plików), a w Codeksie
  niedopuszczalny.

## Rozważane opcje

**Model jako część wspólna obu narzędzi.** Najprostszy, ale gubi ponad połowę pól przy pierwszym
imporcie i nieodwracalnie. Round-trip nie działa.

**Model jako suma wszystkich pól wszystkich narzędzi.** Nie gubi nic przy dwóch narzędziach,
ale przestaje być kanoniczny: trzecie narzędzie dodaje swoje pola, a model staje się workiem
na wszystko, w którym nic nie ma znaczenia niezależnego od narzędzia.

**Model jako semantyka produktu plus snapshot źródła.**

## Decyzja

Trzy warstwy w każdym elemencie (szczegóły i pełny typ w ARCHITECTURE sekcja 4):

1. **Semantyka** - pojęcia produktu, niezależne od narzędzia: nazwa, opis, treść, głębokość
   rozumowania (`reasoningDepth` jako enum, nie nazwa modelu), zdarzenie hooka, zakres.
2. **Prezentacja i rozszerzenia** - to, co ma znaczenie w jednym narzędziu (`color`, `memory`).
   Przechowywane, ale nie udające znaczenia uniwersalnego.
3. **Snapshot źródła** - surowe pliki wejściowe, bajt w bajt, per narzędzie, plus lista
   `unmappedKeys`, czyli pól, których model nie objął.

`reasoningDepth` jako przykład, dlaczego warstwa 1 nie może być kopią pola źródłowego: Codex
nie ma rodziny modeli odpowiadającej podziałowi na modele Claude'a. Jedyna porównywalna
właściwość to głębokość rozumowania. Model trzyma intencję (`routine`, `deep`, `deepest`),
a adaptery ją rozwiązują na swoje pola. Mapowanie jest przybliżeniem i jest zadeklarowane jako
`partial` (ADR 0013), a nie przedstawiane jako równoważność.

`unmappedKeys` jest obowiązkowe, nie opcjonalne. Jeżeli adapter napotka klucz, którego nie zna,
trafia on do `unmappedKeys` i do Diagnostics. Alternatywą byłoby ciche pominięcie, które przy
narzędziach zmieniających się szybciej niż ich dokumentacja oznacza niezauważoną utratę danych.

## Konsekwencje

Element zajmuje więcej miejsca, bo trzyma treść i jej oryginał. Przy plikach Markdown rzędu
kilku kilobajtów to nieistotne.

Każda informacja utracona przy normalizacji jest odzyskiwalna, więc konwersja jest odwracalna
nawet wtedy, gdy model jej nie rozumie. To jest warunek realizacji wymagania o możliwie
bezstratnej konwersji.

Test round-trip ma dwa poziomy: na poziomie semantyki (musi się zgadzać) i na poziomie snapshotu
(musi dać się odtworzyć bajt w bajt). Drugi poziom wyłapuje błędy, których pierwszy nie widzi.

Nowe narzędzie nie rozszerza modelu, dopóki nie wnosi pojęcia o znaczeniu produktowym. Jego
specyfika idzie do warstwy 2 i 3. To jest mechanizm, który trzyma model kanoniczny w rozmiarze
po dodaniu trzeciego i czwartego adaptera.
