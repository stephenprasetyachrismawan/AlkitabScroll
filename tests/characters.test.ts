// Run: npm test
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CAST, CATEGORY_SCENES, LOOP_MS, sceneFor, sceneForVerse } from '../src/lib/characters.ts';

const VERSES = JSON.parse(readFileSync(new URL('../data/verses.json', import.meta.url), 'utf8'));

test('every category has a scene the character can play', () => {
  const cats = new Set<string>(VERSES.flatMap((v: { categories: string[] }) => v.categories));
  for (const c of cats) {
    const s = CATEGORY_SCENES[c];
    assert.ok(s, `no scene for ${c}`);
    assert.ok(CAST[s.character].actions.includes(s.action));
  }
});

test('creatures named in the verse win over the category', () => {
  assert.deepEqual(sceneFor(['joy'], ['Lihatlah burung-burung di langit']), { character: 'pipi', action: 'peck' });
  assert.deepEqual(sceneFor(['comfort'], ['The LORD is my shepherd']), { character: 'selo', action: 'sway' });
  assert.deepEqual(sceneFor(['love'], ['TUHAN adalah gembalaku']), { character: 'selo', action: 'love' });
  assert.equal(sceneFor(['peace'], ['seperti singa yang mengaum']).character, 'arka');
  assert.equal(sceneFor(['hope'], ['Firman-Mu itu pelita bagi kakiku']).character, 'lumi');
  assert.deepEqual(sceneFor(['strength'], ['nothing special']), CATEGORY_SCENES.strength);
});

test('every verse gets a playable scene, and all five characters appear', () => {
  const seen = new Set<string>();
  for (const v of VERSES) {
    const s = sceneForVerse(v);
    assert.ok(CAST[s.character].actions.includes(s.action), `${v.id}: ${s.character}/${s.action}`);
    seen.add(s.character);
  }
  assert.equal(seen.size, 5);
});

test('loops stay in 2.5 to 4 seconds', () => {
  for (const ms of Object.values(LOOP_MS)) assert.ok(ms >= 2500 && ms <= 4000);
});
