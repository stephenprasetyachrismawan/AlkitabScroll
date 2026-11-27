import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { todayKey } from '../lib/algorithm';
import { UI_FONT } from '../lib/fonts';
import { DURATION, enter, timing } from '../lib/motion';
import { useSettings } from '../lib/settings';
import { nextStage, stageFor, stageProgress, weekDots, type Stage } from '../lib/sowing';
import { useSowing } from '../lib/sowingContext';
import { THEME_MAP } from '../lib/shareCards';
import { ChunkyButton } from './ChunkyButton';
import { RollingNumber } from './RollingNumber';

type Icon = keyof typeof Ionicons.glyphMap;

function lastWeek(): string[] {
  const out: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(todayKey(d));
  }
  return out;
}

/**
 * The sower's progress: stage, seeds to the next stage, a bar that fills when a seed
 * lands, and seven dots for the days you shared this week.
 * `pop` changes each time a seed counted, which plays the "+1".
 */
export function SowingMeter({ pop }: { pop: number }) {
  const { colors, lang, t } = useSettings();
  const { state } = useSowing();
  const stage = stageFor(state.total);
  const next = nextStage(state.total);
  const progress = stageProgress(state.total);

  const fill = useSharedValue(progress);
  const plus = useSharedValue(0);
  const seed = useSharedValue(1);
  useEffect(() => {
    fill.value = withTiming(progress, enter(620));
  }, [fill, progress]);
  useEffect(() => {
    if (!pop) return;
    plus.value = 0;
    plus.value = withSequence(withTiming(1, enter(420)), withDelay(700, withTiming(2, timing(DURATION.quick))));
    seed.value = withSequence(withTiming(0.82, timing(DURATION.press)), withTiming(1, timing(DURATION.release)));
  }, [pop, plus, seed]);

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: Math.max(0.02, fill.value) }] }));
  const plusStyle = useAnimatedStyle(() => ({
    opacity: plus.value <= 1 ? plus.value : 2 - plus.value,
    transform: [{ translateY: -14 * Math.min(plus.value, 1) }],
  }));
  const seedStyle = useAnimatedStyle(() => ({ transform: [{ scale: seed.value }] }));
  const dots = weekDots(state.days, lastWeek());

  return (
    <View style={[styles.meter, { backgroundColor: colors.surface }]}>
      <Animated.View style={[styles.badge, { backgroundColor: colors.primarySoft }, seedStyle]}>
        <Ionicons name={stage.icon as Icon} size={20} color={colors.success} />
      </Animated.View>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={styles.row}>
          <Text style={[styles.stage, { color: colors.text }]} numberOfLines={1}>
            {stage.name[lang]}
          </Text>
          <View style={styles.count}>
            <RollingNumber value={state.total} style={[styles.countText, { color: colors.text }]} />
            <Ionicons name="leaf" size={12} color={colors.success} />
            <Animated.Text style={[styles.plus, { color: colors.success }, plusStyle]}>+1</Animated.Text>
          </View>
        </View>
        <View style={[styles.track, { backgroundColor: colors.border }]}>
          <Animated.View style={[styles.fill, { backgroundColor: colors.success }, fillStyle]} />
        </View>
        <View style={styles.row}>
          <Text style={[styles.hint, { color: colors.muted }]} numberOfLines={1}>
            {next
              ? `${next.at - state.total} ${t('seedsToGo')} ${next.name[lang]}${next.unlocks ? ` · ${t('opensTheme')} ${THEME_MAP[next.unlocks].name[lang]}` : ''}`
              : t('sowerMax')}
          </Text>
          <View style={styles.dots} accessibilityLabel={t('sharedThisWeek')}>
            {dots.map((on, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: on ? colors.success : 'transparent', borderColor: on ? colors.success : colors.border }]} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const LEAVES = 7;

/** Shown when a seed reaches a new stage: the plant grows, the new theme is offered. */
export function StageReached({ stage, onTry, onClose }: { stage: Stage; onTry?: (theme: string) => void; onClose: () => void }) {
  const { colors, lang, t } = useSettings();
  const shade = useSharedValue(0);
  const card = useSharedValue(0);
  const grow = useSharedValue(0.55);
  const [shown] = useState(stage);
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    shade.value = withTiming(1, timing(DURATION.quick));
    card.value = withDelay(60, withTiming(1, enter(600)));
    grow.value = withDelay(260, withTiming(1, enter(720)));
  }, [shade, card, grow]);
  const shadeStyle = useAnimatedStyle(() => ({ opacity: shade.value }));
  const cardStyle = useAnimatedStyle(() => ({ opacity: card.value, transform: [{ translateY: (1 - card.value) * 24 }] }));
  const growStyle = useAnimatedStyle(() => ({ transform: [{ scale: grow.value }, { translateY: (1 - grow.value) * 16 }] }));
  const theme = shown.unlocks ? THEME_MAP[shown.unlocks] : null;

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Animated.View style={[StyleSheet.absoluteFill, styles.shade, shadeStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('close')} />
      </Animated.View>
      <View pointerEvents="box-none" style={styles.center}>
        <Animated.View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, cardStyle]}>
          <View style={styles.plant}>
            {Array.from({ length: LEAVES }, (_, i) => (
              <Leaf key={i} angle={-Math.PI / 2 + ((i - (LEAVES - 1) / 2) / LEAVES) * Math.PI * 1.1} delay={420 + i * 40} color={colors.success} />
            ))}
            <Animated.View style={growStyle}>
              <Ionicons name={shown.icon as Icon} size={76} color={colors.success} />
            </Animated.View>
          </View>
          <Text style={[styles.kicker, { color: colors.muted }]}>{t('sowerNewStage')}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{shown.name[lang]}</Text>
          <Text style={[styles.body, { color: colors.muted }]}>{t('sowerBody')}</Text>
          {theme ? (
            <View style={[styles.unlock, { backgroundColor: colors.surface }]}>
              <View style={[styles.swatch, { backgroundColor: theme.ground === 'category' ? colors.bg : theme.ground, borderColor: theme.accent || colors.border }]}>
                <View style={[styles.swatchDot, { backgroundColor: theme.accent || colors.primary }]} />
              </View>
              <Text style={[styles.unlockText, { color: colors.text }]}>
                {t('themeOpened')} <Text style={{ fontFamily: UI_FONT.bold }}>{theme.name[lang]}</Text>
              </Text>
            </View>
          ) : null}
          <ChunkyButton
            label={theme && onTry ? t('tryTheme') : t('keepGoing')}
            icon={theme && onTry ? 'color-palette-outline' : undefined}
            onPress={() => {
              if (theme && onTry) onTry(theme.key);
              onClose();
            }}
            style={{ alignSelf: 'stretch', marginTop: 10 }}
          />
        </Animated.View>
      </View>
    </View>
  );
}

function Leaf({ angle, delay, color }: { angle: number; delay: number; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, enter(760)));
  }, [p, delay]);
  const R = 64;
  const s = useAnimatedStyle(() => ({
    opacity: p.value === 0 ? 0 : 1 - p.value * 0.9,
    transform: [{ translateX: Math.cos(angle) * R * p.value }, { translateY: Math.sin(angle) * R * p.value + 8 }, { rotate: `${angle + Math.PI / 2}rad` }],
  }));
  return <Animated.View style={[styles.leaf, { backgroundColor: color }, s]} />;
}

/** Celebrates a stage reached outside the share sheet (e.g. after posting a status). */
export function SowingCelebration() {
  const { pending, clearPending, sheetOpen } = useSowing();
  if (!pending || sheetOpen) return null;
  return <StageReached key={pending.key} stage={pending} onClose={clearPending} />;
}

const styles = StyleSheet.create({
  meter: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 12 },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  stage: { fontFamily: UI_FONT.display, fontSize: 15, flexShrink: 1 },
  count: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  countText: { fontFamily: UI_FONT.bold, fontSize: 14 },
  plus: { position: 'absolute', right: -2, top: -14, fontFamily: UI_FONT.bold, fontSize: 13 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { flex: 1, borderRadius: 4, transformOrigin: 'left' },
  hint: { fontFamily: UI_FONT.regular, fontSize: 12, flexShrink: 1 },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 7, height: 7, borderRadius: 4, borderWidth: 1 },
  shade: { backgroundColor: 'rgba(26,22,18,0.55)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, borderRadius: 24, borderWidth: 2, padding: 24, alignItems: 'center', gap: 4 },
  plant: { width: 140, height: 112, alignItems: 'center', justifyContent: 'center' },
  leaf: { position: 'absolute', width: 9, height: 16, borderRadius: 8 },
  kicker: { fontFamily: UI_FONT.bold, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' },
  title: { fontFamily: UI_FONT.title, fontSize: 30, lineHeight: 36 },
  body: { fontFamily: UI_FONT.serif, fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 4 },
  unlock: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12, alignSelf: 'stretch' },
  swatch: { width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  swatchDot: { width: 10, height: 10, borderRadius: 5 },
  unlockText: { fontFamily: UI_FONT.regular, fontSize: 14, flexShrink: 1 },
});
