# Radar innowacji

Narzędzie do wyszukiwania, opisywania i oceniania **istniejących** polskich innowacji (prototyp na HackNation 2026).
Wynik to jeden samodzielny plik `dist/index.html`.

## Struktura repo

```
data/                      dane źródłowe (JSON), wstrzykiwane do aplikacji przy budowaniu
  records/
    ncbr-projects.json     190 projektów z bazy sukcesów NCBR (fakty ze źródła: tytuł, beneficjent, program, budżet…)
    assessments.json       opisy, rodzaj innowacji, TRL i poziom wdrożenia (wdr 1–5 + uzasadnienie wb) – OCENA AUTORÓW, klucz = id rekordu
    detected-feed.json     migawka kanału „wykryte” (odświeżana przez collector/)
  reference/               programy NCBR, partnerzy, publiczne dane kontaktowe instytucji i firm
  geo/                     miejscowości, środki województw, kontury województw (SVG path)
src/
  js/                      kod aplikacji; numer w nazwie = kolejność w skrypcie (10 logika, 20 dane/lokalizacje, 40+ interfejs)
  styles/                  main.css, overrides.css i methodology.css (kolejność: STYLES w build.py)
  templates/index.html     szkielet strony z ekranem startowym
scripts/build.py           składa src/ + data/ w dist/
dist/                      wynik budowania (index.html, script.js)
collector/                 kolektor nowych projektów (Node 20+), feed/feed.json
.github/workflows/         codzienne uruchamianie kolektora
archive/authoring/         jednorazowe materiały z ręcznego opisywania rekordów (nie są częścią builda)
```

## Budowanie

```
python scripts/build.py
```

Potrzebny jest tylko Python 3 (bez zależności). Skrypt waliduje JSON-y, ostrzega o rekordach bez oceny
(takie rekordy nie trafiają do radaru) i zapisuje `dist/index.html` oraz `dist/script.js`.

## Dodawanie i zmiana rekordów

- Nowy projekt NCBR: dopisz obiekt do `data/records/ncbr-projects.json` (kolejne `id`, np. `n191`)
  oraz wpis o tym samym id w `data/records/assessments.json` (`typ`, `trl`, `tb`, `wdr`, `wb`, `opis`, `zast`). Potem build.
  `wdr` to poziom rzeczywistego użycia 1–5 (skala w metodologii oceny), a `wb` to jego krótkie uzasadnienie na podstawie źródła.
- **Id rekordu jest stabilne** – nie zmieniaj ani nie przenumerowuj istniejących, bo odwołują się do nich oceny i zapisany stan użytkowników.
- Rekord bez wpisu w `assessments.json` jest pomijany (obecnie `n58` i `n60`).

## Skąd są dane
- Pozycje pochodzą z publicznej Bazy sukcesów beneficjentów NCBR (https://www.gov.pl/web/ncbr/). Każda pozycja ma link do swojej strony tam; pozycje bez źródła nie trafiają do radaru.
- Opisy, rodzaj innowacji i **TRL są oceną autorów na podstawie strony źródłowej**, a nie daną ze źródła (patrz „Metodologia oceny” w aplikacji).
- Konta w `src/js/22-demo-accounts.js` są demonstracyjne, dane fikcyjne (oznaczone DEMO).
- Kontury województw (`data/geo/voivodeship-outlines.json`) pochodzą z GeoJSON `ppatrzyk/polska-geojson`; **licencję sprawdź przed publikacją**.

## Kolektor

Opis w [collector/README.md](collector/README.md). Aplikacja przy starcie próbuje pobrać `feed/feed.json`
(względem adresu strony); bez serwera działa wbudowana migawka z `data/records/detected-feed.json`.
