// Journey progress and the memorisation deck. Kept on the device, like the daily ritual.
import '../storage';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { todayKey } from '../algorithm';
import { NODES, NODE_MAP } from './path';
import { isDue, MASTERED_BOX, review, type Card } from './quiz';

type NodeResult = { times: number; perfect: boolean; last: string };

type Stored = {
  done: Record<string, NodeResult>;
  cards: Record<string, Card>;
};

const KEY = 'selah.journey';

function load(): Stored {
  const s: Stored = { done: {}, cards: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(s, JSON.parse(raw));
  } catch {}
  return s;
}

function save(s: Stored) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

type Ctx = Stored & {
  /** index of the first stop not finished yet (NODES.length when all are done) */
  current: number;
  isUnlocked: (nodeId: string) => boolean;
  completeNode: (nodeId: string, mistakes: number) => { firstTime: boolean; added: number };
  addCard: (verseId: string) => void;
  removeCard: (verseId: string) => void;
  reviewCard: (verseId: string, correct: boolean) => void;
  dueIds: string[];
  masteredCount: number;
};

const JourneyContext = createContext<Ctx | null>(null);

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Stored>(load);

  const commit = useCallback((fn: (s: Stored) => Stored) => {
    setState((prev) => {
      const next = fn(prev);
      save(next);
      return next;
    });
  }, []);

  const completeNode = useCallback(
    (nodeId: string, mistakes: number) => {
      const node = NODE_MAP[nodeId];
      const firstTime = !state.done[nodeId];
      const today = todayKey();
      const newIds = node ? node.verseIds.filter((id) => !state.cards[id]) : [];
      commit((s) => {
        const prev = s.done[nodeId];
        const cards = { ...s.cards };
        for (const id of newIds) cards[id] = { box: 0, due: today, reps: 0, added: today };
        return {
          ...s,
          cards,
          done: { ...s.done, [nodeId]: { times: (prev?.times ?? 0) + 1, perfect: (prev?.perfect ?? false) || mistakes === 0, last: today } },
        };
      });
      return { firstTime, added: newIds.length };
    },
    [commit, state.done, state.cards],
  );

  const addCard = useCallback(
    (verseId: string) =>
      commit((s) => {
        if (s.cards[verseId]) return s;
        const today = todayKey();
        return { ...s, cards: { ...s.cards, [verseId]: { box: 0, due: today, reps: 0, added: today } } };
      }),
    [commit],
  );

  const removeCard = useCallback(
    (verseId: string) =>
      commit((s) => {
        const cards = { ...s.cards };
        delete cards[verseId];
        return { ...s, cards };
      }),
    [commit],
  );

  const reviewCard = useCallback(
    (verseId: string, correct: boolean) =>
      commit((s) => {
        const c = s.cards[verseId];
        if (!c) return s;
        return { ...s, cards: { ...s.cards, [verseId]: review(c, correct, todayKey()) } };
      }),
    [commit],
  );

  const value = useMemo<Ctx>(() => {
    let current = NODES.findIndex((n) => !state.done[n.id]);
    if (current < 0) current = NODES.length;
    const today = todayKey();
    const entries = Object.entries(state.cards);
    // most overdue first, new cards last
    const dueIds = entries
      .filter(([, c]) => isDue(c, today))
      .sort((a, b) => (a[1].reps === 0 ? 1 : 0) - (b[1].reps === 0 ? 1 : 0) || a[1].due.localeCompare(b[1].due))
      .map(([id]) => id);
    return {
      ...state,
      current,
      isUnlocked: (id) => {
        const i = NODES.findIndex((n) => n.id === id);
        return i >= 0 && (i <= current || !!state.done[id]);
      },
      completeNode,
      addCard,
      removeCard,
      reviewCard,
      dueIds,
      masteredCount: entries.filter(([, c]) => c.box >= MASTERED_BOX).length,
    };
  }, [state, completeNode, addCard, removeCard, reviewCard]);

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error('useJourney outside provider');
  return ctx;
}
