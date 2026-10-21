"""Import the public-domain RV1909 from a pinned Aquifer revision (stdlib only)."""
import concurrent.futures
import json
import pathlib
import re
import urllib.request
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parents[1]
REV = '84a071324be17c7c66db17dd204d7804e66d728b'
BASE = f'https://raw.githubusercontent.com/BibleAquifer/ReinaValera1909/{REV}/'
DEST = ROOT / 'Frontend/public/biblia/rv1909'

def get(path):
    return urllib.request.urlopen(BASE + path, timeout=60).read()

def convert(path):
    root = ET.fromstring(get(path))
    code = root.find('book').attrib['code']
    name = root.find("para[@style='toc2']").text.strip()
    chapters = {}
    chapter = verse = None
    def add(text):
        if text and chapter and verse:
            chapters[chapter][verse] += text
    def walk(el):
        nonlocal chapter, verse
        if el.tag == 'note':
            return
        if el.tag == 'chapter':
            verse = None
            if 'number' in el.attrib:
                chapter = el.attrib['number']
                chapters[chapter] = {}
            return
        if el.tag == 'verse':
            verse = el.attrib.get('number')
            if verse:
                chapters[chapter][verse] = ''
            return
        if el.tag == 'para' and el.attrib.get('style', '').startswith(('h','toc','mt','s','r','d')):
            return
        add(el.text)
        for child in el:
            walk(child)
            add(child.tail)
    walk(root)
    for verses in chapters.values():
        for number, text in list(verses.items()):
            verses[number] = re.sub(r'\s+', ' ', text).strip()
            if not verses[number]:
                del verses[number] # Empty source milestones reflect versification differences.
    assert list(chapters) == [str(n) for n in range(1, len(chapters)+1)]
    payload = {'version':'rv1909', 'book':code, 'chapters':chapters}
    (DEST / f'{code}.json').write_text(json.dumps(payload, ensure_ascii=False), encoding='utf-8')
    return {'id':code,'nombre':name,'caps':len(chapters),'testamento':'AT' if int(path.split('/')[-1][:2]) <= 39 else 'NT'}, sum(map(len,chapters.values()))

if __name__ == '__main__':
    DEST.mkdir(parents=True, exist_ok=True)
    tree = json.load(urllib.request.urlopen(f'https://api.github.com/repos/BibleAquifer/ReinaValera1909/contents/spa/usx?ref={REV}'))
    paths = sorted(x['path'] for x in tree if x['path'].endswith('.usx'))
    assert len(paths) == 66
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(convert, paths))
    manifest = [item[0] for item in results]
    assert sum(item['caps'] for item in manifest) == 1189
    target = ROOT / 'Frontend/src/data'
    target.mkdir(exist_ok=True)
    (target / 'bibleBooks.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    (DEST / 'SOURCE.md').write_text(f'# Reina-Valera 1909\n\nSource: https://github.com/BibleAquifer/ReinaValera1909\nRevision: {REV}\n\nLicense: Public Domain CC0 https://creativecommons.org/public-domain/cc0/\n\nThe original verse text and historical spelling are preserved. Formatting, notes, Strong annotations and empty source verse milestones are omitted; original verse numbering is preserved. This edition contains 66 books, 1189 chapters; it does not include the Catholic deuterocanonical books.\n\n## Original source notice\n\n' + get('README.md').decode('utf-8'), encoding='utf-8')
    print(f'Imported {len(manifest)} books, 1189 chapters, {sum(item[1] for item in results)} verses.')
