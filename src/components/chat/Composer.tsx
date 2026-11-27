import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { QuickReply } from '../../lib/chat';
import { UI_FONT } from '../../lib/fonts';
import { DURATION, EASE, enter, timing } from '../../lib/motion';
import { useSettings } from '../../lib/settings';

type Props = {
  value: string;
  onChange: (s: string) => void;
  prayer: boolean;
  onPrayer: (on: boolean) => void;
  /** "Replying to …" bar */
  reply?: { name: string; text: string } | null;
  onCancelReply: () => void;
  onSend: () => void;
  onVerse: () => void;
  quick: QuickReply[];
  onQuick: (q: QuickReply) => void;
  bottomInset: number;
};

/**
 * The bar at the bottom: a + that turns into ×, opening two tiles (verse, prayer request);
 * quick replies when the field is empty; a round send button that throws its arrow up.
 */
export function Composer(p: Props) {
  const { colors, lang } = useSettings();
  const id = lang === 'id';
  const [tray, setTray] = useState(false);
  const hasText = p.value.trim().length > 0;

  // + rotates to × and the tray rises under it.
  const plus = useSharedValue(0);
  useEffect(() => {
    plus.value = withTiming(tray ? 1 : 0, timing(DURATION.slide));
  }, [tray, plus]);
  const plusStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${plus.value * 45}deg` }] }));
  const trayStyle = useAnimatedStyle(() => ({ opacity: plus.value, transform: [{ translateY: (1 - plus.value) * 10 }] }));

  // Send button grows in when there's something to send.
  const ready = useSharedValue(hasText ? 1 : 0);
  useEffect(() => {
    ready.value = withTiming(hasText ? 1 : 0, timing(DURATION.quick));
  }, [hasText, ready]);
  const sendWrap = useAnimatedStyle(() => ({ transform: [{ scale: 0.82 + ready.value * 0.18 }], opacity: 0.45 + ready.value * 0.55 }));

  // On send the arrow flies off the top and a fresh one rises from below.
  const fly = useSharedValue(0);
  const arrow = useAnimatedStyle(() => {
    const out = fly.value <= 1 ? fly.value : 0;
    const back = fly.value > 1 ? 2 - fly.value : 0;
    return { opacity: fly.value <= 1 ? 1 - out : 1 - back, transform: [{ translateY: fly.value <= 1 ? -out * 22 : back * 16 }] };
  });

  const send = () => {
    if (!hasText) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    fly.value = 0;
    fly.value = withSequence(withTiming(1, { duration: 160, easing: EASE }), withTiming(1.001, { duration: 1 }), withTiming(2, enter(DURATION.slide)));
    setTray(false);
    p.onSend();
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg, borderColor: colors.border, paddingBottom: Math.max(p.bottomInset, 10) }]}>
      {p.quick.length && !hasText && !p.prayer && !tray ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.quickRow}>
          {p.quick.map((q) => (
            <Pressable
              key={q.label}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                p.onQuick(q);
              }}
              style={({ pressed }) => [styles.quick, { backgroundColor: colors.card, borderColor: colors.border, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
            >
              <Text style={[styles.quickText, { color: colors.text }]} maxFontSizeMultiplier={1.4}>
                {q.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {tray ? (
        <Animated.View style={[styles.tray, trayStyle]}>
          <Tile
            icon="book-outline"
            label={id ? 'Kirim ayat' : 'Send a verse'}
            hint={id ? 'Cari dari semua versi' : 'Search every version'}
            onPress={() => {
              setTray(false);
              p.onVerse();
            }}
          />
          <Tile
            icon="flame-outline"
            label={id ? 'Minta doa' : 'Ask for prayer'}
            hint={id ? 'Temanmu bisa ketuk "Aku doakan"' : 'They can tap "I\'ll pray"'}
            onPress={() => {
              setTray(false);
              p.onPrayer(true);
            }}
          />
        </Animated.View>
      ) : null}

      {p.reply ? (
        <View style={[styles.context, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <Ionicons name="arrow-undo" size={16} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.contextName, { color: colors.primary }]} numberOfLines={1}>
              {id ? `Membalas ${p.reply.name}` : `Replying to ${p.reply.name}`}
            </Text>
            <Text style={[styles.contextText, { color: colors.muted }]} numberOfLines={1}>
              {p.reply.text}
            </Text>
          </View>
          <Pressable onPress={p.onCancelReply} hitSlop={10} accessibilityLabel={id ? 'Batal membalas' : 'Cancel reply'}>
            <Ionicons name="close" size={18} color={colors.muted} />
          </Pressable>
        </View>
      ) : null}

      {p.prayer ? (
        <View style={[styles.context, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
          <Ionicons name="flame" size={16} color={colors.primary} />
          <Text style={[styles.contextName, { color: colors.primary, flex: 1 }]}>{id ? 'Permintaan doa' : 'Prayer request'}</Text>
          <Pressable onPress={() => p.onPrayer(false)} hitSlop={10} accessibilityLabel={id ? 'Batal' : 'Cancel'}>
            <Ionicons name="close" size={18} color={colors.primary} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.row}>
        <Pressable
          onPress={() => setTray((x) => !x)}
          style={[styles.round, { backgroundColor: tray ? colors.primarySoft : colors.surface }]}
          accessibilityRole="button"
          accessibilityLabel={id ? 'Lampiran' : 'Attach'}
          accessibilityState={{ expanded: tray }}
        >
          <Animated.View style={plusStyle}>
            <Ionicons name="add" size={24} color={tray ? colors.primary : colors.text} />
          </Animated.View>
        </Pressable>
        <View style={[styles.field, { backgroundColor: colors.card, borderColor: p.prayer ? colors.primary : colors.border }]}>
          <TextInput
            value={p.value}
            onChangeText={p.onChange}
            placeholder={p.prayer ? (id ? 'Apa yang bisa didoakan?' : 'What can they pray for?') : id ? 'Tulis pesan…' : 'Write a message…'}
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text }]}
            multiline
            maxLength={2000}
            onFocus={() => setTray(false)}
          />
        </View>
        <Pressable onPress={send} disabled={!hasText} accessibilityRole="button" accessibilityLabel={id ? 'Kirim' : 'Send'} hitSlop={6}>
          <Animated.View style={[styles.round, styles.send, { backgroundColor: hasText ? colors.primary : colors.surface }, sendWrap]}>
            <Animated.View style={arrow}>
              <Ionicons name={p.prayer ? 'flame' : 'arrow-up'} size={22} color={hasText ? colors.onPrimary : colors.muted} />
            </Animated.View>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

function Tile({ icon, label, hint, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; hint: string; onPress: () => void }) {
  const { colors } = useSettings();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { backgroundColor: colors.card, borderColor: colors.border, transform: [{ translateY: pressed ? 2 : 0 }] }]}
      accessibilityRole="button"
    >
      <View style={[styles.tileIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={[styles.tileLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.tileHint, { color: colors.muted }]} numberOfLines={2}>
        {hint}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: StyleSheet.hairlineWidth * 2, paddingTop: 8, paddingHorizontal: 10, gap: 8 },
  quickRow: { gap: 8, paddingHorizontal: 2 },
  quick: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  quickText: { fontFamily: UI_FONT.semibold, fontSize: 14 },
  tray: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 12, gap: 4 },
  tileIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  tileLabel: { fontFamily: UI_FONT.bold, fontSize: 15 },
  tileHint: { fontFamily: UI_FONT.regular, fontSize: 12.5, lineHeight: 17 },
  context: { flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 3, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  contextName: { fontFamily: UI_FONT.bold, fontSize: 13 },
  contextText: { fontFamily: UI_FONT.regular, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  send: { overflow: 'hidden' },
  field: { flex: 1, borderRadius: 22, borderWidth: 1, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  input: { fontFamily: UI_FONT.regular, fontSize: 15.5, maxHeight: 120, paddingVertical: 10 },
});
