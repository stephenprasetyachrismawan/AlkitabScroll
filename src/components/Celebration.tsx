import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useDaily, type DailyEvent } from '../lib/daily';
import { UI_FONT } from '../lib/fonts';
import { DURATION, enter, timing } from '../lib/motion';
import { useSettings } from '../lib/settings';
import { ChunkyButton } from './ChunkyButton';
import { RollingNumber } from './RollingNumber';
import { useToast } from './Toast';

const EMBERS = 8;

/**
 * Reacts to the daily ritual. Meeting the goal: a short note and a success tap.
 * A streak milestone (3, 7, 30, 100, 365 days): one card worth stopping for.
 */
export function Celebration() {
  const { event } = useDaily();
  const { t } = useSettings();
  const toast = useToast();
  // events from before this screen mounted are old news
  const [first] = useState(() => event?.id ?? 0);
  const [closed, setClosed] = useState(0);
  const seen = useRef(first);

  useEffect(() => {
    if (!event || event.id <= seen.current) return;
    seen.current = event.id;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (event.kind === 'done') toast(t('dailyDone'), 'checkmark-circle');
  }, [event, toast, t]);

  const milestone: DailyEvent | null = event && event.kind === 'milestone' && event.id > first && event.id > closed ? event : null;
  return milestone ? <MilestoneCard key={milestone.id} streak={milestone.streak} onClose={() => setClosed(milestone.id)} /> : null;
}

function MilestoneCard({ streak, onClose }: { streak: number; onClose: () => void }) {
  const { colors, t } = useSettings();
  const shade = useSharedValue(0);
  const card = useSharedValue(0);
  const [n, setN] = useState(Math.max(0, streak - 1));
  useEffect(() => {
    shade.value = withTiming(1, timing(DURATION.quick));
    card.value = withDelay(80, withTiming(1, enter(620)));
    const roll = setTimeout(() => setN(streak), 520);
    return () => clearTimeout(roll);
  }, [shade, card, streak]);
  const shadeStyle = useAnimatedStyle(() => ({ opacity: shade.value }));
  const cardStyle = useAnimatedStyle(() => ({ opacity: card.value, transform: [{ translateY: (1 - card.value) * 28 }, { scale: 0.96 + card.value * 0.04 }] }));

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Animated.View style={[StyleSheet.absoluteFill, styles.shade, shadeStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('close')} />
      </Animated.View>
      <View pointerEvents="box-none" style={styles.center}>
        <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, cardStyle]}>
          <View style={styles.flameWrap}>
            {Array.from({ length: EMBERS }, (_, i) => (
              <Ember key={i} angle={(i / EMBERS) * Math.PI * 2} delay={300 + (i % 3) * 40} />
            ))}
            <Ionicons name="flame" size={84} color="#D9772B" />
          </View>
          <RollingNumber value={n} style={[styles.big, { color: colors.text }]} />
          <Text style={[styles.label, { color: colors.text }]}>{t('streakDays')}</Text>
          <Text style={[styles.body, { color: colors.muted }]}>{t('streakBody')}</Text>
          <ChunkyButton label={t('keepGoing')} onPress={onClose} style={{ alignSelf: 'stretch', marginTop: 8 }} />
        </Animated.View>
      </View>
    </View>
  );
}

function Ember({ angle, delay }: { angle: number; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, enter(700)));
  }, [p, delay]);
  const R = 70;
  const s = useAnimatedStyle(() => ({
    opacity: p.value === 0 ? 0 : 1 - p.value,
    transform: [{ translateX: Math.cos(angle) * R * p.value }, { translateY: Math.sin(angle) * R * p.value - 10 }, { scale: 1 - p.value * 0.5 }],
  }));
  return <Animated.View style={[styles.ember, s]} />;
}

const styles = StyleSheet.create({
  shade: { backgroundColor: 'rgba(26,22,18,0.55)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, borderRadius: 24, borderWidth: 2, padding: 24, alignItems: 'center', gap: 4 },
  flameWrap: { width: 120, height: 110, alignItems: 'center', justifyContent: 'center' },
  ember: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#E9A23B' },
  big: { fontFamily: UI_FONT.title, fontSize: 56, lineHeight: 62 },
  label: { fontFamily: UI_FONT.display, fontSize: 18 },
  body: { fontFamily: UI_FONT.serif, fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 6, marginBottom: 8 },
});
