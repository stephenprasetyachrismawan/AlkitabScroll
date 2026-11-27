import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ChunkyButton } from '../components/ChunkyButton';
import { PressableScale } from '../components/PressableScale';
import { Surface } from '../components/Surface';
import { useToast } from '../components/Toast';
import { VerseResultCard } from '../components/VerseResultCard';
import { CATEGORY_MAP } from '../lib/categories';
import { addNote, deleteNote, filterNotes, recurringThemes, useCurhatNotes, type CurhatNote } from '../lib/curhat';
import { UI_FONT } from '../lib/fonts';
import type { SearchHit } from '../lib/search';
import { useSettings } from '../lib/settings';
import { searchVerses, warmVerseSearch } from '../lib/verseSearch';
import { VERSE_MAP, passageText } from '../lib/verses';

const STARTERS = {
  id: ['Hari ini aku capek karena ', 'Aku lagi khawatir soal ', 'Aku bersyukur karena ', 'Aku ingat ayat tentang '],
  en: ['Today I am tired because ', "I'm worried about ", "I'm thankful because ", 'I remember a verse about '],
};
const PAGE = 6;

/** Curhat: write what you feel, any time; Selah finds verses for it and keeps the note on this phone. */
export default function Curhat() {
  const { t, lang, colors, translation } = useSettings();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{ text?: string }>();
  const notes = useCurhatNotes();

  const [text, setText] = useState(params.text ?? '');
  const [shown, setShown] = useState(PAGE);
  const [savedText, setSavedText] = useState<string | null>(null);
  const edit = (v: string) => {
    setText(v);
    setShown(PAGE);
  };
  const [noteQuery, setNoteQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => warmVerseSearch(), []);

  const deferred = useDeferredValue(text.trim());
  const result = useMemo(() => (deferred.length >= 3 ? searchVerses(deferred, 'curhat', translation, 24) : null), [deferred, translation]);

  // "Verses for you": what the recent notes add up to, minus verses those notes already gave.
  const forYou = useMemo(() => {
    if (notes.length < 2) return null;
    const recent = notes.slice(0, 5);
    const seen = new Set(recent.flatMap((n) => n.verseIds));
    const r = searchVerses(recent.map((n) => n.text).join('. '), 'curhat', translation, 30);
    return { themes: recurringThemes(notes).slice(0, 3), hits: r.hits.filter((h) => !seen.has(h.id)).slice(0, 3) };
  }, [notes, translation]);

  const listed = useMemo(() => filterNotes(notes, noteQuery), [notes, noteQuery]);

  const save = () => {
    const body = text.trim();
    if (!body || !result) return;
    addNote(body, result.hits.map((h) => h.id), result.themes.map((x) => x.key));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    toast(t('curhatSaved'), 'checkmark-circle');
    setSavedText(body);
  };

  const writing = text.trim().length > 0;
  const canSave = !!result?.hits.length && savedText !== text.trim();

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t('curhatTitle') }} />
      <KeyboardAwareScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
        <Text style={[styles.lead, { color: colors.text }]}>{t('curhatLead')}</Text>

        <Surface radius={20} style={styles.editor}>
          <TextInput
            value={text}
            onChangeText={edit}
            placeholder={t('curhatPlaceholder')}
            placeholderTextColor={colors.muted}
            multiline
            autoFocus={!params.text && notes.length === 0}
            textAlignVertical="top"
            style={[styles.input, { color: colors.text }]}
            accessibilityLabel={t('curhatTitle')}
          />
          {writing ? (
            <Pressable onPress={() => edit('')} hitSlop={12} style={styles.clear} accessibilityLabel={t('cancel')}>
              <Ionicons name="close-circle" size={20} color={colors.muted} />
            </Pressable>
          ) : null}
        </Surface>
        <View style={styles.private}>
          <Ionicons name="lock-closed-outline" size={13} color={colors.muted} />
          <Text style={[styles.small, { color: colors.muted }]}>{t('curhatPrivate')}</Text>
        </View>

        {!writing ? (
          <View style={styles.chips}>
            {STARTERS[lang].map((s) => (
              <PressableScale key={s} onPress={() => edit(s)} style={[styles.starter, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={[styles.starterText, { color: colors.text }]}>{s.trim()}…</Text>
              </PressableScale>
            ))}
          </View>
        ) : null}

        {result ? (
          <View style={styles.section}>
            {result.themes.length ? (
              <View style={styles.heard}>
                <Text style={[styles.label, { color: colors.muted }]}>{t('curhatHeard')}</Text>
                <View style={styles.chips}>
                  {result.themes.map((th) => (
                    <ThemeChip key={th.key} cat={th.key} />
                  ))}
                </View>
              </View>
            ) : null}
            {result.hits.length ? (
              <>
                <Text style={[styles.h, { color: colors.text }]}>{t('curhatForYou')}</Text>
                {result.hits.slice(0, shown).map((h) => (
                  <VerseResultCard key={h.id} hit={h} />
                ))}
                {result.hits.length > shown ? (
                  <PressableScale onPress={() => setShown((n) => n + PAGE)} style={styles.more}>
                    <Text style={{ color: colors.primary, fontFamily: UI_FONT.bold, fontSize: 15 }}>{t('curhatMore')}</Text>
                  </PressableScale>
                ) : null}
                {canSave ? <ChunkyButton label={t('curhatSave')} icon="bookmark-outline" onPress={save} style={{ marginTop: 6 }} /> : null}
              </>
            ) : (
              <Text style={[styles.body, { color: colors.muted }]}>{t('curhatEmpty')}</Text>
            )}
          </View>
        ) : null}

        {!writing && forYou && forYou.hits.length ? (
          <View style={styles.section}>
            <Text style={[styles.h, { color: colors.text }]}>{t('curhatRecurring')}</Text>
            <View style={styles.chips}>
              {forYou.themes.map((k) => (
                <ThemeChip key={k} cat={k} />
              ))}
            </View>
            {forYou.hits.map((h) => (
              <VerseResultCard key={h.id} hit={h} lines={3} />
            ))}
          </View>
        ) : null}

        {!writing && notes.length ? (
          <View style={styles.section}>
            <Text style={[styles.h, { color: colors.text }]}>{t('curhatHistory')}</Text>
            {notes.length >= 4 ? (
              <Surface tone="well" radius={14} style={styles.filter}>
                <Ionicons name="search" size={16} color={colors.muted} />
                <TextInput
                  value={noteQuery}
                  onChangeText={setNoteQuery}
                  placeholder={t('curhatSearchNotes')}
                  placeholderTextColor={colors.muted}
                  style={[styles.filterInput, { color: colors.text }]}
                  autoCorrect={false}
                  returnKeyType="search"
                />
              </Surface>
            ) : null}
            {listed.map((n) => (
              <NoteRow key={n.id} note={n} open={open === n.id} onToggle={() => setOpen((o) => (o === n.id ? null : n.id))} />
            ))}
            {!listed.length ? <Text style={[styles.body, { color: colors.muted }]}>{t('noResults')}</Text> : null}
          </View>
        ) : null}
      </KeyboardAwareScrollView>
    </>
  );
}

function ThemeChip({ cat }: { cat: string }) {
  const { dark, lang } = useSettings();
  const c = CATEGORY_MAP[cat];
  if (!c) return null;
  const s = dark ? c.dark : c.light;
  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/category/[key]', params: { key: cat } })}
      style={[styles.theme, { backgroundColor: s.paper }]}
      accessibilityRole="button"
      accessibilityLabel={c.label[lang]}
    >
      <Ionicons name={c.icon as keyof typeof Ionicons.glyphMap} size={14} color={s.accent} />
      <Text style={[styles.themeText, { color: s.text }]}>{c.label[lang]}</Text>
    </PressableScale>
  );
}

function NoteRow({ note, open, onToggle }: { note: CurhatNote; open: boolean; onToggle: () => void }) {
  const { t, lang, colors, translation } = useSettings();
  const date = new Date(note.at).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const verses = note.verseIds.filter((id) => VERSE_MAP[id]);
  const remove = () =>
    Alert.alert(t('curhatDelete'), undefined, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => deleteNote(note.id) },
    ]);
  return (
    <Surface radius={18} style={styles.note}>
      <Pressable onPress={onToggle} onLongPress={remove} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ gap: 8 }}>
        <View style={styles.noteHead}>
          <Text style={[styles.small, { color: colors.muted, flex: 1 }]}>{date}</Text>
          <Pressable onPress={remove} hitSlop={12} accessibilityLabel={t('delete')} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={17} color={colors.muted} />
          </Pressable>
        </View>
        <Text style={[styles.noteText, { color: colors.text }]} numberOfLines={open ? undefined : 3}>
          {note.text}
        </Text>
        {!open && verses.length ? (
          <Text style={[styles.small, { color: colors.primary }]} numberOfLines={2}>
            {verses
              .slice(0, 3)
              .map((id) => passageText(VERSE_MAP[id], translation).title)
              .join(' · ')}
          </Text>
        ) : null}
      </Pressable>
      {open ? (
        <View style={{ gap: 10, marginTop: 4 }}>
          {verses.slice(0, 6).map((id) => (
            <VerseResultCard key={id} hit={savedHit(id)} lines={3} />
          ))}
        </View>
      ) : null}
    </Surface>
  );
}

const savedHit = (id: string): SearchHit => ({ id, score: 0, matchedIn: null, highlight: [], via: { words: 0, meaning: 1, theme: 0 } });

const styles = StyleSheet.create({
  page: { padding: 16, gap: 12 },
  lead: { fontFamily: UI_FONT.title, fontSize: 26, lineHeight: 31, letterSpacing: -0.5, marginBottom: 4 },
  editor: { padding: 4 },
  input: { minHeight: 140, fontFamily: 'Lora_400Regular', fontSize: 17, lineHeight: 26, padding: 14, paddingRight: 40 },
  clear: { position: 'absolute', top: 12, right: 12 },
  private: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  small: { fontFamily: UI_FONT.regular, fontSize: 13, lineHeight: 18 },
  body: { fontFamily: UI_FONT.regular, fontSize: 15, lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  starter: { borderWidth: 1.5, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  starterText: { fontFamily: UI_FONT.semibold, fontSize: 14 },
  section: { gap: 10, marginTop: 14 },
  heard: { gap: 8 },
  label: { fontFamily: UI_FONT.bold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  h: { fontFamily: UI_FONT.title, fontSize: 21, letterSpacing: -0.3 },
  theme: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 12, minHeight: 36, paddingVertical: 6 },
  themeText: { fontFamily: UI_FONT.bold, fontSize: 13 },
  more: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  filter: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, minHeight: 44 },
  filterInput: { flex: 1, fontFamily: UI_FONT.regular, fontSize: 15, paddingVertical: 8 },
  note: { padding: 14 },
  noteHead: { flexDirection: 'row', alignItems: 'center' },
  noteText: { fontFamily: 'Lora_400Regular', fontSize: 16, lineHeight: 24 },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginRight: -6 },
});
