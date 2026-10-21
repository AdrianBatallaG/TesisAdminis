const books = new Map();
export const fetchBibleChapter = async (book, chapter, signal) => {
  if (!/^[A-Z0-9]{3}$/.test(book) || !Number.isInteger(chapter) || chapter < 1) throw new Error('Libro o capítulo no válido.');
  signal?.throwIfAborted();
  let data = books.get(book);
  if (!data) {
    const response = await fetch(`/biblia/rv1909/${book}.json`, { signal });
    if (!response.ok) throw new Error(`No se pudo cargar el capítulo (HTTP ${response.status}).`);
    data = await response.json();
  }
  const verses = data?.chapters?.[chapter];
  if (data?.version !== 'rv1909' || data.book !== book || !verses || !Object.keys(verses).length
    || !Object.entries(verses).every(([number, text]) => /^\d+(?:-\d+)?$/.test(number) && typeof text === 'string' && text.trim())) {
    throw new Error('El capítulo local está incompleto o no válido.');
  }
  signal?.throwIfAborted();
  books.set(book, data);
  return Object.entries(verses).map(([number, text]) => `${number}. ${text}`).join('\n\n');
};
