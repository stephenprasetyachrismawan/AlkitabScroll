import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSettings } from '../../lib/settings';

/** Three dots that lift one after another while the other person is typing. */
export function TypingDots() {
  const { colors } = useSettings();
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  const c = useSharedValue(0);

  useEffect(() => {
    const cycle = (v: SharedValue<number>, delay: number) => {
      v.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 280, easing: Easing.bezier(0.2, 0.8, 0.2, 1), reduceMotion: ReduceMotion.System }),
            withTiming(0, { duration: 280, easing: Easing.bezier(0.65, 0, 0.35, 1), reduceMotion: ReduceMotion.System }),
            withTiming(0, { duration: 360 }),
          ),
          -1,
        ),
      );
    };
    cycle(a, 0);
    cycle(b, 140);
    cycle(c, 280);
    return () => {
      cancelAnimation(a);
      cancelAnimation(b);
      cancelAnimation(c);
    };
  }, [a, b, c]);

  return (
    <View
      style={[styles.bubble, { backgroundColor: colors.card, borderColor: colors.border }]}
      accessibilityRole="text"
      accessibilityLabel="…"
    >
      <Dot v={a} color={colors.muted} />
      <Dot v={b} color={colors.muted} />
      <Dot v={c} color={colors.muted} />
    </View>
  );
}

function Dot({ v, color }: { v: SharedValue<number>; color: string }) {
  const s = useAnimatedStyle(() => ({ opacity: 0.35 + v.value * 0.65, transform: [{ translateY: -v.value * 4 }] }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, s]} />;
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
});
