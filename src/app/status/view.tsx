import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { VerseCard } from '../../components/VerseCard';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { UI_FONT } from '../../lib/fonts';
import { timeAgo } from '../../lib/i18n';
import { useSettings } from '../../lib/settings';
import { VERSE_MAP } from '../../lib/verses';

const DURATION = 7000;

export default function ViewStatus() {
  const { user } = useLocalSearchParams<{ user: string }>();
  const { t, translation, lang, dark } = useSettings();
  const { userId: me } = useAuth();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<api.Status[]>([]);
  const [owner, setOwner] = useState<api.Profile | null>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    api.getProfile(user).then(setOwner).catch(() => {});
    api
      .activeStatuses()
      .then((all) => setItems(all.filter((s) => s.user_id === user && VERSE_MAP[s.verse_id])))
      .catch(() => {});
  }, [user]);

  const current = items[i];

  useEffect(() => {
    if (!current) return;
    if (me && current.user_id !== me) api.markStatusViewed(current.id, me);
    const h = setTimeout(() => (i + 1 < items.length ? setI(i + 1) : router.back()), DURATION);
    return () => clearTimeout(h);
  }, [current, i, items.length, me]);

  if (!current) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  const remove = () =>
    Alert.alert(t('delete'), undefined, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => api.deleteStatus(current.id).then(() => router.back()) },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <VerseCard
        verse={VERSE_MAP[current.verse_id]}
        width={width}
        height={height}
        translation={translation}
        lang={lang}
        dark={dark}
        variant={current.style_variant}
        bottomInset={current.note ? 90 : 20}
      />
      {/* tap zones: left = back, right = next */}
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setI(Math.max(0, i - 1))} />
          <Pressable style={{ flex: 2 }} onPress={() => (i + 1 < items.length ? setI(i + 1) : router.back())} />
        </View>
      </View>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.bars}>
          {items.map((s, k) => (
            <View key={s.id} style={[styles.bar, { backgroundColor: k <= i ? '#fff' : '#ffffff55' }]} />
          ))}
        </View>
        <View style={styles.head}>
          <Avatar profile={owner} size={34} />
          <Text style={styles.name}>{owner?.display_name}</Text>
          <Text style={styles.time}>{timeAgo(current.created_at, lang)}</Text>
          <View style={{ flex: 1 }} />
          {current.user_id === me ? (
            <Pressable onPress={remove} hitSlop={10}>
              <Text style={styles.icon}>🗑</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => me && api.report(me, 'status', String(current.id)).then(() => Alert.alert('Selah', t('reported')))} hitSlop={10}>
              <Text style={styles.icon}>⚑</Text>
            </Pressable>
          )}
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.icon}>✕</Text>
          </Pressable>
        </View>
      </View>
      {current.note ? (
        <View style={[styles.note, { bottom: insets.bottom + 40 }]}>
          <Text style={styles.noteText}>{current.note}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 10, gap: 10 },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 3, borderRadius: 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0004', borderRadius: 999, padding: 4, paddingRight: 12 },
  name: { color: '#fff', fontFamily: UI_FONT.bold },
  time: { color: '#fffb', fontFamily: UI_FONT.regular, fontSize: 12 },
  icon: { color: '#fff', fontSize: 18, paddingHorizontal: 6 },
  note: { position: 'absolute', left: 20, right: 20, backgroundColor: '#000a', borderRadius: 14, padding: 14 },
  noteText: { color: '#fff', fontFamily: UI_FONT.semibold, fontSize: 15, textAlign: 'center' },
});
