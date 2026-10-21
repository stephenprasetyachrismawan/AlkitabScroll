import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aurora } from '../../components/Aurora';
import { Avatar } from '../../components/Avatar';
import { FadeInView } from '../../components/FadeInView';
import { Glass } from '../../components/Glass';
import { useTabBarSpace } from '../../components/GlassTabBar';
import { PressableScale } from '../../components/PressableScale';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { CATEGORIES, CATEGORY_MAP } from '../../lib/categories';
import { UI_FONT } from '../../lib/fonts';
import { useSettings } from '../../lib/settings';
import { passageText, VERSES, type Verse } from '../../lib/verses';

type Mode = 'people' | 'verses';

export default function Explore() {
  const { t, lang, colors, dark, translation } = useSettings();
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();

  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false); // search panel open
  const [mode, setMode] = useState<Mode>('people');
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

  // Verse search runs locally over the bundled text.
  const verseResults = useMemo(() => {
    if (mode !== 'verses' || term.length < 2) return [];
    const needle = term.toLowerCase();
    return VERSES.filter((v) => {
      const p = passageText(v, translation);
      return p.body.toLowerCase().includes(needle) || p.title.toLowerCase().includes(needle) || v.ref.toLowerCase().includes(needle);
    }).slice(0, 60);
  }, [mode, term, translation]);

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
      <Aurora />
      <View style={styles.searchRow}>
        <Glass dark={dark} radius={20} strength={0.75} style={styles.search}>
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
        </Glass>
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
          ListHeaderComponent={<Text style={[styles.h, { color: colors.text }]}>{t('categories')}</Text>}
          contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: tabSpace }}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item, index }) => {
            const s = dark ? item.dark : item.light;
            return (
              <FadeInView style={{ flex: 1 }} delay={Math.min(index, 10) * 50}>
                <PressableScale
                  scaleTo={0.95}
                  haptic
                  onPress={() => router.push({ pathname: '/category/[key]', params: { key: item.key } })}
                  accessibilityRole="button"
                  accessibilityLabel={item.label[lang]}
                >
                  <LinearGradient colors={s.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
                    <LinearGradient
                      pointerEvents="none"
                      colors={dark ? ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0.7)', 'rgba(255,255,255,0)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0.6, y: 0.6 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={[styles.tileIcon, { backgroundColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.6)' }]}>
                      <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={20} color={s.accent} />
                    </View>
                    <Text style={[styles.tileName, { color: s.text }]}>{item.label[lang]}</Text>
                    <Text style={[styles.tileCount, { color: s.text }]}>
                      {counts[item.key]} {lang === 'id' ? 'ayat' : 'verses'}
                    </Text>
                  </LinearGradient>
                </PressableScale>
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
                  style={[styles.seg, mode === m && { backgroundColor: colors.primary }]}
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
                keyExtractor={(v) => v.id}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={{ paddingBottom: tabSpace, paddingHorizontal: 12, gap: 10 }}
                ListEmptyComponent={<Text style={[styles.empty, { color: colors.muted }]}>{term.length < 2 ? t('typeToSearch') : t('noResults')}</Text>}
                renderItem={({ item }) => <VerseRow verse={item} />}
              />
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function VerseRow({ verse }: { verse: Verse }) {
  const { translation, dark, lang } = useSettings();
  const c = CATEGORY_MAP[verse.categories[0]];
  const s = dark ? c.dark : c.light;
  const p = passageText(verse, translation);
  return (
    <PressableScale scaleTo={0.98} onPress={() => router.push({ pathname: '/post/[id]', params: { id: verse.id } })}>
      <LinearGradient colors={s.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.verseRow}>
        <Text style={{ color: s.text, fontFamily: 'Lora_500Medium_Italic', fontSize: 14, lineHeight: 21 }} numberOfLines={3}>
          {p.body}
        </Text>
        <View style={styles.verseMeta}>
          <Ionicons name={c.icon as keyof typeof Ionicons.glyphMap} size={13} color={s.accent} />
          <Text style={{ color: s.text, fontFamily: UI_FONT.bold, fontSize: 12 }}>
            {p.title} · {c.label[lang]}
          </Text>
        </View>
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, minHeight: 48 },
  searchInput: { flex: 1, fontFamily: UI_FONT.regular, fontSize: 15, paddingVertical: 10 },
  cancel: { paddingVertical: 10 },
  h: { fontFamily: UI_FONT.title, fontSize: 24, marginBottom: 4, marginTop: 6 },
  sub: { fontFamily: UI_FONT.bold, fontSize: 13, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6 },
  tile: { borderRadius: 22, padding: 16, height: 124, justifyContent: 'flex-end', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  tileIcon: { position: 'absolute', top: 14, right: 14, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  tileName: { fontFamily: UI_FONT.bold, fontSize: 16 },
  tileCount: { fontFamily: UI_FONT.regular, fontSize: 12, opacity: 0.7 },
  segRow: { flexDirection: 'row', gap: 8, padding: 12 },
  seg: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, minHeight: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.5)' },
  segText: { fontFamily: UI_FONT.bold, fontSize: 13 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  personMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  personName: { fontFamily: UI_FONT.bold, fontSize: 15 },
  followBtn: { minWidth: 92, minHeight: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  empty: { textAlign: 'center', marginTop: 30, fontFamily: UI_FONT.regular },
  verseRow: { borderRadius: 18, padding: 14, gap: 8, overflow: 'hidden' },
  verseMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
