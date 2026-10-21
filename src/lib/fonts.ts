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

/** Verse font per style key. `scale` evens out each face's apparent size. */
export const VERSE_FONTS: Record<FontKey, { family: string; scale: number; lineHeight: number }> = {
  lora: { family: 'Lora_500Medium_Italic', scale: 1, lineHeight: 1.5 },
  playfair: { family: 'PlayfairDisplay_500Medium', scale: 1, lineHeight: 1.45 },
  nunito: { family: 'Nunito_600SemiBold', scale: 1, lineHeight: 1.5 },
  caveat: { family: 'Caveat_500Medium', scale: 1.3, lineHeight: 1.25 },
  cormorant: { family: 'CormorantGaramond_600SemiBold_Italic', scale: 1.15, lineHeight: 1.35 },
};

export const UI_FONT = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  title: 'PlayfairDisplay_700Bold',
  serif: 'Lora_400Regular',
  serifBold: 'Lora_600SemiBold',
};
