import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { todayKey } from '../lib/algorithm';
import * as api from '../lib/api';
import { hashString } from '../lib/categories';
import { UI_FONT } from '../lib/fonts';
import { allFriendStreaks, friendStreak, FRIEND_MILESTONES, type FriendStreak, type MsgLite } from '../lib/friendStreak';
import { DURATION, timing } from '../lib/motion';
import { useSettings } from '../lib/settings';
import { passageText, VERSES } from '../lib/verses';
import { useToast } from './Toast';

const FLAME = '#D9772B';

/** Streaks with everyone I've messaged recently, refreshed when the screen gains focus. */
export function useFriendStreaks(me: string | null) {
  const [streaks, setStreaks] = useState<Record<string, FriendStreak>>({});
  useFocusEffect(
    useCallback(() => {
      if (!me) return;
      let alive = true;
      api
        .recentMessages(me)
        .then((ms) => alive && setStreaks(allFriendStreaks(ms, me)))
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, [me]),
  );
  return streaks;
}

/** Flame and day count; an hourglass while today still needs a message. */
export function StreakFlame({ streak, size = 15 }: { streak?: FriendStreak; size?: number }) {
  const { colors, t } = useSettings();
  if (!streak || streak.count < 1) return null;
  return (
    <View
      style={styles.flame}
      accessible
      accessibilityLabel={`${streak.count} ${t('streakDaysShort')}${streak.atRisk ? ', ⌛' : ''}`}
    >
      <Ionicons name="flame" size={size} color={streak.atRisk ? colors.muted : FLAME} />
      <Text style={[styles.flameText, { color: streak.atRisk ? colors.muted : colors.text, fontSize: size - 1 }]}>{streak.count}</Text>
      {streak.atRisk ? <Ionicons name="hourglass-outline" size={size - 3} color={colors.muted} /> : null}
    </View>
  );
}

const ENCOURAGE = new Set(['hope', 'courage', 'strength', 'comfort', 'perseverance', 'peace', 'joy']);
const POOL = VERSES.filter((v) => v.categories.some((c) => ENCOURAGE.has(c)));

/**
 * Above the chat input: tells where the shared flame stands and offers one encouraging
 * verse to send. Celebrates the moment today's flame lights.
 */
export function StreakNudge({
  me,
  other,
  partnerName,
  messages,
  onSend,
}: {
  me: string;
  other: string;
  partnerName: string;
  messages: MsgLite[];
  onSend: (verseId: string) => Promise<void>;
}) {
  const { colors, t, translation } = useSettings();
  const toast = useToast();
  const streak = useMemo(() => friendStreak(messages, me, other), [messages, me, other]);
  const [shuffle, setShuffle] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [sending, setSending] = useState(false);
  const verse = POOL.length ? POOL[hashString(`${todayKey()}:${other}:${shuffle}`) % POOL.length] : null;

  // light the flame: fires once when today starts counting
  const wasDone = useRef<boolean | null>(null);
  const glow = useSharedValue(1);
  useEffect(() => {
    if (!messages.length) return;
    if (wasDone.current === false && streak.doneToday) {
      const milestone = FRIEND_MILESTONES.includes(streak.count);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast(`${t('streakLit')} ${streak.count} ${t('streakDaysWith')} ${partnerName}`, milestone ? 'trophy' : 'flame');
      glow.value = withSequence(withTiming(1.25, timing(DURATION.slide)), withTiming(1, timing(DURATION.move)));
    }
    wasDone.current = streak.doneToday;
  }, [streak.doneToday, streak.count, messages.length, partnerName, toast, t, glow]);
  const glowStyle = useAnimatedStyle(() => ({ transform: [{ scale: glow.value }] }));

  if (hidden || streak.doneToday || !verse) return null;

  if (streak.mineToday) {
    return (
      <View style={[styles.bar, { backgroundColor: colors.surface }]}>
        <Animated.View style={glowStyle}>
          <Ionicons name="hourglass-outline" size={18} color={colors.muted} />
        </Animated.View>
        <Text style={[styles.text, { color: colors.muted }]} numberOfLines={2}>
          {t('streakTheirTurn')} {partnerName}.
        </Text>
      </View>
    );
  }

  const { title } = passageText(verse, translation);
  return (
    <View style={[styles.bar, { backgroundColor: colors.surface }]}>
      <Animated.View style={glowStyle}>
        <Ionicons name="flame" size={20} color={streak.count ? FLAME : colors.muted} />
      </Animated.View>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[styles.text, { color: colors.text }]}>
          {streak.count ? `${streak.count} ${t('streakDaysWith')} ${partnerName}. ${t('streakAtRisk')}` : t('streakStart')}
        </Text>
        <View style={styles.row}>
          <Pressable
            onPress={() => setShuffle((n) => n + 1)}
            style={[styles.chip, { borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={t('streakShuffle')}
          >
            <Ionicons name="shuffle" size={14} color={colors.muted} />
            <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
          </Pressable>
          <Pressable
            disabled={sending}
            onPress={async () => {
              setSending(true);
              try {
                await onSend(verse.id);
              } finally {
                setSending(false);
              }
            }}
            style={[styles.send, { backgroundColor: colors.primary, opacity: sending ? 0.6 : 1 }]}
            accessibilityRole="button"
          >
            <Ionicons name="paper-plane" size={14} color={colors.onPrimary} />
            <Text style={[styles.sendText, { color: colors.onPrimary }]}>{t('streakSend')}</Text>
          </Pressable>
        </View>
      </View>
      <Pressable onPress={() => setHidden(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('close')}>
        <Ionicons name="close" size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flame: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  flameText: { fontFamily: UI_FONT.bold },
  bar: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 12, marginBottom: 8, borderRadius: 16, padding: 12 },
  text: { fontFamily: UI_FONT.regular, fontSize: 13.5, lineHeight: 19, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, flexShrink: 1 },
  chipText: { fontFamily: UI_FONT.semibold, fontSize: 13, flexShrink: 1 },
  send: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  sendText: { fontFamily: UI_FONT.bold, fontSize: 13 },
});
