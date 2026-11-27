// Selah verse search: one engine for the search box and for Curhat.
//
// Three signals, each good at a different kind of query, fused per passage:
//
//   1. Words (BM25 over TB, BIMK and KJV at once). Finds the verse you half remember:
//      "kasih itu sabar", "gembala air tenang", "I can do all things". Indonesian affixes are
//      folded (mengasihi ~ kasih, hatiku ~ hati), slang is normalised (gak -> tidak), typos are
//      corrected against the vocabulary (rajawli -> rajawali), and words that appear next to
//      each other in the verse earn a phrase bonus.
//   2. Meaning (offline semantic votes, data/search-semantic.json). A multilingual embedding
//      model scored ~36k everyday words against every passage at build time
//      (scripts/build-search-index.py). "pacarku selingkuh" has no word in common with
//      Mazmur 147:3, but "selingkuh" votes for broken-heart passages. No network, no model on
//      the phone.
//   3. Themes (category votes from the same model). A curhat about work and exhaustion leans
//      toward the "rest" and "work" categories; passages tagged with them rise.
//
// Each signal is scaled to its own best match, then mixed. A query that reads like a quote
// (most of its words occur together in one passage) trusts Words; a feeling trusts Meaning and
// Themes. Results are per passage, merged across translations, with the translation that
// matched best and the words to highlight.
//
// Pure TypeScript with no imports, so node tests can load it directly.

export type SearchTranslation = 'tb' | 'bimk' | 'kjv';

export type SearchDoc = {
  id: string;
  /** short reference, "Mzm 23:1-4" */
  ref: string;
  categories: string[];
  /** full passage text per translation, plus its title ("Mazmur 23:1-4") */
  text: Record<SearchTranslation, { title: string; body: string }>;
};

export type SemanticData = {
  passages: string[];
  categories: string[];
  words: Record<string, string>;
};

export type SearchMode = 'search' | 'curhat';

export type SearchHit = {
  id: string;
  score: number;
  /** translation whose wording matched the query best (or null: matched by meaning only) */
  matchedIn: SearchTranslation | null;
  /** query words found in the passage, as typed or as they appear in it, for highlighting */
  highlight: string[];
  /** which signals carried this hit */
  via: { words: number; meaning: number; theme: number };
};

export type SearchResult = {
  hits: SearchHit[];
  /** strongest themes in the query, best first, with a 0..1 weight */
  themes: { key: string; weight: number }[];
  /** typo fixes applied, e.g. [["rajawli", "rajawali"]] */
  corrected: [string, string][];
  /** the query read like a quote (true) or like a feeling (false) */
  quoteLike: boolean;
};

const TRANSLATIONS: SearchTranslation[] = ['tb', 'bimk', 'kjv'];

// ---------------------------------------------------------------- text

const SLANG: Record<string, string> = {
  ga: 'tidak', gak: 'tidak', nggak: 'tidak', ngga: 'tidak', enggak: 'tidak', kagak: 'tidak', tdk: 'tidak', gk: 'tidak', g: 'tidak',
  udah: 'sudah', udh: 'sudah', dah: 'sudah', sdh: 'sudah', blm: 'belum', belom: 'belum',
  pengen: 'ingin', pingin: 'ingin', pgn: 'ingin', mau: 'mau',
  bgt: 'banget', aja: 'saja', aj: 'saja', doang: 'saja',
  gimana: 'bagaimana', gmn: 'bagaimana', knp: 'kenapa', napa: 'kenapa',
  kalo: 'kalau', klo: 'kalau', kl: 'kalau', yg: 'yang', dgn: 'dengan', sm: 'sama', krn: 'karena', karna: 'karena',
  gue: 'aku', gua: 'aku', gw: 'aku', ane: 'aku', sy: 'saya', lu: 'kamu', lo: 'kamu', loe: 'kamu', km: 'kamu',
  tuhan: 'tuhan', tuh: 'itu', gitu: 'begitu', gini: 'begini', bener: 'benar', banget: 'banget',
  // feelings people type in a curhat, widened to the words the verses use
  capek: 'capek lelah letih', cape: 'capek lelah letih', capai: 'lelah letih', burnout: 'lelah letih beban', ngantuk: 'mengantuk',
  nyerah: 'menyerah lemah', galau: 'galau gelisah bimbang', overthinking: 'khawatir gelisah', insecure: 'minder takut',
  selingkuh: 'selingkuh patah hati', diselingkuhin: 'selingkuh patah hati', putus: 'putus patah hati', kangen: 'rindu', baper: 'sedih',
  stres: 'stres tertekan beban', stress: 'stres tertekan beban', bete: 'kesal', kesel: 'kesal', sebel: 'kesal',
  takut: 'takut', kuatir: 'khawatir', kawatir: 'khawatir', hawatir: 'khawatir', khawatir: 'khawatir',
  sedi: 'sedih', galo: 'galau gelisah', bt: 'kesal', depresi: 'depresi putus asa',
  ortu: 'orang tua', bokap: 'ayah', nyokap: 'ibu', mama: 'ibu', papa: 'ayah', mami: 'ibu', papi: 'ayah', bapak: 'ayah',
  doi: 'pacar', ayang: 'pacar', mantan: 'mantan',
  kerjaan: 'pekerjaan', duit: 'uang', utang: 'hutang', ngutang: 'berhutang',
  ngerasa: 'merasa', ngerti: 'mengerti', mikir: 'berpikir', mikirin: 'memikirkan', nangis: 'menangis', marahin: 'memarahi',
  ngadepin: 'menghadapi', nungguin: 'menunggu', ninggalin: 'meninggalkan', dibohongin: 'dibohongi',
  thx: 'terima kasih', makasih: 'terima kasih', trims: 'terima kasih',
  u: 'you', ur: 'your', im: 'i am', dont: 'do not', cant: 'cannot',
};

const STOP = new Set(
  (
    'yang dan di ke dari ini itu dengan untuk pada adalah dalam tidak akan ada juga atau oleh karena sebagai bagi sudah ' +
    'saya aku kamu engkau dia ia kami kita mereka kau mu ku nya lah kah pun saja sangat lebih telah bisa dapat harus ' +
    'jadi agar supaya maka tetapi tapi namun jika kalau bila seperti sama apa siapa mana bagaimana kenapa mengapa ' +
    'ya yah sih deh dong kok kan nih tuh lagi banget aja gitu begitu begini hal sebuah suatu para pun lalu kemudian ' +
    'ayat firman tentang soal ingat inget lupa cari mencari tolong mohon yg ' +
    'the a an and or of to in on for with is are was were be been am i me my you your he him his she her it its ' +
    'we us our they them their this that these those not no do does did so as at by from but if then than there ' +
    'unto thee thou thy thine ye shall hath doth verse about remember'
  ).split(' '),
);

/** Lowercase, strip accents and punctuation, keep letters, digits and inner hyphens. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Words as typed (after normalisation). "dosa-dosaku" stays one word; it is split later. */
export function tokenize(s: string): string[] {
  return normalize(s)
    .split(' ')
    .map((w) => w.replace(/^-+|-+$/g, ''))
    .filter((w) => w.length > 0 && !/^\d+$/.test(w));
}

/** Expands slang and reduplication ("dosa-dosaku" -> "dosaku"). Can return several words. */
function canonicalWords(w: string): string[] {
  let x = w;
  const dash = x.indexOf('-');
  if (dash > 0) {
    const [a, b] = [x.slice(0, dash), x.slice(dash + 1)];
    x = b.startsWith(a) ? b : a === b ? a : x; // dosa-dosaku, kupu-kupu
    if (x.includes('-')) return x.split('-').flatMap(canonicalWords);
  }
  // letters repeated for feeling: "capeeek", "sedihhh"
  x = x.replace(/(.)\1{2,}/g, '$1');
  const s = SLANG[x];
  if (s) return s.split(' ');
  return [x];
}

const PARTICLE = /(lah|kah|tah|pun)$/;
const POSSESSIVE = /(ku|mu|nya)$/;
const SUFFIX = /(kan|an|i)$/;

/**
 * Forms a word may share with another inflection of the same root, most specific first.
 * Not a full stemmer: it only proposes candidates, and two words match when any form is
 * shared, so an over-eager strip costs little. Covers Indonesian prefixes/suffixes and the
 * few English (KJV) endings that matter.
 */
export function forms(word: string): string[] {
  const out = new Set<string>([word]);
  const add = (x: string) => {
    if (x.length >= 3) out.add(x);
  };
  const strip = (w: string): string[] => {
    const res = [w];
    let x = w;
    if (PARTICLE.test(x) && x.length > 5) res.push((x = x.replace(PARTICLE, '')));
    if (POSSESSIVE.test(x) && x.length > 4) res.push((x = x.replace(POSSESSIVE, '')));
    if (SUFFIX.test(x) && x.length > 5) res.push(x.replace(SUFFIX, ''));
    return res;
  };
  for (const s of strip(word)) {
    add(s);
    for (const p of prefixStrip(s)) {
      add(p);
      if (SUFFIX.test(p) && p.length > 4) add(p.replace(SUFFIX, ''));
    }
  }
  // English / KJV
  if (/^[a-z]+$/.test(word) && word.length >= 5) {
    for (const [re, rep] of [
      [/eth$/, ''], [/est$/, ''], [/ied$/, 'y'], [/ies$/, 'y'], [/ed$/, ''], [/ing$/, ''], [/es$/, ''], [/s$/, ''], [/ly$/, ''],
    ] as [RegExp, string][]) {
      if (re.test(word)) {
        const base = word.replace(re, rep);
        add(base);
        add(base + 'e');
      }
    }
  }
  return [...out];
}

function prefixStrip(w: string): string[] {
  const res: string[] = [];
  const v = (c: string) => 'aiueo'.includes(c);
  const tryPre = (pre: string, recode: string[] = ['']) => {
    if (!w.startsWith(pre) || w.length - pre.length < 3) return;
    const rest = w.slice(pre.length);
    for (const r of recode) res.push(r + rest);
  };
  // me-/pe- families with sound changes
  for (const base of ['me', 'pe']) {
    if (!w.startsWith(base)) continue;
    const r = w.slice(base.length);
    if (r.startsWith('ny') && v(r[2] ?? '')) tryPre(base + 'ny', ['s']);
    else if (r.startsWith('ng')) {
      if (v(r[2] ?? '')) tryPre(base + 'ng', ['k', '']);
      else tryPre(base + 'ng');
    } else if (r.startsWith('m')) {
      if (v(r[1] ?? '')) tryPre(base + 'm', ['p', 'm']);
      else tryPre(base + 'm');
    } else if (r.startsWith('n')) {
      if (v(r[1] ?? '')) tryPre(base + 'n', ['t', 'n']);
      else tryPre(base + 'n');
    } else if (base === 'pe' && r.startsWith('r')) {
      tryPre('per');
      tryPre('pe');
    } else tryPre(base);
  }
  for (const pre of ['ber', 'be', 'ter', 'di', 'ke', 'se']) tryPre(pre);
  // two prefixes: memper-, diper-, keber-
  for (const r of [...res]) for (const pre of ['per', 'ber']) if (r.startsWith(pre) && r.length - pre.length >= 3) res.push(r.slice(pre.length));
  return res;
}

/** Damerau-Levenshtein, stops early once over `max`. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, prev2[j - 2] + 1);
      cur[j] = d;
      if (d < rowMin) rowMin = d;
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev2[j] = prev[j];
    prev = cur;
  }
  return prev[b.length];
}

// ---------------------------------------------------------------- index

type Term = { forms: string[] };

type DocIndex = {
  /** form -> term frequency (summed over the tokens that produce the form) */
  tf: Map<string, number>;
  len: number;
  /** canonical form sequence without stop words, for the phrase bonus */
  seq: string[];
  /** canonical form -> surface word as printed, for highlighting */
  surface: Map<string, string>;
  /** normalised text, for the exact-quote bonus */
  flat: string;
};

const B36 = '0123456789abcdefghijklmnopqrstuvwxyz';

export class VerseSearch {
  private docs: SearchDoc[];
  private idx: Record<SearchTranslation, DocIndex[]>;
  private df = new Map<string, number>();
  private avgLen: number;
  private nDocs: number;
  /** words printed in the verses: typo corrections only ever land on these */
  private corpusWords: string[];
  private vocabSet: Set<string>;
  private sem: SemanticData | null;
  private semPassage: number[]; // semantic passage index -> doc index
  private catIndex: Map<string, number>;
  private refs: { books: string[]; chapter: number; from: number; to: number }[];

  constructor(docs: SearchDoc[], semantic: SemanticData | null) {
    this.docs = docs;
    this.sem = semantic;
    const surfaceWords = new Set<string>();
    this.idx = { tb: [], bimk: [], kjv: [] };
    let total = 0;
    for (const t of TRANSLATIONS) {
      for (const d of docs) {
        const di = indexText(d.text[t].body, surfaceWords);
        this.idx[t].push(di);
        total += di.len;
        for (const f of di.tf.keys()) this.df.set(f, (this.df.get(f) ?? 0) + 1);
      }
    }
    this.nDocs = docs.length * TRANSLATIONS.length;
    this.avgLen = total / this.nDocs;
    const docPos = new Map(docs.map((d, i) => [d.id, i]));
    this.semPassage = semantic ? semantic.passages.map((id) => docPos.get(id) ?? -1) : [];
    this.catIndex = new Map((semantic?.categories ?? []).map((c, i) => [c, i]));
    this.refs = docs.map((d) => parseRefs([d.ref, d.text.tb.title, d.text.bimk.title, d.text.kjv.title]));
    this.corpusWords = [...surfaceWords];
    this.vocabSet = new Set([...surfaceWords, ...(semantic ? Object.keys(semantic.words) : [])]);
  }

  search(query: string, opts: { mode?: SearchMode; limit?: number; translation?: SearchTranslation } = {}): SearchResult {
    const mode = opts.mode ?? 'search';
    const limit = opts.limit ?? 40;
    const n = this.docs.length;
    const corrected: [string, string][] = [];

    // 0. A reference ("Yohanes 3", "yoh 3:16", "John 3:16", "mazmur"): those passages, in order.
    const refHits = this.byReference(query);
    if (refHits.length) {
      return {
        hits: refHits.slice(0, limit).map((p, i) => ({
          id: this.docs[p].id,
          score: 2 - i / 1000,
          matchedIn: null,
          highlight: [],
          via: { words: 1, meaning: 0, theme: 0 },
        })),
        themes: [],
        corrected,
        quoteLike: true,
      };
    }

    // 1. Query words: canonical, minus stop words, typos fixed.
    const words: string[] = [];
    for (const raw of tokenize(query)) {
      for (const w of canonicalWords(raw)) {
        if (STOP.has(w) || w.length < 2) continue;
        const fixed = this.known(w) ? w : this.correct(w);
        if (fixed !== w) corrected.push([w, fixed]);
        words.push(fixed);
      }
    }
    if (!words.length) return { hits: [], themes: [], corrected, quoteLike: false };
    const terms: Term[] = words.map((w) => ({ forms: forms(w) }));

    // 2. Words: BM25 per translation, best translation per passage, plus phrase bonus.
    const lex = new Float64Array(n);
    const lexIn: (SearchTranslation | null)[] = new Array(n).fill(null);
    const coverage = new Float64Array(n);
    const k1 = 1.2;
    const b = 0.75;
    const termIdf = terms.map((t) => {
      // a term's df: its most specific form that occurs at all
      for (const f of t.forms) {
        const df = this.df.get(f);
        if (df) return { form: f, idf: Math.log(1 + (this.nDocs - df + 0.5) / (df + 0.5)) };
      }
      return null;
    });
    const qSeq = terms.map((t) => t.forms[t.forms.length - 1]);
    // the query typed word for word, stop words included ("Engkau menemani aku")
    const qFlat = normalize(query);
    const exact = qFlat.includes(' ') ? ' ' + qFlat + ' ' : null;
    for (const tr of TRANSLATIONS) {
      const list = this.idx[tr];
      for (let p = 0; p < n; p++) {
        const d = list[p];
        let s = 0;
        let hit = 0;
        terms.forEach((t, i) => {
          const ti = termIdf[i];
          if (!ti) return;
          let tf = 0;
          for (const f of t.forms) tf = Math.max(tf, d.tf.get(f) ?? 0);
          if (!tf) return;
          hit++;
          s += ti.idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * d.len) / this.avgLen)));
        });
        if (!s) continue;
        // phrase bonus: consecutive query words consecutive in the verse
        if (qSeq.length > 1) {
          const pairs = new Set<string>();
          for (let i = 0; i + 1 < d.seq.length; i++) pairs.add(d.seq[i] + ' ' + d.seq[i + 1]);
          for (let i = 0; i + 1 < terms.length; i++) {
            const a = terms[i].forms;
            const c = terms[i + 1].forms;
            if (a.some((x) => c.some((y) => pairs.has(x + ' ' + y)))) s *= 1.25;
          }
        }
        if (exact && d.flat.includes(exact)) s *= 1.6;
        if (s > lex[p]) {
          lex[p] = s;
          lexIn[p] = tr;
          coverage[p] = hit / terms.length;
        }
      }
    }

    // 3. Meaning + themes: semantic votes from every query word.
    const sem = new Float64Array(n);
    const cats = new Float64Array(this.catIndex.size);
    if (this.sem) {
      for (const w of words) {
        const entry = this.semEntry(w);
        if (!entry) continue;
        const [ps, cs = ''] = entry.split('|');
        for (let i = 0; i + 2 < ps.length + 1; i += 3) {
          const p = this.semPassage[B36.indexOf(ps[i]) * 36 + B36.indexOf(ps[i + 1])];
          if (p >= 0) sem[p] += B36.indexOf(ps[i + 2]);
        }
        for (let i = 0; i + 1 < cs.length + 1; i += 2) cats[cs.charCodeAt(i) - 97] += B36.indexOf(cs[i + 1]);
      }
    }
    const catMax = Math.max(0, ...cats);
    const theme = new Float64Array(n);
    if (catMax > 0) {
      for (let p = 0; p < n; p++) {
        const cs = this.docs[p].categories;
        let s = 0;
        for (const c of cs) s += cats[this.catIndex.get(c) ?? -1] ?? 0;
        theme[p] = s / Math.sqrt(cs.length || 1);
      }
    }

    // 4. Fuse.
    const lexMax = Math.max(0, ...lex);
    const semMax = Math.max(0, ...sem);
    const themeMax = Math.max(0, ...theme);
    let bestCoverage = 0;
    for (let p = 0; p < n; p++) if (lex[p] === lexMax) bestCoverage = Math.max(bestCoverage, coverage[p]);
    // Quote-like: 3+ words and 80% of them in one passage, or most of a short query.
    const quoteLike = lexMax > 0 && (terms.length >= 3 ? bestCoverage >= 0.8 : terms.length === 2 ? bestCoverage === 1 && mode === 'search' : mode === 'search');
    const [wL, wS, wT] =
      mode === 'search' ? (quoteLike ? [0.7, 0.22, 0.08] : [0.45, 0.4, 0.15]) : quoteLike ? [0.5, 0.3, 0.2] : [0.25, 0.5, 0.25];

    const hits: SearchHit[] = [];
    for (let p = 0; p < n; p++) {
      const L = lexMax ? lex[p] / lexMax : 0;
      const S = semMax ? sem[p] / semMax : 0;
      const T = themeMax ? theme[p] / themeMax : 0;
      // a passage that matches every word deserves to beat one that matches a single rare word
      const score = wL * L * (0.6 + 0.4 * coverage[p]) + wS * S + wT * T;
      if (score <= 0) continue;
      hits.push({ id: this.docs[p].id, score, matchedIn: lexIn[p], highlight: [], via: { words: L, meaning: S, theme: T } });
    }
    hits.sort((a, b) => b.score - a.score);
    const top = hits[0]?.score ?? 0;
    // In search, a theme on its own is too loose to show; in Curhat it is the point.
    const floor = mode === 'curhat' ? 0.2 : 0.12;
    const out = hits.filter((h) => h.score >= top * floor && (mode === 'curhat' || h.via.words > 0 || h.via.meaning > 0)).slice(0, limit);
    const pos = new Map(this.docs.map((d, i) => [d.id, i]));
    for (const h of out) {
      const tr = h.matchedIn ?? opts.translation ?? 'tb';
      h.highlight = this.highlights(this.idx[tr][pos.get(h.id)!], terms);
    }

    const themes = [...cats]
      .map((w, i) => ({ key: this.sem!.categories[i], weight: catMax ? w / catMax : 0 }))
      .filter((x) => x.weight >= 0.35)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 4);
    return { hits: out, themes, corrected, quoteLike };
  }

  private byReference(query: string): number[] {
    const m = normalize(query).match(/^((?:[1-3]\s?)?[a-z]+(?:\s[a-z]+)?)(?:\s+(\d+)(?:\s*(?:\s|-|:|\.)\s*(\d+))?)?$/);
    if (!m) return [];
    const book = m[1].replace(/\s+/g, '');
    const chapter = m[2] ? Number(m[2]) : null;
    const verse = m[3] ? Number(m[3]) : null;
    // a bare word only counts as a book when it is a whole book name ("mazmur", not "kasih")
    if (chapter === null && book.length < 4) return [];
    const out: number[] = [];
    this.refs.forEach((r, p) => {
      const bookOk = r.books.some((b) => (chapter === null ? b === book : b.startsWith(book) && book.length >= 2));
      if (!bookOk) return;
      if (chapter !== null && r.chapter !== chapter) return;
      if (verse !== null && (verse < r.from || verse > r.to)) return;
      out.push(p);
    });
    return out.sort((a, b) => this.refs[a].chapter - this.refs[b].chapter || this.refs[a].from - this.refs[b].from);
  }

  private known(w: string): boolean {
    if (this.vocabSet.has(w)) return true;
    return forms(w).some((f) => this.df.has(f) || this.vocabSet.has(f));
  }

  /**
   * Closest word printed in the verses: 1 edit for 4-6 letters, 2 for longer. Short words stay
   * as typed. Only words the model does not know reach here, so slang is never "corrected".
   */
  private correct(w: string): string {
    if (w.length < 4) return w;
    const max = w.length >= 7 ? 2 : 1;
    let best = w;
    let bestD = max + 1;
    for (const v of this.corpusWords) {
      if (Math.abs(v.length - w.length) > max) continue;
      const d = editDistance(w, v, max) + (v[0] === w[0] ? 0 : 0.5);
      if (d < bestD) {
        bestD = d;
        best = v;
        if (d === 1 && v[0] === w[0] && this.df.has(v)) break;
      }
    }
    return bestD <= max ? best : w;
  }

  private semEntry(w: string): string | undefined {
    const words = this.sem!.words;
    if (words[w]) return words[w];
    for (const f of forms(w)) if (words[f]) return words[f];
    return undefined;
  }

  private highlights(d: DocIndex, terms: Term[]): string[] {
    const out = new Set<string>();
    for (const t of terms) {
      for (const f of t.forms) {
        const s = d.surface.get(f);
        if (s) {
          out.add(s);
          break;
        }
      }
    }
    return [...out];
  }
}

/** "Mazmur 23:1-4" -> book keys ["mazmur", ...], chapter 23, verses 1..4 */
function parseRefs(titles: string[]): { books: string[]; chapter: number; from: number; to: number } {
  const books = new Set<string>();
  let chapter = 0;
  let from = 0;
  let to = 0;
  for (const t of titles) {
    const m = t.match(/^(.*?)\s*(\d+):(\d+)(?:-(\d+))?/);
    if (!m) continue;
    books.add(normalize(m[1]).replace(/\s+/g, ''));
    chapter = Number(m[2]);
    from = Number(m[3]);
    to = Number(m[4] ?? m[3]);
  }
  return { books: [...books], chapter, from, to };
}

function indexText(body: string, vocab: Set<string>): DocIndex {
  const tf = new Map<string, number>();
  const seq: string[] = [];
  const surface = new Map<string, string>();
  let len = 0;
  for (const raw of tokenize(body)) {
    for (const w of raw.includes('-') ? canonicalWords(raw) : [raw]) {
      len++;
      vocab.add(w);
      const fs = forms(w);
      for (const f of fs) {
        tf.set(f, (tf.get(f) ?? 0) + 1);
        if (!surface.has(f)) surface.set(f, raw);
      }
      if (!STOP.has(w)) seq.push(...fs);
    }
  }
  return { tf, len, seq: dedupeRuns(seq), surface, flat: ' ' + normalize(body) + ' ' };
}

/** Phrase pairs are checked across every form, so keep the form lists but drop exact repeats. */
function dedupeRuns(seq: string[]): string[] {
  return seq.filter((x, i) => x !== seq[i - 1]);
}
