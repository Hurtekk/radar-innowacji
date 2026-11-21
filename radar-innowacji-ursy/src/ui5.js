
/* ====================== konta (prototyp, dane tylko w przeglądarce) ====================== */
const KINDS=INST.concat(['Inwestor']);
const KEY_ACC='radar-konta-v1',KEY_SES='radar-sesja-v1',KEY_SW='radar-swipe-v1';
function loadAcc(){try{return JSON.parse(localStorage.getItem(KEY_ACC))||[]}catch(e){return []}}
function saveAcc(a){try{localStorage.setItem(KEY_ACC,JSON.stringify(a))}catch(e){}}
async function sha(s){
  try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('')}
  catch(e){let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return 'x'+h}
}
const acctRole=a=>a&&a.kind===5?'inv':'inst';
const kindName=k=>KINDS[k]||'';
function applyAcct(a){
  S.acct=a;S.role=acctRole(a);S.view='inn';S.page=null;S.drawer=null;S.modal=null;S.dd=null;clearFilters();
  if(S.role==='inv'){Object.assign(S.inv,{name:a.name,person:a.person,email:a.email,phone:a.phone,city:a.city},a.prof||{});}
  try{localStorage.setItem(KEY_SES,a.email)}catch(e){}
  save();render();
}
function logout(){S.acct=null;try{localStorage.removeItem(KEY_SES)}catch(e){}S.role=null;S.page=null;S.drawer=null;S.dd=null;S.modal=null;clearFilters();render();toast('Wylogowano.')}
function renderAcctModal(){
  const mode=S.acctMode||'reg';
  const seg='<div class="seg" role="group" aria-label="Konto" style="margin:14px 0 18px"><button data-acctmode="reg" aria-pressed="'+(mode==='reg')+'">Załóż konto</button><button data-acctmode="login" aria-pressed="'+(mode==='login')+'">Zaloguj się</button></div>';
  const err='<p id="acct-err" class="small" role="alert" style="color:var(--rose);margin-top:10px;min-height:20px"></p>';
  let body;
  if(mode==='login'){
    body='<form id="acct-login"><div class="form-grid"><div class="full"><label for="l-email">E-mail</label><input type="email" id="l-email" required autocomplete="username"></div><div class="full"><label for="l-pw">Hasło</label><input type="password" id="l-pw" required autocomplete="current-password" style="width:100%;border:1px solid #d7deef;border-radius:11px;padding:9px 12px;min-height:42px"></div></div>'+'<div class="alert info" style="margin-top:14px"><b>Konta demo (hasło: '+DEMO_PW+')</b><div class="stack" style="gap:8px;margin-top:8px">'+DEMO_ACCS.map((x,i)=>'<div class="row between"><div class="small"><b>'+esc(x.label)+'</b><br>'+esc(x.email)+'</div><button type="button" class="btn ghost sm" data-demo="'+i+'">Wstaw dane</button></div>').join('')+'</div></div>'+err+'<div class="row"><button class="btn" type="submit">Zaloguj</button><button type="button" class="btn ghost" data-act="closem">Anuluj</button></div></form>';
  }else{
    const pw='style="width:100%;border:1px solid #d7deef;border-radius:11px;padding:9px 12px;min-height:42px"';
    body='<form id="acct-reg"><div class="form-grid"><div class="full"><label for="r-kind">Kim jesteś?</label><select id="r-kind">'+KINDS.map((k,i)=>'<option value="'+i+'"'+(i===(S.acctKind==null?0:S.acctKind)?' selected':'')+'>'+(i===5?'Inwestor lub fundusz':k)+'</option>').join('')+'</select></div>'+
    '<div class="full"><label for="r-name">Nazwa (szkoły, instytucji lub funduszu)</label><input type="text" id="r-name" required></div>'+
    '<div><label for="r-person">Osoba kontaktowa</label><input type="text" id="r-person" required></div><div><label for="r-city">Miasto</label><input type="text" id="r-city" required></div>'+
    '<div><label for="r-email">E-mail</label><input type="email" id="r-email" required autocomplete="username"></div><div><label for="r-phone">Telefon</label><input type="tel" id="r-phone" required></div>'+
    '<div class="full"><label for="r-pw">Hasło (min. 6 znaków)</label><input type="password" id="r-pw" required minlength="6" autocomplete="new-password" '+pw+'></div>'+
    '<div class="full"><label class="sw" style="align-items:flex-start"><input type="checkbox" id="r-consent" required><span class="swt" style="margin-top:2px"></span><span style="font-weight:600;font-size:13.5px">Zgadzam się na przetwarzanie danych kontaktowych w celu łączenia innowacji z partnerami (RODO).</span></label></div></div>'+err+
    '<div class="row"><button class="btn" type="submit">Utwórz konto</button><button type="button" class="btn ghost" data-act="closem">Anuluj</button></div><p class="hint" style="margin-top:10px">Prototyp: konto zapisuje się tylko w tej przeglądarce, a hasło jest haszowane. To nie zastępuje prawdziwego logowania na serwerze.</p></form>';
  }
  return '<div class="scrim mscrim" data-act="closem"></div><div class="modal" style="width:min(560px,94vw)" role="dialog" aria-modal="true" aria-labelledby="mt"><div class="row between" style="flex-wrap:nowrap"><h2 id="mt">Konto w Radarze</h2><button class="x" data-act="closem" aria-label="Zamknij">×</button></div>'+seg+body+'</div>';
}
const showErr=m=>{const e=$('acct-err');if(e)e.textContent=m};
document.addEventListener('submit',async e=>{
  if(e.target.id==='acct-reg'){
    e.preventDefault();
    const g=id=>$(id).value.trim(),accs=loadAcc(),email=g('r-email').toLowerCase();
    if(accs.some(a=>a.email===email))return showErr('Konto z tym adresem e-mail już istnieje. Zaloguj się.');
    const pw=$('r-pw').value;if(pw.length<6)return showErr('Hasło musi mieć co najmniej 6 znaków.');
    const salt=uid(),a={id:uid(),kind:+$('r-kind').value,name:g('r-name'),person:g('r-person'),city:g('r-city'),email,phone:g('r-phone'),salt,hash:await sha(salt+pw)};
    accs.push(a);saveAcc(accs);applyAcct(a);toast('Konto utworzone. Witaj, '+a.name+'!');
  }else if(e.target.id==='acct-login'){
    e.preventDefault();
    const email=$('l-email').value.trim().toLowerCase(),da=DEMO_ACCS.find(x=>x.email===email);
    if(da&&$('l-pw').value===DEMO_PW){applyAcct(da);if(da.kind<5){S.f.mine='Tylko moje';render()}toast('Zalogowano na koncie demo: '+da.name);return}
    const a=loadAcc().find(x=>x.email===email);
    if(!a||a.hash!==await sha(a.salt+$('l-pw').value))return showErr('Nieprawidłowy e-mail lub hasło.');
    applyAcct(a);toast('Zalogowano jako '+a.name+'.');
  }
});
document.addEventListener('change',e=>{if(e.target.id==='r-kind')S.acctKind=+e.target.value});

// sesja
(function(){try{const em=localStorage.getItem(KEY_SES);if(em){const a=loadAcc().concat(DEMO_ACCS).find(x=>x.email===em);if(a){S.acct=a;S.role=acctRole(a);if(S.role==='inv')Object.assign(S.inv,{name:a.name,person:a.person,email:a.email,phone:a.phone,city:a.city},a.prof||{})}}}catch(e){}})();

function renderOfferModal(){
  const d=S.offerDraft||{};
  const typ=TYPES.map(t=>'<label class="chipc"><input type="checkbox" data-otype value="'+esc(t)+'" checked>'+esc(t)+'</label>').join('');
  return '<div class="scrim mscrim" data-act="closem"></div><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt"><div class="row between" style="flex-wrap:nowrap"><h2 id="mt">Dodaj ofertę inwestora</h2><button class="x" data-act="closem" aria-label="Zamknij">×</button></div><p class="muted small" style="margin:10px 0 16px">Opisz, co oferujesz innowatorom. Oferta pojawi się w widoku inwestorów, w swipe i na mapie powiązań.</p>'+
  '<form id="offer"><div class="form-grid"><div class="full"><label for="o-name">Nazwa oferty lub funduszu</label><input type="text" id="o-name" required value="'+esc(S.acct?S.acct.name:S.inv.name)+'"></div>'+
  '</div><h4 style="margin:14px 0 8px">Lokalizacja oferty</h4><div class="form-grid">'+locFields('o',{city:S.inv.city})+'</div><div class="form-grid" style="margin-top:12px">'+
  '<div class="full"><label for="o-d">Opis oferty</label><textarea id="o-d" required placeholder="Co finansujesz lub wspierasz i na jakich zasadach"></textarea></div>'+
  '<div class="full"><label for="o-benefit">Korzyści dla innowatora</label><textarea id="o-benefit" required placeholder="Co zyska innowator: finansowanie, mentoring, dostęp do rynku, laboratorium..."></textarea></div>'+
  '<div class="full"><label>Kategorie (od 1 do 3)</label>'+catChips([])+'</div>'+
  '<div><label for="o-smin">Etap od</label><select id="o-smin" required>'+optsReq(STAGES,-1,'Wybierz')+'</select></div><div><label for="o-smax">Etap do</label><select id="o-smax" required>'+optsReq(STAGES,-1,'Wybierz')+'</select></div>'+
  '<div class="full"><label>Przyjmowane typy innowacji</label><div class="chips">'+typ+'</div></div></div>'+
  '<p id="acct-err" class="small" role="alert" style="color:var(--rose);margin-top:10px;min-height:20px"></p><div class="row"><button class="btn" type="submit">Opublikuj ofertę</button><button type="button" class="btn ghost" data-act="closem">Anuluj</button></div></form></div>';
}
document.addEventListener('submit',e=>{
  if(e.target.id!=='offer')return;e.preventDefault();
  const cats=[...document.querySelectorAll('#cats input:checked')].map(x=>x.value);
  if(!cats.length)return showErr('Wybierz od 1 do 3 kategorii.');
  let smin=+$('o-smin').value,smax=+$('o-smax').value;if(smin>smax){const z=smin;smin=smax;smax=z}
  const types=[...document.querySelectorAll('[data-otype]:checked')].map(x=>x.value);
  const oloc=readLoc('o');if(!oloc)return showErr('Wybierz województwo i miejscowość oferty.');const p={id:'o'+uid(),name:$('o-name').value.trim(),kind:'Inwestor',city:oloc.miejsc,loc:oloc,person:S.inv.person,email:S.inv.email,phone:S.inv.phone,tags:tagsFromCats(cats),types:types.length?types:TYPES.slice(),st:[smin,smax],d:$('o-d').value.trim(),benefit:$('o-benefit').value.trim(),cats,owner:S.acct?S.acct.email:'gosc'};
  PARTNERS.push(p);saveOffers();AC.clear();S.modal=null;S.view='inn';S.page=null;render();toast('Oferta opublikowana: '+p.name);
});
