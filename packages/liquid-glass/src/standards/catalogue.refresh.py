#!/usr/bin/env python3
"""Refresh factual metadata from OMG's complete current catalogue table.

Usage: python packages/liquid-glass/src/standards/catalogue.refresh.py
Offline replay: add --input /path/to/saved.html --retrieved-on YYYY-MM-DD
This deliberately does not change editorial classifications or adapter coverage.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import urlopen

SOURCE_URL = 'https://www.omg.org/spec/'


class CatalogueParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_table = False
        self.in_body = False
        self.cell: dict | None = None
        self.row: list[dict] = []
        self.rows: list[list[dict]] = []
        self.table_text: list[str] = []

    def handle_starttag(self, tag: str, attributes: list[tuple[str, str | None]]) -> None:
        attrs = dict(attributes)
        if tag == 'table' and attrs.get('id') == 'all-table':
            self.in_table = True
        if not self.in_table:
            return
        if tag == 'tbody':
            self.in_body = True
        if tag == 'tr' and self.in_body:
            self.row = []
        if tag == 'td' and self.in_body:
            self.cell = {'parts': [], 'links': []}
        if tag == 'a' and self.cell is not None and attrs.get('href'):
            self.cell['links'].append(urljoin(SOURCE_URL, attrs['href']))

    def handle_data(self, data: str) -> None:
        if self.in_table:
            self.table_text.append(data)
        if self.cell is not None:
            self.cell['parts'].append(data)

    def handle_endtag(self, tag: str) -> None:
        if not self.in_table:
            return
        if tag == 'td' and self.cell is not None:
            self.cell['text'] = ' '.join(''.join(self.cell['parts']).split())
            self.row.append(self.cell)
            self.cell = None
        if tag == 'tr' and self.in_body and self.row:
            self.rows.append(self.row)
            self.row = []
        if tag == 'tbody':
            self.in_body = False
        if tag == 'table':
            self.in_table = False


def parse(raw: bytes, retrieved_on: str) -> dict:
    parser = CatalogueParser()
    parser.feed(raw.decode('utf-8'))
    advertised = re.search(r'Total:\s*(\d+)', ''.join(parser.table_text))
    if not advertised or int(advertised.group(1)) != len(parser.rows):
        raise ValueError('Official total and parsed catalogue rows disagree; snapshot was not written.')
    entries = []
    for row in parser.rows:
        if len(row) != 5 or len(row[1]['links']) != 1 or len(row[2]['links']) != 1:
            raise ValueError('Unexpected table structure; review the source before refreshing.')
        family_url, version_url = row[1]['links'][0], row[2]['links'][0]
        for url in (family_url, version_url):
            parsed = urlparse(url)
            if parsed.scheme != 'https' or parsed.netloc != 'www.omg.org' or not parsed.path.startswith('/spec/'):
                raise ValueError(f'Unexpected source URL: {url}')
        family = family_url.split('/spec/', 1)[1].rstrip('/')
        version, status = row[2]['text'], row[3]['text']
        if status not in ('formal', 'beta'):
            raise ValueError(f'Unreviewed publication status: {status}')
        entries.append({
            'id': f'{family}@{version}', 'name': row[0]['text'],
            'acronym': family, 'displayAcronym': row[1]['text'],
            'version': version, 'status': status, 'publicationDate': row[4]['text'],
            'familyUrl': family_url, 'versionUrl': version_url,
        })
    if len({entry['id'] for entry in entries}) != len(entries):
        raise ValueError('Duplicate version identities; snapshot was not written.')
    return {
        'schemaVersion': 1,
        'source': {
            'url': SOURCE_URL, 'retrievedOn': retrieved_on, 'tableId': 'all-table',
            'scope': 'Every row in the official full list of formally published or finalizing specifications, including formal and beta versions. This is not the historical version archive.',
            'entryCount': len(entries),
            'familyCount': len({entry['familyUrl'] for entry in entries}),
            'formalCount': sum(entry['status'] == 'formal' for entry in entries),
            'betaCount': sum(entry['status'] == 'beta' for entry in entries),
            'sourceHtmlSha256': hashlib.sha256(raw).hexdigest(),
        },
        'entries': entries,
    }


if __name__ == '__main__':
    arguments = argparse.ArgumentParser(description=__doc__)
    arguments.add_argument('--input', type=Path, help='Replay a previously downloaded official catalogue HTML file.')
    arguments.add_argument('--retrieved-on', default=datetime.now(timezone.utc).date().isoformat())
    arguments.add_argument('--output', type=Path, default=Path(__file__).with_name('catalogue.snapshot.json'))
    args = arguments.parse_args()
    datetime.strptime(args.retrieved_on, '%Y-%m-%d')
    raw = args.input.read_bytes() if args.input else urlopen(SOURCE_URL, timeout=30).read()
    result = parse(raw, args.retrieved_on)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"Wrote {result['source']['entryCount']} entries / {result['source']['familyCount']} families to {args.output}")
