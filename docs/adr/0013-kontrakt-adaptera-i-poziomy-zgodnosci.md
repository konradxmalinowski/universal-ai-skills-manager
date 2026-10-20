# ADR 0013: Kontrakt adaptera z deklarowanymi zdolnościami zamiast domniemania

Status: zaakceptowane, rozszerzone przez ADR 0028
Data: 2026-10-20

> Rozszerzenie wprowadzone przez ADR 0028: kontrakt ma szósty element. `plan` ustala dla każdego
> dotykanego pliku wynik `recoverability` (`recoverable` albo `blocked`), a plan z choćby jednym
> wpisem `blocked` nie jest wykonywalny. Nie jest to piąty stopień verdyktu `capabilities`:
> zgodność opisuje element i jest wyliczana bez I/O, a możliwość kopii opisuje plik na dysku
> w danej chwili. Uzasadnienie w ADR 0028.

## Kontekst

Wymagania mówią: każde narzędzie obsługiwane przez osobny adapter, nowe narzędzia dodawane przez
rozszerzalną architekturę bez przepisywania aplikacji, dla każdego typu elementu zdefiniowany
poziom zgodności (pełna, częściowa, konwersja z ostrzeżeniami, brak możliwości konwersji), oraz
nie udawać poprawnej konwersji, gdy nie da się bezpiecznie zachować semantyki.

Rzeczywistość potwierdzona odczytem: agent u Claude'a to jeden plik Markdown z pięcioma kluczami,
a w Codeksie plik TOML plus wpis rejestracyjny w `config.toml`, czyli dwa miejsca. Komendy
w Codeksie nie istnieją. `color` i `memory` u Claude'a nie mają odpowiednika. Płaskie skille bez
frontmattera są u Claude'a poprawne, a w Codeksie niedopuszczalne.

## Rozważane opcje

**Zgodność jako tabela stała per typ elementu.** Prosto, ale błędnie: ten sam skill jest zgodny
w pełni albo z utratą informacji w zależności od tego, czy ma frontmatter i czy nazwa katalogu
zgadza się z `name`. Tabela stała musiałaby zakładać najgorszy przypadek dla wszystkich.

**Zgodność jako boolean "da się albo nie".** Spłaszcza cztery poziomy z wymagań do dwóch
i wymusza zgadywanie w interfejsie.

**Zgodność jako verdykt wyliczany przez adapter z konkretnego elementu.**

## Decyzja

Kontrakt `ToolAdapter` (pełna sygnatura w ARCHITECTURE sekcja 5) z pięcioma własnościami:

1. **`plan` oddzielone od `apply`.** Plan jest wartością, którą da się pokazać, zserializować,
   porównać i przetestować bez dotykania dysku. Jest też najtańszym testem idempotencji:
   `plan` po `apply` musi być pusty.
2. **`apply` dostaje `WriteGate` z zewnątrz.** Adapter nie trzyma własnego `fs` (ADR 0012).
3. **`capabilities(item)` zwraca verdykt, nie boolean.** Cztery poziomy (`full`, `partial`,
   `lossy`, `unsupported`), lista utraconych atrybutów, lista atrybutów dodanych przez adapter
   (bo cel ich wymaga), oraz powody w formie tekstu dla użytkownika.
4. **`verify` jest częścią kontraktu.** Weryfikacja czyta cel z powrotem i porównuje z planem.
   Dopiero jej wynik zamyka operację albo uruchamia rollback.
5. **`materialization` jest deklarowane.** Symlink, junction czy kopia (ADR 0015).

Zasada: adapter zna swoje narzędzie i nie zna drugiego. Konwersja idzie przez model kanoniczny:
`toCanonical` jednego, `plan` drugiego. Nigdy bezpośrednio.

Zestaw testów kontraktowych jest jeden i uruchamia się przeciw każdemu adapterowi. Nowe narzędzie
przechodzi je albo nie jest gotowe.

## Konsekwencje

Dodanie trzeciego narzędzia to jeden katalog w `adapters/` plus wpisy w tabeli lokalizacji.
Zero zmian w `core/`, zero w interfejsie poza listą narzędzi. To jest realizacja założenia 10
z wymagań, sprawdzalna kosztem dodania trzeciego adaptera.

Verdykt zgodności jest wyliczany, więc ten sam element może być zgodny inaczej po edycji.
Interfejs musi to odświeżać, a nie cache'ować bezterminowo.

Koszt wobec bezpośredniego mapowania (tak działa istniejący generator): więcej kodu i jedna
warstwa pośrednia. Przy dwóch narzędziach to koszt widoczny. Przy trzecim się zwraca, bo
bezpośrednie mapowanie wymaga n razy (n minus 1) kierunków, a model kanoniczny 2n.
