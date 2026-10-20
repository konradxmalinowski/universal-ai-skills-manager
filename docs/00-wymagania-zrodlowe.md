# Universal AI Skills Manager - wymagania źródłowe

Specyfikacja przekazana przez właściciela produktu 2026-10-20. Dokument źródłowy:
architektura i plan etapów muszą się do niego odnosić, nie zastępować go.

## Wizja

Aplikacja desktopowa do zarządzania skillami, agentami, komendami, instrukcjami, regułami
i wybranymi konfiguracjami różnych narzędzi AI z jednego miejsca.

Problem: rozproszenie konfiguracji między narzędziami. Użytkownik ma Claude Code z wieloma
skillami, agentami, komendami i hookami; OpenAI Codex z innym formatem konfiguracji i innym
zestawem skilli oraz agentów; potrzebę utrzymywania wspólnych instrukcji w obu; potrzebę
kopiowania, eksportowania, scalania i wersjonowania; różnice formatów, których nie rozwiążą
symlinki; oraz prywatne konfiguracje, tokeny, certyfikaty i serwery MCP, których nie można
bezmyślnie współdzielić.

Użytkownik nie powinien ręcznie kopiować plików między katalogami narzędzi AI. Aplikacja
odpowiada za import, normalizację, konwersję, synchronizację, wykrywanie konfliktów
i bezpieczny eksport. Docelowo wiele narzędzi; pierwsza wersja to Claude Code i OpenAI Codex.

## Założenia

1. Lokalna aplikacja desktopowa.
2. Dane użytkownika domyślnie zostają na jego komputerze.
3. Backend chmurowy nie jest wymagany w MVP.
4. Biblioteka konfiguracji niezależna od formatu konkretnego narzędzia.
5. Każde narzędzie obsługiwane przez osobny adapter.
6. Konwersja jawna, testowalna i możliwie bezstratna.
7. Aplikacja nie może po cichu nadpisywać istniejących plików.
8. Import i synchronizacja bezpieczne oraz odwracalne.
9. Wspierane funkcje wynikają z rzeczywistych formatów i dokumentacji, nie z przypuszczeń.
10. Nowe narzędzia dodawane przez rozszerzalną architekturę, bez przepisywania aplikacji.

Bez zbędnego backendu, systemu kont, bazy w chmurze i mikroserwisów.

## Funkcjonalności

### Centralna biblioteka
Przechowuje: skills, agents, commands, global instructions, project instructions, rules,
hooks, wspierane ustawienia narzędzi, referencje i pliki pomocnicze powiązane ze skillami,
oraz zestawy konfiguracji (profiles/bundles).

Każdy element ma metadane: nazwa, opis, typ, wersja, źródło importu, obsługiwane narzędzia,
status synchronizacji. Nie zakładać, że każdy element można przenieść do każdego narzędzia.

### Import
Import istniejącej konfiguracji Claude Code i Codeksa; wybór katalogu albo pojedynczych
plików; przegląd znalezionych elementów przed importem; wykrywanie duplikatów i różnic między
wersjami; pomijanie wybranych elementów; zachowanie oryginalnych plików bez modyfikacji.

Import nie może traktować wszystkich plików Markdown jako skilli. Rozróżniać strukturę
katalogów, metadane, pliki pomocnicze, konfiguracje i inne zasoby.

### Eksport
Pojedynczy skill, wybrany agent lub komenda, zestaw elementów, pełna biblioteka. Do formatu
obsługiwanego przez wybrane narzędzie, do wybranej lokalizacji, z podsumowaniem zmian przed
zapisaniem plików. Eksport do ZIP lub repozytorium Git jako kolejna funkcja, o ile nie opóźni
podstawowego przepływu importu i synchronizacji.

### Synchronizacja
Użytkownik wybiera elementy i narzędzia docelowe. Aplikacja musi: odczytać aktualny stan
źródła i celu; określić, które pliki zostaną utworzone, zmodyfikowane lub usunięte; wyświetlić
plan zmian; zidentyfikować konflikty; pozwolić zatwierdzić operację; wykonać synchronizację;
zweryfikować rezultat; zapisać historię operacji.

Nie usuwać plików docelowych tylko dlatego, że nie ma ich w bibliotece. Usuwanie
synchronizowanych elementów wymaga jawnej polityki i potwierdzenia.

### Scalanie i porównywanie
Porównywanie dwóch wersji konfiguracji. Interfejs wskazuje: nowe, usunięte i zmodyfikowane
pliki, konflikty, zmiany możliwe do automatycznego scalenia, elementy wymagające decyzji
użytkownika. Dla Markdown, JSON i TOML odpowiednie strategie porównywania.

Przy sprzecznych instrukcjach albo różnicy struktury nie rozwiązywać konfliktu losowym
wyborem wersji. Zachować oryginały, umożliwić sprawdzenie wyniku przed zastosowaniem.

### Historia i wersjonowanie
Przeglądanie historii zmian, porównywanie wersji, przywracanie poprzedniej wersji, cofnięcie
operacji synchronizacji, informacja kiedy i do jakiego narzędzia wyeksportowano konfigurację.

Najpierw prosty lokalny mechanizm historii. Integracja z Git jako dodatkowa warstwa;
aplikacja nie może wymagać ręcznej obsługi Git do podstawowych operacji.

### Profile i zestawy
Zestawy typu General Development, Backend, Frontend, DevOps, Security, School Projects.
Profil definiuje wybrane skille, agentów, komendy i reguły. Eksport całego zestawu do jednego
albo kilku narzędzi jednocześnie. Profile nie mogą przypadkowo przenosić prywatnych sekretów
ani konfiguracji specyficznych dla środowiska.

## Moduły

Library, Import, Export, Normalization, Tool adapters, Synchronization, Diff and merge,
History and rollback, Profiles, Security, Settings, Diagnostics.

Moduły są częścią jednej aplikacji, nie osobnymi usługami sieciowymi.

## Model kanoniczny i adaptery

Kanoniczny model konfiguracji niezależny od narzędzia. Każdy adapter odpowiada za: wykrywanie
lokalizacji konfiguracji, import, parsowanie i walidację, mapowanie do modelu kanonicznego,
określenie możliwości eksportu, konwersję do formatu docelowego, zapis zmian, weryfikację
rezultatu.

Nie zakładać, że narzędzia mają identyczne formaty agentów, komend, hooków, instrukcji
i konfiguracji. Agent w jednym narzędziu może być plikiem Markdown, w drugim wymagać TOML
plus wpisu rejestracyjnego. Niektóre ustawienia nie mają odpowiednika. Niektóre funkcje są
dostępne tylko w jednym narzędziu.

Dla każdego typu elementu zdefiniować poziom zgodności: pełna, częściowa, konwersja
z ostrzeżeniami, brak możliwości konwersji. Jeżeli nie można bezpiecznie zachować semantyki,
nie udawać poprawnej konwersji. Zachować oryginalne dane źródłowe, jeżeli mogą być potrzebne
do odzyskania informacji utraconych przy normalizacji.

## Bezpieczeństwo

Wymaganie architektoniczne, nie dodatek na końcu. Aplikacja ma dostęp do katalogów, które
mogą zawierać sekrety.

- Nie wysyłać zawartości lokalnych plików na zewnętrzne serwery.
- Nie zapisywać tokenów w logach.
- Nie wyświetlać sekretów w podglądach diffów.
- Nie kopiować sekretów do wspólnej biblioteki.
- Rozdzielić konfigurację publiczną, prywatną i zależną od projektu.
- Domyślnie wykluczać pliki credentials, certyfikaty prywatne i pliki z tokenami.
- Nie wykonywać importowanych skryptów ani hooków.
- Nie uruchamiać kodu znalezionego w importowanym repozytorium.
- Traktować zawartość importowanych skilli i repozytoriów jako niezaufane dane.
- Zapobiegać path traversal, zapisowi poza dozwolonym katalogiem i niekontrolowanemu
  nadpisywaniu plików.
- Nie modyfikować konfiguracji użytkownika bez wyraźnego zatwierdzenia.
- Przed operacjami destrukcyjnymi wykonywać backup.
- Zapewnić odtworzenie plików po nieudanej synchronizacji.

Bez automatycznej synchronizacji MCP między narzędziami, dopóki nie zostaną zaprojektowane
reguły bezpieczeństwa i zakresów. Konfiguracja globalna i projektowa muszą być rozróżniane;
nie przenosić automatycznie serwerów MCP specyficznych dla jednego środowiska do konfiguracji
globalnej drugiego narzędzia.

## Interfejs

Dark mode domyślnie, jasny jako opcja. Czytelna typografia, dopracowane odstępy i hierarchia,
subtelne animacje, wyraźne stany ładowania, sukcesu, ostrzeżeń i błędów. Bez zbędnych
gradientów, przesadnych efektów i generycznego wyglądu AI. Dobre działanie na mniejszych
ekranach. Dostępność i obsługa klawiatury.

Widoki: Dashboard, Skills Library, Agents, Commands, Rules, Profiles, Sync Center,
Diff Viewer, Import Wizard, History, Settings. Nie wszystkie w pierwszym etapie, ale
architektura ma pozwalać dodawać je stopniowo.

Najważniejsze przepływy muszą rzeczywiście działać, nie tylko dashboard ma wyglądać.

## Etapy

- **0 Audyt i plan** - stan repozytorium, technologie, zasady, ryzyka, architektura,
  struktura katalogów, plan etapów, granice MVP. Rezultat: dokument architektury i plan.
- **1 Szkielet** - aplikacja desktopowa, frontend i lokalny silnik, routing, design system,
  konfiguracja środowiska, linting, formatowanie, testy, build.
  Akceptacja: uruchamia się lokalnie i daje się zbudować.
- **2 Biblioteka** - model kanoniczny, zapis i odczyt, lista, wyszukiwanie, filtrowanie,
  szczegóły, edycja, walidacja, import pojedynczego elementu z pliku, metadane i pliki
  powiązane. Akceptacja: tworzenie, edycja, wyszukiwanie i usuwanie z potwierdzeniem operacji
  destrukcyjnych.
- **3 Import Claude Code i Codex** - rzeczywiste formaty, wykrywanie katalogów, parsery
  i walidacja, kreator importu, podsumowanie, wykrywanie duplikatów, wykluczanie sekretów.
  Akceptacja: import rzeczywistych konfiguracji bez modyfikowania źródła.
- **4 Eksport i adaptery** - eksport do obu narzędzi, mapowanie formatów, walidacja
  i ostrzeżenia o utracie zgodności, podgląd plików. Akceptacja: obsługiwane elementy
  eksportują się, nieobsługiwane są jawnie oznaczane.
- **5 Synchronizacja i bezpieczeństwo** - wybór celów, plan operacji, diff przed zapisem,
  backup, bezpieczne zapisy, obsługa błędów, weryfikacja po synchronizacji, cofanie.
  Akceptacja: brak cichego nadpisywania, błędna operacja do odtworzenia lub wycofania.
- **6 Porównywanie i scalanie** - porównywanie wersji, rozwiązywanie konfliktów, selektywne
  przyjmowanie zmian, konflikty semantyczne, testy nietypowych przypadków.
- **7 Historia i profile** - historia, przywracanie, profile, eksport zestawów.
- **8 Dopracowanie UI i UX** - przegląd przepływów, usunięcie niedziałających kontrolek
  i placeholderów, stany puste i błędy, responsywność, dostępność, spójność wizualna.
- **9 Testy i bezpieczeństwo** - jednostkowe, integracyjne, adaptery na fixture'ach, import
  i eksport, konfliktowe synchronizacje, backup i rollback, ścieżki ze spacjami i znakami
  specjalnymi, brak uprawnień, uszkodzone pliki, path traversal, ujawnianie sekretów, build
  produkcyjny.
- **10 Dokumentacja i wydanie MVP** - README, instalacja i uruchomienie, architektura,
  obsługiwane formaty, ograniczenia konwersji, backup i odzyskiwanie, build instalacyjny,
  weryfikacja instalacji od zera.

## Strategia testowania

Testy obejmują rzeczywiste zachowanie, nie istnienie komponentów. Fixture'y dla: poprawnych
skilli, skilli z dodatkowymi plikami, niepoprawnych metadanych, agentów o różnych formatach,
konfiguracji z nieobsługiwanymi polami, duplikatów, konfliktów między wersjami, brakujących
katalogów, niedostępnych plików, potencjalnych sekretów, nietypowych ścieżek, niepełnej lub
przerwanej synchronizacji.

Testować idempotencję: powtórna synchronizacja bez zmian nie powoduje modyfikacji.
Nie używać prawdziwych tokenów ani prywatnej konfiguracji użytkownika w testach.

## Zasady pracy

1. Pracować etapami, aktualizować plan po każdym etapie.
2. Przed modyfikacją istniejących plików sprawdzać ich stan.
3. Nie usuwać istniejących danych bez jednoznacznej zgody.
4. Nie instalować zależności bez uzasadnienia.
5. Nie tworzyć fikcyjnych integracji.
6. Nie deklarować funkcji jako ukończonej, jeśli działa tylko interfejs.
7. Każdy istotny moduł ma testy.
8. Każda operacja na plikach ma jasne granice i obsługę błędów.
9. Po każdym etapie raport: co powstało, co przetestowano, jakie problemy zostały, jaki
   następny krok.
10. Nie ukrywać ograniczeń technicznych.
11. Brak dostępu do aktualnej dokumentacji oznacza zaznaczenie niepewności, nie zgadywanie.
12. Decyzja zmieniająca architekturę, bezpieczeństwo lub zakres produktu wymaga pytania.
13. Nie pytać o drobiazgi rozstrzygalne na podstawie wymagań.
14. Nie implementować wszystkiego w jednym ogromnym pliku.
15. Nie pozostawiać atrap funkcjonalności w wydaniu opisanym jako gotowe.
16. Przejście przez etapy workflow nie jest dowodem poprawności.
