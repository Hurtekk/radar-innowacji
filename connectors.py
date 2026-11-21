import csv
import html as html_text
import io
import json
from pathlib import Path
import re
import zipfile
from dataclasses import dataclass, field
from urllib.parse import quote, urljoin
from lxml import etree, html
from net import AccessRequired, required


@dataclass
class Batch:
    records: list = field(default_factory=list)
    entities: list = field(default_factory=list)
    state: dict = field(default_factory=dict)
    total: int | None = None


def clean(value):
    return re.sub(r'\s+', ' ', html_text.unescape(re.sub('<[^>]+>', ' ', str(value or '')))).strip()


def record(key, title, description, url, kind='project', **fields):
    return dict(id=str(key), title=clean(title), description=clean(description) or None,
                url=url, kind=kind, **fields)


def select_batch(items, state, limit):
    offset = int(state.get('offset', 0))
    if offset >= len(items):
        offset = 0
    end = min(offset + limit, len(items)) if limit else len(items)
    return items[offset:end], {'offset': end if end < len(items) else 0}


def crossref(client, config, state, limit):
    output, offset = [], int(state.get('offset', 0))
    total = None
    # Crossref offset paging supports at most the first 10,000 ranked matches.
    # The window is revisited after completion so newly indexed items are included.
    while offset < 10000:
        size = min(250, limit-len(output), 10000-offset) if limit else min(250,10000-offset)
        data = client.json('https://api.crossref.org/works', params={
            'query': config.get('query', 'innovation technology robotics energy'),
            'rows': size, 'offset': offset, 'sort':'indexed','order':'desc'})['message']
        items = data['items']; total = data.get('total-results')
        for item in items:
            if not item.get('title') or not item.get('DOI'):
                continue
            entities = [{'name': a['name'], 'role': 'affiliation'}
                        for author in item.get('author', []) for a in author.get('affiliation', []) if a.get('name')]
            output.append(record(item['DOI'], ' '.join(item['title']), item.get('abstract'),
                                 'https://doi.org/'+item['DOI'], 'publication',
                                 canonical_key='doi:'+item['DOI'].lower(), entities=entities,
                                 tags=item.get('subject', []), raw=item))
        offset += len(items)
        if not items or offset >= min(total or 10000,10000):
            return Batch(output, state={'offset':0}, total=total or 0)
        if limit and len(output)>=limit:
            break
    return Batch(output,state={'offset':offset if offset<10000 else 0},total=total)


def radon(client, config, state, limit):
    endpoint = config['endpoint']
    output, entities, token, seen = [], [], state.get('token', ''), set()
    total = None
    while True:
        remaining = limit-len(output)-len(entities) if limit else 100
        data = client.json('https://radon.nauka.gov.pl/opendata/polon/'+endpoint,
                           params={'resultNumbers': min(100, remaining), **({'token': token} if token else {})})
        items = data['results']
        total = data.get('pagination', {}).get('maxCount')
        for item in items:
            institution = {'name': item.get('institutionName', ''),
                           'external_id': 'polon:'+str(item.get('institutionUuid', '')), 'role': 'owner'}
            if endpoint == 'institutions':
                entity = {'name': item['name'], 'external_id': 'polon:'+item['institutionUuid'],
                          'contacts': [], 'raw': item, 'id': item['institutionUuid']}
                for key, kind in [('www', 'website'), ('eMail', 'email'), ('phone', 'phone')]:
                    if item.get(key):
                        entity['contacts'].append({'kind': kind, 'value': item[key]})
                entity['source_url'] = 'https://radon.nauka.gov.pl/dane/instytucje-systemu-szkolnictwa-wyzszego-i-nauki'
                entity['identifiers'] = {key:item[key] for key in ['nip','regon','krs'] if item.get(key)}
                entities.append(entity)
                continue
            if endpoint == 'investments':
                key, title, description = item['investmentUuid'], item['investmentName'], item.get('investmentDescription')
                url = 'https://radon.nauka.gov.pl/opendata/polon/investments?investmentUuid='+key
                institution['contacts'] = [{'kind': kind, 'value': contact[field], 'label': contact.get('fullName', '')}
                    for contact in item.get('contactDetails', [])
                    for field,kind in [('businessEmailAddress','email'),('businessPhoneNumber','phone')]
                    if contact.get(field)]
                output.append(record(key, title, description, url, 'investment',
                    subtype='institutional_infrastructure', entities=[institution], tags=item.get('keywords', []),
                    amount=str(item['investmentOutlays']) if item.get('investmentOutlays') is not None else None,
                    currency='PLN', raw=item))
            elif endpoint == 'products':
                key = item.get('protectionUuid') or item.get('productUuid') or item.get('applicationNumber') or item.get('publicationNumber')
                if not key:
                    raise ValueError('Brak identyfikatora patentu RAD-on')
                owners = [{'name':a['institutionName'], 'external_id':'polon:'+a['institutionUuid'], 'role':'applicant'}
                          for a in item.get('relatedInstitutions', []) if a.get('institutionUuid') and a.get('institutionName')]
                output.append(record(key, item['protectionTitle'], item.get('productDescription'),
                    'https://radon.nauka.gov.pl/opendata/polon/products?applicationNumber='+quote(str(item.get('applicationNumber',''))),
                    'patent', entities=owners, tags=[item.get('protectionType','Patent')], raw=item))
            else:
                key = item['objectId']
                abstracts = item.get('abstracts') or []
                description = ' '.join(clean(a.get('text') or a.get('abstract') or '') for a in abstracts)
                doi = item.get('doi')
                url = 'https://doi.org/'+doi if doi else 'https://pbn.nauka.gov.pl/core/#/publication/'+key
                output.append(record(key, item['title'], description, url, 'publication', raw=item,
                                     canonical_key='doi:'+doi.lower() if doi else None))
        next_token = data.get('pagination', {}).get('token')
        if not items or not next_token or next_token == token or next_token in seen:
            break
        if limit and len(output)+len(entities) >= limit:
            return Batch(output, entities, {'token': next_token}, total)
        seen.add(token)
        token = next_token
    return Batch(output, entities, {}, total)


def cordis(client, config, state, limit):
    data = client.request(config['download_url'], cache=True)
    archive = zipfile.ZipFile(io.BytesIO(data))
    def rows(name):
        with archive.open(name) as stream:
            yield from csv.DictReader(io.TextIOWrapper(stream, encoding='utf-8-sig'), delimiter=';')
    polish_organizations=[r for r in rows('organization.csv') if r.get('country')=='PL']
    project_ids={r['projectID'] for r in polish_organizations}
    index={'source_url':config['download_url'],'projects':sorted(project_ids),'organizations':sorted({'pic:'+r['organisationID'] for r in polish_organizations})}
    index_path=Path(__file__).resolve().parent/'polish-cordis-projects.json'
    temporary=index_path.with_suffix('.tmp')
    temporary.write_text(json.dumps(index),encoding='utf-8')
    temporary.replace(index_path)
    projects = [r for r in rows('project.csv') if r['id'] in project_ids]
    selected, cursor = select_batch(projects, state, limit)
    ids = {p['id'] for p in selected}
    partners = {}
    for item in rows('organization.csv'):
        if item['projectID'] not in ids or item.get('country')!='PL':
            continue
        contacts = [{'kind':kind, 'value':item[key]} for key,kind in [('organizationURL','website'),('contactForm','form')] if item.get(key)]
        entity = {'name':item['name'], 'external_id':'pic:'+item['organisationID'],
                  'role':item['role'], 'contacts':contacts,
                  'identifiers':{'vat':item['vatNumber']} if item.get('vatNumber') else {}}
        partners.setdefault(item['projectID'], []).append(entity)
    output = []
    for item in selected:
        from catalog_sources import cordis_facts
        project_url='https://cordis.europa.eu/project/id/'+item['id']
        raw={**item,'source_facts':cordis_facts(item,project_url,[p['name'] for p in partners.get(item['id'],[])])}
        output.append(record(item['id'], item['title'], item['objective'],
            project_url, entities=partners.get(item['id'], []),
            canonical_key='cordis:'+item['id'], tags=[t.strip() for t in item.get('keywords','').split(',') if t.strip()], raw=raw,
            subtype='research_grant'))
    return Batch(output, state=cursor, total=len(projects))


def ncbr(client, config, state, limit):
    root = html.fromstring(client.text(config['url']))
    output = []
    for detail in root.xpath('//details[summary]'):
        title = clean(detail.find('summary').text_content())
        anchors = detail.xpath('.//a[contains(@href,"/web/ncbr/")]')
        if not anchors:
            continue
        url = urljoin(config['url'],anchors[-1].get('href'))
        fields = {}
        for heading in detail.xpath('.//h3'):
            following = heading.getnext()
            if following is not None:
                fields[clean(heading.text_content())] = clean(following.text_content())
        beneficiary = next((v for k,v in fields.items() if 'Beneficjenta' in k), None)
        output.append(record(url, title, None, url, entities=[{'name':beneficiary,'role':'beneficiary'}] if beneficiary else [], raw=fields, subtype='research_grant'))
    selected, cursor = select_batch(output, state, limit)
    # Read the detail pages for descriptions, rather than copying the title as an abstract.
    from concurrent.futures import ThreadPoolExecutor
    def enrich(item):
        try:
            page = html.fromstring(client.text(item['url'], cache=True))
            body = page.xpath('//article[contains(@class,"article")] | //div[contains(@class,"editor-content")]')
            if body:
                item['description'] = clean(' '.join(body[0].xpath('.//p//text()'))) or None
        except Exception:
            pass  # A verified list entry remains usable without its optional description.
        return item
    with ThreadPoolExecutor(max_workers=4) as pool:
        selected = list(pool.map(enrich, selected[:config.get('enrich_limit', 12)])) + selected[config.get('enrich_limit', 12):]
    if not output:
        raise ValueError('Lista NCBR nie zawiera rozpoznanych kart projektów')
    return Batch(selected, state=cursor, total=len(output))


def xlsx(client, config, state, limit):
    import openpyxl
    url = config.get('download_url')
    if not url:
        root = html.fromstring(client.text(config['url']))
        links = root.xpath('//a[contains(@href,".xlsx")]/@href | //*[@data-url and contains(@data-url,".xlsx")]/@data-url')
        if not links:
            raise AccessRequired('Brak linku XLSX na stronie. Ustaw download_url lub zaimportuj aktualny eksport.')
        url = urljoin(config['url'], links[0])
    book = openpyxl.load_workbook(io.BytesIO(client.request(url, cache=True)), read_only=True, data_only=True)
    output = []
    for sheet in book:
        headers = None
        for row in sheet.iter_rows(values_only=True):
            values = [clean(v) for v in row]
            if headers is None:
                if any('nazwa' in v.lower() or 'title' in v.lower() or 'tytuł' in v.lower() for v in values):
                    headers = values
                continue
            data = dict(zip(headers, values))
            def find(*terms):
                return next((v for k,v in data.items() if v and any(term in k.lower() for term in terms)), '')
            title = find('nazwa projektu','tytuł projektu','nazwa operacji','project title','tytuł operacji')
            if not title:
                continue
            key = find('numer projektu','numer operacji','identyfikator','project id') or title
            description = find('opis projektu','cel operacji','cel projektu','objective','description')
            beneficiary = find('nazwa beneficjenta','nazwa partnera','beneficiary','lead partner')
            link = find('strona internetowa','website','adres strony')
            link = link if link.startswith(('http://','https://')) else url
            output.append(record(key, title, description, link, entities=[{'name':beneficiary,'role':'beneficiary'}] if beneficiary else [], raw=data, subtype='public_funding'))
    book.close()
    if not output:
        raise ValueError('Nie rozpoznano kolumn tytułu w pliku XLSX')
    selected, cursor = select_batch(output, state, limit)
    return Batch(selected, state=cursor, total=len(output))


def oai(client, config, state, limit):
    ns = {'o':'http://www.openarchives.org/OAI/2.0/', 'dc':'http://purl.org/dc/elements/1.1/'}
    output, token = [], state.get('token')
    while True:
        params = {'verb':'ListRecords', 'resumptionToken':token} if token else {'verb':'ListRecords','metadataPrefix':'oai_dc'}
        root = etree.fromstring(client.request(config['url'], params=params))
        error = root.find('o:error', ns)
        if error is not None:
            raise ValueError(clean(error.text))
        records = root.findall('.//o:record', ns)
        if not records:
            raise ValueError('Źródło nie zwróciło rekordów OAI-PMH')
        for item in records:
            key = item.findtext('o:header/o:identifier', namespaces=ns)
            title = item.findtext('.//dc:title', namespaces=ns)
            urls = [v.text for v in item.findall('.//dc:identifier', ns) if (v.text or '').startswith(('http://','https://'))]
            if key and title and urls:
                output.append(record(key,title,' '.join(item.xpath('.//dc:description/text()', namespaces=ns)),urls[0],'publication',raw=etree.tostring(item, encoding='unicode')))
        token = root.findtext('.//o:resumptionToken', namespaces=ns)
        if not token or (limit and len(output)>=limit):
            return Batch(output,state={'token':token} if token else {})


def json_records(client, config, state, limit):
    headers = {}
    if config.get('api_key_env'):
        headers['Authorization'] = 'Bearer '+required(config['api_key_env'])
    url, page = config['url'], int(state.get('page',1))
    params = dict(config.get('params', {}))
    if config.get('page_param'):
        params[config['page_param']] = page
    data = client.json(url, params=params, headers=headers)
    items = data
    for field in config.get('items_path','').split('.'):
        if field:
            items = items[field]
    if not isinstance(items,list):
        raise ValueError('API nie zwróciło listy rekordów')
    output=[]
    for item in items:
        title = item.get(config['title_field'])
        if not title:
            continue
        key = str(item[config['id_field']])
        link = item.get(config.get('url_field','url')) or config.get('record_url',url).replace('{id}',quote(key))
        output.append(record(key,title,item.get(config.get('description_field','description')),link,config.get('kind','project'),raw=item))
    return Batch(output, state={'page':page+1} if items and config.get('page_param') else {}, total=len(items))


def pages(client, config, state, limit):
    urls = list(config.get('urls', []))
    if config.get('discovery_url'):
        root = html.fromstring(client.text(config['discovery_url']))
        urls.extend(urljoin(config['discovery_url'],u) for u in root.xpath(config['links_xpath']))
    urls = list(dict.fromkeys(urls))
    selected,cursor = select_batch(urls,state,limit)
    output=[]
    for url in selected:
        root=html.fromstring(client.text(url,cache=True))
        titles=root.xpath('//meta[@property="og:title"]/@content | //h1//text()')
        descriptions=root.xpath('//meta[@name="description"]/@content | //meta[@property="og:description"]/@content')
        title=clean(titles[0]) if titles else ''
        if title:
            entities=list(config.get('entities',[]))
            # Explicitly reported investor from this issuer's round announcement.
            if 'aiclearing.com' in url and 'series-a' in url and 'prudence' in title.lower():
                entities=[{'name':'Prudence','role':'investor'},{'name':'AI Clearing','role':'recipient'}]
            output.append(record(url,title,descriptions[0] if descriptions else None,url,config.get('kind','innovation'),raw={'url':url},entities=entities))
    if not output:
        raise AccessRequired('Katalog wymaga eksportu, interfejsu API lub potwierdzenia sposobu dostępu')
    return Batch(output,state=cursor,total=len(urls))


def organizations(client, config, state, limit):
    data=client.json(config['url'],params={config.get('page_param','page'):int(state.get('page',1)),**config.get('params',{})})
    items=data.get('items',[])
    entities=[]
    for item in items:
        names=item.get('names',[])
        name=next((n['value'] for n in names if 'ror_display' in n.get('types',[])),None)
        if not name:
            continue
        contacts=[{'kind':'website','value':link['value']} for link in item.get('links',[]) if link.get('type')=='website']
        entities.append({'id':item['id'],'external_id':item['id'],'name':name,'contacts':contacts,'source_url':item['id'],'raw':item})
    return Batch(entities=entities,state={'page':int(state.get('page',1))+1} if int(state.get('page',1))*20 < data.get('number_of_results',0) else {},total=data.get('number_of_results'))


CONNECTORS = {'crossref':crossref,'radon':radon,'cordis':cordis,'ncbr':ncbr,'xlsx':xlsx,
              'oai':oai,'json':json_records,'pages':pages,'organizations':organizations}


def openalex(client, config, state, limit):
    import os
    params={'search':config['query'],'per_page':min(limit or 200,200),'cursor':state.get('cursor','*'),'filter':'institutions.country_code:pl'}
    if os.getenv('OPENALEX_API_KEY'):
        params['api_key']=os.environ['OPENALEX_API_KEY']
    data=client.json('https://api.openalex.org/works',params=params)
    output=[]
    for item in data['results']:
        positions={position:word for word, indexes in (item.get('abstract_inverted_index') or {}).items() for position in indexes}
        description=' '.join(positions[p] for p in sorted(positions))
        entities=[{'name':i['display_name'],'external_id':i.get('ror') or i['id'],'role':'affiliation'} for author in item.get('authorships',[]) for i in author.get('institutions',[])]
        doi=item.get('doi')
        output.append(record(item['id'],item['title'],description,doi or item['id'],'publication',entities=entities,
                             canonical_key='doi:'+doi.removeprefix('https://doi.org/').lower() if doi else None,raw=item))
    return Batch(output,state={'cursor':data['meta']['next_cursor']} if data['meta'].get('next_cursor') else {},total=data['meta'].get('count'))


def bn(client, config, state, limit):
    url=state.get('next_url') or 'https://data.bn.org.pl/api/bibs.json'
    params={'title':config.get('query','robotyka'),'limit':min(limit or 100,100)} if not state.get('next_url') else None
    data=client.json(url,params=params)
    output=[record(i['id'],i.get('title') or i.get('titleProper',''),None,i.get('url') or 'https://data.bn.org.pl/api/bibs/'+str(i['id'])+'.json','publication',raw=i) for i in data.get('bibs',[]) if i.get('title') or i.get('titleProper')]
    return Batch(output,state={'next_url':data['nextPage']} if data.get('nextPage') else {})


def datasets(client, config, state, limit):
    data=client.json('https://api.dane.gov.pl/1.4/datasets',params={'q':config.get('query','innowacje'),'page':state.get('page',1),'per_page':min(limit or 100,100)})
    output=[]
    for i in data['data']:
        a=i['attributes'];title=a.get('title'); description=a.get('description')
        if title:
            output.append(record(i['id'],title,description,a.get('link') or 'https://dane.gov.pl/pl/dataset/'+i['id'],'innovation',subtype='data_catalog',raw=i))
    return Batch(output,state={'page':int(state.get('page',1))+1} if data.get('links',{}).get('next') else {})


def enrichment(client, config, state, limit):
    data=client.json(config['url'],params=config.get('params'))
    items=data[config['items_path']]
    entities=[{'id':str(i[config['id_field']]),'external_id':'teryt:'+str(i[config['id_field']]),'name':i[config['name_field']],'kind':'municipality','source_url':config['url'],'raw':i} for i in items]
    return Batch(entities=entities,total=data.get('totalRecords'))


def krs(client, config, state, limit):
    if not config.get('numbers'):
        raise AccessRequired('Ustaw numbers z numerami KRS. Weryfikacja podmiotów działa po identyfikatorze.')
    entities=[]
    for number in config['numbers']:
        url='https://api-krs.ms.gov.pl/api/krs/OdpisAktualny/'+str(number).zfill(10)
        data=client.json(url,params={'rejestr':'P','format':'json'})
        name=data['odpis']['dane']['dzial1']['danePodmiotu']['nazwa']
        entities.append({'id':number,'external_id':'krs:'+str(number).zfill(10),'name':name,'raw':data,'source_url':url})
    return Batch(entities=entities)


def bzp(client, config, state, limit):
    from datetime import datetime,timedelta,timezone
    start=(datetime.now(timezone.utc)-timedelta(days=7)).strftime('%Y-%m-%d')
    params={'NoticeType':'ContractNotice','PublicationDateFrom':start,'PublicationDateTo':datetime.now(timezone.utc).strftime('%Y-%m-%d'),'PageSize':min(limit or 100,100),'PageNumber':state.get('page',1)}
    data=client.json('https://ezamowienia.gov.pl/mo-board/api/v1/notice',params=params)
    output=[]
    for i in data:
        key=i.get('objectId') or i.get('noticeId')
        title=i.get('orderObject') or i.get('orderTitle')
        if key and title:
            output.append(record(key,title,i.get('orderDescription') or clean(i.get('htmlBody','')),'https://ezamowienia.gov.pl/mo-board/api/v1/Board/GetNoticePdfById?noticeId='+key,'project',subtype='procurement',raw=i))
    return Batch(output,state={'page':int(state.get('page',1))+1} if data else {},total=len(data))


def ted(client, config, state, limit):
    page=int(state.get('page',1))
    data=client.json('https://api.ted.europa.eu/v3/notices/search',body={'query':'publication-date >= 20260101 AND buyer-country = POL','fields':['publication-number','notice-title','buyer-name'],'page':page,'limit':min(limit or 100,100),'scope':'ACTIVE'})
    output=[]
    for i in data.get('notices',[]):
        key=i.get('publication-number')
        title=i.get('notice-title')
        if isinstance(title,dict):title=next(iter(title.values()),'')
        if isinstance(title,list):title=' '.join(title)
        if key and title:output.append(record(key,title,None,'https://ted.europa.eu/en/notice/-/detail/'+key,'project',subtype='procurement',raw=i))
    return Batch(output,state={'page':page+1} if output else {},total=data.get('totalNoticeCount'))


def epo(client, config, state, limit):
    import base64
    key,secret=required('EPO_CONSUMER_KEY'),required('EPO_CONSUMER_SECRET')
    auth=base64.b64encode((key+':'+secret).encode()).decode()
    token=client.json('https://ops.epo.org/3.2/auth/accesstoken',body=b'grant_type=client_credentials',headers={'Authorization':'Basic '+auth,'Content-Type':'application/x-www-form-urlencoded'})['access_token']
    start=int(state.get('offset',1));end=start+min(limit or 100,100)-1
    root=etree.fromstring(client.request('https://ops.epo.org/3.2/rest-services/published-data/search/biblio',params={'q':config.get('query','robotics')},headers={'Authorization':'Bearer '+token,'Range':f'{start}-{end}'}))
    output=[]
    for doc in root.xpath('//*[local-name()="exchange-document"]'):
        key=doc.get('country','')+doc.get('doc-number','')+doc.get('kind','')
        title=doc.xpath('.//*[local-name()="invention-title"]/text()')
        if title:output.append(record(key,title[0],None,'https://worldwide.espacenet.com/publicationDetails/biblio?CC='+doc.get('country','')+'&NR='+doc.get('doc-number',''),'patent',raw=etree.tostring(doc,encoding='unicode')))
    return Batch(output,state={'offset':end+1} if output else {})


CONNECTORS.update(openalex=openalex,bn=bn,datasets=datasets,enrichment=enrichment,krs=krs,bzp=bzp,ted=ted,epo=epo)


def reviewed_pages(client,config,state,limit):
    """Recheck documented solutions; changed/missing evidence never stays verified."""
    catalog_path=Path(config['catalog_file'])
    if not catalog_path.is_absolute():catalog_path=Path(__file__).resolve().parent/catalog_path
    entries=json.loads(catalog_path.read_text())
    items,next_state=select_batch(entries,state,limit)
    output=[]
    for item in items:
        body=clean(client.text(item['url'],cache=True))
        found=item['proof'].casefold() in body.casefold() and not re.search(r'discontinued|no longer available|wycofan.{0,15}(ofert|sprzedaż)',body,re.I)
        raw={**item,'country':'PL','review_marker_present':found}
        output.append(record(item['key'],item['title'],item['description'],item['url'],'innovation',
                             entities=[{'name':item['owner'],'role':'developer'}],raw=raw,subtype='documented_solution'))
    return Batch(output,state=next_state,total=len(entries))

CONNECTORS['reviewed_pages']=reviewed_pages


def ncbr_facts(client,config,state,limit):
    import source_only
    from concurrent.futures import ThreadPoolExecutor
    batch=ncbr(client,{**config,'enrich_limit':0},state,limit)
    def expand(item):
        facts=source_only.extract_ncbr(client.text(item['url'],cache=True),item['url'])
        item['raw']={**item['raw'],'country':'PL','source_facts':facts}
        item['description']=facts.get('description',{}).get('value')
        return item
    with ThreadPoolExecutor(max_workers=4) as pool:batch.records=list(pool.map(expand,batch.records))
    return batch

CONNECTORS['ncbr_facts']=ncbr_facts

from catalog_sources import imn, interreg_stories
CONNECTORS.update(imn_technologies=imn, interreg_stories=interreg_stories)
