import raw from '../../data/verses.json';

export type Translation = 'tb' | 'bimk' | 'kjv';

export type Passage = { title: string; verses: { n: number; text: string }[] };

export type Verse = {
  id: string;
  ref: string;
  kjvRef: string;
  categories: string[];
  text: Record<Translation, Passage>;
};

export const VERSES: Verse[] = raw as Verse[];
export const VERSE_MAP: Record<string, Verse> = Object.fromEntries(VERSES.map((v) => [v.id, v]));

export const TRANSLATIONS: { key: Translation; short: string; name: string; copyright: string }[] = [
  { key: 'tb', short: 'TB', name: 'Terjemahan Baru', copyright: 'TB © Lembaga Alkitab Indonesia (LAI)' },
  { key: 'bimk', short: 'BIMK', name: 'Bahasa Indonesia Masa Kini', copyright: 'BIMK © Lembaga Alkitab Indonesia (LAI)' },
  { key: 'kjv', short: 'KJV', name: 'King James Version', copyright: 'KJV · Public Domain' },
];

/** Readable text for a post: single verse plain, multiple verses with small numbers. */
export function passageText(v: Verse, t: Translation): { title: string; body: string; parts: { n: number; text: string }[] } {
  const p = v.text[t] ?? v.text.tb;
  const parts = p.verses;
  return { title: p.title, parts, body: parts.map((x) => x.text).join(' ') };
}

export function shortLabel(t: Translation) {
  return TRANSLATIONS.find((x) => x.key === t)?.short ?? 'TB';
}
