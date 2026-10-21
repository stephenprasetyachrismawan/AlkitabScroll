import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { DURATION, timing } from '../lib/motion';

/**
 * Rise-and-fade entrance driven by a shared value.
 * Use this inside lists instead of Reanimated layout animations (`entering`):
 * unmounting list cells that carry layout animations can crash on Android.
 */
export function FadeInView({ children, delay = 0, distance = 14, style }: { children: ReactNode; delay?: number; distance?: number; style?: StyleProp<ViewStyle> }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, timing(DURATION.enter)));
  }, [p, delay]);
  const a = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * distance }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}
