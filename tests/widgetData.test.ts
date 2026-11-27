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
  seloArt,
  gardenWidgetProps,
} from '../src/lib/widgetData.ts';
import { GARDEN_CANVAS, MASCOT_CANVAS, gardenArt, gardenStage, seloFace } from '../src/lib/widgetArt.ts';

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
  // now, then 10/16/19 today, then midnight + four changes of light for six more days
  assert.equal(tl.length, 1 + 3 + 6 * 5);
  assert.equal(tl[1].date.getHours(), 10);
  const sunday = tl.find((e) => e.date.getDate() === 29 && e.date.getHours() === 0);
  assert.equal(sunday?.props.streak, 0);
  assert.equal(sunday?.props.selo.mood, 'sleepy');
  assert.equal(tl[0].props.selo.mood, 'happy');
});

test('Selo follows the streak and every art group fits a Glance Box', () => {
  assert.equal(seloArt(0, false, 'id').mood, 'sleepy');
  assert.equal(seloArt(3, false, 'id').mood, 'waiting');
  assert.equal(seloArt(3, true, 'id').mood, 'happy');
  assert.equal(seloArt(9, true, 'en').mood, 'proud');
  const g = gardenWidgetProps(new Date(2026, 10, 27), 'id', { last: '2026-11-27', count: 12 });
  assert.equal(g.stageName, 'Pohon kecil');
  assert.equal(g.nextLine, '2 hari lagi jadi Pohon muda');
  for (const groups of [g.art, g.selo.art, g.selo.night]) {
    assert.ok(groups.length <= 10);
    for (const grp of groups) assert.ok(grp.length > 0 && grp.length <= 10);
  }
});

test('garden grows through every stage and stays on its canvas', () => {
  const seen = new Set<number>();
  for (let n = 0; n <= 400; n++) {
    seen.add(gardenStage(n));
    for (const [x, y, w, h] of gardenArt(n)) {
      assert.ok(x >= -1 && y >= -1 && x + w <= GARDEN_CANVAS.w + 1 && y + h <= GARDEN_CANVAS.h + 1, `streak ${n}: ${x},${y},${w},${h}`);
    }
  }
  assert.equal(seen.size, 7);
  assert.ok(gardenArt(40).length > gardenArt(5).length);
  for (const m of ['sleepy', 'waiting', 'happy', 'proud', 'sleep'] as const) {
    for (const [x, y, w, h] of seloFace(m)) assert.ok(x >= 0 && y >= 0 && x + w <= MASCOT_CANVAS && y + h <= MASCOT_CANVAS);
  }
  assert.equal(gardenWidgetProps(new Date(2026, 10, 27), 'en', { last: '2026-11-27', count: 150 }).nextLine, '');
});

test('short reference follows the translation numbering', () => {
  for (const d of Array.from({ length: 60 }, (_, k) => new Date(2026, 0, 1 + k))) {
    for (const t of ['tb', 'kjv'] as const) {
      for (const x of verseWidgetProps(VERSES, d, t, 'id').picks) assert.ok(x.ref.endsWith(x.cv), `${x.ref} vs ${x.cv}`);
    }
  }
});
