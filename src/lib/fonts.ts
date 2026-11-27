import type { FontKey } from './categories';

// Font files live in assets/fonts as Latin subsets of the Google Fonts originals (about half
// the size). On Android they are embedded at build time by the expo-font config plugin
// (app.json), so the first frame never waits on a font load; see useAppFonts.*.ts.
// The file name doubles as the family name below.
// Interface: Gabarito (display) + Figtree (text), the pairing taste-skill dealt for a consumer app.
// Scripture: Lora (a book face for long reading) and Caveat for short, handwritten verses.

/** Verse font per style key. `charWidth` = average glyph width in em, used to fit text. */
export const VERSE_FONTS: Record<FontKey, { family: string; charWidth: number; lineHeight: number; max: number }> = {
  lora: { family: 'Lora_500Medium_Italic', charWidth: 0.5, lineHeight: 1.5, max: 30 },
  roman: { family: 'Lora_400Regular', charWidth: 0.52, lineHeight: 1.55, max: 29 },
  caveat: { family: 'Caveat_500Medium', charWidth: 0.42, lineHeight: 1.25, max: 40 },
};

export const UI_FONT = {
  regular: 'Figtree_400Regular',
  semibold: 'Figtree_500Medium',
  bold: 'Figtree_700Bold',
  /** headings and the wordmark */
  title: 'Gabarito_700Bold',
  display: 'Gabarito_600SemiBold',
  serif: 'Lora_400Regular',
  serifItalic: 'Lora_500Medium_Italic',
  serifBold: 'Lora_600SemiBold',
};
