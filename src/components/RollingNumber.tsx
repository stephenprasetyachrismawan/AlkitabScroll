import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { DURATION, timing } from '../lib/motion';

/**
 * A count that rolls instead of swapping: going up, the old figure leaves upward and the
 * new one comes in from below (down: the other way). 240ms, transform and opacity only.
 */
export function RollingNumber({ value, style, format = String }: { value: number; style?: StyleProp<TextStyle>; format?: (n: number) => string }) {
  const [shown, setShown] = useState({ now: value, before: value });
  const p = useSharedValue(1);
  const dir = useSharedValue(1);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setShown((s) => (s.now === value ? s : { now: value, before: s.now }));
  }, [value]);

  useEffect(() => {
    if (shown.now === shown.before) return;
    dir.value = shown.now > shown.before ? 1 : -1;
    p.value = 0;
    p.value = withTiming(1, timing(DURATION.slide));
  }, [shown, p, dir]);

  const D = 10;
  const inStyle = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * D * dir.value }] }));
  const outStyle = useAnimatedStyle(() => ({ opacity: 1 - p.value, transform: [{ translateY: -p.value * D * dir.value }] }));

  return (
    <View style={styles.wrap}>
      {shown.now !== shown.before ? (
        <Animated.Text style={[style, styles.abs, outStyle]} accessibilityElementsHidden importantForAccessibility="no">
          {format(shown.before)}
        </Animated.Text>
      ) : null}
      <Animated.Text style={[style, inStyle]}>{format(shown.now)}</Animated.Text>
      {/* reserves the width of the wider figure so neighbours never jump */}
      <Text style={[style, styles.ghost]} accessibilityElementsHidden importantForAccessibility="no">
        {format(Math.max(shown.now, shown.before))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', alignItems: 'center' },
  abs: { position: 'absolute', top: 0 },
  ghost: { opacity: 0, height: 0 },
});
