import { memo, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { CATEGORY_MAP, type Category } from '../../lib/categories';
import { clockTime, displayBody, kindOf, QUICK_REACTION, type ChatMessage, type ReactionChip } from '../../lib/chat';
import { UI_FONT } from '../../lib/fonts';
import { DURATION, EASE_ENTER, enter, timing } from '../../lib/motion';
import { useSettings } from '../../lib/settings';
import { passageText, shortLabel, VERSE_MAP } from '../../lib/verses';

export type BubbleStatus = 'sending' | 'failed' | 'sent' | 'read';

type Props = {
  message: ChatMessage;
  mine: boolean;
  first: boolean;
  last: boolean;
  /** arrived while the screen was open: plays the entrance */
  fresh: boolean;
  reactions?: ReactionChip[];
  /** the message this one answers */
  replied?: ChatMessage;
  repliedMine?: boolean;
  partnerName: string;
  /** only for my newest message */
  status?: BubbleStatus;
  /** prayer requests: has the other person prayed? */
  prayedByPartner: boolean;
  prayedByMe: boolean;
  onReact: (m: ChatMessage, emoji: string) => void;
  onLongPress: (m: ChatMessage) => void;
  onPray: (m: ChatMessage) => void;
  onRetry: (m: ChatMessage) => void;
  onJumpTo: (id: number) => void;
};

const DOUBLE_TAP_MS = 260;

function Bubble(p: Props) {
  const { message: m, mine, first, last } = p;
  const { colors, dark, translation, lang } = useSettings();
  const kind = kindOf(m);
  const body = displayBody(m);

  // Entrance: new messages rise from the composer side and settle. Loaded history stands still.
  const e = useSharedValue(p.fresh ? 0 : 1);
  useEffect(() => {
    if (p.fresh) e.value = withTiming(1, enter(DURATION.move));
  }, [p.fresh, e]);
  const enterStyle = useAnimatedStyle(() => ({
    opacity: e.value,
    transform: [{ translateY: (1 - e.value) * 14 }, { scale: 0.96 + e.value * 0.04 }],
  }));

  // Double-tap says amen: a large 🙏 rises off the bubble and fades.
  const lastTap = useRef(0);
  const burst = useSharedValue(0);
  const [burstEmoji, setBurstEmoji] = useState(QUICK_REACTION);
  const burstStyle = useAnimatedStyle(() => ({
    opacity: burst.value === 0 ? 0 : Math.min(1, (1 - burst.value) * 2.2),
    transform: [{ translateY: -burst.value * 46 }, { scale: 0.6 + Math.min(burst.value * 3, 1) * 0.5 }],
  }));
  const playBurst = (emoji: string) => {
    setBurstEmoji(emoji);
    burst.value = 0;
    burst.value = withSequence(withTiming(0.001, { duration: 1 }), withTiming(1, { duration: 900, easing: EASE_ENTER }), withTiming(0, { duration: 1 }));
  };

  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      if (m.id > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        playBurst(QUICK_REACTION);
        p.onReact(m, QUICK_REACTION);
      }
      return;
    }
    lastTap.current = now;
    if (p.status === 'failed') p.onRetry(m);
  };

  const r = 20;
  const tight = 6;
  const corners = mine
    ? { borderTopRightRadius: first ? r : tight, borderBottomRightRadius: last ? r : tight }
    : { borderTopLeftRadius: first ? r : tight, borderBottomLeftRadius: last ? r : tight };
  const bubbleTone = mine
    ? { backgroundColor: colors.primary, borderColor: colors.primary }
    : { backgroundColor: colors.card, borderColor: colors.border };
  const ink = mine ? colors.onPrimary : colors.text;

  const v = m.verse_id ? VERSE_MAP[m.verse_id] : undefined;
  // On a prayer request 🙏 is already said in words ("Maria prayed for this"), so no chip for it.
  const chips = (p.reactions ?? []).filter((c) => kind !== 'prayer' || c.emoji !== '🙏');

  return (
    <Animated.View style={[{ alignItems: mine ? 'flex-end' : 'flex-start', marginTop: first ? 10 : 2 }, enterStyle]}>
      <Pressable
        onPress={onTap}
        onLongPress={() => {
          if (m.id < 0) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          p.onLongPress(m);
        }}
        delayLongPress={320}
        style={{ maxWidth: '82%' }}
        accessibilityHint={lang === 'id' ? 'Ketuk dua kali untuk amin, tahan untuk reaksi' : 'Double-tap to say amen, hold for reactions'}
      >
        {p.replied ? (
          <Pressable onPress={() => p.onJumpTo(p.replied!.id)} style={[styles.quote, { borderColor: colors.primary, backgroundColor: colors.surface, alignSelf: mine ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.quoteName, { color: colors.primary }]} numberOfLines={1}>
              {p.repliedMine ? (lang === 'id' ? 'Kamu' : 'You') : p.partnerName}
            </Text>
            <Text style={[styles.quoteText, { color: colors.muted }]} numberOfLines={2}>
              {p.replied.verse_id ? `📖 ${VERSE_MAP[p.replied.verse_id]?.ref ?? ''}` : displayBody(p.replied)}
            </Text>
          </Pressable>
        ) : null}

        {v ? <VerseInChat verseId={v.id} mine={mine} dark={dark} translationLabel={shortLabel(translation)} body={passageText(v, translation)} category={CATEGORY_MAP[v.categories[0]]} /> : null}

        {kind === 'prayer' ? (
          <PrayerCard
            body={body}
            mine={mine}
            partnerName={p.partnerName}
            prayedByPartner={p.prayedByPartner}
            prayedByMe={p.prayedByMe}
            onPray={() => {
              playBurst('🙏');
              p.onPray(m);
            }}
          />
        ) : body ? (
          <View style={[styles.bubble, corners, bubbleTone, v ? { marginTop: 4 } : null]}>
            <Text style={[styles.body, { color: ink }]} selectable={false}>
              {body}
            </Text>
          </View>
        ) : null}

        {chips.length ? (
          <View style={[styles.chips, { alignSelf: mine ? 'flex-end' : 'flex-start' }]}>
            {chips.map((c) => (
              <ReactionPill key={c.emoji} chip={c} onPress={() => p.onReact(m, c.emoji)} />
            ))}
          </View>
        ) : null}

        <Animated.Text pointerEvents="none" style={[styles.burst, mine ? { right: 12 } : { left: 12 }, burstStyle]}>
          {burstEmoji}
        </Animated.Text>
      </Pressable>

      {last || p.status === 'failed' ? (
        <Text style={[styles.meta, { color: p.status === 'failed' ? colors.danger : colors.muted }]}>
          {p.status === 'failed'
            ? lang === 'id'
              ? 'Gagal terkirim · ketuk untuk coba lagi'
              : 'Not sent · tap to retry'
            : p.status === 'sending'
              ? lang === 'id'
                ? 'Mengirim…'
                : 'Sending…'
              : clockTime(m.created_at) +
                (p.status === 'read' ? ` · ${lang === 'id' ? 'Dibaca' : 'Read'}` : p.status === 'sent' ? ` · ${lang === 'id' ? 'Terkirim' : 'Sent'}` : '')}
        </Text>
      ) : null}
    </Animated.View>
  );
}

export const MessageBubble = memo(Bubble);

function VerseInChat({
  verseId,
  mine,
  dark,
  body,
  category,
  translationLabel,
}: {
  verseId: string;
  mine: boolean;
  dark: boolean;
  body: { title: string; body: string };
  category?: Category;
  translationLabel: string;
}) {
  const s = category ? (dark ? category.dark : category.light) : undefined;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/post/[id]', params: { id: verseId } })}
      style={[
        styles.verse,
        { backgroundColor: s?.paper ?? '#F7F1E3', borderColor: s?.well ?? 'transparent', alignSelf: mine ? 'flex-end' : 'flex-start' },
        mine ? { borderBottomRightRadius: 6 } : { borderBottomLeftRadius: 6 },
      ]}
    >
      <View style={styles.verseHead}>
        <Ionicons name={(category?.icon as keyof typeof Ionicons.glyphMap) ?? 'book-outline'} size={14} color={s?.accent ?? '#9A6A3A'} />
        <Text style={[styles.verseKicker, { color: s?.accent ?? '#9A6A3A' }]}>{body.title}</Text>
      </View>
      <Text style={[styles.verseBody, { color: s?.text ?? '#221D17' }]} numberOfLines={9}>
        “{body.body}”
      </Text>
      <View style={styles.verseFoot}>
        <Text style={[styles.verseTr, { color: s?.text ?? '#221D17' }]}>{translationLabel}</Text>
        <Ionicons name="arrow-forward" size={14} color={s?.text ?? '#221D17'} style={{ opacity: 0.6 }} />
      </View>
    </Pressable>
  );
}

function PrayerCard({
  body,
  mine,
  partnerName,
  prayedByPartner,
  prayedByMe,
  onPray,
}: {
  body: string;
  mine: boolean;
  partnerName: string;
  prayedByPartner: boolean;
  prayedByMe: boolean;
  onPray: () => void;
}) {
  const { colors, lang } = useSettings();
  const id = lang === 'id';
  // The flame warms once when someone prays: a single settle, no loop.
  const glow = useSharedValue(prayedByPartner || prayedByMe ? 1 : 0);
  useEffect(() => {
    glow.value = withDelay(80, withTiming(prayedByPartner || prayedByMe ? 1 : 0, timing(DURATION.enter)));
  }, [prayedByPartner, prayedByMe, glow]);
  const flame = useAnimatedStyle(() => ({ opacity: 0.55 + glow.value * 0.45, transform: [{ scale: 0.9 + glow.value * 0.1 }] }));

  const done = mine ? prayedByPartner : prayedByMe;
  return (
    <View style={[styles.prayer, { backgroundColor: colors.card, borderColor: colors.primary }, mine ? { borderBottomRightRadius: 6 } : { borderBottomLeftRadius: 6 }]}>
      <View style={styles.prayerHead}>
        <Animated.View style={[styles.flame, { backgroundColor: colors.primarySoft }, flame]}>
          <Ionicons name="flame" size={15} color={colors.primary} />
        </Animated.View>
        <Text style={[styles.prayerKicker, { color: colors.primary }]}>{id ? 'Permintaan doa' : 'Prayer request'}</Text>
      </View>
      <Text style={[styles.prayerBody, { color: colors.text }]}>{body}</Text>
      {mine ? (
        <Text style={[styles.prayerState, { color: done ? colors.success : colors.muted }]}>
          {done ? (id ? `🙏 ${partnerName} sudah mendoakan ini` : `🙏 ${partnerName} prayed for this`) : id ? 'Menunggu didoakan…' : 'Waiting for prayer…'}
        </Text>
      ) : done ? (
        <Text style={[styles.prayerState, { color: colors.success }]}>{id ? '✓ Kamu sudah mendoakan ini' : '✓ You prayed for this'}</Text>
      ) : (
        <Pressable
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            onPray();
          }}
          accessibilityRole="button"
          style={({ pressed }) => [styles.prayBtn, { backgroundColor: colors.primary, transform: [{ translateY: pressed ? 2 : 0 }] }]}
        >
          <Text style={[styles.prayBtnText, { color: colors.onPrimary }]}>{id ? 'Aku doakan 🙏' : "I'll pray 🙏"}</Text>
        </Pressable>
      )}
    </View>
  );
}

function ReactionPill({ chip, onPress }: { chip: ReactionChip; onPress: () => void }) {
  const { colors } = useSettings();
  // Each chip settles in when it appears, and again when its count changes. No overshoot.
  const s = useSharedValue(0.6);
  useEffect(() => {
    s.value = 0.7;
    s.value = withTiming(1, enter(DURATION.move));
  }, [chip.count, s]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={a}>
      <Pressable
        onPress={onPress}
        hitSlop={6}
        style={[styles.pill, { backgroundColor: chip.mine ? colors.primarySoft : colors.card, borderColor: chip.mine ? colors.primary : colors.border }]}
      >
        <Text style={styles.pillEmoji}>{chip.emoji}</Text>
        {chip.count > 1 ? <Text style={[styles.pillCount, { color: colors.text }]}>{chip.count}</Text> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth * 2, paddingHorizontal: 14, paddingVertical: 9 },
  body: { fontFamily: UI_FONT.regular, fontSize: 15.5, lineHeight: 22 },
  meta: { fontFamily: UI_FONT.semibold, fontSize: 11.5, marginTop: 4, marginHorizontal: 6 },
  quote: { borderLeftWidth: 3, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 3, maxWidth: '100%', opacity: 0.95 },
  quoteName: { fontFamily: UI_FONT.bold, fontSize: 12 },
  quoteText: { fontFamily: UI_FONT.regular, fontSize: 13, lineHeight: 18 },
  verse: { width: 256, maxWidth: '100%', borderRadius: 20, borderWidth: 1, padding: 16, gap: 8 },
  verseHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verseKicker: { fontFamily: UI_FONT.bold, fontSize: 12.5, letterSpacing: 0.2, flexShrink: 1 },
  verseBody: { fontFamily: UI_FONT.serifItalic, fontSize: 15, lineHeight: 22 },
  verseFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  verseTr: { fontFamily: UI_FONT.semibold, fontSize: 11, opacity: 0.6, letterSpacing: 0.6 },
  prayer: { width: 264, maxWidth: '100%', borderRadius: 20, borderWidth: 1.5, padding: 14, gap: 8 },
  prayerHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flame: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  prayerKicker: { fontFamily: UI_FONT.bold, fontSize: 12.5, letterSpacing: 0.3, textTransform: 'uppercase' },
  prayerBody: { fontFamily: UI_FONT.serif, fontSize: 15.5, lineHeight: 23 },
  prayerState: { fontFamily: UI_FONT.semibold, fontSize: 12.5 },
  prayBtn: { alignSelf: 'flex-start', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9, marginTop: 2 },
  prayBtnText: { fontFamily: UI_FONT.bold, fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: -6, marginHorizontal: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 12, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  pillEmoji: { fontSize: 14 },
  pillCount: { fontFamily: UI_FONT.bold, fontSize: 12 },
  burst: { position: 'absolute', top: -8, fontSize: 34 },
});
