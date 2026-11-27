// Run: npm test
import assert from 'node:assert/strict';
import test from 'node:test';
import { allFriendStreaks, friendStreak, type MsgLite } from '../src/lib/friendStreak.ts';
import { autoTheme, fitFontSize, FREE_THEMES, THEME_MAP, CARD_FONTS } from '../src/lib/shareCards.ts';
import { DAILY_CAP, EMPTY_SOWING, nextStage, sow, stageFor, stageProgress, STAGES, unlockedThemes } from '../src/lib/sowing.ts';

test('a verse counts once per channel per day', () => {
  let r = sow(EMPTY_SOWING, 'image', 'jhn-3-16', '2026-11-27');
  assert.equal(r.counted, true);
  r = sow(r.state, 'image', 'jhn-3-16', '2026-11-27');
  assert.equal(r.counted, false);
  r = sow(r.state, 'friend', 'jhn-3-16', '2026-11-27');
  assert.equal(r.counted, true);
  r = sow(r.state, 'image', 'jhn-3-16', '2026-11-28');
  assert.equal(r.counted, true);
  assert.equal(r.state.total, 3);
  assert.deepEqual(r.state.days, ['2026-11-28', '2026-11-27']);
});

test('daily cap stops farming', () => {
  let s = EMPTY_SOWING;
  for (let i = 0; i < DAILY_CAP + 5; i++) s = sow(s, 'image', `v${i}`, '2026-11-27').state;
  assert.equal(s.total, DAILY_CAP);
});

test('stages, progress and unlocks', () => {
  assert.equal(stageFor(0).key, 'seed');
  assert.equal(stageFor(3).key, 'sprout');
  assert.equal(stageFor(99).key, 'fruit');
  assert.equal(stageFor(500).key, 'tree');
  assert.equal(nextStage(500), null);
  assert.equal(stageProgress(6), (6 - 3) / (10 - 3));
  assert.equal(stageProgress(1000), 1);
  assert.deepEqual([...unlockedThemes(10)].sort(), ['dawn', 'olive']);
  for (const s of STAGES) if (s.unlocks) assert.ok(THEME_MAP[s.unlocks], s.unlocks);
});

test('reaching a stage is reported once', () => {
  let s = EMPTY_SOWING;
  const reached: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = sow(s, 'image', `v${i}`, '2026-11-27');
    s = r.state;
    if (r.reached) reached.push(r.reached.key);
  }
  assert.deepEqual(reached, ['sprout', 'grow']);
});

test('autoTheme only offers themes the user has', () => {
  const free = (k: string) => FREE_THEMES.has(k);
  assert.equal(autoTheme(['hope'], free), 'tint');
  assert.equal(autoTheme(['hope'], () => true), 'dawn');
  assert.equal(autoTheme(['love', 'peace'], () => true), 'olive');
});

test('fitFontSize shrinks long text', () => {
  const f = CARD_FONTS.lora;
  const short = fitFontSize('The Lord is my shepherd', 300, 400, f);
  const long = fitFontSize('word '.repeat(200), 300, 400, f);
  assert.equal(short, f.max);
  assert.ok(long < short);
});

const at = (d: Date, h = 12) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h).toISOString();
const day = (n: number) => {
  const d = new Date(2026, 10, 27);
  d.setDate(d.getDate() - n);
  return d;
};
const now = new Date(2026, 10, 27, 20);
const msg = (from: string, to: string, n: number): MsgLite => ({ sender_id: from, recipient_id: to, created_at: at(day(n)) });

test('friend streak needs both sides each day', () => {
  const ms = [msg('a', 'b', 2), msg('b', 'a', 2), msg('a', 'b', 1), msg('b', 'a', 1), msg('a', 'b', 0)];
  const s = friendStreak(ms, 'a', 'b', now);
  assert.equal(s.count, 2);
  assert.equal(s.doneToday, false);
  assert.equal(s.mineToday, true);
  assert.equal(s.theirsToday, false);
  assert.equal(s.atRisk, true);

  const done = friendStreak([...ms, msg('b', 'a', 0)], 'a', 'b', now);
  assert.equal(done.count, 3);
  assert.equal(done.atRisk, false);
});

test('a missed day ends the streak', () => {
  const ms = [msg('a', 'b', 3), msg('b', 'a', 3), msg('a', 'b', 1)];
  assert.equal(friendStreak(ms, 'a', 'b', now).count, 0);
});

test('streaks per partner ignore other conversations', () => {
  const ms = [msg('a', 'b', 0), msg('b', 'a', 0), msg('a', 'c', 0)];
  const all = allFriendStreaks(ms, 'a', now);
  assert.equal(all.b.count, 1);
  assert.equal(all.c.count, 0);
});
