import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fetchBibleChapter } from './bibleService.js';

test('todos los libros y capítulos locales tienen texto y conservan acentos', async (t) => {
  const manifest = JSON.parse(await readFile(new URL('../data/bibleBooks.json', import.meta.url), 'utf8'));
  assert.equal(manifest.length, 66);
  assert.equal(manifest.reduce((n, b) => n + b.caps, 0), 1189);
  t.mock.method(globalThis, 'fetch', async (url) => ({ ok: true, json: async () => JSON.parse(await readFile(new URL('../../public' + url, import.meta.url), 'utf8')) }));
  for (const book of manifest) {
    for (let chapter = 1; chapter <= book.caps; chapter++) {
      const text = await fetchBibleChapter(book.id, chapter);
      assert.ok(text.length > 10);
      assert.ok(!text.includes('\uFFFD'));
    }
  }
  assert.match(await fetchBibleChapter('GEN', 1), /principio/);
  assert.match(await fetchBibleChapter('JHN', 3), /amó Dios al mundo/);
  assert.match(await fetchBibleChapter('REV', 22), /Jesucristo/);
});
test('rechaza identificadores inválidos, capítulos inexistentes y cancelaciones', async () => {
  await assert.rejects(fetchBibleChapter('../invalid', 1), /no válido/);
  await assert.rejects(fetchBibleChapter('GEN', 999), /no válido/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(fetchBibleChapter('JHN', 3, controller.signal), { name: 'AbortError' });
});
