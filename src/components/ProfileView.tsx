import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as api from '../lib/api';
import { useAuth } from '../lib/auth';
import { CATEGORY_MAP } from '../lib/categories';
import { useEngagement } from '../lib/engagement';
import { UI_FONT } from '../lib/fonts';
import { MOOD_MAP } from '../lib/moods';
import { useSettings } from '../lib/settings';
import { passageText, VERSE_MAP } from '../lib/verses';
import { Avatar } from './Avatar';

export function ProfileView({ userId: targetId, topInset = 0 }: { userId: string; topInset?: number }) {
  const { t, colors, dark, translation } = useSettings();
  const { userId: me } = useAuth();
  const engagement = useEngagement();
  const { width } = useWindowDimensions();
  const isMe = targetId === me;

  const [profile, setProfile] = useState<api.Profile | null>(null);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [following, setFollowing] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [tab, setTab] = useState<'liked' | 'saved'>('liked');
  const [otherLists, setOtherLists] = useState<{ liked: string[]; saved: string[] }>({ liked: [], saved: [] });
  const [moods, setMoods] = useState<{ day: string; mood: string }[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const [p, c] = await Promise.all([api.getProfile(targetId), api.followCounts(targetId)]);
        if (!alive) return;
        setProfile(p);
        setCounts(c);
        if (isMe) {
          setMoods(await api.moodHistory(targetId, 7));
        } else if (me) {
          const [f, b, l, s] = await Promise.all([
            api.isFollowing(me, targetId),
            api.isBlocked(me, targetId),
            api.myVerseIds('likes', targetId),
            api.myVerseIds('saves', targetId),
          ]);
          if (!alive) return;
          setFollowing(f);
          setBlocked(b);
          setOtherLists({ liked: l, saved: s });
        }
      })().catch(() => {});
      return () => {
        alive = false;
      };
    }, [targetId, isMe, me]),
  );

  const ids = isMe ? (tab === 'liked' ? engagement.likedOrder : engagement.savedOrder) : otherLists[tab];
  const data = ids.filter((id) => VERSE_MAP[id]);
  const cell = (width - 4) / 3;

  const toggleFollow = async () => {
    if (!me) return;
    const on = !following;
    setFollowing(on);
    setCounts((c) => ({ ...c, followers: c.followers + (on ? 1 : -1) }));
    await api.setFollow(me, targetId, on).catch(() => setFollowing(!on));
  };

  const more = () => {
    if (!me) return;
    Alert.alert(profile?.display_name ?? 'Selah', undefined, [
      { text: t('report'), onPress: () => api.report(me, 'user', targetId).then(() => Alert.alert('Selah', t('reported'))) },
      {
        text: blocked ? t('unblock') : t('block'),
        style: 'destructive',
        onPress: () =>
          api.setBlock(me, targetId, !blocked).then(() => {
            setBlocked(!blocked);
            if (!blocked) setFollowing(false);
          }),
      },
      { text: t('cancel'), style: 'cancel' },
    ]);
  };

  const header = (
    <View style={{ paddingTop: topInset }}>
      <View style={styles.top}>
        <Avatar profile={profile} size={84} />
        <View style={styles.stats}>
          <Stat n={isMe ? engagement.likedOrder.length : otherLists.liked.length} label={t('liked')} color={colors.text} muted={colors.muted} />
          <Stat n={counts.followers} label={t('followers')} color={colors.text} muted={colors.muted} />
          <Stat n={counts.following} label={t('following')} color={colors.text} muted={colors.muted} />
        </View>
        {isMe ? (
          <Pressable onPress={() => router.push('/settings')} hitSlop={10} style={{ position: 'absolute', right: 16, top: 0 }}>
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{profile?.display_name}</Text>
        <Text style={[styles.username, { color: colors.muted }]}>@{profile?.username}</Text>
        {profile?.bio ? <Text style={[styles.bio, { color: colors.text }]}>{profile.bio}</Text> : null}
      </View>

      {isMe ? (
        <>
          <View style={styles.buttons}>
            <Btn label={t('editProfile')} onPress={() => router.push('/edit-profile')} colors={colors} />
          </View>
          {moods.length ? (
            <View style={[styles.moodBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.moodTitle, { color: colors.muted }]}>{t('moodHistory')}</Text>
              <View style={styles.moodRow}>
                {[...moods].reverse().map((m) => (
                  <View key={m.day} style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 22 }}>{MOOD_MAP[m.mood]?.emoji}</Text>
                    <Text style={[styles.moodDay, { color: colors.muted }]}>{m.day.slice(8)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.buttons}>
          {!blocked ? (
            <>
              <Btn label={following ? t('following') : t('follow')} primary={!following} onPress={toggleFollow} colors={colors} />
              <Btn label={t('message')} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: targetId } })} colors={colors} />
            </>
          ) : (
            <Text style={{ color: colors.danger, fontFamily: UI_FONT.semibold, flex: 1 }}>{t('block')} ✓</Text>
          )}
          <Pressable onPress={more} style={[styles.moreBtn, { borderColor: colors.border }]}>
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
          </Pressable>
        </View>
      )}

      <View style={[styles.tabs, { borderColor: colors.border }]}>
        {(['liked', 'saved'] as const).map((k) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[styles.tab, tab === k && { borderBottomColor: colors.text }]}>
            <Ionicons name={k === 'liked' ? (tab === k ? 'heart' : 'heart-outline') : tab === k ? 'bookmark' : 'bookmark-outline'} size={22} color={tab === k ? colors.text : colors.muted} />
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={data}
      numColumns={3}
      keyExtractor={(id) => id}
      ListHeaderComponent={header}
      columnWrapperStyle={{ gap: 2 }}
      contentContainerStyle={{ gap: 2, paddingBottom: 40 }}
      ListEmptyComponent={<Text style={[styles.empty, { color: colors.muted }]}>{tab === 'liked' ? t('emptyLiked') : t('emptySaved')}</Text>}
      renderItem={({ item }) => {
        const v = VERSE_MAP[item];
        const cat = CATEGORY_MAP[v.categories[0]];
        const s = dark ? cat.dark : cat.light;
        const p = passageText(v, translation);
        return (
          <Pressable onPress={() => router.push({ pathname: '/post/[id]', params: { id: v.id } })}>
            <LinearGradient colors={s.gradient} style={{ width: cell, height: cell * 1.33, padding: 8, justifyContent: 'space-between' }}>
              <Text style={{ color: s.text, fontFamily: 'Lora_500Medium_Italic', fontSize: 11, lineHeight: 15 }} numberOfLines={6}>
                {p.body}
              </Text>
              <Text style={{ color: s.text, fontFamily: UI_FONT.bold, fontSize: 10 }} numberOfLines={1}>
                {cat.emoji} {p.title}
              </Text>
            </LinearGradient>
          </Pressable>
        );
      }}
    />
  );
}

function Stat({ n, label, color, muted }: { n: number; label: string; color: string; muted: string }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 64 }}>
      <Text style={{ color, fontFamily: UI_FONT.bold, fontSize: 18 }}>{n}</Text>
      <Text style={{ color: muted, fontFamily: UI_FONT.regular, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function Btn({ label, onPress, primary, colors }: { label: string; onPress: () => void; primary?: boolean; colors: { primary: string; border: string; text: string; card: string } }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.btn, primary ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
    >
      <Text style={{ color: primary ? '#fff' : colors.text, fontFamily: UI_FONT.bold, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, gap: 16 },
  stats: { flexDirection: 'row', flex: 1, justifyContent: 'space-around' },
  info: { paddingHorizontal: 16, paddingTop: 10, gap: 2 },
  name: { fontFamily: UI_FONT.bold, fontSize: 17 },
  username: { fontFamily: UI_FONT.regular, fontSize: 13 },
  bio: { fontFamily: UI_FONT.regular, fontSize: 14, marginTop: 4, lineHeight: 20 },
  buttons: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, alignItems: 'center' },
  btn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  moreBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  moodBox: { marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  moodTitle: { fontFamily: UI_FONT.semibold, fontSize: 12 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodDay: { fontFamily: UI_FONT.regular, fontSize: 10 },
  tabs: { flexDirection: 'row', marginTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  empty: { textAlign: 'center', padding: 30, fontFamily: UI_FONT.regular },
});
