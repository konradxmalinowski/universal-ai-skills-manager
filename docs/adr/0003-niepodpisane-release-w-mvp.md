# ADR 0003: Niepodpisane wydania na GitHubie w MVP

Status: zaakceptowane (decyzja właściciela produktu, 2026-10-20)
Data: 2026-10-20

## Kontekst

Podpisywanie aplikacji desktopowych wymaga kosztów stałych: Apple Developer Program z notaryzacją
oraz certyfikat do Authenticode dla Windowsa. Właściciel nie ma ani jednego, ani drugiego
i nie zamierza ich kupować na potrzeby MVP.

## Rozważane opcje

**Kupić certyfikaty przed MVP.** Daje brak ostrzeżeń systemowych i możliwość autoaktualizacji.
Koszt roczny, plus złożoność: notaryzacja w CI wymaga sekretów w repozytorium, które jest
publiczne, więc trzeba uważać na konfigurację uprawnień workflow.

**Wydawać niepodpisane.** Zero kosztów, ale Gatekeeper na macOS i SmartScreen na Windowsie
ostrzegają, a autoaktualizacja na macOS nie działa bez podpisu.

## Decyzja

Niepodpisane wydania na GitHub Releases w MVP. Ostrzeżenia Gatekeepera i SmartScreena
są akceptowane.

## Konsekwencje

Trzy rzeczy muszą być w projekcie od początku, a nie dopisane po pierwszej skargi użytkownika:

1. README z jawną instrukcją obejścia dla macOS (`xattr -d com.apple.quarantine` albo otwarcie
   przez menu kontekstowe) i dla Windowsa (SmartScreen, "więcej informacji"). W sekcji instalacji,
   nie w FAQ.
2. Plik `SHA256SUMS` w każdym wydaniu. Bez podpisu to jedyna weryfikacja, jaką użytkownik ma,
   więc nie jest opcjonalna.
3. Autoaktualizacja wyłączona. `electron-updater` na macOS wymaga podpisanej aplikacji, więc
   włączenie jej dałoby funkcję działającą na jednym systemie z trzech. Pliki `latest.yml`
   generujemy od początku, żeby późniejsze włączenie było kwestią konfiguracji.

Workflow wydania nie potrzebuje żadnych sekretów, bo nie ma czego podpisywać. To upraszcza
publiczne repozytorium: uprawnienia ograniczone do `contents: write`.

Podpisanie i notaryzacja są w backlogu po MVP jako warunek autoaktualizacji.
