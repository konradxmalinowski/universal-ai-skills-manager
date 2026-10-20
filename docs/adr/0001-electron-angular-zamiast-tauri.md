# ADR 0001: Electron plus Angular 20 zamiast Tauri

Status: zaakceptowane (decyzja właściciela produktu, 2026-10-20)
Data: 2026-10-20

## Kontekst

Aplikacja ma być lokalną aplikacją desktopową na Windows, macOS i Linux, bez backendu.
Cała wartość siedzi w logice parsowania, normalizacji i bezpiecznego zapisu plików
konfiguracyjnych.

Umiejętności właściciela: Node.js i Angular produkcyjnie w dwóch projektach, w najnowszym
Angular 20.3. Brak Rusta i C++ w stacku. Istnieje działający generator w Node
(`sync-ai-config.js`, 1051 linii, 123 testy), którego część logiki da się ponownie użyć.

## Rozważane opcje

**Electron plus Angular 20 standalone z signals, TypeScript strict, SCSS.**
Za: cały stack w jednym języku, który właściciel zna produkcyjnie. Ponowne użycie kodu
generatora bez przepisywania na inny język. Dojrzałe narzędzia do pakowania na trzy platformy
(`electron-builder`) i do testów E2E (Playwright ma wsparcie dla Electrona). Ogromna liczba
bibliotek do parsowania formatów.
Przeciw: rozmiar paczki rzędu 100 MB i więcej, zużycie pamięci, moduły natywne wymagające
przebudowy per platforma i architektura, oraz brak dobrego format-zachowującego parsera TOML
w ekosystemie JavaScriptu.

**Tauri plus dowolny frontend.**
Za: paczka rzędu kilku MB, mniejsze zużycie pamięci, a przede wszystkim `toml_edit` w Ruście,
który rozwiązuje największe ryzyko techniczne tego projektu (edycja TOML z zachowaniem
formatowania i komentarzy) biblioteką, zamiast własnym segmenterem.
Przeciw: backend w Ruście, którego właściciel nie zna. Cała logika adapterów musiałaby powstać
od zera w nieznanym języku, a istniejący generator nadawałby się wyłącznie jako dokumentacja
zachowania. Webview systemowe różni się między platformami, co podnosi koszt testów UI.

## Decyzja

Electron plus Angular 20 standalone z signals, TypeScript w trybie strict, SCSS.

Decydujące było to, że projekt jest utrzymywany jednoosobowo, a ryzyko nieznanego języka
w warstwie, która dotyka plików konfiguracyjnych użytkownika, jest większe niż ryzyko
techniczne, które Tauri by rozwiązało. Przewaga Tauriego w jednej konkretnej sprawie (TOML)
jest realna i została odrzucona świadomie, nie przez przeoczenie.

## Konsekwencje

Dobre: jeden język w całym projekcie. Logika generatora (parser frontmattera, serializacja TOML,
segmenter `config.toml`, model własności plików, backup) jest przenoszalna. Playwright pokrywa
E2E. Node ma pełne API systemu plików, które ten produkt intensywnie wykorzystuje.

Złe i zaakceptowane: paczka instalacyjna rzędu 100 MB na platformę. Brak format-zachowującego
parsera TOML, czyli ryzyko R1 zostaje po naszej stronie i wymaga własnego rozwiązania
(ADR 0011). Moduły natywne wymagają macierzy budowania (ADR 0007, ADR 0010). Powierzchnia ataku
Electrona wymaga jawnego hartowania procesu renderera (ADR 0008), co przy Tauri byłoby
częściowo domyślne.

Gdyby ograniczenie TOML okazało się nieakceptowalne, ścieżki wyjścia są w ADR 0011. Przepisanie
na Tauri nie jest jedną z nich.
