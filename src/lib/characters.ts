// Which character appears on a verse card, and what it does.
// Pure on purpose: the unit tests load it straight from Node.
//
// The cast (all original):
//   Selo  – a lamb, Selah's mascot. Comfort, love, rest, prayer, joy, praise.
//   Dara  – a dove carrying an olive twig. Peace, hope, forgiveness, salvation.
//   Arka  – a lion cub. Strength, courage, protection, perseverance.
//   Pipi  – a sparrow. Provision, faith, work ("look at the birds of the air").
//   Lumi  – a little clay oil lamp. Guidance, wisdom, light, identity.

export type CharacterKey = 'selo' | 'dara' | 'arka' | 'pipi' | 'lumi';

export type Action =
  // Selo
  | 'sway'
  | 'hop'
  | 'pray'
  | 'sleep'
  | 'love'
  | 'wave'
  | 'sing'
  // Dara
  | 'fly'
  | 'glide'
  // Arka
  | 'roar'
  | 'stand'
  | 'guard'
  // Pipi
  | 'peck'
  | 'lookup'
  // Lumi
  | 'glow';

export type Scene = { character: CharacterKey; action: Action };

export const CAST: Record<CharacterKey, { name: string; actions: Action[] }> = {
  selo: { name: 'Selo', actions: ['sway', 'hop', 'pray', 'sleep', 'love', 'wave', 'sing'] },
  dara: { name: 'Dara', actions: ['fly', 'glide'] },
  arka: { name: 'Arka', actions: ['roar', 'stand', 'guard'] },
  pipi: { name: 'Pipi', actions: ['peck', 'lookup'] },
  lumi: { name: 'Lumi', actions: ['glow'] },
};

/** Every category has a default scene. */
export const CATEGORY_SCENES: Record<string, Scene> = {
  comfort: { character: 'selo', action: 'sway' },
  hope: { character: 'dara', action: 'fly' },
  strength: { character: 'arka', action: 'stand' },
  peace: { character: 'dara', action: 'glide' },
  rest: { character: 'selo', action: 'sleep' },
  love: { character: 'selo', action: 'love' },
  faith: { character: 'pipi', action: 'lookup' },
  wisdom: { character: 'lumi', action: 'glow' },
  forgiveness: { character: 'dara', action: 'glide' },
  gratitude: { character: 'selo', action: 'sing' },
  protection: { character: 'arka', action: 'guard' },
  provision: { character: 'pipi', action: 'peck' },
  courage: { character: 'arka', action: 'roar' },
  perseverance: { character: 'arka', action: 'stand' },
  joy: { character: 'selo', action: 'hop' },
  guidance: { character: 'lumi', action: 'glow' },
  relationships: { character: 'selo', action: 'wave' },
  work: { character: 'pipi', action: 'peck' },
  identity: { character: 'lumi', action: 'glow' },
  prayer: { character: 'selo', action: 'pray' },
  salvation: { character: 'dara', action: 'fly' },
};

/**
 * Words in the verse itself that call for a particular scene, strongest first.
 * Checked against the Indonesian (TB/BIMK) and English (KJV) text together.
 * A creature named in the verse wins over a mood, so Psalm 23 gets the lamb.
 */
const CUES: { re: RegExp; scene: Scene }[] = [
  { re: /\b(singa|lions?)\b/, scene: { character: 'arka', action: 'roar' } },
  { re: /\b(burung|pipit|sparrows?|birds?|fowls?|ravens?|gagak)\b/, scene: { character: 'pipi', action: 'peck' } },
  { re: /\b(merpati|doves?|rajawali|eagles?|sayap|wings?)\b/, scene: { character: 'dara', action: 'fly' } },
  { re: /\b(membaringkan|berbaring|tidur|lie down|sleep|slumber)\b/, scene: { character: 'selo', action: 'sleep' } },
  { re: /\b(domba|gembala\w*|anak domba|sheep|shepherd|lambs?)\b/, scene: { character: 'selo', action: 'sway' } },
  { re: /\b(pelita|terang|lampu|cahaya|lamp|light)\b/, scene: { character: 'lumi', action: 'glow' } },
  { re: /\b(berdoa|doa\w*|pray\w*)\b/, scene: { character: 'selo', action: 'pray' } },
  { re: /\b(bersorak\w*|bernyanyi|nyanyi\w*|mazmur pujian|sing\w*|rejoice)\b/, scene: { character: 'selo', action: 'sing' } },
];

/** Selo's sheep cue keeps a fitting Selo action from the category (e.g. sleep, love). */
function refine(cue: Scene, categoryScene: Scene | undefined): Scene {
  if (cue.character === 'selo' && cue.action === 'sway' && categoryScene?.character === 'selo') return categoryScene;
  return cue;
}

export function sceneFor(categories: string[], texts: string[]): Scene {
  const primary = categories.map((c) => CATEGORY_SCENES[c]).find(Boolean);
  const hay = texts.join(' ').toLowerCase();
  for (const { re, scene } of CUES) if (re.test(hay)) return refine(scene, primary);
  return primary ?? { character: 'selo', action: 'sway' };
}

/** Scene for a verse-shaped object (see verses.ts). */
export function sceneForVerse(v: { categories: string[]; text: Record<string, { verses: { text: string }[] }> }): Scene {
  const texts = Object.values(v.text).flatMap((p) => p.verses.map((x) => x.text));
  return sceneFor(v.categories, texts);
}

/**
 * One loop of each action, in ms. taste-skill: loops cycle in 2.5-4 s, linear
 * clock, no bounce. Quick things (wing beats, pecks) repeat inside one loop.
 */
export const LOOP_MS: Record<Action, number> = {
  sway: 3600,
  hop: 2600,
  pray: 3600,
  sleep: 4000,
  love: 2800,
  wave: 2800,
  sing: 2800,
  fly: 3000,
  glide: 3600,
  roar: 3200,
  stand: 3200,
  guard: 3600,
  peck: 2800,
  lookup: 3200,
  glow: 2800,
};
