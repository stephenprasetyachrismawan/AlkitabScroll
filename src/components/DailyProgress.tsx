import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useDaily } from '../lib/daily';
import { UI_FONT } from '../lib/fonts';
import { DURATION, enter, timing } from '../lib/motion';
import { useSettings } from '../lib/settings';
import { RollingNumber } from './RollingNumber';
import { Surface } from './Surface';

/**
 * Header pill: the streak (a flame and a rolling count) and seven pips, one for each
 * verse read slowly today. A pip fills as its verse counts, so progress is felt while reading.
 */
export function DailyProgress({ overlay, dark }: { overlay?: boolean; dark?: boolean }) {
  const { colors, t } = useSettings();
  const { count, goal, streak, doneToday } = useDaily();
  const flameOn = streak > 0 || doneToday;
  const flameColor = flameOn ? '#D9772B' : colors.muted;

  const flame = useSharedValue(1);
  const prevStreak = useRef(streak);
  useEffect(() => {
    if (streak > prevStreak.current) {
      flame.value = withSequence(withTiming(1.3, timing(DURATION.quick)), withTiming(1, enter(DURATION.move)));
    }
    prevStreak.current = streak;
  }, [streak, flame]);
  const flameStyle = useAnimatedStyle(() => ({ transform: [{ scale: flame.value }] }));
  const fg = overlay ? (dark ? '#F7F1E3' : '#221D17') : colors.text;

  return (
    <Surface
      tone={overlay ? 'overlay' : 'card'}
      dark={dark}
      radius={22}
      style={styles.pill}
    >
      <View
        style={styles.row}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`${streak} ${t('streakDays')}. ${count}/${goal} ${t('dailyGoal')}`}
        accessibilityValue={{ min: 0, max: goal, now: count }}
      >
        <Animated.View style={flameStyle}>
          <Ionicons name={flameOn ? 'flame' : 'flame-outline'} size={18} color={flameColor} />
        </Animated.View>
        <RollingNumber value={streak} style={[styles.num, { color: fg }]} />
        <View style={styles.pips}>
          {Array.from({ length: goal }, (_, i) => (
            <Pip key={i} on={i < count} color={doneToday ? colors.success : colors.primary} idle={overlay ? (dark ? 'rgba(247,241,227,0.25)' : 'rgba(34,29,23,0.15)') : colors.surface} />
          ))}
        </View>
      </View>
    </Surface>
  );
}

function Pip({ on, color, idle }: { on: boolean; color: string; idle: string }) {
  const p = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(on ? 1 : 0, enter(DURATION.move));
  }, [on, p]);
  const fill = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scaleY: 0.3 + p.value * 0.7 }] }));
  return (
    <View style={[styles.pip, { backgroundColor: idle }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color, borderRadius: 2 }, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { height: 44, paddingHorizontal: 12, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  num: { fontFamily: UI_FONT.title, fontSize: 16, minWidth: 10 },
  pips: { flexDirection: 'row', gap: 3, marginLeft: 2 },
  pip: { width: 5, height: 16, borderRadius: 2, overflow: 'hidden' },
});
