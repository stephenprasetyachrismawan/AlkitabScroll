// Selah feed algorithm: a stack of "routes".
//
// Every signal (daily mood, save, like, dwelling on a post) pushes a route
// = (source, category, strength, expiry). Routes fade linearly until they expire,
// so the feed follows what the user needs now and never goes stale.
//
// Picking the next post:
//   1. Each source owns a fixed share of probability: mood > save > like > dwell,
//      plus a permanent random share so the feed always explores.
//   2. Inside a source, categories split that share by their faded strength.
//   3. Sources with no live routes give their share back to the rest.
//   4. Sample a category, then an unseen verse from it.

export type Source = 'mood' | 'save' | 'like' | 'dwell';

export type Route = {
  source: Source;
  category: string;
  strength: number;
  ttlHours: number;
  expiresAt: number; // epoch ms
};

export const SOURCE_SHARE: Record<Source | 'random', number> = {
  mood: 0.4,
  save: 0.25,
  like: 0.1,
  dwell: 0.1,
  random: 0.15,
};

export const SOURCE_TTL_HOURS: Record<Source, number> = {
  mood: 72, // 3 days: today's mood stacks on the last two
  save: 24 * 14,
  like: 24 * 7,
  dwell: 72,
};

export const SIGNAL_AMOUNT: Record<Source, number> = {
  mood: 3,
  save: 2,
  like: 1,
  dwell: 0.5,
};

export const MAX_STRENGTH = 10;
export const DWELL_THRESHOLD_MS = 6000;
export const POSTS_BEFORE_SELAH = 30;
export const RANDOM = '__random';

export function fade(route: Route, now: number): number {
  const life = route.ttlHours * 3600_000;
  const left = route.expiresAt - now;
  if (left <= 0) return 0;
  return route.strength * Math.min(1, left / life);
}

/** Same maths as the SQL bump_route function, applied locally for instant feedback. */
export function bump(routes: Route[], source: Source, category: string, amount: number, now: number): Route[] {
  const ttlHours = SOURCE_TTL_HOURS[source];
  const existing = routes.find((r) => r.source === source && r.category === category);
  const next: Route = {
    source,
    category,
    ttlHours,
    strength: Math.min(MAX_STRENGTH, (existing ? fade(existing, now) : 0) + amount),
    expiresAt: now + ttlHours * 3600_000,
  };
  return [...routes.filter((r) => r !== existing), next];
}

export type Distribution = { key: string; weight: number }[];

export function buildDistribution(routes: Route[], now: number): Distribution {
  const bySource = new Map<Source, Map<string, number>>();
  for (const r of routes) {
    const f = fade(r, now);
    if (f <= 0) continue;
    const m = bySource.get(r.source) ?? new Map<string, number>();
    m.set(r.category, (m.get(r.category) ?? 0) + f);
    bySource.set(r.source, m);
  }

  const weights = new Map<string, number>();
  let total = SOURCE_SHARE.random;
  weights.set(RANDOM, SOURCE_SHARE.random);
  for (const [source, cats] of bySource) {
    const share = SOURCE_SHARE[source];
    const sum = [...cats.values()].reduce((a, b) => a + b, 0);
    for (const [cat, f] of cats) {
      weights.set(cat, (weights.get(cat) ?? 0) + (share * f) / sum);
    }
    total += share;
  }
  return [...weights].map(([key, w]) => ({ key, weight: w / total }));
}

export function sample(dist: Distribution, rand: () => number): string {
  let x = rand();
  for (const d of dist) {
    x -= d.weight;
    if (x < 0) return d.key;
  }
  return dist[dist.length - 1]?.key ?? RANDOM;
}

export type VerseLike = { id: string; categories: string[] };

export class FeedEngine<V extends VerseLike> {
  private seen = new Set<string>();
  private byCategory = new Map<string, V[]>();
  private lastCategories: string[] = [];
  private verses: V[];
  private rand: () => number;

  constructor(verses: V[], rand: () => number = Math.random) {
    this.verses = verses;
    this.rand = rand;
    for (const v of verses) {
      for (const c of v.categories) {
        const list = this.byCategory.get(c) ?? [];
        list.push(v);
        this.byCategory.set(c, list);
      }
    }
  }

  markSeen(id: string) {
    this.seen.add(id);
  }

  next(routes: Route[], now = Date.now()): { verse: V; reason: string } {
    if (this.seen.size >= this.verses.length) this.seen.clear();
    const dist = buildDistribution(routes, now);

    for (let attempt = 0; attempt < 8; attempt++) {
      const key = sample(dist, this.rand);
      // Avoid three posts in a row from one category, for variety.
      if (key !== RANDOM && this.lastCategories.length >= 2 && this.lastCategories.every((c) => c === key)) continue;
      const pool = (key === RANDOM ? this.verses : this.byCategory.get(key) ?? []).filter((v) => !this.seen.has(v.id));
      if (pool.length === 0) continue;
      const verse = pool[Math.floor(this.rand() * pool.length)];
      return this.take(verse, key === RANDOM ? 'random' : key);
    }
    const rest = this.verses.filter((v) => !this.seen.has(v.id));
    return this.take(rest[Math.floor(this.rand() * rest.length)], 'random');
  }

  private take(verse: V, reason: string) {
    this.seen.add(verse.id);
    const cat = reason === 'random' ? verse.categories[0] : reason;
    this.lastCategories = [...this.lastCategories, cat].slice(-2);
    return { verse, reason };
  }
}

/** Same verse for everyone on a given day. */
export function verseOfTheDay<V>(verses: V[], day: string): V {
  let h = 0;
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0;
  return verses[h % verses.length];
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
