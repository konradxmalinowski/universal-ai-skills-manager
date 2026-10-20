# ADR 0018: Ochrona danych na dysku bez udawania, że `chmod` działa na Windowsie

Status: zaakceptowane
Data: 2026-10-20

## Kontekst

Wymagania mówią: domyślnie wykluczać pliki credentials, certyfikaty prywatne i pliki z tokenami,
oraz nie kopiować sekretów do wspólnej biblioteki. Istniejący generator realizuje część tego
przez `chmod`: katalogi backupu `0700`, pliki `0600`, bo backupy zawierają kopię `config.toml`,
który historycznie trzymał sekret.

`chmod` na Windowsie nie znaczy nic. Node udaje, że się udało. Realizowanie wymogu ochrony
sekretów przez `chmod` oznacza, że na jednym z trzech obsługiwanych systemów ochrona jest fikcją,
a interfejs pokazuje zieloną kontrolkę.

## Rozważane opcje

**`chmod` wszędzie.** Fikcja na Windowsie, czyli naruszenie zasady 10 z wymagań (nie ukrywać
ograniczeń technicznych).

**DPAPI na Windowsie dla zaszyfrowania wrażliwych danych na dysku.** Poprawne, ale wymaga modułu
natywnego albo wołania procesu potomnego, i rozwiązuje problem, którego MVP nie ma: MVP nie
przechowuje sekretów.

**ACL na Windowsie plus `chmod` na POSIX, z jawnym raportowaniem, gdy się nie udało.**

## Decyzja

Trzy warstwy, w tej kolejności:

1. **MVP nie przechowuje sekretów.** To jest podstawowa ochrona. Elementy z trafieniem
   klasyfikatora są domyślnie wykluczone z importu i nie wchodzą do biblioteki. Problem
   szyfrowania znika, bo nie ma czego szyfrować.
2. **Katalog danych aplikacji jest ograniczony do właściciela.** POSIX: katalogi `0700`, pliki
   `0600`, ustawiane przy tworzeniu, nie po. Windows: ACL ograniczony do konta użytkownika,
   ustawiany jednorazowo na katalogu `userData` przy pierwszym uruchomieniu, przez `icacls`,
   z weryfikacją rezultatu.
3. **Gdy ustawienie ochrony nie udaje się, aplikacja mówi to wprost** w Diagnostics i nie
   twierdzi, że katalog jest chroniony. Operacja nie jest przerywana, ale stan jest widoczny.

Potrzeba ochrony dotyczy mimo wszystko backupów: backup pliku, który mógł zawierać sekret
(na przykład `config.toml`), zawiera ten sekret, nawet jeśli biblioteka go nie przyjęła.
Dlatego punkt 2 obowiązuje niezależnie od punktu 1.

DPAPI jest w backlogu jako warunek dla jakiejkolwiek przyszłej funkcji, która miałaby sekrety
przechowywać. Bez niej taka funkcja nie powstaje.

## Konsekwencje

Wywołanie `icacls` to proces potomny, czyli wyłom w zasadzie "nic nie uruchamiamy". Zasada
dotyczy treści importowanej, nie własnych narzędzi systemowych, ale wyłom jest nazwany, wołanie
nie przyjmuje żadnego argumentu pochodzącego z danych wejściowych, a jego wynik jest sprawdzany.

Użytkownik Windowsa może zobaczyć w Diagnostics, że katalog danych nie jest chroniony (na przykład
na dysku sformatowanym w FAT32, gdzie ACL nie istnieje). To jest informacja prawdziwa i przydatna,
w przeciwieństwie do milczenia.
