D={}
EDU='Projekt kształcenia, nie technologia, więc TRL nie ma zastosowania.'
D['n03']=dict(typ='Program edukacyjny',trl=0,tb=EDU,
 opis='Program Uniwersytetu Wrocławskiego dla dzieci w wieku 11–15 lat, łączący zajęcia z biologii (genetyka, mikrobiologia, botanika, zoologia, biologia człowieka, ekologia) z kształtowaniem postaw społecznych i komunikacyjnych.',
 zast='Uczniowie szkół podstawowych z powiatu oleśnickiego; program rozwija zainteresowania przyrodnicze, a jego scenariusze są nadal używane na wydarzeniach popularyzujących naukę. Przeprowadzono cztery edycje (2019–2021) z 5-dniowymi obozami, wzięło udział 132 uczestników.')
D['n09']=dict(typ='Program edukacyjny',trl=0,tb=EDU,
 opis='Zajęcia Uniwersytetu im. A. Mickiewicza w Poznaniu dla uczniów w wieku 12–13 lat o wykluczeniu społecznym i przedsiębiorczości jako sposobie włączania ludzi, w tym o ekonomii społecznej. Uczniowie uczyli się debatować o problemach społecznych i projektować działania inkluzyjne.',
 zast='Uczniowie, ich rodzice i nauczyciele, którzy poznali nowe metody prowadzenia zajęć, oraz podmioty ekonomii społecznej. Efekty to kompetencje miękkie uczestników, koncert charytatywny i publikacja naukowa.')
D['n21']=dict(typ='Projekt B+R',trl=7,tb='Implanty wszczepiono 6 pacjentom w badaniach klinicznych i wszyscy odnotowali poprawę słyszenia. Badanie na ludziach w środowisku docelowym to TRL 7 (zakres 6–7), ale bez certyfikacji i produkcji.',
 opis='Politechnika AGH (2016–2020) opracowała otoimplant, czyli polimerową protezę ucha środkowego z nanosrebrem o działaniu bakteriobójczym. Proteza odbudowuje uszkodzony łańcuch kosteczek słuchowych.',
 zast='Pacjenci z ubytkiem słuchu spowodowanym zniszczeniem kosteczek słuchowych przez stany zapalne, urazy, choroby lub wady wrodzone. Implant wszczepiono sześciu osobom w badaniach klinicznych.')
D['n22']=dict(typ='Projekt B+R',trl=4,tb='Uzyskano nowe formy pszenżyta z przeniesionymi genami odporności i zweryfikowano je w laboratorium oraz w testach infekcji, ale wdrożenie do odmian jest dopiero planowane. To walidacja w warunkach kontrolowanych, TRL 4 (zakres 3–5).',
 opis='Instytut Genetyki Roślin PAN (2018–2021) przenosi fragmenty chromosomów dzikich kozieńców Aegilops do pszenżyta uprawnego, aby zwiększyć jego odporność na rdzę brunatną i żółtą.',
 zast='Firmy hodowlano-nasienne (materiał ma trafić do programów hodowlanych DANKO Hodowla Roślin), a pośrednio rolnicy i konsumenci produktów zbożowych, bo odporniejsze odmiany ograniczają straty plonu.')
D['n23']=dict(typ='Projekt B+R',trl=6,tb='Wyroby demonstracyjne wykonano metodą wtrysku w firmie przemysłowej (Gamaplast), co oznacza test technologii w środowisku zbliżonym do produkcyjnego: TRL 6 (zakres 5–7).',
 opis='Dwa hybrydowe kompozyty do wtrysku, wzmocnione krótkimi włóknami pochodzenia naturalnego: polipropylen z włóknami celulozy regenerowanej i mikrowłóknami lignocelulozowymi oraz polipropylen z włóknami PET o dużej udarności.',
 zast='Każda wtryskownia, która szuka nowych materiałów, w tym wyrobów biopochodnych i o podwyższonej udarności. Kompozyty zastępują włókno szklane i ułatwiają recykling energetyczny.')
import json;json.dump(D,open('b3.json','w'),ensure_ascii=False)
