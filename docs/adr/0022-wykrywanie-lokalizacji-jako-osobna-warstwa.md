# ADR 0022: Wykrywanie lokalizacji konfiguracji jako osobna, testowalna warstwa

Status: zaakceptowane
Data: 2026-10-20

## Kontekst

Ścieżki konfiguracyjne nie są uniwersalne. Na POSIX wszystko wisi pod katalogiem domowym.
Na Windowsie katalog domowy to `%USERPROFILE%`, a ustawienia pomocnicze idą do `%APPDATA%`.
Narzędzia mogą mieć więcej niż jeden root (brief wskazuje `~/.agents/skills` jako drugi root
skilli Codeksa; patrz niżej), zmienne środowiskowe mogą nadpisywać domyślne lokalizacje,
a użytkownik może chcieć wskazać dodatkowy katalog ręcznie.

Istniejący generator wylicza ścieżki z `os.homedir()` w kilkunastu miejscach jednego pliku
i nie obsługuje Windowsa. Przy trzech platformach to nie skaluje się.

## Rozważane opcje

**Ścieżki wyliczane na miejscu, tam gdzie są potrzebne.** Tak działa generator. Przy jednym
systemie i jednym kierunku to działa; przy trzech systemach, dwóch narzędziach i wielu rootach
daje rozsiane założenia, których nie da się przetestować inaczej niż uruchomieniem na docelowym
systemie.

**Jedna warstwa z tabelą kandydatów per narzędzie i per system.**

## Decyzja

`infra/platform/locations` jako osobna warstwa z jedną odpowiedzialnością: zamienić środowisko
(`PlatformEnv`: system, katalog domowy, zmienne środowiskowe, dodatkowe roots z ustawień)
na listę `DetectedRoot`.

Każdy `DetectedRoot` zawiera: nieprzezroczysty `rootId`, narzędzie, rolę roota (główny, skille,
ustawienia pomocnicze), ścieżkę, informację czy istnieje, oraz wykrytą wersję narzędzia, jeśli
da się ją odczytać. Root nieistniejący jest zwracany jako kandydat z informacją, że go nie ma,
a nie pomijany po cichu: użytkownik ma prawo wiedzieć, gdzie aplikacja szukała.

Dwie reguły:

1. **Nic poza tą warstwą nie wylicza ścieżek konfiguracyjnych.** Adaptery, serwisy i `WriteGate`
   dostają `rootId` albo ścieżkę pochodzącą z `DetectedRoot`.
2. **Warstwa jest testowana przez podstawienie środowiska,** nie przez uruchamianie na trzech
   systemach. Testy na trzech systemach w CI pokrywają to, czego podstawić nie można: linki,
   uprawnienia, wielkość liter, końce linii.

## Konsekwencje

Dodanie roota (nowa lokalizacja, nowe narzędzie, nowy system) to wpis w tabeli plus test
z podstawionym środowiskiem. Zero zmian w adapterach i serwisach.

Ta warstwa jest miejscem, w którym realizuje się rozstrzygnięcie w sprawie `~/.agents/skills`:
root jest wpisem w tabeli, mimo że dziś nie istnieje, bo aktualizacja Codeksa może go odtworzyć
(ADR 0024). Koszt to jeden wpis plus jedna dodatkowa odpowiedzialność: wykrywanie tego samego
elementu w dwóch rootach i raportowanie, który jest aktywny.

To zdarzenie jest argumentem za tą warstwą, nie tylko za jej elastycznością: lokalizacje obu
narzędzi zmieniają się szybciej niż ich dokumentacja, więc warstwa musi raportować także to,
czego nie znalazła.
