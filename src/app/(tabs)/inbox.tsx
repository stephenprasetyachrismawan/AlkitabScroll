import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Text } from '../../components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTabBarSpace } from '../../components/TabBar';
import { PressableScale } from '../../components/PressableScale';
import { FadeInView } from '../../components/FadeInView';
import { ChunkyButton } from '../../components/ChunkyButton';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { StreakFlame, useFriendStreaks } from '../../components/FriendStreak';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { kindOf, previewText } from '../../lib/chat';
import { UI_FONT } from '../../lib/fonts';
import { timeAgo } from '../../lib/i18n';
import { useSettings } from '../../lib/settings';
import { supabase } from '../../lib/supabase';
import { VERSE_MAP } from '../../lib/verses';

export default function Inbox() {
  const { t, colors, lang } = useSettings();
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const [rows, setRows] = useState<api.InboxRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const streaks = useFriendStreaks(userId);
  const [refreshing, setRefreshing] = useState(false);
  const id = lang === 'id';

  const load = useCallback(
    () =>
      api
        .inbox()
        .then(setRows)
        .catch(() => {})
        .finally(() => setLoaded(true)),
    [],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // New messages move their conversation to the top while the inbox is open.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`inbox-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  const unreadTotal = rows.reduce((n, r) => n + (r.unread ? 1 : 0), 0);

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
      <View style={styles.headRow}>
        <Text style={[styles.h, { color: colors.text }]}>{t('messages')}</Text>
        {unreadTotal ? (
          <Text style={[styles.headNote, { color: colors.primary }]}>
            {id ? `${unreadTotal} belum dibaca` : `${unreadTotal} unread`}
          </Text>
        ) : null}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.partner_id}
        contentContainerStyle={{ paddingBottom: tabSpace, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            colors={[colors.primary]}
            onRefresh={() => {
              setRefreshing(true);
              load().finally(() => setRefreshing(false));
            }}
          />
        }
        ListEmptyComponent={
          loaded ? (
            <FadeInView style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="chatbubbles-outline" size={30} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('noMessages')}</Text>
              <Text style={[styles.emptyBody, { color: colors.muted }]}>
                {id
                  ? 'Kirim ayat ke teman, saling mendoakan, dan saling menguatkan di sini.'
                  : 'Send a friend a verse, pray for each other and keep each other going here.'}
              </Text>
              <ChunkyButton label={id ? 'Cari teman' : 'Find friends'} icon="people-outline" onPress={() => router.push('/explore')} style={{ alignSelf: 'stretch' }} />
            </FadeInView>
          ) : undefined
        }
        renderItem={({ item, index }) => {
          const kind = kindOf({ body: item.last_body, verse_id: item.last_verse_id, kind: item.last_kind ?? undefined });
          const preview = previewText(
            { body: item.last_body, verse_id: item.last_verse_id, kind: item.last_kind },
            (vid) => VERSE_MAP[vid]?.text.tb.title,
            lang,
          );
          const unread = item.unread > 0;
          return (
            <FadeInView delay={Math.min(index, 8) * 50}>
              <PressableScale
                scaleTo={0.98}
                style={styles.row}
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.partner_id } })}
                accessibilityRole="button"
                accessibilityLabel={`${item.profile?.display_name ?? ''}, ${preview}${unread ? `, ${item.unread} ${id ? 'belum dibaca' : 'unread'}` : ''}`}
              >
                <Avatar profile={item.profile} size={54} ring={unread ? colors.primary : undefined} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.line}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                      {item.profile?.display_name ?? '…'}
                    </Text>
                    <StreakFlame streak={streaks[item.partner_id]} />
                    <Text style={[styles.time, { color: unread ? colors.primary : colors.muted }]}>{timeAgo(item.last_at, lang)}</Text>
                  </View>
                  <View style={styles.line}>
                    {kind === 'prayer' ? <Ionicons name="flame" size={14} color={colors.primary} /> : null}
                    <Text
                      style={[styles.preview, { color: unread ? colors.text : colors.muted, fontFamily: unread ? UI_FONT.bold : UI_FONT.regular }]}
                      numberOfLines={1}
                    >
                      {item.last_mine ? (id ? 'Kamu: ' : 'You: ') : ''}
                      {kind === 'prayer' ? preview.replace(/^🕯️ /, '') : preview}
                    </Text>
                    {unread ? (
                      <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.badgeText, { color: colors.onPrimary }]} maxFontSizeMultiplier={1.3}>
                          {item.unread > 99 ? '99+' : item.unread}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </PressableScale>
            </FadeInView>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  h: { fontFamily: UI_FONT.title, fontSize: 24 },
  headNote: { fontFamily: UI_FONT.bold, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: UI_FONT.bold, fontSize: 15.5, flex: 1 },
  time: { fontFamily: UI_FONT.semibold, fontSize: 12 },
  preview: { fontSize: 13.5, flex: 1 },
  badge: { minWidth: 22, borderRadius: 11, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center' },
  badgeText: { fontFamily: UI_FONT.bold, fontSize: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10, marginTop: 40 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontFamily: UI_FONT.title, fontSize: 20, textAlign: 'center' },
  emptyBody: { fontFamily: UI_FONT.regular, fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 8 },
});
