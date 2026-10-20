# ADR 0024: `~/.agents/skills` jako możliwa lokalizacja, mimo że dziś nie istnieje

Status: zaakceptowane (odpowiedź właściciela produktu na pytanie 1 z Etapu 0, 2026-10-20)
Data: 2026-10-20

## Kontekst

Codex ma drugi, starszy root skilli: `~/.agents/skills`. Nie ma go w `config.toml`, jest wbudowany,
i Codex czyta go obok `~/.codex/skills`.

Audyt Etapu 0 nie zobaczył tego katalogu i zgłosił niepewność, bo w `~/.agents` został wyłącznie
`.skill-lock.json` z 27 lipca. Przyczyna wyszła po audycie: katalog został **usunięty sześć godzin
przed audytem**, przy ujednolicaniu konfiguracji. 128 wpisów ze snapshotu z lipca zarchiwizowano
do `~/.claude/backups/agents-skills-20261020-061838.tar.gz` (369 MB) i katalog usunięto na wyraźną
zgodę właściciela.

Dowód, że Codex faktycznie ten root czytał, jest twardy: dopóki katalog istniał, w drzewie skilli
Codeksa było **55 zduplikowanych nazw**, każda w dwóch wersjach - żywej z `~/.claude` i starej
z tamtego roota. Po usunięciu duplikatów jest zero.

Co potwierdziłem odczytem 2026-10-20 po otrzymaniu odpowiedzi: archiwum istnieje i ma 369 576 713
bajtów, `~/.agents` i archiwum mają ten sam czas modyfikacji (06:19), a drzewo skilli Codeksa ma
dziś 154 katalogi i zero zduplikowanych nazw. Liczby 128 i 55 pochodzą z obserwacji właściciela
sprzed usunięcia i nie da się ich już zweryfikować, bo root nie istnieje; stan po usunięciu
zgadza się z tym opisem.

## Rozważane opcje

**Pominąć ten root, bo dziś nie istnieje.** Najtańsze i błędne. Aktualizacja Codeksa może go
odtworzyć, a wtedy aplikacja pokazywałaby użytkownikowi niepełny obraz jego konfiguracji, nie
wiedząc o tym. To najgorszy rodzaj błędu w produkcie, którego całym zadaniem jest pokazanie,
co gdzie jest skonfigurowane.

**Traktować jako możliwą lokalizację, obsługiwaną tak samo jak każdy inny root.**

## Decyzja

`~/.agents/skills` jest wpisem w tabeli kandydatów warstwy lokalizacji (ADR 0022), z rolą
"skille" i narzędziem Codex. Obsługa jest taka sama jak każdego innego roota:

1. Root nieistniejący jest zwracany jako kandydat z informacją, że go nie ma, nie pomijany
   po cichu. Użytkownik widzi, gdzie aplikacja szukała.
2. Element występujący w dwóch rootach tego samego narzędzia jest raportowany jako duplikat
   międzyrootowy, z informacją, który jest aktywny. To jest dokładnie ten przypadek, który dał
   55 zduplikowanych nazw, i jest wartością samą w sobie: dziś użytkownik nie ma gdzie tego
   zobaczyć.
3. Diagnostics pokazuje pojawienie się roota, którego wcześniej nie było, jako zmianę stanu
   środowiska, bo może pochodzić z aktualizacji narzędzia, a nie z działania użytkownika.

Archiwum `agents-skills-20261020-061838.tar.gz` jest dostępne do wglądu w strukturę przy Etapie 3,
gdyby fixture'y wymagały odwzorowania realnego układu tego roota. **Nie rozpakowywać bez potrzeby**
(369 MB), i obowiązuje ADR 0004: nic z niego nie wchodzi do repozytorium jako fixture.

## Konsekwencje

Koszt: jeden wpis w tabeli lokalizacji, jedna dodatkowa odpowiedzialność (duplikaty międzyrootowe)
i testy z podstawionym środowiskiem, w których root raz istnieje, a raz nie. Niewielki, bo warstwa
lokalizacji była projektowana pod wiele rootów na narzędzie (ADR 0022).

Wzmacnia ryzyko R4 (dryf formatów narzędzi) i jednocześnie jest dowodem, że mitygacja jest
właściwa. Ścieżki obu narzędzi zmieniają się szybciej niż ich dokumentacja, a root może zniknąć
i wrócić bez udziału użytkownika. Dlatego warstwa lokalizacji raportuje też to, czego nie znalazła,
a nie tylko to, co znalazła.

Osobny wniosek procesowy, wart zapisania: audyt, który zgłosił niepewność zamiast dopasować
obserwację do briefu, doprowadził do ustalenia przyczyny. Odwrotna kolejność (przyjęcie briefu
jako prawdy o teraźniejszości) dałaby ADR opisujący katalog, którego nikt by nie szukał.
