# ADR 0021: Komendy jako osobny typ w modelu, mapowane na skille przy eksporcie do Codeksa

Status: zaakceptowane
Data: 2026-10-20

## Kontekst

Claude Code ma komendy: `~/.claude/commands/*.md`, wywoływane jako `/nazwa`. Codex nie ma
odpowiednika. Potwierdzone: w `~/.codex` nie istnieje żaden katalog ani klucz konfiguracyjny
odpowiadający pojęciu komendy.

Istniejący generator mapuje komendy na skille Codeksa i deduplikuje je wobec skilli o tej samej
nazwie (wersja ze `skills/` wygrywa, komenda jest pomijana i wypisana w podsumowaniu). To rozwiązanie
działa i jest sprawdzone na realnym drzewie, gdzie dwie nazwy występują jednocześnie jako komenda
i jako skill.

## Rozważane opcje

**Komenda jako podtyp skilla w modelu kanonicznym.** Prosto przy eksporcie do Codeksa, ale gubi
informację po stronie Claude'a: przy eksporcie z powrotem nie wiedzielibyśmy, czy element ma
wylądować w `commands/` czy w `skills/`. Round-trip przestaje działać.

**Komenda jako osobny typ, z jawnym mapowaniem w adapterze Codeksa.**

**Nie obsługiwać komend w Codeksie w ogóle** (`unsupported`). Uczciwe, ale zbyt ostrożne:
mapowanie na skill zachowuje treść i opis, więc użytkownik dostaje użyteczny wynik. Traci tylko
sposób wywołania.

## Decyzja

`command` jest osobnym typem w modelu kanonicznym (`ItemKind`). Adapter Claude'a mapuje go
na `commands/<nazwa>.md`. Adapter Codeksa mapuje go na skill `<nazwa>/SKILL.md` z poziomem
zgodności `lossy` i jawnym powodem: "Codex nie ma pojęcia komendy; element będzie dostępny jako
skill, bez wywołania przez ukośnik".

Deduplikacja: gdy komenda i skill mają tę samą nazwę docelową, adapter Codeksa raportuje konflikt
w planie i nie zapisuje obu pod tą samą nazwą. Generator rozstrzyga to automatycznie (skill
wygrywa); aplikacja pokazuje to użytkownikowi, bo ma gdzie, a cicha decyzja o tym, który element
zniknie, jest dokładnie tym, czego wymagania zabraniają.

## Konsekwencje

Round-trip zachowuje typ: komenda zaimportowana z Claude'a, wyeksportowana do Codeksa i ponownie
zaimportowana z Codeksa wróci jako skill, nie jako komenda. To jest nieunikniona konsekwencja
braku odpowiednika i musi być widoczna w teście round-trip jako jawny wyjątek, nie jako błąd.

Mapowanie wymaga wygenerowania frontmattera (Codex go wymaga, a komenda Claude'a może go nie
mieć). Stosuje się więc to samo oznaczenie `descriptionOrigin: 'derived'`, co dla płaskich
skilli, razem z heurystyką opisu przenoszoną z generatora.
