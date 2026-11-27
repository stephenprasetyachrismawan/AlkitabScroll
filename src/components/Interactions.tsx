import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { DURATION, EASE_IN_OUT, enter, timing } from '../lib/motion';
import { UI_FONT } from '../lib/fonts';
import { RollingNumber } from './RollingNumber';
import { PressableScale } from './PressableScale';
import { Surface } from './Surface';

export const LIKE_RED = '#D8445C';
const DOUBLE_TAP_MS = 280;
const SPARKS = 6;

type Burst = { id: number; x: number; y: number };

/**
 * Double-tap anywhere on the card to like it. The heart grows from where the finger
 * landed and six small sparks in the card's own colour fly out (~420ms).
 */
export function DoubleTapLike({
  children,
  onDoubleTap,
  style,
  sparkColor = LIKE_RED,
}: {
  children: ReactNode;
  onDoubleTap: () => void;
  style?: StyleProp<ViewStyle>;
  sparkColor?: string;
}) {
  const last = useRef(0);
  const [burst, setBurst] = useState<Burst | null>(null);
  const onPress = (e: GestureResponderEvent) => {
    const now = Date.now();
    if (now - last.current < DOUBLE_TAP_MS) {
      last.current = 0;
      const { locationX, locationY } = e.nativeEvent;
      setBurst((b) => ({ id: (b?.id ?? 0) + 1, x: locationX, y: locationY }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      onDoubleTap();
    } else {
      last.current = now;
    }
  };
  return (
    <Pressable style={style} onPress={onPress}>
      {children}
      {burst ? <HeartBurst key={burst.id} x={burst.x} y={burst.y} color={sparkColor} /> : null}
    </Pressable>
  );
}

const HEART = 96;

function HeartBurst({ x, y, color }: { x: number; y: number; color: string }) {
  const grow = useSharedValue(0);
  const fade = useSharedValue(1);
  useEffect(() => {
    grow.value = withTiming(1, enter(420));
    fade.value = withDelay(520, withTiming(0, { duration: DURATION.move, easing: EASE_IN_OUT }));
  }, [grow, fade]);
  const heart = useAnimatedStyle(() => ({
    opacity: Math.min(1, grow.value * 3) * fade.value,
    transform: [{ translateY: -grow.value * 18 }, { scale: 0.3 + grow.value * 0.7 }],
  }));
  return (
    <View pointerEvents="none" style={[styles.burst, { left: x - HEART / 2, top: y - HEART / 2 }]}>
      {Array.from({ length: SPARKS }, (_, i) => (
        <Spark key={i} angle={(i / SPARKS) * Math.PI * 2 - Math.PI / 2} color={color} />
      ))}
      <Animated.View style={heart}>
        <Ionicons name="heart" size={HEART} color={LIKE_RED} />
      </Animated.View>
    </View>
  );
}

function Spark({ angle, color }: { angle: number; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, enter(420));
  }, [p]);
  const R = 72;
  const s = useAnimatedStyle(() => ({
    opacity: p.value < 0.6 ? 1 : (1 - p.value) / 0.4,
    transform: [{ translateX: Math.cos(angle) * R * p.value }, { translateY: Math.sin(angle) * R * p.value }, { scale: 1 - p.value * 0.6 }],
  }));
  return <Animated.View style={[styles.spark, { backgroundColor: color }, s]} />;
}

/**
 * Icon that answers when it turns on. `pop`: a quick swell (likes).
 * `fold`: dips 4px like a ribbon tucked into a page, then settles (saves).
 */
export function PopIcon({
  name,
  on,
  color,
  size = 26,
  motion = 'pop',
}: {
  name: keyof typeof Ionicons.glyphMap;
  on: boolean;
  color: string;
  size?: number;
  motion?: 'pop' | 'fold';
}) {
  const s = useSharedValue(1);
  const y = useSharedValue(0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!on) return;
    if (motion === 'fold') {
      y.value = withSequence(withTiming(4, timing(DURATION.press)), withTiming(0, timing(DURATION.quick)));
      s.value = withSequence(withTiming(0.9, timing(DURATION.press)), withTiming(1, timing(DURATION.quick)));
    } else {
      s.value = withSequence(withTiming(1.25, timing(DURATION.press + 30)), withTiming(1, timing(DURATION.move)));
    }
  }, [on, s, y, motion]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { scale: s.value }] }));
  return (
    <Animated.View style={style}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}

/** Round button that sits on a verse card (reels), its count rolling as it changes. */
export function CardAction({
  icon,
  on,
  onColor,
  label,
  onPress,
  dark,
  motion,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  on?: boolean;
  onColor?: string;
  label?: number;
  onPress: () => void;
  dark: boolean;
  motion?: 'pop' | 'fold';
  accessibilityLabel?: string;
}) {
  const fg = dark ? '#F7F1E3' : '#221D17';
  return (
    <View style={styles.actionWrap}>
      <PressableScale onPress={onPress} scaleTo={0.9} hitSlop={6} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
        <Surface tone="overlay" dark={dark} radius={26} style={styles.actionDisc}>
          <PopIcon name={icon} on={!!on} color={on && onColor ? onColor : fg} motion={motion} />
        </Surface>
      </PressableScale>
      {label !== undefined ? <RollingNumber value={label} style={[styles.actionLabel, { color: fg }]} maxFontSizeMultiplier={1.3} /> : null}
    </View>
  );
}

/** @deprecated use CardAction */
export const GlassAction = CardAction;

const styles = StyleSheet.create({
  burst: { position: 'absolute', width: HEART, height: HEART, alignItems: 'center', justifyContent: 'center' },
  spark: { position: 'absolute', width: 9, height: 9, borderRadius: 5 },
  actionWrap: { alignItems: 'center', gap: 4 },
  actionDisc: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: UI_FONT.bold, fontSize: 12 },
});
