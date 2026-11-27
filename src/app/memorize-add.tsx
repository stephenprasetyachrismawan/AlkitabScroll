import { useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Surface } from '../components/Surface';
import { useToast } from '../components/Toast';
import { UI_FONT } from '../lib/fonts';
import { useJourney } from '../lib/journey/progress';
import { useJ } from '../lib/journey/strings';
import { useSettings } from '../lib/settings';
import { passageText, VERSES } from '../lib/verses';

/** Pick any verse in the app to memorise. Local search over the bundled text. */
export default function MemorizeAdd() {
  const { colors, translation } = useSettings();
  const j = useJ();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { cards, addCard, removeCard } = useJourney();
  const [q, setQ] = useState('');
  const term = useDeferredValue(q.trim().toLowerCase());

  const all = useMemo(
    () =>
      VERSES.map((v) => {
        const p = passageText(v, translation);
        return { id: v.id, title: p.title, body: p.body, hay: `${p.body}\n${p.title}\n${v.ref}`.toLowerCase() };
      }),
    [translation],
  );
  const list = useMemo(() => (term.length < 2 ? all : all.filter((x) => x.hay.includes(term))), [all, term]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: j('addVerse') }} />
      <View style={{ padding: 12 }}>
        <Surface radius={20} style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={j('searchVerse')}
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text }]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </Surface>
      </View>
      <FlatList
        data={list}
        keyExtractor={(x) => x.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={12}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: insets.bottom + 24, gap: 8 }}
        renderItem={({ item }) => {
          const on = !!cards[item.id];
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={item.title}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                if (on) removeCard(item.id);
                else {
                  addCard(item.id);
                  toast(j('added'), 'bookmark');
                }
              }}
            >
              <Surface style={[styles.row, on && { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.body, { color: colors.muted }]} numberOfLines={2}>
                    {item.body}
                  </Text>
                </View>
                <Ionicons name={on ? 'checkmark-circle' : 'add-circle-outline'} size={26} color={on ? colors.primary : colors.muted} />
              </Surface>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, minHeight: 48 },
  input: { flex: 1, fontFamily: UI_FONT.regular, fontSize: 15, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  title: { fontFamily: UI_FONT.bold, fontSize: 15 },
  body: { fontFamily: UI_FONT.serif, fontSize: 14, lineHeight: 21 },
});
