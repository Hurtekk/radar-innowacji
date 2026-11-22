/* ---------- dostępność cyfrowa (wzorowana na serwisach gov.pl: czcionka, kontrast, klawiatura, deklaracja) ---------- */
PAGEX.dostepnosc=()=>pg('Deklaracja dostępności',
 '<div class="panel"><p>Radar innowacyjny ZBIEG dąży do spełnienia wymagań WCAG 2.1 na poziomie AA, zgodnie z ustawą o dostępności cyfrowej stron internetowych i aplikacji mobilnych podmiotów publicznych. Jest to prototyp konkursowy, więc pełny audyt dostępności nie został jeszcze wykonany.</p>'+
 '<h3>Co możesz zmienić (pasek „Dostępność” u góry strony)</h3><ul>'+
 '<li><b>Wielkość tekstu (A, A+, A++):</b> trzy stopnie powiększenia całej strony; „A” przywraca normalną.</li>'+
 '<li><b>Wysoki kontrast (ikona połowy koła):</b> czarne tło, biały tekst i żółte akcenty dla osób słabowidzących.</li>'+
 '<li>Ustawienia są pamiętane w tej przeglądarce.</li></ul>'+
 '<h3>Obsługa klawiaturą i czytnikami ekranu</h3><ul>'+
 '<li>Link „Przejdź do treści” pojawia się po pierwszym naciśnięciu klawisza Tab.</li>'+
 '<li>Wszystkie elementy aktywne są dostępne klawiszem Tab, a aktywny element ma widoczną ramkę.</li>'+
 '<li>Strona ma ustawiony język polski, a przyciski mają opisy dla czytników ekranu.</li></ul>'+
 '<h3>Znane ograniczenia</h3><ul><li>Mapa innowacji jest graficzna; te same dane są dostępne w widoku listy i w statystykach.</li><li>Nie przeprowadzono jeszcze testów z użytkownikami czytników ekranu.</li></ul>'+
 '<p class="small muted">Problemy z dostępnością możesz zgłaszać przez kontakt wskazany w karcie projektu hackathonowego. Informacje o wymaganiach: gov.pl/web/dostepnosc-cyfrowa.</p></div>');
(function(){
  const K='radar-a11y';let st={fs:0,hc:0};
  try{st=Object.assign(st,JSON.parse(localStorage.getItem(K)||'{}'))}catch(e){}
  function apply(){
    document.body.style.zoom=[1,1.15,1.3][st.fs]||1;
    document.documentElement.classList.toggle('a11y-hc',!!st.hc);
    try{localStorage.setItem(K,JSON.stringify(st))}catch(e){}
    const bar=document.getElementById('a11y');if(!bar)return;
    bar.querySelectorAll('[data-fs]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.fs===st.fs)));
    const c=bar.querySelector('[data-a="hc"]');if(c)c.setAttribute('aria-pressed',String(!!st.hc));
  }
  function build(){
    if(document.getElementById('a11y'))return;
    const skip=document.createElement('a');skip.href='#view';skip.className='skip';skip.textContent='Przejdź do treści';
    skip.addEventListener('click',e=>{e.preventDefault();const v=document.getElementById('view');v.setAttribute('tabindex','-1');v.focus()});
    document.body.insertBefore(skip,document.body.firstChild);
    const bar=document.createElement('div');bar.id='a11y';bar.setAttribute('role','region');bar.setAttribute('aria-label','Dostępność');
    bar.innerHTML='<div class="wrap a11yin">'+
     '<button type="button" data-fs="0" class="fs f0" aria-label="Normalna wielkość tekstu" title="Normalna wielkość tekstu">A</button>'+
     '<button type="button" data-fs="1" class="fs f1" aria-label="Większy tekst" title="Większy tekst">A+</button>'+
     '<button type="button" data-fs="2" class="fs f2" aria-label="Największy tekst" title="Największy tekst">A++</button>'+
     '<button type="button" data-a="hc" aria-label="Wysoki kontrast" title="Wysoki kontrast" aria-pressed="false"><svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 2a8 8 0 0 1 0 16z" fill="currentColor"/></svg></button>'+
     '<button type="button" data-a="page" aria-label="Deklaracja dostępności" title="Deklaracja dostępności"><svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="3.6" r="1.8" fill="currentColor"/><path d="M3 6.5h14M10 6.5v5.5M10 12l-3 5.5M10 12l3 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>';
    document.body.insertBefore(bar,document.querySelector('header.top'));
    bar.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      if(b.dataset.fs!==undefined)st.fs=+b.dataset.fs;else if(b.dataset.a==='hc')st.hc=st.hc?0:1;else if(b.dataset.a==='page'){try{setPage('dostepnosc')}catch(x){}}
      apply()});
    apply();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
