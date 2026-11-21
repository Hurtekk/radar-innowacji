"""Source-specific extraction. No generated descriptions or inferred benefits."""
import re
from datetime import datetime, timezone
from urllib.parse import urljoin, urlsplit, unquote
from concurrent.futures import ThreadPoolExecutor
from lxml import html

import source_only

IMN = 'Sieć Badawcza Łukasiewicz – Instytut Metali Nieżelaznych'


def text(node):
    return source_only.normalize(' '.join(node.itertext()))


def facts(values, url, name):
    if not source_only.allowed(url):
        raise ValueError('Nieobsługiwane źródło')
    stamp = datetime.now(timezone.utc).isoformat()
    return {field: {'value': value, 'excerpt': value, 'source_url': url,
                    'source_name': name, 'retrieved_at': stamp, 'claim_type': 'publisher_statement'}
            for field, value in values.items() if value}


def sentences(paragraphs):
    return [s for p in paragraphs for s in re.split(r'(?<=[.!?])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ])', p)]


def stated_benefit(paragraphs):
    return next((s for s in sentences(paragraphs) if len(s) > 40 and
                 re.search(r'pozwala\w*|umożliwia\w*|ułatwia\w*|zmniejsza\w*|ogranicza\w*|zwiększa\w*|przynosi\w* korzyści', s, re.I)), '')


def stated_achievement(paragraphs):
    return next((s for s in sentences(paragraphs) if len(s) > 50 and
                 re.search(r'\bpowstał[ayo]?\b|\bopracowano\b|\bprzetestowano\b|wdrożon|uruchomion|przeprowadzono.{0,35}pilotaż|został[ao]? przygotowan|jest dostępn', s, re.I) and
                 not re.search(r'\bcelem\b|planowan|zostan|będ\w*|zamierz|\bnie\b.{0,30}(powsta|wdroż|przetest)|(?:koncepcja|projekt) powstał|współpraca.{0,20}powstała', s, re.I)), '')


def technology_sections(root):
    result = {}
    for heading in root.xpath('.//h2 | .//h3'):
        name = text(heading)
        widget = heading.getparent().getparent()
        following = []
        for sibling in widget.itersiblings():
            if sibling.xpath('.//h2 | .//h3'):
                break
            if 'widget-text-editor' in sibling.get('class', ''):
                following.extend(text(p) for p in sibling.xpath('.//p | .//li') if text(p))
        if following:
            result[name] = following
    return result


def imn_detail(document, url):
    root = html.fromstring(document)
    sections = technology_sections(root)
    titles = root.xpath('//h1') or root.xpath('//h2[contains(@class,"elementor-heading-title")]')
    if not titles or not sections.get('Opis'):
        raise ValueError('Nie rozpoznano karty technologii IMN')
    values = {'title': text(titles[0]), 'description': ' '.join(sections['Opis']),
              'benefits': ' '.join(sections.get('Zalety', [])),
              'application': ' '.join(sections.get('Zastosowanie', [])),
              'solution_data': ' '.join(sections.get('Dane rozwiązania', [])),
              'industry': ' '.join(sections.get('Branże', []))}
    contact = sections.get('Kontakt', [])
    if contact:
        values['entity'] = next((v for v in contact if IMN in v), contact[0])
    solution = values['solution_data']
    trl = re.search(r'TRL\s*([1-9])\b', solution, re.I)
    if trl:
        values['trl'] = trl.group(1)
    # Copy the explicit development evidence, without converting TRL to a stage.
    values['implementation'] = next((p for p in sections.get('Dane rozwiązania', [])
                                     if re.search(r'dokonano demonstracji|przetestowan|wdrożon', p, re.I)), '')
    output = facts(values, url, 'Łukasiewicz–IMN — karty technologii')
    # Public contacts are copied only from links in the original technology card.
    contacts = {}
    for anchor in root.xpath('//a[starts-with(@href,"mailto:") or starts-with(@href,"tel:")]'):
        href = anchor.get('href')
        kind, value = ('email', href[7:]) if href.startswith('mailto:') else ('phone', href[4:])
        value = unquote(value).strip()
        displayed = text(anchor)
        key = (kind, value)
        if kind == 'phone' and re.fullmatch(r'\+?[\d\s()-]{7,30}', displayed):
            contacts[key] = {'kind': kind, 'value': displayed}
        elif value and key not in contacts:
            contacts[key] = {'kind': kind, 'value': value}
    return output, list(contacts.values())


def imn_inline(document, url):
    root = html.fromstring(document)
    output = []
    for heading in root.xpath('//h3'):
        columns = heading.xpath('ancestor::div[contains(concat(" ",normalize-space(@class)," ")," elementor-column ")][1]')
        if not columns:
            continue
        column = columns[0]
        panels = column.xpath('.//div[starts-with(@id,"elementor-tab-content-")]')
        if not panels:
            continue
        panel = panels[0]
        paragraphs = panel.xpath('./p | ./ul | ./ol')
        grouped = {}; current = 'description'
        for p in paragraphs:
            value = text(p)
            if re.fullmatch(r'CECHY/\s*ZALETY:?', value, re.I): current = 'benefits'; continue
            if value.startswith('ZASTOSOWANIE'): current = 'application'; continue
            if value.startswith('POZIOM GOTOWOŚCI'): current = 'trl'; continue
            if value.startswith('PRAWA WŁASNOŚCI'): current = 'ip_status'; continue
            grouped.setdefault(current, []).append(value)
        specific = url + '#' + panel.get('aria-labelledby', panel.get('id'))
        values = {k: ' '.join(v) for k, v in grouped.items()}
        values['title'] = text(heading)
        # Identify the institute from the publisher's printed page text.
        if IMN in text(root): values['entity'] = IMN
        output.append(facts(values, specific, 'Łukasiewicz–IMN — katalog technologii'))
    return output


def imn(client, config, state, limit):
    from connectors import Batch, record, select_batch
    document = client.text(config['url'], cache=True)
    root = html.fromstring(document)
    urls = sorted({urljoin(config['url'], a.get('href')) for a in root.xpath('//a[@href]')
                   if '/technologie/' in a.get('href') and '/oferta/' not in a.get('href')})
    output = []
    for data in imn_inline(document, config['url']):
        url = data['title']['source_url']
        output.append(record(url, data['title']['value'], data['description']['value'], url,
                             kind='innovation',
                             raw={'country': 'PL', 'source_facts': data},
                             entities=[{'name': IMN, 'role': 'technology_provider'}]))
    for url in urls:
        data, contacts = imn_detail(client.text(url, cache=True), url)
        output.append(record(url, data['title']['value'], data['description']['value'], url,
                             kind='innovation',
                             raw={'country': 'PL', 'source_facts': data},
                             entities=[{'name': IMN, 'role': 'technology_provider', 'contacts': contacts}]))
    selected, cursor = select_batch(output, state, limit)
    return Batch(selected, state=cursor, total=len(output))


def interreg_detail(document, url):
    root = html.fromstring(document)
    titles = root.xpath('//h2[contains(@class,"card-header-wrapper__title")]')
    containers = root.xpath('//div[contains(concat(" ",normalize-space(@class)," ")," widget-text ")]')
    paragraphs = [text(p) for c in containers for p in c.xpath('.//p | .//li') if text(p)]
    if not titles or not paragraphs:
        raise ValueError('Nie rozpoznano historii Interreg')
    # Restrict to article text. Country mentions in menus do not qualify a project.
    polish_paragraphs = [p for p in paragraphs if
                        re.search(r'\bPolsk[ęia]\b|polski\w* partner|polskimi partnerami|w Polsce|Gmina Lublin|Brzeg.{0,10}Doln|Wrocław|Politechnik\w* Lubelsk|w Łodzi|Rzeszowsk|Uniwersytet\w* Ekonomicz\w* w Krakowie|Stowarzyszeni\w* Gmin i Powiatów Małopolski|Stowarzyszeni\w* Dolina Karpia', p, re.I) and
                        not (re.search(r'język', p, re.I) and not re.search(r'partner|w Polsce|z Polski', p, re.I))]
    polish = next(iter(polish_paragraphs), '')
    if not polish:
        return None
    values = {'title': text(titles[0]), 'description': ' '.join(paragraphs),
              'polish_connection': polish, 'implementation': stated_achievement(polish_paragraphs + [p for p in paragraphs if p not in polish_paragraphs]),
              'benefits': stated_benefit(paragraphs)}
    values['application'] = next((s for s in sentences(paragraphs) if re.search(r'(?:zastosowan|wykorzystywan).{0,60}(?:miast|region|instytuc|szkoł)|(?:dla|przez).{0,20}(?:senior|pacjent|użytkownik)', s, re.I)), '')
    return facts(values, url, 'Interreg — historie sukcesów / MFiPR')


def interreg_stories(client, config, state, limit):
    from connectors import Batch, record, select_batch
    root = html.fromstring(client.text(config['url'], cache=True))
    prefix = config['url'].rstrip('/') + '/'
    urls = sorted({urljoin(config['url'], a.get('href')).rstrip('/') + '/' for a in root.xpath('//a[@href]')
                   if urljoin(config['url'], a.get('href')).startswith(prefix) and
                   not urlsplit(urljoin(config['url'], a.get('href'))).fragment and
                   not urlsplit(urljoin(config['url'], a.get('href'))).query and
                   urlsplit(urljoin(config['url'], a.get('href'))).path.rstrip('/') != urlsplit(config['url']).path.rstrip('/')})
    selected, cursor = select_batch(urls, state, limit)
    def read(url):
        data = interreg_detail(client.text(url, cache=True), url)
        if not data: return None
        return record(url, data['title']['value'], data['description']['value'], url,
                      raw={'country': 'PL', 'source_facts': data})
    with ThreadPoolExecutor(max_workers=3) as pool:
        output = [item for item in pool.map(read, selected) if item]
    return Batch(output, state=cursor, total=len(urls))


def cordis_facts(raw, url, partner_names=()):
    values = {'title': raw.get('title'), 'description': raw.get('objective'), 'objective': raw.get('objective'),
              'entity': '; '.join(partner_names), 'source_status': raw.get('status'),
              'start_date': raw.get('startDate'), 'end_date': raw.get('endDate'),
              'project_value': (str(raw['totalCost'])+' EUR') if raw.get('totalCost') else '',
              'grant_value': (str(raw['ecMaxContribution'])+' EUR') if raw.get('ecMaxContribution') else '',
              'programme': raw.get('frameworkProgramme')}
    return facts(values, url, 'CORDIS — Komisja Europejska (opis celów projektu)')
