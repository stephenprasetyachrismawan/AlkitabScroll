import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Aurora } from '../../components/Aurora';
import { useTabBarSpace } from '../../components/GlassTabBar';
import { PressableScale } from '../../components/PressableScale';
import { DURATION, EASE_OUT_EXPO } from '../../lib/motion';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import * as api from '../../lib/api';
import { UI_FONT } from '../../lib/fonts';
import { timeAgo } from '../../lib/i18n';
import { useSettings } from '../../lib/settings';
import { VERSE_MAP } from '../../lib/verses';

export default function Inbox() {
  const { t, colors, lang } = useSettings();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const [rows, setRows] = useState<api.InboxRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      api.inbox().then(setRows).catch(() => {});
    }, []),
  );

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
      <Aurora />
      <Text style={[styles.h, { color: colors.text }]}>{t('messages')}</Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.partner_id}
        contentContainerStyle={{ paddingBottom: tabSpace }}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.muted }]}>{t('noMessages')}</Text>}
        renderItem={({ item, index }) => {
          const preview = item.last_verse_id
            ? `📖 ${VERSE_MAP[item.last_verse_id]?.text.tb.title ?? t('sentVerse')}`
            : item.last_body ?? '';
          return (
            <Animated.View entering={FadeInDown.duration(DURATION.enter).delay(Math.min(index, 8) * 50).easing(EASE_OUT_EXPO)}>
            <PressableScale scaleTo={0.98} style={styles.row} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.partner_id } })}>
              <Avatar profile={item.profile} size={52} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>{item.profile?.display_name ?? '…'}</Text>
                <Text
                  style={[styles.preview, { color: item.unread ? colors.text : colors.muted, fontFamily: item.unread ? UI_FONT.bold : UI_FONT.regular }]}
                  numberOfLines={1}
                >
                  {preview} · {timeAgo(item.last_at, lang)}
                </Text>
              </View>
              {item.unread ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
            </PressableScale>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  h: { fontFamily: UI_FONT.title, fontSize: 24, paddingHorizontal: 16, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  name: { fontFamily: UI_FONT.bold, fontSize: 15 },
  preview: { fontSize: 13, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  empty: { textAlign: 'center', marginTop: 40, fontFamily: UI_FONT.regular },
});
