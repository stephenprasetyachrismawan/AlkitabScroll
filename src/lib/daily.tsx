// The daily ritual: read a handful of verses slowly, keep a streak.
// A verse counts once it stays on screen past the dwell threshold (same signal the
// feed algorithm uses). Kept on the device; no server round trip.
import './storage';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { todayKey } from './algorithm';

export const DAILY_GOAL = 7;
export const MILESTONES = [3, 7, 30, 100, 365];

type Stored = { day: string; seen: string[]; streak: number; lastDone: string | null };

export type DailyEvent = { id: number; kind: 'done' | 'milestone'; streak: number };

type Ctx = {
  /** verses read slowly today, capped at the goal */
  count: number;
  goal: number;
  /** consecutive days the goal was met; 0 once a day is missed */
  streak: number;
  doneToday: boolean;
  /** the last celebration to show; components react to a new id */
  event: DailyEvent | null;
  tick: (verseId: string) => void;
};

const KEY = 'selah.daily';
const DailyContext = createContext<Ctx | null>(null);

function yesterdayKey(today = new Date()) {
  const d = new Date(today);
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

function load(): Stored {
  const today = todayKey();
  let s: Stored = { day: today, seen: [], streak: 0, lastDone: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) s = { ...s, ...JSON.parse(raw) };
  } catch {}
  if (s.day !== today) s = { ...s, day: today, seen: [] };
  // a missed day breaks the chain
  if (s.lastDone && s.lastDone !== today && s.lastDone !== yesterdayKey()) s.streak = 0;
  return s;
}

function save(s: Stored) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export function DailyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Stored>(load);
  const [event, setEvent] = useState<DailyEvent | null>(null);

  const tick = useCallback((verseId: string) => {
    setState((prev) => {
      const today = todayKey();
      const base = prev.day === today ? prev : { ...prev, day: today, seen: [] };
      if (base.seen.includes(verseId) || base.seen.length >= DAILY_GOAL) return base;
      const next: Stored = { ...base, seen: [...base.seen, verseId] };
      if (next.seen.length === DAILY_GOAL && next.lastDone !== today) {
        next.streak = next.lastDone === yesterdayKey() ? next.streak + 1 : 1;
        next.lastDone = today;
        const kind = MILESTONES.includes(next.streak) ? 'milestone' : 'done';
        setEvent((e) => ({ id: (e?.id ?? 0) + 1, kind, streak: next.streak }));
      }
      save(next);
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      count: Math.min(state.seen.length, DAILY_GOAL),
      goal: DAILY_GOAL,
      streak: state.streak,
      doneToday: state.lastDone === state.day,
      event,
      tick,
    }),
    [state, event, tick],
  );
  return <DailyContext.Provider value={value}>{children}</DailyContext.Provider>;
}

export function useDaily() {
  const ctx = useContext(DailyContext);
  if (!ctx) throw new Error('useDaily outside provider');
  return ctx;
}
