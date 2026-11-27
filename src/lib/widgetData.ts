// Builds the small, plain payload the home and lock screen widgets render.
// No runtime imports on purpose: the widget runtime only sees these props, and
// the unit tests load this file straight from Node.
import type { Lang } from './i18n';
import type { Translation, Verse } from './verses';
import { chunk, gardenArt, gardenStage, GARDEN_STAGE_NAMES, seloFace, seloMood, type ArtBox, type SeloMood } from './widgetArt.ts';

export type WidgetPick = {
  /** verse id, used for the selah://post/<id> deep link */
  id: string;
  /** full reference in the chosen translation, e.g. "Mazmur 23:1-4" */
  ref: string;
  /** book part of the short reference, e.g. "Mzm" (lock screen circle) */
  book: string;
  /** chapter and verse part, e.g. "23:1-4" */
  cv: string;
  /** passage text, trimmed for a widget */
  body: string;
};

export type VerseWidgetProps = {
  /** small heading, e.g. "Ayat hari ini" */
  label: string;
  /** e.g. "Jumat, 27 Nov" */
  date: string;
  /** translation short name, e.g. "TB" */
  tr: string;
  /** button text for cycling picks */
  next: string;
  /** today's verse first, then two more for the "another verse" button */
  picks: WidgetPick[];
  /** which pick is showing */
  i: number;
  /** consecutive days Selah was opened, counting today if `done` */
  streak: number;
  /** opened today already */
  done: boolean;
  /** e.g. "hari berturut-turut" */
  streakLabel: string;
  /** Selo, drawn as rounded boxes (see widgetArt), in groups of ten for Glance; null before the app first runs */
  selo: SeloArt | null;
};

export type SeloArt = {
  mood: Exclude<SeloMood, 'sleep'>;
  /** awake face for the streak mood */
  art: ArtBox[][];
  /** asleep face, shown at night whatever the streak */
  night: ArtBox[][];
  /** one line beside Selo, e.g. "Selo senang kamu datang" */
  line: string;
  nightLine: string;
};

export type GardenWidgetProps = {
  /** e.g. "Taman iman" */
  title: string;
  /** e.g. "Pohon muda" */
  stageName: string;
  stage: number;
  streak: number;
  done: boolean;
  /** e.g. "hari" */
  dayLabel: string;
  /** what grows next, e.g. "3 hari lagi jadi Pohon berbuah"; empty at the last stage */
  nextLine: string;
  art: ArtBox[][];
  selo: SeloArt | null;
};

export type Streak = { last: string; count: number };

const MAX_BODY = 320;
const PICKS_PER_DAY = 3;

const DAYS: Record<Lang, string[]> = {
  id: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
const MONTHS: Record<Lang, string[]> = {
  id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const LABELS: Record<Lang, { label: string; next: string; streakLabel: string }> = {
  id: { label: 'Ayat hari ini', next: 'Ayat lain', streakLabel: 'hari berturut-turut' },
  en: { label: 'Verse of the day', next: 'Another verse', streakLabel: 'day streak' },
};
const SELO_LINES: Record<Lang, Record<SeloArt['mood'] | 'night', string>> = {
  id: {
    sleepy: 'Selo menunggumu',
    waiting: 'Selo siap menemanimu',
    happy: 'Selo senang kamu datang',
    proud: 'Selo bangga padamu',
    night: 'Selo sudah tidur',
  },
  en: {
    sleepy: 'Selo is waiting for you',
    waiting: 'Selo is ready when you are',
    happy: 'Selo is glad you came',
    proud: 'Selo is proud of you',
    night: 'Selo is asleep',
  },
};
const GARDEN_LABELS: Record<Lang, { title: string; dayLabel: string; next: (days: number, name: string) => string }> = {
  id: { title: 'Taman iman', dayLabel: 'hari', next: (n, name) => `${n} hari lagi jadi ${name}` },
  en: { title: 'Faith garden', dayLabel: 'days', next: (n, name) => `${n} more ${n === 1 ? 'day' : 'days'} to ${name}` },
};
const STAGE_STARTS = [0, 1, 3, 7, 14, 30, 100];

export function seloArt(streak: number, done: boolean, lang: Lang): SeloArt {
  const mood = seloMood(streak, done);
  return {
    mood,
    art: chunk(seloFace(mood)),
    night: chunk(seloFace('sleep')),
    line: SELO_LINES[lang][mood],
    nightLine: SELO_LINES[lang].night,
  };
}

const SHORT: Record<Translation, string> = { tb: 'TB', bimk: 'BIMK', kjv: 'KJV' };

export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Same hash as algorithm.verseOfTheDay, so the widget and the app agree. */
function dayHash(day: string): number {
  let h = 0;
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0;
  return h;
}

export function formatWidgetDate(d: Date, lang: Lang): string {
  return `${DAYS[lang][d.getDay()]}, ${d.getDate()} ${MONTHS[lang][d.getMonth()]}`;
}

/** Cut at a word boundary so the widget never ends mid-word. */
export function trimBody(text: string, max = MAX_BODY): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:.\s]+$/, '')}…`;
}

/** "1 Kor 13:4-7" → { book: "1 Kor", cv: "13:4-7" } */
export function splitRef(ref: string): { book: string; cv: string } {
  const at = ref.lastIndexOf(' ');
  if (at <= 0) return { book: ref, cv: '' };
  return { book: ref.slice(0, at), cv: ref.slice(at + 1) };
}

function toPick(v: Verse, t: Translation): WidgetPick {
  const p = v.text[t] ?? v.text.tb;
  // Chapter:verse comes from the translation's own title (TB numbers some Psalms
  // differently from `ref`); the short book name comes from `ref`, except for
  // KJV, whose English title would sit oddly next to an Indonesian abbreviation.
  const { cv } = splitRef(p.title);
  const book = t === 'kjv' ? splitRef(p.title).book : splitRef(v.ref).book;
  return { id: v.id, ref: p.title, book, cv, body: trimBody(p.verses.map((x) => x.text).join(' ')) };
}

/** Count today as opened. Yesterday keeps the streak going; a gap restarts it. */
export function touchStreak(prev: Streak | null, today: Date): Streak {
  const key = dayKey(today);
  if (prev?.last === key) return prev;
  const y = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  return { last: key, count: prev?.last === dayKey(y) ? prev.count + 1 : 1 };
}

/** What the streak will read on `date` if the app is not opened again before then. */
export function streakOn(s: Streak | null, date: Date): { streak: number; done: boolean } {
  if (!s) return { streak: 0, done: false };
  const key = dayKey(date);
  if (s.last === key) return { streak: s.count, done: true };
  const y = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  return { streak: s.last === dayKey(y) ? s.count : 0, done: false };
}

export function verseWidgetProps(
  verses: Verse[],
  date: Date,
  translation: Translation,
  lang: Lang,
  streak: Streak | null = null,
): VerseWidgetProps {
  const h = dayHash(dayKey(date));
  const n = verses.length;
  const picks: WidgetPick[] = [];
  const used = new Set<number>();
  // First pick is the Verse of the Day; the rest step through the list with a
  // stride derived from the day, so each day gets a different pair.
  const stride = 1 + (h % Math.max(1, n - 1));
  for (let k = 0, idx = h % n; picks.length < Math.min(PICKS_PER_DAY, n) && k < n * 2; k++, idx = (idx + stride) % n) {
    if (used.has(idx)) {
      idx = (idx + 1) % n;
      if (used.has(idx)) continue;
    }
    used.add(idx);
    picks.push(toPick(verses[idx], translation));
  }
  return {
    ...LABELS[lang],
    ...streakOn(streak, date),
    date: formatWidgetDate(date, lang),
    tr: SHORT[translation],
    picks,
    i: 0,
    selo: seloArt(streakOn(streak, date).streak, streakOn(streak, date).done, lang),
  };
}

export function gardenWidgetProps(date: Date, lang: Lang, streak: Streak | null = null): GardenWidgetProps {
  const s = streakOn(streak, date);
  const stage = gardenStage(s.streak);
  const names = GARDEN_STAGE_NAMES[lang];
  const L = GARDEN_LABELS[lang];
  return {
    title: L.title,
    stageName: names[stage],
    stage,
    streak: s.streak,
    done: s.done,
    dayLabel: L.dayLabel,
    nextLine: stage < 6 ? L.next(STAGE_STARTS[stage + 1] - s.streak, names[stage + 1]) : '',
    art: chunk(gardenArt(s.streak)),
    selo: seloArt(s.streak, s.done, lang),
  };
}

/** Hours at which the widget's light changes (dawn, day, dusk, night). */
export const DAY_PERIODS = [5, 10, 16, 19] as const;

/**
 * Midnight plus each change of light for `days` days, so iOS redraws the sky
 * and wakes or beds Selo without the app running.
 */
export function widgetMoments(now: Date, days: number): Date[] {
  const out: Date[] = [now];
  for (let d = 0; d < days; d++) {
    for (const hour of [0, ...DAY_PERIODS]) {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, hour);
      if (at > now) out.push(at);
    }
  }
  return out;
}

/** Today plus the next `days` midnights, so iOS can roll over without the app. */
export function verseWidgetTimeline(
  verses: Verse[],
  now: Date,
  translation: Translation,
  lang: Lang,
  streak: Streak | null = null,
  days = 7,
) {
  return widgetMoments(now, days).map((date) => ({ date, props: verseWidgetProps(verses, date, translation, lang, streak) }));
}

export function gardenWidgetTimeline(now: Date, lang: Lang, streak: Streak | null = null, days = 7) {
  return widgetMoments(now, days).map((date) => ({ date, props: gardenWidgetProps(date, lang, streak) }));
}
