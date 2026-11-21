import re
import os
B=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
P=os.path.join(B,'src')+'/'
os.makedirs(os.path.join(B,'dist'),exist_ok=True)
r=lambda f:open(P+f,encoding='utf8').read()
css=r('ui.css')+"""
.btn .chev,.ddi .chev{margin:0 0 3px 9px}
.dd>button[aria-expanded="true"] .chev{transform:rotate(-135deg);margin-bottom:-3px}
.mapside{position:absolute;top:14px;right:14px;width:290px;max-height:calc(100% - 28px);overflow:auto;background:rgba(255,255,255,.96);border:1px solid var(--line);border-radius:16px;padding:16px;box-shadow:var(--shadow-lg)}
.mapside:empty{display:none}
@media(max-width:700px){.mapside{position:static;width:auto;max-height:none;border-radius:0;border-width:1px 0 0}}
.mrow[style*="block"]{display:block}
.geo{display:flex;height:calc(100vh - 210px);min-height:460px;border:1px solid var(--line);border-radius:24px;overflow:hidden;box-shadow:var(--shadow);touch-action:none}.geomap{background:radial-gradient(circle at 50% 40%,#d9e9f7,#c4dbef)}
.geomap{position:relative;flex:1;min-width:0}.geo svg{width:100%;height:100%;display:block;cursor:grab;user-select:none}.geo svg:active{cursor:grabbing}
.gwoj{cursor:pointer;transition:fill .15s}.gwoj:hover{fill:#e3ecd3!important}
.gmk{cursor:pointer;outline:none}.gmk:focus-visible circle{stroke:#111827}
.geoctl{position:absolute;left:14px;top:14px;display:grid;gap:6px}
.geoctl button{width:40px;height:40px;border-radius:12px;border:1px solid var(--line);background:#fff;font-size:22px;font-weight:700;color:var(--ink);cursor:pointer;box-shadow:var(--shadow)}
.geoside{width:380px;flex:none;overflow:auto;background:#fff;border-right:1px solid var(--line);padding:14px;order:-1}
.gl{display:flex;flex-direction:column;gap:8px}.gli{text-align:left;background:#fff;border:1px solid var(--line);border-radius:14px;padding:11px 13px;cursor:pointer;display:flex;flex-direction:column;gap:3px;font:inherit;color:var(--ink)}.gli:hover{border-color:var(--accent);box-shadow:var(--shadow)}.gli .gt{font-weight:700;font-size:14.5px}.gli .gs{font-size:12.5px;color:var(--muted)}.gli .gp{display:flex;gap:6px;margin-top:4px;flex-wrap:wrap}.gli .gp i{font-style:normal;font-size:11.5px;font-weight:700;background:var(--accent-soft);color:var(--accent-d);border-radius:999px;padding:2px 9px}.gmk.hl{filter:drop-shadow(0 0 7px #111)}
@media(max-width:800px){.geo{flex-direction:column;height:auto}.geomap{height:420px;flex:none}.geoside{width:auto;order:1;max-height:420px;border-right:0;border-top:1px solid var(--line)}}
.cardw{position:relative;display:flex;flex-direction:column}.cardw .card{flex:1;width:100%;text-align:left;padding-bottom:46px}
.cmpb{position:absolute;right:14px;bottom:12px;border:1px solid var(--line);background:#fff;border-radius:10px;padding:5px 11px;font:600 12.5px/1.2 inherit;color:var(--ink);cursor:pointer}.cmpb.on{background:#e8f6f3;border-color:#0f9d8c;color:#0b7a6c}.cmpb:hover{border-color:#4f6bed}
.cdesc{margin:8px 0 0;color:var(--muted)}
.audsel{display:flex;align-items:center;gap:8px}.audsel select{max-width:260px}
.audnote{background:#eef2ff;border:1px solid #d6defc;border-radius:12px;padding:10px 14px;margin:0 0 14px;font-size:14px}
.notbox{max-width:760px;margin:0 auto 22px;background:#fff7e6;border:1px solid #f1d9a6;border-radius:12px;padding:10px 14px;font-size:14px}
.hs{font-size:20px;margin:26px 0 12px;text-align:center}
.roles6{grid-template-columns:repeat(3,1fr)}.roles3{grid-template-columns:repeat(3,1fr)}
@media(max-width:900px){.roles6,.roles3{grid-template-columns:1fr 1fr}}@media(max-width:600px){.roles6,.roles3{grid-template-columns:1fr}}
.areadot{display:inline-block;width:12px;height:12px;border-radius:50%;margin-bottom:8px}
.defbox{max-width:820px;margin:22px auto;font-size:14.5px}
.bar5{display:inline-block;width:70px;height:8px;border-radius:5px;background:#e8ecf7;vertical-align:middle;overflow:hidden}.bar5 i{display:block;height:100%;background:#4f6bed}
.srcbox{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;background:#f4f7ff;border:1px solid #dbe3fb;border-radius:12px;padding:12px 14px;margin:12px 0}
.cmpt th,.cmpt td{vertical-align:top;text-align:left;padding:8px 10px}.cmpt td.best{background:#e8f6f3}
.geonote{position:absolute;left:14px;bottom:10px;right:14px;font-size:12px;color:var(--muted);text-shadow:0 0 4px #fff,0 0 4px #fff,0 0 6px #fff;font-weight:600;pointer-events:none}
@media(max-width:800px){.geo{display:block;height:auto;min-height:0}.geomap{height:62vh}.geoside{width:auto;border-left:0;border-top:1px solid var(--line)}}
"""
core=r('seg_core.js')
core='\n'.join(l for l in core.split('\n') if not l.startswith('function softRefresh'))
logic=r('seg_logic.js')+'\n'+r('seg_rewrite.js'); data=r('seg_data.js')
ui=r('geopoly.js')+r('ui1.js')+r('ui2.js')+r('ui3.js')+r('ui5.js')+r('ui6.js')+r('ui7.js')+r('ui8.js')+'\n'+r('ui9.js')+r('ui10.js')+r('ui4.js')
intro='''<div id="intro" role="status" aria-label="Ładowanie aplikacji Radar innowacji">
  <svg viewBox="0 0 120 120" aria-hidden="true">
    <circle class="ring2 r1" cx="60" cy="60" r="54" pathLength="1"/>
    <circle class="ring2 r2" cx="60" cy="60" r="36" pathLength="1"/>
    <circle class="ring2 r3" cx="60" cy="60" r="18" pathLength="1"/>
    <path class="axis" d="M60 6V114M6 60H114"/>
    <g class="isweep"><path d="M60 60 L60 6 A54 54 0 0 1 98 22 Z" fill="#4f6bed" opacity=".18"/><line x1="60" y1="60" x2="60" y2="6" stroke="#4f6bed" stroke-width="2"/></g>
    <circle class="blip b1" cx="84" cy="36" r="5" fill="#0f9d8c"/>
    <circle class="blip b2" cx="38" cy="80" r="4" fill="#0f9d8c"/>
    <circle cx="60" cy="60" r="3.5" fill="#4f6bed"/>
  </svg>
  <div class="iw"><div class="in">Radar innowacji</div><div class="is">Istniejące innowacje w Polsce, znalezione i ocenione automatycznie</div></div>
</div>'''
html='''<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Radar innowacji</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
'''+css+'''</style>
</head>
<body>
'''+intro+'''
<header class="top"><div class="wrap hdr" id="hdr"></div></header>
<main class="wrap"><div id="sub"></div><div id="view"></div></main>
<div id="layer"></div>

<script>
'''+logic+'\n'+r('seg_ext.js')+'\n'+data+'\n'+r('seg_real.js')+'\n'+r('seg_demo.js')+'\n'+r('seg_detected.js')+'\n'+core+'\n'+ui+'''
</script>
</body>
</html>
'''
open(os.path.join(B,'dist','index.html'),'w',encoding='utf8').write(html)
open(os.path.join(B,'dist','script.js'),'w',encoding='utf8').write(logic+'\n'+r('seg_ext.js')+'\n'+data+'\n'+r('seg_real.js')+'\n'+r('seg_demo.js')+'\n'+r('seg_detected.js')+'\n'+core+'\n'+ui)
print(len(html))
