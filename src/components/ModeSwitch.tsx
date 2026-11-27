import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { DURATION, EASE_IN_OUT, timing } from '../lib/motion';
import type { ViewMode } from '../lib/settings';
import { PressableScale } from './PressableScale';
import { Surface } from './Surface';

const SEG = 38;

/** Two-way switch between post (3:4) and reels (9:16); one indicator travels across (240ms). */
export function ModeSwitch({ mode, onChange, dark, accent, overlay }: { mode: ViewMode; onChange: (m: ViewMode) => void; dark: boolean; accent: string; overlay?: boolean }) {
  const x = useSharedValue(mode === 'post' ? 0 : SEG);
  useEffect(() => {
    x.value = withTiming(mode === 'post' ? 0 : SEG, { ...timing(DURATION.slide), easing: EASE_IN_OUT });
  }, [mode, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fg = dark ? '#F7F1E3' : '#221D17';
  const onAccent = dark ? '#221D17' : '#FFFFFF';
  const pick = (m: ViewMode) => {
    if (m === mode) return;
    Haptics.selectionAsync().catch(() => {});
    onChange(m);
  };
  return (
    <Surface tone={overlay ? 'overlay' : 'card'} dark={overlay ? dark : undefined} radius={22} style={styles.wrap}>
      <Animated.View style={[styles.pill, { backgroundColor: accent }, pill]} />
      <View style={styles.row}>
        <PressableScale onPress={() => pick('post')} style={styles.seg} accessibilityRole="button" accessibilityLabel="Post 3:4" accessibilityState={{ selected: mode === 'post' }}>
          <Ionicons name="tablet-portrait-outline" size={17} color={mode === 'post' ? onAccent : fg} />
        </PressableScale>
        <PressableScale onPress={() => pick('reels')} style={styles.seg} accessibilityRole="button" accessibilityLabel="Reels 9:16" accessibilityState={{ selected: mode === 'reels' }}>
          <Ionicons name="phone-portrait-outline" size={17} color={mode === 'reels' ? onAccent : fg} />
        </PressableScale>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SEG * 2 + 8, height: 44, padding: 3 },
  pill: { position: 'absolute', left: 3, top: 3, width: SEG, height: 36, borderRadius: 18 },
  row: { flexDirection: 'row' },
  seg: { width: SEG, height: 36, alignItems: 'center', justifyContent: 'center' },
});
