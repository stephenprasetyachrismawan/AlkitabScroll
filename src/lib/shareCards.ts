// Shareable verse cards for Instagram / WhatsApp Story, feed posts and chats.
// Flat printed-paper looks (no gradients, no glass, no violet), each with one small
// drawn motif. Themes beyond the first three open as the sower grows (sowing.ts).
// Pure data + layout math, no React Native imports, so it can be unit tested.

export type CardFormat = 'story' | 'post' | 'square';

export const FORMATS: Record<CardFormat, { ratio: number; out: { width: number; height: number }; label: { id: string; en: string } }> = {
  story: { ratio: 16 / 9, out: { width: 1080, height: 1920 }, label: { id: 'Story', en: 'Story' } },
  post: { ratio: 5 / 4, out: { width: 1080, height: 1350 }, label: { id: 'Post', en: 'Post' } },
  square: { ratio: 1, out: { width: 1080, height: 1080 }, label: { id: 'Kotak', en: 'Square' } },
};

export type Motif = 'none' | 'sun' | 'branch' | 'waves' | 'rule' | 'frame';
export type CardFont = 'lora' | 'roman' | 'caveat' | 'display';

export type CardTheme = {
  key: string;
  name: { id: string; en: string };
  /** 'category' = take the ground and accent from the verse's category */
  ground: string | 'category';
  ink: string;
  accent: string;
  font: CardFont;
  align: 'center' | 'left';
  motif: Motif;
};

export const THEMES: CardTheme[] = [
  { key: 'paper', name: { id: 'Kertas', en: 'Paper' }, ground: '#F7F1E3', ink: '#221D17', accent: '#9A6A3A', font: 'lora', align: 'center', motif: 'rule' },
  { key: 'tint', name: { id: 'Warna ayat', en: 'Verse tint' }, ground: 'category', ink: '', accent: '', font: 'roman', align: 'center', motif: 'none' },
  { key: 'night', name: { id: 'Malam', en: 'Night' }, ground: '#1A1612', ink: '#F7F1E3', accent: '#D9A66B', font: 'roman', align: 'left', motif: 'rule' },
  // opened by sowing stages
  { key: 'dawn', name: { id: 'Fajar', en: 'Dawn' }, ground: '#F6DDB8', ink: '#3B2414', accent: '#C0612B', font: 'caveat', align: 'center', motif: 'sun' },
  { key: 'olive', name: { id: 'Zaitun', en: 'Olive' }, ground: '#3E4A2F', ink: '#EFE8D2', accent: '#C9B87A', font: 'roman', align: 'center', motif: 'branch' },
  { key: 'galilee', name: { id: 'Galilea', en: 'Galilee' }, ground: '#1F3B4D', ink: '#EAF2F2', accent: '#8FC1C7', font: 'lora', align: 'left', motif: 'waves' },
  { key: 'ink', name: { id: 'Tinta', en: 'Ink' }, ground: '#FFFBF2', ink: '#151210', accent: '#B3402E', font: 'display', align: 'left', motif: 'none' },
  { key: 'gold', name: { id: 'Emas', en: 'Gold' }, ground: '#221D17', ink: '#F2E4BE', accent: '#E2B65C', font: 'lora', align: 'center', motif: 'frame' },
];

export const THEME_MAP: Record<string, CardTheme> = Object.fromEntries(THEMES.map((t) => [t.key, t]));
export const FREE_THEMES = new Set(['paper', 'tint', 'night']);

/** Theme a category leans towards when the user hasn't picked one. */
const CATEGORY_LEAN: Record<string, string> = {
  hope: 'dawn',
  joy: 'dawn',
  gratitude: 'dawn',
  peace: 'olive',
  provision: 'olive',
  rest: 'galilee',
  comfort: 'galilee',
  forgiveness: 'galilee',
  protection: 'galilee',
  courage: 'ink',
  strength: 'ink',
  perseverance: 'ink',
  identity: 'gold',
  salvation: 'gold',
  guidance: 'gold',
};

/** The best theme for a verse among the ones the user has. */
export function autoTheme(categories: string[], has: (key: string) => boolean): string {
  for (const c of categories) {
    const lean = CATEGORY_LEAN[c];
    if (lean && has(lean)) return lean;
  }
  return 'tint';
}

/** Metrics per card font: average glyph width in em, line height, largest size. */
export const CARD_FONTS: Record<CardFont, { charWidth: number; lineHeight: number; max: number }> = {
  lora: { charWidth: 0.5, lineHeight: 1.45, max: 34 },
  roman: { charWidth: 0.52, lineHeight: 1.5, max: 32 },
  caveat: { charWidth: 0.42, lineHeight: 1.22, max: 46 },
  display: { charWidth: 0.53, lineHeight: 1.18, max: 40 },
};

/** Largest font size at which the text, word-wrapped, fits the box. */
export function fitFontSize(text: string, w: number, h: number, font: { charWidth: number; lineHeight: number; max: number }) {
  const words = text.split(/\s+/).filter(Boolean);
  for (let size = font.max; size > 11; size -= 1) {
    const perLine = Math.max(1, Math.floor(w / (size * font.charWidth * 1.08)));
    let lines = 1;
    let used = 0;
    for (const word of words) {
      const len = word.length + (used ? 1 : 0);
      if (used + len > perLine) {
        lines++;
        used = word.length;
      } else used += len;
    }
    if (lines * size * font.lineHeight <= h) return size;
  }
  return 11;
}
