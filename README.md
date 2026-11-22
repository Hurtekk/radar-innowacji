# Radar innowacji

Aplikacja do wyszukiwania, opisywania i oceniania istniejących polskich innowacji, stworzona na HackNation 2026.

**[Otwórz aplikację na GitHub Pages](https://hurtekk.github.io/radar-innowacyjny-zbieg/)**

Aplikacja działa w przeglądarce. Gotowy plik `dist/index.html` zawiera kod, style i dane katalogu.

## Uruchomienie

### Online

Otwórz [wersję na GitHub Pages](https://hurtekk.github.io/radar-innowacyjny-zbieg/). Nic nie trzeba instalować.

### Z pliku

Pobierz repozytorium przez **Code → Download ZIP**, rozpakuj je i otwórz `dist/index.html` w przeglądarce.

Możesz też pobrać kod przez Git:

```bash
git clone https://github.com/Hurtekk/radar-innowacyjny-zbieg.git
cd radar-innowacyjny-zbieg
```

### Przez lokalny serwer

Potrzebny jest Python 3. W głównym folderze repozytorium uruchom:

```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Wejdź na [http://localhost:8000](http://localhost:8000). Serwer zatrzymasz przez `Ctrl+C`.

Na Windows zamiast `python3` możesz użyć `py -3`.

## Praca nad aplikacją

Kod zmieniaj w `src/`, a dane w `data/`. Następnie zbuduj aplikację:

```bash
python3 scripts/build.py
```

Wystarczy Python 3, bez dodatkowych bibliotek. Skrypt sprawdza poprawność JSON-ów i generuje `dist/index.html` oraz `dist/script.js`. Rekordy bez oceny w `assessments.json` są pomijane.

Po budowaniu otwórz plik lub uruchom lokalny serwer. Jeśli aplikacja jest już otwarta, odśwież stronę.

## Struktura repozytorium

- `src/` — kod JavaScript, style i szablon strony.
- `data/records/` — projekty, oceny, rekomendacje i informacje o źródłach.
- `data/reference/` — programy NCBR, partnerzy i publiczne dane kontaktowe.
- `data/geo/` — miejscowości i dane województw.
- `scripts/` — budowanie aplikacji i kontrola spójności.
- `dist/` — gotowa aplikacja publikowana na GitHub Pages.
- `archive/authoring/` — materiały pomocnicze używane przy opracowywaniu rekordów; nie są częścią budowania.

Pliki JavaScript z `src/js/` są łączone w kolejności nazw. Kolejność arkuszy stylów określa lista `STYLES` w `scripts/build.py`.

## Dane i sposób oceny

Katalog obejmuje projekty z publicznej [Bazy sukcesów beneficjentów NCBR](https://www.gov.pl/web/ncbr/). Rekordy zawierają odnośniki do stron źródłowych.

Opisy, rodzaj innowacji, TRL i poziom wdrożenia są oceną autorów na podstawie źródeł. Nie należy traktować ich jako oficjalnych ocen NCBR. Szczegóły opisuje „Metodologia oceny” w aplikacji.

- Kontury województw pochodzą z projektu `ppatrzyk/polska-geojson`. Ich licencja wymaga sprawdzenia przed dalszą publikacją.
- `data/records/source-audit.json` zapisuje zakres i datę sprawdzenia źródła oraz krótkie fragmenty dowodów. Sam odczyt strony nie oznacza pełnej weryfikacji opisu.
- Kwoty EUR nie są porównywane z progami PLN bez udokumentowanego przeliczenia (`budget.amountPLN` i `budget.conversionSource`).
- Brak danych o zasięgu oznacza roboczą wartość neutralną i pokazanie zakresu wrażliwości oceny. Udział w programie międzynarodowym sam w sobie nie oznacza nowości światowej.
