D={}
D['n47']=dict(typ='Projekt B+R',trl=6,tb='Strona podaje, że opracowano silnik o emisji spalin niższej o 5%, ale nie mówi o certyfikacji ani produkcji. Silnik zbudowany i zmierzony, bez potwierdzonego wdrożenia, to TRL 6 (zakres 5–7).',
 opis='Silnik lotniczy zasilany paliwem JET A1 z nowym systemem sterowania zasilaniem i zoptymalizowanym procesem spalania.',
 zast='Samoloty do transportu pasażerskiego lub towarowego; odbiorcy to klienci indywidualni i producenci lekkich samolotów. Emisja spalin jest o 5% niższa niż w obecnych silnikach lotniczych.')
D['n48']=dict(typ='Program edukacyjny',trl=0,tb='Zajęcia dla dzieci, nie technologia, więc TRL nie ma zastosowania.',
 opis='Projekt zajęć dla dzieci i młodzieży z jeleniogórskich szkół, który miał zmotywować do nauki i zdrowego stylu życia dzięki nietypowym, ciekawym zajęciom.',
 zast='Nauczyciele, rodzice i uczestnicy oraz środowisko akademickie współpracujące z lokalną społecznością. Zajęcia ograniczały monotonię tradycyjnej lekcji i rozwijały aktywność, eksperymentowanie i samoocenę uczniów.')
D['n49']=dict(typ='Projekt B+R',trl=7,tb='Strona podaje, że umożliwiono przetwarzanie olejów wcześniej nieprzydatnych do odzysku i wdrożono kategoryzację oraz selektywne magazynowanie odpadów, z udziałem firmy przemysłowej. Proces działa w środowisku operacyjnym: TRL 7 (zakres 6–8).',
 opis='Instytut Ciężkiej Syntezy Organicznej „Blachownia” i firma EKOMAX (2017–2019) opracowały nowe procesy jednostkowe regeneracji przepracowanych olejów przemysłowych. Ścieżka regeneracji zależy od stopnia zanieczyszczenia oleju.',
 zast='Odzysk silnie zemulgowanych, przepalonych i zasadzonych sadzą olejów na potrzeby produkcji środków smarowych z re-rafinowanych baz. Firmy zajmujące się gospodarką odpadami olejowymi odzyskują oleje, które wcześniej były bezużyteczne.')
D['n50']=dict(typ='Projekt B+R',trl=8,tb='Opracowano zgrabiarki, które są pierwszymi tego typu maszynami produkowanymi w Polsce, a rozwiązanie zgłoszono jako wynalazek. Gotowy, wytwarzany wyrób bez potwierdzonej szerokiej sprzedaży to TRL 8 (zakres 8–9).',
 opis='Łukasiewicz-PIMR i firma SaMASZ (2016–2019) opracowały zgrabiarki podbieraczowo-taśmowe z mechatronicznym sterowaniem zespołami roboczymi i rejestracją plonu. Maszyny dokładnie podbierają pokos i czysto zbierają materiał.',
 zast='Zbiór zielonki z trwałych użytków zielonych na paszę (świeżą, a po przetworzeniu siano, kiszonkę lub susz) i na cele energetyczne. Zapisywane dane o plonie pozwalają tworzyć cyfrowe mapy plonów dla rolników.')
D['n51']=dict(typ='Projekt B+R',trl=8,tb='W 2018 r. przeprowadzono próbę demonstracyjną na pełnoskalowej instalacji w Płocku, a mieszanki spełniły normy i dały produkt handlowy. Sprawdzona w skali przemysłowej technologia to TRL 8 (zakres 7–9).',
 opis='PKN ORLEN (2017–2020) opracował proces współuwodornienia frakcji napędowych z olejami roślinnymi w istniejących instalacjach hydroodsiarczania. Powstaje komponent oleju napędowego zawierający biowęglowodory.',
 zast='Producenci paliw: biokomponent pomaga spełniać Narodowy Cel Wskaźnikowy i wykorzystuje już istniejące instalacje rafinerii, więc nie wymaga budowy nowych.')
import json;json.dump(D,open('b9.json','w'),ensure_ascii=False)
