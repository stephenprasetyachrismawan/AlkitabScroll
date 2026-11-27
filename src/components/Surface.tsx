import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSettings } from '../lib/settings';

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** card: raised paper. well: a step under the ground. overlay: sits on top of a verse card. */
  tone?: 'card' | 'well' | 'overlay';
  /** Overlay only: the card under it is dark. Defaults to the app theme. */
  dark?: boolean;
  radius?: number;
};

/**
 * A flat piece of paper with a printed hairline edge. Replaces the old frosted-glass
 * layer: no blur, no sheen, no gradient, so it costs one view and reads as made, not generated.
 */
export function Surface({ children, style, tone = 'card', dark, radius = 18 }: Props) {
  const { colors, dark: appDark } = useSettings();
  const d = dark ?? appDark;
  const look: ViewStyle =
    tone === 'overlay'
      ? { backgroundColor: d ? 'rgba(26,22,18,0.55)' : 'rgba(255,251,242,0.78)', borderColor: d ? 'rgba(247,241,227,0.14)' : 'rgba(34,29,23,0.10)' }
      : tone === 'well'
        ? { backgroundColor: colors.surface, borderColor: 'transparent' }
        : { backgroundColor: colors.card, borderColor: colors.border };
  return <View style={[styles.base, { borderRadius: radius }, look, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { borderWidth: StyleSheet.hairlineWidth * 2, overflow: 'hidden' },
});
