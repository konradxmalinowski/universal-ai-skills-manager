# ADR 0016: Normalizacja końców linii w warstwie porównywania, zachowanie stylu celu przy zapisie

Status: zaakceptowane
Data: 2026-10-20

## Kontekst

CRLF kontra LF rozjedzie każdy diff i każdą obietnicę braku zmian. Biblioteka wypełniona
na Linuksie albo macOS będzie miała LF. Pliki konfiguracyjne na Windowsie mogą mieć CRLF,
bo tak je zapisał edytor użytkownika albo tak je wypakował git z `core.autocrlf`.

Bez jawnej reguły pierwsza synchronizacja na Windowsie pokazałaby diff na każdej linii każdego
pliku i przepisała wszystko, a wykrywanie dryfu raportowałoby zmianę przy każdym uruchomieniu.

## Rozważane opcje

**Ignorować problem.** Objaw: diff na wszystkim i synchronizacja, która nigdy nie jest
idempotentna na Windowsie.

**Normalizować wszystko do LF, także przy zapisie.** Spójne i proste, ale przepisuje pliki
użytkownika w sposób, o który nie prosił, i przy pierwszym uruchomieniu daje zmianę w każdym
pliku z CRLF.

**Normalizować do porównywania, zachowywać styl celu przy zapisie.**

## Decyzja

Cztery reguły:

1. Biblioteka trzyma wyłącznie LF.
2. Snapshot źródła zachowuje oryginał bajt w bajt i zapisuje wykryty styl (`lf`, `crlf`,
   `mixed`) per plik.
3. Porównywanie, hashowanie do wykrywania dryfu i diff idą na treści znormalizowanej do LF.
   Plik różniący się tylko końcami linii nie jest zmianą.
4. Zapis przywraca styl celu: jeśli plik docelowy istnieje i ma CRLF, piszemy CRLF. Jeśli nie
   istnieje, piszemy LF.

## Konsekwencje

Hash treści w modelu (`version.contentHash`) jest hashem postaci znormalizowanej, więc jest
porównywalny między systemami. Hash w snapshocie źródła jest hashem bajtów, więc pozwala odtworzyć
oryginał dokładnie. To dwa różne hashe i trzeba je nazwać różnie, inaczej ktoś je pomyli.

Styl `mixed` jest zachowywany w snapshocie, ale przy zapisie traktowany jak styl dominujący
w pliku, z ostrzeżeniem w planie. Idealne odtworzenie pliku o mieszanych końcach linii nie jest
obiecywane.

Testy: ten sam fixture w wariancie LF i CRLF musi dawać identyczny wynik normalizacji i identyczny
plan. Generator ma już taki test i jest przenoszalny bez zmian.
