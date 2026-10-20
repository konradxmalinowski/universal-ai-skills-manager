# ADR 0026: Oba identyfikatory przechowywane, rozstrzygane per narzędzie przy eksporcie

Status: zaakceptowane (odpowiedź właściciela produktu na pytanie 3 z Etapu 0, 2026-10-20)
Data: 2026-10-20

## Kontekst

Claude kluczuje skille po nazwie katalogu, Codex po `name` z frontmattera. Rozjechanie tych dwóch
nazw jest w Claude Code w pełni legalne i występuje realnie (aliasy, w których dwa katalogi
wskazują ten sam `SKILL.md`). W Codeksie to samo rozjechanie daje element widoczny pod inną nazwą
niż u Claude'a, a dwa aliasy tego samego pliku dają dwa wpisy o tej samej nazwie.

Model kanoniczny przechowuje oba identyfikatory (`identity.slug` i `identity.declaredName`,
ADR 0023). Pytanie było o zachowanie: wymusić zgodność przy imporcie czy przechowywać oba
i rozstrzygać przy eksporcie.

## Rozważane opcje

**Wymuszać zgodność przy imporcie.** Prostszy model i prostszy eksport. Nie do przyjęcia
z konkretnego powodu: zablokowałoby zaimportowanie **poprawnego** skilla Claude'a. Rozjechany
`name` jest tam legalny, więc aplikacja odmawiałaby przyjęcia czegoś, co w narzędziu źródłowym
działa bez zarzutu. Produkt porządkujący konfigurację nie może odrzucać konfiguracji, która jest
poprawna.

**Prostować po cichu** (wyrównać `declaredName` do sluga albo odwrotnie). Cicha zmiana nazwy
elementu, czyli dokładnie to, czego wymagania zabraniają przy konwersji.

**Przechowywać oba i rozstrzygać per narzędzie.**

## Decyzja

Biblioteka przechowuje oba identyfikatory i odwzorowuje rzeczywistość wiernie, zgodnie z zasadą
snapshotu źródła (ADR 0023). Rozjechanie jest **ostrzeżeniem**, nie błędem, i jest rozstrzygane
przy eksporcie, osobno dla każdego narzędzia:

1. **Import** przyjmuje element z rozjechaną nazwą bez przeszkód i oznacza go ostrzeżeniem
   z wyjaśnieniem, co z tego wynika dla każdego celu.
2. **Eksport do Claude'a** używa sluga jako nazwy katalogu i zachowuje `declaredName` we
   frontmatterze bez zmian, bo tam rozjechanie jest nieszkodliwe.
3. **Eksport do Codeksa** daje poziom zgodności `lossy` z powodem: "element będzie widoczny pod
   nazwą z frontmattera, inną niż nazwa katalogu w Claude Code". Użytkownik widzi to w planie
   przed zapisem.
4. **Kolizja po `declaredName`** w obrębie jednego celu (dwa elementy o tym samym
   `declaredName`) jest konfliktem w planie eksportu i wymaga decyzji. Dedup aliasów po
   `realpath` przy skanowaniu (port z generatora) usuwa przypadek, w którym to fizycznie ten
   sam plik; pozostaje przypadek dwóch różnych plików deklarujących tę samą nazwę, i tego nie
   wolno rozstrzygać automatycznie.

## Konsekwencje

Round-trip zachowuje oba identyfikatory, więc element zaimportowany z Claude'a, wyeksportowany
i zaimportowany ponownie nie zmienia tożsamości. Przy wymuszaniu zgodności zmieniałby ją przy
pierwszym imporcie, nieodwracalnie.

Walidator biblioteki ma dwa różne poziomy surowości dla dwóch różnych problemów, i trzeba je
rozróżniać w kodzie i w komunikatach: kolizja wielkości liter blokuje zapis (ADR 0017, bo łamie
przenośność biblioteki między systemami plików), a rozjechanie slug kontra `declaredName` tylko
ostrzega (bo jest poprawnym stanem w narzędziu źródłowym).

Ryzyko R7 przestaje być pytaniem otwartym i staje się zwykłym ostrzeżeniem widocznym w planie
eksportu. Pozostaje jednak ryzykiem, bo użytkownik może je zignorować i dostać w Codeksie element
pod nazwą, której nie szuka. Interfejs musi to pokazywać jako konsekwencję, nie jako notkę
techniczną.
