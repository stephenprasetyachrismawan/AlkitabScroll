import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { UI_FONT } from '../../lib/fonts';
import { DURATION, enter } from '../../lib/motion';
import { useSettings } from '../../lib/settings';
import { ChunkyButton } from '../ChunkyButton';

const SPARKS = 12;
const SPARK_COLORS = ['#E9A23B', '#D9772B', '#8DBA6E', '#9A6A3A'];

/** End-of-session screen: a figure in the middle, sparks out from behind it, stats rising in. */
export function Finish({
  hero,
  title,
  lines,
  button,
  onDone,
}: {
  hero: ReactNode;
  title: string;
  lines: { icon: keyof typeof Ionicons.glyphMap; text: string; tone?: 'success' | 'primary' }[];
  button: string;
  onDone: () => void;
}) {
  const { colors } = useSettings();
  const insets = useSafeAreaInsets();
  const p = useSharedValue(0);
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    p.value = withTiming(1, enter(620));
  }, [p]);
  const heroStyle = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.86 + p.value * 0.14 }] }));

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
      <View style={styles.center}>
        <View style={styles.heroBox}>
          {Array.from({ length: SPARKS }, (_, i) => (
            <Spark key={i} angle={(i / SPARKS) * Math.PI * 2} delay={240 + (i % 4) * 50} color={SPARK_COLORS[i % SPARK_COLORS.length]} />
          ))}
          <Animated.View style={heroStyle}>{hero}</Animated.View>
        </View>
        <Rise delay={260}>
          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
            {title}
          </Text>
        </Rise>
        <View style={{ gap: 10, alignSelf: 'stretch', marginTop: 8 }}>
          {lines.map((l, i) => (
            <Rise key={i} delay={420 + i * 110}>
              <View style={[styles.line, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name={l.icon} size={20} color={l.tone === 'success' ? colors.success : colors.primary} />
                <Text style={[styles.lineText, { color: colors.text }]}>{l.text}</Text>
              </View>
            </Rise>
          ))}
        </View>
      </View>
      <Rise delay={520}>
        <ChunkyButton label={button} onPress={onDone} />
      </Rise>
    </View>
  );
}

function Rise({ delay, children }: { delay: number; children: ReactNode }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, enter(DURATION.enter)));
  }, [p, delay]);
  const a = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 16 }] }));
  return <Animated.View style={a}>{children}</Animated.View>;
}

function Spark({ angle, delay, color }: { angle: number; delay: number; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, enter(900)));
  }, [p, delay]);
  const R = 96;
  const s = useAnimatedStyle(() => ({
    opacity: p.value === 0 ? 0 : 1 - p.value,
    transform: [{ translateX: Math.cos(angle) * R * p.value }, { translateY: Math.sin(angle) * R * p.value }, { rotate: `${p.value * 180}deg` }, { scale: 1 - p.value * 0.4 }],
  }));
  return <Animated.View style={[styles.spark, { backgroundColor: color }, s]} />;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  heroBox: { width: 200, height: 180, alignItems: 'center', justifyContent: 'center' },
  spark: { position: 'absolute', width: 10, height: 10, borderRadius: 3 },
  title: { fontFamily: UI_FONT.title, fontSize: 30, letterSpacing: -0.6, textAlign: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 2, paddingHorizontal: 16, paddingVertical: 14 },
  lineText: { flex: 1, fontFamily: UI_FONT.semibold, fontSize: 15, lineHeight: 21 },
});
