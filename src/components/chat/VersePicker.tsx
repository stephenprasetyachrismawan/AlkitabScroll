import { useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { todayKey, verseOfTheDay } from '../../lib/algorithm';
import { CATEGORY_MAP, hashString } from '../../lib/categories';
import { UI_FONT } from '../../lib/fonts';
import { useSettings } from '../../lib/settings';
import { passageText, VERSES, type Verse } from '../../lib/verses';

type Props = { visible: boolean; onClose: () => void; onPick: (v: Verse) => void };

// Searched across every translation at once, so a half-remembered line in TB, BIMK or KJV finds it.
let HAYSTACK: string[] | null = null;
function haystack(): string[] {
  HAYSTACK ??= VERSES.map((v) =>
    [v.ref, v.kjvRef, ...Object.values(v.text).flatMap((p) => [p.title, p.verses.map((x) => x.text).join(' ')])].join('\n').toLowerCase(),
  );
  return HAYSTACK;
}

/** Sheet for sending a verse into the chat: today's verse first, then search. */
export function VersePicker({ visible, onClose, onPick }: Props) {
  const { colors, translation, lang, dark } = useSettings();
  const insets = useSafeAreaInsets();
  const id = lang === 'id';
  const [q, setQ] = useState('');
  const term = useDeferredValue(q.trim().toLowerCase());

  const suggestions = useMemo(() => {
    const day = todayKey();
    const first = verseOfTheDay(VERSES, day);
    const seed = hashString(day);
    const rest = [...VERSES].sort((a, b) => ((hashString(a.id) ^ seed) % 997) - ((hashString(b.id) ^ seed) % 997)).filter((v) => v.id !== first.id);
    return [first, ...rest.slice(0, 24)];
  }, []);

  const results = useMemo(() => {
    if (term.length < 2) return suggestions;
    const words = term.split(/\s+/).filter(Boolean);
    const hs = haystack();
    const out: Verse[] = [];
    for (let i = 0; i < VERSES.length && out.length < 60; i++) if (words.every((w) => hs[i].includes(w))) out.push(VERSES[i]);
    return out;
  }, [term, suggestions]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 12 }}>
        <View style={styles.head}>
          <Text style={[styles.title, { color: colors.text }]}>{id ? 'Kirim ayat' : 'Send a verse'}</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={id ? 'Tutup' : 'Close'}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
        </View>
        <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={id ? 'Cari kata atau kitab… (mis. kuat, Mazmur 23)' : 'Search words or books… (e.g. strength, Psalm 23)'}
            placeholderTextColor={colors.muted}
            style={[styles.input, { color: colors.text }]}
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
        <FlatList
          data={results}
          keyExtractor={(v) => v.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 10 }}
          ListHeaderComponent={
            term.length < 2 ? <Text style={[styles.label, { color: colors.muted }]}>{id ? 'Ayat hari ini & pilihan' : "Today's verse & picks"}</Text> : undefined
          }
          ListEmptyComponent={<Text style={[styles.label, { color: colors.muted, textAlign: 'center', marginTop: 24 }]}>{id ? 'Tidak ditemukan.' : 'No results.'}</Text>}
          renderItem={({ item }) => {
            const c = CATEGORY_MAP[item.categories[0]];
            const s = c ? (dark ? c.dark : c.light) : undefined;
            const p = passageText(item, translation);
            return (
              <Pressable
                onPress={() => onPick(item)}
                style={({ pressed }) => [styles.row, { backgroundColor: s?.paper ?? colors.card, borderColor: s?.well ?? colors.border, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={[styles.rowTitle, { color: s?.accent ?? colors.primary }]}>{p.title}</Text>
                <Text style={[styles.rowBody, { color: s?.text ?? colors.text }]} numberOfLines={3}>
                  {p.body}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  title: { fontFamily: UI_FONT.title, fontSize: 22 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, minHeight: 48 },
  input: { flex: 1, fontFamily: UI_FONT.regular, fontSize: 15, paddingVertical: 10 },
  label: { fontFamily: UI_FONT.semibold, fontSize: 13, marginBottom: 2 },
  row: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 6 },
  rowTitle: { fontFamily: UI_FONT.bold, fontSize: 13 },
  rowBody: { fontFamily: UI_FONT.serifItalic, fontSize: 15, lineHeight: 22 },
});
