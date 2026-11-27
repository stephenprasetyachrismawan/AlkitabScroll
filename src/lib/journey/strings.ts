// Copy for the journey and memorisation screens. Kept apart from i18n.ts so this feature
// can grow without touching the shared dictionary.
import { useCallback } from 'react';
import { useSettings } from '../settings';
import { VERSE_MAP, passageText, type Translation } from '../verses';
import { wordPool } from './quiz';
import type { VerseText } from './quiz';

const S = {
  tab: { id: 'Perjalanan', en: 'Journey' },
  journeyTitle: { id: 'Perjalanan Alkitab', en: 'Bible Journey' },
  journeySub: { id: 'Dari Abraham sampai Paulus, satu kisah setiap kali.', en: 'From Abraham to Paul, one story at a time.' },
  path: { id: 'Jalur', en: 'Path' },
  memorize: { id: 'Hafalan', en: 'Memorize' },
  start: { id: 'Mulai', en: 'Start' },
  again: { id: 'Ulangi', en: 'Replay' },
  locked: { id: 'Selesaikan kisah sebelumnya dulu', en: 'Finish the story before this one' },
  stopOf: { id: 'Kisah', en: 'Story' },
  readStory: { id: 'Baca kisahnya', en: 'Read the story' },
  readFull: { id: 'Bacaan lengkap', en: 'Full reading' },
  fiveVerses: { id: 'Lima ayat untuk kisah ini', en: 'Five verses for this story' },
  next: { id: 'Lanjut', en: 'Continue' },
  check: { id: 'Periksa', en: 'Check' },
  toQuiz: { id: 'Mulai kuis', en: 'Start the quiz' },
  correct: { id: 'Tepat sekali!', en: 'That’s right!' },
  correctAlt: { id: 'Bagus!', en: 'Nicely done!' },
  correctAlt2: { id: 'Benar!', en: 'Correct!' },
  wrong: { id: 'Belum tepat. Jawabannya:', en: 'Not quite. The answer:' },
  wrongLater: { id: 'Soal ini akan muncul lagi di akhir.', en: 'This one comes back at the end.' },
  qStory: { id: 'Ingat kisahnya?', en: 'Remember the story?' },
  qArrange: { id: 'Susun ayatnya', en: 'Put the verse in order' },
  qBlank: { id: 'Lengkapi ayatnya', en: 'Fill in the verse' },
  qRef: { id: 'Ayat ini dari mana?', en: 'Where is this verse from?' },
  tapPieces: { id: 'Ketuk potongan sesuai urutan', en: 'Tap the pieces in order' },
  tapWords: { id: 'Ketuk kata untuk mengisi', en: 'Tap words to fill the gaps' },
  lessonDone: { id: 'Kisah selesai!', en: 'Story complete!' },
  perfect: { id: 'Tanpa salah sekali pun', en: 'Not a single mistake' },
  mistakes: { id: 'kali salah, tetap selesai', en: 'mistakes, and you finished' },
  addedToDeck: { id: 'ayat masuk ke Hafalan', en: 'verses added to Memorize' },
  backToPath: { id: 'Kembali ke jalur', en: 'Back to the path' },
  quit: { id: 'Keluar', en: 'Quit' },
  journeyEnd: { id: 'Kamu sudah menelusuri seluruh jalur. Ulangi kisah mana pun kapan saja.', en: 'You walked the whole path. Replay any story anytime.' },
  // memorise
  memTitle: { id: 'Hafalan', en: 'Memorize' },
  memSub: { id: 'Sedikit demi sedikit, ayat jadi milikmu.', en: 'Little by little, the verse becomes yours.' },
  due: { id: 'siap diulang', en: 'ready to review' },
  mastered: { id: 'hafal', en: 'mastered' },
  inDeck: { id: 'ayat', en: 'verses' },
  practice: { id: 'Latihan sekarang', en: 'Practice now' },
  nothingDue: { id: 'Semua sudah diulang hari ini', en: 'All caught up for today' },
  practiceAnyway: { id: 'Latihan tambahan', en: 'Extra practice' },
  addVerse: { id: 'Tambah ayat', en: 'Add a verse' },
  searchVerse: { id: 'Cari ayat atau kata…', en: 'Search a verse or word…' },
  emptyDeck: {
    id: 'Belum ada ayat. Selesaikan satu kisah di Jalur, atau tambahkan ayat favoritmu.',
    en: 'No verses yet. Finish a story on the Path, or add a favourite verse.',
  },
  readFirst: { id: 'Baca pelan, lalu coba dari ingatan', en: 'Read it slowly, then try from memory' },
  ready: { id: 'Saya siap', en: 'I’m ready' },
  sessionDone: { id: 'Latihan selesai', en: 'Practice done' },
  nextReview: { id: 'Ayat yang benar akan muncul lagi beberapa hari lagi.', en: 'Verses you got right come back in a few days.' },
  remove: { id: 'Hapus', en: 'Remove' },
  level: { id: 'Tahap', en: 'Stage' },
  added: { id: 'Ditambahkan ke Hafalan', en: 'Added to Memorize' },
} as const;

export type JKey = keyof typeof S;

export function useJ() {
  const { lang } = useSettings();
  return useCallback((k: JKey) => S[k][lang], [lang]);
}

export function verseText(id: string, t: Translation): VerseText | null {
  const v = VERSE_MAP[id];
  if (!v) return null;
  const p = passageText(v, t);
  return { id, title: p.title, body: p.body };
}

const pools: Partial<Record<Translation, string[]>> = {};
/** Distractor words for a translation, built once. */
export function poolFor(t: Translation) {
  if (!pools[t]) pools[t] = wordPool(Object.keys(VERSE_MAP).map((id) => passageText(VERSE_MAP[id], t).body));
  return pools[t]!;
}
