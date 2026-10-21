import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { DURATION, timing } from '../lib/motion';

const APressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How far it sinks when pressed (0.96 = 4%). */
  scaleTo?: number;
  haptic?: boolean;
};

/** Every tappable thing gives under the finger, then settles back. */
export function PressableScale({ children, style, scaleTo = 0.96, haptic = false, onPressIn, onPressOut, onPress, ...rest }: Props) {
  const s = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      {...rest}
      onPressIn={(e) => {
        s.set(withTiming(scaleTo, timing(DURATION.press)));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.set(withTiming(1, timing(DURATION.move)));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      style={[style, animated]}
    >
      {children}
    </APressable>
  );
}
