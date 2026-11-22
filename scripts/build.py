#!/usr/bin/env python3
"""Składa aplikację: src/ + data/ -> dist/index.html (jeden samodzielny plik) i dist/script.js.

    python scripts/build.py

Co robi:
  1. wczytuje i waliduje pliki JSON z data/ i wstrzykuje je do skryptu jako stałe JS
     (kolejność i nazwy stałych: lista DATA poniżej),
  2. dokleja pliki src/js/*.js w kolejności numerów w nazwie (10-, 20-, ...),
  3. dokleja pliki CSS z src/styles/ w kolejności z listy STYLES,
  4. wkłada CSS i skrypt do src/templates/index.html.
Tylko biblioteka standardowa Pythona 3.
"""
import json
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

# (nazwa stałej w JS, plik z danymi względem data/)
DATA = [
    ('WOJ',              'geo/voivodeships.json'),
    ('WOJC',             'geo/voivodeship-centroids.json'),
    ('PLACES',           'geo/places.json'),
    ('GEOPOLY',          'geo/voivodeship-outlines.json'),
    ('NCBR_PROJECTS',    'records/ncbr-projects.json'),
    ('REWRITE',          'records/assessments.json'),
    ('AI_RECOMMENDATIONS', 'records/recommendations.json'),
    ('SOURCE_AUDIT',     'records/source-audit.json'),
    ('DETECTED_FEED',    'records/detected-feed.json'),
    ('NCBR_PROGS',       'reference/ncbr-programmes.json'),
    ('OTHER_INV',        'reference/other-partners.json'),
    ('PUBLIC_CONTACTS',  'reference/contacts-companies.json'),
    ('INST_CONTACTS',    'reference/contacts-institutions.json'),
]
STYLES = ['main.css', 'overrides.css', 'methodology.css']


def path(*p):
    return os.path.join(ROOT, *p)


def read(*p):
    with open(path(*p), encoding='utf8', newline='') as f:
        return f.read().replace('\r\n', '\n')


def write(rel, text):
    os.makedirs(os.path.dirname(path(rel)), exist_ok=True)
    with open(path(rel), 'w', encoding='utf8', newline='\n') as f:
        f.write(text)


def data_block():
    out = ['/* ===== dane (data/*.json, wstrzyknięte przez scripts/build.py) ===== */']
    for name, rel in DATA:
        try:
            obj = json.loads(read('data', rel))
        except (OSError, ValueError) as e:
            sys.exit('Błąd w data/%s: %s' % (rel, e))
        # "</" -> "<\/": napis w JSON nie może zamknąć znacznika <script>
        js = json.dumps(obj, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
        out.append('const %s=%s;' % (name, js))
    return '\n'.join(out)


def check_data():
    """Szybkie kontrole spójności danych (ostrzeżenia, nie przerywają budowy)."""
    ids = {r['id'] for r in json.loads(read('data/records/ncbr-projects.json'))}
    feed = {r['id'] for r in json.loads(read('data/records/detected-feed.json'))}
    assess = set(json.loads(read('data/records/assessments.json')))
    for label, known in (('ncbr-projects', ids), ('detected-feed', feed)):
        missing = sorted(known - assess)
        if missing:
            print('UWAGA: %d rekordów z %s bez oceny w assessments.json (nie trafią do radaru): %s'
                  % (len(missing), label, ', '.join(missing[:8])))
    nowdr = sorted(k for k, v in json.loads(read('data/records/assessments.json')).items() if not 1 <= v.get('wdr', 0) <= 5)
    if nowdr:
        print('UWAGA: %d ocen bez poziomu wdrożenia wdr (1-5): %s' % (len(nowdr), ', '.join(nowdr[:8])))
    orphan = sorted(assess - ids - feed)
    if orphan:
        print('UWAGA: %d ocen w assessments.json bez rekordu: %s' % (len(orphan), ', '.join(orphan[:8])))


def main():
    check_data()
    names = sorted(n for n in os.listdir(path('src', 'js')) if n.endswith('.js'))
    # 'use strict' musi być pierwszą instrukcją skryptu, więc dane idą po niej
    script = "'use strict';\n" + data_block() + '\n' + '\n'.join(read('src/js', n) for n in names)
    css = ''.join(read('src/styles', n) for n in STYLES)
    template = read('src/templates/index.html')
    head, rest = template.split('{{STYLES}}')
    mid, tail = rest.split('{{SCRIPT}}')
    html = head + css + mid + script + tail
    write('dist/index.html', html)
    write('dist/script.js', script)
    print('dist/index.html: %d znaków, %d plików JS, %d plików danych' % (len(html), len(names), len(DATA)))


if __name__ == '__main__':
    main()
