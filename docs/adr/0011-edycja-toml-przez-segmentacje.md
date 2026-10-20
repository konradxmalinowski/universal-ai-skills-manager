# ADR 0011: Edycja TOML przez segmentację, z preflightem i weryfikacją semantyczną

Status: zaakceptowane
Data: 2026-10-20

## Kontekst

Największe ryzyko techniczne projektu. Konfiguracja Codeksa (`config.toml`) jest plikiem pisanym
ręcznie przez użytkownika: w audytowanym przypadku 376 linii, kilkanaście sekcji obcych,
komentarze w preambule i nad sekcjami. Aplikacja musi zmieniać w nim wyłącznie bloki
rejestracyjne agentów i nie wolno jej przy tym zgubić ani komentarza, ani układu, ani kolejności
sekcji.

W ekosystemie JavaScriptu nie ma dobrego, format-zachowującego parsera TOML. `@iarna/toml`
i `smol-toml` parsują poprawnie, ale zapis odtwarza plik z drzewa, czyli kasuje komentarze
i formatowanie. Rust ma `toml_edit`, który ten problem rozwiązuje, ale Tauri zostało odrzucone
świadomie (ADR 0001).

Istniejący generator radzi sobie segmentowym przepisywaniem i to działa, ale obietnica "bajt
w bajt" musiała zostać osłabiona: klucz z kropką zapisany poza swoją tabelą albo komentarz
oddzielony od nagłówka pustą linią są przypisywane do segmentu według reguł segmentacji,
a nie według semantyki TOML.

## Rozważane opcje

**Przepisywać cały plik z drzewa.** Prosto i poprawnie semantycznie, ale kasuje komentarze
i formatowanie użytkownika. Nie do przyjęcia.

**Segmentacja bez dodatkowych zabezpieczeń,** czyli to, co robi generator. Działa na plikach
o strukturze "nagłówek sekcji plus klucze", ale na pliku poza tym zakresem zrobi coś
niezamierzonego, cicho.

**Segmentacja plus preflight plus weryfikacja semantyczna po zapisie.**

**Dołączona binarka `taplo`.** Rozwiązuje problem poprawnie, ale wnosi trzy binarki do paczki
instalacyjnej, ich pobieranie i weryfikację w CI, oraz uruchamianie procesu potomnego.

## Decyzja

Port `TomlEditor` z jedną implementacją w MVP (`SegmentTomlEditor`, port logiki z generatora)
i trzema mechanizmami, które zamieniają obietnicę na kontrolę:

1. **Preflight.** Przed jakąkolwiek edycją plik jest skanowany na konstrukcje poza zakresem
   segmentera (klucz z kropką poza tabelą, tablica tabel w obszarze zarządzanym, komentarz
   oddzielony pustą linią w obszarze zarządzanym). Trafienie oznacza odmowę edycji z czytelnym
   komunikatem, a nie uszkodzony plik.
2. **Weryfikacja semantyczna po zapisie.** Wynik jest parsowany niezależnym parserem
   (`smol-toml`) i porównywany z wejściem na poziomie drzewa. Wszystko poza zakresem
   zarządzanym musi być identyczne. Niezgodność odrzuca zapis, zanim cokolwiek trafi na dysk.
3. **Minimalizacja zakresu zarządzanego.** W `config.toml` zarządzamy wyłącznie blokami
   rejestracyjnymi agentów, które mają trzy linie. Cała treść agenta siedzi w osobnym pliku
   `agents/<name>.toml`, który piszemy w całości i gdzie problem zachowania formatu nie istnieje.

Ograniczenie jest udokumentowane w interfejsie, w dokumentacji użytkownika i w Diagnostics.
Nie udajemy "bajt w bajt" tam, gdzie gwarancja jest węższa.

## Konsekwencje

Preflight może odmówić edycji pliku, który dla użytkownika wygląda normalnie. To jest zamierzone:
odmowa z wyjaśnieniem jest lepsza od cichej zmiany semantyki jego konfiguracji. Diagnostics
pokazuje, co dokładnie zablokowało edycję.

Weryfikacja semantyczna kosztuje jedno dodatkowe parsowanie na zapis. Przy rozmiarach tych
plików to nic.

**Ścieżki wyjścia, w kolejności od najtańszej, gdyby ograniczenie okazało się nieakceptowalne:**

1. **Pełny sidecar.** Wyprowadzić wszystko zarządzane do osobnych plików i zostawić
   w `config.toml` absolutne minimum. Dla agentów to już działa. Ograniczenie: zależy od tego,
   co dane narzędzie pozwala wyprowadzić, a dla niektórych ustawień może być niemożliwe.
2. **`taplo` jako dołączona binarka.** Format-zachowujący edytor TOML w Ruście, wołany jako
   proces potomny. Koszt: trzy binarki w paczce, pobieranie i weryfikacja sum kontrolnych w CI,
   oraz nazwany wyłom w zasadzie "nic nie uruchamiamy" (zasada dotyczy treści importowanej,
   nie własnych narzędzi, ale wyłom trzeba zapisać).
3. **Własny parser TOML zachowujący trivię.** Pełna kontrola, koszt duży, ale zamknięty
   i policzalny: gramatyka TOML 1.0 jest niewielka i stabilna.

Decyzja o wyjściu zapada wtedy, gdy preflight zacznie odmawiać edycji na realnych plikach
użytkowników, a nie na zapas.
