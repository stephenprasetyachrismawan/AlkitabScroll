// Exercise builders for the journey quiz and for memorisation practice.
// Pure functions over plain strings, seeded so a lesson looks the same when reopened.
import type { JourneyNode } from './path';

/** Small deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function shuffle<T>(xs: readonly T[], rand: () => number): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Words too common to be worth hiding.
const STOP = new Set(
  (
    'yang dan di ke dari itu ini dengan untuk akan tidak dalam pada oleh karena sebab aku engkau kamu ia dia kami kita mereka ' +
    'adalah juga atau tetapi supaya bahwa jika jangan telah sudah pun lah nya mu ku segala semua sebagai seperti bagi ' +
    'yaitu bukan sesuatu sesuatupun bagaimanakah bagaimana demikianlah demikian maka lalu sampai sekarang orang sangat ada hanya ' +
    'lebih sendiri bersama-sama para dekat apa-apa apabila sehingga kepada kepadamu kepadaku kepadanya padamu padaku daripada ' +
    'terhadap tentang selalu setiap biarlah hendaklah sekalipun walaupun meskipun barangsiapa siapa itulah inilah engkaulah ' +
    'kalau ketika sebab-nya seorang sekarang sebelum sesudah karena-Nya pula saja masih belum oleh-Nya dapat boleh harus mau ' +
    'every into over unto even therefore because those these things thing hath doth said saith shalt wilt also might would could should ' +
    'the and of to in that is it for not be he his him with as unto shall they them their you your ye thee thou thy my me we our ' +
    'but are was were have hath this which from all by will who what when then there upon also'
  ).split(' '),
);

/** The bare word inside a token: letters, digits, hyphen, apostrophe. */
export function core(token: string) {
  return token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

export const norm = (w: string) => core(w).toLowerCase();

export function tokens(text: string) {
  return text.split(/\s+/).filter(Boolean);
}

function hideable(token: string) {
  const w = core(token);
  return w.length >= 4 && !STOP.has(w.toLowerCase()) && !/\d/.test(w);
}

/** Every distinct hideable word in a set of texts, for distractors. */
export function wordPool(texts: string[]) {
  const seen = new Map<string, string>();
  for (const t of texts) for (const tok of tokens(t)) if (hideable(tok)) seen.set(norm(tok), core(tok));
  return [...seen.values()];
}

export type Blank = {
  /** the verse split on spaces */
  tokens: string[];
  /** token indexes that are hidden, in reading order */
  holes: number[];
  /** the hidden words (bare, original case), in hole order */
  answers: string[];
  /** answers plus distractors, shuffled */
  bank: string[];
};

/**
 * Hide `count` words, spread across the verse, and offer a word bank with a few
 * look-alike distractors (similar length, from the pool, never a correct word).
 */
export function makeBlank(text: string, count: number, pool: string[], seed: number, extra = 2): Blank {
  const rand = rng(seed);
  const toks = tokens(text);
  const candidates = toks.map((t, i) => (hideable(t) ? i : -1)).filter((i) => i >= 0);
  const n = Math.max(1, Math.min(count, candidates.length));
  let holes: number[] = [];
  if (candidates.length) {
    // one word from each of n even slices keeps blanks apart
    for (let k = 0; k < n; k++) {
      const slice = candidates.slice(Math.floor((k * candidates.length) / n), Math.floor(((k + 1) * candidates.length) / n));
      if (!slice.length) continue;
      // the longer words in a slice carry the meaning; pick one of the two longest
      const ranked = slice.slice().sort((a, b) => core(toks[b]).length - core(toks[a]).length);
      holes.push(ranked[Math.floor(rand() * Math.min(2, ranked.length))]);
    }
  } else {
    // a verse of tiny words: hide the longest
    let best = 0;
    toks.forEach((t, i) => {
      if (core(t).length > core(toks[best]).length) best = i;
    });
    holes = [best];
  }
  holes.sort((a, b) => a - b);
  const answers = holes.map((i) => core(toks[i]));
  const taken = new Set(answers.map((a) => a.toLowerCase()));
  const distractors: string[] = [];
  for (const target of answers) {
    const near = shuffle(
      pool.filter((w) => !taken.has(w.toLowerCase()) && Math.abs(w.length - target.length) <= 2),
      rand,
    );
    for (const w of near) {
      if (distractors.length >= Math.max(extra, n + 1)) break;
      if (!taken.has(w.toLowerCase())) {
        distractors.push(w);
        taken.add(w.toLowerCase());
        break;
      }
    }
  }
  // top up if the pool was thin
  for (const w of shuffle(pool, rand)) {
    if (distractors.length >= Math.max(extra, Math.min(n + 1, 4))) break;
    if (!taken.has(w.toLowerCase())) {
      distractors.push(w);
      taken.add(w.toLowerCase());
    }
  }
  return { tokens: toks, holes, answers, bank: shuffle([...answers, ...distractors], rand) };
}

/**
 * Cut a verse into pieces of a few words, breaking after punctuation when it can.
 * Returns the pieces in order; callers shuffle for display.
 */
export function makePieces(text: string, maxPieces = 6): string[] {
  const toks = tokens(text);
  if (toks.length <= 3) return toks;
  const target = Math.max(3, Math.min(maxPieces, Math.round(toks.length / 4)));
  const size = toks.length / target;
  const out: string[] = [];
  let cur: string[] = [];
  for (let i = 0; i < toks.length; i++) {
    cur.push(toks[i]);
    const remainingPieces = target - out.length - 1;
    const atPunct = /[,.;:!?]["”’)]?$/.test(toks[i]) && cur.length >= Math.max(2, size * 0.6);
    const atSize = cur.length >= Math.ceil(size);
    if ((atPunct || atSize) && remainingPieces > 0 && toks.length - i - 1 >= remainingPieces) {
      out.push(cur.join(' '));
      cur = [];
    }
  }
  if (cur.length) out.push(cur.join(' '));
  return out;
}

/** Shuffled order that is never the original order (when there is more than one piece). */
export function scramble<T>(xs: readonly T[], seed: number): T[] {
  const rand = rng(seed);
  if (xs.length < 2) return xs.slice();
  for (let tries = 0; tries < 8; tries++) {
    const s = shuffle(xs, rand);
    if (s.some((x, i) => x !== xs[i])) return s;
  }
  return xs.slice().reverse();
}

/** Pick `n` items other than `exclude`, deterministic. */
export function others<T>(xs: readonly T[], exclude: T, n: number, seed: number): T[] {
  return shuffle(
    xs.filter((x) => x !== exclude),
    rng(seed),
  ).slice(0, n);
}

// ---- Spaced repetition (Leitner boxes) ----

/** Days until the next review, by box. Box 0 = new. */
export const INTERVALS = [0, 1, 3, 7, 14, 30, 60];
export const MASTERED_BOX = 5;

export type Card = { box: number; due: string; reps: number; added: string };

export function addDays(day: string, n: number) {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function review(card: Card, correct: boolean, today: string): Card {
  const box = correct ? Math.min(card.box + 1, INTERVALS.length - 1) : Math.max(1, Math.floor(card.box / 2));
  return { ...card, box, reps: card.reps + 1, due: addDays(today, correct ? INTERVALS[box] : 0) };
}

export const isDue = (card: Card, today: string) => card.due <= today;

/** What kind of exercise fits a card: build the verse first, then recall more and more of it. */
export function exerciseFor(box: number): { kind: 'arrange' } | { kind: 'blank'; count: number } {
  if (box <= 1) return { kind: 'arrange' };
  if (box === 2) return { kind: 'blank', count: 1 };
  if (box === 3) return { kind: 'blank', count: 2 };
  return { kind: 'blank', count: 3 };
}

// ---- Lessons ----

export type VerseText = { id: string; title: string; body: string };

export type Question =
  | { kind: 'story'; key: string; prompt: string; options: string[]; answer: number }
  | { kind: 'ref'; key: string; verse: VerseText; options: string[]; answer: number }
  | { kind: 'blank'; key: string; verse: VerseText; blank: Blank }
  | { kind: 'arrange'; key: string; verse: VerseText; pieces: string[]; shuffled: string[] };

const words = (s: string) => s.split(/\s+/).length;

export function arrangeQuestion(v: VerseText, seed: number, key = `arrange:${v.id}`): Question {
  const pieces = makePieces(v.body, words(v.body) > 30 ? 7 : 6);
  return { kind: 'arrange', key, verse: v, pieces, shuffled: scramble(pieces, seed) };
}

export function blankQuestion(v: VerseText, count: number, pool: string[], seed: number, key = `blank:${v.id}`): Question {
  return { kind: 'blank', key, verse: v, blank: makeBlank(v.body, count, pool, seed) };
}

export function buildLesson(node: JourneyNode, lang: 'id' | 'en', verses: VerseText[], pool: string[], salt = 0): Question[] {
  const seed = hash(node.id) + salt;
  const rand = rng(seed);
  const qs: Question[] = [];

  // the story, with its options shuffled
  const order = shuffle(
    node.story.options.map((_, i) => i),
    rand,
  );
  qs.push({
    kind: 'story',
    key: 'story',
    prompt: node.story.q[lang],
    options: order.map((i) => node.story.options[i][lang]),
    answer: order.indexOf(node.story.answer),
  });

  if (!verses.length) return qs;
  const byLength = verses.slice().sort((a, b) => words(a.body) - words(b.body));
  const used = new Set<string>();
  const take = (pick: (vs: VerseText[]) => VerseText | undefined) => {
    const v = pick(verses.filter((x) => !used.has(x.id))) ?? verses[0];
    used.add(v.id);
    return v;
  };

  // arrange the shortest verse, so it fits on screen
  const shortest = take(() => byLength.find((v) => !used.has(v.id)));
  qs.push(arrangeQuestion(shortest, seed + 1));

  // one gap in a medium verse
  qs.push(blankQuestion(take((vs) => vs[Math.floor(rand() * vs.length)]), 1, pool, seed + 2));

  // which reference is this?
  const refV = take((vs) => vs.slice().sort((a, b) => words(a.body) - words(b.body))[0]);
  const wrong = others(
    verses.map((v) => v.title),
    refV.title,
    2,
    seed + 3,
  );
  const refOpts = shuffle([refV.title, ...wrong], rand);
  qs.push({ kind: 'ref', key: `ref:${refV.id}`, verse: refV, options: refOpts, answer: refOpts.indexOf(refV.title) });

  // two gaps to finish
  qs.push(blankQuestion(take((vs) => vs[Math.floor(rand() * vs.length)]), 2, pool, seed + 4));
  return qs;
}

/** Is the arrangement right? Compared by text, so repeated pieces are interchangeable. */
export function arrangeCorrect(pieces: string[], picked: string[]) {
  return picked.length === pieces.length && picked.every((p, i) => p === pieces[i]);
}

export function blankCorrect(blank: Blank, filled: (string | null)[]) {
  return blank.answers.every((a, i) => (filled[i] ?? '').toLowerCase() === a.toLowerCase());
}
