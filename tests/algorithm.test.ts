// Run: npm test  (node --experimental-strip-types --test tests/)
import assert from 'node:assert/strict';
import test from 'node:test';
import { bump, buildDistribution, fade, FeedEngine, RANDOM, SOURCE_SHARE, verseOfTheDay, type Route } from '../src/lib/algorithm.ts';

const H = 3600_000;
const now = 1_000_000_000_000;

test('routes fade linearly and expire', () => {
  const r: Route = { source: 'like', category: 'joy', strength: 2, ttlHours: 10, expiresAt: now + 5 * H };
  assert.equal(fade(r, now), 1);
  assert.equal(fade(r, now + 5 * H), 0);
});

test('bump stacks onto the faded old strength and is capped', () => {
  let routes: Route[] = [];
  routes = bump(routes, 'save', 'hope', 2, now);
  routes = bump(routes, 'save', 'hope', 2, now);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].strength, 4);
  for (let i = 0; i < 20; i++) routes = bump(routes, 'save', 'hope', 2, now);
  assert.equal(routes[0].strength, 10);
});

test('with no routes everything is random', () => {
  const d = buildDistribution([], now);
  assert.deepEqual(d, [{ key: RANDOM, weight: 1 }]);
});

test('mood outweighs save > like > dwell, random always present', () => {
  let routes: Route[] = [];
  routes = bump(routes, 'mood', 'comfort', 1, now);
  routes = bump(routes, 'save', 'hope', 1, now);
  routes = bump(routes, 'like', 'joy', 1, now);
  routes = bump(routes, 'dwell', 'peace', 1, now);
  const w = Object.fromEntries(buildDistribution(routes, now).map((x) => [x.key, x.weight]));
  assert.ok(w.comfort > w.hope);
  assert.ok(w.hope > w.joy);
  assert.ok(w.joy >= w.peace);
  assert.ok(Math.abs(w[RANDOM] - SOURCE_SHARE.random) < 1e-9);
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
});

test('missing sources give their share back to the rest', () => {
  const routes = bump([], 'mood', 'comfort', 1, now);
  const w = Object.fromEntries(buildDistribution(routes, now).map((x) => [x.key, x.weight]));
  const expected = SOURCE_SHARE.mood / (SOURCE_SHARE.mood + SOURCE_SHARE.random);
  assert.ok(Math.abs(w.comfort - expected) < 1e-9);
});

test('engine never repeats until every verse was shown', () => {
  const verses = Array.from({ length: 50 }, (_, i) => ({ id: `v${i}`, categories: [i % 2 ? 'comfort' : 'joy'] }));
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const engine = new FeedEngine(verses, rand);
  const routes = bump([], 'mood', 'comfort', 3, now);
  const seen = new Set<string>();
  let comfort = 0;
  for (let i = 0; i < 50; i++) {
    const { verse } = engine.next(routes, now);
    assert.ok(!seen.has(verse.id));
    seen.add(verse.id);
    if (i < 20 && verse.categories[0] === 'comfort') comfort++;
  }
  assert.ok(comfort >= 10, `mood should steer early picks, got ${comfort}/20`);
});

test('verse of the day is stable for a date', () => {
  const list = ['a', 'b', 'c', 'd'];
  assert.equal(verseOfTheDay(list, '2026-10-21'), verseOfTheDay(list, '2026-10-21'));
});
