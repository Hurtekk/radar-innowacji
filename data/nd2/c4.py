D={}
D['technabio']=dict(typ='Projekt B+R',trl=9,tb='Źródło podaje, że firma GreenBack jest na podstawie licencji wytwórcą i dystrybutorem preparatów, czyli produkt jest w sprzedaży. To TRL 9; TRL nie jest podany w źródle.',
 opis='TechNabio to preparaty doglebowe z mikroorganizmami unieruchomionymi w mikrokapsułkach z biodegradowalnego polimeru z glonów; substancje aktywne uwalniają się powoli pod wpływem warunków środowiska. Służą do remediacji gleb i wspomagania wzrostu roślin w trudnych warunkach.',
 zast='Rolnictwo ekologiczne (głównie uprawa warzyw i owoców), dystrybutorzy nowoczesnych preparatów rolniczych oraz branża rekultywacyjna i remediacyjna.')
D['aval']=dict(typ='Prototyp',trl=5,tb='Źródło opisuje testy elementów systemu na morzu, w ośrodku w Iławie i na uczelni, bez wdrożeń. Komponenty sprawdzone w warunkach zbliżonych do rzeczywistych to TRL 5 (zakres 4–6); TRL nie jest podany w źródle.',
 opis='AVAL (Autonomous Vessel with an Air Look) to system nawigacji autonomicznego statku z dronem: kamera na dronie obserwuje otoczenie, a algorytmy AI w czasie rzeczywistym wykrywają obiekty niewidoczne dla radaru i AIS (góry lodowe, dryfujące kontenery, wieloryby).',
 zast='Armatorzy i stocznie; system ma być instalowany na statkach morskich i zastępować obserwację z pokładu przez nawigatora.')
D['airly']=dict(typ='Projekt B+R',trl=9,tb='Źródło podaje ponad 2 800 czujników w Polsce, ponad 500 tys. pobrań aplikacji i prezentację danych w rumuńskiej telewizji. Działający produkt to TRL 9; TRL nie jest podany w źródle.',
 opis='Airly to system monitoringu i 24-godzinnej prognozy jakości powietrza: sieć czujników mierzących pyły, temperaturę i wilgotność, platforma internetowa, aplikacja mobilna i panel danych, z prognozą opartą na algorytmach z elementami AI.',
 zast='Mieszkańcy, zwłaszcza osoby starsze i chorujące na układ oddechowy, planujący aktywność na zewnątrz; dane przydatne dla samorządów i mediów.')
D['safedam']=dict(typ='Prototyp',trl=6,tb='Źródło podaje obserwację systemu podczas ćwiczeń PSP FALA 2018 w Kozienicach, bez wdrożeń u klientów. Prototyp pokazany w warunkach zbliżonych do rzeczywistych to TRL 6 (zakres 5–7); TRL nie jest podany w źródle.',
 opis='SAFEDAM to system monitorowania wałów przeciwpowodziowych z użyciem dronów, danych lotniczych i satelitarnych, skanera laserowego i fotogrametrii; ma konfigurację prewencyjną i interwencyjną oraz moduł zgłoszeń od mieszkańców.',
 zast='Państwowa Straż Pożarna, samorządy i jednostki zarządzania kryzysowego oraz służby hydrologiczne przy zagrożeniu powodziowym.')
D['musicon']=dict(typ='Projekt B+R',trl=9,tb='Źródło podaje wdrożenie na rynek, zamówienia klientów i prezentacje międzynarodowe. Produkt w sprzedaży to TRL 9; TRL nie jest podany w źródle.',
 opis='Musicon to mechaniczna pomoc dydaktyczno-terapeutyczna dla dzieci będąca jednocześnie instrumentem i zabawką; mechanizm przypomina katarynkę lub pozytywkę, a dźwięki dziecko uruchamia przyciskami.',
 zast='Szkoły, przedszkola, muzea przygotowujące ekspozycje dla dzieci oraz osoby indywidualne; wspiera edukację i terapię przez muzykę. Nagrody: Bett Awards 2019, iF Design Award 2017.')
import json;json.dump(D,open('c4.json','w'),ensure_ascii=False)
