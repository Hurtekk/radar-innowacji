D={}
D['n60']=None
D['n62']=dict(typ='Projekt B+R',trl=6,tb='Zbudowano demonstrator radaru i przetestowano go w warunkach imitujących rzeczywiste: wykrył awionetkę do 15 km, ale testów wykrywania rakiet nie wykonano z powodu epidemii. Demonstrator w zbliżonych warunkach to TRL 6 (zakres 5–6).',
 opis='Demonstrator krótkozasięgowego radaru szumowego z elektronicznie sterowaną wiązką, przeznaczonego do wykrywania i śledzenia pocisków rakietowych.',
 zast='Siły Zbrojne i polski przemysł obronny: technologia mogłaby zwiększyć przeżywalność radarów na polu walki. Radar wykrywał awionetkę z odległości do 15 km.')
D['n63']=dict(typ='Projekt B+R',trl=8,tb='Strona podaje, że opracowano przenośny czujnik z oprogramowaniem i aplikacjami oraz urządzenie na rynek konsumencki. Gotowy wyrób przed szeroką sprzedażą to TRL 8 (zakres 7–9).',
 opis='Bezprzewodowy system do ciągłego pomiaru temperatury ciała, który umożliwia zdalne, zautomatyzowane monitorowanie pacjentów. Składa się z przenośnego czujnika, oprogramowania oraz aplikacji mobilnych i webowych.',
 zast='Oddziały szpitalne (wyniki wszystkich pacjentów widać na jednym ekranie, a pogorszenie stanu, np. po zabiegach, można wykryć wcześniej) oraz opiekunowie osób starszych, przewlekle chorych i małych dzieci.')
D['n64']=dict(typ='Projekt B+R',trl=6,tb='Wykonano partię demonstratorów bomby oraz badania naziemne i w locie. Demonstrator technologii sprawdzony w locie to TRL 6 (zakres 5–6), bez systemu gotowego do użycia.',
 opis='Instytut Techniczny Wojsk Lotniczych i Zakłady Metalowe DEZAMET opracowały demonstrator technologii bomby lotniczej z laserowym układem korekcji toru lotu. Powstały model fizyczny i matematyczny, program symulacyjny, własny układ detekcji promieniowania laserowego i dokumentacja.',
 zast='Podstawa do opracowania bomby korygowanej dla wojska; bomby o masie ok. 20 kg mogłyby być używane m.in. na bezzałogowych statkach powietrznych.')
D['n65']=dict(typ='Projekt B+R',trl=9,tb='Powstały dwie gry, edytor i platforma, a partner zapewnia dostęp do ponad 45 000 użytkowników miesięcznie, więc produkt jest używany w praktyce: TRL 9.',
 opis='Professor Why S.A. (konkurs GameINN, 2018–2019) stworzyła edukacyjną grę w rzeczywistości wirtualnej dla uczniów szkół podstawowych i liceów, dostępną też jako gra komputerowa, z internetowym edytorem scenariuszy eksperymentów opartym na wizualnym języku programowania.',
 zast='Nauczyciele fizyki, chemii, informatyki i biologii: eksperymenty, które trudno zrobić w szkole z powodu braku odczynników, bezpieczeństwa i kosztów. Partner EduSense zapewnia dostęp do ponad 45 000 użytkowników miesięcznie.')
D['n66']=dict(typ='Patent',trl=8,tb='Technologia jest opatentowana w Polsce, założono bank nasienia i zaczęto go używać w pracy wylęgarni. Sprawdzone w działaniu w jednej wylęgarni, bez szerokiego wdrożenia, to TRL 8 (zakres 7–9).',
 opis='IRZiBŻ PAN w Olsztynie i Wylęgarnia Ryb „Dąbie” wdrożyły kriokonserwację nasienia ryb łososiowatych w hodowli: wystandaryzowaną trzyetapową technologię obejmującą pobranie i ocenę nasienia, ekwilibrację oraz zamrażanie z oceną ruchliwości po rozmrożeniu.',
 zast='Prace hodowlane w wylęgarni (zamrożone nasienie cennych linii), a także banki genów zagrożonych gatunków i inne gospodarstwa rybackie.')
import json;D.pop('n60');json.dump(D,open('b12.json','w'),ensure_ascii=False)
