import { useFonts } from 'expo-font';

// iOS and web load the bundled font files at runtime. (On iOS an embedded font takes the
// family name inside the file, not the file name, so runtime loading keeps the names in
// fonts.ts working everywhere.) Android uses useAppFonts.android.ts instead.
const FONT_FILES = {
  Lora_400Regular: require('../../assets/fonts/Lora_400Regular.ttf'),
  Lora_500Medium_Italic: require('../../assets/fonts/Lora_500Medium_Italic.ttf'),
  Lora_600SemiBold: require('../../assets/fonts/Lora_600SemiBold.ttf'),
  Gabarito_600SemiBold: require('../../assets/fonts/Gabarito_600SemiBold.ttf'),
  Gabarito_700Bold: require('../../assets/fonts/Gabarito_700Bold.ttf'),
  Figtree_400Regular: require('../../assets/fonts/Figtree_400Regular.ttf'),
  Figtree_500Medium: require('../../assets/fonts/Figtree_500Medium.ttf'),
  Figtree_700Bold: require('../../assets/fonts/Figtree_700Bold.ttf'),
  Caveat_500Medium: require('../../assets/fonts/Caveat_500Medium.ttf'),
};

/** True once the app's fonts can be drawn. */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(FONT_FILES);
  // A failed load falls back to system fonts rather than a blank app.
  return loaded || !!error;
}
