import { type ComponentProps } from 'react';
import { PixelRatio, StyleSheet, Text as RNText, TextInput as RNTextInput, useWindowDimensions } from 'react-native';

// The phone's font size setting (Android "Font size", iOS Dynamic Type) multiplies every
// font in the app. Left alone, a 2x setting turns a 34pt heading into 68pt and pushes
// buttons, tab labels and verse cards off the screen. These drop-in replacements for
// react-native's Text and TextInput keep honouring the setting, but cap it by size:
// body text can still grow a lot, while headings, already large, grow a little.
// Pass `maxFontSizeMultiplier` (or `allowFontScaling={false}`) to override per element.

/** Largest growth allowed for text of a given size (pt, before scaling). */
export function fontScaleCap(fontSize: number | undefined) {
  const size = fontSize ?? 14;
  if (size >= 40) return 1.05;
  if (size >= 26) return 1.15;
  if (size >= 19) return 1.3;
  return 1.5;
}

function capFor(style: ComponentProps<typeof RNText>['style']) {
  const flat = StyleSheet.flatten(style);
  return fontScaleCap(typeof flat?.fontSize === 'number' ? flat.fontSize : undefined);
}

export function Text(props: ComponentProps<typeof RNText>) {
  if (props.maxFontSizeMultiplier !== undefined || props.allowFontScaling === false) return <RNText {...props} />;
  return <RNText maxFontSizeMultiplier={capFor(props.style)} {...props} />;
}

export function TextInput(props: ComponentProps<typeof RNTextInput>) {
  if (props.maxFontSizeMultiplier !== undefined || props.allowFontScaling === false) return <RNTextInput {...props} />;
  return <RNTextInput maxFontSizeMultiplier={capFor(props.style)} {...props} />;
}

/**
 * The phone's font scale, clamped to `max`. Use it to grow fixed boxes (tab bar,
 * pills, tiles) together with the text inside them.
 */
export function useFontScale(max = 1.5) {
  const { fontScale } = useWindowDimensions();
  return Math.min(Math.max(fontScale || PixelRatio.getFontScale() || 1, 1), max);
}
