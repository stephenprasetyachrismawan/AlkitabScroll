// Sharing as sowing (Matthew 13): every verse you pass on is a seed.
// Seeds grow the sower through six stages, and each stage opens a new card theme.
// Pure logic so it can be tested; the React side lives in sowingContext.tsx.
//
// Anti-farming rules, borrowed from how TikTok and Snapchat count streak actions:
// a verse counts once per channel per day, and at most DAILY_CAP seeds a day.

export type ShareChannel = 'image' | 'friend' | 'status';

export type Stage = {
  key: string;
  /** seeds needed to reach this stage */
  at: number;
  name: { id: string; en: string };
  /** Ionicons glyph that grows with the stage */
  icon: string;
  /** card theme this stage opens (see shareCards.ts) */
  unlocks: string | null;
};

export const STAGES: Stage[] = [
  { key: 'seed', at: 0, name: { id: 'Benih', en: 'Seed' }, icon: 'ellipse', unlocks: null },
  { key: 'sprout', at: 3, name: { id: 'Tunas', en: 'Sprout' }, icon: 'leaf-outline', unlocks: 'dawn' },
  { key: 'grow', at: 10, name: { id: 'Bertumbuh', en: 'Growing' }, icon: 'leaf', unlocks: 'olive' },
  { key: 'bloom', at: 25, name: { id: 'Berbunga', en: 'Blooming' }, icon: 'flower-outline', unlocks: 'galilee' },
  { key: 'fruit', at: 50, name: { id: 'Berbuah', en: 'Fruitful' }, icon: 'nutrition-outline', unlocks: 'ink' },
  { key: 'tree', at: 100, name: { id: 'Pohon Rindang', en: 'Great Tree' }, icon: 'git-branch-outline', unlocks: 'gold' },
];

export const DAILY_CAP = 10;

export type SowingState = {
  total: number;
  /** local day key (YYYY-MM-DD) the `today` list belongs to */
  day: string;
  /** `${channel}:${verseId}` already counted today */
  today: string[];
  /** recent days with at least one seed, newest first, max 30 */
  days: string[];
};

export const EMPTY_SOWING: SowingState = { total: 0, day: '', today: [], days: [] };

export function stageFor(total: number): Stage {
  let s = STAGES[0];
  for (const x of STAGES) if (total >= x.at) s = x;
  return s;
}

export function nextStage(total: number): Stage | null {
  return STAGES.find((x) => x.at > total) ?? null;
}

/** 0..1 progress from the current stage towards the next (1 at the last stage). */
export function stageProgress(total: number): number {
  const cur = stageFor(total);
  const next = nextStage(total);
  if (!next) return 1;
  return (total - cur.at) / (next.at - cur.at);
}

/** Theme keys the sower has opened so far. */
export function unlockedThemes(total: number): Set<string> {
  return new Set(STAGES.filter((s) => s.unlocks && total >= s.at).map((s) => s.unlocks as string));
}

export type SowResult = {
  state: SowingState;
  counted: boolean;
  /** set when this seed reached a new stage */
  reached: Stage | null;
};

export function sow(prev: SowingState, channel: ShareChannel, verseId: string, day: string): SowResult {
  const base = prev.day === day ? prev : { ...prev, day, today: [] };
  const key = `${channel}:${verseId}`;
  if (base.today.includes(key) || base.today.length >= DAILY_CAP) return { state: base, counted: false, reached: null };
  const total = base.total + 1;
  const days = base.days[0] === day ? base.days : [day, ...base.days].slice(0, 30);
  const before = stageFor(base.total);
  const after = stageFor(total);
  return {
    state: { total, day, today: [...base.today, key], days },
    counted: true,
    reached: after.key !== before.key ? after : null,
  };
}

/** Which of the last 7 days (oldest first, ending today) had a seed. */
export function weekDots(days: string[], todayKeys: string[]): boolean[] {
  const set = new Set(days);
  return todayKeys.map((k) => set.has(k));
}
