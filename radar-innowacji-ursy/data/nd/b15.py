D={}
D['n24']=dict(typ='Projekt B+R',trl=9,tb='Strona podaje, że produkt jest dostępny na rynku. Technologia sprawdzona w sprzedaży to TRL 9.',
 opis='Projekt przystosował tradycyjną recepturę lodów do ksylitolu (cukru brzozowego) zamiast cukru białego. Dobrano parametry technologiczne i opracowano nowe procedury produkcji, bez dodatków wspomagających; lody zachowują smak i konsystencję wersji tradycyjnej.',
 zast='Lody „Lody lubranieckie 0% cukru” dla osób, które nie mogą lub nie chcą jeść cukru białego (m.in. diabetycy) i dla chcących zmniejszyć kaloryczność deseru.')
D['n27']=dict(typ='Projekt B+R',trl=8,tb='Model oceniono w badaniu klinicznym z wynikiem (38% mniej hospitalizacji), ale strona nie podaje wdrożenia w systemie ochrony zdrowia. Zakończona walidacja w warunkach rzeczywistych to TRL 8 (zakres 7–8).',
 opis='Projekt AMULET opracował i ocenił nowy model ambulatoryjnej teleopieki nad chorymi z niewydolnością serca, łączący telemonitoring domowy, telekonsultacje i koordynację leczenia.',
 zast='Opieka ambulatoryjna nad pacjentami z niewydolnością serca. W badaniu klinicznym liczba hospitalizacji z powodu zaostrzeń spadła o 38%. Model może być przeniesiony do podstawowej opieki zdrowotnej i innych specjalności.')
import json;json.dump(D,open('b15.json','w'),ensure_ascii=False)
