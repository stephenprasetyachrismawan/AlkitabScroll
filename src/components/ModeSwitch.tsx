import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { timing } from '../lib/motion';
import type { ViewMode } from '../lib/settings';
import { Glass } from './Glass';
import { PressableScale } from './PressableScale';

const SEG = 40;

/** Two-way switch between post (3:4) and reels (9:16); the highlight glides across. */
export function ModeSwitch({ mode, onChange, dark, accent }: { mode: ViewMode; onChange: (m: ViewMode) => void; dark: boolean; accent: string }) {
  const x = useSharedValue(mode === 'post' ? 0 : SEG);
  useEffect(() => {
    x.value = withTiming(mode === 'post' ? 0 : SEG, timing());
  }, [mode, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fg = dark ? '#FFFFFF' : '#1E1A16';
  const pick = (m: ViewMode) => {
    if (m === mode) return;
    Haptics.selectionAsync().catch(() => {});
    onChange(m);
  };
  return (
    <Glass dark={dark} radius={22} strength={0.6} style={styles.wrap}>
      <Animated.View style={[styles.pill, { backgroundColor: accent }, pill]} />
      <View style={styles.row}>
        <PressableScale onPress={() => pick('post')} style={styles.seg} accessibilityRole="button" accessibilityLabel="Post 3:4" accessibilityState={{ selected: mode === 'post' }}>
          <Ionicons name="tablet-portrait-outline" size={17} color={mode === 'post' ? '#fff' : fg} />
        </PressableScale>
        <PressableScale onPress={() => pick('reels')} style={styles.seg} accessibilityRole="button" accessibilityLabel="Reels 9:16" accessibilityState={{ selected: mode === 'reels' }}>
          <Ionicons name="phone-portrait-outline" size={17} color={mode === 'reels' ? '#fff' : fg} />
        </PressableScale>
      </View>
    </Glass>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SEG * 2 + 8, height: 44, padding: 4 },
  pill: { position: 'absolute', left: 4, top: 4, width: SEG, height: 36, borderRadius: 18 },
  row: { flexDirection: 'row' },
  seg: { width: SEG, height: 36, alignItems: 'center', justifyContent: 'center' },
});
