// Run: npm test
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { verseOfTheDay } from '../src/lib/algorithm.ts';
import {
  dayKey,
  formatWidgetDate,
  splitRef,
  streakOn,
  touchStreak,
  trimBody,
  verseWidgetProps,
  verseWidgetTimeline,
} from '../src/lib/widgetData.ts';

const VERSES = JSON.parse(readFileSync(new URL('../data/verses.json', import.meta.url), 'utf8'));

test('first pick matches the app verse of the day', () => {
  for (const d of [new Date(2026, 10, 27), new Date(2027, 0, 1), new Date(2026, 1, 28)]) {
    const p = verseWidgetProps(VERSES, d, 'tb', 'id');
    assert.equal(p.picks[0].id, verseOfTheDay(VERSES, dayKey(d)).id);
  }
});

test('three distinct picks per day, all trimmed', () => {
  const p = verseWidgetProps(VERSES, new Date(2026, 10, 27), 'bimk', 'id');
  assert.equal(p.picks.length, 3);
  assert.equal(new Set(p.picks.map((x) => x.id)).size, 3);
  for (const x of p.picks) assert.ok(x.body.length <= 320 && x.body.length > 0);
  assert.equal(p.tr, 'BIMK');
  assert.equal(p.i, 0);
});

test('trimBody cuts on a word and adds an ellipsis', () => {
  const s = trimBody('satu dua tiga empat lima enam tujuh', 20);
  assert.ok(s.endsWith('…'));
  assert.ok(s.length <= 20);
  assert.ok(!s.includes('  '));
  assert.equal(trimBody('pendek'), 'pendek');
});

test('splitRef keeps numbered books whole', () => {
  assert.deepEqual(splitRef('1 Kor 13:4-7'), { book: '1 Kor', cv: '13:4-7' });
  assert.deepEqual(splitRef('Mzm 23:1'), { book: 'Mzm', cv: '23:1' });
});

test('date label in both languages', () => {
  const d = new Date(2026, 10, 27);
  assert.equal(formatWidgetDate(d, 'id'), 'Jumat, 27 Nov');
  assert.equal(formatWidgetDate(d, 'en'), 'Friday, 27 Nov');
});

test('streak grows on consecutive days and restarts after a gap', () => {
  let s = touchStreak(null, new Date(2026, 10, 25));
  assert.equal(s.count, 1);
  s = touchStreak(s, new Date(2026, 10, 25));
  assert.equal(s.count, 1);
  s = touchStreak(s, new Date(2026, 10, 26));
  assert.equal(s.count, 2);
  s = touchStreak(s, new Date(2026, 11, 1));
  assert.equal(s.count, 1);
});

test('future timeline entries show the streak honestly', () => {
  const s = { last: '2026-11-27', count: 5 };
  assert.deepEqual(streakOn(s, new Date(2026, 10, 27)), { streak: 5, done: true });
  assert.deepEqual(streakOn(s, new Date(2026, 10, 28)), { streak: 5, done: false });
  assert.deepEqual(streakOn(s, new Date(2026, 10, 29)), { streak: 0, done: false });
  const tl = verseWidgetTimeline(VERSES, new Date(2026, 10, 27, 9), 'tb', 'id', s);
  assert.equal(tl.length, 7);
  assert.equal(tl[1].date.getHours(), 0);
  assert.equal(tl[2].props.streak, 0);
});

test('short reference follows the translation numbering', () => {
  for (const d of Array.from({ length: 60 }, (_, k) => new Date(2026, 0, 1 + k))) {
    for (const t of ['tb', 'kjv'] as const) {
      for (const x of verseWidgetProps(VERSES, d, t, 'id').picks) assert.ok(x.ref.endsWith(x.cv), `${x.ref} vs ${x.cv}`);
    }
  }
});
