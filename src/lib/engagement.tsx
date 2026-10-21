// Holds the user's likes, saves, mood and route stack, and turns every
// interaction into an algorithm signal (locally at once, then on the server).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { bump, SIGNAL_AMOUNT, todayKey, type Route, type Source } from './algorithm';
import * as api from './api';
import { useAuth } from './auth';
import { MOOD_MAP } from './moods';
import { VERSE_MAP } from './verses';

type Ctx = {
  ready: boolean;
  routes: Route[];
  liked: Set<string>;
  saved: Set<string>;
  likedOrder: string[];
  savedOrder: string[];
  moodToday: string | null;
  toggleLike: (verseId: string) => void;
  toggleSave: (verseId: string) => void;
  recordDwell: (verseId: string) => void;
  chooseMood: (mood: string) => Promise<void>;
};

const EngagementContext = createContext<Ctx | null>(null);

export function EngagementProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const ready = !!userId && loadedFor === userId;
  const [routes, setRoutes] = useState<Route[]>([]);
  const [likedOrder, setLikedOrder] = useState<string[]>([]);
  const [savedOrder, setSavedOrder] = useState<string[]>([]);
  const [moodToday, setMoodToday] = useState<string | null>(null);
  const dwellSent = useRef(new Set<string>());
  const likedRef = useRef(likedOrder);
  const savedRef = useRef(savedOrder);
  useEffect(() => {
    likedRef.current = likedOrder;
    savedRef.current = savedOrder;
  }, [likedOrder, savedOrder]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      try {
        const [r, l, s, m] = await Promise.all([
          api.loadRoutes(userId),
          api.myVerseIds('likes', userId),
          api.myVerseIds('saves', userId),
          api.getMood(userId, todayKey()),
        ]);
        if (!alive) return;
        setRoutes(r);
        setLikedOrder(l);
        setSavedOrder(s);
        setMoodToday(m);
      } catch (e) {
        console.warn('engagement load', e);
      } finally {
        if (alive) setLoadedFor(userId);
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  const signal = useCallback((source: Source, verseId: string, factor = 1) => {
    const verse = VERSE_MAP[verseId];
    if (!verse) return;
    const amount = (SIGNAL_AMOUNT[source] * factor) / verse.categories.length;
    setRoutes((prev) => verse.categories.reduce((acc, c) => bump(acc, source, c, amount, Date.now()), prev));
    for (const c of verse.categories) api.bumpRoute(source, c, amount);
  }, []);

  const toggle = useCallback(
    (kind: 'likes' | 'saves', verseId: string) => {
      if (!userId) return;
      const setOrder = kind === 'likes' ? setLikedOrder : setSavedOrder;
      const current = kind === 'likes' ? likedRef.current : savedRef.current;
      const on = !current.includes(verseId);
      setOrder((prev) => (on ? [verseId, ...prev.filter((x) => x !== verseId)] : prev.filter((x) => x !== verseId)));
      api.setMark(kind, userId, verseId, on).catch((e) => console.warn(kind, e));
      if (on) signal(kind === 'likes' ? 'like' : 'save', verseId);
    },
    [userId, signal],
  );

  const recordDwell = useCallback(
    (verseId: string) => {
      if (dwellSent.current.has(verseId)) return;
      dwellSent.current.add(verseId);
      signal('dwell', verseId);
    },
    [signal],
  );

  const chooseMood = useCallback(
    async (mood: string) => {
      if (!userId) return;
      const m = MOOD_MAP[mood];
      await api.setMood(userId, todayKey(), mood);
      const total = Object.values(m.categories).reduce((a, b) => a + b, 0);
      const now = Date.now();
      setRoutes((prev) =>
        Object.entries(m.categories).reduce(
          (acc, [c, w]) => bump(acc, 'mood', c, (SIGNAL_AMOUNT.mood * w) / total, now),
          prev,
        ),
      );
      await Promise.all(
        Object.entries(m.categories).map(([c, w]) => api.bumpRoute('mood', c, (SIGNAL_AMOUNT.mood * w) / total)),
      );
      setMoodToday(mood);
    },
    [userId],
  );

  const value = useMemo<Ctx>(
    () => ({
      ready,
      routes,
      liked: new Set(likedOrder),
      saved: new Set(savedOrder),
      likedOrder,
      savedOrder,
      moodToday,
      toggleLike: (id) => toggle('likes', id),
      toggleSave: (id) => toggle('saves', id),
      recordDwell,
      chooseMood,
    }),
    [ready, routes, likedOrder, savedOrder, moodToday, toggle, recordDwell, chooseMood],
  );

  return <EngagementContext.Provider value={value}>{children}</EngagementContext.Provider>;
}

export function useEngagement() {
  const ctx = useContext(EngagementContext);
  if (!ctx) throw new Error('useEngagement outside provider');
  return ctx;
}
