import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { FadeInView } from '../../components/FadeInView';
import { ChunkyPressable } from '../../components/ChunkyButton';
import { Surface } from '../../components/Surface';
import { useTabBarSpace } from '../../components/TabBar';
import { PressableScale } from '../../components/PressableScale';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { CATEGORIES } from '../../lib/categories';
import { UI_FONT } from '../../lib/fonts';
import { useSettings } from '../../lib/settings';
import { VERSES } from '../../lib/verses';
import { searchVerses, warmVerseSearch } from '../../lib/verseSearch';
import { VerseResultCard } from '../../components/VerseResultCard';

type Mode = 'people' | 'verses';

export default function Explore() {
  const { t, lang, colors, dark, translation } = useSettings();
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();

  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false); // search panel open
  const [mode, setMode] = useState<Mode>('verses');
  const [people, setPeople] = useState<api.Profile[]>([]);
  const [suggested, setSuggested] = useState<api.Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const reqId = useRef(0);

  const term = q.trim();

  // People search: debounced, and stale responses are ignored.
  useEffect(() => {
    if (mode !== 'people' || term.length < 2) return;
    const id = ++reqId.current;
    const h = setTimeout(() => {
      setLoading(true);
      api
        .searchProfiles(term)
        .then((r) => {
          if (id === reqId.current) setPeople(r.filter((p) => p.id !== userId));
        })
        .catch(() => {
          if (id === reqId.current) setPeople([]);
        })
        .finally(() => {
          if (id === reqId.current) setLoading(false);
        });
    }, 300);
    return () => clearTimeout(h);
  }, [term, mode, userId]);

  // Suggestions + who I follow, loaded once the panel opens.
  useEffect(() => {
    if (!searching || !userId) return;
    let alive = true;
    Promise.all([api.suggestedProfiles(userId), api.followingIds(userId)])
      .then(([s, f]) => {
        if (!alive) return;
        setSuggested(s);
        setFollowing(new Set(f));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [searching, userId]);

  // Verse search: hybrid words + meaning engine over all three translations (lib/search.ts).
  // Runs on a deferred copy of the query so typing never waits on it.
  useEffect(() => {
    if (searching) warmVerseSearch();
  }, [searching]);
  const deferredTerm = useDeferredValue(term);
  const verseResult = useMemo(
    () => (mode === 'verses' && deferredTerm.length >= 2 ? searchVerses(deferredTerm, 'search', translation, 60) : null),
    [mode, deferredTerm, translation],
  );
  const verseResults = verseResult?.hits ?? [];

  const toggleFollow = async (p: api.Profile) => {
    if (!userId) return;
    const on = !following.has(p.id);
    setFollowing((s) => {
      const n = new Set(s);
      if (on) n.add(p.id);
      else n.delete(p.id);
      return n;
    });
    api.setFollow(userId, p.id, on).catch(() => {
      setFollowing((s) => {
        const n = new Set(s);
        if (on) n.delete(p.id);
        else n.add(p.id);
        return n;
      });
    });
  };

  const close = () => {
    Keyboard.dismiss();
    setQ('');
    setSearching(false);
  };

  const counts = useMemo(() => Object.fromEntries(CATEGORIES.map((c) => [c.key, VERSES.filter((v) => v.categories.includes(c.key)).length])), []);

  const showPeople = term.length >= 2 ? people : suggested;

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
      <View style={styles.searchRow}>
        <Surface radius={20} style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            onFocus={() => setSearching(true)}
            placeholder={mode === 'people' ? t('searchUsers') : t('searchVerses')}
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.text }]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityLabel="clear">
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </Surface>
        {searching ? (
          <Pressable onPress={close} hitSlop={8} style={styles.cancel}>
            <Text style={{ color: colors.primary, fontFamily: UI_FONT.bold }}>{t('cancel')}</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ flex: 1 }}>
        {/* Categories stay mounted underneath; the search panel covers them. */}
        <FlatList
          data={CATEGORIES}
          numColumns={2}
          keyExtractor={(c) => c.key}
          ListHeaderComponent={
            <View style={{ gap: 12 }}>
              <CurhatCard />
              <Text style={[styles.h, { color: colors.text }]}>{t('categories')}</Text>
            </View>
          }
          contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: tabSpace }}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item, index }) => {
            const s = dark ? item.dark : item.light;
            return (
              <FadeInView style={{ flex: 1 }} delay={Math.min(index, 10) * 50}>
                <ChunkyPressable
                  face={s.paper}
                  ledge={s.well}
                  faceStyle={styles.tile}
                  onPress={() => router.push({ pathname: '/category/[key]', params: { key: item.key } })}
                  accessibilityLabel={item.label[lang]}
                >
                  <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={22} color={s.accent} style={styles.tileIcon} />
                  <Text style={[styles.tileName, { color: s.text }]}>{item.label[lang]}</Text>
                  <Text style={[styles.tileCount, { color: s.text }]}>
                    {counts[item.key]} {lang === 'id' ? 'ayat' : 'verses'}
                  </Text>
                </ChunkyPressable>
              </FadeInView>
            );
          }}
        />

        {searching ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
            <View style={styles.segRow}>
              {(['people', 'verses'] as const).map((m) => (
                <PressableScale
                  key={m}
                  onPress={() => setMode(m)}
                  style={[styles.seg, { borderColor: mode === m ? colors.primary : colors.border, backgroundColor: mode === m ? colors.primary : colors.card }]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: mode === m }}
                >
                  <Ionicons name={m === 'people' ? 'people-outline' : 'book-outline'} size={16} color={mode === m ? '#fff' : colors.text} />
                  <Text style={[styles.segText, { color: mode === m ? '#fff' : colors.text }]}>{m === 'people' ? t('people') : t('versesTab')}</Text>
                </PressableScale>
              ))}
            </View>

            {mode === 'people' ? (
              <FlatList
                data={showPeople}
                keyExtractor={(p) => p.id}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={{ paddingBottom: tabSpace }}
                ListHeaderComponent={
                  term.length < 2 && suggested.length ? <Text style={[styles.sub, { color: colors.muted }]}>{t('suggested')}</Text> : undefined
                }
                ListEmptyComponent={
                  loading ? (
                    <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
                  ) : (
                    <Text style={[styles.empty, { color: colors.muted }]}>{term.length < 2 ? t('typeToSearch') : t('noResults')}</Text>
                  )
                }
                renderItem={({ item }) => {
                  const on = following.has(item.id);
                  return (
                    <View style={styles.person}>
                      <Pressable style={styles.personMain} onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.id } })}>
                        <Avatar profile={item} size={46} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.personName, { color: colors.text }]} numberOfLines={1}>
                            {item.display_name}
                          </Text>
                          <Text style={{ color: colors.muted, fontFamily: UI_FONT.regular }} numberOfLines={1}>
                            @{item.username}
                          </Text>
                        </View>
                      </Pressable>
                      <PressableScale
                        onPress={() => toggleFollow(item)}
                        haptic
                        style={[styles.followBtn, on ? { borderColor: colors.border, borderWidth: 1 } : { backgroundColor: colors.primary }]}
                      >
                        <Text style={{ color: on ? colors.text : '#fff', fontFamily: UI_FONT.bold, fontSize: 13 }}>{on ? t('following') : t('follow')}</Text>
                      </PressableScale>
                    </View>
                  );
                }}
              />
            ) : (
              <FlatList
                data={verseResults}
                keyExtractor={(h) => h.id}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={{ paddingBottom: tabSpace, paddingHorizontal: 12, gap: 10 }}
                ListHeaderComponent={
                  verseResult?.corrected.length ? (
                    <Text style={[styles.sub, { color: colors.muted, paddingHorizontal: 4 }]}>
                      {lang === 'id' ? 'Menampilkan hasil untuk ' : 'Showing results for '}
                      <Text style={{ color: colors.text }}>{verseResult.corrected.map((c) => c[1]).join(', ')}</Text>
                    </Text>
                  ) : undefined
                }
                ListEmptyComponent={<Text style={[styles.empty, { color: colors.muted }]}>{term.length < 2 ? t('searchHint') : t('noResults')}</Text>}
                ListFooterComponent={term.length >= 2 ? <CurhatNudge query={term} /> : undefined}
                renderItem={({ item }) => <VerseResultCard hit={item} lines={3} />}
              />
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Under search results: a feeling, not a verse, belongs in Curhat. */
function CurhatNudge({ query }: { query: string }) {
  const { colors, t } = useSettings();
  return (
    <PressableScale onPress={() => router.push({ pathname: '/curhat', params: { text: query } })} style={styles.nudge} accessibilityRole="button">
      <Ionicons name="create-outline" size={16} color={colors.primary} />
      <Text style={{ color: colors.primary, fontFamily: UI_FONT.bold, fontSize: 14 }}>{t('curhatNudge')}</Text>
    </PressableScale>
  );
}

/** Top of Explore: the way into Curhat. */
function CurhatCard() {
  const { colors, t } = useSettings();
  return (
    <ChunkyPressable
      face={colors.card}
      ledge={colors.border}
      faceStyle={styles.curhat}
      onPress={() => router.push('/curhat')}
      accessibilityLabel={t('curhatTitle')}
    >
      <View style={[styles.curhatIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name="create-outline" size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.curhatTitle, { color: colors.text }]}>{t('curhatTitle')}</Text>
        <Text style={{ color: colors.muted, fontFamily: UI_FONT.regular, fontSize: 14, lineHeight: 20 }}>{t('curhatCardBody')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </ChunkyPressable>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, minHeight: 48 },
  searchInput: { flex: 1, fontFamily: UI_FONT.regular, fontSize: 15, paddingVertical: 10 },
  cancel: { paddingVertical: 10 },
  h: { fontFamily: UI_FONT.title, fontSize: 28, letterSpacing: -0.6, marginBottom: 4, marginTop: 6 },
  sub: { fontFamily: UI_FONT.bold, fontSize: 13, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6 },
  tile: { padding: 16, height: 116, justifyContent: 'flex-end' },
  tileIcon: { position: 'absolute', top: 14, left: 16 },
  tileName: { fontFamily: UI_FONT.bold, fontSize: 16 },
  tileCount: { fontFamily: UI_FONT.regular, fontSize: 12, opacity: 0.7 },
  segRow: { flexDirection: 'row', gap: 8, padding: 12 },
  seg: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, minHeight: 40, borderRadius: 20, borderWidth: 1.5 },
  segText: { fontFamily: UI_FONT.bold, fontSize: 13 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  personMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  personName: { fontFamily: UI_FONT.bold, fontSize: 15 },
  followBtn: { minWidth: 92, minHeight: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  empty: { textAlign: 'center', marginTop: 30, fontFamily: UI_FONT.regular },
  nudge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, marginTop: 6 },
  curhat: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  curhatIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  curhatTitle: { fontFamily: UI_FONT.title, fontSize: 19, letterSpacing: -0.3 },
});
