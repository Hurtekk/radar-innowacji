# Radar innowacji

Narzędzie do wyszukiwania, opisywania i oceniania **istniejących** polskich innowacji (prototyp na HackNation 2026).
Wynik to jeden samodzielny plik `dist/index.html`.

## Skąd są dane
- Pozycje pochodzą z publicznej Bazy sukcesów beneficjentów NCBR (https://www.gov.pl/web/ncbr/). Każda pozycja ma link do swojej strony tam; pozycje bez źródła nie trafiają do radaru.
- Opisy, rodzaj innowacji i **TRL są oceną autora na podstawie strony źródłowej**, a nie daną ze źródła (patrz „Metodologia oceny” w aplikacji).
- `src/seg_real.js` – wiersze z NCBR (`NCBR_ROWS`); `src/seg_rewrite.js` – opisy i oceny (`REWRITE`, klucz = id, np. `n158`).
- `src/seg_demo.js` – konta demonstracyjne, dane fikcyjne (oznaczone DEMO).
- `src/geopoly.js` – granice Polski i województw (GeoJSON z `ppatrzyk/polska-geojson`; **licencję sprawdź przed publikacją**).
- `kolektor/` – kolektor dopisujący nowe projekty (jeśli dołączony).

## Budowanie
```
python3 scripts/assemble.py   # składa src/* w dist/index.html
```
Skrypt `assemble.py`

## Nowe rekordy
`data/nowe-rekordy/*.json` – rekordy opisane ręcznie, scalane skryptem `scripts/merge.py` (ścieżki robocze do zmiany).
