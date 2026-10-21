import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Aurora } from '../../components/Aurora';
import { Glass } from '../../components/Glass';
import { useTabBarSpace } from '../../components/GlassTabBar';
import { PressableScale } from '../../components/PressableScale';
import { DURATION, EASE_OUT_EXPO } from '../../lib/motion';
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
  const tabSpace = useTabBarSpace();
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
    <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
      <Aurora />
      <Glass dark={dark} radius={20} strength={0.7} style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t('searchUsers')}
          placeholderTextColor={colors.muted}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </Glass>
      {q.trim() ? (
        <FlatList
          data={people}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: tabSpace }}
          renderItem={({ item }) => (
            <PressableScale style={styles.person} scaleTo={0.98} onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.id } })}>
              <Avatar profile={item} size={44} />
              <View>
                <Text style={[styles.personName, { color: colors.text }]}>{item.display_name}</Text>
                <Text style={{ color: colors.muted, fontFamily: UI_FONT.regular }}>@{item.username}</Text>
              </View>
            </PressableScale>
          )}
        />
      ) : (
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
              <Animated.View style={{ flex: 1 }} entering={FadeInDown.duration(DURATION.enter).delay(Math.min(index, 10) * 50).easing(EASE_OUT_EXPO)}>
                <PressableScale scaleTo={0.95} haptic onPress={() => router.push({ pathname: '/category/[key]', params: { key: item.key } })} accessibilityRole="button" accessibilityLabel={item.label[lang]}>
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
              </Animated.View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  search: { marginHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, minHeight: 48 },
  searchInput: { flex: 1, fontFamily: UI_FONT.regular, fontSize: 15, paddingVertical: 10 },
  h: { fontFamily: UI_FONT.title, fontSize: 24, marginBottom: 4, marginTop: 6 },
  tile: { borderRadius: 22, padding: 16, height: 124, justifyContent: 'flex-end', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  tileIcon: { position: 'absolute', top: 14, right: 14, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  tileName: { fontFamily: UI_FONT.bold, fontSize: 16 },
  tileCount: { fontFamily: UI_FONT.regular, fontSize: 12, opacity: 0.7 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  personName: { fontFamily: UI_FONT.bold, fontSize: 15 },
});
