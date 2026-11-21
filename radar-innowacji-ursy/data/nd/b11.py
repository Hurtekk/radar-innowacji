D={}
D['n57']=dict(typ='Projekt B+R',trl=6,tb='Strona opisuje opracowane dodatki i ich parametry (obniżenie dawek o 30–50%, formulowanie w 20°C zamiast 60°C), ale nie podaje testów polowych ani sprzedaży. Technologia sprawdzona w skali pilotażowej to TRL 6 (zakres 5–7, niska pewność).',
 opis='ZPH AGROMIX (Szybka Ścieżka POIR, 2016–2019) opracował wielofunkcyjne dodatki (adiuwanty) do herbicydów, fungicydów i insektycydów, które zwiększają ich skuteczność i stabilność, są bezpieczne dla środowiska i szybko ulegają biodegradacji.',
 zast='Ochrona roślin przy obniżonych o 30–50% dawkach środków i mniejszym zużyciu energii cieplnej przy ich wytwarzaniu. Głównymi odbiorcami są producenci rolni, a korzyścią mniejsze obciążenie środowiska chemią.')
D['n59']=dict(typ='Program edukacyjny',trl=0,tb='Kurs programowania, nie technologia, więc TRL nie ma zastosowania.',
 opis='Bezpłatny kurs podstaw programowania w JavaScript na platformie MOOC (Uniwersytet Szczeciński), w wersji polskiej i angielskiej, dostosowany dla osób z niepełnosprawnością słuchu i wzroku. Łączy teorię z zadaniami w interaktywnym środowisku i kończy się egzaminem oraz certyfikatem.',
 zast='Osoby chcące zdobyć i potwierdzić podstawowe umiejętności IT, zwłaszcza w zawodach deficytowych.')
D['n61']=dict(typ='Projekt B+R',trl=7,tb='Zrealizowano wersje przenośną i stacjonarną z trzema trybami pracy, zaprojektowane w całości w Polsce dla służb. Gotowy sprzęt dla użytkowników końcowych w ramach projektu na zamówienie państwa to TRL 7 (zakres 6–8), bez informacji o wdrożeniu u służb.',
 opis='Konsorcjum Łukasiewicz – PIAP i ITTI (2015–2020) opracowało przenośne (walizkowe) i stacjonarne zagłuszarki transmisji radiowej w zakresie 25–5900 MHz, z trybami zagłuszania ciągłego, responsywnego i analizatora widma.',
 zast='Służby obronne i bezpieczeństwa, m.in. Straż Graniczna, Policja i Siły Zbrojne: blokowanie łączności radiowej, ochrona przed zdalną detonacją ładunków, ograniczanie sterowania pojazdami i dronami oraz skanowanie widma.')
import json;json.dump(D,open('b11.json','w'),ensure_ascii=False)
