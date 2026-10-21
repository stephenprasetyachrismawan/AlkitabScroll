import { Lora_400Regular } from '@expo-google-fonts/lora/400Regular';
import { Lora_500Medium_Italic } from '@expo-google-fonts/lora/500Medium_Italic';
import { Lora_600SemiBold } from '@expo-google-fonts/lora/600SemiBold';
import { PlayfairDisplay_500Medium } from '@expo-google-fonts/playfair-display/500Medium';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display/700Bold';
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Caveat_500Medium } from '@expo-google-fonts/caveat/500Medium';
import { CormorantGaramond_500Medium } from '@expo-google-fonts/cormorant-garamond/500Medium';
import { CormorantGaramond_600SemiBold_Italic } from '@expo-google-fonts/cormorant-garamond/600SemiBold_Italic';
import type { FontKey } from './categories';

export const FONT_ASSETS = {
  Lora_400Regular,
  Lora_500Medium_Italic,
  Lora_600SemiBold,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_700Bold,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Caveat_500Medium,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold_Italic,
};

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
