import hashlib
import ssl
import subprocess
import sys
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


class AccessRequired(Exception):
    pass


def required(name):
    value = os.environ.get(name)
    if not value:
        raise AccessRequired('Wymagana zmienna środowiskowa ' + name)
    return value


class Client:
    def __init__(self, cache):
        self.cache = Path(cache)
        self.cache.mkdir(parents=True, exist_ok=True)

    def request(self, url, *, params=None, body=None, headers=None, cache=False):
        if params:
            url += ('&' if '?' in url else '?') + urllib.parse.urlencode(params, doseq=True)
        if not url.startswith(('https://', 'http://')):
            raise ValueError('Nieprawidłowy adres źródła')
        path = self.cache / hashlib.sha256(url.encode()).hexdigest()
        if cache and path.exists() and time.time() - path.stat().st_mtime < 3600:
            return path.read_bytes()
        request_headers = {'User-Agent': 'RadarInnowacji/0.3 (public research data)', 'Accept': '*/*'}
        request_headers.update(headers or {})
        if isinstance(body, dict):
            body = json.dumps(body).encode()
            request_headers['Content-Type'] = 'application/json'
        for attempt in range(3):
            try:
                request = urllib.request.Request(url, data=body, headers=request_headers)
                with urllib.request.urlopen(request, timeout=35) as response:
                    chunks, size = [], 0
                    while chunk := response.read(1024 * 1024):
                        size += len(chunk)
                        if size > 200 * 1024 * 1024:
                            raise ValueError('Odpowiedź przekracza limit 200 MB')
                        chunks.append(chunk)
                data = b''.join(chunks)
                if cache:
                    temporary = path.with_suffix('.tmp')
                    temporary.write_bytes(data)
                    temporary.replace(path)
                return data
            except urllib.error.URLError as error:
                if isinstance(error,urllib.error.HTTPError):
                    if error.code not in (429,500,502,503,504) or attempt==2:raise RuntimeError(f'HTTP {error.code} ze źródła {urllib.parse.urlsplit(url).hostname}') from None
                    time.sleep(2**attempt);continue
                # macOS curl uses the system trust store. Verification stays on;
                # never use an unverified SSL context or curl --insecure.
                if body is None and sys.platform=='darwin' and isinstance(error.reason,ssl.SSLCertVerificationError):
                    args=['/usr/bin/curl','--fail','--silent','--show-error','--location','--proto-redir','=https','--max-time','35','--max-filesize','200000000']
                    for key,value in request_headers.items():args+=['--header',key+': '+value]
                    result=subprocess.run(args+[url],capture_output=True,timeout=40,check=True)
                    data=result.stdout
                    if len(data)>200*1024*1024:raise ValueError('Odpowiedź przekracza limit 200 MB')
                    if cache:path.write_bytes(data)
                    return data
                raise
            except urllib.error.HTTPError as error:
                if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                    raise RuntimeError(f'HTTP {error.code} ze źródła {urllib.parse.urlsplit(url).hostname}') from None
                retry = error.headers.get('Retry-After', '')
                time.sleep(min(int(retry), 10) if retry.isdigit() else 2 ** attempt)
        raise RuntimeError('Nie udało się pobrać źródła')

    def json(self, url, **kwargs):
        return json.loads(self.request(url, **kwargs))

    def text(self, url, **kwargs):
        return self.request(url, **kwargs).decode('utf-8-sig', errors='replace')
