import type { FontKey } from './categories';

// Font files live in assets/fonts as Latin subsets of the Google Fonts originals (about half
// the size). On Android they are embedded at build time by the expo-font config plugin
// (app.json), so the first frame never waits on a font load; see useAppFonts.*.ts.
// The file name doubles as the family name below.

/** Verse font per style key. `charWidth` = average glyph width in em, used to fit text. */
export const VERSE_FONTS: Record<FontKey, { family: string; charWidth: number; lineHeight: number; max: number }> = {
  lora: { family: 'Lora_500Medium_Italic', charWidth: 0.5, lineHeight: 1.5, max: 32 },
  playfair: { family: 'PlayfairDisplay_500Medium', charWidth: 0.52, lineHeight: 1.45, max: 32 },
  nunito: { family: 'Nunito_600SemiBold', charWidth: 0.54, lineHeight: 1.5, max: 30 },
  caveat: { family: 'Caveat_500Medium', charWidth: 0.42, lineHeight: 1.25, max: 40 },
  cormorant: { family: 'CormorantGaramond_600SemiBold_Italic', charWidth: 0.44, lineHeight: 1.35, max: 36 },
};

export const UI_FONT = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  title: 'PlayfairDisplay_700Bold',
  serif: 'Lora_400Regular',
  serifBold: 'Lora_600SemiBold',
};
