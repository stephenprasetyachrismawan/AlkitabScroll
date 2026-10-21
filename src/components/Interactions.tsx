import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { DURATION, EASE_IN_OUT, timing } from '../lib/motion';
import { UI_FONT } from '../lib/fonts';
import { Glass } from './Glass';
import { PressableScale } from './PressableScale';

export const LIKE_RED = '#F0386B';
const DOUBLE_TAP_MS = 280;

/** Double-tap anywhere on the card to like it, with a heart that blooms and fades. */
export function DoubleTapLike({ children, onDoubleTap, style }: { children: ReactNode; onDoubleTap: () => void; style?: StyleProp<ViewStyle> }) {
  const last = useRef(0);
  const [burst, setBurst] = useState(0);
  return (
    <Pressable
      style={style}
      onPress={() => {
        const now = Date.now();
        if (now - last.current < DOUBLE_TAP_MS) {
          last.current = 0;
          setBurst((b) => b + 1);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          onDoubleTap();
        } else {
          last.current = now;
        }
      }}
    >
      {children}
      {burst > 0 ? <HeartBurst key={burst} /> : null}
    </Pressable>
  );
}

function HeartBurst() {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);
  useEffect(() => {
    scale.value = withTiming(1, timing(DURATION.move));
    opacity.value = withSequence(
      withTiming(1, timing(DURATION.press)),
      withDelay(380, withTiming(0, { duration: DURATION.move, easing: EASE_IN_OUT })),
    );
  }, [scale, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      <Animated.View style={[styles.burstGlow, style]}>
        <Ionicons name="heart" size={104} color={LIKE_RED} />
      </Animated.View>
    </View>
  );
}

/** Icon that gives a short pop when it turns on (no bounce, just a quick swell). */
export function PopIcon({ name, on, color, size = 26 }: { name: keyof typeof Ionicons.glyphMap; on: boolean; color: string; size?: number }) {
  const s = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (on) s.value = withSequence(withTiming(1.28, timing(DURATION.press)), withTiming(1, timing(DURATION.move)));
  }, [on, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={style}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}

/** Round glass button used on top of verse cards. */
export function GlassAction({
  icon,
  on,
  onColor,
  label,
  onPress,
  dark,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  on?: boolean;
  onColor?: string;
  label?: number;
  onPress: () => void;
  dark: boolean;
}) {
  const fg = dark ? '#FFFFFF' : '#1E1A16';
  return (
    <View style={styles.actionWrap}>
      <PressableScale onPress={onPress} scaleTo={0.9} hitSlop={6} accessibilityRole="button">
        <Glass dark={dark} radius={26} strength={0.45} style={styles.actionGlass}>
          <PopIcon name={icon} on={!!on} color={on && onColor ? onColor : fg} />
        </Glass>
      </PressableScale>
      {label !== undefined ? <Text style={[styles.actionLabel, { color: fg }]}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  burstGlow: {
    shadowColor: LIKE_RED,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
  },
  actionWrap: { alignItems: 'center', gap: 4 },
  actionGlass: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: UI_FONT.bold, fontSize: 12 },
});
