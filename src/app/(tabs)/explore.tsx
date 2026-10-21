import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { CATEGORIES } from '../../lib/categories';
import { UI_FONT } from '../../lib/fonts';
import { useSettings } from '../../lib/settings';
import { VERSES } from '../../lib/verses';

export default function Explore() {
  const { t, lang, colors, dark } = useSettings();
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<api.Profile[]>([]);

  useEffect(() => {
    if (!q.trim()) return;
    const h = setTimeout(() => {
      api
        .searchProfiles(q)
        .then((r) => setPeople(r.filter((p) => p.id !== userId)))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(h);
  }, [q, userId]);

  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.key, VERSES.filter((v) => v.categories.includes(c.key)).length]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 8 }}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={t('searchUsers')}
        placeholderTextColor={colors.muted}
        style={[styles.search, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
      />
      {q.trim() ? (
        <FlatList
          data={people}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <Pressable style={styles.person} onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.id } })}>
              <Avatar profile={item} size={44} />
              <View>
                <Text style={[styles.personName, { color: colors.text }]}>{item.display_name}</Text>
                <Text style={{ color: colors.muted, fontFamily: UI_FONT.regular }}>@{item.username}</Text>
              </View>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={CATEGORIES}
          numColumns={2}
          keyExtractor={(c) => c.key}
          ListHeaderComponent={<Text style={[styles.h, { color: colors.text }]}>{t('categories')}</Text>}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item }) => {
            const s = dark ? item.dark : item.light;
            return (
              <Pressable style={{ flex: 1 }} onPress={() => router.push({ pathname: '/category/[key]', params: { key: item.key } })}>
                <LinearGradient colors={s.gradient} style={styles.tile}>
                  <Text style={styles.tileEmoji}>{item.emoji}</Text>
                  <Text style={[styles.tileName, { color: s.text }]}>{item.label[lang]}</Text>
                  <Text style={[styles.tileCount, { color: s.text }]}>
                    {counts[item.key]} {lang === 'id' ? 'ayat' : 'verses'}
                  </Text>
                </LinearGradient>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  search: { marginHorizontal: 12, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontFamily: UI_FONT.regular, fontSize: 15 },
  h: { fontFamily: UI_FONT.title, fontSize: 22, marginBottom: 4 },
  tile: { borderRadius: 18, padding: 16, height: 120, justifyContent: 'flex-end' },
  tileEmoji: { fontSize: 28, position: 'absolute', top: 12, right: 14 },
  tileName: { fontFamily: UI_FONT.bold, fontSize: 16 },
  tileCount: { fontFamily: UI_FONT.regular, fontSize: 12, opacity: 0.7 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  personName: { fontFamily: UI_FONT.bold, fontSize: 15 },
});
