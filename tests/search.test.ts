// Run: npm test
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { forms, normalize, VerseSearch, type SearchDoc } from '../src/lib/search.ts';
import { SEMANTIC_JSON } from '../data/search-semantic.ts';

type Raw = { id: string; ref: string; categories: string[]; text: Record<'tb' | 'bimk' | 'kjv', { title: string; verses: { text: string }[] }> };
const raw: Raw[] = JSON.parse(fs.readFileSync(new URL('../data/verses.json', import.meta.url), 'utf8'));
const docs: SearchDoc[] = raw.map((v) => ({
  id: v.id,
  ref: v.ref,
  categories: v.categories,
  text: {
    tb: { title: v.text.tb.title, body: v.text.tb.verses.map((x) => x.text).join(' ') },
    bimk: { title: v.text.bimk.title, body: v.text.bimk.verses.map((x) => x.text).join(' ') },
    kjv: { title: v.text.kjv.title, body: v.text.kjv.verses.map((x) => x.text).join(' ') },
  },
}));
const engine = new VerseSearch(docs, JSON.parse(SEMANTIC_JSON));
const top = (q: string, n = 3, mode: 'search' | 'curhat' = 'search') => engine.search(q, { mode }).hits.slice(0, n).map((h) => h.id);

test('semantic index covers every bundled passage', () => {
  const sem = JSON.parse(SEMANTIC_JSON);
  assert.deepEqual([...sem.passages].sort(), docs.map((d) => d.id).sort());
});

test('Indonesian affixes fold onto a shared root', () => {
  assert.ok(forms('mengasihi').includes('kasih'));
  assert.ok(forms('hatiku').includes('hati'));
  assert.ok(forms('pekerjaanku').includes('kerja'));
  assert.ok(forms('loveth').includes('love'));
  assert.equal(normalize('  Kasih, itu SABAR! '), 'kasih itu sabar');
});

test('half-remembered verses come first', () => {
  assert.equal(top('kasih itu sabar')[0], '1Kor13.4-7');
  assert.equal(top('gembala air tenang')[0], 'Mzm23.1-4');
  assert.equal(top('segala perkara dapat kutanggung')[0], 'Flp4.13');
  assert.equal(top('firman pelita bagi kakiku')[0], 'Mzm119.105');
  assert.ok(top('burung pipit').some((id) => ['Luk12.24', 'Mat6.25-26'].includes(id)));
});

test('English queries search the KJV in the same pass', () => {
  assert.equal(top('for God so loved the world')[0], 'Yoh3.16');
  assert.equal(top('I can do all things')[0], 'Flp4.13');
});

test('typos are corrected against the verse vocabulary', () => {
  const r = engine.search('rajawli terbang');
  assert.deepEqual(r.corrected, [['rajawli', 'rajawali']]);
  assert.equal(r.hits[0].id, 'Yes40.31');
});

test('references jump straight to the passage', () => {
  assert.deepEqual(top('yoh 3:16', 1), ['Yoh3.16']);
  assert.deepEqual(top('John 3:16', 1), ['Yoh3.16']);
  assert.deepEqual(top('Mazmur 23', 1), ['Mzm23.1-4']);
  assert.ok(engine.search('mazmur').hits.length > 10);
});

test('results merge translations and say which one matched', () => {
  const r = engine.search('Engkau menemani aku'); // BIMK wording of Mazmur 23:4
  assert.equal(r.hits[0].id, 'Mzm23.1-4');
  assert.equal(r.hits[0].matchedIn, 'bimk');
  assert.ok(r.hits[0].highlight.length > 0);
  assert.equal(new Set(r.hits.map((h) => h.id)).size, r.hits.length);
});

test('search returns plenty of results, not just exact hits', () => {
  assert.ok(engine.search('pengharapan').hits.length >= 10);
});

test('curhat finds verses with no words in common', () => {
  const heart = engine.search('pacarku selingkuh, hatiku hancur', { mode: 'curhat' });
  assert.ok(heart.hits.slice(0, 3).some((h) => ['Mzm147.3', 'Mzm34.18'].includes(h.id)));
  assert.ok(heart.themes.length > 0);

  assert.ok(top('aku kangen papa yang sudah meninggal', 3, 'curhat').includes('1Tes4.13-14'));
  assert.ok(top('aku merasa bersalah atas dosa dosaku', 5, 'curhat').some((id) => ['Yes43.25', 'Luk15.10', '1Yoh1.9', 'Yes1.18'].includes(id)));
  const work = engine.search('aku capek banget kerja terus, bos marah-marah', { mode: 'curhat' });
  assert.ok(work.themes.some((t) => t.key === 'work'));
});

test('slang is understood', () => {
  assert.ok(top('gak bisa tidur mikirin utang', 3, 'curhat').includes('Mzm4.8'));
});

test('a query of only stop words returns nothing instead of noise', () => {
  assert.equal(engine.search('yang dan di').hits.length, 0);
});

test('search is fast enough to run on every keystroke', () => {
  const t0 = performance.now();
  for (let i = 0; i < 50; i++) engine.search('aku takut masa depan belum dapat kerja', { mode: 'curhat' });
  assert.ok((performance.now() - t0) / 50 < 20);
});
