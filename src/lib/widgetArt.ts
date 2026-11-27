// Flat, paper-cut drawings for the home screen widgets, built from rounded
// rectangles only. Widgets cannot run the app's animation code or load SVG, but
// both WidgetKit (ZStack + offset) and Glance (Box + padding) can place rounded
// boxes, so a list of boxes is the one picture format both platforms share.
//
// No runtime imports on purpose: the widget runtime only sees props, and the
// unit tests load this file straight from Node.

/** [x, y, width, height, cornerRadius, colour] in the canvas' own units. */
export type ArtBox = [number, number, number, number, number, string];

/**
 * How Selo feels on the widget. Follows the streak, never scolds:
 * - `sleepy`: no streak yet / it lapsed. Selo naps and waits.
 * - `waiting`: streak alive, today not opened yet. Eyes open, small smile.
 * - `happy`: opened today.
 * - `proud`: opened today on a streak of a week or more (sparkles).
 * - `sleep`: night time, whatever the streak (the widget picks this by the clock).
 */
export type SeloMood = 'sleepy' | 'waiting' | 'happy' | 'proud' | 'sleep';

export const MASCOT_CANVAS = 64;
export const GARDEN_CANVAS = { w: 96, h: 80 } as const;

const WOOL = '#FFF8EA';
const WOOL_SHADE = '#E3D3B6';
const FACE = '#EBC9A0';
const EAR = '#B07A4F';
const EAR_IN = '#E9A79B';
const INK = '#2A211A';
const CHEEK = '#EFA196';
const CHEEK_SOFT = '#F2BCB0';
const MOUTH = '#8E3B33';
const GOLD = '#E0A800';

export function seloMood(streak: number, done: boolean): Exclude<SeloMood, 'sleep'> {
  if (done) return streak >= 7 ? 'proud' : 'happy';
  return streak > 0 ? 'waiting' : 'sleepy';
}

/** Selo's face, 64 × 64. */
export function seloFace(mood: SeloMood): ArtBox[] {
  const b: ArtBox[] = [
    // wool behind the head, with a darker rim so it reads on pale grounds
    [5, 9, 20, 20, 10, WOOL_SHADE],
    [21, 3, 22, 20, 10, WOOL_SHADE],
    [39, 9, 20, 20, 10, WOOL_SHADE],
    [6, 10, 18, 18, 9, WOOL],
    [22, 4, 20, 18, 9, WOOL],
    [40, 10, 18, 18, 9, WOOL],
    // ears
    [1, 25, 18, 10, 5, EAR],
    [45, 25, 18, 10, 5, EAR],
    [5, 28, 10, 5, 2.5, EAR_IN],
    [49, 28, 10, 5, 2.5, EAR_IN],
    // face
    [14, 17, 36, 40, 17, FACE],
    // tuft over the brow
    [17, 9, 13, 13, 6.5, WOOL],
    [25.5, 6, 13, 13, 6.5, WOOL],
    [34, 9, 13, 13, 6.5, WOOL],
  ];
  const closed = mood === 'sleep' || mood === 'sleepy' || mood === 'happy';
  if (closed) {
    const y = mood === 'happy' ? 32 : 34;
    b.push([22, y, 8, 2.5, 1.25, INK], [34, y, 8, 2.5, 1.25, INK]);
  } else {
    b.push([23.5, 29, 5.5, 7.5, 2.75, INK], [35, 29, 5.5, 7.5, 2.75, INK]);
    b.push([24.5, 30, 2, 2, 1, '#FFFFFF'], [36, 30, 2, 2, 1, '#FFFFFF']);
  }
  // cheeks: rosier when happy
  if (mood === 'happy' || mood === 'proud') b.push([17, 39, 8, 5, 2.5, CHEEK], [39, 39, 8, 5, 2.5, CHEEK]);
  else b.push([18, 40, 6, 4, 2, CHEEK_SOFT], [40, 40, 6, 4, 2, CHEEK_SOFT]);
  // nose
  b.push([29.5, 39, 5, 3.5, 1.75, EAR]);
  // mouth
  if (mood === 'happy' || mood === 'proud') b.push([27.5, 44, 9, 6, 3, MOUTH]);
  else if (mood === 'waiting') b.push([29, 45, 6, 2.5, 1.25, MOUTH]);
  else b.push([30, 45, 4, 2, 1, MOUTH]);
  if (mood === 'proud') {
    b.push([2, 4, 5, 5, 2.5, GOLD], [57, 2, 4, 4, 2, GOLD], [58, 46, 4, 4, 2, GOLD], [1, 50, 3, 3, 1.5, GOLD]);
  }
  return b;
}

export type GardenStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Seed → sprout → seedling → sapling → young tree → fruiting tree → blossoming tree. */
export function gardenStage(streak: number): GardenStage {
  if (streak >= 100) return 6;
  if (streak >= 30) return 5;
  if (streak >= 14) return 4;
  if (streak >= 7) return 3;
  if (streak >= 3) return 2;
  if (streak >= 1) return 1;
  return 0;
}

export const GARDEN_STAGE_NAMES: Record<'id' | 'en', string[]> = {
  id: ['Benih', 'Tunas', 'Kecambah', 'Pohon kecil', 'Pohon muda', 'Pohon berbuah', 'Pohon berbunga'],
  en: ['Seed', 'Sprout', 'Seedling', 'Sapling', 'Young tree', 'Fruiting tree', 'Tree in bloom'],
};

const SOIL = '#8A5A36';
const SOIL_TOP = '#A8724A';
const STEM = '#5B9A6B';
const LEAF = '#6FB27C';
const LEAF_DEEP = '#4F8A5C';
const TRUNK = '#7A5032';
const FRUIT = '#D9533A';
const BLOOM = '#F2A7B8';

/** Days into the current stage, so the plant keeps changing a little each day. */
function within(streak: number, stage: GardenStage): number {
  const starts = [0, 1, 3, 7, 14, 30, 100];
  return Math.max(0, streak - starts[stage]);
}

/** The garden, 96 × 80, ground at the bottom. */
export function gardenArt(streak: number): ArtBox[] {
  const stage = gardenStage(streak);
  const d = within(streak, stage);
  const { w, h } = GARDEN_CANVAS;
  const cx = w / 2;
  const ground = h - 12;
  const b: ArtBox[] = [
    [8, ground, w - 16, 12, 6, SOIL],
    [14, ground - 1, w - 28, 5, 2.5, SOIL_TOP],
  ];
  if (stage === 0) {
    b.push([cx - 5, ground - 4, 10, 7, 3.5, '#6B4426'], [cx - 2, ground - 3, 3, 2, 1, '#9C6B45']);
    return b;
  }
  if (stage <= 2) {
    const stem = stage === 1 ? 10 + d * 3 : 20 + d * 2;
    b.push([cx - 1.5, ground - stem, 3, stem + 1, 1.5, STEM]);
    const leaves = stage === 1 ? 1 : 2;
    for (let i = 0; i < leaves; i++) {
      const y = ground - stem + i * 8;
      const lw = 11 + i * 2;
      b.push([cx - lw - 1, y, lw, 6, 3, LEAF], [cx + 1, y + 2, lw, 6, 3, LEAF_DEEP]);
    }
    return b;
  }
  // trees: trunk grows a little each day of the stage, canopy is a cluster of circles
  const trunkW = stage === 3 ? 4 : stage === 4 ? 6 : 8;
  const trunkH = Math.min(stage === 3 ? 22 + d : 26 + Math.min(d, 8), 34);
  const top = ground - trunkH;
  b.push([cx - trunkW / 2, top, trunkW, trunkH + 1, 2, TRUNK]);
  const r = stage === 3 ? 12 : stage === 4 ? 15 : 18;
  const puffs: [number, number, number][] = [
    [cx - r * 1.1, top - r * 0.2, r],
    [cx + r * 0.1, top - r * 0.2, r],
    [cx - r * 0.5, top - r * 1.0, r],
  ];
  if (stage >= 4) puffs.push([cx - r * 1.6, top + r * 0.3, r * 0.75], [cx + r * 0.85, top + r * 0.3, r * 0.75]);
  puffs.forEach(([x, y, s], i) => b.push([x, y, s * 2, s * 2, s, i % 2 ? LEAF_DEEP : LEAF]));
  if (stage >= 5) {
    const fruits = Math.min(3 + Math.floor(d / 10), 7);
    const spots: [number, number][] = [
      [cx - 14, top + 4], [cx + 9, top + 2], [cx - 3, top - 12], [cx + 16, top - 8], [cx - 22, top - 4], [cx + 2, top + 8], [cx - 10, top - 18],
    ];
    for (let i = 0; i < fruits; i++) b.push([spots[i][0], spots[i][1], 6, 6, 3, FRUIT]);
  }
  if (stage === 6) {
    const blooms: [number, number][] = [[cx - 18, top - 12], [cx + 12, top - 16], [cx - 6, top - 24], [cx + 20, top + 2], [cx - 26, top + 6]];
    for (const [x, y] of blooms) b.push([x, y, 5, 5, 2.5, BLOOM]);
  }
  return b;
}

/** Splits boxes into groups of at most `n`: Glance renders at most 10 children per Box. */
export function chunk<T>(list: T[], n = 10): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
}
