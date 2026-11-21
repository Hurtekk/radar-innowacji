D={}
EDU='Projekt kształcenia i dostępności, nie technologia, więc TRL nie ma zastosowania.'
D['n42']=dict(typ='Program edukacyjny',trl=0,tb=EDU,
 opis='Projekt szkoleń dla dzieci i młodzieży, dorosłych i seniorów oraz zdalnej edukacji 50 nauczycieli. Łącznie przeprowadzono 931 godzin zajęć, w których wzięło udział około 257 osób.',
 zast='Rozwiązuje problem braku wsparcia dopasowanego do konkretnych grup odbiorców. Uczestnicy zdobyli wiedzę i certyfikowane kwalifikacje, a seniorzy nawiązali współpracę z klubami z kilku gmin.')
D['n43']=dict(typ='Projekt B+R',trl=9,tb='Strona podaje, że maszyna trafiła na rynek, więc rozwiązanie jest sprawdzone w działaniu: TRL 9.',
 opis='Vshaper 5AX Machine to pięcioosiowa drukarka 3D z wychylno-obrotową platformą roboczą i podgrzewanym stołem z podciśnieniem (Vshaper Sp. z o.o., 2016–2019, wartość 11,9 mln zł).',
 zast='Wytwarzanie złożonych prototypów i małych serii skomplikowanych elementów, także dla przemysłu wymagającego odporności temperaturowej, chemicznej i mechanicznej. Według strony druk daje oszczędności do 70% względem obróbki ubytkowej, a czas od projektu do przedmiotu to od kilku do kilkunastu godzin.')
D['n44']=dict(typ='Program edukacyjny',trl=0,tb=EDU,
 opis='Projekt Wojskowej Akademii Technicznej (2020–2021) zwiększający dostępność uczelni dla osób z niepełnosprawnościami: dostosowania architektoniczne i cyfrowe, procedury wsparcia, szkolenia kadry i bezpłatne konsultacje psychologiczne.',
 zast='Studenci i doktoranci z niepełnosprawnościami oraz kadra uczelni. Strona WAT (serwis główny i osiem wydziałowych) została dostosowana do standardu WCAG 2.0.')
D['n45']=dict(typ='Projekt B+R',trl=5,tb='Powstał prototyp gry „Telefrag VR” z nowymi mechanikami sterowania, ale strona nie podaje wydania gry. Prototyp w warunkach zbliżonych do docelowych to TRL 5 (zakres 4–6).',
 opis='Anshar Studios (2017–2019, program GAMEINN) opracowała nietypowe mechaniki sterowania i obsługi interfejsu w arenowej strzelance FPS na gogle VR. Efektem jest prototyp gry „Telefrag VR”.',
 zast='Rozwiązania mają służyć kolejnym produkcjom firmy, pozyskiwaniu kontraktów oraz prezentacjom branżowym. Pośrednio korzystają z nich twórcy i gracze gier VR.')
D['n46']=dict(typ='Projekt B+R',trl=8,tb='Strona podaje, że technologia została opracowana, przebadana i certyfikowana. Gotowa i zatwierdzona technologia przed szeroką sprzedażą to TRL 8 (zakres 7–9).',
 opis='Technologia MVC (medium voltage cleaning) do czyszczenia urządzeń elektroenergetycznych pod napięciem do 60 kV bez wyłączania instalacji. Nie powstają przy tym wtórne odpady.',
 zast='Zakłady energetyczne i przedsiębiorstwa zasilane z sieci średniego napięcia: mniej przerw w dostawie prądu, mniejsze ryzyko poważnych awarii i większe bezpieczeństwo pracowników.')
import json;json.dump(D,open('b8.json','w'),ensure_ascii=False)
