import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Text, useFontScale } from './Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { UI_FONT } from '../lib/fonts';
import { DURATION, EASE_IN_OUT, enter, timing } from '../lib/motion';
import { useSettings } from '../lib/settings';
import { PressableScale } from './PressableScale';

export const TAB_BAR_HEIGHT = 60;
/** Tab labels grow with the phone's font size up to this much; the bar grows with them. */
const LABEL_SCALE = 1.3;
const LABEL_SIZE = 11.5;

/** Bar height for the current font size: 60 at the default, a little taller past it. */
export function useTabBarHeight() {
  const scale = useFontScale(LABEL_SCALE);
  return Math.round(TAB_BAR_HEIGHT + LABEL_SIZE * 1.3 * (scale - 1));
}

/** Space screens leave at the bottom so content clears the bar. */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return useTabBarHeight() + Math.max(insets.bottom, 8);
}

const ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  index: ['book', 'book-outline'],
  explore: ['compass', 'compass-outline'],
  inbox: ['chatbubbles', 'chatbubbles-outline'],
  profile: ['person', 'person-outline'],
};

/**
 * A plain paper bar with a printed top edge. The current tab wears a short ink bar that
 * travels to the new tab (240ms); the new icon steps up and swells once.
 */
export function TabBar({ state, descriptors, navigateToTab }: BottomTabBarProps) {
  const { colors } = useSettings();
  const insets = useSafeAreaInsets();
  const height = useTabBarHeight();
  const [width, setWidth] = useState(0);
  const count = state.routes.length;
  const slot = width / Math.max(count, 1);
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withTiming(state.index * slot, { ...timing(DURATION.slide), easing: EASE_IN_OUT });
  }, [state.index, slot, x]);

  const bar = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: colors.bg, borderTopColor: colors.border }]}>
      <View style={[styles.row, { height }]} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Animated.View style={[styles.indicatorSlot, { width: slot }, bar]}>
            <View style={[styles.indicator, { backgroundColor: colors.primary }]} />
          </Animated.View>
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
              scaleTo={0.92}
              style={styles.tab}
              onPress={() => {
                if (!focused) {
                  Haptics.selectionAsync().catch(() => {});
                  navigateToTab(route.key);
                }
              }}
            >
              <TabIcon focused={focused} name={focused ? on : off} color={focused ? colors.primary : colors.muted} />
              <Text style={[styles.label, { color: focused ? colors.text : colors.muted }]} numberOfLines={1} maxFontSizeMultiplier={LABEL_SCALE}>
                {title}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

function TabIcon({ focused, name, color }: { focused: boolean; name: keyof typeof Ionicons.glyphMap; color: string }) {
  const y = useSharedValue(focused ? -2 : 0);
  const s = useSharedValue(1);
  useEffect(() => {
    y.value = withTiming(focused ? -2 : 0, enter(DURATION.move));
    if (focused) s.value = withSequence(withTiming(1.16, timing(DURATION.quick)), withTiming(1, enter(DURATION.move)));
  }, [focused, y, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { scale: s.value }] }));
  return (
    <Animated.View style={style}>
      <Ionicons name={name} size={24} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: StyleSheet.hairlineWidth * 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  indicatorSlot: { position: 'absolute', top: 0, left: 0, alignItems: 'center' },
  indicator: { width: 28, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  tab: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 2 },
  label: { fontFamily: UI_FONT.semibold, fontSize: LABEL_SIZE },
});
