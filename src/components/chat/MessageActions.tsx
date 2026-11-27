import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { displayBody, REACTIONS, type ChatMessage } from '../../lib/chat';
import { UI_FONT } from '../../lib/fonts';
import { DURATION, enter, timing } from '../../lib/motion';
import { useSettings } from '../../lib/settings';
import { VERSE_MAP } from '../../lib/verses';

type Props = {
  message: ChatMessage | null;
  mine: boolean;
  myReactions: Set<string>;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onReport: () => void;
};

/**
 * Hold a message: a sheet rises with six reactions on top and the actions under them.
 * The emoji arrive one after another (40ms apart) so the row reads as offered, not dumped.
 */
export function MessageActions({ message, mine, myReactions, onClose, onReact, onReply, onReport }: Props) {
  const { colors, lang } = useSettings();
  const insets = useSafeAreaInsets();
  const id = lang === 'id';
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = message ? withTiming(1, enter(DURATION.move)) : 0;
  }, [message, p]);
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - p.value) * 40 }], opacity: p.value }));
  const scrim = useAnimatedStyle(() => ({ opacity: p.value }));

  const preview = message ? (message.verse_id ? `📖 ${VERSE_MAP[message.verse_id]?.ref ?? ''}` : displayBody(message)) : '';

  return (
    <Modal visible={!!message} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,16,12,0.45)' }, scrim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={id ? 'Tutup' : 'Close'} />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) + 8 }, sheet]}
      >
        <View style={[styles.grab, { backgroundColor: colors.border }]} />
        {preview ? (
          <Text style={[styles.preview, { color: colors.muted }]} numberOfLines={2}>
            {preview}
          </Text>
        ) : null}
        <View style={[styles.reactRow, { backgroundColor: colors.surface }]}>
          {REACTIONS.map((e, i) => (
            <Emoji key={e} emoji={e} index={i} open={!!message} active={myReactions.has(e)} onPress={() => onReact(e)} />
          ))}
        </View>
        <Action icon="arrow-undo-outline" label={id ? 'Balas' : 'Reply'} onPress={onReply} />
        {!mine ? <Action icon="flag-outline" label={id ? 'Laporkan pesan' : 'Report message'} onPress={onReport} danger /> : null}
      </Animated.View>
    </Modal>
  );
}

function Emoji({ emoji, index, open, active, onPress }: { emoji: string; index: number; open: boolean; active: boolean; onPress: () => void }) {
  const { colors } = useSettings();
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = open ? withDelay(60 + index * 40, withTiming(1, enter(DURATION.move))) : 0;
  }, [open, index, v]);
  const press = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * 12 }, { scale: (0.7 + v.value * 0.3) * press.value }] }));
  return (
    <Pressable
      onPressIn={() => {
        press.value = withTiming(0.86, timing(DURATION.press));
        Haptics.selectionAsync().catch(() => {});
      }}
      onPressOut={() => (press.value = withTiming(1, timing(DURATION.release)))}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={emoji}
      accessibilityState={{ selected: active }}
      hitSlop={4}
    >
      <Animated.View style={[styles.emojiWrap, active && { backgroundColor: colors.primarySoft }, a]}>
        <Text style={styles.emoji} maxFontSizeMultiplier={1.3}>
          {emoji}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function Action({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  const { colors } = useSettings();
  const tone = danger ? colors.danger : colors.text;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.surface }]} accessibilityRole="button">
      <Ionicons name={icon} size={20} color={tone} />
      <Text style={[styles.actionText, { color: tone }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 6,
  },
  grab: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, marginBottom: 6 },
  preview: { fontFamily: UI_FONT.regular, fontSize: 13.5, lineHeight: 19, paddingHorizontal: 4, marginBottom: 4 },
  reactRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', borderRadius: 22, paddingHorizontal: 8, paddingVertical: 6, marginBottom: 6 },
  emojiWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 28 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 50, paddingHorizontal: 8, borderRadius: 14 },
  actionText: { fontFamily: UI_FONT.semibold, fontSize: 16 },
});
