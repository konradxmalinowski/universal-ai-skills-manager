# Ikony aplikacji

Pusto celowo. Nazwa produktu widoczna dla uzytkownika i ikona nie sa jeszcze
rozstrzygniete (ARCHITECTURE 13.3, sekcja 15 punkt 6). Do czasu decyzji build
wychodzi z domyslna ikona Electrona, a raport diagnostyczny mowi o tym wprost
(`appIcon: "placeholder"`) zamiast to przemilczec.

Gdy decyzja zapadnie, tu trafia:

- `icon.icns` - macOS,
- `icon.ico` - Windows, minimum 256x256,
- `icon.png` - Linux, 512x512 (electron-builder wygeneruje mniejsze rozmiary),
- ikona okna, jesli ma byc inna niz ikona aplikacji.

Po dolozeniu plikow `electron-builder` znajdzie je sam przez `buildResources`.
Trzeba wtedy zmienic `appIcon` w `src/main/ipc/handlers/diagnostics.ts`
na `provided`.
