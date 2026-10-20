# Fixture'y

Pusto na razie: korpus powstaje w Etapie 3, razem z parserami obu narzedzi.

Jedna regula obowiazuje tu od pierwszego pliku (ADR 0004): **zaden fixture nie
pochodzi z prawdziwej konfiguracji**. Wszystkie drzewa testowe sa pisane od zera
jako syntetyczne, nazwy w stylu `acme-*`, tresci bez znaczenia, zero sciezek do
czyjegokolwiek katalogu domowego i zero prawdziwych tokenow. Repozytorium jest
publiczne, a historia gitowa pamieta wszystko - anonimizacja po fakcie wymaga
przepisania historii, wiec taniej jest nigdy nie wpuscic tu nic realnego.

Dotyczy to takze fixture'ow "przykladowych" i zrzutow dolaczanych do zgloszen
bledow. Lista przypadkow do pokrycia jest w ARCHITECTURE sekcja 12.3.
