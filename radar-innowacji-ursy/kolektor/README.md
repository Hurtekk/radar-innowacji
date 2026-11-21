# Radar innowacji – codzienne wyszukiwanie

Struktura do wdrożenia na serwerze:

    index.html            – aplikacja (ta sama co w podglądzie)
    feed/feed.json        – kanał wykrytych innowacji (aplikacja pobiera go przy starcie i co godzinę)
    collector/collect.mjs – kolektor (Node 20+, bez zależności)
    collector/sources.json– lista źródeł: dopisujesz strony szkół, uczelni, instytutów
    .github/workflows/    – uruchamianie codziennie o 5:00

## Jak to działa
1. Kolektor czyta źródła (WordPress `wp-json`, RSS albo strona z listą aktualności).
2. Zostawia wpisy wyglądające na innowacje (słowa kluczowe i wykluczenia w `sources.json`),
   pomija duplikaty (po adresie i tytule) i respektuje `robots.txt` oraz odstępy między zapytaniami.
3. Nowe wpisy trafiają na górę `feed/feed.json` z datą wykrycia i adresem źródła.
4. Aplikacja dołącza je do katalogu z oznaczeniem „Wykryte” i niskim poziomem zaufania
   (źródło publiczne, jeszcze niezweryfikowane) – zatwierdza je człowiek w zakładce moderacji.

## Uruchomienie
    npm test          # testy parserów (bez sieci)
    npm run collect   # jedno uruchomienie; raport w feed/last-run.json

Cron zamiast GitHub Actions:  `0 5 * * *  cd /var/www/radar && node collector/collect.mjs`

## Ważne
- W `collect.mjs` ustaw w `UA` adres kontaktowy organizacji.
- Źródła z `"verified": false` to adresy do sprawdzenia; `last-run.json` pokaże, które nie odpowiedziały.
- `ANTHROPIC_API_KEY` (opcjonalnie) włącza ocenę przez Claude: odrzuca wpisy niebędące innowacją
  i pisze opis własnymi słowami. Bez klucza działa prosty filtr słów kluczowych.
- Kolektor zapisuje tytuł, krótki opis i link – nie kopiuje całych artykułów (prawa autorskie).
