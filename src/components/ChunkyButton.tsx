import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { UI_FONT } from '../lib/fonts';
import { DURATION, timing } from '../lib/motion';
import { useSettings } from '../lib/settings';

const LEDGE = 4;

type Props = {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** primary: filled. secondary: paper with a printed edge. */
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Override colours, e.g. on a dark break screen. */
  face?: string;
  ledge?: string;
  ink?: string;
  children?: ReactNode;
};

/**
 * A button with a thick bottom edge you can feel: on press the face sinks onto its ledge
 * (90ms), on release it comes back up (150ms). Transform only, so it stays on the UI thread.
 */
export function ChunkyButton({ label, onPress, icon, variant = 'primary', disabled, busy, style, face, ledge, ink }: Props) {
  const { colors } = useSettings();
  const y = useSharedValue(0);
  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  const primary = variant === 'primary';
  const bg = face ?? (primary ? colors.primary : colors.card);
  const edge = ledge ?? (primary ? colors.ledge : colors.border);
  const fg = ink ?? (primary ? colors.onPrimary : colors.text);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      disabled={disabled || busy}
      onPressIn={() => {
        y.set(withTiming(LEDGE, timing(DURATION.press)));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }}
      onPressOut={() => y.set(withTiming(0, timing(DURATION.release)))}
      onPress={onPress}
      style={[styles.wrap, disabled && { opacity: 0.5 }, style]}
    >
      <View style={[styles.ledge, { backgroundColor: edge }]} />
      <Animated.View style={[styles.face, { backgroundColor: bg, borderColor: primary ? bg : edge }, faceStyle]}>
        {busy ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={19} color={fg} /> : null}
            <Text style={[styles.label, { color: fg }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {label}
            </Text>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { minHeight: 52 + LEDGE, paddingBottom: LEDGE },
  ledge: { position: 'absolute', left: 0, right: 0, bottom: 0, top: LEDGE, borderRadius: 16 },
  face: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: { fontFamily: UI_FONT.bold, fontSize: 16, letterSpacing: 0.2 },
});

/** Any tappable tile with the same feel: a face that sinks onto a darker ledge. */
export function ChunkyPressable({
  children,
  onPress,
  face,
  ledge,
  border,
  radius = 18,
  style,
  faceStyle,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress: () => void;
  face: string;
  ledge: string;
  border?: string;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  faceStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const y = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => {
        y.set(withTiming(LEDGE, timing(DURATION.press)));
        Haptics.selectionAsync().catch(() => {});
      }}
      onPressOut={() => y.set(withTiming(0, timing(DURATION.release)))}
      onPress={onPress}
      style={[{ paddingBottom: LEDGE }, style]}
    >
      <View style={[styles.ledge, { backgroundColor: ledge, borderRadius: radius }]} />
      <Animated.View style={[{ backgroundColor: face, borderRadius: radius, borderWidth: 2, borderColor: border ?? face, overflow: 'hidden' }, faceStyle, a]}>{children}</Animated.View>
    </Pressable>
  );
}
