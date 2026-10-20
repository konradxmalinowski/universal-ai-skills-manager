# ADR 0008: Renderer bez dostępu do systemu, IPC przez jawną listę kanałów

Status: zaakceptowane
Data: 2026-10-20

## Kontekst

Aplikacja czyta i wyświetla treść, która jest w całości niezaufana: skille, agentów i instrukcje
pochodzące z importu, potencjalnie z obcego repozytorium. Jednocześnie ma dostęp do katalogów,
które mogą zawierać sekrety, i prawo zapisu do konfiguracji użytkownika.

Domyślna konfiguracja Electrona historycznie pozwalała rendererowi na dostęp do Node, co w tym
produkcie oznaczałoby, że wstrzyknięcie w treści skilla ma dostęp do systemu plików.

## Rozważane opcje

**Renderer z `nodeIntegration`.** Prostsze w pisaniu, bo widok sam czyta pliki. Nie do przyjęcia:
powierzchnia ataku obejmuje całą treść, którą aplikacja ma wyświetlać, a tej treści nie
kontrolujemy.

**Renderer bez Node, most z kanałem ogólnym** (`fs:read`, `fs:write` z argumentem ścieżki).
Lepsze, ale kanał przyjmujący ścieżkę przenosi problem path traversal do walidacji stringów,
a walidacja stringów ścieżek jest zawodna (symlinki, `..`, UNC, `\\?\`, normalizacja Unicode).

**Renderer bez Node, most z jawną, zamkniętą listą kanałów operacji domenowych.**

## Decyzja

Trzy warstwy procesów z twardym podziałem:

- `main`: cała logika domenowa, adaptery, cały dostęp do dysku, baza.
- `preload`: jedyny most, `contextBridge`, jawna i zamknięta lista kanałów, walidacja schematem
  w obie strony.
- `renderer`: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`,
  `webSecurity: true`. Zero `fs`, zero `require`.

Plus trzy reguły granicy:

1. **Renderer nigdy nie przekazuje ścieżek, którym main ufa.** Lokalizacje są wykrywane w main
   i identyfikowane nieprzezroczystym `rootId`. Nie istnieje kanał przyjmujący ścieżkę absolutną.
   Jedyny wyjątek: dialog wyboru pliku i katalogu otwiera main i zwraca `rootId`, nie ścieżkę.
2. **Każdy ładunek walidowany schematem na wejściu i wyjściu.**
3. **Żaden kanał nie zwraca sekretu.** Redakcja w main, przed serializacją.

Dodatkowo: CSP bez `unsafe-inline` i `unsafe-eval`, Markdown renderowany bez surowego HTML
i bez `innerHTML`, `shell.openExternal` tylko po whiteliście schematów, zakaz `child_process`
w `core/` i `adapters/` wymuszony regułą lintu, blokada wszystkich żądań sieciowych poza
`file://` i protokołem aplikacji na poziomie `session.webRequest`.

Lista kanałów jest w ARCHITECTURE sekcja 7.2.

## Konsekwencje

Path traversal z renderera przestaje być problemem walidacji i staje się niemożliwy z definicji,
bo nie ma kanału, który przyjąłby ścieżkę. Pozostaje path traversal w danych wejściowych
(ścieżka wewnątrz skanowanego drzewa), który jest obsługiwany w `WriteGate` i przy skanowaniu
(ADR 0012).

Wymaganie "nie wysyłać zawartości lokalnych plików na zewnętrzne serwery" przestaje być obietnicą
i staje się własnością, którą da się przetestować asercją negatywną.

Koszt: każda nowa operacja wymaga kanału, schematu i handlera, czyli trzech miejsc zamiast
jednego. Przy liczbie operacji tego produktu (około dwudziestu kanałów) to koszt akceptowalny,
a lista kanałów jest przy okazji dokumentacją tego, co aplikacja w ogóle potrafi.

Ciężkie operacje (skan drzewa, hashowanie, diff) idą do osobnego procesu roboczego, bo main
obsługuje IPC i jego zablokowanie zamroziłoby interfejs dokładnie w trakcie importu.
