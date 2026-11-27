// App wiring for the search engine in ./search.ts: builds it once, on first use, from the bundled
// verses and the semantic index. Building takes a few hundred ms on a mid-range phone, so screens
// call `warmVerseSearch()` when they open, after the transition.
import { VerseSearch, type SearchDoc, type SearchMode, type SearchResult, type SearchTranslation } from './search';
import { VERSES } from './verses';

let engine: VerseSearch | null = null;

export function getVerseSearch(): VerseSearch {
  if (!engine) {
    const docs: SearchDoc[] = VERSES.map((v) => ({
      id: v.id,
      ref: v.ref,
      categories: v.categories,
      text: {
        tb: { title: v.text.tb.title, body: v.text.tb.verses.map((x) => x.text).join(' ') },
        bimk: { title: v.text.bimk.title, body: v.text.bimk.verses.map((x) => x.text).join(' ') },
        kjv: { title: v.text.kjv.title, body: v.text.kjv.verses.map((x) => x.text).join(' ') },
      },
    }));
    // Required here, not imported at the top: the index is a 1.3 MB string that should only be
    // parsed when someone actually searches.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SEMANTIC_JSON } = require('../../data/search-semantic') as { SEMANTIC_JSON: string };
    engine = new VerseSearch(docs, JSON.parse(SEMANTIC_JSON));
  }
  return engine;
}

export function warmVerseSearch() {
  if (engine) return;
  // after the screen transition (~280 ms), so the slide never stutters
  setTimeout(() => getVerseSearch(), 350);
}

export function searchVerses(query: string, mode: SearchMode, translation: SearchTranslation, limit?: number): SearchResult {
  return getVerseSearch().search(query, { mode, translation, limit });
}
