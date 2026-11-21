/* ====================== lokalizacje: miejscowość albo województwo -> współrzędne ======================
   Dane (WOJ, WOJC, PLACES) są w data/geo/ i wstrzykiwane przez scripts/build.py. */
const MTYP=['miasto','wieś'];
/* lokalizacja obiektu: dokładna miejscowość albo samo województwo (wtedy pozycja przybliżona) */
function mkLoc(city,woj,seedStr){
  const p=PLACES[city];
  if(p)return {woj:p[0],powiat:p[1],gmina:p[2],mtyp:p[3],miejsc:city,lat:p[4],lon:p[5],prec:'miejscowość'};
  const c=WOJC[woj];if(!c)return null;
  let h=0;String(seedStr||city||woj).split('').forEach(ch=>h=(h*31+ch.charCodeAt(0))>>>0);
  const a=(h%628)/100,r=.12+((h>>>5)%100)/100*.38;
  return {woj,powiat:'',gmina:'',mtyp:'',miejsc:city||'',lat:c[0]+Math.sin(a)*r*.7,lon:c[1]+Math.cos(a)*r,prec:'województwo'};
}
function locOf(x){
  if(x.loc&&x.loc.woj)return x.loc;
  const c=x.city&&PLACES[x.city]?x.city:'';
  const l=c?mkLoc(c,'',x.id):null;return l;
}
