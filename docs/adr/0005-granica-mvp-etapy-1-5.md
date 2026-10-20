# ADR 0005: Granica MVP to Etapy 1 do 5

Status: zaakceptowane (decyzja właściciela produktu, 2026-10-20)
Data: 2026-10-20

## Kontekst

Wymagania źródłowe wyliczają jedenaście etapów (0 do 10). Nie mówią, gdzie kończy się MVP.
Właściciel rozstrzygnął: MVP to Etapy 1 do 5, Etapy 6 i 7 po MVP, Etapy 8 do 10 domykają
wydanie.

## Rozważane opcje

**MVP do Etapu 4 (eksport).** Dawałoby import i eksport, ale bez synchronizacji
z bezpieczeństwem, czyli bez planu zmian, backupu, weryfikacji i cofania. Produkt, który pisze
do konfiguracji użytkownika bez tych mechanizmów, łamie założenia 7 i 8 z wymagań. Nie jest to
więc mniejszy MVP, tylko niebezpieczny.

**MVP do Etapu 7 (historia i profile).** Pełniejszy produkt, ale Etapy 6 i 7 (scalanie,
historia, profile) są wartościowe dopiero wtedy, gdy podstawowy przepływ działa i jest używany.
Dołożenie ich przed pierwszym użyciem to budowanie na przypuszczeniach.

**MVP do Etapu 5 (synchronizacja z bezpieczeństwem).**

## Decyzja

MVP to Etapy 1 do 5: szkielet, biblioteka, import z obu narzędzi, eksport z adapterami,
synchronizacja z bezpieczeństwem.

Granica jest w dobrym miejscu, bo Etap 5 jest pierwszym momentem, w którym produkt rozwiązuje
cały problem z wizji wymagań: użytkownik nie kopiuje plików ręcznie, a aplikacja odpowiada
za import, normalizację, konwersję, synchronizację, wykrywanie konfliktów i bezpieczny eksport.
Przed Etapem 5 część tego jest zrobiona, ale użytkownik nadal nie może bezpiecznie zapisać.

## Konsekwencje

Historia i rollback muszą istnieć w MVP w ograniczonej formie, mimo że Etap 7 jest po MVP:
Etap 5 wymaga backupu, weryfikacji i cofania nieudanej synchronizacji. Rozwiązanie: content store
i log operacji wchodzą w Etapie 2 jako warstwa danych, a Etap 7 dodaje do nich interfejs
(przeglądanie, porównywanie, przywracanie wybranej wersji). Dlatego pytanie o retencję historii
musiało być rozstrzygnięte przed Etapem 2, a nie w Etapie 7 (ADR 0027).

MVP nie ma: scalania i rozwiązywania konfliktów treści (użytkownik widzi konflikt i wybiera
wersję, ale nie scala jej linia po linii), profili, widoku historii, dashboardu z agregatami.

MVP nie jest wydaniem opisanym jako gotowe. Etapy 8 do 10 (dopracowanie UI, testy
i bezpieczeństwo, dokumentacja i build instalacyjny) są warunkiem wydania, co jest zgodne
z zasadą 15 z wymagań: nie pozostawiać atrap funkcjonalności w wydaniu opisanym jako gotowe.
