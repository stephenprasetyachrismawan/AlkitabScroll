// Run: npm test
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { CHAPTERS, NODES } from '../src/lib/journey/path.ts';
import { arrangeCorrect, blankCorrect, buildLesson, type VerseText } from '../src/lib/journey/quiz.ts';
import { addDays, exerciseFor, isDue, makeBlank, makePieces, review, scramble, wordPool, type Card } from '../src/lib/journey/quiz.ts';

type Raw = { id: string; text: Record<string, { title: string; verses: { text: string }[] }> };
const RAW: Raw[] = JSON.parse(fs.readFileSync(new URL('../data/verses.json', import.meta.url), 'utf8'));
const MAP = new Map(RAW.map((v) => [v.id, v]));
const text = (id: string, t: string): VerseText => {
  const p = MAP.get(id)!.text[t];
  return { id, title: p.title, body: p.verses.map((x) => x.text).join(' ') };
};

test('every stop has five distinct verses that exist in every translation', () => {
  const ids = new Set<string>();
  for (const n of NODES) {
    assert.equal(n.verseIds.length, 5, n.id);
    assert.equal(new Set(n.verseIds).size, 5, n.id);
    for (const id of n.verseIds) {
      assert.ok(MAP.has(id), `${n.id}: missing ${id}`);
      for (const t of ['tb', 'bimk', 'kjv']) assert.ok(MAP.get(id)!.text[t]?.verses.length, `${id} ${t}`);
      ids.add(id);
    }
    assert.ok(n.story.answer >= 0 && n.story.answer < n.story.options.length);
  }
  assert.equal(new Set(NODES.map((n) => n.id)).size, NODES.length);
  assert.ok(CHAPTERS.length >= 5);
});

test('lessons build five valid questions in every translation and language', () => {
  for (const t of ['tb', 'bimk', 'kjv']) {
    const pool = wordPool(RAW.map((v) => v.text[t].verses.map((x) => x.text).join(' ')));
    for (const n of NODES) {
      for (const lang of ['id', 'en'] as const) {
        const qs = buildLesson(n, lang, n.verseIds.map((id) => text(id, t)), pool);
        assert.equal(qs.length, 5, `${n.id} ${t}`);
        assert.equal(new Set(qs.map((q) => q.key)).size, 5, `${n.id} keys unique`);
        for (const q of qs) {
          if (q.kind === 'story') assert.equal(q.options[q.answer], n.story.options[n.story.answer][lang]);
          if (q.kind === 'ref') {
            assert.equal(q.options[q.answer], q.verse.title);
            assert.equal(new Set(q.options).size, q.options.length);
          }
          if (q.kind === 'arrange') {
            assert.equal(q.pieces.join(' '), q.verse.body);
            assert.ok(q.pieces.length >= 2, `${n.id} pieces`);
            assert.ok(arrangeCorrect(q.pieces, q.pieces));
            assert.ok(!arrangeCorrect(q.pieces, q.shuffled) || q.pieces.length < 2);
          }
          if (q.kind === 'blank') {
            assert.ok(blankCorrect(q.blank, q.blank.answers));
            for (const a of q.blank.answers) assert.ok(q.blank.bank.includes(a));
            assert.ok(q.blank.bank.length > q.blank.answers.length, `${n.id} has distractors`);
          }
        }
      }
    }
  }
});

test('lessons are stable for the same stop', () => {
  const n = NODES[0];
  const vs = n.verseIds.map((id) => text(id, 'tb'));
  assert.deepEqual(buildLesson(n, 'id', vs, ['kasih', 'damai']), buildLesson(n, 'id', vs, ['kasih', 'damai']));
});

test('pieces keep the verse intact and break at punctuation', () => {
  const v = 'TUHAN adalah gembalaku, takkan kekurangan aku. Ia membaringkan aku di padang yang berumput hijau.';
  const p = makePieces(v);
  assert.equal(p.join(' '), v);
  assert.ok(p.length >= 3 && p.length <= 6);
  assert.ok(p[0].endsWith(','));
  assert.deepEqual(makePieces('Yesus menangis.'), ['Yesus', 'menangis.']);
  const s = scramble(p, 7);
  assert.notDeepEqual(s, p);
  assert.deepEqual(s.slice().sort(), p.slice().sort());
});

test('blanks hide real words and never offer a duplicate', () => {
  const b = makeBlank('Karena begitu besar kasih Allah akan dunia ini.', 2, ['damai', 'sukacita', 'terang', 'Kasih'], 3);
  assert.equal(b.holes.length, 2);
  b.holes.forEach((h, i) => assert.equal(b.tokens[h].replace(/[.,]/g, ''), b.answers[i]));
  assert.equal(new Set(b.bank.map((w) => w.toLowerCase())).size, b.bank.length);
  assert.ok(blankCorrect(b, b.answers.map((a) => a.toUpperCase())));
  assert.ok(!blankCorrect(b, [b.answers[0], null]));
});

test('leitner review moves cards up and back', () => {
  const today = '2026-11-27';
  let c: Card = { box: 0, due: today, reps: 0, added: today };
  assert.ok(isDue(c, today));
  c = review(c, true, today);
  assert.equal(c.box, 1);
  assert.equal(c.due, '2026-11-28');
  c = review(c, true, today);
  c = review(c, true, today);
  assert.equal(c.box, 3);
  assert.equal(c.due, addDays(today, 7));
  c = review(c, false, today);
  assert.equal(c.box, 1);
  assert.equal(c.due, today);
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(exerciseFor(0).kind, 'arrange');
  assert.deepEqual(exerciseFor(4), { kind: 'blank', count: 3 });
});
