import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from './Text';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { timing } from '../lib/motion';
import { FadeInView } from './FadeInView';
import { Surface } from './Surface';
import { useTabBarSpace } from './TabBar';
import { PressableScale } from './PressableScale';
import Ionicons from '@expo/vector-icons/Ionicons';
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
  const tabSpace = useTabBarSpace();
  const underlineX = useSharedValue(0);

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

  useEffect(() => {
    underlineX.value = withTiming(tab === 'liked' ? 0 : width / 2, timing());
  }, [tab, width, underlineX]);
  const underline = useAnimatedStyle(() => ({ transform: [{ translateX: underlineX.value }] }));

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
        <View style={[styles.stats, isMe && styles.statsBesideGear]}>
          <Stat n={isMe ? engagement.likedOrder.length : otherLists.liked.length} label={t('liked')} color={colors.text} muted={colors.muted} />
          <Stat n={counts.followers} label={t('followers')} color={colors.text} muted={colors.muted} />
          <Stat n={counts.following} label={t('following')} color={colors.text} muted={colors.muted} />
        </View>
        {isMe ? (
          <PressableScale onPress={() => router.push('/settings')} style={{ position: 'absolute', right: 12, top: 0 }} accessibilityRole="button" accessibilityLabel={t('settings')}>
            <Surface radius={22} style={styles.roundBtn}>
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </Surface>
          </PressableScale>
        ) : null}
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{profile?.display_name}</Text>
        <Text style={[styles.username, { color: colors.muted }]} numberOfLines={1}>
          @{profile?.username}
        </Text>
        {profile?.bio ? <Text style={[styles.bio, { color: colors.text }]}>{profile.bio}</Text> : null}
      </View>

      {isMe ? (
        <>
          <View style={styles.buttons}>
            <Btn label={t('editProfile')} onPress={() => router.push('/edit-profile')} colors={colors} />
          </View>
          {moods.length ? (
            <Surface radius={20} style={styles.moodBox}>
              <Text style={[styles.moodTitle, { color: colors.muted }]}>{t('moodHistory')}</Text>
              <View style={styles.moodRow}>
                {[...moods].reverse().map((m) => (
                  <View key={m.day} style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 22 }}>{MOOD_MAP[m.mood]?.emoji}</Text>
                    <Text style={[styles.moodDay, { color: colors.muted }]}>{m.day.slice(8)}</Text>
                  </View>
                ))}
              </View>
            </Surface>
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
          <PressableScale onPress={more} accessibilityRole="button" accessibilityLabel="more">
            <Surface radius={14} style={styles.moreBtn}>
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
            </Surface>
          </PressableScale>
        </View>
      )}

      <View style={[styles.tabs, { borderColor: colors.border }]}>
        <Animated.View style={[styles.underline, { width: width / 2, backgroundColor: colors.primary }, underline]} />
        {(['liked', 'saved'] as const).map((k) => (
          <Pressable key={k} onPress={() => setTab(k)} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: tab === k }}>
            <Ionicons name={k === 'liked' ? (tab === k ? 'heart' : 'heart-outline') : tab === k ? 'bookmark' : 'bookmark-outline'} size={22} color={tab === k ? colors.text : colors.muted} />
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
    <FlatList
      key={tab}
      data={data}
      numColumns={3}
      keyExtractor={(id) => id}
      ListHeaderComponent={header}
      columnWrapperStyle={{ gap: 2 }}
      contentContainerStyle={{ gap: 2, paddingBottom: tabSpace + 20 }}
      ListEmptyComponent={<Text style={[styles.empty, { color: colors.muted }]}>{tab === 'liked' ? t('emptyLiked') : t('emptySaved')}</Text>}
      renderItem={({ item }) => {
        const v = VERSE_MAP[item];
        const cat = CATEGORY_MAP[v.categories[0]];
        const s = dark ? cat.dark : cat.light;
        const p = passageText(v, translation);
        return (
          <FadeInView distance={0}>
          <PressableScale scaleTo={0.95} onPress={() => router.push({ pathname: '/post/[id]', params: { id: v.id } })}>
            <View style={[{ width: cell, height: cell * 1.33, padding: 8, justifyContent: 'space-between' }, { backgroundColor: s.paper }]}>
              <Text style={{ color: s.text, fontFamily: 'Lora_500Medium_Italic', fontSize: 11, lineHeight: 15 }} numberOfLines={6} maxFontSizeMultiplier={1.2}>
                {p.body}
              </Text>
              <Text style={{ color: s.text, fontFamily: UI_FONT.bold, fontSize: 10 }} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {p.title}
              </Text>
            </View>
          </PressableScale>
          </FadeInView>
        );
      }}
    />
    </View>
  );
}

function Stat({ n, label, color, muted }: { n: number; label: string; color: string; muted: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
      <Text style={{ color, fontFamily: UI_FONT.bold, fontSize: 18 }} numberOfLines={1} maxFontSizeMultiplier={1.3}>
        {n}
      </Text>
      <Text style={{ color: muted, fontFamily: UI_FONT.regular, fontSize: 12 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </View>
  );
}

function Btn({ label, onPress, primary, colors }: { label: string; onPress: () => void; primary?: boolean; colors: { primary: string; border: string; text: string; card: string } }) {
  return (
    <PressableScale onPress={onPress} haptic style={{ flex: 1 }} accessibilityRole="button">
      <View
        style={[
          styles.btn,
          primary ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1.5 },
        ]}
      >
        <Text style={{ color: primary ? '#fff' : colors.text, fontFamily: UI_FONT.bold, fontSize: 14 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, gap: 16 },
  stats: { flexDirection: 'row', flex: 1, justifyContent: 'space-around', gap: 4 },
  /** keeps the counts clear of the settings button at the top right */
  statsBesideGear: { paddingRight: 44 },
  info: { paddingHorizontal: 16, paddingTop: 10, gap: 2 },
  name: { fontFamily: UI_FONT.bold, fontSize: 17 },
  username: { fontFamily: UI_FONT.regular, fontSize: 13 },
  bio: { fontFamily: UI_FONT.regular, fontSize: 14, marginTop: 4, lineHeight: 20 },
  buttons: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, alignItems: 'center' },
  btn: { alignItems: 'center', justifyContent: 'center', minHeight: 44, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  moreBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  roundBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  moodBox: { marginHorizontal: 16, marginTop: 12, padding: 12, gap: 8 },
  underline: { position: 'absolute', bottom: 0, left: 0, height: 2.5, borderRadius: 2 },
  moodTitle: { fontFamily: UI_FONT.semibold, fontSize: 12 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodDay: { fontFamily: UI_FONT.regular, fontSize: 10 },
  tabs: { flexDirection: 'row', marginTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  empty: { textAlign: 'center', padding: 30, fontFamily: UI_FONT.regular },
});
