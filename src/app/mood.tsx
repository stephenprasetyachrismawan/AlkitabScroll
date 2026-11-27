import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../lib/auth';
import { useEngagement } from '../lib/engagement';
import { UI_FONT } from '../lib/fonts';
import { DURATION, EASE_ENTER, enter, timing } from '../lib/motion';
import { MOODS, type Mood } from '../lib/moods';
import { useSettings } from '../lib/settings';

const rise = (i: number) => FadeInDown.duration(520).delay(i * DURATION.stagger).easing(EASE_ENTER);
const LEDGE = 4;
/** time to see the answer land before the feed opens */
const THANKS_MS = 650;

/** Daily, required: the first thing a user sees each day. */
export default function MoodScreen() {
  const { t, lang, colors } = useSettings();
  const { profile } = useAuth();
  const { chooseMood } = useEngagement();
  const [picked, setPicked] = useState<string | null>(null);

  const pick = (key: string) => {
    if (picked) return;
    setPicked(key);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(async () => {
      try {
        await chooseMood(key);
      } catch {
        Alert.alert('Selah', t('errorGeneric'));
        setPicked(null);
      }
    }, THANKS_MS);
  };

  const name = profile?.display_name?.split(' ')[0];

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Animated.Text entering={rise(0)} style={[styles.hello, { color: colors.primary }]}>
        {lang === 'id' ? 'Shalom' : 'Hello'}
        {name ? `, ${name}` : ''}
      </Animated.Text>
      <Animated.Text entering={rise(1)} style={[styles.q, { color: colors.text }]}>
        {t('moodQuestion')}
      </Animated.Text>
      <Animated.Text entering={rise(2)} style={[styles.hint, { color: colors.muted }]}>
        {picked ? t('moodThanks') : t('moodHint')}
      </Animated.Text>
      <View style={styles.grid}>
        {MOODS.map((m, i) => (
          <Animated.View key={m.key} entering={rise(3 + i)} style={styles.cellWrap}>
            <MoodTile mood={m} label={m.label[lang]} state={picked === null ? 'idle' : picked === m.key ? 'picked' : 'other'} onPress={() => pick(m.key)} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

function MoodTile({ mood, label, state, onPress }: { mood: Mood; label: string; state: 'idle' | 'picked' | 'other'; onPress: () => void }) {
  const { colors } = useSettings();
  const press = useSharedValue(0);
  const dim = useSharedValue(1);
  const tick = useSharedValue(0);
  useEffect(() => {
    dim.value = withTiming(state === 'other' ? 0.35 : 1, timing(DURATION.quick));
    if (state === 'picked') {
      press.value = withTiming(LEDGE, timing(DURATION.press));
      tick.value = withDelay(80, withTiming(1, enter(DURATION.move)));
    } else {
      tick.value = 0;
    }
  }, [state, dim, press, tick]);
  const face = useAnimatedStyle(() => ({ transform: [{ translateY: press.value }] }));
  const wrap = useAnimatedStyle(() => ({ opacity: dim.value, transform: [{ scale: 0.94 + dim.value * 0.06 }] }));
  const check = useAnimatedStyle(() => ({ opacity: tick.value, transform: [{ scale: 0.6 + tick.value * 0.4 }] }));

  const picked = state === 'picked';
  return (
    <Animated.View style={wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: picked, disabled: state !== 'idle' }}
        disabled={state !== 'idle'}
        onPressIn={() => press.set(withTiming(LEDGE, timing(DURATION.press)))}
        onPressOut={() => {
          if (state === 'idle') press.set(withTiming(0, timing(DURATION.release)));
        }}
        onPress={onPress}
        style={{ paddingBottom: LEDGE }}
      >
        <View style={[styles.ledge, { backgroundColor: picked ? colors.ledge : colors.border }]} />
        <Animated.View style={[styles.cell, { backgroundColor: picked ? colors.primarySoft : colors.card, borderColor: picked ? colors.primary : colors.border }, face]}>
          <Text style={styles.emoji}>{mood.emoji}</Text>
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
          <Animated.View style={[styles.check, { backgroundColor: colors.primary }, check]}>
            <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: 24, gap: 6 },
  hello: { fontFamily: UI_FONT.bold, fontSize: 15, letterSpacing: 0.3 },
  q: { fontFamily: UI_FONT.title, fontSize: 34, lineHeight: 38, letterSpacing: -0.8 },
  hint: { fontFamily: UI_FONT.regular, fontSize: 16, lineHeight: 23, marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  cellWrap: { width: '31.5%' },
  ledge: { position: 'absolute', left: 0, right: 0, bottom: 0, top: LEDGE, borderRadius: 18 },
  cell: { aspectRatio: 0.9, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emoji: { fontSize: 38 },
  label: { fontFamily: UI_FONT.semibold, fontSize: 14 },
  check: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
