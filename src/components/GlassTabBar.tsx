import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { UI_FONT } from '../lib/fonts';
import { timing } from '../lib/motion';
import { useSettings } from '../lib/settings';
import { Glass } from './Glass';
import { PressableScale } from './PressableScale';

export const TAB_BAR_HEIGHT = 64;
/** Space screens leave at the bottom so content clears the floating bar. */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, 12) + 12;
}

const ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  index: ['home', 'home-outline'],
  explore: ['compass', 'compass-outline'],
  inbox: ['chatbubbles', 'chatbubbles-outline'],
  profile: ['person', 'person-outline'],
};

/** Floating glass pill; a soft highlight glides to the selected tab. */
export function GlassTabBar({ state, descriptors, navigateToTab }: BottomTabBarProps) {
  const { colors, dark } = useSettings();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const count = state.routes.length;
  const slot = width / Math.max(count, 1);
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withTiming(state.index * slot, timing());
  }, [state.index, slot, x]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <Glass dark={dark} radius={32} strength={0.75} style={styles.bar}>
        <View style={styles.row} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 ? (
            <Animated.View style={[styles.pill, { width: slot - 12, backgroundColor: colors.primarySoft }, pill]} />
          ) : null}
          {state.routes.map((route, i) => {
            const focused = state.index === i;
            const title = descriptors[route.key]?.options.title ?? route.name;
            const [on, off] = ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
            return (
              <PressableScale
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={title}
                scaleTo={0.9}
                style={styles.tab}
                onPress={() => {
                  if (!focused) {
                    Haptics.selectionAsync().catch(() => {});
                    navigateToTab(route.key);
                  }
                }}
              >
                <Ionicons name={focused ? on : off} size={23} color={focused ? colors.primary : colors.muted} />
                <Text style={[styles.label, { color: focused ? colors.primary : colors.muted }]} numberOfLines={1}>
                  {title}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16 },
  bar: {
    height: TAB_BAR_HEIGHT,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  pill: { position: 'absolute', left: 6, top: 7, bottom: 7, borderRadius: 26 },
  tab: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontFamily: UI_FONT.semibold, fontSize: 11 },
});
