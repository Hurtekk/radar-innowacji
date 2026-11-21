D={}
D['platforma-zywnosciowa']=dict(typ='Usługa publiczna',trl=0,tb='na',
 opis='Platforma Żywnościowa to zorganizowany, regulowany rynek kontraktów SPOT dla wybranych produktów rolno-spożywczych, stabilizujący dochody i ograniczający ryzyko cenowe i handlowe. Przetestowana w półrocznym pilotażu z rzeczywistymi transakcjami w dwóch systemach: kursie jednolitym i aukcji.',
 zast='Producenci rolni, firmy handlowe i przetwórcy, na początku w obrocie zbożem; w kolejnych etapach rzepak, cukier, owoce i warzywa, mleko, mięso czerwone i drób.')
D['zmierz']=dict(typ='Projekt B+R',trl=7,tb='Źródło pokazuje instalację na kotle WR-25 i podaje osiągnięte poziomy emisji, bez nazw klientów. Rozwiązanie sprawdzone na rzeczywistym kotle to TRL 7 (zakres 6–8); TRL nie jest podany w źródle.',
 opis='ZMIERZ to zintegrowana modułowa instalacja oczyszczania spalin dla kotłów typu WR z modułami odazotowania oraz odsiarczania i odpylania. Prefabrykowane moduły montuje się w miejscu istniejącego odpylania bez długiego przestoju kotła. Emisje: NOx poniżej 240 mg/Nm3, SOx poniżej 200 mg/Nm3, pył poniżej 28 mg/Nm3.',
 zast='Ciepłownie i elektrociepłownie z kotłami WR25 oraz z typoszeregów WR i OR, które muszą spełniać wymagania dyrektywy IED 2010/75/UE. Korzystają operatorzy ciepłowni i mieszkańcy dzięki czystszemu powietrzu.')
D['jednolity-system-antyplagiatowy']=dict(typ='Usługa publiczna',trl=0,tb='na',
 opis='Jednolity System Antyplagiatowy (JSA), opracowany w OPI PIB, dzieli tekst pracy na fragmenty i porównuje je z bazą ponad 10 mld fragmentów. Zmiana szyku lub podmiana słów nie wpływa na wynik, bo analizowane są zbiory pojedynczych słów.',
 zast='Polskie uczelnie i instytuty, które od stycznia 2019 r. muszą sprawdzać prace licencjackie, inżynierskie, magisterskie i doktorskie. Użytkownicy: promotorzy i pracownicy dydaktyczni; system działa w całym kraju i ma kilkaset tysięcy aktywnych użytkowników.')
D['mikrosondy-laserowe']=dict(typ='Prototyp',trl=5,tb='Źródło mówi o przygotowaniach do badań klinicznych i o udostępnieniu technologii w przyszłości. Technologia sprawdzona w warunkach zbliżonych do rzeczywistych to TRL 5 (zakres 4–6); TRL nie jest podany w źródle.',
 opis='Mikrosondy światłowodowe o grubości włosa, firmy SDS Optic, minimalnie inwazyjnie mierzą poziom markera HER2 i w pół godziny podają jego status bez biopsji.',
 zast='Diagnostyka raka piersi, zwłaszcza pacjentki HER2-dodatnie kwalifikowane do terapii trastuzumabem, a także badania naukowe i terapie spersonalizowane. Nominacja w Innovation Radar Prize 2020.')
D['edwardai']=dict(typ='Projekt B+R',trl=6,tb='Źródło opisuje działający produkt i nagrody, lecz nie podaje klientów ani testów w praktyce. Prototyp zademonstrowany w warunkach zbliżonych do rzeczywistych to TRL 6 (zakres 5–7); TRL nie jest podany w źródle.',
 opis='Edward.ai to asystent głosowy działający w tle w telefonie handlowca: zapisuje notatki głosem i automatycznie aktualizuje CRM o połączenia, spotkania, e-maile i transkrypcje, przygotowuje dzienne podsumowania i przypomnienia.',
 zast='Rozproszone zespoły sprzedaży, które chcą ograniczyć ręczne wprowadzanie danych i raportowanie. Wyróżnienia: UiPath Automation Awards CEE 2019, AI Innovator 2019.')
import json;json.dump(D,open('c3.json','w'),ensure_ascii=False)
